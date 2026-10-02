// Track D visual proof 2: ask a real question through the Ask FYD widget and
// screenshot the rendered answer with its citations.
const { chromium } = require("C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto("http://172.21.65.209:3105/sites/happy-place", {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForSelector("#ask-fyd-question", { timeout: 30000 });
    await page.locator("#ask").scrollIntoViewIfNeeded();
    await page.locator("#ask-fyd-question").click();
    await page.keyboard.type("What services does this business offer, and how do you know?");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[aria-live="polite"]');
        return el && el.textContent && el.textContent.trim().length > 50;
      },
      { timeout: 45000 }
    );
    await page.waitForTimeout(1200);
    await page.locator("#ask").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "C:/Users/nolan/.local/share/pigi/trackd-ask-answer.png",
    });
    console.log("answer screenshot saved");
  } finally {
    await page.close();
    await browser.close();
  }
})().catch((e) => {
  console.error("SHOT FAILED:", e.message);
  process.exit(1);
});
