// message-button-check.js -- READ-ONLY FB Page identity + Message-button check.
// Usage: node message-button-check.js targets.json
// targets.json: [{name, town, phone}]
// For each target: FB search "name town", collect up to 4 candidate Page links,
// visit each, record page name, address/phone signals, and whether a Message
// button exists. NEVER clicks Message buttons, never sends anything.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const targets = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const digits = s => (s || '').replace(/\D/g, '');

async function pageInfo(page) {
  return await page.evaluate(() => {
    const text = document.body ? document.body.innerText.replace(/\s+/g, ' ') : '';
    const buttons = [];
    document.querySelectorAll('[role="button"]').forEach(el => {
      const t = (el.innerText || '').trim();
      if (t && t.length < 40) buttons.push(t);
    });
    const msgBtn = buttons.some(t => /^(Message|Send message)$/i.test(t));
    const title = document.title || '';
    const phones = [...new Set((text.match(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/g) || []))].slice(0, 5);
    return { title, text: text.slice(0, 1200), buttons: [...new Set(buttons)].slice(0, 30), hasMessageButton: msgBtn, phones };
  });
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const results = [];
  for (const t of targets) {
    const res = { name: t.name, town: t.town, phone: t.phone, error: null, candidates: [] };
    const page = await ctx.newPage();
    try {
      const q = encodeURIComponent(t.name + ' ' + t.town);
      await page.goto('https://www.facebook.com/search/top?q=' + q, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(9000);
      const links = await page.evaluate(() => {
        const out = [];
        const seen = new Set();
        document.querySelectorAll('a[href]').forEach(a => {
          let href = a.getAttribute('href') || '';
          const text = (a.innerText || '').trim().replace(/\s+/g, ' ');
          if (!text || text.length > 90) return;
          if (href.startsWith('/')) href = 'https://www.facebook.com' + href;
          if (!href.startsWith('https://www.facebook.com/')) return;
          if (/(\/search|\/watch|\/reel|\/groups\/|\/events\/|\/marketplace)/.test(href)) return;
          const key = href.split('?')[0];
          if (seen.has(key)) return;
          seen.add(key);
          out.push({ href: key, text });
        });
        return out.slice(0, 60);
      });
      const cands = links.filter(l =>
        /\/pages\//.test(l.href) ||
        /profile\.php\?id=\d+/.test(l.href) ||
        /^https:\/\/www\.facebook\.com\/[A-Za-z0-9.]{3,60}$/.test(l.href)
      ).slice(0, 4);
      for (const c of cands) {
        try {
          await page.goto(c.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await sleep(7000);
          const info = await pageInfo(page);
          const nameHit = info.title.toLowerCase().includes(t.name.split(' ')[0].toLowerCase());
          const phoneHit = info.phones.some(p => digits(p).slice(-7) === digits(t.phone).slice(-7));
          const townHit = !!(t.town && info.text.toLowerCase().includes(t.town.toLowerCase()));
          res.candidates.push({
            url: c.href, linkText: c.text, pageTitle: info.title.slice(0, 100),
            hasMessageButton: info.hasMessageButton, buttons: info.buttons, phones: info.phones,
            nameHit, phoneHit, townHit,
            identity: phoneHit ? 'MATCH' : (nameHit && townHit ? 'LIKELY' : (nameHit ? 'NAME_ONLY' : 'NO'))
          });
          if (phoneHit) break;
        } catch (e) { res.candidates.push({ url: c.href, error: String(e.message || e).slice(0, 120) }); }
        await sleep(3000);
      }
    } catch (e) { res.error = String(e.message || e).slice(0, 200); }
    try { await page.close(); } catch (e) {}
    results.push(res);
    await sleep(4000);
  }
  fs.writeFileSync('C:/Users/nolan/fb-page-check/results-round146.json', JSON.stringify(results, null, 1));
  console.log(JSON.stringify(results.map(r => ({
    name: r.name, error: r.error,
    candidates: r.candidates.map(c => ({ url: c.url, identity: c.identity, hasMessageButton: c.hasMessageButton, phones: c.phones }))
  })), null, 1));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
