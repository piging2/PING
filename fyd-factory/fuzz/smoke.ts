import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import { buildRenderContext } from "/home/nolan/projects/ping/src/fyd/components/renderer";

const graph = {
  objects: [
    {
      id: "biz-1", schema: "ping.social.business@1", controllerId: "web:example.com",
      visibility: "public", title: "Test Shop", description: "A test shop.",
      fields: {}, createdAt: "2026-01-01", updatedAt: "2026-01-02",
      provenance: { kind: "website-derived", ref: "example.com", derivedAt: "2026-01-01" },
    },
  ],
  relationships: [],
};
const spec = generateSiteSpec(graph as any, { generatedAt: "2026-09-23T00:00:00Z" });
const findings = validateSiteSpec(spec, new Set(["ping.social.business@1"]));
console.log("pages:", spec.pages.map((p) => p.slug).join(","), "| renderable:", isRenderable(findings), "| errors:", findings.filter((f) => f.severity === "error").length);
const ctx = buildRenderContext(spec, graph as any, { viewerId: null, displayName: null });
console.log("ctx ok, graph objects:", ctx.graph.objects.length);
console.log("SMOKE_OK");
