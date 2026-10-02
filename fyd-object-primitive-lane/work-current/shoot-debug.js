const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0, 200)); });
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const el = document.querySelector('[data-object-anchor="happy-place"]');
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(800);
  await page.locator('[data-object-id="happy-place"] [data-testid="object-circle-trigger"]').hover();
  await page.waitForTimeout(600);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(2000);
  console.log("happy rich open:", await page.locator('[data-object-id="happy-place"] [data-object-card="rich"]').count());
  // Click the relation link and trace what happens.
  await page.evaluate(() => {
    const btn = document.querySelector('[data-object-id="happy-place"] [data-testid="object-relation"]');
    console.log("relation btn found:", !!btn);
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);
  const probe1 = await page.evaluate(() => ({
    copperWrapper: !!document.querySelector('[data-object-id="coppersmith-plumbing"]'),
    richAnywhere: document.querySelectorAll('[data-object-card="rich"]').length,
    scrollY: Math.round(window.scrollY),
  }));
  console.log("t+1s:", JSON.stringify(probe1));
  await page.waitForTimeout(2500);
  const probe2 = await page.evaluate(() => ({
    copperWrapper: !!document.querySelector('[data-object-id="coppersmith-plumbing"]'),
    richAnywhere: document.querySelectorAll('[data-object-card="rich"]').length,
    copperRich: document.querySelectorAll('[data-object-id="coppersmith-plumbing"] [data-object-card="rich"]').length,
    scrollY: Math.round(window.scrollY),
  }));
  console.log("t+3.5s:", JSON.stringify(probe2));
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
