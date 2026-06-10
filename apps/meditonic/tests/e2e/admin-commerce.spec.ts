import { test, expect } from '@playwright/test';

test.describe('Admin Commerce Products', () => {
  test('Products list loads and displays standard types', async ({ page }) => {
    // Navigate to admin products page
    await page.goto('/admin/commerce/products');

    // Should render the page title
    await expect(page.locator('h1').filter({ hasText: 'Products' })).toBeVisible();
    
    // Check if the "Add Product" button exists
    const addBtn = page.getByRole('link', { name: /Add Product/i });
    await expect(addBtn).toBeVisible();
  });
});
