# PING 24-HOUR READ-ONLY ARCHITECTURAL RECONNAISSANCE

**Date:** 2026-09-19 (MDT)
**Mode:** READ ONLY. AUDIT. TRACE. COMPARE. FALSIFY. RESEARCH. PROPOSE. DO NOT IMPLEMENT.
**Coordinator:** Pigi recon coordinator (subagent session)
**Scope:** Full program sections 0-47. No repository mutation of any kind was performed during this run.

**Frozen baseline (verified, never touched):**
- `ce3f8687c5c41bc19bdd58030b7fe3cf7d494cf4` - cert(events): database sequence and replay authority (2026-09-18 18:19:58 -0600)
- `91e1337f4197b5f5660dfd8866fb5d134836ef1b` - fix(witness): remove unverified creation bypass (2026-09-18 18:33:04 -0600)
- `84da2d40c9dae3c4f7c6070845e073b1471d245a` - fix(witness): bind replay root into attestations (2026-09-18 18:34:00 -0600)

---

## A. EXECUTIVE VERDICT

**The certified code is not the running code.** That is the single finding that reframes everything else in this report.

The P0 Event Authority certification (`ce3f8687`: database sequence + replay authority) and the two Witness repairs (`91e1337f4`: WITNESS_CREATE bypass removed; `84da2d40c`: witness_root bound, fail-closed) are real, verified, frozen achievements. They live in `/home/nolan/worktrees/constitutional-convergence` @ `84da2d40c`, byte-verified, with 17 local-only commits and nothing deployed. The production system is `ping-gateway:devin-boundary2`, a 2026-09-16 image whose source tree (`/home/nolan/ping-gateway-src`) is not in git. It runs the OLD UnifiedEventRuntime (64-hex Era-H IDs), has NO sequence column in `ping_events`, has no LegacyIngressAdapter, and still wires the OLD EventBridge leg that re-emits both `canonical_events` AND `repository_events` into `ping_events` - the exact retired repository leg that MC-1 froze as a defect. Live `ping_events` has 739 rows (Pig) / 2182 rows (Oracle) with zero ordering authority. **Every certified claim about sequence, replay order, and witness binding describes code that is not running.**

This is not an event-authority conflict. It is a promotion/provenance gap: the convergence program proved the right code and then stopped one step short of making it the running code, while nobody can currently answer "what source commit is the live image built from" without md5 forensics.

The rest of the recon, in priority order:

1. **Authority graph: mostly converged on paper, fragmented in code.** One decision/one owner holds for event acceptance (UnifiedEventRuntime), mission lifecycle (MissionRuntime), work-order authorization (authorizeWorkOrder), evidence verification (EvidenceAuthority). It FAILS for: event identity (four `event_` preimages share one namespace), capability (the named CapabilityAuthority is phantom; the de facto gate is an adapter allowlist), observation/claim (two live-ish planes, Python and JS, with divergent event names), result truth (binding/coherence only, never content), approval/effect (phantom classes; the only real effect path has no durable approval and no effect identity), execution durability (documented "Temporal owns it," actually owned by a 5s PING-side poll loop).

2. **Witness is conceptually converged; the artifact is not.** The 13-leaf TS source is semantically correct (it carries the `constitutional_law_commitment` leaf, the only true external policy binding). The live boot executes a 12-leaf compiled artifact that has never contained that leaf. Rebuild-from-source would silently change every historical root. The attestation also drops its own reproduction parameters (algorithm, versions, leaf count, engine version, input-set identity, truncation flags).

3. **Replay is replayable-today, not replayable-in-five-years.** Silent 10k input cap and silent malformed-envelope skips mean `verified:true` certifies "surviving events had no violations," not "the intended input set replayed whole." Per-attestation version binding is illusory (hardcoded `'1.0'` literals).

4. **ContextPack as model-independence boundary is FALSIFIED in the live gateway.** Two incompatible ContextPack types exist; the live gateway wires a direct Qdrant-to-Ollama RAG path with no pack, no authority resolution, no tenant scoping. The fixing commits (canonicalization, conflict-throw, tenant filter, contextPackId binding) sit unmerged on the codex branch.

5. **The knowledge compounding loop is open.** No negative knowledge states exist as code. No dependency graph from source change to affected claims. No targeted invalidation. The distill sweep is a scheduled process, not a mechanism. The single highest-leverage missing link is TARGETED RECOMPILE: a machine-maintained, content-addressed dependency graph from every derived claim back to its source inputs.

6. **Mission Control is mostly fiction.** The missions surface was honestly fixed (503-with-reason). Eight other surfaces fetch an `/api/*` contract that never existed in any gateway; `mock-data/` is still imported by ~20 components; 7 components hardcode `localhost:8080`. Eight fictional seed customers sit in production `ping_events` on Oracle.

7. **Oracle is healthy and oversized for stage 1.** 1 vCPU, 5.9 GiB RAM, 45G disk, ~87% idle. Minimum viable: Postgres + gateway + Qdrant, pinned digests, nightly pg_dump + rehearsed restore, append-only deployments.log. Nothing else belongs on this box yet.

8. **The source universe is the second risk.** 8 worktrees, 40+ remote branches, 80 unpushed harvest-12h commits, nested frozen worktrees, a detached bisect scratch, and a live image with no git provenance. The next "which implementation is real" dispute is already loaded.

**Bottom line:** PING does not need a new architecture. It needs (a) the proven code promoted into the running system with recorded provenance, (b) one authority per decision enforced where the code currently has two or zero, (c) the witness artifact rebuilt from its source with per-attestation binding, (d) durable approval/effect identity, and (e) the targeted-recompile dependency graph that turns the knowledge pipeline from a scheduled process into a compounding mechanism. The dependency-ordered plan (BD) sequences this; the smallest next unit (BH) makes "what is running" answerable first.

## B. READ-ONLY INTEGRITY STATEMENT

This run performed zero repository mutations. Methods used: `git log/show/diff/status/branch/worktree/grep/ls-tree/ls-files/rev-parse/rev-list/tag` (observational only); file reads via `cat/grep/sed/md5sum`; `docker ps/exec` (read-only) and `docker cp` reads; SELECT-only database queries using container-local environment (no credential values exposed, no writes); read-only SSH to Oracle (`uname`, `free`, `df`, `docker ps`); web text search/fetch for ecosystem sources. No source edits, no generated repo files, no commits/merges/pushes/branches, no dependency installs, no DB writes, no migrations, no service restarts, no Docker/Git installs, no Oracle deployment, no chmod/chown, no secret reads (private key material never printed; `.env` values never read; the 2 `exterior_agent_credentials` rows on Oracle were counted but not inspected), no cleanup, no `git reset`, no branch checkouts, no tests against shared state (one pure local computation over a local corpus JSON was executed to falsify a CRX claim; no shared-state tests were run), no external business/social/email actions, no production writes. Findings were written only to `/home/hatch/workspace/forensics/recon-2026-09-19/` (per-agent) and this report (outside all repositories). The frozen worktree, the three frozen commits, and all preserved WIP were not touched. OPERATING_SPEC.md was not updated. Where an experiment required mutation, the plan was written instead of executed (see AJ unknowns and section notes). Evidence hierarchy and maturity labels were applied per the program; anything that could not be verified from a higher evidence level is labeled UNKNOWN, never inferred.

## C. SOURCE UNIVERSE

**HEADLINE (Agent A):** The running production system is `/home/nolan/ping-gateway-src` (2026-09-16 snapshot, image `ping-gateway:devin-boundary2`) - NOT `/home/nolan/ping` and NOT the frozen constitutional-convergence worktree. Proven by byte-identical md5 between container `/app/...` and `/home/nolan/ping-gateway-src/...` on all three core files (unified_event_runtime.js, gateway_runtime.js, canonical_workers.js). The certified P0 Event Authority sequence code (ce3f8687) and witness fixes (91e1337f4, 84da2d40c) exist in the frozen worktree only and are NOT deployed. The live `ping_events` table has NO sequence column (739 rows).

All checkouts share remotes: `origin=https://github.com/ngesk2/crx-runtime.git` + `windows-preserve` mirror. Unpushed counts from `git rev-list --count HEAD --not --remotes`.

| LOCATION | BRANCH | SHA | LAST CHANGE | UNPUSHED | TOPIC | LIVE? | STRONGEST? | SUPERSEDED? |
|---|---|---|---|---|---|---|---|---|
| /home/nolan/ping | feature/approval-effect-identity | 88c9651be | 2026-09-17 19:07 | 0 (no upstream) | approval, effect identity | NO | not evaluated | main not merged; newer than live image |
| /home/nolan/worktrees/constitutional-convergence | constitutional-convergence-v2 | 84da2d40c | 2026-09-18 18:34 | 17 local-only | Event Authority P0 seq cert, Witness fixes | NO | STRONGEST for event authority + witness correctness (certified) | Certs NOT deployed; canonical-correct code, not live code |
| /home/nolan/worktrees/orca-autonomy | feature/orca-autonomy | ae55b77ff | 2026-09-18 12:05 | 10 local-only | ORCA docs, EventRepository-as-derived-adapter, durable objective identity | NO | STRONGEST for ORCA docs; ORCA runtime = DOCUMENTED_ONLY | not live anywhere |
| /home/nolan/worktrees/ping-codex-convergence | codex/context-workorder-convergence | 08c3036d9 | 2026-09-17 17:50 | 2 local-only | context-workorder convergence, temporal worker lifecycle | NO | unknown | not live |
| /home/nolan/worktrees/ping-event-runtime | event-runtime-deduplication | 1f40cf432 | 2026-09-18 05:44 | 0 | event ID collision detection | NO | STRONGEST for dedup | live has partial dedup (ON CONFLICT + isDuplicate gate), not this worktree's collision detection |
| /home/nolan/worktrees/ping-harvest-12h | sprint/harvest-12h | 8fe3b8060 | 2026-09-17 23:37 | **80 local-only commits** | context-pack compilation, workers, lineage (waves H77-H79) | NO | Most active sprint; newest context-pack code | Largest unpushed divergence anywhere |
| /home/nolan/worktrees/ping-oracle-deploy | oracle/deploy-2026-09-18 | 6b4222467 | 2026-09-18 18:23 | 30 local-only | Oracle UI/deploy (hide fixture-backed missions board) | NO | STRONGEST for Oracle UI truthfulness | not deployed to live |
| /home/nolan/ping/worktrees/agent-exec | sprint/agent-exec | 5b102c664 | 2026-09-15 18:23 | ? | agent exec, project resolver | NO | not evaluated | frozen 2026-09-15 |
| /home/nolan/ping/worktrees/agent-smoke-abc123def456 | recovery/agent-smoke-2026-09-16 | 3e0c3ddd1 | 2026-09-16 12:23 | ? | recovery smoke | NO | not evaluated | archived in place |
| /home/nolan/ping/worktrees/oracle-assembly | main | 5b102c664 | 2026-09-15 18:23 | ? | oracle assembly | NO | not evaluated | frozen 2026-09-15 |
| /home/nolan/ping/worktrees/playbook | sprint/playbook | 5b102c664 | 2026-09-15 18:23 | ? | playbook | NO | not evaluated | frozen 2026-09-15 |
| /home/nolan/ping/worktrees/python-prod | sprint/python-prod | 5b102c664 | 2026-09-15 18:23 | ? | python prod | NO | not evaluated | frozen 2026-09-15 |
| /tmp/bisect-eval006 | detached HEAD | ff9751221 | ? | ? | bisect scratch | NO | not evaluated | scratch |
| /tmp/crx-runtime | (local clone) | 6c4b531 | ? | n/a | historical predecessor | NO | historical reference | superseded |
| /home/nolan/ping-gateway-src | n/a (not in git) | image ping-gateway:devin-boundary2 created 2026-09-16 18:02 | 2026-09-16 | n/a | LIVE production gateway + ping-runtime | **YES (PROVEN_RUNTIME)** | Strongest DEPLOYED; lacks seq cert + witness fixes | - |

Remote branches: 40+ incl. feature/approval-effect-identity, feature/context-compilation, feature/external-agent-hardening, feature/knowledge-replay-routing, feature/mission-decomposition, feature/namespace-entitlements, feature/temporal-durable-execution, constitutional-* family, event-runtime-deduplication, codex/context-workorder-convergence, audit-hardening, authority-forensics, opencode/*, temp_checkpoint; mirrored under windows-preserve/. Tags: constitutional-freeze-v1, constitutional-kernel-freeze-v1, pre-cleanup/cccd7ded, pre-push/1a7d7639 (+ mirrors).

### Topic mapping

| TOPIC | STRONGEST LOCATION | MATURITY |
|---|---|---|
| Event Authority | constitutional-convergence worktree | PROVEN_CERT (frozen); live = FALSIFIED (not deployed) |
| Identity | orca-autonomy (canonical identity in emit) + gateway-src emit (content-hash id) | WIRED_UNPROVEN |
| Hashing | gateway-src UnifiedEventRuntime (sha256 content id) | PROVEN_RUNTIME |
| Canonicalization | gateway-src canonicalization_service.js (boundary for emitters) | PROVEN_RUNTIME |
| Witness | frozen worktree (91e1337f4, 84da2d40c); gateway-src has pre-fix pipeline | PROVEN_RUNTIME (old); PROVEN_CERT (new, not live) |
| Replay | gateway-src kernel_replay_execution_provider.js wired to ReplayWorker | PROVEN_RUNTIME |
| Lineage | gateway-src LineageWorker + lineage_authority.js; harvest-12h newest lineage | PROVEN_RUNTIME (code) |
| Mission | gateway-src MissionRuntime + MissionScheduler (5s poll, maxConcurrent 3) + EventToMissionBridge | PROVEN_RUNTIME |
| Capability | gateway-src capability_registry.js + capability_resolver.js | WIRED_UNPROVEN |
| WorkerRuntime | gateway-src worker_runtime.js, 8 canonical workers (IntelligenceWorker dormant) | PROVEN_RUNTIME |
| WorkOrder | MissionScheduler dispatch path in gateway-src | WIRED_UNPROVEN |
| ResultEnvelope | gateway/canonical_object.js + EvidenceAuthority | WIRED_UNPROVEN |
| ContextPack | gateway-src generate_context_packets.js + ConstitutionalQueryAPI.js; harvest-12h newest compiler suite | WIRED_UNPROVEN (packets, not compiler; live image has NO context/ dir) |
| Context Compiler | main repo ping-runtime/context/; harvest-12h H77-H79 | BUILT_NOT_LIVE |
| Knowledge | gateway-src Neo4jAdapter + QdrantAdapter + EmbeddingService (async, seeded-vector fallback) | PROVEN_RUNTIME |
| Evidence | gateway-src EvidenceAuthority (recomputes canonical hash, traces Qdrant hits to ping_events) | PROVEN_RUNTIME |
| Temporal | main repo ping-runtime/temporal/ (workflows, activities); orca-autonomy temporal worker lifecycle | BUILT_NOT_LIVE (temporalRuntime in lifecycle START_ORDER, but gateway-src has no temporal/ dir; ping-temporal-dev runs with zero PING workers connected) |
| ORCA | orca-autonomy orca/ docs + control-loop (incl. _retired-vendor-2026-09-18) | DOCUMENTED_ONLY |
| Approval / Effect identity | /home/nolan/ping feature/approval-effect-identity | EXPERIMENTAL (not live) |
| Namespace | gateway-src tenant_registry.js; default core::system; boundary core::<name> / tenant::<id> | PROVEN_RUNTIME |
| Mission Control | gateway-src routes/mission_control.js (+ /bridge, /event-mission-bridge status routes) | WIRED_UNPROVEN |
| Connectors | gateway-src: email/sms/posthog (wired), github/google (built not live), oauth_provider, capability/connector registries | WIRED_UNPROVEN / BUILT_NOT_LIVE |
| AcquisitionManager | NOWHERE - zero case-insensitive matches in main repo or gateway-src | PHANTOM/DOCUMENTED_ONLY (matches 2026-09-18 ruling) |
| Social | Muse-side ~/workspace/outreach, not PING-runtime code | n/a |
| Oracle | ping-oracle-deploy worktree (UI) | NOT INSPECTED at this track |
| Repository intelligence | /home/nolan/ping root docs (REPOSITORY_INTELLIGENCE_EXTRACTION.json, RepositoryKnowledgeIndex) | DOCUMENTED_ONLY |

## D. CURRENT LIVE SYSTEM MAP

Running services on the Pig (2026-09-18 ~18:45 MDT; read-only docker ps):

| CONTAINER | IMAGE | STATUS |
|---|---|---|
| ping-gateway | ping-gateway:devin-boundary2 | Up 25h (created 2026-09-16 18:02) |
| ping-postgres | postgres:15-alpine | Up 21h |
| ping-redis | redis:alpine | Up 25h (healthy) |
| ping-qdrant | qdrant/qdrant:latest | Up 25h **(unhealthy)** |
| ping-vault | hashicorp/vault:latest | Up 25h **(unhealthy)** |
| ping-temporal-dev | temporalio/temporal (pinned) | Up 25h |
| ollama | ollama/ollama | Up 13h |
| brain-postgres | postgres:15-alpine | Up 25h |
| brain-qdrant | qdrant/qdrant:latest | Up 25h |
| open-webui | ghcr.io/open-webui/open-webui:main | Up 25h (healthy) |
| qwen3-tts-service / cosyvoice-tts | (TTS stack) | Up 25h |

No PING node processes on WSL host (only Codex Desktop's); everything runs in the gateway container. DB (SELECT-only): 739 rows in `ping_events`, **no sequence column** (columns: event_id, event_type, source, timestamp, payload, metadata, namespace, processed, created_at).

Anomaly: a `/tmp/pgq6.js` process (PID 457) of UNKNOWN purpose runs inside the gateway container. Flagged for follow-up; not executed.

## E. CURRENT LIVE SPINE

Entry: `node gateway/server.js` -> `GatewayRuntime`. Single Node process in the container. Kernel pipeline (repository_events + EventBridge) explicitly bypassed in live code ("reducer/projection registries are empty and EventBridge adds a 5s delay for no benefit").

| # | ARROW | LABEL | EVIDENCE |
|---|---|---|---|
| 1 | SOURCE -> CONNECTOR | PROVEN/WIRED | POST /events wired; Review/Customer/Project/ConnectorEmitters wired; connectors: email, sms, posthog wired; github, google built-not-live |
| 2 | CONNECTOR -> AUTH/PRINCIPAL | PARTIAL | `req.authenticatedAgent` consumed opportunistically; NO auth middleware in routes/events.js - gateway trusts an exterior layer |
| 3 | AUTH -> NAMESPACE | WIRED | TenantRegistry wired; namespace resolved exactly once in emit (default `core::system`); privacy boundary validated at emit |
| 4 | NAMESPACE -> INGRESS | PROVEN | POST /events requires event_type, aggregate_id, aggregate_type, event_data; business_id requires tenant_id else throws |
| 5 | INGRESS -> CANONICALIZATION | PROVEN | CanonicalizationService boundary: emitters call canonicalizationService.emit -> eventRuntime.emit |
| 6 | CANONICALIZATION -> IDENTITY | PROVEN | emit() step 1: deterministic sha256 over {eventType, source, [namespace], [logical_id or payload]}, no Date.now() |
| 7 | IDENTITY -> EVENT | PROVEN | EventValidator, EventGovernance, envelope with causation_id/correlation_id/confidence |
| 8 | EVENT -> PERSISTENCE | PROVEN | INSERT INTO ping_events ON CONFLICT (event_id) DO NOTHING; 739 live rows; **NO sequence column** |
| 9 | PERSISTENCE -> DISPATCH | PROVEN | emit() dispatches to in-process handlers (first delivery only; duplicate-suppression gate), then IntegrationManager |
| 10 | DISPATCH -> MISSION | WIRED | EventToMissionBridge instantiated + MissionRuntime + MissionScheduler (5s poll, maxConcurrent 3) |
| 11 | MISSION -> CONTEXT | WIRED/BUILT_NOT_LIVE | generate_context_packets.js + ConstitutionalQueryAPI.js; no context/ compiler dir in live image |
| 12 | CONTEXT -> CAPABILITY | WIRED | CapabilityResolver + capability_registry; routes/capabilities.js exists |
| 13 | CAPABILITY -> WORK ORDER | WIRED | WorkerRuntime.dispatch = "single worker-identity decider" |
| 14 | WORK ORDER -> EXECUTOR | WIRED/DORMANT-split | In-process WorkerRuntime; Temporal in lifecycle START_ORDER but no temporal/ dir in image and no SDK worker connected to ping-temporal-dev -> Temporal = DORMANT |
| 15 | EXECUTOR -> RESULT | WIRED | Chain DOCUMENT_IMPORT -> OBSERVATION_CREATE -> CLAIM_GENERATE -> REPLAY_VERIFY -> WITNESS_CREATE -> LINEAGE_CREATE -> PROJECTION_CREATE |
| 16 | RESULT -> VERIFICATION | PROVEN (old) | ReplayWorker: verified=true only when status==='ok' AND violations empty; kernel replay via KernelReplayExecutionProvider. Whether 91e1337f4/84da2d40c are in live = UNKNOWN (needs byte diff) |
| 17 | VERIFICATION -> EVIDENCE | PROVEN | WITNESS_CREATED via WitnessWorker; EvidenceAuthority recomputes canonical hash, traces Qdrant hits to ping_events; HybridSearch composes Qdrant+evidence+KG |
| 18 | EVIDENCE -> KNOWLEDGE | PROVEN | EmbeddingService subscribes to eventRuntime (async, non-blocking, seeded fallback); Neo4jAdapter + QdrantAdapter initialized |
| 19 | KNOWLEDGE -> RETRIEVAL | WIRED | HybridSearch, /context routes, EventReadAuthority indexed traversal; but ping-qdrant (unhealthy) -> PARTIAL/BROKEN in practice |
| 20 | RETRIEVAL -> FUTURE WORK | WIRED | automatic_mission_generator.js; Mission Control routes; Temporal future = DORMANT; ORCA = DOCUMENTED_ONLY |

Summary: SOURCE -> CONNECTOR -> (exterior)AUTH -> NAMESPACE -> INGRESS -> CANONICALIZATION -> IDENTITY -> EVENT -> PERSISTENCE -> DISPATCH -> MISSION -> [CONTEXT pack] -> CAPABILITY -> WORKER -> in-process EXECUTOR -> RESULT -> VERIFY -> WITNESS/EVIDENCE -> Qdrant/Neo4j KNOWLEDGE -> RETRIEVAL, all inside one Node process. Kernel pipeline bypassed. Temporal, ORCA, AcquisitionManager, and the P0 sequence cert are NOT in the live path.

## F. DECISION OWNERSHIP MATRIX

The single table every later decision depends on. One row per decision. "Live callers" is the authority test; a decision with two live owners or zero live owners is the defect.

| DECISION | CURRENT OWNER(S) | LIVE CALLERS | DUPLICATION | STRONGEST IMPLEMENTATION | TARGET OWNER | KEEP/MERGE/DEMOTE/DELETE | MIGRATION DEPENDENCIES | CONFIDENCE |
|---|---|---|---|---|---|---|---|---|
| Canonical event acceptance | UnifiedEventRuntime.emit (certified) / old runtime (live) | bootstrap emit path | Era H vs V2 vs TenantOS envelope vs ConstitutionalEventSourcing vs EventWriteAuthority vs event_bus | Certified emit @ce3f8687 | UnifiedEventRuntime | KEEP (promote to live) | Build provenance; schema migration; restart/replay proof | high |
| Replay ordering | pg sequence (certified) / none (live) | replay reader (certified code) | 3 sequence columns, 3 meanings | `ping_events_sequence_seq` + DeterministicReplayEngine | UnifiedEventRuntime + replay reader | KEEP | Deploy certified schema; dual-era replay plan (live DB has no column) | high |
| Identity construction | IdentityAuthority.generateId (V2) vs direct createHash in context/artifact/mission/knowledge | Mixed | F1-F5 flags (sec H) | V2 `generateId` (RFC-8785, versioned) | IdentityAuthority | MERGE (route all; era-mark legacy) | Artifact serializer fix; per-type prefix for `event_` namespace | high |
| Hashing / canonicalization | CanonicalAuthority/CanonicalBytes vs scattered `createHash` | Mixed | C3 contradiction | CanonicalBytes.serialize + CanonicalAuthority.hashBytes | CanonicalAuthority | MERGE | Fix artifact replacer (drops nested keys); fix double-serialize throw | high |
| Witness attestation | canonical_workers (frozen) | ReplayWorker to WitnessWorker | Legacy minting surfaces (dead comments/tests) | Frozen canonical_workers @84da2d40c | canonical_workers chain | KEEP | Promote to live; 12/13-leaf rebuild | high |
| Replay verification | DeterministicReplayEngine vs TemporalReplayProvider vs historical replay.ts | Engine (compiled) | 3 impls, one live | DeterministicReplayEngine (12-leaf) | DeterministicReplayEngine | MERGE (archive others) | Sanctioned pinned rebuild (Era 12 preserved, Era 13 versioned) | high |
| Mission lifecycle | MissionRuntime vs MissionAuthority v1 vs v2 | MissionScheduler | 4 mission models | MissionRuntime (idempotent, leases, events) | MissionRuntime | KEEP; MERGE others | Namespace/principal/parent columns | high |
| Capability / authorization | AGENT_PROFILES allowlist (de facto) vs phantom CapabilityAuthority vs MCP matrix | authorizeWorkOrder | 3 vocabularies | AGENT_PROFILES (fail-closed) | Explicit capability registry backed by allowlist | MERGE | One orchestration vocabulary; MCP schema only | medium-high |
| WorkOrder identity | orca-autonomy adapter vs temporal_work_order_id vs mission-derived | ORCA loop | 3 schemes | orca-autonomy scheme (objective-bound) | One scheme (orca-autonomy's) | MERGE | Wire to gateway; attempt lineage | high |
| Result truth | verifyResultEnvelope + recordVerifiedResult | ORCA loop | none | Same | Same | KEEP | Content-verification as separate evidence step | high |
| Execution durability | MissionScheduler 5s poll (live) vs Temporal (documented target) | MissionScheduler | Temporal never ran | Temporal contract (target); PG scheduler (proven today) | Temporal (per target) after evidence | KEEP both until A6 proof | Re-run kill-9 proof; decide PG vs Temporal on evidence | medium |
| Approval | none live; EffectAuthority/BusinessActionAuthority (branch, unwired) | none | Phantom classes | Branch design (states, expiry, audit) | Durable approval state machine | KEEP (build) | Postgres wire-in; isEffectCompleted pre-gate | high (missing) |
| Effect identity | none live; EffectAuthority.generateEffectId (branch) | none | 3 effect-id formulas | `CanonicalAuthority.hashBytes` on full preimage | EffectAuthority + Postgres store | KEEP (build) | Correct formula; provider request-id reconciliation | high (missing) |
| Evidence verification | EvidenceAuthority | HybridSearch.verify/rank | none live | EvidenceAuthority | EvidenceAuthority | KEEP | Fix trust-on-claim hash fallback | high |
| Observation | python observation_worker vs JS ClassificationWorker | both planes | 2 live-ish planes, divergent event names | JS worker (witnessed chain) | One plane | MERGE | Pick plane; reconcile event names; migrate consumers | medium-high |
| Claim | python claim_detector vs JS ClaimValidationWorker | both planes | same | JS worker (witnessed chain) | One plane | MERGE | Same as observation | medium-high |
| Knowledge | PG knowledge_nodes vs Neo4j vs Qdrant | PG + Qdrant | 3 stores | PG knowledge_nodes (canonical) | PG knowledge_nodes | KEEP PG; DEMOTE others to projections | Negative states; freshness columns; dependency edges | high |
| Context | python ContextPackBuilder vs JS compile_context_pack vs codex compiler | python (brainos); JS (dead) | 2 incompatible types | Codex-branch compiler (unmerged) | One compiler (codex design) | MERGE | Land codex commits; self-describing packs; tenant filter | high |
| Lineage | LineageWorker (live) vs LineageAuthority (zero callers) | LineageWorker | 2 impls, one dead | LineageWorker | LineageWorker + DAG legality | KEEP worker; DEMOTE Authority | Add cycle/topological validation; fix timestamp-in-edge-id | high |
| Namespace boundary | emit-time namespace (certified) / adapter regex (orca) | both | 2 | UnifiedEventRuntime.emit | emit-time | KEEP | Align adapter regex to emit schema | high |
| Vector recall | Qdrant | HybridSearch | none | Qdrant projection | Qdrant | KEEP (projection) | Honest embeddings or label fallback | high |
| Relationship graph | Neo4j (never live) | none | none | none | projection only, if ever | DEMOTE | Delete boot instantiation | high |
| Blob storage | S3 adapter (never live) | none | none | none | deferred | DEMOTE | Remove adapter or prove need | high |
| Cache | Redis adapter (never live) | none | none | none | deferred | DEMOTE | Remove adapter or prove need | high |
| Model calls | LiteLLM direct client (live) vs provider interface (dead) | direct client | 2 | LiteLLM (proxy pattern target) | LiteLLM behind proxy | MERGE | Proxy + per-key spend tracking | medium |
| Ingress authentication | exterior middleware (unproven) vs none in-repo | unknown | phantom | none proven | Explicit boundary | INVESTIGATE first | Prove exterior or add interior auth | high |
| UI contract | Mission Control /api/* fiction vs gateway /mc/* | none (UI broken) | 2 | Gateway contract | Gateway | MERGE (fix UI) | Per-surface contract map; delete mock imports | high |
| Demo seeding | _seedBusinessEvents (unconditional) | bootstrap | none | env-gated target | Env-gated seeder | DEMOTE | Gate by default-off; purge/quarantine fictional rows (Nolan decision) | high |
| Temporal scheduler provider | broken provider (wrong module path) | none | 2 temporal impls | temporal_scheduler_provider.ts (cleaner) | One provider | DELETE or repair | Converge providers; env-gate | medium-high |
| ORCA cycle state | in-memory (A6 fails kill-9) | ORCA loop | none | Branch remediation (untested) | PG-backed cycle state | KEEP (build) | Re-run kill-9 proof; cycle start/stop events | high |

## G. CANONICAL OBJECT INVENTORY

Objects that survive as truth. Every canonical object has one identity rule, one owner, one persistence, and a preimage. Non-canonical objects are projections or legacy.

| OBJECT | IDENTITY | OWNER | PERSISTENCE | CANONICAL? | MATURITY |
|---|---|---|---|---|---|
| Event (canonical) | `event_<16hex>` = sha256(RFC-8785 preimage: type, version, event_type, source, namespace, logical_id\|payload) | UnifiedEventRuntime.emit | `ping_events` (PG) | yes | certified (frozen), not live |
| Attestation (WITNESS_CREATED) | canonical event identity of the attestation itself | WitnessWorker | `ping_events` | yes (derived attestation, not origin) | certified (frozen), not live |
| Mission | `mission_id` = sha256(missionType:event_id\|payload)[0:16] | MissionRuntime | `ping_missions` | yes | proven integration |
| Objective (ORCA) | `objective_id` = sha256('objective:' + stableStringify({namespace, objective_text, constraints})) | orca control loop | `PING_DATA_ROOT/objectives/` (JSONL) | yes (ORCA domain) | proven (A2) |
| WorkOrder | `sha256('work-order:'+objective_id+':'+task_key)` (orca) / `sha256('workorder:'+taskId)[0:16]` (legacy) | external_agent_adapter | `PING_DATA_ROOT/work_orders/` + mission payload | yes | proven (A3); two schemes compete |
| Attempt | `workOrderId + '-attempt-' + N` | external_agent_adapter | attempts file | yes | proven |
| ResultEnvelope | `result_id` = sha256('external-result:' + stableStringify(binding)) | verifyResultEnvelope | recorded via recordVerifiedResult | yes (verified claim, not verified truth) | proven (A4) |
| KnowledgeNode | `sha256(type:label:data)[0:16]` | KnowledgeGraph | `knowledge_nodes` | yes (PG canonical) | proven integration |
| Evidence claim | evidence_id-less; anchored on `source_event_id` | EvidenceAuthority | verified at query time | derived | proven integration |
| ContextPack (python) | `context_id` = uuid5(uuid5(NAMESPACE_URL,'brainos:contexts'), stable_hash) | ContextPackBuilder | `context_packs` | provisional | live in brainos |
| ContextPack (js) | `PACK:<hash>` uuid-like | compile_context_pack | unmerged | provisional | BUILT_NOT_LIVE |
| LineageEdge | deterministic `generateId('lineage_edge', ...)` (timestamp-in-id defect) | LineageAuthority (dead) / LineageWorker (live) | delegated / projection | derived | worker proven; authority dead |
| Snapshot | `snapshot_<hash>` of canonical source JSON | SnapshotAuthority | `memory_snapshots` | derived | proven |
| Approval | approval_<16hex> (branch) | ApprovalAuthority (unwired) | JSON files (branch) | yes (target) | BUILT_NOT_LIVE |
| Effect | `effect_<16hex>` (branch) | EffectAuthority (unwired) | in-memory (branch) | yes (target) | BUILT_NOT_LIVE |
| Entity link | no identity yet (proposed) | n/a | n/a | n/a | DOCUMENTED_ONLY |
| Run/Audit events | canonical event identity | various | `ping_events` | yes (audit trail) | live |

**Convergence targets:** one identity scheme per identity (F1/F2 cleanup); V2 `generateId` for all new minting; era-marking for Era H / TenantOS / constitutional_events rows; `sequence` reserved for the canonical DB-allocated replay order; per-object chain positions renamed (`chain_position`, `tenant_sequence`).

## H. IDENTITY/PREIMAGE MATRIX

**Frozen-fact verification:** ce3f8687 touches exactly 4 paths (CONFIRMED: `EVIDENCE_LEDGER.md`, `OPERATING_SPEC.md`, `ping-runtime/events/unified_event_runtime.js`, `tests/event-sequence-replay/sequence_replay_cert.js`; 989 insertions, 4 deletions). `unified_event_runtime.js` byte-identical ce3f8687 → HEAD/84da2d40c (CONFIRMED, 0 diff lines). Sequence allocation = PostgreSQL sequence object `ping_events_sequence_seq`, column DEFAULT `nextval(...)`, allocated at insert attempt; no `MAX(sequence)+1` in the certified path (only in legacy `canonical_event_envelope.js` and the runtime's own `initialize()` migration bookkeeping); no app-side counter. Sequence excluded from identity/hash (CONFIRMED: `identityData = {event_type, source, namespace, logical_id|payload}` step 1; `identityAuthority.generateId('event', ...)` step 4; timestamp also excluded). Duplicate handling: `ON CONFLICT (event_id) DO NOTHING RETURNING sequence`; on conflict, re-reads the original row's sequence. Replay reader: `WHERE sequence > $1 ORDER BY sequence ASC LIMIT $2`, read-only, consumer fail-fast with cursor. `query()` orders by `timestamp DESC` (not sequence).

**Cert-harness count caveat:** source has 68 `check()` + 3 `blocked()` = 71 entries, but EVIDENCE_LEDGER.md:622 claims "73/73". Does not reconcile; flagged (AI contradiction C5).

Canonical primitives: `CanonicalBytes.serialize()` → RFC-8785 (fail-closed F7/D1 domain); `CanonicalAuthority.hashBytes()` = SHA-256; `IdentityAuthority.generateId(type, data)` = `{type}_{sha256(canonical({type, version:'2.0.0', identity_version:'2.0.0', ...data}))[0:16]}`.

| IDENTITY TYPE | PREIMAGE | OWNER | ALGORITHM | VERSION | COLLISION SEMANTICS | PERSISTENCE | CALLERS |
|---|---|---|---|---|---|---|---|
| `event_id` V2 (certified) | `{type, version, event_type, source, namespace, logical_id\|payload}` (timestamp excluded) | `IdentityAuthority.generateId` via `UnifiedEventRuntime.emit` | SHA-256/RFC-8785 → `event_<16hex>` | 2.0.0 in preimage | deterministic, idempotent retries converge | `ping_events.event_id` PK | certified emit |
| `event_id` Era H (live) | `JSON.stringify(identity)` non-canonical | direct `createHash` in old runtime | SHA-256, 64-hex unprefixed | none | serialization-order fragile | `ping_events` (live image) | old emit |
| `event_id` TenantOS legacy | `${tenantId}:${eventType}:${timestamp}:${sequence}` (wall-clock in preimage) | `CanonicalEventEnvelope.generateEventId` | UUID v5 | `event_version 1.0.0` | re-emission → NEW id (true duplicates) | `canonical_events.event_id` | 4 business authorities + HTTP route |
| `event_id` (ConstitutionalEventSourcing) | `{type, aggregate_id, timestamp}` via `generateId('event',…)` - **same `event_` namespace, different preimage** | `ConstitutionalEventSourcing.emitEvent` | SHA-256/RFC-8785 → `event_<16hex>` | 2.0.0 (different preimage) | non-idempotent (timestamp) | `constitutional_events` (UPSERT) | config-gated dormant |
| `event_id` (EventWriteAuthority) | `{type: eventType}` - payload not in preimage, **every event of a type collides** | `EventWriteAuthority.createEvent` | → `event_<16hex>` | 2.0.0 | constant per type | in-memory | knowledge_compiler, end_to_end_verifier (not in bootstrap) |
| `event_id` (event_bus) | `{type:'event'}` constant | `event_bus` | → `event_<16hex>` | 2.0.0 | constant | in-memory | unknown |
| `artifact_id` | local `canonicalBytes` = `JSON.stringify(obj, Object.keys(obj).sort())` - **broken: drops nested keys not in top-level list** | `ArtifactAuthority.deterministicId` | SHA-256 double-hash → `art_<16hex>` | none | nested content excluded | artifact store | `execution/engine.js` (live) |
| `mission_id` | `` `${type}:${event_id}` `` or `` `${type}:${JSON.stringify(payload)}` `` | `MissionRuntime.create` | SHA-256 `[0:16]` unprefixed | none | key-order fragile in payload branch | `ping_missions` PK | mission_runtime |
| `work_order_id` | `'workorder:'+taskId` / orca `sha256('work-order:'+objective_id+':'+task_key)` (full-hex) | `external_agent_adapter` | SHA-256 `[0:16]` unprefixed / full | none | deterministic | work orders | `issueWorkOrder` |
| `result_id` | `'external-result:'+stableStringify(binding)` (local recursive key-sorted stringify, correct) | `external_agent_adapter.resultIdentity` | SHA-256 64-hex unprefixed | none | deterministic | result envelope; reused as `logical_id` | `verifyResultEnvelope` |
| `effect_id` (approval branch) | `{event_type, aggregate_id, action_type}` via `CanonicalAuthority.hash` **directly** - third minting convention, same `{prefix}_{16hex}` shape | `EffectAuthority.generateEffectId` | SHA-256/RFC-8785 → `effect_<16hex>` | none | deterministic | effects store / in-memory | approval flow |
| `node_id` / `edge_id` (knowledge) | `` `${type}:${label}:${JSON.stringify(data)}` `` / `` `${src}:${edgeType}` `` | `KnowledgeGraph` | SHA-256 `[0:16]` unprefixed | none | key-order fragile | `knowledge_nodes`/`knowledge_edges` PKs | knowledge_graph |
| `witness_id` | `generateFromCanonicalHash(sha256(witnessRoot), 'witness')` - **bypasses V2 versioning**, double-hashed | `WitnessRecorder.record` | → `witness_<16hex>` | none in preimage | deterministic | witness objects | witness flow (legacy) |
| `witness_root` | ordered witness IDs → canonical bytes → concat → hashBytes | `WitnessRecorder` | SHA-256 | - | - | bound into attestations @84da2d40c | canonical_workers |
| `context_hash` | `JSON.stringify(context)` | `ContextAuthority` (direct createHash - **self-violates** "every hash → CanonicalAuthority") | SHA-256 `[0:16]` unprefixed | none | key-order fragile | context field | context build |
| `repository_events` chain | caller-supplied `event_id` + per-object `sequence`; chain hashes via `hashChain` | `EventRepository.appendEvent` | SHA-256 | `authority_version` col | chain-linked | `repository_events` (**no ON CONFLICT - duplicate throws**) | many legacy authorities |

No minted run_id/attempt_id/evidence_id/relationship_id/namespace IDs in scope (evidence anchors on `source_event_id`; work orders carry an integer `attempt`).

**Matrix flags:** F1 - four `event_` preimages share one output namespace (V2, ConstitutionalEventSourcing, EventWriteAuthority, event_bus); an `event_` ID does not identify its minter. F2 - three minting conventions (`generateId` versioned, `generateFromCanonicalHash` unversioned, direct-hash+prefix) share one `{prefix}_{16hex}` shape. F3 - non-canonical serializers inside identity preimages (mission payload branch, node_id, context_hash, artifact replacer). F4 - artifact serializer actively drops nested content. F5 - 16-hex truncation is accidental, not designed.

Also: `DeterministicIdAuthority` is self-declared DEPRECATED yet consumed by live `WorkflowIdentityAuthority` (via `temporal_scheduler_provider`). `hashEventSchema`/`hashEventCanonical` double-serialize (`this.hash(CanonicalBytes.serialize(...))` → throws on Buffer) - broken by inspection, reachable only via a patch-validation script.

## I. EVENT AUTHORITY

**Event store census:**

| Table | Writer(s) | Sequence semantics | Classification |
|---|---|---|---|
| `ping_events` | `UnifiedEventRuntime.emit` ONLY (non-test) | PG sequence (certified code) / none (live image) | **CANONICAL** |
| `canonical_events` | `CanonicalEventEnvelope.executeEmitEvent` | `MAX(sequence)+1` per tenant, read-modify-write, no lock | **LEGACY INGRESS SURFACE** (non-canonical until converged) |
| `repository_events` | `EventRepository.appendEvent` (many legacy callers) | caller-supplied per-object chain position | **DERIVED / PRESERVED_AUDIT_HISTORY** (decision); code still a primary writer |
| `constitutional_events` (+snapshots) | `ConstitutionalEventSourcing.emitEvent` | `MAX(sequence_number)+1`, fallback `return 1` on DB error | **DUPLICATE** (conditional dormant) |
| `events`, `authority_witness` | Python BrainOS workers | ad hoc uuid/hashlib | **LEGACY** (no live process found) |
| `ping_bridge_cursors`, `event_processing` | old bridge / worker bookkeeping | n/a | operational |

Three `sequence` columns, three meanings: `ping_events.sequence` = global DB allocation; `canonical_events.sequence` = per-tenant MAX+1; `repository_events.sequence` = per-object chain position.

**Falsification attempts:** (1) Second writer to `ping_events`? Only `unified_event_runtime.js` in non-test code - **not found**. (2) Alternate sequence allocator for canonical events? Only the PG sequence in the certified path - **but** two other live-code allocators exist for other tables (MAX+1 per tenant; MAX(sequence_number)+1). Single-authority for `ping_events` holds; the system has three allocation regimes. (3) Second minter of canonical `event_` IDs? **FOUND** - `ConstitutionalEventSourcing` mints `event_<16hex>` from a different wall-clock-bearing preimage (config-gated; live gate state UNKNOWN); `EventWriteAuthority`/`event_bus` mint two more variants (BUILT_NOT_LIVE). (4) Collision gaps: `appendEvent` has no ON CONFLICT (throws); `canonical_events` dedups on `(tenant_id, sequence)` not logical identity (C-033); `constitutional_events` UPSERT **mutates history** on conflict. (5) Hidden in-memory canonical stores: none found. (6) Python writers: found but no live process → LEGACY.

**LIVE deployment verdict (PROVEN_RUNTIME, container FS):** the running `ping-gateway:devin-boundary2` (up 25h) has **no `legacy_ingress_adapter.js`**, and its `unified_event_runtime.js` has **zero mentions of `sequence`**. The live bootstrap wires `CanonicalEventEnvelope` → `canonical_events`, the OLD `UnifiedEventRuntime` (64-hex IDs), and the OLD `EventBridge` - which still re-emits **both** `canonical_events` **and** `repository_events` into `ping_events`, i.e. the retired repository leg that MC-1 froze as a defect. **The certified claims describe code that is not running.**

## J. WITNESS AFTER 91e1337f4 + 84da2d40c

**Headline:** Zero live routes accept, dispatch, or generate WITNESS_CREATE after 91e1337f4. 84da2d40c binds `witness_root` + `replay_fingerprint` and fails closed with `missing_witness_root` (emitting WITNESS_REJECTED with the full replay object for diagnosis). No live attestation path trusts a naked `verified` boolean. The sharpest remaining honesty hole is the replay provider's silent input reduction (10k cap, malformed-envelope skips) while still reporting `verified:true`.

**WITNESS_CREATE residual classification:**

| File | Hit | Classification |
|---|---|---|
| `ping-runtime/workers/canonical_workers.js:467` | Comment "The legacy WITNESS_CREATE command was an alternate, unverified path." | COMMENT (accurate, harmless) |
| `gateway/test_decision_graph.js:199` | Asserts `MISSION_WORKER_MAP['WITNESS_CREATE'] === undefined` | REJECTION TEST (guards removal) |
| `gateway/test_witness_negpath.js:172-177` | WIT-NEG-5: direct WITNESS_CREATE rejected, zero WITNESS_CREATED | REJECTION TEST (guards removal) |
| `evals/.../EVAL-010_witness_failure_honesty.js` | Doc comment updated to `['REPLAY_COMPLETED']` | EVAL DOC (current) |
| `AGENTS.md:2652,2656,2677` | "Non-replay WITNESS_CREATE still attests"; old eventTypes | **STALE DOC** (2026-08-21 notes, contradicts frozen code) |
| `docs/MISSION_LIFECYCLE_AND_ROUTING.md:103-104,147,176` | REPLAY_COMPLETED → WITNESS_CREATE mission table; old eventTypes | **STALE DOC** |
| `docs/LIVE_ARROW_AUDIT.md:156` | "WITNESS_CREATE direct still attests (no regression)" | **STALE DOC** |
| `docs/WITNESS_AUTHORITY_LEDGER_2026-09-16.md` | "Handles WITNESS_CREATE and REPLAY_COMPLETED" | HISTORICAL LEDGER (dated, DOCUMENTED_ONLY) |
| `docs/EXECUTION_EVIDENCE_LEDGER.md:365`, `docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md:48` | Old trace mentions | HISTORICAL DOC |
| `gateway/COMMISSIONING_REPORT.json`, `gateway/KERNEL_PIPELINE_REPORT.json` | `"WITNESS_CREATE"` strings | GENERATED HISTORICAL REPORTS |
| `orca/control-loop/evidence/run-*/...` (~24 files) | Workorder/dispatch JSON | HISTORICAL RUN EVIDENCE (preserved) |

(`WITNESS_CREATED`/`REPOSITORY_WITNESS_CREATED` substring matches in the event registry are a different event type.)

**WITNESS_CREATED binding inventory:** Bound in the attestation: `payload.documentId`; `payload.witness` = {documentId, eventType=`REPLAY_COMPLETED`, **witness_root** (non-empty hex string, fail-closed), **replay_fingerprint** (`sha256:<hex>` input identity or null), timestamp, attestation=`witness-<event_id[0:16]>` (derived label, not an identity)}; `payload.upstreamEventId`; envelope metadata namespace / correlation_id / causation_id / confidence (all inherited via `BaseWorker._emit`); canonical `event_id` from UnifiedEventRuntime.

**NOT bound:** `witness_algorithm` (`merkle_sha256_v1`), `witness_version` (`v1`), `leaf_count` (14), `tree_height` (4) - computed by the provider, dropped before emission; `engine_version`; input event-set identity (only `event_count` on REPLAY_COMPLETED, not carried forward); truncation/skip flags; constitutional law manifest; actual schema/replay/policy/canonicalization/hash versions (leaves carry hardcoded `'1.0'` literals). Governance gap: the registered `WITNESS_CREATED` schema in `event_registry.json` is generic (no `witness_root` requirement), so the fail-closed gate lives only in worker code, not in EventGovernance.

**Sufficiency verdict: INSUFFICIENT for independent later verification from the attestation alone.** It is an honest, trace-bound claim (root + input fingerprint + envelope provenance + canonical event identity), recomputable only by a verifier holding the same code, leaf construction, invariant set, and input events. The reproduction parameters are not recorded per-attestation.

**Naked-boolean trust:** No live attestation path trusts a naked `verified` boolean. `WitnessWorker.handle` requires all three in sequence: `event_type === 'REPLAY_COMPLETED'` → `payload.replay.verified === true` → non-empty `witness_root` string. The only other `verified === true` consumer is `gateway/routes/mission_control.js:524-525`, a read-only dashboard classifier (mints nothing). Adjacent hole: `KernelReplayExecutionProvider` returns `status:'ok'` even when it silently caps input at `maxEvents=10000` or skips malformed envelopes - so `verified:true` certifies "surviving events had no violations," not "the intended input set replayed whole." The skip path is the sharpest remaining honesty hole.

**Dedicated-witness-object falsification: hypothesis NOT FALSIFIED** ("no dedicated witness object/table/ID needed"). The live chain consumes no `witness_id`, no witness table, no legacy `createWitness` object. Legacy surfaces, all disconnected from the live boot:

| Surface | Disposition |
|---|---|
| `createWitness` hash-contract authority (`runtime/kernel/authorities/witness_authority.js` + gateway shim) | LEGACY (reachable only from old runtime/gateway paths, not `gateway_runtime.js`) |
| Agent-memory minting (`agent_memory_authority.js:93-106`) | PRESERVED_INACTIVE (only self-referenced) |
| `memory_witnesses` SQL table (`gateway/memory_persistence_authority.js`) | PRESERVED_INACTIVE (zero requirers) |
| `WitnessRecorder` standalone WitnessObjects with witness-namespace identity | LEGACY (old GitHub-snapshot lifecycle + registries only) |
| `WitnessGenerator` in-memory Map; `event_queue.js` `witness_id` field | PRESERVED_INACTIVE / LEGACY |

Caveat: "legacy" is relative to the canonical-worker pipeline; if older boots still run on the Pig, the legacy minting is reachable there. Per Nolan's ruling: classify and preserve, never delete merely because authority is settled; the `WitnessRecorder` witness-namespace identity must never become canonical.

## K. REPLAY

**Live path:** `gateway_runtime.js` → `ReplayWorker` (REPLAY_VERIFY/PROJECTION_CREATED) → `KernelReplayExecutionProvider` → `DeterministicReplayEngine` (compiled JS) → REPLAY_COMPLETED → WitnessWorker → WITNESS_CREATED. Maturity: current executable code in the live boot; PROVEN_UNIT/PROVEN_INTEGRATION via EVAL-009 (determinism + failure-honesty), EVAL-010, WIT-NEG 8/8. No live trace collected (read-only).

**Key findings:** input = `transcript.state.replay_events[]` with silent 10k cap and silent malformed-envelope skips; production replay boundary is TODAY a single triggering event (the correlation-group PG query is an unimplemented comment); ordering = input array order, unsorted, and the sketched PG SQL has no ORDER BY; canonicalization = CanonicalJson with F7/D1 fail-closed domain (historical payloads with `undefined`/depth>64 will throw); versioning is illusory (hardcoded `'1.0'` leaves, `v1` defaults, none recorded per-attestation); 4 standard invariants, unversioned, bound only via the missing commitment leaf; divergence detection (`ReplayVerification`, `verifyWitnessRoot`, `generateProof`) and `replay_verification_port.js` are BUILT_NOT_LIVE with no live callers; provider returns dead `witness`/`certificate` fields (always `undefined`).

**12-leaf vs 13-leaf drift - RESOLVED CONCEPTUALLY:**

| Leaf | TS source `runtime/kernel/replay/witness_authority.ts` (13 base) | Compiled `gateway/replay/kernel/witness_authority.js` (12 base) |
|---|---|---|
| canonical_bytes, fingerprint, lineage, state_version, schema_version, replay_version, policy_version, canonicalization_version, hash_version, artifact_count, state_contents, violations_canonical | yes | yes |
| **constitutional_law_commitment** (binds invariant_definitions, replay_rules, witness_rules, failure_rules, authority_hierarchy) | **yes** | **NO** |
| leaf_count / tree_height | yes (15 total / height 4) | yes (14 total / height 4) |

Git evidence: the commitment leaf entered the TS at the original import (`83112507a`); the compiled JS (introduced at `de314f664`) has NEVER contained it (`git log -S` empty). The live boot (`gateway/bootstrap/gateway_runtime.js` → `KernelReplayExecutionProvider` → `DeterministicReplayEngine` → `gateway/replay/kernel/witness_authority.js`) runs the 12-leaf artifact; the 13-leaf TS is never executed. No test asserts the leaf set; only `rebuild-canonical-json.sh` exists as sanctioned rebuild tooling - there is no rebuild path for witness_authority.

**Correct target contract:** (1) the 13-leaf set is semantically correct - the commitment leaf is the only true external policy binding; (2) regenerate the artifact from TS via a sanctioned pinned rebuild (never hand-edit); (3) record witness_algorithm/version/leaf_count/tree_height/engine version/law manifest/input-set identity per-attestation; (4) replace or explicitly version the hardcoded `'1.0'` literals; (5) until then, historical roots are 12-leaf and verifiers must pin to that construction - disambiguation currently rests on code archaeology alone. **Nothing fixed** per read-only scope. **Nolan-flag:** live attestations are missing their only policy binding due to an unsanctioned compile, and any future rebuild from the TS will silently change every historical root.

**Today vs 5 years:** replayable today with the same runtime/code/invariant set. For 5-year replayability, missing per-attestation: leaf set + encodings; witness_algorithm/version/leaf_count/tree_height; engine version; canonicalization + hash versions as actuals; law manifest + version; invariant definitions + versions; input-set identity; truncation/skip flags; actual schema/replay/policy versions; Merkle construction parameters (domain bytes 0x00/0x01, odd-duplication, leaf sort, leaf-hash-excludes-leaf_id); replay boundary definition.

## L. LINEAGE

**Headline:** Two lineage implementations; the live one does no DAG-legality checking at all. Cyclic causation graphs would be accepted silently.

Two implementations exist. `LineageAuthority` (`runtime/kernel/authorities/lineage_authority.js`, 171 lines) is a pure function: `createLineageEdge(parent, child, authority, executionId)` → deterministic-hash `edge_id` + witness; `persistLineageEdge` does `INSERT INTO lineage_edges ... ON CONFLICT DO NOTHING` **but persistence is delegated to the caller, and there are zero callers in all five branches** (the gateway shim `gateway/lineage_authority.js` just re-exports it). Verdict: **BUILT_NOT_LIVE / PRESERVED_INACTIVE**. The live lineage path is `LineageWorker` (`ping-runtime/workers/canonical_workers.js:510-543`): consumes `LINEAGE_CREATE` + `WITNESS_CREATED`, builds `{documentId, eventType, timestamp, causationChain: [metadata.causation_id]}`, emits `LINEAGE_CREATED` to `ProjectionWorker`. **Prior forensics claim VERIFIED: LineageWorker consumes canonical event causation metadata, not witness IDs.**

**DAG legality: NONE, anywhere.** No cycle detection, no topological constraints, no parent/child validation in either implementation; the live `causationChain` is a single-element array and nothing walks or validates it. After restart, lineage rebuilds only implicitly from `ping_events` correlation/causation queries; there is no dedicated rebuild path. Bonus defect (in the dead code, for the record): `timestamp` is an input to `generateId('lineage_edge', ...)`, so replay re-creation yields a **different** `edge_id` and `ON CONFLICT DO NOTHING` would not dedupe - a real design error if revived.

## M. EVIDENCE

| Class/interface | File | Maturity |
|---|---|---|
| `EvidenceAuthority` (accumulate/verify/rank) | `ping-runtime/evidence/evidence_authority.js` | PROVEN_INTEGRATION (constructed in `gateway/bootstrap/gateway_runtime.js:527`, consumed by `HybridSearch.verify`/`rank`) |
| Compiler evidence interfaces (`EvidenceStore`, `CounterEvidenceEngine`, proof objects) | `constitutional-compiler/evidence/*`, `engines/*` | WIRED_UNPROVEN (compile-time static-analysis domain, separate from runtime evidence) |
| `Evidence` interface (kernel identity) | `runtime/kernel/identity/evidence.ts` | DOCUMENTED_ONLY - **zero implementers** |
| `RepositoryEvidenceEngine`, `EvidencePacket`, `EvidenceCollector` | `presentping/*`, `gateway/test_*.js` | LEGACY / EXPERIMENTAL |

**EVENT != EVIDENCE is implemented correctly:** `verify()` requires hash recompute via `verifyCanonicalObject`, lineage presence, namespace consistency, and for Qdrant hits traces `source_event_id` back to a real `ping_events` row. Weak spot: if the verifier function is absent and `canonical_hash` is merely a string, `checks.hash = true` (trust-on-claim).

**Mapping:** Observation = python `observation_worker.py` (wired in `constitutional_runtime.py:141`) **and** JS `ClassificationWorker` (WorkerRuntime) - **two live-ish planes, same pipeline slot**. Claim = same dual-plane duplication. Evidence = `EvidenceAuthority`. Verification = `EvidenceAuthority.verify` + `replay_verification.ts`. Knowledge = `ProjectionWorker` → knowledge graph, `knowledge_promoter.js`, `HybridSearch`.

**Phantom vocabulary (names with no implementation):** `CapabilityAuthority` (registry says `missing_implementation`; adapter comments cite it as live at `/app/gateway/capability_authority.js:230`, but the file exists in **zero** of five branches - runtime auth is actually `authorizeWorkOrder` in the adapter); `IMissionAuthority` (interface, zero implementers); kernel `Evidence` interface (zero implementers); `archived` mission status (doc comment, no code); MCP capability-matrix backend (frontend `MCPOrchestration.tsx` only); Temporal mission execution (stub: "will be wired during integration").

## N. MISSION

`MissionRuntime` (`ping-runtime/orchestration/mission_runtime.js`): `mission_id = sha256(missionType:event_id or missionType:canonical_payload)[0:16]`, idempotent (`ON CONFLICT DO NOTHING`). Table `ping_missions`: mission_id PK, mission_type, status, priority, payload/result JSONB, assigned_to, created_by, timestamps, error, retries, retry_at, lease_until, claimed_at. **No namespace column, no principal column, no parent_mission_id** - namespace/correlation live inside `payload` (bridge-injected). **Parent/child: not implemented.** Lifecycle: `created → assigned → running → completed | failed`, plus `retry_pending` (default max 3 attempts, 5s backoff) and lease reclaim (60s `lease_until`; `reapExpiredLeases` resets orphans to `created` + emits `MISSION_LEASE_EXPIRED`). All transitions are conditional SQL; every transition mirrors a canonical event (`MISSION_CREATED/ASSIGNED/STARTED/COMPLETED/FAILED/LEASE_EXPIRED`). `EventToMissionBridge` maps business events → mission types (idempotent via event_id).

**Taxonomy collapse:** `MISSION_WORKER_MAP` routes ~20 business mission types (`CUSTOMER_ONBOARD`, `LEAD_FOLLOWUP`, `INVOICE_TRACK`, …) all to the single `'observation'` worker.

**Four competing mission models exist:** `MissionRuntime` (strongest, live), ORCA objective model (live in loop), `gateway/mission_authority.js` Ω.70 (wired only through the stub Temporal path), `gateway/mission_authority_v2.js` Phase 36A (header-read only). Mission truth = `MissionRuntime` (PROVEN_INTEGRATION).

## O. CAPABILITY

| Representation | Maturity |
|---|---|
| `capabilities/registry.yaml` (self-declares `CapabilityResolution → CapabilityAuthority` as `missing_implementation`) | DOCUMENTED_ONLY |
| Connector registry, 9 SaaS categories (`capability_registry.js` + `constitutional_capability_contract.js`) | PROVEN_UNIT |
| Exterior-agent allowlists (`AGENT_PROFILES.<agent>.allowedCapabilities`) | PROVEN_INTEGRATION |
| MCP capability matrix (frontend only) | DOCUMENTED_ONLY |
| ORCA policy decision classes derived from adapter allowlists | PROVEN_INTEGRATION |

**Strongest candidate for ONE capability truth: the `AGENT_PROFILES` allowlist family in the orca-autonomy `external_agent_adapter.js`** (7 LIVE profiles, `PENDING_AUTH` denied fail-closed, validation harness `validate_dispatcher_profiles.js`).

**Orchestration-language verdict: NO.** Three mutually unintelligible vocabularies (SaaS ops / agent allowlist verbs / MCP rows) share no schema and no enforcing registry. MISSION/CAPABILITY/EXECUTOR collapse today: the WorkOrder binds capability + executor together - the executor's profile allowlist *is* the capability check; there is no independent capability-resolution step.

## P. WORKORDER / RESULT

**Strongest branch: orca-autonomy.** Live callers in `orca_control_loop.js` (`issueWorkOrder` @753, `recordVerifiedResult` @517,862). Trace: ORCA derives `objective_id = sha256('objective:' + stableStringify({namespace, objective_text, constraints}))`, durable atomic state under `PING_DATA_ROOT/objectives/` → `authorizeWorkOrder` fail-closed (known LIVE profile, capability ∈ allowlist, namespace regex `^(core|tenant)::[a-z0-9_.-]+$`, constraints may only tighten, **mandatory `no_canonical_events` + `no_mission_state_writes`**) → `issueWorkOrder` (work_order_id via validated caller override or legacy `sha256('workorder:'+taskId)[0:16]`; ORCA uses `sha256('work-order:'+objective_id+':'+task_key)`; `attempt_id = workOrderId + '-attempt-' + N`; constant `principal: 'ping:external-agent-adapter'`) → executor via `hermes_dispatch.py` crash-safe rendezvous → `verifyResultEnvelope` (field presence, binding equality, **executor binding** `agent_id` triple-match, status ∈ {completed, failed}, completed↔(output∧¬error)/failed↔(¬output∧error), `evidence` is object, `verifiedAt ≤ deadline`; `result_id = sha256('external-result:' + binding)`) → `recordVerifiedResult` emits `WORKER_COMPLETED`/`WORKER_FAILED` through the **injected** event runtime only. Validation failure ⇒ `retryable:false`, never reaches canonical authority.

**Result semantics:** (a) worker returned bytes: **YES**. (b) worker claims success: **YES** (self-reported status, coherence-enforced). (c) execution completed: **PARTIAL** (process mechanics corroborated, semantic completion still asserted). (d) verified outcome: **NO** - verification is binding/identity/coherence only; output content truth is never examined. The meanings do **not** fully collapse, and the code is honest about it: the envelope validates the claim, `recordVerifiedResult` records the validated claim, not a verified truth. Note: ORCA's `contextPackId` (`'orca-context-<id>'`) is synthetic - the binding check verifies *equality*, not *provenance*.

## Q. CONTEXT / RETRIEVAL

Nine context-shaped implementations; two claim the name "ContextPack" and are mutually incompatible. Checked-out branch for this track: `feature/approval-effect-identity`.

| # | Implementation | Location | Shape / pipeline | Maturity |
|---|---|---|---|---|
| 1 | ContextCompiler + ContextIntegration (JS, "PING Core v1") | `ping-runtime/context/context_compiler.js` (175 lines), `context_integration.js` | Ref-list pack: `canonical_object_refs`, `artifact_refs`, `evidence_refs` (event_ids), `relationship_refs`, `source_metadata`, `retrieval_manifest` (hash of inputs only), id `ctx_<hash16>`. Injects `context_pack_id` + `context_refs` into WorkOrder input. | **BUILT_NOT_LIVE** - zero instantiations outside its own files and tests |
| 2 | ContextPackBuilder (Python, "Rule 2") | `runtime/cognitive/context_pack.py` + `models.py` | Content-carrying pack: `question`, `highest_authority`, `authority_chain`, `authority_resolution`, `lineage`, `supporting_documents/claims`, `contradictions`, `citations`, `witness_roots`, `confidence`. `validate_or_raise` enforces authority + evidence. | **PROVEN_INTEGRATION** - wired via ReasoningGateway→Supervisor→workers→subprocess tools, exposed at `/reasoning/query` in brainos mission_control |
| 3 | KnowledgeRetrieval (JS, "Phase A.3 RAG") | `gateway/knowledge_retrieval.js` | **Question → embed → Qdrant topK → Ollama → answer. No pack, no authority resolution, no tenant scoping, no witness.** | **WIRED_UNPROVEN (live-adjacent)** - registered in live `gateway/bootstrap/wiring.js:111` |
| 4 | ContextRetrievalAuthority (JS, "Phase 16") | `gateway/context_retrieval_authority.js` (408 lines) | Witnessed, ranked, deterministic retrieval chain ending at PromptAuthority | **BUILT_NOT_LIVE** - never instantiated in non-test code |
| 5 | ContextCompressionAuthority (JS, "Phase 12") | `gateway/context_compression_authority.js` (640 lines) | Hierarchical summaries → facts → entity/relationship graphs → embeddings → transcript | **BUILT_NOT_LIVE** - never instantiated |
| 6 | ContextAuthority (execution engine) | `ping-runtime/orchestration/execution/context_authority.js` (298 lines) | `buildContext(mission, workerId)`: repo slice from intelligence graph, no pack | **WIRED_UNPROVEN** - instantiated in `execution/engine.js:76` |
| 7 | Context packets (legacy) | `generate_context_packets.js` + `ContextPackets.json` | Static doc-packets from Windows `c:\Users\nolan\PING\...` paths | **PRESERVED_INACTIVE** |
| 8 | Root CLI builder | `context_pack_builder.py` (108 lines) | Read-only CLI, same `runtime/tools`, duplicates #2 | **EXPERIMENTAL** |
| 9 | LifecycleContext | `gateway/lifecycle_context.js` (120 lines) | Not fully audited | **UNKNOWN** |

**Historical commits - all exist, none on the checked-out branch or main:**

| SHA | Message | Lives on | Content |
|---|---|---|---|
| `902f40f44` | fix(context): make ContextPack selection replayable | `codex/context-workorder-convergence` only | Adds `_canonicalizeEvents`: validates event shape, ISO-normalizes timestamps, dedups by `event_id`, **throws on conflicting content for same event_id**, sorts by event_id, attaches `content_hash` |
| `b30790f3f` | feat(workorder): bind authorized ContextPack identity | codex branch only | `external_agent_adapter.js issueWorkOrder` gains required `contextPackId`; envelope + result schema + **result identity hash (`external-result:sha256`) includes `context_pack_id`** - the actual executor binding |
| `f20f6b9c4` | feat(context): verify tenant-scoped canonical evidence | codex branch only | `UnifiedEventRuntime.getCorrelationGroup(correlationId, limit, namespace)` gains SQL tenant filter; adversarial tests |

Divergence facts: `git merge-base --is-ancestor 902f40f44 HEAD` = NO. On `main`, the compiler file does not exist at all. On the checked-out branch it is the pre-fix version (no canonicalization/conflict/tenant filter), and `ping-runtime/external-agent/` does not exist there, so the integration cannot execute even in principle.

**Compiler field audit (current checkout vs codex branch):** Current: no event normalization, ref-level Set dedup only, silent first-wins on conflicting identity, arrival-order ordering, **retrieval manifest hashes `{mission_id, query, correlation_id}` only - not the selected events** (fails its own replay claim), bare `customer:<id>` string tags with no payload, no namespace/principal/causation/compiler-version/source-versions. Codex branch adds canonicalization, conflict-throw, deterministic event_id ordering, namespace threading - but the manifest still doesn't cover selected events.

**Boundary hypothesis FALSIFIED (ContextPack as model-independence boundary):**
1. Live runtime has no ContextPack. `ping-gateway` startup registers observation/claim/classification/recommendation/projection/replay/knowledge-promotion workers - **zero context/ContextPack lines in live logs**.
2. Direct RAG bypass is wired. KnowledgeRetrieval answers via Qdrant→Ollama with no pack, registered in the live gateway bootstrap. Contradicts "Rule 1: No direct vector search answers" and "Every answer must originate from a Context Pack."
3. Temporal mission path has no pack. `mission_workflow.js` → `activities.executeWorkOrder` carries raw input; the only `context_pack_id` mention is a commented-out TODO.
4. JS boundary is unexecutable on the active branch. No instantiations; adapter absent; the three fixing commits unmerged.
5. Two incompatible "ContextPack" types (ref-list vs content-carrying) both claim canonicity. Of the hypothesized pipeline stages, only GRAPH EXPANSION exists as code; LEXICAL and EVIDENCE RANKING have no dedicated implementation; INTENT has none.
6. `Supervisor.synthesize_answer` catches **all** exceptions into a canned string - enforcement fails open.

## R. KNOWLEDGE

| Link | Code | Maturity |
|---|---|---|
| SOURCE | `gateway/github_snapshot.js` (RepositoryProvider); `DocumentIngestion` in wiring.js | WIRED_UNPROVEN |
| SNAPSHOT | `SnapshotAuthority.createRepositorySnapshot` - repo **metadata** snapshot (stars/forks/issues), not content hashes | BUILT_NOT_LIVE |
| OBSERVATION | `OBSERVATION_CREATED`; `observation` worker handling 20 event types, registered in live gateway | **PROVEN_RUNTIME** |
| CLAIM | `ClaimWorker` emits `CLAIM_CREATED` with `causation_id`; nodes default `status='candidate'` | **PROVEN_RUNTIME** |
| EVIDENCE | `EvidenceAuthority.rank`: confidence×provenance×approval; **null confidence → 0.5** ("below any explicit assessment but above rejected") | WIRED_UNPROVEN |
| ASSESSMENT | Human approval events → `KnowledgePromoter` (ADD-only: approved=1.0, rejected=0.2). No machine assessment step. | WIRED_UNPROVEN (promoter live-registered) |
| VERIFIED/PROMOTED | `knowledge_nodes.status` candidate→approved/rejected; `confidence_provenance` distinguishes model vs canonical provenance | PROVEN_INTEGRATION |

**Negative knowledge states - all absent as code.** UNKNOWN, INSUFFICIENT_EVIDENCE, CONFLICTING_EVIDENCE, STALE, UNVERIFIED, NOT_APPLICABLE, NO_OPPORTUNITY_FOUND: **zero hits** in JS and Python runtime code. Nearest existing: the {candidate, approved, rejected} enum, with `rejected` as the only negative pole. Contradictions exist only as transient Python findings, never as knowledge states. The system cannot distinguish "never looked" from "looked and found nothing."

**Note:** KnowledgePromoter "ADD-only, never rewritten" contradicts `ON CONFLICT (node_id) DO UPDATE SET data=...` in knowledge_graph.js - recorded in contradiction ledger (AI).

## S. FRESHNESS / INVALIDATION

**Exists today:** repo-metadata-level snapshots (wrong granularity); static `RepositoryKnowledgeIndex/filesystem.json` + `dependency_graph.json` with no runtime consumer; per-node `source_event_id`/`correlation_id` provenance; 24h file cache (`sha256(question)[:16]` + `authority_root`) with only a per-question manual DELETE endpoint - a cached pack can serve stale evidence for 24h silently. No dependency edges, no compiler manifests, no staleness columns.

**Minimum-metadata design (no implementation):** per snapshot unit (`snapshot_id`, `content_hash`, `captured_at`, `source_version`, `namespace`); dependency edges (`INPUT_OF`/`OUTPUT_OF`/`INVALIDATES` with `compiler` + `compiler_version`); per compiler run (`input_manifest` of content hashes, `output_manifest`, `run_id`, deterministic); per knowledge node (`freshness: FRESH|STALE(reason)|UNKNOWN`, `stale_reason`, `derived_from`, `last_verified_at`); invalidation = on snapshot write, walk edges, mark STALE with reason (append-only), incremental recompile of affected runs only; packs carry the manifest and serve only when all inputs are FRESH.

## T. ENTITY RESOLUTION

**Audit: zero merge/dedupe/resolve logic exists anywhere** (`git grep` over JS+Python, non-test: no hits). PING merges nothing, silently or otherwise. Instead: parallel unlinked identifiers (JS compiler emits bare `customer:<id>`/`project:<id>` tags; `knowledge_nodes(entity_type, entity_id)` with index but no resolution; each connector with its own identity scheme; `CustomerAuthority`/`ProjectAuthority` referenced as optional compiler deps but not implemented).

**Design (no implementation):** candidate generation on cheap signals (normalized email/phone/username/org-domain+name) → evidence records per signal (additive; absence is not negative evidence) → confidence with explicit AMBIGUOUS band → human decision queue for the band, recorded as `ENTITY_LINK_DECIDED` events → links as reversible edges (never row merges), split via `ENTITY_LINK_SPLIT`, append-only history, nodes keep original `entity_id` + rebuildable `canonical_entity_id` projection. No sensitive-trait inference as match signals, ever.

## U. TEMPORAL / DURABILITY

**Headline:** Temporal = live dev-server infrastructure + two disjoint, unproven, partially broken code integrations; **zero workflows have ever executed** (verified by read-only `listWorkflow` against the live Temporal dev server).

**SDK evidence:**
- Main repo `/home/nolan/ping`: `@temporalio` **ABSENT** (no `node_modules/@temporalio`, no package.json entry). `ping-runtime/temporal/workflows/mission_workflow.js` does `require('@temporalio/workflow')` at top → **the workflow file cannot even load** in this repo.
- Codex worktree `gateway/node_modules/@temporalio`: **PRESENT, v1.21.1** (client/worker/workflow); `gateway/package.json` pins `^1.8.0`.
- Live infra: `ping-temporal-dev` container running (`temporalio/temporal`, `start-dev --db-filename /data/temporal.db`, created 2026-09-17); TCP 127.0.0.1:7233 OPEN.

**Two integrations, both unproven:**
1. `ping-runtime/temporal/` (main): `missionExecution` workflow with approval signal+query, 1h `condition()` wait, retryPolicy (1s→30s, backoff 2, max 3). Activities are **explicit stubs**; test file checks file existence + stub shapes only. Maturity: **EXPERIMENTAL**.
2. `gateway/temporal_runtime.js` + `temporal_scheduler_provider.js` (codex branch): lifecycle wrapper, mock-based unit test. Provider starts `'ConstitutionalWorkflow'` - **defined nowhere**; `wiring.js` points `workflowsPath` at `gateway/temporal_workflows.js` - **file does not exist**. **BROKEN.** Not deployed (live gateway image built 2026-09-16, predates 2026-09-17 commits). Maturity: **WIRED_UNPROVEN**.

**Responsibility split (target vs code):**

| Responsibility | Target | Actual | Verdict |
|---|---|---|---|
| Workflow history | Temporal | Nobody (0 workflows) | GAP |
| Durable timers | Temporal | Nobody durable (process-local only) | GAP |
| Activity scheduling | Temporal | `MissionScheduler._poll` 5s, **live** | **VIOLATION** |
| Heartbeats | Temporal | `MissionScheduler.renewLease` 60s, **live** PING-side | **VIOLATION** (partial) |
| Durable retry | Temporal | `MissionRuntime.failWithRetry` (durable, live) | **VIOLATION** |
| Workflow recovery | Temporal | `MissionScheduler.reapExpiredLeases` (live) | **VIOLATION** |
| Truth/authorization/identity/policy/evidence | PING | PING authorities | OK |
| Narrow protocol retry | Connectors | None (stubs) | GAP (harmless) |
| Serialization retry | DB | No code found | GAP |

Net: the documented constitutional constraint ("Temporal owns execution mechanics") is **inverted in the running system**.

**Polling loop census (17 interval sites):** Orchestration polling: `mission_scheduler.js:125` (5s, LIVE) - **the only Temporal candidate**. Durable-delivery/projection: `event_bridge.js:86` (LIVE), `event_outbox.js:99` (1s), `mission_event_bus.js:79` (1s), `materialized_views.js:113`, `control_center_subscription.js:48`. External acquisition: `continuous_acquisition.js:87`, `github_release_watcher.js:264`. Health: `circuit_breaker.js:110`, `constitutional_desktop_runtime.js:341`. Observability: `telemetry_subsystem.js:111`. Agent autonomy loops: `self_improvement_loop.js:76`, `continuous_reflection_loop.js:62`, `continuous_background_analyst.js:86`. Watchers: `constitutional_watchers.js:247`. Projection (archive/): `qdrant_integration.js:272`. `while(true)` in ollama files = stream readers, not polls. ORCA loop itself has no interval (manual `run-loop.sh`); no cron/systemd for it.

## V. ORCA A0-A7

**Old ExecutionEngine:** A0 FACADE **PROVEN** (`executor: null`, dispatch never calls `execute()`, synthetic loop preserved as deprecated). A1-A7 not attained.

**New control loop** (`orca/control-loop/orca_control_loop.js`, Hermes, witnessed 2026-09-18):

| Level | Verdict | Key evidence |
|---|---|---|
| A1 Real observation | PROVEN_RUNTIME | `01-observe.json`; live queue read (191 missions), gateway health; zero writes |
| A2 Real planning | PROVEN_RUNTIME | `02-plan.json`; capabilities resolvable vs 7 LIVE profiles |
| A3 Authorized delegation | PROVEN_RUNTIME | `authorizeWorkOrder` consulted live; Hermes executed, ORCA never did |
| A4 Evidence monitoring | PROVEN_RUNTIME | `verifyResultEnvelope`→`recordVerifiedResult`; WORKER_FAILED events read back from PG |
| A5 Autonomous follow-up | PROVEN_RUNTIME (bounded) | Operator-verified A5 record: retry-then-escalate trace + verified follow-up; discrepancies classified |
| A6 Restart resilient | **FALSIFIED** (witnessed kill -9) | Duplicate delegation across crash (two work_order_ids, two WORKER_FAILED for one task); no reconstruction. Remediation built (6a342dd27: durable objective identity, stable IDs, rendezvous, startup reconciliation, durable budget, PG advisory-lock coordinator claim, durable cancellation) - **WIRED_UNPROVEN**, no re-test |
| A7 Continuous bounded autonomy | DOCUMENTED_ONLY | Bounds enforced in-process; loop runs only via manual `run-loop.sh`; no cron/supervision |

Target law: ORCA PLANS ✓, PING AUTHORIZES ✓, EXECUTORS EXECUTE ✓, EVIDENCE PROVES ✓ - but **TEMPORAL ENDURES ✗** (durability comes from PG + evidence dirs).

**A6 smallest-change list (from the witnessed FAIL proof; NOT implemented):** Already built but unproven: stable objective/work-order/attempt identity, startup reconciliation, crash-safe dispatch rendezvous, durable budget, single-coordinator claim, durable cancellation. Still missing: (6) **re-run the witnessed kill-9 test** (the promotion gate); (7) ORCA_CYCLE_STARTED/STOPPED canonical events; (8) pre-dispatch terminal-event check by work_order_id; (9) orphan temp-artifact cleanup; (10) supervised deployment (docker restart policy); (11) verification-time SUSPECT flag for placeholder worker timestamps.

## W. APPROVAL / EFFECT IDENTITY

**Headline:** Approval/effect identity = unwired in-memory classes; the only real effect path (Hermes work orders) has no durable approval and no effect identity.

| Path | Real? | PROPOSED | APPROVED | ATTEMPTED | OBSERVED | VERIFIED | Effect ID? |
|---|---|---|---|---|---|---|---|
| Hermes work orders (only real path) | YES | yes | none durable | yes | yes | yes | none |
| Email / SMS / PostHog | Stubs | n/a | n/a | n/a | n/a | n/a | n/a |
| GitHub | Read-only | n/a | | | | | |
| Google | calendar.readonly, sync-only | n/a | | | | | |
| Browser / financial | None in repo | n/a | | | | | |

**Effect-identity verdict: NO exact effect identity exists in any live path.** `EffectAuthority` has zero importers outside its own directory, is in-memory by default (restart test proves state loss), its formula `sha256(capability.upper, target, action)` **omits mission/proposal/payload** (distinct actions to one target collide), `createEffect` never checks existence, `isEffectCompleted` has no callers. **Approval today = phantom:** `BusinessActionAuthority` wired to nothing; the only effective mechanism is ORCA policy escalation (block + `99-escalate.json`, exit 3); Temporal `approvalSignal` never runs.

**Smallest durable state machine (design, no implementation):** `PROPOSED → APPROVED|REJECTED|EXPIRED|SUPERSEDED → EFFECT_AUTHORIZED → EFFECT_EXECUTING → EFFECT_SUCCEEDED|EFFECT_FAILED` (retry = new attempt, same effect_id). Identity fix: `effect_id = sha256(approval_id)`; `action_id` includes payload hash. Durability: canonical `ping_events` rows, status-guarded transitions. Wiring: dispatcher proposes → one minimal route `GET /approvals/pending` + `POST /approvals/:id/decision` → Temporal `approvalSignal` → durable approve/reject → activity does `createEffect` → `isEffectCompleted` pre-gate → `markExecuting(providerRequestId)` → provider call with `Idempotency-Key: effect_id` → `markSucceeded/Failed`. Crash rule: re-check `EFFECT_EXECUTING` against provider by `provider_request_id` before re-execution.

## X. STORAGE / PROJECTIONS

**Headline:** Postgres is the only non-rebuildable store and the only true canonical truth. Everything else in the live footprint is a rebuildable projection, dead code, or absent. Target: ship Postgres + Qdrant only for stage 1; delete/quarantine the rest of the adapter theater.

| Store | Maturity | Unique query enabled | Source of truth | Rebuild from | If deleted |
|---|---|---|---|---|---|
| **Postgres 17** (`crx_runtime`) | PROVEN_RUNTIME | Canonical event log (`ping_events`: sha256 event_id PK, type/source/timestamp/namespace/processed, payload+metadata JSONB, indexes on type/source/namespace/causation/correlation); `ping_missions` (419 rows); knowledge graph nodes (178) | ITSELF | Replay append-only history | Total loss of truth. Only non-rebuildable store. Must be backed up. |
| **Qdrant 1.7.0** (112 vectors, 768-dim cosine, green) | PROVEN_RUNTIME | ANN semantic search | Postgres events | Re-embed from PG | Semantic search falls back to PG keyword; gateway explicitly non-blocking on Qdrant failure |
| **Neo4j** | BUILT_NOT_LIVE | Graph traversal | PG knowledge tables (live `/knowledge` routes use PG `pool`, not Neo4j) | PG | Nothing: adapter instantiated at `gateway_runtime.js:483`, referenced nowhere else |
| **Redis** | BUILT_NOT_LIVE | Cache/counters | - | N/A | Nothing: zero live requirers of `redis_adapter.js` |
| **MinIO/S3** | BUILT_NOT_LIVE | Blob artifacts | - (PG today) | N/A | Nothing: zero requirers; artifact tables all 0 rows on Oracle |
| **ClickHouse** | ABSENT | - | - | - | Zero mentions in repo |
| **Temporal** | EXPERIMENTAL | Durable workflows | PG mission tables | N/A | Not running on Oracle (profile-gated) |
| **Kafka/ZK** | BUILT_NOT_LIVE | Pub/sub | - | N/A | Zero bootstrap requirers |
| **OpenSearch/DuckDB/Tika** | DOCUMENTED_ONLY | - | - | - | Only mentioned in `generate_secrets.py` |
| **Ollama** | EXPERIMENTAL (absent on Oracle) | Real embeddings | - | N/A | Not running; embeddings fall back to SHA-256-seeded pseudo-vectors tagged `embedding:'fallback'` |

**Oracle PG census (live SELECT, 27 tables).** Populated: `ping_events` 2182, `ping_missions` 419, `knowledge_nodes` 178, `exterior_agent_credentials` 2, `repository_store_migrations` 11. **Everything else 0 rows** - including `canonical_events`, `repository_events`, `mission_events`, `mission_executions`, `customers`, `tenant_registry`, `telemetry_metrics`, `knowledge_edges`, `repository_objects`, `repository_snapshots`. Test pollution in the canonical store: `python-worker-flaky` (4), `python-worker-fail` (4), `my-test-source` (1).

**Postgres-alone verdict: YES for stage 1, with one gap.** Postgres holds events, missions, knowledge graph, registries, outbox/dead-letters. The only thing it can't do natively is ANN vector search (no pgvector in live schema). Ship **Postgres + Qdrant only** (exactly the live Oracle footprint). Everything else is dead code or gated.

**Seed contamination (PROVEN_RUNTIME):** `_seedBusinessEvents` inserts fictional customers ("Sarah Chen", "Mike Rodriguez", "Emily Watson") into `ping_events` on first boot. **8 seed rows verified live on Oracle** - fictional data indistinguishable from real business data. Env-gate the seeder (default off), tag seeded rows, purge/quarantine the 8 on Oracle - needs Nolan's word.

## Y. ACQUISITION / CONNECTORS

Connectors in gateway-src: email, sms, posthog WIRED (Agent A); github, google BUILT_NOT_LIVE; oauth_provider, capability/connector registries present. Agent F: Email/SMS/PostHog paths are stubs (P054); GitHub read-only; Google calendar.readonly sync-only; no browser/financial paths in repo. Narrow protocol retry is owned by nobody (harmless gap). Live ingress is POST /events + emitters (Review/Customer/Project/ConnectorEmitters). AcquisitionManager: zero matches anywhere - phantom, do not hunt (matches 2026-09-18 ruling).

## Z. SECURITY / NAMESPACE

- Namespace: TenantRegistry wired; namespace resolved exactly once in `emit()` (default `core::system`); privacy boundary validated at emit (PROVEN_RUNTIME, Agent A).
- Authentication: **gap.** Gateway consumes `req.authenticatedAgent` opportunistically; NO auth middleware in `routes/events.js` - the canonical ingress trusts an exterior layer that was never verified (Agent A contradiction: CONFIRMED - interior auth absent; exterior layer unverified).
- Deployed `oracle-gateway` image gates with `MISSING_AUTH` (Agent G) - diverges from main-repo gateway code; digest/provenance gap.
- `exterior_agent_credentials` has 2 rows on Oracle - left alone per read-only law; what they authorize is UNKNOWN.
- Secrets: `generate_secrets.py` mentions OpenSearch/DuckDB/Tika/Kafka (Agent G - scope out). ping-vault unhealthy on Pig (Agent A).

## AA. MISSION CONTROL

**Headline:** Cleanup commits fixed the missions surface; eight other surfaces still fetch a UI contract that never existed in any gateway. Law: UI CLAIM <= BACKEND PROOF - currently violated on most surfaces.

**Cleanup commits verified (all 2026-09-18):** `25a03ab96` (missions API now 503-with-reason, was returning mock data + fake `{success:true}`), `de1aa3e16` (fake mutations removed), `fe5f30324` (unwitnessed detail contract removed), `6b4222467` (fixture board hidden behind "Missions unavailable… until a gateway contract is configured and witnessed"). All PASS - but they only touched the missions surface.

| Surface | Verdict |
|---|---|
| /missions page + /api/missions | PASS (hidden, honest 503) |
| /witness → `GET localhost:8080/api/witness` | **FAIL - 404 on live gateway** (real route is `/mc/witness/stats`) |
| /observation → `/api/observation` | **FAIL - no such route** |
| /command-center (ConstitutionalMixer, DecisionEngine, TimeMachine, OllamaControlRoom…) → `/api/commands*` | **FAIL - no such routes; names imply nonexistent capabilities** |
| /pipeline → `/api/pipeline` | **FAIL** |
| /notifications → `/api/notifications` | **FAIL** |
| /chat (CockpitDashboard) → `/api/system/state` | **FAIL** |
| /knowledge (KnowledgeGalaxy) | **FAIL - zero fetch calls; purely decorative** |
| `mock-data/` still imported by ~20 components | **FAIL (latent)** - fixture dependency survives wherever those components render |
| `GATEWAY_URL='http://localhost:8080'` hardcoded in 7 components | **FAIL - ignores compose's `NEXT_PUBLIC_GATEWAY_URL`; UI can't deploy remotely** |
| Real contract exists: 137 gateway routes incl. `/mc/dashboard` (verified live: 417 completed / 2 failed missions, matching PG) | UI written against an `/api/*` contract that never existed in any gateway |

**Target UX** (Today / Missions / Approvals / Customers-Leads / Integrations / Automations / Knowledge / Activity-Lineage / System Health): only surfaces backed by the real gateway contract (`/mc/*`, `/missions`, `/events`, `/knowledge`) may render; everything else stays behind the honest 503 pattern until wired.

## AB. ORACLE DEPLOYMENT ARCHITECTURE

**Host (verified live, read-only; unreachable from hatch VM, inspected via Pig):** `ping-core-01`, Ubuntu 24.04.4 LTS aarch64, **1 vCPU**, **5.9 GiB RAM (753 MiB used, 5.15 GiB avail)**, **45G disk (19G used, 26G free)**, Docker Compose 2.40.3.

**Running:** ping-gateway (36h, healthy, **136 MiB**), ping-postgres 17-alpine (37h, healthy, **47 MiB**), ping-qdrant v1.7.0 (47h, healthy, **22 MiB**). All loopback-bound. Temporal/Ollama/LiteLLM absent (profile-gated). `/health` healthy; Qdrant 112 vectors; PG 27 tables as censused above.

**Resource arithmetic:** steady-state ~205 MiB containers + OS ≈ <800 MiB of 5.9 GiB - box is ~87% idle. Data footprint single-digit MB; 100x event volume still fits comfortably. No memory or disk pressure for stage 1.

**Minimum viable = Postgres (pinned digest, named volume) + gateway (pinned digest, stateless, /health) + Qdrant (pinned, explicitly non-authoritative with documented rebuild). Nothing else.** This host should NOT run Temporal, Ollama, or the full adapter menagerie - the box is small, and durability comes from PG.

**Deployment design (plan only, no mutation):** fix `bootstrap.sh` repo/branch defaults before any run; add volume-identity file outside the guarded store; nightly `pg_dump -Fc` off-host + Qdrant snapshots; **rehearsed** restore (fresh VM → restore → schema self-heal → re-embed); restart proof asserting event/mission counts unchanged; host-level watcher on `/health`; append-only `deployments.log` with git SHA + image digests per deploy (gateway digest currently unrecorded - gap).

**Deployment posture for this run:** READ ONLY maintained. No Docker install needed (present), no Git install needed, nothing installed, nothing deployed. Oracle preparation beyond this plan belongs to the subsequent execution sprint per Nolan's directive.

## AC. CRX-RUNTIME ARCHAEOLOGY

**What the checkout contains.** `/tmp/crx-runtime` @ 6c4b531 is a single-commit tree: `CRX_CONSTITUTION.md` (8 axioms, 5 root authorities, minimum replay set, elimination test); `constitutional/WITNESS_PROTOCOL.md`, `REPLAY_BOUNDARY.md`; `certification/` (golden vectors, corpus JSON, tests, ~17 reports); `constitutional-integration-lab/extracted/js_txt/*.js` (the strongest actual code: `canonical_fingerprint_service.js` 479 LOC, `formal_invariant_graph_verifier.js` 262 LOC, `deterministic_replay_harness.js` 296 LOC, 15+ merkle_anchor modules); thin runtime stubs; and `dist/runtime/replay/*.js` compiled JS whose **TypeScript sources are absent** (`runtime/` is empty; single-commit git history).

Constitutional anchor, CRX_CONSTITUTION.md Axiom 8: *"A witness attests that a binding between content, identity, and constitutional context holds. A witness does not create content, identity, lineage, or policy."* - converged with Nolan's 2026-09-18 ratified decision (Witness = derived replay attestation, not origin).

**Converged:** Axiom 1 (identity determinism; PING's IdentityAuthority pipeline is the executable form), Axiom 3 (append-only events; UnifiedEventRuntime stricter than CRX ever got), Axiom 6/7 (state derived, recording/reconstruction separated; LegacyIngressAdapter makes it a runtime gate), Axiom 8 semantics (witness flow in PING's witness_authority.ts implements the CRX witness flow nearly verbatim).

**Partial:** Axiom 4 (PING honestly treats replay as open P0 work).

**Diverged legitimately:** CRX's elimination test *eliminated Witness as an independent authority*; PING retains WitnessAuthority as a named owner (WITNESS_CREATE bypass removed, witness_root bound). PING's 2026-09-18 constitutional decisions supersede CRX law; semantics converged, jurisdiction diverged.

**Mechanisms worth recovering:**
1. `canonical_fingerprint_service.js` (fingerprint.schema.3.0): frozen 19-domain registry, length-prefixed preimages, UTF-8 NFC, strict type rejection (BigInt/Symbol/Function/undefined), negative-zero preservation. Template for F7 admitted-value-domain rules.
2. `formal_invariant_graph_verifier.js`: frozen invariant nodes + required/forbidden edges, DFS cycle detection, graph fingerprint bound into replay proof so a skipped stage invalidates the witness. Directly relevant to the 12-leaf vs 13-leaf drift.
3. `deterministic_replay_harness.js` (replay.3.0): double-execution + structural diff naming the diverged field; immutable proof boundary. The cheapest honest replay-determinism proof PING's P0 needs.
4. `merkle_anchor_chain_validator.js` + `merkle_anchor_replay_verifier.js`: authority-negative advisory contract ("NEVER mutates, NEVER assigns correctness, NEVER blocks, NEVER injects authority") plus same-chain replay detection (identical merkle root twice = replay signal). Cheap witness-drift detector.
5. `domain_lockfile_fingerprint_guard.js`: lockfile with embedded fingerprint of locked domains, CI fails closed. Template for intent/registry versioning and the Nix "declared input set."
6. `dist/runtime/replay/deterministic_failure.js`: typed deterministic failure factory. Recover the pattern for PING's failure taxonomy (no source to copy).
7. Frozen golden corpus (`tests/corpus/*.json`, `certification/vectors/replay_vectors_manifest.json`, hashes): pinned canonical bytes, fingerprints, witness roots, leaf counts. The idea PING most needs and did not inherit.

**Outdated claims to REJECT:**
1. FCA-10.5/11/12 "PASSED" certifications: **FALSIFIED live** - the shipped `dist/tests/certification/replay-unicode.test.js` throws `TypeError: canonical_json_1.CanonicalJson.stringify is not a function`. The suite cannot pass from this artifact set. Historical CRX certification proves nothing about CRX, let alone PING.
2. Same-date contradiction between `continuity_breaks.md` (replay/witness never migrated, Axiom 1/2 violations in the stubs) and `certification_report.md` (all PASSED). The breaks report is the honest one.
3. The CRX authority elimination table as a conformance checklist for PING.
4. `REPLAY_BOUNDARY.md`'s MUST-NOT list as an enforced control (all four enforcement mechanisms self-reported NOT_IMPLEMENTED).
5. "Zero dependencies / clean room" framing - the real blocker is missing sources, not dependencies.

**Recovered by PING (live trace):** the witness flow step order, domain-separated Merkle tree, and the full `runtime/kernel/replay/` file layout. Still live in PING: the duplicate-subsystem disease (`intents/witness/intent-manifest.yaml` reports a CRITICAL duplicate in `runtime/kernel/witness/`, status fragmented).

## AD. ECOSYSTEM COMPARISON

Harvest mechanisms, do not import architectures. Per-system rows (PROBLEM SOLVED | BEST MECHANISM | PING ANALOG | VERDICT | WHY), tight form:

- **Temporal** - durable workflows surviving crashes | event-sourced workflow history + deterministic replay, workflow/activity purity split | PING `runtime/temporal` + UnifiedEventRuntime | HARVEST the purity split and history-as-truth replay contract; REJECT the external cluster.
- **Restate** - durable execution without cluster ops | journaled durable handlers keyed by idempotency key; keyed journal replay | worker recovery | HARVEST keyed-journal recovery; REJECT its journal storage (Postgres owns that).
- **DBOS** (stronger, off-list) - durable execution, zero new infra | workflow log commits in the *same Postgres transaction* as business writes; recovery skips completed steps | canonical Postgres store | HARVEST same-transaction commit discipline (mechanism behind O3 durability).
- **Inngest** - durable serverless functions | `step.run()` memoization addressed by step-name hash; re-invoke body, inject saved results | agent tool loops | HARVEST step-name-hash idempotency for tool calls.
- **Hatchet** - distributed task queue | fairness queues / rate limiters / sticky assignment | engagement-pass crons | HARVEST only fair-queue/limiter semantics; REJECT as workflow engine.
- **Dagster** - pipelines as assets | software-defined assets + first-class asset lineage graph; declarative freshness policies | knowledge compilation | HARVEST asset-centric lineage: a knowledge claim is an asset with upstream assets and a freshness policy.
- **Prefect** - Python orchestration | event-driven automations with trigger grammar (`expect: [event]`, reactive/proactive, threshold/within); `emit_event` anywhere | event-driven hooks | HARVEST the trigger grammar; REJECT the Python-centric model.
- **Argo Workflows** - K8s-native workflows | artifact passing via named content-addressed references | event payloads | HARVEST the convention (steps exchange content URIs, never inline blobs); REJECT as engine.
- **Kestra** - declarative orchestration | orchestration *as data*: schema-validated YAML, LLM-generable, UI edits round-trip into the same YAML | intent manifests / research briefs | HARVEST "one file renders the prompt and drives the validator" (already Nolan's rule; Kestra is industry proof).
- **Dapr** (stronger, off-list) - portable microservice blocks | virtual actors with turn-based single-threaded execution | PING workers | HARVEST turn-based concurrency (one worker owns one entity's turn; replayable); REJECT sidecar complexity.
- **LangGraph** - stateful agents with cycles | StateGraph + checkpointer persisting full state after every node, `thread_id` resume, `interrupt_before/after` as named positions, time travel | missions + event sourcing | HARVEST checkpoint-after-node resume + interrupts as first-class graph positions (approval gates as evidence-carrying nodes). Caution: sync the checkpoint before acknowledging the step.
- **OpenAI Agents SDK** - lightweight multi-agent orchestration | handoffs (typed delegation events) + guardrails (input/output validators with tripwire) | worker delegation | HARVEST both: delegation as canonical-log handoff events; guardrails on worker boundaries.
- **Pydantic AI** - type-safe agents | typed `RunContext` dependency injection + Pydantic-validated structured outputs | worker capabilities | HARVEST DI of a typed capability context instead of ambient imports (makes authority boundaries executable).
- **HumanLayer** - human approval as tools | 12-factor agents: factor 6 (launch/pause/resume APIs), factor 7 (contact humans via async channels + webhooks, never hold a process open) | approval gate | HARVEST webhook-resume: approval request ends the turn; the response arrives as a resuming event.
- **OpenHands** - autonomous dev agents | typed event stream as the agent's memory substrate | event substrate | HARVEST the principle (already PING's); REJECT Docker-per-task.
- **Goose** - local-first agent runner | recipes: declarative runbooks with pinned tool allowlists | research briefs | HARVEST: the four rotating briefs become recipes (declared inputs, allowlist, output schema).
- **OpenCode** - terminal coding agent | provider-agnostic model interface | model access | Minimal; keep one model interface (LiteLLM-shaped). REJECT as adoption target.
- **MCP (spec 2026-07-28)** - standard agent tool/data connection | tool contract (namespaced names, title/description, JSON Schema in/out, structured output) over JSON-RPC; stateless core; 12-month deprecation discipline | capability declarations | HARVEST the tool contract + deprecation discipline; REJECT sampling/roots/logging (deprecated by SEP-2577) and server-held subscriptions.
- **A2A** (stronger, off-list) - agent discovery | Agent Card + AgentSkill discovery contract | worker capabilities | HARVEST the discovery contract shape.
- **LiteLLM** - multi-provider LLM gateway | unified proxy with fallbacks, load balancing, per-key spend tracking | model interface | ADOPT the pattern gated on volume; harvest fallbacks + spend tracking now.
- **OpenTelemetry** - vendor-neutral observability | GenAI semantic conventions + OTLP export | agent/tool spans | HARVEST the conventions; PING evidence events should carry trace context so evidence and traces join.
- **NATS** - lightweight messaging | JetStream (persistent streams, dedup windows), KV + ObjectStore | operational state | REJECT as event backbone (Postgres is canonical); HARVEST dedup-window idempotency + KV-with-watch for non-canonical state.
- **Postgres** - durable relational truth | ACID + JSONB/GIN + pgvector + LISTEN/NOTIFY + logical replication + advisory locks | canonical event store | HARVEST/ADOPT outbox-via-logical-replication (projections consume the WAL, never dual-write); advisory locks for singleton workers.
- **Qdrant** - vector search | HNSW with filter-during-traversal, quantization ladder, hybrid dense+sparse with RRF, payload multitenancy | ProjectionAuthority | HARVEST filtered ANN as the retrieval contract, the quantization ladder, and provenance-in-payload (event_id, claim_id, derivation hash on every vector).
- **Neo4j** - graph queries | GDS algorithm library | derived graph | REJECT as primary store (second writable graph = second truth); HARVEST algorithm shapes (PageRank/centrality) as batch jobs over the derived graph.
- **ClickHouse** - analytics over huge logs | MergeTree + materialized views | projections | HARVEST the materialized-view pattern (precomputed aggregates, deterministic refresh = replay [last_refresh, now)); REJECT as operational store.
- **MinIO** - S3-compatible objects | object locking / immutability (WORM) + versioning | artifact content store | HARVEST immutability-by-policy: content-addressed *and* object-locked.
- **Backstage** - service sprawl | software catalog (owner + lifecycle metadata) + docs-as-code co-located | authority inventory | HARVEST catalog-with-ownership as the machine-readable authority registry; REJECT the portal.
- **Sentry** - error tracking | issue grouping by normalized fingerprint + release tracking | failure taxonomy | HARVEST error fingerprinting as the contradiction-ledger grouping key.
- **Langfuse** - LLM observability | LLM-as-judge execution tracing (every score links to the judge's full trace) | verification | HARVEST the pattern: every VERIFIED claim links to its verification trace. REJECT the SaaS.
- **Phoenix (Arize)** - open observability/eval | OTel-native traces, evals from spans to whole trajectories/sessions | mission evaluation | HARVEST trajectory-level evaluation (missions evaluated as trajectories against replay). Phoenix's compose-around-your-own-system posture fits PING better than Langfuse's packaged workflow.
- **Stronger off-list:** dbt (DAG of tested models + change-aware rebuild = template for knowledge compilation), OpenLineage (open lineage event format; emit PING lineage edges in it), Apache Iceberg (snapshot lineage + time travel; template for knowledge snapshots).

## AE. HARVEST MATRIX

Consolidated harvest decisions from the ecosystem comparison and CRX archaeology:

| MECHANISM | SOURCE | HARVEST? | PING APPLICATION |
|---|---|---|---|
| Workflow/activity purity split + history-as-truth replay | Temporal | HARVEST | Durable orchestration contract |
| Keyed-journal recovery | Restate | HARVEST | Worker recovery without new storage |
| Same-transaction commit discipline (workflow log + business writes) | DBOS | HARVEST | O3 durability mechanism |
| Step-name-hash idempotency | Inngest | HARVEST | Agent tool-call loops |
| Fair-queue / limiter semantics | Hatchet | HARVEST (limited) | Engagement-pass crons |
| Asset-centric lineage + declarative freshness policies | Dagster | HARVEST | Knowledge claim = asset with upstream assets + freshness policy |
| Trigger grammar (`expect: [event]`) | Prefect | HARVEST | Event-driven hooks |
| Content-addressed artifact passing (URIs, never inline blobs) | Argo | HARVEST | Event payload convention |
| Orchestration-as-data, one file renders prompt + drives validator | Kestra | HARVEST | Intent manifests / research briefs |
| Turn-based single-threaded execution | Dapr | HARVEST | Worker concurrency model |
| Checkpoint-after-node resume + interrupts as graph positions | LangGraph | HARVEST | Approval gates as evidence-carrying nodes |
| Handoffs as typed delegation events + guardrails with tripwire | OpenAI Agents SDK | HARVEST | Worker delegation on the canonical log |
| Typed capability-context dependency injection | Pydantic AI | HARVEST | Executable authority boundaries |
| Webhook-resume approval (never hold a process open) | HumanLayer | HARVEST | Approval gate design |
| Recipes: declarative runbooks with pinned tool allowlists | Goose | HARVEST | Research briefs |
| Tool contract (namespaced, JSON Schema, structured output) + deprecation discipline | MCP | HARVEST | Capability declarations |
| Agent Card / AgentSkill discovery contract | A2A | HARVEST | Worker capability discovery |
| Unified proxy with fallbacks, per-key spend tracking | LiteLLM | ADOPT (gated on volume) | Model interface |
| GenAI semantic conventions + OTLP; trace context on evidence events | OpenTelemetry | HARVEST | Observability join |
| Dedup-window idempotency + KV-with-watch (non-canonical state only) | NATS | HARVEST (limited) | Operational state, never the event backbone |
| Outbox-via-logical-replication; advisory locks for singleton workers | Postgres | HARVEST/ADOPT | Projection feeds, singleton workers |
| Filtered ANN, quantization ladder, provenance-in-payload | Qdrant | HARVEST | Retrieval contract |
| Batch graph algorithms over the derived graph | Neo4j | HARVEST (limited) | Analytics, never a second writable truth |
| Materialized-view pattern (deterministic refresh = replay window) | ClickHouse | HARVEST | Precomputed aggregates |
| Immutability-by-policy: content-addressed AND object-locked | MinIO | HARVEST | Artifact content store |
| Catalog-with-ownership as machine-readable authority registry | Backstage | HARVEST | Authority inventory |
| Error fingerprinting as contradiction-ledger grouping key | Sentry | HARVEST | Failure taxonomy |
| Every VERIFIED claim links to its verification trace | Langfuse | HARVEST (pattern) | Verification evidence |
| Trajectory-level evaluation (missions as trajectories against replay) | Phoenix | HARVEST | Mission evaluation |
| DAG of tested models + change-aware rebuild | dbt | HARVEST | Knowledge compilation template |
| Open lineage event format | OpenLineage | HARVEST | Lineage edge emission format |
| Snapshot lineage + time travel | Iceberg | HARVEST | Knowledge snapshot design |
| Frozen domain registry, length-prefixed preimages, strict type rejection | CRX canonical_fingerprint_service | HARVEST | F7 admitted-value-domain template |
| Invariant graph verifier: fingerprint bound into replay proof | CRX | HARVEST | 12-vs-13-leaf drift guard |
| Double-execution replay harness + structural diff | CRX | HARVEST | P0 replay-determinism proof |
| Authority-negative advisory contract + same-chain replay detection | CRX merkle_anchor | HARVEST | Witness-drift detector |
| Lockfile with embedded fingerprint, CI fails closed | CRX | HARVEST | Intent/registry versioning |
| Typed deterministic failure factory (pattern only, no source) | CRX dist | HARVEST | Failure taxonomy |
| Frozen golden corpus: pinned bytes, fingerprints, roots, leaf counts | CRX | HARVEST | Golden vectors PING never inherited |
| Declared-input lockfile per derivation | Nix | HARVEST | Reproducible knowledge derivations |
| Content-addressed derivation outputs | Nix | HARVEST | Derivation identity |
| Pure derivation boundary with declared impurity (LLM as fixed-output derivation) | Nix | HARVEST | Model determinism boundary |

## AF. REJECTION MATRIX

| CANDIDATE | REJECT? | WHY |
|---|---|---|
| Temporal external cluster as durability engine | REJECT (adopt contract only) | Postgres + in-process journal can carry durability; a second cluster is a second truth until proven necessary |
| Restate's journal storage | REJECT | Postgres owns the journal |
| Hatchet as workflow engine | REJECT | Only fair-queue semantics needed |
| Prefect's Python-centric model | REJECT | Wrong runtime center of gravity |
| Argo as engine | REJECT | Convention only |
| OpenCode as adoption target | REJECT | Minimal unique value |
| MCP sampling/roots/logging, server-held subscriptions | REJECT | Deprecated by SEP-2577 |
| NATS as event backbone | REJECT | Postgres is canonical; NATS only for non-canonical operational state |
| Neo4j as primary store | REJECT | Second writable graph = second truth |
| ClickHouse as operational store | REJECT | Analytics projection only |
| Langfuse SaaS | REJECT | Pattern only; Phoenix posture fits better |
| Nix language / /nix/store / sandboxing | REJECT | Mechanisms only, never the complexity |
| CRX FCA-10.5/11/12 "PASSED" certifications | REJECT (FALSIFIED) | Shipped artifact throws TypeError; proves nothing |
| CRX authority elimination table as conformance checklist | REJECT | PING's 2026-09-18 decisions supersede CRX law |
| REPLAY_BOUNDARY.md MUST-NOT as enforced control | REJECT | Self-reported NOT_IMPLEMENTED |
| CRX "clean-room reproducibility" framing | REJECT | Missing TS sources; PING's sanitized-harness standard replaces it |
| Docker-per-task (OpenHands) | REJECT | Wrong cost model for PING workers |
| Dapr sidecar complexity | REJECT | Turn-based concurrency only |
| A second witness identity authority | REJECT | Ratified: witness_root is proof-content identity; attestation carries canonical event identity |
| A witness table "because one existed historically" | REJECT | Ratified: do not create one |
| New WitnessAuthority component | REJECT | Ratified |

## AG. DUPLICATION MATRIX

Every known pair or family of implementations that claim the same decision. Disposition follows Nolan's classify-first rule: CANONICAL, LEGACY_INGRESS, COMPATIBILITY ADAPTER, PRESERVED_INACTIVE, FORENSIC, DERIVED, or UNKNOWN. Deletion only after deadness is proven.

| DUPLICATION FAMILY | IMPLEMENTATIONS | LIVE? | DISPOSITION | DEADNESS PROOF STATUS |
|---|---|---|---|---|
| `event_` identity minters | V2 IdentityAuthority (certified) / Era H old runtime / TenantOS UUIDv5 / ConstitutionalEventSourcing / EventWriteAuthority / event_bus | V2 (frozen), Era H (live) | V2 CANONICAL; Era H LEGACY_INGRESS; TenantOS LEGACY_INGRESS; ConstitutionalEventSourcing quarantine (DUPLICATE); EventWriteAuthority + event_bus PRESERVED_INACTIVE | Constitutional/EventWrite/event_bus: zero live callers, provable |
| `sequence` semantics | PG sequence (certified) / canonical_events MAX+1 / repository_events caller-supplied / constitutional_events MAX+1 | none live | Certified KEEP; others renamed (`tenant_sequence`, `chain_position`) | Rename is safe (code-local) |
| Replay verifiers | DeterministicReplayEngine (12-leaf) / TemporalReplayProvider / historical replay.ts | Engine | Engine CANONICAL; TemporalReplayProvider COMPATIBILITY ADAPTER (archive); replay.ts PRESERVED_INACTIVE | Others: no live callers |
| Witness minting surfaces | canonical_workers (frozen) / WITNESS_CREATE route (removed @91e1337f4) / WitnessAuthority (branch) / WitnessRecorder (legacy) | canonical_workers | canonical_workers CANONICAL; WITNESS_CREATE removed; WitnessAuthority REJECTED (name collision); WitnessRecorder PRESERVED_INACTIVE | WITNESS_CREATE: no live route in frozen HEAD |
| Observation plane | python observation_worker / JS ClassificationWorker | both | One must win | Consumer census required first |
| Claim plane | python claim_detector / JS ClaimValidationWorker | both | One must win | Consumer census required first |
| ContextPack | python content pack / JS ref-list pack / codex compiler | python (brainos) | Codex design CANONICAL (target); python LEGACY_INGRESS; JS ref-list PRESERVED_INACTIVE | JS never instantiated |
| Capability vocabularies | SaaS connector registry / AGENT_PROFILES / MCP matrix | AGENT_PROFILES | AGENT_PROFILES CANONICAL (de facto); MCP schema-only; SaaS registry DERIVED | MCP has no backend |
| Mission models | MissionRuntime / MissionAuthority v1 / MissionAuthority v2 / ORCA objective | MissionRuntime + ORCA | MissionRuntime CANONICAL; ORCA objective COMPATIBILITY (reconcile); v1/v2 PRESERVED_INACTIVE | v1/v2: unwired |
| Temporal integrations | gateway provider / kernel provider / bootstrap adapter | none | One provider CANONICAL; others archived | Deadness: zero live workflows |
| `repository_events` | appendEvent writer vs decided `project(E)` projection | writer live | Writer DERIVED/PRESERVED_AUDIT_HISTORY; `project(E)` to be implemented or decision revisited | Trace required |
| Context authorities | never-instantiated retrieval/compression authorities | none | PRESERVED_INACTIVE | Zero callers |

## AH. DELETION MATRIX

Proposed only; nothing deleted by this run. Order is by confidence of deadness; every row needs its deadness proof before execution.

| CANDIDATE | CLASSIFICATION | DEADNESS EVIDENCE | BLOCKER / RISK | CONFIDENCE |
|---|---|---|---|---|
| `ConstitutionalEventSourcing` (gateway/constitutional_event_sourcing.js + tables) | DUPLICATE | config-gated; no live bootstrap wiring found | History-mutating upsert; quarantine not delete | high |
| `EventWriteAuthority`, `event_bus` | PRESERVED_INACTIVE | unwired; one collides per event type by construction | Forensic value of the collision example | high |
| `DeterministicIdAuthority` | DEPRECATED | consumed only by WorkflowIdentityAuthority | Migrate consumer to `generateId` first | high |
| `hashEventSchema` / `hashEventCanonical` | BROKEN | double-serialize throws by inspection | Only reachable via patch-validation script; fix or delete | high |
| Dead store adapters (Neo4j boot, Redis adapter, S3 adapter, Kafka scaffolding) | PRESERVED_INACTIVE | no live instantiation | Keep the contracts if a projection need appears | high |
| `test_*.js` files inside production image | HYGIENE | test files ship in prod image | Remove from build context, not from history | high |
| Mock-data imports (~20 UI components) | HYGIENE | UI dead without gateway | Per-surface replacement, not blanket deletion | high |
| Hardcoded `localhost:8080` (7 UI components) | HYGIENE | never matches deployed gateway | Replace with env config | high |
| Dead witness fields (`leaf_count`, `tree_height` in 2 code paths) | HYGIENE | unused | Zero behavioral risk | high |
| Static Windows-path context packets | LEGACY | never executed in current runtime | Verify no consumer first | medium-high |
| Never-instantiated context retrieval/compression authorities | PRESERVED_INACTIVE | zero callers | Consumer census first | medium-high |
| Legacy WITNESS_CREATE doc references | STALE DOCS | no live route | Docs updates are a mutation-sprint item | high |
| Broken Temporal scheduler provider (`temporal-scheduler-provider`) | BROKEN | wrong module path, zero callers | Converge providers first | high |
| Frozen nested worktrees (`constitutional-convergence-nested` and friends) | PRESERVED_INACTIVE | HEAD == parent HEAD; detached duplicates | Archive manifest before removal | medium-high |
| `/tmp/bisect-eval006` scratch | SCRATCH | detached | Confirm no reference | medium |
| Fictional demo seed rows (Oracle `ping_events`) | CANONICAL-DATA POLLUTION | seeded 2026-09-17, non-business content | Requires Nolan's explicit authorization; purge vs quarantine is an operator decision | high (deadness) / operator (action) |

## AI. CONTRADICTION LEDGER

Minimum fields per program: id, opened_at, owner, blocking_unit, status, closure_condition, evidence_required. Owner is provisional (Pigi as coordinator) pending Nolan's assignment.

| ID | CONTRADICTION | STATUS | OWNER | BLOCKING UNIT | CLOSURE CONDITION | EVIDENCE REQUIRED |
|---|---|---|---|---|---|---|
| AI-01 | Certified Event sequence exists in frozen worktree; live Pig DB has no sequence column | open | coordinator | BH, BD-02 | Certified code deployed with recorded provenance; live replay order proven | deployment record + restart/replay proof |
| AI-02 | Witness fixes frozen; live image runs pre-fix code | open | coordinator | BH, BD-02 | Live image digest matches frozen tree or documented delta | image digest + build record |
| AI-03 | Executed witness artifact 12 leaves; TS source 13 leaves | open | coordinator | BD-03 | Sanctioned pinned rebuild; Era 12 preserved, Era 13 versioned | rebuild script + golden vectors |
| AI-04 | Live root omits constitutional law commitment (the only true external policy binding) | open | coordinator | BD-03 | Era-13 artifact deployed; attestation binds leaf set | witness construction version field |
| AI-05 | Future TS rebuild would silently change every historical root | open | coordinator | BD-03 | Explicit versioning; historical roots preserved | version-bound attestations |
| AI-06 | Live replay silently truncates (10k cap) / skips (malformed) yet claims verified:true | open | coordinator | BD-04 | Truncation fails closed or is attested | fail-closed test |
| AI-07 | Temporal server live; zero workflows ever executed | open | coordinator | BD-12 | Workflows execute or Temporal removed from contract | workflow execution history |
| AI-08 | PING owns retry/reclaim/scheduling; docs say Temporal owns execution mechanics | open | coordinator | BD-12 | A6 proof then durability decision on evidence | kill-9 re-test results |
| AI-09 | ContextPack claimed as model boundary; direct Qdrant-to-Ollama path wired in live gateway | open | coordinator | BD-08 | Codex-branch work landed; bypass removed or governed | landed commits + traffic audit |
| AI-10 | Two incompatible ContextPack schemas both claim canonicity | open | coordinator | BD-08 | One compiler; other classified | landed compiler + migration |
| AI-11 | Python and JS Observation/Claim planes compete | open | coordinator | BD-07 | One plane; other classified | consumer census + migration |
| AI-12 | CapabilityAuthority claimed live in comments; missing from all branches | open | coordinator | BD-07 | Phantom references removed; de facto gate documented | doc/code sweep |
| AI-13 | Mission Control expects /api/*; gateway serves /mc/* | open | coordinator | BD-14 | UI repointed to real contract | per-surface contract map |
| AI-14 | Fictional demo events in production canonical truth | open | coordinator (Nolan decides) | BD-15 | Purge or quarantine with explicit authorization | operator decision record |
| AI-15 | KnowledgePromoter says add-only; SQL updates existing rows | open | coordinator | BD-10 | Policy/code aligned | code fix or doc correction |
| AI-16 | Evidence verifier trusts string hash when no verifier supplied | open | coordinator | BD-09 | Fail-closed or explicit trust annotation | verifier fix + test |
| AI-17 | Lineage has no DAG legality anywhere | open | coordinator | BD-11 | Cycle/topological validation in worker path | validation tests |
| AI-18 | Three WorkOrder identity schemes compete | open | coordinator | BD-07 | One scheme; others classified | identity convergence |
| AI-19 | Two mission identity schemes compete | open | coordinator | BD-07 | One scheme | identity convergence |
| AI-20 | Approval/effect identity only as unwired, restart-unsafe classes | open | coordinator | BD-13 | Postgres-wired state machine | durable store + restart test |
| AI-21 | Live build provenance missing (devin-boundary2 source unrecorded) | open | coordinator | BH | Build record for every image | deployments.log + digest pins |
| AI-22 | Qdrant and Vault unhealthy on Pig; Oracle Qdrant healthy | open | coordinator | BD-09 | Health restored or fallback made honest | health checks |
| AI-23 | Unknown /tmp/pgq6.js executes inside Pig gateway container | open | coordinator | BD-01 | Provenance identified and recorded | process audit |
| AI-24 | ORCA A6 remediation exists but untested (kill-9 duplicate delegation) | open | coordinator | BD-11 | Witnessed re-test passes | test evidence |
| AI-25 | Oracle gateway image diverges from repo; digest unrecorded | open | coordinator | BH | Digest pinned and logged | image digest record |
| AI-26 | 73/73 ledger claim vs 71 check entries in harness source | open | coordinator | BD-02 | Reconciled count or corrected ledger | re-count / ledger fix |
| AI-27 | `EventRepository.project(E)` decided but not implemented; appendEvent still a primary writer | open | coordinator | BD-05 | Implement projection or revisit decision | code or decision record |
| AI-28 | `canonical_events` wall-clock UUIDv5 + (tenant_id, sequence) dedup manufactures true duplicates | open | coordinator | BD-05 | Deterministic ID or direct emit | C-033 fix |
| AI-29 | Four `event_` preimages share one output namespace | open | coordinator | BD-05 | Distinct prefixes or single minter | identity convergence |
| AI-30 | Live bootstrap wires old EventBridge with retired repository_events re-emission leg | open | coordinator | BD-02 | Certified stack deployed | deployment record |

## AJ. UNKNOWN LEDGER

Ranked by decision-blocking power. These are the questions no agent could answer from read-only evidence; each names the experiment or authorization that would resolve it.

| ID | UNKNOWN | BLOCKS | RESOLUTION PATH |
|---|---|---|---|
| AJ-01 | Purpose and provenance of `/tmp/pgq6.js` in the Pig gateway container | BH (deploy anything to Pig) | Read-only process/container audit; hash it; match against known sources |
| AJ-02 | Exact live gateway source commit / image digest for `devin-boundary2` | Every certified claim | Build record reconstruction; image inspect; digest pinning going forward |
| AJ-03 | Whether exterior auth actually protects Pig canonical ingress | Ingress hardening decision | Controlled unauthenticated POST attempt against staging-identical surface (authorized test) |
| AJ-04 | Who builds compiled replay artifacts and from which TS revision | Witness rebuild plan | Locate the build pipeline/script that produced the 12-leaf artifact |
| AJ-05 | Whether any legacy witness boot remains active | Witness convergence | Grep live image for legacy boot paths (done for frozen HEAD; live image pending) |
| AJ-06 | Exact production replay payloads and intended replay boundary | Replay certification | Operator statement of intended boundary + payload capture plan |
| AJ-07 | Whether ResultEnvelope verification should stay structural or gain semantic verification | WorkOrder/Result convergence | Architectural decision; propose separate owner for content verification |
| AJ-08 | Which Observation/Claim plane handles production traffic | Plane merge | Live traffic census through both planes |
| AJ-09 | Whether the A6 remediation passes crash/restart proof | Durability decision | Supervised kill-9 re-test (authorized experiment) |
| AJ-10 | What the two Oracle exterior-agent credentials authorize | Security posture | Scoped capability review (no secret reads; count and scope only) |
| AJ-11 | Restart durability on Oracle (gateway, PG) | Oracle certification | Controlled restart test (authorized) |
| AJ-12 | Whether test/demo rows should be quarantined, retained, or removed | Canonical data hygiene | Nolan's explicit decision |
| AJ-13 | `eventSummary.total: 0` semantics despite 2182 Oracle events | Monitoring honesty | Read the counting code path; label or fix |
| AJ-14 | `enable_event_sourcing` gate state in the live image | Duplicate-minter risk | Inspect live image config (read-only) |
| AJ-15 | 73-vs-71 harness count reconciliation | Certification hygiene | Re-run count from source; correct the ledger |
| AJ-16 | Live DB contents census (event types, sources, namespaces) | Event Authority completion | SELECT-only census with a non-secret read path (credential handling per policy) |
| AJ-17 | 2026-09-17 18:47 UTC ping-core-01 SSH session purpose | Oracle provenance | Operator memory or SSH logs (read-only) |
| AJ-18 | Whether exterior-agent `/events` traffic is intentional or bypass | Ingress decision | Traffic census on the Oracle gateway |
| AJ-19 | Whether LiteLLM absence on Oracle is intentional | Oracle contract | Operator statement; keep absent until proven needed |
| AJ-20 | Whether qdrant points on the Pig are salvageable for projection rebuild | Pig Qdrant health | Inspect point count/health read-only; rebuild-from-PG plan is the default |

## AK. TARGET CANONICAL OBJECT MODEL

One identity rule per object; V2 `generateId` (RFC-8785, SHA-256, versioned preimage) for all new minting. Era-marking for legacy rows (Era H 64-hex, TenantOS UUIDv5, constitutional_events) so old events replay under their original rules. `sequence` reserved exclusively for the canonical DB-allocated replay order; per-object chain positions renamed (`chain_position`, `tenant_sequence`). No new standalone identity authorities; witness remains a canonical event, not a second object universe.

## AL. TARGET AUTHORITY MODEL

One decision, one owner, enforced at the call site (not in comments): UnifiedEventRuntime (event acceptance + namespace), IdentityAuthority (identity), CanonicalAuthority/CanonicalBytes (hashing), DeterministicReplayEngine (replay verification), canonical_workers chain (attestation), MissionRuntime (mission lifecycle), authorizeWorkOrder (capability gate), verifyResultEnvelope (result truth), EvidenceAuthority (evidence verification), one observation plane, one claim plane, one context compiler, Temporal (execution mechanics, after A6 proof), LineageWorker (lineage + DAG legality). Phantom names removed or documented as aliases.

## AM. TARGET IDENTITY MODEL

`generateId(type, data)` is the only minting primitive. Preimage = `{type, identity_version, ...decision-specific fields}`; no wall-clock, no JSON.stringify-without-canonicalization, no per-type constants colliding in shared namespaces. Distinct type prefixes per identity (`event_`, `mission_`, `workorder_`, `result_`, `effect_`, `approval_`, `context_`, `witness_`). 16-hex truncation replaced with a documented, designed length. Artifact serializer fixed to recurse (drops nothing). Double-serialize throw removed.

## AN. TARGET EVENT MODEL

`ping_events` is the only canonical event store. Acceptance = `UnifiedEventRuntime.emit()` (validate, canonicalize, identify, hash, PG-sequence, persist atomically, dispatch). Legacy writers converge through an explicit LegacyIngressAdapter (validate/normalize/authenticate/namespace/canonicalize), default-deny, with an explicit allowlist. `canonical_events` is a legacy ingress surface, not canonical. `repository_events` is a derived projection (`project(E)`), not a second writer. No NATS/Kafka second backbone. Replay = boring reader over the canonical log in sequence order; replay authority lives with the event authority.

## AO. TARGET EXECUTION MODEL

Provenance-carrying chain: ORCA derives objective → authorizeWorkOrder (fail-closed) → stable WorkOrder/attempt IDs → executor dispatch → ResultEnvelope (binding/coherence verified; content truth a separate evidence step) → recordVerifiedResult → canonical WORKER_COMPLETED/FAILED → mission lifecycle → replay-verified attestation. Execution mechanics (scheduling, timers, retry, recovery) converge on Temporal once A6 passes; until then the PG-lease scheduler is the documented owner, not the aspiration.

## AP. TARGET KNOWLEDGE MODEL

Postgres `knowledge_nodes` is the canonical knowledge store. Negative states exist as code: UNKNOWN, INSUFFICIENT_EVIDENCE, CONFLICTING_EVIDENCE, STALE, UNVERIFIED, NOT_APPLICABLE, NO_OPPORTUNITY_FOUND (not just candidate/approved/rejected). Freshness is structural: `valid_from`, `valid_until`, `superseded_by`, `freshness_ttl`, `next_refresh_due`. Claims are content-addressed to their source snapshots. Qdrant/Neo4j are projections; PG is rebuildable truth.

## AQ. TARGET RETRIEVAL MODEL

Retrieval compiles evidence; it never asserts truth. The ContextPack compiler (codex-branch design, landed) is the model-independence boundary: canonicalize, dedupe, conflict-throw, deterministic ordering, tenant filter, input_manifest, selected-evidence manifest (hashes of selected evidence, not just query inputs). The live direct Qdrant-to-Ollama bypass is removed or governed. Synthesis fails closed (no canned output on exception). Answer synthesis always cites selected evidence.

## AR. TARGET STORAGE MODEL

Postgres is the only canonical, non-rebuildable store. Classification: FACT/EVENT HISTORY (ping_events, mission events), DERIVED KNOWLEDGE (knowledge_nodes, projections), MODEL OUTPUT (syntheses, embeddings inputs), OPERATIONAL STATE (leases, cursors, attempts), PROJECTION/CACHE (Qdrant points, Redis). Qdrant is a rebuildable retrieval projection. Neo4j, Redis, S3/MinIO, Kafka stay unwired until a proven unique query or operational need. ClickHouse deferred. Stage-1 Oracle: Postgres + stateless gateway + Qdrant, all pinned.

## AS. TARGET ORCHESTRATION MODEL

ORCA owns: observation (A1), planning (A2), authorized delegation (A3), evidence monitoring (A4), bounded follow-up (A5). PING owns: authorization (authorizeWorkOrder), execution mechanics (Temporal after A6 proof; PG scheduler until then), result verification, attestation. Durable approval/effect state machine gates every externally mutating action: PROPOSED → APPROVED/REJECTED/EXPIRED/SUPERSEDED → EFFECT_AUTHORIZED → EFFECT_EXECUTING → EFFECT_SUCCEEDED/EFFECT_FAILED, with isEffectCompleted as the pre-gate on retry and provider request-IDs for post-crash reconciliation.

## AT. TARGET UI MODEL

Law: UI CLAIM <= BACKEND PROOF. Mission Control is a projection of the gateway contract: every surface maps to a real route; nothing invents `/api/*`. States: Today, Missions, Approvals, Customers/Leads, Integrations, Automations, Knowledge, Activity/Lineage, System Health. Empty/failed/503 states are honest. Demo seeder default-off and clearly tagged. No hardcoded hosts; no mock data in production builds.

## AU. TARGET SECURITY MODEL

Ingress authentication is explicit and proven: either the exterior layer is demonstrated to protect canonical ingress (tested), or in-repo auth is added to `/events`. Namespace is a security boundary (emit-time validation, regex-aligned adapters). Secrets never in files, memory, or chat; bearer tokens resolved at runtime from the container environment. Exterior-agent credentials are scoped and auditable. Fail-closed everywhere: unknown callers, unknown capabilities, unknown tenants, unverified hashes.

## AV. TARGET FAILURE MODEL

Failures are typed, deterministic, and never hidden: what failed, which boundary, retryable or not, whether state changed, whether evidence remains valid, whether the result is trustworthy. Service failure never becomes `[]`; config failure never becomes `None`; embedding failure never becomes a missing vector silently. Retry uses a new attempt with the same logical effect ID; isEffectCompleted prevents double-execution; provider request IDs enable post-crash reconciliation. Replay truncation is a failure, not a silent reduction.

## AW. TARGET REPLAY/VERSION MODEL

Every attestation binds: construction version (`witness.merkle.v1-12` for the historical era, `witness.merkle.v2-13` for the law-commitment era), algorithm, leaf count/tree height, engine version, canonicalization/hash versions, law manifest, invariant definitions, input-set identity, truncation/skip flags, replay boundary definition. Historical 12-leaf roots remain replayable under their original construction. Rebuilds are sanctioned and pinned: a recorded script, from a recorded TS revision, producing golden vectors that CI asserts. Five-year replayability = these bindings + preserved source inputs + preserved law manifest, not a promise.

## AX. FIRST BUSINESS PROOF

The trace that would prove PING works as a business machine, end to end, with one arrow per step and no fiction:

`LEAD_CREATED` (canonical event, V2 identity) → MissionRuntime mission (idempotent, namespaced) → context compiled from selected evidence (codex-branch compiler, tenant-filtered) → authorizeWorkOrder (fail-closed) → WorkOrder/attempt (stable IDs) → executor → ResultEnvelope (binding verified) → human approval (durable, expiring) → effect identity minted → email sent (provider request ID) → outcome observed (open/reply) → evidence recorded → customer knowledge updated → future retrieval returns the updated state.

**First broken arrow today:** approval has no durable state and effect identity does not exist, so the trace cannot legally cross the human-to-external boundary. Second: the context pack is bypassed in the live gateway, so the "compiled from selected evidence" arrow is aspirational. Third: outcome observation (A4) is proven in ORCA but not wired to business events.

## AY. FIRST KNOWLEDGE-COMPOUNDING PROOF

The §35 snapshot test: snapshot source document A and snapshot B (content hashes recorded), distill both, assert claims differ exactly where the source diff justifies and are identical elsewhere. **Requires:** source snapshot content hashes, dependency edges claim-to-source, a distill path that records which claims derive from which inputs. None exist today; the distill sweep is a scheduled process with no dependency tracking. This proof is the gate for the targeted-recompile graph (BD-10).

## AZ. FIRST DURABLE-AUTONOMY PROOF

The §36 A6 re-test: start an ORCA cycle, kill -9 mid-cycle, restart, assert exactly-once delegation (no duplicate side effects), cycle state recovered, all transitions attested. **Requires:** ORCA_CYCLE_STARTED/STOPPED events in ping_events, PG-backed cycle state, pre-dispatch terminal-event check, supervised deployment with pre/post event counts and proof-bundle archive. Current state: remediation exists in a branch, untested; A6 remains falsified. No A6 claim before this proof.

## BA. TOP DELETIONS

Proposed only; execution belongs to a later sprint with deadness proofs per AH.

1. **Quarantine `ConstitutionalEventSourcing`** (duplicate store + duplicate `event_` minter + history-mutating upsert + MAX+1 with fallback-to-1). Config-gated dormant is not fail-closed enough.
2. **Archive `EventWriteAuthority` and `event_bus`** (unwired `event_` minters; one collides per event type by construction).
3. **Remove dead store adapters** (Neo4j boot instantiation, Redis adapter, S3 adapter, Kafka scaffolding) - never live; keep the contracts, not the wiring.
4. **Converge the two Temporal providers** into one env-gated provider; delete the broken scheduler provider.
5. **Remove `test_*.js` from the production image** and mock-data imports from UI components (per-surface, with real contract replacements).
6. **Purge or quarantine the 8 fictional seed events** from Oracle `ping_events` (Nolan's explicit authorization required; canonical data is not deleted on agent say-so).
7. **Archive nested frozen worktrees and `/tmp/bisect-eval006`** after a deadness manifest.
8. **Delete dead witness fields and legacy static Windows-path context packets** after consumer census.

## BB. TOP ARCHITECTURAL RISKS

1. **Certified-not-running gap** (AI-01/AI-02): every certified claim is currently false of the live system. Risk: decisions and marketing rely on code that is not executing.
2. **Unknown live provenance** (AI-21/AI-23): `devin-boundary2` source unrecorded; unknown `/tmp/pgq6.js` in the gateway container. Risk: unauditable execution.
3. **Identity namespace collisions** (AI-29, F1-F5): an `event_` ID does not identify its minter. Risk: cross-era, cross-minter confusion in replay and evidence.
4. **Silent replay reduction** (AI-06): `verified:true` certifies the survivors, not the intended set. Risk: false certification of incomplete replays.
5. **No durable approval/effect** (AI-20): the only real effect path has neither. Risk: any externally mutating executor is unsafe today.
6. **Dual observation/claim planes** (AI-11): divergent event names feeding the same pipeline slots. Risk: silent divergence in the evidence base.
7. **Source-universe sprawl** (C): 8 worktrees, 40+ branches, 80 unpushed commits. Risk: the next "which is real" dispute is already loaded.
8. **Mission Control fiction** (AI-13): UI surfaces that invent data. Risk: operator decisions on false signals; UI CLAIM > BACKEND PROOF.
9. **ContextPack bypass** (AI-09): the model-independence boundary is wired around. Risk: ungoverned model access to uncompiled truth.
10. **Temporal aspiration vs PG reality** (AI-07/AI-08): docs promise what the runtime does not run. Risk: durability claims without a mechanism.

## BC. TOP 10 HIGHEST-CONFIDENCE IMPROVEMENTS

Ranked by (consequence of inaction) x (confidence it is correct) x (boundedness).

1. **Close the certified-code/live-code gap.** Promote the frozen Event Authority + Witness stack into the deployed build with recorded provenance (BH first). Until this happens, every certified claim is aspirational.
2. **Sanctioned witness rebuild.** Preserve Era 12 (`witness.merkle.v1-12`), build Era 13 (`witness.merkle.v2-13`) from TS through a pinned, recorded script, bind all reproduction parameters per attestation, add golden vectors and leaf-set assertions.
3. **Fail closed on replay input reduction.** The 10k cap and malformed-envelope skips must fail or be explicitly attested; `verified:true` must mean the intended set replayed whole.
4. **Quarantine the duplicate event minters/stores** (ConstitutionalEventSourcing, EventWriteAuthority, event_bus) and implement or reclassify `EventRepository.project(E)`.
5. **Build durable approval/effect identity in Postgres** (corrected formulas, full state machine, isEffectCompleted pre-gate) before any externally mutating executor is considered safe.
6. **Resolve the ingress auth boundary.** Prove the exterior layer protects canonical ingress or add in-repo auth to `/events`. Unproven either way today.
7. **Collapse the observation/claim dual plane** to one implementation with one event vocabulary.
8. **Make Mission Control truthful:** repoint to the real gateway contract, env-gate the seeder, purge/quarantine fictional seed rows (Nolan's call).
9. **Land the codex-branch context work** (canonicalization, conflict-throw, tenant filter, contextPackId binding, self-describing packs) and remove or govern the direct RAG bypass.
10. **Establish targeted recompile:** machine-maintained, content-addressed dependency graph from source snapshots through compiler runs to claims, enabling targeted invalidation and incremental recompilation. This is the moat mechanism; everything else is hygiene.

## BD. DEPENDENCY-ORDERED NEXT IMPLEMENTATION PLAN

Each step's dependencies are the steps that must complete first. Nothing here executes in this read-only run.

- **BD-01. Build provenance (BH).** Record source SHA + tree hash + image digest for every build; append-only `deployments.log`; audit `/tmp/pgq6.js`. Unblocks: everything that claims "this code is running."
- **BD-02. Promote the certified stack.** Frozen Event Authority + Witness fixes into the deployable build; controlled schema migration (sequence column on a live DB that lacks it); dual-era replay plan; restart/replay proof. Unblocks: certified behavior being true.
- **BD-03. Witness version boundary.** Era 12 preserved, Era 13 sanctioned rebuild, per-attestation binding, golden vectors. Depends on: BD-01. Unblocks: honest attestation.
- **BD-04. Replay honesty.** Fail-closed or attested input reduction. Depends on: BD-02. Unblocks: `verified:true` meaning something.
- **BD-05. Event store convergence.** Quarantine duplicate minters; implement `EventRepository.project(E)` or revisit the decision; fix C-033 dedup; unify `event_` namespace. Depends on: BD-02. Unblocks: single canonical event truth.
- **BD-06. Identity convergence.** One scheme per identity; V2 `generateId` everywhere; era-marking; artifact serializer fix. Depends on: BD-05. Unblocks: preimage sanity.
- **BD-07. Plane collapse.** One observation plane, one claim plane, one capability vocabulary, one WorkOrder/mission identity scheme. Depends on: BD-06. Unblocks: evidence-base coherence.
- **BD-08. Context convergence.** Land codex work; self-describing packs; tenant filter; govern or remove the RAG bypass. Depends on: BD-07. Unblocks: model-independence boundary.
- **BD-09. Retrieval honesty.** Fix Qdrant/Vault health; real embeddings or labeled fallback; fix EvidenceAuthority trust-on-claim. Depends on: BD-08. Unblocks: trustworthy retrieval.
- **BD-10. Knowledge mechanics.** Negative states, freshness columns, content-addressed dependency graph, targeted invalidation. Depends on: BD-09. Unblocks: knowledge compounding.
- **BD-11. Durability proof.** Re-run the witnessed kill-9 A6 test; PG-backed ORCA cycle state; lineage DAG legality. Depends on: BD-02. Unblocks: restart-resilient autonomy.
- **BD-12. Temporal decision.** On A6 evidence: adopt Temporal or certify the PG-native scheduler. Depends on: BD-11. Unblocks: honest execution mechanics.
- **BD-13. Approval/effect identity.** Postgres-wired state machine; corrected effect formula; isEffectCompleted pre-gate; provider request-ID reconciliation. Depends on: BD-12. Unblocks: safe external effects.
- **BD-14. Mission Control truthfulness.** Real contract per surface; seeder gated; fiction removed. Depends on: BD-02. Unblocks: honest operations.
- **BD-15. Oracle certification.** Pinned digests; nightly pg_dump; rehearsed restore; restart proof; seed-data decision. Depends on: BD-01, BD-02. Unblocks: a deployment anyone can trust.
- **BD-16. First business proof** (AX) and **knowledge-compounding proof** (AY). Depend on: BD-13, BD-10 respectively. Unblock: the product thesis.

## BE. WHAT NOT TO BUILD

- A second witness identity authority or a witness table (the attestation is a canonical event; `witness_root` is proof-content identity).
- A second event backbone (NATS/Kafka) - replay reads the canonical log; it does not need another bus.
- A Temporal cluster before the contract and the A6 proof - mechanism follows evidence.
- A second writable graph as primary store - Neo4j is a projection or nothing.
- UI surfaces without backend proof - UI CLAIM <= BACKEND PROOF is the law.
- Semantic content verification inside ResultEnvelope - content verification is a separate owner with its own evidence, not a binding check.
- Nix-the-whole-system - pin what matters (digests, artifacts, rebuilds); do not re-platform for purity.
- Another continuity/event/agent store - audit found the stores; the missing layer is instrumentation, correlation IDs, and projection.
- Entity resolution by destructive row merging - reversible link/split events only, never merged rows, no sensitive-trait inference.
- A new identity authority per object type - one primitive, type prefixes, era marking.

## BF. FINAL TARGET ARCHITECTURE

The smallest coherent PING that keeps every proven capability and discards every phantom:

**Canonical core (Postgres):** `ping_events` (sole event truth, PG-sequenced, V2 identities), `ping_missions` (lifecycle), `knowledge_nodes` (with negative states, freshness columns, dependency edges), approvals/effects (durable state machines), cycle state, context packs (self-describing, content-addressed).

**Stateless gateway:** emit (validate/canonicalize/identify/hash/sequence/persist/dispatch), LegacyIngressAdapter (explicit allowlist, default-deny), canonical worker chain (OBSERVATION → CLAIM → REPLAY → WITNESS → LINEAGE → PROJECTION), mission scheduler (until Temporal proven), evidence verification, replay reader, witness construction (versioned, pinned rebuilds).

**Projections (rebuildable):** Qdrant (semantic recall), Neo4j (optional relationship view), Redis (cache), MinIO (blobs). None canonical.

**Orchestration:** ORCA (observe/plan/delegate/monitor/follow-up) + authorizeWorkOrder (fail-closed) + Temporal (execution mechanics, post-A6-proof) + durable approval/effect gating for every external action.

**Boundary:** one context compiler (codex design, landed) between truth and models; MCP as tool contract only; LiteLLM as provider proxy.

**UI:** Mission Control as a truthful projection of the gateway contract; nothing invented.

**Deployment:** pinned digests, recorded provenance, append-only deployments.log, nightly pg_dump, rehearsed restore, env-gated seeder, no demo data in canonical truth.

## BG. FINAL MOAT ASSESSMENT

PING's moat is not agents, not models, not the event log. It is the **compounding loop**: source change → targeted recompile → better knowledge → better context → better execution → outcome evidence → better knowledge. The moat deepens as the marginal cost of understanding the organization falls.

Today the loop is open at exactly one place: **targeted recompile does not exist.** No dependency graph, no content-addressed claims, no incremental invalidation. The distill sweep is a scheduled process, not a mechanism. Every other gap in this report is hygiene or honesty; this one is the business. Close it and every future source document, every execution outcome, and every correction makes the system permanently smarter at falling marginal cost. Leave it open and PING is an expensive RAG pipeline with good ceremony.

Second-order moats, once the loop closes: replay-verified attestations (provable history competitors cannot fake cheaply), durable approval/effect identity (the audit trail that regulated customers require), and the versioned witness construction (reproducible boundaries as a product feature).

## BH. SMALLEST NEXT IMPLEMENTATION UNIT

**Pin the build: make "what is running" answerable.**

The unit: (1) record source commit SHA + tree hash + image digest at build time into the image (label + build manifest); (2) maintain an append-only `deployments.log` (timestamp, image digest, source SHA, deployer, target host, schema version); (3) pin image digests in the Oracle compose file; (4) read-only audit of `/tmp/pgq6.js` with its hash recorded. No behavior change, no schema change, fully reversible, one sprint.

Why this one: it is the smallest change that makes every subsequent convergence step verifiable. You cannot promote certified code to production if you cannot tell what is running; you cannot falsify a live claim without a build record; the entire certified-not-running gap (AI-01/AI-02/AI-21/AI-25) is downstream of this. Runner-up (deliberately deferred): the sanctioned witness rebuild - bigger blast radius, and it must follow the provenance fix so the rebuilt artifact's deployment is itself recorded.

---

## APPENDIX 1. THE MOST IMPORTANT TABLE - DECISION OWNERSHIP

The decision-ownership matrix from Section F, reproduced here verbatim as the report's single most important table. One row per decision; "live callers" is the authority test.

| DECISION | CURRENT OWNER(S) | LIVE CALLERS | DUPLICATION | STRONGEST IMPLEMENTATION | TARGET OWNER | KEEP/MERGE/DEMOTE/DELETE | MIGRATION DEPENDENCIES | CONFIDENCE |
|---|---|---|---|---|---|---|---|---|
| Canonical event acceptance | UnifiedEventRuntime.emit (certified) / old runtime (live) | bootstrap emit path | Era H vs V2 vs TenantOS envelope vs ConstitutionalEventSourcing vs EventWriteAuthority vs event_bus | Certified emit @ce3f8687 | UnifiedEventRuntime | KEEP (promote to live) | Build provenance; schema migration; restart/replay proof | high |
| Replay ordering | pg sequence (certified) / none (live) | replay reader (certified code) | 3 sequence columns, 3 meanings | `ping_events_sequence_seq` + DeterministicReplayEngine | UnifiedEventRuntime + replay reader | KEEP | Deploy certified schema; dual-era replay plan (live DB has no column) | high |
| Identity construction | IdentityAuthority.generateId (V2) vs direct createHash in context/artifact/mission/knowledge | Mixed | F1-F5 flags (sec H) | V2 `generateId` (RFC-8785, versioned) | IdentityAuthority | MERGE (route all; era-mark legacy) | Artifact serializer fix; per-type prefix for `event_` namespace | high |
| Hashing / canonicalization | CanonicalAuthority/CanonicalBytes vs scattered `createHash` | Mixed | C3 contradiction | CanonicalBytes.serialize + CanonicalAuthority.hashBytes | CanonicalAuthority | MERGE | Fix artifact replacer (drops nested keys); fix double-serialize throw | high |
| Witness attestation | canonical_workers (frozen) | ReplayWorker to WitnessWorker | Legacy minting surfaces (dead comments/tests) | Frozen canonical_workers @84da2d40c | canonical_workers chain | KEEP | Promote to live; 12/13-leaf rebuild | high |
| Replay verification | DeterministicReplayEngine vs TemporalReplayProvider vs historical replay.ts | Engine (compiled) | 3 impls, one live | DeterministicReplayEngine (12-leaf) | DeterministicReplayEngine | MERGE (archive others) | Sanctioned pinned rebuild (Era 12 preserved, Era 13 versioned) | high |
| Mission lifecycle | MissionRuntime vs MissionAuthority v1 vs v2 | MissionScheduler | 4 mission models | MissionRuntime (idempotent, leases, events) | MissionRuntime | KEEP; MERGE others | Namespace/principal/parent columns | high |
| Capability / authorization | AGENT_PROFILES allowlist (de facto) vs phantom CapabilityAuthority vs MCP matrix | authorizeWorkOrder | 3 vocabularies | AGENT_PROFILES (fail-closed) | Explicit capability registry backed by allowlist | MERGE | One orchestration vocabulary; MCP schema only | medium-high |
| WorkOrder identity | orca-autonomy adapter vs temporal_work_order_id vs mission-derived | ORCA loop | 3 schemes | orca-autonomy scheme (objective-bound) | One scheme (orca-autonomy's) | MERGE | Wire to gateway; attempt lineage | high |
| Result truth | verifyResultEnvelope + recordVerifiedResult | ORCA loop | none | Same | Same | KEEP | Content-verification as separate evidence step | high |
| Execution durability | MissionScheduler 5s poll (live) vs Temporal (documented target) | MissionScheduler | Temporal never ran | Temporal contract (target); PG scheduler (proven today) | Temporal (per target) after evidence | KEEP both until A6 proof | Re-run kill-9 proof; decide PG vs Temporal on evidence | medium |
| Approval | none live; EffectAuthority/BusinessActionAuthority (branch, unwired) | none | Phantom classes | Branch design (states, expiry, audit) | Durable approval state machine | KEEP (build) | Postgres wire-in; isEffectCompleted pre-gate | high (missing) |
| Effect identity | none live; EffectAuthority.generateEffectId (branch) | none | 3 effect-id formulas | `CanonicalAuthority.hashBytes` on full preimage | EffectAuthority + Postgres store | KEEP (build) | Correct formula; provider request-id reconciliation | high (missing) |
| Evidence verification | EvidenceAuthority | HybridSearch.verify/rank | none live | EvidenceAuthority | EvidenceAuthority | KEEP | Fix trust-on-claim hash fallback | high |
| Observation | python observation_worker vs JS ClassificationWorker | both planes | 2 live-ish planes, divergent event names | JS worker (witnessed chain) | One plane | MERGE | Pick plane; reconcile event names; migrate consumers | medium-high |
| Claim | python claim_detector vs JS ClaimValidationWorker | both planes | same | JS worker (witnessed chain) | One plane | MERGE | Same as observation | medium-high |
| Knowledge | PG knowledge_nodes vs Neo4j vs Qdrant | PG + Qdrant | 3 stores | PG knowledge_nodes (canonical) | PG knowledge_nodes | KEEP PG; DEMOTE others to projections | Negative states; freshness columns; dependency edges | high |
| Context | python ContextPackBuilder vs JS compile_context_pack vs codex compiler | python (brainos); JS (dead) | 2 incompatible types | Codex-branch compiler (unmerged) | One compiler (codex design) | MERGE | Land codex commits; self-describing packs; tenant filter | high |
| Lineage | LineageWorker (live) vs LineageAuthority (zero callers) | LineageWorker | 2 impls, one dead | LineageWorker | LineageWorker + DAG legality | KEEP worker; DEMOTE Authority | Add cycle/topological validation; fix timestamp-in-edge-id | high |
| Namespace boundary | emit-time namespace (certified) / adapter regex (orca) | both | 2 | UnifiedEventRuntime.emit | emit-time | KEEP | Align adapter regex to emit schema | high |
| Vector recall | Qdrant | HybridSearch | none | Qdrant projection | Qdrant | KEEP (projection) | Honest embeddings or label fallback | high |
| Relationship graph | Neo4j (never live) | none | none | none | projection only, if ever | DEMOTE | Delete boot instantiation | high |
| Blob storage | S3 adapter (never live) | none | none | none | deferred | DEMOTE | Remove adapter or prove need | high |
| Cache | Redis adapter (never live) | none | none | none | deferred | DEMOTE | Remove adapter or prove need | high |
| Model calls | LiteLLM direct client (live) vs provider interface (dead) | direct client | 2 | LiteLLM (proxy pattern target) | LiteLLM behind proxy | MERGE | Proxy + per-key spend tracking | medium |
| Ingress authentication | exterior middleware (unproven) vs none in-repo | unknown | phantom | none proven | Explicit boundary | INVESTIGATE first | Prove exterior or add interior auth | high |
| UI contract | Mission Control /api/* fiction vs gateway /mc/* | none (UI broken) | 2 | Gateway contract | Gateway | MERGE (fix UI) | Per-surface contract map; delete mock imports | high |
| Demo seeding | _seedBusinessEvents (unconditional) | bootstrap | none | env-gated target | Env-gated seeder | DEMOTE | Gate by default-off; purge/quarantine fictional rows (Nolan decision) | high |
| Temporal scheduler provider | broken provider (wrong module path) | none | 2 temporal impls | temporal_scheduler_provider.ts (cleaner) | One provider | DELETE or repair | Converge providers; env-gate | medium-high |
| ORCA cycle state | in-memory (A6 fails kill-9) | ORCA loop | none | Branch remediation (untested) | PG-backed cycle state | KEEP (build) | Re-run kill-9 proof; cycle start/stop events | high |

## APPENDIX 2. THE SECOND MOST IMPORTANT TABLE - MECHANISM CONSOLIDATION

The strongest-implementation map: for each mechanism, what exists, which wins, why the others exist, whether they can go, what must migrate first, and the risk of getting it wrong.

| MECHANISM | CURRENT IMPLEMENTATIONS | WHICH IS STRONGEST | WHY OTHERS EXIST | CAN THEY BE DELETED | WHAT MUST MIGRATE FIRST | RISK |
|---|---|---|---|---|---|---|
| Event acceptance | Certified UnifiedEventRuntime (frozen) / old runtime (live) / TenantOS envelope / ConstitutionalEventSourcing | Certified emit | History: harvest branches, legacy ingress, experiments | Duplicates yes (after deadness proof); live old runtime only by promotion | Schema migration + restart/replay proof | Certified-not-running gap is the #1 risk |
| Identity | V2 generateId / direct createHash ×N / UUIDv5 / constant minters | V2 generateId | Organic growth; no enforcement | Constant/unwired minters yes; legacy rows era-marked, not deleted | Artifact serializer fix; per-type prefixes | Namespace collisions confuse replay/evidence |
| Hashing | CanonicalAuthority / scattered createHash | CanonicalAuthority | Same as identity | No (route through, don't delete call sites) | Fix artifact replacer; fix double-serialize | Silent non-canonical hashes |
| Replay verification | DeterministicReplayEngine / TemporalReplayProvider / historical replay.ts | DeterministicReplayEngine | Competing durability bets | TemporalReplayProvider + replay.ts archivable | Sanctioned pinned rebuild; Era versioning | 12/13-leaf drift changes roots |
| Witness attestation | canonical_workers (frozen) / legacy surfaces (dead) | canonical_workers | Pre-fix history | Legacy surfaces classified, not revived | Promote to live; bind reproduction params | Attestation without params is unreproducible |
| Observation | python worker / JS ClassificationWorker | JS worker (witnessed chain) | Two runtime planes grew independently | One of them, after consumer census | Consumer census; event-name reconciliation | Silent evidence divergence |
| Claim | python detector / JS ClaimValidationWorker | JS worker (witnessed chain) | Same as observation | Same as observation | Same as observation | Same as observation |
| Context | python pack / JS ref-list / codex compiler | Codex compiler (unmerged) | Branch work never landed | JS ref-list (never instantiated) | Land codex commits; tenant filter | Bypass wired around the boundary |
| Capability | AGENT_PROFILES / phantom CapabilityAuthority / MCP matrix | AGENT_PROFILES | Naming without implementation | Phantom references (docs) | One vocabulary; MCP schema-only | Phantom authority = false confidence |
| Mission | MissionRuntime / MissionAuthority v1/v2 / ORCA objective | MissionRuntime | Parallel designs | v1/v2 (unwired) | Namespace/principal/parent columns | Two mission identities |
| Execution durability | MissionScheduler poll / Temporal (dormant) | Temporal (target); PG scheduler (proven today) | Target declared before mechanism proven | Neither until A6 proof decides | Kill-9 re-test | Durability claims without mechanism |
| ORCA loop | orca_control_loop (A1-A5) / A6 remediation (untested) | Control loop | Incremental maturity | Nothing | PG-backed cycle state | Duplicate delegation on crash |
| Lineage | LineageWorker (live) / LineageAuthority (dead) | LineageWorker | Authority designed, worker shipped | LineageAuthority (zero callers) | DAG legality in worker | Cycles accepted silently |
| Evidence | EvidenceAuthority (only live impl) | EvidenceAuthority | - | Nothing | Fix trust-on-claim fallback | String-hash trust |
| Knowledge | PG knowledge_nodes / Neo4j / Qdrant | PG knowledge_nodes | Store-per-query habit | Neo4j/Qdrant as canonical (they're projections) | Negative states; freshness; dependency edges | Canonical truth in a projection |
| WorkOrder/Result | orca-autonomy adapter / temporal IDs / mission-derived | orca-autonomy adapter | Three identity schemes | Losing schemes | One scheme; gateway wire-in | Competing IDs for one object |
| Approval/Effect | branch classes (unwired) | Branch design | Designed ahead of need | Nothing (build it) | Postgres wire-in; corrected formulas | External effects without approval |
| UI contract | Mission Control /api/* fiction / gateway /mc/* | Gateway contract | UI built against imagined API | Mock imports; hardcoded hosts | Per-surface contract map | Operator decisions on fiction |
| Vector recall | Qdrant (Pig unhealthy; Oracle healthy) | Qdrant projection | - | Nothing | Honest embeddings or labeled fallback | Retrieval on unknown health |
| Blob/cache/graph | S3 / Redis / Neo4j adapters (never live) | None | Speculative scaffolding | Boot instantiation (keep contracts) | Proven unique query | Dead code in the boot path |

## APPENDIX 3. ANSWERS TO THE FINAL QUESTIONS

Note: the program text enumerates 42 questions; the deliverable header says 46. No additional questions were found in the program text. All 42 listed questions are answered here.

**1. What is PING today?** A single-Node gateway (`ping-gateway:devin-boundary2`, 2026-09-16) running event sourcing on Postgres with canonical workers, replay, witness, lineage, missions, and knowledge projections; an ORCA control loop (A1-A5 proven, A6 falsified); a largely fictional Mission Control; and a large unmerged, unpushed research codebase. The certified-correct code is frozen in a worktree, not deployed.

**2. What should PING become?** The smallest durable architecture that preserves organizational truth: Postgres canonical events + derived projections, replay-verified attestations, durable orchestration, one authority per decision, compiled knowledge with targeted invalidation, and a UI that never exceeds backend proof.

**3. What should PING stop trying to be?** A multi-store "platform" (Neo4j/Redis/S3/Kafka/Temporal-cluster); a second Temporal; a UI that invents its own contract; many authorities for the same decision.

**4. What is canonical truth?** The append-only `ping_events` table as accepted by `UnifiedEventRuntime.emit()`, plus projections derived from it. Everything else is projection, cache, legacy, or fiction.

**5. Which authorities are actually irreducible?** Event acceptance (UnifiedEventRuntime), identity construction (IdentityAuthority), hashing/canonicalization (CanonicalAuthority/CanonicalBytes), replay verification (DeterministicReplayEngine), namespace boundary (emit), mission lifecycle (MissionRuntime), work-order authorization (authorizeWorkOrder), evidence verification (EvidenceAuthority).

**6. Which named authorities are fake/duplicated?** CapabilityAuthority (phantom), IMissionAuthority (zero implementers), kernel Evidence interface (zero implementers), AcquisitionManager (zero matches), WitnessAuthority-as-origin (retained name, derived semantics), the second Temporal integrations, the dual observation/claim planes, EventWriteAuthority/event_bus minters, ConstitutionalEventSourcing (duplicate store).

**7. What is the canonical Event path?** POST /events → CanonicalizationService → UnifiedEventRuntime.emit() → `ping_events` (PG sequence in certified code) → in-process dispatch → workers. In live: the old runtime, no sequence.

**8. Is Witness now conceptually converged?** Yes in the frozen worktree (derived replay attestation, root-bound, fail-closed). No in live (pre-fix code running).

**9. What Witness problems remain?** 12-vs-13-leaf drift (live artifact missing the law-commitment leaf), dropped reproduction parameters per attestation, silent replay input reduction, EventGovernance schema not requiring `witness_root`, stale docs.

**10. Is Replay durable across software evolution?** Today: no. Replayable today with the same runtime only; five-year replayability needs per-attestation version binding, golden vectors, and input-set identity, none of which exist.

**11. What owns Mission truth?** MissionRuntime (+ `ping_missions`). The ORCA objective model is a second model that must be reconciled, not a second truth.

**12. What owns Capability truth?** De facto: the AGENT_PROFILES allowlists in `external_agent_adapter` (`authorizeWorkOrder`). The named CapabilityAuthority is phantom.

**13. What owns execution durability?** Today: the MissionScheduler 5s poll + PG leases (PING-side), contradicting the documented target. Target: Temporal, after the A6 proof decides on evidence.

**14. What owns execution authorization?** `authorizeWorkOrder` (fail-closed) in the ORCA adapter. Nothing durable in the gateway path.

**15. What owns Result truth?** `verifyResultEnvelope` + `recordVerifiedResult`: binding, identity, and coherence. Never content truth.

**16. What turns Result into verified outcome?** Nothing today. The honest design: content verification as a separate, evidence-carrying owner downstream of the envelope.

**17. What is Evidence?** EvidenceAuthority: hash-recomputed, lineage-checked, namespace-consistent, PG-traceable verification of claims. EVENT != EVIDENCE holds in code.

**18. What is Knowledge?** `knowledge_nodes` with candidate/approved/rejected status and confidence provenance, projected into Qdrant. No negative states exist as code.

**19. What makes Knowledge stale?** Today: nothing marks it stale. Source changes either do nothing or trigger unbounded re-derivation.

**20. What recompiles it?** The distill sweep (a scheduled process), not a dependency-driven mechanism. Targeted recompile is the highest-leverage missing link.

**21. What exactly is ContextPack?** Two incompatible things: a JS reference-list pack (unexecutable, fixes unmerged) and a Python content-carrying pack (live in brainos). The boundary hypothesis is falsified in the live gateway by the direct RAG bypass.

**22. What does ORCA uniquely own?** Planning, observation, delegation, evidence monitoring, bounded follow-up (A1-A5). Not durability, not authorization, not execution.

**23. What does Temporal uniquely own?** In the target: workflow history, durable timers, activity scheduling, heartbeats, durable retry, workflow recovery. Today: nothing; zero workflows have ever executed.

**24. What does WorkerRuntime uniquely own?** In-process worker dispatch and the canonical worker chain (OBSERVATION → CLAIM → REPLAY → WITNESS → LINEAGE → PROJECTION).

**25. What should MCP own?** Tool contract only: namespaced names, JSON Schema in/out, structured output, deprecation discipline. Transport, not authority.

**26. What should LiteLLM own?** Provider normalization: a unified proxy with fallbacks, load balancing, and per-key spend tracking.

**27. Which databases are truly necessary?** Postgres + Qdrant for stage 1. Postgres alone if ANN vector search is deferred (no pgvector today).

**28. Which can remain projections?** Qdrant (semantic), Neo4j (relationship, if ever wired), ClickHouse (analytics, absent), Redis (cache), MinIO (blobs). All rebuildable from Postgres.

**29. What should Mission Control expose?** Today, Missions, Approvals, Customers/Leads, Integrations, Automations, Knowledge, Activity/Lineage, System Health - but only surfaces backed by the real gateway contract.

**30. What must Mission Control never infer?** Health, success, counts, activity, knowledge - anything not served by a witnessed backend contract. UI CLAIM <= BACKEND PROOF.

**31. Strongest current implementation of each major mechanism?** Events: frozen-worktree UnifiedEventRuntime (certified); live: gateway-src old runtime. Identity: V2 generateId. Replay: DeterministicReplayEngine (12-leaf). Witness: frozen canonical_workers. Context: Python ContextPackBuilder (live in brainos); codex-branch JS compiler (unmerged, best design). Mission: MissionRuntime. WorkOrder: orca-autonomy external_agent_adapter. Capability: AGENT_PROFILES. Knowledge: PG knowledge_nodes + EvidenceAuthority. Orchestration: MissionScheduler (live); Temporal (target).

**32. What should be deleted first?** The phantom/duplicate minters (ConstitutionalEventSourcing quarantine; EventWriteAuthority/event_bus archive), dead store adapters, mock-data imports, hardcoded localhost, dead witness fields - classify first per the standing rule, delete only after deadness is proven.

**33. What should be merged first during the NEXT mutation sprint?** The certified event/witness stack into the deployable build (promotion first), then the codex-branch context work, then the temporal provider convergence.

**34. What should be tested first?** The witnessed A6 kill-9 re-test (the promotion gate for every durability claim), the ResultEnvelope assertion suite, and build-provenance verification.

**35. What should be made durable first?** Approval/effect identity - the only real effect path has none - and ORCA cycle state.

**36. What should never be built?** A second witness identity authority; a witness table because history had one; a second event backbone; a Temporal cluster before the contract; a second writable graph as primary store; UI surfaces without backend proof; semantic verification inside ResultEnvelope; entity resolution by destructive merging.

**37. Smallest architecture capable of PING's thesis?** Postgres (canonical events, missions, knowledge) + gateway (emit, workers, replay, witness) + Qdrant (recall projection) + durable orchestration (Temporal contract; PG-backed until proven) + Mission Control as projection. Everything else is a projection or deferred.

**38. First business proof?** Section AX: LEAD_CREATED → mission → compiled context → authorized WorkOrder → human approval → effect identity → email → observed outcome → evidence → knowledge update → better future retrieval. First broken arrow: approval/effect identity.

**39. First knowledge-compounding proof?** Section AY: the §35 snapshot test (A/B snapshots, distill, claims differ exactly where the source diff justifies). Requires dependency edges that do not exist yet.

**40. First restart-resilient autonomy proof?** Section AZ: the §36 A6 kill-9 re-test with cycle events, PG-backed state, and a proof bundle. A6 remains falsified until it passes.

**41. PING's actual moat?** The compounding loop: source change → targeted recompile → better knowledge → better context → better execution → outcome evidence → better knowledge. The moat is the marginal cost of understanding the organization falling over time. The highest-leverage missing link is targeted recompile.

**42. What single implementation unit should follow this audit?** Section BH: pin the build - source SHA + tree hash + image digest recorded at build time, append-only deployments.log, pinned digests in compose, read-only audit of the unknown container process. It makes "what is running" answerable, which every later step depends on.

## APPENDIX 4. ONE COMPACT TARGET ARCHITECTURE

```
                        EXTERIOR SOURCES (email, forms, agents, connectors)
                                          |
                                   canonical ingress (proven auth)
                                          v
  +---------------- LEGACY / EXTERNAL ----+---- CANONICAL PATH ----------------+
  | LegacyIngressAdapter (allowlist,      | POST /events                        |
  |  default-deny, normalize)             |   CanonicalizationService             |
  +------------------------+--------------+   UnifiedEventRuntime.emit()        |
                           |                    | validate/namespace/identify    |
                           |                    v                              |
                           |           +------------------+                     |
                           |           |   ping_events    |  CANONICAL TRUTH    |
                           |           | (PG, sequenced,  |  append-only        |
                           |           |  V2 identities)  |                     |
                           |           +--------+---------+                     |
                           |                    | in-process dispatch            |
                           |                    v                              |
                           |   OBSERVATION -> CLAIM -> REPLAY -> WITNESS ->     |
                           |   LINEAGE -> PROJECTION (canonical worker chain)  |
                           |                    |                              |
                           v                    v                              |
                    +-------------+   +------------------+   +----------------+|
                    | missions    |   | knowledge_nodes  |   | context packs  ||
                    | approvals   |   | (+neg states,    |   | (one compiler, ||
                    | effects     |   |  freshness, deps)|   |  self-desc.)   ||
                    | cycle state |   +--------+---------+   +--------+-------+|
                    +------+------+            |                      |       |
                           |                   v                      v       |
                           |          +--------+---------+   +--------+-----+ |
                           |          | Qdrant / Neo4j   |   | models via   | |
                           |          | (projections,    |   | LiteLLM      | |
                           |          |  rebuildable)    |   | proxy        | |
                           |          +------------------+   +--------------+ |
                           |                                                 |
                    ORCA (observe/plan/delegate/monitor) --authorize--> executors
                           |                    |                              |
                           v                    v                              v
                    ResultEnvelope        Mission Control               durable approval/
                    (binding verified)    (projection of                effect state machine
                                          gateway contract;              gates every external
                                          UI CLAIM <= PROOF)             action

  DURABILITY: Temporal (post-A6-proof) or certified PG scheduler | REPLAY: boring reader
  WITNESS: versioned construction, pinned rebuilds, per-attestation binding
  DEPLOY: pinned digests, recorded provenance, deployments.log, nightly pg_dump
```

One sentence: Postgres is the truth, the gateway is the machine, projections are rebuildable, ORCA plans, Temporal (when proven) endures, approval gates every external effect, and the UI never exceeds backend proof.
