import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Ensure screenshot directory exists
const screenshotsDir = path.join(process.cwd(), "..", "..", "QA_REPORT", "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.use({
  video: "on",
  trace: "on",
  viewport: { width: 1280, height: 720 },
});

test.describe("Hybrid Runtime Audit", () => {

  test("Comprehensive Doctor Workflow Audit", async ({ page, context }) => {
    // Console logging audit
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Network audit
    const failedRequests: string[] = [];
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()} failed: ${request.failure()?.errorText}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.request().method()} ${response.url()} failed with status ${response.status()}`);
      }
    });

    // 1. Navigate to login
    await page.goto("/login");
    await page.screenshot({ path: path.join(screenshotsDir, "01-login-page.png") });

    // 2. Perform Login
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

    // Wait for successful login redirect
    await page.waitForURL(/\/(home)?$|\/consultation|\/patients|\/dashboard/, { timeout: 30000 });
    await page.screenshot({ path: path.join(screenshotsDir, "02-dashboard-after-login.png") });

    // 3. Discover Workflows
    
    // Test Patients Module
    try {
      await page.goto("/patients");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(screenshotsDir, "03-patients-list.png"), fullPage: true });
      
      const newPatientBtn = page.getByRole("button", { name: /new patient|add patient/i });
      if (await newPatientBtn.count() > 0) {
        await newPatientBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, "04-new-patient-modal.png") });
        // Close modal if possible
        await page.keyboard.press('Escape');
      }
    } catch (e) {
      console.error("Failed to test patients module:", e);
    }

    // Test Appointments Module
    try {
      await page.goto("/appointments");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(screenshotsDir, "05-appointments-schedule.png"), fullPage: true });
    } catch (e) {
      console.error("Failed to test appointments module:", e);
    }

    // Test Content Library Module
    try {
      await page.goto("/content-library");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(screenshotsDir, "06-content-library.png"), fullPage: true });
    } catch (e) {
      console.error("Failed to test content library module:", e);
    }

    // Test Care Plan Library Module
    try {
      await page.goto("/care-plan-library");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(screenshotsDir, "07-care-plan-library.png"), fullPage: true });
    } catch (e) {
      console.error("Failed to test care plan library module:", e);
    }

    // Write logs to disk
    const logsDir = path.join(process.cwd(), "..", "..", "QA_REPORT", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(logsDir, "console_audit.txt"), consoleLogs.join("\n"));
    fs.writeFileSync(path.join(logsDir, "network_audit.txt"), failedRequests.join("\n"));
  });
});
