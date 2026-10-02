// Unpatched dental check: does the Contact section render tel: at all?
import * as fs from "fs";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSiteSpec } from "../projects/ping/src/fyd/proceduralize/generator";
import {
  buildRenderContext,
  renderSection,
} from "../projects/ping/src/fyd/components/renderer";

const G = "2026-09-23T20:00:00.000Z";
const d = JSON.parse(
  fs.readFileSync(
    "/home/nolan/fyd-factory-shard2/corpus/fixtures/batch-b/f2b-canyon-view-dental.json",
    "utf8"
  )
);
const graph = d.graph;
const biz = graph.objects.find((o: any) => o.schema.includes("business"));
console.log("biz phone field:", JSON.stringify(biz.fields["phone"]));
console.log("biz provenance:", JSON.stringify(biz.provenance));
const spec = generateSiteSpec(graph, { generatedAt: G });
const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
let contactSections = 0;
for (const page of spec.pages) {
  page.sections.forEach((s: any) => {
    if (s.component !== "Contact") return;
    contactSections++;
    const html = renderToStaticMarkup(renderSection(s, ctx));
    const m = html.match(/href="tel:[^"]*"/gi) ?? [];
    console.log(`Contact section ${s.id}: tel: count = ${m.length}`, m.slice(0, 2));
  });
}
console.log("contact sections:", contactSections);
