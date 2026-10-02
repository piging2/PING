// mkt-groups-diag4.js — find the Avalon title node, walk up ancestors, report structure.
const WORKDIR = 'C:/Users/nolan/transfer/mkt-groups/';
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const TITLE = '2008 Toyota Avalon XLS, only ~61k miles';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const say = (m) => { log.push(m); console.log('DIAG4 ' + m); };

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
  const searchBox = page.getByPlaceholder(/search your listings/i).first();
  if (await searchBox.count().catch(() => 0) > 0) {
    await searchBox.click({ timeout: 10000 }).catch(() => {});
    await searchBox.fill('Avalon').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await sleep(4000);
  }
  const info = await page.evaluate((title) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n, found = null;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.includes(title)) { found = n.parentElement; break; }
    }
    if (!found) return { found: false, bodyLen: document.body.innerText.length, hasAvalonAnywhere: document.body.innerText.includes('Avalon') };
    const chain = [];
    let el = found;
    for (let i = 0; i < 8 && el && el !== document.body; i++) {
      const r = el.getBoundingClientRect();
      chain.push({ tag: el.tagName, role: el.getAttribute('role'), aria: (el.getAttribute('aria-label') || '').slice(0, 50), w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 });
      el = el.parentElement;
    }
    return { found: true, chain };
  }, TITLE).catch(e => ({ err: (e.message || e).slice(0, 80) }));
  say('info: ' + JSON.stringify(info, null, 1).slice(0, 1500));
  await page.screenshot({ path: WORKDIR + 'diag4-shot.png' }).catch(() => {});
  fs.writeFileSync(WORKDIR + 'mkt-groups-diag4.log', log.join('\n'));
  say('done');
  process.exit(0);
})().catch(e => { say('FATAL ' + (e.message || e).slice(0, 150)); process.exit(9); });
