# Supabase migrations — apply on production

If Railway (or local) logs show errors like:

- `column appointments.consultation_mode does not exist`
- `Could not find the table 'public.patient_access_tokens' in the schema cache`

your **hosted Supabase database is behind** the application code. The API expects migrations through at least **`20260524000000_online_consultation.sql`**.

---

## Quick fix (Supabase SQL Editor)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Paste and run the contents of:

   **`supabase/migrations/20260524000000_online_consultation.sql`**

3. If you use v2 workspace features (PDF jobs, media, notifications), also run (in order):

   - `20260520000000_v2_consult_workspace.sql`
   - `20260522000000_enterprise_scalability.sql`
   - `20260521000000_whatsapp_business.sql` (if using WhatsApp)
   - `20260523000000_whatsapp_template_sync.sql`
   - `20260525000000_telemedicine_meta_templates.sql`
   - `20260526000000_doctor_memos.sql`
   - `20260527000000_patient_mobile.sql` (patient app — optional until mobile ships)

4. **Reload PostgREST schema** (usually automatic within ~1 minute; or restart the API container after apply).

5. Redeploy / restart the API on Railway.

---

## Full migration order (recommended)

Run all files under `supabase/migrations/` in **filename sort order** (timestamps ascending):

| Migration | What it adds |
|-----------|----------------|
| `20260425000000_rbac_foundation.sql` | RBAC, clinics, profiles |
| `20260425120000_homeosync_core.sql` | Appointments, follow_ups, case_outcomes |
| `20260425200000_patient_inbox_messages.sql` | Patient ↔ clinic messages |
| `20260426120000_clinics_admin_fields.sql` | Clinic admin fields |
| `20260426140000_clinical_consultation_workflow.sql` | Clinical record, lifecycle |
| `20260427120000_prescription_branding_consultation_mode.sql` | Rx branding, `consultations.consultation_mode` |
| `20260428100000_clinical_continuity.sql` | Patient allergies, file_objects.patient_id |
| `20260428200000_advice_templates_treatment_plans.sql` | Advice templates, treatment plans |
| `20260428210000_patient_dob.sql` | Date of birth |
| `20260428230000_plan_features.sql` | Plan features |
| `20260428000000_marketing_lead_requests.sql` | Marketing leads |
| `20260503100000_marketing_leads_workspace.sql` | Lead workspace |
| `20260520000000_v2_consult_workspace.sql` | media_objects, notification_jobs, video_sessions, … |
| **`20260524000000_online_consultation.sql`** | **`appointments.consultation_mode`, `patient_access_tokens`** ← fixes your crash |
| `20260521000000_whatsapp_business.sql` | WhatsApp tables |
| `20260522000000_enterprise_scalability.sql` | Patient metrics, job queue RPC |
| `20260523000000_whatsapp_template_sync.sql` | Template sync |
| `20260525000000_telemedicine_meta_templates.sql` | Meta templates |
| `20260526000000_doctor_memos.sql` | Doctor memos |
| `20260527000000_patient_mobile.sql` | Patient mobile tables |

---

## Option A — Supabase CLI (linked project)

```bash
# From repo root, with Supabase CLI installed and logged in
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This applies every migration in `supabase/migrations/` that is not yet recorded in `supabase_migrations.schema_migrations`.

---

## Option B — Manual SQL Editor

For each file in the table above (in order), open the file, copy all SQL, run in SQL Editor, confirm success before the next file.

---

## Verify after apply

In SQL Editor:

```sql
-- Should return without error
SELECT consultation_mode FROM public.appointments LIMIT 1;

-- Should return 0 rows (empty table is OK)
SELECT id FROM public.patient_access_tokens LIMIT 1;
```

Hit the API health check:

```bash
curl https://YOUR-RAILWAY-API-URL/health
```

Create an **online** appointment from the schedule UI — it should no longer crash the container.

---

## Railway environment note

Logs showing `injected env (0) from ../../.env` mean the container has **no `.env` file** (expected). Set variables in **Railway → Service → Variables**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV=production`
- `APP_PUBLIC_URL` / `NEXT_PUBLIC_SITE_URL` (your web app URL)
- `CORS_ORIGIN` (your web origin)

Do not rely on committing `.env` to the image.

---

## API behaviour after code update

- Missing telemedicine schema returns **503** with `SCHEMA_NOT_READY` instead of crashing Node.
- Production startup runs a schema probe for `patient_access_tokens` and `appointments.consultation_mode` and **fails fast** with a clear log if migrations are still missing.
