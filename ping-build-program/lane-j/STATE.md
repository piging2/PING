# LANE J — Observability (cross-cutting) — STATE

## Status: PROVEN at prototype level (2026-09-23 ~20:55 MDT pass)

Lane: cross-cutting — J. Every connector/ingestion run records a RunRecord so
we can answer WHY DID FYD CHANGE without reading logs manually.

## Ledger
- RESEARCHED: PING repo @ e48ef710 (read-only, Pig WSL). Findings:
  - `src/fyd/refresh/run-t2.ts` prints a JSON report to stdout but persists
    NO run record. Snapshots persist; the run itself is not a durable object.
    GAP confirmed: this is what lane J fills.
  - `src/fyd/identity/audit.ts` is the house JSONL-append pattern: env-dir,
    fail-soft writes, sink hook, no secrets in the log, redact helper.
    Lane J REUSES this pattern, does not invent a new storage mechanism.
  - `src/fyd/lineage/tracer.ts` (lane N scope) walks SOURCE BYTES -> OBSERVATION
    -> EVIDENCE -> OBJECT FIELD -> SITESPEC -> RENDERED CLAIM -> ASK FYD.
    Lane J LINKS INTO it via observationId/evidenceRef, never duplicates it.
  - `src/lib/metrics.ts` is dashboard constitutional metrics, not run records.
    No overlap.
  - `src/fyd/acquisition/acquisition-adapter.ts` (L0-L3 contract) has NO
    run_id/fetch_attempt_id fields yet. Integration request needed: add
    run_id to AcquisitionRequest or attach at the run harness seam.
- RESEARCHED: lane-bcq STATE.md + connector-contract.md (v1.0 draft).
  Load-bearing for lane J: terminal fetch states
  (NOT_STARTED/STARTED/SUCCEEDED/FAILED/OUTCOME_UNKNOWN), checkpoint =
  highest CONTIGUOUS success watermark, opaque provider watermarks, typed
  FULL_RESYNC, idempotency keys, failure taxonomy list, per-fetch
  `fetch_attempt_id`, cost/rate governor, provenance envelope. Lane J
  consumes these IDs; it does not redefine them.
- RESEARCHED: ecosystem. OpenTelemetry (spans/metrics) evaluated and REJECTED
  for the run ledger: weight dwarfs value; OTel answers "how slow" not
  "why did the site change", and it cannot join run -> observation ->
  lineage. House JSONL-append ledger wins. Kill recorded.
- RESEARCHED: git history (`git log --all --oneline -i --grep=run`) shows no
  prior run-record work in PING. Greenfield, but shaped by existing patterns.
- DEPENDENCIES: lane K STATE.md empty (no taxonomy draft published). Lane J
  designs against the BCQ/charter taxonomy list and imports it from one
  module for a one-line swap. Lane K v1.0.0 PUBLISHED 2026-09-23: prototype/taxonomy.mjs imports the closed set; writer throws on drift (loud), verifier flags taxonomy_drift (read-time). Phase0 in progress
  (canonical event authority not yet mapped): default holds, run records go
  to the OPERATIONAL store with links INTO canonical events, not the spine.
- IMPLEMENTED: prototype writer/reader/verifier in `prototype/` (zero-dep
  Node, synthetic runs + red-team cases).
- TESTED: `node demo.mjs` green. 7 synthetic runs: worked-example hours
  change (verdict OK), lying-checkpoint run (verdict CHECKPOINT_INCONSISTENT,
  recomputed d202 vs claimed d303), clock-skew run (OK + skew flag),
  dropped write (sidecar + stderr, run unaffected), next run flags
  prior_ledger_gap with missing_seqs [4], heartbeats collapse to rollups.
  All five queries return the expected answers; `whyChanged` resolves the
  hours change run -> observation -> lane-N/lane-O handoff.
- FIXED: canonicalJson serialized `undefined` as the literal string
  "undefined", corrupting ledger lines for attempts without an `at` field.
  Now follows JSON semantics (dropped from objects, null in arrays).
- ADOPTED: lane-K FAILURE-TAXONOMY v1.0.0 (published 2026-09-23).
  `prototype/taxonomy.mjs` imports the 13-class closed set from ONE module
  (one-line swap on a taxonomy MINOR). Writer enforces at build time
  (throws, loud — drift rejection); verifier re-checks at read time
  (`taxonomy_drift` -> INVALID). Replaces the "BCQ list as v0" dependency.
- PROVEN: historical replay — `prototype/replay-pass79.mjs` reconstructs
  Facebook Pass 79 (fb-job-20260920-1426 / fb-20260920-203648, FL-20260920-015)
  from the real outreach log + FAILURE_LEDGER as a full RunRecord
  (status OUTCOME_UNKNOWN — honest: dispatch observed, execution unprovable).
  Three WHY questions answered from the record alone:
  1. why did the quarantine set change? -> whyChanged("fb_intent_ledger",
     "quarantined_intents") -> before/after + evidence refs.
  2. why did pass 79 fail? -> errors[0]: TIMEOUT (lane-K C.1),
     side_effect_unknown, terminal, dead-lettered (quarantine).
  3. why did it cost 0 AI tokens? -> cost(): in/out 0, usd 0, purpose
     "none — deterministic browser automation, no LLM in the loop".
  Verdict OK, digest binds.
- PROVEN: forgery red-team — a twin record claiming SUCCEEDED with 60 emitted
  intents and 0 SUCCEEDED attempts gets verdict EXECUTION_UNPROVEN
  (a liar about outcome, checkpoint-honest, is still caught). A forged record
  cannot be repaired by editing (run_digest breaks). Residual boundary stated:
  a writer fabricating attempts+outcome consistently is writer-integrity
  territory (lane L / code review), not ledger-verifiable.
- PROVEN: secrets red-team — `prototype/secrets-redteam.mjs`: fake tokens
  (ghp_, sk-, Bearer, PEM) injected into error/rejection/attempt free text;
  4 redactions, 0 leaks, `credref:` handle survives, digest binds the
  REDACTED record. Lane-L boundary holds at the ledger.
- PROVEN: cardinality — `prototype/cardinality.mjs`: 5,020 runs written in
  1.1s (0.22 ms/record), read in 155ms, collapse in 31ms, whyChanged 5ms,
  cost 8ms. Hot set bounded to 20 full records + 2 hourly rollup lines.
- FIXED: beginRun re-read the ledger per run (O(n^2); killed at 100s+).
  Now a process-local seq cache (dir|connector|tenant) makes writes O(1)
  with cold-start read only. Documented caveat: multi-writer needs an
  atomic sequence issuer; standing design is a single-writer scheduler;
  the reader always reads the file, never the cache.
- INTEGRATION-REQUEST filed: `INTEGRATION-REQUEST-lane-j.md` (lane M: run
  stream is J's, registry projection is M's, RunReport.runId references the
  ledger run_id; DUP arbitrates on disagreement; BCQ: run_id on the
  acquisition seam; N: join field confirmation).
- NEXT: wire run_id through one real acquisition seam (BCQ adapter or lane A
  git vertical slice) and emit a RunRecord for a LIVE run; then demo the
  worked example end to end (run -> observation -> lineage anchor -> regen
  targets) with lane N's tracer. Blockers: none. Phase0 pending does not
  block the operational-store default.

## Standing decisions from Nolan (2026-09-23, binding)
- Credentials: lane J touches no credentials. RunRecord schema carries
  counts and hashes only; tokens/cookies/emails/PII are excluded by the
  secrets rule (design section 2). Prototype uses synthetic fixtures only.
  No connect flow in lane J scope; nothing to queue.
- Vendor veto: no new vendor adopted. OpenTelemetry evaluated and REJECTED
  for the run ledger (weight dwarfs value; answers the wrong question).
  Prototype is zero-dependency. Any future storage/query dependency goes
  through the veto gate questions in the design doc (section 8).

## Integration requests out
- lane-bcq: attach `run_id` at the acquisition seam (AcquisitionRequest or
  the run harness that calls `acquire()`); every emitted observation should
  carry its run_id so the run <-> observation join is a lookup, not a hunt.
- lane-n: confirm the observationId <-> run record join field (lane J
  proposes `run_id` on observations, `observation_ids` on RunRecord).
- lane-k: adopt the BCQ taxonomy list as v0; lane J imports from one module.
- lane-m: run records are operational metadata; confirm lane M's registry
  reads run summaries (counts/cost/health) rather than duplicating them.

## Blockers
- None. Phase0 pending does not block the operational-store default.
