/**
 * W-PROOF STEP 4: real headless browser evidence (Playwright + Chromium on Pig).
 * Desktop 1440x900 and mobile 375x812 for both sites:
 * page load, console/page errors, horizontal overflow, nav works,
 * section headings in DOM order, real facts present, screenshots.
 */
import { chromium } from "/home/nolan/projects/ping/node_modules/playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "http://localhost:3100";
const SHOT = "/home/nolan/fyd-proof-run/shots";
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

interface PageReport {
  site: string;
  viewport: string;
  url: string;
  status: number | null;
  consoleErrors: string[];
  pageErrors: string[];
  horizontalOverflow: boolean;
  scrollWidth: number;
  innerWidth: number;
  navLabels: string[];
  navClickOk: boolean;
  h2Headings: string[];
  peopleSectionPresent: boolean;
  factsPresent: Record<string, boolean>;
  antiFactsPresent: Record<string, boolean>;
  screenshot: string;
}

async function main(): Promise<void> {
  // WSL cannot launch a browser with --remote-debugging-pipe across the
  // Windows boundary, and the bundled Chromium lacks system libs (libnspr4.so).
  // The wrapper script starts Windows Chrome headless with a TCP CDP port;
  // connect to it here.
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const reports: PageReport[] = [];
  try {
    for (const site of SITES) {
      for (const vp of VIEWPORTS) {
        const label = site.id + "-" + vp.name;
        console.log("=== " + label + " ===");
        const page = await browser.newPage();
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        page.on("console", (m) => {
          if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
        });
        page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));
        let status: number | null = null;
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
          h2: Array.from(document.querySelectorAll("h2"))
            .map((h) => (h.textContent || "").trim().slice(0, 80)),
          nav: Array.from(document.querySelectorAll("nav a, header a"))
            .map((a) => ({
              label: (a.textContent || "").trim().slice(0, 40),
              href: (a as HTMLAnchorElement).href,
            }))
            .filter((a) => a.label.length > 0),
          text: document.body.innerText || "",
        }));
        // Nav click: click the About nav link (if present) and verify URL changes.
        let navClickOk = false;
        const aboutLink = metrics.nav.find((n) => n.label === "About");
        if (aboutLink) {
          try {
            await Promise.all([
              page.waitForURL("**/sites/" + site.id + "/about", { timeout: 15000 }),
              page.click("nav a:has-text('About'), header a:has-text('About')"),
            ]);
            navClickOk = page.url().endsWith("/sites/" + site.id + "/about");
            // go back for the screenshot of home
            await page.goto(BASE + "/sites/" + site.id, { waitUntil: "networkidle", timeout: 60000 });
            await page.waitForTimeout(1000);
          } catch (e) {
            pageErrors.push("NAV_CLICK_FAILED: " + String(e).slice(0, 200));
          }
        } else {
          pageErrors.push("NO_ABOUT_NAV_LINK");
        }
        const shotPath = SHOT + "/" + label + ".png";
        await page.screenshot({ path: shotPath, fullPage: true });
        const text = metrics.text;
        const factsPresent: Record<string, boolean> = {};
        for (const f of site.facts) factsPresent[f] = text.includes(f);
        const antiFactsPresent: Record<string, boolean> = {};
        for (const f of site.antiFacts) antiFactsPresent[f] = text.includes(f);
        const report: PageReport = {
          site: site.id,
          viewport: vp.name,
          url: BASE + "/sites/" + site.id,
          status,
          consoleErrors,
          pageErrors,
          horizontalOverflow: metrics.scrollWidth > metrics.innerWidth + 1,
          scrollWidth: metrics.scrollWidth,
          innerWidth: metrics.innerWidth,
          navLabels: [...new Set(metrics.nav.map((n) => n.label))].slice(0, 12),
          navClickOk,
          h2Headings: metrics.h2,
          peopleSectionPresent: metrics.h2.some((h) => /people/i.test(h)),
          factsPresent,
          antiFactsPresent,
          screenshot: shotPath,
        };
        reports.push(report);
        console.log(
          "status=" + status + " consoleErr=" + consoleErrors.length +
            " pageErr=" + pageErrors.length + " overflow=" + report.horizontalOverflow +
            " navClick=" + navClickOk + " people=" + report.peopleSectionPresent,
        );
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(
    "/home/nolan/fyd-proof-run/wproof-step4.json",
    JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2) + "\n",
  );
  const fails = reports.filter(
    (r) =>
      r.status !== 200 || r.pageErrors.length > 0 || r.consoleErrors.length > 0 ||
      r.horizontalOverflow || !r.navClickOk,
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
