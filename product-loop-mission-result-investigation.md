# Product Loop Investigation: Mission Result (Loop 1 of 4)

Status: investigated 2026-09-20 after Oracle reachability proven. No Oracle mutations made. No new framework built.

## Reachability proof (prerequisite)

Oracle read-only observation 2026-09-20 ~18:47 MDT: ping-gateway healthy (candidate-84486f056, RestartCount 0), ping-postgres healthy (24h), ping-qdrant healthy (25h). GET /health healthy. This satisfies "prove current Oracle reachability" before loop investigation.

## Loop 1: MISSION RESULT (currently discarded / insufficiently consumed)

### What exists

Producer side:
- `gateway/trigger_authority.js` `_emitTriggerProcessed(trigger, missionResult)` builds a `TriggerProcessed` event with `payload.mission_result` and appends it to `this._eventRepository` (legacy event repository, not the canonical UnifiedEventRuntime path).
- The event carries the result, but only as a nested payload field.

Consumer side:
- The sole consumer found is `replayTrigger()` in the same file, which reads `TriggerProcessed` events to reconstruct trigger status (`processed`, `mission_id`, `processed_at`). It does NOT read `mission_result`.
- No handler in `ping-runtime` subscribes to `TriggerProcessed` via UnifiedEventRuntime.
- Health shows 28 event_runtime handlers registered, but none are wired to mission results.

### The gap

The mission result is written (to the legacy repository) but never consumed as product value. It is preserved as audit history, not as a live product loop. This matches Nolan's "discarded / insufficiently consumed" characterization.

### Shortest real loop (proposal, not yet wired)

Do not build another orchestration framework. The existing mechanisms are:

1. `UnifiedEventRuntime` is the sole canonical event authority (standing law).
2. `EventToMissionBridge` is the accepted-event to mission trigger authority.
3. Mission/Worker runtimes already produce results; the trigger authority already has the result value in hand.

The shortest wire is: emit the mission result as a canonical event via UnifiedEventRuntime (not just the legacy repository), then add one consumer that does something real with it. Options in order of shortness:

a) Emit `MissionResultRecorded` (or reuse existing canonical event type if one exists) from the place that already holds `missionResult`, via the canonical runtime, not the legacy repository.
b) One projection or handler that records it where operators can see it (existing mission execution record, existing telemetry, or existing knowledge projection). Reuse, do not create a new store.

What was NOT done: no code changed, no Oracle mutation, no new event type created. This is investigation only.

### Why not wired yet

Wiring requires a decision: which existing canonical event type owns mission results, and which existing surface consumes them. That is a small architectural decision that should go through the convergence lane with a fail-before test, not as a drive-by during the observation window. The observation window stays observe-only per Nolan's directive.

## Loops 2-4: queued in order

2. APPROVAL (knowledge promotion starved by missing producer): not yet investigated. Will follow the same pattern: find existing approval mechanism, find the missing producer, wire shortest real loop.
3. WITNESS_REJECTED (emitted but unheard): not yet investigated.
4. RECOMMENDATION (produced/listed but no decision path): not yet investigated.

## Rule applied

Repurpose before building. Reuse before replacing. No new framework unless reality proves one is required. The investigation stays read-only until a concrete minimal wire is proven necessary and safe.
