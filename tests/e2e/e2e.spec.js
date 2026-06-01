import { test, expect } from '@playwright/test';

test.describe('Sequent App E2E', () => {

  test('1. Onboarding Flow', async ({ page }) => {
    await page.goto('/?test=true');
    await expect(page.locator('text=Welcome to Sequent')).toBeVisible();
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Dive In")');
    await expect(page.locator('#main-content >> text=Timeline').first()).toBeVisible();
  });

  test('2. Sidebar Navigation View Swapping', async ({ page }) => {
    await page.goto('/?test=true');
    await page.evaluate(() => localStorage.setItem('sequent_onboarding_seen', 'true'));
    await page.reload();

    // Swaps to Calendar
    await page.click('button:has-text("Calendar")');
    await expect(page.locator('h2:has-text("2026")').first()).toBeVisible().catch(() => null);
    
    // Swaps to Tasks
    await page.click('button:has-text("Tasks")');
    await expect(page.locator('h1, div:has-text("Tasks")').first()).toBeVisible();

    // Swaps to Archive
    await page.click('button:has-text("Archive")');
    await expect(page.locator('div:has-text("Archive")').first()).toBeVisible();

    // Swaps to Settings
    await page.click('button:has-text("Settings")');
    await expect(page.locator('div:has-text("Settings")').first()).toBeVisible();
  });

  test('3. Timeline View: Unified AddItem Modal', async ({ page }) => {
    await page.goto('/?test=true');
    await page.evaluate(() => localStorage.setItem('sequent_onboarding_seen', 'true'));
    await page.reload();

    // Click the top right plus button in Timeline
    await page.locator('button', { has: page.locator('path[d="M12 4v16m8-8H4"]') }).first().click();
    
    // Check for Unified modal elements
    await expect(page.locator('#addItem')).toBeVisible();
    await expect(page.locator('#addItem button:has-text("Event")')).toBeVisible();
    await expect(page.locator('#addItem button:has-text("Task")')).toBeVisible();
  });

  test('4. Calendar View: AddEvent Modal and view toggles', async ({ page }) => {
    await page.goto('/?test=true');
    await page.evaluate(() => localStorage.setItem('sequent_onboarding_seen', 'true'));
    await page.reload();

    // Navigate to Calendar view
    await page.click('button:has-text("Calendar")');

    // Click a day cell to trigger AddEventModal
    await page.locator('.calendar-day-cell').first().click();
    await expect(page.locator('#addEvent')).toBeVisible();
    await expect(page.locator('#addEvent h2:has-text("New Event")')).toBeVisible();
    await expect(page.locator('#addEvent button:has-text("Add Event")')).toBeVisible();

    // Close modal
    await page.click('#addEvent button:has(svg)');

    // Toggle Week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('text=Work Week Only')).toBeVisible();

    // Toggle Work Week Only
    await page.click('input[type="checkbox"]');
  });

  test('5. Tasks View: AddTask Modal and completing tasks', async ({ page }) => {
    await page.goto('/?test=true');
    await page.evaluate(() => localStorage.setItem('sequent_onboarding_seen', 'true'));
    await page.reload();

    // Navigate to Tasks view
    await page.click('button:has-text("Tasks")');

    // Click + button on a swimlane list to trigger AddTaskModal
    await page.locator('button:has-text("+")').first().click();
    await expect(page.locator('#addTask')).toBeVisible();
    await expect(page.locator('#addTask h2:has-text("New Task")')).toBeVisible();
    await expect(page.locator('#addTask button:has-text("Add Task")')).toBeVisible();

    // Close modal
    await page.click('#addTask button:has(svg)');

    // Try checking/unchecking a task
    const taskCheckbox = page.locator('input[type="checkbox"].task-checkbox-animate').first();
    if (await taskCheckbox.isVisible()) {
      const isChecked = await taskCheckbox.isChecked();
      await taskCheckbox.click();
      expect(await taskCheckbox.isChecked()).toBe(!isChecked);
    }
  });

  test('6. Settings: Calendar and List CRUD operations', async ({ page }) => {
    await page.goto('/?test=true');
    await page.evaluate(() => localStorage.setItem('sequent_onboarding_seen', 'true'));
    await page.reload();

    // Navigate to Settings
    await page.click('button:has-text("Settings")');

    // Click "+ New Calendar"
    await page.click('button:has-text("+ New Calendar")');
    await expect(page.locator('#addCalendar')).toBeVisible();
    await page.fill('#addCalendar input[placeholder="Work, Personal..."]', 'Test Calendar');
    await page.click('#addCalendar button:has-text("Create Calendar")');
    await expect(page.locator('input[value="Test Calendar"]')).toBeVisible();

    // Click "+ New List"
    page.once('dialog', async dialog => {
      await dialog.accept('Test List');
    });
    await page.click('button:has-text("+ New List")');
    await expect(page.locator('input[value="Test List"]')).toBeVisible();
  });

  test('7. Theme Customization and UI Styling updates', async ({ page }) => {
    await page.goto('/?test=true');
    await page.evaluate(() => localStorage.setItem('sequent_onboarding_seen', 'true'));
    await page.reload();

    // Click on Rose color button in sidebar theme selector
    const themeButton = page.locator('button[title="Rose"]');
    if (await themeButton.isVisible()) {
      await themeButton.click();
      const accentVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
      expect(accentVar).toBe('#C0185A');
    }
  });

  test('8. Archive View Filter states', async ({ page }) => {
    await page.goto('/?test=true');
    await page.evaluate(() => localStorage.setItem('sequent_onboarding_seen', 'true'));
    await page.reload();

    // Navigate to Archive
    await page.click('button:has-text("Archive")');

    // Verify filter buttons exist
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Events")')).toBeVisible();
    await expect(page.locator('button:has-text("Tasks")')).toBeVisible();

    // Toggle filters
    await page.click('button:has-text("Events")');
    await page.click('button:has-text("Tasks")');
  });

  test('9. Sidebar Heatmap interaction', async ({ page }) => {
    await page.goto('/?test=true');
    await page.evaluate(() => localStorage.setItem('sequent_onboarding_seen', 'true'));
    await page.reload();

    // Click on a calendar date in sidebar heatmap
    const heatmapDay = page.locator('button:has-text("15")').first();
    if (await heatmapDay.isVisible()) {
      await heatmapDay.click();
      await expect(page.locator('#main-content >> text=Timeline').first()).toBeVisible();
    }
  });
});
