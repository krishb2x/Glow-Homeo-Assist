-- =================================================================================
-- Migration: Transform MediTonic to Pure E-Commerce
-- Description: Completely removes all medical, clinical, and consultation features.
-- =================================================================================

BEGIN;

-- 1. Drop Medical and Consultation Tables (CASCADE handles dependent objects)
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.consultations CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.follow_ups CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.case_outcomes CASCADE;
DROP TABLE IF EXISTS public.encounter_observations CASCADE;
DROP TABLE IF EXISTS public.consultation_events CASCADE;
DROP TABLE IF EXISTS public.doctor_memos CASCADE;
DROP TABLE IF EXISTS public.patient_access_tokens CASCADE;

-- 2. Drop Treatment and Care Plan Tables
DROP TABLE IF EXISTS public.treatment_plans CASCADE;
DROP TABLE IF EXISTS public.advice_templates CASCADE;
DROP TABLE IF EXISTS public.care_plan_templates CASCADE;
DROP TABLE IF EXISTS public.care_plan_blocks CASCADE;
DROP TABLE IF EXISTS public.care_plan_media CASCADE;
DROP TABLE IF EXISTS public.care_plan_template_media CASCADE;
DROP TABLE IF EXISTS public.care_plan_favorites CASCADE;
DROP TABLE IF EXISTS public.care_plan_recent_usage CASCADE;
DROP TABLE IF EXISTS public.care_plan_template_courses CASCADE;

-- 3. Drop Telemedicine and Communications Tables
DROP TABLE IF EXISTS public.audio_sessions CASCADE;
DROP TABLE IF EXISTS public.video_sessions CASCADE;
DROP TABLE IF EXISTS public.scribe_jobs CASCADE;
DROP TABLE IF EXISTS public.patient_inbox_messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.conversation_messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;

-- 4. Drop Patient App & Mobile Tracking Tables
DROP TABLE IF EXISTS public.patient_push_tokens CASCADE;
DROP TABLE IF EXISTS public.patient_medication_logs CASCADE;
DROP TABLE IF EXISTS public.patient_diet_logs CASCADE;
DROP TABLE IF EXISTS public.patient_check_ins CASCADE;
DROP TABLE IF EXISTS public.patient_content_assignments CASCADE;
DROP TABLE IF EXISTS public.patient_app_settings CASCADE;
DROP TABLE IF EXISTS public.patient_lesson_progress CASCADE;

-- 5. Drop WhatsApp Integration Tables (if strictly clinical CRM)
DROP TABLE IF EXISTS public.whatsapp_connections CASCADE;
DROP TABLE IF EXISTS public.whatsapp_templates CASCADE;
DROP TABLE IF EXISTS public.whatsapp_broadcasts CASCADE;
DROP TABLE IF EXISTS public.whatsapp_broadcast_deliveries CASCADE;
DROP TABLE IF EXISTS public.whatsapp_webhook_events CASCADE;
DROP TABLE IF EXISTS public.messaging_consent_log CASCADE;

-- 6. Drop Extraneous CRM and Content Tables
DROP TABLE IF EXISTS public.marketing_lead_requests CASCADE;
DROP TABLE IF EXISTS public.clinic_feature_overrides CASCADE;
DROP TABLE IF EXISTS public.media_objects CASCADE;
DROP TABLE IF EXISTS public.notification_jobs CASCADE;
DROP TABLE IF EXISTS public.clinic_content_items CASCADE;
DROP TABLE IF EXISTS public.clinic_reference_counters CASCADE;
DROP TABLE IF EXISTS public.content_courses CASCADE;
DROP TABLE IF EXISTS public.content_modules CASCADE;
DROP TABLE IF EXISTS public.content_lessons CASCADE;

-- 7. Create E-Commerce Storefront Config Tables
CREATE TABLE IF NOT EXISTS public.mt_storefront_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    hero_banner_url TEXT,
    hero_title TEXT,
    hero_subtitle TEXT,
    featured_collection_ids UUID[], -- Array of mt_products IDs
    announcement_bar_text TEXT,
    announcement_bar_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id)
);

-- Enable RLS on new tables
ALTER TABLE public.mt_storefront_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access to storefront config
CREATE POLICY "Public can view storefront config" 
ON public.mt_storefront_config FOR SELECT 
USING (true);

-- Allow admins to update storefront config
CREATE POLICY "Admins can update storefront config" 
ON public.mt_storefront_config FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner', 'superadmin')
    )
);

COMMIT;
