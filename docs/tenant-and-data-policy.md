# Tenant Isolation and Data Policy

## Tenant Model

- Tenant boundary is `clinicId`.
- Every clinic-bound record must include `clinicId`.
- API requests resolve active `clinicId` from authenticated context.
- Database access is always filtered by `clinicId` for tenant-scoped entities.

## Isolation Rules

- No cross-clinic reads in doctor-facing workflows.
- Platform roles can access cross-clinic metadata only for operations.
- Access checks are performed both in route guards and service layer.
- Audit logs include actor, role, tenant scope, action, and timestamp.

## Audio and Note Retention

- Consultation audio is temporary and deleted post-transcription/note extraction.
- Persisted artifacts:
  - Transcript text (if enabled by clinic policy)
  - Structured note draft
  - Finalized note
  - Processing metadata (language, confidence, timestamps)
- Audio deletion is enforced by:
  - immediate delete after successful pipeline completion
  - fallback TTL cleanup worker

## Privacy and Security Baseline

- Passwords stored using one-way hash.
- Session tokens are short-lived and revocable.
- All write operations include actor audit metadata.
- Export and deletion requests are handled via support workflow in early stage.
