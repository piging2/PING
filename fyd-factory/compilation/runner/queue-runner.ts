/**
 * fyd-compile-harness queue runner: drains a file-based job queue in batches.
 *
 * Usage:
 *   tsx queue-runner.ts --manifest <manifest.jsonl> --results-dir <dir>
 *       --runner-dir <dir> [--job-timeout-ms N] [--concurrency N]
 *       [--batch-size N] [--max-jobs N]
 *       [--tsconfig <path>] [--tsx-bin <path>]
 *
 * Manifest: one JSON object per line:
 *   {job_id, fixture_id, seed, fixture_path, status, attempts, isolate,
 *    quarantined, publish_seq, done_seq, updated_at, last_error}
 * status: pending | running | done | failed
 * (a job that exhausts its attempts is status:"failed" with quarantined:true;
 *  quarantine is a flag, not a fifth status)
 * publish_seq: G2 input generation, incremented on every dispatch.
 * done_seq: the dispatch_seq whose result was accepted at publication.
 *
 * Cache key (G1): (job_id, pipeline_code_version, harness_version). A result
 * file is a HIT only when its bound versions match the current run; a HIT
 * is never served when the bound code version differs. Publication is
 * compare-and-set (G2): a result is accepted only when
 * rec.dispatch_seq === publish_seq at finalization.
 *
 * Batching: one warm tsx worker process handles --batch-size jobs (tsx cold
 * start ~1.5-2s dominates; the pipeline is milliseconds after warmup). A job
 * that comes back without a result file (batch crash/timeout) is retried
 * solo (isolate=true) so one poison job cannot burn its batch-mates' attempts
 * more than once.
 *
 * Guarantees:
 * - Idempotent: a done job with a result file is never re-run.
 * - Resumable: on start, stale running jobs (previous runner dead) reset to pending.
 * - Bounded: per-job inactivity timeout (startup allowance, then the clock
 *   resets on every RESULT); 3 dispatch attempts then quarantine
 *   (status:"failed", quarantined:true).
 * - Single-writer: a lock file (<manifest>.lock) with the owner PID; a second
 *   runner refuses to start while the lock holder is alive.
 * - Delimited logging: every runner line is prefixed "[queue]"; worker result
 *   records are parsed only from lines starting with "RESULT ".
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import {
  HARNESS_VERSION,
  computePipelineCodeVersion,
  shortVersion,
} from "./lib";

/**
 * G1: the transform code version for this runner process. The cache key is
 * (job_id, pipeline_code_version, harness_version): a result file is a HIT
 * only when its bound versions match these. Fail closed at startup.
 */
let PIPELINE_CODE_VERSION = "";
try {
  PIPELINE_CODE_VERSION = computePipelineCodeVersion();
} catch (e: any) {
  console.error(`[queue] fatal: pipeline_code_version_unavailable: ${e?.message ?? e}`);
  process.exit(2);
}

interface Job {
  job_id: string;
  fixture_id: string;
  seed: number;
  fixture_path: string;
  status: "pending" | "running" | "done" | "failed";
  /** Dispatch-based attempt counter: incremented on EVERY dispatch, including
   *  the successful one. The worker receives the incremented value. */
  attempts: number;
  /** Set when attempts are exhausted (3 dispatches without success).
   *  Quarantine is a flag on status:"failed", not a fifth status. The queue
   *  selector never picks quarantined jobs. */
  quarantined: boolean;
  isolate: boolean;
  /**
   * G2: input generation. Incremented on every dispatch of this job.
   * Publication is compare-and-set: a result is accepted only when
   * rec.dispatch_seq === publish_seq. A late write from an older
   * generation (e.g. an orphan worker from a killed batch) is rejected,
   * never silently published.
   */
  publish_seq: number;
  /** G2: the dispatch_seq whose result was accepted at publication. */
  done_seq: number | null;
  updated_at: string;
  last_error: string | null;
}

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  console.error(`[queue] missing required arg ${name}`);
  process.exit(2);
}

const log = (...a: unknown[]) => console.log("[queue]", ...a);

const MANIFEST = arg("--manifest");
const RESULTS_DIR = arg("--results-dir");
const RUNNER_DIR = arg("--runner-dir");
const JOB_TIMEOUT_MS = parseInt(arg("--job-timeout-ms", "120000"), 10);
const CONCURRENCY = parseInt(arg("--concurrency", "1"), 10);
const BATCH_SIZE = parseInt(arg("--batch-size", "25"), 10);
const MAX_JOBS = parseInt(arg("--max-jobs", "0"), 10);
const STALL_MS = parseInt(arg("--stall-ms", "0"), 10);
const TSCONFIG = arg("--tsconfig", "/home/nolan/projects/ping/tsconfig.json");
const TSX = arg("--tsx-bin", "/home/nolan/projects/ping/node_modules/.bin/tsx");
const LOCK_PATH = MANIFEST + ".lock";
const WORKER = path.join(RUNNER_DIR, "job-worker.ts");

const nowIso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readManifest(): Job[] {
  if (!fs.existsSync(MANIFEST)) return [];
  return fs
    .readFileSync(MANIFEST, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const j = JSON.parse(l) as Job;
      if (typeof j.isolate !== "boolean") j.isolate = false;
      // Forward migration: pre-1.2.0 manifests used status:"quarantined".
      // Quarantine is now a flag on status:"failed".
      if ((j as any).status === "quarantined") {
        j.status = "failed";
        j.quarantined = true;
      }
      if (typeof j.quarantined !== "boolean") j.quarantined = false;
      return j;
    });
}

/** Atomic manifest rewrite: write temp, rename over. */
function writeManifest(jobs: Job[]): void {
  const tmp = MANIFEST + `.tmp.${process.pid}`;
  fs.writeFileSync(tmp, jobs.map((j) => JSON.stringify(j)).join("\n") + "\n");
  fs.renameSync(tmp, MANIFEST);
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock(): void {
  if (fs.existsSync(LOCK_PATH)) {
    const raw = fs.readFileSync(LOCK_PATH, "utf8").trim();
    const pid = parseInt(raw, 10);
    if (!Number.isNaN(pid) && pidAlive(pid)) {
      console.error(`[queue] lock held by live pid ${pid}; refusing to start`);
      process.exit(3);
    }
    log(`stale lock (pid ${raw}); taking over`);
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_PATH) && fs.readFileSync(LOCK_PATH, "utf8").trim() === String(process.pid)) {
      fs.unlinkSync(LOCK_PATH);
    }
  } catch {
    /* best effort */
  }
}

const resultPath = (jobId: string) => path.join(RESULTS_DIR, `${jobId}.json`);

/**
 * A result file counts as completion proof only if a real worker wrote it.
 * Synthesized records (harness_version "queue-runner") describe a missing
 * result and must NOT short-circuit a retry.
 */
/**
 * G1+G2 cache-HIT rule. A result file is a HIT for this job only when:
 *   - it parses and is a real worker record (not a queue-runner synthesis),
 *   - rec.harness_version === HARNESS_VERSION (harness schema current),
 *   - rec.pipeline_code_version === PIPELINE_CODE_VERSION (transform code
 *     current: a HIT is NEVER served when the bound code version differs),
 *   - rec.dispatch_seq === job.publish_seq (the result belongs to the
 *     latest input generation, not a stale orphan write).
 * Anything else is a MISS: the job is (re-)dispatched. Stale-code results
 * are never served as current; stale-generation writes are never published.
 */
function readRecord(jobId: string): Record<string, unknown> | null {
  const p = resultPath(jobId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isCurrentHit(job: Job, rec: Record<string, unknown> | null): boolean {
  if (!rec || rec.harness_version === "queue-runner") return false;
  // dispatch_seq must be a real number: a missing seq (pre-1.1.0 record)
  // never equals a generation, even when the manifest predates seq too.
  if (typeof rec.dispatch_seq !== "number") return false;
  return (
    rec.harness_version === HARNESS_VERSION &&
    rec.pipeline_code_version === PIPELINE_CODE_VERSION &&
    rec.dispatch_seq === job.publish_seq
  );
}

/** Human-readable reason a present-but-unusable result file was rejected. */
function hitMissReason(job: Job, rec: Record<string, unknown> | null): string {
  if (!rec) return "no result file";
  if (rec.harness_version === "queue-runner") return "synthesized placeholder, not a worker record";
  if (rec.harness_version !== HARNESS_VERSION)
    return `harness_version ${rec.harness_version} != ${HARNESS_VERSION}`;
  if (rec.pipeline_code_version !== PIPELINE_CODE_VERSION)
    return `pipeline_code_version ${shortVersion(String(rec.pipeline_code_version ?? "?"))} != ${shortVersion(PIPELINE_CODE_VERSION)} (stale code: re-running)`;
  if (rec.dispatch_seq !== job.publish_seq)
    return `dispatch_seq ${rec.dispatch_seq} != publish_seq ${job.publish_seq} (stale generation: re-running)`;
  return "current";
}

function synthesizeResult(job: Job, failureStage: string, errorType: string, detail: string): Record<string, unknown> {
  const rec = {
    job_id: job.job_id,
    fixture_id: job.fixture_id,
    mutation_seed: job.seed,
    stage_ms: { plan: 0, spec: 0, validate: 0, render: 0 },
    wall_ms: 0,
    peak_heap_bytes: 0,
    peak_rss_bytes: 0,
    outcome: "CRASH",
    failure_stage: failureStage,
    error_type: errorType,
    error_detail: detail.slice(0, 500),
    fixture_digest: "",
    graph_digest: "",
    spec_digest: null,
    spec_digest_b: null,
    findings_digest: null,
    render_digest: null,
    graph_rooted: null,
    determinism_match: null,
    object_count: 0,
    relationship_count: 0,
    page_count: 0,
    section_count: 0,
    unsafe_url_count: 0,
    unbound_claim_count: 0,
    hidden_object_count: 0,
    warning_count: 0,
    error_count: 0,
    info_count: 0,
    mutation_ops: [],
    attempts: job.attempts,
    harness_version: "queue-runner",
    pipeline_code_version: PIPELINE_CODE_VERSION,
    dispatch_seq: job.publish_seq ?? 0,
  };
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(resultPath(job.job_id), JSON.stringify(rec, null, 1) + "\n");
  return rec;
}

/* ------------------------------------------------------------------ */
/* Canonical results.jsonl appender contract (factory-wide).            */
/*                                                                     */
/* Rules every wave-1 worker and future shard implements:              */
/*   1. Atomic append: one record = one JSON line written with a single */
/*      O_APPEND write() call. A record is either fully committed       */
/*      (ends with "\n") or not committed at all.                      */
/*   2. Claim-before-execute: a job is claimed (manifest status=running)*/
/*      BEFORE any execution or append for it happens.                 */
/*   3. Duplicate-safe: readers dedupe by job_id, last record wins.    */
/*      The appender writes exactly one record per job per terminal    */
/*      transition (done | quarantined), and writes it BEFORE the      */
/*      manifest marks the job terminal. A kill between append and     */
/*      manifest-mark leaves an orphan record for a non-terminal job;  */
/*      resume re-runs the job and appends again; dedupe makes the     */
/*      effect exactly-once.                                           */
/*   4. Startup repair: any bytes after the last "\n" are a torn record*/
/*      from a kill landing mid-write; they are truncated atomically   */
/*      (tmp+rename) before the first append.                          */
/* ------------------------------------------------------------------ */

const RESULTS_JSONL = arg("--results-jsonl", path.join(path.dirname(RESULTS_DIR), "results.jsonl"));

function repairJsonlTail(): void {
  if (!fs.existsSync(RESULTS_JSONL)) return;
  const buf = fs.readFileSync(RESULTS_JSONL);
  if (buf.length === 0) return;
  const lastNl = buf.lastIndexOf(0x0a);
  if (lastNl === buf.length - 1) return; // clean tail
  const torn = buf.length - (lastNl + 1);
  const tmp = RESULTS_JSONL + `.repair.${process.pid}`;
  fs.writeFileSync(tmp, buf.subarray(0, lastNl + 1));
  fs.renameSync(tmp, RESULTS_JSONL);
  log(`repaired results.jsonl tail: truncated ${torn} torn bytes`);
}

function appendTerminalRecord(rec: unknown): void {
  fs.mkdirSync(path.dirname(RESULTS_JSONL), { recursive: true });
  fs.appendFileSync(RESULTS_JSONL, JSON.stringify(rec) + "\n"); // single O_APPEND write
}

async function runBatch(jobs: Job[]): Promise<void> {
  // Idempotent pre-check with G1+G2 cache rule: a job is done without
  // re-running only when its result file is a CURRENT hit (versions match,
  // generation matches). A present-but-stale file (old code version, old
  // generation) is demoted to pending and re-dispatched: a HIT is never
  // served when the bound code version differs.
  let all = readManifest();
  const todo: Job[] = [];
  for (const job of jobs) {
    const cur = all.find((x) => x.job_id === job.job_id)!;
    const rec = readRecord(job.job_id);
    if (rec && isCurrentHit(cur, rec)) {
      if (cur.status !== "done") {
        // Resume path: the previous runner died after the worker wrote the
        // result but before finalization. Terminal transition happens here.
        appendTerminalRecord(rec);
        cur.status = "done";
        cur.done_seq = rec.dispatch_seq as number;
        cur.last_error = null;
        cur.updated_at = nowIso();
      }
    } else {
      if (rec && cur.status === "done") {
        // G1: a done job whose result went stale (code changed under it) is
        // demoted and re-run. This is the live stale-code rejection.
        log(`stale done result rejected for ${job.job_id.slice(0, 12)}: ${hitMissReason(cur, rec)}`);
      } else if (rec) {
        log(`stale result ignored for ${job.job_id.slice(0, 12)}: ${hitMissReason(cur, rec)}`);
      }
      // G2: claiming this dispatch bumps the input generation BEFORE the
      // worker spawns (claim-before-execute). Any late write from an older
      // generation carries an older dispatch_seq and fails the CAS below.
      // Attempts are dispatch-based: incremented on EVERY dispatch,
      // including the successful one. The worker receives the incremented
      // attempt; three dispatches without success quarantines the job.
      cur.publish_seq = (cur.publish_seq ?? 0) + 1;
      cur.attempts += 1;
      cur.status = "running";
      cur.updated_at = nowIso();
      todo.push(job);
    }
  }
  writeManifest(all);
  if (todo.length === 0) {
    log(`batch of ${jobs.length}: all already had results, no-op`);
    return;
  }

  const batchFile = path.join(path.dirname(MANIFEST), `batch.${process.pid}.${Date.now()}.json`);
  fs.writeFileSync(
    batchFile,
    JSON.stringify(
      todo.map((j) => {
        const cur = all.find((x) => x.job_id === j.job_id)!;
        return {
          job_id: j.job_id,
          fixture_id: j.fixture_id,
          fixture: j.fixture_path,
          seed: j.seed,
          attempt: cur.attempts, // already incremented at claim time above
          dispatch_seq: cur.publish_seq, // G2: the input generation being executed
        };
      })
    )
  );

  const child = spawn(TSX, [
    `--tsconfig=${TSCONFIG}`,
    WORKER,
    "--batch", batchFile,
    "--results-dir", RESULTS_DIR,
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let err = "";
  child.stderr.on("data", (d) => { err += d.toString(); });
  // Per-job inactivity timeout: the startup allowance covers worker boot and
  // the first RESULT; every parsed RESULT resets the clock. A worker that
  // goes quiet longer than JOB_TIMEOUT_MS is SIGKILLed, and its missing
  // members are retried individually (status failed + isolate). There is no
  // batch-wide timeout: a slow-but-progressing batch is never killed.
  let lastActivity = Date.now();
  let timedOut = false;
  const inactivityTimer = setInterval(() => {
    if (Date.now() - lastActivity > JOB_TIMEOUT_MS) {
      timedOut = true;
      child.kill("SIGKILL");
      clearInterval(inactivityTimer);
    }
  }, 250);
  // Parse only delimited RESULT lines; ignore everything else.
  child.stdout.on("data", (d) => {
    for (const line of d.toString().split("\n")) {
      if (line.startsWith("RESULT ")) {
        try {
          const r = JSON.parse(line.slice(7));
          lastActivity = Date.now(); // progress: reset the inactivity clock
          log(`job ${String(r.job_id).slice(0, 12)} outcome=${r.outcome} wall=${r.wall_ms}ms`);
        } catch { /* malformed; result file is the truth */ }
      }
    }
  });

  const exitCode: number | null = await new Promise((resolve) => {
    child.on("close", (code) => resolve(code));
  });
  clearInterval(inactivityTimer);
  try { fs.unlinkSync(batchFile); } catch { /* best effort */ }

  all = readManifest();
  let done = 0;
  let noop = 0;
  let missing = 0;
  let staleRejected = 0;
  for (const job of jobs) {
    const cur = all.find((x) => x.job_id === job.job_id)!;
    const rec = readRecord(job.job_id);
    if (rec && isCurrentHit(cur, rec)) {
      // G2 compare-and-set: the result belongs to the latest input
      // generation AND the current code version. Accept and publish.
      if (cur.status !== "done") {
        // Terminal transition: append BEFORE the manifest marks it done
        // (kill between append and mark is safe: resume re-appends, dedupe wins).
        appendTerminalRecord(rec);
        cur.status = "done";
        cur.done_seq = rec.dispatch_seq as number;
        cur.last_error = null;
        done++;
      } else {
        noop++;
      }
    } else if (!todo.some((t) => t.job_id === job.job_id)) {
      noop++; // was already done in the pre-check
    } else if (rec && rec.harness_version !== "queue-runner") {
      // G2: a real worker record is present but failed the CAS (stale
      // generation or stale code written by an orphan/late worker). Reject
      // the publish explicitly: never mark done, never append. The job is
      // requeued; the next dispatch bumps publish_seq past the stale write.
      staleRejected++;
      log(`stale publish rejected for ${job.job_id.slice(0, 12)}: ${hitMissReason(cur, rec)}`);
      // attempts already counted at dispatch; a stale publish consumes no
      // extra attempt, but the job is isolated: something is racing it.
      cur.isolate = true;
      cur.last_error = `stale publish rejected: ${hitMissReason(cur, rec)}`;
      if (cur.attempts >= 3) {
        const termRec = synthesizeResult(cur, "worker", "worker:stale_publish", cur.last_error);
        appendTerminalRecord(termRec);
        cur.status = "failed";
        cur.quarantined = true;
        log(`quarantined ${job.job_id.slice(0, 12)} after 3 attempts (${cur.last_error})`);
      } else {
        cur.status = "failed";
      }
      missing++;
    } else {
      // attempts already counted at dispatch (claim time). Retry solo next
      // time: one poison job must not sink a batch twice.
      cur.isolate = true;
      // Fresh terminal record for this attempt (overwrites any stale file:
      // no current hit exists, so nothing canonical is lost).
      let termRec: unknown;
      if (timedOut) {
        termRec = synthesizeResult(cur, "worker", "worker:job_inactivity", `no RESULT for ${JOB_TIMEOUT_MS}ms`);
        cur.last_error = "worker:job_inactivity";
      } else {
        termRec = synthesizeResult(cur, "worker", "worker:batch_crash", `exit=${exitCode} stderr=${err.slice(0, 200)}`);
        cur.last_error = `worker:batch_crash exit=${exitCode}`;
      }
      if (cur.attempts >= 3) {
        appendTerminalRecord(termRec); // BEFORE the manifest marks it failed+quarantined
        cur.status = "failed";
        cur.quarantined = true;
        log(`quarantined ${job.job_id.slice(0, 12)} after 3 attempts (${cur.last_error})`);
      } else {
        cur.status = "failed";
      }
      missing++;
    }
    cur.updated_at = nowIso();
  }
  writeManifest(all);
  log(`batch of ${jobs.length}: ${done} done, ${noop} no-op, ${missing} missing, ${staleRejected} stale-rejected${timedOut ? " (TIMEOUT)" : ""}`);
}

async function main(): Promise<void> {
  // Queue concurrency policy: exactly one runner per manifest. Throughput
  // scales through independent shard manifests (own manifest + results dir),
  // never through concurrent runBatch calls on the same manifest.
  if (process.argv.includes("--concurrency") && CONCURRENCY !== 1) {
    console.error("[queue] FATAL: --concurrency must be 1; scale with independent shard manifests instead");
    process.exit(2);
  }
  acquireLock();
  process.on("SIGTERM", () => { releaseLock(); process.exit(0); });
  process.on("SIGINT", () => { releaseLock(); process.exit(0); });

  // Canonical appender contract, rule 4: repair any torn jsonl tail before
  // the first append of this run.
  repairJsonlTail();

  // G1: this run's transform code version. Every cache HIT served below
  // requires the result's bound version to equal this.
  log(`pipeline_code_version=${shortVersion(PIPELINE_CODE_VERSION)} harness_version=${HARNESS_VERSION}`);

  // Crash recovery: jobs left "running" by a dead runner go back to pending.
  // Their partial batch left no result files behind for unprocessed jobs
  // (result files are written atomically per completed job), so re-running
  // them has no duplicate side effects.
  // G1: a job marked done is only as good as its result's bound versions.
  // If the transform code or harness changed under a committed result, the
  // job is demoted to pending and re-run: a HIT is never served when the
  // bound code version differs.
  let jobs = readManifest();
  let recovered = 0;
  for (const j of jobs) {
    if (j.status === "running") {
      j.status = "pending";
      j.updated_at = nowIso();
      recovered++;
    }
    if (j.status === "done" && !fs.existsSync(resultPath(j.job_id))) {
      j.status = "pending";
      j.updated_at = nowIso();
      recovered++;
    }
    if (j.status === "done") {
      const rec = readRecord(j.job_id);
      if (!isCurrentHit(j, rec)) {
        log(`startup: demoting stale done job ${j.job_id.slice(0, 12)}: ${hitMissReason(j, rec)}`);
        j.status = "pending";
        j.updated_at = nowIso();
        recovered++;
      }
    }
  }
  if (recovered > 0) {
    writeManifest(jobs);
    log(`recovered ${recovered} interrupted jobs to pending`);
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  let dispatched = 0;
  const inFlight = new Set<Promise<void>>();

  for (;;) {
    jobs = readManifest();
    // Drain order: pending non-isolate batches first, then failed/isolate retries.
    // Quarantined jobs (failed + quarantined:true) are never selected.
    const eligible = (j: Job) => !j.quarantined;
    const take = (pred: (j: Job) => boolean, n: number) => jobs.filter(pred).slice(0, n);
    let batch = take((j) => eligible(j) && j.status === "pending" && !j.isolate, BATCH_SIZE);
    if (batch.length === 0) batch = take((j) => eligible(j) && j.status === "pending" && j.isolate, 1);
    if (batch.length === 0) batch = take((j) => eligible(j) && j.status === "failed" && !j.isolate, BATCH_SIZE);
    if (batch.length === 0) batch = take((j) => eligible(j) && j.status === "failed" && j.isolate, 1);
    if (batch.length === 0 || (MAX_JOBS > 0 && dispatched >= MAX_JOBS)) {
      if (inFlight.size > 0) {
        await Promise.race(inFlight);
        continue;
      }
      break;
    }
    if (MAX_JOBS > 0 && dispatched + batch.length > MAX_JOBS) {
      batch = batch.slice(0, MAX_JOBS - dispatched);
    }
    const p = runBatch(batch).finally(() => { inFlight.delete(p); });
    inFlight.add(p);
    dispatched += batch.length;
    if (STALL_MS > 0) await sleep(STALL_MS);
    if (inFlight.size >= CONCURRENCY) await Promise.race(inFlight);
  }

  await Promise.all(inFlight);
  const final = readManifest();
  const counts: Record<string, number> = {};
  for (const j of final) counts[j.status] = (counts[j.status] ?? 0) + 1;
  log(`queue drained: ${JSON.stringify(counts)}`);
  releaseLock();
}

main().catch((e) => {
  console.error("[queue] RUNNER_FATAL", e?.message ?? e);
  releaseLock();
  process.exit(1);
});
