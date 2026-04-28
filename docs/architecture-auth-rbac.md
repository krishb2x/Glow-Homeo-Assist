# Authentication, RBAC, and Route Protection

This document covers the **codebase audit** (Task 1), the **Supabase SQL deliverables** (Tasks 2–3), and the **Next.js middleware action plan** (Task 4) for GlowHomeo Assist.

## Task 1: Codebase audit (apps/web and apps/api)

### Where sessions and auth run today

| Area | Location | Behavior |
|------|----------|----------|
| **Web — login** | `apps/web/app/login/page.tsx` | `POST` to the API at `http://localhost:4000/auth/login` (URL is hardcoded; not `NEXT_PUBLIC_API_URL`). On success, stores `ha_token`, `ha_role`, and `ha_clinic_id` in **localStorage** and routes to `/dashboard`. |
| **Web — API calls** | `apps/web/lib/doctor-api.ts` | Reads `ha_token` from localStorage, sends `Authorization: Bearer <access token>`. Comment states alignment with login until **server sessions** exist. |
| **Web — shell / guard** | `apps/web/components/clinic/ClinicAppShell.tsx` (implied) + `apps/web/app/(app)/layout.tsx` | **Client-side** only: layout documents that the shell checks for a token in localStorage; **no** `middleware.ts` in the repo, so `/(app)/*` is not gated on the server. |
| **API — login** | `apps/api/src/server.ts` | `POST /auth/login` uses `supabaseAnon.auth.signInWithPassword`, then loads **one** row from `clinic_memberships` for `role` and `clinicId`. |
| **API — route auth** | `apps/api/src/auth.ts` | `authRequired`: `Authorization: Bearer` → `supabaseAdmin.auth.getUser(accessToken)`, then `clinic_memberships` with the **user-scoped** Supabase client. |
| **API — WebSocket** | `apps/api/src/audioStream/consultationWss.ts` | Token on the query string, validated with `supabaseAdmin.auth.getUser`, then `clinic_memberships` for the doctor. |

**Supabase usage:** The API uses the official JS client: **anon** for password login; **service role** for `getUser`; and a **per-request user JWT** for membership queries (`apps/api/src/supabase.ts`).

### Insecure or brittle patterns to replace

1. **Tokens in localStorage** — Vulnerable to XSS; not **httpOnly**. Prefer **Supabase session cookies** (or your BFF setting httpOnly cookies) and stop trusting client-stored `ha_role` / `ha_clinic_id` for security decisions.
2. **Client-only “route protection”** — `/(app)/*` can be opened without a cookie/session because there is no **middleware**; protection is a redirect in React only.
3. **Hardcoded API base on login** — `localhost:4000` in `page.tsx` bypasses `NEXT_PUBLIC_API_URL` and breaks between environments.
4. **Pre-filled demo credentials** — Default `doctor@example.com` + `ChangeMe123!` in the login form is a footgun; remove in production.
5. **Double source of truth** — RLS in Postgres (when using `profiles`) vs **`clinic_memberships`** in the API must be **migrated in lockstep**; the API should resolve role and `clinic_id` from `profiles` once RLS and application checks align.
6. **Multi-tenancy in app code only** — The API enforces `eq("clinic_id", clinicId)`; that does **not** protect direct Supabase access. **RLS** in `docs/sql/rbac_foundation.sql` is required for defense in depth.

**Centralized strategy:** **Supabase Auth** for identity; **`public.profiles`** for `role` + `clinic_id`; **RLS** on all tenant data; **Next.js middleware** + httpOnly (or same-site) session for route gating; API continues to verify JWTs and enforce role checks, aligned with RLS.

---

## Task 2: RBAC and SQL

Full script: `docs/sql/rbac_foundation.sql`

- **`public.profiles`**: `id` → `auth.users`, with `role` (`super_admin`, `admin`, `doctor`, and optional `support` / `patient` in the `CHECK`), `clinic_id`, `full_name`.
- **`public.clinics`**: tenant root.
- **Core tables** include `clinic_id` everywhere: `patients`, `consultations`, `prescriptions`, `file_objects`, `follow_ups`.
- **Super admin** sees all rows. **Admins and doctors** are limited by **`clinic_id`**. For **doctors** only, `patients.assigned_doctor_id` and `consultations.attending_user_id` restrict rows to the assigned user or a shared “unassigned” pool (both `NULL`).

**Legacy file:** `docs/supabase-rls.sql` defines `current_clinic_ids()` via `clinic_memberships`. The new script **drops** the old policy names on tenant tables and replaces them with the helpers above. Keep or drop `clinic_memberships` based on your migration plan.

---

## Task 3: Test seeding

`docs/sql/seed_test_users.sql` seeds **clinics** and **profiles** for:

| Email | Role | Password (Auth only; set in Supabase) |
|-------|------|----------------------------------------|
| `super@glowhomeo.com` | `super_admin` | `TestPassword123!` |
| `admin-a@glowhomeo.com` | `admin` (Clinic A) | same |
| `admin-b@glowhomeo.com` | `admin` (Clinic B) | same |
| `krishb2x@gmail.com` | `doctor` (Clinic A) | same |
| `doctor-b@glowhomeo.com` | `doctor` (Clinic B) | same |

**Create the five users in the Supabase Auth UI (or Admin API) first** — Postgres cannot safely store that password in plain SQL. Then run the seed.

---

## Task 4: Action plan — `middleware.ts` and `/(app)/*`

1. **Adopt a server-readable session**  
   Use **Supabase server client** (or a BFF) with **cookie-based** sessions so Edge middleware can read the user without localStorage. Configure cookie options (httpOnly, `SameSite`, `secure` in production).

2. **Add `apps/web/middleware.ts`**  
   - **Matcher:** e.g. `/((app|dashboard|patients|consultation)/:path*)` for your `app/(app)` routes (adjust to your route structure).  
   - **Unauthenticated users:** `redirect` to `/login` when no valid session.  
   - **Authenticated but wrong role (optional V1):** If you only store **allowed roles in the JWT** (or a signed cookie read server-side), redirect doctors away from e.g. `/admin/*` and allow `super_admin` to `/platform/*`. The **source of truth** for roles should eventually match **`public.profiles`**, e.g. via a **custom access token claim** (Supabase hook) or a small server route that issues a signed, short-lived “app cookie” with `role` + `clinic_id` after `profiles` lookup.

3. **Map URL segments to required roles**  
   Define a small table in code, for example:  
   - `/(app)/dashboard` → `['super_admin', 'admin', 'doctor']`  
   - Future `/admin/*` → `['admin', 'super_admin']`  
   - Future `/platform/*` → `['super_admin']` only  

4. **Do not trust** `ha_role` / `ha_clinic_id` in localStorage for these checks. Prefer **server-verified** claims (JWT + optional profile refresh).

5. **Tighten the client**  
   After middleware exists, you can keep `ClinicAppShell` as a UX backstop, but the **server redirect** is the real gate.

6. **Align the API**  
   Update `apps/api/src/auth.ts` to use **`profiles`** (or sync `clinic_memberships` from `profiles` until you delete the old table) and map `super_admin` / `admin` / `doctor` to your `Role` enum in `@homeoassist/domain`.

This closes the loop: **RLS in Postgres** + **middleware on Next.js** + **API role checks** all use the same roles and `clinic_id` semantics.
