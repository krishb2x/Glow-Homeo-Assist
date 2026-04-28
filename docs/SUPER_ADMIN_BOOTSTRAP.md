# Bootstrap a SUPER_ADMIN user (no secrets in git)

## Rules

- **Never** commit real passwords, service role keys, or `.env` to the repository.  
- Prefer **one-time** local execution with environment variables.  
- Supabase **cannot** set user passwords in raw SQL; create users via **Auth Admin API** or **Studio**.

## Option A — Supabase Studio (quickest for humans)

1. **Authentication** → **Users** → **Add user**  
   - Email: your super-admin email (e.g. the address you use for production)  
   - Password: a strong unique password (store in a password manager)  
   - **Confirm** the user (or use “auto-confirm” in project settings for dev only).

2. **SQL Editor** (after `public.profiles` exists per `docs/sql/rbac_foundation.sql`):

```sql
insert into public.profiles (id, full_name, role, clinic_id)
select u.id, 'Platform Super Admin', 'super_admin', null
from auth.users u
where u.email = 'YOUR_EMAIL@example.com'
on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      clinic_id = excluded.clinic_id;
```

- Constraint: `super_admin` must have `clinic_id` **null** (see `profile_clinic_role` in `rbac_foundation.sql`).

3. **Login** via your app’s `/auth/login` with that email and password.  
4. **Verify** API: bearer token on `/doctor/workspace-context` with role `SUPER_ADMIN` in JWT path — behavior depends on `getAuthClaimsForAccessToken` and profile row.

## Option B — Script (automation, local only)

From the monorepo, with **only** env vars in your shell or the **repository root** `.env` (not committed):

```bash
# Example: set SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, and Supabase service env
npm run bootstrap:super-admin -w @homeoassist/api
```

Entry file: `apps/api/scripts/bootstrap-super-admin.ts`

The script:

1. Creates the auth user (or updates password if you choose; default is “create or skip if exists + upsert profile”).  
2. Upserts `profiles` with `role = 'super_admin'`, `clinic_id = null`.

**Required env:** see `apps/api/scripts/super-admin-bootstrap.ts` header comment.

## Clinic access for SUPER_ADMIN

Many `doctor/*` routes use `requireClinic()`. A super admin with `clinic_id` null may get **“Active clinic membership is required”**.  

**Planned product fix:** optional `?clinicId=` (or `X-Clinic-Id` header) for `SUPER_ADMIN` only, validated against `clinics` table — see `docs/PRODUCTION_AUDIT.md` (High #1). Until then, a super admin can still be created for **auth testing**; full tenant operations may need a doctor profile in a specific clinic for day-to-day use.

## Existing seed reference

- `docs/sql/seed_test_users.sql` — pattern for linking `auth.users` to `profiles` (different emails than production).
