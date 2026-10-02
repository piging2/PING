#!/usr/bin/env node
// Debug: report what facebook.com shows in the Pig's headless profile + screenshot.
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
  await sleep(6000);
  console.log('TITLE: ' + await page.title());
  console.log('URL: ' + page.url());
  const html = await page.content();
  console.log('HAS login form: ' + /name="email"|id="email"/.test(html));
  console.log('HAS feed marker: ' + /role="feed"|aria-label="Home"/.test(html));
  console.log('BODY SNIPPET: ' + (await page.evaluate(() => document.body.innerText.slice(0, 600))).replace(/\n+/g, ' | '));
  await page.screenshot({ path: 'C:\\Users\\nolan\\.local\\share\\pigi\\fb-engage\\dbg.png', fullPage: false });
  console.log('screenshot saved');
  await ctx.close();
})().catch(e => { console.error('ERR ' + String(e.message || e).slice(0, 200)); process.exit(1); });
