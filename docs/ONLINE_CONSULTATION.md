# Online consultation & patient notifications

Enterprise telemedicine workflow for HomeoAssist: scheduling, WhatsApp/email invites with template variables, Jitsi video, secure token links, reminders, and post-consult prescription delivery.

## Capability matrix

| Capability | Status | Notes |
|------------|--------|-------|
| Schedule online consultations | **Ready** | `POST /doctor/appointments` with `consultationMode: "ONLINE"`, Schedule UI |
| Email meeting invites | **Ready** | Queued job `appointment_invite_email` (Resend) |
| WhatsApp meeting invites | **Ready** | Queued job `appointment_invite_whatsapp` (Meta Cloud API) |
| Dynamic template variables | **Ready** | `{{patient_name}}`, `{{doctor_name}}`, `{{clinic_name}}`, `{{appointment_date}}`, `{{appointment_time}}`, `{{meeting_link}}`, `{{prescription_link}}` — see `messageTemplates.ts` |
| Doctor conducts video on platform | **Ready** | Jitsi embed in `ConsultationVideoTile` |
| Auto-generated meeting links | **Ready** | Jitsi room + `patient_access_tokens` join URL |
| 24h / 1h reminders | **Ready** | `scheduleAppointmentReminders` + `processAppointmentReminderJobs` |
| Patient join (mobile/desktop) | **Ready** | `/join/[token]` public page |
| Post-consult prescription (WhatsApp/email) | **Ready** | Existing `prescriptionDistribution` + `sendPostConsultationNotifications` |
| Consultation summary notifications | **Ready** | `consultation_summary_*` topics |
| Consultation recording to secure storage | **Ready** | Webhook `POST /webhooks/jitsi/recording` → S3; doctor download via `GET /doctor/consultations/:id/recording` |
| Jitsi JWT (self-hosted) | **Ready** | Set `JITSI_APP_ID` + `JITSI_APP_SECRET`; optional `JITSI_JWT_ISS`, `JITSI_JWT_AUD`, `JITSI_JWT_SUB` |
| Meta-approved WhatsApp templates | **Ready** | Sync templates named `telemedicine_*` or set `META_TEMPLATE_*` env vars |
| Separate PDF “reports” delivery | **Planned** | Token purpose `view_report` exists; no PDF report worker |
| Full patient portal (login) | **Planned** | Token-only public links today |

## Architecture

```mermaid
flowchart LR
  subgraph doctor
    Schedule[Schedule UI]
    Start[Start ONLINE consult]
    Video[Jitsi embed]
    Rx[Finalize + send Rx]
  end
  subgraph api
    Appt[appointments + tokens]
    Notify[notification_jobs queue]
    Public[/public/join /public/prescription]
  end
  subgraph channels
    WA[WhatsApp Meta API]
    Email[Resend email]
  end
  subgraph patient
    JoinPage[/join/token]
    RxPage[/patient/rx/token]
  end
  Schedule --> Appt
  Appt --> Notify
  Start --> Video
  Rx --> Notify
  Notify --> WA
  Notify --> Email
  WA --> JoinPage
  Email --> JoinPage
  Public --> JoinPage
  Public --> RxPage
```

## Database

Apply migration:

```bash
supabase db push
# or: supabase migration up
```

File: `supabase/migrations/20260524000000_online_consultation.sql`

- `appointments`: `consultation_mode`, `meeting_url`, `join_token`, `notify_patient`, reminder timestamps
- `patients.email`
- `patient_access_tokens` for join / prescription links
- `video_sessions` status includes `RECORDING`

## Environment variables

| Variable | Purpose |
|----------|---------|
| `APP_PUBLIC_URL` | Base URL for patient links (`https://app.yourclinic.com`) |
| `JITSI_BASE_URL` | Default `https://meet.jit.si`; use self-hosted Jitsi for production scale |
| `JITSI_ROOM_PREFIX` | Room name prefix (default `GlowHomeo`) |
| `JITSI_APP_ID` | Self-hosted Jitsi application id (enables JWT room auth) |
| `JITSI_APP_SECRET` | Shared secret for signing room JWTs |
| `JITSI_JWT_ISS` / `JITSI_JWT_AUD` / `JITSI_JWT_SUB` | Optional JWT claims (defaults derived from app id / host) |
| `JITSI_RECORDING_WEBHOOK_SECRET` | Shared secret header `X-Recording-Secret` for recording ingest webhook |
| `META_TEMPLATE_APPOINTMENT_INVITE` | Meta template name override (e.g. `appointment_invite_v1`) |
| `META_TEMPLATE_APPOINTMENT_REMINDER` | Reminder template name |
| `META_TEMPLATE_CONSULTATION_SUMMARY` | Post-consult summary template |
| `META_TEMPLATE_PRESCRIPTION` | Prescription ready template |
| `META_TEMPLATE_PARAMS_APPOINTMENT_INVITE` | Comma-separated var order: `patientName,doctorName,clinicName,appointmentDate,appointmentTime,meetingLink` |
| `RESEND_API_KEY` / `RESEND_FROM` | Email invites & Rx |
| `META_*` + doctor WhatsApp connection | WhatsApp invites & reminders |
| `REDIS_URL` | Optional rate limiting (enterprise) |
| `TEMPLATE_APPOINTMENT_INVITE_WHATSAPP` | Override default WhatsApp invite body |
| `TEMPLATE_APPOINTMENT_REMINDER_WHATSAPP` | 24h/1h reminder body |
| `TEMPLATE_CONSULTATION_SUMMARY_WHATSAPP` | Post-consult summary |

## Doctor workflow

1. **Book** — Schedule → Book slot → **Online video** → optional “Send invitation now”.
2. **Remind** — System queues WhatsApp at T−24h and T−1h (requires patient phone + WhatsApp connected).
3. **Start visit** — “Start video visit” or Consultation with `consultationMode=ONLINE` → API provisions Jitsi + patient join token.
4. **Consult** — Left column shows embedded Jitsi; clinical workflow unchanged.
5. **Finalize** — Prescription distribution sends PDF/link via email/WhatsApp (existing flow).

**Resend invite:** `POST /doctor/appointments/:id/resend-invite`

## Patient workflow (India-style telehealth)

1. Receives WhatsApp (or email) with personalized message and **Join consultation** link (`APP_PUBLIC_URL/join/{uuid}`).
2. Before doctor starts: scheduled holding screen with date/time.
3. When doctor starts ONLINE consult: link opens Jitsi with patient display name.
4. After visit: prescription link `/patient/rx/{token}` (no login).

## API routes

| Method | Path | Auth |
|--------|------|------|
| GET | `/public/join/:token` | Public |
| GET | `/public/prescription/:token` | Public |
| GET | `/doctor/consultations/:id/meeting` | Doctor |
| POST | `/doctor/consultations/:id/provision-video` | Doctor |
| POST | `/doctor/appointments/:id/resend-invite` | Doctor |
| POST | `/doctor/appointments` | Doctor — `consultationMode`, `notifyPatient` |
| POST | `/doctor/consultations` | Doctor — auto-provisions video when `ONLINE` |

## Background workers

`backgroundJobs.ts` polls:

- General notification topics (invites, reminders, summaries, Rx)
- `processAppointmentReminderJobs` for due 24h/1h windows

Run API with jobs enabled: `BACKGROUND_JOBS=all` (default in dev).

## Meta WhatsApp templates (India production)

Create **UTILITY** templates in Meta Business Manager, then **Sync** in Settings → WhatsApp. Use these internal names (stored in `whatsapp_templates.name`):

| Slug | Suggested Meta body ({{1}}…{{6}}) |
|------|-----------------------------------|
| `telemedicine_appointment_invite` | Hello {{1}}, your online consultation with {{2}} at {{3}} is on {{4}} at {{5}}. Join: {{6}} |
| `telemedicine_appointment_reminder` | Reminder {{1}}: consultation with {{2}} ({{3}}) at {{5}} on {{4}}. Join: {{6}} |
| `telemedicine_consultation_summary` | Thank you {{1}} for visiting {{2}} at {{3}}. {{4}} Prescription: {{5}} |
| `telemedicine_prescription_ready` | Hello {{1}}, your prescription from {{2}} at {{3}} is ready: {{4}} |

Set `whatsapp_templates.variables` to JSON array matching order, e.g. `["patientName","doctorName","clinicName","appointmentDate","appointmentTime","meetingLink"]`.

Outside the 24h session window, approved templates are used automatically; otherwise free-text body is sent.

## Jitsi JWT (self-hosted)

When `JITSI_APP_ID` and `JITSI_APP_SECRET` are set, room URLs include `?jwt=…` and doctors join as **moderators**. Patients receive non-moderator JWT on `/join/:token`.

## Recording webhook

Configure Jibri finalize or your recorder to POST:

```http
POST /webhooks/jitsi/recording
X-Recording-Secret: <JITSI_RECORDING_WEBHOOK_SECRET>
Content-Type: application/json

{
  "consultationId": "uuid",
  "sourceUrl": "https://recorder.example/out.webm",
  "durationSeconds": 1800
}
```

Recording is stored under `clinics/{clinicId}/document/…` and linked in `video_sessions.recording_object_key`.

## Production recommendations

1. **Self-host Jitsi** on VPC with JWT (`JITSI_APP_*`) enabled in Prosody.
2. **Recording** — Point Jibri finalize URL to `/webhooks/jitsi/recording`.
3. **WhatsApp** — Approve UTILITY templates and sync; keep session messages within 24h where possible.
4. **Scale** — Separate `whatsapp-only` and `notification-only` worker processes; Redis for rate limits (already supported).
5. **APP_PUBLIC_URL** — Must match deployed Next.js origin (HTTPS).

## Verification checklist

- [ ] Migration applied
- [ ] `APP_PUBLIC_URL` set to frontend URL
- [ ] Book ONLINE appointment → invite jobs in `notification_jobs`
- [ ] Patient opens `/join/{token}` on phone
- [ ] Doctor starts ONLINE consult → Jitsi loads in sidebar
- [ ] Finalize consult → patient receives Rx on WhatsApp/email
- [ ] Reminder jobs fire (adjust `scheduled_for` in DB for quick test)
