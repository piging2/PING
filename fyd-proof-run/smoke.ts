/** Separate smoke: import both regenerated fixtures, generate + validate, print OK. */
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { validateSiteSpec } from "@/fyd/sitespec/validator";
import { HAPPY_PLACE_GRAPH } from "@/fyd/proceduralize/__fixtures__/happy-place-graph";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";

const KNOWN = [...new Set([
  ...HAPPY_PLACE_GRAPH.objects.map((o) => o.schema),
  ...COPPERSMITH_GRAPH.objects.map((o) => o.schema),
])];
for (const [name, graph] of [["happy-place", HAPPY_PLACE_GRAPH], ["coppersmith", COPPERSMITH_GRAPH]] as const) {
  const spec = generateSiteSpec(graph, { generatedAt: "2026-09-21T12:00:00.000Z" });
  const findings = validateSiteSpec(spec, KNOWN);
  console.log(name, "objects=" + graph.objects.length, "rels=" + graph.relationships.length,
    "pages=" + spec.pages.length, "findings=" + findings.length);
}
console.log("OK");
