const { chromium } = require("playwright-core");
const BASE = "http://100.79.154.43:3100";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
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
  const peer = page.locator('[data-object-id="happy-place"] [data-object-card="rich"] button', { hasText: "Coppersmith Plumbing" });
  await peer.first().waitFor({ timeout: 15000 });
  console.log("peer button present: true");
  await peer.first().click();
  await page.locator('[data-object-id="coppersmith-plumbing"] [data-object-card="rich"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const happyCards = await page.locator('[data-object-id="happy-place"] [data-object-card="peek"], [data-object-id="happy-place"] [data-object-card="rich"]').count();
  const head = await page.locator('[data-object-id="coppersmith-plumbing"] [data-object-card="rich"]').innerText();
  console.log("coppersmith rich open: true | happy-place cards now:", happyCards,
    "| head:", JSON.stringify(head.split("\n").slice(0,2).join(" / ")));
  console.log("one-expanded holds:", happyCards === 0);
  await page.screenshot({ path: "/tmp/final-copper-rich.png" });
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message.slice(0,200)); process.exit(1); });
