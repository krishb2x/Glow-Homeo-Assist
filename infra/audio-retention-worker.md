# Audio Retention Worker Template

## Purpose

Delete temporary consultation audio objects once processing is complete or TTL expires.

## Runtime Behavior

- Runs every 15 minutes.
- Finds objects under `consultation-audio-temp/` with either:
  - `processed=true` tag, or
  - `createdAt + ttlHours < now`.
- Deletes object and writes audit event.

## Suggested Environment Variables

- `AUDIO_BUCKET_NAME`
- `AUDIO_TTL_HOURS` (default: `24`)
- `WORKER_INTERVAL_MINUTES` (default: `15`)
- `AUDIT_WEBHOOK_URL` (optional)
