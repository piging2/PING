#!/usr/bin/env node
/**
 * Mobile DOM probe: load a site at mobile + desktop viewports,
 * report what's in the DOM, what's visible, and what's tappable.
 */
const { chromium } = require("playwright-core");

const URL = process.argv[2] || "http://localhost:3100/sites/happy-place";
const WIDTH = parseInt(process.argv[3] || "375", 10);
const HEIGHT = parseInt(process.argv[4] || "667", 10);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    isMobile: WIDTH < 768,
    hasTouch: WIDTH < 768,
  });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 120));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 120)));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  const report = await page.evaluate(() => {
    const out = { width: window.innerWidth, sections: [], links: [], hidden: [], overflow: false };
    // section headings in order
    document.querySelectorAll("section").forEach((s) => {
      const h = s.querySelector("h1,h2,h3");
      const r = s.getBoundingClientRect();
      out.sections.push({
        heading: h ? h.innerText.slice(0, 40) : "(no heading)",
        visible: r.height > 0 && r.width > 0,
        top: Math.round(r.top),
      });
    });
    // all /o/ links: href, text, visible, tappable
    document.querySelectorAll('a[href^="/o/"]').forEach((a) => {
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      out.links.push({
        text: a.innerText.slice(0, 30),
        href: a.getAttribute("href"),
        visible: r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none",
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        pointerEvents: cs.pointerEvents,
      });
    });
    out.overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    out.scrollWidth = document.documentElement.scrollWidth;
    out.bodyText = document.body.innerText.slice(0, 200);
    return out;
  });

  console.log(JSON.stringify({ url: URL, viewport: `${WIDTH}x${HEIGHT}`, errors: errors.slice(0, 5), ...report }, null, 1));
  await browser.close();
})().catch((e) => {
  console.error("PROBE FAILED:", e.message);
  process.exit(1);
});
