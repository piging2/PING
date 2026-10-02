// Falsification edge tests for the ClaimBadge patch (patched renderer).
// 1. CTA section with ZERO bound objects (owner private) must render without
//    a badge and without crashing (the objects.length guard).
// 2. Links section with no safe links must return null (no badge invented).
// 3. ClaimBadge on a single website-derived object labels it (no crash).
import { renderToStaticMarkup } from "/home/nolan/fyd-factory-shard2/node_modules/react-dom/server.js";
import { generateSiteSpec } from "../projects/ping/src/fyd/proceduralize/generator";
import { buildRenderContext, renderSection } from "../projects/ping/src/fyd/components/renderer";

const T = "2026-09-23T20:00:00.000Z";
const biz = (vis) => ({
  id: "web:edge:business", schema: "ping.knowledge.business@1", controllerId: "web:edge",
  visibility: vis, title: "Edge Test Services", description: "Synthetic edge fixture.",
  fields: { phone: "+1 (555) 01000", website: "https://example-0000.test/" },
  createdAt: T, updatedAt: T,
  provenance: { kind: "website-derived", ref: "web:/edge/business", derivedAt: T },
});
const svc = {
  id: "web:edge:svc-00", schema: "ping.knowledge.service@1", controllerId: "web:edge",
  visibility: "public", title: "Inspection 1", description: "Synthetic service.",
  fields: { price_hint: "$100" }, createdAt: T, updatedAt: T,
  provenance: { kind: "website-derived", ref: "web:/edge/svc-00", derivedAt: T },
};
const rel = { id: "web:edge:rel-000", subject: "web:edge:business", predicate: "provides", object: "web:edge:svc-00", status: "active", createdAt: T, evidenceRef: "web:/edge/evidence" };

let failures = 0;
const check = (name, cond, extra = "") => {
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? " | " + extra : ""));
  if (!cond) failures++;
};

// Edge 1: CTA section with ZERO bound objects (owner made private AFTER spec
// gen, a real post-spec owner-intent scenario) must render without a badge
// and without crashing (the objects.length guard).
{
  const graph = { objects: [biz("public"), svc], relationships: [rel] };
  const spec = generateSiteSpec(graph, { generatedAt: T });
  const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null }, []);
  const cta = spec.pages.flatMap((p) => p.sections).find((s) => s.component === "CTA");
  check("edge1: CTA section exists", !!cta);
  if (cta) {
    const privGraph = {
      objects: graph.objects.map((o) => (o.id === "web:edge:business" ? { ...o, visibility: "private" } : o)),
      relationships: graph.relationships,
    };
    const privCtx = { ...ctx, graph: privGraph };
    const html = renderToStaticMarkup(renderSection(cta, privCtx));
    check("edge1: renders without crash", html.length > 0);
    check("edge1: no badge on zero objects", !/Website statement|Site record|Demo addition|Mixed sources/.test(html), `len=${html.length}`);
    check("edge1: Ask FYD anchor intact", html.includes("Ask FYD"));
  }
}
// Edge 2: Links with unsafe website and no socials -> null, no badge invented
{
  const b = biz("public");
  b.fields = { phone: "+1 (555) 01000", website: "javascript:evil()" };
  const graph = { objects: [b, svc], relationships: [rel] };
  const spec = generateSiteSpec(graph, { generatedAt: T });
  const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null }, []);
  const links = spec.pages.flatMap((p) => p.sections).find((s) => s.component === "Links");
  check("edge2: Links section exists", !!links);
  if (links) {
    const html = renderToStaticMarkup(renderSection(links, ctx));
    check("edge2: null render (no links)", html === "", `len=${html.length}`);
    check("edge2: no unsafe scheme", !/javascript:/i.test(html));
  }
}
// Edge 3: normal Links still renders badge after patch
{
  const graph = { objects: [biz("public"), svc], relationships: [rel] };
  const spec = generateSiteSpec(graph, { generatedAt: T });
  const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null }, []);
  const links = spec.pages.flatMap((p) => p.sections).find((s) => s.component === "Links");
  const html = renderToStaticMarkup(renderSection(links, ctx));
  check("edge3: Links renders badge", /Website statement|Site record|Demo addition|Mixed sources/.test(html));
  check("edge3: website link present", html.includes("example-0000.test"));
}
console.log(failures === 0 ? "ALL EDGE TESTS PASS" : `${failures} EDGE TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);
