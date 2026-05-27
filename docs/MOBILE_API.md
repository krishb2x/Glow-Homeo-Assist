# Patient Mobile API Specification

> All routes live under the `/patient/*` namespace. Every route except `/patient/auth/*`
> requires `requirePatientAuth`. The middleware resolves the caller's `patients.id` via
> `patients.auth_user_id = auth.uid()` and rejects any request whose role is not `PATIENT`.
>
> Responses use the existing `apiEnvelope`: `{ success: true, data }` or
> `{ success: false, error, code }`.

---

## 0. Conventions

- Auth: `Authorization: Bearer <supabase-access-token>` (mirrors doctor app).
- Locale: `Accept-Language: en | hi | mr` (server uses this for templated copy).
- Time: every datetime is ISO‑8601 UTC (`Z`).
- Pagination: `?limit=` (max 50) + `?cursor=` (opaque, base64 `created_at|id`).
- Idempotency: writes accept `Idempotency-Key` header (5 min window).
- Errors: standard codes — `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`,
  `RATE_LIMITED`, `CONFLICT`.

---

## 1. Auth

### POST `/patient/auth/login` (recommended — no OTP)

Patient enters the **patient code** printed on the prescription (e.g. `GH-CLN-00042`).
The server looks up `patients.patient_code`, creates/links a Supabase auth user, and
returns a session. Use `Authorization: Bearer <access_token>` on all other `/patient/*` routes.

```http
POST /patient/auth/login
Content-Type: application/json

{ "patientCode": "GH-CLN-00042" }
```

```json
{
  "success": true,
  "data": {
    "token": "<access_token>",
    "session": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_at": 1740000000,
      "expires_in": 3600
    },
    "patient": {
      "id": "uuid",
      "name": "Asha Sharma",
      "phone": "+91...",
      "patientCode": "GH-CLN-00042"
    },
    "clinic": { "id": "uuid", "name": "Dr. Mehta's Homeopathy" }
  }
}
```

Errors: `INVALID_PATIENT_CODE` (401), `PATIENT_CODE_MISSING` (400), `RATE_LIMITED` (429).

> **Security:** Codes are clinic-scoped identifiers on a printed Rx — treat as a shared
> secret, not a password. Add OTP or PIN later for production hardening if needed.

### POST `/patient/auth/exchange-token` (optional)

WhatsApp / SMS deep link with `patient_access_tokens.token` — same session shape as login.
*(Not required if using patient code login.)*

### OTP flows (optional, not enabled in API yet)

`POST /patient/auth/request-otp` and `POST /patient/auth/verify-otp` — planned; use
`/patient/auth/login` with `patientCode` for now.

### POST `/patient/auth/logout`

Revokes the Supabase session and deletes the current device's `patient_push_tokens` row.
*(Planned.)*

---

## 2. Bootstrap

### GET `/patient/me`

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "uuid",
      "name": "Asha Sharma",
      "phone": "+91...",
      "email": "asha@…",
      "dateOfBirth": "1985-04-12",
      "gender": "female",
      "bloodGroup": "O+",
      "allergies": "Sulpha drugs",
      "ongoingConditions": "Hypertension",
      "emergencyContact": { "name": "Ravi Sharma", "phone": "+91..." },
      "tags": ["chronic"],
      "followUpStatus": "stable",
      "lastVisitAt": "2026-05-12T10:00:00Z",
      "visitCount": 7
    },
    "clinic": {
      "id": "uuid",
      "name": "Dr. Mehta's Homeopathy",
      "address": "...",
      "phone": "...",
      "email": "..."
    },
    "doctor": { "id": "uuid", "name": "Dr. K. Mehta", "credentials": "BHMS" },
    "flags": {
      "messagingEnabled": true,
      "onlineConsultEnabled": true,
      "contentEnabled": true
    }
  }
}
```

### GET `/patient/today`

Composite endpoint optimised for the home screen. One call, everything below the fold.

```json
{
  "success": true,
  "data": {
    "greeting": { "name": "Asha", "streakDays": 6 },
    "medication": {
      "prescriptionId": "uuid",
      "items": [
        {
          "id": "rx-line-1",
          "name": "Arsenicum Album",
          "potency": "30C",
          "doseCount": "4 pills",
          "timingSlots": ["morning", "evening"],
          "loggedToday": { "morning": "2026-05-25T07:14:00Z", "evening": null }
        }
      ]
    },
    "diet": {
      "items": [
        { "id": "d1", "text": "Warm water with lemon on waking", "checked": true },
        { "id": "d2", "text": "Avoid cold drinks", "checked": false }
      ]
    },
    "tip": {
      "id": "uuid",
      "kind": "video",
      "title": "Why we avoid coffee during homeopathic treatment",
      "thumbnailUrl": "https://…",
      "durationSec": 95
    },
    "restrictions": ["No coffee", "No raw onion"],
    "nextEvent": {
      "kind": "appointment",
      "id": "uuid",
      "title": "Follow-up with Dr. Mehta",
      "scheduledFor": "2026-05-28T09:30:00Z",
      "mode": "ONLINE",
      "canJoinNow": false
    },
    "unreadMessageCount": 1
  }
}
```

### POST `/patient/push-token`

```json
{
  "platform": "ios" | "android" | "web",
  "token": "ExponentPushToken[...]",
  "appVersion": "1.0.0",
  "locale": "en-IN"
}
```

Server upserts on `(token)` and stamps `last_seen_at = now()`.

---

## 3. Visits

### GET `/patient/visits?limit=20&cursor=…`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "startedAt": "2026-05-12T10:00:00Z",
        "endedAt": "2026-05-12T10:32:00Z",
        "mode": "ONLINE",
        "doctorName": "Dr. K. Mehta",
        "complexity": "STANDARD",
        "lifecycleStatus": "FINALIZED",
        "summary": "Acute coryza; remedy adjusted.",
        "hasPrescription": true,
        "hasRecording": false,
        "outcome": "IMPROVEMENT"
      }
    ],
    "nextCursor": null
  }
}
```

### GET `/patient/visits/:id`

```json
{
  "success": true,
  "data": {
    "visit": { … same shape as list item … },
    "chiefComplaint": "Sneezing, runny nose for 4 days",
    "advice": [
      { "id": "a1", "category": "diet", "title": "Warm fluids", "detail": "…" },
      { "id": "a2", "category": "lifestyle", "title": "Sleep before 11pm", "detail": "…" }
    ],
    "prescription": {
      "id": "uuid",
      "items": [ /* PrescriptionItem[] from @homeoassist/domain */ ],
      "pdfUrl": "https://…signed…"
    },
    "followUp": {
      "id": "uuid",
      "dueAt": "2026-05-28T00:00:00Z",
      "symptomsToMonitor": ["sneezing", "fatigue"]
    }
  }
}
```

### GET `/patient/prescriptions/:id`

Returns the prescription with its signed PDF url (re‑signed each call, 15‑min ttl).

---

## 4. Adherence

### POST `/patient/medication-logs`

```json
{
  "prescriptionId": "uuid",
  "itemId": "rx-line-1",
  "slot": "morning",
  "status": "TAKEN" | "SKIPPED" | "DELAYED",
  "takenAt": "2026-05-25T07:14:00Z",
  "note": "Took with breakfast"
}
```

Idempotent on `(patient_id, prescription_id, item_id, slot, taken_date)` —
re‑posting the same dose updates `status` / `note`.

### GET `/patient/medication-logs?since=ISO`

Returns logs since a date for the streak / week view.

### POST `/patient/diet-logs`

```json
{ "date": "2026-05-25", "onPlan": true, "note": "Avoided cold drinks" }
```

### POST `/patient/check-ins`

```json
{
  "wellbeingScore": 7,
  "symptoms": ["mild sneezing"],
  "energy": "MEDIUM",
  "sleep": "GOOD",
  "mood": "STABLE",
  "freeText": "Feeling better today"
}
```

### GET `/patient/check-ins?since=ISO`

---

## 5. Follow‑ups

### GET `/patient/follow-ups`

Returns intentional + suggested follow‑ups for the patient. Suggested follow‑ups have
`source: "suggested"` and a soft due date (no `id`).

### POST `/patient/follow-ups/:id/complete`

Body is the same as a check‑in. Marks the follow‑up `COMPLETED` and writes a
`patient_check_in` so the doctor sees the recovery state.

---

## 6. Appointments

### GET `/patient/appointments`

Paged future + last‑3 past appointments. Each row includes:

```json
{
  "id": "uuid",
  "scheduledFor": "2026-05-28T09:30:00Z",
  "durationMinutes": 30,
  "status": "CONFIRMED",
  "mode": "ONLINE",
  "doctorName": "Dr. K. Mehta",
  "canJoinNow": false,
  "meetingAvailable": true
}
```

### POST `/patient/appointments`

```json
{
  "preferredDate": "2026-06-01",
  "preferredTimeWindow": "MORNING" | "AFTERNOON" | "EVENING",
  "mode": "ONLINE" | "IN_CLINIC",
  "reason": "Worsening cough"
}
```

Creates a row with `status='REQUESTED'`; doctor confirms from desktop. Patient gets a
push notification when status transitions to `CONFIRMED`.

### POST `/patient/appointments/:id/cancel`

```json
{ "reason": "feeling-better" | "schedule-conflict" | "other", "note": "…" }
```

### GET `/patient/appointments/:id/meeting`

Returns short‑lived Jitsi config (room id + patient JWT). Only callable from `T-15min`
to `T+90min` around `scheduled_for`. After that the existing public `/public/join/:token`
is used as a permanent fallback.

```json
{
  "success": true,
  "data": {
    "roomId": "GlowHomeo-abc123",
    "jitsiUrl": "https://meet.example.com/GlowHomeo-abc123?jwt=…",
    "jwt": "…",
    "jwtExpiresAt": "2026-05-28T11:30:00Z"
  }
}
```

---

## 7. Messages

### GET `/patient/messages?since=ISO&limit=50`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "direction": "PATIENT" | "CLINIC",
        "body": "Doctor, I have a doubt …",
        "createdAt": "2026-05-25T18:00:00Z",
        "readAt": null,
        "attachments": [{ "id": "uuid", "url": "https://…", "mimeType": "image/jpeg" }]
      }
    ]
  }
}
```

### POST `/patient/messages`

```json
{
  "body": "I think my cough has reduced",
  "attachmentMediaObjectIds": ["uuid"]
}
```

Writes to `patient_inbox_messages` with `direction='PATIENT'` and triggers a realtime
`postgres_changes` event that the doctor inbox listens to.

Realtime channel for the mobile client:

```ts
supabase
  .channel(`patient-messages-${patientId}`)
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "patient_inbox_messages",
    filter: `patient_id=eq.${patientId}`,
  }, handler)
  .subscribe();
```

---

## 8. Content (lifestyle videos, diet packs, articles)

### GET `/patient/content?kind=video&category=lifestyle&limit=20`

Returns the union of:
- Items explicitly assigned to the patient (`patient_content_assignments`).
- Items published clinic‑wide (`clinic_content_items.is_published = true`).

```json
{
  "items": [
    {
      "id": "uuid",
      "kind": "video" | "article" | "diet_pack" | "lifestyle_tip",
      "title": "Morning routine for sinus relief",
      "summary": "…",
      "category": "lifestyle",
      "thumbnailUrl": "https://…",
      "mediaUrl": "https://…signed…",
      "durationSec": 240,
      "tags": ["sinus", "morning"],
      "assignedAt": "2026-05-12T10:32:00Z",
      "viewedAt": null,
      "completedAt": null
    }
  ]
}
```

### POST `/patient/content/:id/viewed`
### POST `/patient/content/:id/completed`

Increment view counts (used in doctor analytics) and update the assignment row.

---

## 9. Documents

### GET `/patient/documents`

```json
{
  "items": [
    {
      "id": "uuid",
      "kind": "prescription_pdf" | "case_summary_pdf" | "patient_photo" | "document",
      "title": "Prescription — 12 May 2026",
      "createdAt": "…",
      "mimeType": "application/pdf",
      "sizeBytes": 84212,
      "url": "https://…signed (15 min) …"
    }
  ]
}
```

### POST `/patient/documents` (presign + complete)

Two‑step: `POST /patient/documents/presign-upload` → upload directly to S3 →
`POST /patient/documents/complete-upload` to register a `media_objects` row of kind
`patient_photo`. Mirrors the existing doctor flow.

---

## 10. Settings

### GET `/patient/settings`

```json
{
  "locale": "en-IN",
  "channels": {
    "push": true,
    "whatsapp": true,
    "sms": false,
    "email": false
  },
  "reminderTimes": {
    "morning": "07:30",
    "afternoon": "13:30",
    "evening": "19:30",
    "night": "22:00"
  },
  "quietHours": { "start": "22:30", "end": "06:30" }
}
```

### PATCH `/patient/settings`

Partial body. The reminder worker uses `reminderTimes` and `quietHours` when deciding
scheduled push windows.

### POST `/patient/family-share`

Rotates and returns a `view-only` token that lets a family member open a read‑only
mirror of Today, Visits, Documents. Token is a `patient_access_tokens` row with a new
purpose `family_view`.

---

## 11. Webhooks (server → app)

The app **does not** expose webhooks. The mobile client receives:

- **Push notifications** via Expo Push (server → Expo → device).
- **Realtime events** via Supabase channels (`patient_inbox_messages`, `appointments`).

Push payload (deliberately PHI‑light):

```json
{
  "to": "ExponentPushToken[...]",
  "title": "Time for your morning dose",
  "body": "Open the app to mark today's morning dose.",
  "data": {
    "type": "medication_reminder",
    "prescriptionId": "uuid",
    "slot": "morning",
    "deepLink": "homeoassist://today"
  },
  "channelId": "medication",
  "sound": "default",
  "priority": "high"
}
```

No remedy names, doctor names, conditions or PII appear in the payload — those load
after auth on app open.

---

## 12. Rate limits

Per patient JWT:

| Surface | Limit |
|---|---|
| `/patient/today`, `/patient/me` | 60 / min |
| `/patient/medication-logs`, `/patient/check-ins` | 120 / min |
| `/patient/messages` (POST) | 30 / min, 200 / day |
| `/patient/appointments` (POST) | 5 / hour |
| `/patient/family-share` | 5 / day |

Implemented via the existing `doctorRateLimit()` factory parameterised with `patient_…`
keys.

---

## 13. Backwards compatibility

- No existing route changes.
- `patient_inbox_messages` schema unchanged; patient writes set `created_by_user_id` to
  the patient's `auth.uid()`. Doctor inbox UI ignores this column when rendering.
- `patient_access_tokens.purpose` adds `family_view` (idempotent enum extension via the
  `IN (…)` CHECK constraint — handled by the migration).

---

**Tracking ID**: `MOBILE_API`
**Owner**: Mobile pod
