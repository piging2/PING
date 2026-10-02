/**
 * r2-runner.ts: protocol-faithful queue runner for P1 (duplicate job safety).
 *
 * Ports the guarantees of compilation/runner/queue-runner.ts:
 *   - manifest is only ever rewritten atomically (tmp+rename)
 *   - on start, stale "running" jobs (dead previous runner) reset to pending
 *   - a "done" job with a result file is never re-run (idempotent no-op)
 *   - per-job timeout kills the worker (SIGKILL); 3 attempts then quarantine
 *
 * PLUS the chaos-hardened claim protocol (the duplicate-dispatch defense):
 *   - claiming a job is an atomic mkdir on claims/<job_id>; exactly one
 *     contender wins. Losers join: they wait for done+result and execute
 *     nothing. A claim owned by a dead pid is stale and reclaimed.
 *
 * Usage:
 *   node r2-runner.ts --manifest <m.jsonl> --results-dir <d> --exec-log <f>
 *     --worker <r2-p1-worker.ts> --id <runner-id> [--max-jobs N]
 *     [--job-timeout-ms N] [--claims-dir <d>]
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";

interface Job {
  job_id: string;
  fixture_id: string;
  seed: number;
  fixture_path: string;
  status: "pending" | "running" | "done" | "failed" | "quarantined";
  attempts: number;
  updated_at: string;
  last_error: string | null;
}

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  console.error(`missing required arg ${name}`);
  process.exit(2);
}

const MANIFEST = arg("--manifest");
const RESULTS_DIR = arg("--results-dir");
const EXEC_LOG = arg("--exec-log");
const WORKER = arg("--worker");
const RUNNER_ID = arg("--id");
const MAX_JOBS = parseInt(arg("--max-jobs", "0"), 10);
const JOB_TIMEOUT_MS = parseInt(arg("--job-timeout-ms", "30000"), 10);
const CLAIMS_DIR = arg("--claims-dir", path.join(path.dirname(MANIFEST), "claims"));
const nowIso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readManifest(): Job[] {
  if (!fs.existsSync(MANIFEST)) return [];
  return fs.readFileSync(MANIFEST, "utf8").split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Job);
}
function writeManifest(jobs: Job[]): void {
  const tmp = `${MANIFEST}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, jobs.map((j) => JSON.stringify(j)).join("\n") + "\n");
  fs.renameSync(tmp, MANIFEST);
}
function resultPath(jobId: string): string {
  return path.join(RESULTS_DIR, `${jobId}.json`);
}
function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/** Atomic claim. Returns "won" | "lost" | "reclaimed". */
function claim(jobId: string): "won" | "lost" | "reclaimed" {
  const dir = path.join(CLAIMS_DIR, jobId);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e: any) {
    if (e?.code !== "EEXIST") throw e;
  }
  const ownerFile = path.join(dir, "owner.json");
  if (!fs.existsSync(ownerFile)) {
    // Fresh claim dir (we created it) or raced creation: try to own it.
    try {
      fs.writeFileSync(ownerFile, JSON.stringify({ runner: RUNNER_ID, pid: process.pid }), { flag: "wx" });
      return "won";
    } catch (e: any) {
      if (e?.code !== "EEXIST") throw e;
    }
  }
  // Someone owns it: check staleness.
  try {
    const owner = JSON.parse(fs.readFileSync(ownerFile, "utf8"));
    if (typeof owner.pid === "number" && !pidAlive(owner.pid)) {
      fs.rmSync(dir, { recursive: true, force: true });
      return "reclaimed";
    }
  } catch { /* unreadable owner: treat as live, join */ }
  return "lost";
}

function releaseClaim(jobId: string): void {
  fs.rmSync(path.join(CLAIMS_DIR, jobId), { recursive: true, force: true });
}

async function runOne(job: Job): Promise<void> {
  let jobs = readManifest();
  const j = jobs.find((x) => x.job_id === job.job_id)!;
  j.status = "running";
  j.updated_at = nowIso();
  writeManifest(jobs);

  const child = spawn(process.execPath, [WORKER,
    "--job-id", job.job_id, "--fixture-id", job.fixture_id,
    "--fixture", job.fixture_path, "--seed", String(job.seed),
    "--results-dir", RESULTS_DIR, "--exec-log", EXEC_LOG,
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, JOB_TIMEOUT_MS);
  const exitCode: number | null = await new Promise((res) => child.on("close", (c) => res(c)));
  clearTimeout(timer);

  jobs = readManifest();
  const cur = jobs.find((x) => x.job_id === job.job_id)!;
  if (!timedOut && fs.existsSync(resultPath(job.job_id))) {
    cur.status = "done";
    cur.last_error = null;
  } else {
    cur.attempts += 1;
    cur.last_error = timedOut ? "worker:timeout" : `worker:crash exit=${exitCode}`;
    cur.status = cur.attempts >= 3 ? "quarantined" : "failed";
  }
  cur.updated_at = nowIso();
  writeManifest(jobs);
  releaseClaim(job.job_id);
}

async function joinWait(jobId: string): Promise<boolean> {
  // Loser path: wait for the winner's commit, execute nothing.
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const jobs = readManifest();
    const j = jobs.find((x) => x.job_id === jobId);
    if (j && j.status === "done" && fs.existsSync(resultPath(jobId))) return true;
    await sleep(100);
  }
  return false;
}

async function main(): Promise<void> {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.mkdirSync(CLAIMS_DIR, { recursive: true });

  // Crash recovery, same as queue-runner.ts: stale running -> pending.
  let jobs = readManifest();
  let recovered = 0;
  for (const j of jobs) {
    if (j.status === "running") { j.status = "pending"; j.updated_at = nowIso(); recovered++; }
    if (j.status === "done" && !fs.existsSync(resultPath(j.job_id))) {
      j.status = "pending"; j.updated_at = nowIso(); recovered++;
    }
  }
  if (recovered > 0) { writeManifest(jobs); console.log(`[${RUNNER_ID}] recovered ${recovered} interrupted jobs`); }

  let dispatched = 0;
  let joined = 0;
  for (;;) {
    jobs = readManifest();
    const next = jobs.find((j) => j.status === "pending" || j.status === "failed");
    if (!next || (MAX_JOBS > 0 && dispatched >= MAX_JOBS)) break;
    const c = claim(next.job_id);
    if (c === "lost") {
      const ok = await joinWait(next.job_id);
      console.log(`[${RUNNER_ID}] join ${next.job_id.slice(0, 12)}: ${ok ? "winner committed, executed nothing" : "JOIN TIMEOUT"}`);
      if (ok) joined++;
      continue;
    }
    if (c === "reclaimed") console.log(`[${RUNNER_ID}] reclaimed stale claim on ${next.job_id.slice(0, 12)}`);
    await runOne(next);
    dispatched++;
  }
  console.log(`[${RUNNER_ID}] drained: dispatched=${dispatched} joined=${joined}`);
}

main().catch((e) => { console.error("RUNNER_FATAL", e?.message ?? e); process.exit(1); });
