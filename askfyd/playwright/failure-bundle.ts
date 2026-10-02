/**
 * Failure-bundle hook: on test failure, persist everything needed to
 * replay the failure in the Playwright trace viewer without re-running
 * the browser.
 *
 * Bundle layout:
 *   failure-bundles/<spec-file>/<test-title>-<ISO-ts>/
 *     screenshot.png        full-page capture at failure
 *     trace.zip             Playwright trace (open with trace viewer)
 *     console-errors.json   page console errors + failed requests
 *     page-html.html        DOM snapshot at failure
 */
import { test as base } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const consoleErrors: Array<{ type: string; text: string }> = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push({ type: "console", text: msg.text() });
    });
    page.on("pageerror", (err) => {
      consoleErrors.push({ type: "pageerror", text: String(err) });
    });
    page.on("requestfailed", (req) => {
      consoleErrors.push({
        type: "requestfailed",
        text: `${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? "unknown"}`,
      });
    });
    await use(page);
    if (testInfo.status !== testInfo.expectedStatus) {
      const dir = join(
        testInfo.outputDir,
        "bundle",
        slug(testInfo.title),
        new Date().toISOString().replace(/[:.]/g, "-"),
      );
      mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: join(dir, "screenshot.png"), fullPage: true });
      writeFileSync(join(dir, "console-errors.json"), JSON.stringify(consoleErrors, null, 2));
      writeFileSync(join(dir, "page-html.html"), await page.content());
      // The trace.zip is written by the runner (trace: retain-on-failure)
      // into testInfo.outputDir; note its location for the bundle reader.
      writeFileSync(
        join(dir, "README.txt"),
        [
          "ASK FYD failure bundle",
          `test: ${testInfo.title}`,
          `file: ${testInfo.file}`,
          `status: ${testInfo.status} (expected ${testInfo.expectedStatus})`,
          `trace: see trace.zip in ${testInfo.outputDir} (retain-on-failure)`,
          `error: ${(testInfo.error as Error | undefined)?.message ?? "n/a"}`,
        ].join("\n"),
      );
    }
  },
});

export { expect } from "@playwright/test";
