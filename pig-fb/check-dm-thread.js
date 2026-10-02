#!/usr/bin/env node
// check-dm-thread.js -- reconcile an unknown-outcome DM send.
// Opens the Page URL in the house browser, clicks Message, and checks whether
// the probe text (a distinctive substring of the outbound draft) appears in
// the opened chat thread. Also captures surrounding chat text to spot a reply.
// Usage: node check-dm-thread.js <page-url> <probe-string> <slug> [shot-dir]
// Fails closed: any unexpected state -> report, no send, NEVER closes the browser.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGE_URL = process.argv[2];
const probe = process.argv[3];
const slug = process.argv[4] || 'threadcheck';
const shotDir = process.argv[5] || 'C:/Windows/Temp';
if (!PAGE_URL || !probe) { console.log(JSON.stringify({ ok: false, error: 'usage: <page-url> <probe-string> <slug>' })); process.exit(1); }

(async () => {
  const out = { ok: false, probe_found: false, steps: [] };
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
    await sleep(6000);
    step('message_button', 'clicked');

    // Find the chat pane: scan ALL dialog regions and pick the one most likely the chat.
    const scan = await page.evaluate(() => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      const out = dialogs.map(el => ({
        label: el.getAttribute('aria-label') || '',
        len: (el.innerText || '').length,
        head: (el.innerText || '').slice(0, 300)
      }));
      // Chat docked tabs are often not role=dialog; also grab message-ish containers.
      const bubbles = Array.from(document.querySelectorAll('div[aria-label]')).filter(el => {
        const a = el.getAttribute('aria-label') || '';
        return /^(Messages|Chat)/i.test(a);
      }).map(el => (el.innerText || '').slice(0, 2000));
      return { dialogs: out, bubbles };
    });
    out.dialog_scan = scan;
    const allText = scan.dialogs.map(d => d.head).join('\n----\n') + '\n----\n' + scan.bubbles.join('\n----\n');
    out.probe_found = allText.includes(probe);
    step('probe_found', String(out.probe_found));
    out.chat_text_excerpt = allText.slice(0, 2000);

    // Rough sent-marker: FB shows delivery state near our own bubble ("Sent", "Seen").
    out.markers = {
      seen: allText.includes('Seen'),
      sent_marker: allText.includes('Sent'),
    };

    const shot = path.join(shotDir, slug + '-' + Date.now() + '.png');
    await page.screenshot({ path: shot });
    out.screenshot = shot;
    out.ok = true;
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
  process.exit(out.ok ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
