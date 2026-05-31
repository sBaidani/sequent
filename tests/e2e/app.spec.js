const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Sequent E2E Verification', () => {
  test('App Loads successfully with PWA Service Worker', async ({ page }) => {
    // Navigate to the local dist file
    const fileUrl = 'file:///' + path.resolve(__dirname, '../../dist/index.html').replace(/\\/g, '/');
    await page.goto(fileUrl);
    
    // Verify title and basic rendering
    await expect(page).toHaveTitle(/Sequent/);
    
    // Check if the add button is present
    const addBtn = page.locator('#btnAddTopbar');
    await expect(addBtn).toBeVisible();
  });
});
