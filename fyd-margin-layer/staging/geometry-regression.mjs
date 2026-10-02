/**
 * geometry-regression.mjs — real-browser proof for the margin object layer.
 * (Nolan, 2026-09-22: "Margins Are the Object Layer".)
 *
 * Invariant under test: CONTENT OWNS THE PAGE. PING OWNS THE EDGES.
 * The margin object layer must not move publisher content: the same
 * content bounding boxes with the layer OFF must equal the boxes with
 * the layer ON, on desktop and mobile, before and after expansion.
 *
 * Run on the Pig (dev server on localhost:3100):
 *   LD_LIBRARY_PATH=/home/nolan/pwlibs/usr/lib/x86_64-linux-gnu node ./geometry-regression.mjs
 * Exits 0 on all PASS, 1 on any FAIL.
 *
 * Browser: Playwright's bundled Chromium headless shell, running on the
 * Pig WSL with system libs extracted locally (~/pwlibs, no sudo).
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3100";

const ANCHORS = ['[data-object-anchor="happy-place"]', '[data-object-anchor="coppersmith-plumbing"]'];
const EXTRA = ["h1", "h2"];

let failures = 0;
function check(label, cond, detail = "") {
  if (cond) {
    console.log(`PASS ${label}`);
  } else {
    failures++;
    console.log(`FAIL ${label}${detail ? " :: " + detail : ""}`);
  }
}

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts?.ready?.catch(() => {}));
  await page.waitForTimeout(600);
}

async function measure(page, selectors) {
  return page.evaluate((sels) => {
    const out = {};
    for (const sel of sels) {
      out[sel] = Array.from(document.querySelectorAll(sel)).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
      });
    }
    out.__scrollWidth = document.documentElement.scrollWidth;
    out.__innerWidth = window.innerWidth;
    out.__layerProjection = document
      .querySelector('[data-testid="object-layer"]')
      ?.getAttribute("data-projection") ?? null;
    return out;
  }, selectors);
}

function sameRects(a, b, tol = 0.75) {
  if (a.length !== b.length) return `count ${a.length} vs ${b.length}`;
  for (let i = 0; i < a.length; i++) {
    for (const k of ["x", "y", "w", "h"]) {
      if (Math.abs(a[i][k] - b[i][k]) > tol) {
        return `rect[${i}].${k} ${a[i][k]} vs ${b[i][k]}`;
      }
    }
  }
  return null;
}

async function runViewport(browser, { w, h, label, projection }) {
  console.log(`\n--- ${label} ${w}x${h} ---`);
  const context = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await context.newPage();

  await page.goto(`${BASE}/?objectLayer=off`);
  await settle(page);
  const baseline = await measure(page, [...ANCHORS, ...EXTRA]);
  check(`${label}: layer absent when disabled`, baseline.__layerProjection === null);

  await page.goto(BASE + "/");
  await settle(page);
  const layered = await measure(page, [...ANCHORS, ...EXTRA]);
  check(
    `${label}: object layer mounted with expected projection`,
    layered.__layerProjection === projection,
    `got ${layered.__layerProjection}, want ${projection}`,
  );

  for (const sel of [...ANCHORS, ...EXTRA]) {
    const diff = sameRects(baseline[sel], layered[sel]);
    check(`${label}: geometry unchanged ${sel}`, diff === null, diff ?? "");
  }

  check(
    `${label}: no new horizontal overflow`,
    layered.__scrollWidth <= layered.__innerWidth + 2,
    `scrollWidth=${layered.__scrollWidth} innerWidth=${layered.__innerWidth}`,
  );

  if (projection === "mobile") {
    const tab = await page.$('[data-testid="mobile-object-tab"]');
    check(`${label}: mobile edge tab present`, !!tab);
    if (tab) {
      await tab.click();
      await page.waitForTimeout(500);
      const sheet = await page.$('[data-testid="mobile-object-sheet"]');
      check(`${label}: tap opens bottom sheet`, !!sheet);
      const afterSheet = await measure(page, ANCHORS);
      const diff = sameRects(baseline[ANCHORS[0]], afterSheet[ANCHORS[0]]);
      check(`${label}: sheet does not move content`, diff === null, diff ?? "");

      // Relationship on mobile: open an object, jump to its peer.
      const viewBtn = await page.$('[data-testid="mobile-object-sheet"] button[aria-label^="View "]');
      check(`${label}: sheet lists objects`, !!viewBtn);
      if (viewBtn) {
        await viewBtn.click();
        await page.waitForTimeout(500);
        const staticCard = await page.$('[data-testid="object-card-static"]');
        check(`${label}: object card shows in sheet`, !!staticCard);
        const relM = await page.$('[data-testid="object-relation"]');
        check(`${label}: relationship link on mobile card`, !!relM);
        if (relM) {
          const relTarget = await relM.getAttribute("data-related-object-id");
          await relM.evaluate((b) => b.click());
          await page.waitForTimeout(500);
          const textM = await page.$$eval('[data-testid="object-card-static"]', (els) =>
            els.map((el) => el.textContent || ""),
          );
          const wantM = /coppersmith/i.test(relTarget || "") ? /Coppersmith/i : /Happy Place/i;
          check(
            `${label}: mobile peer jump shows the related object`,
            textM.some((t) => wantM.test(t)),
            `${relTarget} :: ${textM.join(" | ").slice(0, 120)}`,
          );
        }
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const gone = await page.$('[data-testid="mobile-object-sheet"]');
      check(`${label}: sheet closes`, !gone);
    }
  } else {
    // Desktop/tablet: slots are either two single objects or one +N
    // cluster (anchors within the cluster window merge deterministically).
    await page.waitForFunction(
      () =>
        !!document.querySelector(
          'div[data-testid="object-layer"] div[data-testid="margin-object"], div[data-testid="object-layer"] div[data-testid="margin-cluster"]',
        ),
      { timeout: 8000 },
    );
    const singles = await page.$$(
      'div[data-testid="object-layer"] div[data-testid="margin-object"]',
    );
    const clusters = await page.$$(
      'div[data-testid="object-layer"] div[data-testid="margin-cluster"]',
    );
    check(
      `${label}: slots rendered`,
      singles.length + clusters.length > 0,
      `singles=${singles.length} clusters=${clusters.length}`,
    );

    // Evaluate-click dispatches click without mouse movement, so the
    // hover-intent open does not race the click toggle.
    const evalClick = (el) => el.evaluate((b) => b.click());

    if (singles.length === 2) {
      const triggers = await page.$$(
        'div[data-testid="object-layer"] div[data-testid="margin-object"] button[aria-label*="Expand to show"]',
      );
      check(`${label}: two object triggers`, triggers.length === 2, `got ${triggers.length}`);
      if (triggers.length === 2) {
        await evalClick(triggers[0]);
        await page.waitForTimeout(700);
        let cards = await page.$$('[data-testid="object-circle-card"]');
        check(`${label}: one card after first expand`, cards.length === 1, `got ${cards.length}`);
        const expanded = await measure(page, ANCHORS);
        const diff = sameRects(baseline[ANCHORS[0]], expanded[ANCHORS[0]]);
        check(`${label}: expansion does not move content`, diff === null, diff ?? "");

        const triggers2 = await page.$$(
          'div[data-testid="object-layer"] div[data-testid="margin-object"] > button',
        );
        await evalClick(triggers2[1]);
        await page.waitForTimeout(700);
        cards = await page.$$('[data-testid="object-circle-card"]');
        check(
          `${label}: still exactly one card after second expand`,
          cards.length === 1,
          `got ${cards.length}`,
        );
        const visible = await page.$$eval('[data-testid="object-circle-card"]', (els) =>
          els.map((el) => el.textContent || ""),
        );
        check(
          `${label}: second card displaced the first`,
          visible.some((t) => /Coppersmith/i.test(t)),
          visible.join(" | ").slice(0, 120),
        );
        const afterSecond = await measure(page, ANCHORS);
        const diff2 = sameRects(baseline[ANCHORS[0]], afterSecond[ANCHORS[0]]);
        check(`${label}: content stable after re-expand`, diff2 === null, diff2 ?? "");

        // Relationship: the expanded card names its peer and jumps to it.
        const rel = await page.$('[data-testid="object-relation"]');
        check(`${label}: relationship link rendered`, !!rel);
        if (rel) {
          const relTarget = await rel.getAttribute("data-related-object-id");
          await rel.evaluate((b) => b.click());
          await page.waitForTimeout(700);
          const cardsR = await page.$$('[data-testid="object-circle-card"]');
          check(
            `${label}: peer jump keeps exactly one card`,
            cardsR.length === 1,
            `got ${cardsR.length}`,
          );
          const textR = await page.$$eval('[data-testid="object-circle-card"]', (els) =>
            els.map((el) => el.textContent || ""),
          );
          const want = /coppersmith/i.test(relTarget || "")
            ? /Coppersmith/i
            : /Happy Place/i;
          check(
            `${label}: peer jump opened the related object`,
            textR.some((t) => want.test(t)),
            `${relTarget} :: ${textR.join(" | ").slice(0, 120)}`,
          );
        }
      }
    } else if (clusters.length === 1) {
      const cta = await page.$(
        'div[data-testid="object-layer"] div[data-testid="margin-cluster"] button',
      );
      check(`${label}: cluster trigger present`, !!cta);
      if (cta) {
        await cta.click();
        await page.waitForTimeout(500);
        const pop = await page.$('div[role="menu"][aria-label="Nearby objects"]');
        check(`${label}: cluster popover opens`, !!pop);
        const items = await page.$$(
          'div[role="menu"][aria-label="Nearby objects"] button[role="menuitem"]',
        );
        check(`${label}: popover lists both members`, items.length === 2, `got ${items.length}`);
        if (items.length > 0) {
          await items[0].click();
          await page.waitForTimeout(700);
          const cards = await page.$$('[data-testid="object-circle-card"]');
          check(
            `${label}: member card opens from cluster`,
            cards.length === 1,
            `got ${cards.length}`,
          );
          const afterCluster = await measure(page, ANCHORS);
          const diff = sameRects(baseline[ANCHORS[0]], afterCluster[ANCHORS[0]]);
          check(
            `${label}: cluster expansion does not move content`,
            diff === null,
            diff ?? "",
          );

          const relC = await page.$('[data-testid="object-relation"]');
          check(`${label}: relationship link on member card`, !!relC);
          if (relC) {
            const relTarget = await relC.getAttribute("data-related-object-id");
            await relC.evaluate((b) => b.click());
            await page.waitForTimeout(700);
            const cardsC = await page.$$('[data-testid="object-circle-card"]');
            check(
              `${label}: cluster peer jump keeps one card`,
              cardsC.length === 1,
              `got ${cardsC.length}`,
            );
            const textC = await page.$$eval('[data-testid="object-circle-card"]', (els) =>
              els.map((el) => el.textContent || ""),
            );
            const wantC = /coppersmith/i.test(relTarget || "")
              ? /Coppersmith/i
              : /Happy Place/i;
            check(
              `${label}: cluster peer jump opened the related object`,
              textC.some((t) => wantC.test(t)),
              `${relTarget} :: ${textC.join(" | ").slice(0, 120)}`,
            );
          }
        }
      }
    } else {
      check(
        `${label}: expected 2 singles or 1 cluster`,
        false,
        `singles=${singles.length} clusters=${clusters.length}`,
      );
    }
  }

  await context.close();
}

const browser = await chromium.launch();
try {
  await runViewport(browser, { w: 1440, h: 900, label: "desktop-wide", projection: "dual" });
  await runViewport(browser, { w: 1100, h: 800, label: "desktop-normal", projection: "single" });
  await runViewport(browser, { w: 800, h: 900, label: "tablet", projection: "edge" });
  await runViewport(browser, { w: 390, h: 844, label: "mobile", projection: "mobile" });
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL GEOMETRY CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
