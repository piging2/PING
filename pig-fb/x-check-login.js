#!/usr/bin/env node
// CDP-attach login check: connects to the Pig's dedicated X headed Chrome
// (x-profile, remote-debugging-port 9225) and reports X login state.
// Read-only: opens one page, reads it, reports. Never interacts, never closes the browser.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 15000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const html = await page.content();
  // Positive signal: the home timeline marker only renders for a logged-in session.
  // (Validated live 2026-09-13: x-profile shows "Home timeline" for @GeskeNolan.)
  const loggedIn = /aria-label="Home timeline"/.test(html);
  console.log(loggedIn ? 'LOGIN ok' : 'LOGIN logged_out');
  await page.close();
  // Do NOT close the browser; it must stay running.
  process.exit(0);
})().catch(e => { console.error('LOGIN error ' + String(e.message || e).slice(0, 200)); process.exit(1); });
