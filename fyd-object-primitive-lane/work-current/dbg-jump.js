const { chromium } = require("playwright-core");
const BASE = "http://100.79.154.43:3100";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (e) => console.log("pageerror:", e.message.slice(0, 150)));
  page.on("console", (m) => { if (m.type() === "error") console.log("console.error:", m.text().slice(0, 150)); });
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
  const peer = page.locator('[data-object-id="happy-place"] [data-testid="object-relation"]', { hasText: "Coppersmith" });
  await peer.first().waitFor({ timeout: 15000 });
  console.log("peer found, clicking");
  await peer.first().click({ force: true });
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(1000);
    const st = await page.evaluate(() => ({
      copperRich: document.querySelectorAll('[data-object-id="coppersmith"] [data-object-card="rich"]').length,
      copperPeek: document.querySelectorAll('[data-object-id="coppersmith"] [data-object-card="peek"]').length,
      happyCards: document.querySelectorAll('[data-object-id="happy-place"] [data-object-card]').length,
      scrollY: Math.round(window.scrollY),
    }));
    console.log(`t=${i + 1}s`, JSON.stringify(st));
    if (st.copperRich) break;
  }
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message.slice(0, 200)); process.exit(1); });
