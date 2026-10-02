/**
 * TD-001 regression: an Explore ObjectFeed built against a graph containing
 * a ping.social.external_identity@1 object validates clean.
 *
 * The generator's Explore page narrows the `all` query to the schemas
 * ObjectFeed accepts (src/fyd/proceduralize/generator.ts explorePage);
 * external_identity resolves to GenericObjectCard only, so it is excluded
 * from the feed query instead of failing validation. This test pins that
 * behavior so a future schema or generator change cannot reintroduce the
 * "Spec failed validation" state on the Coppersmith Explore page.
 */

import { COPPERSMITH_GRAPH } from "../../proceduralize/__fixtures__/coppersmith-graph";
import { HAPPY_PLACE_GRAPH } from "../../proceduralize/__fixtures__/happy-place-graph";
import { generateSiteSpec } from "../../proceduralize/generator";
import { eligibleComponents } from "../schemas";
import type { ObjectGraph } from "../types";
import { isRenderable, validateSiteSpec } from "../validator";

const OPTS = { generatedAt: "2026-09-21T12:00:00.000Z" };

function schemasOf(graph: ObjectGraph): Set<string> {
  return new Set(graph.objects.map((o) => o.schema));
}

describe("TD-001: Explore ObjectFeed with external_identity in the graph", () => {
  test("external_identity is not an ObjectFeed schema (GenericObjectCard only)", () => {
    expect(eligibleComponents("ping.social.external_identity@1")).toEqual([
      "GenericObjectCard",
    ]);
    expect(eligibleComponents("ping.social.external_identity@1")).not.toContain(
      "ObjectFeed",
    );
  });

  test("coppersmith graph contains a public external_identity object", () => {
    const ext = COPPERSMITH_GRAPH.objects.filter(
      (o) => o.schema === "ping.social.external_identity@1" && o.visibility === "public",
    );
    expect(ext.length).toBeGreaterThan(0);
  });

  test("generated Explore ObjectFeed excludes the schema and validates", () => {
    const spec = generateSiteSpec(COPPERSMITH_GRAPH, OPTS);
    const explore = spec.pages.find((p) => p.slug === "explore");
    expect(explore).toBeDefined();
    const section = explore!.sections[0];
    expect(section.component).toBe("ObjectFeed");
    expect(section.query.kind).toBe("all");
    const querySchemas =
      section.query.kind === "all" ? (section.query.schemas ?? []) : [];
    expect(querySchemas).not.toContain("ping.social.external_identity@1");
    const findings = validateSiteSpec(spec, schemasOf(COPPERSMITH_GRAPH));
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toEqual([]);
    expect(isRenderable(findings)).toBe(true);
  });

  test("happy place spec still validates", () => {
    const spec = generateSiteSpec(HAPPY_PLACE_GRAPH, OPTS);
    const findings = validateSiteSpec(spec, schemasOf(HAPPY_PLACE_GRAPH));
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(isRenderable(findings)).toBe(true);
  });
});
