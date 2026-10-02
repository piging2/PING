# L3 — Other Authorities Forensics (§18 charter)
**Date:** 2026-09-30 ~11:15 MDT | **Investigator:** L3 subagent (read-only)
**Repos examined (live):** `/home/nolan/ping` (canonical event core)
**Reachability:** Pig reachable via `pigwsl-exec` (base64 transport; single quotes safe, multi-word grep patterns must be quoted).

## HEADLINE CAVEATS (affect every finding below)
1. **Wrong branch vs task brief.** `/home/nolan/ping` is on `lane-b/tenant-dispatch-threading` @ `546b62d76` ("wip: commit stranded work 2026-09-29 (wave4 integration-ledger sweep)"), NOT `refactor/runtime-authority-convergence` as the task brief stated. All findings are against the lane-b HEAD. **Grade: PROVEN** (`git branch --show-current`, `git log --oneline -1`).
2. **Tree is being actively mutated.** Interval-10 writers are working this tree right now: several greps transiently returned "No such file" for files that provably exist (e.g. `gateway/replay_verifier.js`, `gateway/streaming_authority.js`, `mission_control_knowledge_apis.py`) when run inside combined commands. Findings are timestamped; re-verify before acting on any single file.
3. **`/home/nolan/projects/ping-constitutional` does not exist** (task brief said FYD adapter lives there). `/home/nolan/projects/` contains: `CRX_REMOTE, constitutional-runtime, fyd-design-baseline, fyd-editorial-template, happy-place-platform(-forensic), pigwork, ping (Next.js site), ping-fyd-converged(-i07), ping-wave2-ownerloop, ping-website, ping-worktrees, ping-ws4-converge`. **Grade: PROVEN absent; NEEDS-REVERIFY** if the adapter moved.
4. **Worktree noise.** ~3228 "Witness"-matching files repo-wide; 2995 of them sit under `/home/nolan/ping/worktrees/` (71 stranded worktrees). All searches below exclude `worktrees/`, `node_modules/`, `.git/`, `dist/`, `build/`.
5. JWT/"claims" false positives: searches used case-sensitive `Claim`; the counted hits are domain claims, not JWT claims. **Grade: PROVEN no JWT-claim contamination in the cited set.**

---

## 1. WITNESS AUTHORITY

### WHO-block
- **Decides (attest vs refuse):** `WitnessWorker.handle()` — `ping-runtime/workers/canonical_workers.js:504-581`. Failure-honesty gate (W7) at :522-560: refuses attestation on unverified/incomplete replay, emits `WITNESS_REJECTED`; evidence qualification at `_replayEvidenceQualifies` (:592+).
- **Writes the witness root:** `DeterministicReplayEngine` → `WitnessAuthority.computeWitnessRoot` in `gateway/replay/kernel/witness_authority.js:94` (12-leaf Merkle, normative per phase16 W-2).
- **Writes the persisted attestation:** `WitnessWorker` builds the `WITNESS_CREATED` payload **inline** at `canonical_workers.js:563-578` (documentId, eventType, timestamp, attestation string) — **bypasses** the `witnessAuthority` singleton.
- **Reads:** `ReplayWorker` reads kernel replay results (`canonical_workers.js:349` `witness_root: kernelResult.witness_root`); `replay_verifier.js:40` holds the singleton for verify passes.
- **Verifies:** `WitnessWorker._replayEvidenceQualifies` (canonical_workers.js:592+); `verifyWitness` on the singleton (used by e.g. `streaming_authority.js:215,226`).
- **Persists:** `ping_events` rows via `BaseWorker._emit('WITNESS_CREATED', ...)` (canonical_workers.js:570-576).
- **Bypass (PROVEN):** the executed attestation path (`WITNESS_CREATED` rows) never calls `witnessAuthority.createWitness` — `WitnessWorker` constructs the attestation object inline at `canonical_workers.js:563-578`. The "Single Witness Authority" (`gateway/witness_authority.js`) is the authority for ~60 gateway authorities' constitutional-result witnesses (e.g. `streaming_authority.js:170,200`), but NOT for the event-path attestations.

### Classification
| Implementation | File:line | Class |
|---|---|---|
| Executed Merkle witness-root authority (12-leaf) | `gateway/replay/kernel/witness_authority.js:94` (`computeWitnessRoot`), required by `gateway/replay/kernel/deterministic_replay_engine.js:19`, `:28` (index) | **CANONICAL_AUTHORITY** (executed replay path) |
| Authority-result witness (createWitness/verifyWitness) | `runtime/kernel/authorities/witness_authority.js` (class at top, `createWitness` ~:34); `gateway/witness_authority.js:31` is a **shim** re-exporting it (PATCH_004) | **CANONICAL_AUTHORITY** (gateway constitutional-result path) — distinct semantics from the Merkle root, so not a duplicate per collapse-authority-not-semantics |
| TS 13-leaf design | `runtime/kernel/replay/witness_authority.ts:26` (class), `generateWitness` :36; imported only by `deterministic_replay_engine.ts:18`, `constitutional_self_check_core.ts:25`, `index.ts:20` in the same TS tree; **no live JS require chain** | **DORMANT** (design document; phase16 W-2 independently proved the TS tree is unexecuted and hash-domain-incompatible with the executed JS — 12-leaf JS vs 13-leaf TS, Node-crypto domain separation vs lossy UTF-8 round trip) |
| WitnessRecorder (Ed25519) | `gateway/witness_recorder.js` (class `WitnessRecorder`, `record` ~:23); required only by `gateway/authority_registry.js:50` and `constitutional_replay_integration_harness.js` — `authority_registry.js` itself has **no requirers** in `gateway/bootstrap/` or `ping-runtime/` | **DORMANT** (unwired chain) |
| witness_generator.js / generator_witness.js | required by `test/constitutional_failure.test.js`, `gateway/adapter_compiler_v2.js` | **DERIVED** (test/adapter tooling) |
| Sibling origin | `constitutional-runtime/runtime/witness_authority.py:48` (class), `runtime/kernel/replay/witness_authority.ts:26` | **DORMANT** (sibling repo is not deployed) |

**Duplicates found:** the two live `WitnessAuthority` classes are semantic-distinct (Merkle replay root vs constitutional-result witness) — correctly NOT collapsed. The TS `runtime/kernel/replay/witness_authority.ts` is a true **DUPLICATE-in-name** of the executed `gateway/replay/kernel/witness_authority.js` with **divergent behavior** (13-leaf vs 12-leaf, incompatible hash domains); adopting it would fork every historical witness root (phase16 W-2 verdict).

---

## 2. EVIDENCE AUTHORITY

### WHO-block
- **Decides:** `EvidenceAuthority.verify()` — `ping-runtime/evidence/evidence_authority.js:61+` returns `{verified, reason, checks}` (hash recompute via injected `canonicalObjectVerifier`, lineage + namespace consistency, Qdrant-hit trace-back to `ping_events`).
- **Writes:** nothing — explicitly ADD-only reads (header comment :14-15: "this authority never mutates events, only reads").
- **Reads:** `HybridSearch` holds it as the verify leg — `ping-runtime/search/hybrid_search.js:22-27` (`this._evidence = options.evidenceAuthority`); instantiated live in `gateway/bootstrap/gateway_runtime.js:544-551` with `pool`, `eventRuntime`, `canonicalObjectVerifier: verifyCanonicalObject`, composed into `HybridSearch` at :548-552.
- **Verifies:** self (verify/accumulate/rank); `EvidenceAuthority.rank` down-ranks rejected nodes (per `knowledge_promoter.js` header contract).
- **Persists:** nothing.
- **Bypass:** none found in the serving path; construction is the only wire point (`gateway_runtime.js:544`).

### Classification
| Implementation | File:line | Class |
|---|---|---|
| EvidenceAuthority (retrieval verification) | `ping-runtime/evidence/evidence_authority.js` (class ~:18; `accumulate` :48, `verify` :61) | **CANONICAL_AUTHORITY** (live in gateway bootstrap) |
| `Dispatcher.collectEvidence` | `ping-runtime/orchestration/dispatcher.js:157` — aggregates worker outputs into `{batchId, worker_count, findings, consensus}` | **NOT AN AUTHORITY** — semantic collision on the word "evidence"; it aggregates worker confidence scores. Name-only overlap; do not collapse. |
| Compiler evidence store | `constitutional-compiler/evidence/evidence-store.ts` (enum `EvidenceType` ~:30, interface `Evidence` ~:36; "legal brief" findings) | **DERIVED** (compiler-domain findings; disjoint from runtime retrieval evidence) |
| Evidence interface (identity kernel) | `runtime/kernel/identity/evidence.ts` (interface `Evidence extends CanonicalObject` ~:18) | **INTERFACE** (TS design tree; no live JS consumer) |
| ConstitutionalVerificationAuthority | `ping-runtime/evidence/constitutional_verification_authority.js` (verifyArtifact pipeline ~:20-35); required by dormant `gateway/replay_authority.js:27` | **ADAPTER-adjacent / DORMANT** — artifact gate (bytes/hash/identity/lineage/witness/certificate), different semantic from retrieval verification; its only consumer is the dormant ReplayAuthority |

**Duplicates found:** none live. Three same-word-different-meaning items (`collectEvidence`, compiler `evidence-store`, `Evidence` TS interface) are correctly separate.

---

## 3. CLAIM AUTHORITY

### WHO-block
- **Decides:** nobody — there is **no ClaimAuthority class in live code**. Claims are produced by transform, not decided.
- **Writes:** `ClaimWorker.handle()` — `ping-runtime/workers/canonical_workers.js:140-167` builds the claim object inline (`documentId, eventType, timestamp, source`) and emits `CLAIM_CREATED` at :159-164. Registered for `OBSERVATION_CREATED`/`CLAIM_GENERATE` at :874.
- **Reads:** `ClassificationWorker` (`canonical_workers.js:875` consumes `CLAIM_CREATED`/`CLASSIFICATION_CREATE`), `runtime/kernel/execution/replay_decision_authority.js:13` (replay decisions on `CLAIM_CREATED`), `ping-runtime/orchestration/event_to_mission_bridge.js:60` (maps `CLAIM_CREATED` → `CLASSIFICATION_CREATE` mission), `ping-runtime/jev/shadow_worker.js:4` (JEV shadow observes), `ping-runtime/embeddings/embedding_service.js:27` (projection subscription).
- **Verifies:** nobody verifies claim truth; downstream `WitnessWorker` refuses to attest claims-as-evidence ("A bare { verified: true } is a claim, not evidence" — `canonical_workers.js:588-592`).
- **Persists:** `ping_events` rows via `BaseWorker._emit`.
- **Bypass:** N/A — no authority to bypass; the only "ClaimAuthority" text in the tree is a pipeline-label string.

### Classification
| Implementation | File:line | Class |
|---|---|---|
| `ClaimAuthority` mention | `runtime/constitutional_event_loop.py:12` (docstring pipeline list), `:200` (logger.info pipeline string "…→ ClaimAuthority →…") | **INTERFACE** at best — a label in a legacy Python loop's log line; **no class, no implementation**. Effectively **DORMANT** as an authority concept. |
| ClaimWorker (JS) | `ping-runtime/workers/canonical_workers.js:140` | **DERIVED** mechanism (worker transform), not an authority |
| claim_worker.py | `/home/nolan/ping/claim_worker.py` (class `ClaimWorker`, psycopg2, emits `CLAIM_GENERATED`) | **LEGACY** — superseded; `gateway/generated/event_generator.js:244` documents `CLAIM_GENERATED` retained only for SQL CHECK compatibility |

**Duplicates found:** none. "Claim Authority" is a named-but-never-implemented concept.

---

## 4. KNOWLEDGE AUTHORITY

### WHO-block
- **Decides:** only the human — `KnowledgePromoter` (`ping-runtime/knowledge/knowledge_promoter.js:28-60`) transitions node lifecycle on human signals (`SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` → confidence 1.0 approved; rejected → 0.2). Wired in `gateway_runtime.js:521`.
- **Writes:** `KnowledgeGraph.addNode` — `ping-runtime/knowledge/knowledge_graph.js:30` (class); called from `gateway_runtime.js:619` on `GRAPH_PROJECTION_EVENTS` (event projections); `updateNodeBySourceEvent` by KnowledgePromoter.
- **Reads:** `HybridSearch` (context leg, `gateway_runtime.js:552`), `gateway/routes/knowledge.js` via `services.knowledgeGraph` (`gateway_runtime.js:813-814`).
- **Verifies:** `EvidenceAuthority.rank` down-ranks rejected nodes (cross-authority contract in `knowledge_promoter.js` header).
- **Persists:** Postgres `knowledge_nodes` / `knowledge_edges` (DDL in `knowledge_graph.js:42-80`).
- **Bypass:** none found; the header documents the confidence contract (only authorized recompute is human approval).

### Classification
| Implementation | File:line | Class |
|---|---|---|
| KnowledgeGraph | `ping-runtime/knowledge/knowledge_graph.js:30` | **CANONICAL_AUTHORITY** (sole production store; header: "replaces 5+ dead knowledge implementations") |
| KnowledgePromoter | `ping-runtime/knowledge/knowledge_promoter.js` (class :28) | **DERIVED** (worker executing human-approval transitions) |
| Top-level `knowledge/` dir | `/home/nolan/ping/knowledge/` — **empty** | **DORMANT** (vestigial) |
| mission_control_knowledge_apis.py | root, Flask+psycopg2+Qdrant prototype dated 2026-06-23 | **LEGACY** (superseded by KnowledgeGraph + `/knowledge` routes) |
| RepositoryKnowledgeIndex | `/home/nolan/ping/RepositoryKnowledgeIndex` (dir) | **UNKNOWN** — not opened this pass; needs a look |
| presentping knowledge-relationships | `presentping/config/knowledge-relationships.js` | **DERIVED** (presentation config, not the store) |
| Sibling duplicates | `constitutional-runtime/runtime/knowledge/capability_ontology.py:91`, `knowledge/entity_graph.py:155` (both `class KnowledgeGraph`) | **DORMANT** (sibling repo) |

**Duplicates found:** the 5+ dead implementations the header cites are already demoted; the only live KnowledgeGraph is `ping-runtime/knowledge/knowledge_graph.js:30`.

---

## 5. REPLAY AUTHORITY

### WHO-block (executed path)
- **Decides:** `ReplayWorker` (`canonical_workers.js`) — verifies kernel result (`verified`, W-2 `completeness`); refuses incomplete windows.
- **Writes:** `DeterministicReplayEngine` — `gateway/replay/kernel/deterministic_replay_engine.js:19` (requires `./witness_authority`); invoked via `KernelReplayExecutionProvider` — `gateway/kernel_replay_execution_provider.js:14`; provider instantiated in `gateway_runtime.js:515` and handed to ReplayWorker at :522.
- **Reads:** `WitnessWorker` (attestation), `replay_verifier.js` (verify passes over witnesses).
- **Verifies:** ReplayWorker verification + WitnessWorker evidence qualification.
- **Persists:** `REPLAY_COMPLETED` / `WITNESS_CREATED` rows in `ping_events`.
- **Bypass:** none on the executed path.

### Classification
| Implementation | File:line | Class |
|---|---|---|
| DeterministicReplayEngine + kernel provider | `gateway/replay/kernel/deterministic_replay_engine.js`, `gateway/kernel_replay_execution_provider.js:14` | **CANONICAL_AUTHORITY** (executed replay; phase16 W-2 regression-pinned) |
| ContinuousReplayAuthority | `gateway/continuous_replay_authority.js` (ReplayCertificate schema ~:43; class below) — **zero requirers** repo-wide | **DORMANT** |
| ReplayAuthority (port-injected) | `gateway/replay_authority.js:31` — instantiated only by `gateway/compiler_lineage_authority.js:26` and `gateway/replay_runtime.js:33`; **neither file is required by anything live** (no hits in `gateway/bootstrap/`, `ping-runtime/`, or repo-wide require scan) | **DORMANT** (despite its "Single replay authority" header claim) |
| replay_worker.py / projection_replay.py | root Python workers (psycopg2/Qdrant) | **LEGACY** (superseded by JS canonical workers) |
| Sibling | `constitutional-runtime/runtime/kernel/replay/replay-authority.ts:21` | **DORMANT** |

**Duplicates found:** `ReplayAuthority` (`gateway/replay_authority.js:31`) vs `ContinuousReplayAuthority` (`gateway/continuous_replay_authority.js`) vs the executed `DeterministicReplayEngine` — three replay "authorities", only the engine is live. The file literally claiming "Single replay authority for all replay operations" is the dormant one.

---

## 6. MISSION AUTHORITY

### WHO-block (executed path)
- **Decides:** `MissionRuntime` + `MissionScheduler` — `ping-runtime/orchestration/mission_runtime.js:32` (class; tenant fail-closed at :25-31 `requireMissionTenantId`), `ping-runtime/orchestration/mission_scheduler.js:97` (class; polls MissionRuntime, dispatches via `WorkerRuntime.dispatch` — :46-53, :101-119). Wired in `gateway_runtime.js:556+`.
- **Writes:** `MissionRuntime` (mission lifecycle → `ping_missions` table, DDL at `mission_runtime.js:46+`); `event_to_mission_bridge.js:60` maps events (incl. `CLAIM_CREATED`) to missions.
- **Reads:** `MissionScheduler` (poll loop); `WorkerRuntime` (execution).
- **Verifies:** dispatch receipts (WR fail-closed repair; `worker_runtime.js:69-92`).
- **Persists:** Postgres `ping_missions`.
- **Bypass:** none on the executed path.

### Classification
| Implementation | File:line | Class |
|---|---|---|
| MissionRuntime / MissionScheduler | `ping-runtime/orchestration/mission_runtime.js:32`, `mission_scheduler.js:97` | **CANONICAL_AUTHORITY** (live mission lifecycle + dispatch) |
| automatic_mission_generator.js | `gateway/automatic_mission_generator.js` (Phase 36H watcher-driven; requires shim `witness_authority` at :31) — **zero requirers** | **DORMANT** |
| mission_generator.js | `gateway/mission_generator.js` — required only by `gateway/constitutional_acquisition_runner.js:26`, which itself has **zero requirers** | **DORMANT** (dormant consumer chain) |
| mission_authority_v2.js / mission_execution_authority.js | referenced only in `ping-runtime/orchestration/mission_scheme_convergence.test.js:76` (file-path list) | **DORMANT** |
| mission_planner.js | no live requirers | **DORMANT** |

**Duplicates found:** five dormant mission-generator concepts (`automatic_mission_generator`, `mission_generator`, `mission_authority_v2`, `mission_execution_authority`, `mission_planner`) vs one live (`MissionRuntime`/`MissionScheduler`). No live duplication — the convergence work is done; the dormant files are the residue.

---

## 7. WORKER / CAPABILITY AUTHORITY

### WHO-block
- **Decides (worker selection):** `WorkerRuntime.dispatch` — `ping-runtime/workers/worker_runtime.js:93-126`: matches on `eventTypes` only; **capabilities registered at :38 are never consulted in dispatch** (stored metadata + reported in `getStats` at :152).
- **Writes:** workers write via `BaseWorker._emit` → `ping_events`.
- **Reads:** `MissionScheduler` (sole dispatch path — `worker_runtime.js:50`); 8 canonical workers registered in `gateway_runtime.js:511-523` (IntelligenceWorker dormant per comment).
- **Verifies:** dispatch receipts, fail-closed on unknown worker (`worker_runtime.js:69-92`).
- **Persists:** N/A (dispatch is in-memory; effects persist via events).
- **Capability grants:** `tenant_capability_grant.js` (W5) is a validator that **explicitly disclaims authority** (header: "This is NOT an authority"). Its only real consumer is its own test (`runtime/test_tenant_capability_grant.js`); `feedback_contract.js:51` mentions it in a **comment only** ("mirrors tenant_capability_grant.js") — no require. **No live code issues or verifies capability grants; nothing in the dispatch path checks them.** This is the enforcement gap adjacent to Interval-10 T2 (tenant binding) — recorded here as observed fact, not a patch proposal.
- **Bypass (PROVEN):** `WorkerRuntime.dispatch` ignores `capabilities` — any registered worker matching `eventTypes` runs regardless of its declared capabilities. Capabilities are labels, not enforcement.

### Classification
| Implementation | File:line | Class |
|---|---|---|
| WorkerRuntime | `ping-runtime/workers/worker_runtime.js:14` | **CANONICAL_AUTHORITY** (sole dispatch) |
| CapabilityAuthority | **absent** — full-tree grep for `class CapabilityAuthority` in live JS/TS: zero hits | **NOT PRESENT** in `/home/nolan/ping` |
| capability_scheduler.js | `runtime/kernel/authorities/capability_scheduler.js` — referenced only by `gateway/test_p040_generated_authoritative.js` | **DORMANT** |
| tenant_capability_grant.js | `ping-runtime/runtime/tenant_capability_grant.js` (grant schema + validator) | **INTERFACE** (grant vocabulary + validation; self-declared non-authority; unwired) |
| Sibling CapabilityAuthority | `constitutional-runtime/runtime/kernel/capabilities/capability-authority.ts:6` (`implements ICapabilityAuthority`), `notification/capability_authority.py:102` | **DORMANT** (sibling repo only) |
| Dockerfile.worker-runtime | repo root | build artifact for the worker runtime; not an authority |

**Duplicates found:** none live — but note the **absence**: capability is the one lane where the authority concept exists only in the dormant sibling and as an unenforced label in the live system.

---

## Deployment copies (not authorities)
- `/home/nolan/ping-gateway-src/` — stale copy of gateway+ping-runtime; `gateway/witness_authority.js` is the same PATCH_004 shim (md5 differs from canonical — trailing-byte drift, not semantic). **STALE COPY.**
- `/home/nolan/ping-gateway-build/gateway/` — contains only `routes/`; partial build artifact. **STALE/PARTIAL.**

## NEEDS-REVERIFY
1. Task-brief branch mismatch: all findings are against `lane-b/tenant-dispatch-threading@546b62d76`, not `refactor/runtime-authority-convergence`. Re-verify on the intended branch if the parent needs that baseline.
2. `/home/nolan/projects/ping-constitutional` does not exist — FYD adapter location unknown.
3. `RepositoryKnowledgeIndex/` (root dir) not opened — classification UNKNOWN.
4. `witness_registry.js`, `replay_certificate_authority.js`, `replay_certificate.js` — consumers of the live singleton; not traced into `gateway_runtime.js` wiring. Liveness of the certificate path unconfirmed.
5. Transient "file not found" greps mid-session (active writers) — any single file:line above should be re-confirmed at read time before enforcement action.
