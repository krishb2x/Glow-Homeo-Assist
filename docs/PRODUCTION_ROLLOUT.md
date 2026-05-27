# Production rollout runbook — HomeoAssist



## Pre-flight checklist



1. Apply Supabase migrations through `20260530000000_production_hardening.sql`.

2. Copy `.env.example` → `.env` at **monorepo root** and fill all values.

3. **Save `.env`** — unsaved editor buffers are not read by Node.

4. Run deploy gate: `npm run deploy:preflight`

5. Start API locally and confirm: `GET /health/deep` → integrations green.



## Deploy gate (run before every release)



```bash

npm run deploy:preflight

```



Runs lint, tests, production builds, and `scripts/infra-validation.mjs`.



## Required environment (production)



| Group | Variables |

|-------|-----------|

| Core | `SUPABASE_*`, `JWT_SECRET` (32+ chars), `APP_PUBLIC_URL`, `CORS_ORIGIN`, `NODE_ENV=production` |

| Daily | `DAILY_API_KEY`, `DAILY_DOMAIN`, `DAILY_WEBHOOK_SECRET` |

| Meta/WhatsApp | `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_TOKEN_ENCRYPTION_KEY` |

| Platform WhatsApp | `PLATFORM_WHATSAPP_PHONE_NUMBER_ID`, `PLATFORM_WHATSAPP_ACCESS_TOKEN`, `PLATFORM_WHATSAPP_WABA_ID` |

| Email | `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` (glowhomeo.com), `NOTIFICATION_REPLY_TO_EMAIL`, `RESEND_WEBHOOK_SECRET` |

| Notifications | `NOTIFICATION_MOCK_SEND=false`, `TRUST_PROXY=1` |

| Optional | `AWS_S3_*` (set `REQUIRE_S3_IN_PROD=1` to enforce), `TWILIO_*`, `META_EMBEDDED_SIGNUP_CONFIG_ID` |



### Production `.env` toggles



```env

NODE_ENV=production

NOTIFICATION_MOCK_SEND=false

TRUST_PROXY=1

APP_PUBLIC_URL=https://app.glowhomeo.com

NEXT_PUBLIC_SITE_URL=https://app.glowhomeo.com

NEXT_PUBLIC_API_URL=https://api.glowhomeo.com

CORS_ORIGIN=https://app.glowhomeo.com

# REQUIRE_S3_IN_PROD=1          # enable when AWS_S3_* configured

# REQUIRE_PLATFORM_WHATSAPP_IN_PROD=1

```



## Webhooks (production URLs)



| Service | Endpoint |

|---------|----------|

| Daily.co | `https://<api-host>/webhooks/daily` |

| Meta WhatsApp | `https://<api-host>/webhooks/meta/whatsapp` |

| Resend | `https://<api-host>/webhooks/resend` |



## Vercel (frontend — `apps/web`)

**Dashboard settings**

| Setting | Value |
|---------|--------|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Include source files outside Root Directory | **Enabled** (monorepo) |

`apps/web/vercel.json` overrides install/build:

- **Install:** `cd ../.. && npm ci` (resolves workspace + hoisted deps like `zod`)
- **Build:** `npm run build`

**Do not** set Root Directory to repo root without changing build paths. **Do not** use `npm install` only inside `apps/web` without the monorepo root — `zod` and `@homeoassist/print` will not resolve.

Commit `package-lock.json` whenever `apps/web/package.json` changes.

## Docker deploy



```bash

# API only

docker build -t homeoassist-api .

docker run -p 4000:4000 --env-file .env -e NODE_ENV=production homeoassist-api



# Web (pass build-args for NEXT_PUBLIC_* from .env)

docker build -f Dockerfile.web \

  --build-arg NEXT_PUBLIC_API_URL=https://api.glowhomeo.com \

  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \

  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \

  --build-arg NEXT_PUBLIC_SITE_URL=https://app.glowhomeo.com \

  -t homeoassist-web .



# Both via compose

docker compose -f infra/docker-compose.prod.yml up --build

```



## Supervised smoke test



1. Book **ONLINE** appointment → join link created, email + WhatsApp queued

2. Doctor starts consultation → Daily room provisioned

3. Patient opens `/join/{token}` → consent → waiting → admitted → live

4. Doctor charts → finalize with Rx delivery → email/WhatsApp status shown

5. Check `GET /health/deep` and ops DLQ panel for failed jobs



## Recovery matrix



| Scenario | Expected |

|----------|----------|

| Online booking prep fails | Appointment + token rolled back, 503 returned |

| Doctor WhatsApp not connected | Platform GlowHomeo sender used automatically |

| Email bounce | Resend webhook marks job; visible in DLQ |

| Env missing in prod | API refuses startup with clear error |



## Health endpoints



- `GET /health` — liveness

- `GET /health/deep` — DB, workers, integrations, DLQ depth



## Validation scripts



```bash

npm run deploy:preflight

node scripts/infra-validation.mjs

node scripts/load-test-consultations.js

```



## Rollback



1. Revert deploy artifacts / previous Docker image tag

2. Do not roll back DB migrations without a DBA plan

3. Disable Daily/Meta/Resend webhooks if messaging unstable


