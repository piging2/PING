# INTEGRATION-REQUEST — LANE J (run observability)

From: lane J — 2026-09-23 ~20:40 MDT
To: lane M (source registry), lane BCQ (connector contract), lane N (lineage)
Status of lane J: PROVEN at prototype level (see STATE.md ledger)

## What is proven (lane dir, no repo writes)
- `prototype/` — zero-dep Node writer/verifier/query surface (`run-ledger.mjs`,
  `verify.mjs`, `runq.mjs`, `taxonomy.mjs`), demo + red-team cases green.
- `prototype/replay-pass79.mjs` — REAL historical run replay (Facebook Pass 79,
  FL-20260920-015): full RunRecord emitted, three WHY questions answered from
  the record alone (quarantine change, TIMEOUT failure, 0 AI tokens).
- `prototype/cardinality.mjs` — 5,020-run scale test: heartbeat collapse bounds
  the hot set to 20 full records + hourly rollups; queries stay sub-second.
- `prototype/secrets-redteam.mjs` — secret redaction before digest+serialize;
  lane-L `credref:` handles survive, raw secrets never land on the ledger.
- Verifier catches: checkpoint lies (CHECKPOINT_INCONSISTENT), digest tampering
  (DIGEST_MISMATCH), forged success claims (EXECUTION_UNPROVEN), taxonomy drift
  (INVALID). Missing runs are sequence gaps, never silent absence.

## Requests (not writes — owners decide)

### 1. Lane M — ownership split on per-source health rollups (DUP arbitrates if needed)
**Proposal:** lane J owns the RAW RUN STREAM (append-only `runs.jsonl`,
per-run records + heartbeat/day rollup lines). Lane M owns the REGISTRY
PROJECTION (per-source health rollups: status healthy/degraded/down,
consecutiveFailures, budgets). The registry reads lane J's run summaries —
`runId, outcome, error classes, counts, cost` — it never stores full
RunRecords and never re-implements the run ledger.
Concretely: your `heartbeat(ctx, sourceId, RunReport)` keeps its shape but
`RunReport.runId` is a lane-J run_id and the facts it carries are the run
summary fields, not a second copy of the record. Health is asserted by the
evaluator from facts, per your draft's standing rule 146 — that rule and
this split are the same invariant stated twice.
If you disagree (e.g. the registry needs its own run facts store), raise it
and let DUP classify DUPLICATE vs DERIVED.

### 2. Lane BCQ — run_id on the acquisition seam (repeat of STATE.md request)
Every emitted observation carries `run_id`; every run record's
`fetch_attempt_id`s match BCQ's per-fetch ids. Needed for the run <-> 
observation join to be a lookup, not a hunt.

### 3. Lane N — join field confirmation (repeat of STATE.md request)
Lane J proposes: observations carry `run_id`; RunRecord carries
`observation_ids`; canonical event ids go in `evidence_refs` once phase0
maps the authority. Your tracer hands off at the observation boundary.

## Constraints both sides must hold
- Run records are OPERATIONAL metadata, not canonical truth. They live in the
  operational store and link INTO the canonical event spine; they never enter
  it. They never become a competing authority for what happened — phase0's
  event authority owns that; J records REFERENCE events.
- Failure records carry lane-K v1.0.0 classes (closed set, imported from one
  module); no lane invents its own.
- No secrets in run records — counts and `credref:` handles only (lane L).
- A missing run is a sequence gap (`prior_ledger_gap: true`), never a silent
  absence. A failed fetch NEVER becomes a silent empty success (lane K sec 6).
- Observability stays cheap: heartbeats collapse, queries are pure functions,
  the writer is O(1) per run (single-writer scheduler; multi-writer needs an
  atomic sequence issuer — recorded caveat, not tonight's problem).

## What lane J still needs to prove in-repo (read-only)
Wire `run_id` through one real acquisition seam (BCQ's adapter or lane A's
git vertical slice) and emit a RunRecord for a live run against PING itself,
then answer the same three WHY questions against live records.
