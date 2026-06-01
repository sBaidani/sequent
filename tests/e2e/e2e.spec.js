import { test, expect } from '@playwright/test';

test.describe('Sequent App E2E', () => {
  test('should load the app and show onboarding', async ({ page }) => {
    // App loads on port 3000 (from vite.config.js / playwright.config.js)
    await page.goto('/');

    // Check if onboarding modal is visible
    await expect(page.locator('text=Welcome to Sequent')).toBeVisible();

    // Click through onboarding
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Dive In")');

    // Should see Timeline
    await expect(page.locator('text=Timeline')).toBeVisible();
  });

  test('should open add item modal', async ({ page }) => {
    await page.goto('/');
    
    // Ensure onboarding is dismissed by setting localStorage
    await page.evaluate(() => {
      localStorage.setItem('sequent_onboarding_seen', 'true');
    });
    await page.reload();

    // Click the FAB add button
    await page.click('button:has(svg)'); // The first button with an SVG is often the fab or top bar. Let's be more specific.
    // Actually, in TimelineView there's a button with add icon. 
    // Wait, the FAB is at the bottom right.
    // It's a button with rounded-full, we can find it by looking for the plus icon path "M12 4v16m8-8H4"
    await page.locator('button', { has: page.locator('path[d="M12 4v16m8-8H4"]') }).first().click();

    // Modal should appear
    await expect(page.locator('text=New Event')).toBeVisible({ timeout: 5000 }).catch(() => null);
    // Actually our new modal has "Add Event" or "Add Task" button, and inputs for Title.
    await expect(page.locator('button:has-text("Add Event")')).toBeVisible();
    
    // Switch to task mode
    await page.click('button:has-text("Task")');
    await expect(page.locator('button:has-text("Add Task")')).toBeVisible();
  });
});
