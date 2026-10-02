/**
 * Generator tests: ObjectGraph -> FYDSiteSpec.
 *
 * The deterministic baseline: schema presence + cardinality +
 * relationships -> the same spec, byte-identical, for the same graph.
 * Missing data means the page or section does not exist; nothing is
 * invented.
 */
import { generateSiteSpec } from "../src/generator";
import type { ObjectGraph } from "../src/types";
import { HAPPY_PLACE_GRAPH } from "../fixtures/happy-place-graph";

const GRAPH = HAPPY_PLACE_GRAPH;
const GEN_AT = "2026-10-02T12:00:00Z";

test("Happy Place compiles to the expected pages and owner", () => {
  const spec = generateSiteSpec(GRAPH, { generatedAt: GEN_AT });
  expect(spec.kind).toBe("fyd.sitespec@1");
  expect(spec.ownerObjectId).toBe("website-business-6fa5ebd99d72c4cb");
  expect(spec.pages.map((p) => p.slug)).toEqual([
    "home",
    "about",
    "services",
    "explore",
  ]);
  const home = spec.pages[0];
  expect(home.sections[0].component).toBe("Hero");
  expect(home.sections[0].query).toEqual({ kind: "owner" });
  const names = home.sections.map((s) => s.component);
  expect(names).toContain("Services");
  expect(names).toContain("Locations");
  expect(names).toContain("Contact");
  expect(names).toContain("CTA");
  expect(names).toContain("AskFYD");
});

test("section ids are stable pageSlug:component:ordinal (per-component, not positional)", () => {
  const spec = generateSiteSpec(GRAPH, { generatedAt: GEN_AT });
  for (const page of spec.pages) {
    const seen = new Map<string, number>();
    for (const s of page.sections) {
      const ordinal = seen.get(s.component) ?? 0;
      seen.set(s.component, ordinal + 1);
      expect(s.id).toBe(`${page.slug}:${s.component}:${ordinal}`);
    }
  }
});

test("same graph -> byte-identical spec", () => {
  const a = JSON.stringify(generateSiteSpec(GRAPH, { generatedAt: GEN_AT }));
  const b = JSON.stringify(generateSiteSpec(GRAPH, { generatedAt: GEN_AT }));
  expect(b).toBe(a);
});

test("empty graph -> no pages, no owner, nothing invented", () => {
  const spec = generateSiteSpec({ objects: [], relationships: [] }, { generatedAt: GEN_AT });
  expect(spec.pages).toEqual([]);
  expect(spec.ownerObjectId).toBe("");
  expect(spec.navigation).toEqual([]);
});

test("spec provenance labels claims as website_statement", () => {
  const spec = generateSiteSpec(GRAPH, { generatedAt: GEN_AT });
  expect(spec.provenance.source).toBe("website-ingestion");
  expect(spec.provenance.claimKind).toBe("website_statement");
});

test("graph with owner but no services has no services page or Services section", () => {
  const graph: ObjectGraph = {
    objects: GRAPH.objects.filter((o) => o.schema === "ping.social.business@1"),
    relationships: [],
  };
  const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
  expect(spec.pages.map((p) => p.slug)).not.toContain("services");
  const home = spec.pages.find((p) => p.slug === "home");
  expect(home?.sections.map((s) => s.component)).not.toContain("Services");
});
