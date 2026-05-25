-- WhatsApp Business: per-doctor connections, templates, broadcasts, delivery tracking.
-- Complements notification_jobs (channel=whatsapp, topic=whatsapp_broadcast).

-- ---------------------------------------------------------------------------
-- 1) whatsapp_connections (doctor connects WABA from Settings)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          text NOT NULL DEFAULT 'meta_cloud',
  waba_id           text,
  phone_number_id   text,
  display_phone     text,
  access_token      text,
  status            text NOT NULL DEFAULT 'disconnected',
  verified_at       timestamptz,
  quality_rating    text,
  meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_connections_provider_check
    CHECK (provider IN ('meta_cloud', 'twilio')),
  CONSTRAINT whatsapp_connections_status_check
    CHECK (status IN ('disconnected', 'pending', 'connected', 'suspended')),
  CONSTRAINT whatsapp_connections_one_per_doctor
    UNIQUE (clinic_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_clinic
  ON public.whatsapp_connections (clinic_id, status);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_connections_rbac" ON public.whatsapp_connections;
CREATE POLICY "whatsapp_connections_rbac" ON public.whatsapp_connections
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      clinic_id = public.current_profile_clinic_id()
      AND (doctor_id = auth.uid() OR public.current_profile_role() IN ('admin', 'super_admin'))
    )
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR (
      clinic_id = public.current_profile_clinic_id()
      AND doctor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2) whatsapp_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name                text NOT NULL,
  meta_template_name  text,
  language_code       text NOT NULL DEFAULT 'en',
  category            text NOT NULL DEFAULT 'UTILITY',
  body                text NOT NULL,
  variables           jsonb NOT NULL DEFAULT '[]'::jsonb,
  status              text NOT NULL DEFAULT 'draft',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_templates_category_check
    CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  CONSTRAINT whatsapp_templates_status_check
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_clinic
  ON public.whatsapp_templates (clinic_id, status);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_templates_rbac" ON public.whatsapp_templates;
CREATE POLICY "whatsapp_templates_rbac" ON public.whatsapp_templates
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- ---------------------------------------------------------------------------
-- 3) whatsapp_broadcasts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id       uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  audience_spec     jsonb NOT NULL,
  body_preview      text,
  status            text NOT NULL DEFAULT 'queued',
  total_recipients  integer NOT NULL DEFAULT 0,
  sent_count        integer NOT NULL DEFAULT 0,
  failed_count      integer NOT NULL DEFAULT 0,
  skipped_count     integer NOT NULL DEFAULT 0,
  scheduled_at      timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_broadcasts_status_check
    CHECK (status IN ('draft', 'queued', 'sending', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_clinic_created
  ON public.whatsapp_broadcasts (clinic_id, created_at DESC);

ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_broadcasts_rbac" ON public.whatsapp_broadcasts;
CREATE POLICY "whatsapp_broadcasts_rbac" ON public.whatsapp_broadcasts
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR (clinic_id = public.current_profile_clinic_id() AND doctor_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 4) whatsapp_broadcast_deliveries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_deliveries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id         uuid NOT NULL REFERENCES public.whatsapp_broadcasts(id) ON DELETE CASCADE,
  clinic_id            uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id           uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  notification_job_id  uuid,
  phone                text NOT NULL,
  personalized_body    text NOT NULL,
  status               text NOT NULL DEFAULT 'queued',
  provider_message_id  text,
  last_error           text,
  sent_at              timestamptz,
  delivered_at         timestamptz,
  read_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_broadcast_deliveries_status_check
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  CONSTRAINT whatsapp_broadcast_deliveries_unique_patient
    UNIQUE (broadcast_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_deliveries_broadcast
  ON public.whatsapp_broadcast_deliveries (broadcast_id, status);

ALTER TABLE public.whatsapp_broadcast_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_broadcast_deliveries_rbac" ON public.whatsapp_broadcast_deliveries;
CREATE POLICY "whatsapp_broadcast_deliveries_rbac" ON public.whatsapp_broadcast_deliveries
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- Denormalized last visit (scalability — updated by app on finalize; optional backfill later)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_patients_clinic_last_visit
  ON public.patients (clinic_id, last_visit_at DESC NULLS LAST);
