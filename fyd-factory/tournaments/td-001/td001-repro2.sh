#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== happy place fixture exports ====="
grep -n "^export" src/fyd/proceduralize/__fixtures__/happy-place-graph.ts | head
cat > /home/nolan/td001-repro2.ts <<'TSEOF'
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph";

const spec = generateSiteSpec(HAPPY_PLACE_GRAPH, { generatedAt: "2026-09-23T00:00:00Z" });
const knownSchemas = new Set(HAPPY_PLACE_GRAPH.objects.map((o) => o.schema));
console.log("knownSchemas:", [...knownSchemas].join(", "));
console.log("pages:", spec.pages.map((p) => p.slug).join(", "));
const findings = validateSiteSpec(spec, knownSchemas);
console.log("renderable:", isRenderable(findings));
for (const f of findings.filter((x) => x.severity === "error")) {
  console.log("ERROR", f.path, "::", f.message);
}
TSEOF
npx tsx /home/nolan/td001-repro2.ts 2>&1 | head -40
