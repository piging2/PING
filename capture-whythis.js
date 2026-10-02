// Headless CDP-style capture of the WhyThis affordance on the served page.
// Uses the repo's playwright-core against the system Chrome binary.
const { chromium } = require('/home/nolan/projects/ping/node_modules/playwright-core');

const OUT = '/mnt/c/Users/nolan/transfer';
const URL = 'http://127.0.0.1:3100/sites/coppersmith-plumbing';
const PLUMBING_ID = 'website-business-2f1327c09d622175-service-139408827c27';

async function shot(page, name, opts) {
  await page.screenshot({ path: `${OUT}/${name}`, ...opts });
  console.log('SHOT', name);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });

  for (const [w, h, tag] of [[1440, 900, '1440'], [375, 812, '375']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    // The Plumbing card's title link -> nearest article -> its Why this summary.
    const summary = page.locator(
      `article:has(a[href="/o/${PLUMBING_ID}"]) details summary`
    ).first();
    await summary.scrollIntoViewIfNeeded();
    await shot(page, `whythis-${tag}-closed.png`, {});
    await summary.click();
    await page.waitForTimeout(400);
    await shot(page, `whythis-${tag}-open.png`, {});
    // Assert the open chain carries the real values.
    const details = page.locator(
      `article:has(a[href="/o/${PLUMBING_ID}"]) details`
    ).first();
    const text = await details.innerText();
    const checks = [
      'Plumbing',
      'Source',
      'https://www.coppersmithplumbing.com/',
      'Observed evidence',
      'website-ingestion:https://www.coppersmithplumbing.com/',
      '2026-09-21T13:50:00Z',
      'Extraction method',
      'Website ingestion',
      'Status',
      'Website statement',
      'Unverified',
    ];
    for (const c of checks) {
      if (!text.includes(c)) throw new Error(`[${tag}] missing in open chain: ${c}`);
    }
    console.log(`[${tag}] open-chain checks all present`);
    await page.close();
  }
  await browser.close();
  console.log('CAPTURE_OK');
})().catch((e) => { console.error('CAPTURE_FAIL', e.message); process.exit(1); });
