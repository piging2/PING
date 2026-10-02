const { WICKED_WRENCH_GRAPH } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/proceduralize/__fixtures__/wicked-wrench-graph.js");
const { generateSiteSpec } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/proceduralize/generator.js");
const OPTS = { generatedAt: "2026-10-01T13:49:00.000Z" };
const a = generateSiteSpec(WICKED_WRENCH_GRAPH, OPTS);
const b = generateSiteSpec(WICKED_WRENCH_GRAPH, OPTS);
console.log("deterministic:", JSON.stringify(a) === JSON.stringify(b));
console.log("spec keys:", Object.keys(a).join(","));
console.log("pages:", (a.pages || []).map(p => p.slug).join(","));
console.log("objects:", WICKED_WRENCH_GRAPH.objects.length, "rels:", WICKED_WRENCH_GRAPH.relationships.length);
try {
  const v = require("/home/hatch/workspace/fyd-build/dist/src/fyd/sitespec/validator.js");
  const schemas = new Set(WICKED_WRENCH_GRAPH.objects.map((o) => o.schema));
  const findings = v.validateSiteSpec(a, schemas);
  const errors = findings.filter((f) => f.severity === "error");
  console.log("validator findings:", findings.length, "errors:", errors.length, "renderable:", v.isRenderable(findings));
  if (errors.length) console.log(JSON.stringify(errors).slice(0, 500));
} catch (e) { console.log("validator check:", e.message.slice(0, 150)); }
