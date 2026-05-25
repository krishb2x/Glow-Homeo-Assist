# k6 load tests

Install [k6](https://k6.io/docs/get-started/installation/), then:

```bash
# Baseline health (no auth)
API_BASE_URL=http://localhost:4000 k6 run tests/load/k6/api-health.js

# Authenticated scenarios (set token from test doctor login)
API_BASE_URL=https://staging-api.example.com \
  E2E_BEARER_TOKEN=eyJ... \
  k6 run tests/load/k6/patient-search.js
```

Run against **staging** only. Do not load-test production with real patient data.

## Scenarios

| Script | Simulates |
|--------|-----------|
| `api-health.js` | 10 VUs × 30s on `/health` |
| `patient-search.js` | Paginated patient search (requires token) |
| `timeline-read.js` | Timeline pagination (requires token + patient id) |
