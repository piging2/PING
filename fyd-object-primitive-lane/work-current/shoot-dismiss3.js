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
  const trig = '[data-object-id="happy-place"] [data-testid="object-circle-trigger"]';
  const cards = '[data-object-id="happy-place"] [data-object-card="peek"], [data-object-id="happy-place"] [data-object-card="rich"]';
  const n = () => page.locator(cards).count();
  const park = () => page.mouse.move(100, 100);

  await page.locator(trig).hover(); await page.waitForTimeout(500);
  await park(); await page.waitForTimeout(250);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  console.log("peek->Escape closed:", (await n()) === 0);

  await page.locator(trig).hover(); await page.waitForTimeout(500);
  await park(); await page.waitForTimeout(250);
  await page.mouse.click(100, 100); await page.waitForTimeout(400);
  console.log("peek->outside closed:", (await n()) === 0);

  await page.locator(trig).hover(); await page.waitForTimeout(500);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(1500);
  const richWas = (await page.locator('[data-object-id="happy-place"] [data-object-card="rich"]').count()) === 1;
  await park(); await page.waitForTimeout(250);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  console.log("pinned->Escape: rich was open:", richWas, "| closed:", (await n()) === 0);

  await page.locator(trig).hover(); await page.waitForTimeout(500);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(1500);
  await park(); await page.waitForTimeout(250);
  await page.mouse.click(100, 100); await page.waitForTimeout(400);
  console.log("pinned->outside closed:", (await n()) === 0);

  await park(); await page.waitForTimeout(300);
  await page.locator(trig).click(); await page.waitForTimeout(400);
  const s1 = await n();
  await page.locator(trig).click(); await page.waitForTimeout(400);
  const s2 = await page.locator('[data-object-id="happy-place"] [data-object-card="rich"]').count();
  await page.locator(trig).click(); await page.waitForTimeout(400);
  const s3 = await n();
  console.log("click cycle: closed->peek:", s1, "| peek->pinned rich:", s2, "| pinned->closed:", s3);
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
