#!/usr/bin/env node
// Paste-delivery test: grant clipboard perms, write prompt to clipboard via
// the page, click the composer, Ctrl+V paste (atomic), screenshot each step.
// Read-only except typing into our own fresh meta.ai tab. Closes its tab after.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const prompt = fs.readFileSync(process.argv[2], 'utf8');
  const shotPrefix = process.argv[3];
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 15000 });
  const ctx = browser.contexts()[0];
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://meta.ai' }).catch(e => console.log('grantPermissions: ' + e.message.slice(0, 100)));
  const page = await ctx.newPage();
  await page.goto('https://meta.ai/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(3000);
  const composer = page.locator('div[contenteditable="true"]').first();
  await composer.click();
  await sleep(500);
  await page.evaluate(t => navigator.clipboard.writeText(t), prompt).catch(e => console.log('clipboard.writeText: ' + e.message.slice(0, 100)));
  await sleep(300);
  await page.keyboard.press('ControlOrMeta+v');
  await sleep(2000);
  const st = await page.evaluate(() => {
    const ta = document.querySelector('textarea[placeholder="Ask Meta AI..."]');
    const div = document.querySelector('div[contenteditable="true"]');
    const title = document.querySelector('input[placeholder="Conversation title"]');
    return {
      taLen: ta ? ta.value.length : -1,
      divLen: div ? (div.innerText || '').length : -1,
      titleLen: title ? (title.value || '').length : -1,
      promptLen: undefined,
    };
  });
  st.promptLen = prompt.length;
  console.log(JSON.stringify(st));
  await page.screenshot({ path: shotPrefix + '-after-paste.png' }).catch(() => {});
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
