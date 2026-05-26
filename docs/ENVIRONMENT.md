# Environment variables

Copy [`.env.example`](../.env.example) to `.env` at the **repository root**. The API (`apps/api`) and web (`apps/web`) both load this file.

Variables marked **Public** are exposed to the browser via `NEXT_PUBLIC_*`.

## Core (required)

| Variable | Scope | Description |
|----------|-------|-------------|
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server | Anon key (RLS-enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server **secret** | Service role — bypasses RLS; never expose to client |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Same project URL for browser Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key for browser |
| `NEXT_PUBLIC_API_URL` | Public | API origin for browser (e.g. `https://api.example.com`) |
| `API_URL` | Server | API origin for Next.js server routes / proxy |
| `NEXT_PUBLIC_SITE_URL` | Public | Web app origin (emails, redirects) |
| `APP_PUBLIC_URL` | Server | Allowed redirect base for invites |
| `PORT` | Server | API listen port (default `4000`) |

## Auth & CORS

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Optional JWT signing override |
| `CORS_ORIGIN` | Production: comma-separated allowed origins. Dev: omit for permissive LAN |

## Storage (optional)

| Variable | Description |
|----------|-------------|
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3 private bucket |
| `AWS_S3_PRIVATE_BUCKET` | Document storage |

## Notifications

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` | Email (Resend) |
| `TWILIO_*` | Legacy SMS/WhatsApp (if used) |
| `NOTIFICATION_MOCK_SEND` | Set `true` in **dev only** — logs instead of sending |

## WhatsApp Business (Meta)

| Variable | Description |
|----------|-------------|
| `META_APP_ID`, `META_APP_SECRET` | Meta app |
| `META_WEBHOOK_VERIFY_TOKEN` | Webhook subscription challenge |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Encrypt stored tokens at rest |
| `NEXT_PUBLIC_META_APP_ID` | Embedded signup (browser) |
| `WHATSAPP_SEND_INTERVAL_MS`, `WHATSAPP_BATCH_LIMIT` | Throttling |

## Workers & scale

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Shared rate limits + optional queue coordination |
| `WORKER_MODE` | `all` \| `notifications` \| `whatsapp` \| `none` |
| `WORKER_ID` | Unique id per replica |
| `RATE_*_PER_MIN` | Per-route rate limit overrides |

## Telemedicine (Daily.co)

| Variable | Description |
|----------|-------------|
| `DAILY_API_KEY` | Daily.co REST API key |
| `DAILY_DOMAIN` | Your Daily domain (e.g. `clinic.daily.co`) |
| `DAILY_WEBHOOK_SECRET` | Webhook verification |
| `DAILY_ROOM_PREFIX` | Room name prefix (optional) |
| `APP_PUBLIC_URL` | Patient join link base URL |

## PDF

| Variable | Description |
|----------|-------------|
| `PUPPETEER_EXECUTABLE_PATH` | Chrome/Chromium for prescription PDF |

## Bootstrap (one-time scripts)

| Variable | Description |
|----------|-------------|
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_FULL_NAME` | `npm run bootstrap:super-admin` in `apps/api` |

## Local development tips

- One `.env` at repo root — do not commit it.
- `apps/api/.env.example` points to the root file.
- Integration tests need real Supabase keys: `npm run test:api:integration`.
