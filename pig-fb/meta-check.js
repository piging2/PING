// Check meta.ai login state in the Pig's Chrome via CDP. Read-only.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.goto('https://meta.ai/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(8000);
  // meta.ai often redirects (locale/login); let it settle, then read.
  let out = null;
  for (let i = 0; i < 4 && !out; i++) {
    try {
      out = await page.evaluate(() => {
    const text = document.body.innerText.slice(0, 2000);
    const hasChatInput = !!document.querySelector('textarea, [contenteditable="true"], input[placeholder*="Ask"]');
    const loginBtns = Array.from(document.querySelectorAll('button, a'))
      .map(e => (e.innerText || '').trim()).filter(t => /log in|sign up|continue with/i.test(t)).slice(0, 8);
    return { title: document.title, url: location.href, hasChatInput, loginBtns,
             bodyHead: text.slice(0, 500) };
      });
    } catch (e) { await sleep(5000); }
  }
  console.log(JSON.stringify(out || { error: 'could not read page' }, null, 2));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + e.message); process.exit(1); });
