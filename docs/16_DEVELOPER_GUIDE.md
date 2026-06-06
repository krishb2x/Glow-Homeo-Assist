# Developer Guide

## Local Setup
1. **Node.js:** Ensure Node.js v20+ is installed.
2. **Supabase:** Run `npx supabase start` to boot the local PostgreSQL and GoTrue stack.
3. **Install Dependencies:** `npm install`
4. **Boot App:** `npm run dev` starts the Turbo repo (Next.js frontend + Node.js API).

## Working with Turborepo
- The codebase uses `turborepo` for orchestrating mono-repo tasks. 
- Shared logic lives in `packages/domain` (types and core logic) and `packages/ui` (React components).

## Adding a Feature
1. Define the DB schema in a new migration in `supabase/migrations/`.
2. Generate TypeScript types: `npm run generate:types`.
3. Build the backend service in `apps/api/src/modules/`.
4. Expose the route and update API typings.
5. Build the UI in `apps/web`.
