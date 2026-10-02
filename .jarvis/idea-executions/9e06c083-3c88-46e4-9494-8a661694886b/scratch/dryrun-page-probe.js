// dryrun-page-probe.js -- READ-ONLY Sunday-post dry-run probe (runs on the Pig).
// Opens the PING Social Page in the always-on headed Chrome (CDP :9223),
// checks the page loads logged-in, and searches the timeline for the
// Sunday candidate caption snippet (duplicate check). NEVER clicks,
// never opens the composer, never posts. Closes only its own tab.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const out = {};
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const ctx = browser.contexts().find(c => c.pages().length) || browser.contexts()[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://www.facebook.com/profile.php?id=61594275542163',
      { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    out.pageUrl = page.url();
    out.title = await page.title().catch(() => '');
    const body0 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400)).catch(() => '');
    out.loggedOut = /name="email"/.test(body0) && !/PING Social/.test(body0);
    const probe = 'Every shop has a front desk, even if the';
    let found = false;
    for (let i = 0; i < 6; i++) {
      found = await page.evaluate(p => document.body.innerText.includes(p), probe).catch(() => false);
      if (found) break;
      await page.mouse.wheel(0, 900);
      await sleep(2500);
    }
    out.duplicateSnippetFound = found;
    out.bodyHead = body0;
  } catch (e) { out.error = String(e.message || e).slice(0, 200); }
  await page.close().catch(() => {});
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
