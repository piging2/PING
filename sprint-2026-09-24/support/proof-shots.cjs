const { chromium } = require("C:/Users/nolan/node_modules/playwright-core");

(async () => {
  const url = process.argv[2];
  const width = parseInt(process.argv[3], 10);
  const out = process.argv[4];
  const heights = { 375: 667, 390: 844, 1440: 900 };
  const height = heights[width] || 900;

  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  // Hide scrollbars so the full-page capture is exactly the viewport width
  // (a visible vertical scrollbar would steal ~15 CSS px).
  await page.addStyleTag({
    content: "html{scrollbar-width:none!important}html::-webkit-scrollbar{display:none!important}",
  });
  await page.waitForTimeout(300);
  const title = await page.title();
  await page.screenshot({ path: out, fullPage: true });
  await ctx.close();
  console.log("saved " + out + " (" + width + "px) title=" + JSON.stringify(title));
})().catch((e) => {
  console.error("SHOT-FAIL " + e.message);
  process.exit(1);
});
