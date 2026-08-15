import { chromium } from 'playwright';

const SCRATCH = 'C:\\Users\\juane\\AppData\\Local\\Temp\\claude\\c--Users-juane-Documents-GitHub\\c00d8ee8-2735-4d40-9e6f-7d27e6120cf8\\scratchpad';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const msgs = [];
page.on('console', (msg) => msgs.push(`[${msg.type()}] ` + msg.text()));
page.on('pageerror', (err) => msgs.push('PAGEERROR: ' + err.message + '\n' + (err.stack || '')));

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);
await page.getByText('Modules', { exact: true }).first().click();
await page.waitForTimeout(300);
await page.getByText('Pick & Place', { exact: true }).first().click();
console.log('waiting 45s...');
await page.waitForTimeout(45000);
await page.screenshot({ path: `${SCRATCH}\\lp_08_45s.png` });
console.log('screenshot written');
console.log('MSGS', msgs.length);
for (const m of msgs) console.log(m);
await browser.close();
console.log('DONE');
