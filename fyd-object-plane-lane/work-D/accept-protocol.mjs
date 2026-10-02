/**
 * accept-protocol.mjs — FYD object-plane lane acceptance (worker D).
 * Real Chromium via Playwright on the Pig, headless.
 * Covers: 1 (DOM markers), 2 (document-anchor invariant), 4 (no scroll recompute),
 *          5 (cluster determinism), 6 (relationship nav HP->Copper),
 *          7 (hover/click state machine), 8 (ornate ring), 10 (generic engine both objects).
 * Checks 3 and 9 are covered by geometry-regression.mjs (run separately).
 * Read-only: never writes to the repo.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3100";
let failures = 0;
const lines = [];
function check(label, cond, detail = "") {
  lines.push(`${cond ? "PASS" : "FAIL"} ${label}${detail ? " :: " + detail : ""}`);
  if (!cond) failures++;
}
function info(label, detail = "") {
  lines.push(`INFO ${label}${detail ? " :: " + detail : ""}`);
}

// Records every scroll-listener registration target for later attribution.
const SPY = `(() => {
  window.__scrollEls = [];
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, opts) {
    if (type === "scroll") { try { window.__scrollEls.push(this); } catch (e) {} }
    return orig.call(this, type, listener, opts);
  };
})();`;

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => { try { return document.fonts.ready; } catch (e) { return null; } });
  await page.waitForTimeout(600);
}
async function waitSlots(page, timeout = 12000) {
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="object-layer"] [data-testid="margin-object"],[data-testid="object-layer"] [data-testid="margin-cluster"]'),
    { timeout },
  );
}
async function measure(page) {
  return page.evaluate(() => {
    const slots = {};
    for (const el of document.querySelectorAll('[data-testid="margin-object"],[data-testid="margin-cluster"]')) {
      const r = el.getBoundingClientRect();
      const key = el.getAttribute("data-object-id") || ("cluster:" + el.getAttribute("data-cluster-id"));
      slots[key] = {
        docY: +(r.top + window.scrollY).toFixed(2),
        viewY: +r.top.toFixed(2),
        x: +r.left.toFixed(2),
        position: getComputedStyle(el).position,
      };
    }
    const anchors = {};
    for (const el of document.querySelectorAll("[data-object-anchor]")) {
      const r = el.getBoundingClientRect();
      anchors[el.getAttribute("data-object-anchor")] = {
        docY: +(r.top + window.scrollY).toFixed(2),
        viewY: +r.top.toFixed(2),
      };
    }
    return { slots, anchors, scrollY: Math.round(window.scrollY) };
  });
}
const instScroll = (page, y) => page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
const cardCount = (page) => page.locator('[data-testid="object-circle-card"]').count();
const ringInfo = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('[data-testid="object-circle-card"]');
    if (!card) return null;
    const r = card.querySelector(":scope > div[aria-hidden]");
    if (!r) return { found: false };
    return {
      found: true,
      ariaHidden: r.getAttribute("aria-hidden"),
      peNone: r.classList.contains("pointer-events-none"),
      opacity: getComputedStyle(r).opacity,
      tag: r.tagName,
    };
  });

async function check1(browser) {
  info("CHECK 1", "served-fresh DOM markers");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await settle(page);
  await waitSlots(page);
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelectorAll(s).length;
    const html = document.documentElement.outerHTML.toLowerCase();
    const stale = ["portal-circle", "portal-host", "object-rail", "portal-rail", "inline-object", "object-modal", "happy-place-inline"]
      .map((k) => [k, html.split(k).length - 1])
      .filter(([, c]) => c > 0);
    return {
      layer: q('[data-testid="object-layer"]'),
      proj: document.querySelector('[data-testid="object-layer"]')?.getAttribute("data-projection"),
      hp: q('[data-testid="margin-object"][data-object-id="happy-place"]'),
      cu: q('[data-testid="margin-object"][data-object-id="coppersmith-plumbing"]'),
      anchors: q("[data-object-anchor]"),
      stale,
    };
  });
  check("1: object-layer mounted exactly once", m.layer === 1, `got ${m.layer}`);
  check("1: data-projection=dual at 1440x900", m.proj === "dual", `got ${m.proj}`);
  check("1: happy-place slot (data-object-id) present", m.hp === 1, `got ${m.hp}`);
  check("1: coppersmith-plumbing slot (data-object-id) present", m.cu === 1, `got ${m.cu}`);
  check("1: two [data-object-anchor] elements", m.anchors === 2, `got ${m.anchors}`);
  check("1: no stale inline/modal markers in live DOM", m.stale.length === 0, JSON.stringify(m.stale));
  await ctx.close();
}

async function check2_4_10(browser, w, h, label) {
  info(`CHECK 2/4/10`, `${label} ${w}x${h}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.addInitScript(SPY);
  await page.goto(BASE + "/");
  await settle(page);
  await waitSlots(page);
  const m0 = await measure(page);
  info(`${label}: baseline slots`, JSON.stringify(m0.slots));

  await instScroll(page, 500); await page.waitForTimeout(400);
  const m1 = await measure(page);
  await instScroll(page, 1000); await page.waitForTimeout(400);
  const m2 = await measure(page);

  for (const k of Object.keys(m0.slots)) {
    const d1 = Math.abs(m1.slots[k].docY - m0.slots[k].docY);
    const d2 = Math.abs(m2.slots[k].docY - m0.slots[k].docY);
    check(`2(${label}): ${k} docY stable @scroll500`, d1 <= 1, `delta=${d1.toFixed(2)}px`);
    check(`2(${label}): ${k} docY stable @scroll1000`, d2 <= 1, `delta=${d2.toFixed(2)}px`);
    const v1 = m1.slots[k].viewY - m0.slots[k].viewY;
    const v2 = m2.slots[k].viewY - m0.slots[k].viewY;
    check(`2(${label}): ${k} viewportY delta ~-500`, Math.abs(v1 + 500) <= 5, `delta=${v1.toFixed(1)}px`);
    check(`2(${label}): ${k} viewportY delta ~-1000`, Math.abs(v2 + 1000) <= 5, `delta=${v2.toFixed(1)}px`);
    check(`10(${label}): ${k} not viewport-fixed`, m0.slots[k].position !== "fixed", `position=${m0.slots[k].position}`);
  }
  for (const k of Object.keys(m0.anchors)) {
    const d = Math.abs(m2.anchors[k].docY - m0.anchors[k].docY);
    check(`2(${label}): anchor[${k}] docY stable`, d <= 1, `delta=${d.toFixed(2)}px`);
  }

  const seq = [0, 120, 300, 500, 750, 1000, 1400, 1800, 2200, 1800, 1200, 600, 250, 0];
  const series = {};
  for (const y of seq) {
    await instScroll(page, y); await page.waitForTimeout(220);
    const m = await measure(page);
    for (const k of Object.keys(m.slots)) (series[k] = series[k] || []).push(m.slots[k].docY);
  }
  for (const k of Object.keys(series)) {
    const jitter = Math.max(...series[k]) - Math.min(...series[k]);
    check(`4(${label}): ${k} docY jitter-free over ${seq.length} scroll stops`, jitter <= 1, `max-min=${jitter.toFixed(2)}px`);
    info(`${label}: ${k} docY series`, series[k].map((v) => v.toFixed(1)).join(","));
  }
  const regs = await page.evaluate(() => {
    const layer = document.querySelector('[data-testid="object-layer"]');
    const els = window.__scrollEls || [];
    return {
      onLayer: els.filter((el) => layer && layer.contains(el)).map((el) => el.tagName || "?"),
      onWindow: els.filter((el) => el === window).length,
      onDocument: els.filter((el) => el === document).length,
      other: els.filter((el) => el !== window && el !== document && !(layer && layer.contains(el))).map((el) => (el.tagName || "?").slice(0, 24)),
    };
  });
  info(`${label}: scroll-listener attribution`, JSON.stringify(regs));
  check(`4(${label}): no scroll listener inside object-layer subtree`, regs.onLayer.length === 0, JSON.stringify(regs.onLayer));
  await ctx.close();
}

async function check5(browser) {
  info("CHECK 5", "cluster determinism at narrow desktop widths");
  for (const w of [1024, 1000, 960, 900]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/");
    await settle(page);
    await waitSlots(page);
    const s = await page.evaluate(() => ({
      proj: document.querySelector('[data-testid="object-layer"]')?.getAttribute("data-projection"),
      clusters: [...document.querySelectorAll('[data-testid="margin-cluster"]')].map((el) => ({
        id: el.getAttribute("data-cluster-id"),
        attrs: el.getAttributeNames().map((n) => `${n}=${el.getAttribute(n)}`).join(" "),
      })),
      singles: [...document.querySelectorAll('[data-testid="margin-object"]')].map((el) => el.getAttribute("data-object-id")),
    }));
    info(`5: width ${w}`, `projection=${s.proj} singles=${JSON.stringify(s.singles)} clusters=${JSON.stringify(s.clusters)}`);
    if (s.clusters.length > 0) {
      const base = s.clusters.map((c) => c.id).join("|");
      const seq = [0, 400, 800, 1200, 800, 300, 0, 600, 200, 0];
      const seen = [];
      let ok = true;
      for (const y of seq) {
        await instScroll(page, y); await page.waitForTimeout(250);
        const cur = await page.evaluate(() =>
          [...document.querySelectorAll('[data-testid="margin-cluster"]')].map((el) => el.getAttribute("data-cluster-id")).join("|"),
        );
        seen.push(`${y}:${cur || "(none)"}`);
        if (cur !== base) ok = false;
      }
      check(`5: cluster membership stable across scroll at ${w}px`, ok, seen.join(" "));
      await ctx.close();
      return;
    }
    await ctx.close();
  }
  info("5: no cluster engaged at 1024/1000/960/900px (singles only); scroll-flicker N/A — singles verified jitter-free in check 4");
}

async function check7_8(browser) {
  info("CHECK 7/8", "hover/click state machine + ornate ring (1440x900)");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await settle(page);
  await waitSlots(page);
  const trig = page.locator('[data-testid="margin-object"][data-object-id="happy-place"] button[aria-label*="Expand to show"]');
  const box = await trig.boundingBox();
  info("7: HP trigger box", JSON.stringify(box));

  // Real hover -> preview open
  await trig.hover();
  await page.waitForTimeout(500);
  let n = await cardCount(page);
  check("7: hover rest circle opens card (preview)", n === 1, `cards=${n}`);

  // Click while hover-open -> pinned; mouse moves away; must stay open
  await trig.evaluate((b) => b.click());
  await page.waitForTimeout(300);
  await page.mouse.move(box.x + box.width / 2, box.y - 80);
  await page.waitForTimeout(1200); // > COLLAPSE_DELAY_MS (300)
  n = await cardCount(page);
  const label = n ? await page.locator('[data-testid="object-circle-card"]').first().getAttribute("aria-label") : null;
  check("7: click while hover-open pins (stays open after mouse leaves)", n === 1 && /happy place/i.test(label || ""), `cards=${n} label=${label}`);

  // CHECK 8 while pinned open
  const ring = await ringInfo(page);
  check("8: ornate ring present in DOM when expanded", !!(ring && ring.found), JSON.stringify(ring));
  check("8: ring is decorative aria-hidden", ring?.ariaHidden === "true", `aria-hidden=${ring?.ariaHidden}`);
  check("8: ring is pointer-events-none overlay", ring?.peNone === true, `peNone=${ring?.peNone}`);

  // Fade: fresh expand, sample opacity early vs late (RING_FADE_MS=280)
  await trig.evaluate((b) => b.click()); // pinned -> closed
  await page.waitForTimeout(500);
  check("7: click again closes the card", (await cardCount(page)) === 0, `cards=${await cardCount(page)}`);
  check("8: ring absent at rest (no card)", (await ringInfo(page)) === null, "ringInfo non-null at rest");
  await trig.evaluate((b) => b.click()); // closed -> pinned (fresh expand)
  await page.waitForTimeout(60);
  const opEarly = await ringInfo(page).then((r) => (r && r.found ? r.opacity : "n/a"));
  await page.waitForTimeout(1000);
  const opLate = await ringInfo(page).then((r) => (r && r.found ? r.opacity : "n/a"));
  info("8: ring opacity", `t~60ms=${opEarly} t~1000ms=${opLate} (RING_FADE_MS=280)`);
  check("8: ring fades in to full opacity", parseFloat(opLate) === 1, `late=${opLate}`);
  await ctx.close();
}

async function check6(browser) {
  info("CHECK 6", "relationship nav: Happy Place -> Coppersmith (1440x900)");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await settle(page);
  await waitSlots(page);
  await page.locator('[data-testid="margin-object"][data-object-id="happy-place"] button').evaluate((b) => b.click());
  await page.waitForTimeout(700);
  const rel = page.locator('[data-testid="object-circle-card"] [data-testid="object-relation"]');
  const relTarget = await rel.getAttribute("data-related-object-id");
  check("6: HP card relation targets coppersmith-plumbing", relTarget === "coppersmith-plumbing", `got ${relTarget}`);
  const before = await measure(page);
  await rel.evaluate((b) => b.click());
  await page.waitForTimeout(1200); // smooth scroll ~500ms + card open
  const after = await measure(page);
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="object-circle-card"]')].map((el) => el.getAttribute("aria-label")),
  );
  check("6: exactly one card after peer jump", cards.length === 1, `got ${cards.length}: ${JSON.stringify(cards)}`);
  check("6: open card is Coppersmith (HP collapsed)", cards.length === 1 && /coppersmith/i.test(cards[0] || ""), JSON.stringify(cards));
  const cuCardInCuSlot = await page.evaluate(
    () => !!document.querySelector('[data-testid="margin-object"][data-object-id="coppersmith-plumbing"] [data-testid="object-circle-card"]'),
  );
  check("6: Coppersmith card opened in its own slot", cuCardInCuSlot, "card not found inside coppersmith slot");
  const scrolled = Math.abs(after.scrollY - before.scrollY) > 30;
  const cuViewY = after.slots["coppersmith-plumbing"] ? after.slots["coppersmith-plumbing"].viewY : null;
  check("6: page scrolled the Coppersmith slot into view", scrolled && cuViewY !== null && cuViewY > -50 && cuViewY < 950,
    `scrollY ${before.scrollY}->${after.scrollY}, cuViewY=${cuViewY}`);
  await ctx.close();
}

const browser = await chromium.launch();
try {
  await check1(browser);
  await check2_4_10(browser, 1440, 900, "desktop-wide");
  await check2_4_10(browser, 1100, 800, "desktop-normal");
  await check5(browser);
  await check7_8(browser);
  await check6(browser);
} finally {
  await browser.close();
}

for (const l of lines) console.log(l);
console.log(failures === 0 ? "\nACCEPTANCE: ALL CHECKS PASSED" : `\nACCEPTANCE: ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
