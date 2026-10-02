const { chromium } = require("C:/Users/nolan/node_modules/playwright-core");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  console.log("after newContext innerWidth:", await page.evaluate("window.innerWidth"));
  await page.setViewportSize({ width: 375, height: 667 });
  console.log("after setViewportSize innerWidth:", await page.evaluate("window.innerWidth"));
  await ctx.close();
})().catch((e) => { console.error("PROBE-FAIL " + e.message); process.exit(1); });
