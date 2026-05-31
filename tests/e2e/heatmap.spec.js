const { test, expect } = require('@playwright/test');

test('Heatmap click navigates to timeline date', async ({ page }) => {
  // Bypass onboarding
  await page.addInitScript(() => {
    window.localStorage.setItem('sequent_onboarding_seen', 'true');
  });

  // Go to the app
  await page.goto('http://localhost:3000/?test=true');

  // Wait for the app to load
  await expect(page.locator('.sidebar')).toBeVisible();

  // Find a day in the heatmap (e.g. the 15th)
  const dayButton = page.locator('.heatmap-day').filter({ hasText: /^15$/ }).first();
  await expect(dayButton).toBeVisible();

  // Click it
  await dayButton.click();

  // The app should switch to the timeline view if it wasn't already there
  await expect(page.locator('.timeline-topbar')).toBeVisible();

  // The timeline should have the date loaded and visible
  // Get the current year and month to construct the data-date attribute
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const targetDateStr = `${year}-${month}-15`;

  const timelineDay = page.locator(`[data-date="${targetDateStr}"]`);
  
  // Wait for it to be visible in the DOM (infinite scroll might need a moment or it's already there)
  await expect(timelineDay).toBeVisible();
});
