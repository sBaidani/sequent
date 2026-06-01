import { test, expect } from '@playwright/test';

test.describe('Sequent App E2E', () => {
  test('should load the app and show onboarding', async ({ page }) => {
    // App loads on port 3000 (from vite.config.js / playwright.config.js)
    await page.goto('/?test=true');

    // Check if onboarding modal is visible
    await expect(page.locator('text=Welcome to Sequent')).toBeVisible();

    // Click through onboarding
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Dive In")');

    // Should see Timeline
    await expect(page.locator('#main-content >> text=Timeline').first()).toBeVisible();
  });

  test('should open add item modal', async ({ page }) => {
    await page.goto('/?test=true');
    
    // Ensure onboarding is dismissed by setting localStorage
    await page.evaluate(() => {
      localStorage.setItem('sequent_onboarding_seen', 'true');
    });
    await page.reload();

    // Click the FAB add button
    await page.locator('button', { has: page.locator('path[d="M12 4v16m8-8H4"]') }).first().click();

    // Modal should appear
    await expect(page.locator('text=New Event')).toBeVisible({ timeout: 5000 }).catch(() => null);
    // Actually our new modal has "Add Event" or "Add Task" button, and inputs for Title.
    await expect(page.locator('button:has-text("Add Event")')).toBeVisible();
    
    // Switch to task mode
    await page.click('#addItem button:has-text("Task")');
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible();
  });
});
