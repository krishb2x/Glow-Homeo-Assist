-- Optional seed: clinic admins sync approved Meta templates named telemedicine_* via Settings → WhatsApp → Sync.
-- Example bodies (Meta uses {{1}}…{{n}} in API; our app maps variables via whatsapp_templates.variables jsonb).

COMMENT ON TABLE public.whatsapp_templates IS
  'Telemedicine slugs: telemedicine_appointment_invite, telemedicine_appointment_reminder, telemedicine_consultation_summary, telemedicine_prescription_ready';
