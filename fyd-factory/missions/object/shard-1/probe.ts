import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import { buildRenderContext, SitePageView } from "/home/nolan/projects/ping/src/fyd/components/renderer";
import { renderToStaticMarkup } from "react-dom/server";
import * as fs from "fs";

const raw = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const graph = raw.graph ?? raw;
const spec = generateSiteSpec(graph, { generatedAt: "2026-09-23T00:00:00.000Z" });
const known = new Set<string>(graph.objects.map((o: any) => o.schema));
const findings = validateSiteSpec(spec, known);
console.log(JSON.stringify({
  renderable: isRenderable(findings),
  errors: findings.filter((f: any) => f.severity === "error").length,
  warnings: findings.filter((f: any) => f.severity === "warning").length,
  pages: spec.pages.length,
}));
const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
let total = 0;
for (const page of spec.pages) {
  const body = renderToStaticMarkup(SitePageView({ page, ctx }) as any);
  total += body.length;
}
console.log(JSON.stringify({ htmlBytes: total }));
