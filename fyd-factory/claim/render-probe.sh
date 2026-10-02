#!/bin/bash
cd /home/nolan/projects/ping
cat > /home/nolan/projects/ping/scratch-lane-claim-render.ts <<'EOF'
import { renderToStaticMarkup } from "react-dom/server";
import { SitePageView } from "./src/fyd/components/renderer";
import { generateSiteSpec } from "./src/fyd/proceduralize/generator";
import { COPPERSMITH_GRAPH } from "./src/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { HAPPY_PLACE_GRAPH } from "./src/fyd/proceduralize/__fixtures__/happy-place-graph";
import { verifyBinding, ownerAssertionsFromGraph } from "./src/fyd/sitespec/binding-verifier";
import type { ObjectGraph } from "./src/fyd/sitespec/types";

function renderAll(graph: ObjectGraph, label: string) {
  const spec = generateSiteSpec(graph, { generatedAt: "2026-09-21T12:00:00.000Z", eventSequences: [1, 2] });
  const ctx = { spec, graph, viewer: { viewerId: null, displayName: null } };
  let html = "";
  for (const page of spec.pages) {
    html += renderToStaticMarkup(SitePageView({ page, ctx } as any));
  }
  // strip tags to text-ish
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  console.log(`### ${label}: pages=${spec.pages.length} htmlChars=${html.length} textChars=${text.length}`);
  return text;
}

function auditClaims(graph: ObjectGraph, text: string, label: string) {
  const assertions = ownerAssertionsFromGraph(graph);
  let checked = 0, unbound = 0;
  const misses: string[] = [];
  for (const o of graph.objects) {
    const fields: [string, string][] = [["title", o.title], ["description", o.description]];
    for (const [k, v] of Object.entries(o.fields)) {
      if (typeof v === "string") fields.push([k, v]);
      else if (Array.isArray(v)) fields.push([k, v.join(", ")]);
    }
    for (const [field, value] of fields) {
      const v = value.trim();
      if (v.length < 4) continue;
      if (text.includes(v)) {
        checked++;
        const verdict = verifyBinding({ objectId: o.id, field, classification: "direct" }, graph, assertions);
        if (verdict.status !== "BOUND") { unbound++; misses.push(`${o.id}#${field} -> ${(verdict as any).reason} :: ${v.slice(0,60)}`); }
      }
    }
  }
  console.log(`### ${label}: rendered factual values checked=${checked} unbound=${unbound}`);
  for (const m of misses.slice(0, 15)) console.log("  MISS:", m);
}

const copText = renderAll(COPPERSMITH_GRAPH as ObjectGraph, "coppersmith-plumbing");
auditClaims(COPPERSMITH_GRAPH as ObjectGraph, copText, "coppersmith-plumbing");
const hpText = renderAll(HAPPY_PLACE_GRAPH as ObjectGraph, "happy-place");
auditClaims(HAPPY_PLACE_GRAPH as ObjectGraph, hpText, "happy-place");
// sample claims present in the coppersmith render
for (const needle of ["970-245-3869", "07:30-16:00", "25 years", "Grand Junction"]) {
  console.log(`coppersmith html contains "${needle}":`, copText.includes(needle));
}
EOF
npx tsx scratch-lane-claim-render.ts
rm /home/nolan/projects/ping/scratch-lane-claim-render.ts
