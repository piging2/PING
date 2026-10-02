// Minimal repro: unbound-claim title leak. Renders section by section,
// reports which section(s) contain the unbound marker.
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { buildRenderContext, SitePageView, renderSection } from "/home/nolan/projects/ping/src/fyd/components/renderer";
import { renderToStaticMarkup } from "react-dom/server";

const MARKER = "UNBOUND-REPRO-MARKER";
const graph: any = {
  objects: [
    { id: "biz-1", schema: "ping.social.business@1", visibility: "public", title: "Repro Plumbing", description: "Repro desc",
      fields: { phone: "(970) 555-0100", website: "https://repro.example.com" },
      provenance: { kind: "synthetic", ref: "repro-fixture" }, createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z" },
    { id: "person-1", schema: "ping.social.person@1", visibility: "public", title: `${MARKER} Jane Doe`, description: "Unverified bio",
      fields: { role: "Tech" }, provenance: { kind: "synthetic", ref: "" },
      createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z" },
  ],
  relationships: [
    { subject: "biz-1", predicate: "employs", object: "person-1", status: "active" },
  ],
};

const spec: any = generateSiteSpec(graph, { generatedAt: "2026-09-23T20:00:00.000Z" });
const ctx: any = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
for (const page of spec.pages) {
  page.sections.forEach((s: any, idx: number) => {
    let html = "";
    try { html = renderToStaticMarkup(renderSection(s, ctx, idx) as any); } catch (e: any) { html = "RENDER-ERROR:" + String(e).slice(0, 80); }
    if (html.includes(MARKER)) {
      console.log(`LEAK page=${page.slug} section[${idx}] component=${s.component} query=${JSON.stringify(s.query)}`);
      const at = html.indexOf(MARKER);
      console.log("  context: " + html.slice(Math.max(0, at - 160), at + 120).replace(/\s+/g, " "));
    }
  });
}
console.log("repro-done");
