import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

try {
  await page.goto('http://localhost:3000', { timeout: 10000 });
  await page.screenshot({ path: 'C:/Users/vikra/Desktop/clone-login.png' });
  console.log('login page captured');

  await page.locator('input[type=email]').fill('frank.miller@acmecorp.com');
  await page.locator('input[type=password]').fill('password123');
  await page.locator('button[type=submit]').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/vikra/Desktop/clone-mail.png' });
  console.log('mail inbox captured');

  // Try clicking a message
  const msgLocator = page.locator('[class*=message], [class*=Message]').first();
  const count = await msgLocator.count();
  if (count > 0) {
    await msgLocator.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'C:/Users/vikra/Desktop/clone-reading.png' });
    console.log('reading pane captured');
  } else {
    console.log('no message items found');
  }
} catch (e) {
  console.error('error:', e.message);
  await page.screenshot({ path: 'C:/Users/vikra/Desktop/clone-error.png' }).catch(() => {});
}

await browser.close();
