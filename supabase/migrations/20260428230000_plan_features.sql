-- ─────────────────────────────────────────────────────────────────────────────
-- Plan-based feature access control
-- ─────────────────────────────────────────────────────────────────────────────

-- Plan tier on clinics (Basic / Pro / Enterprise)
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'BASIC'
  CHECK (plan_tier IN ('BASIC', 'PRO', 'ENTERPRISE'));

COMMENT ON COLUMN public.clinics.plan_tier IS
  'Subscription plan tier. Controls which premium features are available. Defaults to BASIC.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-clinic feature overrides (admin can override plan defaults for any clinic)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinic_feature_overrides (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    uuid        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  feature_key  text        NOT NULL CHECK (char_length(feature_key) BETWEEN 1 AND 100),
  enabled      boolean     NOT NULL,
  enabled_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, feature_key)
);

COMMENT ON TABLE public.clinic_feature_overrides IS
  'Admin-managed per-clinic feature flag overrides. Takes precedence over plan-tier defaults.';

COMMENT ON COLUMN public.clinic_feature_overrides.feature_key IS
  'Snake_case feature identifier: ai_notetaker, messages, whatsapp_integration, …';

CREATE INDEX IF NOT EXISTS clinic_feature_overrides_clinic_id_idx
  ON public.clinic_feature_overrides (clinic_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.clinic_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Super admins can read/write all overrides
CREATE POLICY "super_admin_all_features"
  ON public.clinic_feature_overrides
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Doctors can read their own clinic's feature overrides (to know what they can access)
CREATE POLICY "doctor_read_own_clinic_features"
  ON public.clinic_feature_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND clinic_id = public.clinic_feature_overrides.clinic_id
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_clinic_feature_override_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_clinic_feature_override_updated_at ON public.clinic_feature_overrides;
CREATE TRIGGER trg_clinic_feature_override_updated_at
  BEFORE UPDATE ON public.clinic_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION update_clinic_feature_override_timestamp();
