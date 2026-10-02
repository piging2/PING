#!/usr/bin/env node
// Diagnostic: dump URL, title, and key markers from x.com/home via CDP :9225.
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
  console.log('URL: ' + page.url());
  console.log('TITLE: ' + (await page.title()));
  console.log('has flow/login: ' + /\/i\/flow\/login/.test(page.url()));
  console.log('has Home timeline aria: ' + /aria-label="Home timeline"/.test(html));
  console.log('has Log in to X: ' + /Log in to X/.test(html));
  console.log('has New to X?: ' + /New to X\?/.test(html));
  console.log('has Something went wrong: ' + /Something went wrong/.test(html));
  const bodyText = (await page.evaluate(() => document.body ? document.body.innerText.slice(0, 400) : 'NO BODY')).replace(/\s+/g, ' ');
  console.log('BODY400: ' + bodyText);
  await page.close();
  process.exit(0);
})().catch(e => { console.error('DIAG error ' + String(e.message || e).slice(0, 200)); process.exit(1); });
