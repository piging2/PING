const { chromium } = require("playwright-core");
const BASE = "http://100.79.154.43:3100";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", (e) => console.log("pageerror:", e.message.slice(0, 150)));
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const slot = document.querySelector('[data-object-id="coppersmith"]');
    const trig = document.querySelector('[data-object-id="coppersmith"] [data-testid="object-circle-trigger"]');
    const r = slot ? slot.getBoundingClientRect() : null;
    return {
      slotExists: !!slot,
      triggerExists: !!trig,
      rect: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null,
      scrollY: Math.round(window.scrollY),
      vh: window.innerHeight,
    };
  });
  console.log(JSON.stringify(info));
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message.slice(0, 200)); process.exit(1); });
