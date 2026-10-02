#!/usr/bin/env node
// CDP-attach LinkedIn login check: connects to the always-on headed Chrome on
// the Pig (remote-debugging-port 9224, li-profile) and reports LinkedIn login
// state. Never closes the browser. Never prints credentials.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BLOCK_RE = /checkpoint|verify your identity|unusual activity|temporarily restricted|captcha|account restricted/i;
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9224', { timeout: 15000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const probe = await page.evaluate(() => {
    const q = s => !!document.querySelector(s);
    const body = document.body.innerText;
    return {
      loginForm: q('#username') || q('[name="session_key"]'),
      // LinkedIn restyled to obfuscated classes (2026-09): data-testid is the stable hook.
      primaryNav: q('[data-testid="primary-nav"]'),
      textFallback: /My Network/.test(body) && /Messaging/.test(body) && /Nolan Geske/.test(body),
      body: body.slice(0, 3000),
    };
  });
  await page.close();
  // Do NOT close the browser; it must stay running.
  if (BLOCK_RE.test(probe.body)) { console.log('LOGIN blocked'); process.exit(2); }
  const loggedIn = !probe.loginForm && (probe.primaryNav || probe.textFallback);
  console.log(loggedIn ? 'LOGIN ok' : 'LOGIN logged_out');
  process.exit(0);
})().catch(e => { console.error('LOGIN error ' + String(e.message || e).slice(0, 200)); process.exit(1); });
