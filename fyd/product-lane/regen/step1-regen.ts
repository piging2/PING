/**
 * STEP 1: Regenerate both experiences from CURRENT evidence/object graphs.
 * Loads the canonical projections with digest verification (same rules as
 * src/fyd/data/ping-object-source.ts), runs generateSiteSpec twice to prove
 * determinism, and records: graph digest, SiteSpec digest, selected
 * sections, object->section dependencies, available capabilities.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateSiteSpec } from "../piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src/fyd/proceduralize/generator";
// resolveQuery lives in renderer.tsx which imports CSS modules (not loadable
// under plain tsx). Mirror of its pure logic, verified against
// src/fyd/components/renderer.tsx lines 72-128 at commit a69bb68f.
import type { FYDQuery, PingObject } from "../piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src/fyd/sitespec/types";
function resolveQuery(query: FYDQuery, graph: ObjectGraph, ownerId: string): PingObject[] {
  const objects = new Map(graph.objects.map((o) => [o.id, o]));
  const pub = (o: PingObject) => o.visibility === "public";
  switch (query.kind) {
    case "static": return [];
    case "owner": { const o = objects.get(ownerId); return o && pub(o) ? [o] : []; }
    case "reference":
      return (query.objectIds ?? []).map((id) => objects.get(id)).filter((o): o is PingObject => !!o && pub(o));
    case "related": {
      const out: PingObject[] = [];
      const predicates = query.predicates ?? [query.predicate];
      const inverse = query.inversePredicates ?? [];
      for (const r of graph.relationships) {
        if (r.status !== "active") continue;
        let targetId: string | undefined;
        if (r.subject === query.from && predicates.includes(r.predicate)) targetId = r.object;
        else if (r.object === query.from && inverse.includes(r.predicate)) targetId = r.subject;
        else continue;
        const target = objects.get(targetId);
        const schemaOk = !query.schema && !query.schemas ? true
          : query.schema ? target?.schema === query.schema
          : query.schemas?.includes(target?.schema ?? "");
        if (target && pub(target) && schemaOk) out.push(target);
      }
      out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return query.limit ? out.slice(0, query.limit) : out;
    }
    case "all": {
      const schemaOk = (o: PingObject) => !query.schema && !query.schemas ? true
        : query.schema ? o.schema === query.schema : (query.schemas ?? []).includes(o.schema);
      const out = graph.objects.filter((o) => pub(o) && schemaOk(o));
      out.sort((a, b) => a.updatedAt !== b.updatedAt ? b.updatedAt.localeCompare(a.updatedAt) : a.id < b.id ? -1 : 1);
      return query.limit ? out.slice(0, query.limit) : out;
    }
  }
}
import { eligibleComponents, getSchemaDef, capabilityOptions } from "../piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src/fyd/sitespec/schemas";
import { canonicalize } from "../piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src/lib/ping/ask-composer";
import type { ObjectGraph } from "../piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src/fyd/sitespec/types";

const PROJ_DIR = "/home/hatch/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src/fyd/object/__tests__/fixtures/projections";
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

function loadProjection(siteId: string) {
  const raw = readFileSync(join(PROJ_DIR, `${siteId}.json`), "utf8");
  const proj = JSON.parse(raw);
  if (proj.meta.siteId !== siteId) throw new Error(`siteId mismatch for ${siteId}`);
  for (const o of proj.graph.objects) {
    if (!o.provenance?.ref) throw new Error(`object ${o.id} has no provenance ref`);
  }
  const recomputed = sha256(canonicalize(proj.graph));
  if (recomputed !== proj.meta.graphDigest) {
    throw new Error(`graphDigest mismatch for ${siteId}: ${recomputed} != ${proj.meta.graphDigest}`);
  }
  return proj as { graph: ObjectGraph; meta: Record<string, unknown> };
}

const GEN_AT = "2026-09-23T18:00:00.000Z";

for (const siteId of ["happy-place", "coppersmith-plumbing"]) {
  const { graph, meta } = loadProjection(siteId);
  const spec1 = generateSiteSpec(graph, { generatedAt: GEN_AT });
  const spec2 = generateSiteSpec(graph, { generatedAt: GEN_AT });
  const d1 = sha256(canonicalize(spec1));
  const d2 = sha256(canonicalize(spec2));
  console.log(`===== ${siteId} =====`);
  console.log(`graphDigest:      ${meta.graphDigest}`);
  console.log(`graph objects:    ${graph.objects.length}`);
  console.log(`graph rels:       ${graph.relationships.length}`);
  console.log(`ownerObjectId:    ${spec1.ownerObjectId}`);
  console.log(`specDigest(run1): ${d1}`);
  console.log(`specDigest(run2): ${d2}`);
  console.log(`deterministic:    ${d1 === d2 ? "YES" : "NO - BROKEN"}`);
  console.log(`pages:            ${spec1.pages.map((p) => p.slug).join(", ")}`);
  for (const page of spec1.pages) {
    console.log(`  [${page.slug}] sections:`);
    for (const s of page.sections) {
      const ids = resolveQuery(s.query, graph, spec1.ownerObjectId).map((o) => o.id);
      console.log(`    ${s.id} component=${s.component} query=${JSON.stringify(s.query)} objects=[${ids.map((i) => i.slice(-8)).join(",")}]`);
    }
  }
  console.log(`capabilities per object (visitor, public):`);
  for (const o of graph.objects) {
    const def = getSchemaDef(o.schema);
    const comps = eligibleComponents(o.schema);
    const caps = def
      ? capabilityOptions(def, { viewerId: null, controllerId: o.controllerId ?? "", hasWebsite: !!o.fields?.website })
      : ["(no schema def: generic only)"];
    console.log(`  ${o.id.slice(-12)} ${o.schema} comps=[${comps.join(",")}] caps=[${caps.join(",")}]`);
  }
  console.log("");
}
