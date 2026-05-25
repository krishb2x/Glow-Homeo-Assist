import { test, expect } from "@playwright/test";

/**
 * Authenticated clinical workflows require test credentials in env:
 *   E2E_DOCTOR_EMAIL, E2E_DOCTOR_PASSWORD
 * Skipped in CI until secrets are configured.
 */
const hasAuth = Boolean(process.env.E2E_DOCTOR_EMAIL && process.env.E2E_DOCTOR_PASSWORD);

test.describe("Doctor workflows", () => {
  test.skip(!hasAuth, "Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_DOCTOR_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_DOCTOR_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(home)?$|\/consultation|\/patients/, { timeout: 30_000 });
  });

  test("patients list loads", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: /patients/i })).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeVisible();
  });

  test("schedule page loads", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.getByRole("heading", { name: /schedule/i })).toBeVisible();
  });

  test("messages inbox shell loads", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.getByText(/inbox/i).first()).toBeVisible();
  });
});
