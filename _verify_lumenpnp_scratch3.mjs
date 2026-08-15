import { chromium } from 'playwright';

const SCRATCH = 'C:\\Users\\juane\\AppData\\Local\\Temp\\claude\\c--Users-juane-Documents-GitHub\\c00d8ee8-2735-4d40-9e6f-7d27e6120cf8\\scratchpad';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const msgs = [];
page.on('console', (msg) => msgs.push(`[${msg.type()}] ` + msg.text()));
page.on('pageerror', (err) => msgs.push('PAGEERROR: ' + err.message + '\n' + err.stack));

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);
await page.getByText('Modules', { exact: true }).first().click();
await page.waitForTimeout(300);
await page.getByText('Pick & Place', { exact: true }).first().click();

console.log('Waiting for network idle (up to 90s)...');
try {
  await page.waitForLoadState('networkidle', { timeout: 90000 });
  console.log('Network idle reached');
} catch (e) {
  console.log('Network idle TIMEOUT:', e.message);
}

// Poll for a canvas element with actual pixel content periodically
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(5000);
  const hasCanvas = await page.locator('canvas').count();
  console.log(`Poll ${i}: canvas count = ${hasCanvas}`);
}

await page.screenshot({ path: `${SCRATCH}\\lp_06_networkidle.png` });
console.log('Final screenshot taken');

console.log('MSGS:', msgs.length);
for (const m of msgs.slice(0, 40)) console.log('MSG:', m);

await browser.close();
console.log('DONE');
