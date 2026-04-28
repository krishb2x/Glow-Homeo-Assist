-- Platform admin: optional location and soft active flag for clinic management UI
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clinics.location IS 'Display label for admin UI (e.g. city, region)';
COMMENT ON COLUMN public.clinics.is_active IS 'When false, clinic is hidden from active operations';
