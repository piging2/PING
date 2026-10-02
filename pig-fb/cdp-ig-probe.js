// READ-ONLY probe: connectOverCDP to the ig-profile Chrome (:9226), report, exit. No navigation, no actions.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9226', { timeout: 20000 });
  const ctxs = browser.contexts();
  const pages = ctxs.reduce((n, c) => n + c.pages().length, 0);
  const titles = [];
  for (const c of ctxs) for (const p of c.pages()) { try { titles.push(await p.title().catch(() => '?')); } catch (e) {} }
  console.log(JSON.stringify({ ok: true, contexts: ctxs.length, pages, titles: titles.slice(0, 8) }));
  await browser.close();
  process.exit(0);
})().catch(e => { console.error(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 160) })); process.exit(1); });
