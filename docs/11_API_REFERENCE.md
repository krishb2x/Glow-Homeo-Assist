# API Reference

The GlowHomeo API (`apps/api`) is a RESTful Node.js/Express service.

## Core Endpoints

### Auth
- `POST /auth/login`
- `POST /auth/exchange-token`

### Consultations
- `GET /encounters/:id`
- `POST /encounters/:id/complete`

### WhatsApp Webhooks
- `GET /whatsapp/webhook` (Meta Verification)
- `POST /whatsapp/webhook` (Inbound Message Routing)

## Authentication
Internal routes use `requireDoctorAuth` or `requireSuperAdminAuth` middleware. JWTs are verified against Supabase.
