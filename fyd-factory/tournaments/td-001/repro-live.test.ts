/**
 * TD-001 live-path repro: real PING projection -> generateSiteSpec -> validateSiteSpec.
 * Mirrors src/app/sites/coppersmith-plumbing/page.tsx exactly.
 */
import { readFileSync } from "node:fs";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { isRenderable, validateSiteSpec } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";

describe("TD-001 live repro", () => {
  test("coppersmith live projection spec validates", () => {
    const proj = JSON.parse(
      readFileSync("/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json", "utf8"),
    );
    const graph = proj.graph;
    const meta = proj.meta;
    const spec = generateSiteSpec(graph, {
      generatedAt: meta.generatedAt,
      eventSequences: meta.eventSequences ?? undefined,
    });
    const explore = spec.pages.find((p: any) => p.slug === "explore");
    console.log("explore query:", JSON.stringify(explore?.sections?.[0]?.query));
    const knownSchemas = new Set(graph.objects.map((o: any) => o.schema));
    const findings = validateSiteSpec(spec, knownSchemas);
    const errors = findings.filter((f) => f.severity === "error");
    console.log("ERRORS:", JSON.stringify(errors, null, 1));
    console.log("renderable:", isRenderable(findings));
    expect(errors).toEqual([]);
  });

  test("happy place live projection still validates", () => {
    const proj = JSON.parse(
      readFileSync("/home/nolan/ping/var/fyd-projections/happy-place.json", "utf8"),
    );
    const graph = proj.graph;
    const spec = generateSiteSpec(graph, {
      generatedAt: proj.meta.generatedAt,
      eventSequences: proj.meta.eventSequences ?? undefined,
    });
    const knownSchemas = new Set(graph.objects.map((o: any) => o.schema));
    const findings = validateSiteSpec(spec, knownSchemas);
    const errors = findings.filter((f) => f.severity === "error");
    console.log("HP ERRORS:", JSON.stringify(errors, null, 1));
    expect(errors).toEqual([]);
  });
});
