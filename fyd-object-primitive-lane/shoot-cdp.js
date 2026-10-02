// Baseline screenshot via the Pig's always-on headed Chrome (CDP :9223).
// Strictly read-only: opens a NEW browser context, screenshots, closes it.
const { chromium } = require("playwright-core");
const url = process.argv[2];
const out = process.argv[3];
const w = parseInt(process.argv[4] || "1600", 10);
const h = parseInt(process.argv[5] || "900", 10);
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out });
  await ctx.close();
  await browser.close();
  console.log("saved", out);
})().catch((e) => { console.error("SHOT-FAIL", e.message); process.exit(1); });
