#!/usr/bin/env node
// send-dm.js -- Send the drafted B2B DM to the Jack of All Junction Facebook Page.
// Usage: node send-dm.js <message-file> <shot-dir>
// Steps: open Page -> click Message -> paste message -> send -> verify it appears.
// NEVER closes the browser. Fails closed: any unexpected state -> no send, report.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGE_URL = 'https://www.facebook.com/GrandJunctionMetalHandyman';
const msgFile = process.argv[2];
const shotDir = process.argv[3] || 'C:/Windows/Temp';
const message = fs.readFileSync(msgFile, 'utf8').trim();
if (!message) { console.log(JSON.stringify({ sent: false, error: 'empty message' })); process.exit(1); }

(async () => {
  const out = { sent: false, steps: [] };
  const step = (k, v) => out.steps.push(k + '=' + v);
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    step('page', 'loaded');

    // Find the Message button on the Page (not in nav).
    const msgBtn = page.locator('[role="button"]', { hasText: /^Message$/ }).first();
    const btnCount = await page.locator('[role="button"]', { hasText: /^Message$/ }).count();
    step('message_buttons_found', String(btnCount));
    if (btnCount === 0) { out.error = 'no Message button'; throw new Error('stop'); }
    await msgBtn.click();
    await sleep(5000);
    step('message_button', 'clicked');

    // Locate the chat input. The Page chat popup uses a contenteditable box
    // with an "Aa" placeholder (no aria-label). Take the last visible one.
    const boxCount = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div[contenteditable="true"]'));
      return els.filter(el => el.offsetParent !== null).length;
    });
    step('chat_inputs_found', String(boxCount));
    if (boxCount === 0) { out.error = 'no chat input after clicking Message'; throw new Error('stop'); }
    const box = page.locator('div[contenteditable="true"]').last();
    await box.click();
    await sleep(1000);

    // Insert text via execCommand (reliable for contenteditable), then send with Enter.
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

    // Verify: the sent message text should appear in the thread.
    const firstLine = message.split('\n')[0].slice(0, 60);
    const found = await page.evaluate((probe) => document.body.innerText.includes(probe), firstLine);
    step('verify_sent_text_visible', String(found));
    out.sent = found;

    const shot = path.join(shotDir, 'dm-aaron-' + Date.now() + '.png');
    await page.screenshot({ path: shot });
    out.screenshot = shot;
    if (!found) out.error = 'sent but could not verify text in thread';
  } catch (e) {
    if (!out.error) out.error = String(e.message || e).slice(0, 200);
    try {
      const shot = path.join(shotDir, 'dm-aaron-FAIL-' + Date.now() + '.png');
      await page.screenshot({ path: shot });
      out.screenshot = shot;
    } catch (_) {}
  } finally {
    await page.close();
  }
  // Do NOT close the browser; it must stay running.
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.sent ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
