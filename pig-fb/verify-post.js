#!/usr/bin/env node
// verify-post.js -- Click today's calendar thumbnail and screenshot the post preview.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probe = process.argv[2] || "what's eating your week";
(async () => {
  const out = { live: false, steps: [] };
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://www.facebook.com/professional_dashboard/content_calendar/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    // Screenshot the calendar first.
    await page.screenshot({ path: 'C:/Windows/Temp/verify-cal.png' });
    // Click the image thumbnail in the Wed column (today). Thumbnails are img elements in the calendar grid.
    const thumbs = page.locator('img');
    const n = await thumbs.count();
    out.steps.push('imgs=' + n);
    // Find thumbnails near the calendar area and click the last one (most recent).
    // Instead: click on the calendar grid cell for today. Simpler: evaluate click on the thumbnail element.
    const clicked = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      // Filter to small thumbnails (not icons/avatars): calendar post thumbs are ~40-80px.
      const cands = imgs.filter(i => { const r = i.getBoundingClientRect(); return r.width > 30 && r.width < 120 && r.height > 30 && r.height < 120 && r.y > 200; });
      if (!cands.length) return 'none';
      const t = cands[cands.length - 1];
      t.scrollIntoView({ block: 'center' });
      t.click();
      const r = t.getBoundingClientRect();
      return 'clicked w=' + Math.round(r.width) + ' y=' + Math.round(r.y);
    });
    out.steps.push('thumb=' + clicked);
    await sleep(5000);
    await page.screenshot({ path: 'C:/Windows/Temp/verify-preview.png' });
    const hasProbe = await page.evaluate((p) => document.body.innerText.includes(p), probe);
    out.steps.push('probe_in_preview=' + hasProbe);
    out.live = hasProbe;
  } catch (e) { out.error = String(e.message || e).slice(0, 200); }
  await page.close();
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.live ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
