// Windows-side proof capture: connectOverCDP to the house browser (:9223),
// open ONE tab to the served FYD site, capture the WhyThis affordance
// closed and open at 1440 and 375, verify the real chain values, close tab.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const OUT = 'C:/Users/nolan/transfer';
const URL = process.argv[2];
const PLUMBING_ID = 'website-business-2f1327c09d622175-service-139408827c27';
const SEL = 'article:has(a[href="/o/' + PLUMBING_ID + '"]) details';

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const ctxs = browser.contexts();
  if (!ctxs.length) throw new Error('no browser contexts');
  const ctx = ctxs[0];
  for (const [w, h, tag] of [[1440, 900, '1440'], [375, 812, '375']]) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    const summary = page.locator(SEL + ' summary').first();
    await summary.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/whythis-' + tag + '-closed.png' });
    console.log('SHOT whythis-' + tag + '-closed.png');
    await summary.click();
    await page.waitForTimeout(600);
    const details = page.locator(SEL).first();
    const isOpen = await details.evaluate((d) => d.open);
    const text = (await details.innerText()).toUpperCase();
    const checks = [
      'PLUMBING',
      'SOURCE',
      'HTTPS://WWW.COPPERSMITHPLUMBING.COM/',
      'OBSERVED EVIDENCE',
      'WEBSITE-INGESTION:HTTPS://WWW.COPPERSMITHPLUMBING.COM/',
      '2026-09-21T13:50:00Z',
      'EXTRACTION METHOD',
      'WEBSITE INGESTION: STRUCTURED EXTRACTION FROM THE SOURCE SITE',
      'STATUS',
      'WEBSITE STATEMENT: THE SOURCE CLAIMS THIS.',
      'UNVERIFIED',
    ];
    const missing = checks.filter((c) => !text.includes(c));
    await page.screenshot({ path: OUT + '/whythis-' + tag + '-open.png' });
    console.log('SHOT whythis-' + tag + '-open.png');
    console.log(JSON.stringify({ tag, open: isOpen, missing }));
    await page.close();
    if (!isOpen || missing.length) throw new Error('[' + tag + '] proof failed');
  }
  console.log('CAPTURE_OK');
})().catch((e) => { console.error('CAPTURE_FAIL', e.message); process.exit(1); });
