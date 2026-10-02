const { chromium } = require('\\\\wsl.localhost\\Ubuntu\\home\\nolan\\projects\\fyd-editorial-template\\node_modules\\playwright');
const fs = require('fs'), path = require('path');
const out = 'C:\\Users\\nolan\\2026-10-01\\proof-20261001';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  for (const width of [1536, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 1024 }, reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:3214/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, 'PROOF-hero-' + width + '.png') });
    for (const id of ['fyd', 'understanding', 'primitives', 'journal']) {
      const el = page.locator('#' + id);
      if (await el.count() > 0) {
        await el.scrollIntoViewIfNeeded();
        try {
          await page.waitForFunction(
            sid => [...document.querySelectorAll('#' + sid + ' img')].every(i => i.complete && i.naturalWidth > 0),
            id, { timeout: 8000 });
        } catch (e) { /* images may be lazy; screenshot anyway */ }
        await el.screenshot({ path: path.join(out, 'PROOF-' + id + '-' + width + '.png') });
      } else { console.log('missing #' + id); }
    }
    await page.close();
  }
  const dp = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  await dp.goto('http://127.0.0.1:3214/design', { waitUntil: 'networkidle' });
  await dp.screenshot({ path: path.join(out, 'PROOF-design-1536.png'), fullPage: true });
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('CAPTURE-FAIL:', e.message); process.exit(1); });
