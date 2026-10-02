// object-margin-verify.js -- browser proof for the object-in-the-margin milestone.
// Launches a FRESH headless Chrome (own profile, nothing of Nolan's touched),
// loads /build/<site> at desktop + mobile widths, and checks:
//  desktop: featured-object card in a bordered, separated rail surface beside content
//  mobile: 44px floating trigger -> opens sheet dialog -> Escape closes + focus returns
//  object-circle preview button opens a preview card.
// Usage (on Pig): node.exe object-margin-verify.js <outdir>
const { chromium } = require('C:\\Users\\nolan\\.local\\share\\pigi\\fb-engage\\node_modules\\playwright-core');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || 'C:\\Users\\nolan\\.local\\share\\pigi\\fyd-verify';
const BASE = 'http://100.79.154.43:3100';
const SITES = ['happy-place', 'coppersmith-plumbing'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const report = { started: new Date().toISOString(), base: BASE, sites: {} };

async function desktopChecks(ctx, site) {
  const r = { viewport: '1280x800', checks: {}, errors: [] };
  const page = await ctx.newPage();
  page.on('pageerror', e => r.errors.push('pageerror: ' + String(e.message).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') r.errors.push('console: ' + m.text().slice(0, 160)); });
  page.on('response', resp => { if (resp.status() === 404) r.errors.push('404: ' + resp.url().slice(0, 120)); });
  try {
    await page.goto(`${BASE}/build/${site}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-object-rail]', { timeout: 45000 });
    await sleep(1500);
    r.checks = await page.evaluate(() => {
      const c = {};
      const rails = document.querySelectorAll('[data-object-rail]');
      c.railInstances = rails.length;
      const allTriggers = document.querySelectorAll('button[aria-haspopup="dialog"]');
      c.triggersTotal = allTriggers.length;
      c.triggersOutsideRail = Array.from(allTriggers).filter(t => !t.closest('[data-object-rail]'))
        .map(t => (t.getAttribute('aria-label') || t.innerText || '').trim().slice(0, 60));
      const rail = rails[0];
      c.railPresent = !!rail;
      const aside = rail ? rail.querySelector('aside[aria-label]') : null;
      c.asidePresent = !!aside;
      c.asideVisible = aside ? aside.offsetWidth > 0 && aside.offsetHeight > 0 : false;
      const bordered = aside ? aside.querySelector('.border') : null;
      c.borderedSurface = bordered ? getComputedStyle(bordered).borderTopWidth !== '0px' : false;
      if (aside) {
        const a = aside.getBoundingClientRect();
        c.asideRect = { x: Math.round(a.x), w: Math.round(a.width) };
        c.inRightPortion = a.x > window.innerWidth * 0.5;
        c.noViewportOverflow = a.x + a.width <= window.innerWidth + 1;
      }
      const headP = aside ? aside.querySelector('p') : null;
      c.featuredHeading = headP ? headP.innerText.trim().slice(0, 120) : null;
      c.asideTextSample = aside ? aside.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) : null;
      const trigger = rail ? rail.querySelector('.fyd-rail-auto-trigger button[aria-haspopup="dialog"]') : null;
      c.triggerInRail = !!trigger;
      c.triggerHiddenOnDesktop = trigger ? (getComputedStyle(trigger).display === 'none' || trigger.offsetParent === null) : null;
      c.triggerLabel = trigger ? (trigger.innerText || '').trim().slice(0, 60) : null;
      return c;
    });
    await page.screenshot({ path: path.join(OUT, `desktop-${site}.png`) });
    r.screenshot = `desktop-${site}.png`;
  } catch (e) { r.fatal = String(e.message || e).slice(0, 300); }
  await page.close();
  return r;
}

async function mobileChecks(ctx, site) {
  const r = { viewport: '390x844', checks: {}, errors: [] };
  const page = await ctx.newPage();
  page.on('pageerror', e => r.errors.push('pageerror: ' + String(e.message).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') r.errors.push('console: ' + m.text().slice(0, 160)); });
  page.on('response', resp => { if (resp.status() === 404) r.errors.push('404: ' + resp.url().slice(0, 120)); });
  try {
    await page.goto(`${BASE}/build/${site}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-object-rail] .fyd-rail-auto-trigger button[aria-haspopup="dialog"]', { timeout: 45000 });
    await sleep(1200);
    r.checks.trigger = await page.evaluate(() => {
      const t = document.querySelector('[data-object-rail] .fyd-rail-auto-trigger button[aria-haspopup="dialog"]');
      if (!t) return { present: false };
      const b = t.getBoundingClientRect();
      const vis = b.width > 0 && b.height > 0 && getComputedStyle(t).display !== 'none';
      return { present: true, visible: vis, w: Math.round(b.width), h: Math.round(b.height),
               min44: b.width >= 44 && b.height >= 44, fixed: getComputedStyle(t).position === 'fixed',
               label: (t.innerText || '').trim().slice(0, 80) };
    });
    // open the sheet
    await page.click('[data-object-rail] .fyd-rail-auto-trigger button[aria-haspopup="dialog"]');
    await page.waitForSelector('[data-object-rail] .fyd-rail-auto-trigger div[role="dialog"][aria-modal="true"]', { state: 'visible', timeout: 15000 });
    await sleep(800);
    r.checks.sheet = await page.evaluate(() => {
      const d = document.querySelector('[data-object-rail] .fyd-rail-auto-trigger div[role="dialog"][aria-modal="true"]');
      const head = d ? d.querySelector('h2') : null;
      return { opened: !!d && d.offsetHeight > 0,
               title: head ? head.innerText.trim().slice(0, 120) : null,
               bodySample: d ? d.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null };
    });
    await page.screenshot({ path: path.join(OUT, `sheet-open-${site}.png`) });
    // object-circle preview inside the sheet
    const previewBtn = await page.$('[data-object-rail] .fyd-rail-auto-trigger div[role="dialog"] button[aria-label^="Open preview for "]');
    if (previewBtn) {
      const label = await previewBtn.getAttribute('aria-label');
      await previewBtn.click();
      await sleep(900);
      const cardVisible = await page.evaluate(() => {
        const el = document.querySelector('[data-object-rail] .fyd-rail-auto-trigger div[aria-label^="Preview for "]');
        return el ? el.offsetHeight > 0 : false;
      });
      r.checks.objectCirclePreview = { button: label, cardOpened: cardVisible };
      await page.screenshot({ path: path.join(OUT, `preview-${site}.png`) });
      await page.keyboard.press('Escape');
      await sleep(600);
    } else {
      r.checks.objectCirclePreview = { button: null, note: 'no preview button found in sheet' };
    }
    // Escape closes the sheet and returns focus to the trigger
    // (re-open first if the preview Escape already closed it)
    let dialogOpen = await page.evaluate(() => {
      const d = document.querySelector('[data-object-rail] .fyd-rail-auto-trigger div[role="dialog"][aria-modal="true"]');
      return d ? d.offsetHeight > 0 : false;
    });
    if (!dialogOpen) {
      await page.click('[data-object-rail] .fyd-rail-auto-trigger button[aria-haspopup="dialog"]');
      await page.waitForSelector('[data-object-rail] .fyd-rail-auto-trigger div[role="dialog"][aria-modal="true"]', { state: 'visible', timeout: 15000 });
      await sleep(500);
    }
    await page.keyboard.press('Escape');
    await sleep(600);
    r.checks.escapeClose = await page.evaluate(() => {
      const d = document.querySelector('[data-object-rail] .fyd-rail-auto-trigger div[role="dialog"][aria-modal="true"]');
      const closed = !d || d.offsetHeight === 0;
      const ae = document.activeElement;
      const trigger = document.querySelector('[data-object-rail] .fyd-rail-auto-trigger button[aria-haspopup="dialog"]');
      return { dialogClosed: closed, focusReturnedToTrigger: ae === trigger,
               activeElement: (ae && (ae.getAttribute('aria-label') || ae.tagName)) || null };
    });
    await page.screenshot({ path: path.join(OUT, `mobile-${site}.png`) });
  } catch (e) { r.fatal = String(e.message || e).slice(0, 300); }
  await page.close();
  return r;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    for (const site of SITES) {
      const s = {};
      s.desktop = await desktopChecks(desktop, site);
      s.mobile = await mobileChecks(mobile, site);
      report.sites[site] = s;
    }
    await desktop.close(); await mobile.close();
  } finally { await browser.close(); }
  report.finished = new Date().toISOString();
  const p = path.join(OUT, 'report.json');
  fs.writeFileSync(p, JSON.stringify(report, null, 1));
  console.log('WROTE ' + p);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
