-- Marketing leads: pipeline fields + super-admin RLS read/update (Express still uses service role).

ALTER TABLE public.marketing_lead_requests
  ADD COLUMN IF NOT EXISTS intent text NOT NULL DEFAULT 'walkthrough',
  ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill intent from legacy funnel label where possible.
UPDATE public.marketing_lead_requests
SET intent = 'trial'
WHERE intent = 'walkthrough'
  AND (
    clinic_name ILIKE '%trial%'
    OR clinic_name ILIKE '%90-day%'
  );

ALTER TABLE public.marketing_lead_requests
  DROP CONSTRAINT IF EXISTS marketing_lead_requests_intent_check;

ALTER TABLE public.marketing_lead_requests
  ADD CONSTRAINT marketing_lead_requests_intent_check
  CHECK (intent IN ('walkthrough', 'trial'));

ALTER TABLE public.marketing_lead_requests
  DROP CONSTRAINT IF EXISTS marketing_lead_requests_lead_status_check;

ALTER TABLE public.marketing_lead_requests
  ADD CONSTRAINT marketing_lead_requests_lead_status_check
  CHECK (lead_status IN ('new', 'contacted', 'qualified', 'closed', 'lost'));

CREATE INDEX IF NOT EXISTS idx_marketing_lead_requests_lead_status_created
  ON public.marketing_lead_requests (lead_status, created_at DESC);

GRANT SELECT, UPDATE ON public.marketing_lead_requests TO authenticated;

DROP POLICY IF EXISTS marketing_lead_requests_super_admin_select ON public.marketing_lead_requests;
DROP POLICY IF EXISTS marketing_lead_requests_super_admin_update ON public.marketing_lead_requests;

CREATE POLICY marketing_lead_requests_super_admin_select
  ON public.marketing_lead_requests
  FOR SELECT
  TO authenticated
  USING (public.is_platform_super_admin());

CREATE POLICY marketing_lead_requests_super_admin_update
  ON public.marketing_lead_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

COMMENT ON COLUMN public.marketing_lead_requests.intent IS 'walkthrough vs guided trial funnel';
COMMENT ON COLUMN public.marketing_lead_requests.lead_status IS 'Platform CRM pipeline stage';
COMMENT ON COLUMN public.marketing_lead_requests.admin_notes IS 'Internal notes visible only to platform admins';
