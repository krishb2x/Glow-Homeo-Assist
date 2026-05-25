# Patient Mobile App — End‑to‑End Product & Engineering Plan

> A best‑in‑class digital patient‑care and engagement platform built on the existing
> HomeoAssist backend. This document is the source of truth for the patient mobile
> experience: scope, audit findings, architecture, modules, and the implementation roadmap.
>
> Companion docs:
> - [`MOBILE_API.md`](./MOBILE_API.md) — REST/realtime endpoint specification for the mobile client.
> - [`MOBILE_UX_FLOWS.md`](./MOBILE_UX_FLOWS.md) — screen-by-screen UX flows.

---

## 1. Vision

> A premium, calm, healthcare-grade companion app that turns every prescription, follow‑up,
> diet plan and lifestyle recommendation into a clear daily action — and gives the patient
> direct, trusted access to their doctor between visits.

The patient app is **not an appointment booker**. It is the connective tissue between every
homeopathic case the doctor opens and the patient's day-to-day adherence, recovery and
outcomes.

### Brand promise

| Pillar | Patient feeling | Engineering surface |
|---|---|---|
| **Clarity** | "I know exactly what to take and when." | Today screen, medication ribbon, push reminders. |
| **Trust** | "My doctor sees this and responds." | Read-receipts, doctor read‑state, secure chat. |
| **Continuity** | "My whole case is in one place." | Timeline of visits, prescriptions, advice, reports. |
| **Care** | "Someone is watching out for me." | Symptom check‑ins, smart nudges, escalation to clinic. |
| **Calm** | "Nothing in this app stresses me." | Healthcare‑grade typography, soft palette, zero ads. |

---

## 2. Audit of the existing platform (what we leverage)

The backend is already a strong foundation. The mobile app composes existing primitives
and adds adherence, content and patient identity.

### 2.1 Existing healthcare primitives (re‑used unchanged)

| Domain | Existing tables / modules | What the mobile app uses |
|---|---|---|
| **Patient profile** | `patients` (name, phone, email, dob, gender, allergies, blood_group, ongoing_conditions, tags, emergency contacts, `follow_up_status`, `visit_count`, `last_prescription_at`, `last_visit_at`) | Profile screen, header chips, smart adherence nudges. |
| **Visits / cases** | `consultations` (`lifecycle_status`, `clinical_record` JSONB, `started_at`, `finalized_at`, `consultation_mode`, `pdf_object_id`) | Timeline, "Last visit" card, visit detail (advice + Rx). |
| **Prescriptions** | `prescriptions.items[]` with `remedyName`, `potency`, `dosage`, `frequency`, `timingSlots[morning/afternoon/evening/night]`, `duration`, `instructions`; rendered PDF in `media_objects` (`kind='prescription_pdf'`). | Medication tracker, dose reminders, downloadable Rx PDF. |
| **Advice / diet / lifestyle** | `consultations.advice` JSON (`diet`, `lifestyle`); per‑item `AdviceCardSchema` with `category: diet \| lifestyle \| restriction`; reusable `advice_templates` and `treatment_plans`. | Today’s diet card, lifestyle nudges, restrictions list. |
| **Follow‑ups** | `follow_ups` (`due_at`, `status`, `reason`, `symptoms_to_monitor[]`, `case_outcome_expected`); plus *suggested* follow‑ups computed from `patients.follow_up_status='critical'`. | "Next follow‑up" card, recovery tracker, check‑in prompts. |
| **Case outcomes** | `case_outcomes` (`CURE / IMPROVEMENT / PALLIATION / NO_CHANGE / WORSE`) | Recovery trajectory chart on Profile → Recovery. |
| **Appointments** | `appointments` (`scheduled_for`, `consultation_mode IN_CLINIC \| ONLINE`, `meeting_url`, `join_token`, `notify_patient`, `reminder_*_sent_at`) | Upcoming visits card, "Join consultation" CTA. |
| **Telemedicine** | `video_sessions` (Jitsi room), `buildJitsiJoinConfig()` with JWT, `roomIdForConsultation()`. | One‑tap "Join now" → embedded Jitsi WebView with patient JWT. |
| **Doctor inbox** | `patient_inbox_messages` (PATIENT / CLINIC direction, read_at). | Mobile chat — same table, patient writes from app, doctor reads in `MessagesView`. |
| **Documents / reports** | `media_objects` (kind in `prescription_pdf`, `case_summary_pdf`, `patient_photo`, `document`); `file_objects` patient‑scoped. | "My documents" section with signed downloads. |
| **Tokenized public links** | `patient_access_tokens` (`join_consultation`, `view_prescription`, `view_report`), public routes `/public/join/:token` and `/public/prescription/:token`. | Used **only** for first‑run magic‑link login and one‑off shares with family. |
| **Notifications** | `notification_jobs` (channels: `whatsapp`, `email`, `sms`, `inapp`) with idempotency + backoff via `jobQueue.logic.ts`. | Adds **`push`** channel and `inapp` reuse for in‑app inbox. |
| **WhatsApp** | Meta Cloud API (`metaCloudApi.ts`), template sync, broadcasts. | Optional fallback channel when push is unreachable. |
| **AI** | Gemini scribe (`audioStream/geminiPipeline.ts`), structured notes. | Server‑side only — informs adherence nudges (no client‑side AI). |
| **Auth** | Supabase Auth (`supabase.auth.signInWithPassword`), `profiles.role`; the `PATIENT` role is already in `RoleSchema` and explicitly blocked from staff routes with code `PATIENT_WEB_FORBIDDEN`. | OTP‑based patient auth lands a `PATIENT` profile and links to a `patients` row. |
| **RLS / multi‑tenancy** | `current_profile_clinic_id()` + per‑table `*_rbac` policies. | New patient‑scoped policies (`auth.uid() = patient_user_id`). |
| **Queue worker** | `jobQueue.ts` with `processDueNotificationJobs`. | New topics: `push_medication_reminder`, `push_diet_reminder`, `push_followup_due`. |

### 2.2 Gaps (what we add — minimal but complete)

| Gap | Why | Where we add it |
|---|---|---|
| No link between an auth user and a `patients` row. | Patient must sign in and see only their own data. | New column `patients.auth_user_id` (nullable, indexed, unique). |
| No push‑notification delivery. | Reminders are the single biggest value of the app. | New `patient_push_tokens` table + `processPushReminderJob`. |
| No adherence / dose check‑in capture. | Drives engagement loops, adherence analytics, doctor visibility. | New `patient_medication_logs` + `patient_diet_logs` (lightweight). |
| No symptom check‑in / recovery journal. | Required for "treatment tracking" pillar. | New `patient_check_ins`. |
| No long‑form content / video library. | "Lifestyle videos" + reusable diet/lifestyle education. | New `clinic_content_items` (videos, articles, diet packs) + `patient_content_assignments`. |
| No patient‑initiated booking. | Today only doctors create appointments. | New `POST /patient/appointments` (request → `REQUESTED` status; doctor confirms). |
| No patient‑side realtime chat. | Doctor inbox exists but patient cannot post from a logged‑in identity. | New `POST /patient/messages` + Supabase realtime subscription. |
| No patient‑scoped REST namespace. | Staff routes hard‑block role `PATIENT`. | New `/patient/*` namespace + `requirePatientAuth` middleware. |

These additions are **purely additive**. Nothing in the existing doctor workflow changes.

### 2.3 Existing public links — what stays public

The two tokenized routes (`/public/join/:token`, `/public/prescription/:token`) stay as
no‑auth fallbacks for SMS/WhatsApp deep‑links. The mobile app **prefers the authenticated
patient namespace** for everything but uses these tokens for:

- First‑run "Open in app" deep links from WhatsApp/SMS.
- Share‑with‑family use cases.

---

## 3. Architecture

### 3.1 High‑level

```
┌──────────────────────────────────────────────────────────────────────┐
│                Patient Mobile (React Native, Expo)                   │
│  Today · Visits · Care Library · Messages · Profile                  │
└────────────┬─────────────────────────────────────────┬───────────────┘
             │ HTTPS REST + Supabase Realtime           │ Expo Push / FCM / APNs
             ▼                                          ▼
┌────────────────────────────┐         ┌────────────────────────────────┐
│ Express API (apps/api)     │         │ Push provider (Expo + FCM/APNs)│
│  /patient/* namespace      │         └────────────────────────────────┘
│  requirePatientAuth         │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────┐   ┌───────────────────────────────────────┐
│ Supabase Postgres (RLS)    │◀──│ Background worker (jobQueue + push)   │
│  patients, consultations,  │   │  • medication / diet reminders         │
│  prescriptions, follow_ups │   │  • follow_up_due nudges                │
│  patient_inbox_messages    │   │  • check‑in prompts                    │
│  + new mobile tables       │   │  • appointment reminders               │
└────────────────────────────┘   └───────────────────────────────────────┘
```

The mobile app is **a thin, fast client** over the existing schema. All clinical truth
remains server‑side. The app caches aggressively but never *decides* clinical state.

### 3.2 Why React Native + Expo

| Requirement | Why RN + Expo wins |
|---|---|
| Single codebase, iOS + Android. | RN. |
| Reuses TypeScript domain types from `@homeoassist/domain`. | RN + monorepo. |
| Over‑the‑air updates (push fixes within hours). | Expo EAS Update. |
| Push notifications without writing native code. | Expo Push (forwards to APNs/FCM). |
| Embeds Jitsi for video calls. | `react-native-jitsi-meet` or fallback in‑app browser. |
| Offline‑first cache. | TanStack Query + AsyncStorage / MMKV. |
| Best‑in‑class fonts, motion, haptics. | Skia, Reanimated, Expo Haptics. |
| Hireable in India. | Large RN talent pool. |

A native (Swift / Kotlin) split is **deferred** — RN+Expo gets us to a premium, production
app in months, not years, and shares ~95% of code across platforms.

### 3.3 Monorepo layout (new)

```
apps/
  mobile/                       ← new Expo app
    app/                        ← expo-router routes
      (auth)/
        welcome.tsx
        otp.tsx
      (tabs)/
        today/index.tsx
        visits/index.tsx
        visits/[id].tsx
        care/index.tsx
        care/[id].tsx
        messages/index.tsx
        messages/[thread].tsx
        profile/index.tsx
    components/
      adherence/
      content/
      visit/
      chat/
    lib/
      api.ts              ← thin fetch wrapper, types from @homeoassist/domain
      auth.ts             ← Supabase session bridge
      push.ts             ← Expo push registration
      realtime.ts         ← Supabase channel helpers
      i18n.ts
    theme/
      tokens.ts           ← spacing / typography / palette (shared with web)
    package.json
packages/
  domain/                       ← existing — patient types imported by app
  mobile-design/                ← new — shared design tokens for RN
```

The shared `@homeoassist/domain` package is the contract: zod schemas for
`PrescriptionItemSchema`, `AdviceCardSchema`, `FollowUpPlanSchema`, `CaseOutcomeSchema`
flow straight from doctor → server → mobile, no duplication.

### 3.4 State, caching, offline

| Concern | Choice |
|---|---|
| Server cache | **TanStack Query** with persisted store (MMKV). |
| Local DB | None (over‑engineering). Persisted query cache is enough. |
| Optimistic updates | Yes for: mark‑dose‑taken, send message, check‑in. |
| Offline first | Read‑only resilient: Today, Visits, Care library are usable offline from last sync. Writes queue and replay on reconnect. |
| Realtime | Supabase channel for `patient_inbox_messages` and `appointments` (status flips). |
| Sync strategy | "Pull on focus + push notifications wake background fetch". |

### 3.5 Authentication

```
WhatsApp/SMS deep link  ──▶  Expo app opens with ?token=…
                                  │
                                  ▼
                       POST /patient/auth/exchange-token
                       (server: validates patient_access_token,
                        creates Supabase auth user if missing,
                        links patients.auth_user_id, returns
                        Supabase session)
                                  │
                                  ▼
                       Or: phone OTP login (Supabase Auth)
                                  │
                                  ▼
                       requirePatientAuth(req)
                         - claims.role === 'PATIENT'
                         - resolves patients.id via patients.auth_user_id
                         - patient_id is set on req.patient
```

**Security guarantees:**

- `requirePatientAuth` rejects any user without a matching `patients.auth_user_id`.
- All `/patient/*` queries are filtered by `patient_id` server‑side.
- New RLS policies on patient‑facing tables: `auth.uid() = (SELECT auth_user_id FROM patients WHERE id = …)`.
- Push tokens stored hashed; revoked on logout and on `patient_access_token` rotation.
- Jitsi JWT scopes patient as **non‑moderator** and short‑lived (2h).

### 3.6 Notification fan‑out

A single producer (`enqueuePatientReminder`) writes to `notification_jobs` with a topic
prefix `patient.*`. The worker reads each topic and chooses channels in this priority:

1. **Push** if a valid `patient_push_tokens` row exists in the last 30 days.
2. **WhatsApp** if `patients.phone` exists AND clinic has a WhatsApp connection.
3. **SMS** if SMS provider is configured.
4. **Inapp** is always written (renders in the in‑app notification center).

The reminder copy lives in `messageTemplates.ts` and is variable‑substituted via the
existing `applyVars()` helper.

### 3.7 Observability

- API: existing `startSpan()` + structured logger.
- Mobile: Sentry React Native (errors), Expo Insights (cold/warm start), event log to
  `/patient/telemetry` (opt‑in, anonymized).
- Adherence KPIs surface in the doctor’s patient timeline as a new section.

---

## 4. Mobile feature modules

The app ships five top‑level tabs. Every feature in the audit table maps to one of them.

### 4.1 Today (the daily heart of the app)

> The single screen the patient opens 3–5 times a day.

| Block | Source | Behaviour |
|---|---|---|
| **Greeting + recovery streak** | `patient_check_ins`, `case_outcomes` (last). | "You've logged 6 days in a row." |
| **Medication ribbon** | Active `prescriptions.items` for the most recent un‑superseded prescription. | Cards per remedy with `morning / afternoon / evening / night` slots, tap = mark taken (writes `patient_medication_logs`). |
| **Diet plan** | Latest `consultations.advice.diet` + linked `treatment_plans.diet_advice` + assigned `clinic_content_items` (kind=`diet_pack`). | Today's diet list with check‑boxes; long‑press to see the underlying card. |
| **Lifestyle nudge of the day** | Random non‑repeating pick from `clinic_content_items` (kind=`lifestyle_tip` or `video`) tagged to the patient. | Calm hero card with optional 30‑60s video. |
| **Restrictions** | `AdviceCard.category='restriction'` | Quiet ribbon at bottom. |
| **Next visit / follow‑up** | `appointments.next + follow_ups.next_due` | Tap = visit detail or check‑in CTA. |
| **Unread doctor messages** | `patient_inbox_messages` where `direction='CLINIC' AND read_at IS NULL`. | Badge + jump to thread. |

### 4.2 Visits (the case timeline)

- Chronological timeline of `consultations` for this patient.
- Each row: date, mode (in‑clinic / online), doctor, complexity, expander.
- Expander = chief complaint, advice cards (diet / lifestyle / restriction), prescription
  items (read‑only, with "Download PDF" → signed url for `prescription_pdf` media object),
  case outcome (if recorded), follow‑up plan.
- Online visits with an active `video_sessions` row show a **Join now** button (uses the
  patient Jitsi JWT). After visit ends, the same row shows "Recording available" if
  `recording_object_key` is set.

### 4.3 Care library (the "telemedicine + education" layer)

> Where the doctor's curated content lives.

- **Videos** uploaded by the doctor (kind=`video`) — lifestyle, exercise demos, dietary
  explanations. Streamed via signed S3 URL.
- **Diet packs** — structured recipes / day plans the doctor assigns.
- **Articles** — short, doctor‑authored or shared‑across‑clinic.
- **Search** + **categories** (Diet / Lifestyle / Acute care / Chronic management).
- Assignments are tracked in `patient_content_assignments` so the doctor can see view
  completion in the patient timeline.

### 4.4 Messages

- Chat thread per clinic (most patients are with one clinic).
- Backed by `patient_inbox_messages` with realtime updates.
- Patient can attach an image (uploads via presigned URL into `media_objects`,
  `kind='patient_photo'`).
- Quick replies for common requests ("I'm not feeling better", "Need refill", "Reschedule").
- Off‑hours notice: configurable per clinic from `clinics` table.

### 4.5 Profile

- Demographics (read‑only from `patients`; edit requests go to clinic).
- Emergency contacts, allergies, blood group, ongoing conditions.
- **Recovery view**: chart of `case_outcomes` over the last 6 months + check‑in trend.
- Documents (all `media_objects` for this patient, grouped by kind).
- Settings: language, notification channels, family share links, sign out.
- "Open your doctor's clinic" → branded landing card.

---

## 5. Data model additions

> Full SQL is in
> [`supabase/migrations/20260527000000_patient_mobile.sql`](../supabase/migrations/20260527000000_patient_mobile.sql).

Summary:

| New table | Purpose |
|---|---|
| `patients.auth_user_id` (column) | Links a patient to their Supabase Auth user. Unique, nullable. |
| `patient_push_tokens` | Per‑device Expo / FCM / APNs token + platform + last_seen_at. |
| `patient_medication_logs` | Per‑dose log: `(patient_id, prescription_id, item_id, slot, taken_at, status, note)`. |
| `patient_diet_logs` | Optional, per‑day "diet adherence" check (boolean + note). |
| `patient_check_ins` | Free‑form symptom diary + 1‑10 wellbeing score + tags. |
| `clinic_content_items` | Doctor‑curated videos / articles / diet packs (`kind`, `title`, `body`, `media_object_id`, `tags[]`, `is_published`). |
| `patient_content_assignments` | Mapping `(content_id, patient_id, assigned_at, viewed_at, completed_at)`. |
| `patient_app_settings` | Per‑patient app prefs: `locale`, `enabled_channels[]`, `quiet_hours`, `family_share_token`. |

All tables: RLS enabled, default policy is *patient sees own rows* via `auth.uid() = (SELECT auth_user_id FROM patients WHERE id = patient_id)`; clinic staff sees rows via existing `current_profile_clinic_id()` pattern.

Indexes:

- `patient_medication_logs (patient_id, taken_at DESC)`.
- `patient_check_ins (patient_id, recorded_at DESC)`.
- `clinic_content_items (clinic_id, kind, is_published, created_at DESC)`.
- `patient_push_tokens (patient_id) UNIQUE (token)`.

---

## 6. API contract (summary)

Full spec → [`MOBILE_API.md`](./MOBILE_API.md).

```
Auth
  POST   /patient/auth/exchange-token      ← upgrade public token to session
  POST   /patient/auth/request-otp         ← phone OTP login (Supabase)
  POST   /patient/auth/verify-otp
  POST   /patient/auth/logout

Bootstrap
  GET    /patient/me                       ← profile, clinic, plan flags
  GET    /patient/today                    ← composite (meds + diet + tip + next visit)
  POST   /patient/push-token               ← register device

Visits & Rx
  GET    /patient/visits                   ← timeline (paged)
  GET    /patient/visits/:id               ← full visit detail
  GET    /patient/prescriptions/:id        ← Rx items + signed PDF url

Adherence
  POST   /patient/medication-logs          ← mark dose taken
  GET    /patient/medication-logs?since=
  POST   /patient/diet-logs
  POST   /patient/check-ins
  GET    /patient/check-ins?since=

Follow‑ups
  GET    /patient/follow-ups
  POST   /patient/follow-ups/:id/complete  ← also writes a check‑in

Appointments
  GET    /patient/appointments
  POST   /patient/appointments             ← request new (status REQUESTED)
  POST   /patient/appointments/:id/cancel
  GET    /patient/appointments/:id/meeting ← short-lived join url + JWT

Messages
  GET    /patient/messages
  POST   /patient/messages                 ← text + optional media_object_id

Content
  GET    /patient/content                  ← assigned + clinic library
  POST   /patient/content/:id/viewed
  POST   /patient/content/:id/completed

Documents
  GET    /patient/documents                ← media_objects + signed urls
  POST   /patient/documents                ← upload patient_photo via presign

Settings
  GET    /patient/settings
  PATCH  /patient/settings
  POST   /patient/family-share             ← rotate one-time token
```

Existing public routes unchanged:

```
GET /public/join/:token
GET /public/prescription/:token
```

---

## 7. UX direction

Full screen flows → [`MOBILE_UX_FLOWS.md`](./MOBILE_UX_FLOWS.md).

### 7.1 Design language

| Element | Direction |
|---|---|
| Palette | Same `hs-*` tokens used in web (`hs-primary`, `hs-cream`, `hs-paper`, `hs-ink`, `hs-border`). Mobile darkens contrast slightly for outdoor readability. |
| Type | `Inter` body, `Fraunces` headings (already in the web). |
| Spacing | 4‑pt grid (mobile dense), section gap = 16 / 20 pt, card pad = 12–16 pt. |
| Motion | Reanimated; no spring overshoot on critical CTAs; subtle haptic on dose‑taken and message‑sent. |
| Imagery | Doctor avatars, clinic logo on profile; **no stock medical imagery**. |
| Tone | Indian‑English first; clear, warm, never alarming. Never says "missed" — says "ready to log". |

### 7.2 Accessibility

- Dynamic type up to 200%.
- VoiceOver / TalkBack labels on every interactive element.
- High‑contrast theme variant.
- Multi‑language: English, Hindi, Marathi at launch (strings already factored via `i18n.ts`).
- Reminders never produce a panic state — wording is gentle, escalation only after 48 h of
  missed doses and only via the doctor (never auto‑posted by the app).

### 7.3 Information density

- Today screen: ≤ 5 cards, each ≤ 3 lines.
- Visit timeline: density follows the desktop chart (`Timeline.tsx`) but with bigger taps.
- Care library: 2‑column grid for videos, 1‑column for articles.

---

## 8. Engagement & retention loops

| Loop | Trigger | Reward |
|---|---|---|
| **Dose loop** | 3 × day push at patient‑set times. | Streak grows; weekly summary; doctor sees adherence ribbon. |
| **Diet loop** | 1 × day morning push + Today's check‑boxes. | "Stayed on plan today" badge; surfaces in follow‑up. |
| **Symptom loop** | 3 × week prompt if symptoms_to_monitor[] non‑empty. | Recovery chart updates; doctor sees trend before follow‑up. |
| **Education loop** | 1 × week assigned video / article from doctor. | View tracked; doctor can pin "Watch this" notes. |
| **Visit loop** | 24 h + 1 h before appointment. | One‑tap "Join now"; auto‑opens video room. |
| **Outcome loop** | After case is finalised, single tap "How are you feeling now?" 14 days later. | Writes a `patient_check_in` and notifies doctor if `WORSE`. |

All loops are **opt‑outable** per channel from Profile → Notifications.

---

## 9. Security, privacy, compliance

- **Auth**: Supabase Auth (phone OTP + email link). No password for patients at launch.
- **Tokens**: short‑lived (1 h access, 7 d refresh, rotated). Stored in Expo Secure Store / Keychain / Keystore.
- **Transport**: HTTPS + HSTS; certificate pinning on production builds.
- **Data at rest**: Supabase encrypted at rest; S3 SSE‑KMS for media.
- **RLS**: every new table enforces `auth.uid() = patient.auth_user_id` for patient writes.
- **PHI in pushes**: payloads never contain remedy names, conditions or doctor names —
  only neutral copy ("Time for your morning dose") with a deep link.
- **Audit**: every write from `/patient/*` is logged via `writeAuditV2Event()`.
- **Data deletion**: patient can request deletion → soft‑delete + 30‑day purge.
- **DPDP Act (India) alignment**: explicit consent UI on first run for notifications,
  symptom tracking, content viewing analytics.

---

## 10. Roadmap

| Phase | Scope | Outcome |
|---|---|---|
| **0 — Foundations (this PR)** | DB migration, `/patient/auth/*`, `/patient/me`, `/patient/today`, push token registration, RLS policies, audit. | Skeleton ready; existing doctor flows untouched. |
| **1 — Read‑only beta** | Visits, Prescriptions, Documents, Messages (read), Care library (read), assigned content. | Patients see their case; replaces SMS PDF links. |
| **2 — Adherence & loops** | Medication logs, diet logs, check‑ins, push reminder worker, doctor‑facing adherence ribbon. | Daily‑use product. |
| **3 — Online consults** | Patient‑initiated appointment request, in‑app Jitsi, recording playback. | Full telemedicine loop. |
| **4 — Family & multi‑clinic** | Family share tokens (caregivers), second clinic linking, language packs (Hi, Mr). | Household‑grade adoption. |
| **5 — Insights** | Personal recovery analytics, symptom→remedy correlation (informational), exportable case PDFs. | Long‑term differentiator. |

Each phase is shippable on its own and **does not block** the previous one.

---

## 11. Definition of done (per phase)

- [ ] DB migration applied; RLS verified with `auth.uid()` impersonation tests.
- [ ] API routes covered by unit tests in `apps/api/src/modules/patient/__tests__`.
- [ ] Mobile screens covered by Jest + React Native Testing Library.
- [ ] E2E Playwright (web) + Detox (mobile) on critical journeys.
- [ ] No PHI in push payloads (lint test).
- [ ] Sentry + structured logs wired.
- [ ] Localisation strings present for en / hi / mr.
- [ ] Updated in [`MOBILE_API.md`](./MOBILE_API.md) and [`MOBILE_UX_FLOWS.md`](./MOBILE_UX_FLOWS.md).

---

## 12. Out of scope (intentionally)

- Insurance / pharmacy integrations (kept for v2).
- AI symptom‑checker on the patient side (clinical safety risk).
- In‑app payments (deferred until clinic billing module ships).
- Public marketplace of doctors (the app is *your doctor's* app).
- Apple Watch / Wear OS companions (post‑launch).

---

**Tracking ID**: `PATIENT_MOBILE_APP`
**Owner**: Mobile pod
**Last updated**: see git log on this file.
