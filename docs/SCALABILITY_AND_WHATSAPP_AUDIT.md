# Scalability, Operations & WhatsApp Business Audit

**Date:** 2026-05-20  
**Scenario:** One doctor, **200+ active patients**, **500+ completed consultation records**, daily clinic workflow + bulk WhatsApp outreach.

---

## Executive summary

| Area | Verdict at 200/500 scale | Risk without changes |
|------|--------------------------|----------------------|
| Patient list & search | **High risk** | Full-clinic load on every page open |
| Patient timeline | **Medium–high** | Large JSON payloads per chart |
| Consultation autosave | **Medium** | Frequent PATCH acceptable; watch payload size |
| Dashboard / My Day | **Medium** | N+1 queries on appointments |
| Command palette | **High risk** | Loads entire patient registry |
| Prescription finalize + notify | **Low–medium** | Queue-based; OK with worker scale-out |
| Real-time (WSS audio) | **Low** per session | One consult at a time |
| WhatsApp (pre-module) | **Not enterprise-ready** | Single Twilio env number, no doctor WABA, no templates/bulk |

**Bottom line:** Core clinical workflow remains usable at ~200 patients. **P0 list/palette/my-day/timeline pagination** are implemented in the enterprise pass (`20260522000000_enterprise_scalability.sql`, see `docs/ENTERPRISE_ARCHITECTURE.md`). Remaining: Meta OAuth, Redis rate limits, full timeline virtualization in UI.

---

## 1. Data layer & indexing

**Strengths**

- Clinic-scoped indexes exist: `idx_consult_patient`, `idx_consult_clinic_active`, `idx_patients_tags` (GIN), `idx_patients_search` (full-text on name + phone).
- `notification_jobs` has `idx_notif_due` for worker polling.
- RLS policies are clinic-scoped on v2 tables.

**Gaps**

| Gap | Impact at scale |
|-----|-----------------|
| No pagination on `GET /doctor/patients` | Loads **all** patients + **all** ended consultations for status | O(patients + consultations) per request |
| Timeline returns full `note_draft` / `note_final` | 500 consults × large JSONB → multi-MB responses |
| My Day loads follow-ups then N patient lookups | Extra latency on busy mornings |
| No materialized “last_visit_at” on `patients` | Recomputed on every list call |

**Recommendation (P0)**

1. Paginated patient API (`limit`, `offset`, `search`, `tags`, `status`).
2. Timeline: summary endpoint with `limit`, exclude heavy note blobs; lazy-load note detail per consult.
3. Denormalize `last_visit_at` + `visit_count` on `patients` (trigger on `consultations.ended_at`).

---

## 2. API & backend operations

### 2.1 Patient list (`GET /doctor/patients`)

**Current behavior**

```text
1. SELECT * FROM patients WHERE clinic_id = ?  (no LIMIT)
2. SELECT patient_id, ended_at FROM consultations WHERE clinic_id AND ended_at IS NOT NULL  (no LIMIT)
3. Merge in Node for status + lastVisitAt
```

At **200 patients / 500 consults**: typically 1–3 MB JSON, 300–800 ms DB+API on modest Supabase tier.

**After fix (this pass):** `limit` / `offset` / `search` / `tags` / `status`; last-visit computed only for the current page’s patient IDs.

### 2.2 Patient timeline (`GET /doctor/patients/:id/timeline`)

Loads **every** consultation and prescription for the patient with full note JSON.

| Records | Approx. response | UX |
|---------|------------------|-----|
| 50 consults | ~500 KB–2 MB | Acceptable |
| 200+ consults | 5–15 MB | Slow TTI, mobile tab freeze |

**Recommendation:** Default `limit=40`, add `?includeNotes=false`, virtualize timeline UI.

### 2.3 Consultation workspace

- Autosave PATCH every **1.5s** on draft + clinical_record — fine for one active consult.
- `LiveConsultationClient` is a large client bundle — monitor with Next.js analyzer; code-split step extras if LCP regresses.

### 2.4 Background jobs

- Notification worker polls every **60s**, processes **20** jobs per tick.
- Bulk WhatsApp (500 recipients) needs **~8–15 min** at 20/min unless batch size and parallel workers increase.

**Recommendation:** Scale workers horizontally; increase per-tick limit via env; add dedicated `whatsapp_broadcast` topic (implemented).

### 2.5 Horizontal scaling checklist

| Component | Stateless? | Notes |
|-----------|------------|-------|
| Express API | Yes | Sticky sessions not required |
| WebSocket audio | Per instance | Use single audio node or Redis pub/sub for multi-instance |
| Job poller | **No** (today) | Only one instance should poll OR use DB `FOR UPDATE SKIP LOCKED` |
| S3 / Supabase | External | OK |

---

## 3. Frontend UX at high load

| Surface | Issue | Severity |
|---------|-------|----------|
| `/patients` | Client-side filter on full list | High |
| `GlobalCommandPalette` | `fetchPatients()` on every open | High |
| `/consultation` start | Patient picker loads full list | Medium |
| Patient hub | Single-patient; OK | Low |
| Live consultation | One session; OK | Low |
| Messages inbox | Depends on thread count | Medium |

**Recommendation**

- Server-driven search with debounce (300 ms).
- Command palette: `GET /doctor/patients?limit=20&search=`.
- Virtualized tables (`@tanstack/react-virtual`) for 50+ visible rows.

---

## 4. Concurrent operations & real-time

| Operation | Conflict model | At 200 patients |
|-----------|----------------|-----------------|
| Two tabs, same consult | Last-write-wins on PATCH | Doctor should use one tab |
| Finalize + autosave | `editingLocked` after finalize | OK |
| Two doctors, same patient | Clinic RLS isolates | OK |
| Bulk WhatsApp + consult | Independent queues | OK if rate-limited |

Audio WebSocket: one stream per consultation; not a clinic-wide bottleneck.

---

## 5. WhatsApp — before vs after

### 5.1 Previous state

- Twilio sandbox-style send in `notificationProviders.ts`.
- Single `TWILIO_WHATSAPP_FROM` for entire deployment.
- Prescription finalize only; no bulk, templates, or per-doctor Business account.
- Feature flag `whatsapp_integration` on ENTERPRISE plan only.

### 5.2 Target (India / global clinic SaaS pattern)

1. **Settings → WhatsApp Business** — connect Meta Cloud API (WABA + phone number ID + token).
2. **Template library** — pre-approved Meta templates + local variables.
3. **Broadcast composer** — audience: all / tags / filters / individuals.
4. **Personalization** — `{{patient_name}}`, `{{doctor_name}}`, etc.
5. **Queue + delivery tracking** — `notification_jobs` + `whatsapp_broadcast_deliveries`.
6. **Compliance** — opt-in flag on patient (`preferred_channel`), skip patients without phone, template-only outbound outside 24h session.

### 5.3 Implemented in this pass

See [§6](#6-implementation-reference) and migration `20260521000000_whatsapp_business.sql`.

**Production still required**

- Meta Embedded Signup (OAuth) instead of manual token paste.
- Webhook endpoint for delivery/read receipts (`messages`, `message_template_status_update`).
- Secrets Manager for `access_token`.
- Template sync job from Meta Business Manager.
- DLT / TRAI SMS fallback for India where WhatsApp template unavailable (optional).

---

## 6. Implementation reference

### New tables

- `whatsapp_connections` — per doctor + clinic Meta/Twilio credentials.
- `whatsapp_templates` — template body + Meta template name + variables.
- `whatsapp_broadcasts` — campaign metadata + counts.
- `whatsapp_broadcast_deliveries` — per-patient status + link to `notification_jobs`.

### New API routes (`registerWhatsAppRoutes`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/doctor/whatsapp/connection` | Connection status |
| POST | `/doctor/whatsapp/connection` | Save / update Business API credentials |
| POST | `/doctor/whatsapp/connection/verify` | Send test template/text |
| DELETE | `/doctor/whatsapp/connection` | Disconnect |
| GET | `/doctor/whatsapp/templates` | List templates |
| POST | `/doctor/whatsapp/templates` | Create template |
| POST | `/doctor/whatsapp/audience/preview` | Count/filter recipients |
| POST | `/doctor/whatsapp/broadcasts` | Queue bulk send |
| GET | `/doctor/whatsapp/broadcasts/:id` | Campaign + delivery stats |

### UI

- **Settings → WhatsApp Business** — connect, verify, disconnect.
- **Messages → Broadcast** — `/messages/broadcast` composer.

### Worker

- Topic `whatsapp_broadcast` on `notification_jobs`; uses Meta Cloud API when connection present, else Twilio/env fallback.

---

## 7. Prioritized roadmap

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Paginated patient list (done) | S |
| P0 | WhatsApp module foundation (done) | L |
| P1 | Timeline pagination + slim payload | M |
| P1 | Denormalize `last_visit_at` on patients | M |
| P1 | Meta webhooks + Embedded Signup | L |
| P2 | Virtualized patient table + palette search | M |
| P2 | Job worker scale-out + SKIP LOCKED | M |
| P2 | Increase notification batch env config | S |

---

## 8. Load test targets (acceptance)

| Metric | Target (200 patients) |
|--------|------------------------|
| `GET /doctor/patients?limit=50` p95 | < 400 ms |
| Patient search p95 | < 500 ms |
| Open consultation (existing) p95 | < 600 ms |
| Timeline first page p95 | < 700 ms |
| Broadcast queue 200 recipients | < 5 min with worker tuning |

---

*This document should be reviewed before production launch with 200+ active patients per clinic.*
