# GlowHomeo Assist — Database Schema (v2)

> Companion to `01_ARCHITECTURE.md` and `02_FOLDER_STRUCTURE.md`.
> The v1 schema (already in `supabase/migrations/2026042500…` →
> `20260503100…`) covers RBAC, patients, consultations,
> prescriptions, appointments, case_outcomes, follow_ups, marketing
> leads, etc. The v2 work is **additive** — it formalizes the
> consult workspace, AI scribe, media, and PDFs.

---

## 1. Conceptual model (FHIR-shaped, simplified)

```
clinic ──┬── profile (1:1 with auth.user, role-bearing)
         │
         ├── patient ──┬── allergy_entry           [json]
         │             ├── appointment ────────┐
         │             ├── encounter (= consultation) ◄── attending_doctor (profile)
         │             │   ├── observation [n]   (chief complaint, mind, …)
         │             │   ├── prescription [0..1]
         │             │   │   └── prescription_item [n]
         │             │   ├── case_outcome [0..1]
         │             │   ├── follow_up [0..n]
         │             │   ├── audio_session [0..n] (PCM frames, short-lived)
         │             │   ├── scribe_job [0..n]    (transcript + draft + final)
         │             │   ├── media_object [0..n]  (PDF, photo, document)
         │             │   └── audit.event [n]      (append-only)
         │             │
         │             ├── message_thread
         │             │     └── message
         │             └── treatment_plan_assignment
         │
         ├── advice_template
         ├── treatment_plan
         └── remedy (curated catalog)
```

Names in **bold** below are net-new tables introduced by v2.
Names in italics are *existing* tables we slightly extend.

---

## 2. Existing tables (kept, summarised)

| Table                      | Owner module      | Notes                                                                  |
| -------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `public.clinics`           | identity          | Multi-tenant root. RLS-readable by tenant members + super_admin.       |
| `public.profiles`          | identity          | 1:1 with `auth.users`. `role ∈ {super_admin, admin, doctor, support}`. |
| `public.patients`          | patients          | `clinic_id`, `assigned_doctor_id`, demographics, `dob`, `allergies`.   |
| `public.consultations`     | encounters        | `lifecycle_status`, `clinical_record jsonb`, `attending_user_id`.      |
| `public.prescriptions`     | prescriptions     | `items jsonb`, links to consultation.                                  |
| `public.appointments`      | continuity        | `scheduled_for`, status, `follow_up_to_consultation_id`.               |
| `public.case_outcomes`     | continuity        | One per consultation. Five-valued `outcome`.                           |
| `public.follow_ups`        | continuity        | `due_at`, `status`, `reminder_*`.                                      |
| `public.file_objects`      | media             | Generic storage pointer (legacy).                                      |
| `public.advice_templates`  | library           | Diet/lifestyle templates.                                              |
| `public.treatment_plans`   | library           | Multi-week care plans.                                                 |
| `public.marketing_leads`   | (separate ctx)    | Public landing-page lead capture.                                      |

These all have RLS enabled (see `20260425000000_rbac_foundation.sql`).

---

## 3. New tables introduced by v2

### 3.1 `public.encounter_observations` *(structured per-step data, optional)*

Most observations live inside `consultations.clinical_record` JSON for
speed. This table exists for **searchable, queryable** observations
(e.g. "list all patients whose Mind/Anxiety > 7 last quarter"). The
9-step UI writes the JSON; a *trigger* fans out a few canonical
observations into this table.

```sql
CREATE TABLE public.encounter_observations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id          uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id         uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id    uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  step               text NOT NULL,             -- 'chief_complaint' | 'history' | 'examination' | ...
  category           text,                      -- e.g. 'mind', 'sleep', 'appetite'
  label              text NOT NULL,
  value_text         text,
  value_number       numeric,
  rubric_codes       text[],                    -- repertory rubrics for analytics
  recorded_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_obs_patient ON public.encounter_observations (patient_id, recorded_at DESC);
CREATE INDEX idx_obs_consult ON public.encounter_observations (consultation_id);
CREATE INDEX idx_obs_step    ON public.encounter_observations (clinic_id, step);
```

### 3.2 `public.audio_sessions` *(consent + short-lived recording metadata)*

```sql
CREATE TABLE public.audio_sessions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id              uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  consultation_id        uuid NOT NULL REFERENCES public.consultations(id)  ON DELETE CASCADE,
  doctor_id              uuid NOT NULL REFERENCES auth.users(id)            ON DELETE RESTRICT,
  started_at             timestamptz NOT NULL DEFAULT now(),
  ended_at               timestamptz,
  duration_seconds       integer,
  consent_captured       boolean NOT NULL DEFAULT false,
  consent_text           text,
  store_recording        boolean NOT NULL DEFAULT false,
  recording_object_key   text,                  -- null unless store_recording=true
  retention_days         integer NOT NULL DEFAULT 7,
  deleted_at             timestamptz
);

CREATE INDEX idx_audio_consult ON public.audio_sessions (consultation_id);
CREATE INDEX idx_audio_purge   ON public.audio_sessions (deleted_at, retention_days)
  WHERE deleted_at IS NULL;
```

### 3.3 `public.scribe_jobs` *(AI scribe lifecycle)*

```sql
CREATE TABLE public.scribe_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  consultation_id     uuid NOT NULL REFERENCES public.consultations(id)  ON DELETE CASCADE,
  audio_session_id    uuid          REFERENCES public.audio_sessions(id) ON DELETE SET NULL,
  doctor_id           uuid NOT NULL REFERENCES auth.users(id)            ON DELETE RESTRICT,
  status              text NOT NULL DEFAULT 'PENDING',
                       -- PENDING | STREAMING | DRAFTED | INSERTED | FAILED | DISCARDED
  provider            text NOT NULL DEFAULT 'gemini',
                       -- 'gemini' | 'mock' | <future provider>
  prompt_template     text,
  transcript_text     text,
  transcript_lang     text,
  draft_record        jsonb,                    -- parallel shape to consultations.clinical_record
  error_code          text,
  error_message       text,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz
);

CREATE INDEX idx_scribe_consult ON public.scribe_jobs (consultation_id, started_at DESC);
CREATE INDEX idx_scribe_status  ON public.scribe_jobs (clinic_id, status);
```

### 3.4 `public.media_objects` *(unified PDF / photo / document store)*

Replaces ad-hoc usage of `file_objects` for new content. Existing
`file_objects` rows stay; new code writes here.

```sql
CREATE TABLE public.media_objects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           uuid NOT NULL REFERENCES public.clinics(id)        ON DELETE CASCADE,
  patient_id          uuid          REFERENCES public.patients(id)       ON DELETE CASCADE,
  consultation_id     uuid          REFERENCES public.consultations(id)  ON DELETE CASCADE,
  uploaded_by         uuid NOT NULL REFERENCES auth.users(id),
  kind                text NOT NULL,
                       -- 'prescription_pdf' | 'case_summary_pdf' | 'patient_photo' | 'document'
  storage_bucket      text NOT NULL,
  storage_object_key  text NOT NULL,
  mime_type           text NOT NULL,
  size_bytes          integer,
  checksum_sha256     text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX idx_media_patient ON public.media_objects (patient_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_media_consult ON public.media_objects (consultation_id)
  WHERE deleted_at IS NULL;
```

### 3.5 `public.notification_jobs` *(WhatsApp / email, idempotent)*

```sql
CREATE TABLE public.notification_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id      uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  channel         text NOT NULL,                -- 'whatsapp' | 'email' | 'sms'
  topic           text NOT NULL,                -- 'follow_up_reminder' | 'prescription_ready' | 'outcome_check'
  payload         jsonb NOT NULL,
  idempotency_key text NOT NULL,
  scheduled_for   timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'QUEUED', -- QUEUED | SENT | FAILED | CANCELLED
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, idempotency_key)
);

CREATE INDEX idx_notif_due ON public.notification_jobs (status, scheduled_for)
  WHERE status = 'QUEUED';
```

### 3.6 `public.video_sessions` *(phase 3 — placeholder columns now)*

We add this in v2 so the schema is stable; phase 3 fills the route.

```sql
CREATE TABLE public.video_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             uuid NOT NULL REFERENCES public.clinics(id)       ON DELETE CASCADE,
  consultation_id       uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  provider              text NOT NULL DEFAULT 'cloudflare',
  room_id               text NOT NULL,
  doctor_token_hash     text,
  patient_token_hash    text,
  started_at            timestamptz,
  ended_at              timestamptz,
  status                text NOT NULL DEFAULT 'PROVISIONED',
                         -- PROVISIONED | LIVE | ENDED | FAILED
  recording_object_key  text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX video_sessions_one_per_consult
  ON public.video_sessions (consultation_id)
  WHERE status <> 'ENDED' AND status <> 'FAILED';
```

### 3.7 `audit.events` *(append-only)*

```sql
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.events (
  id            bigserial PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  clinic_id     uuid,
  actor_id      uuid,
  actor_role    text,
  entity_type   text NOT NULL,                  -- 'consultation' | 'patient' | 'prescription' | …
  entity_id     uuid,
  action        text NOT NULL,                  -- 'created' | 'finalized' | 'finalized_overridden' | …
  payload       jsonb,
  ip            inet,
  user_agent    text
);

CREATE INDEX idx_audit_entity ON audit.events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_clinic ON audit.events (clinic_id, occurred_at DESC);

REVOKE INSERT, UPDATE, DELETE ON audit.events FROM anon, authenticated;
GRANT INSERT ON audit.events TO service_role;
```

---

## 4. Extensions to existing tables

```sql
-- 4.1 consultations
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'IN_CLINIC',
  ADD COLUMN IF NOT EXISTS active_step text,            -- '1_context' | '2_chief_complaint' | …
  ADD COLUMN IF NOT EXISTS pdf_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pdf_object_id uuid REFERENCES public.media_objects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS draft_autosaved_at timestamptz;

ALTER TABLE public.consultations
  DROP CONSTRAINT IF EXISTS consultations_mode_check,
  ADD CONSTRAINT consultations_mode_check
    CHECK (mode IN ('IN_CLINIC', 'ONLINE'));

-- 4.2 patients: structured allergies + intake fields
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS allergies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_channel text DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_patients_tags ON public.patients USING gin (tags);

-- 4.3 prescriptions: branded preferences + signed flag
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

---

## 5. RLS policies (new tables)

All new tables follow the same RBAC pattern already used by
`appointments` and `case_outcomes`:

```sql
ALTER TABLE public.encounter_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scribe_jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_objects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_sessions         ENABLE ROW LEVEL SECURITY;

-- one policy per table, identical shape:
CREATE POLICY "<table>_rbac" ON public.<table>
  FOR ALL TO authenticated
  USING (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  )
  WITH CHECK (
    public.is_platform_super_admin()
    OR clinic_id = public.current_profile_clinic_id()
  );
```

Doctor-vs-doctor scoping happens via the parent `consultation_id` /
`patient_id`, which already enforce `assigned_doctor_id` /
`attending_user_id` rules from v1.

`audit.events` is not exposed to RLS — only `service_role` can INSERT,
and only super_admin can read via a SECURITY DEFINER function:

```sql
CREATE OR REPLACE FUNCTION audit.read_recent(p_clinic uuid, p_limit int)
RETURNS SETOF audit.events
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = audit, public
AS $$
  SELECT * FROM audit.events
  WHERE (p_clinic IS NULL OR clinic_id = p_clinic)
  ORDER BY occurred_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;
REVOKE ALL ON FUNCTION audit.read_recent(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION audit.read_recent(uuid, int) TO authenticated;
```

The function body then checks the caller's role via
`public.is_platform_super_admin()` and raises if false. *(Implementation
detail in the migration file.)*

---

## 6. JSON contract: `consultations.clinical_record`

This is the **canonical shape** the 9-step UI reads/writes. Defined in
`packages/domain/src/schemas/clinicalRecord.ts` (Zod). Storing it as
JSONB keeps the migration cost low while we iterate; once stable we
denormalize hot columns.

```ts
// packages/domain/src/schemas/clinicalRecord.ts (shape, illustrative)
export const ClinicalRecord = z.object({
  version: z.number().int(),
  patientContext: z.object({
    confirmedDemographics: z.boolean(),
    confirmedAllergies: z.boolean(),
    visitType: z.enum(["INITIAL", "FOLLOW_UP"])
  }),
  chiefComplaint: z.object({
    summary: z.string(),
    onset: z.string().optional(),
    severity: z.number().min(0).max(10).optional(),
    location: z.string().optional()
  }),
  history: z.object({
    pastIllnesses: z.string().optional(),
    familyHistory: z.string().optional(),
    drugs: z.string().optional(),
    surgeries: z.string().optional()
  }),
  examination: z.object({
    general: z.string().optional(),
    systemic: z.record(z.string()).optional(), // e.g. { cvs: "...", rs: "..." }
    vitals: z.object({
      bp: z.string().optional(),
      pulse: z.number().optional(),
      temperature: z.number().optional(),
      spo2: z.number().optional()
    }).partial().optional()
  }),
  assessment: z.object({
    mind: z.string().optional(),
    sleep: z.string().optional(),
    appetite: z.string().optional(),
    thermals: z.string().optional(),
    differentials: z.array(z.string()).optional()
  }),
  prescription: z.object({
    items: z.array(PrescriptionItem),
    durationDays: z.number().int().positive(),
    notes: z.string().optional()
  }),
  advice: z.object({
    diet: z.string(),
    lifestyle: z.string()
  }),
  outcome: z.object({
    note: z.string().optional(),
    followUpRecommendedAt: z.string().datetime().optional()
  })
});
```

The 9 steps in the UI are 1:1 with the keys above plus `finalize`.

---

## 7. Indexes & query patterns

| Hot query                                            | Index                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| "today's appointments for this clinic"               | `idx_appointments_clinic_scheduled` ✓                                              |
| "doctor's day"                                        | `idx_appointments_doctor_scheduled` ✓                                              |
| "patient's last 10 visits"                           | new: `CREATE INDEX idx_consult_patient ON public.consultations (patient_id, started_at DESC);` |
| "pending follow-ups overdue"                         | `CREATE INDEX idx_followups_due ON public.follow_ups (clinic_id, due_at) WHERE status='PENDING';` |
| "outcome pending on prior visit"                     | view `vw_pending_outcome_consults` (described below)                              |
| "today's AI scribe usage by doctor"                  | `idx_scribe_status`                                                                |
| "patient search by name/phone"                       | `CREATE INDEX idx_patients_search ON public.patients USING gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(phone,'')));` |

### View: pending prior outcome

```sql
CREATE OR REPLACE VIEW public.vw_pending_outcome_consults AS
SELECT c.*
FROM public.consultations c
WHERE c.lifecycle_status = 'FINALIZED'
  AND NOT EXISTS (
    SELECT 1 FROM public.case_outcomes o
    WHERE o.consultation_id = c.id
  )
  AND c.finalized_at > now() - interval '90 days';
```

(Already used implicitly by the current `pendingPriorOutcome` route; this
just makes it queryable.)

---

## 8. Storage buckets

| Bucket name             | Public? | Retention      | Used for                                  |
| ----------------------- | ------- | -------------- | ----------------------------------------- |
| `consultation-audio`    | private | 7 days         | PCM/Ogg if doctor opted in                |
| `prescription-pdfs`     | private | indefinite     | Final prescription PDFs                   |
| `case-summary-pdfs`     | private | indefinite     | Per-consult case summaries                |
| `patient-documents`     | private | indefinite     | Reports patient uploads (phase 4)         |
| `clinic-branding`       | private | indefinite     | Logo + signature (clinic-admin upload)    |

All accessed via signed URLs minted by the API (`s3.ts` style helper).
No public buckets exist in v2.

---

## 9. Triggers

```sql
-- Append-only audit on finalize
CREATE OR REPLACE FUNCTION public.on_consultation_finalized()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lifecycle_status = 'FINALIZED' AND OLD.lifecycle_status <> 'FINALIZED' THEN
    INSERT INTO audit.events (clinic_id, actor_id, entity_type, entity_id, action, payload)
    VALUES (
      NEW.clinic_id,
      auth.uid(),
      'consultation',
      NEW.id,
      'finalized',
      jsonb_build_object('finalized_at', NEW.finalized_at)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_consult_finalized ON public.consultations;
CREATE TRIGGER trg_consult_finalized
  AFTER UPDATE OF lifecycle_status ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.on_consultation_finalized();
```

A second trigger normalises **canonical observations** into
`encounter_observations` from `clinical_record`. It is intentionally
small (chief complaint + outcome only); we widen it as analytics
needs are proven.

---

## 10. Migration plan

A **single, additive** migration introduces every table/column above:

```
supabase/migrations/20260520000000_v2_consult_workspace.sql
```

Highlights:

- All `CREATE TABLE IF NOT EXISTS …`
- All `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`
- All RLS policies dropped + recreated via `DROP POLICY IF EXISTS …`
- Triggers and views recreated via `CREATE OR REPLACE …`
- No `DROP TABLE`, no `DROP COLUMN`

Rollback strategy: each new table can be dropped individually (no
existing FKs reference them yet). Migrations are forward-only; if we
need to back out a column, we ship a follow-up migration that **stops
writing** to it from the API, then drops it in a later migration.

---

## 11. Open questions (mirrors §10 of architecture doc)

- **Q1 (video provider)** decides whether `video_sessions.provider` is `cloudflare` or `livekit`.
- **Q2 (PDF engine)** changes where `prescription-pdfs` content comes from but **not** the schema.
- **Q3 (intake form)** would add `public.patient_intake_forms` (deferred).
- **Q4 (outcome chip placement)** is purely UX — schema already supports both.
- **Q5 (full repertorisation)** would later add `public.repertory_rubrics` + `public.materia_medica`.

If you accept the defaults proposed in those questions, **no further
schema work** is needed before the v2 phase begins.
