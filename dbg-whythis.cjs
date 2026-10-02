// Debug: dump the open details innerText for the Plumbing card.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const URL = process.argv[2];
const PLUMBING_ID = 'website-business-2f1327c09d622175-service-139408827c27';
const SEL = 'article:has(a[href="/o/' + PLUMBING_ID + '"]) details';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const page = await browser.contexts()[0].newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  const details = page.locator(SEL).first();
  await page.locator(SEL + ' summary').first().click();
  await page.waitForTimeout(500);
  const text = await details.innerText();
  console.log('INNERTEXT_START');
  console.log(text);
  console.log('INNERTEXT_END');
  const html = await details.innerHTML();
  console.log('HTML_HAS_Unverified:', html.includes('Unverified'));
  await page.close();
  console.log('DBG_OK');
})().catch((e) => { console.error('DBG_FAIL', e.message); process.exit(1); });
