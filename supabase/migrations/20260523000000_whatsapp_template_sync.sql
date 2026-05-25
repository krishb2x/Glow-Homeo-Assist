-- Meta template sync: idempotent upsert key + last sync timestamp (industry-standard WABA catalog mirror).

ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS meta_template_id text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_templates_meta_unique
  ON public.whatsapp_templates (clinic_id, meta_template_name, language_code)
  WHERE meta_template_name IS NOT NULL;
