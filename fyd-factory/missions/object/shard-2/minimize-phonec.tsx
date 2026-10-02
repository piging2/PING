// Minimize the phonec fail-closed violation: which section renders tel:?
import * as fs from "fs";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSiteSpec } from "../projects/ping/src/fyd/proceduralize/generator";
import {
  buildRenderContext,
  renderSection,
} from "../projects/ping/src/fyd/components/renderer";

const fx = JSON.parse(
  fs.readFileSync(
    "/home/nolan/fyd-factory-shard2/corpus/fixtures/hostile/hostile-phonec-trade.json",
    "utf8"
  )
);
const graph = fx.graph;
console.log("objects:", graph.objects.length);
const biz = graph.objects.find((o: any) => o.schema.includes("business"));
console.log("biz fields:", JSON.stringify(biz.fields).slice(0, 400));

const spec = generateSiteSpec(graph, { generatedAt: "2026-09-23T20:00:00.000Z" });
const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
for (const page of spec.pages) {
  page.sections.forEach((s: any) => {
    const html = renderToStaticMarkup(renderSection(s, ctx));
    const m = html.match(/href="tel:[^"]*"/gi);
    if (m) {
      const at = html.indexOf("tel:");
      console.log(`VIOLATION page=${page.slug} section=${s.id} component=${s.component}`);
      console.log("  context:", html.slice(Math.max(0, at - 200), at + 120).replace(/\s+/g, " "));
    }
  });
}
console.log("minimize-done");
