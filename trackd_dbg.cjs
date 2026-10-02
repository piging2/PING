// Debug: submit a question and dump widget state.
const { chromium } = require("C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
  try {
    await page.goto("http://172.21.65.209:3100/sites/happy-place", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector("#ask-fyd-question", { timeout: 30000 });
    await page.locator("#ask-fyd-question").click();
    await page.keyboard.type("What services does this business offer?");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(10000);
    const dump = await page.evaluate(() => {
      const live = document.querySelector('[aria-live="polite"]');
      const alert = document.querySelector('[role="alert"]');
      return {
        liveText: live ? live.textContent.slice(0, 300) : "NO LIVE REGION",
        alertText: alert ? alert.textContent.slice(0, 300) : "no alert",
        btnText: document.querySelector('#ask button[type="submit"]')?.textContent ?? "no btn",
      };
    });
    console.log("DUMP:", JSON.stringify(dump, null, 1));
    console.log("ERRORS:", JSON.stringify(errors.slice(0, 5)));
  } finally {
    await page.close();
    await browser.close();
  }
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
