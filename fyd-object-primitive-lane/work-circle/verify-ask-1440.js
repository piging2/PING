// Focused verification: FYD Ask card at 1440px after the right-edge fix.
// Runs ON THE PIG (Chromium installed via playwright). Measures the ask
// card bounds vs the viewport, Back-button and input visibility, document
// horizontal overflow, then recaptures hp-ask-1440.png / copper-ask-1440.png.
const { chromium } = require("playwright-core");
const fs = require("fs");

const BASE = process.env.SHOOT_BASE || "http://localhost:3100";
const OUT = process.env.SHOOT_OUT || "/tmp/fyd-evidence";
fs.mkdirSync(OUT, { recursive: true });

const BUSINESSES = [
  { id: "happy-place", anchor: "happy-place", short: "hp" },
  { id: "coppersmith-plumbing", anchor: "coppersmith-plumbing", short: "copper" },
];

async function measureAsk(page, id) {
  return page.evaluate((oid) => {
    const card = document.querySelector(`[data-object-id="${oid}"] [data-card-mode="ask"]`);
    if (!card) return { found: false };
    const r = card.getBoundingClientRect();
    const back = Array.from(card.querySelectorAll("button")).find((b) =>
      (b.textContent || "").trim().startsWith("Back"),
    );
    const input = card.querySelector('input[placeholder="What do you want to know?"]');
    const br = back ? back.getBoundingClientRect() : null;
    const ir = input ? input.getBoundingClientRect() : null;
    // Visible portion of an element inside the card's own border box.
    const vis = (er) => {
      if (!er) return null;
      const x0 = Math.max(er.left, r.left), x1 = Math.min(er.right, r.right);
      const y0 = Math.max(er.top, r.top), y1 = Math.min(er.bottom, r.bottom);
      return { w: Math.round(x1 - x0), h: Math.round(y1 - y0),
               full: Math.round(er.width), fullH: Math.round(er.height) };
    };
    return {
      found: true,
      innerW: window.innerWidth,
      card: { x: Math.round(r.left), y: Math.round(r.top),
              w: Math.round(r.width), h: Math.round(r.height),
              right: Math.round(r.right), bottom: Math.round(r.bottom) },
      backVisible: vis(br),
      inputVisible: vis(ir),
      hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, id);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  for (const b of BUSINESSES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${b.short} pageerror: ` + e.message.slice(0, 120)));
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.evaluate((anchor) => {
      const el = document.querySelector(`[data-object-anchor="${anchor}"]`);
      if (el) el.scrollIntoView({ block: "center" });
    }, b.anchor);
    await page.waitForTimeout(1200);
    const trig = page.locator(`[data-object-id="${b.id}"] [data-testid="object-circle-trigger"]`).first();
    await trig.hover();
    await page.waitForTimeout(700);
    let card = page.locator(`[data-object-id="${b.id}"] [data-card-mode="object"]`);
    if ((await card.count()) === 0) {
      await trig.click();
      await page.waitForTimeout(900);
      card = page.locator(`[data-object-id="${b.id}"] [data-card-mode="object"]`);
    }
    const askBtn = card.first().locator("button", { hasText: "Ask FYD" }).first();
    await askBtn.click();
    await page.waitForTimeout(1600);
    const m = await measureAsk(page, b.id);
    console.log(`${b.short} ask geometry:`, JSON.stringify(m));
    await page.screenshot({ path: `${OUT}/${b.short}-ask-1440.png` });
    console.log(`${b.short} screenshot saved`);
    await ctx.close();
  }
  await browser.close();
  if (errors.length) console.log("ERRORS:", JSON.stringify(errors));
  console.log("DONE");
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
