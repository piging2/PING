/* Lane M edge-placement proof: screenshots + DOM measurements at 6 widths x 2 sites.
 * Run with the portable Windows node on the Pig:
 *   node.exe C:\Users\nolan\fyd-lanem-proof\proof.cjs [wsl-ip]
 * Uses --headless=new per the known-good pattern. No interaction with the
 * user's live browser; launches its own headless Chrome.
 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const OUT = "C:\\Users\\nolan\\fyd-lanem-proof";
const WSL_IP = process.argv[2] || "172.21.65.209";
const SITES = [
  { name: "hp", port: 3103, path: "/sites/happy-place" },
  { name: "cp", port: 3104, path: "/sites/coppersmith-plumbing" },
];
const WIDTHS = [1280, 320, 360, 375, 390, 430];

function rectOf(el) {
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x * 10) / 10,
    y: Math.round(r.y * 10) / 10,
    w: Math.round(r.width * 10) / 10,
    h: Math.round(r.height * 10) / 10,
  };
}

async function measure(page) {
  return await page.evaluate(() => {
    const vw = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    const q = (s) => Array.from(document.querySelectorAll(s));
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return {
        x: Math.round(b.x * 10) / 10,
        y: Math.round(b.y * 10) / 10,
        w: Math.round(b.width * 10) / 10,
        h: Math.round(b.height * 10) / 10,
      };
    };
    // Lane B left-margin check: positioned elements with x+w < 200, minus skip link
    const leftMargin = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = walker.nextNode())) {
      const el = n;
      if (el.closest('[data-testid="object-layer"]')) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "absolute" && cs.position !== "fixed") continue;
      if (el.tagName === "A" && (el.getAttribute("href") || "").startsWith("#")) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) continue;
      if (b.x + b.width < 200 && b.x >= -1) {
        leftMargin.push(el.tagName + "." + (el.className.baseVal !== undefined ? "" : String(el.className).split(" ")[0]));
        if (leftMargin.length > 12) break;
      }
    }
    const layer = document.querySelector('[data-testid="object-layer"]');
    const pills = q('[data-testid="mobile-object-pill"]').map((el) => {
      const rr = r(el);
      return {
        rect: rr,
        clipped: rr.x < -0.5 || rr.x + rr.w > vw + 0.5,
        sizeOk: rr.w >= 44 && rr.h >= 44,
        label: el.getAttribute("aria-label"),
      };
    });
    const glyphs = q("[data-object-id]")
      .filter((el) => el.closest('[data-testid="object-layer"]'))
      .map((el) => {
        const rr = r(el);
        return {
          rect: rr,
          clipped: rr.x < -0.5 || rr.x + rr.w > vw + 0.5,
          id: el.getAttribute("data-object-id"),
        };
      });
    const sections = q("[data-fyd-section]").map((el) => ({ rect: r(el) }));
    // pill/section overlap
    const overlaps = [];
    for (const p of pills) {
      for (const s of sections) {
        const ix = Math.max(0, Math.min(p.rect.x + p.rect.w, s.rect.x + s.rect.w) - Math.max(p.rect.x, s.rect.x));
        const iy = Math.max(0, Math.min(p.rect.y + p.rect.h, s.rect.y + s.rect.h) - Math.max(p.rect.y, s.rect.y));
        if (ix > 1 && iy > 1) {
          overlaps.push({ pill: p.label, area: Math.round(ix * iy) });
          break;
        }
      }
    }
    const inflow = q("[data-inflow-composition]").map((el) => ({
      testid: el.getAttribute("data-testid"),
      cards: el.querySelectorAll("a,button").length,
      rect: r(el),
    }));
    const trig = document.querySelector(".fyd-rail-auto-trigger-btn");
    const overflowers = [];
    q("body *").forEach((el) => {
      if (el.closest('[data-testid="object-layer"]')) return;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") return;
      const b = el.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) return;
      if (b.right > vw + 1 || b.left < -1) {
        const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 2).join(".") : "";
        overflowers.push(`${el.tagName}.${cls} x=${Math.round(b.left)}..${Math.round(b.right)}`);
      }
    });
    return {
      vw,
      docW,
      hOverflow: docW - vw,
      layerProjection: layer ? layer.getAttribute("data-projection") : "ABSENT",
      leftMarginCount: leftMargin.length,
      leftMarginSample: leftMargin.slice(0, 6),
      pillCount: pills.length,
      pills: pills.slice(0, 8),
      pillClippedCount: pills.filter((p) => p.clipped).length,
      pillSmallCount: pills.filter((p) => !p.sizeOk).length,
      pillOverlapSections: overlaps.length,
      glyphCount: glyphs.length,
      glyphs: glyphs.slice(0, 10),
      glyphClippedCount: glyphs.filter((g) => g.clipped).length,
      inflowBlocks: inflow,
      triggerVisible: trig ? (() => { const b = trig.getBoundingClientRect(); return b.width > 0 && b.height > 0; })() : false,
      triggerRect: trig ? r(trig) : null,
      overflowers: overflowers.slice(0, 10),
    };
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: false,
    args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
  });
  const results = [];
  for (const site of SITES) {
    for (const w of WIDTHS) {
      const label = `${site.name}-${w}`;
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      const errors = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text().slice(0, 250));
      });
      page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 250)));
      try {
        await page.goto(`http://${WSL_IP}:${site.port}${site.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
        const navBtn = page.locator('nav[aria-label="Generated pages"] button', { hasText: "Services" });
        if ((await navBtn.count()) > 0) await navBtn.first().click();
        await page.waitForTimeout(3000);
        const data = await measure(page);
        const shot = path.join(OUT, `${label}-services.png`);
        await page.screenshot({ path: shot, fullPage: false });
        // click test: first pill or glyph
        let clickResult = "none";
        const target = page.locator('[data-testid="mobile-object-pill"], [data-testid="object-layer"] [data-object-id]').first();
        if ((await target.count()) > 0) {
          await target.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1500);
          clickResult = await page.evaluate(() => {
            const dlg = document.querySelector('[role="dialog"]');
            const sheet = document.querySelector(".fyd-edge-sheet, .fyd-mobile-sheet");
            const peek = document.querySelector("[data-peek-open]");
            return JSON.stringify({
              dialog: !!dlg,
              sheet: !!sheet,
              peek: !!peek,
              expanded: document.querySelectorAll('[data-expanded="true"]').length,
            });
          });
        }
        results.push({ label, errors: [...new Set(errors)].slice(0, 8), clickResult, ...data });
        console.log(`OK ${label} proj=${data.layerProjection} pills=${data.pillCount} glyphs=${data.glyphCount} overflow=${data.hOverflow} errs=${errors.length}`);
      } catch (e) {
        results.push({ label, fatal: String(e).slice(0, 300) });
        console.log(`FAIL ${label}: ${String(e).slice(0, 120)}`);
      }
      await page.close();
    }
  }
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
