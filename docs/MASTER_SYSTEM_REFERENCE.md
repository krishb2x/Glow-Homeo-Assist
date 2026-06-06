# GlowHomeo Master System Reference

**Version:** 3.0 (Production WhatsApp-First Architecture)
**Date:** June 5, 2026

## Introduction
This document serves as the single source of truth for the entire GlowHomeo system. A developer reading this document will understand the core product, the technical architecture, the data flow, and the deployment strategy.

## 1. Product Overview
GlowHomeo is a specialized clinical CRM, EMR, and patient engagement platform for homeopathic clinics.
Unlike traditional platforms that force patients to download mobile apps, GlowHomeo is a **WhatsApp-first ecosystem**. The clinic staff operates a high-speed Next.js web portal, while patients interact exclusively via automated and clinical WhatsApp numbers.

## 2. Architecture
- **Monorepo:** Managed via Turborepo (`apps/api`, `apps/web`, `packages/*`).
- **Frontend:** Next.js, React, Tailwind, SWR.
- **Backend:** Node.js, Express, Zod.
- **Database:** PostgreSQL (Supabase) with rigorous Row Level Security (RLS) for multi-tenancy.
- **Third-Party:** Meta Cloud API (WhatsApp), Daily.co (Video), Resend (Email).

## 3. Core Workflows
1. **Consultation Flow:** The 9-step clinical pipeline managed by the doctor inside the web workspace. It yields a structured prescription.
2. **Automated WhatsApp Engagement:** The Care Plan engine schedules background jobs that fire off Meta Templates (reminders, check-ins, LMS videos) to the `AUTOMATED` WABA number.
3. **Clinical Messaging:** Free-form patient replies are ingested via Webhook, saved to the `messages` table, pushed to the Doctor's React UI via WebSockets, and replied to natively through the `CLINICAL` WABA number.

## 4. Documentation Index
The repository docs have been strictly curated. Refer to the numbered documents in `/docs` for deep dives into specific domains:
- `01_PRODUCT_OVERVIEW.md` through `18_PRODUCT_ROADMAP.md`

## 5. Deployment
The system relies on Railway for compute (API/Web) and Supabase for state. Zero downtime deployments are achieved via Vercel/Railway CI/CD pipelines linked to the `main` branch. 

## Conclusion
The GlowHomeo architecture is designed for low-friction patient engagement and high-velocity clinical operations. By leveraging WhatsApp as the edge client and Supabase as the state engine, we bypass app store dependencies and maximize clinical compliance.
