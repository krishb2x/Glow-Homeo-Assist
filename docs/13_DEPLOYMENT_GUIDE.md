# Deployment Guide

GlowHomeo is designed to run on Railway (Node.js/Next.js) and Supabase (PostgreSQL).

## Preflight Checks
Run `npm run deploy:preflight` before deploying. This script ensures all types pass and environment variables are properly mapped.

## Production Topology
- **Vercel / Railway (Web):** Deploys `apps/web` (Next.js).
- **Railway (API):** Deploys `apps/api` (Node.js). Must have `WORKER_MODE=true` set on a separate service if splitting API and Worker.
- **Supabase:** Hosted PostgreSQL. Apply migrations using `npx supabase db push`.

## CI/CD
Defined in `.github/workflows/ci.yml`, running Type checks, Linting, and Playwright E2E tests against every PR.
