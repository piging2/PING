const { chromium } = require("playwright-core");
const BASE = "http://100.79.154.43:3100";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const reqs = [];
  page.on("response", (r) => { if (r.url().includes("/api/fyd/objects/")) reqs.push(r.status() + " " + r.url()); });
  page.on("pageerror", (e) => console.log("pageerror:", e.message.slice(0, 150)));
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const el = document.querySelector('[data-object-anchor="happy-place"]');
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(800);
  await page.locator('[data-object-id="happy-place"] [data-testid="object-circle-trigger"]').hover();
  await page.waitForTimeout(500);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(4000);
  console.log("api calls:", JSON.stringify(reqs));
  const txt = await page.locator('[data-object-id="happy-place"] [data-object-card="rich"]').innerText().catch((e) => "NOCARD " + e.message.slice(0,80));
  console.log("rich text tail:", JSON.stringify(txt.slice(-400)));
  console.log("related buttons:", await page.locator('[data-object-id="happy-place"] [data-object-card="rich"] button').count());
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
