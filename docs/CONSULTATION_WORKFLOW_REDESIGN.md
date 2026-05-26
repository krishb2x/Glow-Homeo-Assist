# Consultation Workflow — Audit & Redesign

> **Goal:** the consultation surface should feel **fast, minimal, responsive, reliable, distraction‑free, doctor‑friendly, and operationally efficient** — comparable to modern premium EMR / telemedicine platforms (eClinicalWorks, Athena, Practo, DocsApp, Practo Ray, Suki, Nuance DAX, Abridge).
>
> This document captures the audit findings, the architectural target, and the concrete code changes already shipped.

---

## 1. Audit — what is broken today

### 1.1 Layout / scroll / responsiveness

| Symptom | Root cause |
| --- | --- |
| Clicking a step in the progress strip lands the wrong card under the sticky header. | `StepBlock` had `scroll-mt-4` (16 px) but the sticky strip is ~88 px tall. The scroll helper also targeted `[data-step-number]` on the inner `StepShell` instead of the outer block, so the *ring* and *extras* never aligned with the scroll point. |
| The page sometimes scrolls twice when you click a step. | `selectStep()` scrolls, and a separate `useEffect([activeStep])` scrolled again on the next render. |
| Active-step ring jumps a hair when extras render. | The active ring was on the wrapper, but the validation banner was a sibling at the bottom → caused vertical reflow. |
| Left sidebar disappears entirely below `lg`. | `hidden lg:flex` with no replacement → on tablets you lose the step rail. |
| Right rail icons remain even when nothing useful can be opened. | `ConsultationWorkspaceRail` always renders the schedule button, even before there is a patient. |
| Header is dense (back button, lifecycle pill, mic chip + 2 buttons) and competes with the patient bar below it. | Two stacked headers, each with their own padding. |

### 1.2 AI notetaker

| Symptom | Root cause |
| --- | --- |
| "Recording…" never starts; nothing happens. | `pickMimeType()` reported `ok: true` for `audio/webm` even if `MediaRecorder.isTypeSupported` was false. Now picks from `[webm/opus, webm, mp4, ogg]` and refuses if nothing is supported. |
| Connection drops silently mid-visit. | The hook never listened for `ws.close` / `ws.error` once the handshake completed. |
| Errors are buried in console / status toast and look like generic failures. | `setErr()` was set, but `Step05AI` never rendered the error. The doctor saw an idle button and assumed the feature was off. |
| Stopping a recording without "save audio" left the panel stuck on "reviewing". | `stopRecording()` always set `phase = "reviewing"`. Now it transitions straight to `idle` when nothing is being staged. |
| Permission denied / no-mic / handshake-timeout all produced the same error string. | Replaced with friendly, branch-specific copy ("Microphone permission denied. Allow access in your browser settings…"). |
| Drafted notes overwrote doctor edits when the WebSocket sent a new `noteDraft`. | Already correct in `LiveConsultationClient` — AI is staged into `aiDraft` (separate from doctor's `draft`) and merged only on **Insert into Case Notes**. Verified, no change required. |

### 1.3 Performance / autosave

| Symptom | Root cause |
| --- | --- |
| Typing in a textarea momentarily janks. | `stepExtras` was re-built on every keystroke because the memo's dependency list included non-memoized function expressions (`savePatient`, `finalizeConsultation`, `openPreview`, …). Switched to tracking *inputs* only, with a documented eslint-disable. |
| Autosave label flickers between *Syncing…* and *Synced*. | The label is computed from server save state. Acceptable for the 1.5 s debounce but we render `idle` while there is no pending change to suppress the flash. |
| Initial scroll to first step happens twice. | Same duplicate-scroll bug as §1.1. |

### 1.4 Information architecture

| Symptom | Note |
| --- | --- |
| Recording controls duplicated in 3 places (header, `Step05AI`, `AICopilotDrawer`). | Doctor never knows which one is "the" source of truth. Target: a single recording surface — the **persistent header chip** — and Step 5 / drawer become *views* of the same state. |
| Step 5 ("AI notetaker") sits *between* notes (4) and prescription (6) in the linear feed. | Doctors don't think of the AI as a step; it's an assistant. Long term: drop Step 5 from the linear flow and surface AI through the drawer + header chip only. The validator already treats it as optional. |
| Finalize step (9) duplicates content from §7 + §8. | The checklist is great. Keep the checklist + signature; remove the inline mini-forms. |

---

## 2. Target architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Top bar                                                                   │
│  ← Hub   [Active]    …      🎤 Record · 00:42   ⏸  ⏹                       │
├───────────────────────────────────────────────────────────────────────────┤
│ Patient bar                                                               │
│  👤 Riya Sharma · 32 · F · Follow-up · In-clinic   📞 +91…   ⚠ Penicillin │
├──────────────┬────────────────────────────────────┬───────────────────────┤
│ Left rail    │ Sticky progress strip (top:0)      │ Right rail (40 px)    │
│ (280 px,     │  ① ─ ② ─ ③ ─ ④ ─ ⑤ ─ ⑥ ─ ⑦ ─ ⑧ ─ ⑨  │   ✨ AI co-pilot       │
│ collapsible) │  [progress bar] · 4/9 · 44%        │   📅 Schedule         │
│              │  Missing: Chief complaint          │                       │
│ • memos      │────────────────────────────────────│  Optional drawer      │
│ • prior      │  Step card (active = ring)         │  (360 px)             │
│ • workflow   │  Step card                         │                       │
│   rail       │  Step card …                       │                       │
│              │────────────────────────────────────│                       │
│              │  Footer: ◀ Prev   ●●●○○○○○○  Next▶ │                       │
└──────────────┴────────────────────────────────────┴───────────────────────┘
```

### 2.1 Principles

1. **One source of truth per concept.** Recording state lives in `useConsultationLiveAudio`. Every UI affordance reads from it; no parallel `recording` flag elsewhere.
2. **Focused step, scannable feed.** Only the active step renders full form fields. Inactive steps collapse to compact summary rows (`ConsultationStepSummary`) so doctors see progress at a glance without scrolling through nine full cards.
3. **Inline validation, never blocking.** Missing fields are listed in the strip and inline under the active card. The doctor can always proceed; finalize is the only gate.
4. **Distraction-free typing.** Inputs use a `bg-hs-cream/40` paper with a calm `hs-primary/45` focus ring. No layout shift on focus/blur.
5. **Sticky operational chrome.** Top header, patient bar, progress strip, and footer are fixed outside the scroll container. Only the step feed scrolls.
6. **AI is an assistant, not a step.** Recording controls live in the persistent header chip; Step 5 is transcript + status + errors only (`hideRecordingControls`). Long-term: remove Step 5 from the linear feed entirely.
7. **Operate with the keyboard.** `Alt+←/→` to move between steps, `Alt+I` toggle AI drawer, `Alt+R` start/stop recording, `Ctrl/Cmd+Enter` finalize.

### 2.2 Component responsibilities

| Component | Single responsibility |
| --- | --- |
| `LiveConsultationClient` | Orchestrate state, persistence, hub navigation. **No layout decisions.** |
| `ConsultationWorkspaceShell` | 3-column grid (left rail · fixed progress + scrollable feed · right rail/drawer). |
| `ConsultationProgressStrip` | Fixed progress + autosave status + advisory missing list (outside scroll pane). |
| `ConsultationContinuousFeed` | Renders 9 steps; active step = full card, inactive = `ConsultationStepSummary`. |
| `ConsultationStepSummary` | Compact collapsed row for inactive steps — click to focus. |
| `StepShell` | Numbered card chrome: badge, icon, title, description, status pill, actions. |
| `Step01..Step09` | Pure form rendering. Receive `value` + `onChange`. No persistence, no API. |
| `useConsultationLiveAudio` | Mic + WebSocket lifecycle. Emits `phase`, `err`, `clearError`. |
| `useConsultationAutosave` | Debounced local + server save. |
| `useConsultationKeyboardNav` | `Alt+←/→`. |
| `useConsultationWorkspaceShortcuts` | `Alt+I`, `Alt+R`, `Ctrl/Cmd+Enter`. |

### 2.3 AI notetaker state machine

```
                    permission denied / no mic / unsupported MIME
              ┌──────────────────────────────────────────────────┐
              ▼                                                  │
[idle] ──Start──► [connecting] ──ready──► [recording] ─pause─► [paused]
   ▲                  │ timeout/err            │  ▲                │
   │                  ▼                        │  └──── resume ────┘
   │              [error]                      │
   │                  │                        │
   └────────── clearError ──────────┐          ▼
                                     └──► [reviewing*] ──keep/discard──► [idle]
                                                     (* skipped when saveAudio=false)

[idle] ──existing draft──► [ready]  (status display only)
```

The hook exports: `{ phase, err, clearError, busy, elapsedSeconds, lastMock, hasStagingAudio, saveAudioForReview, startRecording, pauseRecording, resumeRecording, stopRecording, discardStagingAudio, keepStagingAudio }`.

`Step05AI` (and any future "AI status" surface) renders:

- An **error banner** with **Retry** (re-runs `startRecording`) and a dismiss `×` (calls `clearError`) when `err` is set.
- A **mock-mode banner** when `lastMock` is true (the deterministic local pipeline is in use).
- A **status pill** that reads `Recording · 00:42`, `Paused · 00:42`, `Processing…`, `Draft ready · review below`, or `Ready to record`.
- The transcript textarea (editable mid-recording).
- A control row whose buttons match the phase (Start → Pause + Stop → Resume + Stop).

---

## 3. What changed in this pass (shipped)

### 3.1 Scroll behaviour
- `StepBlock` now carries `scroll-mt-24 lg:scroll-mt-28` so each step lands *below* the sticky strip.
- `scrollFeedToWorkflowStep` selects `[data-workflow-step="…"]` (the outer block), not `[data-step-number]` (the inner badge).
- Removed the duplicate `useEffect([activeStep])` that called `scrollFeedToWorkflowStep` again after `selectStep` already did.

### 3.2 AI notetaker reliability
- `pickMimeType()` now tries `webm/opus → webm → mp4 → ogg/opus` and returns `ok: false` only if **nothing** is supported. The hook surfaces a friendly error rather than starting a broken recorder.
- `startRecording()` cleans up any prior stream/socket before opening a new one (no leaked sessions on hot reload or quick re-record).
- `WebSocket` `close` and `error` events now surface as user-visible errors instead of silently leaving the UI in "recording".
- `MediaRecorder.onerror` is hooked.
- Friendly error branches for `NotAllowedError` (permission denied), `NotFoundError` (no mic), and handshake timeout.
- `stopRecording()` returns straight to `idle` when `saveAudioForReview` is false — the "reviewing" screen is only shown when there is actually a recording to keep or discard.
- New `clearError()` callback lets the UI dismiss the banner.
- `Step05AI` now has `error` + `onDismissError` props and renders a dismissible error banner with a **Retry** button.

### 3.3 Performance
- The `stepExtras` memo's dependency array no longer references re-created function expressions (`savePatient`, `finalizeConsultation`, `openPreview`, `generateAiNotes`, `insertAiIntoNotes`, `savePriorOutcome`). It tracks the underlying *inputs* with a documented eslint-disable.
- Removed the duplicate `ctx` and `openPreview` entries in the deps list.

### 3.4 Copy polish
- AI status pill defaults to `Ready to record` instead of the confusing `Idle`.
- Draft-ready status shows `Draft ready · review below`.

All changes are additive — no API surface removed, no migrations needed.

---

## 4. Second pass — focused workflow (shipped)

### 4.1 Layout / scroll containment
- `ConsultationWorkspaceShell` now renders the progress strip **outside** the scroll container. Only the step feed scrolls; the strip no longer fights `position: sticky` inside an overflow parent.
- Removed oversized `scroll-mt-24/lg:scroll-mt-28` offsets — progress chrome is no longer overlapping the feed.

### 4.2 Focused step mode (performance + UX)
- New `ConsultationStepSummary` — inactive steps render as ~48 px summary rows with completion state, missing-field hints, and one-click focus.
- `ConsultationContinuousFeed` mounts **one full step at a time**. Inactive steps unmount heavy form trees → fewer re-renders on keystroke, faster initial paint, less cognitive load.
- Summary rows and active blocks both carry `data-workflow-step` so `scrollFeedToWorkflowStep` still works.

### 4.3 Autosave hardening
- `useConsultationAutosave` serializes server PATCH requests (one in-flight at a time; queues a follow-up if edits arrive mid-save).
- `"Syncing…"` only appears **after** the 1.5 s debounce, not on every keystroke.
- Failed saves surface `"error"` state with copy in the progress strip instead of silently resetting to idle.
- Local draft cache debounced to 500 ms without a flickering `"saving"` state.

### 4.4 AI recording UX
- `Step05AI` accepts `hideRecordingControls` — in live consultation, mic start/pause/stop live in the header only; Step 5 is transcript + status + error/retry.

---

## 5. Recommended next iteration (not yet shipped)

Tracked here so the next pass has a focused checklist.

1. ~~**Hoist recording controls.**~~ Shipped — header is source of truth; Step 5 is view-only when `hideRecordingControls`.
2. **Collapse Step 5 by default.** Render Step 5 as a 56 px "AI notetaker" tile that expands on click; promote the drawer to the primary AI surface. Already validator-optional.
3. **Tablet rail.** Replace `hidden lg:flex` on `ConsultationLeftColumn` with a collapsible-on-tablet drawer triggered from the patient bar.
4. ~~**Autosave label.**~~ Shipped — saving state deferred until debounce; errors surfaced in strip.
5. **Stable identity for `liveAudio`.** The hook returns a fresh object every render; pulling it into the `stepExtras` deps still re-builds extras on phase/elapsed changes. Memoize the controls and surface elapsed time as a derived computed at the consumer.
6. **Skeleton parity.** The loading state currently shows two skeleton cards; the post-load shell jumps. Match the loading skeleton to the real shell (header + patient bar + 2 step cards) to remove the jump.
7. **Right rail drawer focus trap.** Add `aria-modal` semantics and a focus trap inside `ConsultationWorkspaceDrawer` so screen-reader users don't tab back into the feed while a drawer is open.
8. **Step-level autosave indicators.** Each step badge gets a tiny dot (saved / saving / unsaved) so the doctor can quickly verify before finalize.
9. **Telemetry.** Emit `ai_recording_started`, `ai_recording_stopped { durationSec, transcriptChars }`, `ai_draft_inserted`, `step_changed { from, to, ms_since_load }` so we can measure operational efficiency in production.
10. **Split `LiveConsultationClient`.** Extract step state handlers into focused hooks/context to shrink re-render blast radius on keystroke.

---

## 7. Third pass — high-volume clinic operations (shipped)

### 7.1 Repeat patient / duplicate visit guard
- Hub `quickStart` resumes existing open visit instead of silently creating duplicates.
- `PatientVisitCard` shows **Resume visit** when patient has an open consult; **Start new visit instead** is explicit opt-in.
- Auto-start from `?patientId=` redirects to existing open visit when found.

### 7.2 In-consult operational visibility
- `ConsultationVisitSwitcher` in workspace header — dropdown of other in-progress visits (refreshed every 60 s + on tab focus).
- Hub operational queue also polls every 60 s during long clinic days.

### 7.3 Patient context bar (wrong-patient prevention)
- `ConsultationPatientBar` shows **Open {duration}**, **Today: {chief complaint}**, alongside allergies and visit type.

### 7.4 Performance under long visits
- Recording elapsed time moved to ref + `RecordingElapsedDisplay` — **no full-tree re-render every second** during 45+ minute sessions.
- Step navigation scroll deferred with double `requestAnimationFrame` after focused step expansion.

### 7.5 Autosave under poor network
- Exponential backoff retry (up to 4 attempts) with `"Sync delayed — retrying…"` copy.
- Transcript cached in local draft store alongside note fields.
- `finalizeConsultation` sets `suppressAutosave` immediately to prevent post-lock PATCH races.

### 7.6 Operational queue helpers
- `findOpenVisitForPatient`, `activeVisitByPatientId`, `otherActiveVisits` in `operational-queue.ts`.

---

## 8. Remaining gaps (enterprise parity)

1. **Server-side duplicate visit guard** on `POST /doctor/consultations`.
2. **AI WSS note_draft dual-writer** — flush transcript only or separate `ai_note_draft` column.
3. **Supabase realtime** on consultations table (appointments/messages already have it).
4. **Prescription autosave** — Rx still finalize-only.
5. **Split `LiveConsultationClient`** — keystroke re-render blast radius.
6. **Tablet left rail** drawer.
7. **Multi-tab same consult** conflict detection for recording.

---

## 10. Fourth pass — focused clinical workspace (shipped)

### Problem
Incremental fixes kept adding layers (progress strip + patient bar + left memos + continuous scroll + summaries + rails + drawers). The result felt like a crowded admin dashboard, not a clinical workspace.

### New architecture (industry pattern: Athena / Modernizing Medicine / Abridge)

| Layer | Before | After |
|-------|--------|-------|
| **Route** | Same page, everything embedded | Dedicated **session mode** (`/consultation/[id]`) — distraction-free, full viewport |
| **Navigation** | 9-step scroll + progress strip + sidebar | **8 primary steps** in left rail; **one step per screen** |
| **AI** | Step 5 in linear flow | **Ambient assistant** — header Record + side drawer (Alt+I) |
| **Context** | Memos + prior visits inline in left column | **Progressive disclosure** — Context panel (drawer) on demand |
| **Center** | All steps visible / scroll | **`ConsultationStepPanel`** — single active step only |
| **Chrome** | Header + patient bar + strip + footer + rail | **One header** (patient + autosave + record + 2 drawer toggles) + footer |

### New components
- `ConsultationClinicalShell` — focused workspace layout
- `ConsultationStepPanel` — renders one step
- `ConsultationContextPanel` — memos / prior visits / video (drawer)
- `PRIMARY_WORKFLOW_STEPS` — chart steps without AI in linear nav
- `StepLayoutContext` + bare `StepShell` — flat forms without nested cards
- `consultation-step-url` — `?step=notes` deep links and browser history

### URL step routing
Each step is bookmarkable: `/consultation/{id}?step=prescription`. Browser back/forward syncs with the left rail. Operational queue links can target a specific step directly.

### Removed from active path
- Continuous scroll feed as default UX
- Duplicate progress strip
- Separate patient bar row
- Right icon rail (merged into header)
- AI as numbered workflow step

Legacy components (`ConsultationContinuousFeed`, `ConsultationWorkspaceShell`) remain in codebase for reference but are no longer wired in `LiveConsultationClient`.

---

## 11. QA — focused workspace

- Start a new consultation → progress strip stays fixed; only the feed scrolls.
- Click each step from the strip or a collapsed summary row → exactly one smooth scroll; active step expands, others collapse.
- Inactive steps show completion/missing hints without rendering full forms.
- Press `Alt+→` / `Alt+←` while not focused in an input → step changes with the same scroll behaviour.
- Type rapidly in the Notes step → no layout shift; autosave label shows `Syncing… → Synced` once per debounce window (not on every key).
- Disconnect network while editing → progress strip shows sync error; local draft still saved.
- Step 5 AI → no duplicate Start/Pause/Stop buttons; header mic is the only control surface.
- Click **Record** with mic permission already granted → status pill reads `Recording · 00:01` within 1 s; transcript appears within the first server tick (~4 s).
- Click **Record** with permission denied → red banner with explicit copy; **Retry** re-prompts.
- Disconnect the network mid-recording → banner appears within ~5 s ("Live transcription disconnected. Tap Stop & Draft, then Start to retry.").
- Stop recording with `saveAudioForReview = false` → returns to `idle` immediately, transcript stays editable.
- Finalize the consultation → autosave pauses, drawer opens with **Schedule follow-up**.
- Patient with open visit → hub shows **Resume visit**; starting from search resumes instead of duplicating.
- Switch patients mid-clinic via header **N in progress** dropdown.
- 45+ min recording session → React tree does not re-render every second (timer isolated to badge).
- Network drop while typing → autosave retries with backoff; local draft + transcript preserved.
- Poor network after 4 failed syncs → strip shows persistent error; edits still in localStorage.
- Open live consult → **one step** visible; no nine-card scroll.
- Left rail shows **8 steps** (no AI step number); AI via sparkle drawer only.
- Context drawer → memos + prior visits without cluttering main flow.
- Session mode → no dashboard sidebar; full-height clinical workspace.
