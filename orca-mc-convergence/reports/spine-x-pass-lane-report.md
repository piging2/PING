# Spine lane report: X-pass reached-path implementation (phase 1)

Date: 2026-09-27. Implementer lane (SPINE IMPLEMENTER), branch
`spine/x-pass-reached-path` on base `f980649b2a43840c0f78fedff4d8defebb3a08b4`
(worktree `/tmp/spine-x-pass`). No merge performed; merge is a Nolan
decision. O5: this report is an implementer claim; an independent
falsifier must replay before it certifies anything.

## What was built (additive only; live behavior unchanged)
- `mission-control/emit.py` — existing `emit_event()` lane/backfill
  signature preserved; 14 `MC_PASS_*` types registered;
  `emit_pass_event()` / `emit_pass_events()` for the spine vocabulary;
  journal append with event-id dedupe (rerun = duplicate-skipped).
- `mission-control/pass_queries.py` — pure journal queries answering the
  three WHY questions (`why_did_it_stop`,
  `why_was_candidate_rejected`, `what_did_browser_do`) plus latest-closed,
  intent/observation unknown fold, and 7-day rollup. Missing linked
  events and missing intent visibility return unknown, never zero.
- `mission-control/phase2-cutover-checklist.md` — exact ordered cutover
  plan. NOT executed.
- `outreach/retry_policy.py` — the 2026-09-24 proven retry theorem as
  code: `retry_safe()` over (effect class, provider semantics, observed
  provider state, idempotency support, reconciliation evidence).
  X-like and X-comment predicates ported; X-follow has no proven
  predicate and returns HOLD_UNKNOWN; no global retry boolean
  (self-scanned).
- `outreach/spine_observe.py` — phase-1 post-pass observer. Folds one
  completed X pass's machine-readable artifacts into the ordered
  MC_PASS_* sequence
  STARTED -> DISCOVERY_TIMEOUT -> DISCOVERY_DONE -> CANDIDATES ->
  MANIFEST -> INTENTS -> EXECUTION_DONE -> OBSERVATION -> VERIFY ->
  CLOSED. Read-only against live dirs; dry-run mode; caps from the
  engine's own snapshot, never invented.
- `ping-ui-contract/apps/mission-control/pass-health/projection.py` —
  pure first-block projection; unknowns render as literal `unknown`.
- `ping-ui-contract/apps/mission-control/pass-health/render.py` —
  stdlib-only HTML view with the three WHY drawers, every number
  traced to a journal event id.

## Steering honored
- No parallel dispatcher: dispatch stays on the existing lane-C
  adapter -> transport -> verify -> MC_* path.
- Retry uses the proven 2026-09-24 theorem, not invented semantics.
- Event-to-mission bridge evaluated
  (`constitutional-sprint/fleet/observability/obs1-scratch/event_to_mission_bridge.js`);
  needs an additive MC_PASS_* map entry in phase 2 (not done in phase 1).
- No AIRuntime anywhere; the executor registry owns execution.

## Proof against the real pass x-20260926-231400
Real, already-completed X follow pass (5 handles:
@DailySentinelGJ, @KJCTNews8, @KKCO11News, @GrandJunctionPD, @NWSGJT).
Dry-run first, then one live emission, then a rerun:

- Emission 1: 10 events appended (ids mc-pass-9f1a4ce787d2,
  mc-pass-4180955c0be6, mc-pass-a0aeefd05a9f, mc-pass-9fdc9622211f,
  mc-pass-a91bcb20d586, mc-pass-0a8c876327fc, mc-pass-2a1ed2177c52,
  mc-pass-8520d8986313, mc-pass-31cf57baeac9, mc-pass-67f5a02cfc90).
- Emission 2: 10/10 duplicate-skipped; journal unchanged.
- WHY DID IT STOP? "It did not stop early: pass x-20260926-231400
  completed 5/18 actions (pass class SUCCESS_ACTION)."
  Evidence: mc-pass-67f5a02cfc90.
- WHAT DID THE BROWSER ACTUALLY DO? "executor reported 5 of 5 manifest
  actions. Restriction: none. Intents left open (unknown): 0."
  All 5 -> EXECUTED. Evidence: mc-pass-a91bcb20d586,
  mc-pass-8520d8986313, mc-pass-2a1ed2177c52.
- WHY WAS THIS CANDIDATE REJECTED? (@aizikzimmerman) -> honest no-match:
  "No rejection recorded ... in the last 7 days. It was either never a
  candidate or it was SELECTED." Control (@DailySentinelGJ) -> SELECTED.
- Panel first block: last pass SUCCESS_ACTION, actions 5/18, unknown 0,
  candidates 5 / eligible 5 / skipped 0, 7-day: 1 pass, 5 actions,
  0 failures, 0 blocks.
- Panel HTML: `orca-mc-convergence/reports/spine-proof-pass-health-x.html`
  (in this branch).
- Comment/like probes for this pass produced no output files: folded as
  MC_PASS_DISCOVERY_TIMEOUT and probe posts 0 (observed missing, not
  invented).

## Tests
- New: `outreach/tests/test_spine.py` — 46 checks, all green:
  emit vocabulary/idempotency; WHY queries incl. honest-unknown and
  no-zero behaviors; 7-day rollup incl. empty-window-is-None and
  single-count blocks dedupe; retry theorem incl. all HOLD_UNKNOWN
  gates and the no-global-retry self-scan; observer fold incl.
  fixture pass, UNKNOWN_EXECUTION fold, dry-run, live-artifact
  read-only; projection incl. unknown rendering.
- Existing: `outreach/tests/test_pass_policy_engine.py` — all green
  (sections A-F incl. section F emit contract satisfied by the other
  lane's `~/workspace/outreach/emit.py`; this lane's
  `mission-control/emit.py` mirrors that contract).

## Not done in phase 1 (deliberately)
- Mission creation, decision record linkage, capability/authority
  checks, dispatch linkage: phase-2 items in the cutover checklist.
- Event-to-mission bridge MC_PASS_* mapping: additive entry still to
  write.
- No commit yet (integration shape of mission-control/ and
  ping-ui-contract/ dirs needs review; see below).

## Integration note for review
At base SHA, `mission-control/` and `ping-ui-contract/` are untracked in
the canonical tree, and `~/workspace/ping-ui-contract/` is a nested Git
repository. This branch adds files at the task's allowed paths in the
worktree; the merge shape (submodule vs. plain dirs vs. separate repo)
needs an explicit decision before commit.

## Spend accounting
- Local shell/file inspection and Python only. No provider or model
  calls initiated by this lane. No browser actions. No social actions.
  No unbounded loops. One real journal write batch (10 additive events,
  idempotent). All live pass artifacts and ledgers read-only.

## Falsifier replay pointer
From a clean checkout of this branch:
`python3 outreach/tests/test_spine.py` and
`python3 outreach/tests/test_pass_policy_engine.py` (exit 0),
plus re-running the three WHY queries and the panel render against
`~/workspace/fyd-journal-gateway/events.jsonl` and diffing the answers
above.
