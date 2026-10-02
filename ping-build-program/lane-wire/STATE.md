# LANE WIRE — wiring wave state, 2026-09-23

## STATUS: PROVEN-dry-run / BLOCKED-exact (INGEST-001)

Everything provable without a live journal write is proven. The live write is
staged in WIRING-RUNBOOK.md, executable by a fresh agent with zero decisions
the moment INGEST-001 is a GO.

## PROOF SUMMARY

| Check | Result |
|---|---|
| Reconcile (a): UNSUPPORTED in BCQ kit FailureCode | DONE — uncommitted diff in isolated worktree /home/nolan/projects/ping-bcq-substrate (branch lane/bcq-connector-substrate), tsc strict clean |
| Reconcile (b): SB-1..SB-8 handle pattern | VERIFIED ABSENT — SB cases exist only as a proposal in INTEGRATION-REQUEST-lane-l.md (not implemented in any kit file); the draft's `cap_` pattern is stale vs lane L's `pingsec_1_[A-Za-z0-9_-]{43}`; correction applies at adoption |
| Dry-run /ingest contract (ingest-sim.mjs) | ALL CHECKS PASS — 2,503 envelopes (git 2,487 / github 11 / gbp 5): eventTypes registered (2 of 233), no cross-source logicalId collision, evidence sha256 well-formed, lifecycle+confidence present, 422/400 negatives correct, double-submit → 2,500 rows, all 2,503 redeliveries deduplicated, eventIds stable |
| Restart/recovery (recovery-sim.mjs) | PASS — crash before commitCheckpoint leaves checkpoint unmoved (page-1); recovery run resumes from old checkpoint; 4 re-fetched observations dedupe by eventId; 7/7 unique rows, no loss, no dupes |
| Knowledge-pipeline reachability | PROVEN at ID-contract level (KNOWLEDGE-PIPELINE-TRACE.md): J by run_id/observation_ids, N by causedByEventId/sourceKey, F by logicalId/provider+providerId, G by objectId/evidenceRefs |
| Live run | STAGED — WIRING-RUNBOOK.md + run-live.mjs; blocked on INGEST-001 |

## LEDGER

- IMPLEMENTED: gen-envelopes.py (drives real lane-CONN adapters against real
  fixtures → 16 connector envelopes), ingest-sim.mjs (exact /ingest contract
  mirror: route validation + canon-svc namespace/logicalId + emit eventId
  formula + ON CONFLICT journal), recovery-sim.mjs (lane-M §5.2 commit-first
  advance + lane-R github-issues-paginated fixture), run-live.mjs (live POST +
  readback + diff + idempotent re-POST), WIRING-RUNBOOK.md, KNOWLEDGE-PIPELINE-TRACE.md.
- RECONCILED: (a) UNSUPPORTED added to FailureCode in the BCQ worktree kit
  (12→13, matches lane K v1.0.0 §2.9); verified no exhaustiveness switches,
  tsc --strict clean, worktree still only "?? src/fyd/connectors/", no commits,
  main worktrees untouched. (b) SB-1..SB-8: not implemented anywhere; the
  INTEGRATION-REQUEST-lane-l.md draft still references the old `cap_` pattern —
  flag for lane BCQ at adoption time (lane L's corrected pattern:
  `pingsec_1_[A-Za-z0-9_-]{43}`).
- TESTED: ingest-sim.mjs all pass (exit 0); recovery-sim.mjs pass (exit 0);
  envelope generation deterministic (gen-envelopes.py re-run → identical file).
- PROVEN: dry-run milestone proof; recovery path; ID-contract reachability.
- BLOCKED: live POST to /ingest — INGEST-001 (Nolan's GO required). Bearer
  exists in exterior_agent_credentials (agent_id 'muse'); route requires
  Authorization: Bearer; middleware authenticates identity only (no capability
  gate on /ingest).
- FIXED: within-source duplicate logicalIds (same repo/issue in multiple
  recorded fixtures) — correctly classified as redeliveries, not collisions;
  the journal absorbs them via content-deterministic eventId.
- NOT DONE: live POST (blocked); wiring lane J/N/F/G readers to the live
  journal (post-milestone); lane BCQ merging the UNSUPPORTED enum back into
  its own kit source (flagged); SB case adoption (lane BCQ's call).

## NOTES FOR LANE BCQ (reconcile follow-ups, not mine to decide)

1. The UNSUPPORTED enum member lives only in the isolated worktree diff
   (src/fyd/connectors/kit/types.ts). The lane-owned kit at
   lane-bcq/kit/types.ts and the Python testkit contract.py ErrorClass enum
   still have 12 members — converge at your discretion.
2. When SB-1..SB-8 are adopted, SB-3's handle pattern must be
   `pingsec_1_[A-Za-z0-9_-]{43}` (lane L correction), not the `cap_` pattern
   in the current INTEGRATION-REQUEST-lane-l.md draft.
3. lane-conn/github/adapter.py already notes the 12-class testkit enum vs
   lane-K v1 delta (405/501 → INVALID_PAYLOAD surfaced with canonical class
   named in detail); it converges automatically once the enum has UNSUPPORTED.

## FILES

- STATE.md (this file)
- WIRING-RUNBOOK.md — the staged live run
- run-live.mjs — live POST/readback/diff/idempotency script (INGEST-001 only)
- ingest-sim.mjs — dry-run contract proof (exit 0)
- recovery-sim.mjs — restart/recovery proof (exit 0)
- gen-envelopes.py — connector envelope generator (real adapters + fixtures)
- milestone-envelopes.jsonl — 16 connector envelopes
- milestone-envelopes-all.jsonl — 2,503 envelopes (2487 git + 16 connector)
- KNOWLEDGE-PIPELINE-TRACE.md — reader reachability trace
- event_registry.json / ingest-route.js / canon-svc.js / emit-fn.js — gateway
  source copies captured 2026-09-23 (registry: 233 types, generated 2026-08-27)
- work-*.sh — Pig staging scripts (transfer helpers, disposable)
