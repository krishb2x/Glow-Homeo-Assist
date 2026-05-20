-- =============================================================================
-- GlowHomeo Assist — v2 consult workspace (single additive migration)
--
-- See docs/architecture/03_SCHEMA.md §3-§9 for context.
--
-- This migration is intentionally additive. It introduces:
--   * encounter_observations    (searchable clinical observations)
--   * audio_sessions            (consent + short-lived recording metadata)
--   * scribe_jobs               (AI scribe lifecycle)
--   * media_objects             (PDFs / patient photos / docs)
--   * notification_jobs         (WhatsApp/email, idempotent)
--   * video_sessions            (phase-3 placeholder, columns now)
--   * audit.events              (append-only event log)
--   * vw_pending_outcome_consults  (view used by dashboard)
--   * trigger: audit on consultation finalize
--   * extensions on consultations / patients / prescriptions
--   * extra indexes for hot queries
--
-- It does not drop any column or table; rollback is "drop the new objects".
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Prereqs
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 1) consultations extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS mode                text        NOT NULL DEFAULT 'IN_CLINIC',
  ADD COLUMN IF NOT EXISTS active_step         text,
  ADD COLUMN IF NOT EXISTS pdf_ready           boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS draft_autosaved_at  timestamptz;

DO $$
BEGIN
  ALTER TABLE public.consultations
    ADD CONSTRAINT consultations_mode_check
      CHECK (mode IN ('IN_CLINIC', 'ONLINE'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_consult_patient
  ON public.consultations (patient_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_consult_clinic_active
  ON public.consultations (clinic_id, lifecycle_status)
  WHERE lifecycle_status IN ('ACTIVE', 'REVIEWING');

-- ---------------------------------------------------------------------------
-- 2) patients extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS allergies_structured jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_channel    text        DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS tags                 text[]      NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_patients_tags
  ON public.patients USING gin (tags);

CREATE INDEX IF NOT EXISTS idx_patients_search
  ON public.patients USING gin (
    to_tsvector('simple',
      coalesce(name, '') || ' ' || coalesce(phone, '')
    )
  );

-- ---------------------------------------------------------------------------
-- 3) prescriptions extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS signed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS signed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4) encounter_observations  (analytics-friendly, denormalised slice)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encounter_observations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES public.patients(id)       ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES public.consultations(id)  ON DELETE CASCADE,
  step            text NOT NULL,
  category        text,
  label           text NOT NULL,
  value_text      text,
  value_number    numeric,
  rubric_codes    text[],
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_patient
  ON public.encounter_observations (patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_consult
  ON public.encounter_observations (consultation_id);
CREATE INDEX IF NOT EXISTS idx_obs_step
  ON public.encounter_observations (clinic_id, step);

ALTER TABLE public.encounter_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "encounter_observations_rbac" ON public.encounter_observations;
CREATE POLICY "encounter_observations_rbac" ON public.encounter_observations
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
-- 5) audio_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audio_sessions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id              uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  consultation_id        uuid NOT NULL REFERENCES public.consultations(id)  ON DELETE CASCADE,
  doctor_id              uuid NOT NULL REFERENCES auth.users(id)            ON DELETE RESTRICT,
  started_at             timestamptz NOT NULL DEFAULT now(),
  ended_at               timestamptz,
  duration_seconds       integer,
  consent_captured       boolean NOT NULL DEFAULT false,
  consent_text           text,
  store_recording        boolean NOT NULL DEFAULT false,
  recording_object_key   text,
  retention_days         integer NOT NULL DEFAULT 7,
  deleted_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_audio_consult
  ON public.audio_sessions (consultation_id);
CREATE INDEX IF NOT EXISTS idx_audio_purge
  ON public.audio_sessions (deleted_at, retention_days)
  WHERE deleted_at IS NULL;

ALTER TABLE public.audio_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_sessions_rbac" ON public.audio_sessions;
CREATE POLICY "audio_sessions_rbac" ON public.audio_sessions
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
-- 6) scribe_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scribe_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  consultation_id     uuid NOT NULL REFERENCES public.consultations(id)  ON DELETE CASCADE,
  audio_session_id    uuid          REFERENCES public.audio_sessions(id) ON DELETE SET NULL,
  doctor_id           uuid NOT NULL REFERENCES auth.users(id)            ON DELETE RESTRICT,
  status              text NOT NULL DEFAULT 'PENDING',
  provider            text NOT NULL DEFAULT 'gemini',
  prompt_template     text,
  transcript_text     text,
  transcript_lang     text,
  draft_record        jsonb,
  error_code          text,
  error_message       text,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz,
  CONSTRAINT scribe_jobs_status_check CHECK (
    status IN ('PENDING', 'STREAMING', 'DRAFTED', 'INSERTED', 'FAILED', 'DISCARDED')
  )
);

CREATE INDEX IF NOT EXISTS idx_scribe_consult
  ON public.scribe_jobs (consultation_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scribe_status
  ON public.scribe_jobs (clinic_id, status);

ALTER TABLE public.scribe_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scribe_jobs_rbac" ON public.scribe_jobs;
CREATE POLICY "scribe_jobs_rbac" ON public.scribe_jobs
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
-- 7) media_objects  (new, replaces ad-hoc use of file_objects)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_objects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  patient_id          uuid          REFERENCES public.patients(id)       ON DELETE CASCADE,
  consultation_id     uuid          REFERENCES public.consultations(id)  ON DELETE CASCADE,
  uploaded_by         uuid NOT NULL REFERENCES auth.users(id),
  kind                text NOT NULL,
  storage_bucket      text NOT NULL,
  storage_object_key  text NOT NULL,
  mime_type           text NOT NULL,
  size_bytes          integer,
  checksum_sha256     text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT media_objects_kind_check CHECK (
    kind IN ('prescription_pdf', 'case_summary_pdf', 'patient_photo', 'document', 'clinic_branding', 'signature')
  )
);

CREATE INDEX IF NOT EXISTS idx_media_patient
  ON public.media_objects (patient_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_consult
  ON public.media_objects (consultation_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.media_objects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "media_objects_rbac" ON public.media_objects;
CREATE POLICY "media_objects_rbac" ON public.media_objects
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- consultations.pdf_object_id -> media_objects.id (added now that media_objects exists)
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS pdf_object_id uuid;

DO $$
BEGIN
  ALTER TABLE public.consultations
    ADD CONSTRAINT consultations_pdf_object_id_fkey
    FOREIGN KEY (pdf_object_id) REFERENCES public.media_objects(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 8) notification_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id      uuid          REFERENCES public.patients(id) ON DELETE SET NULL,
  channel         text NOT NULL,
  topic           text NOT NULL,
  payload         jsonb NOT NULL,
  idempotency_key text NOT NULL,
  scheduled_for   timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'QUEUED',
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_jobs_channel_check
    CHECK (channel IN ('whatsapp', 'email', 'sms', 'inapp')),
  CONSTRAINT notification_jobs_status_check
    CHECK (status IN ('QUEUED', 'SENT', 'FAILED', 'CANCELLED')),
  CONSTRAINT notification_jobs_unique_idempotency
    UNIQUE (clinic_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_notif_due
  ON public.notification_jobs (status, scheduled_for)
  WHERE status = 'QUEUED';

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_jobs_rbac" ON public.notification_jobs;
CREATE POLICY "notification_jobs_rbac" ON public.notification_jobs
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
-- 9) video_sessions  (phase-3 placeholder)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  consultation_id       uuid NOT NULL REFERENCES public.consultations(id)  ON DELETE CASCADE,
  provider              text NOT NULL DEFAULT 'cloudflare',
  room_id               text NOT NULL,
  doctor_token_hash     text,
  patient_token_hash    text,
  started_at            timestamptz,
  ended_at              timestamptz,
  status                text NOT NULL DEFAULT 'PROVISIONED',
  recording_object_key  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_sessions_status_check
    CHECK (status IN ('PROVISIONED', 'LIVE', 'ENDED', 'FAILED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS video_sessions_one_per_consult
  ON public.video_sessions (consultation_id)
  WHERE status NOT IN ('ENDED', 'FAILED');

ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_sessions_rbac" ON public.video_sessions;
CREATE POLICY "video_sessions_rbac" ON public.video_sessions
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
-- 10) audit schema + table  (append-only)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.events (
  id            bigserial PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  clinic_id     uuid,
  actor_id      uuid,
  actor_role    text,
  entity_type   text NOT NULL,
  entity_id     uuid,
  action        text NOT NULL,
  payload       jsonb,
  ip            inet,
  user_agent    text
);

CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit.events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_clinic
  ON audit.events (clinic_id, occurred_at DESC);

REVOKE INSERT, UPDATE, DELETE ON audit.events FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON audit.events FROM anon, authenticated;

DO $$
BEGIN
  GRANT INSERT ON audit.events TO service_role;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Read function: super-admin only, behind SECURITY DEFINER
CREATE OR REPLACE FUNCTION audit.read_recent(p_clinic uuid, p_limit int)
RETURNS SETOF audit.events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = audit, public
AS $$
BEGIN
  IF NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'permission denied for audit.read_recent';
  END IF;

  RETURN QUERY
  SELECT *
  FROM audit.events e
  WHERE (p_clinic IS NULL OR e.clinic_id = p_clinic)
  ORDER BY e.occurred_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
END $$;

REVOKE ALL ON FUNCTION audit.read_recent(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION audit.read_recent(uuid, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11) Trigger: audit on consultation finalize
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_consultation_finalized()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lifecycle_status = 'FINALIZED'
     AND (OLD.lifecycle_status IS DISTINCT FROM 'FINALIZED') THEN
    INSERT INTO audit.events (
      clinic_id, actor_id, actor_role, entity_type, entity_id, action, payload
    )
    VALUES (
      NEW.clinic_id,
      auth.uid(),
      public.current_profile_role(),
      'consultation',
      NEW.id,
      'finalized',
      jsonb_build_object(
        'finalized_at', NEW.finalized_at,
        'patient_id', NEW.patient_id,
        'attending_user_id', NEW.attending_user_id
      )
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_consult_finalized ON public.consultations;
CREATE TRIGGER trg_consult_finalized
  AFTER UPDATE OF lifecycle_status ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.on_consultation_finalized();

-- ---------------------------------------------------------------------------
-- 12) View: vw_pending_outcome_consults
--     Used by SmartNextActions and prior-outcome inline strip.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_pending_outcome_consults AS
SELECT c.*
FROM public.consultations c
WHERE c.lifecycle_status = 'FINALIZED'
  AND NOT EXISTS (
    SELECT 1
    FROM public.case_outcomes o
    WHERE o.consultation_id = c.id
  )
  AND c.finalized_at > now() - interval '90 days';

-- ---------------------------------------------------------------------------
-- 13) Sanity: index for follow-up overdue queue
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_followups_pending_due
  ON public.follow_ups (clinic_id, due_at)
  WHERE status = 'PENDING';

-- ---------------------------------------------------------------------------
-- End of 20260520000000_v2_consult_workspace.sql
-- ---------------------------------------------------------------------------
