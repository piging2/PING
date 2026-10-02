# CE-001 PATCH SPEC (to verify against live source once Pig WSL is back)

Source: forensic lane REPORT.md (2026-09-19 ~14:30 MDT), fail-before F1-F3 proven on scratch PG.
Target files (WSL worktree /home/nolan/worktrees/constitutional-convergence-authority-law):
- ping-runtime/orchestration/mission_runtime.js (complete(), ~lines 169-200)
- ping-runtime/events/unified_event_runtime.js (emit identity, ~lines 134-147)

## Current behavior (from forensic report, VERIFY on live source before editing)
`MissionRuntime.complete(missionId, result)`:
1. SELECT started_at for the mission row
2. `duration_ms = Date.now() - started_at`
3. `this._eventRuntime.emit('MISSION_COMPLETED', 'mission-runtime', { missionId, result, duration_ms })` — NO logical_id option
4. check `{status:'ok'}`; conditional `UPDATE ... WHERE status='running'`

`UnifiedEventRuntime.emit(type, source, payload, options)` builds the identity preimage as
`{event_type, source, namespace, payload}` when no `options.logical_id` is passed; with
`logical_id` the preimage is keyed on it (VERIFY exact preimage composition in unified_event_runtime.js).

`result.completed_at` is stamped by the scheduler (mission_scheduler.js:349-352) with wall-clock time.
Both `duration_ms` and `completed_at` differ on every call -> every completion mints a fresh event_id.

## Minimum change
In `complete()`, pass a deterministic logical identity through the EXISTING options channel:

```js
this._eventRuntime.emit('MISSION_COMPLETED', 'mission-runtime',
  { missionId, result, duration_ms },
  { logical_id: { kind: 'mission-completion', mission_id: missionId } });
```

Nothing else changes in CE-001:
- `duration_ms` / `completed_at` STAY in the payload as observation metadata (they are no longer
  in the identity preimage once logical_id drives identity — VERIFY this exclusion on live source).
- No schema change. No new authority. Historical rows/events untouched (their preimages are immutable).
- IdentityAuthority/HashAuthority/canonicalization owners are used as-is via UER's existing channel.

## What this closes / does not close
- CLOSES: F1 (retry/re-execution duplicates at identity level; second complete() returns deduplicated:true),
  F1-chain inside F2b (re-execution after reaper recycle dedups instead of minting a second event),
  F3-as-duplicate-source (no-op complete() no longer mints a NEW event identity; still emits, still
  returns rowCount 0 — the emit-before-check ordering defect remains as CE-002).
- DOES NOT CLOSE: W1-W3 crash windows (event-exists/row-running) — no reconciler; CE-003.
  Emit-before-check ordering — CE-002. Scheduler phantom metric — CE-004.
- RISK: low. FAILURE MODE to guard in review: any wall-clock field re-entering the preimage
  reintroduces F1 silently. The targeted test must assert preimage exclusion, not just dedup.

## Targeted tests (post-patch)
1. F1 inverted: two complete() calls on the same mission (different wall-clock times, row reset to
   running between) -> exactly ONE MISSION_COMPLETED event_id; second returns deduplicated:true.
2. Preimage audit: assert the identity preimage for MISSION_COMPLETED contains no Date.now()-derived
   or wall-clock fields (static source assertion on the emit call + runtime assertion that two
   payloads differing ONLY in duration_ms/completed_at produce the same event_id).
3. Five-path determinism: retry (1), lease-expiry re-execution via reapExpiredLeases (2), fresh runtime
   instances = process-restart equivalent (3), crash-after-accept = event exists + row running, then
   re-complete dedups (4), reconciliation regeneration = re-emit for completed row dedups (5).
4. Regression: repo's existing relevant suite (tests/determinism.test.js references IdentityAuthority;
   run what covers UER emit + mission runtime).

## Commit
One coherent unit on the convergence branch. Explicit file staging only. Never git add -A.
No force push. Push blocked by known egress-proxy 401 -> record PUSH_PENDING_EGRESS.

## Next candidate after CE-001
CE-002 (emit-before-check ordering) per backlog; CE-003 shape question (reconciler-from-canonical-event
vs shared tx) is operator-relevant but evidence exists — investigate first, grill only if genuinely ambiguous.
