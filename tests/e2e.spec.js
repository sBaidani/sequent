import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  
  // Wait for loading to finish if authguard is present
  // But wait, playright test goes here
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Sequent/);
});
