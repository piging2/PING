#!/usr/bin/env node
// ig-profile-pic.js -- Change the Instagram profile picture (syncs to Threads).
// Usage: node ig-profile-pic.js <photo-file> <shot-dir>
// CDP :9226 (ig-profile Chrome). NEVER closes the browser. Fails closed.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const photo = process.argv[2];
const shotDir = process.argv[3] || 'C:/Windows/Temp';
if (!fs.existsSync(photo)) { console.log(JSON.stringify({ changed: false, error: 'photo file missing' })); process.exit(1); }

(async () => {
  const out = { changed: false, steps: [] };
  const step = (k, v) => out.steps.push(k + '=' + v);
  const browser = await chromium.connectOverCDP('http://localhost:9226', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    // Login gate: look for the home nav or login form.
    const loggedIn = await page.evaluate(() => {
      const t = document.body.innerText;
      return !/Log in/i.test(t.slice(0, 500)) || t.includes('Home');
    });
    step('logged_in', String(loggedIn));
    out.before = path.join(shotDir, 'ig-pic-before-' + Date.now() + '.png');
    await page.screenshot({ path: out.before });
    if (!loggedIn) { out.error = 'not logged in'; throw new Error('stop'); }

    // Go to profile via the profile link in nav.
    await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    step('edit_page', 'loaded');
    const url = page.url();
    step('url', url);
    if (/login/.test(url)) { out.error = 'redirected to login'; throw new Error('stop'); }

    // Snapshot current profile pic src for the report.
    const oldSrc = await page.evaluate(() => {
      const img = document.querySelector('img[alt*="profile picture" i]');
      return img ? img.src.slice(0, 80) : 'none-found';
    });
    step('old_pic', oldSrc);

    // Click "Change profile photo" / the photo button.
    const changeBtn = page.locator('button', { hasText: /Change photo|Change profile photo/i }).first();
    const hasBtn = await changeBtn.count() > 0;
    step('change_button', String(hasBtn));
    if (!hasBtn) { out.error = 'no change-photo button'; throw new Error('stop'); }

    // The button opens a file chooser; catch it.
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 15000 }).catch(() => null),
      changeBtn.click(),
    ]);
    if (!chooser) {
      // Fallback: a menu may appear with "Upload photo".
      const uploadOpt = page.locator('[role="dialog"] button', { hasText: /Upload/i }).first();
      if (await uploadOpt.count() > 0) {
        const [c2] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 15000 }).catch(() => null),
          uploadOpt.click(),
        ]);
        if (!c2) { out.error = 'no file chooser after Upload'; throw new Error('stop'); }
        await c2.setFiles(photo);
      } else { out.error = 'no file chooser opened'; throw new Error('stop'); }
    } else {
      await chooser.setFiles(photo);
    }
    step('photo', 'selected');
    await sleep(8000);

    // Save if there's a submit button pending.
    const submit = page.locator('button[type="submit"]', { hasText: /Submit|Save/i }).first();
    if (await submit.count() > 0) {
      const dis = await submit.getAttribute('disabled');
      step('submit_disabled', String(dis));
      if (dis === null) { await submit.click(); await sleep(8000); step('submit', 'clicked'); }
    } else { step('submit', 'no submit button (auto-saved?)'); }

    // Verify: profile pic src changed.
    const newSrc = await page.evaluate(() => {
      const img = document.querySelector('img[alt*="profile picture" i]');
      return img ? img.src.slice(0, 80) : 'none-found';
    });
    step('new_pic', newSrc);
    out.changed = oldSrc !== 'none-found' && newSrc !== 'none-found' && oldSrc !== newSrc;
    out.after = path.join(shotDir, 'ig-pic-after-' + Date.now() + '.png');
    await page.screenshot({ path: out.after });
    if (!out.changed) out.error = 'pic src unchanged after upload';
  } catch (e) {
    if (!out.error) out.error = String(e.message || e).slice(0, 200);
    try { out.failShot = path.join(shotDir, 'ig-pic-FAIL-' + Date.now() + '.png'); await page.screenshot({ path: out.failShot }); } catch (_) {}
  } finally { await page.close(); }
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.changed ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
