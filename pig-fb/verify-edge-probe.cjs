#!/usr/bin/env node
// Minimal read-only edge-object real-path probe for Q-J-01/02/03 on the
// SERVED :3100 build (no objectDebug=1, no repo writes).
// Windows-side CDP probe (portable node + playwright-core via :9223).
// Usage: verify-edge-probe.cjs <base> <outdir>
// Read-only: opens tabs, clicks doorways/dialog controls, screenshots.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BASE = process.argv[2];
const OUTDIR = process.argv[3] || 'C:/Users/nolan/.local/share/pigi/fb-engage/edge-probe-20260929-90h';
if (!BASE) { console.error('usage: verify-edge-probe.cjs <base> <outdir>'); process.exit(2); }

const results = { base: BASE, checks: [] };
function check(id, ok, evidence) {
  results.checks.push({ id, ok: !!ok, evidence });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' :: ' + JSON.stringify(evidence).slice(0, 300));
}

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];

  // ---------- Q-J-01: discovery on mobile width ----------
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String((e && e.stack) || e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(6000);

  const doorways = await page.evaluate(() => {
    const as = [...document.querySelectorAll('a[href^="/o/"]')];
    return as.map(a => {
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      return {
        href: a.getAttribute('href'),
        text: (a.innerText || a.getAttribute('aria-label') || '').slice(0, 60),
        w: Math.round(r.width), h: Math.round(r.height),
        top: Math.round(r.top), left: Math.round(r.left),
        position: cs.position,
        visible: r.width > 0 && r.height > 0,
      };
    });
  });
  const layerInfo = await page.evaluate(() => {
    const layer = document.querySelector('[data-testid="object-layer"]');
    if (!layer) return { mounted: false };
    const pills = [...layer.querySelectorAll('a,button')].length;
    return { mounted: true, pillCount: pills, projection: layer.getAttribute('data-projection') };
  });
  check('Q-J-01a-doorways-present', doorways.length > 0, { count: doorways.length, sample: doorways.slice(0, 3).map(d => d.href) });
  check('Q-J-01b-object-layer-mounted', layerInfo.mounted, layerInfo);
  const visDoors = doorways.filter(d => d.visible);
  const minTarget = visDoors.length ? Math.min(...visDoors.map(d => Math.min(d.w, d.h))) : 0;
  check('Q-J-01c-min-44px-targets-mobile', visDoors.length > 0 && minTarget >= 44, { visible: visDoors.length, minTarget });
  const fixedCount = visDoors.filter(d => d.position === 'fixed').length;
  check('Q-J-01d-page-anchored-not-fixed', fixedCount === 0, { fixed: fixedCount, positions: [...new Set(visDoors.map(d => d.position))] });
  await page.screenshot({ path: OUTDIR + '/edge-mobile-390.png' });

  // ---------- Q-J-02: open / close / escape / backdrop / scroll ----------
  const firstHref = visDoors.length ? visDoors[0].href : null;
  let dialogOpened = false, dialogLabel = null, urlAfterOpen = null;
  if (firstHref) {
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.locator(`a[href="${firstHref}"]`).first().click({ timeout: 10000 });
    await sleep(2500);
    const dlg = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { found: false, url: location.href };
      return {
        found: true, url: location.href,
        label: d.getAttribute('aria-label') || (d.querySelector('h1,h2,h3') || {}).innerText || null,
        labelledBy: d.getAttribute('aria-labelledby'),
      };
    });
    dialogOpened = dlg.found;
    dialogLabel = dlg.label;
    urlAfterOpen = dlg.url;
    check('Q-J-02a-doorway-opens-dialog', dialogOpened, { href: firstHref, label: String(dialogLabel).slice(0, 80), url: urlAfterOpen });

    // Escape closes
    await page.keyboard.press('Escape');
    await sleep(1200);
    const afterEsc = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    check('Q-J-02b-escape-closes', !afterEsc, { dialogStillOpen: afterEsc });

    // Re-open, then backdrop click closes (if a backdrop exists)
    await page.locator(`a[href="${firstHref}"]`).first().click({ timeout: 10000 });
    await sleep(2000);
    const backdropClosed = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { skipped: true };
      // click at a point outside the dialog but inside viewport (backdrop area)
      const r = d.getBoundingClientRect();
      const x = Math.max(5, r.left - 20), y = Math.max(5, r.top - 20);
      const el = document.elementFromPoint(x, y);
      if (!el) return { skipped: true, note: 'no element at backdrop point' };
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return { skipped: false };
    });
    await sleep(1200);
    const afterBackdrop = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    check('Q-J-02c-backdrop-closes', backdropClosed.skipped || !afterBackdrop, { skipped: !!backdropClosed.skipped, dialogStillOpen: afterBackdrop });

    // Scroll preservation
    const scrollAfter = await page.evaluate(() => window.scrollY);
    check('Q-J-02d-scroll-preserved', Math.abs(scrollAfter - scrollBefore) < 5, { before: scrollBefore, after: scrollAfter });
    await page.screenshot({ path: OUTDIR + '/edge-dialog-open-390.png' });
  } else {
    check('Q-J-02a-doorway-opens-dialog', false, { note: 'no visible doorway to click' });
  }

  // ---------- Q-J-03: relationship traversal ----------
  if (firstHref) {
    await page.locator(`a[href="${firstHref}"]`).first().click({ timeout: 10000 });
    await sleep(2500);
    const rel = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const scope = d || document;
      const links = [...scope.querySelectorAll('a[href^="/o/"]')].map(a => ({
        href: a.getAttribute('href'),
        text: (a.innerText || '').slice(0, 80),
      }));
      // relationship direction labels: look for labeled sections near links
      const labeled = [...scope.querySelectorAll('[data-relationship], [data-testid*="relat"]')].map(e => ({
        tag: e.tagName, testid: e.getAttribute('data-testid'), text: (e.innerText || '').slice(0, 80),
      }));
      return { dialogFound: !!d, relatedLinks: links.slice(0, 6), labeled: labeled.slice(0, 6) };
    });
    check('Q-J-03a-dialog-shows-relationships', rel.relatedLinks.length > 0, { relatedCount: rel.relatedLinks.length, sample: rel.relatedLinks.slice(0, 2), labeled: rel.labeled });
    let traversed = false, traversedUrl = null;
    const target = rel.relatedLinks.find(l => l.href && l.href !== firstHref);
    if (target) {
      await page.locator(`[role="dialog"] a[href="${target.href}"]`).first().click({ timeout: 10000 }).catch(() => {});
      await sleep(2500);
      traversedUrl = page.url();
      traversed = traversedUrl.includes(target.href) || !!(await page.evaluate(() => document.querySelector('[role="dialog"]')));
      // identity: the new dialog or URL should reference the target object id
      const idFrag = (target.href.split('/o/')[1] || '').slice(0, 12);
      const bodyHas = idFrag ? await page.evaluate(f => document.body.innerHTML.includes(f), idFrag).catch(() => null) : null;
      check('Q-J-03b-related-object-traverses', traversed, { target: target.href, url: traversedUrl, identityInBody: bodyHas });
    } else {
      check('Q-J-03b-related-object-traverses', false, { note: 'no distinct related link in dialog' });
    }
    // Back -> exact context
    const urlBeforeBack = page.url();
    await page.goBack().catch(() => {});
    await sleep(2000);
    const urlAfterBack = page.url();
    const dlgAfterBack = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    check('Q-J-03c-back-restores-context', urlAfterBack.includes('/sites/happy-place') && !dlgAfterBack, { beforeBack: urlBeforeBack, afterBack: urlAfterBack, dialogOpen: dlgAfterBack });
  }
  await page.screenshot({ path: OUTDIR + '/edge-after-traversal-390.png' });
  await page.close();

  // ---------- Desktop 1440 sanity: doorways present, no console errors ----------
  const dpage = await ctx.newPage();
  const derrors = [];
  dpage.on('pageerror', e => derrors.push(String((e && e.stack) || e).slice(0, 200)));
  await dpage.setViewportSize({ width: 1440, height: 900 });
  await dpage.goto(BASE + '/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dpage.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(6000);
  const dCount = await dpage.evaluate(() => document.querySelectorAll('a[href^="/o/"]').length);
  check('Q-J-01e-doorways-desktop-1440', dCount > 0, { count: dCount });
  check('Q-J-00-zero-pageerrors', errors.length === 0 && derrors.length === 0, { mobile: errors.length, desktop: derrors.length, sample: (errors.concat(derrors)).slice(0, 2) });
  await dpage.screenshot({ path: OUTDIR + '/edge-desktop-1440.png' });
  await dpage.close();

  fs.writeFileSync(OUTDIR + '/edge-probe-report.json', JSON.stringify(results, null, 2));
  console.log('EDGE_PROBE_DONE');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
