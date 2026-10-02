/**
 * FYD FACTORY: OBJECT missions, shard 1 (indices 500-999).
 *
 * Per mission i: fixture graph (rotate across batch-b / trades-a / clearwater /
 * professional / hostile, mutation seed i) -> generateSiteSpec -> validateSiteSpec
 * -> buildRenderContext -> renderToStaticMarkup HTML -> determinism check
 * (compile twice, compare digests) -> verify asserts.
 *
 * Runs against the real repo machinery (read-only imports). Synthetic only:
 * every fixture graph is marked synthetic; mutations carry synthetic markers.
 */
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
import { buildRenderContext, SitePageView } from "/home/nolan/projects/ping/src/fyd/components/renderer";
import { verifyPresentationBinding } from "/home/nolan/projects/ping/src/fyd/sitespec/graph";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

const FIX_DIR = process.argv[2] ?? "/home/nolan/fyd-factory/object-shard1/fixtures";
const START = Number(process.env.FYD_START ?? 500);
const END = Number(process.env.FYD_END ?? 999);
const FIXED_TS = "2026-09-23T20:00:00.000Z";
const GROUPS = ["batch-b", "trades-a", "clearwater", "professional", "hostile"];
const UNSAFE_VARIANTS = [
  "javascript:alert('fyd-factory-test')",
  "JaVaScRiPt:alert('fyd-factory-test')",
  "data:text/html,<h1>fyd-factory-test</h1>",
  "vbscript:msgbox('fyd-factory-test')",
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

interface Obj { id: string; schema: string; visibility: string; title: string; description: string; fields: Record<string, any>; relationships?: any[]; provenance?: any; [k: string]: any }
interface Graph { objects: Obj[]; relationships: { subject: string; predicate: string; object: string; status?: string }[] }

function listGroupFiles(group: string): string[] {
  const dir = path.join(FIX_DIR, group);
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(dir, f));
}
const GROUP_FILES: Record<string, string[]> = Object.fromEntries(GROUPS.map((g) => [g, listGroupFiles(g)]));

function pickFixture(i: number): { group: string; file: string } {
  const k = i - START;
  const group = GROUPS[k % GROUPS.length];
  const files = GROUP_FILES[group];
  const file = files[Math.floor(k / GROUPS.length) % files.length];
  return { group, file };
}

function ownerOf(graph: Graph): Obj | undefined {
  return graph.objects
    .filter((o) => o.schema.includes(".business@") && o.visibility === "public")
    .sort((a, b) => (a.id < b.id ? -1 : 1))[0];
}

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

interface MutationResult {
  graph: Graph;
  privateMarkers: string[];
  unboundMarkers: { id: string; marker: string }[];
  unsafeApplied: boolean;
  flags: { priv: boolean; unsafe: boolean; unbound: boolean };
}

function mutate(graph: Graph, i: number): MutationResult {
  const g = clone(graph);
  const rng = mulberry32(i);
  const flags = { priv: rng() < 0.55, unsafe: rng() < 0.45, unbound: rng() < 0.4 };
  const privateMarkers: string[] = [];
  const unboundMarkers: { id: string; marker: string }[] = [];
  let unsafeApplied = false;
  const owner = ownerOf(g);

  const linkables = g.objects.filter(
    (o) => o.visibility === "public" && !o.schema.includes(".business@")
  );

  if (flags.priv && linkables.length > 0) {
    const src = linkables[Math.floor(rng() * linkables.length)];
    const marker = `PRIVATE-${i}`;
    const c: Obj = { ...clone(src), id: `${src.id}-priv-${i}`, visibility: "private", title: `${marker} ${src.title}` };
    g.objects.push(c);
    if (owner) {
      const pred = ["provides", "employs", "publishes"][Math.floor(rng() * 3)];
      g.relationships.push({ subject: owner.id, predicate: pred, object: c.id, status: "active" });
    }
    privateMarkers.push(marker);
  }

  if (flags.unsafe && owner) {
    owner.fields = { ...owner.fields, website: UNSAFE_VARIANTS[i % UNSAFE_VARIANTS.length] };
    unsafeApplied = true;
  }

  if (flags.unbound && owner && linkables.length > 0) {
    const marker = `UNBOUND-${i}`;
    const src = linkables[Math.floor(rng() * linkables.length)];
    const c: Obj = {
      ...clone(src),
      id: `${src.id}-ub-${i}`,
      title: `${marker} ${src.title}`,
      description: `Unverified factual statement ${i}: synthetic claim with no evidence reference.`,
      provenance: { kind: "synthetic", ref: "" },
      fields: { ...(src.fields ?? {}), claimKind: "synthetic_statement" },
      visibility: "public",
    };
    delete (c as any).ownerFieldCorrections;
    g.objects.push(c);
    g.relationships.push({ subject: owner.id, predicate: "publishes", object: c.id, status: "active" });
    unboundMarkers.push({ id: c.id, marker });
  }

  return { graph: g, privateMarkers, unboundMarkers, unsafeApplied, flags };
}

function compileOnce(graph: Graph): { html: string; spec: any; findings: any[]; ctx: any; sections: number } {
  const spec: any = generateSiteSpec(graph as any, { generatedAt: FIXED_TS });
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings: any[] = validateSiteSpec(spec, knownSchemas);
  const ctx: any = buildRenderContext(spec, graph as any, { viewerId: null, displayName: null });
  let sections = 0;
  const bodies: string[] = [];
  for (const page of spec.pages) {
    sections += page.sections.length;
    bodies.push(renderToStaticMarkup(SitePageView({ page, ctx }) as any));
  }
  const head = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${String(spec.pages[0]?.title ?? "FYD site")} | FYD Social test render</title>\n</head>\n<body>\n`;
  const html = head + bodies.join("\n") + "\n</body>\n</html>\n";
  return { html, spec, findings, ctx, sections };
}

function nowMs(): number { return Number(process.hrtime.bigint() / 1000000n); }

function runMission(i: number): Record<string, any> {
  const tStart = nowMs();
  const rec: Record<string, any> = {
    mission: i, shard: "object-1", synthetic: true, testing_only: true,
  };
  try {
    const { group, file } = pickFixture(i);
    rec.fixture_group = group;
    rec.fixture_file = path.basename(file);
    let raw: any;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e: any) {
      rec.outcome = "ACQUISITION_FAILED"; rec.stage = "fixture_load";
      rec.error = String(e?.message ?? e).slice(0, 200);
      rec.latency_ms = { total: nowMs() - tStart };
      return rec;
    }
    const baseGraph: Graph = raw.graph ?? raw;
    const mut = mutate(baseGraph, i);
    rec.mutations = mut.flags;
    rec.objects = mut.graph.objects.length;
    rec.relationships = mut.graph.relationships.length;

    const t1 = nowMs();
    const r1 = compileOnce(mut.graph);
    const t2 = nowMs();
    const r2 = compileOnce(clone(mut.graph));
    const t3 = nowMs();
    const d1 = sha256(r1.html);
    const d2 = sha256(r2.html);
    const match = d1 === d2;
    rec.latencies_ms = { compile_1: t2 - t1, compile_2: t3 - t2, total: nowMs() - tStart };
    rec.determinism = { digest_a: d1, digest_b: d2, match };
    rec.pages = r1.spec.pages.length;
    rec.sections = r1.sections;
    rec.errors = r1.findings.filter((f: any) => f.severity === "error").length;
    rec.warnings = r1.findings.filter((f: any) => f.severity === "warning").length;

    const html = r1.html;
    const hrefSrc = [...html.matchAll(/(?:href|src)\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1].trim());
    const unsafeRe = /^(javascript|data|vbscript|file|blob):/i;
    const unsafeHits = hrefSrc.filter((v) => unsafeRe.test(v.replace(/^[\u0000-\u0020]+/, "")));
    rec.unsafe_url_count = unsafeHits.length;
    rec.unsafe_raw_count = (html.match(/javascript\s*:/gi) ?? []).length;
    if (rec.unsafe_raw_count > 0 && rec.unsafe_url_count === 0) {
      rec.unsafe_raw_sample = html.slice(html.search(/javascript\s*:/i) - 60, html.search(/javascript\s*:/i) + 60).slice(0, 120);
    }

    rec.hidden_leak_count = 0;
    for (const m of mut.privateMarkers) if (html.includes(m)) rec.hidden_leak_count++;

    rec.unbound_claim_count = 0;
    rec.binding_probe = [];
    for (const u of mut.unboundMarkers) {
      const verdict: any = verifyPresentationBinding(
        { objectId: u.id, field: "title", classification: "direct" },
        mut.graph as any
      );
      const inOutput = html.includes(u.marker);
      rec.binding_probe.push({ id: u.id, verdict_ok: verdict.ok, reason: verdict.ok ? undefined : verdict.reason, in_output: inOutput });
      if (inOutput) rec.unbound_claim_count++;
    }

    rec.viewport_meta = /<meta[^>]+name=["']viewport["']/i.test(html);
    rec.sections_positive = rec.sections > 0;

    if (!isRenderable(r1.findings)) {
      rec.outcome = "NEEDS_REVIEW"; rec.stage = "validate";
      rec.finding_sample = r1.findings.filter((f: any) => f.severity === "error").slice(0, 3).map((f: any) => f.path + ": " + f.message);
    } else if (rec.unsafe_url_count > 0) {
      rec.outcome = "UNSAFE_SOURCE"; rec.stage = "render_verify";
      rec.unsafe_sample = unsafeHits.slice(0, 3);
    } else if (rec.hidden_leak_count > 0) {
      rec.outcome = "NEEDS_REVIEW"; rec.stage = "render_verify";
      rec.failure = "private_object_visible_in_output";
    } else if (rec.unbound_claim_count > 0) {
      rec.outcome = "NEEDS_REVIEW"; rec.stage = "render_verify";
      rec.failure = "unbound_claim_in_output";
    } else if (!rec.viewport_meta || !rec.sections_positive) {
      rec.outcome = "NEEDS_REVIEW"; rec.stage = "render_verify";
      rec.failure = !rec.viewport_meta ? "viewport_meta_missing" : "no_sections";
    } else if (rec.warnings > 0) {
      rec.outcome = "GENERATED_WITH_WARNINGS"; rec.stage = "ok";
    } else {
      rec.outcome = "GENERATED"; rec.stage = "ok";
    }
    if (!rec.determinism.match && rec.outcome === "GENERATED") {
      rec.outcome = "NEEDS_REVIEW"; rec.stage = "determinism";
    }
    return rec;
  } catch (e: any) {
    rec.outcome = "CRASH"; rec.stage = rec.stage ?? "unknown";
    rec.error = String(e?.stack ?? e).slice(0, 500);
    rec.latencies_ms = { total: nowMs() - tStart };
    return rec;
  }
}

for (let i = START; i <= END; i++) {
  if ((i - START) % 50 === 0) process.stderr.write(`progress mission=${i}\n`);
  const rec = runMission(i);
  process.stdout.write(JSON.stringify(rec) + "\n");
}
process.stderr.write("progress done=500\n");
