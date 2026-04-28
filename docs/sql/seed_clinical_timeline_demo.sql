-- =============================================================================
-- GlowHomeo Assist — one patient, three “clinical story” events for timeline QA
-- Prerequisite: public.clinics has Clinic A
--   id = 11111111-1111-1111-1111-111111111101
-- (from docs/sql/seed_test_users.sql). Run in Supabase SQL Editor (service role / bypass RLS).
-- =============================================================================

-- Idempotent: fixed UUIDs; safe to re-run (updates in place).
-- Patient: demo “timeline” case for Clinic A
insert into public.patients (id, clinic_id, name, phone, initial_chief_complaint, created_at)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111101'::uuid,
    'Demo Patient (Timeline)',
    '+910000000001',
    'Headache on waking, acidity after lunch',
    now() - interval '32 days'
  )
on conflict (id) do update
  set
    name = excluded.name,
    phone = excluded.phone,
    initial_chief_complaint = excluded.initial_chief_complaint,
    clinic_id = excluded.clinic_id;

-- 1) Initial case (consultation) — case notes: chief presentation
insert into public.consultations (
  id,
  clinic_id,
  patient_id,
  type,
  recording_enabled,
  started_at,
  ended_at,
  note_draft,
  note_final
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111101'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'INITIAL',
    false,
    now() - interval '32 days',
    now() - interval '32 days' + interval '40 minutes',
    null,
    jsonb_build_object(
      'chiefComplaints', 'Headache on waking, acidity after lunch',
      'timeline', 'Initial case: presenting complaints documented.',
      'physicalSymptoms', 'Heaviness in epigastrium after meals; occasional nausea.'
    )
  )
on conflict (id) do update
  set
    patient_id = excluded.patient_id,
    type = excluded.type,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    note_final = excluded.note_final,
    clinic_id = excluded.clinic_id;

-- 2) Follow-up (consultation) — emotional line + narrative
insert into public.consultations (
  id,
  clinic_id,
  patient_id,
  type,
  recording_enabled,
  started_at,
  ended_at,
  note_draft,
  note_final
)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111101'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'FOLLOW_UP',
    false,
    now() - interval '18 days',
    now() - interval '18 days' + interval '35 minutes',
    null,
    jsonb_build_object(
      'emotionalState', 'stressed, mentally exhausted',
      'chiefComplaints', 'Tension-type headache pattern persists; appetite variable.',
      'timeline', 'Follow-up: stress load high; sleep fragmented.'
    )
  )
on conflict (id) do update
  set
    patient_id = excluded.patient_id,
    type = excluded.type,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    note_final = excluded.note_final,
    clinic_id = excluded.clinic_id;

-- 3) Prescription event — coded remedies; dosage references 3-month onset
insert into public.prescriptions (id, clinic_id, patient_id, consultation_id, items, created_at)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111101'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    jsonb_build_array(
      jsonb_build_object(
        'doctorVisibleRemedy', 'Nux vomica 200C',
        'patientVisibleCode', 'NV-200',
        'dosageInstruction', 'Single dose; context: symptoms began 3 months ago; observe 14d'
      ),
      jsonb_build_object(
        'doctorVisibleRemedy', 'Natrum muriaticum 30C',
        'patientVisibleCode', 'NM-30',
        'dosageInstruction', 'Supportive: emotional exhaustion line; 7d as directed'
      )
    ),
    now() - interval '10 days'
  )
on conflict (id) do update
  set
    patient_id = excluded.patient_id,
    consultation_id = excluded.consultation_id,
    items = excluded.items,
    clinic_id = excluded.clinic_id,
    created_at = excluded.created_at;
