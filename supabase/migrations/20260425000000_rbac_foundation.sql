-- First migration: creates public.clinics, public.patients, public.consultations, RLS helpers, and
-- required FK targets for all later HomeoSync migrations. Keep aligned with docs/sql/rbac_foundation.sql
-- (that file is suitable for ad-hoc / manual application; this file is the Supabase push/reset order).
-- =============================================================================
-- GlowHomeo Assist — RBAC + multi-tenant schema (Postgres / Supabase)
-- Prerequisites: `auth.users` (Supabase Auth)
--
-- This script:
--  - Creates `clinics` and `profiles` (1:1 with auth.users)
--  - Ensures core tables have `clinic_id` and FKs where applicable
--  - Adds `assigned_doctor_id` (patients) and `attending_user_id` (consultations)
--  - Creates `follow_ups`
--  - Replaces legacy tenant policies (from docs/supabase-rls.sql) with RBAC helpers
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) clinics
-- ---------------------------------------------------------------------------
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) profiles — role: super_admin | admin | doctor (per product; support/patient optional)
--    super_admin: platform scope (clinic_id NULL). Others: must match their clinic.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null
    check (role in ('super_admin', 'admin', 'doctor', 'support', 'patient')),
  clinic_id uuid references public.clinics (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_clinic_role check (
    (role = 'super_admin' and clinic_id is null)
    or (role <> 'super_admin' and clinic_id is not null)
  )
);

-- ---------------------------------------------------------------------------
-- 3) Core data tables (align with existing docs/supabase-rls.sql; extend as needed)
-- ---------------------------------------------------------------------------
create table if not exists public.patients (
  id uuid primary key,
  clinic_id uuid not null,
  name text not null,
  phone text,
  language_preference text,
  age smallint,
  initial_chief_complaint text,
  assigned_doctor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table if exists public.patients
  add column if not exists assigned_doctor_id uuid references auth.users (id) on delete set null;

do $fk$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'patients_clinic_id_fkey' and conrelid = 'public.patients'::regclass
  ) then
    alter table public.patients
      add constraint patients_clinic_id_fkey
      foreign key (clinic_id) references public.clinics (id) on delete restrict;
  end if;
exception
  when undefined_table then null;
  when others then null;
end;
$fk$;

create table if not exists public.consultations (
  id uuid primary key,
  clinic_id uuid not null,
  patient_id uuid not null references public.patients (id),
  type text not null check (type in ('INITIAL', 'FOLLOW_UP')),
  recording_enabled boolean not null default false,
  started_at timestamptz not null,
  ended_at timestamptz,
  transcript_text text,
  transcript_language text,
  transcript_confidence numeric(4, 3),
  note_draft jsonb,
  note_final jsonb,
  audio_object_key text,
  audio_staging_object_key text,
  audio_deleted_at timestamptz,
  attending_user_id uuid references auth.users (id) on delete set null
);

alter table if exists public.consultations
  add column if not exists attending_user_id uuid references auth.users (id) on delete set null;

create table if not exists public.prescriptions (
  id uuid primary key,
  clinic_id uuid not null,
  patient_id uuid not null references public.patients (id),
  consultation_id uuid not null references public.consultations (id),
  items jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.file_objects (
  id uuid primary key,
  clinic_id uuid not null,
  category text not null check (category in ('audio', 'document')),
  object_key text not null,
  consultation_id uuid references public.consultations (id),
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4) follow_ups
-- ---------------------------------------------------------------------------
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  consultation_id uuid references public.consultations (id) on delete set null,
  title text not null,
  due_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists follow_ups_clinic_patient_due
  on public.follow_ups (clinic_id, patient_id, due_at);

-- ---------------------------------------------------------------------------
-- 5) RLS helper functions (STABLE, SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select p.role = 'super_admin' from public.profiles p where p.id = auth.uid() limit 1),
    false
  );
$$;

create or replace function public.current_profile_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.clinic_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

-- Returns true if current user may access a row in their clinic (admin) or
-- the row is a “pool”/assigned case for a doctor.
create or replace function public.patient_row_visible(p public.patients)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.clinic_id = public.current_profile_clinic_id()
    and public.current_profile_clinic_id() is not null
    and (
      public.current_profile_role() in ('admin', 'support')
      or (
        public.current_profile_role() = 'doctor'
        and (p.assigned_doctor_id is null or p.assigned_doctor_id = auth.uid())
      )
    );
$$;

create or replace function public.consultation_row_visible(c public.consultations)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    c.clinic_id = public.current_profile_clinic_id()
    and public.current_profile_clinic_id() is not null
    and (
      public.current_profile_role() in ('admin', 'support')
      or (
        public.current_profile_role() = 'doctor'
        and (c.attending_user_id is null or c.attending_user_id = auth.uid())
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- 6) RLS: enable and policies (drop legacy names from docs/supabase-rls.sql)
-- ---------------------------------------------------------------------------
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.consultations enable row level security;
alter table public.prescriptions enable row level security;
alter table public.file_objects enable row level security;
alter table public.follow_ups enable row level security;

-- clinics: super all; tenant staff can read their clinic; writes by super only
drop policy if exists "clinics_read_scope" on public.clinics;
drop policy if exists "clinics_write_super" on public.clinics;
create policy "clinics_read_scope" on public.clinics
  for select using (
    public.is_platform_super_admin()
    or id = public.current_profile_clinic_id()
  );

create policy "clinics_write_super" on public.clinics
  for all
  using (public.is_platform_super_admin())
  with check (public.is_platform_super_admin());

-- profiles
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (
    public.is_platform_super_admin()
    or id = auth.uid()
    or (
      clinic_id = public.current_profile_clinic_id()
      and public.current_profile_clinic_id() is not null
    )
  );

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update
  using (id = auth.uid() or public.is_platform_super_admin())
  with check (id = auth.uid() or public.is_platform_super_admin());

-- patients: replace clinic_membership-only policy
drop policy if exists "patients_tenant_access" on public.patients;
drop policy if exists "patients_rbac" on public.patients;
create policy "patients_rbac" on public.patients
  for all
  using (public.is_platform_super_admin() or public.patient_row_visible(patients))
  with check (public.is_platform_super_admin() or public.patient_row_visible(patients));

-- consultations
drop policy if exists "consultations_tenant_access" on public.consultations;
drop policy if exists "consultations_rbac" on public.consultations;
create policy "consultations_rbac" on public.consultations
  for all
  using (public.is_platform_super_admin() or public.consultation_row_visible(consultations))
  with check (public.is_platform_super_admin() or public.consultation_row_visible(consultations));

-- prescriptions, file_objects, follow_ups: clinic scoping (no per-doctor row on these tables)
drop policy if exists "prescriptions_tenant_access" on public.prescriptions;
drop policy if exists "prescriptions_rbac" on public.prescriptions;
create policy "prescriptions_rbac" on public.prescriptions
  for all
  using (
    public.is_platform_super_admin()
    or clinic_id = public.current_profile_clinic_id()
  )
  with check (
    public.is_platform_super_admin()
    or clinic_id = public.current_profile_clinic_id()
  );

drop policy if exists "file_objects_tenant_access" on public.file_objects;
drop policy if exists "file_objects_rbac" on public.file_objects;
create policy "file_objects_rbac" on public.file_objects
  for all
  using (
    public.is_platform_super_admin()
    or clinic_id = public.current_profile_clinic_id()
  )
  with check (
    public.is_platform_super_admin()
    or clinic_id = public.current_profile_clinic_id()
  );

drop policy if exists "follow_ups_rbac" on public.follow_ups;
create policy "follow_ups_rbac" on public.follow_ups
  for all
  using (
    public.is_platform_super_admin()
    or clinic_id = public.current_profile_clinic_id()
  )
  with check (
    public.is_platform_super_admin()
    or clinic_id = public.current_profile_clinic_id()
  );

-- ---------------------------------------------------------------------------
-- 7) updated_at on profiles
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $body$
begin
  new.updated_at = now();
  return new;
end;
$body$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();
