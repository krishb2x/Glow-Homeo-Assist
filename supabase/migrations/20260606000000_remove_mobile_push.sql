-- =============================================================================
-- Migration: Remove Mobile Push Tokens
--
-- Drops the `patient_push_tokens` table and its associated dependencies.
-- This aligns the database with the WhatsApp-first patient engagement strategy
-- by completely removing legacy mobile app scaffolding.
-- =============================================================================

-- Drop the table and its constraints/indexes
DROP TABLE IF EXISTS public.patient_push_tokens CASCADE;
