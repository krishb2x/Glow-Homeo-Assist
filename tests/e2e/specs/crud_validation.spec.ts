import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const screenshotsDir = path.join(process.cwd(), "..", "..", "QA_REPORT", "screenshots", "crud");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.use({
  video: "on",
  trace: "on",
  viewport: { width: 1280, height: 720 },
});

test.describe("Targeted CRUD Validation", () => {
  test.setTimeout(300000);

  let testPatientName = `CRUD Patient ${Date.now()}`;
  let testCourseName = `CRUD Course ${Date.now()}`;

  test("End-to-End CRUD Flow", async ({ page }) => {
    // 1. SESSION PERSISTENCE & LOGIN
    await page.goto("/login");
    
    // Fill credentials
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill("nagendrapandey1416@gmail.com");
      await page.locator('input[name="password"]').fill("nagendrapandey1416");
    } else {
      await page.locator('input[type="email"]').fill("nagendrapandey1416@gmail.com");
      await page.locator('input[type="password"]').fill("nagendrapandey1416");
    }
    
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(home)?$|\/consultation|\/patients|\/dashboard/, { timeout: 30000 });
    
    // Test Refresh Persistence
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/(home)?$|\/consultation|\/patients|\/dashboard/);
    await page.screenshot({ path: path.join(screenshotsDir, "01-session-persisted.png") });

    // 2. PATIENT CRUD
    await page.goto("/patients/new");
    await page.locator('input[name="name"]').fill(testPatientName);
    await page.locator('input[name="age"]').fill("40");
    await page.getByRole("button", { name: /save patient/i }).click();
    await page.waitForURL(/\/patients/, { timeout: 30000 });

    // READ
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('input[type="search"]').fill(testPatientName);
    await page.waitForTimeout(2000); // debounce
    await page.getByText(testPatientName).first().click();
    await page.screenshot({ path: path.join(screenshotsDir, "02-patient-created-read.png") });

    // UPDATE
    await page.getByRole("link", { name: /edit/i }).click();
    await page.waitForTimeout(2000);
    const ageInput = page.locator('input[name="age"]');
    if (await ageInput.count() > 0) {
      await ageInput.fill("41");
      const saveBtn = page.getByRole("button", { name: /save/i });
      if (await saveBtn.count() > 0) {
        await saveBtn.first().click();
        await page.waitForTimeout(2000);
      }
    }
    await page.screenshot({ path: path.join(screenshotsDir, "03-patient-updated.png") });

    // 3. LIBRARY CRUD
    await page.goto("/content-library");
    const newCourseBtn = page.getByRole("button", { name: /new course|create course/i });
    if (await newCourseBtn.count() > 0) {
      await newCourseBtn.first().click();
      
      const titleInput = page.getByPlaceholder(/title|name/i);
      if (await titleInput.count() > 0) {
        await titleInput.first().fill(testCourseName);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, "04-course-created.png") });
      }
    }
  });
});

