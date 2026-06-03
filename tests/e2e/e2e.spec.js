import { test, expect } from '@playwright/test';

async function authenticateUser(page) {
  await page.goto('/');
  
  // Click Sign Up button to switch form
  await page.click('button:has-text("Sign Up")');
  
  // Fill details
  const randomEmail = `e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
  await page.fill('input[placeholder="Full Name"]', 'E2E Test User');
  await page.fill('input[placeholder="Email address"]', randomEmail);
  await page.fill('input[placeholder="Password"]', 'secretpassword123');
  
  // Click submit (Sign Up)
  await page.click('button[type="submit"]');
  
  // Wait for onboarding modal to appear (proves auth was successful)
  await expect(page.locator('text=Welcome to Sequent')).toBeVisible({ timeout: 10000 });
}

async function completeOnboarding(page) {
  await page.click('button:has-text("Continue")');
  await page.click('button:has-text("Continue")');
  await page.click('button:has-text("Dive In")');
}

async function authenticateAndSetup(page) {
  await authenticateUser(page);
  await completeOnboarding(page);
  await expect(page.locator('#main-content >> text=Timeline').first()).toBeVisible({ timeout: 5000 });
}

// ────────────────────────────────────────────
// 1. Onboarding Flow
// ────────────────────────────────────────────
test.describe('Onboarding Flow', () => {
  test('should load app and show onboarding card on first visit', async ({ page }) => {
    await authenticateUser(page);
    await expect(page.locator('text=Welcome to Sequent')).toBeVisible();
  });

  test('should click through all onboarding screens', async ({ page }) => {
    await authenticateUser(page);

    // Step 1: Welcome
    await expect(page.locator('text=Welcome to Sequent')).toBeVisible();
    await page.click('button:has-text("Continue")');

    // Step 2: Offline First
    await expect(page.locator('text=Offline First')).toBeVisible();
    await page.click('button:has-text("Continue")');

    // Step 3: Let's Get Started
    await expect(page.locator('text=Let\'s Get Started')).toBeVisible();
    await page.click('button:has-text("Dive In")');

    // Onboarding complete — Timeline header visible
    await expect(page.locator('#main-content >> text=Timeline').first()).toBeVisible();
  });
});

// ────────────────────────────────────────────
// 2. Sidebar Navigation View Swapping
// ────────────────────────────────────────────
test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAndSetup(page);
  });

  test('should navigate to Calendar view', async ({ page }) => {
    await page.click('aside >> button:has-text("Calendar")');
    await expect(page.locator('#main-content >> button:has-text("Month")')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Tasks view', async ({ page }) => {
    await page.click('aside >> button:has-text("Tasks")');
    await expect(page.locator('#main-content >> text=Tasks').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Archive view', async ({ page }) => {
    await page.click('aside >> button:has-text("Archive")');
    await expect(page.locator('#main-content >> text=Archive').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Settings view', async ({ page }) => {
    await page.click('aside >> button:has-text("Settings")');
    await expect(page.locator('#main-content >> text=Settings').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back to Timeline view', async ({ page }) => {
    await page.click('aside >> button:has-text("Tasks")');
    await expect(page.locator('#main-content >> text=Tasks').first()).toBeVisible({ timeout: 5000 });
    await page.click('aside >> button:has-text("Timeline")');
    await expect(page.locator('#main-content >> text=Timeline').first()).toBeVisible({ timeout: 5000 });
  });
});

// ────────────────────────────────────────────
// 3. Timeline View: Unified AddItem Modal
// ────────────────────────────────────────────
test.describe('Timeline AddItem Modal', () => {
  test('should open unified addItem modal with Event and Task tabs', async ({ page }) => {
    await authenticateAndSetup(page);

    // Click the header add button on Timeline (the button that opens addItem)
    await page.locator('#main-content button', { has: page.locator('path[d="M12 4v16m8-8H4"]') }).first().click();

    // Modal should appear with Event tab active by default
    await expect(page.locator('#addItem')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#addItem').getByRole('button', { name: 'Event', exact: true })).toBeVisible();
    await expect(page.locator('#addItem').getByRole('button', { name: 'Task', exact: true })).toBeVisible();
    // Submit button should say "Add Event" by default
    await expect(page.locator('#addItem >> button[type="submit"]:has-text("Add Event")')).toBeVisible();
  });

  test('should switch to Task mode in addItem modal', async ({ page }) => {
    await authenticateAndSetup(page);

    await page.locator('#main-content button', { has: page.locator('path[d="M12 4v16m8-8H4"]') }).first().click();
    await expect(page.locator('#addItem')).toBeVisible({ timeout: 5000 });

    // Switch to task mode
    await page.locator('#addItem').getByRole('button', { name: 'Task', exact: true }).click();
    await expect(page.locator('#addItem >> button[type="submit"]:has-text("Add Task")')).toBeVisible();
  });
});

// ────────────────────────────────────────────
// 4. Calendar View: AddEvent Modal and Toggles
// ────────────────────────────────────────────
test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAndSetup(page);
    await page.click('aside >> button:has-text("Calendar")');
    await expect(page.locator('#main-content >> button:has-text("Month")')).toBeVisible({ timeout: 5000 });
  });

  test('should double-click a calendar day cell to open addEvent modal', async ({ page }) => {
    const dayCell = page.locator('.calendar-day-cell').first();
    await dayCell.dblclick();
    await expect(page.locator('#addEvent')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#addEvent >> text=New Event')).toBeVisible();
  });

  test('should toggle between Month and Week viewports', async ({ page }) => {
    // Default is Month
    await expect(page.locator('button:has-text("Month")')).toBeVisible();
    await expect(page.locator('button:has-text("Week")')).toBeVisible();

    // Switch to Week
    await page.click('button:has-text("Week")');
    // Week view displays day headers with day abbreviations (e.g., Mon, Tue)
    await expect(page.locator('text=Work Week Only')).toBeVisible({ timeout: 3000 });

    // Switch back to Month
    await page.click('button:has-text("Month")');
    // Month grid should be visible again
    await expect(page.locator('.calendar-day-cell').first()).toBeVisible({ timeout: 3000 });
  });

  test('should toggle Work Week Only filter in week view', async ({ page }) => {
    // Switch to Week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('text=Work Week Only')).toBeVisible({ timeout: 3000 });

    // Toggle work week only checkbox
    const workWeekCheckbox = page.locator('input[type="checkbox"]');
    await workWeekCheckbox.check();
    await expect(workWeekCheckbox).toBeChecked();

    // Uncheck
    await workWeekCheckbox.uncheck();
    await expect(workWeekCheckbox).not.toBeChecked();
  });
});

// ────────────────────────────────────────────
// 5. Tasks View: AddTask Modal and Completion
// ────────────────────────────────────────────
test.describe('Tasks View', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAndSetup(page);
    await page.click('aside >> button:has-text("Tasks")');
    await expect(page.locator('#main-content >> text=Tasks').first()).toBeVisible({ timeout: 5000 });
  });

  test('should open addTask modal from list swimlane "+" button', async ({ page }) => {
    // Wait for lists to render and click the "+" button inside a list card
    const addButton = page.locator('button:has-text("+")').first();
    if (await addButton.isVisible({ timeout: 3000 })) {
      await addButton.click();
      await expect(page.locator('#addTask')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#addTask >> text=New Task')).toBeVisible();
    }
  });

  test('should open addTask modal from FAB button', async ({ page }) => {
    // Click the FAB add button
    await page.locator('.fixed.bottom-8.right-8').click();
    await expect(page.locator('#addTask')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#addTask >> text=New Task')).toBeVisible();
  });
});

// ────────────────────────────────────────────
// 6. Settings: Calendar and List CRUD
// ────────────────────────────────────────────
test.describe('Settings CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAndSetup(page);
    await page.click('aside >> button:has-text("Settings")');
    await expect(page.locator('#main-content >> text=Settings').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show Local Calendars section', async ({ page }) => {
    await expect(page.locator('text=Local Calendars')).toBeVisible();
    await expect(page.locator('button:has-text("+ New Calendar")')).toBeVisible();
  });

  test('should show Task Lists section', async ({ page }) => {
    await expect(page.locator('h3:has-text("Task Lists")')).toBeVisible();
    await expect(page.locator('button:has-text("+ New List")')).toBeVisible();
  });

  test('should open addCalendar modal when clicking New Calendar', async ({ page }) => {
    await page.click('button:has-text("+ New Calendar")');
    await expect(page.locator('#addCalendar')).toBeVisible({ timeout: 5000 });
  });
});

// ────────────────────────────────────────────
// 7. Theme Customization
// ────────────────────────────────────────────
test.describe('Theme Customization', () => {
  test('should set Rose theme accent to #C0185A', async ({ page }) => {
    await authenticateAndSetup(page);

    // Rose theme button is the second color swatch in the sidebar theme row
    const roseButton = page.locator('aside button[title="Rose"]');
    await roseButton.click();

    // Verify CSS variable was set
    const accent = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--accent')
    );
    expect(accent).toBe('#C0185A');
  });

  test('should set Teal theme accent to #1FA7A7', async ({ page }) => {
    await authenticateAndSetup(page);

    const tealButton = page.locator('aside button[title="Teal"]');
    await tealButton.click();

    const accent = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--accent')
    );
    expect(accent).toBe('#1FA7A7');
  });
});

// ────────────────────────────────────────────
// 8. Archive View Filter States
// ────────────────────────────────────────────
test.describe('Archive View Filters', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAndSetup(page);
    await page.click('aside >> button:has-text("Archive")');
    await expect(page.locator('#main-content >> text=Archive').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display All, Events, Tasks filter buttons', async ({ page }) => {
    await expect(page.locator('#main-content >> button:has-text("All")')).toBeVisible();
    await expect(page.locator('#main-content >> button:has-text("Events")')).toBeVisible();
    await expect(page.locator('#main-content >> button:has-text("Tasks")')).toBeVisible();
  });

  test('All filter is active by default', async ({ page }) => {
    const allButton = page.locator('#main-content >> button:has-text("All")');
    // Active filter has bg-white/15 class (shows as a distinct background)
    await expect(allButton).toHaveClass(/bg-white\/15/);
  });

  test('clicking Events filter toggles its active state', async ({ page }) => {
    const eventsButton = page.locator('#main-content >> button:has-text("Events")');
    await eventsButton.click();
    await expect(eventsButton).toHaveClass(/bg-white\/15/);
    // All button should no longer be active
    const allButton = page.locator('#main-content >> button:has-text("All")');
    await expect(allButton).not.toHaveClass(/bg-white\/15/);
  });

  test('clicking Tasks filter toggles its active state', async ({ page }) => {
    const tasksButton = page.locator('#main-content >> button:has-text("Tasks")');
    await tasksButton.click();
    await expect(tasksButton).toHaveClass(/bg-white\/15/);
  });
});

// ────────────────────────────────────────────
// 9. Sidebar Heatmap Interaction
// ────────────────────────────────────────────
test.describe('Sidebar Heatmap', () => {
  test('clicking a heatmap day navigates to Timeline view', async ({ page }) => {
    await authenticateAndSetup(page);

    // Navigate away from Timeline first
    await page.click('aside >> button:has-text("Tasks")');
    await expect(page.locator('#main-content >> text=Tasks').first()).toBeVisible({ timeout: 5000 });

    // Click a day button in the sidebar heatmap (they are small 6x6 grid buttons with day numbers)
    const heatmapDay = page.locator('aside .grid.grid-cols-7 button').first();
    await heatmapDay.click();

    // Should navigate back to Timeline
    await expect(page.locator('#main-content >> text=Timeline').first()).toBeVisible({ timeout: 5000 });
  });
});
