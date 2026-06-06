# Backend Architecture

The GlowHomeo backend is a modular Node.js Express application located in `apps/api/src`.

## Design Principles
- **Modularity:** Features are isolated into domain-specific directories within `src/modules/` (e.g., `carePlans`, `telemedicine`, `whatsapp`).
- **Thin Controllers, Fat Services:** Route definitions (`*Routes.ts`) handle validation (using Zod) and rate limiting, while business logic resides in service files.
- **Database Abstraction:** Direct Supabase client calls are made within services, leveraging RLS for security.
- **Background Jobs:** A worker pipeline (`apps/api/src/worker.ts`) processes queued events like scheduled messages, PDF generation, and async notifications.

## Key Modules
- **`whatsapp`:** Handles dual-number WABA connections, template syncing, and inbound webhook routing.
- **`encounters`:** Manages the 9-step clinical consultation flow and medical records.
- **`distribution`:** The engine for asynchronous delivery of prescriptions, PDFs, and care plans.
