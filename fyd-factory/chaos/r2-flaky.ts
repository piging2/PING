/**
 * r2-flaky.ts: batch worker against a flaky upstream (LANE-CHAOS R2, probe P6).
 *
 * Chaos modeled: the upstream dependency fails deterministically per a seeded
 * schedule with 500s, 429s (Retry-After), timeouts, and DNS errors; one
 * mission always fails. The worker itself is SIGKILLed mid-batch; resume
 * skips already-recorded missions.
 *
 * Contract under test:
 *   1. Bounded retries: at most 3 attempts per mission, short backoff, 429
 *      honors Retry-After. No infinite loops, no unbounded waiting.
 *   2. A mission that exhausts retries is recorded as a TYPED failure
 *      (outcome FAILED + error_type), never a crash, never silent.
 *   3. Crash mid-batch loses nothing and duplicates nothing: resume skips
 *      recorded mission ids; every mission 1..M appears exactly once.
 *   4. results.jsonl stays valid JSONL (startup torn-tail repair, same as
 *      r2-appender.ts).
 *
 * Usage:
 *   node r2-flaky.ts --results <results.jsonl> --from <m> --to <m> [--die-after <m>]
 */
import * as fs from "node:fs";
import * as path from "node:path";

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  console.error(`missing required arg ${name}`);
  process.exit(2);
}

const RESULTS = arg("--results");
const FROM = parseInt(arg("--from", "1"), 10);
const TO = parseInt(arg("--to"), 10);
const DIE_AFTER = parseInt(arg("--die-after", "0"), 10);
const DIR = path.dirname(RESULTS);
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fault = "ok" | "e500" | "e429" | "timeout" | "dns";

/** Deterministic fault schedule: the chaos. Mission 25 always fails. */
function faultFor(mission: number, attempt: number): Fault {
  if (mission === 25) return "e500";
  const m = mission % 10;
  if (m === 7 && attempt <= 2) return "e500";
  if (m === 3 && attempt === 1) return "e429";
  if (m === 9 && attempt === 1) return "timeout";
  if (m === 5 && attempt === 1) return "dns";
  return "ok";
}

const RETRY_AFTER_MS: Record<string, number> = { e500: 20, e429: 30, timeout: 40, dns: 20 };

async function upstream(mission: number, attempt: number): Promise<{ ok: boolean; fault?: Fault }> {
  const f = faultFor(mission, attempt);
  await sleep(f === "ok" ? 2 : 5); // simulated latency
  return f === "ok" ? { ok: true } : { ok: false, fault: f };
}

async function main(): Promise<void> {
  fs.mkdirSync(DIR, { recursive: true });

  // Torn-tail repair (same discipline as r2-appender.ts).
  try {
    const raw = fs.readFileSync(RESULTS);
    const lastNl = raw.lastIndexOf(0x0a);
    if (raw.length > 0 && lastNl !== raw.length - 1) {
      const tmp = `${RESULTS}.repair.${process.pid}.tmp`;
      fs.writeFileSync(tmp, raw.subarray(0, lastNl + 1));
      fs.renameSync(tmp, RESULTS);
    }
  } catch (e: any) {
    if (e?.code !== "ENOENT") throw e;
  }

  // Resume: skip already-recorded mission ids.
  const done = new Set<number>();
  try {
    for (const line of fs.readFileSync(RESULTS, "utf8").split("\n")) {
      if (!line.trim()) continue;
      done.add(JSON.parse(line).mission);
    }
  } catch (e: any) {
    if (e?.code !== "ENOENT") throw e;
  }

  let processed = 0;
  let failed = 0;
  for (let m = FROM; m <= TO; m++) {
    if (done.has(m)) continue;
    let outcome: "GENERATED" | "FAILED" = "FAILED";
    let attempts = 0;
    let errorType: string | null = null;
    for (let a = 1; a <= MAX_ATTEMPTS; a++) {
      attempts = a;
      const r = await upstream(m, a);
      if (r.ok) { outcome = "GENERATED"; errorType = null; break; }
      errorType = `upstream:${r.fault}`;
      if (a < MAX_ATTEMPTS) await sleep(RETRY_AFTER_MS[r.fault!] ?? 20);
    }
    if (outcome === "FAILED") failed++;
    const rec = {
      mission: m, outcome, attempts, error_type: errorType,
      synthetic: true, testing_only: true,
    };
    const fd = fs.openSync(RESULTS, "a");
    fs.writeSync(fd, JSON.stringify(rec) + "\n");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    processed++;
    if (DIE_AFTER > 0 && m === DIE_AFTER) process.kill(process.pid, "SIGKILL");
  }
  console.log(JSON.stringify({ status: "done", processed, failed, skipped: done.size }));
}

main().catch((e) => { console.error("FLAKY_FATAL", e?.message ?? e); process.exit(1); });
