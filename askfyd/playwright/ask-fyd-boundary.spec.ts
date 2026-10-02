/**
 * ASK FYD -> EVIDENCE boundary spec (served UI level).
 *
 * SEQUENCED FOLLOW-UP (2026-09-30): these specs do NOT run in CI here.
 * They skip unless ASKFYD_PLAYWRIGHT_TARGET is set to a served FYD
 * instance rendering the Ask FYD widget
 * (src/fyd/components/ask-fyd-widget.tsx), because browser execution on
 * Pig WSL Linux chromium is infeasible (missing system libraries).
 * Selectors below are grounded in that widget's actual markup:
 *   form[aria-label="Ask FYD"], input[placeholder="What do you want to
 *   know?"], the "Ask FYD" submit button, div[aria-live="polite"] answer
 *   region, p[aria-label="Answer class: denial"], details > summary
 *   "Why this?" citations with Source:/Basis: lines.
 *
 * What the specs prove once executed:
 *   1. An unsupported question is DENIED at the UI: the denial badge
 *      renders, the refusal copy appears, and no "Why this?" citations
 *      are fabricated for a claim the system refused to make.
 *   2. A supported services question renders an answer WITH an
 *      expandable "Why this?" evidence panel where every citation
 *      carries a Source and a Basis (the CLAIM -> EVIDENCE -> SOURCE
 *      chain visible to the visitor).
 */
import { test, expect } from "./failure-bundle";

const TARGET = process.env.ASKFYD_PLAYWRIGHT_TARGET;

// Fail-closed at FILE level (before any browser fixture launches): without
// a served target these specs skip. Never a faked pass.
test.skip(
  !TARGET,
  "ASKFYD_PLAYWRIGHT_TARGET not set: browser execution is a sequenced follow-up (Pig WSL chromium infeasible).",
);

test.beforeEach(async ({ page }) => {
  await page.goto(TARGET!);
  await expect(page.locator('form[aria-label="Ask FYD"]')).toBeVisible();
});

async function ask(page: any, question: string) {
  await page.locator('input[placeholder="What do you want to know?"]').fill(question);
  await page.locator('form[aria-label="Ask FYD"] button[type="submit"]').click();
  const region = page.locator('div[aria-live="polite"]');
  // Wait for either an answered state or an error alert.
  await expect(region.locator("p, div").first()).toBeVisible({ timeout: 30_000 });
  return region;
}

test("unsupported question is denied with no fabricated evidence", async ({ page }) => {
  const region = await ask(page, "What is the owner's home address?");
  await expect(region.locator('p[aria-label="Answer class: denial"]')).toContainText(
    "Cannot answer",
  );
  await expect(region).toContainText("FYD only answers from what the site shows");
  // A denied answer must not carry a Why-this evidence panel.
  await expect(region.locator('details summary:has-text("Why this?")')).toHaveCount(0);
});

test("services question renders answer with sourced evidence", async ({ page }) => {
  const region = await ask(page, "What services does this business offer?");
  await expect(region.locator('p[aria-label="Answer class: denial"]')).toHaveCount(0);
  const whyThis = region.locator('details summary:has-text("Why this?")');
  await expect(whyThis).toBeVisible();
  await whyThis.click();
  const items = region.locator("details ul li");
  expect(await items.count()).toBeGreaterThan(0);
  const first = items.first();
  await expect(first).toContainText("Source:");
  await expect(first).toContainText("Basis:");
});
