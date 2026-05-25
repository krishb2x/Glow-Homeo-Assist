# Desktop UI audit & spacing cleanup

**Scope:** Authenticated clinic app (`apps/web`) on desktop, laptop, and large displays (≥1024px).  
**Goal:** Calm, premium healthcare SaaS — low cognitive load, consistent rhythm, fewer competing actions.

**Status:** Phases A–C implemented. Remaining items are optional polish (command palette-only new patient, hide visit-flow when consult active).

---

## 1. Executive summary

| Area | Before | After (Phase A) |
|------|--------|-----------------|
| Spacing system | Tokens existed but components mixed `p-5`/`p-6`, `rounded-2xl`, `shadow-card` | `--ds-section-gap`, `.ds-page`, `.ds-card`, `.ds-card-pad` in `globals.css`; `lib/desktop-ui.ts` export strings |
| Dashboard | Duplicate metrics (hero + 4 pills), large workflow cards, many buttons per row | Single hero metrics; compact visit-flow line; text links for secondary actions |
| Consultation | Heavy step cards, `space-y-6` feed | `rounded-xl` + `shadow-ds-sm`, tighter header/body padding, `space-y-5` feed |
| Typography | Mixed `text-heading-sm` section titles | Section titles → `text-body-md`; page titles via `PageHeader` (`text-xl` / `lg:text-2xl`) |
| Motion | Cards lifted 2px on hover | Border/shadow only (no translate) |

---

## 2. Spacing system (implementation-ready)

### 2.1 Tokens (`apps/web/styles/theme.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--ds-space-*` | 8px grid | Tailwind `p-ds-md`, `gap-ds-lg`, etc. |
| `--ds-content-max` | 72rem | Page max width |
| `--ds-section-gap` | 1.25rem (20px) | Vertical gap between major sections |
| `--ds-card-pad` | 1.25rem | Default card padding |
| `--ds-card-pad-lg` | 1.5rem | Large breakpoints |

### 2.2 Utility classes (`apps/web/app/globals.css`)

- `.ds-page` — centered content, max width
- `.ds-page-sections` — `flex flex-col` with section gap
- `.ds-card` / `.ds-card-pad` — standard surface
- `.ds-app-card` / `.ds-app-card-interactive` — calmer borders (`border-hs-border/35`), no hover lift

### 2.3 TypeScript helpers (`apps/web/lib/desktop-ui.ts`)

Use with `cn()` for consistent class strings: `DS_CARD`, `DS_CARD_PAD`, `DS_SECTION_GAP`, `DS_BTN_PRIMARY`, `DS_LINK_ACTION`, etc.

### 2.4 Rules for new UI

1. **One primary action per panel** — secondary actions as text links or overflow menu.
2. **Section gap** — prefer `ds-page-sections` or `space-y-5` (20px), not ad-hoc `mb-6`/`mb-8` mixes.
3. **Card padding** — `ds-card-pad` (16–20px), not `p-6` unless marketing/hero.
4. **Border radius** — `rounded-xl` for cards; reserve `rounded-2xl` for hero/marketing only.
5. **Shadow** — `shadow-ds-sm` default; avoid `shadow-card` on dense clinical lists.

---

## 3. Dashboard simplification

### 3.1 Problems identified

- Hero metrics duplicated by four `TodayPill` cards
- `ClinicalWorkflowOverview` used three large gradient cards (visual noise)
- “Start a visit” block had two bordered buttons + search
- Recent patients: two button-style links per row
- Right rail + memo widget both used heavy `shadow-card` / `rounded-2xl`

### 3.2 Changes shipped

| Component | Change |
|-----------|--------|
| `HomeOverview.tsx` | Removed `TodayPill` grid; extended hero metrics (drafts when >0); schedule as text link; single hero CTA |
| `ClinicalWorkflowOverview.tsx` | Single-line “Visit flow” orientation |
| Find patient | Title + inline Walk-in / Add patient links |
| Recent patients | Divider list; Chart + Visit as text actions |
| `DashboardMemoWidget.tsx` | `ds-card`; inline stat row; friendlier “Today’s notes” copy |
| `DashboardRightRail` | `ds-card` styling |

### 3.3 Phase B (shipped)

- [x] Collapse “My day” rail → **Follow-ups** list + collapsible **Recent activity** (`<details>`)
- [ ] Command palette as sole entry for “New patient” on dashboard
- [ ] Optional: hide visit-flow strip when user has active consultation

---

## 4. Consultation workflow

### 4.1 Problems identified

- Step shells felt bulky (`rounded-2xl`, `shadow-card`, large header padding)
- Feed spacing (`space-y-6`) increased scroll distance
- Progress strip dense but acceptable; step labels only on `lg+` (keep)

### 4.2 Changes shipped

| File | Change |
|------|--------|
| `StepShell.tsx` | `rounded-xl`, `shadow-ds-sm`, reduced header/body padding |
| `ConsultationContinuousFeed.tsx` | `space-y-5`, `pb-6` |
| `ConsultationWorkspaceShell.tsx` | `py-5` center column |
| `ConsultationProgressStrip.tsx` | Slightly tighter vertical padding |

### 4.3 Phase C (shipped)

- [x] `Step03Examination` — two-column desktop grid (vitals 2×2 | general observations)
- [x] Inline validation — `StepInlineValidation` under active step in feed
- [x] Left column — icons-only by default (`sidebarCollapsed` default + localStorage); column `4.5rem` / `280px`
- [x] Overflow — `min-h-0` on left column, scrollable past-visits region
- [x] `ConsultationProgressStrip` wrapped in `React.memo`

---

## 5. Typography & visual hierarchy

### 5.1 Scale (desktop app)

| Role | Class | Notes |
|------|-------|-------|
| Page title | `PageHeader` → `text-xl lg:text-2xl` | Bottom border separator |
| Section title | `text-body-md font-semibold` | Was often `text-heading-sm` |
| Body | `text-body-sm` | Forms, lists |
| Meta | `text-caption-sm` | Hints, timestamps |
| Hero (dashboard only) | `text-2xl` / `sm:text-[2rem]` | Unchanged |

### 5.2 Button hierarchy

1. **Primary** — one per viewport region (`bg-hs-primary`, min-h-9)
2. **Secondary** — outline, rare
3. **Tertiary** — `DS_LINK_ACTION` text links (preferred for Chart, Schedule, Walk-in)

### 5.3 Copy (healthcare-friendly)

Prefer: *visit, patient, schedule, chart, notes*  
Avoid: *workspace, entity, pipeline, operational memory* (memo widget renamed to “Today’s notes”)

### 5.4 Backlog

- [ ] Audit `apps/web/app/(app)/**` pages for `PageHeader` adoption
- [ ] Tables: shared `.ds-table-shell` + consistent row height (`py-2.5`)
- [ ] Modals: max-width `32rem`, `p-5`, single footer primary

---

## 6. Layout shell

| File | Change |
|------|--------|
| `AppLayout.tsx` | Main area `bg-hs-cream/30`, padding `px-5 py-6` / `lg:px-8 lg:py-7` |
| `PageHeader.tsx` | `mb-6`, subtitle `text-body-sm`, title scale |

`ClinicAppShell` route-specific `mainMaxClass` unchanged — consultation still full-bleed where needed.

---

## 7. Performance-aware UI

| Recommendation | Rationale |
|----------------|-----------|
| Keep virtualized lists (`VirtualizedList`) on patients/messages | 200+ rows |
| Avoid new hover animations on list rows | Layout thrashing |
| Memo widget: summary endpoint only (already) | No full list on dashboard |
| Consultation autosave debounced (existing) | Reduce re-renders |
| Lazy-load heavy drawers (AI, schedule) | Already pattern in workspace shell |

**Phase C:** Profile consult page with React DevTools; memoize `ConsultationProgressStrip` step buttons if parent re-renders often.

---

## 8. Route-by-route backlog

| Route | Priority | Actions |
|-------|----------|---------|
| `/` (dashboard) | Done | — |
| `/consultation` | Done (C) | Collapsed rail, inline validation, overflow |
| `/patients` | Done (B) | Text row actions, denser table |
| `/appointments` | Done (B) | `PageHeader`, `ds-card`, text visit links |
| `/messages` | Done (B) | `ds-card` shell, calmer inbox chrome |
| `/settings` | Done (B) | `ds-card` accordion sections |
| `/patients/[id]/timeline` | Done (C) | `PageHeader`, `ds-card` sidebar, memo panel |

---

## 9. Alignment checklist (for PR review)

- [ ] All sections in a column use the same gap (`ds-page-sections` or `space-y-5`)
- [ ] No duplicate metrics on same page
- [ ] At most one `bg-hs-primary` button per card
- [ ] Cards use `ds-card` not `rounded-2xl shadow-card`
- [ ] Icons in section headers are `h-4 w-4`
- [ ] Page has `PageHeader` or intentional full-bleed layout
- [ ] Long lists use virtualization or pagination

---

## 10. Files touched

**Phase A:** `theme.css`, `globals.css`, `desktop-ui.ts`, `PageHeader.tsx`, `AppLayout.tsx`, `HomeOverview.tsx`, `ClinicalWorkflowOverview.tsx`, `StepShell.tsx`, `ConsultationContinuousFeed.tsx`, `ConsultationWorkspaceShell.tsx`, `ConsultationProgressStrip.tsx`, `DashboardMemoWidget.tsx`

**Phase B:** `ds-classes.ts`, `SchedulePageClient.tsx`, `ScheduleWeekGrid.tsx`, `MessagesChatView.tsx`, `patients/page.tsx`, `Step03Examination.tsx`, `settings/page.tsx`, `HomeOverview.tsx` (right rail)

**Phase C:** `StepInlineValidation.tsx`, `ConsultationContinuousFeed.tsx`, `ConsultationLeftColumn.tsx`, `ClinicalWorkflowSidebar.tsx`, `LiveConsultationClient.tsx`, `ConsultationProgressStrip.tsx`, `DoctorMemoPanel.tsx`, `patients/[id]/timeline/page.tsx`

---

## 11. Related docs

- `docs/UX_AUDIT_AND_REDESIGN.md` — product UX phases (navigation, inbox, autosave)
- `docs/Clinical-Workflow-Overview.md` — nine-step clinical model
