-- HomeoAssist Supabase schema + RLS baseline
-- Run in Supabase SQL editor.

create table if not exists public.clinic_memberships (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'DOCTOR', 'PATIENT')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key,
  clinic_id uuid not null,
  name text not null,
  phone text,
  language_preference text,
  age smallint,
  initial_chief_complaint text,
  created_at timestamptz not null default now()
);

-- If patients already exists without the new columns, run:
-- alter table public.patients add column if not exists age smallint;
-- alter table public.patients add column if not exists initial_chief_complaint text;

create table if not exists public.consultations (
  id uuid primary key,
  clinic_id uuid not null,
  patient_id uuid not null references public.patients(id),
  type text not null check (type in ('INITIAL', 'FOLLOW_UP')),
  recording_enabled boolean not null default false,
  started_at timestamptz not null,
  ended_at timestamptz,
  transcript_text text,
  transcript_language text,
  transcript_confidence numeric(4,3),
  note_draft jsonb,
  note_final jsonb,
  audio_object_key text,
  audio_staging_object_key text,
  audio_deleted_at timestamptz
);
-- If consultations already exists without audio_staging_object_key, run:
-- alter table public.consultations add column if not exists audio_staging_object_key text;

create table if not exists public.prescriptions (
  id uuid primary key,
  clinic_id uuid not null,
  patient_id uuid not null references public.patients(id),
  consultation_id uuid not null references public.consultations(id),
  items jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.file_objects (
  id uuid primary key,
  clinic_id uuid not null,
  category text not null check (category in ('audio', 'document')),
  object_key text not null,
  consultation_id uuid references public.consultations(id),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.clinic_memberships enable row level security;
alter table public.patients enable row level security;
alter table public.consultations enable row level security;
alter table public.prescriptions enable row level security;
alter table public.file_objects enable row level security;

create or replace function public.current_clinic_ids()
returns table (clinic_id uuid)
language sql
stable
as $$
  select cm.clinic_id
  from public.clinic_memberships cm
  where cm.user_id = auth.uid() and cm.is_active = true
$$;

create policy "memberships_self_read"
  on public.clinic_memberships
  for select
  using (user_id = auth.uid());

create policy "patients_tenant_access"
  on public.patients
  for all
  using (clinic_id in (select clinic_id from public.current_clinic_ids()))
  with check (clinic_id in (select clinic_id from public.current_clinic_ids()));

create policy "consultations_tenant_access"
  on public.consultations
  for all
  using (clinic_id in (select clinic_id from public.current_clinic_ids()))
  with check (clinic_id in (select clinic_id from public.current_clinic_ids()));

create policy "prescriptions_tenant_access"
  on public.prescriptions
  for all
  using (clinic_id in (select clinic_id from public.current_clinic_ids()))
  with check (clinic_id in (select clinic_id from public.current_clinic_ids()));

create policy "file_objects_tenant_access"
  on public.file_objects
  for all
  using (clinic_id in (select clinic_id from public.current_clinic_ids()))
  with check (clinic_id in (select clinic_id from public.current_clinic_ids()));
