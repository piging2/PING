// Baseline screenshot of the Pig dev server homepage.
const { chromium } = require("playwright-core");
const url = process.argv[2];
const out = process.argv[3];
const w = parseInt(process.argv[4] || "1600", 10);
const h = parseInt(process.argv[5] || "900", 10);
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out });
  await browser.close();
  console.log("saved", out);
})().catch((e) => { console.error("SHOT-FAIL", e.message); process.exit(1); });
