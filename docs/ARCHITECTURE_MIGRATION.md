# Target directory layout (phased migration)

## Backend (`apps/api`)

**Current:** `src/server.ts`, `src/homeosyncDoctorApi.ts`, `src/auth.ts`, …

**Target:**

```
src/
  modules/
    auth/
    patients/
    consultations/
    prescriptions/
    followups/
    messages/
  services/          # business logic (no Express req/res)
  middlewares/       # auth, error, rate-limit
  lib/               # logger, http errors, zod helpers
  types/
  server.ts          # app bootstrap, mount routers only
```

**Approach:** Extract one vertical slice (e.g. `patients`) to `modules/patients` + `services/patientsService.ts` first; repeat. Avoid a single giant PR.

## Frontend (`apps/web`)

**Current:** `app/`, `components/`, `lib/` (Next.js App Router)

**Target (optional, Next-compatible):**

```
src/
  app/              # same as current app/, moved
  components/
  lib/
  hooks/
```

**Note:** Next.js natively supports `src/app` — use `npx @next/codemod` or careful move + update `tsconfig` paths.  
**UI modules** (`modules/dashboard`, …) can mirror features without duplicating `app/` routes: `app/dashboard/page.tsx` stays thin, imports from `modules/dashboard/...`.

## Packages

- `@homeoassist/domain` — Zod schemas + types (expand shared request/response DTOs).  
- `@homeoassist/ui` — optional shared React primitives for web + future mobile (React Native with separate entry).

## `infra/`

- `docker-compose.yml` — keep; document required env in README.
