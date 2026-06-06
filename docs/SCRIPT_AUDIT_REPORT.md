# Script Audit Report

**Date:** June 5, 2026
**Scope:** `/scripts` and testing utilities.

## Audit Findings

🟢 **Active (Retained for Production):**
- `scripts/deploy-preflight.mjs`: Essential for CI/CD pipeline validation.
- `scripts/infra-validation.mjs`: Core utility for validating production environments.

🔴 **Obsolete (Deleted):**
- `scripts/infra-validation-output.json`: Temporary local file inadvertently tracked.
- `scripts/load-test-consultations.js`: Dead, unmaintained script superseded by k6 tests.
