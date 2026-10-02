# Recon A: Witness Forensics Baseline (re-verified 2026-09-18/19)

Scope: independent re-verification of the planning program's witness claims against
LOCAL_WORKTREE source at /home/nolan/worktrees/constitutional-convergence
(branch constitutional-convergence-v2, HEAD 84da2d40c), contrasted with
LIVE_RUNTIME (Pig container ping-gateway:devin-boundary2, up 26h, inspected
read-only via docker exec). PUBLIC_GITHUB was not consulted; no claim below
rests on it. Read-only law observed throughout: no edits, no commits, no
restarts, no DB writes.

Reachability method: static require-graph closure from the live entry points
(gateway/server.js + gateway/bootstrap/gateway_runtime.js), 183 files. A file
is REACHABLE only if a require path exists from those entries. DORMANT is used
only with that proof (or a dead container / absent launcher); otherwise
UNKNOWN.

Layer key: LOCAL_WORKTREE = worktree HEAD 84da2d40c. LOCAL_BRANCH =
constitutional-convergence-v2 history. LIVE_RUNTIME = devin-boundary2 container.

## Claims verdict table

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| (a) | WitnessWorker in ping-runtime/workers/canonical_workers.js is the sole live WITNESS_CREATED emitter | VERIFIED (worktree and live container) | git grep `_emit('WITNESS_CREATED'` over non-test JS returns exactly one hit: ping-runtime/workers/canonical_workers.js:514. Python emitters (witness_worker.py:58-70, workers/witness_worker.py) are provably unreachable: no JS require path, constitutional_runtime.py launched by nothing, ping-worker-runtime container Exited (255) 2 weeks ago. Live container's /app/ping-runtime/workers/canonical_workers.js:514 is likewise its sole emitter, but it is the PRE-fix version. |
| (b) | WITNESS_CREATED does NOT contain witness_root at current HEAD | FALSIFIED (worktree) / TRUE (live container) | Commit 84da2d40c added the binding. canonical_workers.js:496 `const witnessRoot = payload.replay.witness_root;` then lines 499-507 emit `witness: { ..., witness_root: witnessRoot, replay_fingerprint, ... }` inside WITNESS_CREATED (line 514). Live container predates the fix: its WitnessWorker builds `witness` with no witness_root field (verified via docker exec). |
| (c) | The worker checks a verified flag without independently verifying the root | VERIFIED | canonical_workers.js:472 `const replayVerified = payload.replay && payload.replay.verified === true;` is the only gate. Line 496 copies `payload.replay.witness_root` verbatim. The file's only imports are constitutionalTimeAuthority (line 18) plus intelligence/knowledge workers (lines 685, 696); no hash, no Merkle, no verifyWitness call anywhere in WitnessWorker. Same holds in the live container. |
| (d) | Compiled live replay root has 12 leaves while TS source describes 13 | VERIFIED | Compiled gateway/replay/kernel/witness_authority.js:96-157 lists 12 base leaves (14 toWitnessLeafId sites including leaf_count and tree_height); no `constitutional_law_commitment`. TS runtime/kernel/replay/witness_authority.ts:131-198 lists 13 base leaves, the extra one `constitutional_law_commitment` at line 193. The live path (gateway/kernel_replay_execution_provider.js:16 requires ./replay/kernel/deterministic_replay_engine, the compiled JS) therefore produces 12-leaf roots. Live container's copy also shows 14 sites and no constitutional_law_commitment. |
| (e) | Legacy witness authority is dormant with no live instantiators | FALSIFIED as stated (nuance below) | gateway/witness_authority.js (shim over runtime/kernel/authorities/witness_authority.js) IS in the live require closure: required by gateway/dead_letter_authority.js:34, which is required by gateway_runtime.js:90 and instantiated in the live bootstrap; dead_letter_authority.js:155 calls `witnessAuthority.createWitness(deadLetter, ...)`. It is live ONLY as a DLQ-record hashing utility. It never emits or verifies WITNESS_CREATED or replay roots: zero live callers of verifyWitness / verifyWitnessRoot exist (all ~25 verifyWitness call sites sit in files outside the live closure). |
| (f) | Event cert ce3f8687 covers database sequence and replay authority; confirm the commit exists in the branch and its 4 changed paths | VERIFIED | ce3f8687c5c41bc19bdd58030b7fe3cf7d494cf4 exists on constitutional-convergence-v2, dated 2026-09-18 18:19:58, message "cert(events): database sequence and replay authority". Exactly 4 paths: EVIDENCE_LEDGER.md, OPERATING_SPEC.md, ping-runtime/events/unified_event_runtime.js, certification/event-sequence-replay/sequence_replay_cert.js. |

## Section findings (1-16)

### 1. Live WITNESS_CREATED emitters
- ping-runtime/workers/canonical_workers.js:514 (WitnessWorker.handle, via this._emit). LIVE_CANONICAL. Registered by registerCanonicalWorkers (line 731, eventTypes ['REPLAY_COMPLETED']), called from gateway_runtime.js:524. Sole emitter repo-wide in non-test code.
- witness_worker.py (root, lines 58-70) and workers/witness_worker.py: emit WITNESS_CREATED via psycopg2-era code. LEGACY. Provably not live: no require path from live entries; only instantiator is constitutional_runtime.py:136 which is itself UNREACHABLE (no launcher, script, compose service, or Dockerfile references it); the Python worker container ping-worker-runtime is Exited (255).

### 2. WITNESS_REJECTED emitters
- canonical_workers.js:479 (`unverified_replay:<reason>`) and :493 (`missing_witness_root`). LIVE_CANONICAL. No other emitters in non-test code. Consumers are read-only: gateway/routes/mission_control.js:532,572,597 (/mc/witness/stats, /mc/replay/trace).

### 3. REPLAY_COMPLETED producers
- canonical_workers.js:265 (no replay provider), :307 (kernel threw), :351 (kernel result) in ReplayWorker.handle. LIVE_CANONICAL.
- ping-runtime/agents/replay_worker.js:21 (`tx.outbox.append('REPLAY_COMPLETED', ...)`). DORMANT (proven: outside the live require closure; no instantiator found).

### 4. witness_root production path (replay kernel to REPLAY_COMPLETED)
ReplayWorker.handle (canonical_workers.js:283) calls `this._replayProvider.executeReplay(transcript)`.
Provider is KernelReplayExecutionProvider (gateway/kernel_replay_execution_provider.js), constructed at gateway_runtime.js:523 and injected via registerCanonicalWorkers.
Provider (line 16) requires ./replay/kernel/deterministic_replay_engine (compiled JS).
DeterministicReplayEngine.replay() (deterministic_replay_engine.js:56) calls WitnessAuthority.generateWitness, which calls computeWitnessRoot (witness_authority.js:94): 12 base leaves + leaf_count + tree_height, MerkleTree (line 175), getRootHash (line 176).
Provider maps the result at kernel_replay_execution_provider.js:150-153: `witness_root: result.witness_root?.witness_root || result.witness_root`, plus leaf_count/tree_height.
ReplayWorker binds it at canonical_workers.js:330: `witness_root: kernelResult.witness_root || null` into payload.replay.
WitnessWorker then copies it at :496 into the WITNESS_CREATED attestation (post-84da2d40c).
Full chain LIVE_CANONICAL at worktree HEAD. Note the 12/13-leaf divergence (claim d) sits inside this chain.

### 5. Live bootstrap path for workers
- Entrypoint: `node gateway/server.js` (gateway/package.json: main server.js, scripts.start `node server.js`).
- server.js constructs GatewayRuntime (gateway/bootstrap/gateway_runtime.js); `runtime.start(port)` listens on 0.0.0.0 (line 829).
- Bootstrap sequence: UnifiedEventRuntime, WorkerRuntime (ping-runtime/workers/worker_runtime.js, line 490), KernelReplayExecutionProvider (line 523), registerCanonicalWorkers(workerRuntime, { eventRuntime, replayProvider, ... }) (line 524), MissionScheduler.start() (line 571), EventToMissionBridge.start() (line 590), DeadLetterAuthority (lines ~550-556).
- Launchers observed: start_gateway.ps1 / start_gateway.vbs (Windows, PORT 8080, direct node). The actual LIVE_RUNTIME is the Docker container ping-gateway:devin-boundary2 (up 26h), which runs PRE-fix code (see divergences below).
- Classification: LIVE_CANONICAL.

### 6. WorkerRuntime dispatch path for WITNESS missions
- ping-runtime/workers/worker_runtime.js:69 dispatch(event): a worker is selected iff `entry.eventTypes.length > 0 && entry.eventTypes.includes(event.event_type)` (line 78); sets `entry.worker._event = event` before handle, clears after (lines 86-92). Line 50 comment: "Workers receive events via dispatch() only (MissionScheduler is the single dispatch path)."
- WitnessWorker registered with eventTypes ['REPLAY_COMPLETED'] (canonical_workers.js:731).
- Consequence: a mission dispatched as event_type WITNESS_CREATE matches no worker; dispatch returns null; the scheduler fails it ("no worker matched", mission_scheduler.js:321-327). LIVE_CANONICAL.

### 7. MissionScheduler event_type fallback
- Guard first: mission_scheduler.js:238 `const workerName = MISSION_WORKER_MAP[mission.mission_type]; if (!workerName) { skip; return; }`. Since 91e1337f4, WITNESS_CREATE is absent from the map, so a WITNESS_CREATE mission is skipped before any dispatch. The automatic bridge entry was removed in the same commit (event_to_mission_bridge.js diff: `REPLAY_COMPLETED: { missionType: 'WITNESS_CREATE' }` deleted).
- The fallback itself still exists and is live: line 286 `event_type: payload.event_type || mission.mission_type`. Classification of the fallback code: LIVE_CANONICAL. Reachability for a WITNESS_CREATE mission_type: blocked at the guard (DORMANT path, proven by the guard, not by absence of callers).
- Surprise (see section 8): the fallback lets a mission claimed under a VALID mission_type be dispatched as an attacker-chosen event_type.

### 8. Manual mission API reachability
- Surface: `POST /missions` (gateway/routes/missions.js:22-30) reads { missionType, payload, priority, createdBy } and calls missionRuntime.create. Mounted at gateway_runtime.js:812 (`/missions` when services.missionRuntime exists). Gateway listens on 0.0.0.0 (line 829). No auth middleware anywhere in _setupMiddleware (lines 113-125: only express.json + CORS). /mc (mission_control.js) exposes no POST routes at all. Classification: LIVE_CANONICAL, unauthenticated.
- MissionRuntime.create (mission_runtime.js:68): no missionType validation, no namespace/capability check; inserts any mission_type string into ping_missions (idempotent by sha256 hash).
- Scheduler barrier: unknown mission_type (WITNESS_CREATE, WITNESS) is created but skipped forever at the MISSION_WORKER_MAP guard. Submission is REACHABLE_NONCANONICAL; witness production through it is blocked.
- Fabricated-witness route (REACHABLE_NONCANONICAL, proven by code trace): submit mission_type='REPLAY_VERIFY' (valid map entry, claims the 'replay' worker) with payload.event_type='REPLAY_COMPLETED' and payload.payload.replay={verified:true, witness_root:'<chosen>'}. Scheduler passes the guard, builds the dispatch event with event_type='REPLAY_COMPLETED' via the line-286 fallback, WorkerRuntime.dispatch routes it to WitnessWorker (the only worker whose eventTypes include REPLAY_COMPLETED), and WitnessWorker emits WITNESS_CREATED binding the caller-chosen root, because it checks only the verified flag (claim c) and performs no independent verification. Namespace on this path: payload.namespace or undefined, defaulting to 'core::system' (unified_event_runtime.js:131); no allowlist on the worker emit path (the legacy-ingress capability and namespace format checks do not apply to worker emissions).
- At LIVE_RUNTIME the older, wider bypass is additionally open: mission_scheduler.js:50 still maps WITNESS_CREATE to 'witness', the bridge still maps REPLAY_COMPLETED to WITNESS_CREATE missions, and the worker still handles WITNESS_CREATE directly with no replay check (verified via docker exec).

### 9. Witness verification consumers
- Live consumers that VERIFY a witness root or WITNESS_CREATED attestation: NONE found. The compiled witness_authority.js:188 verifyWitnessRoot and gateway/replay/kernel/replay_verification.js:47 have no callers in the live closure (DORMANT). runtime/kernel/replay/node_self_check_adapter.ts:187 likewise (DORMANT; no TS loader in the live path).
- Live READERS (not verifiers): WitnessWorker itself (reads payload.replay.witness_root, copies it); /mc/witness/stats and /mc/replay/trace (mission_control.js, event-derived projections); DeadLetterAuthority (reads createWitness output hash for DLQ rows, not replay roots).

### 10. Witness ID producers
- runtime/kernel/authorities/witness_authority.js:98 `_generateWitnessId` (called from createWitness:66). LIVE_CANONICAL via DeadLetterAuthority (DLQ records only; stored in repository_dead_letters).
- canonical_workers.js:505: `attestation: witness-<event_id slice>` label inside WITNESS_CREATED. LIVE_CANONICAL (label, not a registered ID).
- gateway/inference_witness.js:29 `_generateWitnessId`: DORMANT (file outside live closure).
- Python witness_worker.py:31 generate_witness_root: LEGACY.

### 11. Witness hash producers
- gateway/replay/kernel/witness_authority.js:175-176 (MerkleTree.getRootHash): LIVE_CANONICAL (the replay witness_root).
- runtime/kernel/authorities/witness_authority.js:60 (CanonicalAuthority.hash of the witness sans hash field): LIVE_CANONICAL (DLQ witness hashes).
- CanonicalHashAuthority.computeFingerprint (fingerprint leaf): LIVE_CANONICAL via the engine.
- Python hashlib.sha256 in witness_worker.py: LEGACY.

### 12. Witness persistence stores
- ping_events (Postgres) via UnifiedEventRuntime.emit: LIVE_CANONICAL. WITNESS_CREATED and WITNESS_REJECTED rows.
- repository_dead_letters (Postgres) via DeadLetterAuthority.recordDeadLetter: LIVE_CANONICAL. Each row carries deadLetter.witness and witness_hash from the legacy WitnessAuthority.
- `witnesses` table via gateway/append_orchestrator.js:105: DORMANT (file outside live closure).
- `memory_witnesses` via gateway/memory_persistence_authority.js:251: DORMANT (outside live closure).
- In-memory Maps (gateway/authority_repository.js:154, adapter_authority.js:358, compiler_lineage_witness.js:66, generator_witness.js:66): DORMANT (all outside live closure).
- No dedicated witnesses table is written by the live worker path; attestation persistence is the ping_events row.

### 13. Legacy Python witness paths
- witness_worker.py (repo root): class WitnessWorker; handle_replay_executed (line 88) listens for REPLAY_EXECUTED (the pre-canonical event name), generate_witness_root (line 31, hashlib), store_witness (line 44, psycopg2), emit_witness_created_event (line 58). Instantiated only at constitutional_runtime.py:136.
- workers/witness_worker.py: variant imported lazily at kernel/event_dispatcher.py:77, dispatched by workers/worker_runtime.py which polls gateway /events/unprocessed over HTTP.
- Liveness: constitutional_runtime.py is referenced by no entrypoint, script, compose service, or Dockerfile. Dockerfile.worker-runtime + compose worker-runtime service (profiles dev/prod) target workers/worker_runtime.py, but the ping-worker-runtime container is Exited (255) (2 weeks ago) and the gateway it would poll is the live container. Classification: LEGACY, provably not executing.

### 14. In-memory event_queue witnessId passthrough
- ping-runtime/orchestration/execution/event_queue.js:74: `witness_id: data.witnessId || null`. The file is REACHABLE (ExecutionEngine instantiated at gateway_runtime.js:338, /orchestration routes mounted). The field is a pure passthrough: no producer anywhere passes witnessId, and all 20 committed queue fixture JSONs show `"witness_id": null`. Classification: LIVE_ADAPTER (live code, dormant field). It is unrelated to the WITNESS_CREATED event flow, which travels via UnifiedEventRuntime, not this queue.

### 15. authority_registry.ts consumers
- runtime/kernel/replay/authority_registry.ts: zero importers anywhere in the repo (verified by repo-wide grep for both the path and the module name); no compiled authority_registry.js exists under gateway/replay/kernel/; the live Node runtime has no TS loader. Classification: DORMANT (proven by absence of importers plus absence of compiled artifact plus no TS execution path). All gateway files mentioning "authority_registry" reference the distinct JS modules gateway/constitutional_authority_registry.js or gateway/authority_registry.js.

### 16. gateway verifyWitness callers and liveness
- ~25 call sites across gateway/constitutional_authority.js:183, execution_graph_authority.js:240, inference_witness.js:86, merkle_replay_graph.js:333, replay_certificate.js:125, replay_certificate_authority.js:133, replay_plan_authority.js:282, replay_transcript.js:160, replay_verifier.js:156-321, step_registry.js:154,183, streaming_authority.js:215,226, tool_gateway.js:339, verification_pipeline.js:15,27, witness_registry.js:92, and others. Every containing file is OUTSIDE the live require closure. Classification: DORMANT (proven per-file by the closure analysis, not by absence of callers).
- The reachable witness_authority (via dead_letter_authority.js:34) is used exclusively for createWitness; no live code calls verifyWitness on it.

## Worktree vs live runtime divergence (material)

| Surface | LOCAL_WORKTREE (HEAD 84da2d40c) | LIVE_RUNTIME (devin-boundary2) |
|---|---|---|
| WITNESS_CREATE mission path | Removed (91e1337f4): no map entry, no bridge entry, worker handles REPLAY_COMPLETED only | Still live: mission_scheduler.js:50, bridge:64, worker eventTypes ['WITNESS_CREATE','REPLAY_COMPLETED'], direct attestation without replay check |
| witness_root in WITNESS_CREATED | Bound (84da2d40c) | Absent |
| Replay leaf count | 12 (compiled) vs 13 (TS) | 12 (container copy verified: 14 toWitnessLeafId sites, no constitutional_law_commitment) |

Consistent with the standing constraint in memory: ping-gateway:devin-boundary2 runs the older event path; nothing may be certified against the worktree alone.

## Open questions / follow-ups for the parent
1. The POST /missions fabricated-witness route (section 8) is proven reachable by static trace but has not been executed; per read-only law no live test was run. It deserves a falsification test in a sandbox (does the scheduler actually dispatch payload.event_type, and does the worker emit?).
2. LIVE_RUNTIME predates both witness fixes; any claim about "the live system" must be qualified until the container is rebuilt or the finding is re-verified post-deploy.
3. PUBLIC_GITHUB was not consulted; the LOCAL_BRANCH vs PUBLIC_GITHUB relationship is unverified.
4. The /ingest route (createIngestRoutes) is another unauthenticated external event-injection surface; its interaction with the bridge (e.g. injecting REPLAY_COMPLETED-shaped business events) was not fully traced in this pass.
