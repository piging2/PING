#!/usr/bin/env node
// Lane E: live browser proof for FYD demo sites.
// Runs ON THE PIG (Windows) via node.exe, connects to the always-on headed
// Chrome on CDP :9223 (fb-profile). Opens NEW tabs only; never touches
// existing tabs; closes every tab it opens.
// Usage: node lane-e-proof.js
// Output: JSON results to stdout; screenshots to OUT_DIR.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUT_DIR = process.env.FYD_PROOF_OUT || 'C:/Users/nolan/.local/share/pigi/fyd-proof/out';
const WSL_IP = process.env.FYD_WSL_IP || '';
const BASES = ['http://127.0.0.1:3100', 'http://100.79.154.43:3100']
  .concat(WSL_IP ? ['http://' + WSL_IP + ':3100'] : []);
const SITES = [
  { id: 'happy-place', path: '/sites/happy-place', expectHeroMedia: false },
  { id: 'coppersmith-plumbing', path: '/sites/coppersmith-plumbing', expectHeroMedia: true },
];
const VIEWPORTS = [
  { name: 'desktop-1280', w: 1280, h: 800 },
  { name: 'mobile-375', w: 375, h: 667 },
  { name: 'mobile-390', w: 390, h: 844 },
];
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

  // Resolve which base URL the Windows Chrome can reach (fresh page per candidate).
  let BASE = null;
  for (const b of BASES) {
    const p = await ctx.newPage();
    try {
      const r = await p.goto(b + '/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (r && r.ok()) { BASE = b; await p.close(); break; }
    } catch (e) { /* try next */ }
    await p.close();
  }
  stage('base-url-reachable', !!BASE, BASE || 'no base reachable from Windows Chrome');
  if (!BASE) { console.log(JSON.stringify(results, null, 2)); process.exit(2); }

  for (const site of SITES) {
    for (const vp of VIEWPORTS) {
      const tag = `${site.id}@${vp.name}`;
      const page = await ctx.newPage();
      await page.setViewportSize({ width: vp.w, height: vp.h });
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', m => {
        if (m.type() === 'error' && !/_next\/webpack-hmr/.test(m.text())) consoleErrors.push(m.text().slice(0, 300));
      });
      page.on('pageerror', e => pageErrors.push(String(e.message || e).slice(0, 300)));
      try {
        const resp = await page.goto(BASE + site.path, { waitUntil: 'networkidle', timeout: 45000 });
        await sleep(1500);
        const info = await page.evaluate(() => ({
          title: document.title,
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          heroImgs: [...document.querySelectorAll('img')].filter(i => (i.src || '').includes('fyd-media') && i.getBoundingClientRect().top < 900).map(i => ({ src: i.src.slice(-60), alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })),
          askFyd: !!document.querySelector('#ask-fyd-question'),
          customize: document.body.innerText.includes('Customize this site'),
          whyThis: [...document.querySelectorAll('summary')].filter(s => s.textContent.includes('Why this?')).length,
        }));
        if (vp.w < 768) {
          info.touchTargets = await page.evaluate(() => {
            const bad = [];
            for (const el of document.querySelectorAll('button, a')) {
              const r = el.getBoundingClientRect();
              if (r.width === 0 && r.height === 0) continue;
              if (r.width < 44 || r.height < 44) bad.push(((el.innerText || el.getAttribute('aria-label') || el.tagName) + '').slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
              if (bad.length >= 8) break;
            }
            return bad;
          });
        } else { info.touchTargets = []; }
        const overflow = info.scrollW > info.clientW + 1;
        const heroOk = site.expectHeroMedia ? info.heroImgs.length > 0 : info.heroImgs.length === 0;
        const touchOk = info.touchTargets.length === 0;
        await page.screenshot({ path: path.join(OUT_DIR, `${tag}.png`) });
        stage(`load:${tag}`, resp && resp.ok() && !overflow && heroOk && touchOk && consoleErrors.length === 0 && pageErrors.length === 0,
          `http=${resp && resp.status()} overflow=${overflow} heroMedia=${info.heroImgs.length} (expect ${site.expectHeroMedia}) consoleErr=${consoleErrors.length} pageErr=${pageErrors.length} askFyd=${info.askFyd} customize=${info.customize} whyThis=${info.whyThis} touchBad=${info.touchTargets.length}` +
          (consoleErrors.length ? ` ERR1=${consoleErrors[0]}` : '') +
          (info.touchTargets.length ? ` TOUCH1=${info.touchTargets[0]}` : ''));
      } catch (e) {
        stage(`load:${tag}`, false, 'exception: ' + String(e.message || e).slice(0, 200));
      }
      await page.close();
    }
  }

  // Ask FYD factual questions on happy-place desktop.
  // Q1: services (may honestly decline); Q2: phone number (must answer with evidence, per Wave 1 proof).
  async function askFyd(page, q) {
    await page.fill('#ask-fyd-question', q);
    await page.click('form[aria-label="Ask FYD"] button[type="submit"]');
    await page.waitForFunction(() => {
      const el = document.querySelector('div[aria-live="polite"]');
      return el && el.innerText.trim().length > 40 && !/thinking|loading/i.test(el.innerText);
    }, { timeout: 60000 });
    await sleep(1000);
    return await page.evaluate(() => document.querySelector('div[aria-live="polite"]').innerText.slice(0, 800));
  }
  {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    try {
      await page.goto(BASE + '/sites/happy-place', { waitUntil: 'networkidle', timeout: 45000 });
      const a1 = await askFyd(page, 'What services does Happy Place Carpentry offer?');
      const honest1 = /do not have evidence|don't know|do not know|unknown/i.test(a1);
      const a2 = await askFyd(page, 'What is the phone number for Happy Place Carpentry?');
      const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(a2);
      const cites2 = /websit|evidence|sourc|statemen/i.test(a2);
      await page.screenshot({ path: path.join(OUT_DIR, 'ask-fyd-happy-place.png') });
      stage('ask-fyd:services', a1.length > 40, `len=${a1.length} honestUnknown=${honest1} :: ${a1.slice(0, 160)}`);
      stage('ask-fyd:phone', hasPhone, `len=${a2.length} hasPhone=${hasPhone} citesEvidence=${cites2} :: ${a2.slice(0, 200)}`);
    } catch (e) {
      stage('ask-fyd:questions', false, 'exception: ' + String(e.message || e).slice(0, 200));
    }
    await page.close();
  }

  console.log('RESULT_JSON_BEGIN');
  console.log(JSON.stringify(results, null, 2));
  console.log('RESULT_JSON_END');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 500)); process.exit(1); });
