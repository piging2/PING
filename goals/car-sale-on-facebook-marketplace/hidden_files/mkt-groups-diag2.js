// mkt-groups-diag2.js — deeper diagnostic: scroll, find Avalon row, inspect DOM roles.
const WORKDIR = 'C:/Users/nolan/transfer/mkt-groups/';
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const say = (m) => { log.push(new Date().toISOString().slice(11, 19) + ' ' + m); console.log('DIAG2 ' + m); };

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  let page = null;
  for (const c of browser.contexts()) for (const p of c.pages()) {
    const u = p.url();
    if (u.includes('facebook.com') && !u.includes('messenger.com')) { page = p; break; }
  }
  if (!page) { say('NO FB PAGE'); process.exit(2); }
  await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(6000);

  // scroll the main scrollable area several times
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollBy(0, 800)).catch(() => {});
    await sleep(1200);
  }
  say('after scroll, url=' + page.url().slice(0, 100));

  // 1. any text containing Avalon?
  const avalon = await page.evaluate(() => {
    const els = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (/avalon/i.test(n.nodeValue)) {
        const el = n.parentElement;
        els.push({ tag: el.tagName, role: el.getAttribute('role'), text: n.nodeValue.trim().slice(0, 60) });
        if (els.length > 10) break;
      }
    }
    return els;
  }).catch(e => [{ err: (e.message || e).slice(0, 80) }]);
  say('avalon text hits: ' + JSON.stringify(avalon).slice(0, 600));

  // 2. what roles do listing rows use now?
  const roles = await page.evaluate(() => {
    const out = {};
    for (const r of ['row', 'listitem', 'article']) out[r] = document.querySelectorAll('[role="' + r + '"]').length;
    out.links_to_marketplace_item = document.querySelectorAll('a[href*="/marketplace/item/"]').length;
    return out;
  }).catch(e => ({ err: 1 }));
  say('role counts: ' + JSON.stringify(roles));

  // 3. list marketplace item links visible
  const items = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href*="/marketplace/item/"]')].slice(0, 12);
    return a.map(el => ({ href: el.getAttribute('href').slice(0, 80), text: (el.innerText || '').slice(0, 60).replace(/\n/g, ' | ') }));
  }).catch(() => []);
  say('item links: ' + JSON.stringify(items).slice(0, 800));

  // 4. tab/section labels on the page
  const tabs = await page.evaluate(() => {
    return [...document.querySelectorAll('[role="tab"]')].map(el => (el.innerText || '').trim().slice(0, 30));
  }).catch(() => []);
  say('tabs: ' + JSON.stringify(tabs));

  await page.screenshot({ path: WORKDIR + 'diag2-shot.png' }).catch(() => {});
  fs.writeFileSync(WORKDIR + 'mkt-groups-diag2.log', log.join('\n'));
  say('done');
  process.exit(0);
})().catch(e => { say('FATAL ' + (e.message || e).slice(0, 200)); process.exit(9); });
