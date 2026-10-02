/**
 * r2-appender.ts: crash-safe JSONL result appender (LANE-CHAOS R2, probes P2/P5).
 *
 * Contract under test (the guarantee the factory's mission appenders must hold):
 *   1. One record = one write() call + fsync. A record is either fully
 *      committed (ends with "\n") or it is not committed at all.
 *   2. Startup always repairs the tail: any bytes after the last "\n" are a
 *      torn record from a kill -9 landing mid-write. They are truncated
 *      (atomically, tmp+rename) and counted as repaired.
 *   3. Resume continues from max committed seq + 1. No record is lost, none is
 *      duplicated: the final file holds seqs exactly once.
 *   4. A checkpoint sidecar records the last seq the worker BELIEVED committed.
 *      On resume, checkpoint vs file-tail mismatch is a detected gap: it is
 *      written to the gaps log explicitly, never silently absorbed.
 *   5. Any write failure (e.g. target dir dropped mid-run) is a typed,
 *      non-zero exit, never a silent success.
 *
 * Usage:
 *   node r2-appender.ts --results <results.jsonl> --from <n> --to <n>
 *     [--die-at <n>] [--die-mode partial|instant] [--attempt <n>] [--shard <s>]
 *
 * Exit codes: 0 done; 3 typed write failure; 137 killed (expected in chaos).
 */
import * as fs from "node:fs";
import * as path from "node:path";

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  console.error(JSON.stringify({ error: "missing_arg", arg: name }));
  process.exit(2);
}

const RESULTS = arg("--results");
const FROM = parseInt(arg("--from", "1"), 10);
const TO = parseInt(arg("--to"), 10);
const DIE_AT = parseInt(arg("--die-at", "0"), 10);
const DIE_MODE = arg("--die-mode", "partial");
const ATTEMPT = parseInt(arg("--attempt", "1"), 10);
const SHARD = arg("--shard", "shard-r2");
const DIR = path.dirname(RESULTS);
const CHECKPOINT = RESULTS + ".checkpoint.json";
const GAPS = RESULTS + ".gaps.jsonl";

const typedFail = (error: string, detail: string): never => {
  console.error(JSON.stringify({ error, detail, results: RESULTS }));
  process.exit(3);
};

/* Startup: the runner owns the results dir (mirrors queue-runner mkdir). */
try {
  fs.mkdirSync(DIR, { recursive: true });
} catch (e: any) {
  typedFail("mkdir_failed", String(e?.message ?? e));
}

/* Repair: truncate any torn tail (bytes after the last newline). Atomic. */
let repairedBytes = 0;
function repairTail(): void {
  let raw: Buffer;
  try {
    raw = fs.readFileSync(RESULTS);
  } catch (e: any) {
    if (e?.code === "ENOENT") return; // fresh file: nothing to repair
    typedFail("read_failed", String(e?.message ?? e));
    throw e;
  }
  if (raw.length === 0) return;
  const lastNl = raw.lastIndexOf(0x0a);
  if (lastNl === raw.length - 1) return; // clean tail
  const torn = raw.length - (lastNl + 1);
  const tmp = RESULTS + `.repair.${process.pid}.tmp`;
  fs.writeFileSync(tmp, raw.subarray(0, lastNl + 1));
  fs.renameSync(tmp, RESULTS);
  repairedBytes = torn;
}
repairTail();

/* Scan committed records for max seq. Every line must parse: else the file
   was corrupted beyond a torn tail, which is a typed failure, not silent. */
let maxSeq = 0;
let committed = 0;
try {
  const text = fs.readFileSync(RESULTS, "utf8");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let rec: any;
    try {
      rec = JSON.parse(line);
    } catch {
      typedFail("corrupt_line", "non-JSON line survived repair; refusing to continue");
      throw new Error("unreachable");
    }
    committed++;
    if (typeof rec.seq === "number" && rec.seq > maxSeq) maxSeq = rec.seq;
  }
} catch (e: any) {
  if (e?.code !== "ENOENT") throw e;
}

/* Checkpoint vs reality: detect a dropped-target gap explicitly. */
let gap: any = null;
try {
  if (fs.existsSync(CHECKPOINT)) {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT, "utf8"));
    if (typeof cp.last_seq === "number" && cp.last_seq > maxSeq) {
      gap = {
        type: "GAP_DETECTED",
        checkpoint_last_seq: cp.last_seq,
        file_max_seq: maxSeq,
        lost_records: cp.last_seq - maxSeq,
        at: new Date().toISOString(),
      };
      fs.appendFileSync(GAPS, JSON.stringify(gap) + "\n");
    }
  }
} catch (e: any) {
  typedFail("checkpoint_failed", String(e?.message ?? e));
}

const startSeq = Math.max(FROM, maxSeq + 1);

/* One durable commit per record: open("a") + write + fsync + close.
   Opening by path on every record means a dropped target directory surfaces
   as ENOENT on the next record (typed failure), never as silent writes to an
   orphaned inode. */
const appendRecord = (line: string): void => {
  let fd: number;
  try {
    fd = fs.openSync(RESULTS, "a");
  } catch (e: any) {
    typedFail(e?.code === "ENOENT" ? "target_gone" : "open_failed", String(e?.message ?? e));
    throw e;
  }
  try {
    fs.writeSync(fd, line); // one write() per record
    fs.fsyncSync(fd);
  } catch (e: any) {
    try { fs.closeSync(fd); } catch { /* ignore */ }
    typedFail(e?.code === "ENOENT" ? "target_gone" : "write_failed", String(e?.message ?? e));
    throw e;
  }
  fs.closeSync(fd);
};

const writeCheckpoint = (seq: number): void => {
  const tmp = CHECKPOINT + `.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ last_seq: seq, attempt: ATTEMPT, at: new Date().toISOString() }) + "\n");
  fs.renameSync(tmp, CHECKPOINT);
};

let appended = 0;
for (let seq = startSeq; seq <= TO; seq++) {
  const rec = {
    seq,
    shard: SHARD,
    mission: seq,
    outcome: "GENERATED",
    attempt: ATTEMPT,
    synthetic: true,
    testing_only: true,
    payload: "x".repeat(64),
  };
  const line = JSON.stringify(rec) + "\n";

  /* Chaos injection: die exactly at the chosen record. */
  if (DIE_AT > 0 && seq === DIE_AT) {
    if (DIE_MODE === "partial") {
      const half = Buffer.from(line).subarray(0, Math.floor(line.length / 2));
      const fd = fs.openSync(RESULTS, "a");
      fs.writeSync(fd, half); // torn write: no trailing newline, then SIGKILL
      fs.fsyncSync(fd);
      fs.closeSync(fd);
    }
    process.kill(process.pid, "SIGKILL");
  }

  appendRecord(line);
  try {
    writeCheckpoint(seq);
  } catch (e: any) {
    typedFail("checkpoint_failed", String(e?.message ?? e));
    throw e;
  }
  appended++;
}

console.log(JSON.stringify({
  status: "done",
  repaired_bytes: repairedBytes,
  committed_before: committed,
  resumed_from: startSeq,
  appended,
  gap_detected: gap !== null,
}));
