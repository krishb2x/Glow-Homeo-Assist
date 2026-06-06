# Security Guide

## Row Level Security (RLS)
The database is the ultimate source of truth for security. 
- Every SQL query run by the frontend or authenticated API endpoints must execute within the context of the user's JWT.
- RLS policies ensure `clinic_id` always matches the user's profile.

## Secrets Management
- Keys such as `TWILIO_AUTH_TOKEN`, `RESEND_API_KEY`, and WhatsApp access tokens are never exposed to the frontend.
- WhatsApp tokens are encrypted using `credentialVault.ts` before being persisted to the `whatsapp_connections` table.

## Content Security Policy (CSP)
Strict CSP headers are enforced in `apps/web/next.config.js`.
