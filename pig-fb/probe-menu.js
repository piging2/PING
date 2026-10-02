#!/usr/bin/env node
// READ-ONLY probe: diagnose why fb-unfollow.js cannot find the "Unfollow"
// menu option on certain destination Pages.
// Opens the Following menu on ONE destination page, dumps the menu DOM,
// and closes the tab. NEVER clicks Unfollow or any other menu item.
const fs = require('fs');
const { chromium } = require('playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TARGET = process.argv[2] || 'https://www.facebook.com/deeplearningng';
const OUT = 'C:/Users/nolan/.local/share/pigi/fb-engage/probe-menu-result.json';

(async () => {
  const diag = { target: TARGET, steps: [] };
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  } catch (e) {
    diag.error = 'CDP attach failed: ' + String(e.message || e).slice(0, 200);
    fs.writeFileSync(OUT, JSON.stringify(diag, null, 2));
    console.log(JSON.stringify(diag));
    process.exit(3);
  }
  const step = (name, data) => diag.steps.push({ name, ...data });
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);

    // login sanity
    const html = await page.content();
    const loggedIn = !(/name="email"|id="email"/.test(html) && !/role="feed"/.test(html));
    step('login', { loggedIn, title: (await page.title()).slice(0, 80) });
    if (!loggedIn) { await page.close().catch(() => {}); throw new Error('logged out'); }

    // 1. What does the Following-button matcher see?
    const btnInfo = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[aria-label]'))
        .filter(e => (e.getAttribute('aria-label') || '').trim() === 'Following');
      return els.map(e => {
        const r = e.getBoundingClientRect();
        return {
          tag: e.tagName,
          role: e.getAttribute('role'),
          visible: r.width > 0 && r.height > 0,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          outer: e.outerHTML.slice(0, 400),
          parentOuter: e.parentElement ? e.parentElement.outerHTML.slice(0, 600) : null,
        };
      });
    });
    step('following-buttons', { count: btnInfo.length, buttons: btnInfo });

    // 2. Real click on the first visible Following button (opens menu; read-only).
    const btn = page.getByLabel('Following', { exact: true }).first();
    const vis = await btn.isVisible().catch(() => false);
    step('button-visible', { vis });
    if (vis) {
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 15000 }).catch(e => step('click-error', { err: String(e).slice(0, 200) }));
    }
    await sleep(3500);

    // 3. Dump everything relevant after the click.
    const after = await page.evaluate(() => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      const vis2 = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      // any element whose own normalized text contains 'unfollow'
      const unfollowHits = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let n, guard = 0;
      while ((n = walker.nextNode()) && guard++ < 60000) {
        const t = norm(n.innerText || '');
        if (/unfollow/i.test(t) && t.length < 300) {
          unfollowHits.push({
            tag: n.tagName, role: n.getAttribute('role'),
            ariaLabel: n.getAttribute('aria-label'),
            text: t.slice(0, 160), visible: vis2(n),
            outer: n.outerHTML.slice(0, 500),
          });
          if (unfollowHits.length >= 40) break;
        }
      }
      const menus = Array.from(document.querySelectorAll('[role="menu"], [role="menuitem"]'))
        .slice(0, 30).map(e => ({
          tag: e.tagName, role: e.getAttribute('role'), text: norm(e.innerText).slice(0, 200),
          visible: vis2(e), outer: e.outerHTML.slice(0, 500),
        }));
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
        .slice(0, 10).map(e => ({
          ariaLabel: e.getAttribute('aria-label'), text: norm(e.innerText).slice(0, 300),
          visible: vis2(e),
        }));
      // Facebook popover layers: fixed-position divs appended near body end
      const layers = Array.from(document.body.children).slice(-8).map(e => ({
        tag: e.tagName, id: e.id || null, cls: (e.className || '').toString().slice(0, 120),
        text: norm(e.innerText).slice(0, 250), visible: vis2(e),
      }));
      return { unfollowHits, menus, dialogs, layers, bodyTextTail: norm(document.body.innerText).slice(-600) };
    });
    step('after-click', after);

    await page.close().catch(() => {});
    diag.ok = true;
  } catch (e) {
    diag.error = String(e.message || e).slice(0, 300);
  }
  fs.writeFileSync(OUT, JSON.stringify(diag, null, 2));
  // compact stdout summary
  const s = diag.steps;
  const fb = s.find(x => x.name === 'following-buttons');
  const ac = s.find(x => x.name === 'after-click');
  console.log(JSON.stringify({
    ok: diag.ok || false,
    error: diag.error || null,
    login: (s.find(x => x.name === 'login') || {}).loggedIn,
    title: (s.find(x => x.name === 'login') || {}).title,
    followingBtnCount: fb ? fb.count : null,
    followingBtns: fb ? fb.buttons.map(b => ({ tag: b.tag, role: b.role, visible: b.visible })) : null,
    unfollowHits: ac ? ac.unfollowHits.map(h => ({ tag: h.tag, role: h.role, text: h.text, visible: h.visible })) : null,
    menus: ac ? ac.menus.map(m => ({ role: m.role, text: m.text, visible: m.visible })) : null,
    dialogs: ac ? ac.dialogs.map(d => ({ ariaLabel: d.ariaLabel, text: (d.text || '').slice(0, 120), visible: d.visible })) : null,
  }, null, 2));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, error: String(e).slice(0, 300) })); process.exit(5); });
