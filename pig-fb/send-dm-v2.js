#!/usr/bin/env node
// send-dm-v2.js -- Send a drafted B2B DM to a Facebook Page via the Message button.
// v2: replaces the Playwright chat-input click (deterministically times out on
// Pages with heavy notification/marketplace chrome, rounds 143-144) with a
// JS-driven focus sequence: scrollIntoView + focus + focus verification before
// any text is inserted. Everything else mirrors send-dm-generic.js.
// Usage: node send-dm-v2.js <page-url> <message-file> <slug> [shot-dir]
// Fails closed: any unexpected state -> no send, report. NEVER closes the browser.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGE_URL = process.argv[2];
const msgFile = process.argv[3];
const slug = process.argv[4] || 'dm';
const shotDir = process.argv[5] || 'C:/Windows/Temp';
if (!PAGE_URL || !msgFile) { console.log(JSON.stringify({ sent: false, error: 'usage: <page-url> <message-file> <slug>' })); process.exit(1); }
const message = fs.readFileSync(msgFile, 'utf8').trim();
if (!message) { console.log(JSON.stringify({ sent: false, error: 'empty message' })); process.exit(1); }

(async () => {
  const out = { sent: false, steps: [] };
  const step = (k, v) => out.steps.push(k + '=' + v);
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    step('page', 'loaded');

    const msgBtn = page.locator('[role="button"]', { hasText: /^Message$/ }).first();
    const btnCount = await page.locator('[role="button"]', { hasText: /^Message$/ }).count();
    step('message_buttons_found', String(btnCount));
    if (btnCount === 0) { out.error = 'no Message button'; throw new Error('stop'); }
    await msgBtn.click();
    await sleep(5000);
    step('message_button', 'clicked');

    // v2 focus: JS-driven, no Playwright actionability wait.
    const focusRes = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div[contenteditable="true"]'))
        .filter(el => el.offsetParent !== null);
      if (!els.length) return 'no-visible-box';
      const target = els[els.length - 1];
      try { target.scrollIntoView({ block: 'center' }); } catch (_) {}
      target.focus();
      if (document.activeElement === target) return 'focused';
      // fallback: synthetic click inside the page
      try {
        const r = target.getBoundingClientRect();
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
        target.dispatchEvent(ev);
        target.focus();
      } catch (_) {}
      return document.activeElement === target ? 'focused-after-synthetic' : 'focus-failed';
    });
    step('chat_input_focus', focusRes);
    if (focusRes === 'no-visible-box' || focusRes === 'focus-failed') {
      out.error = 'chat input could not be focused (no text inserted, nothing sent)';
      throw new Error('stop');
    }
    await sleep(1000);

    await page.evaluate((text) => {
      const els = Array.from(document.querySelectorAll('div[contenteditable="true"]'))
        .filter(el => el.offsetParent !== null);
      const target = els[els.length - 1];
      target.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    }, message);
    await sleep(1500);
    step('text', 'inserted len=' + message.length);

    await page.keyboard.press('Enter');
    await sleep(4000);
    step('send', 'enter pressed');

    const firstLine = message.split('\n')[0].slice(0, 60);
    const found = await page.evaluate((probe) => document.body.innerText.includes(probe), firstLine);
    step('verify_sent_text_visible', String(found));
    out.sent = found;

    const shot = path.join(shotDir, slug + '-' + Date.now() + '.png');
    await page.screenshot({ path: shot });
    out.screenshot = shot;
    if (!found) out.error = 'sent but could not verify text in thread';
  } catch (e) {
    if (!out.error) out.error = String(e.message || e).slice(0, 200);
    try {
      const shot = path.join(shotDir, slug + '-FAIL-' + Date.now() + '.png');
      await page.screenshot({ path: shot });
      out.screenshot = shot;
    } catch (_) {}
  } finally {
    await page.close();
  }
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.sent ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
