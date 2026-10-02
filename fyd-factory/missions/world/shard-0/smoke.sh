#!/bin/bash
cd /home/nolan/projects/ping || exit 1
cat > /tmp/w0-smoke.tsx <<'TSXEOF'
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// @ts-ignore
require.extensions[".css"] = (m: any) => { m.exports = {}; };
// @ts-ignore
require.extensions[".scss"] = (m: any) => { m.exports = {}; };
const { generateSiteSpec } = require("/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts");
const { validateSiteSpec } = require("/home/nolan/projects/ping/src/fyd/sitespec/validator.ts");
const { buildRenderContext, SitePageView, resolveQuery } = require("/home/nolan/projects/ping/src/fyd/components/renderer.tsx");
const React = require("/home/nolan/projects/ping/node_modules/react");
(globalThis as any).React = React;
const { renderToStaticMarkup } = require("/home/nolan/projects/ping/node_modules/react-dom/server.js");
const { createElement } = React;

const graph: ObjectGraph = {
  objects: [
    { id: "w0-biz", schema: "ping.social.business@1", controllerId: "c0", visibility: "public",
      title: "Acme Plumbing", description: "A test shop", fields: { phone: "+1 (555) 010-0000", website: "https://example.com", hours: "Mon-Fri 9-5" },
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
      provenance: { kind: "website-derived", ref: "synthetic://w0", derivedAt: "2026-09-23T00:00:00Z" } },
    { id: "w0-svc", schema: "ping.social.service@1", controllerId: "c0", visibility: "public",
      title: "Drain cleaning", description: "We clean drains", fields: {},
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
      provenance: { kind: "website-derived", ref: "synthetic://w0", derivedAt: "2026-09-23T00:00:00Z" } },
  ],
  relationships: [
    { id: "r0", subject: "w0-biz", predicate: "provides", object: "w0-svc", status: "active", createdAt: "2026-01-01T00:00:00Z", evidenceRef: "ev0" },
  ],
};
const t0 = Date.now();
const spec = generateSiteSpec(graph, { generatedAt: "2026-09-23T20:11:00Z" });
console.log("spec pages:", spec.pages.length, "gen ms:", Date.now() - t0);
const findings = validateSiteSpec(spec, new Set(["ping.social.business@1", "ping.social.service@1"]));
console.log("findings:", JSON.stringify(findings));
const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
const page = spec.pages[0];
const resolved: any = resolveQuery(page.sections[0].query, ctx.graph, spec.ownerObjectId);
console.log("resolveQuery ok, count:", Array.isArray(resolved) ? resolved.length : typeof resolved);
const html = renderToStaticMarkup(createElement(SitePageView as any, { page, ctx }));
console.log("html len:", html.length);
console.log("HTML-OK");
TSXEOF
timeout 110 npx tsx --tsconfig /home/nolan/projects/ping/tsconfig.json /tmp/w0-smoke.tsx 2>&1 | tail -20
