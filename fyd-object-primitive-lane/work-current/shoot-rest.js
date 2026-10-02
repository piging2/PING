const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const el = document.querySelector('[data-object-anchor="coppersmith-plumbing"]');
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1500);
  const circle = page.locator('[data-object-id="coppersmith-plumbing"] [data-testid="object-circle-trigger"]');
  const box = await circle.boundingBox();
  console.log("rest trigger box:", JSON.stringify(box));
  await page.screenshot({ path: "/tmp/lane-rest2.png" });
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
