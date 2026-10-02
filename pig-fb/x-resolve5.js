#!/usr/bin/env node
// READ-ONLY: resolve 5 approved follow targets to user IDs + follow state.
// Runs on the Pig (x-profile, CDP :9225). Navigation + DOM reads only.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'C:/Users/nolan/.local/share/pigi/x-tools/resolve5-result.json';
const TARGETS = ['emollick', 'elevenlabs', 'ElevenLabsDevs', 'si_pbc', 'kyutai_labs'];
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 20000 });
  const ctx = browser.contexts().find(c => c.pages().length) || browser.contexts()[0];
  const page = await ctx.newPage();
  const result = { checkedAt: new Date().toISOString(), targets: {} };
  for (const h of TARGETS) {
    try {
      await page.goto('https://x.com/' + h, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(5000);
      const html = await page.content();
      const m = html.match(/"rest_id"\s*:\s*"(\d+)"/);
      const state = await page.evaluate(() => {
        const els = [...document.querySelectorAll('[aria-label]')];
        for (const el of els) {
          const a = (el.getAttribute('aria-label') || '');
          if (/^following @/i.test(a)) return 'already_following';
          if (/^follow @/i.test(a)) return 'not_following';
        }
        return 'unknown';
      });
      result.targets[h.toLowerCase()] = { handle: h, user_id: m ? m[1] : null, follow_state: state };
      console.log('RESOLVED ' + h + ' id=' + (m ? m[1] : 'NONE') + ' state=' + state);
    } catch (e) {
      result.targets[h.toLowerCase()] = { handle: h, error: String((e && e.message) || e).slice(0, 120) };
      console.log('RESOLVED ' + h + ' ERROR');
    }
  }
  await page.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log('RESOLVE_DONE');
  process.exit(0);
})().catch(e => { console.error('RESOLVE_ERROR ' + String((e && e.message) || e).slice(0, 200)); process.exit(1); });
