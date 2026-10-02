#!/usr/bin/env node
// Lane E part 2: customize flow proof on happy-place.
// propose -> proposal w/ digest -> approve -> applied to preview -> reload check -> revert.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUT_DIR = process.env.FYD_PROOF_OUT || 'C:/Users/nolan/.local/share/pigi/fyd-proof/out';
const BASE = 'http://100.79.154.43:3100';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { started: new Date().toISOString(), stages: [] };
function stage(name, ok, detail) {
  results.stages.push({ name, ok, detail, at: new Date().toISOString() });
  console.log(`STAGE ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
}
(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
  try {
    await page.goto(BASE + '/sites/happy-place', { waitUntil: 'networkidle', timeout: 45000 });
    await sleep(1000);

    // Capture the hero heading (the h1 inside the main content, not the demo header).
    const getHeroHeading = () => page.evaluate(() => {
      const h1s = [...document.querySelectorAll('main h1, section h1')];
      const hero = h1s.find(h => !h.textContent.includes('Generated site demo'));
      return hero ? hero.innerText.slice(0, 120) : 'NO-HERO-H1';
    });
    const heroBefore = await getHeroHeading();

    // Scroll to the customize section and propose a heading edit on home:Hero:0.
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('Customize this site'));
      if (el) el.scrollIntoView({ block: 'start' });
    });
    await sleep(800);
    const headingInput = page.locator('input[aria-label="Proposed heading for home:Hero:0"]');
    await headingInput.fill('Wave 2 Proof Heading');
    // Click the "Propose copy edit" button inside the same Hero card.
    const heroCard = page.locator('div', { has: headingInput }).first();
    await page.locator('div:has(> div > p:has-text("home:Hero:0")) button:has-text("Propose copy edit")').first().click({ timeout: 10000 }).catch(async () => {
      // fallback: click the propose button nearest the heading input
      const btns = page.locator('button:has-text("Propose copy edit")');
      await btns.first().click({ timeout: 10000 });
    });
    await sleep(1200);

    const proposalVisible = await page.locator('h3:has-text("Proposed change")').count();
    const digest = proposalVisible ? await page.locator('code.break-all').first().innerText().catch(() => '') : '';
    const proposalJson = proposalVisible ? await page.locator('pre').first().innerText().catch(() => '') : '';
    stage('customize:propose', proposalVisible > 0 && digest.length > 8,
      `proposalShown=${proposalVisible > 0} digestLen=${digest.length} jsonKeys=${proposalJson.slice(0, 120)}`);
    await page.screenshot({ path: path.join(OUT_DIR, 'customize-proposal.png') });

    // Approve and apply to preview.
    if (proposalVisible) {
      await page.locator('button:has-text("Approve and apply to preview")').click({ timeout: 10000 });
      await sleep(1200);
      const heroAfter = await getHeroHeading();
      const applied = heroAfter.includes('Wave 2 Proof Heading');
      stage('customize:approve-apply', applied, `before=${JSON.stringify(heroBefore.slice(0, 60))} after=${JSON.stringify(heroAfter.slice(0, 60))}`);
      await page.screenshot({ path: path.join(OUT_DIR, 'customize-applied.png') });

      // Reload: does the client-side approve persist?
      await page.reload({ waitUntil: 'networkidle', timeout: 45000 });
      await sleep(1200);
      const heroReload = await getHeroHeading();
      const persisted = heroReload.includes('Wave 2 Proof Heading');
      stage('customize:persists-reload', persisted,
        `afterReload=${JSON.stringify(heroReload.slice(0, 60))} persisted=${persisted} (client approve is preview-only by design; server persist needs demo-owner API)`);
      await page.screenshot({ path: path.join(OUT_DIR, 'customize-reloaded.png') });
    } else {
      stage('customize:approve-apply', false, 'no proposal to approve');
    }
    stage('customize:no-page-errors', errs.length === 0, `pageErrors=${errs.length}${errs[0] ? ' :: ' + errs[0] : ''}`);
  } catch (e) {
    stage('customize:flow', false, 'exception: ' + String(e.message || e).slice(0, 250));
  }
  await page.close();
  console.log('RESULT_JSON_BEGIN');
  console.log(JSON.stringify(results, null, 2));
  console.log('RESULT_JSON_END');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 500)); process.exit(1); });
