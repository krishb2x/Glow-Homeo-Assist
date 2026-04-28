-- =============================================================================
-- GlowHomeo Assist — test users (seed profiles + clinics) for RBAC
--
-- Supabase does not accept raw passwords in SQL for `auth.users`. You must
-- first create the accounts with password: TestPassword123!
-- Primary dev doctor (Clinic A): krishb2x@gmail.com
--
-- Option A — Supabase Studio: Authentication → Add user (each email below)
-- Option B — CLI / Admin API: auth.admin.createUser with the same password
--
-- After those users exist in auth.users, run this script to create clinics
-- and link public.profiles rows.
-- =============================================================================

-- Fixed tenant IDs (stable for local/staging; change in production if you prefer)
-- Clinic A:  11111111-1111-1111-1111-111111111101
-- Clinic B:  22222222-2222-2222-2222-222222222202

insert into public.clinics (id, name, slug, created_at)
values
  ('11111111-1111-1111-1111-111111111101', 'Clinic A (Test)', 'clinic-a-test', now()),
  ('22222222-2222-2222-2222-222222222202', 'Clinic B (Test)', 'clinic-b-test', now())
on conflict (id) do update
  set name = excluded.name, slug = excluded.slug;

-- Super admin — platform (no clinic)
insert into public.profiles (id, full_name, role, clinic_id)
select
  u.id,
  'Super Admin',
  'super_admin',
  null
from auth.users u
where u.email = 'super@glowhomeo.com'
limit 1
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, clinic_id = excluded.clinic_id;

-- Admins
insert into public.profiles (id, full_name, role, clinic_id)
select
  u.id,
  'Admin A',
  'admin',
  '11111111-1111-1111-1111-111111111101'::uuid
from auth.users u
where u.email = 'admin-a@glowhomeo.com'
limit 1
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, clinic_id = excluded.clinic_id;

insert into public.profiles (id, full_name, role, clinic_id)
select
  u.id,
  'Admin B',
  'admin',
  '22222222-2222-2222-2222-222222222202'::uuid
from auth.users u
where u.email = 'admin-b@glowhomeo.com'
limit 1
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, clinic_id = excluded.clinic_id;

-- Doctors (one per clinic) — Clinic A: active dev account is krishb2x@gmail.com
insert into public.profiles (id, full_name, role, clinic_id)
select
  u.id,
  'Dr. Krish',
  'doctor',
  '11111111-1111-1111-1111-111111111101'::uuid
from auth.users u
where u.email = 'krishb2x@gmail.com'
limit 1
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, clinic_id = excluded.clinic_id;

insert into public.profiles (id, full_name, role, clinic_id)
select
  u.id,
  'Dr. B',
  'doctor',
  '22222222-2222-2222-2222-222222222202'::uuid
from auth.users u
where u.email = 'doctor-b@glowhomeo.com'
limit 1
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, clinic_id = excluded.clinic_id;

-- Optional: mirror into public.clinic_memberships only if that table exists
-- (it is created by docs/supabase-rls.sql, not by rbac_foundation.sql).
-- Skips when you use public.profiles only. super_admin is not mirrored (clinic_id NOT NULL in memberships).
do $mirror$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'clinic_memberships'
  ) then
    insert into public.clinic_memberships (id, clinic_id, user_id, role, is_active, created_at)
    select
      gen_random_uuid(),
      p.clinic_id,
      p.id,
      case p.role
        when 'admin' then 'ADMIN'
        when 'doctor' then 'DOCTOR'
        else 'SUPPORT'
      end,
      true,
      now()
    from public.profiles p
    where p.role in ('admin', 'doctor')
      and p.clinic_id is not null
      and not exists (
        select 1
        from public.clinic_memberships cm
        where cm.user_id = p.id
          and cm.clinic_id = p.clinic_id
      );
  end if;
end;
$mirror$;
