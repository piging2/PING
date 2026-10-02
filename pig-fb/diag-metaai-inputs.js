#!/usr/bin/env node
// Read-only diagnostic: enumerate candidate input elements on the NEWEST
// meta.ai prompt tab and report where typed text is actually landing.
// Never clicks, types, navigates, or closes anything.
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 15000 });
  const contexts = browser.contexts();
  const metas = [];
  for (const ctx of contexts) for (const p of ctx.pages()) {
    if (/meta\.ai\/prompt\//.test(p.url())) metas.push(p);
  }
  if (!metas.length) { console.error('no meta.ai prompt tab'); process.exit(1); }
  // newest = last in list order is unreliable; evaluate all
  for (const page of metas) {
    const info = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[contenteditable="true"], textarea, input[type="text"], [role="textbox"]'));
      const a = document.activeElement;
      return {
        url: location.href.slice(-36),
        candidates: els.map(e => ({
          tag: e.tagName,
          role: e.getAttribute('role'),
          editable: e.getAttribute('contenteditable'),
          placeholder: e.getAttribute('placeholder'),
          ariaLabel: e.getAttribute('aria-label'),
          textLen: (e.innerText || e.value || '').length,
          textStart: ((e.innerText || e.value || '').slice(0, 60)),
          visible: !!(e.offsetParent),
          isActive: e === a,
        })),
        activeTag: a ? a.tagName : null,
        activeIsCandidate: els.includes(a),
      };
    }).catch(e => ({ error: String(e).slice(0, 150) }));
    console.log(JSON.stringify(info, null, 1));
  }
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
