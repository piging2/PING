/**
 * Playwright failure bundle for the ASK FYD -> EVIDENCE boundary.
 *
 * EXECUTION STATUS (2026-09-30): SEQUENCED FOLLOW-UP, NOT RUN.
 * The specs below are written against the real Ask FYD widget
 * (src/fyd/components/ask-fyd-widget.tsx) selectors, but browser
 * execution on Pig WSL's Linux chromium is infeasible (missing system
 * libraries, observed 2026-09-30). The suite is fail-closed: it skips
 * unless ASKFYD_PLAYWRIGHT_TARGET points at a served FYD instance, so
 * no pass is ever faked. First execution belongs on a host with a
 * working browser (Windows-side Chrome via the house CDP session).
 *
 * FAILURE ARTIFACTS: on any failure, failure-bundle.ts writes
 *   failure-bundles/<spec>/<test>/<timestamp>/{screenshot.png,
 *   trace.zip, console-errors.json, page-html.html}
 * for Playwright trace-viewer replay.
 */
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

export default defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: join(__dirname, "html-report") }]],
  use: {
    baseURL: process.env.ASKFYD_PLAYWRIGHT_TARGET,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  outputDir: join(__dirname, "failure-bundles"),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
