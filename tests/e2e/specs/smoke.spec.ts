import { test, expect } from "@playwright/test";

test.describe("Marketing smoke", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/HomeoAssist/i);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("pricing page loads without React key warnings", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /pricing/i }).first()).toBeVisible();
    const keyWarnings = errors.filter((e) => e.includes('unique "key" prop'));
    expect(keyWarnings).toHaveLength(0);
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  });
});
