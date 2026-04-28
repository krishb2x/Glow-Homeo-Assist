# API modules (migration target)

Route handlers in `server.ts` and `homeosyncDoctorApi.ts` will move here as **thin controllers**; business logic in `../services/`.

Planned: `auth`, `patients`, `consultations`, `prescriptions`, `followups`, `messages` — see `docs/ARCHITECTURE_MIGRATION.md`.
