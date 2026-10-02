// Falsification for the rail binding-gate patch.
// Case A: BOUND person (provenance ref present) must still feature -> marker present.
// Case B: ONLY unbound non-owner objects -> ObjectRail section returns null, no crash,
//         other sections still render (sections > 0).
import { generateSiteSpec } from "/home/nolan/fyd-factory/object-shard1/patched/src/fyd/proceduralize/generator";
import { buildRenderContext, SitePageView, renderSection } from "/home/nolan/fyd-factory/object-shard1/patched/src/fyd/components/renderer";
import { renderToStaticMarkup } from "react-dom/server";

function biz(id: string) {
  return { id, schema: "ping.social.business@1", visibility: "public", title: "Falsify Plumbing", description: "desc",
    fields: { phone: "(970) 555-0100", website: "https://falsify.example.com", claimKind: "synthetic_statement" },
    provenance: { kind: "synthetic", ref: "falsify-fixture" }, createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z" };
}
function person(id: string, marker: string, ref: string) {
  return { id, schema: "ping.social.person@1", visibility: "public", title: `${marker} Jane Doe`, description: "bio",
    fields: { role: "Tech", claimKind: "synthetic_statement" }, provenance: { kind: "synthetic", ref },
    createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z" };
}

// Case A
{
  const graph: any = { objects: [biz("biz-a"), person("p-a", "BOUND-A", "falsify-fixture")],
    relationships: [{ subject: "biz-a", predicate: "employs", object: "p-a", status: "active" }] };
  const spec: any = generateSiteSpec(graph, { generatedAt: "2026-09-23T20:00:00.000Z" });
  const ctx: any = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
  let found = false;
  for (const page of spec.pages) page.sections.forEach((s: any, i: number) => {
    const html = renderToStaticMarkup(renderSection(s, ctx, i) as any);
    if (html.includes("BOUND-A")) found = true;
  });
  console.log("CASE-A bound person featured:", found ? "PASS" : "FAIL (section nuked)");
}
// Case B
{
  const graph: any = { objects: [biz("biz-b"), person("p-b", "UNBOUND-B", "")],
    relationships: [{ subject: "biz-b", predicate: "employs", object: "p-b", status: "active" }] };
  const spec: any = generateSiteSpec(graph, { generatedAt: "2026-09-23T20:00:00.000Z" });
  const ctx: any = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
  let leak = false, railSections = 0, totalSections = 0, crashed: string | null = null;
  try {
    for (const page of spec.pages) page.sections.forEach((s: any, i: number) => {
      totalSections++;
      if (s.component === "ObjectRail") {
        railSections++;
        const el = renderSection(s, ctx, i);
        const html = el === null ? "" : renderToStaticMarkup(el as any);
        if (html.includes("UNBOUND-B")) leak = true;
        if (el !== null) console.log("CASE-B note: ObjectRail rendered non-null for unbound-only candidates");
      } else {
        renderToStaticMarkup(renderSection(s, ctx, i) as any);
      }
    });
  } catch (e: any) { crashed = String(e).slice(0, 120); }
  console.log("CASE-B no leak:", !leak ? "PASS" : "FAIL", "| crashed:", crashed ?? "no",
    "| rail sections:", railSections, "| total sections:", totalSections);
}
// Case C: full-page render on patched tree still deterministic
{
  const graph: any = { objects: [biz("biz-c"), person("p-c", "BOUND-C", "falsify-fixture")],
    relationships: [{ subject: "biz-c", predicate: "employs", object: "p-c", status: "active" }] };
  const run = () => {
    const spec: any = generateSiteSpec(graph, { generatedAt: "2026-09-23T20:00:00.000Z" });
    const ctx: any = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
    return spec.pages.map((p: any) => renderToStaticMarkup(SitePageView({ page: p, ctx }) as any)).join("");
  };
  console.log("CASE-C determinism on patched tree:", run() === run() ? "PASS" : "FAIL");
}
