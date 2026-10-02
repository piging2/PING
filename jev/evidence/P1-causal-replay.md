# JEV PATCH EVIDENCE RECORD — P1: Causal replay connection

Date: 2026-09-22. Worktree: /home/nolan/ping/worktrees/jev-surgical @ cc6856c3b (clean, detached).
Status: VERIFIED.

## PROBLEM
`ReplayWorker._buildReplayEvents` replayed only the triggering event even though
`UnifiedEventRuntime.getCorrelationGroup()` already existed and
`/mc/replay/trace` already consumed it. The 63/63 replay→witness→lineage record
was single-event structural replay, not causal-chain replay.

## SOURCE EVIDENCE
- ping-runtime/workers/canonical_workers.js `_buildReplayEvents`: comment said
  "In production, this would query Postgres for the correlation group" then
  returned only the triggering event.
- ping-runtime/events/unified_event_runtime.js:348 `getCorrelationGroup(correlationId, limit=200)`
  — live, deterministic `ORDER BY created_at ASC` (existing schema ordering).
- gateway/routes/mission_control.js:594 `/mc/replay/trace` consumes the same facility.
- gateway/bootstrap/gateway_runtime.js:514 already passes
  `eventRuntime: unifiedEventRuntime` into `registerCanonicalWorkers`, which spreads
  it into every worker → `ReplayWorker._eventRuntime` is set in production.

## LIVE REACHABILITY
Confirmed from current source. The facility is live; only the connection was missing.

## WHY THIS PATCH
Nolan's directive P1: "surgically connect ReplayWorker to the existing
correlation-group facility. Do NOT redesign Replay. Do NOT add another event
store. Do NOT change historical events." ~15-line connection patch.

## FILES TOUCHED (canonical_workers.js: +29/-4)
`_buildReplayEvents` now: (1) keeps the `payload.replay_events` test-mode override;
(2) when `this._eventRuntime.getCorrelationGroup` is available, loads the full
correlation group and maps rows to the existing replay-event shape
(event_id/event_type/payload/metadata/timestamp); (3) falls back to the previous
single-event behavior when the runtime is absent, the query fails, or the group
is empty. Ordering is the existing `created_at ASC` — no invented ordering.
Docstring updated to match.

## AUTHORITY BEFORE
ReplayWorker could only ever re-execute the single triggering event.

## AUTHORITY AFTER
ReplayWorker replays the full causal group when the canonical store is reachable;
identical single-event behavior otherwise. No new authority created — it consumes
the existing event authority.

## PERSISTENCE EFFECT
None. No schema changes; read-only query against the existing facility.

## REPLAY EFFECT
Positive: replay input is now the actual causal chain (ancestor → descendant),
which is what the kernel state machine expects. Single-event input remains valid
when the group is unavailable.

## SECURITY EFFECT
None. Same read path the mission-control trace route already uses.

## ROLLBACK
Revert canonical_workers.js in the worktree (no commits made).

## TEST
- `node --check`: OK.
- 5 new unit tests: group path returns full ordered group with mapped shape;
  no-eventRuntime → single-event fallback; query error → fallback with warning;
  `payload.replay_events` test-mode override still wins; empty group → fallback.
  All PASS.
- Existing suite `gateway/test_replay_worker_wiring.js`: 17/17 PASS (its
  MockEventRuntime has no `getCorrelationGroup`, so the `typeof` guard keeps
  behavior identical).
- Existing suite `gateway/test_replay_composition.js`: 8/8 PASS (after copying
  the untracked `gateway/constitutional-dist/` build artifacts from the primary
  worktree into the Jev worktree — a pre-existing fresh-worktree environment gap,
  not a patch issue).

## FALSIFICATION CONDITION
If a replay ever emits events in non-causal order, or if the group path changes
the output shape the kernel provider receives, the connection is wrong.
