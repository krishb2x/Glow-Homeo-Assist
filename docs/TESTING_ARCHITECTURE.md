# HomeoAssist — Enterprise Testing Architecture

Production-grade testing strategy for the clinic platform (API, web, workers, WhatsApp, telemedicine).

## Goals

| Goal | How |
|------|-----|
| Long-term stability | Deterministic unit + integration tests in CI |
| Scalability confidence | k6 load scripts + pagination/timeline tests |
| Healthcare compliance | Critical-path coverage on consultation + prescription + messaging |
| Maintainability | Shared fixtures, typed mocks, colocated `*.test.ts` |
| CI/CD | GitHub Actions: lint → unit → integration (optional) → E2E (smoke) |

## Test pyramid

```
                    ┌─────────────┐
                    │  E2E (few)  │  Playwright — critical journeys
                    ├─────────────┤
                    │ Integration │  Supertest + Supabase (env-gated)
                    ├─────────────┤
                    │    Unit     │  Vitest — logic, validators, resolvers
                    └─────────────┘
```

## Folder structure

```
HomeoAssist/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── **/*.test.ts          # colocated unit tests
│   │   │   └── __tests__/*.int.test.ts
│   │   └── vitest.config.ts
│   └── web/
│       ├── lib/**/*.test.ts
│       ├── components/**/*.test.tsx
│       └── vitest.config.ts
├── packages/
│   └── testing/                      # shared fixtures & mocks
├── tests/
│   ├── README.md
│   ├── fixtures/                     # JSON snapshots
│   ├── e2e/                         # Playwright
│   └── load/k6/                      # performance scripts
├── docs/
│   ├── TESTING_ARCHITECTURE.md       # (this file)
│   └── SECURITY_TESTING_CHECKLIST.md
└── .github/workflows/ci.yml
```

## Stack

| Layer | Tool |
|-------|------|
| Unit / integration (API) | Vitest, Supertest |
| Unit / components (Web) | Vitest, jsdom, React Testing Library |
| E2E | Playwright |
| Load | k6 |
| Web perf | Lighthouse CI (optional job) |
| Coverage | `@vitest/coverage-v8` |

## Coverage targets

| Area | Target | Enforced in CI |
|------|--------|----------------|
| Core lib (`api/src/lib`) | ≥ 80% lines | Soft threshold (report only) |
| WhatsApp variable resolver | 100% | Yes (existing tests) |
| Consultation validation (web) | ≥ 90% | Yes |
| Critical workflows (E2E) | Smoke on every PR | Required pass |

Raise thresholds in `vitest.config.ts` as coverage grows.

## Running tests

```bash
# All unit tests
npm test

# API only
npm run test:api
npm run test:api:coverage   # from apps/api

# Web only
npm run test:web

# Integration (requires Supabase env)
cd apps/api && npm run test -- src/__tests__

# E2E (requires dev servers or PLAYWRIGHT_BASE_URL)
npm run test:e2e

# Load (requires k6 installed)
k6 run tests/load/k6/api-health.js
```

## Test categories

### 1. Unit tests (API)

- Auth / clinic scope (`clinicScope.test.ts`, `roleMap.test.ts`)
- Rate limiting (`rateLimit.test.ts`)
- Queue backoff / dead-letter (`jobQueue.logic.test.ts`)
- WhatsApp variable resolver, template sync
- Webhook verification (`webhookHandler.test.ts`)
- Clinical record parsing
- Memo / timeline pure helpers where extracted

### 2. Unit tests (Web)

- `consultation-validation.ts` — all nine steps
- Marketing / pricing pure components (as needed)
- Virtualized list helpers (if extracted)

### 3. Integration tests (API)

Gated on `SUPABASE_*` env (skip in CI without secrets):

- `health.int.test.ts` — GET /health
- `authAndPatients.int.test.ts` — auth + patient CRUD smoke

Run locally with `.env` from Supabase project.

### 4. E2E (Playwright)

Located in `tests/e2e/`. Suites:

| Suite | Flow |
|-------|------|
| `smoke.spec.ts` | Public marketing pages |
| `consultation.spec.ts` | Login → start visit (stub) |
| `scheduling.spec.ts` | Schedule page load |
| `messaging.spec.ts` | Inbox shell |

Full healthcare workflows (prescription → WhatsApp) require test clinic + Meta sandbox — document in `tests/e2e/README.md`.

### 5. Queue / worker tests

- Pure: backoff, dead-letter rules (`jobQueue.logic.ts`)
- Integration: claim/release RPC with test DB (future)

### 6. Realtime / WebSocket

- `consultationWss` — connection handshake unit test (mock `ws`)
- Audio pipeline — mock Gemini (future)

### 7. Performance & load

`tests/load/k6/`:

- `api-health.js` — baseline RPS on /health
- `patient-search.js` — authenticated search (env vars)
- `timeline-read.js` — paginated timeline

Run against staging; never production patient data.

### 8. Security

See [SECURITY_TESTING_CHECKLIST.md](./SECURITY_TESTING_CHECKLIST.md).

Automated: clinic isolation, rate limit, webhook verify token, JWT shape.

Manual quarterly: penetration test, Meta webhook signing review.

## CI/CD pipeline

`.github/workflows/ci.yml`:

1. `lint` — `tsc --noEmit` all workspaces
2. `test-api` — Vitest unit (no Supabase required)
3. `test-web` — Vitest unit + jsdom
4. `test-e2e` — Playwright smoke (marketing only on PR)
5. `coverage` — upload artifact (optional)

Integration + E2E auth flows run on `main` or with repository secrets.

## Mocking standards

- **Supabase**: use `@homeoassist/testing` fixture builders; mock `from().select()` in unit tests
- **Meta / WhatsApp**: never call live API in unit tests; stub `metaCloudApi` fetch
- **Redis**: rate limit tests use memory store (default without `REDIS_URL`)
- **Time**: `vi.useFakeTimers()` for backoff / reminder scheduling

## Regression strategy

- Every bug fix includes a test reproducing the failure
- PR template checklist: tests added / N/A with reason
- Weekly: run k6 smoke on staging
- Release: full E2E + manual consultation walkthrough

## Roadmap

- [ ] DB test container (Testcontainers + Postgres) for integration without cloud Supabase
- [ ] Playwright authenticated storage state for doctor flows
- [ ] Visual regression (Chromatic / Percy) for consultation UI
- [ ] Contract tests for Meta webhook payloads
- [ ] 80% API coverage on `modules/`
