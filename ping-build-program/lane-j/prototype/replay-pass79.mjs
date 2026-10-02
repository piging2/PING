/**
 * Lane J PROOF 2: replay of a REAL historical run — Facebook Pass 79
 * (fb-job-20260920-1426), reconciled 2026-09-20 ~17:38 MDT as
 * fb-20260920-203648, CLASS: TEMPORARY_FAILURE, FL-20260920-015.
 *
 * Facts below are evidence-cited from:
 *   - ~/workspace/outreach/facebook-engagement.md ("Pass 79 dispatch" /
 *     "Pass 79 completion: fb-20260920-203648" sections)
 *   - ~/workspace/outreach/FAILURE_LEDGER.md (FL-20260920-015)
 *   - lane-K FAILURE-TAXONOMY.md Appendix C.1 (classified as TIMEOUT with
 *     side_effect_unknown: true — this replay adopts that classification)
 *
 * This is a post-hoc reconstruction into the RunRecord schema: it answers
 * three WHY questions from the record alone:
 *   1. WHY DID THE QUARANTINE SET CHANGE? (operational state change)
 *   2. WHY DID PASS 79 FAIL? (lane-K classified error)
 *   3. WHY DID PASS 79 COST 0 AI TOKENS? (cost evidence)
 *
 * Run: node replay-pass79.mjs  (from this directory)
 */

import { rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beginRun, readRuns, SCHEMA, digestRecord } from "./run-ledger.mjs";
import { verifyRunRecord } from "./verify.mjs";
import { changes, cost, whyChanged, runs } from "./runq.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "data", "pass79-replay");
rmSync(DIR, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// Evidence-sourced facts (verbatim numbers from the log sections)
// ---------------------------------------------------------------------------
// - Dispatch 14:26 MDT 2026-09-20 (2026-09-20T20:26Z), job fb-job-20260920-1426
// - Drafted: 70 actions (68 likes + 2 comments) from a 323-post / 16-group sweep
// - Guard filter at 2026-09-20T20:36:34Z: checked=70, eligible=60, blocked=10
// - Reconciled 17:38 MDT (2026-09-20T23:38Z) as fb-20260920-203648:
//   job-20260920-203648.json unprocessed in Pig inbox, no .result.json,
//   no worker process -> 60 intents (58 likes + 2 comments) UNKNOWN_EXECUTION
// - Probable cause: the ~16:00 MDT commute blackout (host sleep killed the worker)
// - Deliberate decision: intents NOT reconciled (EXECUTED and NOT_ATTEMPTED
//   both unprovable); quarantined by the intent-ledger refuse filter so no
//   future pass double-acts on the same (account, action, url) candidates
// - 71 prior-pass intents reconciled first (pass 78): 12/71 ok, 59 infra failures
// - Pass 80 observed the refuse filter working: 10 candidates refused as
//   UNKNOWN_EXECUTION against pass-79 intents

const b = beginRun(DIR, {
  connector_id: "facebook-engagement", // lane-M format <provider>-<surface>
  connector_version: "run_pass.sh@20260920",
  tenant_id: "t_ping_social",
  principal: "engagement-scheduler",
  trigger: "routine-poll",
  // seq: this replay ledger's own sequence (1). The historical pass number
  // is 79; a replay ledger claiming seq 79 against an empty ledger would
  // manufacture a phantom ledger gap. Evidence, not renumbering.
  seq: 1,
  started_at: "2026-09-20T20:26:00Z",
  checkpoint_in: "fb-20260920-173454:complete",
  host: "pig-wsl",
});

b.observeCounts({
  discovered: 70, // drafted from the 323-post / 16-group sweep
  emitted: 60, // guard-eligible, dispatched into the Pig inbox job
  accepted: 0, // zero observations exist; EXECUTED/NOT_ATTEMPTED both unprovable
  rejected: 10, // guard-blocked pre-dispatch (8 SKIPPED_REENGAGEMENT, 2 ambiguous-identity)
  unchanged: 0,
  changed: 1, // one operational-state change: the quarantine set grew by 60
});

// The 60 dispatched intents as per-attempt evidence. None succeeded; the
// run-level truth is UNKNOWN, so every attempt carries terminal state
// OUTCOME_UNKNOWN with the lane-K class that describes this shape.
const likeUrls = [
  // 58 like targets; source log records the discovery sweep, not every URL.
  // The record is honest about its granularity: per-intent intent ids from
  // the dispatch manifest; full URLs live in the manifest, referenced here.
  ...Array.from({ length: 58 }, (_, i) => `manifest:facebook-pass-20260920-203648.json#like:${i + 1}`),
  ...["manifest:facebook-pass-20260920-203648.json#comment:clogzilla", "manifest:facebook-pass-20260920-203648.json#comment:profinish"],
];
let seqN = 0;
for (const ref of likeUrls) {
  seqN++;
  b.attempt({
    fetch_attempt_id: `fa-fb79-${String(seqN).padStart(3, "0")}`,
    seq: seqN,
    url: ref,
    terminal_state: "OUTCOME_UNKNOWN",
    taxonomy_code: "TIMEOUT",
    http_status: null,
    bytes: 0,
    duration_ms: null,
    retries: 0,
    watermark_seen: null, // checkpoint cannot advance past unproven attempts
    rate_limited: false,
    note: "dispatched to Pig inbox job-20260920-203648.json; no .result.json; side_effect_unknown",
  });
}

// The run's one recorded change: the operational quarantine set changed.
// This is the state change the ledger must be able to explain later.
b.change({
  observation_id: "obs-fb-pass79-quarantine",
  claim_id: "fb-pass79-quarantine-ledger",
  entity_id: "fb_intent_ledger",
  field: "quarantined_intents",
  kind: "added",
  before: "0 pass-79 intents protected",
  after: "60 pass-79 intents (58 likes + 2 comments) protected by refuse filter; ledger marks UNKNOWN_EXECUTION (FL-20260920-015)",
  before_event_id: null,
  after_event_id: null,
  confidence: "DIRECT",
});

// The failure, classified per lane-K v1.0.0 Appendix C.1.
b.error({
  code: "TIMEOUT",
  message:
    "Pass 79 worker never reported: job-20260920-203648.json unprocessed in Pig inbox, no .result.json, no worker process. " +
    "Probable cause: ~16:00 MDT commute blackout (host sleep). Actions are non-idempotent; execution state unknowable from evidence.",
  recoverable: false,
  attempt_ref: null,
  side_effect_unknown: true,
  evidence_refs: [
    "workspace/outreach/facebook-engagement.md#pass-79-completion",
    "workspace/outreach/FAILURE_LEDGER.md#FL-20260920-015",
  ],
  credential_handle: null,
  terminal: true,
  dead_lettered: true, // quarantine = dead-letter for engagement intents
});

// Engagement is deterministic browser automation: zero AI tokens in the loop.
b.aiTokens({ input: 0, output: 0, model: null, purpose: "none — deterministic browser automation, no LLM in the loop" });
b.costUsd(0, "60 dispatched intents, 0 observed completions; no provider billing in engagement loop");
b.rateLimits({ provider_calls: 0, quota_units: 0, limited: false, retry_after_hits: 0, budget_remaining_pct: null });
b.stream({ stream_id: "likes", mode: "poll", records_read: 58, records_emitted: 58, checkpoint_out: null });
b.stream({ stream_id: "comments", mode: "poll", records_read: 2, records_emitted: 2, checkpoint_out: null });

const res = b.finish({
  status: "OUTCOME_UNKNOWN", // honest: dispatch observed, execution unprovable
  finished_at: "2026-09-20T23:38:00Z",
  duration_ms: 11_220_000, // 3h12m wall; monotonic measurement from the dispatch/reconcile log
  checkpoint_out: "fb-20260920-173454:complete", // did NOT advance: no contiguous success
});
if (!res.ok) {
  console.error("REPLAY FAILED TO WRITE:", res.error);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// FORGERY RED-TEAM (same run shape, claimed SUCCESS with no evidence)
// ---------------------------------------------------------------------------
const DIRF = join(dirname(fileURLToPath(import.meta.url)), "data", "pass79-forgery");
rmSync(DIRF, { recursive: true, force: true });
const fb = beginRun(DIRF, {
  connector_id: "facebook-engagement",
  tenant_id: "t_ping_social",
  seq: 1,
  started_at: "2026-09-20T20:26:00Z",
  checkpoint_in: "fb-20260920-173454:complete", // forger is checkpoint-honest, outcome-dishonest
});
fb.attempt({
  fetch_attempt_id: "fa-fb79-forged-001",
  seq: 1,
  url: "pig://inbox/job-20260920-203648.json",
  terminal_state: "OUTCOME_UNKNOWN",
  taxonomy_code: "TIMEOUT",
});
fb.observeCounts({ discovered: 60, emitted: 60, accepted: 0, rejected: 0, unchanged: 0, changed: 1 });
fb.change({
  observation_id: "obs-forged",
  claim_id: "forged-claim",
  entity_id: "fb_engagement_outcomes",
  field: "likes_landed",
  kind: "added",
  before: "0",
  after: "58 likes claimed executed (no evidence)",
  confidence: "DIRECT",
});
const forged = fb.finish({
  status: "SUCCEEDED", // the lie: claimed success on zero successful attempts
  finished_at: "2026-09-20T23:38:00Z",
  duration_ms: 11_220_000,
  checkpoint_out: "fb-20260920-173454:complete", // checkpoint consistent: the lie is outcome-only
});
const forgedRecord = forged.record;

// ---------------------------------------------------------------------------
// THE THREE WHY QUESTIONS — answered from the record alone
// ---------------------------------------------------------------------------
const { records, corrupt } = readRuns(DIR);

console.log("=== PASS 79 REPLAY ===");
console.log(`schema: ${SCHEMA}; taxonomy: lane-K v1.0.0`);
console.log(`records=${records.length} corrupt=${corrupt.length}`);
console.log(`verdict: ${JSON.stringify(verifyRunRecord(records[0]).verdict)}`);
console.log(`digest binds record: ${digestRecord(records[0]) === records[0].run_digest}`);

console.log("\nQ1 — WHY DID THE QUARANTINE SET CHANGE?");
console.log(JSON.stringify(whyChanged(records, "fb_intent_ledger", "quarantined_intents"), null, 2));

console.log("\nQ2 — WHY DID PASS 79 FAIL?");
console.log(
  JSON.stringify(
    records[0].errors.map((e) => ({
      code: e.code,
      side_effect_unknown: e.side_effect_unknown,
      terminal: e.terminal,
      dead_lettered: e.dead_lettered,
      evidence_refs: e.evidence_refs,
      message: e.message,
    })),
    null,
    2
  )
);

console.log("\nQ3 — WHY DID PASS 79 COST 0 AI TOKENS?");
console.log(JSON.stringify(cost(records, { connector_id: "facebook-engagement", group_by: "connector" }), null, 2));
console.log("runs summary:", JSON.stringify(runs(records)[0], null, 2));

console.log("\n=== FORGERY RED-TEAM ===");
console.log(`forged record verdict: ${verifyRunRecord(forgedRecord).verdict}`);
console.log(`issues: ${JSON.stringify(verifyRunRecord(forgedRecord).issues, null, 2)}`);
console.log(
  "interpretation: the claim of SUCCEEDED with 60 emitted changes and 0 SUCCEEDED attempts is " +
    "verdict EXECUTION_UNPROVEN — the ledger will not render it as a success, and it cannot be " +
    "repaired by editing the record (run_digest would break)."
);
