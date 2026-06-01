import { test, expect } from '@playwright/test';

async function authenticateUser(page) {
  await page.goto('/');
  
  // Click Sign Up button to switch form
  await page.click('button:has-text("Sign Up")');
  
  // Fill details
  const randomEmail = `e2e_${Date.now()}@example.com`;
  await page.fill('input[placeholder="Full Name"]', 'E2E Test User');
  await page.fill('input[placeholder="Email address"]', randomEmail);
  await page.fill('input[placeholder="Password"]', 'secretpassword123');
  
  // Click submit (Sign Up)
  await page.click('button[type="submit"]');
  
  // Wait for onboarding modal to appear (proves auth was successful)
  await expect(page.locator('text=Welcome to Sequent')).toBeVisible({ timeout: 10000 });
}

test.describe('Sequent App E2E', () => {
  test('should load the app, authenticate, and show onboarding', async ({ page }) => {
    await authenticateUser(page);

    // Click through onboarding
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Dive In")');

    // Should see Timeline
    await expect(page.locator('#main-content >> text=Timeline').first()).toBeVisible();
  });

  test('should open add item modal', async ({ page }) => {
    await authenticateUser(page);

    // Click through onboarding to clear it
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Dive In")');

    // Click the FAB add button on Timeline
    await page.locator('button', { has: page.locator('path[d="M12 4v16m8-8H4"]') }).first().click();

    // Modal should appear
    await expect(page.locator('button:has-text("Add Event")')).toBeVisible({ timeout: 5000 });
    
    // Switch to task mode
    await page.click('#addItem button:has-text("Task")');
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible();
  });
});
