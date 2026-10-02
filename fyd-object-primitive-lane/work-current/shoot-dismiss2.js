// Dismissal semantics, mouse parked neutral (100,100) so hover doesn't re-open.
const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const el = document.querySelector('[data-object-anchor="happy-place"]');
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(800);
  const trig = '[data-object-id="happy-place"] [data-testid="object-circle-trigger"]';
  const peekCard = '[data-object-id="happy-place"] [data-object-card="peek"]';
  const richCard = '[data-object-id="happy-place"] [data-object-card="rich"]';
  const cards = () => page.locator(peekCard + ", " + richCard).count();
  const parkMouse = () => page.mouse.move(100, 100);

  // 1. Peek -> Escape closes.
  await page.locator(trig).hover(); await page.waitForTimeout(500);
  await parkMouse(); await page.waitForTimeout(200);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  console.log("peek->Escape closed:", (await cards()) === 0);

  // 2. Peek -> outside click closes.
  await page.locator(trig).hover(); await page.waitForTimeout(500);
  await parkMouse(); await page.waitForTimeout(200);
  await page.mouse.click(100, 100); await page.waitForTimeout(400);
  console.log("peek->outside closed:", (await cards()) === 0);

  // 3. Pinned -> Escape closes.
  await page.locator(trig).hover(); await page.waitForTimeout(500);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(1500);
  const richWasOpen = (await page.locator(richCard).count()) === 1;
  await parkMouse(); await page.waitForTimeout(200);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  console.log("pinned->Escape: rich was open:", richWasOpen, "| closed:", (await cards()) === 0);

  // 4. Pinned -> outside click closes.
  await page.locator(trig).hover(); await page.waitForTimeout(500);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(1500);
  await parkMouse(); await page.waitForTimeout(200);
  await page.mouse.click(100, 100); await page.waitForTimeout(400);
  console.log("pinned->outside closed:", (await cards()) === 0);

  // 5. Trigger click still toggles: closed->peek, peek->pinned, pinned->closed.
  await parkMouse(); await page.waitForTimeout(300);
  await page.locator(trig).click(); await page.waitForTimeout(400);
  const s1 = await cards();
  await page.locator(trig).click(); await page.waitForTimeout(400);
  const s2 = await page.locator(richCard).count();
  await page.locator(trig).click(); await page.waitForTimeout(400);
  const s3 = await cards();
  console.log("click cycle: closed->peek cards:", s1, "| peek->pinned rich:", s2, "| pinned->closed cards:", s3);

  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
