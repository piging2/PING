/**
 * fyd-compile-harness job worker: runs a BATCH of compilation jobs in one
 * warm tsx process (tsx cold start ~1.5-2s dominates; the pipeline itself is
 * milliseconds after warmup).
 *
 * Usage:
 *   tsx job-worker.ts --batch <batch.json> --results-dir <dir>
 *
 * batch.json: [{job_id, fixture_id, fixture, seed, attempt}, ...]
 *
 * Pipeline per job (real repo code, read-only):
 *   load fixture graph -> mutate (seeded) -> generateSiteSpec (x2, determinism)
 *   -> validateSiteSpec -> buildRenderContext -> metrics -> results/<job_id>.json
 *
 * Stdout protocol (delimited; Pig stdout interleaves from concurrent processes):
 *   exactly one line per finished job:  RESULT {"job_id":...,"outcome":...,"wall_ms":...}
 * The runner ignores every other stdout line. Result files are the record of
 * truth; a missing result file means the job never completed in this worker.
 *
 * The worker never throws past main(): every staged failure is recorded on the
 * JobMetrics record. Only a hard crash / SIGKILL leaves no result behind.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { performance } from "node:perf_hooks";

// renderer.tsx transitively imports .css modules; stub them for headless compile.
// (Verified: without this, tsx dies with "Unexpected token '.'" on
// src/fyd/ui/object-circle.module.css. This inline hook is equivalent to a
// --import css-hook.mjs Module._extensions hook, with fewer moving parts.)
(require as any).extensions[".css"] = function (m: any) {
  m.exports = {};
};

import {
  digest,
  sha256Hex,
  canonicalize,
  mutateGraph,
  emptyMetrics,
  HARNESS_VERSION,
  computePipelineCodeVersion,
  shortVersion,
  type JobMetrics,
  type ObjectGraph,
} from "./lib";

const PING_SRC = "/home/nolan/projects/ping/src";
const GENERATED_AT = "2026-09-23T00:00:00.000Z"; // pinned: determinism across runs

/**
 * G1: bound once at worker startup, before any transform module is loaded.
 * Every record this worker emits carries it; the runner serves a cache HIT
 * only when it matches the current version. Fail closed: an unreadable
 * source tree is a typed fatal, never a silent unversioned run.
 */
let PIPELINE_CODE_VERSION = "";
try {
  PIPELINE_CODE_VERSION = computePipelineCodeVersion(PING_SRC);
} catch (e: any) {
  console.error(JSON.stringify({
    fatal: "pipeline_code_version_unavailable",
    detail: String(e?.message ?? e),
  }));
  process.exit(2);
}

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i < 0 || i + 1 >= process.argv.length) {
    console.error(`missing required arg ${name}`);
    process.exit(2);
  }
  return process.argv[i + 1];
}

interface BatchJob {
  job_id: string;
  fixture_id: string;
  fixture: string;
  seed: number;
  attempt: number;
  dispatch_seq: number; // G2: the manifest publish_seq this dispatch was issued under
}

const UNSAFE_URL_RE = /(javascript|vbscript|data:text\/html):/gi;

function countUnsafeUrls(spec: unknown): number {
  const m = canonicalize(spec).match(UNSAFE_URL_RE);
  return m ? m.length : 0;
}

interface SectionLike {
  query?: {
    kind: string;
    objectIds?: string[];
    schema?: string;
    schemas?: string[];
  };
}

/** Claims the spec makes that cannot resolve against the graph. */
function countUnboundClaims(spec: any, objectIds: Set<string>, knownSchemas: Set<string>): number {
  let n = 0;
  for (const p of spec.pages ?? []) {
    for (const s of (p as any).sections ?? []) {
      const q = (s as SectionLike).query;
      if (!q) continue;
      if (q.kind === "reference") {
        for (const id of q.objectIds ?? []) if (!objectIds.has(id)) n++;
      } else if (q.kind === "related" || q.kind === "all") {
        const schemas = [...(q.schemas ?? []), ...(q.schema ? [q.schema] : [])];
        for (const sc of schemas) if (!knownSchemas.has(sc)) n++;
      }
    }
  }
  return n;
}

// Repo modules, imported once per warm process.
let repo: {
  generateSiteSpec: (graph: any, opts: any) => any;
  validateSiteSpec: (spec: any, schemas: Set<string>) => Array<{ severity: string; path: string; message: string }>;
  buildRenderContext: (spec: any, graph: any, viewer: any) => unknown;
} | null = null;

async function loadRepo() {
  if (repo) return repo;
  const { generateSiteSpec } = await import(PING_SRC + "/fyd/proceduralize/generator.ts");
  const { validateSiteSpec } = await import(PING_SRC + "/fyd/sitespec/validator.ts");
  const { buildRenderContext } = await import(PING_SRC + "/fyd/components/renderer.tsx");
  // buildRenderContext is the production render path: called by
  // src/app/build/[siteId]/build-client.tsx and src/app/sites/_shared/site-client.tsx
  // (the site-serving code), and by src/fyd/lineage/tracer.ts. buildSemanticRenderModel
  // (sitespec/render-model.ts) has no non-test callers; it is not on the render path.
  repo = { generateSiteSpec, validateSiteSpec, buildRenderContext };
  return repo;
}

async function runJob(bj: BatchJob, resultsDir: string): Promise<JobMetrics> {
  const metrics: JobMetrics = emptyMetrics(bj.job_id, bj.fixture_id, bj.seed, bj.attempt);
  const t0 = performance.now();
  let peakHeap = 0;
  let peakRss = 0;
  const sampleMem = () => {
    const m = process.memoryUsage();
    if (m.heapUsed > peakHeap) peakHeap = m.heapUsed;
    if (m.rss > peakRss) peakRss = m.rss;
  };

  const fail = (stage: JobMetrics["failure_stage"], errorType: string, detail: string): void => {
    metrics.outcome = stage === "validate" ? "VALIDATION_FAILED" : stage === "render" ? "RENDER_FAILED" : "CRASH";
    metrics.failure_stage = stage;
    metrics.error_type = errorType;
    metrics.error_detail = detail.slice(0, 500);
  };

  const finish = (): JobMetrics => {
    metrics.wall_ms = Math.round((performance.now() - t0) * 100) / 100;
    metrics.peak_heap_bytes = peakHeap;
    metrics.peak_memory_bytes = peakRss;
    metrics.harness_version = HARNESS_VERSION;
    // G1/G2: every emitted record is bound to the transform code version it
    // was computed under and to the input generation that dispatched it.
    metrics.pipeline_code_version = PIPELINE_CODE_VERSION;
    metrics.dispatch_seq = bj.dispatch_seq ?? 0;
    fs.mkdirSync(resultsDir, { recursive: true });
    const finalPath = path.join(resultsDir, `${bj.job_id}.json`);
    const tmpPath = `${finalPath}.tmp.${process.pid}`;
    fs.writeFileSync(tmpPath, JSON.stringify(metrics, null, 1) + "\n");
    fs.renameSync(tmpPath, finalPath); // atomic: no partial result files
    // Delimited stdout record (the runner only parses lines starting with "RESULT ").
    console.log(`RESULT ${JSON.stringify({ job_id: bj.job_id, outcome: metrics.outcome, wall_ms: metrics.wall_ms })}`);
    return metrics;
  };

  /* ---------------- plan: load + mutate + digest ---------------- */
  let graph: ObjectGraph;
  try {
    const t = performance.now();
    const rawBytes = fs.readFileSync(bj.fixture);
    // P4 chain root: the exact source bytes this stage consumed.
    metrics.fixture_digest = sha256Hex(rawBytes.toString("utf8"));
    const raw = JSON.parse(rawBytes.toString("utf8"));
    const source: ObjectGraph = raw.graph;
    if (!source || !Array.isArray(source.objects) || source.objects.length === 0) {
      fail("plan", "plan:empty_graph", "fixture carries no object graph; no spec without a graph");
      return finish();
    }
    const { graph: mutated, ops } = mutateGraph(source, bj.seed);
    graph = mutated;
    metrics.mutation_ops = ops;
    // Input-side unsafe URL census: what the fixture carried before projection.
    // (unsafe_url_count, set later, counts what survived into the output spec.)
    metrics.input_unsafe_url_count = countUnsafeUrls(raw);
    metrics.graph_digest = digest(graph);
    metrics.object_count = graph.objects.length;
    metrics.relationship_count = (graph.relationships ?? []).length;
    metrics.hidden_object_count = graph.objects.filter((o) => o.visibility === "hidden").length;
    metrics.stage_ms.plan = Math.round((performance.now() - t) * 100) / 100;
    sampleMem();
  } catch (e: any) {
    fail("plan", "plan:load_failed", String(e?.message ?? e));
    return finish();
  }

  const R = await loadRepo();

  /* ---------------- spec: generate twice, compare ---------------- */
  let spec: any;
  try {
    const t = performance.now();
    const opts = { generatedAt: GENERATED_AT };
    const s1 = R.generateSiteSpec(graph as any, opts);
    const s2 = R.generateSiteSpec(graph as any, opts);
    const d1 = digest(s1);
    const d2 = digest(s2);
    metrics.spec_digest = d1;
    metrics.spec_digest_b = d2;
    metrics.determinism_match = d1 === d2;
    if (!metrics.determinism_match) {
      fail("spec", "spec:determinism_mismatch", `first=${d1.slice(0, 16)} second=${d2.slice(0, 16)}`);
      return finish();
    }
    // Invariant: the spec is rooted in the object graph (no spec without a graph).
    const ids = new Set(graph.objects.map((o) => o.id));
    metrics.graph_rooted = s1.ownerObjectId === "" || ids.has(s1.ownerObjectId);
    if (!metrics.graph_rooted) {
      fail("spec", "spec:graph_unrooted", `ownerObjectId ${s1.ownerObjectId} not in graph`);
      return finish();
    }
    spec = s1;
    metrics.stage_ms.spec = Math.round((performance.now() - t) * 100) / 100;
    sampleMem();
  } catch (e: any) {
    fail("spec", `spec:exception:${e?.constructor?.name ?? "Error"}`, String(e?.message ?? e));
    return finish();
  }

  /* ---------------- validate ---------------- */
  try {
    const t = performance.now();
    const knownSchemas = new Set(graph.objects.map((o) => o.schema));
    const findings = R.validateSiteSpec(spec, knownSchemas);
    metrics.error_count = findings.filter((f) => f.severity === "error").length;
    metrics.warning_count = findings.filter((f) => f.severity === "warning").length;
    metrics.info_count = findings.filter((f) => f.severity === "info").length;
    // P4: the validation output binds the child spec digest, so a spec change
    // can never leave a stale findings_digest behind.
    metrics.findings_digest = digest({ spec_digest: metrics.spec_digest, findings });
    metrics.stage_ms.validate = Math.round((performance.now() - t) * 100) / 100;
    sampleMem();
    if (metrics.error_count > 0) {
      const first = findings.find((f) => f.severity === "error")!;
      fail("validate", `validate:error:${first.path}`, first.message);
      return finish();
    }
  } catch (e: any) {
    fail("validate", `validate:exception:${e?.constructor?.name ?? "Error"}`, String(e?.message ?? e));
    return finish();
  }

  /* ---------------- render ---------------- */
  try {
    const t = performance.now();
    const ctx = R.buildRenderContext(spec, graph as any, { viewerId: null, displayName: null });
    // P4: the render output binds both child digests (spec + graph).
    metrics.render_digest = digest({
      spec_digest: metrics.spec_digest,
      graph_digest: metrics.graph_digest,
      ctx,
    });
    metrics.stage_ms.render = Math.round((performance.now() - t) * 100) / 100;
    sampleMem();
  } catch (e: any) {
    fail("render", `render:exception:${e?.constructor?.name ?? "Error"}`, String(e?.message ?? e));
    return finish();
  }

  /* ---------------- derived counts + outcome ---------------- */
  metrics.page_count = (spec.pages ?? []).length;
  metrics.section_count = (spec.pages ?? []).reduce(
    (n: number, p: any) => n + (p.sections ?? []).length,
    0
  );
  metrics.unsafe_url_count = countUnsafeUrls(spec);
  metrics.unbound_claim_count = countUnboundClaims(
    spec,
    new Set(graph.objects.map((o) => o.id)),
    new Set(graph.objects.map((o) => o.schema))
  );
  metrics.outcome = metrics.warning_count > 0 ? "COMPILED_WITH_WARNINGS" : "COMPILED";
  return finish();
}

async function main(): Promise<void> {
  const batchPath = arg("--batch");
  const resultsDir = arg("--results-dir");
  const batch: BatchJob[] = JSON.parse(fs.readFileSync(batchPath, "utf8"));
  console.error(`[worker] pipeline_code_version=${shortVersion(PIPELINE_CODE_VERSION)} jobs=${batch.length}`);
  await loadRepo(); // warm the imports once, before the first timed job
  for (const bj of batch) {
    try {
      await runJob(bj, resultsDir);
    } catch (e: any) {
      // Absolute last resort for this job: record a worker-level CRASH and continue.
      const m = emptyMetrics(bj.job_id, bj.fixture_id, bj.seed, bj.attempt);
      m.harness_version = HARNESS_VERSION;
      m.pipeline_code_version = PIPELINE_CODE_VERSION;
      m.dispatch_seq = bj.dispatch_seq ?? 0;
      m.failure_stage = "worker";
      m.error_type = "worker:unhandled";
      m.error_detail = String(e?.message ?? e).slice(0, 500);
      fs.mkdirSync(resultsDir, { recursive: true });
      fs.writeFileSync(path.join(resultsDir, `${bj.job_id}.json`), JSON.stringify(m, null, 1) + "\n");
      console.log(`RESULT ${JSON.stringify({ job_id: bj.job_id, outcome: m.outcome, wall_ms: 0 })}`);
    }
  }
}

main().catch((e) => {
  console.error(`WORKER_FATAL ${String(e?.message ?? e).slice(0, 300)}`);
  process.exit(1);
});
