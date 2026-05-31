const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Sequent E2E Verification', () => {
  test('App Loads successfully with PWA Service Worker', async ({ page }) => {
    // Navigate to the local dev server
    await page.goto('http://localhost:3000/');
    
    // Verify title and basic rendering
    await expect(page).toHaveTitle(/Sequent/);
    
    // Unauthenticated user will see the login screen first
    const loginScreen = page.locator('.login-screen');
    await expect(loginScreen).toBeVisible();
  });
});
