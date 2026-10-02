// Read-only visual verification: rest -> hover (peek) -> Expand (rich card).
const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const el = document.querySelector('[data-object-anchor="happy-place"]');
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/lane-after-rest.png" });

  // Hover the rest trigger -> PEEK
  const trigger = page.locator('[data-object-id="happy-place"] [data-testid="object-circle-trigger"]');
  await trigger.hover();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/lane-after-peek.png" });
  const peekCard = page.locator('[data-object-id="happy-place"] [data-testid="object-circle-card"][data-object-card="peek"]');
  console.log("peek visible:", await peekCard.count());

  // Click Expand -> PINNED rich card (fetch from the real objects route)
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/lane-after-rich.png" });
  const richCard = page.locator('[data-object-id="happy-place"] [data-testid="object-circle-card"][data-object-card="rich"]');
  console.log("rich visible:", await richCard.count());
  const richText = richCard.count() ? (await richCard.first().innerText()).slice(0, 400) : "";
  console.log("rich text head:", JSON.stringify(richText));
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("SHOT-FAIL", e.message); process.exit(1); });
