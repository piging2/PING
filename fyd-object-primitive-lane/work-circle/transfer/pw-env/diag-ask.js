// Diagnostic: measure Ask-mode card geometry at 1440 to find the cutoff mechanism.
const { chromium } = require("playwright-core");
const BASE = process.env.SHOOT_BASE || "http://100.79.154.43:3100";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const el = document.querySelector('[data-object-anchor="happy-place"]');
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(1200);
  const scope = '[data-object-id="happy-place"]';
  const trig = page.locator(`${scope} [data-testid="object-circle-trigger"]`).first();
  await trig.hover();
  await page.waitForTimeout(700);
  let card = page.locator(`${scope} [data-card-mode="object"]`);
  if ((await card.count()) === 0) {
    await trig.click();
    await page.waitForTimeout(900);
    card = page.locator(`${scope} [data-card-mode="object"]`);
  }
  console.log("compact open:", await card.count());
  const askBtn = card.first().locator("button", { hasText: "Ask FYD" }).first();
  await askBtn.click();
  await page.waitForTimeout(1600);
  const askCard = page.locator(`${scope} [data-card-mode="ask"]`);
  console.log("ask open:", await askCard.count());

  const geo = await page.evaluate(() => {
    const out = { vw: window.innerWidth };
    const scopeEl = document.querySelector('[data-object-id="happy-place"]');
    const cardEl = document.querySelector('[data-object-id="happy-place"] [data-card-mode="ask"]');
    if (!cardEl) return { ...out, card: null };
    const cr = cardEl.getBoundingClientRect();
    out.card = { x: cr.x, y: cr.y, w: cr.width, h: cr.height };
    out.cardStyle = { left: cardEl.style.left, top: cardEl.style.top };
    // find slot wrapper (parent with absolute position and the rest size)
    let slot = cardEl.parentElement;
    out.slot = slot ? { tag: slot.tagName, x: slot.getBoundingClientRect().x, y: slot.getBoundingClientRect().y } : null;
    // header row, input, suggestions
    const header = cardEl.querySelector("button");
    const input = cardEl.querySelector("input");
    const items = [];
    cardEl.querySelectorAll("button, input, p").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) {
        items.push({
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.placeholder || "").slice(0, 30),
          x: Math.round(r.x),
          w: Math.round(r.width),
          leftOfCard: Math.round(r.x - cr.x),
          rightOfCard: Math.round(r.x + r.width - (cr.x + cr.width)),
          beyondViewportRight: Math.round(r.x + r.width - out.vw),
          beyondViewportLeft: Math.round(r.x),
        });
      }
    });
    out.items = items.slice(0, 12);
    out.scroll = {
      docSW: document.documentElement.scrollWidth,
      docCW: document.documentElement.clientWidth,
      bodySW: document.body.scrollWidth,
    };
    return out;
  });
  console.log(JSON.stringify(geo, null, 1));
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
