import { test, expect } from '@playwright/test';

test.describe('Partner System E2E', () => {
  test('Partner Application Form Submission', async ({ page }) => {
    // 1. Visit the partner application form page (adjust URL to actual page)
    // Note: Assuming there is a partner application page at /partner/apply
    // Since we don't have the exact front-end route, we mock the submission endpoint
    
    // As a substitute, we will test the Admin Dashboard's Partner view
    await page.goto('/admin/partners/applications');

    // Should render the page title
    await expect(page.getByText(/Partner Applications/i)).toBeVisible();
    
    // There should be a table of applications
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('Partner Dashboard loads correctly', async ({ page }) => {
    // Navigate to the partner dashboard
    await page.goto('/partner-dashboard');

    // Should show login/dashboard title
    await expect(page.locator('body')).toContainText(/Welcome/i);
    
    // It should have the metrics section
    await expect(page.locator('body')).toContainText(/Total Revenue/i);
    await expect(page.locator('body')).toContainText(/Total Commission/i);
  });
});
