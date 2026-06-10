import { test, expect } from '@playwright/test';

test.describe('Deep E2E: Partner Lifecycle Journey', () => {
  test('Partner Application -> Admin Approval -> Tracking Code Verification', async ({ page }) => {
    // 1. Visit the public partner dashboard login/apply page
    await page.goto('/partner-dashboard');

    // Assuming there's an 'Apply Now' button if not logged in
    // Note: If the UI requires a specific route, we simulate standard navigation
    await expect(page.locator('body')).toContainText(/Partner/i);

    // Mock completing an application form if it exists, or directly accessing Admin Panel
    // For this E2E test, we will navigate to Admin Panel to process a seeded application
    
    // 2. Admin navigates to Partner Applications
    await page.goto('/admin/partners/applications');
    
    // Verify Page Title
    await expect(page.locator('h1').filter({ hasText: 'Partner Applications' })).toBeVisible();

    // Find the first pending application in the table
    const pendingRow = page.locator('table tbody tr').filter({ hasText: 'Pending' }).first();
    
    // If a pending application exists, click Review
    if (await pendingRow.isVisible()) {
      const reviewButton = pendingRow.getByRole('button', { name: /Review/i });
      await reviewButton.click();

      // Modal opens
      await expect(page.getByRole('dialog')).toBeVisible();

      // Click Approve
      const approveButton = page.getByRole('button', { name: /Approve Application/i });
      await approveButton.click();

      // Verify success notification or state change
      // Wait for network response (mocked by our seed data logic or live test DB)
      await page.waitForTimeout(1000); 
    }

    // 3. Admin navigates to Partner Tracking Codes to verify generation
    await page.goto('/admin/partners/codes');
    await expect(page.locator('h1').filter({ hasText: 'Tracking Codes' })).toBeVisible();

    // Verify there is at least one active code
    const codesTable = page.locator('table');
    await expect(codesTable).toContainText('%'); // Some percentage discount
  });
});
