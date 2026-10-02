/**
 * tenant-mission-control.test.tsx — render-level verification of the staged
 * wiring patch's tenant surface, via react-dom/server (no DOM, no effects).
 *
 * What SSR can prove (initial render = pre-catalog state):
 *  1. Each tenant page binds its FIXED SITE_ID: the tenant badge and the
 *     tenant-bound copy carry the page's site id, and the two pages differ.
 *  2. No form is rendered before the catalog loads (fail-closed: catalog
 *     fetch failure -> error string, no form rendered). In particular there
 *     is no tenant form control anywhere in the initial DOM.
 *  3. No agent/capability options are hardcoded: the selects render only
 *     from the fetched catalog, so the initial DOM has zero <select>.
 *  4. Page metadata titles are tenant-correct.
 *
 * Static pins (source-content assertions, labeled as such):
 *  5. The mandated UNKNOWN string "OUTCOME UNKNOWN — RECONCILIATION IN
 *     PROGRESS" is present in the component source (rendered for both the
 *     dispatch message and the mission list/detail views).
 *  6. The DENIED copy "DENIED (not failed)" is present (deny is terminal-
 *     informative, never rendered as failed).
 *  7. No blind retry: the component has no retry control; the only
 *     dispatch trigger is the single Dispatch button (pinned by counting
 *     onClick={doDispatch} occurrences in source).
 *
 * Coverage gap (honest): post-catalog interaction states (form render,
 * DENIED/UNKNOWN message display after a dispatch) need effects + DOM.
 * Queued as follow-up for a jsdom or Pig-side browser pass.
 */
import * as fs from "fs";
import * as path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import HappyPlacePage, { metadata as hpMeta } from "../src-fixed/app/sites/happy-place/mission-control/page";
import CoppersmithPage, { metadata as csMeta } from "../src-fixed/app/sites/coppersmith-plumbing/mission-control/page";

const COMPONENT_SRC = fs.readFileSync(
  path.join(__dirname, "../src-fixed/app/sites/_shared/tenant-mission-control.tsx"),
  "utf8"
);
// Code only: strip block and line comments so docstring mentions of the
// no-retry design ("never blind-retries", "no idempotency key") don't
// false-positive the control-structure assertions below.
const COMPONENT_CODE = COMPONENT_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

describe("tenant page binding (SSR initial render)", () => {
  test("Happy Place page binds tenant happy-place", () => {
    const html = renderToStaticMarkup(HappyPlacePage());
    expect(html).toContain("tenant: happy-place");
    expect(html).toContain("tenant-bound to");
    expect(html).toContain("Mission Control — Happy Place Carpentry");
  });

  test("Coppersmith page binds tenant coppersmith-plumbing", () => {
    const html = renderToStaticMarkup(CoppersmithPage());
    expect(html).toContain("tenant: coppersmith-plumbing");
    expect(html).toContain("Mission Control — Coppersmith Plumbing");
  });

  test("the two pages bind different tenants (no shared default)", () => {
    const hp = renderToStaticMarkup(HappyPlacePage());
    const cs = renderToStaticMarkup(CoppersmithPage());
    expect(hp).not.toContain("coppersmith-plumbing");
    expect(cs).not.toContain("happy-place");
  });

  test("page metadata titles are tenant-correct", () => {
    expect(hpMeta.title).toContain("Happy Place");
    expect(csMeta.title).toContain("Coppersmith");
  });
});

describe("fail-closed initial state (no catalog, no form)", () => {
  test("initial render shows the loading state, not the form", () => {
    const html = renderToStaticMarkup(HappyPlacePage());
    expect(html).toContain("Loading dispatch catalog...");
  });

  test("no dispatch form controls exist before the catalog loads", () => {
    const html = renderToStaticMarkup(HappyPlacePage());
    // The missions-list Refresh button (read-only GET) is the only button
    // present; the dispatch form (prompt/agent/capability/Dispatch) renders
    // only after the catalog arrives.
    expect(html).not.toMatch(/<select/i);
    expect(html).not.toMatch(/<textarea/i);
    expect(html).not.toContain(">Dispatch</button>");
    expect(html).toContain(">Refresh</button>");
  });

  test("no tenant form control exists anywhere in the initial DOM", () => {
    const html = renderToStaticMarkup(HappyPlacePage());
    expect(html.toLowerCase()).not.toContain('name="tenant"');
    expect(html.toLowerCase()).not.toContain('id="tenant"');
  });

  test("agent/capability options are catalog-driven, not hardcoded in initial DOM", () => {
    const html = renderToStaticMarkup(HappyPlacePage());
    expect(html).not.toMatch(/<option/i);
  });
});

describe("mandated copy (static source pins)", () => {
  test("UNKNOWN renders the mandated reconciliation string", () => {
    const occurrences = COMPONENT_CODE.split("OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS").length - 1;
    // dispatch message + mission list row + mission detail header
    expect(occurrences).toBe(3);
  });

  test("DENIED is rendered as terminal-informative, never as failed", () => {
    expect(COMPONENT_SRC).toContain("DENIED (not failed)");
  });

  test("no blind retry: exactly one dispatch trigger exists", () => {
    const occurrences = COMPONENT_CODE.split("onClick={doDispatch}").length - 1;
    expect(occurrences).toBe(1);
    expect(COMPONENT_CODE).not.toMatch(/retry/i);
  });

  test("no idempotency-key retry helper exists in the component", () => {
    expect(COMPONENT_CODE.toLowerCase()).not.toContain("idempotency");
  });
});
