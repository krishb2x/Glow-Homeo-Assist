# Online consultation & patient notifications

Enterprise telemedicine workflow for HomeoAssist: scheduling, WhatsApp/email invites, **Daily.co** embedded video, secure token links, waiting room, reminders, and post-consult prescription delivery.

## Capability matrix

| Capability | Status | Notes |
|------------|--------|-------|
| Schedule online consultations | **Ready** | `POST /doctor/appointments` with `consultationMode: "ONLINE"`, Schedule UI |
| Email meeting invites | **Ready** | Queued job `appointment_invite_email` (Resend) |
| WhatsApp meeting invites | **Ready** | Queued job `appointment_invite_whatsapp` (Meta Cloud API) |
| Dynamic template variables | **Ready** | `{{patient_name}}`, `{{doctor_name}}`, `{{clinic_name}}`, `{{appointment_date}}`, `{{appointment_time}}`, `{{meeting_link}}`, `{{prescription_link}}` |
| Doctor conducts video on platform | **Ready** | Daily.co embed in consultation context drawer |
| Auto-generated meeting links | **Ready** | Daily room + `patient_access_tokens` join URL |
| Waiting room / admit patient | **Ready** | Daily knocking + `POST /doctor/consultations/:id/admit-patient` |
| 24h / 1h reminders | **Ready** | `scheduleAppointmentReminders` + background workers |
| Doctor-ready notification | **Ready** | `consultation_ready_whatsapp` when doctor joins |
| Missed consultation handling | **Ready** | Background job + `consultation_missed_whatsapp` |
| Patient join (mobile/desktop) | **Ready** | `/join/[token]` with Daily.js |
| Post-consult prescription (WhatsApp/email) | **Ready** | `prescriptionDistribution` + `sendPostConsultationNotifications` |
| Consultation recording to secure storage | **Ready** | Daily webhook → S3; doctor download via `GET /doctor/consultations/:id/recording` |
| Realtime session sync | **Ready** | Supabase Realtime on `video_sessions` |
| Meta-approved WhatsApp templates | **Ready** | Sync templates named `telemedicine_*` |

See also: [DAILY_TELEMEDICINE.md](./DAILY_TELEMEDICINE.md) for runbook and production checklist.

## Architecture

```mermaid
flowchart LR
  subgraph doctor
    Schedule[Schedule UI]
    Start[Start ONLINE consult]
    Video[Daily embed]
    Rx[Finalize + send Rx]
  end
  subgraph api
    Appt[appointments + tokens]
    Notify[notification_jobs queue]
    Public[/public/join /public/prescription]
    DailyHook[/webhooks/daily]
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
  Video --> DailyHook
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `APP_PUBLIC_URL` | Base URL for patient links |
| `DAILY_API_KEY` | Daily.co REST API |
| `DAILY_DOMAIN` | Your Daily domain |
| `DAILY_WEBHOOK_SECRET` | Webhook verification |
| `DAILY_ROOM_PREFIX` | Room name prefix (default `GlowHomeo`) |
| `DAILY_MEETING_TOKEN_TTL_SEC` | Meeting token TTL (default 7200) |
| `MISSED_CONSULTATION_GRACE_MIN` | No-show grace minutes (default 20) |
| `META_TEMPLATE_*` | WhatsApp template overrides |
| `RESEND_API_KEY` / `RESEND_FROM` | Email |

## Doctor workflow

1. **Book** — Schedule → Book slot → **Online video** → optional “Send invitation now”.
2. **Remind** — System queues WhatsApp at T−24h and T−1h.
3. **Start visit** — Start with `consultationMode=ONLINE` → API provisions Daily room automatically.
4. **Consult** — Open Context drawer → embedded video, copy patient link, admit when patient knocks.
5. **Finalize** — Prescription distribution sends PDF/link via email/WhatsApp.

**Resend invite:** `POST /doctor/appointments/:id/resend-invite`

## Patient workflow

1. Receives WhatsApp (or email) with **Join consultation** link (`APP_PUBLIC_URL/join/{uuid}`).
2. Before doctor starts: scheduled holding screen (auto-refreshes every 8s).
3. When doctor starts ONLINE consult: Daily video with knocking/waiting room.
4. After doctor admits: full video consultation in browser or mobile.
5. After visit: prescription link `/patient/rx/{token}`.

## API routes

| Method | Path | Auth |
|--------|------|------|
| GET | `/public/join/:token` | Public |
| GET | `/public/prescription/:token` | Public |
| GET | `/doctor/consultations/:id/meeting` | Doctor |
| GET | `/doctor/consultations/:id/video-session` | Doctor |
| POST | `/doctor/consultations/:id/provision-video` | Doctor |
| POST | `/doctor/consultations/:id/admit-patient` | Doctor |
| POST | `/doctor/appointments/:id/resend-invite` | Doctor |
| POST | `/webhooks/daily` | Webhook secret |

## Verification checklist

- [ ] Migrations applied (`20260524000000`, `20260529000000`)
- [ ] Daily.co credentials configured
- [ ] Book ONLINE appointment → invite jobs queued
- [ ] Patient opens `/join/{token}` on phone
- [ ] Doctor starts ONLINE consult → Daily loads in context drawer
- [ ] Patient knocking → doctor admits → call connected
- [ ] Finalize consult → patient receives Rx
- [ ] Reminder jobs fire (adjust `scheduled_for` for quick test)
