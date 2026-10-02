#!/usr/bin/env node
// fb-diag-following.js -- READ-ONLY: dump ancestor structure for the first 3
// post-heading profile links on the Pages dashboard Followed Pages view.
// Usage: node fb-diag-following.js <out.json>
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const outPath = process.argv[2] || 'fb-diag.result.json';
  const write = (o) => fs.writeFileSync(outPath, JSON.stringify(o, null, 2));
  let browser;
  try { browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 }); }
  catch (e) { write({ ok: false, note: 'cdp fail ' + String(e.message || e).slice(0, 150) }); process.exit(3); }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    await page.goto('https://www.facebook.com/pages/?category=liked&ref=bookmarks', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
      await sleep(1200);
    }
    const diag = await page.evaluate(() => {
      const isProfileLink = (href) => {
        if (/^https:\/\/(www\.)?facebook\.com\/profile\.php\?id=\d+/.test(href)) return true;
        if (!/^https:\/\/(www\.)?facebook\.com\/[^/?#]+$/.test(href)) return false;
        return !/messages|settings|help|marketplace|gaming|watch|groups|events|notifications|bookmarks|saved/.test(href);
      };
      let headingNode = null;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (/all pages you follow/i.test(n.nodeValue || '')) { headingNode = n; break; }
      }
      const links = Array.from(document.querySelectorAll('a[href]')).filter(a => isProfileLink(a.href || ''));
      const after = headingNode ? links.filter(a => {
        try { return (a.compareDocumentPosition(headingNode) & Node.DOCUMENT_POSITION_PRECEDING) !== 0; }
        catch (e) { return true; }
      }) : links;
      const sample = after.slice(0, 3).map(a => {
        const chain = [];
        let el = a;
        for (let d = 0; d < 6 && el; d++) {
          el = el.parentElement;
          if (!el) break;
          const t = (el.innerText || '');
          chain.push({ tag: el.tagName, textLen: t.length, head: t.slice(0, 90).replace(/\n/g, ' | ') });
        }
        return { href: a.href, linkText: (a.innerText || '').slice(0, 60), chain };
      });
      // also: how is "Following" rendered on rows?
      const followingBtns = Array.from(document.querySelectorAll('*')).filter(e => {
        const t = ((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || '')).trim();
        return /^following$/i.test(t) && e.children.length === 0;
      }).slice(0, 3).map(e => ({ tag: e.tagName, aria: e.getAttribute('aria-label') || '' }));
      return { url: location.href, headingFound: !!headingNode, linkCount: links.length, afterCount: after.length, sample, followingBtns };
    }).catch(e => ({ error: String(e).slice(0, 300) }));
    await page.close().catch(() => {});
    write({ ok: true, diag });
    console.log('RESULT diag done');
    process.exit(0);
  } catch (e) {
    write({ ok: false, note: 'exception ' + String(e.message || e).slice(0, 300) });
    process.exit(5);
  }
})();
