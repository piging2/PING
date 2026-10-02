// Capture via Windows Chrome headless=new with a remote debugging port,
// connected over CDP from WSL. Started detached by the caller.
const { chromium } = require('/home/nolan/projects/ping/node_modules/playwright-core');

const OUT = '/mnt/c/Users/nolan/transfer';
const URL = 'http://127.0.0.1:3100/sites/coppersmith-plumbing';
const PLUMBING_ID = 'website-business-2f1327c09d622175-service-139408827c27';

const CDP_URLS = [
  'http://127.0.0.1:9333',
];

async function connectCDP() {
  let last;
  for (const u of CDP_URLS) {
    try {
      const b = await chromium.connectOverCDP(u, { timeout: 8000 });
      console.log('CDP connected:', u);
      return b;
    } catch (e) { last = e; }
  }
  throw new Error('CDP connect failed: ' + last.message);
}

(async () => {
  const browser = await connectCDP();
  const contexts = browser.contexts();
  const ctx = contexts.length ? contexts[0] : await browser.newContext();
  for (const [w, h, tag] of [[1440, 900, '1440'], [375, 812, '375']]) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    const summary = page.locator(
      `article:has(a[href="/o/${PLUMBING_ID}"]) details summary`
    ).first();
    await summary.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/whythis-${tag}-closed.png` });
    console.log('SHOT', `whythis-${tag}-closed.png`);
    await summary.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/whythis-${tag}-open.png` });
    console.log('SHOT', `whythis-${tag}-open.png`);
    const details = page.locator(
      `article:has(a[href="/o/${PLUMBING_ID}"]) details`
    ).first();
    const open = await details.getAttribute('open');
    console.log(`[${tag}] details open attribute after click:`, open !== null);
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
  console.log('CAPTURE_OK');
})().catch((e) => { console.error('CAPTURE_FAIL', e.message); process.exit(1); });
