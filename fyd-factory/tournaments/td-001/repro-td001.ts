import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph";

const spec = generateSiteSpec(COPPERSMITH_GRAPH, { generatedAt: "2026-09-23T00:00:00Z" });
const knownSchemas = new Set(COPPERSMITH_GRAPH.objects.map((o) => o.schema));
console.log("knownSchemas:", [...knownSchemas].join(", "));
const explore = spec.pages.find((p) => p.slug === "explore");
console.log("explore page sections:", JSON.stringify(explore?.sections, null, 1));
const findings = validateSiteSpec(spec, knownSchemas);
console.log("renderable:", isRenderable(findings));
for (const f of findings.filter((f) => f.severity === "error")) {
  console.log("ERROR", f.path, "::", f.message);
}
