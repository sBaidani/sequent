const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message, error.stack));
  
  await page.goto('http://localhost:3001/?test=true');
  await page.waitForTimeout(3000); // wait for load
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log('PAGE_TEXT:', text.slice(0, 1000));
  
  await browser.close();
})();
