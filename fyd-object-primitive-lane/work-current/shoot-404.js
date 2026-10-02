const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("response", (r) => { if (r.status() === 404) console.log("404:", r.url()); });
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
