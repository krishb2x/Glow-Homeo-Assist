# GlowHomeoAssist

Enterprise clinic software for homeopathy practices — scheduling, live consultations, prescriptions, patient timelines, messaging, telemedicine, and WhatsApp Business integration.

Built as a TypeScript monorepo: a **Next.js** doctor/clinic web app, an **Express** API with background workers, and **Supabase (PostgreSQL)** for data, auth, and row-level security.

---

## Table of contents

1. [What this project includes](#what-this-project-includes)
2. [Repository layout](#repository-layout)
3. [Frontend (`apps/web`)](#frontend-appsweb)
4. [Backend (`apps/api`)](#backend-appsapi)
5. [Technology stack](#technology-stack)
6. [Shared packages](#shared-packages)
7. [Database and infrastructure](#database-and-infrastructure)
8. [Product features](#product-features)
9. [Patient-facing surfaces](#patient-facing-surfaces)
10. [Getting started](#getting-started)
11. [npm scripts](#npm-scripts)
12. [Environment variables](#environment-variables)
13. [Database migrations](#database-migrations)
14. [Testing](#testing)
15. [Deployment](#deployment)
16. [Documentation index](#documentation-index)

---

## What this project includes

| Layer | App / service | Role |
|-------|----------------|------|
| **Frontend** | `apps/web` | Doctor and clinic staff UI (dashboard, patients, 9-step consultation, schedule, messages, settings) |
| **Backend** | `apps/api` | REST API, WebSocket audio/scribe pipeline, notification workers, WhatsApp webhooks |
| **Data** | Supabase Postgres | Patients, consultations, prescriptions, appointments, RLS per clinic |
| **Storage** | AWS S3 (optional) | Prescription PDFs, signatures, patient documents, recordings |
| **Realtime** | Supabase + WebSocket | Patient inbox updates; live consultation audio stream |
| **Integrations** | Meta WhatsApp, Daily.co, Resend | Messaging, video visits, email |

A **patient mobile app** (React Native / Expo) is designed and documented; API scaffolding is in progress. See [Patient mobile app](#patient-facing-surfaces).

---

## Repository layout

```
HomeoAssist/
├── apps/
│   ├── web/                 # Next.js 15 — doctor/clinic + marketing site
│   └── api/                 # Express — REST, workers, WebSocket
├── packages/
│   ├── domain/              # Zod schemas (clinical record, patients, roles)
│   ├── print/               # Prescription HTML/PDF templates
│   ├── testing/             # Shared Vitest fixtures
│   └── ui/                  # Shared UI tokens (where used)
├── supabase/
│   └── migrations/          # Ordered SQL migrations (source of truth for schema)
├── tests/
│   ├── e2e/                 # Playwright
│   └── load/k6/             # Load tests
├── docs/                    # Architecture, env, testing, mobile design
├── .env.example             # Copy to `.env` at repo root
└── package.json             # npm workspaces root
```

---

## Frontend (`apps/web`)

**Purpose:** Primary interface for doctors, clinic admins, and platform super-admins. Also serves the public marketing site, pricing, security page, and limited **patient** pages (prescription link, video join link).

| Area | Path (examples) | Description |
|------|-----------------|-------------|
| Marketing | `/`, `/pricing`, `/security`, `/features` | Landing, plans, trust content |
| Auth | `/login`, `/forgot-password`, `/auth/callback` | Supabase Auth (email/password) |
| Clinic app | `/dashboard`, `/patients`, `/consultation/[id]` | Day-to-day clinical work |
| Schedule | `/appointments` | Calendar, online/in-clinic booking |
| Messages | `/messages`, `/messages/broadcast` | Patient inbox, WhatsApp broadcasts |
| Admin | `/clinics`, `/marketing-leads` | Super-admin only |
| Patient (public) | `/patient/rx/[token]`, `/join/[token]` | Tokenized Rx view and telemedicine join |

### Frontend technologies

| Technology | Used for |
|------------|----------|
| **Next.js 15** (App Router) | SSR/SSG, routing, API route proxies to Express |
| **React 18** | UI components |
| **TypeScript** | Type-safe UI and API client |
| **Tailwind CSS** | Layout, design tokens (`hs-*` palette), responsive desktop UI |
| **Framer Motion** | Subtle motion in marketing and workspace |
| **Lucide React** | Icons |
| **TanStack Virtual** | Large patient lists |
| **Supabase JS (browser)** | Auth session, password reset |
| **Vitest + Testing Library** | Component and unit tests |

The browser talks to the API through **same-origin Next.js proxies** (`/api/auth/login`, `/api/auth/me`) to avoid CORS issues at login. Other calls use `NEXT_PUBLIC_API_URL` or server-side `API_URL`.

**Default dev URL:** http://localhost:3000

---

## Backend (`apps/api`)

**Purpose:** Business logic, authorization, Supabase access with user JWT or service role, file uploads to S3, outbound notifications, WhatsApp webhooks, telemedicine (Daily.co), and clinical consultation workflow.

| Module | Responsibility |
|--------|----------------|
| `server.ts` | Express app, core `/doctor/*` routes, health check |
| `homeosyncDoctorApi.ts` | My Day, appointments, follow-ups, case outcomes |
| `modules/encounters/` | Consultation lifecycle, finalize, PDF, scribe jobs |
| `modules/telemedicine/` | Video sessions, patient join tokens, appointment reminders |
| `modules/distribution/` | Prescription PDF render and email/WhatsApp delivery |
| `modules/whatsapp/` | Meta Cloud API, templates, broadcasts, webhooks |
| `modules/patients/` | Patient list, timeline, documents |
| `modules/memos/` | Doctor operational memos |
| `modules/jobs/` | Notification queue with retry/backoff |
| `audioStream/` | WebSocket + Gemini pipeline for live scribe |
| `modules/patient/` | Patient mobile API (in progress) |

### Backend technologies

| Technology | Used for |
|------------|----------|
| **Node.js 22+** | Runtime |
| **Express 4** | HTTP API |
| **TypeScript** | Typed handlers and services |
| **tsx** | Dev watch mode |
| **Supabase JS** | Postgres + Auth (`createSupabaseUserClient`, service role admin) |
| **Zod** | Request validation; shared with `@homeoassist/domain` |
| **jsonwebtoken** | Optional JWT helpers; primary auth is Supabase access tokens |
| **ws** | WebSocket server at `/ws/consultation` |
| **@google/generative-ai** | Gemini — structured notes from consultation audio |
| **AWS SDK (S3)** | Private bucket uploads and signed download URLs |
| **Puppeteer** | HTML → PDF for prescriptions (when Chrome path configured) |
| **ioredis** | Optional distributed rate limiting |
| **Vitest + Supertest** | Unit and integration tests |

**Default dev URL:** http://localhost:4000  
**Health check:** `GET /health`

Background jobs (notification delivery, appointment reminders, WhatsApp broadcasts, audio retention purge) start automatically with the API unless `WORKER_MODE=none`.

---

## Technology stack

Summary across the whole platform:

| Category | Technology | Purpose |
|----------|------------|---------|
| Language | TypeScript 5.7 | Frontend, backend, shared packages |
| Monorepo | npm workspaces | `apps/*`, `packages/*` |
| Web framework | Next.js 15 | Doctor app + marketing |
| API framework | Express 4 | REST + webhooks |
| Database | PostgreSQL (Supabase) | All clinical and operational data |
| Auth | Supabase Auth | Email login; roles in `profiles` (DOCTOR, SUPER_ADMIN, PATIENT) |
| Security | Postgres RLS | Clinic-scoped data per `profiles.clinic_id` |
| Validation | Zod | API bodies and `clinical_record` JSON shape |
| Styling | Tailwind CSS 3 | Web UI |
| File storage | AWS S3 | PDFs, images, recordings (optional) |
| Email | Resend | Prescription and appointment emails |
| WhatsApp | Meta Cloud API | Invites, reminders, broadcasts |
| Video | Daily.co | Online consultations with waiting room |
| AI scribe | Google Gemini | Draft clinical notes from audio |
| PDF | Puppeteer + `@homeoassist/print` | Branded prescription slips |
| Queue | `notification_jobs` table + in-process pollers | Reliable outbound messages |
| Cache / limits | Redis (optional) | Rate limits across API replicas |
| E2E tests | Playwright | Smoke and workflow specs |
| Load tests | k6 | API health and search |
| CI | GitHub Actions | Lint, unit tests, E2E (see `.github/workflows/ci.yml`) |

---

## Shared packages

| Package | Name | Purpose |
|---------|------|---------|
| `packages/domain` | `@homeoassist/domain` | Roles, patient create/patch schemas, **clinical record** (9-step consult JSON), prescription item shapes |
| `packages/print` | `@homeoassist/print` | HTML prescription layout and PDF-oriented rendering helpers |
| `packages/testing` | `@homeoassist/testing` | Test patients, empty consultation snapshots for API/web tests |
| `packages/ui` | `@homeoassist/ui` | Shared UI primitives (where referenced) |

---

## Database and infrastructure

- **Schema:** `supabase/migrations/*.sql` (apply in filename order).
- **Foundation:** RBAC, clinics, profiles, patients, consultations, prescriptions — then v2 workspace, telemedicine, WhatsApp, memos, patient mobile tables.
- **RLS:** Enforced for authenticated staff; service role used only server-side with explicit `clinic_id` filters.
- **Audit:** `audit.events` append-only log on consultation finalize.

If production logs mention missing columns or tables (e.g. `appointments.consultation_mode`, `patient_access_tokens`), apply pending migrations — see [docs/SUPABASE_MIGRATIONS.md](docs/SUPABASE_MIGRATIONS.md).

---

## Product features

### Clinical workflow

- **9-step consultation** — patient context, history, examination, notes, AI assist, prescription, advice, follow-up, finalize.
- **Clinical record** — JSONB on `consultations` validated by `@homeoassist/domain`.
- **Prescriptions** — Structured remedy lines (potency, frequency, timing slots); PDF generation and distribution.
- **Advice** — Diet, lifestyle, restrictions; reusable templates and treatment plans.
- **Follow-ups** — Scheduled follow-ups and suggested follow-ups from visit metrics.
- **Case outcomes** — Cure / improvement / palliation tracking per visit.

### Operations

- **My Day** — Today’s appointments, follow-ups, suggested actions.
- **Schedule** — Week grid, walk-ins, online vs in-clinic.
- **Patient chart** — Timeline, documents, profile, tags, allergies.
- **Messages** — Async patient ↔ clinic inbox.
- **Doctor memos** — Operational notes on dashboard.

### Telemedicine

- **Online appointments** — Daily.co room provisioning, patient join links (`patient_access_tokens`), waiting room.
- **Reminders** — 24h and 1h WhatsApp/email jobs.
- **Public join** — `/join/[token]` and API `GET /public/join/:token`.

### WhatsApp Business

- Per-doctor Meta connection, template sync, variable resolver, broadcasts, delivery webhooks.

### Platform admin

- Multi-clinic management, plan features, marketing lead intake.

---

## Patient-facing surfaces

| Surface | Status | Technology |
|---------|--------|------------|
| Prescription link | Live | Next.js `/patient/rx/[token]` + `GET /public/prescription/:token` |
| Video join link | Live | Next.js `/join/[token]` + `GET /public/join/:token` |
| **Patient mobile app** | Designed / API in progress | React Native (Expo) — see [docs/PATIENT_MOBILE_APP.md](docs/PATIENT_MOBILE_APP.md) |

Planned mobile capabilities: medication and diet reminders, care library (doctor videos), messaging, visit history, check-ins, push notifications.

---

## Getting started

### Prerequisites

- **Node.js 22+** and **npm 10+**
- **Supabase** project (URL, anon key, service role key)
- Optional: **AWS S3**, **Redis**, **Chrome** (for PDF), **Meta** / **Daily.co** / **Resend** keys for full feature set

### Install and configure

```bash
git clone <your-repo-url>
cd HomeoAssist
npm install
cp .env.example .env
```

Edit `.env` at the **repository root** — see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

### Database

Apply migrations to your Supabase project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Or run SQL files manually in order — see [docs/SUPABASE_MIGRATIONS.md](docs/SUPABASE_MIGRATIONS.md).

Bootstrap a super-admin (optional):

```bash
npm --workspace @homeoassist/api run bootstrap:super-admin
```

### Run locally (two terminals)

```bash
# Terminal 1 — API (port 4000)
npm run dev:api

# Terminal 2 — Web (port 3000)
npm run dev:web
```

Open http://localhost:3000 and sign in. If you see *“Cannot reach the backend server”*, ensure `npm run dev:api` is running and `API_URL` / `NEXT_PUBLIC_API_URL` point to `http://127.0.0.1:4000`.

---

## npm scripts

Run from the **repository root**:

| Command | Description |
|---------|-------------|
| `npm run dev:api` | Start API with hot reload (`tsx watch`) |
| `npm run dev:web` | Start Next.js dev server |
| `npm run build` | Production build (all workspaces) |
| `npm run lint` | TypeScript check across workspaces |
| `npm test` | API + web unit tests |
| `npm run test:api` | API unit tests only |
| `npm run test:web` | Web unit tests only |
| `npm run test:api:integration` | API integration tests (requires Supabase in `.env`) |
| `npm run test:e2e` | Playwright E2E (smoke + optional workflow tests) |
| `npm run test:coverage` | API coverage report |

---

## Environment variables

Single `.env` at repo root is loaded by both `apps/api` and `apps/web`.

| Group | Examples | Notes |
|-------|----------|--------|
| **Required** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_*` mirrors, `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` | See `.env.example` |
| **Auth / CORS** | `JWT_SECRET`, `CORS_ORIGIN` | Production CORS should list your web origin |
| **Storage** | `AWS_*`, `AWS_S3_PRIVATE_BUCKET` | Optional; without S3 some assets stay inline |
| **Notifications** | `RESEND_API_KEY`, `TWILIO_*`, `NOTIFICATION_MOCK_SEND` | Mock send for local dev |
| **WhatsApp** | `META_*`, `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Per-clinic doctor connections |
| **Telemedicine** | `DAILY_API_KEY`, `DAILY_DOMAIN`, `DAILY_WEBHOOK_SECRET` | Video visits |
| **AI** | `GEMINI_API_KEY` | Scribe / draft notes |
| **Workers** | `REDIS_URL`, `WORKER_MODE`, `RATE_*_PER_MIN` | Scale and throttling |
| **PDF** | `PUPPETEER_EXECUTABLE_PATH` | Chrome/Chromium path |

Full reference: [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

**Never commit `.env` or secrets.**

---

## Database migrations

All schema changes live under `supabase/migrations/`. Critical telemedicine migration:

- `20260524000000_online_consultation.sql` — `appointments.consultation_mode`, `patient_access_tokens`, video session status

Guide: [docs/SUPABASE_MIGRATIONS.md](docs/SUPABASE_MIGRATIONS.md)

---

## Testing

| Type | Tool | Location |
|------|------|----------|
| API unit | Vitest | `apps/api/src/**/*.test.ts` |
| Web unit | Vitest + jsdom | `apps/web/**/*.test.ts` |
| API integration | Vitest + Supabase | `apps/api/src/__tests__` |
| E2E | Playwright | `tests/e2e/specs/` |
| Load | k6 | `tests/load/k6/` |

Strategy and CI: [docs/TESTING_ARCHITECTURE.md](docs/TESTING_ARCHITECTURE.md)

---

## Deployment

Typical setup:

| Service | Suggested host | Notes |
|---------|----------------|--------|
| **Web** | Vercel / similar | Set all `NEXT_PUBLIC_*` and `API_URL` |
| **API** | Railway / Fly / VM | `NODE_ENV=production`, Supabase keys in platform env (not `.env` in image) |
| **Database** | Supabase hosted | Run migrations before deploy |
| **S3** | AWS | Private bucket for clinical files |

Checklist: [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md)

Production API should set `CORS_ORIGIN` to your real web URL. Railway logs showing `injected env (0)` mean variables must be set in the hosting dashboard.

---

## Documentation index

| Document | Topic |
|----------|--------|
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | All environment variables |
| [docs/SUPABASE_MIGRATIONS.md](docs/SUPABASE_MIGRATIONS.md) | Apply / fix database schema |
| [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) | Pre-release checklist |
| [docs/TESTING_ARCHITECTURE.md](docs/TESTING_ARCHITECTURE.md) | Tests and CI |
| [docs/SECURITY_TESTING_CHECKLIST.md](docs/SECURITY_TESTING_CHECKLIST.md) | Security audit |
| [docs/Clinical-Workflow-Overview.md](docs/Clinical-Workflow-Overview.md) | Consultation flow |
| [docs/ONLINE_CONSULTATION.md](docs/ONLINE_CONSULTATION.md) | Telemedicine |
| [docs/architecture/README.md](docs/architecture/README.md) | System architecture index |
| [docs/PATIENT_MOBILE_APP.md](docs/PATIENT_MOBILE_APP.md) | Patient mobile product plan |
| [docs/MOBILE_API.md](docs/MOBILE_API.md) | Patient mobile API spec |
| [docs/MOBILE_UX_FLOWS.md](docs/MOBILE_UX_FLOWS.md) | Patient mobile UX flows |
| [tests/README.md](tests/README.md) | E2E and load tests |

---

## License and support

Private / proprietary unless otherwise noted in the repository. For onboarding issues, verify API health (`/health`), Supabase migrations, and env vars before opening a support ticket.
