-- ============================================================================
-- PRE-DEPLOYMENT SANITY CHECK SCRIPT
-- ============================================================================
-- Run this script in your Supabase SQL Editor.
-- It verifies that all recent schema migrations and seed data have been 
-- successfully applied to the database before you deploy the frontend/API.
-- It will RAISE AN EXCEPTION if a critical schema element is missing,
-- and RAISE A NOTICE for warnings/successes.

DO $$
DECLARE
  v_count INT;
BEGIN
  RAISE NOTICE 'Starting Pre-Deployment Sanity Checks...';

  -- --------------------------------------------------------------------------
  -- 1. Check for 'template_type' in 'care_plan_templates'
  -- (From: 20260601000000_official_templates.sql)
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count
  FROM information_schema.columns 
  WHERE table_schema='public' 
    AND table_name='care_plan_templates' 
    AND column_name='template_type';
    
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL: care_plan_templates.template_type column is missing. The official_templates migration did NOT run.';
  ELSE
    RAISE NOTICE '✅ PASS: care_plan_templates.template_type exists.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. Check for 'is_official' in 'care_plan_media'
  -- (From: 20260601000000_official_templates.sql)
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count
  FROM information_schema.columns 
  WHERE table_schema='public' 
    AND table_name='care_plan_media' 
    AND column_name='is_official';
    
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL: care_plan_media.is_official column is missing.';
  ELSE
    RAISE NOTICE '✅ PASS: care_plan_media.is_official exists.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. Check for 'content_courses' table
  -- (From: 20260531000000_content_library_lms.sql)
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count
  FROM information_schema.tables 
  WHERE table_schema='public' 
    AND table_name='content_courses';
    
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL: content_courses table is missing. The LMS migration did NOT run.';
  ELSE
    RAISE NOTICE '✅ PASS: content_courses table exists.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 4. Check for System Clinic Seed
  -- (From: 20260601000000_official_templates.sql)
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count
  FROM public.clinics
  WHERE id = '00000000-0000-0000-0000-000000000000';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL: System Clinic (GlowHomeo Official) is missing.';
  ELSE
    RAISE NOTICE '✅ PASS: System Clinic exists.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 5. Check for Official Seed Templates
  -- (From: 20260601100000_seed_official_templates.sql)
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count
  FROM public.care_plan_templates
  WHERE template_type = 'official';
  
  IF v_count = 0 THEN
    RAISE WARNING '⚠️ WARN: 0 official templates found. Did you run the seed_official_templates.sql script?';
  ELSE
    RAISE NOTICE '✅ PASS: Found % official templates seeded.', v_count;
  END IF;

  -- --------------------------------------------------------------------------
  -- 6. Check for PostgREST Cache Stale Issue
  -- This ensures PostgREST can see the new columns. 
  -- (Can't natively test the REST API from here, but we can verify Postgres is healthy)
  -- --------------------------------------------------------------------------
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '🎉 ALL POSTGRES SCHEMA CHECKS PASSED SUCCESSFULLY! 🎉';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'IMPORTANT REMINDER: Ensure you have reloaded the PostgREST API schema cache in your Supabase dashboard before deploying the frontend!';

END $$;
