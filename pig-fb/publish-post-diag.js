#!/usr/bin/env node
// publish-post-diag.js -- Diagnostic publish: keyboard-driven Post, no navigation after,
// captures errors/toasts, checks composer state. CDP :9223. NEVER closes browser.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const caption = fs.readFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/trades-caption.txt', 'utf8');
const photo = 'C:/Users/nolan/.local/share/pigi/fb-engage/trades-pexels.jpg';
const shotDir = 'C:/Windows/Temp';
const PAGE_URL = 'https://www.facebook.com/profile.php?id=61594275542163';

(async () => {
  const out = { published: false, steps: [] };
  const step = (k, v) => out.steps.push(k + '=' + v);
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 30000 });
  const ctx = browser.contexts().find(c => c.pages().length) || browser.contexts()[0];
  const page = await ctx.newPage();
  try {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    // Identity switch to Page.
    const idBtn = page.locator('[aria-label="Your profile"], [aria-label="Account"]').first();
    if (await idBtn.count() > 0) {
      await idBtn.click(); await sleep(3000);
      const seeAll = page.locator('[role="menuitem"], [role="button"]', { hasText: /^See all profiles$/ }).first();
      if (await seeAll.count() > 0) {
        await seeAll.click(); await sleep(4000);
        const ping = page.locator('[role="button"]', { hasText: /PING Social/ }).first();
        if (await ping.count() > 0) { await ping.click(); await sleep(8000); step('identity', 'switched'); }
        else step('identity', 'no-ping-option');
      } else step('identity', 'no-see-all');
    } else step('identity', 'no-id-button');

    // Composer.
    const comp = page.locator('[role="button"]', { hasText: /What's on your mind/i }).first();
    if (await comp.count() === 0) { out.error = 'no composer'; throw new Error('stop'); }
    await comp.click(); await sleep(5000);

    const dlg = page.locator('[role="dialog"]').last();
    const fi = dlg.locator('input[type="file"]');
    if (await fi.count() > 0) { await fi.first().setInputFiles(photo); step('photo', 'attached'); await sleep(6000); }
    else step('photo', 'no-file-input');

    const tb = dlg.locator('[role="textbox"], [contenteditable="true"]').first();
    await tb.click(); await sleep(1000);
    await page.keyboard.type(caption, { delay: 8 });
    await sleep(3000);
    step('text', 'entered');

    const pre = shotDir + '/diag-pre-' + Date.now() + '.png';
    await page.screenshot({ path: pre });
    out.preShot = pre;

    // Find the Post button, focus it via keyboard, press Enter (different from mouse click).
    const postBtn = dlg.locator('[role="button"]', { hasText: /^(Post|Share now|Share|Publish)$/ }).first();
    if (await postBtn.count() === 0) { out.error = 'no post button'; throw new Error('stop'); }
    await postBtn.scrollIntoViewIfNeeded();
    await sleep(1000);
    await postBtn.focus();
    await sleep(500);
    await page.keyboard.press('Enter');
    step('post', 'enter-pressed');
    await sleep(20000);

    // Capture state WITHOUT navigating: composer still open? errors? toasts?
    const state = await page.evaluate(() => {
      const b = document.body;
      const t = b.innerText;
      return {
        url: location.href,
        dialogOpen: b.innerHTML.includes('role="dialog"') && !!document.querySelector('[role="dialog"]'),
        composerText: t.includes("What's on your mind") || t.includes('Create post'),
        hasError: /Something went wrong|not published|couldn't|try again|error|failed/i.test(t.slice(0, 3000)),
        errorSnippet: (t.match(/.{0,80}(Something went wrong|not published|couldn.t|try again|failed).{0,80}/i) || [])[0] || null,
        toast: (t.match(/.{0,60}(published|shared|posted).{0,60}/i) || [])[0] || null,
        bodyLen: t.length,
      };
    });
    out.state = state;
    const post = shotDir + '/diag-post-' + Date.now() + '.png';
    await page.screenshot({ path: post });
    out.postShot = post;
    out.published = !!state.toast && !state.dialogOpen;
  } catch (e) {
    if (!out.error) out.error = String(e.message || e).slice(0, 200);
  } finally { await page.close(); }
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.published ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
