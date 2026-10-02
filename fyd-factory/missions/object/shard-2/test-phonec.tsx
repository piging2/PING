// Patch test: phonec dial gating.
// 1. hostile-phonec-trade -> Contact section must NOT render tel:
// 2. clearwater-plumbing-demo (no conflict) -> Contact section MUST render tel:
// 3. owner-corrected phone on a conflict-marked object -> tel: MUST render
//    (owner correction is human resolution and outranks markers)
import * as fs from "fs";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSiteSpec } from "../projects/ping/src/fyd/proceduralize/generator";
import {
  buildRenderContext,
  renderSection,
} from "../projects/ping/src/fyd/components/renderer";

const G = "2026-09-23T20:00:00.000Z";
let failures = 0;
function check(name: string, cond: boolean): void {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
  if (!cond) failures++;
}
function contactTel(fixturePath: string, mutate?: (g: any) => void): string[] {
  const d = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const graph = d.graph;
  if (mutate) mutate(graph);
  const spec = generateSiteSpec(graph, { generatedAt: G });
  const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
  const out: string[] = [];
  for (const page of spec.pages) {
    page.sections.forEach((s: any) => {
      if (s.component !== "Contact") return;
      const html = renderToStaticMarkup(renderSection(s, ctx));
      const m = html.match(/href="tel:[^"]*"/gi) ?? [];
      out.push(...m);
    });
  }
  return out;
}

// 1. phonec: no dial action
const t1 = contactTel("/home/nolan/fyd-factory-shard2/corpus/fixtures/hostile/hostile-phonec-trade.json");
check("phonec fixture renders no tel: dial action", t1.length === 0);
// 1b. dental fixture (batch-b, phone conflict preserved): no dial action
const t1b = contactTel("/home/nolan/fyd-factory-shard2/corpus/fixtures/batch-b/f2b-canyon-view-dental.json");
check("dental conflict fixture renders no tel: dial action", t1b.length === 0);

// 2. normal fixture: dial action preserved
const t2 = contactTel("/home/nolan/fyd-factory-shard2/corpus/fixtures/clearwater-plumbing-demo.json");
check("clearwater fixture still renders tel: dial action", t2.length > 0);

// 3. owner correction outranks conflict markers
const t3 = contactTel("/home/nolan/fyd-factory-shard2/corpus/fixtures/hostile/hostile-phonec-trade.json", (g) => {
  const biz = g.objects.find((o: any) => o.schema.includes("business"));
  biz.ownerFieldCorrections = [{
    field: "phone", label: "Phone",
    sourceValue: biz.fields["phone"], ownerValue: "+1 (555) 02000",
    correctedAt: G, actorLabel: "Synthetic Owner (seeded, unverified)",
    basis: "Owner correction: synthetic test owner attests the main number.",
  }];
  biz.fields["phone"] = "+1 (555) 02000";
});
check("owner-corrected phone on conflict-marked object still renders tel:", t3.length > 0);

console.log(failures === 0 ? "ALL PATCH TESTS PASS" : `${failures} PATCH TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);
