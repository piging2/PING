#!/bin/bash
cd /home/nolan/projects/ping || exit 1
cat > /tmp/w0-dbg5.tsx <<'TSXEOF'
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// @ts-ignore
require.extensions[".css"] = (m: any) => { m.exports = {}; };
const React = require("/home/nolan/projects/ping/node_modules/react");
(globalThis as any).React = React;
const { generateSiteSpec } = require("/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts");
const { buildRenderContext, SitePageView } = require("/home/nolan/projects/ping/src/fyd/components/renderer.tsx");
const { renderToStaticMarkup } = require("/home/nolan/projects/ping/node_modules/react-dom/server.js");
// world 4260: many-services (12), hide w4260-svc-1 ("Repair 2")
const ts = "2026-09-23T20:11:00Z";
const SVCS = ["Installation","Repair","Maintenance","Consultation","Inspection","Cleaning","Upgrade","Support","Tune-up","Replacement","Assessment","Emergency service"];
const mk = (id: string, schema: string, title: string, vis: string) => ({ id, schema, controllerId: "c", visibility: vis, title, description: "A svc offering: " + title + ".", fields: {}, createdAt: ts, updatedAt: ts, provenance: { kind: "website-derived", ref: "s", derivedAt: ts } });
const objs: any[] = [mk("w4260-biz", "ping.social.business@1", "Test Biz", "public")];
objs[0].fields = { phone: "+1-555-014260" };
const rels: any[] = [];
for (let k = 0; k < 12; k++) {
  const id = "w4260-svc-" + k;
  objs.push(mk(id, "ping.social.service@1", SVCS[k] + " " + (k + 1), k === 1 ? "private" : "public"));
  rels.push({ id: "rel-" + k, subject: "w4260-biz", predicate: "provides", object: id, status: "active", createdAt: ts, evidenceRef: "e" });
}
const graph: any = { objects: objs, relationships: rels };
const spec = generateSiteSpec(graph, { generatedAt: ts });
const ctx = buildRenderContext(spec, graph, { viewerId: null, displayName: null });
let html = "";
for (const p of spec.pages) html += renderToStaticMarkup(React.createElement(SitePageView, { page: p, ctx }));
console.log("hidden title 'Repair 2' in html:", html.includes("Repair 2"));
console.log("hidden id 'w4260-svc-1' in html:", html.includes("w4260-svc-1"));
const i10 = html.indexOf("w4260-svc-10");
console.log("svc-10 in html:", i10 >= 0, i10 >= 0 ? JSON.stringify(html.slice(Math.max(0, i10 - 120), i10 + 60)) : "");
TSXEOF
timeout 100 npx tsx --tsconfig /home/nolan/projects/ping/tsconfig.json /tmp/w0-dbg5.tsx 2>&1 | tail -5
