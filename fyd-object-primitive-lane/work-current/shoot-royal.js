// ROYAL MIRROR verification: rest, peek oval, rich capsule (desktop + mobile).
const { chromium } = require("playwright-core");
const BASE = "http://100.79.154.43:3100";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  // ---------- Desktop ----------
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 120)));
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const el = document.querySelector('[data-object-anchor="happy-place"]');
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/royal-rest.png" });

  const trig = '[data-object-id="happy-place"] [data-testid="object-circle-trigger"]';
  const peekCard = '[data-object-id="happy-place"] [data-object-card="peek"]';
  const richCard = '[data-object-id="happy-place"] [data-object-card="rich"]';

  // Peek oval.
  await page.locator(trig).hover();
  await page.waitForTimeout(900);
  console.log("peek open:", await page.locator(peekCard).count());
  const peekRadius = await page.locator(peekCard).evaluate((el) => getComputedStyle(el).borderRadius);
  console.log("peek border-radius:", peekRadius);
  await page.screenshot({ path: "/tmp/royal-peek.png" });

  // Rich capsule.
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(2200);
  console.log("rich open:", await page.locator(richCard).count());
  const richInner = await page.evaluate(() => {
    const card = document.querySelector('[data-object-id="happy-place"] [data-object-card="rich"]');
    const inner = card ? card.closest('[style*="max-height"], div') : null;
    return card ? getComputedStyle(card.parentElement).borderRadius : "";
  });
  console.log("rich inner radius:", JSON.stringify(richInner));
  await page.screenshot({ path: "/tmp/royal-rich.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  console.log("after Escape cards:", await page.locator(peekCard + ", " + richCard).count());
  await page.close();

  // ---------- Mobile 390 ----------
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  m.on("pageerror", (e) => errors.push("mobile pageerror: " + e.message.slice(0, 120)));
  await m.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await m.waitForTimeout(2500);
  await m.screenshot({ path: "/tmp/royal-mobile-rest.png" });
  const tab = m.locator('[data-testid="mobile-object-tab"]');
  console.log("mobile tab present:", await tab.count());
  if (await tab.count()) {
    await tab.click();
    await m.waitForTimeout(1200);
    await m.screenshot({ path: "/tmp/royal-mobile-sheet.png" });
    const first = m.locator('[data-testid="mobile-object-sheet"] ul button').first();
    if (await first.count()) {
      await first.click();
      await m.waitForTimeout(1200);
      await m.screenshot({ path: "/tmp/royal-mobile-peek.png" });
      const expand = m.locator('[data-testid="mobile-object-sheet"] button', { hasText: "Expand" });
      if (await expand.count()) {
        await expand.first().click();
        await m.waitForTimeout(2200);
        await m.screenshot({ path: "/tmp/royal-mobile-rich.png" });
        console.log("mobile rich open:", await m.locator('[data-testid="mobile-object-sheet"] [data-object-card="rich"]').count());
      }
    }
  }
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("SHOT-FAIL", e.message); process.exit(1); });
