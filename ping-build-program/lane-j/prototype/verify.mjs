/**
 * Lane J prototype: self-verification of run records. Pure functions.
 *
 * A record is SELF-VERIFYING when its coarse claims (checkpoint_out,
 * timestamps) can be re-derived from its fine-grained evidence
 * (fetch_attempts). A writer that lies about its checkpoint is caught by
 * its own attempt list.
 */

import { digestRecord } from "./run-ledger.mjs";
import { CLASSES, isTaxonomyCode } from "./taxonomy.mjs";

const REQUIRED_TOP = [
  "schema", "run_id", "seq", "connector_id", "tenant_id", "trigger",
  "started_at", "finished_at", "duration_ms", "status",
  "checkpoint_in", "checkpoint_out", "observations", "fetch_attempts",
  "run_digest",
];

const VALID_STATUS = new Set(["SUCCEEDED", "PARTIAL", "FAILED", "OUTCOME_UNKNOWN", "ABORTED"]);
const VALID_TERMINAL = new Set(["NOT_STARTED", "STARTED", "SUCCEEDED", "FAILED", "OUTCOME_UNKNOWN"]);

/**
 * Recompute the highest CONTIGUOUS success watermark from attempts alone
 * (BCQ contiguity rule). Attempts ordered by seq. A non-SUCCEEDED attempt,
 * or a SUCCEEDED attempt with no watermark, stops advancement.
 */
export function recomputeCheckpoint(record) {
  const attempts = [...(record.fetch_attempts || [])].sort((a, b) => (a.seq || 0) - (b.seq || 0));
  let cp = record.checkpoint_in;
  for (const a of attempts) {
    if (a.terminal_state !== "SUCCEEDED") break;
    if (!a.watermark_seen) break; // cannot prove advancement past this point
    cp = a.watermark_seen;
  }
  return cp;
}

export function detectClockSkew(record) {
  const flags = [];
  const start = Date.parse(record.started_at);
  const finish = Date.parse(record.finished_at);
  if (Number.isNaN(start) || Number.isNaN(finish)) {
    flags.push("unparseable_timestamps");
    return flags;
  }
  if (finish < start) flags.push("finished_before_started");
  const wallDelta = finish - start;
  const d = record.duration_ms;
  if (typeof d === "number" && d >= 0 && wallDelta > 0) {
    if (d > wallDelta * 2 + 1000 || wallDelta > d * 2 + 1000) {
      flags.push("duration_disagrees_with_wall_clock");
    }
  }
  if (typeof d === "number" && d < 0) flags.push("negative_duration");
  for (const a of record.fetch_attempts || []) {
    if (!a.at) continue;
    const t = Date.parse(a.at);
    if (Number.isNaN(t)) continue;
    if (t < start - 60000 || t > finish + 60000) {
      flags.push(`attempt_${a.fetch_attempt_id || a.seq}_outside_run_window`);
      break;
    }
  }
  return flags;
}

/**
 * Verify one record. Returns { verdict, issues[] }.
 * Verdicts: OK | CHECKPOINT_INCONSISTENT | DIGEST_MISMATCH | INVALID
 * Clock skew is a flag (issues), never a rejection: the record stays queryable.
 */
export function verifyRunRecord(record) {
  const issues = [];

  for (const f of REQUIRED_TOP) {
    if (record[f] === undefined || record[f] === null) issues.push(`missing_field:${f}`);
  }
  if (!VALID_STATUS.has(record.status)) issues.push(`bad_status:${record.status}`);
  for (const a of record.fetch_attempts || []) {
    if (!VALID_TERMINAL.has(a.terminal_state)) issues.push(`bad_terminal_state:${a.fetch_attempt_id}`);
    if ((a.terminal_state === "FAILED" || a.terminal_state === "OUTCOME_UNKNOWN") && !a.taxonomy_code) {
      issues.push(`missing_taxonomy_code:${a.fetch_attempt_id}`);
    }
    // Closed-set re-check at read time: a record written by an older or
    // foreign writer must not smuggle a non-canonical class into queries.
    if (a.taxonomy_code && !isTaxonomyCode(a.taxonomy_code)) {
      issues.push(`taxonomy_drift:${a.fetch_attempt_id}:${a.taxonomy_code}`);
    }
  }
  for (const r of record.rejections || []) {
    if (!r.code) issues.push(`rejection_missing_code:${r.observation_id}`);
    else if (!isTaxonomyCode(r.code)) issues.push(`taxonomy_drift:rejection:${r.code}`);
  }
  for (const e of record.errors || []) {
    if (!e.code) issues.push(`error_missing_code`);
    else if (!isTaxonomyCode(e.code)) issues.push(`taxonomy_drift:error:${e.code}`);
  }

  const digestOk = digestRecord(record) === record.run_digest;
  if (!digestOk) issues.push("digest_mismatch");

  const recomputed = recomputeCheckpoint(record);
  const cpOk = recomputed === record.checkpoint_out;
  if (!cpOk) {
    issues.push(`checkpoint_inconsistent:recorded=${record.checkpoint_out} recomputed=${recomputed}`);
  }

  const skew = detectClockSkew(record);
  const skewDetected = skew.length > 0;
  for (const s of skew) issues.push(`clock_skew:${s}`);

  // FORGERY CHECK: a run that claims SUCCEEDED/PARTIAL while emitting
  // changes with zero SUCCEEDED attempts is claiming an outcome it has no
  // evidence for. The verifier answers "unproven", not "false": proving a
  // negative is out of scope, but claiming success on zero evidence is
  // a forged record shape. (Detecting a writer that fabricates BOTH the
  // attempts and the outcome consistently is writer-integrity territory —
  // lane L / code review — recorded as an explicit boundary.)
  const succeededAttempts = (record.fetch_attempts || []).filter(
    (a) => a.terminal_state === "SUCCEEDED"
  ).length;
  const emitted = (record.changes || []).length + (record.observations?.emitted ?? 0);
  const executionUnproven =
    (record.status === "SUCCEEDED" || record.status === "PARTIAL") &&
    succeededAttempts === 0 &&
    emitted > 0;
  if (executionUnproven) {
    issues.push(
      `execution_unproven:status=${record.status} succeeded_attempts=0 emitted=${emitted}`
    );
  }

  let verdict = "OK";
  if (!digestOk) verdict = "DIGEST_MISMATCH";
  else if (!cpOk) verdict = "CHECKPOINT_INCONSISTENT";
  else if (executionUnproven) verdict = "EXECUTION_UNPROVEN";
  else if (
    issues.some((i) => i.startsWith("missing_field:") || i.startsWith("bad_") || i.startsWith("taxonomy_drift:"))
  ) verdict = "INVALID";

  return { verdict, issues, skewDetected, recomputedCheckpoint: recomputed };
}

export function verifyLedger(records) {
  return records.map((r) => ({ run_id: r.run_id, ...verifyRunRecord(r) }));
}
