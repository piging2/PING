// FYD Circle visual-correction merge: evidence captures.
// RESTING (40px quiet circle) -> OBJECT (compact 300x400 card) -> ASK (300x460).
// Desktop (>=768): hover/click trigger opens the compact card; Ask FYD opens ask mode.
// Mobile (<768): edge tab -> bottom sheet -> list -> compact card -> Ask mode.
const { chromium } = require("playwright-core");
const CDP_URL = process.env.SHOOT_CDP || "http://127.0.0.1:9333";
const fs = require("fs");
const BASE = process.env.SHOOT_BASE || "http://100.79.154.43:3100";
const OUT = process.env.SHOOT_OUT || "/home/hatch/workspace/fyd-object-primitive-lane/work-circle/evidence";
fs.mkdirSync(OUT, { recursive: true });

const BUSINESSES = [
  { id: "happy-place", anchor: "happy-place", short: "hp", match: /happy/i },
  { id: "coppersmith-plumbing", anchor: "coppersmith-plumbing", short: "copper", match: /coppersmith/i },
];

async function pageMetrics(page) {
  return page.evaluate(() => ({
    hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    vScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    innerW: window.innerWidth,
  }));
}

async function openCompactDesktop(page, b) {
  const scope = `[data-object-id="${b.id}"]`;
  const trig = page.locator(`${scope} [data-testid="object-circle-trigger"]`).first();
  await trig.hover();
  await page.waitForTimeout(700);
  let card = page.locator(`${scope} [data-card-mode="object"]`);
  if ((await card.count()) === 0) {
    await trig.click(); // pin fallback
    await page.waitForTimeout(900);
    card = page.locator(`${scope} [data-card-mode="object"]`);
  }
  return card;
}

async function desktopPass(browser, width, errors) {
  for (const b of BUSINESSES) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${width}/${b.short} pageerror: ` + e.message.slice(0, 120)));
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.evaluate((anchor) => {
      const el = document.querySelector(`[data-object-anchor="${anchor}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }, b.anchor);
    await page.waitForTimeout(1200);
    console.log(`desktop ${width} ${b.short} rest metrics:`, JSON.stringify(await pageMetrics(page)));
    await page.screenshot({ path: `${OUT}/${b.short}-rest-${width}.png` });

    const card = await openCompactDesktop(page, b);
    const openCount = await card.count();
    console.log(`desktop ${width} ${b.short} compact open:`, openCount);
    if (openCount > 0) {
      const cardInfo = await card.first().evaluate((el) => {
        const cs = getComputedStyle(el);
        const inner = el.firstElementChild;
        const ics = inner ? getComputedStyle(inner) : null;
        return {
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height),
          overflow: cs.overflow + "/" + cs.overflowY,
          scrollable: el.scrollHeight - el.clientHeight,
          innerScrollable: inner ? inner.scrollHeight - inner.clientHeight : null,
          innerOverflow: ics ? ics.overflow + "/" + ics.overflowY : null,
        };
      });
      console.log(`desktop ${width} ${b.short} card info:`, JSON.stringify(cardInfo));
      // Card text content: name, description, contact, actions
      const text = (await card.first().innerText()).replace(/\n{2,}/g, "\n").slice(0, 900);
      console.log(`desktop ${width} ${b.short} card text:\n${text}\n---`);
      const buttons = await card.first().locator("button").allInnerTexts();
      console.log(`desktop ${width} ${b.short} card buttons:`, JSON.stringify(buttons.map((t) => t.trim()).filter(Boolean)));
      await page.screenshot({ path: `${OUT}/${b.short}-object-${width}.png` });

      const askBtn = card.first().locator("button", { hasText: "Ask FYD" }).first();
      await askBtn.click();
      await page.waitForTimeout(1600);
      const askCard = page.locator(`[data-object-id="${b.id}"] [data-card-mode="ask"]`);
      console.log(`desktop ${width} ${b.short} ask open:`, await askCard.count());
      if ((await askCard.count()) > 0) {
        const askText = (await askCard.first().innerText()).replace(/\n{2,}/g, "\n").slice(0, 700);
        console.log(`desktop ${width} ${b.short} ask text:\n${askText}\n---`);
      }
      await page.screenshot({ path: `${OUT}/${b.short}-ask-${width}.png` });
    }
    console.log(`desktop ${width} ${b.short} final metrics:`, JSON.stringify(await pageMetrics(page)));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.close();
    await ctx.close();
  }
}

async function mobilePass(browser, width, errors) {
  for (const b of BUSINESSES) {
    const ctx = await browser.newContext({
      viewport: { width, height: 800 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`m${width}/${b.short} pageerror: ` + e.message.slice(0, 120)));
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
    console.log(`mobile ${width} ${b.short} rest metrics:`, JSON.stringify(await pageMetrics(page)));
    await page.screenshot({ path: `${OUT}/${b.short}-rest-${width}.png` });

    const tab = page.locator('[data-testid="mobile-object-tab"]');
    console.log(`mobile ${width} tab present:`, await tab.count());
    if ((await tab.count()) > 0) {
      await tab.first().tap();
      await page.waitForTimeout(1200);
      const sheet = page.locator('[data-testid="mobile-object-sheet"]');
      console.log(`mobile ${width} sheet open:`, await sheet.count());
      await page.screenshot({ path: `${OUT}/${b.short}-sheet-${width}.png` });
      const item = sheet.locator('button[aria-label^="View "]').filter({ hasText: b.match }).first();
      console.log(`mobile ${width} ${b.short} list item:`, await item.count());
      if ((await item.count()) > 0) {
        await item.tap();
        await page.waitForTimeout(1200);
        const card = sheet.locator('[data-card-mode="object"]');
        console.log(`mobile ${width} ${b.short} compact open:`, await card.count());
        if ((await card.count()) > 0) {
          const cardInfo = await card.first().evaluate((el) => ({
            w: Math.round(el.getBoundingClientRect().width),
            h: Math.round(el.getBoundingClientRect().height),
            scrollable: el.scrollHeight - el.clientHeight,
          }));
          console.log(`mobile ${width} ${b.short} card info:`, JSON.stringify(cardInfo));
          const text = (await card.first().innerText()).replace(/\n{2,}/g, "\n").slice(0, 900);
          console.log(`mobile ${width} ${b.short} card text:\n${text}\n---`);
        }
        await page.screenshot({ path: `${OUT}/${b.short}-object-${width}.png` });
        const askBtn = sheet.locator('[data-card-mode="object"] button', { hasText: "Ask FYD" }).first();
        if ((await askBtn.count()) > 0) {
          await askBtn.tap();
          await page.waitForTimeout(1600);
          console.log(`mobile ${width} ${b.short} ask open:`, await sheet.locator('[data-card-mode="ask"]').count());
        }
        await page.screenshot({ path: `${OUT}/${b.short}-ask-${width}.png` });
      }
    }
    console.log(`mobile ${width} ${b.short} final metrics:`, JSON.stringify(await pageMetrics(page)));
    await page.close();
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const errors = [];
  await desktopPass(browser, 1440, errors);
  await mobilePass(browser, 375, errors);
  await mobilePass(browser, 320, errors);
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("SHOT-FAIL", e.message); process.exit(1); });
