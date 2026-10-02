/**
 * fyd-compile-harness shared library.
 *
 * Deterministic helpers for the FYD graph-compilation job runner:
 * canonical digests, seeded PRNG, deterministic graph mutations, metrics types.
 *
 * Authority: read-only. This module never touches the network, never writes
 * outside the results directory it is given, and never presents synthetic
 * fixtures as real businesses (every mutated graph keeps its DEMO_SYNTHETIC
 * marker; mutation ops are recorded on the job record).
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export const HARNESS_VERSION = "1.2.0"; // 1.2.0: status:"failed"+quarantined flag, dispatch-based attempts, per-job inactivity timeout

/**
 * G1 (LANE-CHAOS C5b): the transform code version.
 *
 * Digest over every .ts/.tsx file under the Pig repo's src/fyd tree. The
 * pipeline's entire runtime closure (generator, validator, schemas,
 * registry, renderer, archetypes, projections) lives there; type-only
 * imports from outside are erased at compile time and cannot affect
 * canonical bytes. Any transform code change moves this version, so a
 * cache HIT is never served for a stale code version.
 *
 * Conservative by design: a UI-only change also moves the version and
 * forces recompute. Safe direction. Fail closed: throws when the source
 * tree is unreadable, so no result is ever bound to an unknown version.
 */
export const PING_SRC_DEFAULT = "/home/nolan/projects/ping/src";

export function computePipelineCodeVersion(pingSrc: string = process.env.PING_SRC ?? PING_SRC_DEFAULT): string {
  const root = path.join(pingSrc, "fyd");
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && (p.endsWith(".ts") || p.endsWith(".tsx"))) files.push(p);
    }
  };
  walk(root);
  files.sort();
  if (files.length === 0) {
    throw new Error(`pipeline code version: no .ts/.tsx sources under ${root}`);
  }
  const h = crypto.createHash("sha256");
  for (const f of files) {
    h.update(path.relative(root, f));
    h.update("\0");
    h.update(fs.readFileSync(f));
    h.update("\0");
  }
  return h.digest("hex");
}

/** Short display form of a version digest. */
export function shortVersion(v: string): string {
  return v.slice(0, 12);
}

/* ------------------------------------------------------------------ */
/* Canonical digest                                                     */
/* ------------------------------------------------------------------ */

/** Canonical JSON: object keys sorted recursively, arrays keep order. */
export function canonicalize(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  const o = v as Record<string, unknown>;
  return (
    "{" +
    Object.keys(o)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalize(o[k]))
      .join(",") +
    "}"
  );
}

export function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export function digest(value: unknown): string {
  return sha256Hex(canonicalize(value));
}

/**
 * job_id is the stable identity of a job: sha256(fixture_id + ":" + seed).
 * The ":" separator is deliberate: without it, fixture "a1"+seed "23" and
 * fixture "a12"+seed "3" would hash identically. enqueue.js uses the same
 * formula; the two must never diverge.
 */
export function jobIdFor(fixtureId: string, seed: number): string {
  return sha256Hex(fixtureId + ":" + seed);
}

/* ------------------------------------------------------------------ */
/* Seeded PRNG (mulberry32)                                             */
/* ------------------------------------------------------------------ */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ------------------------------------------------------------------ */
/* Graph types (structural; the real pipeline types come from the repo) */
/* ------------------------------------------------------------------ */

export interface GraphObject {
  id: string;
  schema: string;
  controllerId: string;
  visibility: string;
  title: string;
  description: string;
  fields: Record<string, string | string[]>;
  createdAt: string;
  updatedAt: string;
  provenance: Record<string, unknown>;
  [k: string]: unknown;
}

export interface GraphRelationship {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  status: string;
  createdAt: string;
  evidenceRef: string;
  [k: string]: unknown;
}

export interface ObjectGraph {
  objects: GraphObject[];
  relationships: GraphRelationship[];
}

/* ------------------------------------------------------------------ */
/* Deterministic mutations                                              */
/* ------------------------------------------------------------------ */

export interface MutationOp {
  op: string;
  detail: string;
}

const HOSTILE_URL = "javascript:alert(document.domain)";
const RTL_PROBE = "‮GNITSET-LTR‬";
const HOURS_CONFLICT = "CONFLICT-INJECTED: directory claims Su 00:00-23:59; website claims Su closed";

/**
 * Apply deterministic, seed-reproducible mutations to a cloned graph.
 * seed 0 = baseline (no mutations). Every applied op is recorded.
 */
export function mutateGraph(source: ObjectGraph, seed: number): { graph: ObjectGraph; ops: MutationOp[] } {
  const graph: ObjectGraph = JSON.parse(JSON.stringify(source));
  const ops: MutationOp[] = [];
  if (seed === 0) {
    ops.push({ op: "baseline", detail: "seed 0: no mutations applied" });
    return { graph, ops };
  }
  const rng = mulberry32(seed);

  // 1. Shuffle insertion order (generator sorts by id, so this must be a no-op on output).
  shuffleInPlace(graph.objects, rng);
  shuffleInPlace(graph.relationships, rng);
  ops.push({ op: "shuffle", detail: `shuffled ${graph.objects.length} objects, ${graph.relationships.length} relationships` });

  // 2. Drop optional fields.
  let dropped = 0;
  for (const o of graph.objects) {
    if (o.description && rng() < 0.25) {
      o.description = "";
      dropped++;
      ops.push({ op: "drop_field", detail: `cleared description on ${o.id}` });
    }
    const keys = Object.keys(o.fields).filter((k) => k !== "phone");
    if (keys.length > 2 && rng() < 0.3) {
      const k = keys[Math.floor(rng() * keys.length)];
      delete o.fields[k];
      dropped++;
      ops.push({ op: "drop_field", detail: `dropped fields.${k} on ${o.id}` });
    }
  }
  if (dropped === 0) ops.push({ op: "drop_field", detail: "rng dropped nothing this seed" });

  // 3. Duplicate a non-business object (service-like preferred), plus its
  // inbound relationships with deterministic IDs, so the duplicate is
  // reachable exactly the way the original was.
  const dupable =
    graph.objects.find((o) => /service/i.test(o.schema) && o.visibility === "public") ||
    graph.objects.find((o) => !/business/i.test(o.schema));
  if (dupable && rng() < 0.6) {
    const dup: GraphObject = JSON.parse(JSON.stringify(dupable));
    dup.id = `${dupable.id}-dup-${seed}`;
    dup.title = `${dupable.title} (dup ${seed})`;
    graph.objects.push(dup);
    let relsDuped = 0;
    for (const r of graph.relationships) {
      if (r.object === dupable.id) {
        const rd: GraphRelationship = JSON.parse(JSON.stringify(r));
        rd.id = `${r.id}-dup-${seed}`;
        rd.object = dup.id;
        graph.relationships.push(rd);
        relsDuped++;
      }
    }
    ops.push({ op: "duplicate_object", detail: `duplicated ${dupable.id} as ${dup.id} (+${relsDuped} inbound relationships)` });
  } else {
    ops.push({ op: "duplicate_object", detail: "skipped by rng or no dupable object" });
  }

  // 4. Hostile value injection on the PUBLIC BUSINESS object (not just
  // objects[0]): unsafe website/hours values must land where the projection
  // actually reads them, or the injection exercises nothing.
  const target =
    graph.objects.find((o) => o.visibility === "public" && /business/i.test(o.schema)) ??
    graph.objects[0];
  if (target) {
    if (rng() < 0.6) {
      target.fields["website"] = HOSTILE_URL;
      ops.push({ op: "hostile_url", detail: `fields.website=javascript: scheme on ${target.id}` });
    }
    if (rng() < 0.6) {
      target.description = `${target.description} ${RTL_PROBE}`.trim();
      ops.push({ op: "hostile_rtl", detail: `RTL override chars injected into description on ${target.id}` });
    }
    if (rng() < 0.6 && typeof target.fields["hours"] === "string") {
      target.fields["hours"] = `${target.fields["hours"]}; ${HOURS_CONFLICT}`;
      ops.push({ op: "hostile_hours", detail: `conflicting hours appended on ${target.id}` });
    }
  }

  // Guarantee: a non-baseline seed always mutates something observable.
  const observable = ops.some((o) => o.op !== "shuffle" && !/rng dropped nothing|skipped by rng/.test(o.detail));
  if (!observable && target) {
    target.fields["website"] = HOSTILE_URL;
    ops.push({ op: "hostile_url", detail: `forced fallback: fields.website=javascript: scheme on ${target.id}` });
  }
  return { graph, ops };
}

/* ------------------------------------------------------------------ */
/* Metrics schema                                                       */
/* ------------------------------------------------------------------ */

export type JobOutcome =
  | "COMPILED"
  | "COMPILED_WITH_WARNINGS"
  | "VALIDATION_FAILED"
  | "RENDER_FAILED"
  | "CRASH";

export interface JobMetrics {
  job_id: string;
  fixture_id: string;
  mutation_seed: number;
  stage_ms: { plan: number; spec: number; validate: number; render: number };
  wall_ms: number;
  peak_heap_bytes: number;
  /** Singular RSS high-water mark for the job (bytes). */
  peak_memory_bytes: number;
  outcome: JobOutcome;
  failure_stage: "plan" | "spec" | "validate" | "render" | "worker" | null;
  error_type: string | null;
  error_detail: string | null;
  /**
   * P4 digest chain (LANE-CHAOS-R2): every stage records the digests of the
   * child artifacts it consumed, so a source edit provably invalidates
   * everything downstream. Edges:
   *   plan:     fixture_digest -> graph_digest
   *   spec:     graph_digest   -> spec_digest (+ spec_digest_b; determinism
   *                              requires spec_digest == spec_digest_b)
   *   validate: spec_digest    -> findings_digest, where
   *                              findings_digest = digest({spec_digest, findings})
   *                              so the parent output binds the child digest.
   *   render:   (spec_digest, graph_digest) -> render_digest, where
   *                              render_digest = digest({spec_digest, graph_digest, ctx})
   * A verifier re-walks the chain: any semantic source change must move
   * every downstream digest; identical inputs must reproduce every digest.
   */
  fixture_digest: string;
  graph_digest: string;
  spec_digest: string | null;
  spec_digest_b: string | null;
  findings_digest: string | null;
  render_digest: string | null;
  graph_rooted: boolean | null;
  /**
   * G1: the transform code version this result was computed under. The
   * cache key is (job_id, pipeline_code_version, harness_version): a HIT
   * is served only when all three match the current run.
   */
  pipeline_code_version: string;
  /**
   * G2: the input generation (manifest publish_seq) this result was
   * computed from. Publication is compare-and-set: the runner accepts a
   * result only when rec.dispatch_seq === manifest.publish_seq, and a
   * result file is canonical for a done job only when
   * rec.dispatch_seq === manifest.done_seq. A late write from a previous
   * generation can never silently regress the canonical record.
   */
  dispatch_seq: number;
  determinism_match: boolean | null;
  object_count: number;
  relationship_count: number;
  page_count: number;
  section_count: number;
  /** Unsafe (javascript:/vbscript:/data:text/html:) URLs in the OUTPUT spec. */
  unsafe_url_count: number;
  /** Unsafe URLs present in the INPUT fixture graph (before projection). */
  input_unsafe_url_count: number;
  unbound_claim_count: number;
  hidden_object_count: number;
  warning_count: number;
  error_count: number;
  info_count: number;
  mutation_ops: MutationOp[];
  attempts: number;
  harness_version: string;
}

export function emptyMetrics(job_id: string, fixture_id: string, seed: number, attempts: number): JobMetrics {
  return {
    job_id,
    fixture_id,
    mutation_seed: seed,
    stage_ms: { plan: 0, spec: 0, validate: 0, render: 0 },
    wall_ms: 0,
    peak_heap_bytes: 0,
    peak_memory_bytes: 0,
    outcome: "CRASH",
    failure_stage: null,
    error_type: null,
    error_detail: null,
    fixture_digest: "",
    graph_digest: "",
    spec_digest: null,
    spec_digest_b: null,
    findings_digest: null,
    render_digest: null,
    graph_rooted: null,
    pipeline_code_version: "",
    dispatch_seq: 0,
    determinism_match: null,
    object_count: 0,
    relationship_count: 0,
    page_count: 0,
    section_count: 0,
    unsafe_url_count: 0,
    input_unsafe_url_count: 0,
    unbound_claim_count: 0,
    hidden_object_count: 0,
    warning_count: 0,
    error_count: 0,
    info_count: 0,
    mutation_ops: [],
    attempts,
    harness_version: HARNESS_VERSION,
  };
}
