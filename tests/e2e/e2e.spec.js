// E2E suite — Phase 5 role/label-based locator migration.
//
// Locator policy: getByRole / getByLabel / getByText only — no class or
// structure selectors. Landmarks used for scoping:
//   - navigation "Primary"  → kit SideNav (Sidebar)
//   - main                  → AppShell content region (id=main-content)
//   - dialog                → kit Dialog, named via aria-labelledby (DialogHeader)
//
// Auth: real email auth talks to Supabase (VITE_SUPABASE_URL) and cannot run
// offline, so the suite enters the app through the AuthGuard `?test=true`
// bypass (src/components/auth/AuthGuard.jsx). The one network-dependent
// sign-up test is skipped below (1 skipped).
import { test, expect } from '@playwright/test';

// Open the app via the offline test bypass; first visit shows onboarding.
async function openApp(page) {
  await page.goto('/?test=true');
  await expect(page.getByRole('dialog', { name: 'Welcome to Sequent' })).toBeVisible({ timeout: 10000 });
}

async function completeOnboarding(page) {
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Dive In' }).click();
}

async function openAppAndSetup(page) {
  await openApp(page);
  await completeOnboarding(page);
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: /timeline/i }),
  ).toBeVisible({ timeout: 5000 });
}

const sideNav = (page) => page.getByRole('navigation', { name: 'Primary' });
const mainRegion = (page) => page.getByRole('main');

// ────────────────────────────────────────────
// 0. Email authentication (network-dependent — skipped offline)
// ────────────────────────────────────────────
test.describe('Email Authentication', () => {
  // Sign-up goes through supabase.auth against VITE_SUPABASE_URL; no Supabase
  // backend is reachable in this offline environment, so the flow cannot be
  // exercised end-to-end. Everything else runs via the AuthGuard ?test=true
  // bypass. (1 skipped test.)
  test.skip('should sign up with email and land in onboarding', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Sign Up' }).click();

    const randomEmail = `e2e_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
    await page.getByLabel('Full Name').fill('E2E Test User');
    await page.getByLabel('Email address').fill(randomEmail);
    await page.getByLabel('Password').fill('secretpassword123');

    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Onboarding dialog appearing proves auth succeeded
    await expect(page.getByRole('dialog', { name: 'Welcome to Sequent' })).toBeVisible({ timeout: 10000 });
  });
});

// ────────────────────────────────────────────
// 1. Onboarding Flow
// ────────────────────────────────────────────
test.describe('Onboarding Flow', () => {
  test('should load app and show onboarding dialog on first visit', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('dialog', { name: 'Welcome to Sequent' })).toBeVisible();
  });

  test('should click through all onboarding screens', async ({ page }) => {
    await openApp(page);

    // Step 1: Welcome
    await expect(page.getByRole('dialog', { name: 'Welcome to Sequent' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Offline First
    await expect(page.getByRole('dialog', { name: 'Offline First' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Let's Get Started
    await expect(page.getByRole('dialog', { name: "Let's Get Started" })).toBeVisible();
    await page.getByRole('button', { name: 'Dive In' }).click();

    // Onboarding complete — Timeline heading visible
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /timeline/i }),
    ).toBeVisible();
  });
});

// ────────────────────────────────────────────
// 2. Sidebar Navigation View Swapping
// ────────────────────────────────────────────
test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await openAppAndSetup(page);
  });

  test('should navigate to Calendar view', async ({ page }) => {
    await sideNav(page).getByRole('button', { name: 'Calendar' }).click();
    await expect(mainRegion(page).getByRole('radio', { name: 'Month' })).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Tasks view', async ({ page }) => {
    await sideNav(page).getByRole('button', { name: 'Tasks' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /tasks/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Archive view', async ({ page }) => {
    await sideNav(page).getByRole('button', { name: 'Archive' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /archive/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Settings view', async ({ page }) => {
    await sideNav(page).getByRole('button', { name: 'Settings' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /settings/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back to Timeline view', async ({ page }) => {
    await sideNav(page).getByRole('button', { name: 'Tasks' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /tasks/i }),
    ).toBeVisible({ timeout: 5000 });
    await sideNav(page).getByRole('button', { name: 'Timeline' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /timeline/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('active nav item carries aria-current="page"', async ({ page }) => {
    await sideNav(page).getByRole('button', { name: 'Tasks' }).click();
    await expect(sideNav(page).getByRole('button', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');
    await expect(sideNav(page).getByRole('button', { name: 'Timeline' })).not.toHaveAttribute('aria-current', 'page');
  });
});

// ────────────────────────────────────────────
// 3. Timeline View: Unified AddItem Modal
// ────────────────────────────────────────────
test.describe('Timeline AddItem Modal', () => {
  test('should open unified addItem dialog with Event and Task modes', async ({ page }) => {
    await openAppAndSetup(page);

    // Header add button on Timeline (accessible name, not the SVG path)
    await mainRegion(page).getByRole('button', { name: 'Add item' }).click();

    // Dialog appears in Event mode by default (title "New Event")
    const dialog = page.getByRole('dialog', { name: 'New Event' });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    // Event/Task mode switch is a radiogroup (kit SegmentedControl)
    await expect(dialog.getByRole('radio', { name: 'Event', exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.getByRole('radio', { name: 'Task', exact: true })).toBeVisible();
    // Submit button says "Add Event" by default
    await expect(dialog.getByRole('button', { name: 'Add Event' })).toBeVisible();
  });

  test('should switch to Task mode in addItem dialog', async ({ page }) => {
    await openAppAndSetup(page);

    await mainRegion(page).getByRole('button', { name: 'Add item' }).click();
    await expect(page.getByRole('dialog', { name: 'New Event' })).toBeVisible({ timeout: 5000 });

    // Switch to task mode — the dialog re-titles to "New Task"
    await page.getByRole('dialog').getByRole('radio', { name: 'Task', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'New Task' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add Task' })).toBeVisible();
  });
});

// ────────────────────────────────────────────
// 4. Calendar View: AddEvent Modal and Toggles
// ────────────────────────────────────────────
test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await openAppAndSetup(page);
    await sideNav(page).getByRole('button', { name: 'Calendar' }).click();
    await expect(mainRegion(page).getByRole('radio', { name: 'Month' })).toBeVisible({ timeout: 5000 });
  });

  test('should click a calendar day cell to open addEvent dialog', async ({ page }) => {
    // Single click opens the New Event dialog (the old double-click affordance
    // was retired with the rebuilt calendar). Day cells have no landmark role;
    // target the day-number text (the 15th exists once per month grid; .first()
    // guards against the exiting grid copy kept briefly by the view transition).
    await mainRegion(page).getByText('15', { exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New Event' });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('heading', { name: 'New Event' })).toBeVisible();
  });

  test('should toggle between Month and Week viewports', async ({ page }) => {
    const monthRadio = mainRegion(page).getByRole('radio', { name: 'Month' });
    const weekRadio = mainRegion(page).getByRole('radio', { name: 'Week' });

    // Default is Month
    await expect(monthRadio).toHaveAttribute('aria-checked', 'true');
    await expect(weekRadio).toBeVisible();

    // Switch to Week — the hour-gutter grid renders
    await weekRadio.click();
    await expect(weekRadio).toHaveAttribute('aria-checked', 'true');
    await expect(mainRegion(page).getByText('23:00', { exact: true })).toBeVisible({ timeout: 3000 });

    // Switch back to Month — the month grid is visible again (.first(): the
    // exiting week/month copy stays in the DOM for the 400ms view transition)
    await monthRadio.click();
    await expect(monthRadio).toHaveAttribute('aria-checked', 'true');
    await expect(mainRegion(page).getByText('15', { exact: true }).first()).toBeVisible({ timeout: 3000 });
  });

  test('should toggle Work Week view', async ({ page }) => {
    // The viewport switch is one radiogroup: Month / Week / Work — all three
    // segments are always present (the old "Work appears after Week" flow is
    // retired with the rebuilt header).
    const weekRadio = mainRegion(page).getByRole('radio', { name: 'Week' });
    const workRadio = mainRegion(page).getByRole('radio', { name: 'Work' });

    await weekRadio.click();
    await expect(weekRadio).toHaveAttribute('aria-checked', 'true');

    // Switch to Work Week
    await workRadio.click();
    await expect(workRadio).toHaveAttribute('aria-checked', 'true');

    // Switch back to Full Week
    await weekRadio.click();
    await expect(weekRadio).toHaveAttribute('aria-checked', 'true');
  });
});

// ────────────────────────────────────────────
// 5. Tasks View: AddTask Modal and Completion
// ────────────────────────────────────────────
test.describe('Tasks View', () => {
  test.beforeEach(async ({ page }) => {
    await openAppAndSetup(page);
    await sideNav(page).getByRole('button', { name: 'Tasks' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /tasks/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should open addTask dialog from a list swimlane add button', async ({ page }) => {
    // Swimlane buttons are named "Add task to <list>". Offline (no backend,
    // fresh IndexedDB) there may be no lists yet — mirror the old suite's
    // conditional behavior.
    const addButton = mainRegion(page).getByRole('button', { name: /^Add task to / }).first();
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.click();
      const dialog = page.getByRole('dialog', { name: 'New Task' });
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByRole('heading', { name: 'New Task' })).toBeVisible();
    }
  });

  test('should open addTask dialog from FAB button', async ({ page }) => {
    // Two controls share the accessible name "Add task" (header icon button
    // and the FAB); the FAB is the last one in the document.
    await mainRegion(page).getByRole('button', { name: 'Add task', exact: true }).last().click();
    const dialog = page.getByRole('dialog', { name: 'New Task' });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByRole('heading', { name: 'New Task' })).toBeVisible();
  });
});

// ────────────────────────────────────────────
// 6. Settings: Calendar and List CRUD
// ────────────────────────────────────────────
test.describe('Settings CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await openAppAndSetup(page);
    await sideNav(page).getByRole('button', { name: 'Settings' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /settings/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show Calendars section with a New button', async ({ page }) => {
    // Settings was rebuilt: "Local Calendars" is now the "Calendars" region
    // with a Local column and a "+ New" action.
    const calendars = mainRegion(page).getByRole('region', { name: 'Calendars' });
    await expect(calendars).toBeVisible();
    await expect(calendars.getByText('Local', { exact: true })).toBeVisible();
    await expect(calendars.getByRole('button', { name: '+ New' })).toBeVisible();
  });

  test('should show Task Lists section with a New button', async ({ page }) => {
    const taskLists = mainRegion(page).getByRole('region', { name: 'Task Lists' });
    await expect(taskLists).toBeVisible();
    await expect(taskLists.getByRole('heading', { name: /task lists/i })).toBeVisible();
    await expect(taskLists.getByRole('button', { name: '+ New' })).toBeVisible();
  });

  test('should open addCalendar dialog when clicking New in Calendars', async ({ page }) => {
    await mainRegion(page)
      .getByRole('region', { name: 'Calendars' })
      .getByRole('button', { name: '+ New' })
      .click();
    await expect(page.getByRole('dialog', { name: 'New Calendar' })).toBeVisible({ timeout: 5000 });
  });
});

// ────────────────────────────────────────────
// 7. Theme Customization
// ────────────────────────────────────────────
// The accent swatches moved from the sidebar to Settings → Appearance and are
// now a labelled radiogroup (role=radio named "Rose", "Teal", ...).
test.describe('Theme Customization', () => {
  async function goToAppearance(page) {
    await openAppAndSetup(page);
    await sideNav(page).getByRole('button', { name: 'Settings' }).click();
    await expect(mainRegion(page).getByRole('region', { name: 'Appearance' })).toBeVisible({ timeout: 5000 });
  }

  test('should apply the rose accent when Rose is selected', async ({ page }) => {
    await goToAppearance(page);

    await page.getByRole('radio', { name: 'Rose' }).click();
    await expect(page.getByRole('radio', { name: 'Rose' })).toHaveAttribute('aria-checked', 'true');

    // The accent slug drives the Astryx accent tokens via [data-accent]
    const accent = await page.evaluate(() => document.documentElement.dataset.accent);
    expect(accent).toBe('rose');
  });

  test('should apply the teal accent when Teal is selected', async ({ page }) => {
    await goToAppearance(page);

    await page.getByRole('radio', { name: 'Teal' }).click();
    await expect(page.getByRole('radio', { name: 'Teal' })).toHaveAttribute('aria-checked', 'true');

    const accent = await page.evaluate(() => document.documentElement.dataset.accent);
    expect(accent).toBe('teal');
  });
});

// ────────────────────────────────────────────
// 8. Archive View Filter States
// ────────────────────────────────────────────
// The filter is now a kit SegmentedControl: radiogroup "Filter archive" with
// radio items whose active state is aria-checked (the old bg-white/15
// glassmorphism class assertion is retired).
test.describe('Archive View Filters', () => {
  test.beforeEach(async ({ page }) => {
    await openAppAndSetup(page);
    await sideNav(page).getByRole('button', { name: 'Archive' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /archive/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  const filterGroup = (page) => mainRegion(page).getByRole('radiogroup', { name: 'Filter archive' });

  test('should display All, Events, Tasks filter options', async ({ page }) => {
    await expect(filterGroup(page).getByRole('radio', { name: 'All' })).toBeVisible();
    await expect(filterGroup(page).getByRole('radio', { name: 'Events' })).toBeVisible();
    await expect(filterGroup(page).getByRole('radio', { name: 'Tasks' })).toBeVisible();
  });

  test('All filter is active by default', async ({ page }) => {
    await expect(filterGroup(page).getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
  });

  test('selecting Events filter toggles its active state', async ({ page }) => {
    const events = filterGroup(page).getByRole('radio', { name: 'Events' });
    await events.click();
    await expect(events).toHaveAttribute('aria-checked', 'true');
    // All should no longer be active
    await expect(filterGroup(page).getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'false');
  });

  test('selecting Tasks filter toggles its active state', async ({ page }) => {
    const tasks = filterGroup(page).getByRole('radio', { name: 'Tasks' });
    await tasks.click();
    await expect(tasks).toHaveAttribute('aria-checked', 'true');
  });
});

// ────────────────────────────────────────────
// 9. Sidebar Heatmap Interaction
// ────────────────────────────────────────────
test.describe('Sidebar Heatmap', () => {
  test('clicking a heatmap day navigates to Timeline view', async ({ page }) => {
    await openAppAndSetup(page);

    // Navigate away from Timeline first
    await sideNav(page).getByRole('button', { name: 'Tasks' }).click();
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /tasks/i }),
    ).toBeVisible({ timeout: 5000 });

    // Heatmap day buttons are labelled "<Weekday>, <Month> <d>, <yyyy> — N events"
    await sideNav(page).getByRole('button', { name: /— \d+ events?$/ }).first().click();

    // Should navigate back to Timeline
    await expect(
      mainRegion(page).getByRole('heading', { level: 1, name: /timeline/i }),
    ).toBeVisible({ timeout: 5000 });
  });
});
