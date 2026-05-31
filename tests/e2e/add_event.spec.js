const { test, expect } = require('@playwright/test');

test('Add Event Modal creates new event in Timeline', async ({ page }) => {
  // Bypass onboarding
  await page.addInitScript(() => {
    window.localStorage.setItem('sequent_onboarding_seen', 'true');
  });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[error] ${err.message}`));

  // Go to the app
  await page.goto('http://localhost:3001/?test=true');

  // Wait for the app to load
  await page.waitForTimeout(2000);
  
  if (consoleLogs.length > 0) {
    console.log("BROWSER CONSOLE LOGS:", consoleLogs.join('\n'));
  }
  
  try {
    await expect(page.locator('.timeline-topbar')).toBeVisible();
  } catch (e) {
    const html = await page.content();
    console.error("DOM HTML:", html);
    throw e;
  }

  // Click the + FAB button in the topbar to open Add Event Modal
  await page.click('.topbar-add');

  // Verify the modal is visible
  const modal = page.locator('#addEvent');
  await expect(modal).toBeVisible();

  // Fill in the event title
  await page.fill('input[placeholder="Coffee with Sarah..."]', 'Test Playwright Event');

  // Submit the form
  await page.click('button:has-text("Add Event")');

  // Verify the modal is closed
  await expect(modal).not.toBeVisible();

  // Verify the new event appears in the timeline
  const eventCard = page.locator('.event-card-title', { hasText: 'Test Playwright Event' });
  await expect(eventCard).toBeVisible();
});
