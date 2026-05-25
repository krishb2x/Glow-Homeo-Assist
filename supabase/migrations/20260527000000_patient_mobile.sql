-- =============================================================================
-- Patient Mobile App — additive schema for /patient/* API.
--
-- See docs/PATIENT_MOBILE_APP.md and docs/MOBILE_API.md for context.
--
-- This migration is purely additive:
--   1) patients.auth_user_id      — link a patient to a Supabase auth user
--   2) patient_push_tokens        — Expo / FCM / APNs device tokens
--   3) patient_medication_logs    — per-dose adherence log
--   4) patient_diet_logs          — daily diet adherence
--   5) patient_check_ins          — symptom / wellbeing diary
--   6) clinic_content_items       — videos / articles / diet packs / tips
--   7) patient_content_assignments — per-patient assignment + view tracking
--   8) patient_app_settings       — locale, channels, quiet hours
--   9) patient_access_tokens.purpose — extend CHECK to allow 'family_view'
--   10) helper: public.current_patient_id() (SECURITY DEFINER)
--
-- Safe to re-run: every object uses IF NOT EXISTS / OR REPLACE / DO blocks.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) patients.auth_user_id : link to Supabase auth user
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $fk_pat_auth$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_auth_user_id_fkey'
      AND conrelid = 'public.patients'::regclass
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END $fk_pat_auth$;

CREATE UNIQUE INDEX IF NOT EXISTS patients_auth_user_id_unique
  ON public.patients (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.patients.auth_user_id IS
  'Optional link to the Supabase auth user that owns this patient record (patient mobile app).';

-- Helper: resolve the patients.id for the current auth.uid().
-- Used by RLS policies on patient_* tables.
CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.patients WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_patient_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) patient_push_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_push_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  platform       text NOT NULL,
  token          text NOT NULL,
  app_version    text,
  locale         text,
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_push_tokens_platform_check
    CHECK (platform IN ('ios', 'android', 'web')),
  CONSTRAINT patient_push_tokens_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_patient_push_tokens_patient
  ON public.patient_push_tokens (patient_id);

ALTER TABLE public.patient_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_push_tokens_patient_self" ON public.patient_push_tokens;
CREATE POLICY "patient_push_tokens_patient_self" ON public.patient_push_tokens
  FOR ALL TO authenticated
  USING (patient_id = public.current_patient_id())
  WITH CHECK (patient_id = public.current_patient_id());

-- Service role (background worker) bypasses RLS.

-- ---------------------------------------------------------------------------
-- 3) patient_medication_logs : per-dose adherence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_medication_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES public.patients(id)       ON DELETE CASCADE,
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id)  ON DELETE CASCADE,
  item_id         text NOT NULL,
  slot            text NOT NULL,
  taken_date      date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  taken_at        timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'TAKEN',
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_med_log_slot_check
    CHECK (slot IN ('morning', 'afternoon', 'evening', 'night')),
  CONSTRAINT patient_med_log_status_check
    CHECK (status IN ('TAKEN', 'SKIPPED', 'DELAYED')),
  CONSTRAINT patient_med_log_unique_per_slot
    UNIQUE (patient_id, prescription_id, item_id, slot, taken_date)
);

CREATE INDEX IF NOT EXISTS idx_med_log_patient_taken
  ON public.patient_medication_logs (patient_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_med_log_clinic_taken
  ON public.patient_medication_logs (clinic_id, taken_at DESC);

ALTER TABLE public.patient_medication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "med_log_patient_self" ON public.patient_medication_logs;
CREATE POLICY "med_log_patient_self" ON public.patient_medication_logs
  FOR ALL TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- ---------------------------------------------------------------------------
-- 4) patient_diet_logs : daily diet adherence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_diet_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid NOT NULL REFERENCES public.clinics(id)  ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  log_date     date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  on_plan      boolean NOT NULL DEFAULT true,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_diet_log_unique_per_day UNIQUE (patient_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_diet_log_patient_date
  ON public.patient_diet_logs (patient_id, log_date DESC);

ALTER TABLE public.patient_diet_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diet_log_patient_self" ON public.patient_diet_logs;
CREATE POLICY "diet_log_patient_self" ON public.patient_diet_logs
  FOR ALL TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- ---------------------------------------------------------------------------
-- 5) patient_check_ins : symptom / wellbeing diary
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_check_ins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        uuid NOT NULL REFERENCES public.clinics(id)  ON DELETE CASCADE,
  patient_id       uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  follow_up_id     uuid REFERENCES public.follow_ups(id) ON DELETE SET NULL,
  wellbeing_score  integer,
  symptoms         text[] NOT NULL DEFAULT '{}',
  energy           text,
  sleep            text,
  mood             text,
  free_text        text,
  recorded_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_checkin_score_range
    CHECK (wellbeing_score IS NULL OR (wellbeing_score BETWEEN 0 AND 10)),
  CONSTRAINT patient_checkin_energy_check
    CHECK (energy IS NULL OR energy IN ('LOW', 'MEDIUM', 'HIGH')),
  CONSTRAINT patient_checkin_sleep_check
    CHECK (sleep IS NULL OR sleep IN ('POOR', 'OK', 'GOOD')),
  CONSTRAINT patient_checkin_mood_check
    CHECK (mood IS NULL OR mood IN ('DOWN', 'STABLE', 'LIFTED'))
);

CREATE INDEX IF NOT EXISTS idx_checkin_patient_recorded
  ON public.patient_check_ins (patient_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkin_clinic_recorded
  ON public.patient_check_ins (clinic_id, recorded_at DESC);

ALTER TABLE public.patient_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkin_patient_self" ON public.patient_check_ins;
CREATE POLICY "checkin_patient_self" ON public.patient_check_ins
  FOR ALL TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- ---------------------------------------------------------------------------
-- 6) clinic_content_items : doctor-curated videos / articles / diet packs / tips
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_content_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind              text NOT NULL,
  category          text,
  title             text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  summary           text CHECK (summary IS NULL OR char_length(summary) <= 1000),
  body              text,
  media_object_id   uuid REFERENCES public.media_objects(id) ON DELETE SET NULL,
  thumbnail_url     text,
  duration_seconds  integer,
  tags              text[] NOT NULL DEFAULT '{}',
  is_published      boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_content_kind_check
    CHECK (kind IN ('video', 'article', 'diet_pack', 'lifestyle_tip')),
  CONSTRAINT clinic_content_category_check
    CHECK (category IS NULL OR category IN ('diet', 'lifestyle', 'acute', 'chronic', 'general'))
);

CREATE INDEX IF NOT EXISTS idx_content_clinic_kind
  ON public.clinic_content_items (clinic_id, kind, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_tags
  ON public.clinic_content_items USING gin (tags);

ALTER TABLE public.clinic_content_items ENABLE ROW LEVEL SECURITY;

-- Staff: full access in own clinic; super-admin: all.
DROP POLICY IF EXISTS "content_staff_rbac" ON public.clinic_content_items;
CREATE POLICY "content_staff_rbac" ON public.clinic_content_items
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- Patients: read only, only published items in their clinic.
DROP POLICY IF EXISTS "content_patient_read" ON public.clinic_content_items;
CREATE POLICY "content_patient_read" ON public.clinic_content_items
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND clinic_id = (
      SELECT clinic_id FROM public.patients WHERE id = public.current_patient_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 7) patient_content_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_content_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES public.clinics(id)              ON DELETE CASCADE,
  patient_id    uuid NOT NULL REFERENCES public.patients(id)             ON DELETE CASCADE,
  content_id    uuid NOT NULL REFERENCES public.clinic_content_items(id) ON DELETE CASCADE,
  assigned_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  viewed_at     timestamptz,
  completed_at  timestamptz,
  CONSTRAINT patient_content_assignment_unique UNIQUE (patient_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_assign_patient
  ON public.patient_content_assignments (patient_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_assign_content
  ON public.patient_content_assignments (content_id);

ALTER TABLE public.patient_content_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignment_patient_self" ON public.patient_content_assignments;
CREATE POLICY "assignment_patient_self" ON public.patient_content_assignments
  FOR ALL TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

-- ---------------------------------------------------------------------------
-- 8) patient_app_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_app_settings (
  patient_id        uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  locale            text NOT NULL DEFAULT 'en-IN',
  channels          jsonb NOT NULL DEFAULT '{"push":true,"whatsapp":true,"sms":false,"email":false}'::jsonb,
  reminder_times    jsonb NOT NULL DEFAULT '{"morning":"07:30","afternoon":"13:30","evening":"19:30","night":"22:00"}'::jsonb,
  quiet_hours       jsonb NOT NULL DEFAULT '{"start":"22:30","end":"06:30"}'::jsonb,
  analytics_opt_in  boolean NOT NULL DEFAULT false,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_patient_self" ON public.patient_app_settings;
CREATE POLICY "settings_patient_self" ON public.patient_app_settings
  FOR ALL TO authenticated
  USING (
    patient_id = public.current_patient_id()
    OR public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_id
        AND p.clinic_id = public.current_profile_clinic_id()
    )
  )
  WITH CHECK (
    patient_id = public.current_patient_id()
  );

-- ---------------------------------------------------------------------------
-- 9) Extend patient_access_tokens.purpose CHECK to allow 'family_view'
-- ---------------------------------------------------------------------------
DO $extend_purpose$
BEGIN
  ALTER TABLE public.patient_access_tokens
    DROP CONSTRAINT IF EXISTS patient_access_tokens_purpose_check;
  ALTER TABLE public.patient_access_tokens
    ADD CONSTRAINT patient_access_tokens_purpose_check
    CHECK (purpose IN ('join_consultation', 'view_prescription', 'view_report', 'family_view', 'patient_login'));
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END $extend_purpose$;

-- ---------------------------------------------------------------------------
-- 10) Notification topics: nothing to migrate (notification_jobs.topic is text)
--     but document new topic strings for the worker dispatcher:
--       patient.medication_reminder
--       patient.diet_reminder
--       patient.follow_up_due
--       patient.appointment_reminder_24h
--       patient.appointment_reminder_1h
--       patient.message_from_clinic
--       patient.prescription_ready
--       patient.new_content
--
--     The notification_jobs.channel CHECK already allows 'inapp'.
--     We add a new logical 'push' channel by extending the CHECK.
-- ---------------------------------------------------------------------------
DO $extend_channel$
BEGIN
  ALTER TABLE public.notification_jobs
    DROP CONSTRAINT IF EXISTS notification_jobs_channel_check;
  ALTER TABLE public.notification_jobs
    ADD CONSTRAINT notification_jobs_channel_check
    CHECK (channel IN ('whatsapp', 'email', 'sms', 'inapp', 'push'));
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN others THEN NULL;
END $extend_channel$;

-- ---------------------------------------------------------------------------
-- End of 20260527000000_patient_mobile.sql
-- ---------------------------------------------------------------------------
