#!/usr/bin/env node
// Quick Facebook login-state check for the Pig's headless profile.
// Usage: node check_login.js  -> prints LOGIN ok | LOGIN logged_out
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const ctx = await chromium.launchPersistentContext('C:\\Users\\nolan\\.local\\share\\pigi\\fb-profile', {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  const loginForm = await page.$('input[name="email"], input#email');
  const feedMarker = await page.$('div[role="feed"], a[aria-label="Home"]');
  console.log(loginForm && !feedMarker ? 'LOGIN logged_out' : 'LOGIN ok');
  await ctx.close();
})().catch(e => { console.error('LOGIN error ' + String(e.message || e).slice(0, 200)); process.exit(1); });
