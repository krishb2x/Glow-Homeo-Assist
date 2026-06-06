-- Phase 7: Doctor Personalization Layer
-- Adds a field for the doctor to provide custom instructions to the AI Scribe.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_scribe_instructions text;
