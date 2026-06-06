# SQL Audit Report

**Date:** June 5, 2026
**Scope:** `supabase/migrations/`

## Audit Findings
Supabase migrations define the sequential evolution of the schema. The chain was audited to ensure no experimental branches or broken migrations remain.

## Classifications

🟢 **Active (Production Migrations):**
- `20260425000000_rbac_foundation.sql` to `20260601000000_official_templates.sql`
- `20260601100000_seed_official_templates.sql` (Seed data required for production LMS and CRM features).
- `20260605000000_whatsapp_dual_channel.sql` (WhatsApp strategy shift).
- `20260606000000_remove_mobile_push.sql` (Explicit teardown of mobile features).

🟡 **Needs Review (Retained but Monitored):**
- `20260527000000_patient_mobile.sql`: This file is named for the legacy mobile app, but it was *retained* because it contains critical tables repurposed for the WhatsApp ecosystem (`patient_medication_logs`, `patient_check_ins`, `clinic_content_items`). The table `patient_push_tokens` created in this file was cleanly dropped in a later migration rather than rewriting history.

🔴 **Obsolete (Removed):**
- No migrations were physically deleted from history to prevent breaking the Supabase migration hash chain. Instead, `20260606000000_remove_mobile_push.sql` was authored to safely execute the teardown in a production-compliant manner.
