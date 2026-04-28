# Production readiness audit — HomeoSync

**Scope:** `apps/web`, `apps/api`, `packages/*`, `infra/*`, `docs/*`  
**Date:** 2026-04-25 (living document — update as fixes land)

### Phase 2 (incremental) — completed in repo

- [x] **Production fail-fast:** `JWT_SECRET` required when `NODE_ENV=production`; `DEV_BYPASS_AUTH` forbidden in production; dev bypass path disabled in production.
- [x] **`resolveClinicScope(req, claims, res)`:** `SUPER_ADMIN` must pass `clinicId` query or `X-Clinic-Id`; other roles use `claims.clinicId`. Wired across `server.ts` and `homeosyncDoctorApi.ts` (replaces duplicate `requireClinic`).
- [x] **Response envelope helpers:** `lib/apiEnvelope.ts` (`jsonSuccess` / `jsonError`) for incremental standardization; legacy `{ error }` JSON unchanged to avoid breaking the web in one go.
- [x] **HTTP listen** skipped when `VITEST=true` so Supertest can import `app` without port bind.
- [x] **Tests:** `clinicScope.test.ts` (unit); `health.int.test.ts` (skips if Supabase env missing).
- [x] **Bootstrap script** renamed to `scripts/bootstrap-super-admin.ts` (env-only; no credentials in code).

**Still follow phased PRs** — do not do full `modules/` extraction or global `{ success, data }` responses in a single change.

### Phase 2 (next slice) — patient routes + super-admin headers

- [x] **`/doctor/patients` (GET/GET :id/GET :id/timeline/POST):** Zod via `PatientCreateBodySchema` from `@homeoassist/domain`; responses use `jsonSuccess` / `jsonError`; param `id` validated as UUID.
- [x] **`resolveClinicScope` errors:** use `jsonError` (same `{ success: false, error, code }` shape as other envelope routes).
- [x] **CORS:** allow `X-Clinic-Id`.
- [x] **Web:** `authJsonHeaders()` sends `X-Clinic-Id` from `localStorage` `ha_clinic_id`; `unwrapApiData` for patient endpoints; workspace context still overwrites `ha_clinic_id` when profile has a clinic; **Settings** has optional clinic UUID field for platform admins.
- [x] **`consultationWss.ts`:** `console.warn` → `logger.warn` (no raw DB messages in logs).
- [x] **Next ha-proxy:** forwards `X-Clinic-Id` when present.

This audit focuses on **system hardening, structure, and quality**. Feature work is out of scope.

---

## Executive summary

| Area | Status | Top risk |
|------|--------|----------|
| API | Monolithic `server.ts` + `homeosyncDoctorApi.ts`; partial Zod use | **SUPER_ADMIN** with `clinic_id = null` vs `requireClinic()` on many routes — platform admin may be blocked or need `?clinicId=` |
| Auth | Supabase access token + `requireRole` | Default `JWT_SECRET` in `auth.ts` if env missing; `DEV_BYPASS_AUTH` in prod = critical |
| Web | Design tokens + `components/ui`; `app/` is Next default | Residual one-off `className` strings; not all pages use shared UI kit |
| Tests | Sparse | Stated “100% coverage” is a **roadmap** target, not current state |
| Secrets | .env not committed (good) | No secrets in repo; **never** commit bootstrap passwords |

---

## 1) Issues, suggested fixes, priority

### High

1. **Clinic scoping vs SUPER_ADMIN**  
   - **Issue:** `requireClinic()` returns 400 if `!claims.clinicId`. `profiles` allows `super_admin` with `clinic_id` null. Doctor routes may be unusable for platform admins unless they impersonate a clinic.  
   - **Fix:** Introduce `resolveClinicScope(req, claims): { mode: "tenant" | "platform"; clinicId: string }` with optional `?clinicId` / header for SUPER_ADMIN; audit all `requireClinic` call sites.  
   - **Priority:** High

2. **Default JWT secret**  
   - **Issue:** `JWT_SECRET || "dev-secret-key-change-in-production"` in `auth.ts`.  
   - **Fix:** Fail fast in `NODE_ENV=production` if `JWT_SECRET` missing; keep dev default only in development.  
   - **Priority:** High

3. **Structured errors & status codes**  
   - **Issue:** Mix of `400` with raw `error.message` (may leak internal detail).  
   - **Fix:** Use `httpErrors` + stable `code` field; log internal detail server-side only (`logger`).  
   - **Priority:** High (partially started in `apps/api/src/lib/httpErrors.ts`)

4. **Logging**  
   - **Issue:** `console.log` / `console.error` in API (`server.ts`, `audit.ts`, `consultationWss.ts`).  
   - **Fix:** `logger` with JSON lines + levels; no PII in info logs.  
   - **Priority:** High (logger added; migrate remaining call sites over time)

### Medium

5. **Route size & services**  
   - **Issue:** Business logic in large route handlers (`server.ts`, `homeosyncDoctorApi.ts`).  
   - **Fix:** Move to `services/*` by domain; routes thin. Target layout: `src/modules/{auth,patients,...}/` (see `docs/ARCHITECTURE_MIGRATION.md`).

6. **REST consistency**  
   - **Issue:** Mix of `/doctor/...` and some legacy naming; not all list endpoints return `{ items: [] }`.  
   - **Fix:** Document API in OpenAPI; standardize list envelope and ID param names.

7. **Input validation**  
   - **Issue:** Some handlers lack Zod; raw `req.body` used.  
   - **Fix:** Zod at boundary for every `POST`/`PATCH`; reject unknown keys where appropriate.

8. **CORS**  
   - **Issue:** Origins from env (good). Ensure production `CORS_ORIGIN` is explicit.

9. **Web `inline` styles**  
   - **Issue:** A few `style={{ gridColumn: ... }}` etc. in schedule (CSS grid with dynamic col).  
   - **Fix:** Prefer CSS variables + classes where possible; keep minimal inline for true dynamic layout.

10. **Duplicate / deprecated**  
   - `DashboardView` re-exports `HomeOverview` (compat). Low harm; can remove when imports updated.

### Low

11. **Dead / unused**  
   - Grep for unused exports; `packages/ui` may be underused. Confirm before deleting.

12. **Naming**  
   - Align `gh-*` (marketing) vs `hs-*` (app) in Tailwind; document in `DESIGN_SYSTEM`.

13. **`.next` in workspace**  
   - Ensure `.gitignore` covers build artifacts (usually yes).

14. **Docs sprawl**  
   - Point single “start here” index to `docs/architecture-auth-rbac.md` + this audit.

---

## 2) Backend: REST & validation (checklist)

- [x] Zod on `/auth/login` body  
- [ ] Zod on every mutating route (incremental)  
- [x] `PATCH /doctor/appointments/:id` — extended with `scheduledFor` / `durationMinutes` (validate with zod)  
- [ ] Global error shape: `{ error: string, code?: string }` everywhere  

---

## 3) Security & RBAC

- **Roles in domain:** `SUPER_ADMIN | ADMIN | SUPPORT | DOCTOR | PATIENT` — matches `mapProfileRoleStringToDomain`.  
- **DB roles:** `super_admin`, `admin`, etc. (snake) — see `docs/sql/rbac_foundation.sql`.  
- **Verify:** RLS in Supabase matches product rules (`docs/role-permissions.md`).

---

## 4) Testing policy

- **Target:** high coverage on **auth**, **validation**, and **service** layers — not “100%” of entire monorepo in one iteration (misleading and unmaintainable as a one-shot).  
- **Unit:** Vitest in `apps/api` (see `src/__tests__/`).  
- **API / integration:** Add supertest or separate job against local API + test DB.  
- **E2E:** Playwright (optional) for “login → patient → consult” on staging.

---

## 5) Cleanup (ongoing)

- Replace `console.*` in API with `logger.*`.  
- Remove `console.log` in production code paths.  
- Delete confirmed-unused files only after import graph / CI check.  

---

## 6) Directory restructure

See **`docs/ARCHITECTURE_MIGRATION.md`**.  
Next.js 15 supports `src/app` — moving `app/` → `src/app` is a **large, mechanical** change; do it in a dedicated PR with full build/test pass.

---

## 7) SUPER_ADMIN bootstrap

**Do not** store real passwords in git. Use:

- `docs/SUPER_ADMIN_BOOTSTRAP.md`  
- `apps/api/scripts/super-admin-bootstrap.ts` with **environment variables** for email/password (one-time local run).  
- Or Supabase Studio + SQL for `profiles` (after Auth user exists), per `docs/sql/seed_test_users.sql` pattern.

---

## 8) System validation (manual smoke)

1. Login  
2. Create patient  
3. Start consultation  
4. Notes / prescription / follow-up / message  

Track failures in an issue; fix with tests where possible.

---

*End of audit template — update as items close.*
