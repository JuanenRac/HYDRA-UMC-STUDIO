import { chromium } from 'playwright';

const SCRATCH = 'C:\\Users\\juane\\AppData\\Local\\Temp\\claude\\c--Users-juane-Documents-GitHub\\c00d8ee8-2735-4d40-9e6f-7d27e6120cf8\\scratchpad';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') consoleErrors.push(`[${msg.type()}] ` + msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
page.on('requestfailed', (req) => consoleErrors.push('REQFAILED: ' + req.url() + ' ' + (req.failure()?.errorText || '')));

const stlRequests = [];
page.on('response', (res) => {
  if (res.url().includes('.stl')) {
    stlRequests.push(`${res.status()} ${res.url()} (${res.headers()['content-length'] || '?'} bytes)`);
  }
});

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

await page.getByText('Modules', { exact: true }).first().click();
await page.waitForTimeout(500);
await page.getByText('Pick & Place', { exact: true }).first().click();
await page.waitForTimeout(1000);

console.log('Waiting up to 60s for STL files to load...');
await page.waitForTimeout(20000);

await page.screenshot({ path: `${SCRATCH}\\lp_05_after_long_wait.png` });
console.log('Screenshot after long wait taken');

console.log('STL requests seen:', stlRequests.length);
for (const r of stlRequests) console.log('STL:', r);

console.log('CONSOLE_MSGS_COUNT:', consoleErrors.length);
for (const e of consoleErrors.slice(0, 30)) console.log('MSG:', e);

await browser.close();
console.log('DONE');
