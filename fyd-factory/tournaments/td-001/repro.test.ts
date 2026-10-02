/**
 * TD-001 repro: build the Coppersmith Explore spec and validate it.
 */
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { isRenderable, validateSiteSpec } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import { eligibleComponents } from "/home/nolan/projects/ping/src/fyd/sitespec/schemas";

const OPTS = { generatedAt: "2026-09-21T12:00:00.000Z" };

describe("TD-001 repro", () => {
  test("coppersmith explore spec validates", () => {
    const graph = COPPERSMITH_GRAPH as any;
    const schemas = [...new Set(graph.objects.map((o: any) => o.schema))];
    console.log("graph schemas:", JSON.stringify(schemas));
    console.log("external_identity eligible for:", JSON.stringify(eligibleComponents("ping.social.external_identity@1")));
    const spec = generateSiteSpec(graph, OPTS);
    const explore = spec.pages.find((p: any) => p.slug === "explore");
    console.log("explore section:", JSON.stringify(explore?.sections?.[0]?.query));
    const findings = validateSiteSpec(spec, new Set(graph.objects.map((o: any) => o.schema)));
    const errors = findings.filter((f) => f.severity === "error");
    console.log("ERRORS:", JSON.stringify(errors, null, 1));
    expect(errors).toEqual([]);
    expect(isRenderable(findings)).toBe(true);
  });
});
