-- GlowHomeo Communication Architecture V2
-- Replaces patient_inbox_messages with a relational conversation model.

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  context_type text, -- e.g., 'CONSULTATION', 'CARE_PLAN', 'GENERAL'
  context_id uuid,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_clinic_patient ON public.conversations(clinic_id, patient_id);

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('PATIENT', 'DOCTOR', 'SYSTEM')),
  sender_id uuid REFERENCES auth.users (id) ON DELETE SET NULL, -- The user who sent it
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);

-- 3. Create message_attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  file_object_id uuid NOT NULL REFERENCES public.file_objects (id) ON DELETE RESTRICT,
  file_name text,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON public.message_attachments(message_id);

-- 4. Create message_read_receipts table
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  message_id uuid NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- 5. Data Migration from patient_inbox_messages
DO $$
DECLARE
  rec record;
  conv_id uuid;
BEGIN
  -- Create a default 'GENERAL' conversation for each distinct clinic-patient pair
  FOR rec IN (SELECT DISTINCT clinic_id, patient_id FROM public.patient_inbox_messages)
  LOOP
    -- Ensure a conversation doesn't already exist for this pair (idempotency)
    SELECT id INTO conv_id FROM public.conversations 
    WHERE clinic_id = rec.clinic_id AND patient_id = rec.patient_id AND context_type = 'GENERAL' LIMIT 1;
    
    IF conv_id IS NULL THEN
      INSERT INTO public.conversations (clinic_id, patient_id, context_type)
      VALUES (rec.clinic_id, rec.patient_id, 'GENERAL')
      RETURNING id INTO conv_id;
    END IF;

    -- Migrate the messages
    INSERT INTO public.messages (id, conversation_id, sender_type, sender_id, body, created_at)
    SELECT 
      pim.id, 
      conv_id, 
      CASE WHEN pim.direction = 'PATIENT' THEN 'PATIENT' ELSE 'DOCTOR' END, 
      pim.created_by_user_id, 
      pim.body, 
      pim.created_at
    FROM public.patient_inbox_messages pim
    WHERE pim.clinic_id = rec.clinic_id AND pim.patient_id = rec.patient_id
    ON CONFLICT (id) DO NOTHING;

    -- Migrate read receipts if read_at is set
    INSERT INTO public.message_read_receipts (message_id, user_id, read_at)
    SELECT 
      pim.id,
      -- We don't have the exact user who read it, but we can assign it to the recipient
      CASE WHEN pim.direction = 'PATIENT' THEN (SELECT owner_id FROM public.clinics WHERE id = pim.clinic_id)
           ELSE (SELECT auth_user_id FROM public.patients WHERE id = pim.patient_id) END,
      pim.read_at
    FROM public.patient_inbox_messages pim
    WHERE pim.clinic_id = rec.clinic_id AND pim.patient_id = rec.patient_id AND pim.read_at IS NOT NULL
    AND (
      (pim.direction = 'PATIENT' AND EXISTS(SELECT 1 FROM public.clinics WHERE id = pim.clinic_id AND owner_id IS NOT NULL))
      OR 
      (pim.direction = 'CLINIC' AND EXISTS(SELECT 1 FROM public.patients WHERE id = pim.patient_id AND auth_user_id IS NOT NULL))
    )
    ON CONFLICT (message_id, user_id) DO NOTHING;
    
  END LOOP;
END $$;

-- 6. Trigger to update updated_at on conversations when new message arrives
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_conversation_timestamp ON public.messages;
CREATE TRIGGER trg_update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- 7. RLS Policies

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Conversations
DROP POLICY IF EXISTS "conversations_rbac" ON public.conversations;
CREATE POLICY "conversations_rbac" ON public.conversations
  FOR ALL USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
    OR patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid())
  ) WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
    OR patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid())
  );

-- Messages
DROP POLICY IF EXISTS "messages_rbac" ON public.messages;
CREATE POLICY "messages_rbac" ON public.messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE clinic_id = public.current_profile_clinic_id() 
      OR patient_id IN (SELECT p.id FROM public.patients p WHERE p.auth_user_id = auth.uid())
      OR public.is_platform_super_admin()
    )
  ) WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE clinic_id = public.current_profile_clinic_id() 
      OR patient_id IN (SELECT p.id FROM public.patients p WHERE p.auth_user_id = auth.uid())
      OR public.is_platform_super_admin()
    )
  );

-- Message Attachments
DROP POLICY IF EXISTS "message_attachments_rbac" ON public.message_attachments;
CREATE POLICY "message_attachments_rbac" ON public.message_attachments
  FOR ALL USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE c.clinic_id = public.current_profile_clinic_id() 
      OR c.patient_id IN (SELECT p.id FROM public.patients p WHERE p.auth_user_id = auth.uid())
      OR public.is_platform_super_admin()
    )
  ) WITH CHECK (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE c.clinic_id = public.current_profile_clinic_id() 
      OR c.patient_id IN (SELECT p.id FROM public.patients p WHERE p.auth_user_id = auth.uid())
      OR public.is_platform_super_admin()
    )
  );

-- Message Read Receipts
DROP POLICY IF EXISTS "message_read_receipts_rbac" ON public.message_read_receipts;
CREATE POLICY "message_read_receipts_rbac" ON public.message_read_receipts
  FOR ALL USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE c.clinic_id = public.current_profile_clinic_id() 
      OR c.patient_id IN (SELECT p.id FROM public.patients p WHERE p.auth_user_id = auth.uid())
      OR public.is_platform_super_admin()
    )
  ) WITH CHECK (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE c.clinic_id = public.current_profile_clinic_id() 
      OR c.patient_id IN (SELECT p.id FROM public.patients p WHERE p.auth_user_id = auth.uid())
      OR public.is_platform_super_admin()
    )
  );

-- Force schema reload to pick up new tables
NOTIFY pgrst, 'reload schema';
