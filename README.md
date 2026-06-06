# GlowHomeo

GlowHomeo is a modern, production-grade telemedicine and patient engagement platform built specifically for homeopathic clinics. It combines a powerful in-clinic CRM/EMR with an automated, WhatsApp-first patient engagement ecosystem.

## Architecture Highlights
- **WhatsApp-First Patient Engagement:** Zero mobile app required. Patients receive automated care plans and chat with their doctors natively via Meta's WhatsApp API.
- **Supabase Backend:** PostgreSQL with strictly enforced Row Level Security (RLS) ensuring bulletproof multi-tenancy.
- **Next.js & Node.js:** A Turborepo monorepo containing a high-speed React web portal and an Express.js robust API.

## Documentation
The single source of truth for the system is located at:
**[docs/MASTER_SYSTEM_REFERENCE.md](docs/MASTER_SYSTEM_REFERENCE.md)**

For detailed architectural breakdowns, see the highly curated docs in the `/docs` directory.

## Local Setup
1. `npm install`
2. `npx supabase start`
3. `npm run dev`

## Deployment
GlowHomeo deploys seamlessly to Railway (API) and Vercel/Railway (Web) via standard GitHub Actions CI/CD pipelines. Ensure you run `npm run deploy:preflight` prior to manual releases.
