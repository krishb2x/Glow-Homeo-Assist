# Operational Workflow — Dashboard & Consultation Management

> **Goal:** remain manageable at **200+ active patients**, dozens of in-progress visits, and high daily follow-up volume — comparable to premium clinic EMR / telemedicine ops consoles (Athena, eClinicalWorks, Practo Ray).

---

## Problems identified

| Area | Issue |
|------|--------|
| Visits in progress | Flat list of every open consultation — same patient appeared multiple times when old sessions were never closed |
| Follow-ups | Flat slice of 5 items, no overdue/today grouping, duplicate patients |
| Patient search | Dashboard filtered only 8 locally loaded patients — useless at scale |
| Consultation hub | Loaded entire roster (500 patients) as scrollable cards |
| Today's notes | Showed only `topUrgent` (6 items); due-today normal reminders could be hidden; weak empty/error states |

---

## Operational model

### Priority lanes (doctor mental model)

1. **Needs attention now** — overdue follow-ups, stale open visits (>24h), draft notes not finalized, pending outcomes
2. **In progress** — one row per patient (newest open visit), filterable by mode
3. **Due today** — follow-ups and reminders due before midnight
4. **Scheduled** — today's appointment timeline (unchanged)
5. **Search / resume** — server-side patient lookup, resume links to exact consultation id

### Deduplication rules

- **Active visits:** one row per `patientId`; backend and `dedupeActiveVisits()` both enforce this
- **Follow-ups:** one row per `patientId`; prefer overdue > due today > upcoming
- **Reminders:** grouped in UI as Overdue → Due today → Pinned → Notes

---

## What shipped

### Backend (`apps/api`)

- **`myDayService.ts`** — active consultations deduped by patient (newest `started_at` wins), capped query at 80 rows before dedupe

- **`memoService.ts`** — `actionQueue` (up to 12 priority-sorted open memos) returned alongside `topUrgent`

### Frontend utilities

- **`apps/web/lib/operational-queue.ts`** — `dedupeActiveVisits`, `groupFollowUps`, `buildOperationalSummary`, `formatVisitAge`

### Dashboard components

- **`OperationalQueuePanel`** — collapsible active visit queue with filters (All / In-clinic / Online / Stale), preview limit, draft-note and pending-outcome banner
- **`DashboardRightRail`** — follow-up queue grouped by Overdue / Due today
- **`DashboardMemoWidget`** — renamed to **Reminders**; grouped collapsible sections; migration hint on error; uses `actionQueue`

### Pages

- **`HomeOverview`** — uses new panels; debounced `searchPatientsLight` (server search, min 2 chars)
- **`consultation/page.tsx`** — operational queue at top; search-first for rosters >30 patients; loads 50 recent instead of 500

---

## UX patterns (healthcare SaaS)

- **Preview + expand** — show 4 active visits, not 15
- **Filter chips** — reduce noise without hiding data
- **Stale badge** — visits open >24h surfaced for cleanup
- **Search-first at scale** — no infinite scroll of 200 cards
- **One patient, one row** — in every queue

---

## QA checklist

- [ ] Patient with 3 open consultations → dashboard shows **1 row**, "+2 older" hint
- [ ] 200+ patients → consultation hub shows search prompt, not full list
- [ ] Dashboard search finds patient not in recent-8 slice
- [ ] Overdue follow-up appears in red lane before upcoming items
- [ ] Reminder due today (non-urgent) appears under **Due today** group
- [ ] Draft note consultation linked from **Needs attention** banner

---

## Next iteration

- Dedicated `/operations` page with full queue tables and bulk actions
- Auto-close stale visits after configurable idle period (with doctor confirm)
- Waiting-room / check-in state for in-clinic flow
- Push notification fan-out for overdue reminders
