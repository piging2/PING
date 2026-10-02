#!/usr/bin/env node
// FAB/sheet behavior probe at 320px: tap the fixed "Featured object" button,
// record what opens (sheet/dialog), screenshot, then close if possible.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'C:/Users/nolan/.local/share/pigi/fb-engage/visual-mobile';
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const page = await browser.newPage();
  const result = { tapped: false };
  try {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('http://100.79.154.43:3100/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await sleep(1200);
    const fab = page.locator('button.fixed.bottom-6.right-6').first();
    result.fabFound = await fab.count() > 0;
    result.fabText = result.fabFound ? (await fab.innerText()).trim().slice(0, 60) : null;
    await page.screenshot({ path: OUT + '/fab-320-before.png', fullPage: false });
    if (result.fabFound) {
      await fab.click({ timeout: 10000 });
      result.tapped = true;
      await sleep(1500);
    }
    await page.screenshot({ path: OUT + '/fab-320-after.png', fullPage: false });
    result.afterTap = await page.evaluate(() => {
      const vw = window.innerWidth;
      return {
        dialogs: Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]')).map(d => ({
          cls: (d.className || '').toString().slice(0, 80),
          rect: (() => { const r = d.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
          textStart: (d.innerText || '').trim().slice(0, 160),
          coversViewportWidth: d.getBoundingClientRect().width >= vw - 2,
        })),
        bodyOverflowHidden: getComputedStyle(document.body).overflow === 'hidden',
        sheetLike: Array.from(document.querySelectorAll('[class*="sheet" i], [class*="drawer" i], [class*="bottom-" i]')).filter(el => {
          const r = el.getBoundingClientRect(); return r.height > 100 && r.width > 100;
        }).map(el => ({ cls: (el.className || '').toString().slice(0, 80), h: Math.round(el.getBoundingClientRect().height) })).slice(0, 8),
      };
    });
    console.log('RESULT ' + JSON.stringify(result, null, 1));
  } catch (e) {
    result.error = String(e.message || e).slice(0, 300);
    console.log('RESULT ' + JSON.stringify(result, null, 1));
  }
  await page.close().catch(() => {});
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
