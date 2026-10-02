#!/usr/bin/env node
// Viewport screenshot + overflow/console check via CDP tunnel (127.0.0.1:19223).
const { chromium } = require("playwright-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:19223", { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find((c) => c.pages().length) || contexts[0];
  const viewports = [
    { w: 320, h: 568, name: "320" },
    { w: 375, h: 667, name: "375" },
    { w: 1440, h: 900, name: "desktop" },
  ];
  // NOTE: base URL is passed as argv[2]; the Pig's WSL server must be reachable
  // from the Pig's Windows Chrome (use the WSL IP or forwarded address).
  const base = process.argv[2];
  const urls = [base + "/", base + "/sites/happy-place", base + "/sites/coppersmith-plumbing"];
  for (const vp of viewports) {
    for (const url of urls) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
      page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(2500);
      const slug = url.replace(base + "/", "root").replace(/\//g, "-") || "root";
      await page.screenshot({ path: "/tmp/fyd-" + slug + "-" + vp.name + ".png" });
      const info = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        title: document.title.slice(0, 60),
      }));
      console.log(vp.name + " " + url + " overflowX=" + info.overflowX +
        " title=" + info.title + " consoleErrors=" + errors.length);
      if (errors.length) console.log("  ERR: " + errors.slice(0, 3).join(" | "));
      await page.close();
    }
  }
  process.exit(0);
})().catch((e) => { console.error("FATAL " + String(e.message || e).slice(0, 200)); process.exit(1); });
