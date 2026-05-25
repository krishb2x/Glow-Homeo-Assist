# Security Testing Checklist

Use for release gates and quarterly audits. Pair with automated tests in `apps/api` and CI.

## Authentication & sessions

- [ ] Invalid JWT returns 401 on all `/api/doctor/*` routes
- [ ] Expired token rejected
- [ ] Refresh / login brute-force rate limited
- [ ] Session fixation not possible (new token on login)

## Authorization & clinic isolation

- [ ] Doctor A cannot read Doctor B's patients (different `clinic_id`)
- [ ] `resolveClinicScope` rejects missing clinic for DOCTOR role
- [ ] SUPER_ADMIN clinic override audited
- [ ] Patient timeline queries always filter `clinic_id` + `patient_id`

## Rate limiting

- [ ] 429 returned after threshold (`RATE_LIMITED` code)
- [ ] `Retry-After` header present
- [ ] Per-doctor limits on broadcast / WhatsApp send
- [ ] Marketing lead endpoint limited

## Input validation

- [ ] Zod schemas on all write endpoints
- [ ] Oversized JSON bodies rejected
- [ ] SQL injection: parameterized Supabase queries only (no string concat)
- [ ] XSS: API returns JSON; web escapes user content in React text nodes

## Webhooks

- [ ] Meta verify token required for subscription challenge
- [ ] Unknown verify token returns null / 403
- [ ] Webhook payload stored; no arbitrary code execution from payload

## File uploads

- [ ] Presign URLs scoped to clinic prefix
- [ ] Content-type allowlist on upload
- [ ] Max size enforced

## WhatsApp / messaging

- [ ] Credentials encrypted at rest (`credentialVault`)
- [ ] Template variables sanitized before send
- [ ] Broadcast audience scoped to clinic patients only

## Telemedicine

- [ ] Join tokens single-use / time-bound
- [ ] Jitsi JWT only when secrets configured
- [ ] Patient join link cannot access other consultations

## Infrastructure

- [ ] Secrets not in git (`.env` gitignored)
- [ ] Service role key only on server
- [ ] CORS restricted to known origins in production
- [ ] HTTPS enforced in production

## Automated test mapping

| Check | Test file |
|-------|-----------|
| Clinic scope | `clinicScope.test.ts` |
| Role map | `roleMap.test.ts` |
| Rate limit | `rateLimit.test.ts` |
| Webhook verify | `webhookHandler.test.ts` |
| Safe errors | `safeError` / envelope tests (extend) |

## Manual / periodic

- [ ] OWASP ZAP or Burp scan on staging
- [ ] Dependency audit: `npm audit`
- [ ] Supabase RLS policy review per migration
- [ ] Meta app permission review
