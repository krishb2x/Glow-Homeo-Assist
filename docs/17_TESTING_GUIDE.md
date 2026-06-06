# Testing Guide

## End-to-End Testing (Playwright)
Run the full browser-based test suite using:
```bash
npm run test:e2e
```
Tests are located in `tests/e2e/`. These tests boot a clean Supabase local environment, seed the database, and execute core workflows (e.g., Doctor creating a new consultation, WhatsApp webhook simulation).

## API Load Testing (k6)
Load tests ensure the API and Database can handle scale.
```bash
npm run test:load
```
Tests are located in `tests/load/k6/`. 

## Unit Testing
Vitest is used for isolated unit tests, particularly inside `packages/domain` for pure business logic and complex validation schemas.
