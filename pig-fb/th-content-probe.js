#!/usr/bin/env node
// th-content-probe.js -- READ-ONLY Threads content + control-grounding probe.
// Navigates only; never clicks engagement controls, never logs in.
// Usage: node th-content-probe.js <job.json>
// job.json: { "urls": ["https://www.threads.com/@x/post/CODE/", ...], "resultFile": "..." }
// Writes result JSON and prints it. Exit codes: 0 ok, 2 usage, 3 CDP down, 5 worker error.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const BAD = /checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated|suspicious activity|try again later|something went wrong|rate limit|captcha|confirm you'?re a person|unusual activity/i;

(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = { ok: true, probe: 'threads_content', items: [] };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable', detail: String(e.message).slice(0,150) })); process.exit(3); }
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  for (const url of job.urls) {
    const item = { url, loaded: false, err: '', challenge: false, post_text: '', like: null, reply: null };
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(6000);
      item.loaded = true;
      item.final_url = page.url().slice(0, 160);
      const r = await page.evaluate(() => {
        const body = document.body.innerText || '';
        const art = document.querySelector('article');
        const artText = art ? (art.innerText || '') : '';
        const ctl = (re) => Array.from(document.querySelectorAll('button, [role="button"], div[tabindex]'))
          .filter(e => re.test(e.getAttribute('aria-label') || '') && e.getBoundingClientRect().width > 0)
          .map(e => ({
            tag: e.tagName.toLowerCase(),
            role: e.getAttribute('role'),
            aria: e.getAttribute('aria-label'),
            pressed: e.getAttribute('aria-pressed'),
            testid: e.getAttribute('data-testid'),
            cls: (e.getAttribute('class') || '').split(' ').slice(0, 4).join('.'),
          }));
        return {
          body_head: body.replace(/\s+/g, ' ').slice(0, 300),
          article_text: artText.replace(/\s+/g, ' ').slice(0, 900),
          like_ctls: ctl(/^like$/i).concat(ctl(/like$/i)).slice(0, 4),
          reply_ctls: ctl(/^reply$/i).concat(ctl(/reply$/i)).slice(0, 4),
          login_cta: /log in to threads|log in to see/i.test(body),
        };
      });
      item.challenge = BAD.test(r.body_head + ' ' + r.article_text);
      item.login_cta = r.login_cta;
      item.post_text = r.article_text;
      item.body_head = r.body_head;
      item.like = r.like_ctls;
      item.reply = r.reply_ctls;
    } catch (e) { item.err = String(e.message || e).slice(0, 200); }
    out.items.push(item);
    await sleep(4000);
  }
  // @karpathy verified-badge check (profile page, read-only)
  try {
    await page.goto('https://www.threads.com/@karpathy', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    out.karpathy = await page.evaluate(() => {
      const body = document.body.innerText || '';
      const badge = Array.from(document.querySelectorAll('svg')).some(s =>
        /verified/i.test(s.getAttribute('aria-label') || '') || /verified/i.test(s.innerHTML.slice(0, 300))) ||
        Array.from(document.querySelectorAll('[title]')).some(e => /verified/i.test(e.getAttribute('title') || ''));
      const h1 = (document.querySelector('h1') || {}).innerText || '';
      return { badge_detected: badge, h1: h1.slice(0, 80), missing: /sorry,? this page isn't available/i.test(body), followers_hint: (body.match(/[\d.,KM]+ followers/i) || [''])[0] };
    });
  } catch (e) { out.karpathy = { err: String(e.message).slice(0, 150) }; }
  try { await page.close(); } catch (_) {}
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
