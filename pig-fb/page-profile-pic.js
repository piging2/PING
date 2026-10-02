#!/usr/bin/env node
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOGO = 'C:/Users/nolan/.local/share/pigi/fb-engage/page-inbox/ping-logo.png';
const SHOT = p => 'C:/Users/nolan/.local/share/pigi/fb-engage/' + p;
const W = 786, H = 506;
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const ctx = (browser.contexts().find(c => c.pages().length) || browser.contexts()[0]);
  const page = await ctx.newPage();
  const log = [];
  const isActing = () => page.evaluate(() => document.body.innerText.includes("What's on your mind, PING Social?"));
  const dismissModal = () => page.evaluate(() => {
    // STRICT: only ever click the explicit "Use Page" profile-switch button.
    // Never click a generic "Continue": during the 2026-09-13 run a blind
    // Continue click could walk through a Facebook security/hack-recovery
    // dialog unattended, which is the suspected cause of Nolan's personal
    // profile picture and bio being wiped after the account lock.
    for (const el of document.querySelectorAll('div[role="button"], button')) {
      const t = (el.innerText || '').trim();
      if (/^use page$/i.test(t)) { el.click(); return true; }
    }
    return false;
  });
  try {
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    let acting = await isActing();
    for (let attempt = 1; attempt <= 3 && !acting; attempt++) {
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('div[role="button"]')) {
          if ((el.getAttribute('aria-label') || '').startsWith('Your profile')) { el.click(); break; }
        }
      });
      await sleep(2500);
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('div[role="menuitem"], div[role="button"], a')) {
          if (/^see all profiles$/i.test((el.innerText || '').trim())) { el.click(); break; }
        }
      });
      await sleep(3500);
      await page.mouse.click(W * 0.732, H * 0.395);
      await sleep(6000);
      await dismissModal();
      await sleep(2000);
      acting = await isActing();
    }
    log.push('acting=' + acting);
    if (!acting) { console.log(JSON.stringify({ ok: false, log })); await page.close(); process.exit(0); }
    await page.goto('https://www.facebook.com/profile.php?id=61594275542163', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    await dismissModal();
    await sleep(3000);
    await page.mouse.move(W * 0.801, H * 0.560, { steps: 10 });
    await sleep(3500);
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('div[role="button"], button')) {
        if ((el.getAttribute('aria-label') || '') === 'Profile picture actions') { el.click(); break; }
      }
    });
    await sleep(4000);
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('div[role="menuitem"]')) {
        if (/choose/i.test((el.innerText || '').trim())) { el.click(); break; }
      }
    });
    await sleep(4000);
    // Click "Upload photo" and catch the file chooser
    const uploadBtn = page.locator('div[role="button"], button').filter({ hasText: /^Upload photo$/ }).first();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 15000 }),
      uploadBtn.click()
    ]);
    log.push('filechooser=caught');
    await chooser.setFiles(LOGO);
    await sleep(8000);
    await page.screenshot({ path: SHOT('page-crop18.png') });
    const saved = await page.evaluate(() => {
      for (const el of document.querySelectorAll('div[role="button"], button')) {
        if (/^\s*(save|done)\s*$/i.test(el.innerText || '')) { el.click(); return (el.innerText || '').trim(); }
      }
      return null;
    });
    log.push('saveBtn=' + saved);
    await sleep(8000);
    await page.screenshot({ path: SHOT('page-done18.png') });
    console.log(JSON.stringify({ ok: saved !== null, log }));
  } catch (e) { log.push('FAILED: ' + String(e.message || e).slice(0, 250)); console.log(JSON.stringify({ ok: false, log })); }
  await page.close();
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, log: ['FATAL ' + String(e.message || e).slice(0, 200)] })); process.exit(1); });
