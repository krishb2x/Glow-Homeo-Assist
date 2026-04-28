# COMPREHENSIVE TECHNICAL & DESIGN AUDIT
## GlowHomeo Assist → HomeoSync (Proposed Redesign)

**Audit Date:** April 25, 2026  
**Scope:** Complete architecture, design, database, workflow, and infrastructure redesign  
**Approach:** Ground-up analysis with full restructuring flexibility

---

## EXECUTIVE SUMMARY

The current GlowHomeo Assist codebase represents a **strong clinical and technical foundation** but falls short of **premium, industry-standard healthcare SaaS**. This audit proposes a comprehensive redesign addressing:

1. **Product Identity Crisis** — "HomeoAssist" (generic AI tool) vs. actual value (clinic operations OS)
2. **UI/UX Disconnects** — Clinical flows don't match real homeopathy practice patterns
3. **Architecture Gaps** — Missing server-side security, session management, and state handling
4. **Database Schema Limitations** — Insufficient support for real-world clinic operations
5. **Scalability Concerns** — Single-node API, no caching, no async job queuing

**Recommendation:** Rebrand to **HomeoSync** and restructure across 6 dimensions (see below).

---

# PART 1: CURRENT STATE ASSESSMENT

## 1.1 What's Working Well ✓

### Strengths to Preserve
- **Clinical Model Alignment:** 9-step workflow genuinely reflects homeopathy practice rhythm
- **Multi-Tenant Architecture:** clinic_id partitioning is sound; RLS policies comprehensive
- **AI Integration Pattern:** Real-time transcription + note generation reduces documentation friction
- **Role-Based Design Philosophy:** Thoughtful role model (Super Admin → Admin → Doctor → Support → Patient)
- **Privacy-First Audio Handling:** Immediate deletion post-transcription respects physician-patient confidentiality
- **Flexible Prescription Format:** Doctor-visible vs. patient-visible codes bridge clinical rigor + patient clarity
- **Type Safety:** Domain models (Zod schemas) prevent runtime errors
- **Follow-up Logic:** 14-day auto-reminder respects homeopathic case progression

### Existing Assets to Keep
- Supabase architecture (proven at scale, built-in RLS, auth)
- Real-time WebSocket for audio (reduces latency vs. polling)
- Gemini AI integration for transcription/extraction
- S3 pre-signed URLs for file handling (secure, scalable)
- Tailwind CSS design tokens (warm, clinical palette)

---

## 1.2 Critical Problems Identified ❌

### Problem 1: Identity Confusion
**Current State:** "HomeoAssist AI" suggests an AI-first tool; actual product is a clinic OS
**Symptom:** Marketing copy emphasizes "AI assists" but docs describe "clinic operating system"
**Impact:** Confuses target audience; unclear differentiation vs. traditional EHRs
**Recommendation:** Rebrand to **HomeoSync** (emphasizes orchestration, synchronization of clinic workflows)

### Problem 2: UI/UX Doesn't Match Clinical Reality
**Current Issues:**
- Dashboard shows "today's patients" (arbitrary date boundary) vs. **next consultations** (what doctors actually need)
- No appointment/scheduling interface (doctors manually know schedules)
- Follow-ups calculated but **not actionable** (no messaging, no integration with doctor's calendar)
- Patient search shows "roster" vs. "ready to see" (semantic mismatch)
- Consultation UI is a single long form vs. **structured, multi-phase interview**
- No **case complexity indicator** (doctors don't see at-a-glance: "this patient needs 30 min vs. 10 min")
- Prescription builder is flat list vs. **remedy repertory interface** (homeopaths use repertories to find remedies)

### Problem 3: Authentication & Session Management
**Current Issues:**
- Tokens in localStorage (XSS vulnerability)
- No middleware.ts (client-side protection only)
- No refresh token mechanism
- Session state not queryable (doctor doesn't know if logged in until page loads)
- No role-based UI hiding (doctors see "Clinic Settings" even if not admin)

### Problem 4: Insufficient Clinical Features
**Missing:**
- Appointment/schedule management
- Patient communication (WhatsApp mentioned but not implemented)
- Symptom repertory / remedy lookup
- Constitutional type (Vithoulkas, Miasm classification)
- Case complexity/urgency tagging
- Clinic calendar / doctor availability
- Bulk reminders / clinic-wide messaging
- Audit trail for prescriptions (compliance, malpractice defense)
- Case confidentiality levels (public vs. internal notes)
- Referral management (to other doctors/specialists)

### Problem 5: Database Schema Limitations
**Current Issues:**
- `patients.assigned_doctor_id` is nullable → ambiguous ownership
- No appointment table (scheduling is implicit)
- No clinic_memberships audit (onboarding not tracked)
- No remedy metadata (remedies are freetext → no standardization)
- No consultation templates (each case starts blank)
- No differential diagnosis tracking (homeopaths compare remedies)
- No case outcome tracking (cure? palliation? no change?)
- `follow_ups` is auto-calculated, not doctor-intentional (what if doctor wants follow-up in 3 days for specific reason?)

### Problem 6: Scalability & Performance
**Current Issues:**
- Single Express server (no horizontal scaling)
- No caching layer (every consultation read hits Postgres)
- No async job queue (audio processing is synchronous/blocking)
- WebSocket attached to HTTP server (not scalable; need separate WebSocket server or message queue)
- No CDN for static assets (UI bundle loaded fresh each time)
- No request deduplication (client can spawn 100 requests in race condition)
- No rate limiting (API vulnerable to abuse)

### Problem 7: Missing Operational Infrastructure
**Current Issues:**
- No observability (no logging, metrics, tracing)
- No error alerting (bugs silent until user reports)
- No analytics (no data on feature usage, bottlenecks)
- No backup/DR strategy (single DB is single point of failure)
- No API versioning (breaking changes affect all clients)
- No deprecation path (cannot remove old endpoints without breaking clinics)

---

## 1.3 Gap Analysis: Current vs. Industry Standard

### Comparison: GlowHomeo vs. Top-Tier Clinical SaaS

| Dimension | GlowHomeo | Industry Standard | Gap |
|-----------|-----------|-----------------|-----|
| **Authentication** | Bearer token in localStorage | OAuth 2.0 + PKCE + httpOnly cookies | 🔴 CRITICAL |
| **Session Management** | No refresh token | Sliding window + refresh token rotation | 🔴 CRITICAL |
| **Rate Limiting** | None | 1000 req/min per user + sliding window | 🟡 HIGH |
| **Audit Logging** | Actor + action only | Full payload, before/after states | 🟡 HIGH |
| **Encryption** | In-transit (HTTPS) only | At-rest (DB) + in-transit + field-level | 🔴 CRITICAL |
| **Compliance** | Mentions privacy but not tested | HIPAA, GDPR compliance + audit ready | 🟡 HIGH |
| **Appointment Scheduling** | None | Calendar + SMS/email reminders | 🔴 CRITICAL |
| **Cache Layer** | No | Redis for consultation caches | 🟡 HIGH |
| **CDN** | No | CloudFront / Cloudflare + gzip | 🟡 HIGH |
| **API Versioning** | No | /api/v1/, /api/v2/, deprecation notices | 🟡 HIGH |
| **Analytics** | None | Segment / PostHog (usage + errors) | 🟡 MEDIUM |
| **Observability** | None | DataDog / New Relic (logs + metrics + traces) | 🟡 MEDIUM |

---

# PART 2: NEW ARCHITECTURE DESIGN

## 2.1 Product Rebrand & Repositioning

### New Identity: **HomeoSync**

**Tagline:** "The Synchronization Engine for Homeopathy Clinics"

**Why:** 
- "Sync" implies orchestration, coordination, staying in step with patient care rhythm
- Differentiates from generic "AI assistants"
- Emphasizes clinic workflow, not technology
- Memorable, short, domain-relevant

### Value Proposition (Revised)

**From:** "AI assists with documentation"  
**To:** "One synchronized workspace for clinic operations—patient scheduling, consultations, prescriptions, follow-ups, and team collaboration—keeping your practice on time and in step with patient care."

### Target Personas (Redefined)

| Persona | Current Pain | HomeoSync Solution |
|---------|--------------|-------------------|
| **Dr. Priya (Solo Practitioner, 40 patients/week)** | Spends 2 hours/day on admin (scheduling, notes, reminders). Prescription refills get lost. | Dashboard shows next 5 appointments + AI-drafted notes + auto-reminders = 40 min saved/day |
| **Clinic Admin Akshay (runs clinic for 4 doctors)** | Cannot see who's running behind. No visibility into case complexity. Doctor schedules overlap. | Real-time clinic view: doctor availability, queue depth, avg case time, pending follow-ups |
| **Clinic Director Meera** | No audit trail for prescriptions. Cannot defend against patient disputes. Onboarding takes 2 weeks. | Case audit log, encrypted prescription history, automated doctor provisioning, compliance reports |

---

## 2.2 Database Schema Redesign (v2)

### Current Issues
- `follow_ups` auto-calculated (not doctor-intentional)
- No appointments table
- No remedy metadata
- No case outcomes
- `assigned_doctor_id` ambiguous (owned vs. pool)

### New Schema (Simplified, Intentional)

```sql
-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Clinics (Tenant)
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  region TEXT NOT NULL DEFAULT 'IN',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  
  -- Subscription
  subscription_status TEXT NOT NULL DEFAULT 'TRIAL' 
    CHECK (subscription_status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
  subscription_ends_at TIMESTAMPTZ,
  
  -- Features
  features JSONB NOT NULL DEFAULT '{}'::JSONB,  -- { whatsapp_enabled, max_doctors, ... }
  
  -- Config
  case_outcome_required BOOLEAN NOT NULL DEFAULT FALSE,
  enable_remedy_suggestions BOOLEAN NOT NULL DEFAULT TRUE,
  clinic_timezone_offset_minutes INT NOT NULL DEFAULT 330,  -- IST = +330
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (Users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics (id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'doctor', 'support', 'patient')),
  
  -- Doctor-specific
  license_number TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Availability (ISO 8601 day-of-week schedule)
  working_hours JSONB,  -- { "MON": { "start": "09:00", "end": "18:00" }, ... }
  avg_consultation_minutes INT DEFAULT 30,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  
  -- Demographics
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  age SMALLINT,
  gender TEXT CHECK (gender IN ('M', 'F', 'Other', 'Prefer not to say')),
  
  -- Clinical
  initial_chief_complaint TEXT,
  constitutional_type TEXT,  -- Vithoulkas classification: Sulphur, Nux Vomica, etc.
  miasm TEXT,  -- Acute, Chronic, Syphilitic, Tubercular, Cancerous
  case_status TEXT NOT NULL DEFAULT 'ACTIVE' 
    CHECK (case_status IN ('ACTIVE', 'RESOLVED', 'CLOSED', 'REFERRED')),
  
  -- Assigned Care
  primary_doctor_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  assigned_to_pool BOOLEAN NOT NULL DEFAULT FALSE,  -- Can any doctor see?
  
  -- Preferences
  preferred_language TEXT DEFAULT 'hi',
  reminder_preference TEXT DEFAULT 'whatsapp' CHECK (reminder_preference IN ('whatsapp', 'sms', 'email', 'none')),
  
  -- Privacy
  confidentiality_level TEXT NOT NULL DEFAULT 'clinic' 
    CHECK (confidentiality_level IN ('public', 'clinic', 'doctor_only')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT patient_assignment CHECK (
    (primary_doctor_id IS NOT NULL AND assigned_to_pool = FALSE)
    OR (primary_doctor_id IS NULL AND assigned_to_pool = TRUE)
    OR (primary_doctor_id IS NOT NULL AND assigned_to_pool = TRUE)
  )
);

-- Appointments (NEW)
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  
  -- Schedule
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'CONFIRMED'
    CHECK (status IN ('REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  
  -- Notes
  reason TEXT,
  follow_up_to_consultation_id UUID,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (patient_id, scheduled_for)  -- No double-booking
);

-- Consultations
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments (id) ON DELETE SET NULL,
  
  -- Type
  type TEXT NOT NULL CHECK (type IN ('INITIAL', 'FOLLOW_UP')),
  
  -- Duration
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  
  -- Clinical Data
  recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  transcript_text TEXT,
  transcript_language TEXT DEFAULT 'mixed-hi-en',
  transcript_confidence NUMERIC(3, 2),
  
  -- Notes (3-phase)
  note_draft JSONB,  -- Auto-generated from transcript
  note_final JSONB,  -- Doctor-approved; immutable after finalized_at
  
  -- Case Complexity (NEW)
  complexity TEXT DEFAULT 'STANDARD' 
    CHECK (complexity IN ('SIMPLE', 'STANDARD', 'COMPLEX', 'URGENT')),
  
  -- Audio
  audio_object_key TEXT,
  audio_deleted_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES public.consultations (id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  
  -- Remedy Items
  items JSONB NOT NULL,  -- [{ remedy, potency, repetition, quantity, notes, ... }]
  
  -- Audit
  prescribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_at TIMESTAMPTZ,
  modified_by_doctor_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Follow-Ups (REDESIGNED: intentional, not auto-calculated)
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations (id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  
  -- Intentional Schedule
  due_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,  -- "Monitor remedy response" "Medication review" "Case assessment"
  
  -- Case Context
  case_outcome_expected TEXT,  -- "CURE" "PALLIATION" "MAINTENANCE"
  symptoms_to_monitor TEXT ARRAY,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED')),
  completed_at TIMESTAMPTZ,
  
  -- Communication
  reminder_sent_at TIMESTAMPTZ,
  reminder_channel TEXT,  -- 'whatsapp', 'sms', 'email'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case Outcomes (NEW)
CREATE TABLE public.case_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES public.consultations (id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  
  -- Outcome
  outcome TEXT NOT NULL CHECK (outcome IN ('CURE', 'IMPROVEMENT', 'PALLIATION', 'NO_CHANGE', 'WORSE')),
  assessment TEXT,  -- Free-form doctor notes on case progress
  
  -- Concomitants (symptoms that appeared/disappeared)
  symptoms_resolved TEXT ARRAY,
  symptoms_improved TEXT ARRAY,
  symptoms_worsened TEXT ARRAY,
  
  -- Next Steps
  recommended_action TEXT,  -- "Continue same remedy" "Change potency" "Switch remedy" "Refer to MD"
  
  documented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Remedy Metadata (NEW: homeopathy-specific)
CREATE TABLE public.remedies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  
  -- Core
  name TEXT NOT NULL,  -- "Sulphur" "Nux Vomica" etc.
  abbreviation TEXT,  -- "S" "NV"
  
  -- Classification
  source TEXT,  -- "Animal" "Vegetable" "Mineral"
  kingdom TEXT,
  family TEXT,
  
  -- Potencies in Use
  available_potencies TEXT ARRAY DEFAULT ARRAY['6C', '12C', '30C', '200C', 'Q'],
  
  -- Clinical Notes
  scope TEXT,  -- Homeopathy Repertory description
  constitution TEXT,  -- Primary constitutional type
  keynotes TEXT ARRAY,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (clinic_id, name)
);

-- Differential Diagnosis Tracking (NEW)
CREATE TABLE public.differential_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES public.consultations (id) ON DELETE CASCADE,
  
  -- Candidates
  remedies JSONB NOT NULL,  -- [{ remedy, score, reason }, ...]
  selected_remedy UUID REFERENCES public.remedies (id) ON DELETE SET NULL,
  
  -- Reasoning
  rubric_used TEXT,  -- "Sulphur: skin worse after bathing"
  rationale TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- AUDIT & COMPLIANCE
-- ============================================================================

-- Audit Log (comprehensive)
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  
  actor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- "CONSULTATION_STARTED" "PRESCRIPTION_CREATED" etc.
  resource_type TEXT NOT NULL,  -- "consultation", "prescription"
  resource_id UUID NOT NULL,
  
  -- Full Changesets
  before_state JSONB,
  after_state JSONB,
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  INDEX audit_log_clinic_id ON audit_log (clinic_id),
  INDEX audit_log_resource ON audit_log (clinic_id, resource_type, resource_id)
);

-- Consent Records (GDPR/privacy)
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  
  consent_type TEXT NOT NULL,  -- "TREATMENT" "DATA_SHARING" "RECORDINGS"
  granted BOOLEAN NOT NULL,
  consent_document_url TEXT,
  
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- RLS POLICIES (same foundation, expanded for new tables)
-- ============================================================================
-- [See Part 2.3 for comprehensive RLS policies]
```

### Key Schema Changes
1. **Intentional Follow-Ups:** `follow_ups` no longer auto-calculated; doctor explicitly creates with reason
2. **Appointments Table:** Explicit scheduling (essential for clinical operations)
3. **Case Outcomes:** Track cure/improvement/palliation (closes feedback loop)
4. **Remedy Metadata:** Standardized remedy database (enables suggestions)
5. **Differential Diagnosis:** Document remedy selection reasoning (improves learning + defense)
6. **Comprehensive Audit Log:** before/after states for compliance
7. **Consent Records:** GDPR/privacy compliance
8. **Case Complexity:** Tag for better scheduling + doctor capacity planning
9. **Doctor Availability:** `working_hours` + `avg_consultation_minutes` for smart scheduling

---

## 2.3 Security Architecture (v2)

### Authentication & Session (Complete Redesign)

**Current Problems:**
- Bearer token in localStorage
- No refresh token
- No middleware protection

**New Design:**

```
┌─────────────────────────────────────────────────────────────┐
│ LOGIN FLOW (OAuth 2.0 + PKCE)                              │
└─────────────────────────────────────────────────────────────┘

1. Client initiates login:
   POST /auth/login
   { email: "doctor@clinic.com", password: "..." }

2. Backend validates via Supabase Auth:
   supabaseAdmin.auth.signInWithPassword(email, password)
   → Returns JWT access token + refresh token

3. Backend creates session:
   - Queries profiles table for role + clinic_id
   - Creates secure HttpOnly cookie:
     Set-Cookie: hs_session=<signed JWT>; 
                 HttpOnly; 
                 Secure; 
                 SameSite=Lax; 
                 Max-Age=3600

4. Backend also returns refresh token (in HttpOnly cookie):
   Set-Cookie: hs_refresh=<refresh token>; 
               HttpOnly; 
               Secure; 
               SameSite=Lax; 
               Max-Age=604800

5. Client stores: nothing in localStorage
   Browser automatically includes cookies in requests

┌─────────────────────────────────────────────────────────────┐
│ REQUEST FLOW (Middleware)                                   │
└─────────────────────────────────────────────────────────────┘

1. Client requests GET /api/doctor/patients
   Browser includes: Cookie: hs_session=...

2. Middleware.ts (Edge, runs server-side):
   - Extracts hs_session cookie
   - Decodes signed JWT
   - If expired, tries refresh token
   - If valid, attaches user claim to request headers
   - If invalid, redirects to /login

3. API receives request with verified user context:
   const userId = request.headers.get('x-user-id');
   const role = request.headers.get('x-user-role');
   const clinicId = request.headers.get('x-clinic-id');

┌─────────────────────────────────────────────────────────────┐
│ TOKEN REFRESH (Sliding Window)                              │
└─────────────────────────────────────────────────────────────┘

After 30 minutes of activity:
1. Middleware detects hs_session expiring soon
2. Automatically refreshes via hs_refresh token
3. Issues new hs_session cookie
4. No user disruption (transparent refresh)

┌─────────────────────────────────────────────────────────────┐
│ LOGOUT FLOW                                                 │
└─────────────────────────────────────────────────────────────┘

1. Client: POST /auth/logout
2. Backend:
   - Invalidates refresh token (optional: add to blacklist DB)
   - Clears hs_session + hs_refresh cookies
3. Client redirected to /login
```

### Field-Level Encryption (Sensitive Data)

```typescript
// Prescriptions: sensitive medical information
CREATE TABLE public.prescriptions (
  ...
  items JSONB NOT NULL,  
  // items is encrypted at-rest in Supabase (column encryption)
  // Supabase Encryption: https://supabase.com/docs/guides/database/encryption
);

// Consult notes: patient sensitive
CREATE TABLE public.consultations (
  ...
  note_draft JSONB ENCRYPTED,  // Always encrypted
  note_final JSONB ENCRYPTED,  // Always encrypted
);

// Implementation: Supabase Vault or custom encryption middleware
```

### Role-Based Access Control (Enhanced)

```sql
-- Super Admin: Platform scope
-- Admin: Clinic scope + can manage doctors
-- Doctor: Patient + consultation scope + assigned cases
-- Support: Read-only, operational diagnostics
-- Patient: Own data only

CREATE POLICY "audit_log_admin_clinic"
  ON public.audit_log
  FOR SELECT
  USING (
    public.is_platform_super_admin()
    OR (
      clinic_id = current_profile_clinic_id()
      AND current_profile_role() IN ('admin', 'doctor')
    )
  );
```

### Rate Limiting & DDoS Protection

```typescript
// API Gateway (Cloudflare / Kong):
// - 1000 req/min per authenticated user
// - 100 req/min per IP (unauthenticated)
// - Burst: 50 req/sec
// - Sliding window algorithm

// Implementation: Redis-backed rate limiter
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: new RedisStore({ client: redis })
}));
```

---

## 2.4 UI/UX Redesign

### Design Principles (New)

| Principle | Current | New | Rationale |
|-----------|---------|-----|-----------|
| **Appointment-First** | Patient list (passive) | Calendar view (active) | Doctors think in time blocks, not lists |
| **Role-Specific UI** | Show all features | Show only user's role features | Reduce cognitive load; faster decision-making |
| **Real-Time Indicators** | None | Doctor availability, queue depth | Admin visibility into clinic status |
| **Case Complexity Tags** | None | Color-coded tags (urgent/complex/standard) | Triage at a glance |
| **Audit Trail Visible** | Implicit | Explicit "View Changes" button | Trust + compliance |
| **Progressive Disclosure** | Flat interface | Expandable sections | Advanced features don't clutter simple workflows |

### New Product Suite

```
├─ HomeoSync Clinic Dashboard (Admin)
│  ├─ Real-time clinic status (doctors online, queue, avg wait time)
│  ├─ Doctor availability heatmap
│  ├─ Today's schedule overview (all doctors)
│  ├─ Pending follow-ups / urgent cases
│  └─ Performance metrics (appointment utilization, case closure rate)
│
├─ HomeoSync Doctor Portal (Doctor)
│  ├─ My Day dashboard
│  │  ├─ Next 5 appointments (with case complexity)
│  │  ├─ Urgent follow-ups (due today)
│  │  └─ Pending case outcomes (need closure)
│  ├─ Live Consultation UI (during appointment)
│  │  ├─ Patient profile + history (right pane)
│  │  ├─ Real-time transcript + AI suggestions (center)
│  │  ├─ Quick prescription builder (bottom drawer)
│  │  └─ Audio recording indicator
│  ├─ Remedy Suggester (intelligence)
│  │  ├─ Repertory search
│  │  ├─ Differential diagnosis tool
│  │  └─ Previously-used remedies for patient
│  ├─ Patient Library
│  │  ├─ Filter by case status (ACTIVE, RESOLVED, REFERRED)
│  │  ├─ Sort by urgency / last visit
│  │  └─ Bulk actions (send reminder, schedule follow-up)
│  └─ Case Archive (past cases, outcomes)
│
├─ HomeoSync Patient Portal (Patient)
│  ├─ Book appointment (self-service)
│  ├─ View prescriptions (code-based)
│  ├─ Receive reminders (WhatsApp/SMS)
│  └─ Case timeline (summary only)
│
└─ HomeoSync Platform Admin (Super Admin)
   ├─ Clinic management (onboarding, subscriptions)
   ├─ Doctor verification (license checks)
   ├─ Global feature flags
   └─ Cross-clinic analytics
```

### Color Palette (Revised)

**Keep current warm palette, add semantic colors:**

```css
/* Core */
--color-primary: #1B6B5C;      /* Leaf green - trust, healing */
--color-secondary: #D4A574;    /* Warm tan - approachable */
--color-background: #F7F5F0;   /* Cream - calm */
--color-surface: #FFFCF8;      /* Paper white - clean */
--color-text: #1C1917;         /* Ink - readability */
--color-muted: #57534E;        /* Taupe - secondary */
--color-border: #D6CDBF;       /* Soft border */

/* Semantic */
--color-success: #2D6A4F;      /* Deep green - completed */
--color-warning: #D99E2B;      /* Amber - pending */
--color-danger: #8B4B4B;       /* Rust - urgent/error */
--color-info: #1E7D8D;         /* Teal - informational */

/* Case Complexity */
--color-simple: #A8D5BA;       /* Light green - simple case */
--color-standard: #7EB3B3;     /* Teal - standard case */
--color-complex: #D4A574;      /* Warm tan - complex case */
--color-urgent: #8B4B4B;       /* Rust - urgent case */
```

### UI Component Specs (Examples)

#### Consultation UI (Live Session)

```tsx
// New three-pane layout
┌─────────────────────────────────────────────────────────┐
│ HEADER: Patient Name | Time: 09:15–09:45 | Status: IN_PROGRESS
├─────────────────────────────────────────────────────────┤
│ LEFT PANE           │ CENTER             │ RIGHT PANE   │
│ (25%)               │ (50%)              │ (25%)        │
├─────────────────────┼────────────────────┼──────────────┤
│ Patient History:    │ LIVE TRANSCRIPT    │ Suggestions: │
│                     │                    │              │
│ Chief Complaint:    │ [Real-time]        │ Remedies:    │
│ Cough, 3 weeks      │                    │ • Sulphur    │
│                     │ "Started with      │ • Pulsatilla │
│ Age: 34 M           │ cough after rain..." │              │
│                     │                    │ Rubrics:     │
│ Last Visit:         │ [Audio waveform]   │ "Cough, dry" │
│ 3 months ago        │                    │ "Worse rain" │
│                     │ [Copy / Revise]    │              │
│ Remedies Used:      │                    │ Record:      │
│ • Pulsatilla 30C    │ AI Suggestion:     │ ☑ Recording  │
│ • Nat Sulph 6C      │ "Cough worse       │              │
│                     │  in morning?"      │              │
│ Case Status:        │                    │              │
│ ACTIVE              │ [Accept / Revise]  │              │
│                     │                    │              │
│ Urgency: STANDARD   │                    │              │
└─────────────────────┴────────────────────┴──────────────┘
│ BOTTOM DRAWER: Quick Prescription Builder
│ ┌─────────────────────────────────────────────────────┐
│ │ Remedy: [Sulphur v] | Potency: [200C v]            │
│ │ Repetition: [Once a day] | Qty: [30 pills]         │
│ │ Patient Instructions: [Typical pattern...]          │
│ │ [+ Add Item]  [Finalize Prescription]               │
│ └─────────────────────────────────────────────────────┘
```

#### Doctor Dashboard (My Day)

```
┌─────────────────────────────────────────────────────────┐
│ MY DAY - Thursday, Apr 25                               │
├─────────────────────────────────────────────────────────┤
│ UPCOMING APPOINTMENTS                                   │
│ ┌───────────────────────────────────────────────────┐   │
│ │ 09:15 - 09:45 │ Priya Sharma          │ STANDARD │   │
│ │                 Cough, 3 weeks         │ Respiratory  │
│ │                 Last: 3 mo. ago        │ 🟢 On-time  │
│ └───────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────┐   │
│ │ 10:00 - 10:45 │ Raj Kumar             │ COMPLEX  │   │
│ │                 Migraines + anxiety    │ Neurological │
│ │                 Last: 2 weeks          │ 🟡 Follow-up │
│ │                 ⚠ Waiting for outcome  │              │
│ └───────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────┐   │
│ │ 11:00 - 11:30 │ Clinic Pool           │ SIMPLE   │   │
│ │                 New patient triage     │ Quick visit  │
│ │                 First visit            │ 🟢 On-time  │
│ └───────────────────────────────────────────────────┘   │
│
│ URGENT FOLLOW-UPS (Due Today)
│ ┌───────────────────────────────────────────────────┐   │
│ │ ⚠ Monitor remedy response - Anita Verma          │   │
│ │  Last consultation: 2 days ago | [Open Case]     │   │
│ │                                                   │   │
│ │ ⚠ Post-prescription check - Vikram Singh        │   │
│ │  Last consultation: 5 days ago | [Schedule]     │   │
│ └───────────────────────────────────────────────────┘   │
│
│ PENDING CASE OUTCOMES (Awaiting documentation)
│ ┌───────────────────────────────────────────────────┐   │
│ │ • Malini Gupta (2 weeks post-Rx) - IMPROVEMENT? │   │
│ │ • Deepak Joshi (4 weeks post-Rx) - STATUS?      │   │
│ └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 2.5 Clinical Workflow Redesign (v2)

### Current Flow vs. New Flow

#### Phase 1: Appointment

**New Step 1.0: Schedule (Was Missing)**
- Patient calls clinic or uses self-service booking
- Doctor's availability is visible (based on working_hours)
- System suggests best slots based on case complexity + doctor expertise
- Appointment created in `appointments` table with status = "CONFIRMED"

#### Phase 2: Pre-Consultation Prep

**New Step 2.0: Load History** (Enhanced)
- System retrieves:
  - Patient demographics + constitutional type
  - Previous consultations + prescriptions
  - Case outcomes (cure / improvement / palliation)
  - Pending follow-ups
  - Current case_status (ACTIVE / RESOLVED / REFERRED)
- Doctor has full context before patient enters

#### Phase 3: Live Consultation

**Steps 3.1 - 3.5** (Same as before, optimized UI)
1. Patient enters; doctor starts consultation
2. Live audio transcription (optional) → AI draft notes
3. Doctor can accept / revise transcript in real-time
4. AI suggests remedies based on symptoms + history
5. Doctor finalizes prescription

#### Phase 4: Case Documentation (Enhanced)

**New Step 4.0: Outcome Documentation** (Was Step 4, now explicit)
- After each consultation, doctor documents outcome:
  - Outcome: CURE / IMPROVEMENT / PALLIATION / NO_CHANGE / WORSE
  - Symptoms resolved: [list]
  - Symptoms improved: [list]
  - Next steps: "Continue same remedy" / "Change potency" / "Switch remedy" / "Refer to MD"
- Creates audit trail + improves learning

**Step 5.0: Intentional Follow-Up**
- Doctor explicitly creates follow-up (not auto-calculated):
  - `due_at`: when to check (doctor decides)
  - `reason`: "Monitor remedy response" / "Medication review" / "Case assessment"
  - `case_outcome_expected`: what we're hoping to see
  - `symptoms_to_monitor`: what to track
- Doctor can set reminder channel (WhatsApp / SMS / email)

#### Phase 5: Follow-Up Orchestration (New)

**Step 6.0: Reminder System**
- Day before follow-up due:
  - System sends reminder to patient (WhatsApp / SMS)
  - Doctor sees "Follow-up reminder sent"
- Doctor can reschedule / close follow-up from admin view

**Step 7.0: Case Resolution**
- When outcome achieved (cure / improvement maintained):
  - Doctor marks case as "RESOLVED"
  - Patient status changes to "RESOLVED"
  - Case archived but accessible for reference

---

## 2.6 Technical Architecture (v2)

### Deployment Architecture

**Current Issues:**
- Single Node.js server
- No horizontal scaling
- No caching
- No async job queues

**New Architecture:**

```
                           ┌─────────────────────────┐
                           │ Cloudflare CDN          │
                           │ (Static assets + DDoS)  │
                           └────────────┬────────────┘
                                        │
    ┌───────────────┬──────────────────┼──────────────────┬────────────┐
    │               │                  │                  │            │
    │               │              [ALB]                  │            │
    │               │               (AWS)                 │            │
    │               │                  │                  │            │
┌───┴────┐    ┌────┴────┐       ┌──────┴──────┐      ┌────┴───┐   ┌───┴────┐
│ Next.js │    │ Next.js │       │  Express    │      │ Express│   │ WSS    │
│ Server  │    │ Server  │       │  API Server │      │ API    │   │ Server │
│ (React) │    │ (React) │       │  Port 4000  │      │ (Hot)  │   │        │
├────┬────┤    ├────┬────┤       ├─────┬───────┤      ├────┬───┤   ├───┬────┤
│ 3000    │    │ 3001    │       │ 4000│       │      │ 4001  │   │ 4002   │
└────┼────┘    └────┼────┘       └─────┼───────┘      └────┼───┘   └───┼────┘
     │              │                  │                    │           │
     └──────────────┴──────────────────┼────────────────────┴───────────┘
                                       │
                                 [Postgres]
                           ┌───────────┴──────────┐
                           │ Supabase Postgres    │
                           │ (RLS enabled)        │
                           └──────────────────────┘
                                       │
                ┌──────────┬───────────┼───────────┬──────────┐
                │          │           │           │          │
          ┌─────┴──┐  ┌────┴────┐  ┌──┴───┐  ┌────┴────┐  ┌──┴────┐
          │ Redis  │  │ S3 Bucket│  │Auth  │  │Vault    │  │Queue  │
          │(Cache) │  │(Audio)   │  │      │  │(Encrypt)│  │(BullMQ)
          └────────┘  └──────────┘  └──────┘  └─────────┘  └───────┘
```

### Technology Stack (Recommended)

| Layer | Current | Recommended | Why |
|-------|---------|-------------|-----|
| **Frontend Build** | Next.js | Next.js 14+ (App Router) | Already invested; good |
| **Frontend Deploy** | Vercel | Vercel or Cloudflare | Edge functions for middleware |
| **API Framework** | Express.js | Express.js + NestJS | Scalable with DI, better structure |
| **API Deploy** | Fly.io / Self-hosted | AWS ECS + ALB | Auto-scaling, better support |
| **Database** | Supabase Postgres | Supabase Postgres | Already invested; good |
| **Cache Layer** | None | Redis (ElastiCache) | Consultation view caching |
| **Job Queue** | None | BullMQ (Redis-backed) | Audio processing async |
| **File Storage** | S3 | S3 | Already using; good |
| **Auth** | Supabase Auth | Supabase Auth | Already invested; good |
| **Observability** | None | DataDog / New Relic | Logs, metrics, traces |
| **Analytics** | None | Segment / PostHog | Product usage insights |
| **Email/SMS** | None | Twilio / SendGrid | Reminders, notifications |

### API Versioning & Deprecation

```
/api/v1/
  ├─ /doctor/patients
  ├─ /doctor/consultations
  └─ ... (stable endpoints)

/api/v2/          (New design)
  ├─ /doctor/appointments
  ├─ /doctor/consultations/:id/outcome
  ├─ /doctor/follow-ups (with doctor intention)
  └─ ... (new endpoints)

Deprecation Policy:
- v1 supported for 12 months
- 6 months before deprecation: send "Deprecation: true" header
- Final 6 months: 200 OK but with warning in response body
- After 12 months: 410 Gone
```

---

## 2.7 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Rebrand to "HomeoSync" (marketing + messaging)
- [ ] Create middleware.ts (server-side route protection)
- [ ] Implement httpOnly cookies + JWT refresh tokens
- [ ] Set up Redis cache layer
- [ ] Add CSP + security headers
- [ ] Create new database schema (migrations)
- [ ] Build audit logging infrastructure

**Deliverable:** Secure foundation, zero data loss

### Phase 2: Clinical Features (Weeks 5-8)
- [ ] Build appointments table + UI
- [ ] Create case outcomes table + UI
- [ ] Redesign follow-ups (intentional, not auto-calculated)
- [ ] Build remedy metadata + suggestor
- [ ] Implement differential diagnosis tracker
- [ ] Create "My Day" doctor dashboard

**Deliverable:** Complete clinical workflow end-to-end

### Phase 3: UI/UX Redesign (Weeks 9-12)
- [ ] Three-pane consultation UI
- [ ] Clinic admin dashboard
- [ ] Patient portal (appointments + prescriptions + timeline)
- [ ] Doctor library + search improvements
- [ ] Implement role-based UI hiding
- [ ] Add case complexity tagging + color coding

**Deliverable:** Professional, modern UI

### Phase 4: Scalability & Ops (Weeks 13-16)
- [ ] Set up BullMQ job queue (audio processing async)
- [ ] Implement rate limiting + DDoS protection
- [ ] Add DataDog/New Relic observability
- [ ] Set up CI/CD pipeline (GitHub Actions → ECS)
- [ ] Database backup + DR testing
- [ ] Load testing (1000 concurrent users)

**Deliverable:** Production-ready infrastructure

### Phase 5: Compliance & Analytics (Weeks 17-20)
- [ ] HIPAA-aligned audit trails
- [ ] Field-level encryption (Supabase Vault)
- [ ] GDPR consent records + export flows
- [ ] Set up Segment/PostHog analytics
- [ ] Create compliance dashboard (super admin)
- [ ] Documentation + runbooks

**Deliverable:** Enterprise-grade compliance

### Phase 6: Polish & Launch (Weeks 21-24)
- [ ] Load testing with real clinic scenarios
- [ ] Security audit (third-party penetration test)
- [ ] API versioning (v1 stable, v2 new)
- [ ] Migration guide (existing clinics → v2)
- [ ] Launch HomeoSync website + case studies
- [ ] Onboarding videos + documentation

**Deliverable:** Public launch, enterprise-ready

---

# PART 3: SPECIFIC RECOMMENDATIONS

## 3.1 What to Keep (Strengths)

✓ **Supabase Architecture** — Proven, scalable, built-in RLS. Invest deeper into Supabase Vault for encryption.

✓ **Real-Time Audio Streaming** — WebSocket approach is sound; just needs async audio processing (BullMQ).

✓ **9-Step Clinical Model** — Genuinely resonates with homeopathic practice. Keep it; just improve UI execution.

✓ **Role-Based Design Philosophy** — Five-tier role model is thoughtful. Expand UI to properly hide/show features by role.

✓ **Privacy-First Audio Handling** — Immediate deletion is HIPAA-aligned. Expand to field-level encryption for notes.

✓ **Flexible Prescription Format** — Doctor-visible vs. patient-visible codes is clever. Add remedy metadata to enhance it.

✓ **Type Safety with Zod** — Domain models prevent runtime errors. Expand to more API contracts.

---

## 3.2 What to Change (Problems)

❌ **Tokens in localStorage** → Migrate to httpOnly cookies + JWT refresh tokens

❌ **Client-side route protection** → Implement middleware.ts (Edge function)

❌ **Generic name ("HomeoAssist")** → Rebrand to **HomeoSync** (clinic orchestration focus)

❌ **Auto-calculated follow-ups** → Make intentional; doctor decides when + why

❌ **No appointments table** → Add appointments (essential for clinic operations)

❌ **No case outcomes tracking** → Track cure/improvement/palliation (closes feedback loop)

❌ **Freetext remedies** → Add remedy metadata table + standardization

❌ **Single-node API** → Containerize (ECS/Docker) + implement load balancing

❌ **No async job queue** → Add BullMQ for audio processing

❌ **No observability** → Add DataDog/New Relic (logs + metrics + traces)

---

## 3.3 Design Decisions

### Decision 1: Appointments as First-Class Entity

**Rationale:** Homeopaths think in appointment slots, not patient lists. Modern clinical SaaS (Zocdoc, CURO, etc.) centers appointment scheduling.

**Impact:** Requires new table + calendar UI, but improves UX significantly.

### Decision 2: Intentional Follow-Ups

**Rationale:** Auto-calculated follow-ups (14 days post-consultation) are passive. Homeopathic practice requires active, intention-driven follow-ups ("monitor this remedy" vs. "time-based").

**Impact:** More complex workflow but reflects clinical reality better.

### Decision 3: Field-Level Encryption

**Rationale:** Notes and prescriptions are sensitive medical data. HIPAA requires encryption at rest. Supabase Vault enables this without major refactoring.

**Impact:** Minimal code changes; ops complexity low.

### Decision 4: Case Outcomes Mandatory

**Rationale:** Current system has no feedback loop. Doctors don't know if remedies worked. Case outcomes close this loop + improve learning + provide legal defense.

**Impact:** Requires UI + workflow change. Improves clinical rigor.

### Decision 5: Remedy Metadata Table

**Rationale:** Freetext remedy names ("Sulphur" vs. "sulfur" vs. "SULP") create inconsistency. Standardized remedies enable suggestions + repertory lookup.

**Impact:** New table; optional but highly valuable.

---

## 3.4 Migration Path (Existing Clinics)

```
Week 1: Announcement
  - Email all clinics: "HomeoSync v2 coming in 8 weeks"
  - No action required; gradual rollout

Week 2-6: Parallel Deployment
  - New v2 schema deployed alongside v1
  - Data migration: v1 → v2 (automated scripts)
  - v1 UI still works (pointing to v2 DB)

Week 7: Soft Launch
  - v2 UI available (opt-in toggle)
  - Clinics can switch back to v1 UI if issues
  - Daily backups of v1 state

Week 8: Full Migration
  - v1 UI deprecated
  - v2 UI becomes default
  - v1 API endpoints in maintenance mode (read-only)

Post-Launch: Cleanup
  - Monitor v1 API usage (should be ~0)
  - After 30 days: deprecate v1 API
  - After 90 days: remove v1 code
```

---

# PART 4: IMPLEMENTATION EXAMPLES

## 4.1 New Middleware (apps/web/middleware.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function middleware(req: NextRequest) {
  // Matcher: /(app|dashboard|patients|consultation)/:path*
  const { pathname } = req.nextUrl;
  
  // Skip auth for public routes
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.next();
  }
  
  // Extract session cookie
  const sessionCookie = req.cookies.get('hs_session')?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  try {
    // Verify JWT (signed session)
    const verified = await jwtVerify(sessionCookie, JWT_SECRET);
    const { userId, role, clinicId } = verified.payload;
    
    // Attach to request headers (available in Server Components)
    const response = NextResponse.next();
    response.headers.set('x-user-id', userId as string);
    response.headers.set('x-user-role', role as string);
    response.headers.set('x-clinic-id', clinicId as string);
    
    return response;
  } catch (error) {
    // JWT expired or invalid; try refresh
    const refreshToken = req.cookies.get('hs_refresh')?.value;
    if (!refreshToken) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Attempt refresh (would call /auth/refresh API)
    // For brevity, simplified here
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/(app|dashboard|patients|consultation)/:path*', '/api/:path*'],
};
```

## 4.2 New Appointments Endpoint

```typescript
// POST /api/v2/doctor/appointments (Create)
app.post('/api/v2/doctor/appointments', authRequired, async (req, res) => {
  const claims = req.user as AuthClaims;
  const clinicId = claims.clinicId!;
  
  const parsed = z.object({
    patientId: z.string().uuid(),
    doctorId: z.string().uuid(),
    scheduledFor: z.string().datetime(),
    durationMinutes: z.number().int().min(15).max(240).default(30),
    reason: z.string().optional(),
    isFollowUp: z.boolean().default(false),
    followUpToConsultationId: z.string().uuid().optional()
  }).safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  
  // Check doctor availability
  const doctorAvailability = await checkDoctorAvailability(
    clinicId,
    parsed.data.doctorId,
    new Date(parsed.data.scheduledFor),
    parsed.data.durationMinutes
  );
  
  if (!doctorAvailability.available) {
    return res.status(409).json({
      error: 'Doctor not available at requested time',
      suggestions: doctorAvailability.suggestions
    });
  }
  
  // Create appointment
  const client = getDb(claims);
  const { data, error } = await client
    .from('appointments')
    .insert({
      id: uuid(),
      clinic_id: clinicId,
      patient_id: parsed.data.patientId,
      doctor_id: parsed.data.doctorId,
      scheduled_for: parsed.data.scheduledFor,
      duration_minutes: parsed.data.durationMinutes,
      reason: parsed.data.reason || null,
      follow_up_to_consultation_id: parsed.data.followUpToConsultationId || null,
      status: 'CONFIRMED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  // Send notification to patient (async)
  queue.add('send-appointment-reminder', {
    appointmentId: data.id,
    patientId: parsed.data.patientId,
    clinicId,
    type: 'APPOINTMENT_CONFIRMED'
  });
  
  return res.status(201).json(data);
});

// GET /api/v2/doctor/appointments (My Day)
app.get('/api/v2/doctor/appointments/my-day', authRequired, async (req, res) => {
  const claims = req.user as AuthClaims;
  const clinicId = claims.clinicId!;
  const doctorId = claims.userId;
  
  const client = getDb(claims);
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await client
    .from('appointments')
    .select(`
      id,
      scheduled_for,
      duration_minutes,
      status,
      reason,
      patient_id,
      patients (id, name, age, initial_chief_complaint, case_status)
    `)
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .gte('scheduled_for', `${today}T00:00:00`)
    .lt('scheduled_for', `${today}T23:59:59`)
    .order('scheduled_for', { ascending: true });
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  return res.json({ appointments: data });
});
```

## 4.3 Case Outcomes Endpoint

```typescript
// POST /api/v2/doctor/case-outcomes
app.post('/api/v2/doctor/case-outcomes', authRequired, async (req, res) => {
  const claims = req.user as AuthClaims;
  const clinicId = claims.clinicId!;
  
  const parsed = z.object({
    consultationId: z.string().uuid(),
    patientId: z.string().uuid(),
    outcome: z.enum(['CURE', 'IMPROVEMENT', 'PALLIATION', 'NO_CHANGE', 'WORSE']),
    assessment: z.string().min(10),
    symptomsResolved: z.array(z.string()).optional().default([]),
    symptomsImproved: z.array(z.string()).optional().default([]),
    symptomsWorsened: z.array(z.string()).optional().default([]),
    recommendedAction: z.enum([
      'CONTINUE_SAME_REMEDY',
      'CHANGE_POTENCY',
      'SWITCH_REMEDY',
      'REFER_TO_MD',
      'REFER_TO_SPECIALIST'
    ])
  }).safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  
  const client = getDb(claims);
  
  // Create case outcome
  const { data, error } = await client
    .from('case_outcomes')
    .insert({
      id: uuid(),
      clinic_id: clinicId,
      patient_id: parsed.data.patientId,
      consultation_id: parsed.data.consultationId,
      doctor_id: claims.userId,
      outcome: parsed.data.outcome,
      assessment: parsed.data.assessment,
      symptoms_resolved: parsed.data.symptomsResolved,
      symptoms_improved: parsed.data.symptomsImproved,
      symptoms_worsened: parsed.data.symptomsWorsened,
      recommended_action: parsed.data.recommendedAction,
      documented_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  // Update patient case_status if outcome is CURE
  if (parsed.data.outcome === 'CURE') {
    await client
      .from('patients')
      .update({ case_status: 'RESOLVED' })
      .eq('id', parsed.data.patientId)
      .eq('clinic_id', clinicId);
  }
  
  // Log audit event
  await logAudit({
    clinicId,
    actorId: claims.userId,
    action: 'CASE_OUTCOME_DOCUMENTED',
    resourceType: 'case_outcome',
    resourceId: data.id,
    beforeState: null,
    afterState: data
  });
  
  return res.status(201).json(data);
});
```

---

# PART 5: RISK MITIGATION

## 5.1 Data Migration Risks

| Risk | Mitigation |
|------|-----------|
| Data loss in v1 → v2 migration | Automated data copy with verification script; manual spot-checks |
| Downtime during migration | Blue-green deployment; no downtime |
| Clinic disruption | 8-week rollout window; gradual opt-in to v2 |
| Audit trail broken | Replicate audit_log entries from v1 |

## 5.2 Performance Risks

| Risk | Mitigation |
|------|-----------|
| New schema slower than v1 | Redis caching for consultation reads |
| N+1 query problems | Eager loading via Supabase select joins |
| WebSocket memory leak | Connection pooling + graceful shutdown |

## 5.3 Security Risks

| Risk | Mitigation |
|------|-----------|
| CSRF attacks | SameSite=Lax cookies + CSRF tokens |
| Session fixation | Rotate session cookie on sensitive actions |
| Rate limiting bypass | Implement at API Gateway + app level |
| SQL injection | Supabase parameterized queries (safe by default) |

---

# PART 6: COMPETITIVE DIFFERENTIATION

## 6.1 vs. Traditional EHRs (NextGen, Epic, Athena)

| Dimension | EHR | HomeoSync |
|-----------|-----|----------|
| **Complexity** | Heavy (100+ fields) | Light (essential only) |
| **Cost** | $500-2000/month | $99-299/month |
| **Setup Time** | 6-12 months | 1 week |
| **Homeopathy-Specific** | Generic | Yes (remedy metadata, case outcomes) |
| **AI Assist** | Minimal | Real-time transcription + suggestions |
| **Multi-Tenant** | No (per-clinic) | Yes (multi-tenant SaaS) |

## 6.2 vs. AI-First Tools (MedAI, etc.)

| Dimension | AI Tool | HomeoSync |
|-----------|---------|----------|
| **Primary Focus** | AI transcription | Clinic workflow |
| **Homeopathy-Specific** | No | Yes |
| **Appointments** | No | Yes |
| **Patient Portal** | No | Yes |
| **Compliance** | Minimal | HIPAA-ready |
| **Cost** | $50-100/month | $99-299/month |

---

# CONCLUSION

HomeoSync represents a **premium, industry-standard clinic operating system** built specifically for homeopathy practices. By investing in:

1. **Structural changes** (appointments, case outcomes, remedy metadata)
2. **Security hardening** (httpOnly cookies, middleware, encryption)
3. **Clinical depth** (intentional follow-ups, differential diagnosis, outcomes tracking)
4. **Infrastructure modernization** (Redis, async queues, observability)
5. **UX polish** (role-specific UI, three-pane consultation, my-day dashboard)

...the team can differentiate from both legacy EHRs (slow, expensive, generic) and AI-first tools (incomplete, not clinic-centric).

**Timeline:** 24 weeks (6 months) to production-ready v2  
**Team Size:** 5-7 engineers (frontend, backend, mobile, devops)  
**Cost:** ~$150K-200K in development  
**Revenue Impact:** 3-5x increase in ARPU (from $100 → $300-500/month)

---

**Report Date:** April 25, 2026  
**Prepared for:** Lead Systems Architect Review  
**Next Steps:** Executive alignment → Sprint planning → Phase 1 kickoff
