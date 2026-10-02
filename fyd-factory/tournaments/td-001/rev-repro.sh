#!/bin/bash
# Adversarial independent reproduction of the TD-001 coppersmith explore path.
cd /home/nolan/projects/ping || exit 1
cat > /tmp/td001-repro.ts <<'EOF'
import { readFileSync } from "fs";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { eligibleComponents } from "/home/nolan/projects/ping/src/fyd/sitespec/schemas";
import { isRenderable, validateSiteSpec } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import type { ObjectGraph } from "/home/nolan/projects/ping/src/fyd/sitespec/types";

const EXT = "ping.social.external_identity@1";

console.log("eligibleComponents(external_identity):", JSON.stringify(eligibleComponents(EXT)));

const proj = JSON.parse(readFileSync("/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json", "utf8"));
const graph: ObjectGraph = proj.graph ?? proj;
const pub = graph.objects.filter((o) => o.visibility === "public");
console.log("objects total:", graph.objects.length, "public:", pub.length);
console.log("schemas:", JSON.stringify([...new Set(graph.objects.map((o) => o.schema))]));
console.log("public external_identity objects:", graph.objects.filter((o) => o.schema === EXT && o.visibility === "public").length);

const spec = generateSiteSpec(graph, { generatedAt: "2026-09-23T19:00:00.000Z" });
const explore = spec.pages.find((p) => p.slug === "explore");
if (!explore) { console.log("NO EXPLORE PAGE"); process.exit(2); }
const feed = explore.sections.find((s) => s.component === "ObjectFeed");
console.log("explore feed query:", JSON.stringify(feed?.query));
const knownSchemas = new Set(graph.objects.map((o) => o.schema));
const findings = validateSiteSpec(spec, knownSchemas);
const errors = findings.filter((f) => f.severity === "error");
console.log("errors:", JSON.stringify(errors, null, 1));
console.log("renderable:", isRenderable(findings));
EOF
npx tsx /tmp/td001-repro.ts
echo "exit=$?"
rm -f /tmp/td001-repro.ts
