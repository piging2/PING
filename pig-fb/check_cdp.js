#!/usr/bin/env node
// CDP-attach login check: connects to the always-on headed Chrome on the Pig
// (remote-debugging-port 9223) and reports Facebook login state. Never closes it.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 15000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const html = await page.content();
  const loggedOut = /name="email"|id="email"/.test(html) && !/role="feed"|aria-label="Home"/.test(html);
  console.log(loggedOut ? 'LOGIN logged_out' : 'LOGIN ok');
  await page.close();
  // Do NOT close the browser; it must stay running.
  process.exit(0);
})().catch(e => { console.error('LOGIN error ' + String(e.message || e).slice(0, 200)); process.exit(1); });
