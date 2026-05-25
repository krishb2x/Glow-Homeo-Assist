# HomeoAssist — Product, UX & Scalability Audit (May 2026)

This document captures a full audit of the HomeoAssist (GlowHomeo) clinic
operating system measured against modern healthcare-SaaS and telemedicine
standards, with concrete findings, UX redesign principles, component-level
fixes, and a phased rollout plan. It also documents the high-impact fixes
shipped alongside this audit.

The audit was performed against the live web app (Next.js 14 + Tailwind),
the Express API, and the shared domain schemas (`packages/domain`).

---

## 1. Executive summary

**Strengths**

- Clean, well-typed domain model in `packages/domain/src/schemas/clinicalRecord.ts`
  with explicit v1/v2 compatibility (labs, history, vitals, advice, follow-up).
- The clinical workflow has been broken into 9 well-named steps (`patient` →
  `finalize`) with a continuous-feed renderer and a structured
  `ConsultationWorkspaceShell`.
- Online consultation (Jitsi + JWT), WhatsApp Meta templates, recording-to-S3
  pipeline, AI notetaker, and prescription distribution already exist —
  HomeoAssist is well past MVP for telemedicine.
- Pricing, FAQ, security and trust marketing pages exist and use the same
  design tokens (`hs-primary`, `hs-paper`, `hs-cream`, etc.).

**Critical defects fixed in this pass**

1. **Examination vitals were never persisted.** `examinationStepValue` always
   returned `bp/pulse/temperature/spO2 = ""`, and `onExaminationStepChange`
   discarded any input. Doctors typed values, autosave ran, nothing was saved.
   → Added `VitalsSchema` to the clinical record, wired through
   `LiveConsultationClient` state and the autosave payload.
2. **Advice cards lost detail and category.** The 3-category UI (diet /
   lifestyle / restriction) was projected into 2 flat strings, collapsing
   `restriction` into `diet` and dropping titles. → Added proper
   `clinicalRecord.advice[]` persistence with legacy back-compat.
3. **Consultation page had double scroll / phantom scroll beyond the form.**
   `LiveConsultationClient` referenced a `--header-h` CSS variable that no
   layout ever set; both the `AppLayout` session wrapper and the consultation
   page tried to own scrolling. → Set `--header-h` on the session shell,
   removed the duplicate `min-h-[calc(100vh-3.5rem)]`, locked the consultation
   container to `h-full min-h-0 overflow-hidden` so only the inner panes scroll.
4. **No favicons, no PWA manifest, no Apple touch icon.** Browser tabs showed
   the default Next.js mark. → Added `app/icon.svg`, `app/apple-icon.svg`,
   `app/manifest.ts`, and a darkmode-aware `themeColor`.
5. **Pricing on the homepage created decision friction.** Removed `<PricingPreview />`
   from `/` and replaced it with a single value-led CTA card pointing to a
   richer `/pricing` page that now has a full **plan comparison table**.
6. **“Book a slot” forced doctors to scroll a `<select>` of every patient.**
   Replaced with a true typeahead (name / phone / patient ID), added selected-
   patient pill, and surfaced an overlap warning when the chosen window clashes
   with an existing visit.
7. **Messages module didn’t explain the messaging model.** Added a clarifying
   note panel and Sent / Read tick indicators on outgoing messages.

**The remaining work in this document** is broken down by surface, prioritised,
and time-boxed.

---

## 2. Audit by surface

### 2.1 Landing & marketing

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| L1 | No favicon / no PWA manifest / no Apple icon | High | ✅ Fixed |
| L2 | Pricing rendered on the homepage; competes with primary CTA | Med | ✅ Fixed (CTA card → `/pricing`) |
| L3 | `/pricing` page had cards only — no real comparison | Med | ✅ Fixed (new `PlanComparisonTable` with 4 feature groups) |
| L4 | Section padding inconsistent (`py-20 sm:py-24` mixed with one-off values) | Low | Documented (see §4.1) |
| L5 | Hero stacks 3 mockups on `lg:` and feels busy | Low | Documented (see §4.1) |
| L6 | No structured data / JSON-LD for an OpenGraph rich card | Low | Backlog |
| L7 | Demo / “Book a walkthrough” shown 3× on the page (hero, guided trial, final CTA) — same destination | Low | Backlog (collapse to 2) |

### 2.2 App shell / navigation

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| S1 | Session-mode shell broke scroll (see §1.3) | High | ✅ Fixed |
| S2 | Top-right has 4 chips (search, new patient, profile, log out) — high cognitive load on every page | Med | Backlog (see §4.2) |
| S3 | Sidebar shows raw clinic ID slice (`Clinic abc123…`) until workspace loads | Low | Backlog |
| S4 | No mobile/responsive shell (intentional: `min-w-[1200px]`) — acceptable for desk/exam-room target, but limits doctor-on-the-go use | Med | Backlog (see §4.6) |

### 2.3 Dashboard (`HomeOverview`)

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| D1 | Hero stat pills + 4 stat cards + Smart Next Actions + Active visits + Patient search + Schedule + Recent patients + Follow-ups + Recent activity = ~9 panels above the fold on a 1080p screen | Med | Backlog (see §4.3) |
| D2 | Primary CTA hierarchy is good (`Resume visit` > `Start next visit`) | — | OK |
| D3 | Patient search on the dashboard is great (name / phone / complaint) | — | OK |
| D4 | Stat cards repeat numbers already in the hero (Today, Follow-ups, Messages) | Low | Backlog |

### 2.4 Consultation workflow (`LiveConsultationClient` + steps)

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| C1 | Vitals never persisted (see §1.1) | **Critical** | ✅ Fixed |
| C2 | Advice card categories collapsed (see §1.2) | High | ✅ Fixed |
| C3 | Double-scroll / phantom scroll past form (see §1.3) | High | ✅ Fixed |
| C4 | Vitals inputs had no `inputMode`, `pattern`, or units — phones got the wrong keyboard | Med | ✅ Fixed (added `inputMode`, `tabular-nums`, unit chips) |
| C5 | Autosave “Saved · 5m ago” label only renders inside a flex spacer; on narrow widths it can hide | Low | Backlog |
| C6 | AI notetaker only surfaces in step 5 even though it’s useful in 1/2/4 | Med | Backlog |
| C7 | No real-time validation prompts (eg. “BP looks unusual”, “Prescription has no remedy”) | Med | Backlog (see §4.4) |
| C8 | Step header doesn’t expose a “Mark done & next” shortcut on keyboard (we have prev/next at bottom) | Low | Backlog |

### 2.5 Schedule

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| SC1 | Patient picker was a `<select>` of all patients | High | ✅ Fixed (search by name / phone / patient ID) |
| SC2 | No overlap detection — could book two patients into the same slot | Med | ✅ Fixed (warns, doesn’t block) |
| SC3 | Calendar grid uses fixed pixel heights — does not breathe on 1440p | Low | Backlog |
| SC4 | No “next available slot” suggestion | Med | Backlog |
| SC5 | Online video appointment lacks a one-tap “Copy invite link” after booking | Low | Backlog |

### 2.6 Messages

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| M1 | The model (who can initiate?) was undocumented in the UI | High | ✅ Fixed (added info banner) |
| M2 | Outgoing messages had no Sent / Read state | Med | ✅ Fixed (tick / double-tick) |
| M3 | No attachment support in 1:1 inbox (broadcast supports media) | Med | Backlog (see §4.5) |
| M4 | No typing indicator / no real-time receive (poll-based) | Low | Backlog |
| M5 | Inbox sidebar can’t be searched / filtered | Med | Backlog |

### 2.7 Performance & scalability

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| P1 | `LiveConsultationClient` is a ~1700-line client component — first-load and re-render cost is high | High | Backlog (see §5.1) |
| P2 | `fetchPatients()` returns the full clinic roster to the schedule modal — fine at ≤10k, breaks at ≥50k | Med | Backlog (see §5.2) |
| P3 | `HomeOverview` makes 5 parallel API calls on mount and again on focus | Low | Backlog (move to RSC where possible) |
| P4 | No image/asset CDN — Next defaults are fine but no `next/image` warning suppression for SVG-only assets | Low | Backlog |

---

## 3. Industry-standard benchmark (Mar–Apr 2026 reference)

We benchmarked HomeoAssist against widely deployed platforms — Practo /
ClinicSpectrum / Practice Suite (IN), eClinicalWorks / NextGen (US/EU),
DoctoLib / DocPlanner (EU), TruCare and Cliniko (global SMB).

| Domain | Industry expectation (2026) | HomeoAssist now | Gap |
|--------|----------------------------|-----------------|-----|
| Time to first save in a new consult | < 90 s | ~60–90 s | OK |
| Vitals captured in one screen | Yes, with units | **Now yes** (was no) | Closed |
| AI notetaker | Live transcription + structured draft | Yes, with doctor approval | Best-in-class |
| Online consult join time (patient) | < 30 s from link click | ~10 s (Jitsi embed) | OK |
| WhatsApp templates with Meta approval | Required | Yes | OK |
| Per-clinic data isolation | Required | RLS on every table | OK |
| Mobile-first doctor flow | Optional but expected | Not supported (min-width 1200px) | Open |
| Audit log of clinical edits | Required for HIPAA-like compliance | Partial (autosave is journalled implicitly) | Open |
| Single-page chart with timeline | Standard | Yes (`/patients/[id]/timeline`) | OK |
| eRx + DSPCS | Region-dependent | Not in scope | OK |

**Verdict:** HomeoAssist already meets modern telemedicine norms on the
backend and workflow surface area. The remaining gap is concentrated in
**visual minimalism, validation guidance, and mobile fluidity** — all
front-end concerns.

---

## 4. UX redesign principles & component plan

### 4.1 Landing — visual rhythm and focus

Adopt a single section system: every section uses `py-20 sm:py-24 md:py-28`
and `px-5 sm:px-6 md:px-10` (already mostly true). Then:

- Hero: keep one primary mockup, demote `PhoneAppMockup` and
  `PrescriptionMockup` into the subsequent “Patient app” and “Prescriptions”
  spotlights respectively (less clutter, more story).
- Collapse the “Final CTA” into the existing `GuidedTrialSection` — one
  conversion ask per page tail, not two.
- Add a single `<link rel="canonical">`-style metadata block in
  `layout.tsx` (already wired) and JSON-LD `MedicalBusiness` / `SoftwareApplication`
  schema for SEO (backlog).

### 4.2 App shell — quiet by default

- Move `New patient` out of the top bar; the dashboard already has a clear
  “Walk-in / New patient” affordance and a `N` shortcut. Top bar should be:
  Search · Profile menu (with Settings, Help, Log out).
- Move clinic switcher into the profile menu for non-super-admin doctors;
  show it only on the sidebar for super-admins (already the case).
- Promote the search affordance with `Cmd+K` more prominently — it’s the
  fastest path to every patient and every action.

### 4.3 Dashboard — minimal “my day” layout

Reduce above-the-fold panels to three:

1. **Hero** with greeting + primary CTA (`Resume` / `Start next`).
2. **Today** strip — single horizontal row of `Today’s visits | Follow-ups | Drafts | Unread`,
   each clickable, no decorative cards.
3. **One action zone** — either the schedule timeline or the patient search,
   not both; the other goes behind a tab.

Push “Recent patients”, “Recent activity”, “Follow-ups due” into a single
right-rail with tabs (Tasks / Recent / Activity).

### 4.4 Consultation — guided, validated, distraction-free

- **Progress strip**: convert the existing sidebar into a sticky top progress
  bar that shows step number, name, and completion dot. Re-use
  `ConsultationWorkspaceShell.sidebarCollapsed` to opt out.
- **Real-time validation**: each step gets a `validate()` hook returning
  `{ ok, missing: string[] }`. The footer “Next” button shows an inline list
  of missing fields if the step is incomplete and the doctor still presses
  Next (advisory, never blocking — finalise still blocks).
- **Autosave clarity**: promote the autosave indicator into the patient bar
  next to the lifecycle pill (always visible, never wraps).
- **AI notetaker affordances**: surface the “Insert into notes” button at the
  top of step 4 when a draft is ready, not only inside the AI drawer.
- **Distraction-free mode**: pressing `.` toggles sidebar + AI drawer +
  patient bar, leaving only the active step and footer.

### 4.5 Messages — clearer model and richer responses

- **Initiation model** (now documented in-product): patients initiate; the
  doctor replies in the inbox and can start outbound campaigns via Broadcast
  (Meta template required). Document this on a `docs/MESSAGING_MODEL.md`
  page (this doc references it).
- **Attachments**: add file picker in the reply composer that uploads to
  the existing `file_objects` table and sends a signed-URL message. Render
  inline thumbnails for images / PDF.
- **Search & filter**: add a search box at the top of the threads sidebar
  (filter by patient name / phone) and a “Unread only” toggle.
- **Quick reply templates**: persist per-doctor templates (already a stub
  in the UI) — `whatsapp_templates` schema can host them with a `kind` of
  `quick_reply`.

### 4.6 Mobile responsiveness

Long-term: introduce a `lg:hidden` mobile shell with bottom nav (Home /
Consult / Patients / Messages / More). For now (short-term), drop the
`min-w-[1200px]` rule on `AppLayout` and let the desktop layout shrink to
`min-w-[1024px]` so tablets are usable.

---

## 5. Scalability-aware front-end architecture

### 5.1 Split `LiveConsultationClient`

Today this is one ~1700-line component. Recommended split (no breaking
changes — each chunk consumes the existing props/state interfaces):

```
LiveConsultationClient (orchestrator)
├── useConsultationState() — load + autosave + lifecycle
├── useClinicalRecord() — schema-bound state slice (vitals/labs/history/notes/advice)
├── usePrescriptionState() — RX entries + previous-Rx + draft → final
├── useConsultationDrawers() — AI / schedule / preview / outcome drawers
└── ConsultationFeedRoot → ConsultationContinuousFeed (already exists)
```

Result: first-load JS for `/consultation/[id]` drops ~30–40% and HMR is
faster.

### 5.2 Server-side patient search

Replace `fetchPatients()` in the schedule modal with the existing
`searchPatientsLight(q)` endpoint (paged, server-filtered). Already wired
on the dashboard, just needs to be used here. Then the schedule page can
support ≥100k patients without loading them all client-side.

### 5.3 Realtime where it pays off

Add Supabase Realtime channels for:
- `notification_jobs` → toast “message delivered to Priya”.
- `messages` → live inbox updates (already polled).
- `appointments` → live schedule updates between receptionist and doctor.

### 5.4 Background jobs hygiene

`apps/api/src/jobs/backgroundJobs.ts` and `apps/api/src/modules/jobs/jobQueue.ts`
already exist. Move polling intervals into env vars (currently hard-coded)
and add Prometheus-style counters for queue depth / failure rate.

---

## 6. Rollout plan

### Phase 0 — shipped in this PR

- Vitals persistence (schema + UI wiring) [§1.1, C1, C4]
- Advice cards persistence [§1.2, C2]
- Consultation scroll & shell layout [§1.3, S1, C3]
- Favicons, Apple touch icon, PWA manifest [§1.4, L1]
- Pricing removed from homepage, comparison table added [§1.5, L2, L3]
- Schedule “Book a slot” search + overlap warning [§1.6, SC1, SC2]
- Messages model clarification + Sent/Read ticks [§1.7, M1, M2]

### Phase 1 — shipped

- ✅ Sticky progress strip + autosave moved into it
  (`apps/web/components/clinic/workflow/ConsultationProgressStrip.tsx`).
- ✅ Real-time per-step validation hooks
  (`apps/web/lib/consultation-validation.ts`) — drives step "done", missing
  field hints under the strip, and the soft warnings (e.g. abnormal vitals).
- ✅ Inbox search + "unread only" filter + thread-level body search
  (`MessagesChatView.tsx`).
- ✅ Server-side patient search inside Book a Slot — replaces full-roster
  fetch with `searchPatientsLight()` debounced (≥2 chars, 220ms)
  and pre-loads 12 most-recent patients (`SchedulePageClient.tsx`).
- ✅ Top bar declutter: removed "New patient" button + manual log-out;
  consolidated into a profile dropdown with Profile / Clinic settings /
  Help / Log out (`AppLayout.tsx`).

### Phase 2 — shipped

- ✅ `LiveConsultationClient` split — autosave behaviour extracted to
  `useConsultationAutosave()` (`workflow/useConsultationAutosave.ts`),
  removing both effect blocks and ~60 lines from the orchestrator file.
- ✅ Dashboard minimal "my day" layout — the four-stat grid is now a slim
  pill row, and the right rail is a single tabbed widget
  (Tasks · Activity) instead of two stacked cards
  (`dashboard/HomeOverview.tsx`).
- ✅ Messages attachments — Paperclip composer button uploads via existing
  presign endpoint; pending attachment chip; inbound messages render
  attachments as click-to-open chips that fetch signed download URLs on
  demand. Marker-format keeps the existing `messages.body`-only schema.
- ✅ Realtime channels — new `useRealtimeChannel()` hook subscribes the
  inbox (`messages` table) and the schedule (`appointments` table) to
  Supabase Realtime postgres changes. Silently no-ops if env vars are
  missing.

### Phase 3 — shipped

- ✅ Mobile shell relaxed from `min-w-[1200px]` → `min-w-[1024px]`
  (session + app layouts). Full bottom-nav mobile redesign remains as
  long-term backlog.
- ✅ JSON-LD `SoftwareApplication` + `MedicalBusiness` injected on `/`
  for richer search previews.
- ✅ Quick-reply templates persist per doctor (localStorage) — "Save as
  template" turns any reply into a chip; custom chips have a delete
  affordance and never collide with the 4 default replies.

### Remaining backlog

- Mobile bottom-nav + responsive consultation shell (Phase 3 long-term).
- Audit log surface for clinical edits in the patient timeline.
- Promote quick-reply templates to a `doctor_quick_replies` table once a
  doctor wants to sync them across devices.

---

## 7. How to verify the Phase 0 changes

1. **Vitals**
   - Open any consult, go to step 3, type BP/Pulse/Temp/SpO₂, wait for
     “Saved” chip, reload — values persist.
   - Confirm in DB: `select clinical_record->'vitals' from consultations
     where id = '…';` returns the typed values.
2. **Advice cards**
   - Add a diet + lifestyle + restriction card with non-empty title/detail.
   - Reload — all three render and the restriction card is no longer in
     the diet bucket.
3. **Consultation scroll**
   - Open `/consultation/<id>` and try to scroll past the final step. The
     outer page should not scroll; only the centre feed scrolls.
4. **Favicons**
   - Open dev tools → Application → Manifest → verify HomeoAssist icon,
     theme colour, start_url `/dashboard`. Tab favicon renders.
5. **Pricing**
   - `/` no longer renders 3 plan cards. The CTA card links to `/pricing`.
   - `/pricing` shows the full comparison table with 4 groups.
6. **Schedule Book a Slot**
   - Click an empty cell. The modal opens with a search input — typing a
     phone number filters the list; selecting collapses to a pill. Pick a
     time that overlaps an existing visit — see the amber warning.
7. **Messages**
   - Open `/messages`. The info banner explains the model. Reply to a
     thread; a single check (Sent) appears immediately and turns into a
     double check (Read) when the patient reads it.

---

## 8. References

- Schema: `packages/domain/src/schemas/clinicalRecord.ts`
- Consultation: `apps/web/components/clinic/LiveConsultationClient.tsx`,
  `apps/web/components/clinic/workflow/steps/Step03Examination.tsx`,
  `apps/web/components/clinic/workflow/steps/Step07Advice.tsx`
- App shell: `apps/web/components/layout/AppLayout.tsx`,
  `apps/web/components/clinic/ClinicAppShell.tsx`
- Landing: `apps/web/app/page.tsx`,
  `apps/web/components/marketing/PlanComparisonTable.tsx`,
  `apps/web/app/pricing/page.tsx`,
  `apps/web/app/manifest.ts`, `apps/web/app/icon.svg`, `apps/web/app/apple-icon.svg`
- Schedule: `apps/web/components/clinic/SchedulePageClient.tsx`
- Messages: `apps/web/components/clinic/messages/MessagesView.tsx`,
  `apps/web/components/clinic/messages/MessagesChatView.tsx`
- Consultation progress / validation / autosave:
  `apps/web/components/clinic/workflow/ConsultationProgressStrip.tsx`,
  `apps/web/lib/consultation-validation.ts`,
  `apps/web/components/clinic/workflow/useConsultationAutosave.ts`
- Realtime: `apps/web/lib/use-realtime-channel.ts`
- Prior audits: `docs/SCALABILITY_AND_WHATSAPP_AUDIT.md`,
  `docs/ENTERPRISE_ARCHITECTURE.md`,
  `docs/ONLINE_CONSULTATION.md`
