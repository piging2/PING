# Lane J prototype: run-record writer / verifier / query surface

Zero-dependency Node (>=18). Synthetic data only; no credentials, no
network, no PING repo writes.

## Files

- `run-ledger.mjs` — writer. `beginRun(dir, meta)` returns a builder
  (`attempt/change/rejection/conflict/error/stream/...`), `finish(opts)`
  appends one canonical-JSON line to `runs.jsonl`. Fail-soft: a write
  failure goes to `ledger-write-failures.jsonl` + stderr and never throws
  into the run. `collapseHeartbeats(records)` is the pure rollup function.
  `PING_RUNS_DIR` overrides the ledger dir.
- `verify.mjs` — `verifyRunRecord(record)`: digest check, checkpoint
  contiguity recomputed from `fetch_attempts` (BCQ rule), clock-skew flags,
  required-field / closed-set taxonomy validation, EXECUTION_UNPROVEN
  forgery check. Verdicts:
  OK | CHECKPOINT_INCONSISTENT | DIGEST_MISMATCH | EXECUTION_UNPROVEN | INVALID.
  Clock skew is a flag, never a rejection.
- `taxonomy.mjs` — lane-K v1.0.0 closed set (import, not redefinition).
- `runq.mjs` — the five queries: `runs`, `changes`, `whyRejected`, `cost`,
  `whyChanged`, plus `ledgerGaps`.
- `taxonomy.mjs` — lane-K FAILURE-TAXONOMY v1.0.0 closed-set import (13
  classes, one swap point). Writer enforces the set at build time (loud);
  verifier re-checks at read time (flagged INVALID on drift).
- `replay-pass79.mjs` — REAL historical replay: Facebook Pass 79
  (fb-job-20260920-1426, FL-20260920-015), full RunRecord, three WHY answers
  from the record alone (quarantine change / TIMEOUT failure / 0 AI tokens),
  plus a forged-SUCCESS twin flagged EXECUTION_UNPROVEN.
- `cardinality.mjs` — 5,020-run scale test: writer O(1)/run after cache fix
  (a re-read-per-write was quadratic; fixed with a process-local seq cache
  + documented single-writer caveat), heartbeat collapse bounds the hot set,
  queries stay fast.
- `secrets-redteam.mjs` — fake-token injection; 4 redactions, 0 leaks,
  `credref:` handle survives, digest binds the redacted record.

## Demo scenario

1. Run 1: website poll changes Happy Place Carpentry hours
   (Mon-Fri 8am-5pm -> Mon-Fri 7am-6pm, Sat 8am-12pm), one SCHEMA_CHANGED
   rejection (quarantined). Verdict: OK.
2. Run 2 (red team): writer lies, claims checkpoint `d303` while attempt 3
   FAILED. Verdict: CHECKPOINT_INCONSISTENT (recomputed `d202`).
3. Run 3 (red team): `finished_at` before `started_at`. Verdict: OK with
   `clock_skew:finished_before_started` flag.
4. Run 4 (red team): write dropped via `PING_LEDGER_DROP_WRITE`; sidecar +
   stderr emitted, run itself unaffected.
5. Run 5: scheduler-issued seq 5 sees ledger max seq 3 ->
   `prior_ledger_gap: true`, `missing_seqs: [4]`. `ledgerGaps()` agrees.
6. Runs 6-8: heartbeats collapsed by `collapseHeartbeats()`; runs 1-2 keep
   full records (changes / errors present).

Expected demo tail: 7 records, 0 corrupt; verdicts
OK / CHECKPOINT_INCONSISTENT / OK+skew-flag / OK / OK / OK / OK;
`whyChanged("biz_happy_place","hours")` returns run 1 with the
before/after and the lane-N / lane-O handoff pointers.

## Replay scenario (`replay-pass79.mjs`)

Real historical run: Facebook Pass 79, FL-20260920-015. The record answers
from its own fields:
- why did the quarantine set change? -> `whyChanged("fb_intent_ledger",
  "quarantined_intents")` returns run 1 (OUTCOME_UNKNOWN) with before/after
  and evidence refs to the outreach log + FAILURE_LEDGER.
- why did pass 79 fail? -> `errors[0]`: TIMEOUT, side_effect_unknown,
  terminal, dead-lettered (quarantine).
- why did it cost 0 AI tokens? -> `cost(...)`: input/output 0, usd 0,
  purpose "none — deterministic browser automation, no LLM in the loop".
A forged twin (same shape, status SUCCEEDED) gets EXECUTION_UNPROVEN.

## Scale scenario (`cardinality.mjs`)

5,000 heartbeat runs + 20 eventful: collapse bounds the hot set to the 20
full records + hourly rollup lines; `whyChanged` and `cost` stay fast;
writer is O(1)/run (process-local seq cache, single-writer scheduler;
multi-writer needs an atomic sequence issuer).

## Secrets scenario (`secrets-redteam.mjs`)

Fake-token injection into error/rejection/attempt free text: redacted before
digest+serialize, 0 leaks, `credref:` handle survives.
