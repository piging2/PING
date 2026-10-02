#!/usr/bin/env node
// ig-login-check.js -- READ-ONLY Instagram login-state check for the Pig's ig-profile Chrome.
// Runs ON THE PIG (Windows node), connects over CDP :9226, finds the instagram.com tab,
// evaluates DOM only. No clicks, no navigation, no login attempts, no writes.
// Usage (from sandbox): pig_scp this file to the Pig, then run with the portable node:
//   & 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' 'C:/path/ig-login-check.js'
// Output: JSON {ok, state: logged_in|logged_out|no_instagram_tab|error, detail}
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9226', { timeout: 20000 });
  const contexts = browser.contexts();
  let target = null;
  for (const ctx of contexts) {
    for (const p of ctx.pages()) {
      const url = p.url();
      if (/instagram\.com/.test(url) && !/facebook\.com\/instagram\/login_sync/.test(url)) { target = p; break; }
    }
    if (target) break;
  }
  if (!target) { console.log(JSON.stringify({ ok: false, state: 'no_instagram_tab' })); await browser.close(); return; }
  const r = await target.evaluate(() => {
    const loginForm = !!document.querySelector('input[name="username"]');
    const homeNav = !!document.querySelector('a[aria-label="Home"], svg[aria-label="Home"]');
    return { url: location.href, loginForm, homeNav };
  });
  const loggedIn = !r.loginForm && r.homeNav;
  console.log(JSON.stringify({ ok: true, state: loggedIn ? 'logged_in' : 'logged_out', detail: r }));
  await browser.close();
})().catch(e => { console.log(JSON.stringify({ ok: false, state: 'error', detail: String(e.message || e).slice(0, 200) })); process.exit(1); });
