/**
 * W-PROOF STEP 4 (Windows side): real headless Chrome via CDP.
 * Run with Windows node: node wproof-step4-win.cjs
 * Expects Windows Chrome headless on CDP http://127.0.0.1:9222.
 */
const { chromium } = require("playwright-core");
const { writeFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const BASE = "http://localhost:3100";
const SHOT = "C:\\Temp\\fyd-proof\\shots";
mkdirSync(SHOT, { recursive: true });

const SITES = [
  {
    id: "happy-place",
    facts: ["Happy Place Carpentry LLC", "Adair Village", "Repairs", "Fencing", "Painting", "Drywall", "Restoration"],
    antiFacts: ["Coppersmith", "Grand Junction", "coppersmithplm", "Pergola"],
    expectPeople: false,
  },
  {
    id: "coppersmith-plumbing",
    facts: ["Coppersmith Plumbing", "Grand Junction", "81501", "Plumbing", "Heating", "Ventilation", "coppersmithplm"],
    antiFacts: ["Happy Place Carpentry", "Adair Village", "Pergola"],
    expectPeople: true,
  },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const reports = [];
  try {
    for (const site of SITES) {
      for (const vp of VIEWPORTS) {
        const label = site.id + "-" + vp.name;
        console.log("=== " + label + " ===");
        const page = await browser.newPage();
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const consoleErrors = [];
        const pageErrors = [];
        page.on("console", (m) => {
          if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
        });
        page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));
        let status = null;
        try {
          const resp = await page.goto(BASE + "/sites/" + site.id, {
            waitUntil: "networkidle",
            timeout: 60000,
          });
          status = resp ? resp.status() : null;
        } catch (e) {
          pageErrors.push("GOTO_FAILED: " + String(e).slice(0, 200));
        }
        await page.waitForTimeout(1500);
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          h2: Array.from(document.querySelectorAll("h2")).map((h) => (h.textContent || "").trim().slice(0, 80)),
          nav: Array.from(document.querySelectorAll("nav button, nav a, header button, header a"))
            .map((a) => (a.textContent || "").trim().slice(0, 40))
            .filter((t) => t.length > 0),
          text: document.body.innerText || "",
        }));
        // Nav test: click the About nav control (client-side page switch) and
        // verify the about page sections render (BusinessSummary heading), then
        // click back to Home.
        let navClickOk = false;
        let aboutHeadings = [];
        try {
          const aboutBtn = page.locator("nav button, nav a, header button, header a", { hasText: "About" }).first();
          if ((await aboutBtn.count()) > 0) {
            await aboutBtn.click({ timeout: 10000 });
            await page.waitForTimeout(1200);
            aboutHeadings = await page.evaluate(() =>
              Array.from(document.querySelectorAll("h2")).map((h) => (h.textContent || "").trim().slice(0, 80)),
            );
            const homeBtn = page.locator("nav button, nav a, header button, header a", { hasText: "Home" }).first();
            if ((await homeBtn.count()) > 0) {
              await homeBtn.click({ timeout: 10000 });
              await page.waitForTimeout(1200);
              const backHeadings = await page.evaluate(() =>
                Array.from(document.querySelectorAll("h2")).map((h) => (h.textContent || "").trim().slice(0, 80)),
              );
              navClickOk = backHeadings.join("|") === metrics.h2.join("|") && aboutHeadings.length > 0;
            }
          } else {
            pageErrors.push("NO_ABOUT_NAV_CONTROL");
          }
        } catch (e) {
          pageErrors.push("NAV_CLICK_FAILED: " + String(e).slice(0, 200));
        }
        const shotPath = join(SHOT, label + ".png");
        await page.screenshot({ path: shotPath, fullPage: true });
        const text = metrics.text;
        const factsPresent = {};
        for (const f of site.facts) factsPresent[f] = text.includes(f);
        const antiFactsPresent = {};
        for (const f of site.antiFacts) antiFactsPresent[f] = text.includes(f);
        reports.push({
          site: site.id,
          viewport: vp.name,
          url: BASE + "/sites/" + site.id,
          status,
          consoleErrors,
          pageErrors,
          horizontalOverflow: metrics.scrollWidth > metrics.innerWidth + 1,
          scrollWidth: metrics.scrollWidth,
          innerWidth: metrics.innerWidth,
          navLabels: [...new Set(metrics.nav)].slice(0, 12),
          navClickOk,
          aboutHeadings,
          h2Headings: metrics.h2,
          peopleSectionPresent: metrics.h2.some((h) => /people/i.test(h)),
          peopleExpected: site.expectPeople,
          factsPresent,
          antiFactsPresent,
          screenshot: shotPath,
        });
        console.log(
          "status=" + status + " consoleErr=" + consoleErrors.length +
            " pageErr=" + pageErrors.length + " overflow=" + (metrics.scrollWidth > metrics.innerWidth + 1) +
            " navClick=" + navClickOk + " people=" + metrics.h2.some((h) => /people/i.test(h)),
        );
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(
    "C:\\Temp\\fyd-proof\\wproof-step4.json",
    JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2) + "\n",
  );
  const fails = reports.filter(
    (r) =>
      r.status !== 200 || r.pageErrors.length > 0 || r.consoleErrors.length > 0 ||
      r.horizontalOverflow || !r.navClickOk ||
      r.peopleSectionPresent !== r.peopleExpected ||
      Object.values(r.factsPresent).some((v) => !v) ||
      Object.values(r.antiFactsPresent).some((v) => v),
  );
  if (fails.length > 0) {
    console.error("STEP4 FAILURES: " + fails.map((f) => f.site + "-" + f.viewport).join(", "));
    process.exit(1);
  }
  console.log("STEP4: ALL GREEN");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
