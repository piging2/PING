// Screenshot scrolled to a document anchor (read-only).
const { chromium } = require("playwright-core");
const url = process.argv[2];
const out = process.argv[3];
const anchor = process.argv[4];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.evaluate((a) => {
    const el = document.querySelector('[data-object-anchor="' + a + '"]');
    if (el) el.scrollIntoView({ block: "center" });
  }, anchor);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out });
  await browser.close();
  console.log("saved", out);
})().catch((e) => { console.error("SHOT-FAIL", e.message); process.exit(1); });
