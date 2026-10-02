const { chromium } = require("playwright-core");
const BASE = "http://100.79.154.43:3100";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));

  // HTTP checks.
  for (const u of [BASE + "/", BASE + "/?objectLayer=off"]) {
    const r = await page.goto(u, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log(u, "->", r.status());
  }
  const offCount = await page.evaluate(() => document.body.innerHTML.split("object-layer").length - 1);
  console.log("object-layer refs with ?objectLayer=off:", offCount);

  // Geometry: center content x with layer on vs off (read-only measurement).
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const geoOn = await page.evaluate(() => {
    const h = document.querySelector("main h1, h1");
    const r = h ? h.getBoundingClientRect() : null;
    return r ? { x: Math.round(r.x), w: Math.round(r.width) } : null;
  });
  await page.goto(BASE + "/?objectLayer=off", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const geoOff = await page.evaluate(() => {
    const h = document.querySelector("main h1, h1");
    const r = h ? h.getBoundingClientRect() : null;
    return r ? { x: Math.round(r.x), w: Math.round(r.width) } : null;
  });
  console.log("center h1 on:", JSON.stringify(geoOn), "off:", JSON.stringify(geoOff),
    "identical:", JSON.stringify(geoOn) === JSON.stringify(geoOff));

  // Peer jump: Happy Place -> Coppersmith.
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const el = document.querySelector('[data-object-anchor="happy-place"]');
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(800);
  await page.locator('[data-object-id="happy-place"] [data-testid="object-circle-trigger"]').hover();
  await page.waitForTimeout(500);
  await page.locator('[data-object-id="happy-place"] button', { hasText: "Expand" }).click();
  await page.waitForTimeout(1800);
  const peer = page.locator('[data-object-id="happy-place"] [data-object-card="rich"] button', { hasText: "Coppersmith" });
  console.log("peer button present:", await peer.count());
  if (await peer.count()) {
    await peer.first().click();
    await page.waitForTimeout(2500);
    const copperRich = await page.locator('[data-object-id="coppersmith"] [data-object-card="rich"]').count();
    const happyCards = await page.locator('[data-object-id="happy-place"] [data-object-card="peek"], [data-object-id="happy-place"] [data-object-card="rich"]').count();
    const head = await page.locator('[data-object-id="coppersmith"] [data-object-card="rich"]').innerText().catch(() => "");
    console.log("coppersmith rich open:", copperRich === 1, "| happy-place cards:", happyCards,
      "| head:", JSON.stringify(head.split("\n")[0]));
    await page.screenshot({ path: "/tmp/final-copper-rich.png" });
  }
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
