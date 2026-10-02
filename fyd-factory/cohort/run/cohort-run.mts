// cohort-run.mts: NIGHT-COHORT acquisition runner (runs on Pig via tsx).
// Read-only wrt the repo. Usage:
//   tsx cohort-run.mts <rawRoot> <sitesJson> <observedAt> <outDir>
// For each site dir in rawRoot: fetch manifest -> runExtractionPipeline ->
// generateSiteSpec -> validateSiteSpec/isRenderable -> buildSemanticRenderModel.
// Emits one JSON per site into outDir.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { runExtractionPipeline } from "/home/nolan/projects/ping/src/fyd/proceduralize/proceduralizer";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import { buildSemanticRenderModel } from "/home/nolan/projects/ping/src/fyd/sitespec/render-model";

const [rawRoot, sitesJson, observedAt, outDir] = process.argv.slice(2);
if (!rawRoot || !sitesJson || !observedAt || !outDir) {
  console.error("usage: tsx cohort-run.mts <rawRoot> <sitesJson> <observedAt> <outDir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

interface SiteMeta { site_id: string; category: string; business_name: string; source_url: string; platform_guess: string; }
const sites: SiteMeta[] = JSON.parse(readFileSync(sitesJson, "utf8"));
const byId = new Map(sites.map((s) => [s.site_id, s]));

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

function platformSignals(html: string): Record<string, boolean> {
  const h = html.toLowerCase();
  return {
    wordpress: h.includes("wp-content") || h.includes("wp-includes") || /<meta[^>]+generator[^>]+wordpress/i.test(html),
    wix: h.includes("wix.com") || h.includes("wixstatic") || /<meta[^>]+generator[^>]+wix/i.test(html),
    squarespace: h.includes("squarespace") || h.includes("static1.squarespace"),
    webflow: h.includes("webflow") || /<meta[^>]+generator[^>]+webflow/i.test(html),
    shopify: h.includes("shopify") || h.includes("cdn.shopify"),
    nextjs: h.includes("__next_data__") || h.includes("_next/static"),
    react_spa_shell: /<div[^>]+id=["']root["']/.test(h) || /<div[^>]+id=["']app["']/.test(h),
    legacy_tables: (h.match(/<table/g) || []).length > 5 && !h.includes("wp-content"),
    generator_meta: /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i.test(html),
  };
}
function generatorName(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i);
  return m ? m[1] : null;
}

function extractMedia(pages: { url: string; raw: string }[]): { url: string; page_url: string; kind: string }[] {
  const out: { url: string; page_url: string; kind: string }[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    const kinds: [RegExp, string][] = [
      [/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi, "og:image"],
      [/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi, "twitter:image"],
      [/<img[^>]+src=["']([^"']+)["']/gi, "img"],
    ];
    for (const [re, kind] of kinds) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(p.raw)) !== null && out.length < 20) {
        let u = m[1].trim();
        if (!u || u.startsWith("data:")) continue;
        try { u = new URL(u, p.url).href; } catch { continue; }
        if (seen.has(u)) continue;
        seen.add(u);
        out.push({ url: u, page_url: p.url, kind });
      }
    }
  }
  return out;
}

const results: unknown[] = [];

for (const sid of readdirSync(rawRoot).filter((d) => byId.has(d)).sort()) {
  const meta = byId.get(sid)!;
  const dir = join(rawRoot, sid);
  const t0 = Date.now();
  const siteOut: Record<string, unknown> = {
    site_id: sid,
    business_name: meta.business_name,
    category: meta.category,
    source_url: meta.source_url,
    platform_guess: meta.platform_guess,
    marker: "ACQUISITION_TEST_ONLY",
    night_preview_only: true,
  };

  // --- provenance: page manifest ---
  const manPath = join(dir, "manifest.jsonl");
  const manLines = existsSync(manPath) ? readFileSync(manPath, "utf8").split("\n").filter((l) => l.trim()) : [];
  const pageRecs: Record<string, unknown>[] = [];
  const pages: { url: string; sourceType: "html"; discoveredAt: string; raw: string; ok: boolean; status: number }[] = [];
  let robotsStatus: number | null = null;
  let homeRaw = "";
  for (const line of manLines) {
    let e: Record<string, unknown>;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.page === "robots.txt") { robotsStatus = e.status as number; continue; }
    if (e.page === "__blocked__") { pageRecs.push(e); continue; }
    if (typeof e.page !== "string") continue;
    const pg = String(e.page);
    let htmlFile: string | null = null;
    if (pg === "home") htmlFile = "page-00-home.html";
    else {
      const m = pg.match(/^subpage-(\d+)$/);
      if (m) htmlFile = "page-" + String(Number(m[1])).padStart(2, "0") + ".html";
    }
    if (!htmlFile || !existsSync(join(dir, htmlFile))) continue;
    const raw = readFileSync(join(dir, htmlFile), "utf8");
    const st = Number(e.status ?? 0);
    const ok = st === 200 && raw.length > 0;
    pageRecs.push({ ...e, file: htmlFile, bytes: raw.length, sha256: "sha256:" + sha256(raw), ok });
    if (ok) {
      pages.push({ url: String(e.url), sourceType: "html", discoveredAt: observedAt, raw, ok: true, status: st });
      if (String(e.page) === "home") homeRaw = raw;
    }
  }
  const fetchOk = pages.length;
  const fetchTotal = pageRecs.filter((r) => typeof r.file === "string").length;
  const fetchBytes = pages.reduce((a, p) => a + p.raw.length, 0);
  siteOut.provenance = {
    observed_at: observedAt,
    controller: "night_cohort",
    pipeline_commit: "e48ef710cb889bf4d59b833ef9766067a9e2bbf0",
    robots_txt_status: robotsStatus,
    pages: pageRecs,
    fetch: { pages_ok: fetchOk, pages_total: fetchTotal, bytes_total: fetchBytes },
    platform_signals: platformSignals(homeRaw),
    generator_meta: homeRaw ? generatorName(homeRaw) : null,
  };
  siteOut.media = extractMedia(pages.map((p) => ({ url: p.url, raw: p.raw })));

  const metrics: Record<string, unknown> = {
    fetch_success: fetchOk > 0,
    fetch_pages_ok: fetchOk,
    fetch_pages_total: fetchTotal,
    robots_txt_status: robotsStatus,
    ai_calls: 0,
    ai_note: "deterministic-only run; this worker has no model access",
  };

  if (fetchOk === 0) {
    metrics.failure_stage = "fetch";
    metrics.failure_detail = "no pages fetched with HTTP 200 (or robots-blocked)";
    siteOut.metrics = metrics;
    siteOut.graph = null; siteOut.sitespec = null; siteOut.render_model = null;
    writeFileSync(join(outDir, sid + ".json"), JSON.stringify(siteOut, null, 2));
    results.push({ site_id: sid, failure_stage: "fetch" });
    console.log(JSON.stringify({ site_id: sid, failure_stage: "fetch", fetchOk }));
    continue;
  }

  // --- extraction ---
  let graph: { objects: unknown[]; relationships: unknown[]; fieldClasses?: unknown; droppedRelationships?: unknown } | null = null;
  let report: Record<string, unknown> | null = null;
  let fields: { entityId?: string; name: string; value: unknown }[] = [];
  const tX0 = Date.now();
  try {
    const out = await runExtractionPipeline(pages as never, {
      sourceUrl: meta.source_url, observedAt, controllerId: "night_cohort",
    } as never);
    graph = out.graph as never;
    report = out.report as never;
    fields = out.fields as never;
    metrics.extraction_seconds = +(((Date.now() - tX0) / 1000).toFixed(2));
  } catch (err) {
    metrics.failure_stage = "extraction";
    metrics.failure_detail = String(err && (err as Error).message || err).slice(0, 500);
    metrics.extraction_seconds = +(((Date.now() - tX0) / 1000).toFixed(2));
    siteOut.metrics = metrics; siteOut.graph = null; siteOut.sitespec = null; siteOut.render_model = null;
    writeFileSync(join(outDir, sid + ".json"), JSON.stringify(siteOut, null, 2));
    results.push({ site_id: sid, failure_stage: "extraction" });
    console.log(JSON.stringify({ site_id: sid, failure_stage: "extraction" }));
    continue;
  }

  const objects = (graph!.objects ?? []) as { id: string; schema: string; fields: Record<string, unknown> }[];
  const relationships = (graph!.relationships ?? []) as unknown[];
  const r = report as {
    factsDiscovered: number; factsByClass: Record<string, number>; factsBySource: Record<string, number>;
    objectsGenerated: number; relationshipsGenerated: number; privateWithheld: number;
    graphNodesVisited: number; unsupported: { kind?: string }[]; graphNodeIds: string[];
  };
  metrics.structured_sources = Object.keys(r.factsBySource || {});
  metrics.facts_discovered = r.factsDiscovered;
  metrics.facts_by_class = r.factsByClass;
  metrics.facts_by_source = r.factsBySource;
  metrics.deterministic_facts = (r.factsByClass?.DIRECT_FACT ?? 0) + (r.factsByClass?.DERIVED_FACT ?? 0);
  metrics.ai_derived_facts = (r.factsByClass?.INFERENCE ?? 0) + (r.factsByClass?.GENERATED_COPY ?? 0);
  metrics.objects = objects.length;
  metrics.relationships = relationships.length;
  metrics.graph_nodes_visited = r.graphNodesVisited;
  metrics.private_withheld = r.privateWithheld;
  const unsupKinds: Record<string, number> = {};
  for (const u of r.unsupported ?? []) unsupKinds[u.kind ?? "unknown"] = (unsupKinds[u.kind ?? "unknown"] ?? 0) + 1;
  metrics.unsupported_count = (r.unsupported ?? []).length;
  metrics.unsupported_kinds = unsupKinds;
  metrics.dropped_relationships = (graph as { droppedRelationships?: number }).droppedRelationships ?? 0;
  metrics.object_schemas = [...new Set(objects.map((o) => o.schema))].sort();

  // conflicts: same entity+field, >1 distinct value
  const byKey = new Map<string, { values: Set<string>; sources: Set<string> }>();
  for (const f of fields) {
    if (f.entityId === undefined) continue;
    const k = f.entityId + "||" + f.name;
    const e = byKey.get(k) ?? { values: new Set(), sources: new Set() };
    e.values.add(JSON.stringify(f.value));
    byKey.set(k, e);
  }
  const conflictKeys = [...byKey.entries()].filter(([, e]) => e.values.size > 1);
  metrics.conflicts = conflictKeys.length;
  metrics.conflict_examples = conflictKeys.slice(0, 3).map(([k, e]) => ({
    entity_field: k, distinct_values: [...e.values].slice(0, 4).map((v) => v.slice(0, 200)),
  }));

  // evidence coverage: objects with >=1 DIRECT_FACT field
  const fc = (graph!.fieldClasses ?? {}) as Record<string, Record<string, string>>;
  let covered = 0;
  for (const o of objects) {
    const flds = fc[o.id] ?? {};
    if (Object.values(flds).some((c) => c === "DIRECT_FACT")) covered++;
  }
  metrics.evidence_coverage = objects.length ? +(covered / objects.length).toFixed(3) : 0;
  metrics.objects_with_direct_fact = covered;

  if (r.factsDiscovered === 0 && objects.length === 0) {
    metrics.failure_stage = "extraction-empty";
    metrics.failure_detail = "pipeline ran but produced zero facts and zero objects";
  }

  // --- generateSiteSpec ---
  let spec: Record<string, unknown> | null = null;
  const tG0 = Date.now();
  try {
    spec = generateSiteSpec({ objects: objects as never, relationships: relationships as never }, { generatedAt: observedAt }) as never;
    metrics.generate_seconds = +(((Date.now() - tG0) / 1000).toFixed(2));
  } catch (err) {
    metrics.generate_seconds = +(((Date.now() - tG0) / 1000).toFixed(2));
    if (!metrics.failure_stage) {
      metrics.failure_stage = "generate";
      metrics.failure_detail = String(err && (err as Error).message || err).slice(0, 500);
    }
  }

  // --- validate ---
  let findings: { severity: string }[] = [];
  let renderable = false;
  if (spec) {
    const tV0 = Date.now();
    try {
      findings = validateSiteSpec(spec as never, new Set(objects.map((o) => o.schema))) as never;
      renderable = isRenderable(findings);
      metrics.validate_seconds = +(((Date.now() - tV0) / 1000).toFixed(2));
    } catch (err) {
      if (!metrics.failure_stage) {
        metrics.failure_stage = "validate";
        metrics.failure_detail = String(err && (err as Error).message || err).slice(0, 500);
      }
    }
  }
  metrics.sitespec_valid = findings.filter((f) => f.severity === "error").length === 0 && !!spec;
  metrics.sitespec_renderable = renderable;
  metrics.validation_errors = findings.filter((f) => f.severity === "error").length;
  metrics.validation_warnings = findings.filter((f) => f.severity === "warning").length;
  metrics.validation_findings = findings.slice(0, 10);
  if (spec && !renderable && !metrics.failure_stage) {
    metrics.failure_stage = "validate";
    metrics.failure_detail = "spec has error-severity validation findings; not renderable";
  }

  // --- render-model check ---
  let renderModel: Record<string, unknown> | null = null;
  if (spec) {
    const tR0 = Date.now();
    try {
      renderModel = buildSemanticRenderModel(
        spec as never,
        { objects: objects as never, relationships: relationships as never },
        { viewerId: null, displayName: null },
        { asOf: observedAt },
      ) as never;
      metrics.render_model_seconds = +(((Date.now() - tR0) / 1000).toFixed(2));
      const pgs = (renderModel.pages ?? []) as { sections: { objectIds: string[] }[] }[];
      metrics.render_pages = pgs.length;
      metrics.render_sections = pgs.reduce((a, p) => a + p.sections.length, 0);
      metrics.render_object_refs = pgs.reduce((a, p) => a + p.sections.reduce((b, s) => b + s.objectIds.length, 0), 0);
      metrics.render_model_ok = true;
    } catch (err) {
      metrics.render_model_seconds = +(((Date.now() - tR0) / 1000).toFixed(2));
      metrics.render_model_ok = false;
      if (!metrics.failure_stage) {
        metrics.failure_stage = "render-model";
        metrics.failure_detail = String(err && (err as Error).message || err).slice(0, 500);
      }
    }
  } else {
    metrics.render_model_ok = false;
  }

  metrics.acquisition_seconds = +(((Date.now() - t0) / 1000).toFixed(2));
  if (!metrics.failure_stage) metrics.failure_stage = "none";

  siteOut.metrics = metrics;
  siteOut.graph = graph;
  siteOut.sitespec = spec;
  siteOut.validation = { findings, renderable };
  siteOut.render_model = renderModel;
  writeFileSync(join(outDir, sid + ".json"), JSON.stringify(siteOut, null, 2));
  results.push({
    site_id: sid, failure_stage: metrics.failure_stage, facts: r.factsDiscovered,
    objects: objects.length, rels: relationships.length, renderable,
  });
  console.log(JSON.stringify(results[results.length - 1]));
}
console.log("COHORT DONE: " + results.length + " sites");
