-- Daily.co video session lifecycle, consultation events audit trail, missed appointments.

ALTER TABLE public.video_sessions
  ADD COLUMN IF NOT EXISTS room_url text,
  ADD COLUMN IF NOT EXISTS room_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS doctor_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS patient_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS patient_waiting_since timestamptz,
  ADD COLUMN IF NOT EXISTS ended_reason text;

CREATE TABLE IF NOT EXISTS public.consultation_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  consultation_id  uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  video_session_id uuid REFERENCES public.video_sessions(id) ON DELETE SET NULL,
  event_type       text NOT NULL,
  actor_role       text,
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_events_consult
  ON public.consultation_events (consultation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_events_clinic
  ON public.consultation_events (clinic_id, created_at DESC);

ALTER TABLE public.consultation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consultation_events_rbac" ON public.consultation_events;
CREATE POLICY "consultation_events_rbac" ON public.consultation_events
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS missed_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_notified_at timestamptz;

-- Realtime: doctor + patient UIs sync video session state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'video_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_sessions;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
