// Track D visual proof: screenshot the Ask FYD surface on the Happy Place site page.
// Runs as a Windows process via the portable node; connects to the house browser over CDP.
const { chromium } = require("C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto("http://172.21.65.209:3100/sites/happy-place", {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForSelector("#ask-fyd-question", { timeout: 30000 });
    await page.locator("#ask").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: "C:/Users/nolan/.local/share/pigi/trackd-ask-happy.png",
    });
    console.log("screenshot saved");
  } finally {
    await page.close();
    await browser.close();
  }
})().catch((e) => {
  console.error("SHOT FAILED:", e.message);
  process.exit(1);
});
