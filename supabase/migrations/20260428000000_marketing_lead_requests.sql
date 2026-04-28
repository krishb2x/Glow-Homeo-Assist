-- Public marketing lead capture (submitted from landing; inserted via service role on API)
CREATE TABLE IF NOT EXISTS public.marketing_lead_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  clinic_name text NOT NULL,
  city text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_lead_requests_created
  ON public.marketing_lead_requests (created_at DESC);

ALTER TABLE public.marketing_lead_requests ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (bypass) inserts; no direct client access.

COMMENT ON TABLE public.marketing_lead_requests IS 'Demo / contact form submissions from the marketing site';
