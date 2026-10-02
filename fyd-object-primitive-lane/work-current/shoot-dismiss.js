// Verify Escape and outside-click close from BOTH peek and pinned.
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

  // 1. Peek, then Escape -> closed.
  await page.locator(trig).hover();
  await page.waitForTimeout(500);
  const peekOpen = await page.locator(peekCard).count();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  console.log("peek->Escape: peek was open:", peekOpen, "| cards after:", await page.locator(peekCard).count() + await page.locator(richCard).count());

  // 2. Peek, then outside click -> closed (not pinned).
  await page.locator(trig).hover();
  await page.waitForTimeout(500);
  await page.mouse.click(400, 500); // outside the wrapper
  await page.waitForTimeout(400);
  console.log("peek->outside: cards after:", await page.locator(peekCard).count() + await page.locator(richCard).count());

  // 3. Pinned, then Escape -> closed.
  await page.locator(trig).hover();
  await page.waitForTimeout(500);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(1500);
  const richOpen = await page.locator(richCard).count();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  console.log("pinned->Escape: rich was open:", richOpen, "| cards after:", await page.locator(peekCard).count() + await page.locator(richCard).count());

  // 4. Pinned, then outside click -> closed.
  await page.locator(trig).hover();
  await page.waitForTimeout(500);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(1500);
  await page.mouse.click(400, 500);
  await page.waitForTimeout(400);
  console.log("pinned->outside: cards after:", await page.locator(peekCard).count() + await page.locator(richCard).count());

  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
