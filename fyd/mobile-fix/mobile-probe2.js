#!/usr/bin/env node
/**
 * Mobile DOM probe via the Pig's always-on Chrome (CDP :9223).
 * Emulates mobile viewport, loads the site, reports DOM/visibility.
 */
const { chromium } = require("playwright-core");

const URL = process.argv[2] || "http://localhost:3100/sites/happy-place";
const WIDTH = parseInt(process.argv[3] || "375", 10);
const HEIGHT = parseInt(process.argv[4] || "667", 10);

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    isMobile: WIDTH < 768,
    hasTouch: WIDTH < 768,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 120));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 120)));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  const report = await page.evaluate(() => {
    const out = { width: window.innerWidth, sections: [], links: [], overflow: false, scrollWidth: 0 };
    document.querySelectorAll("main section").forEach((s) => {
      const h = s.querySelector("h1,h2,h3");
      const r = s.getBoundingClientRect();
      out.sections.push({
        heading: h ? h.innerText.slice(0, 40) : "(no heading)",
        visible: r.height > 0 && r.width > 0,
      });
    });
    document.querySelectorAll('main a[href^="/o/"]').forEach((a) => {
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      out.links.push({
        text: a.innerText.slice(0, 30),
        href: a.getAttribute("href"),
        visible: r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none",
        w: Math.round(r.width),
        h: Math.round(r.height),
        pointerEvents: cs.pointerEvents,
      });
    });
    out.overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    out.scrollWidth = document.documentElement.scrollWidth;
    return out;
  });

  console.log(JSON.stringify({ url: URL, viewport: `${WIDTH}x${HEIGHT}`, errors: errors.slice(0, 5), ...report }));
  await context.close();
  await browser.close();
})().catch((e) => {
  console.error("PROBE FAILED:", e.message);
  process.exit(1);
});
