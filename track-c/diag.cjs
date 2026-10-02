// Track C diagnostic: check whether CSS actually applies in the house browser.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

(async () => {
  const base = process.argv[2];
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(base + '/sites/happy-place', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const diag = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets).map((s) => {
        let rules = -1;
        try { rules = s.cssRules.length; } catch (e) { rules = -2; }
        return { href: s.href, rules };
      });
      const h1 = document.querySelector('h1');
      const cs = h1 ? getComputedStyle(h1) : null;
      return {
        styleSheetCount: sheets.length,
        sheets: sheets.slice(0, 8),
        h1FontSize: cs && cs.fontSize,
        h1FontWeight: cs && cs.fontWeight,
        bodyFont: getComputedStyle(document.body).fontFamily,
      };
    });
    console.log(JSON.stringify(diag, null, 1));
  } finally {
    await page.close();
    await browser.close();
  }
})().catch((e) => { console.error('DIAG_FAIL ' + (e && e.message)); process.exit(1); });
