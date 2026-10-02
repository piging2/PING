# Event Bypass Classification — ConstitutionalEventBus / knowledge_compiler.js

Date: 2026-09-24. Scope: read-only audit. No rewrites. Behavior frozen.

## The bus

`gateway/event_bus.js` — ConstitutionalEventBus. LEGACY, already carrying a
2026-09-24 deprecation notice (mission/event-bus convergence stream):
new code must use UnifiedEventRuntime.emit() (ping_events); do not add
publishers; behavior frozen for existing consumers.

Storage semantics: writes the legacy `events` table
(event_id, event_type, timestamp, aggregate_id, aggregate_type, event_data),
self-minted IDs via identityAuthority, plus an in-memory `_eventLog`.
Bypasses the canonical UER journal (ping_events) entirely.

## Sole live publisher

`gateway/knowledge_compiler.js` (KnowledgeCompiler constructor line 798
creates the only production ConstitutionalEventBus instance; passed to the
7 compiler passes + ReflectionPass).

Event types written (both via CompilerPass._emitEvent, aggregate_type='COMPILER_PASS'):

| event_type | writer | live reader | canonical or ephemeral | verdict |
|---|---|---|---|---|
| PASS_COMPLETED | compiler passes (per-pass execute) | none live; legacy replay path only (KnowledgeCompiler.replayPass reads `_eventBus.replay()` from the `events` table) | EPHEMERAL internal signal: pass lifecycle telemetry (pass name, input/output ids, duration, object count). The canonical transition is the persisted pass output (via `_persistOutput` / objectRegistry), not the event. | DEPRECATE the bus path. KEEP the event type as a documented ephemeral signal. Sanctioned direction: migrate emission + replay to UER (ping_events). Do NOT migrate legacy `events` rows blindly. |
| PASS_FAILED | compiler passes (per-pass catch) | none live; same legacy replay path | EPHEMERAL internal signal: pass failure telemetry (pass name, input id, error message). | Same verdict as PASS_COMPLETED. |

## Dead publishers (no production instantiation found in repo)

| event_type | writer | status |
|---|---|---|
| MissionGenerated | `gateway/self_improvement_loop.js:135` | DEAD: SelfImprovementLoop is never constructed in production. Also uses the obsolete string-first `publish('MissionGenerated', {...})` convention, incompatible with the current `publish(event)` signature. |
| MissionStarted | `gateway/mission_execution_authority.js:105` | DEAD: MissionExecutionAuthority is never constructed in production. Same obsolete calling convention. |
| MissionCompleted | `gateway/mission_execution_authority.js:173` | DEAD. Same as MissionStarted. |

These names look canonical but have NO live writers and NO live readers.
Classify-only per freeze: do not delete in this wave; they are removal
candidates for a future wave (ordinary dead code, not canonical truth).

## Delta 2026-09-24 ~11:33 MDT (P1/P2 lane, verified against /home/nolan/ping)

- Reachability correction: the sole ConstitutionalEventBus instantiation
  (`gateway/knowledge_compiler.js:798`) is reachable ONLY via
  `gateway/end_to_end_verifier.js`, which constructs it inside
  `if (require.main === module)` (manual run only). The live
  `server.js -> bootstrap/gateway_runtime.js` require graph has zero references
  to knowledge_compiler or end_to_end_verifier. Net: ZERO live instantiation in
  the running gateway. Removing the bus would break only manual verifier runs.
- `commit_acquired` (`acquisition_authority.js:157`) calls `.emit()`, which does
  not exist on ConstitutionalEventBus's public API; `ContinuousAcquisition` is
  never instantiated in production. Dead path, classify only.
- MissionEventBus (`gateway/mission_event_bus.js`): zero instantiation sites,
  zero requirers, zero publish sites in the main tree. Dead, removal candidate.
- UER producers (12+, all live): canonical_workers, intelligence_worker,
  canonicalization_service, mission_scheduler, mission_runtime, event_bridge,
  routes/events, routes/identities, social_ingest_adapter, knowledge_ingest_adapter,
  business_emitters, evidence_authority, embedding_service.
- EventBridge (repository_events + canonical_events -> UER -> ping_events):
  transitional convergence mechanism, KEEP.
- F-01 mission event side (state semantics owned by sibling lane):
  MISSION_CREATED/ASSIGNED/STARTED/COMPLETED/FAILED/LEASE_EXPIRED/RETRY_RECLAIMED
  emitted by mission_runtime.js via UER. Canonical observations.

## Dead subscriber

`gateway/control_center_subscription.js` subscribes to MissionGenerated,
MissionScheduled, MissionStarted, MissionCompleted, PatchGenerated,
ReplayPassed, CommitApproved. The file itself documents (lines 4-5) that it
is "not required by any live code path (absent from the gateway/server.js ->
bootstrap/gateway_runtime.js require graph; zero requirers in repo)". DEAD.

## Verdict summary

- NO canonical transitions flow through ConstitutionalEventBus. The canonical
  journal is `ping_events` via UnifiedEventRuntime (proven sole writer by
  `gateway/event_bus_convergence.test.js`).
- 2 live event types (PASS_COMPLETED, PASS_FAILED): ephemeral internal
  signals. Deprecate the bus path; keep the types documented; migrate to UER
  per sanctioned direction; do not blindly migrate legacy `events` rows.
- 3 dead event types + 1 dead subscriber: classified, no action this wave.
- No broad rewrite. Phase-0 deprecation/direction tests remain the only
  event-bus code change.
