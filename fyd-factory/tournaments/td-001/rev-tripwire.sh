#!/bin/bash
cd /home/nolan/projects/ping || exit 1
cat > /tmp/td001-adversarial.ts <<'EOF'
import { readFileSync } from "fs";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { isRenderable, validateSiteSpec } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import type { ObjectGraph } from "/home/nolan/projects/ping/src/fyd/sitespec/types";

const proj = JSON.parse(readFileSync("/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json", "utf8"));
const graph: ObjectGraph = proj.graph ?? proj;

// Simulate the PRE-FIX regression: bare `all` query under ObjectFeed (exactly what 4a9cc919^ emitted)
const spec = generateSiteSpec(graph, { generatedAt: "2026-09-23T19:00:00.000Z" });
const explore = spec.pages.find((p) => p.slug === "explore")!;
const feed = explore.sections.find((s) => s.component === "ObjectFeed")!;
const regressed = structuredClone(spec);
const rs = regressed.pages.find((p) => p.slug === "explore")!.sections.find((s) => s.component === "ObjectFeed")!;
(rs.query as any).schemas = undefined; // bare all, pre-fix behavior
const knownSchemas = new Set(graph.objects.map((o) => o.schema));
const findings = validateSiteSpec(regressed, knownSchemas);
const errors = findings.filter((f) => f.severity === "error");
console.log("regressed errors:", JSON.stringify(errors, null, 1));
console.log("regressed renderable:", isRenderable(findings));

// happy-place live check via fixture
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts";
import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts";
for (const [name, g] of [["coppersmith", COPPERSMITH_GRAPH], ["happy-place", HAPPY_PLACE_GRAPH]] as const) {
  const s = generateSiteSpec(g, { generatedAt: "2026-09-21T12:00:00.000Z" });
  const ks = new Set(g.objects.map((o) => o.schema));
  const fs = validateSiteSpec(s, ks);
  console.log(name, "fixture errors:", fs.filter((f) => f.severity === "error").length, "renderable:", isRenderable(fs));
}
EOF
npx tsx /tmp/td001-adversarial.ts
rm -f /tmp/td001-adversarial.ts
