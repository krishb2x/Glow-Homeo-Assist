-- Doctor operational memos: fast reminders and notes during clinic workflow.
-- Distinct from clinical_record (case documentation) and follow_ups (structured care plans).

CREATE TABLE IF NOT EXISTS public.doctor_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients (id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES public.consultations (id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note'
    CHECK (kind IN ('note', 'reminder', 'follow_up')),
  body text NOT NULL,
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'urgent')),
  pinned boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'done', 'dismissed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_memos_body_nonempty CHECK (char_length(trim(body)) >= 1)
);

COMMENT ON TABLE public.doctor_memos IS
  'Operational memory for doctors: quick notes, reminders, and follow-up hints. Not part of the legal clinical record.';

CREATE INDEX IF NOT EXISTS idx_doctor_memos_clinic_doctor_open
  ON public.doctor_memos (clinic_id, doctor_id, status, pinned DESC, due_at ASC NULLS LAST)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_doctor_memos_patient_open
  ON public.doctor_memos (clinic_id, patient_id, status, created_at DESC)
  WHERE patient_id IS NOT NULL AND status = 'open';

CREATE INDEX IF NOT EXISTS idx_doctor_memos_due
  ON public.doctor_memos (clinic_id, due_at ASC)
  WHERE status = 'open' AND due_at IS NOT NULL;

ALTER TABLE public.doctor_memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doctor_memos_rbac ON public.doctor_memos;
CREATE POLICY doctor_memos_rbac ON public.doctor_memos
  FOR ALL
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

DROP TRIGGER IF EXISTS trg_doctor_memos_updated ON public.doctor_memos;
CREATE TRIGGER trg_doctor_memos_updated
  BEFORE UPDATE ON public.doctor_memos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
