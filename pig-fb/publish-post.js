#!/usr/bin/env node
// publish-post.js -- Publish a text+photo post to the PING Social Facebook Page
// via the Professional dashboard "Create a post" flow (the canonical entry point).
// Usage: node publish-post.js <text-file> <photo-file> <shot-dir> <probe-text>
// NEVER closes the browser. Fails closed: any unexpected state -> no post, report.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGE_URL = 'https://www.facebook.com/profile.php?id=61594275542163';
const DASH_URL = 'https://www.facebook.com/professional_dashboard/content_calendar/';
const text = fs.readFileSync(process.argv[2], 'utf8').trim();
const photo = process.argv[3];
const shotDir = process.argv[4] || 'C:/Windows/Temp';
const probe = process.argv[5] || "what's eating your week";
if (!text || !fs.existsSync(photo)) { console.log(JSON.stringify({ posted: false, error: 'missing text or photo' })); process.exit(1); }

(async () => {
  const out = { posted: false, steps: [] };
  const step = (k, v) => out.steps.push(k + '=' + v);
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    // 0. Safety: abort if this exact post is already live (no duplicates).
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    const already = await page.evaluate((p) => document.body.innerText.includes(p), probe);
    if (already) { out.posted = true; out.note = 'already live, skipped duplicate'; throw new Error('done'); }

    // 1. Switch identity to the Page via the top-right profile switcher.
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    const avatar = page.locator('[aria-label="Your profile"]').first();
    if (await avatar.count() > 0) { await avatar.click(); await sleep(4000); }
    else { out.error = 'no profile avatar found'; throw new Error('stop'); }
    const menuOpt = page.locator('div[role="menu"] >> text=PING Social').first();
    if (await page.locator('div[role="menu"] >> text=PING Social').count() > 0) { await menuOpt.click(); }
    else {
      const anyOpt = page.locator('text="PING Social"').first();
      if (await anyOpt.count() > 0) { await anyOpt.click(); }
      else { out.error = 'no PING Social option in profile switcher'; throw new Error('stop'); }
    }
    await sleep(6000);
    step('identity', 'switched to PING Social');

    // 2. Open the Professional dashboard and click "Create a post" -> "Post".
    await page.goto(DASH_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    const createBtn = page.locator('[role="button"]', { hasText: /^Create a post/ }).first();
    if (await createBtn.count() === 0) { out.error = 'no Create a post button in dashboard'; throw new Error('stop'); }
    await createBtn.click();
    await sleep(3000);
    // A dropdown menu may offer Post / Story / Reel; pick Post if present.
    const menuPost = page.locator('[role="menuitem"]', { hasText: /^Post$/ }).first();
    if (await menuPost.count() > 0) { await menuPost.click(); await sleep(4000); step('menu', 'Post selected'); }
    else {
      // Fallback: the sidebar "Post" nav item.
      const sidePost = page.locator('a, [role="link"]', { hasText: /^Post$/ }).first();
      if (await sidePost.count() > 0) { await sidePost.click(); await sleep(4000); step('menu', 'sidebar Post clicked'); }
    }
    const dialogOpen = await page.locator('[role="dialog"]').count() > 0;
    step('composer_dialog', String(dialogOpen));
    if (!dialogOpen) { out.error = 'no composer dialog after Create a post'; throw new Error('stop'); }
    step('composer', 'opened via dashboard');

    // 3. Attach photo.
    const fileInput = page.locator('[role="dialog"] input[type="file"]').first();
    if (await fileInput.count() === 0) { out.error = 'no file input in composer'; throw new Error('stop'); }
    await fileInput.setInputFiles(photo);
    await sleep(6000);
    step('photo', 'attached');

    // 4. Type text paragraph by paragraph.
    const box = page.locator('[role="dialog"] div[contenteditable="true"][role="textbox"]').first();
    if (await box.count() === 0) { out.error = 'no textbox in composer'; throw new Error('stop'); }
    await box.click();
    await sleep(800);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await sleep(500);
    const paras = text.split(/\n\s*\n/);
    for (let i = 0; i < paras.length; i++) {
      await page.keyboard.type(paras[i], { delay: 5 });
      if (i < paras.length - 1) { await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); await sleep(300); }
    }
    await sleep(1500);
    step('text', 'entered len=' + text.length);
    out.preview = path.join(shotDir, 'page-post-preview-' + Date.now() + '.png');
    await page.screenshot({ path: out.preview });

    // 5. Next -> Post/Share/Publish.
    const nextBtn = page.locator('[role="dialog"] [role="button"]', { hasText: /^Next$/ }).first();
    if (await nextBtn.count() > 0) { await nextBtn.click(); await sleep(6000); step('next', 'clicked'); }
    const postBtn = page.locator('[role="dialog"] [role="button"]', { hasText: /^(Post|Share now|Share|Publish)$/ }).first();
    if (await postBtn.count() === 0) { out.error = 'no Post/Share button after Next'; throw new Error('stop'); }
    step('post_button_disabled', String(await postBtn.getAttribute('aria-disabled')));
    await postBtn.click();
    await sleep(15000);
    step('post', 'clicked');
    out.afterPost = path.join(shotDir, 'page-post-afterpost-' + Date.now() + '.png');
    await page.screenshot({ path: out.afterPost });

    // 6. Dismiss any upsell, then verify via the content calendar (authoritative).
    const notNow = page.locator('[role="dialog"] [role="button"]', { hasText: /^Not now$/ }).first();
    if (await notNow.count() > 0) { await notNow.click(); await sleep(5000); step('upsell', 'dismissed'); }
    await page.goto(DASH_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(10000);
    let live = false;
    for (let i = 0; i < 3 && !live; i++) {
      live = await page.evaluate((p) => document.body.innerText.includes(p), probe);
      if (!live) { await sleep(5000); }
    }
    step('calendar_probe', String(live));
    out.posted = live;
    out.screenshot = path.join(shotDir, 'page-post-done-' + Date.now() + '.png');
    await page.screenshot({ path: out.screenshot });
    if (!live) out.error = 'post flow completed but not found in content calendar';
  } catch (e) {
    if (!out.error && e.message !== 'done') out.error = String(e.message || e).slice(0, 200);
    if (!out.screenshot) {
      try {
        out.screenshot = path.join(shotDir, 'page-post-FAIL-' + Date.now() + '.png');
        await page.screenshot({ path: out.screenshot });
      } catch (_) {}
    }
  } finally {
    await page.close();
  }
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.posted ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
