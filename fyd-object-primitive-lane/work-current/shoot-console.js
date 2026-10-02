// Capture console errors/warnings on a fresh load (read-only).
const { chromium } = require("playwright-core");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const msgs = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") msgs.push(m.type() + ": " + m.text().slice(0, 300)); });
  page.on("pageerror", (e) => msgs.push("pageerror: " + e.message.slice(0, 300)));
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log("console issues:", msgs.length ? "" : "none");
  msgs.forEach((m) => console.log(" -", m));
  const badge = await page.locator("text=Issue").count();
  console.log("issue badge present:", badge > 0);
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
