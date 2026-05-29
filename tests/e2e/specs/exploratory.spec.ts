import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const screenshotsDir = path.join(process.cwd(), "..", "..", "QA_REPORT", "screenshots", "exploratory");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.use({
  video: "on",
  trace: "on",
  viewport: { width: 1280, height: 720 },
});

test.describe("True Exploratory Crawler", () => {
  test.setTimeout(900000); // 15 minutes max execution

  test("Dynamic BFS Feature Discovery", async ({ page, context }) => {
    const visited = new Set<string>();
    const queue: string[] = ["/dashboard"];
    const featureGraph: Record<string, string[]> = {};
    
    const consoleLogs: string[] = [];
    const networkFailures: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
         consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    page.on("response", (res) => {
      if (res.status() >= 400 && res.url().includes("/api/")) {
         networkFailures.push(`${res.request().method()} ${res.url()} -> ${res.status()}`);
      }
    });

    // 1. LOGIN
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

    // 2. BFS EXPLORATION
    let stepCount = 0;
    while (queue.length > 0 && stepCount < 20) { // Limit to 20 unique pages to prevent infinite loops
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      
      visited.add(currentUrl);
      stepCount++;

      try {
        await page.goto(currentUrl, { waitUntil: "networkidle", timeout: 20000 });
      } catch (e) {
        consoleLogs.push(`[NAVIGATION ERROR] Failed to load ${currentUrl}: ${e.message}`);
        continue;
      }

      // Snapshot
      const safeName = currentUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      await page.screenshot({ path: path.join(screenshotsDir, `exp-${stepCount}-${safeName}.png`), fullPage: true });

      // Extract links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a"))
          .map(a => a.getAttribute("href"))
          .filter(href => href && href.startsWith("/") && !href.includes("logout") && !href.includes("delete"));
      });

      featureGraph[currentUrl] = links as string[];

      // Add undiscovered links to queue
      for (const link of links) {
        if (link && !visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }

      // Heuristic Form Fuzzing (only if it's a "new" page)
      if (currentUrl.includes("/new") || currentUrl.includes("/create")) {
        try {
           const inputs = await page.locator("input[type='text'], input[type='number']").all();
           for (const input of inputs) {
             if (await input.isVisible() && await input.isEditable()) {
               await input.fill("Crawler Test Data");
             }
           }
           const submit = page.locator("button[type='submit']");
           if (await submit.count() > 0) {
              await submit.first().click();
              await page.waitForTimeout(2000);
           }
        } catch (fuzzErr) {
           consoleLogs.push(`[FUZZ ERROR] Failed on ${currentUrl}: ${fuzzErr.message}`);
        }
      }
    }

    // 3. GENERATE CRAWLER RESULTS
    const resultsDir = path.join(process.cwd(), "..", "..", "QA_REPORT", "logs");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const report = {
      visitedPages: Array.from(visited),
      featureGraph,
      consoleErrors: consoleLogs,
      networkFailures
    };

    fs.writeFileSync(path.join(resultsDir, "crawler-results.json"), JSON.stringify(report, null, 2));
  });
});
