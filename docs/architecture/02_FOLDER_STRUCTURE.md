# GlowHomeo Assist — Folder Structure (v2 target)

> Companion to `01_ARCHITECTURE.md`. This document lays out the
> **target** monorepo shape after the v2 refactor. Most of it already
> exists; new folders are marked **🆕**. Folders being deprecated are
> marked **🗑**.

The monorepo uses **npm workspaces** (already in `package.json`).
TypeScript path aliases come from `tsconfig.base.json`. No build tool
upgrade is needed — Next.js handles `apps/web` and `tsc` handles
`apps/api`.

---

## Top level

```
HomeoAssist/
├─ apps/
│  ├─ web/                              # Next.js 15 (App Router) — doctor + admin UI
│  └─ api/                              # Express 4 — REST + WebSocket gateway
│
├─ packages/                            # Shared, framework-agnostic code
│  ├─ domain/                           # Pure TS types + Zod schemas + invariants
│  ├─ ui/                               # Reusable React primitives (Button, Field, Drawer…)
│  ├─ scribe/                  🆕       # AI scribe pipeline (Gemini adapter + mock)
│  ├─ pdf-templates/           🆕       # Prescription + case summary HTML templates
│  └─ config/                  🆕       # Shared eslint, tsconfig, prettier
│
├─ supabase/
│  ├─ migrations/                       # Timestamped SQL — single source of truth
│  ├─ seed/                    🆕       # Seed scripts for dev (clinic, doctor, patients)
│  └─ functions/               🆕       # Edge functions (audio purge, follow-up nudge)
│
├─ infra/                               # Fly.io, Vercel, GH Actions, dockerfiles
│  ├─ fly/
│  ├─ github-actions/
│  └─ docker/
│
├─ docs/
│  ├─ architecture/                     # ← this folder
│  ├─ playbooks/               🆕       # On-call, incident, backup-restore
│  └─ design-system/                    # Component spec, tokens, semantics
│
├─ scripts/                             # One-off ops scripts (TS, run via tsx)
│
├─ .github/
├─ package.json                         # Workspaces root
├─ tsconfig.base.json
├─ README.md
└─ AGENTS.md                            # Project-wide conventions for agents
```

---

## `apps/web/` (Next.js 15 App Router)

```
apps/web/
├─ app/
│  ├─ layout.tsx
│  ├─ globals.css
│  ├─ page.tsx                          # Marketing landing (public)
│  ├─ login/                            # Auth pages
│  ├─ forgot-password/
│  ├─ update-password/
│  ├─ auth/callback/
│  │
│  ├─ (marketing)/             🆕       # Group: public + brochureware
│  │   ├─ privacy/
│  │   ├─ terms/
│  │   ├─ refunds/
│  │   ├─ cookies/
│  │   ├─ request-access/
│  │   └─ demo/                         # static product demo
│  │
│  ├─ (app)/                            # Group: authenticated clinic workspace
│  │   ├─ layout.tsx                    # ClinicAppShell (sidebar + topbar)
│  │   ├─ template.tsx
│  │   │
│  │   ├─ dashboard/                    # "Home" — schedule + smart actions
│  │   │   ├─ page.tsx
│  │   │   └─ DashboardPageClient.tsx
│  │   │
│  │   ├─ appointments/                 # Day grid + slot creation
│  │   ├─ patients/
│  │   │   ├─ page.tsx                  # List + filters
│  │   │   ├─ new/page.tsx              # Register patient
│  │   │   └─ [id]/                     # Patient hub (PatientHubLayout)
│  │   │       ├─ layout.tsx
│  │   │       ├─ page.tsx              # Overview
│  │   │       ├─ profile/page.tsx
│  │   │       ├─ timeline/page.tsx
│  │   │       ├─ prescriptions/page.tsx
│  │   │       ├─ documents/page.tsx
│  │   │       └─ prescription/page.tsx (🗑 → redirect to /consultation)
│  │   │
│  │   ├─ consultation/                 # Live consult workspace (the hero screen)
│  │   │   ├─ page.tsx                  # Start-consult chooser (PatientVisitCard grid)
│  │   │   └─ [id]/
│  │   │       ├─ page.tsx              # Renders <LiveConsultationClient/>
│  │   │       └─ pdf/page.tsx 🆕       # Server-rendered PDF preview
│  │   │
│  │   ├─ follow-ups/                   # Priority lanes (overdue / today / upcoming)
│  │   ├─ messages/                     # Patient inbox
│  │   ├─ analytics/                    # Charts: outcomes, patient volume
│  │   ├─ doctors/                      # Admin only: doctor mgmt
│  │   ├─ clinics/                      # Super admin: cross-clinic
│  │   │   └─ [id]/
│  │   ├─ marketing-leads/              # Super admin
│  │   ├─ settings/                     # Profile / clinic / signature / theme
│  │   └─ clinic-settings/              # 🗑 redirect → /settings
│  │
│  └─ api/                              # Web's own server routes
│      ├─ auth/
│      ├─ ha/auth/                      # session/login/logout cookie endpoints
│      ├─ ha-proxy/[[...path]]/         # Edge proxy → apps/api (adds Bearer token)
│      ├─ public/marketing-lead/        # Public lead capture
│      └─ request/                      # Misc public endpoints
│
├─ components/
│  ├─ marketing/                        # Marketing-only components
│  ├─ auth/
│  ├─ ui/                               # App-shell-level providers
│  │   ├─ providers.tsx
│  │   ├─ ThemeProvider.tsx
│  │   ├─ toast.tsx
│  │   └─ …
│  └─ clinic/
│      ├─ ClinicAppShell.tsx
│      ├─ PageHeader.tsx
│      ├─ PatientSubNav.tsx
│      ├─ PatientTagBadges.tsx
│      ├─ CaseOutcomePanel.tsx
│      ├─ LiveConsultationClient.tsx        # Hero component (3-column workspace)
│      ├─ Timeline.tsx
│      │
│      ├─ workflow/                          # 🆕 the 9-step kit
│      │   ├─ ClinicalWorkflowSidebar.tsx
│      │   ├─ ConsultationPatientBar.tsx
│      │   ├─ ConsultationWorkflowFooter.tsx
│      │   ├─ PatientVisitCard.tsx
│      │   ├─ FollowUpPriorityLane.tsx
│      │   ├─ ClinicalWorkflowOverview.tsx
│      │   ├─ useConsultationKeyboardNav.ts
│      │   └─ steps/                         # 🆕 one file per step (each takes a state slice)
│      │        ├─ StepShell.tsx              #   shared visual frame + FieldRow + input classes
│      │        ├─ Step01Patient.tsx          #   patient overview + identity / allergy confirm
│      │        ├─ Step02History.tsx          #   past illness, meds, family hx, drug allergies
│      │        ├─ Step03Examination.tsx      #   vitals + labs / observations
│      │        ├─ Step04Notes.tsx            #   structured case-taking (chief, mind, modalities)
│      │        ├─ Step05AI.tsx               #   live AI notetaker shell (drawer slot)
│      │        ├─ Step06Prescription.tsx     #   remedies / supplements, potency, timing
│      │        ├─ Step07Advice.tsx           #   diet / lifestyle / restriction cards
│      │        ├─ Step08FollowUp.tsx         #   schedule next visit + symptoms to monitor
│      │        ├─ Step09Finalize.tsx         #   pre-flight checklist + finalize + PDF
│      │        └─ index.ts                   #   barrel exports
│      │
│      ├─ scribe/                            # 🆕 AI Co-pilot drawer
│      │   ├─ AICopilotDrawer.tsx
│      │   ├─ LiveTranscriptPanel.tsx
│      │   ├─ DraftInsertCard.tsx
│      │   ├─ DifferentialsPanel.tsx
│      │   └─ useLiveAudio.ts                # WS client + recorder
│      │
│      ├─ video/                             # 🆕 (phase 3) WebRTC tiles
│      │   ├─ VideoTile.tsx
│      │   ├─ VideoControls.tsx
│      │   └─ useWebRtcPeer.ts
│      │
│      ├─ schedule/                          # 🆕 follow-up drawer + calendar
│      │   ├─ ScheduleFollowUpDrawer.tsx
│      │   ├─ DayGrid.tsx
│      │   └─ AppointmentCard.tsx
│      │
│      ├─ patient/
│      │   ├─ PatientHubLayout.tsx
│      │   ├─ PatientAllergies.tsx
│      │   └─ PatientTimelineEvent.tsx
│      │
│      ├─ dashboard/
│      │   ├─ HomeOverview.tsx
│      │   ├─ TodayScheduleTimeline.tsx
│      │   ├─ SmartNextActions.tsx
│      │   └─ home-utils.ts
│      │
│      ├─ messages/
│      │   └─ MessagesChatView.tsx
│      │
│      └─ settings/
│          ├─ ThemeSettingsSection.tsx
│          ├─ SignatureUploadSection.tsx
│          └─ ClinicBrandingSection.tsx
│
├─ lib/
│  ├─ doctor-api.ts                     # Typed client for apps/api
│  ├─ ds-classes.ts                     # Tailwind atom classes (design system)
│  ├─ cn.ts
│  ├─ brand.ts
│  ├─ theme-preference.ts
│  ├─ remedy-names.ts                   # Curated remedy list (autocomplete)
│  ├─ clinical-workflow-config.ts       # 9-step metadata + phase grouping
│  ├─ appointment-display-tag.ts
│  └─ pdf-preview.ts                  🆕 # Helpers for /consultation/[id]/pdf
│
├─ contexts/
│  └─ RoleContext.tsx
│
├─ styles/
│  └─ theme.css
│
├─ public/
├─ middleware.ts                        # Auth gate for (app) group
├─ next.config.ts
├─ tailwind.config.ts
├─ postcss.config.mjs
├─ tsconfig.json
└─ package.json
```

### Conventions inside `apps/web`

- **Server vs client:** the App Router page is a Server Component by default. Any file ending in `Client.tsx` is `"use client"`.
- **Data fetching:** client components use `lib/doctor-api.ts` (typed wrappers around `fetch`). Server components use the same module via the proxied `/api/ha-proxy/...`.
- **No direct Supabase access from the browser.** All DB writes go through `apps/api`.
- **Design tokens:** every color is a CSS variable in `styles/theme.css`. Tailwind classes reference `hs-*` tokens. Dark mode flips `[data-theme="dark"]` on `<html>`.

---

## `apps/api/` (Express 4)

```
apps/api/
├─ src/
│  ├─ server.ts                         # Bootstrap (will shrink — currently the monolith)
│  ├─ db.ts                             # PG pool
│  ├─ supabase.ts                       # Supabase service client (for admin tasks only)
│  ├─ auth.ts                           # JWT middleware
│  ├─ profileAuth.ts                    # Role guards (doctor/admin/super_admin)
│  ├─ audit.ts                          # Append to audit.events
│  ├─ s3.ts                             # Storage helpers (signed URLs)
│  │
│  ├─ modules/                  🆕      # bounded contexts
│  │   ├─ identity/
│  │   │   ├─ identity.routes.ts
│  │   │   ├─ identity.service.ts
│  │   │   └─ identity.types.ts
│  │   ├─ patients/
│  │   ├─ encounters/                   # consultations
│  │   ├─ observations/
│  │   ├─ prescriptions/
│  │   ├─ continuity/                   # appointments + follow-ups + case_outcomes
│  │   ├─ media/                        # audio sessions, file_objects
│  │   ├─ ai-scribe/                    # Gemini orchestration, draft state
│  │   ├─ communications/
│  │   ├─ library/                      # advice templates, remedies
│  │   └─ admin/                        # clinics, doctors mgmt
│  │
│  ├─ audioStream/
│  │   ├─ consultationWss.ts            # WebSocket entry
│  │   └─ geminiPipeline.ts             # Adapter (real / mock split)
│  │
│  ├─ pdf/                      🆕
│  │   ├─ prescription.renderer.ts
│  │   ├─ caseSummary.renderer.ts
│  │   └─ puppeteerPool.ts
│  │
│  ├─ workers/                  🆕      # Long-lived / scheduled jobs
│  │   ├─ audioPurge.worker.ts
│  │   ├─ followUpNudge.worker.ts
│  │   └─ pdfRender.worker.ts
│  │
│  ├─ lib/
│  │   ├─ apiEnvelope.ts                # `{ ok, data, error }` wrapper
│  │   ├─ clinicScope.ts                # Per-request clinic context
│  │   ├─ dbSchemaCheck.ts
│  │   ├─ features.ts                   # Feature flags (per plan)
│  │   ├─ httpErrors.ts
│  │   ├─ logger.ts                     # Pino + PHI redaction
│  │   ├─ roleMap.ts
│  │   ├─ safeError.ts
│  │   └─ zod.ts                🆕      # Shared validators (imports @ha/domain)
│  │
│  ├─ homeosyncDoctorApi.ts             # 🗑 → move pieces into modules/
│  ├─ store.ts                          # 🗑 → in-memory legacy store; gated by demo flag
│  │
│  └─ __tests__/
│      ├─ health.int.test.ts
│      ├─ authAndPatients.int.test.ts
│      └─ encounters.int.test.ts 🆕
│
├─ test/
│  └─ setup.ts
├─ Dockerfile                  🆕
├─ tsconfig.json
└─ package.json
```

### Conventions inside `apps/api`

- Each module exports `register(app: Router): void` and is mounted in `server.ts`. No cross-module imports beyond their `*.types.ts`.
- All input validated with **Zod** schemas living in `packages/domain`.
- All responses use the `apiEnvelope` shape: `{ ok: true, data: T } | { ok: false, error: { code, message, details? } }`.
- Logging via **pino** through `lib/logger.ts`. Never `console.log` in production code.
- Migrations are **only** in `supabase/migrations/`. The API never alters tables at runtime.

---

## `packages/`

```
packages/
├─ domain/
│  ├─ src/
│  │   ├─ index.ts                      # Re-exports
│  │   ├─ types/                        # 🆕 Pure TS types
│  │   │   ├─ patient.ts
│  │   │   ├─ encounter.ts              # Was "consultation"
│  │   │   ├─ observation.ts
│  │   │   ├─ prescription.ts
│  │   │   ├─ followUp.ts
│  │   │   ├─ caseOutcome.ts
│  │   │   └─ ai.ts
│  │   ├─ schemas/                      # 🆕 Zod schemas
│  │   │   ├─ clinicalRecord.ts         # The big JSON shape
│  │   │   ├─ prescriptionItem.ts
│  │   │   └─ followUp.ts
│  │   └─ constants/
│  │        ├─ caseOutcomes.ts
│  │        └─ workflow.ts
│  ├─ package.json
│  └─ tsconfig.json
│
├─ ui/
│  ├─ src/
│  │   ├─ index.ts
│  │   ├─ Button.tsx
│  │   ├─ Drawer.tsx
│  │   ├─ Field.tsx
│  │   ├─ Toast.tsx
│  │   ├─ tokens.css
│  │   └─ index.css
│  ├─ package.json
│  └─ tsconfig.json
│
├─ scribe/                              🆕 (pure logic — used by API + tests)
│  ├─ src/
│  │   ├─ index.ts
│  │   ├─ promptTemplates.ts
│  │   ├─ noteAssembler.ts              # transcript → structured draft
│  │   ├─ geminiAdapter.ts              # network adapter (interface only)
│  │   └─ mockAdapter.ts
│  ├─ package.json
│  └─ tsconfig.json
│
├─ pdf-templates/                       🆕 (HTML/CSS, no JS deps)
│  ├─ src/
│  │   ├─ prescription.html.ts
│  │   ├─ case-summary.html.ts
│  │   └─ styles.css.ts
│  ├─ package.json
│  └─ tsconfig.json
│
└─ config/                              🆕 (shared eslint/tsconfig/prettier)
   ├─ eslint-preset.js
   ├─ tsconfig.base.json
   └─ prettier.config.cjs
```

### Why split `scribe` and `pdf-templates`?

Both are **pure** (no Express, no Next.js) and need to be testable in
isolation. They're also the parts most likely to be swapped for
alternatives (e.g. switching from Gemini to a self-hosted model, or
from Puppeteer to a server-side template). Isolating them prevents the
API from accumulating provider-specific code.

---

## `supabase/`

```
supabase/
├─ migrations/                          # Timestamped, append-only
│  ├─ 20260425000000_rbac_foundation.sql
│  ├─ 20260425120000_homeosync_core.sql
│  ├─ 20260425200000_patient_inbox_messages.sql
│  ├─ 20260426120000_clinics_admin_fields.sql
│  ├─ 20260426140000_clinical_consultation_workflow.sql
│  ├─ 20260427120000_prescription_branding_consultation_mode.sql
│  ├─ 20260428000000_marketing_lead_requests.sql
│  ├─ 20260428100000_clinical_continuity.sql
│  ├─ 20260428200000_advice_templates_treatment_plans.sql
│  ├─ 20260428210000_patient_dob.sql
│  ├─ 20260428230000_plan_features.sql
│  ├─ 20260503100000_marketing_leads_workspace.sql
│  └─ 20260520000000_v2_consult_workspace.sql   🆕 ← introduced in 03_SCHEMA.md
│
├─ seed/                                🆕
│  ├─ 01_demo_clinic.sql
│  ├─ 02_demo_doctor.sql
│  └─ 03_demo_patients.sql
│
└─ functions/                           🆕   # Supabase Edge (Deno) — light ops
   ├─ audio_purge/index.ts
   └─ follow_up_nudge/index.ts
```

---

## `infra/`

```
infra/
├─ fly/
│  ├─ api.fly.toml
│  ├─ workers.fly.toml
│  └─ Dockerfile
├─ github-actions/
│  ├─ ci.yml                            # Lint + typecheck + unit + integration
│  ├─ deploy-web.yml                    # Vercel preview / prod
│  └─ deploy-api.yml                    # Fly deploy
└─ docker/
   └─ docker-compose.local.yml          # Local pg + supabase studio
```

---

## What changes vs current code

| Area                                | Now                                                                 | After v2                                                       |
| ----------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| `apps/api/src/server.ts`            | Single ~3 000-line file with all routes                              | Slim bootstrap; routes live in `src/modules/<context>/*.routes.ts` |
| `apps/api/src/homeosyncDoctorApi.ts`| Helper module wired into server.ts                                   | Removed; pieces redistributed into the relevant module          |
| `apps/api/src/store.ts`             | Legacy in-memory fallback (still wired)                              | Gated behind `HA_DEMO=1` only; dev/test use Supabase            |
| `apps/web/components/clinic/LiveConsultationClient.tsx` | One ~2 800-line file                          | Stays as orchestrator; **each step** moved into `workflow/steps/Step0X*.tsx` |
| Theme                               | Light only                                                          | Light + dark via `ThemeProvider` (already in)                  |
| AI scribe                           | Inline in `geminiPipeline.ts`                                       | `packages/scribe` (pure) + `apps/api/src/modules/ai-scribe`    |
| PDF                                 | Stubbed                                                             | `apps/api/src/pdf` + `packages/pdf-templates` + worker          |
| Patient mobile app                  | Not built                                                           | Still not built (out of v2 scope)                              |

Nothing in the v2 plan requires a destructive change. Every step is
**additive** at the file system level — the legacy files keep working
until the new module is wired in, then we delete the old one in a
single PR per context.
