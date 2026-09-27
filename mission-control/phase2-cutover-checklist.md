# Phase-2 cutover checklist (spine lane, X pass)

STATUS: NOT STARTED. This document is the exact, ordered plan for the
phase-2 cutover. Nothing in it has been executed. Do not execute any step
without Nolan's explicit approval naming phase 2.

Phase 1 (done): additive only. Live pass behavior unchanged; the observer
folds one already-completed real pass into MC_PASS_* journal events;
queries and the panel projection read those events only.

Phase 2 goal: make the spine live, so every pass flows
OBSERVATION -> CANONICAL EVENT -> MISSION -> DECISION -> CAPABILITY/
AUTHORITY -> DISPATCH -> EXECUTION -> RESULT -> VERIFICATION ->
EVIDENCE -> REPLAY -> MC PROJECTION as it runs.

## Preconditions (all must be true before step 1)
1. Phase-1 branch merged to main (SHA recorded in the lane report).
2. Independent falsifier has replayed the phase-1 lane from a clean
   checkout and certified the report's numbers (O5).
3. The event-to-mission bridge mapping for MC_PASS_* is written and
   reviewed (additive map entry in
   constitutional-sprint/fleet/observability/obs1-scratch/event_to_mission_bridge.js
   or an adapter; no parallel bridge).

## Ordered steps
1. Wire the observer into the cron pass body as a post-pass step
   (post-executor, post-verifier): it runs spine_observe against the
   just-completed pass artifacts. It must not change executor selection,
   caps, pacing, or the pass's own artifacts. If the observer raises,
   the pass result stands and the observer failure is journaled as a
   gap event (fail-closed: a broken observer never breaks a pass).
2. Mission creation: when MC_PASS_STARTED lands in the journal, the
   event-to-mission bridge creates one deterministic mission per pass
   (mission identity = mc:pass:<platform>:<pass_id>, correlation ID =
   pass_id). Verify: one mission per started pass, zero duplicates.
3. Decision record: the guard audit decisions become the pass's decision
   record, linked to the mission by correlation ID. No new decision
   authority; the guard already decides.
4. Capability/authority: each manifest action is checked against the
   existing capability/authority surface (account authorization state,
   rate ceilings, the retry theorem's EFFECT/SAFE/HOLD verdicts).
   HOLD/UNKNOWN gates dispatch; it never auto-retries an external effect
   (O6).
5. Dispatch linkage: route dispatch through the EXISTING lane-C path
   (adapter -> transport -> verify -> MC_* journal events). Do not build
   a parallel dispatcher. The driver's real execution log becomes the
   RESULT observation stream.
6. Result/evidence: executor report + verifier report + ledger
   observations are folded into MC_PASS_OBSERVATION / MC_PASS_VERIFY
   as the pass runs (replacing the post-hoc fold). EFFECT_PROVEN only
   when verification supports it; missing observations -> EFFECT_UNKNOWN.
7. Replay: replay the new spine tests plus the lane suites from a clean
   checkout; the falsifier re-runs the three WHY questions against the
   live journal and the panel render.
8. MC projection: the pass-health panel becomes the canonical owner view
   for pass health. No prose may override its numbers.

## Rollback
- Phase 2 is additive too: disabling the observer step restores the
  phase-1 state exactly (journal events already emitted stay, new
  passes simply stop emitting).
- No migration, no schema change, no authority change exists to roll back.

## Explicitly NOT in phase 2
- No new retry behavior; the retry theorem (outreach/retry_policy.py,
  from the 2026-09-24 proof) stays the only retry authority.
- No auto-retry of HOLD/UNKNOWN external effects (O6).
- No changes to caps, cadence, or eligibility policy.
- No new truth store; the PING journal stays authoritative.
