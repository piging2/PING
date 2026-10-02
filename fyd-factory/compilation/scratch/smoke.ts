import * as crypto from "node:crypto";
import * as fs from "node:fs";
// renderer.tsx transitively imports .css modules; stub them for headless compile.
require.extensions[".css"] = function (m: any) { m.exports = {}; };
const PING = "/home/nolan/projects/ping/src";

function canon(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
}
const digest = (v: any) => crypto.createHash("sha256").update(canon(v)).digest("hex");

async function main() {
  const { generateSiteSpec } = await import(PING + "/fyd/proceduralize/generator.ts");
  const { validateSiteSpec, isRenderable } = await import(PING + "/fyd/sitespec/validator.ts");
  const { buildRenderContext } = await import(PING + "/fyd/components/renderer.tsx");

  const raw = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const graph = raw.graph;
  const gd = digest(graph);
  const OPTS = { generatedAt: "2026-09-23T00:00:00.000Z" };
  const s1 = generateSiteSpec(graph, OPTS);
  const s2 = generateSiteSpec(graph, OPTS);
  const d1 = digest(s1), d2 = digest(s2);
  console.log("graph_digest", gd.slice(0,16), "spec_digest", d1.slice(0,16), "determinism", d1 === d2);
  console.log("owner rooted:", graph.objects.some((o:any)=>o.id===s1.ownerObjectId));
  const ks = new Set(graph.objects.map((o:any)=>o.schema));
  const f = validateSiteSpec(s1, ks);
  console.log("findings", f.length, "errors", f.filter((x:any)=>x.severity==="error").length, "renderable", isRenderable(f));
  const ctx = buildRenderContext(s1, graph, { viewerId: null, displayName: null });
  console.log("render ctx ok, pages:", ctx.spec.pages.length, "sections:", ctx.spec.pages.reduce((n:any,p:any)=>n+p.sections.length,0));
  console.log("SMOKE_OK");
}
main().catch(e => { console.error("SMOKE_FAIL", e && e.message); process.exit(1); });
