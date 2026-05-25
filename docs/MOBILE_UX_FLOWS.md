# Patient Mobile — Screen-by-Screen UX Flows

> Lean, healthcare-grade flows for the React Native patient app. Every flow names the
> exact backend route it depends on so design and engineering stay in lockstep.
> Visual direction is documented in [`PATIENT_MOBILE_APP.md`](./PATIENT_MOBILE_APP.md) §7.

---

## 0. Navigation map

```
(auth)
  welcome
  otp                       (phone OTP)
  exchange-token            (deep-link path; usually invisible)

(tabs)
  today      ←—————————— default
  visits
  care
  messages
  profile

Modals / pushes
  visit-detail              (from today / visits)
  prescription-detail
  document-viewer
  appointment-request
  appointment-detail
  check-in-composer
  content-detail            (video / article / diet pack)
  message-thread
  settings
  notification-permissions
```

Bottom tab bar uses 5 items max with a center-weighted **Today** to anchor habit.

---

## 1. First-run / onboarding

### 1.1 Welcome (`/welcome`)

```
[clinic logo]
"Welcome to <Clinic Name>"
"Your homeopathy care, all in one calm place."

[ Sign in with phone ]   ← primary
[ I have an invite link ] ← opens token paste / scans QR
```

- Tap "Sign in with phone" → `/otp`.
- Tap "I have an invite link" → deep‑link handler → `/patient/auth/exchange-token`.

### 1.2 Phone OTP (`/otp`)

```
"+91"  [phone field]              ← single field, +91 prefilled for India
[ Continue ]
                                  ← after submit:
[ 6-digit code field]
"We sent a code to +91 98xxx xxx10"
[ Resend in 30s ]
```

- Routes: `POST /patient/auth/request-otp`, `POST /patient/auth/verify-otp`.
- On success, server matches phone → patients row → links `auth_user_id`. If no patient
  matches → screen flips to "We can't find you yet — ask your clinic to add you." (with
  Whatsapp deep‑link to the clinic).

### 1.3 Permissions

After first login, the app sequentially asks for:

1. **Notifications** — only mandatory permission. Copy:
   *"Get gentle reminders so you never miss a dose. You can turn this off any time."*
2. **Camera** — soft ask, deferred to first photo upload.
3. **Locale** — auto‑detected from device, confirmable in Profile.

If notification permission is denied, the home screen shows a calm banner:
*"Turn on reminders to keep your treatment on track."*

### 1.4 Consent (first run, one screen)

```
We use your data to:
✓ Show your case and prescription
✓ Send reminders for doses, diet and follow-ups
✓ Track your recovery and share it with your doctor

You control:
• What notifications you receive
• When you can be contacted (quiet hours)
• Deleting your account

[ I agree ]   [ Read full policy ]
```

Server logs an audit event `patient_consent_given` on submit.

---

## 2. Today (default tab)

```
┌─────────────────────────────────────────────┐
│ Good morning, Asha · 6-day streak           │
│ Tuesday · 25 May                            │
├─────────────────────────────────────────────┤
│ Medication                                  │
│ ┌─────────────────────────────────────────┐ │
│ │ Arsenicum Album · 30C · 4 pills         │ │
│ │ ◉ Morning   ○ Evening                   │ │  ← tap circle = log dose
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ Bryonia · 200C · 4 pills                │ │
│ │ ○ Afternoon                             │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Diet today                                  │
│ ☑ Warm water with lemon on waking           │
│ ☐ Avoid cold drinks                         │
│ ☐ Light dinner before 8pm                   │
├─────────────────────────────────────────────┤
│ Lifestyle tip                               │
│ ▶ Why we avoid coffee — 1:35                │
│   from Dr. Mehta                            │
├─────────────────────────────────────────────┤
│ Next: Follow-up with Dr. Mehta · Sat 9:30am │
│ [ Online · Join not open yet ]              │
├─────────────────────────────────────────────┤
│ 💬 1 message from your doctor               │
└─────────────────────────────────────────────┘
```

Single route: `GET /patient/today` returns every block.

Interactions:
- Tap dose circle → optimistic update + `POST /patient/medication-logs`.
- Tap diet check‑box → `POST /patient/diet-logs` (debounced, daily aggregated).
- Tap video card → opens `content-detail` modal with native video player.
- Tap "Next" card → `appointment-detail` modal.
- Tap message card → jumps to `message-thread`.

Pull‑to‑refresh re-fetches `/patient/today`.

### 2.1 Empty / new‑patient state

If `medication.items.length === 0`:

```
You don't have an active prescription yet.
Your first remedy will appear here after your visit.
```

If never‑visited:

```
Welcome! Your doctor will see you soon.
In the meantime, complete your profile so we can serve you better.
[ Open profile ]
```

### 2.2 Streak & gentle feedback

- Streak only counts **at least one dose taken** per day.
- Missing a dose never triggers a red badge. After 24h of all‑missed doses we surface a
  single soft prompt: *"How are you feeling? Tell your doctor →"*

---

## 3. Visits tab

### 3.1 Timeline (`/visits`)

Reverse‑chronological list of `consultations`:

```
12 May 2026 · Online · Dr. Mehta · IMPROVEMENT     ›
24 Apr 2026 · In-clinic · Dr. Mehta · IMPROVEMENT  ›
03 Apr 2026 · Online · Dr. Mehta · STANDARD        ›

Suggested follow-up
─ Asha, it's been 14 days since your last visit.
  [ Tell your doctor how you feel ]
```

Route: `GET /patient/visits`.

### 3.2 Visit detail (`/visits/[id]`)

```
[ ← Back ]                          12 May 2026

CHIEF COMPLAINT
Sneezing, runny nose for 4 days

ADVICE
• Diet — warm fluids, light dinner
• Lifestyle — sleep before 11pm
• Avoid — cold water, raw onion

PRESCRIPTION
1. Arsenicum Album · 30C · 4 pills
   Morning + evening · 5 days
2. Bryonia · 200C · 4 pills
   Afternoon · 3 days
[ Open as PDF ]

FOLLOW-UP
Due 28 May · monitor sneezing, fatigue
[ Check in now ]

RECORDING (online visit)
[ ▶ Replay 22:14 ]                  ← when recording_object_key present
```

Route: `GET /patient/visits/:id`.

PDF: `GET /patient/prescriptions/:id` re-signs the URL on each open.

---

## 4. Care library tab

### 4.1 Library home (`/care`)

```
[ Search… ]
Categories ── Diet · Lifestyle · Acute · Chronic ──

Assigned for you (3)
[Video 16:9] [Video 16:9]
[Article] [Diet pack]

From your clinic
[Video] [Video] [Article] [Video] …
```

Route: `GET /patient/content`.

### 4.2 Video / article detail (`/care/[id]`)

- Native video player (full‑screen, picture‑in‑picture supported).
- Tap "Mark as done" → `POST /patient/content/:id/completed`.
- View tracked automatically after 5s of playback.

### 4.3 Diet pack detail

- Per‑day plan (Day 1, Day 2 …).
- Each item is checkable; checks roll into `diet_logs` for that day.

---

## 5. Messages tab

### 5.1 Thread list (`/messages`)

If patient is with one clinic (common case), this screen routes immediately to the
single thread. If multi‑clinic (future), this shows the list.

### 5.2 Thread (`/messages/[thread]`)

```
─── Tue 25 May ────────────────────────────────
Dr. Mehta · 10:14                              ✓
"Continue Arsenicum twice daily. Reduce
 coffee for the next week."
─── now ──────────────────────────────────────
You · 18:00
"My cough has reduced a lot. Should I stop
 the second remedy?"

[ ＋ ] [ Type a message…              ] [ ➤ ]
```

- Realtime via Supabase channel.
- Composer supports text + photo attachment.
- Quick replies row above composer: *"Need a refill" · "Reschedule" · "Not improving"*.
- Off‑hours banner: *"Doctor replies between 9am – 7pm. We've delivered your message."*

Routes:
- `GET /patient/messages?since=`
- `POST /patient/messages`
- Realtime subscription on `patient_inbox_messages` (filtered to this patient).

---

## 6. Profile tab

### 6.1 Profile home (`/profile`)

```
[avatar] Asha Sharma
+91 98xxx xxx10 · O+

Recovery
[ chart: wellbeing 0-10 last 30 days ]

Documents (12)
Prescription · 12 May 2026         ⇣
Case summary · 12 May 2026         ⇣
Lab report · 02 May 2026           ⇣
…

Health profile
Allergies      Sulpha drugs
Conditions     Hypertension
Emergency      Ravi Sharma · +91…

Family share
[ Create read-only link ]

Settings
[ Notifications ]
[ Language ]
[ Sign out ]
```

### 6.2 Recovery view

- Line chart of `wellbeingScore` from `patient_check_ins` last 30/90/180 days.
- Markers for each `case_outcome` documented by the doctor (`IMPROVEMENT`, `WORSE` …).
- Tap any marker to open that visit detail.

### 6.3 Settings

- Reminder times per slot (morning / afternoon / evening / night).
- Quiet hours (default 22:30 – 06:30).
- Channels: push / WhatsApp / SMS / email (per‑channel switches).
- Language: en / hi / mr.
- Account: change phone (re‑OTP), delete account (confirms with code).

Routes: `GET /patient/settings`, `PATCH /patient/settings`.

---

## 7. Cross-cutting flows

### 7.1 Dose-taken flow (most common interaction)

```
Tap dose circle ──▶ haptic + optimistic fill
                    │
                    ▼
              POST /patient/medication-logs
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
     200 OK                  network fail
   queue cleared            queue persisted (MMKV)
   silent success           replay on next foreground
```

The UI never blocks on the network. A small "Saved" toast appears only when the user
explicitly marks a day complete.

### 7.2 Check-in flow

Entry points: Today nudge · Follow‑up card · Profile → "Quick check-in" · Push.

```
How are you feeling today?
 ◯ Worse  ◯ Same  ◯ A little better  ◯ Much better

Energy   [ Low ][ Medium ][ High ]
Sleep    [ Poor ][ OK ][ Good ]
Mood     [ Down ][ Stable ][ Lifted ]

Anything to add? (optional)
[ ………………………………………… ]

[ Send to doctor ]
```

`POST /patient/check-ins`. If `Worse` is selected, the app shows a soft prompt:
*"Would you like to message your doctor now?"* → opens the thread.

### 7.3 Online consultation join

Entry: "Next event" card on Today, or a push 15 min before slot.

```
[ Join consultation ]
                  │
                  ▼
          GET /patient/appointments/:id/meeting
                  │
                  ▼
   Embedded Jitsi (react-native-jitsi-meet)
   - JWT auto-injected
   - Patient = non-moderator
   - Audio on, video on by default
   - Subtle "Doctor is here" indicator
                  │
                  ▼
   On end → return to Today with check-in prompt
```

### 7.4 Appointment request

Entry: Profile → "Request a visit" or any visit-detail screen.

```
When would you like to meet?
[ Date picker ]
Time of day
[ Morning ][ Afternoon ][ Evening ]
Mode
[ Online ][ In-clinic ]
What's it about?
[ Free text 200 chars ]

[ Send request ]
```

`POST /patient/appointments`. Status starts as `REQUESTED`. Patient sees a small
*"Waiting for doctor to confirm"* badge until status flips to `CONFIRMED` (via realtime
appointments channel + push).

### 7.5 Family share

```
Share a read-only view with a family member.
Anyone with the link can see your visits, prescriptions and reports.
They cannot send messages or join consultations.

[ Create link ]
(after creation)
https://homeoassist.app/family/AbCdEf
[ Copy ] [ Share via WhatsApp ]
[ Revoke link ]
```

`POST /patient/family-share`. Server creates a `patient_access_tokens` row with
purpose `family_view`. Revoking deletes the token.

---

## 8. Notification copy library

All push titles/bodies live in `messageTemplates.ts` with locale variants. PHI‑free.

| Topic | Title | Body |
|---|---|---|
| `medication_reminder_morning` | "Time for your morning dose" | "Open the app to mark today's morning dose." |
| `medication_reminder_evening` | "Time for your evening dose" | "Open the app to mark today's evening dose." |
| `diet_reminder` | "How is today's plan going?" | "Tap to check your diet for today." |
| `follow_up_due` | "Your doctor would like to know how you feel" | "Open the app to send a quick check-in." |
| `appointment_reminder_24h` | "Visit tomorrow" | "Your consultation is tomorrow. Open the app for details." |
| `appointment_reminder_1h` | "Visit in 1 hour" | "Open the app to join when ready." |
| `appointment_can_join` | "You can join now" | "Your doctor is starting your consultation." |
| `message_from_clinic` | "New message" | "Your clinic has sent you a message." |
| `new_content` | "Your doctor shared a new tip" | "Open the app to watch." |
| `prescription_ready` | "Your prescription is ready" | "Open the app to view your new prescription." |

---

## 9. Error & edge states

| Scenario | Behaviour |
|---|---|
| No internet on cold start | Cached Today + Visits + Care are served read‑only with a banner. |
| Auth expired | Silent refresh; if refresh also fails, route to `/welcome` with a soft message. |
| Doctor revoked patient access | `GET /patient/me` returns `403 PATIENT_REVOKED` → app explains and signs out. |
| Push token rejected by Expo | Worker disables that token; app re-registers on next open. |
| Pending appointment request not confirmed in 24h | Card label changes to "Awaiting confirmation"; no nag. |
| All doses missed for 48h | One soft nudge + offer to message doctor. No more after that. |
| Backend down | App shows local cache with a calm banner: *"Showing your saved data — reconnecting…"* |

---

## 10. Accessibility checklist

- All interactive elements: `accessibilityLabel`, `accessibilityRole`.
- Color contrast ≥ 4.5:1 for body, ≥ 3:1 for large text.
- Dynamic type to 200%.
- Reduce-motion respected (skip Reanimated entry transitions).
- VoiceOver hint on dose circle: *"Double-tap to mark morning dose as taken."*
- All charts have a sibling text summary.

---

## 11. Telemetry events (privacy-safe)

Sent to `/patient/telemetry` only after the analytics opt‑in. No body text or remedy names.

| Event | Payload |
|---|---|
| `app_open` | `{ source: "cold" \| "push" \| "deeplink" }` |
| `dose_logged` | `{ slot, status }` |
| `checkin_submitted` | `{ score, hasFreeText: bool }` |
| `appointment_requested` | `{ mode }` |
| `content_viewed` | `{ kind, durationViewedSec }` |
| `message_sent` | `{ hasAttachment: bool, length: number }` |

---

**Tracking ID**: `MOBILE_UX_FLOWS`
**Owner**: Mobile pod + Design
