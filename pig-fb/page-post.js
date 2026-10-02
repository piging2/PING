#!/usr/bin/env node
// Pigi Facebook Page post worker (runs on the Pig, Nolan's workstation).
// Posts one photo + caption to the PING Social Facebook Page via the always-on
// headed Chrome (remote-debugging-port 9223, fb-profile) that holds Nolan's
// Facebook login. NEVER touches the personal Chrome profile or other CDP
// ports (9224 LinkedIn, 9225 X). This script never launches or closes the
// browser; it closes only the tab it opened.
// Usage: node page-post.js <job.json>
// job.json: { "page_url": "https://www.facebook.com/...", "image_path": "C:/.../img.png", "caption": "..." }
// Writes <job.json>.result.json: { ok, post_url?, error? } and prints a one-line
// summary. Never prints credentials.
// NOTE for the first live test: confirm the post lands AS THE PAGE, not as
// Nolan's personal profile (the Page composer usually defaults to the Page
// when opened from the Page URL, but verify the author line on the live post).
const fs = require('fs');
const { chromium } = require('playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loginState(page) {
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  const html = await page.content();
  return !(/name="email"|id="email"/.test(html) && !/role="feed"|aria-label="Home"/.test(html));
}

// DOM .click() via evaluate: Playwright's click() times out on FB buttons
// (never "stable"), same lesson as engage.js.
async function domClick(page, pickFnSource) {
  return page.evaluate(pickFnSource);
}

async function openComposer(page, pageUrl) {
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  // Find the composer trigger, scroll it into view, and click with the real
  // mouse. DOM .click() via evaluate is unreliable here (offscreen triggers,
  // FB ignores synthetic clicks); real mouse clicks work (page-profile-pic.js).
  const pt = await page.evaluate(() => {
    const cands = Array.from(document.querySelectorAll('div, span'))
      .filter(e => /^(create a post|create post|what's on your mind\??)/i.test((e.innerText || '').trim()) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0);
    cands.sort((a, b) => a.innerText.length - b.innerText.length);
    const el = cands[0];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: el.innerText.trim().slice(0, 60) };
  });
  if (!pt) return { ok: false, note: 'composer trigger not found on Page' };
  await sleep(1500);
  await page.mouse.click(pt.x, pt.y);
  await sleep(3500);
  const dialog = await page.$('div[role="dialog"]');
  return dialog ? { ok: true } : { ok: false, note: 'composer dialog did not open' };
}

async function attachPhoto(page, imagePath) {
  // Click Photo/video so the file input mounts, then setInputFiles on it.
  const btn = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Photo/video"], [aria-label="Photo or video"]')
      || Array.from(document.querySelectorAll('div[role="dialog"] [role="button"]'))
           .find(b => /photo\/video|photo or video/i.test(b.innerText || ''));
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  });
  if (!btn) return { ok: false, note: 'Photo/video button not found' };
  await sleep(2500);
  const input = await page.$('div[role="dialog"] input[type="file"]') || await page.$('input[type="file"][accept*="image"]');
  if (!input) return { ok: false, note: 'file input not found after Photo/video click' };
  await input.setInputFiles(imagePath);
  await sleep(6000);
  const attached = await page.evaluate(() => {
    const d = document.querySelector('div[role="dialog"]');
    if (!d) return false;
    return !!(d.querySelector('img') || /photo|image|1 of/i.test(d.innerText || ''));
  });
  return attached ? { ok: true } : { ok: false, note: 'photo preview not detected in composer' };
}

async function writeCaption(page, caption) {
  const editor = await page.$('div[role="dialog"] div[contenteditable="true"][role="textbox"]')
    || await page.$('div[role="dialog"] div[contenteditable="true"]');
  if (!editor) return { ok: false, note: 'caption editor not found' };
  await editor.click({ timeout: 15000 }).catch(() => {});
  await sleep(800);
  // Type like a human; long captions paste unreliably in the FB composer.
  await page.keyboard.type(caption, { delay: 25 + Math.random() * 40 });
  await sleep(1500);
  const present = await page.evaluate((c) => {
    const d = document.querySelector('div[role="dialog"]');
    return d && d.innerText.includes(c.slice(0, 30));
  }, caption);
  return present ? { ok: true } : { ok: false, note: 'caption text not visible in composer' };
}

async function findDialogButton(page, pattern) {
  // Returns { x, y } (viewport CSS px) of the first button matching pattern in
  // any visible dialog, largest dialog first; { disabled: true }; or null.
  // FB renders the composer header as its own small dialog and stacks upsells
  // above the composer, so document order is not z-order.
  return page.evaluate((pat) => {
    const dlgs = Array.from(document.querySelectorAll('div[role="dialog"]'))
      .filter(d => { const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    dlgs.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (rb.width * rb.height) - (ra.width * ra.height);
    });
    const re = new RegExp(pat, 'i');
    for (const dlg of dlgs) {
      const b = Array.from(dlg.querySelectorAll('[role="button"], button'))
        .find(x => re.test((x.innerText || '').trim()) || re.test(x.getAttribute('aria-label') || ''));
      if (b) {
        if (b.getAttribute('aria-disabled') === 'true') return { disabled: true };
        const r = b.getBoundingClientRect();
        if (r.width === 0) return null;
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
    }
    return null;
  }, pattern);
}
async function scrollDialogButtonIntoView(page, pattern) {
  return page.evaluate((pat) => {
    const dlgs = Array.from(document.querySelectorAll('div[role="dialog"]'))
      .filter(d => { const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    dlgs.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (rb.width * rb.height) - (ra.width * ra.height);
    });
    const re = new RegExp(pat, 'i');
    for (const dlg of dlgs) {
      const b = Array.from(dlg.querySelectorAll('[role="button"], button'))
        .find(x => re.test((x.innerText || '').trim()) || re.test(x.getAttribute('aria-label') || ''));
      if (b) { b.scrollIntoView({ block: 'center' }); return true; }
    }
    return false;
  }, pattern);
}
async function clickButton(page, pattern) {
  // Clicks the first button matching pattern (string) in any visible dialog;
  // returns 'clicked', 'disabled', or null. Uses the real mouse: FB ignores
  // synthetic clicks on some composer buttons.
  // Two-phase: scroll first, then re-measure the rect right before clicking, so
  // the click cannot land on a neighbor (e.g. "Save as draft") if layout shifts.
  const first = await findDialogButton(page, pattern).catch(() => null);
  if (!first) return null;
  if (first.disabled) return 'disabled';
  await scrollDialogButtonIntoView(page, pattern).catch(() => {});
  await sleep(1500);
  const pt = await findDialogButton(page, pattern).catch(() => null);
  if (!pt || pt.disabled) return pt && pt.disabled ? 'disabled' : null;
  await page.mouse.click(pt.x, pt.y);
  return 'clicked';
}

async function clickPost(page) {
  // New composer flow: bottom button is "Next" until content is added; after
  // Next there may be a final "Post"/"Share now" screen.
  let r = await clickButton(page, '^(post)$');
  if (r === 'clicked') { await sleep(9000); return { ok: true }; }
  if (r === 'disabled') return { ok: false, note: 'Post button disabled' };
  r = await clickButton(page, '^(next)$');
  if (r !== 'clicked') return { ok: false, note: 'neither Post nor Next button found' };
  await sleep(4000);
  await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/post-after-next.png' }).catch(() => {});
  r = await clickButton(page, '^(post|share now|publish)$');
  if (r !== 'clicked') return { ok: false, note: 'final Post/Share button not found after Next: ' + r };
  await sleep(5000);
  // FB sometimes shows an upsell after Post ("add a Call Now button"). Decline
  // it; never accept ("Add Button" would attach a call CTA to the post).
  for (let i = 0; i < 4; i++) {
    const dlg = await page.$('div[role="dialog"]');
    if (!dlg) break;
    const declined = await clickButton(page, '^(not now|skip|no thanks)$');
    if (declined !== 'clicked') break;
    await sleep(4000);
  }
  await sleep(5000);
  // Confirm the dialog actually closed (a missed click can silently save a draft).
  const stillOpen = await page.$('div[role="dialog"]');
  if (stillOpen) {
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/post-still-open.png' }).catch(() => {});
    return { ok: false, note: 'dialog still open after final Post click; publish did not go through' };
  }
  await sleep(6000);
  return { ok: true };
}

async function verifyPost(page, pageUrl, caption) {
  // Re-read the Page timeline and look for the new post by caption snippet.
  // Searches full body text (not article nodes): the manage-view timeline does
  // not always expose role="article", and posts load lazily on scroll.
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const snippet = caption.slice(0, 40);
  for (let i = 0; i < 8; i++) {
    const found = await page.evaluate((s) => document.body.innerText.includes(s), snippet);
    if (found) {
      const url = await page.evaluate(() => {
        let link = null;
        document.querySelectorAll('a').forEach(a => {
          const href = a.getAttribute('href') || '';
          if (/\/posts\//.test(href) && !link) link = href.split('?')[0];
        });
        return link;
      });
      return { url };
    }
    await page.evaluate(() => window.scrollBy(0, 900));
    await sleep(2500);
  }
  return null;
}

(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node page-post.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  if (!job.page_url || !job.image_path || !job.caption) {
    const out = { ok: false, error: 'job needs page_url, image_path, caption' };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT bad_job');
    process.exit(2);
  }
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  } catch (e) {
    const out = { ok: false, error: 'CDP attach failed; is the always-on Chrome running? ' + String(e.message || e).slice(0, 150) };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT cdp_unavailable');
    process.exit(3);
  }
  let out;
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    if (!(await loginState(page))) {
      out = { ok: false, error: 'Facebook session logged out in the always-on browser; Nolan must log in again in that window' };
      fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
      console.log('RESULT logged_out');
      await page.close();
      process.exit(4);
    }
    const steps = [
      ['open composer', () => openComposer(page, job.page_url)],
      ['attach photo', () => attachPhoto(page, job.image_path)],
      ['write caption', () => writeCaption(page, job.caption)],
      ['click Post', () => clickPost(page)],
    ];
    for (const [name, fn] of steps) {
      let r;
      try { r = await fn(); } catch (e) { r = { ok: false, note: 'exception: ' + String(e.message || e).slice(0, 200) }; }
      if (!r.ok) {
        out = { ok: false, error: name + ' failed: ' + (r.note || r.error || 'unknown') };
        break;
      }
      const body = await page.evaluate(() => document.body.innerText.slice(0, 5000)).catch(() => '');
      if (/checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated/i.test(body)) {
        out = { ok: false, error: 'possible checkpoint or block detected after step: ' + name };
        break;
      }
    }
    if (!out) {
      const hit = await verifyPost(page, job.page_url, job.caption).catch(() => null);
      out = hit
        ? { ok: true, post_url: hit.url || undefined }
        : { ok: false, error: 'post submitted but not found on Page timeline on re-read' };
    }
    await page.close(); // close only our tab, never the browser
  } catch (e) {
    out = { ok: false, error: 'worker exception: ' + String(e.message || e).slice(0, 300) };
  }
  fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
  console.log(`RESULT ok=${out.ok}` + (out.post_url ? ` post_url=${out.post_url}` : '') + (out.error ? ` error=${out.error.slice(0, 120)}` : ''));
  process.exit(0); // run completed; success/failure is in the result JSON
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(6); });
