-- Enterprise scalability: denormalized patient metrics, queue safety, timeline indexes, webhooks.
-- Reasoning: avoids full-table scans and JSONB fan-out at 200+ patients / 500+ consults per doctor.

-- ---------------------------------------------------------------------------
-- 1) Patient denormalized metrics (list/dashboard filters without consult joins)
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS visit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_consult_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_prescription_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_status text NOT NULL DEFAULT 'stable';

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_follow_up_status_check;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_follow_up_status_check
  CHECK (follow_up_status IN ('stable', 'critical'));

-- Composite list index: clinic + status filter + sort by last visit (partial for active charts)
CREATE INDEX IF NOT EXISTS idx_patients_clinic_follow_up
  ON public.patients (clinic_id, follow_up_status, last_visit_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_created
  ON public.patients (clinic_id, created_at DESC);

-- Lightweight consultation timeline: avoid loading note JSONB in list queries
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS has_final_note boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_consult_patient_timeline
  ON public.consultations (patient_id, clinic_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_consult_clinic_open
  ON public.consultations (clinic_id, attending_user_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created
  ON public.prescriptions (patient_id, clinic_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2) refresh_patient_metrics — single source of truth for list/dashboard fields
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_patient_metrics(p_patient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_visit timestamptz;
  v_visit_count integer;
  v_active integer;
  v_last_rx timestamptz;
  v_follow text;
  v_ms_followup interval := interval '14 days';
BEGIN
  SELECT MAX(c.ended_at) INTO v_last_visit
  FROM public.consultations c
  WHERE c.patient_id = p_patient_id AND c.ended_at IS NOT NULL;

  SELECT COUNT(*)::integer INTO v_visit_count
  FROM public.consultations c
  WHERE c.patient_id = p_patient_id AND c.ended_at IS NOT NULL;

  SELECT COUNT(*)::integer INTO v_active
  FROM public.consultations c
  WHERE c.patient_id = p_patient_id AND c.ended_at IS NULL;

  SELECT MAX(p.created_at) INTO v_last_rx
  FROM public.prescriptions p
  WHERE p.patient_id = p_patient_id;

  IF v_last_visit IS NOT NULL AND v_last_visit < (now() - v_ms_followup) THEN
    v_follow := 'critical';
  ELSE
    v_follow := 'stable';
  END IF;

  UPDATE public.patients
  SET
    last_visit_at = v_last_visit,
    visit_count = COALESCE(v_visit_count, 0),
    active_consult_count = COALESCE(v_active, 0),
    last_prescription_at = v_last_rx,
    follow_up_status = v_follow
  WHERE id = p_patient_id;
END;
$$;

COMMENT ON FUNCTION public.refresh_patient_metrics IS
  'Recomputes last_visit_at, visit_count, active_consult_count, follow_up_status for patient list API (avoids N+1 consult aggregation).';

-- Triggers: maintain metrics on consultation / prescription changes
CREATE OR REPLACE FUNCTION public.trg_consultation_refresh_patient_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_patient_metrics(OLD.patient_id);
    RETURN OLD;
  END IF;
  IF NEW.note_final IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.note_final IS DISTINCT FROM NEW.note_final) THEN
    NEW.has_final_note := true;
  END IF;
  PERFORM public.refresh_patient_metrics(NEW.patient_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultation_refresh_patient_metrics ON public.consultations;
CREATE TRIGGER consultation_refresh_patient_metrics
  AFTER INSERT OR UPDATE OF ended_at, note_final, patient_id OR DELETE
  ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_consultation_refresh_patient_metrics();

CREATE OR REPLACE FUNCTION public.trg_prescription_refresh_patient_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_patient_metrics(OLD.patient_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_patient_metrics(NEW.patient_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prescription_refresh_patient_metrics ON public.prescriptions;
CREATE TRIGGER prescription_refresh_patient_metrics
  AFTER INSERT OR DELETE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prescription_refresh_patient_metrics();

-- Backfill metrics for existing clinics (batched in app migration runner if needed)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.patients LOOP
    PERFORM public.refresh_patient_metrics(r.id);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) notification_jobs — horizontal worker safety + retry / dead-letter
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_jobs
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 8;

ALTER TABLE public.notification_jobs DROP CONSTRAINT IF EXISTS notification_jobs_status_check;
ALTER TABLE public.notification_jobs
  ADD CONSTRAINT notification_jobs_status_check
  CHECK (status IN ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'DEAD_LETTER'));

-- Poll index: due QUEUED jobs ordered by schedule (partial index keeps worker scans small)
DROP INDEX IF EXISTS idx_notif_due;
CREATE INDEX IF NOT EXISTS idx_notif_due
  ON public.notification_jobs (scheduled_for ASC)
  WHERE status = 'QUEUED';

CREATE INDEX IF NOT EXISTS idx_notif_topic_due
  ON public.notification_jobs (topic, scheduled_for ASC)
  WHERE status = 'QUEUED';

CREATE INDEX IF NOT EXISTS idx_notif_clinic_created
  ON public.notification_jobs (clinic_id, created_at DESC);

-- claim_notification_jobs: FOR UPDATE SKIP LOCKED — safe multi-replica workers
CREATE OR REPLACE FUNCTION public.claim_notification_jobs(
  p_worker_id text,
  p_limit integer DEFAULT 50,
  p_topics text[] DEFAULT NULL
)
RETURNS SETOF public.notification_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notification_jobs j
  SET
    status = 'PROCESSING',
    locked_at = now(),
    locked_by = p_worker_id,
    attempts = j.attempts + 1
  WHERE j.id IN (
    SELECT sub.id
    FROM public.notification_jobs sub
    WHERE sub.status = 'QUEUED'
      AND sub.scheduled_for <= now()
      AND (sub.next_retry_at IS NULL OR sub.next_retry_at <= now())
      AND sub.attempts < sub.max_attempts
      AND (p_topics IS NULL OR sub.topic = ANY (p_topics))
    ORDER BY sub.scheduled_for ASC
    LIMIT GREATEST(1, LEAST(p_limit, 200))
    FOR UPDATE SKIP LOCKED
  )
  RETURNING j.*;
END;
$$;

COMMENT ON FUNCTION public.claim_notification_jobs IS
  'Atomically claims due jobs for one worker instance; SKIP LOCKED prevents double-send under horizontal scale.';

-- ---------------------------------------------------------------------------
-- 4) WhatsApp webhooks + messaging consent (compliance / analytics)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  waba_id         text,
  event_type      text NOT NULL,
  provider_id     text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_created
  ON public.whatsapp_webhook_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_provider
  ON public.whatsapp_webhook_events (provider_id)
  WHERE provider_id IS NOT NULL;

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_webhook_events_service" ON public.whatsapp_webhook_events;
CREATE POLICY "whatsapp_webhook_events_service" ON public.whatsapp_webhook_events
  FOR ALL TO authenticated
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

CREATE TABLE IF NOT EXISTS public.messaging_consent_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  channel         text NOT NULL DEFAULT 'whatsapp',
  opted_in        boolean NOT NULL,
  source          text NOT NULL DEFAULT 'manual',
  recorded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messaging_consent_channel_check CHECK (channel IN ('whatsapp', 'sms', 'email'))
);

CREATE INDEX IF NOT EXISTS idx_messaging_consent_patient
  ON public.messaging_consent_log (patient_id, channel, created_at DESC);

ALTER TABLE public.messaging_consent_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messaging_consent_log_rbac" ON public.messaging_consent_log;
CREATE POLICY "messaging_consent_log_rbac" ON public.messaging_consent_log
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- Broadcast delivery analytics indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_deliveries_status
  ON public.whatsapp_broadcast_deliveries (broadcast_id, status, sent_at DESC);

-- Encrypted token storage column (app encrypts before insert)
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS meta_business_id text;

-- Pause/resume broadcasts
ALTER TABLE public.whatsapp_broadcasts
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.whatsapp_broadcasts DROP CONSTRAINT IF EXISTS whatsapp_broadcasts_status_check;
ALTER TABLE public.whatsapp_broadcasts
  ADD CONSTRAINT whatsapp_broadcasts_status_check
  CHECK (status IN ('draft', 'queued', 'sending', 'paused', 'completed', 'failed', 'cancelled'));
