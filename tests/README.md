# Cross-cutting tests

| Path | Purpose |
|------|---------|
| `e2e/` | Playwright end-to-end suites |
| `load/k6/` | Performance / load scripts |
| `fixtures/` | Static JSON used by E2E and load tests |

Workspace unit tests live next to source code:

- `apps/api/src/**/*.test.ts`
- `apps/web/lib/**/*.test.ts`

See [docs/TESTING_ARCHITECTURE.md](../docs/TESTING_ARCHITECTURE.md).

## Quick start

```bash
npm test                 # api + web unit
npm run test:e2e         # Playwright (install browsers first)
npx playwright install   # one-time
```

## E2E against local dev

```bash
# Terminal 1
npm run dev:api
npm run dev:web

# Terminal 2
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

## Load tests

Requires [k6](https://k6.io/docs/get-started/installation/).

```bash
API_BASE_URL=http://localhost:4000 k6 run tests/load/k6/api-health.js
```
