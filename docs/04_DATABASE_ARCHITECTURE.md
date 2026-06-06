# Database Architecture

GlowHomeo uses PostgreSQL hosted on Supabase.

## Multi-Tenancy via RLS
Every core table contains a `clinic_id` column. Row Level Security (RLS) policies mandate that a user can only access rows where `clinic_id` matches their authenticated session profile.

## Key Schemas
- **Identity & Access:** `users`, `clinics`, `profiles`, `roles`.
- **Clinical Data:** `patients`, `consultations`, `prescriptions`, `follow_ups`, `medication_items`.
- **Engagement:** `whatsapp_connections`, `whatsapp_sessions`, `conversations`, `messages`, `notification_jobs`.
- **Content:** `clinic_content_items`, `patient_content_assignments`.

## Migrations
Schema evolution is strictly managed via sequential SQL files in `supabase/migrations/`. These files are tracked in version control and applied via the Supabase CLI.
