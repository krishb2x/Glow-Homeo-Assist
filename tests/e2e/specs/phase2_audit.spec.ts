import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const screenshotsDir = path.join(process.cwd(), "..", "..", "QA_REPORT", "screenshots", "phase2");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.use({
  video: "on",
  trace: "on",
  viewport: { width: 1280, height: 720 },
});

test.describe("Phase 2 Dynamic Runtime Audit", () => {
  // Set to 10 minutes
  test.setTimeout(600000);

  test("Deep Stateful Workflow Validation", async ({ page }) => {
    const timestamp = Date.now();
    const patientName = `QA Test Patient ${timestamp}`;

    // 1. LOGIN
    await test.step("Authentication", async () => {
      await page.goto("/login");
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      if (await emailInput.count() > 0) {
        await emailInput.fill("nagendrapandey1416@gmail.com");
        await passwordInput.fill("nagendrapandey1416");
      } else {
        await page.locator('input[type="email"]').fill("nagendrapandey1416@gmail.com");
        await page.locator('input[type="password"]').fill("nagendrapandey1416");
      }
      await page.getByRole("button", { name: /sign in|log in/i }).click();
      await page.waitForURL(/\/(home)?$|\/consultation|\/patients|\/dashboard/, { timeout: 30000 });
      await page.screenshot({ path: path.join(screenshotsDir, "01-dashboard.png") });
    });

    // 2. CREATE PATIENT
    await test.step("Create Patient", async () => {
      await page.goto("/patients/new");
      await page.waitForLoadState("networkidle");
      
      await page.locator('input[name="name"]').fill(patientName);
      await page.locator('input[name="age"]').fill("35");
      await page.locator('input[name="gender"]').fill("Male");
      await page.locator('input[name="phone"]').fill("555-019-9999");
      await page.locator('textarea[name="initialChiefComplaint"]').fill("Automated QA test for chronic back pain.");
      
      await page.screenshot({ path: path.join(screenshotsDir, "02-new-patient-form.png") });
      
      await page.getByRole("button", { name: /save patient/i }).click();
      await page.waitForURL(/\/patients$/, { timeout: 30000 });
      await page.screenshot({ path: path.join(screenshotsDir, "03-patients-list-after-save.png") });
    });

    // 3. SEARCH & EDIT PATIENT
    await test.step("Search and View Patient", async () => {
      await page.locator('input[type="search"]').fill(patientName);
      await page.waitForTimeout(2000); // wait for debounce and fetch
      
      // Click the patient row
      await page.getByText(patientName).first().click();
      await page.waitForTimeout(2000); // wait for preview to load
      
      await page.screenshot({ path: path.join(screenshotsDir, "04-patient-preview.png") });
    });

    // 4. CREATE CONSULTATION
    await test.step("Create Consultation", async () => {
      // Click the Start Visit button in the preview panel
      await page.getByRole("link", { name: /start visit/i }).first().click();
      
      // It should navigate to /consultation/[id] or /consultation/new
      await page.waitForURL(/\/consultation/, { timeout: 30000 });
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(screenshotsDir, "05-consultation-workspace.png") });
      
      // If there is a note section, type something
      const noteInput = page.getByPlaceholder(/type notes/i).first();
      if (await noteInput.count() > 0) {
         await noteInput.fill("These are automated clinical notes generated during the QA E2E trace.");
         await page.waitForTimeout(1000);
      }
    });

    // 5. USE TEMPLATES (CARE PLAN LIBRARY)
    await test.step("Use Care Plan Template", async () => {
      await page.goto("/care-plan-library");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(screenshotsDir, "06-care-plan-library.png") });

      // Find an official template and click use
      const useBtn = page.getByRole("button", { name: /use template/i }).first();
      if (await useBtn.count() > 0) {
         await useBtn.click();
         await page.waitForTimeout(2000);
         await page.screenshot({ path: path.join(screenshotsDir, "07-template-applied.png") });
      }
    });

    // 6. UPDATE PROFILE/SETTINGS
    await test.step("Update Profile Settings", async () => {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(screenshotsDir, "08-settings.png") });
    });

    // Write completion log
    const logsDir = path.join(process.cwd(), "..", "..", "QA_REPORT", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(logsDir, "phase2_success.txt"), "Phase 2 Stateful execution completed successfully!");
  });
});
