// FYD [Build My FYD] intake visual proof (Track F, 2026-09-25).
// Runs as a Windows process via the portable node build; drives the house
// browser over CDP :9223. Opens ONE tab, screenshots the intake form,
// fills it, clicks BUILD, waits for the job page, screenshots the
// generated presence, closes the tab.
//
// Usage (from Pig WSL):
//   /mnt/c/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe \
//     C:/Users/nolan/.local/share/pigi/fb-engage/fyd-intake-shot.cjs \
//     <baseUrl> <demoUrl> <outPrefix>
const { chromium } = require('playwright-core');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const [baseUrl, demoUrl, outPrefix] = process.argv.slice(2);
  if (!baseUrl || !demoUrl || !outPrefix) {
    console.error('usage: shot.cjs <baseUrl> <demoUrl> <outPrefix>');
    process.exit(2);
  }
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const page = await browser.newPage();
  try {
    await page.goto(baseUrl + '/build-my-fyd', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('h1', { timeout: 30000 });
    await sleep(1500);
    await page.screenshot({ path: outPrefix + '-intake.png' });
    console.log('INTAKE_OK url=' + page.url());

    await page.fill('#fyd-url', demoUrl);
    await page.click('button[type="submit"]');
    console.log('BUILD_CLICKED waiting for job page...');
    await page.waitForURL('**/build-my-fyd/live-*', { timeout: 180000 });
    await page.waitForSelector('text=Your FYD presence', { timeout: 60000 }).catch(() => {});
    await sleep(3000);
    await page.screenshot({ path: outPrefix + '-result.png', fullPage: true });
    console.log('RESULT_URL=' + page.url());
    const banner = await page.textContent('body').catch(() => '');
    console.log('HAS_DEMO_BANNER=' + /DEMO PREVIEW/.test(banner || ''));
    console.log('HAS_PRESENCE_H1=' + /Your FYD presence/.test(banner || ''));
  } finally {
    await page.close().catch(() => {});
  }
  process.exit(0);
})().catch((e) => {
  console.error('FATAL ' + String((e && e.message) || e).slice(0, 400));
  process.exit(1);
});
