/**
 * r2-p1-worker.ts: probe worker for P1 (duplicate job safety).
 * Appends exactly ONE execution record per invocation (atomic O_APPEND single
 * write) and writes the deterministic result file atomically (tmp+rename).
 * The "work" is a real digest over fixture bytes + seed via the factory's own
 * compilation/runner/lib.ts, so re-execution is content-identical.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { digest } from "../compilation/runner/lib.ts";

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  console.error(`missing required arg ${name}`);
  process.exit(2);
}

const JOB_ID = arg("--job-id");
const FIXTURE_ID = arg("--fixture-id");
const FIXTURE = arg("--fixture");
const SEED = arg("--seed");
const RESULTS_DIR = arg("--results-dir");
const EXEC_LOG = arg("--exec-log");
const STALL_MS = parseInt(arg("--stall-ms", "50"), 10);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  // Widen the race window so two runners genuinely contend for the claim.
  await sleep(STALL_MS);

  const fixtureBytes = fs.readFileSync(FIXTURE, "utf8");
  const workDigest = digest({ fixture_id: FIXTURE_ID, seed: SEED, bytes: fixtureBytes });

  // ONE execution record per invocation, atomic append.
  fs.appendFileSync(
    EXEC_LOG,
    JSON.stringify({ job_id: JOB_ID, executed_by: process.pid, work_digest: workDigest }) + "\n"
  );

  // Deterministic result, atomic commit.
  const result = {
    job_id: JOB_ID,
    fixture_id: FIXTURE_ID,
    mutation_seed: parseInt(SEED, 10),
    outcome: "COMPILED",
    work_digest: workDigest,
  };
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const tmp = path.join(RESULTS_DIR, `${JOB_ID}.json.tmp.${process.pid}`);
  fs.writeFileSync(tmp, JSON.stringify(result, null, 1) + "\n");
  fs.renameSync(tmp, path.join(RESULTS_DIR, `${JOB_ID}.json`));
  console.log(`worker done ${JOB_ID.slice(0, 12)} digest=${workDigest.slice(0, 12)}`);
}

main().catch((e) => {
  console.error("WORKER_FATAL", e?.message ?? e);
  process.exit(1);
});
