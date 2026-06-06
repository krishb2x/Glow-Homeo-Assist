# Operations Guide

## Telemetry & Logging
- **Application Logs:** Structured JSON logs are printed to stdout via Winston/Pino and collected by Railway.
- **Database Logs:** Slow queries are tracked in the Supabase Dashboard under Database -> Query Performance.

## Disaster Recovery
- **Database Backups:** Supabase handles automated daily Point-in-Time Recovery (PITR).
- **Blob Storage:** PDFs and media files in Supabase Storage are redundant across regions.

## Routine Maintenance
- **Dead Letter Queue:** Check the `notification_jobs` table for jobs with `status = 'failed'` and a high `retry_count`.
- **WABA Token Refresh:** Ensure Meta Cloud API tokens are refreshed every 60 days via the Super Admin portal if a system user token wasn't used.
