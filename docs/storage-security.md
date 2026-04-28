# Storage Security Model

## Buckets

- Use a private S3 bucket configured via `AWS_S3_PRIVATE_BUCKET`.
- Do not expose permanent public URLs.
- API issues short-lived pre-signed URLs for upload/download.

## File Persistence Rules

- Store only `object_key` values in database (`file_objects.object_key`, `consultations.audio_object_key`).
- Never store pre-signed URLs in DB.
- Enforce tenant object namespace:
  - `clinics/{clinicId}/audio/...`
  - `clinics/{clinicId}/document/...`

## Upload Flow

1. Authenticated user calls `POST /storage/presign-upload`.
2. API validates role and clinic scope, returns `{ uploadUrl, objectKey }`.
3. Client uploads directly to S3 using `uploadUrl`.
4. Client confirms with `POST /storage/complete-upload`.
5. API stores object key in Supabase table.

## Audio Deletion Policy

- `POST /doctor/consultations/:id/process-audio` updates transcript fields.
- When `deleteAudioAfterProcessing=true`, API deletes S3 object and nulls `audio_object_key`.
- API writes `audio_deleted_at` timestamp for traceability.
