# LANE A — Writer and Reader Tables (main @ cc6856c3b)

## WRITER TABLE

| WRITER | STORE | CALLER | REACHABLE? | LIVE PROOF? | CLASSIFICATION |
|---|---|---|---|---|---|
| UnifiedEventRuntime.emit() (unified_event_runtime.js:152, INSERT ... ON CONFLICT DO NOTHING) | ping_events | canonical_workers (8), intelligence_worker, business_emitters, canonicalization_service, EventBridge, mission_runtime, mission_scheduler, POST /events route, gateway_runtime bootstrap seed | YES — constructed + initialized in live boot (gateway_runtime.js:433-439) | YES — EXECUTION_EVIDENCE_LEDGER.md 2026-08-27: 3 real HTTP 201 ingests, 9-hop causal chain in PG, ping_events 1050→1091→1132 and 1214→1255 (+41) count-matching | CANONICAL / LIVE-PROVEN |
| CanonicalEventEnvelope.executeEmitEvent (canonical_event_envelope.js:174, INSERT ... ON CONFLICT (tenant_id, sequence) DO NOTHING) | canonical_events | HPP business authorities: reviewAuthority, customerAuthority, projectAuthority, aiWorkspaceAuthority (all in live boot) | YES | YES (live boot wiring; bridge converges rows into ping_events; UPDATE processed flags observed in code) | COMPATIBILITY ADAPTER — live upstream ingress, NOT canonical store |
| EventRepository.appendEvent (event_repository.js:117, INSERT INTO repository_events) | repository_events | capability_scheduler (4×), agent_memory_authority (5×), distributed_desktop_agents (5×), automatic_mission_generator (3×), constitutional_execution_pipeline:34 | NO — capability_scheduler/agent_* /auto_mission_generator have zero importers; pipeline.execute reachable only via gateway_adapter.executeEvent which has ZERO production callers | NO | DORMANT writer (instantiated; DDL executes at boot; append never invoked) |
| gateway/append_orchestrator.js:91 (INSERT 6-col into repository_events) | repository_events | authority_registry.js ← execution_authority.js / constitutional_bootstrap.js | NO — constitutional_bootstrap + execution_authority have zero production importers | NO | LEGACY / DEAD + BROKEN (CR-2: violates NOT NULL) |
| witness_chain.js:126,198 (INSERT INTO events) | events | constitutional_acquisition_runner, artifact_type_registry, end_to_end_verifier | NO — all three have zero production importers | NO | LEGACY / DEAD |
| event_write_authority.js:70 (INSERT INTO events) | events | none | NO | NO | LEGACY / DEAD |
| eventstore_persistence.js:356 (INSERT INTO events) | events | none | NO | NO | LEGACY / DEAD |
| replay_log.js:106,134 (INSERT INTO events) | events | constitutional_acquisition_runner, end_to_end_verifier | NO | NO | LEGACY / DEAD |
| continuous_background_analyst.js:487 (INSERT INTO events) | events | none | NO | NO | LEGACY / DEAD |
| constitutional_ollama_integration.js:446 (INSERT INTO events) | events | constitutional_acquisition_loop | NO | NO | LEGACY / DEAD |
| constitutional_runtime.js:283 (INSERT INTO events) | events | test_kernel_replay.js only | NO (test only) | NO | LEGACY / DEAD |
| Python writers | ping_events | — | N/A | — | NONE EXIST (tools/fyd-site-projection only reads or POSTs via API) |

Unused-writer vs alternate-live-authority verdict: there is exactly ONE live writer to ping_events (UnifiedEventRuntime.emit) and exactly ONE live alternate store (canonical_events, upstream ingress converging through the bridge). repository_events has a dormant writer; events has only dead writers. No competing LIVE authority exists.

## READER TABLE

| READER | STORE | REACHABLE? | LIVE PROOF? | NOTES |
|---|---|---|---|---|
| UnifiedEventRuntime.query + getChildren/getDescendants/getAncestors/getCorrelationGroup | ping_events | YES (same instance in boot; /events/:id, /events/:stream routes) | YES | Recursive CTE traversal |
| EventToMissionBridge (subscribes via eventRuntime.on) | ping_events (via in-process dispatch) | YES (boot :576-580) | YES (EMPR chain in ledger) | EVENT_MISSION_MAP → mission create |
| EvidenceAuthority.accumulate | ping_events | YES (boot) | YES | Qdrant hits traced back to ping_events |
| /events/stats route | ping_events (fallback COUNT(*)) | YES | YES | Primary getEventStats() reads repository_events (empty live) → falls back to ping_events |
| _seedBusinessEvents | ping_events | YES (boot :838) | YES | COUNT(*) gate for seed |
| MissionScheduler / WorkerRuntime / canonical_workers | ping_events (via emit for downstream) | YES | YES | Workers emit downstream events through emit() |
| KernelReplayExecutionProvider → DeterministicReplayEngine | transcripts (replay_events), NOT ping_events | YES (boot :513) | YES | Replay consumes IDs as immutable input; emits REPLAY_COMPLETED into ping_events |
| kernel EventReadAuthority (getAllEvents, getEventStats, getEventsByStream, ...) | repository_events | YES (instantiated in boot :383) but table has no live writers | NO live rows | Dormant read path; returns empty in production |
| EventBridge | repository_events + canonical_events | YES (boot :461-468) | YES | Polls upstream, re-emits into ping_events; maintains ping_bridge_cursors |
| canonical_event_envelope.executeQueryEvents / executeGetStats / executeGetUnprocessed | canonical_events | YES | YES | Upstream queries + processed-flag updates |
| witness_chain (dead), replay_log (dead), eventstore_persistence (dead) | events | NO | NO | Dead readers of dead table |
| SQLite event tables (document_tracker, embedding_cache) | sqlite files | n/a | n/a | Document/embedding caches, not event authority |
