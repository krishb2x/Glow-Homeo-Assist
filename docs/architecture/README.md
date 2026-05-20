# GlowHomeo Assist — Architecture docs

Read in this order:

1. **`01_ARCHITECTURE.md`** — product framing, system diagram,
   bounded contexts, 3-column consult workspace contract, data flows,
   security, deployment, and phase plan.
2. **`02_FOLDER_STRUCTURE.md`** — target monorepo layout with
   conventions for every directory; flags new (🆕) vs deprecated (🗑) folders.
3. **`03_SCHEMA.md`** — PostgreSQL/Supabase schema. Lists kept tables,
   adds new ones (`encounter_observations`, `audio_sessions`,
   `scribe_jobs`, `media_objects`, `notification_jobs`,
   `video_sessions`, `audit.events`), plus RLS, indexes, JSON
   contract for `clinical_record`, and the single additive migration.

### Status

| Doc                       | Status                              |
| ------------------------- | ----------------------------------- |
| `01_ARCHITECTURE.md`      | **Approved** — defaults accepted    |
| `02_FOLDER_STRUCTURE.md`  | **Approved** — step kit added       |
| `03_SCHEMA.md`            | **Approved** — migration generated  |

### Delivered in code (2026-05-20)

| Artifact | Path |
| -------- | ---- |
| v2 migration | `supabase/migrations/20260520000000_v2_consult_workspace.sql` |
| Zod clinical record + patch schemas | `packages/domain/src/schemas/clinicalRecord.ts` |
| 9 step components | `apps/web/components/clinic/workflow/steps/Step01…Step09*.tsx` |
| Continuous feed | `apps/web/components/clinic/workflow/ConsultationContinuousFeed.tsx` |
| 3-column workspace shell | `apps/web/components/clinic/workflow/ConsultationWorkspaceShell.tsx` |
| AI co-pilot drawer | `apps/web/components/clinic/scribe/AICopilotDrawer.tsx` |
| v2 API wiring (scribe, PDF, notifications) | `apps/api/src/modules/encounters/v2EncountersService.ts` |
| Encounters module (incremental) | `apps/api/src/modules/encounters/encounters.routes.ts` |
| Background jobs (audio purge) | `apps/api/src/jobs/backgroundJobs.ts` |

### Apply the v2 migration

```bash
supabase link --project-ref <your-ref>   # once per machine
supabase db push
```

Until this runs, v2 table writes are **non-fatal** (logged as warnings). Core consult flow still works on v1 tables.

### Next deliverables

| Priority | Item | Status |
| -------- | ---- | ------ |
| 1 | `supabase db push` on staging/prod | **Manual** — requires `supabase link` |
| 2 | Puppeteer PDF worker (replace HTML-only `media_objects`) | Pending |
| 3 | Notification worker (WhatsApp/email send) | Pending — jobs queued on finalize |
| 4 | Full route extraction → `encounters.routes.ts` | Incremental |
| 5 | Phase 3 WebRTC (`video_sessions`) | Pending |
