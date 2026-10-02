// Track C browser proof: screenshots of both FYD demo sites at 1440 and 375.
// Runs as a WINDOWS process via the portable node; connects to the house
// browser on :9223 (never launches a second Chrome). Base URL (WSL VM IP)
// comes in as argv[2]; never env (WSL spawn does not forward env).
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const SHOTS = [
  { site: 'happy-place', width: 1440, height: 900 },
  { site: 'happy-place', width: 375, height: 812 },
  { site: 'coppersmith-plumbing', width: 1440, height: 900 },
  { site: 'coppersmith-plumbing', width: 375, height: 812 },
];

(async () => {
  const base = process.argv[2];
  if (!base) throw new Error('missing base URL argv');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  for (const s of SHOTS) {
    const url = base + '/sites/' + s.site;
    const out = 'C:/Users/nolan/.local/share/pigi/trackc-' + s.site + '-' + s.width + '.png';
    const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1500);
      const title = await page.title();
      await page.screenshot({ path: out });
      console.log('saved ' + out + ' title=' + JSON.stringify(title));
    } finally {
      await page.close();
    }
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('SHOT_FAIL ' + (e && e.message)); process.exit(1); });
