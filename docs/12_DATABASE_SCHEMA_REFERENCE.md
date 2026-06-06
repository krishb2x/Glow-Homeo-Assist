# Database Schema Reference

For the definitive schema, read the sequential files in `supabase/migrations/`.

## Core Entities
1. **`clinics`**: Multi-tenant isolation boundary.
2. **`users` / `profiles`**: Staff and Doctors mapped to auth.users.
3. **`patients`**: Master patient demographics.
4. **`consultations`**: Clinical encounters connecting a doctor, a patient, and a datetime.
5. **`prescriptions`**: Formal treatment outputs containing JSON structured `items`.
6. **`whatsapp_connections`**: Clinic-level WABA configurations containing `channel_type` (`AUTOMATED` or `CLINICAL`).
7. **`notification_jobs`**: Async queue for dispatching emails, SMS, and automated WhatsApp messages.
