# Wave H10 forensic sweep: uuid-based identity-authority bypasses

Worktree: /home/nolan/worktrees/ping-harvest-12h, branch sprint/harvest-12h (HEAD 88e389722956eaaf21fbe24b1be70b808eff83d6, clean before work).
Canonical identity: JS `computeEventId` (ping-runtime/events/unified_event_runtime.js); Python `IdentityAuthority` (runtime/authorities/identity_authority.py, "No worker or tool calls uuid.uuid4() directly").
Drives: /tmp/h10/drive.py (before/after), /tmp/h10/fix.py (patch script) on the Pig.

## Verdict: 2 live bypasses found and fixed; 0 remaining on live paths.

## BYPASS (live) -> FIXED
1. `workers/lineage_worker.py:54` — `lineage_id = str(uuid.uuid4())` used as aggregate_id + payload attr for LINEAGE_CREATED. Live: registered in kernel/event_dispatcher.py, run by workers/worker_runtime.py container. Fixed: deterministic `uuid.uuid5(NAMESPACE_URL, "ping:lineage:{witness_id}")`.
2. `workers/projection_worker.py:55` — `projection_id = str(uuid.uuid4())` used as aggregate_id + payload attr for PROJECTION_CREATED. Live: same dispatch chain. Fixed: deterministic `uuid.uuid5(NAMESPACE_URL, "ping:projection:{lineage_id}")`.
- Why uuid5 not IdentityAuthority: the worker container ships only workers/ + kernel/ (Dockerfile.worker-runtime, H9 adjudicated, do-not-touch), so runtime/authorities is not importable in-container. uuid5 is the same primitive IdentityAuthority.generate_deterministic_id uses; stdlib-only, container-safe.
- Nuance: emitted EVENT identities were already canonical (POST /events discards client event_id; UnifiedEventRuntime computes computeEventId). The bypass was the random aggregate identity, violating the authority's "no worker calls uuid4 directly" contract and forking a new identity per redelivery.
- Before drive: version=4, redelivery_stable=False (both). After drive: version=5, redelivery_stable=True (both), aggregate_id matches payload id (both). py_compile OK. Diff: 2 files, +16/-4, uncommitted.

## CANONICAL (not bypasses)
- `workers/repository_client.py:28` — uuid4 event_id minted then POSTed to /events; gateway IGNORES client event_id and computes canonical computeEventId via UnifiedEventRuntime.emit (verified in gateway/routes/events.js). Adjudicated production dispatch wiring; do-not-touch.
- `workers/witness_worker.py` — H4-fixed; only uuid4 match is the UUID4_RE fake-pattern detection guard. Do-not-touch.
- `runtime/authorities/identity_authority.py:4` — docstring of the authority itself.
- `runtime/cognitive/supervisor.py:58` — plan_id request-scoped reasoning nonce, never persisted as canonical artifact.
- `runtime/kernel/workers/qdrant_projection_worker.py:308,351,390` — Qdrant PointStruct storage point IDs (non-canonical use); only importer is scripts/mission_graph.py (no launcher).
- `CascadeProjects/infra/ui-next/src/lib/chats.ts:19,30` — client-side UI chat/message IDs.
- brainos trio (`orchestration/src/web_retrieval.py:82`, `google_drive_ingestion.py:126`, `constitutional/event_emitter.py:101`) — live inside the brainos mission-control app but write to brainos' own local `events` table; /events/unprocessed reads `repository_events`, so they never enter the PING canonical surface. Separate subsystem scope.
- Detectors (match the literal as a detection pattern, never mint): gateway/constitutional_blockers.js:308, gateway/replay_kernel_audit.js:168-178, gateway/verify/negative_path_verification.js:129-136, gateway/constitution_version_authority.js:234-235, ping-runtime/orchestration/generate_hygiene_report.js:297, intelligence_graph.js:211, knowledge_compiler.js:151, worker_registry.js:42/44, execution/mission_compiler.js:203, runtime/kernel/replay/forensics/constitutional_forensics.ts:23.
- `test_event_ingestion.py` — test file, excluded from sweep.

## DEAD -> archive candidates (do not delete; record with evidence)
H7-adjudicated (verified this wave: sole importer is dead root constitutional_runtime.py, which has zero importers/launchers):
- `./witness_worker.py` (52,63,122,129), `./lineage_worker.py` (65,76,135,142), `./observation_worker.py` (72,90,144), `./replay_worker.py` (82,138,145), `./constitutional_projection_worker.py` (52,70,140,147,149-151), `./claim_worker.py` (88,101,158,165), plus dispatcher `./constitutional_runtime.py`.
Verified dead this wave (no live importer, no launcher, no dispatcher registration; __main__ = manual hazard only):
- `./filesystem_worker.py` (93,110,165) — SQL-gen script.
- `./repository_event_layer.py` (44,129,165) — direct INSERTs into legacy `events` table.
- `./repository_scanner.py` (122,129) — direct INSERTs into legacy `events` table.
- `./mission_control_knowledge_apis.py` (85) — Flask app :8001, no launcher.
- `./destructive_recovery_certification.py` (131,132) — test-event inserter (TEST_OBJECT).
- `./runtime/constitutional/event_chain.py` (188,222) — zero importers.
- `./runtime/adapters/google_drive/google_drive_ingestion_adapter.py` (265) — zero importers.
- `./runtime/ingestion/drive_ingestor.py` (136) — zero importers.
- `./scripts/knowledge_event_bus.py` (34) — imported only by scripts/* with no launchers (dev tooling).

## Honest gaps
- No live-DB read performed (task constraint): the claim that dead workers' legacy `events`-table rows could never surface via /events/unprocessed rests on code reading (it SELECTs from `repository_events`), not a live DB check.
- brainos writes to a `crx_runtime`-default database that shares its name with the legacy kernel DB; table-level isolation (`events` vs `repository_events`/`ping_events`) verified in code only.
- The uuid5 derivation is deterministic-identity, not a literal call into IdentityAuthority (unreachable in the worker container without touching the adjudicated H9 Dockerfile); noted in code comments. If Nolan later allows the Dockerfile change, the cleaner fix is vendoring the authority into the worker image.
- Supplementary sweep covered uuid1/uuid3, crypto.randomUUID(), and Rust Uuid::new_v4: no additional live mints found.
