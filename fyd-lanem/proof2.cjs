/* Lane M edge-placement proof v2 (2026-09-25 directive):
 * - Desktop: fit-gated dual margins (left AND right glyphs), no center overlap, no h-overflow
 * - Mobile: zero overlay pills; objects visible as in-flow cards; 44px+ targets
 * - Click proof: left glyph, right glyph, mobile in-flow card
 * Run: node.exe C:\Users\nolan\fyd-lanem-proof\proof2.cjs [wsl-ip]
 */
const { chromium } = require("playwright-core");
const fs = require("fs");

const OUT = "C:\\Users\\nolan\\fyd-lanem-proof";
const WSL_IP = process.argv[2] || "172.21.65.209";
const SITES = [
  { name: "hp", port: 3103, path: "/sites/happy-place" },
  { name: "cp", port: 3104, path: "/sites/coppersmith-plumbing" },
];
const WIDTHS = [1280, 320, 360, 375, 390, 430];

function r(el) {
  const b = el.getBoundingClientRect();
  const q = (v) => Math.round(v * 10) / 10;
  return { x: q(b.x), y: q(b.y), w: q(b.width), h: q(b.height) };
}
const overlap = (a, b) =>
  a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1;

async function measure(page, width) {
  return await page.evaluate((vw) => {
    const rr = (el) => {
      const b = el.getBoundingClientRect();
      const q = (v) => Math.round(v * 10) / 10;
      return { x: q(b.x), y: q(b.y), w: q(b.width), h: q(b.height) };
    };
    const layer = document.querySelector('[data-testid="object-layer"]');
    const slots = Array.from(
      document.querySelectorAll('[data-testid="margin-object"],[data-testid="margin-cluster"]')
    ).map((el) => {
      const rect = rr(el);
      return {
        rect,
        rail: rect.x + rect.w / 2 < vw / 2 ? "left" : "right",
        ids:
          el.getAttribute("data-object-id") ||
          el.getAttribute("data-member-ids") ||
          "?",
      };
    });
    const sections = Array.from(document.querySelectorAll("[data-fyd-section]")).map(rr);
    let cL = Infinity, cR = -Infinity, cT = Infinity, cB = -Infinity;
    for (const s of sections) {
      if (s.w < 2) continue;
      cL = Math.min(cL, s.x); cR = Math.max(cR, s.x + s.w);
      cT = Math.min(cT, s.y); cB = Math.max(cB, s.y + s.h);
    }
    const content = isFinite(cL) ? { x: cL, y: cT, w: cR - cL, h: cB - cT } : null;
    const overlaps = slots.filter((s) =>
      sections.some((sec) => {
        const ox = s.rect.x < sec.x + sec.w - 1 && s.rect.x + s.rect.w > sec.x + 1;
        const oy = s.rect.y < sec.y + sec.h - 1 && s.rect.y + s.rect.h > sec.y + 1;
        return ox && oy;
      })
    ).length;
    const pills = document.querySelectorAll('[data-testid="mobile-object-pill"]').length;
    const inflow = Array.from(document.querySelectorAll(".fyd-object-card")).filter(
      (el) => { const b = el.getBoundingClientRect(); return b.width > 2 && b.height > 2; }
    ).length;
    return {
      projection: layer ? layer.getAttribute("data-projection") : "none",
      slotCount: slots.length,
      leftCount: slots.filter((s) => s.rail === "left").length,
      rightCount: slots.filter((s) => s.rail === "right").length,
      slotRects: slots.map((s) => ({ rail: s.rail, rect: s.rect, ids: s.ids })),
      contentRect: content,
      centerOverlap: overlaps,
      hOverflow: document.documentElement.scrollWidth > vw + 1,
      scrollWidth: document.documentElement.scrollWidth,
      pillCount: pills,
      inflowCards: inflow,
    };
  }, width);
}

async function clickSlot(page, rail) {
  // returns true if a peek/dialog surface appears after clicking the first trigger on the rail
  const trig = await page.evaluate((railName) => {
    const vw = window.innerWidth;
    const els = Array.from(
      document.querySelectorAll('[data-testid="margin-object"],[data-testid="margin-cluster"]')
    );
    const el = els.find((e) => {
      const b = e.getBoundingClientRect();
      const r = b.x + b.width / 2 < vw / 2 ? "left" : "right";
      return r === railName;
    });
    if (!el) return null;
    const t = el.querySelector('[data-testid="object-circle-trigger"]');
    if (!t) return null;
    const b = t.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, rail);
  if (!trig) return { clicked: false };
  await page.mouse.click(trig.x, trig.y);
  await page.waitForTimeout(900);
  const opened = await page.evaluate(() =>
    !!document.querySelector('[data-testid="object-peek-wrap"],[role="dialog"],[data-testid="object-overlay"]')
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  return { clicked: true, opened };
}

async function clickInflow(page) {
  const pt = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".fyd-object-card")).filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 40 && b.height > 40 && b.top > -200 && b.bottom < window.innerHeight + 2000;
    });
    if (!cards.length) return null;
    const t = cards[0].querySelector("button,a") || cards[0];
    const b = t.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: Math.max(b.y + 40, b.y + b.height / 2) };
  });
  if (!pt) return { clicked: false };
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(900);
  const opened = await page.evaluate(() =>
    !!document.querySelector('[role="dialog"],[data-testid="object-overlay"]')
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  return { clicked: true, opened };
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ["--headless=new", "--window-size=1280,900", "--no-sandbox"],
  });
  const results = [];
  for (const site of SITES) {
    for (const width of WIDTHS) {
      const errors = [];
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 160)));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160));
      });
      const url = `http://${WSL_IP}:${site.port}${site.path}/services`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const m = await measure(page, width);
      let click = {};
      if (width >= 1024 && m.slotCount > 0) {
        click.left = await clickSlot(page, "left");
        click.right = await clickSlot(page, "right");
      } else if (width < 768) {
        click.inflow = await clickInflow(page);
      }
      await page.screenshot({ path: `${OUT}\\lanem-${site.name}-${width}.png`, fullPage: false });
      results.push({ site: site.name, width, url, ...m, click, errors: errors.slice(0, 6) });
      console.log(
        `${site.name} ${width}: proj=${m.projection} slots=${m.slotCount} L=${m.leftCount} R=${m.rightCount} overlap=${m.centerOverlap} hOver=${m.hOverflow} pills=${m.pillCount} inflow=${m.inflowCards} click=${JSON.stringify(click)} err=${errors.length}`
      );
      await page.close();
    }
  }
  await browser.close();
  fs.writeFileSync(`${OUT}\\results2.json`, JSON.stringify(results, null, 2));
  console.log("wrote results2.json");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
