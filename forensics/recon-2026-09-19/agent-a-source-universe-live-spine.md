# Agent A: Source Universe + Live Spine — Recon 2026-09-19

Track owner: Agent A (sections 5-6). Read-only reconnaissance. No repo files created or modified; no tests run against shared state; no credentials read (key names only; DB accessed via container-local env without value exposure; SELECT-only queries).

Headline: **the running production system is `/home/nolan/ping-gateway-src` (2026-09-16 snapshot, image `ping-gateway:devin-boundary2`), NOT `/home/nolan/ping` and NOT the frozen constitutional-convergence worktree.** Byte-identical md5 between container `/app/...` and `/home/nolan/ping-gateway-src/...` on all three core files checked (unified_event_runtime.js, gateway_runtime.js, canonical_workers.js). The certified P0 Event Authority sequence code (commit ce3f8687c5c41bc19bdd58030b7fe3cf7d494cf4) and the witness fixes (91e1337f4, 84da2d40c) live in the frozen worktree only and are NOT deployed in the running service. The live `ping_events` table has NO sequence column (739 rows).

---

## (a) SOURCE UNIVERSE MAP

Notes:
- `git rev-list --count HEAD --not --remotes` = commits on this checkout not reachable from ANY remote (origin or windows-preserve). "Unpushed?" uses that count.
- All checkouts share remotes: origin = https://github.com/ngesk2/crx-runtime.git, plus windows-preserve mirror remote.
- Every worktree carried the same old stash entry `stash@{0}: On night-shift-2026-09-15: WIP night-shift-2026-09-15` (dist+node_modules churn). Not enumerated further.

| LOCATION | BRANCH | SHA | LAST CHANGE | UNPUSHED? | TOPIC | LIVE? | STRONGEST? | SUPERSEDED? |
|---|---|---|---|---|---|---|---|---|
| /home/nolan/ping | feature/approval-effect-identity | 88c9651be | 2026-09-17 19:07 | 0 (no upstream) | approval, effect identity | NO (live = gateway-src) | ? (not evaluated) | main not merged; newer code than live image |
| /home/nolan/worktrees/constitutional-convergence | constitutional-convergence-v2 | 84da2d40c | 2026-09-18 18:34 | 17 local-only commits | Event Authority (P0 seq cert ce3f8687...), Witness (91e1337f4, 84da2d40c) | NO | STRONGEST for event authority + witness correctness (certified) | Supplied certs NOT deployed; this is the canonical-correct code, not the live code |
| /home/nolan/worktrees/orca-autonomy | feature/orca-autonomy | ae55b77ff | 2026-09-18 12:05 | 10 local-only | ORCA design docs, convergence adapter (EventRepository as derived projection), durable objective identity | NO | STRONGEST for ORCA documentation; ORCA runtime = DOCUMENTED_ONLY | not live anywhere |
| /home/nolan/worktrees/ping-codex-convergence | codex/context-workorder-convergence | 08c3036d9 | 2026-09-17 17:50 | 2 local-only | context-workorder convergence, temporal worker lifecycle | NO | unknown | not live |
| /home/nolan/worktrees/ping-event-runtime | event-runtime-deduplication | 1f40cf432 | 2026-09-18 05:44 | 0 | event ID collision detection | NO | STRONGEST for dedup | live code has partial dedup (ON CONFLICT DO NOTHING + isDuplicate gate) but not this worktree's collision detection |
| /home/nolan/worktrees/ping-harvest-12h | sprint/harvest-12h | 8fe3b8060 | 2026-09-17 23:37 | **80 local-only commits** | context-pack compilation, workers, lineage (waves H77-H79) | NO | Most active sprint; newest context-pack code | Largest unpushed divergence from everything else |
| /home/nolan/worktrees/ping-oracle-deploy | oracle/deploy-2026-09-18 | 6b4222467 | 2026-09-18 18:23 | 30 local-only | Oracle UI/deploy (hide fixture-backed missions board) | NO | STRONGEST for Oracle UI truthfulness | Oracle read-only this run; not deployed to live |
| /home/nolan/ping/worktrees/agent-exec | sprint/agent-exec | 5b102c664 | 2026-09-15 18:23 | ? | agent exec, project resolver | NO | not evaluated | frozen 2026-09-15 |
| /home/nolan/ping/worktrees/agent-smoke-abc123def456 | recovery/agent-smoke-2026-09-16 | 3e0c3ddd1 | 2026-09-16 12:23 | ? | recovery smoke (uncommitted changes preserved) | NO | not evaluated | archived in place |
| /home/nolan/ping/worktrees/oracle-assembly | main | 5b102c664 | 2026-09-15 18:23 | ? | oracle assembly | NO | not evaluated | frozen 2026-09-15 |
| /home/nolan/ping/worktrees/playbook | sprint/playbook | 5b102c664 | 2026-09-15 18:23 | ? | playbook | NO | not evaluated | frozen 2026-09-15 |
| /home/nolan/ping/worktrees/python-prod | sprint/python-prod | 5b102c664 | 2026-09-15 18:23 | ? | python prod | NO | not evaluated | frozen 2026-09-15 |
| /tmp/bisect-eval006 | detached HEAD | ff9751221 | ? | ? | bisect scratch | NO | not evaluated | scratch |
| /tmp/crx-runtime | (local clone) | 6c4b531 | ? | n/a | historical predecessor of crx-runtime lineage | NO | historical reference | superseded by all |
| /home/nolan/ping-gateway-src | n/a (source dir, no .git) | image ping-gateway:devin-boundary2 created 2026-09-16 18:02 | 2026-09-16 | n/a | LIVE production gateway + ping-runtime | **YES (PROVEN_RUNTIME)** | Strongest DEPLOYED implementation; lacks seq cert + witness fixes | — |

Untracked dirs in /home/nolan/ping (git status --porcelain): only the 5 nested worktrees above (registered in .git/worktrees). No other stray modifications.

Remote branches (origin): 40+ branches incl. feature/approval-effect-identity, feature/context-compilation, feature/external-agent-hardening, feature/knowledge-replay-routing, feature/mission-decomposition, feature/namespace-entitlements, feature/temporal-durable-execution, constitutional-* (convergence, hardening, recovery, trunk...), event-runtime-deduplication, codex/context-workorder-convergence, audit-hardening, authority-forensics, opencode/*, temp_checkpoint. Mirrored under windows-preserve/. Tags: constitutional-freeze-v1, constitutional-kernel-freeze-v1, pre-cleanup/cccd7ded, pre-push/1a7d7639 (+ windows-preserve/ mirrors).

### Topic mapping (which branch/worktree owns each topic's strongest code)

| TOPIC | STRONGEST LOCATION | MATURITY |
|---|---|---|
| Event Authority | constitutional-convergence worktree (sequence + replay cert) | PROVEN_CERT (frozen); live = FALSIFIED (not deployed) |
| Identity | orca-autonomy (canonical identity in emit, feat 479d310d6) + main repo UnifiedEventRuntime.emit (content-hash id) | WIRED_UNPROVEN |
| Hashing | main repo / gateway-src UnifiedEventRuntime (sha256 content id) | PROVEN_RUNTIME |
| Canonicalization | gateway-src ping-runtime/canonicalization/canonicalization_service.js (boundary for emitters) | PROVEN_RUNTIME |
| Witness | constitutional-convergence (91e1337f4, 84da2d40c); gateway-src has pre-fix witness pipeline (ReplayWorker->WITNESS_CREATE->WitnessWorker) | PROVEN_RUNTIME (old), PROVEN_CERT (new, not live) |
| Replay | gateway-src gateway/kernel_replay_execution_provider.js wired to ReplayWorker ("LIVE arrow") | PROVEN_RUNTIME |
| Lineage | gateway-src ping-runtime/workers (LineageWorker, LINEAGE_CREATE) + lineage_authority.js | PROVEN_RUNTIME (code); harvest-12h has newest lineage work (ClaimWorker propagation) |
| Mission | gateway-src MissionRuntime + MissionScheduler (5s poll, maxConcurrent 3) + EventToMissionBridge instantiated line 655 | PROVEN_RUNTIME |
| Capability | gateway-src capability_registry.js + runtime/capability_resolver.js; routes/capabilities.js uses authMiddleware | WIRED_UNPROVEN |
| WorkerRuntime | gateway-src workers/worker_runtime.js, 8 canonical workers registered (IntelligenceWorker dormant) | PROVEN_RUNTIME |
| WorkOrder | routes/ + MissionScheduler dispatch path in gateway-src | WIRED_UNPROVEN (dispatch wire) |
| ResultEnvelope | verify canonical_object.js + EvidenceAuthority in gateway-src | WIRED_UNPROVEN |
| ContextPack | generate_context_packets.js, ConstitutionalQueryAPI.js in gateway-src; harvest-12h newest compiler suite | WIRED_UNPROVEN (live has packets, not a compiler dir; main repo ping-runtime HAS context/ dir, live image does NOT) |
| Context Compiler | main repo ping-runtime/context/; harvest-12h waves H77-H79 | BUILT_NOT_LIVE |
| Knowledge | gateway-src Neo4jAdapter + QdrantAdapter + knowledgeGraph + EmbeddingService (async projection, seeded-vector fallback) | PROVEN_RUNTIME |
| Evidence | gateway-src EvidenceAuthority (recomputes canonical hash, traces Qdrant hits to ping_events) | PROVEN_RUNTIME |
| Temporal | main repo ping-runtime/temporal/ (workflows, activities, index.js); orca-autonomy feat temporal worker lifecycle (08c3036d9) | BUILT_NOT_LIVE (lifecycle.js lists temporalRuntime in START_ORDER but gateway-src has NO temporal dir; ping-temporal-dev container runs stock temporalio, no PING workers connected) |
| ORCA | orca-autonomy worktree orca/ docs + control-loop (incl. _retired-vendor-2026-09-18) | DOCUMENTED_ONLY |
| Approval | /home/nolan/ping feature/approval-effect-identity @ 88c9651be | EXPERIMENTAL (main checkout, not live) |
| Effect identity | same branch | EXPERIMENTAL |
| Namespace | gateway-src runtime/tenant_registry.js; namespace default core::system; privacy boundary core::<name> | tenant::<id> validated in emit | PROVEN_RUNTIME |
| Mission Control | gateway-src routes/mission_control.js (+ /event-mission-bridge, /bridge status routes) | WIRED_UNPROVEN |
| Connectors | gateway-src 12 files: email/sms/posthog (integration+connector pairs), github (adapter+connector), google, oauth_provider, capability_registry, connector_registry | WIRED_UNPROVEN (posthog/email/sms wired in gateway_runtime requires; github/google = BUILT_NOT_LIVE) |
| AcquisitionManager | **NOWHERE — zero files match case-insensitively in main repo or gateway-src** | PHANTOM/DOCUMENTED_ONLY (matches 2026-09-18 ruling: phantom hypothesis, not a hunt target) |
| Social | PING Social outreach is Muse-side (~/workspace/outreach), not PING-runtime code | not applicable to this track |
| Oracle | ping-oracle-deploy worktree (UI), orca-autonomy orca/ORACLE-INSPECTION.md; Oracle deployment read-only this run | NOT INSPECTED (deploy plane out of scope for live spine; ping-oracle-deploy = source only) |
| Repository intelligence | /home/nolan/ping root docs (REPOSITORY_INTELLIGENCE_EXTRACTION.json, RepositoryKnowledgeIndex) | DOCUMENTED_ONLY |

"Do NOT assume main contains the strongest implementation" — confirmed correct. The strongest deployed code is gateway-src (2026-09-16), strongest certified code is the frozen worktree, newest context/worker code is harvest-12h (80 unpushed commits, 2026-09-17), newest runtime design code is orca-autonomy (ae55b77ff, 2026-09-18). The main checkout is a feature branch from 2026-09-17 that is not live anywhere.

---

## (b) LIVE SPINE (entrypoint-traced from the running image `ping-gateway:devin-boundary2`, `/app` == `/home/nolan/ping-gateway-src`)

Entry: `node gateway/server.js` -> `GatewayRuntime` (gateway/bootstrap/gateway_runtime.js). Single node process (PID 1) in container; no separate worker/temporal processes. Plus a `/tmp/pgq6.js` process (PID 457) of unknown purpose inside the container (UNKNOWN — flag for follow-up; do not execute it).

Arrow labels: PROVEN = code path executed by the running image + DB shows effects; WIRED = instantiated in gateway_runtime.js live bootstrap; PARTIAL = partially wired; DORMANT = code present, never started in live path; DUPLICATE = competing implementation exists; BROKEN = code claims it but evidence shows failure; UNKNOWN = cannot determine read-only.

| # | ARROW | LABEL | EVIDENCE |
|---|---|---|---|
| 1 | SOURCE (HTTP/connector producers) -> CONNECTOR | PROVEN/WIRED | POST /events wired (routes/events.js); ReviewEmitter/CustomerEmitter/ProjectEmitter/ConnectorEmitter wired in gateway_runtime.js line ~650; connectors present: email, sms, posthog (wired), github, google (BUILT_NOT_LIVE) |
| 2 | CONNECTOR -> AUTHENTICATION/PRINCIPAL | PARTIAL | `req.authenticatedAgent` consumed opportunistically ("exterior auth middleware attaches the verified agent identity"); NO auth middleware in routes/events.js itself — gateway trusts an exterior layer. PARTIAL because interior enforcement is absent. |
| 3 | AUTH -> NAMESPACE | WIRED | TenantRegistry wired; namespace resolved exactly once in UnifiedEventRuntime.emit (default 'core::system'); privacy boundary core::<name> / tenant::<id> validated at emit choke point |
| 4 | NAMESPACE -> INGRESS | PROVEN | POST /events requires event_type, aggregate_id, aggregate_type, event_data; business_id requires tenant_id else throws |
| 5 | INGRESS -> CANONICALIZATION | PROVEN | CanonicalizationService is the boundary: emitters call canonicalizationService.emit which duck-types to eventRuntime.emit (canonicalization_service.js line 143, 175) |
| 6 | CANONICALIZATION -> IDENTITY | PROVEN | emit() step 1: deterministic sha256 over {eventType, source, [namespace], [logical_id or payload]}; no Date.now() |
| 7 | IDENTITY -> EVENT | PROVEN | Validation (EventValidator), governance (EventGovernance), canonical event envelope with causation_id/correlation_id/confidence |
| 8 | EVENT -> PERSISTENCE | PROVEN | INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING; 739 live rows. **NO sequence column** (confirmed via information_schema: columns = event_id, event_type, source, timestamp, payload, metadata, namespace, processed, created_at). |
| 9 | PERSISTENCE -> DISPATCH | PROVEN | emit() dispatches to in-process handlers (first delivery only; duplicates suppressed — "replay idempotency" gate), then routes to IntegrationManager |
| 10 | DISPATCH -> MISSION | WIRED | EventToMissionBridge instantiated (gateway_runtime.js line 655) + MissionRuntime + MissionScheduler polling every 5000ms, maxConcurrent 3. (Route /event-mission-bridge reports stats.) |
| 11 | MISSION -> CONTEXT | WIRED/BUILT_NOT_LIVE | generate_context_packets.js + ConstitutionalQueryAPI.js exist; harvest-12h perf commit "skip context-pack compilation for non-consuming" implies packs compile in scheduler path. No context/ compiler dir in live image (main repo has it). |
| 12 | CONTEXT -> CAPABILITY | WIRED | CapabilityResolver + capability_registry wired; routes/capabilities.js exists (uses authMiddleware there) |
| 13 | CAPABILITY -> WORK ORDER | WIRED | WorkerRuntime.dispatch is "the single worker-identity decider" (per gateway_runtime.js line 356); 8 canonical workers registered |
| 14 | WORK ORDER -> EXECUTOR | WIRED/DORMANT-split | WorkerRuntime executes in-process; temporalRuntime listed in lifecycle START_ORDER but gateway-src has NO temporal/ dir and no Temporal SDK worker connected to ping-temporal-dev -> Temporal arrow = DORMANT |
| 15 | EXECUTOR -> RESULT | WIRED | REPLAY_COMPLETED / WITNESS_CREATE pipeline; canonical_workers documents DOCUMENT_IMPORT -> OBSERVATION_CREATE -> CLAIM_GENERATE -> REPLAY_VERIFY -> WITNESS_CREATE -> LINEAGE_CREATE -> PROJECTION_CREATE |
| 16 | RESULT -> VERIFICATION | PROVEN (old) | ReplayWorker: verified=true ONLY when status==='ok' AND violations.length===0; kernel replay via KernelReplayExecutionProvider ("LIVE arrow" comment). Whether 91e1337f4's bypass-removal is present in the live image = UNKNOWN (needs byte diff vs frozen worktree) |
| 17 | VERIFICATION -> EVIDENCE | PROVEN | WITNESS_CREATED emitted by WitnessWorker; EvidenceAuthority recomputes canonical hash via gateway/canonical_object.js and traces Qdrant hits back to ping_events; HybridSearch composes Qdrant+evidence+knowledge-graph |
| 18 | EVIDENCE -> KNOWLEDGE | PROVEN | EmbeddingService subscribes to eventRuntime (async projection, non-blocking, seeded-vector fallback if Ollama unreachable); Neo4jAdapter + QdrantAdapter initialized; ProjectionWorker consumes embeddingService |
| 19 | KNOWLEDGE -> RETRIEVAL | WIRED | HybridSearch, /context routes, EventReadAuthority indexed traversal; retrieval health depends on Qdrant, which is (unhealthy) in docker ps -> RETRIEVAL = PARTIAL/BROKEN in practice right now |
| 20 | RETRIEVAL -> FUTURE WORK | WIRED | automatic_mission_generator.js exists in gateway-src gateway/; Mission Control routes exist; temporal future = DORMANT; ORCA = DOCUMENTED_ONLY |

### Spine summary in one line
SOURCE -> CONNECTOR -> (exterior)AUTH -> NAMESPACE -> INGRESS -> CANONICALIZATION -> IDENTITY -> EVENT -> PERSISTENCE -> DISPATCH -> MISSION -> [CONTEXT pack] -> CAPABILITY -> WORKER -> in-process EXECUTOR -> RESULT -> VERIFY -> WITNESS/EVIDENCE -> Qdrant/Neo4j KNOWLEDGE -> RETRIEVAL, all inside one Node process. Kernel pipeline (repository_events + EventBridge) is explicitly bypassed in live code ("reducer/projection registries are empty and EventBridge adds a 5s delay for no benefit"). Temporal, ORCA, AcquisitionManager, and the P0 sequence cert are NOT in the live path.

---

## (c) RUNNING SERVICES OBSERVED (2026-09-18 ~18:45 MDT, Pig WSL)

docker ps (read-only):
| CONTAINER | IMAGE | STATUS |
|---|---|---|
| ping-gateway | ping-gateway:devin-boundary2 | Up 25 hours (created 2026-09-16 18:02) |
| ping-postgres | postgres:15-alpine | Up 21 hours |
| ping-redis | redis:alpine | Up 25 hours (healthy) |
| ping-qdrant | qdrant/qdrant:latest | Up 25 hours **(unhealthy)** |
| ping-vault | hashicorp/vault:latest | Up 25 hours **(unhealthy)** |
| ping-temporal-dev | temporalio/temporal (pinned sha256) | Up 25 hours |
| ollama | ollama/ollama | Up 13 hours |
| brain-postgres | postgres:15-alpine | Up 25 hours |
| brain-qdrant | qdrant/qdrant:latest | Up 25 hours |
| open-webui | ghcr.io/open-webui/open-webui:main | Up 25 hours (healthy) |
| qwen3-tts-service / cosyvoice-tts | (TTS stack) | Up 25 hours |

ps aux | grep node: only Codex Desktop app-tools node processes (Windows side); no PING node processes on the WSL host — everything PING runs inside the gateway container (single `node gateway/server.js`, PID 1).

DB observation (SELECT-only, container-local env, no value exposure): `ping_events` has 739 rows, no `sequence` column.

---

## (d) DECISION-OWNERSHIP ROWS NOTICED

| DECISION | OWNER | EVIDENCE LEVEL |
|---|---|---|
| What canonical event was accepted ("what happened") | UnifiedEventRuntime.emit() | PROVEN_RUNTIME (live code + live rows) |
| Event identity construction | UnifiedEventRuntime.emit step 1 (sha256 content hash) | PROVEN_RUNTIME |
| Canonical content hashing / verification of retrieved objects | EvidenceAuthority via gateway/canonical_object.js | WIRED_UNPROVEN |
| Ordering position | **OWNERLESS in live system** — no sequence column; INSERT order / timestamp are not an authority; frozen worktree assigned it to the DB sequence (P0 cert, not deployed) | FALSIFIED (live) / PROVEN_CERT (frozen, undeployed) |
| Namespace default + privacy boundary | UnifiedEventRuntime.emit ("single owner of the 'core::system' default") | PROVEN_RUNTIME |
| Witness/root computation | Replay layer (KernelReplayExecutionProvider) computes witness_root; Event Authority records WITNESS_CREATED | PROVEN_RUNTIME (old code); frozen worktree tightened with 91e1337f4 + 84da2d40c |
| Who may execute a work order | WorkerRuntime.dispatch ("single worker-identity decider") | COORDINATOR_CLAIMED (code comment; not runtime-traced) |
| Replay ordering | UNDETERMINED live (no sequence); code comment routes events through indexed traversal, not a certified order | FALSIFIED for "certified replay order" in live |
| Canonicalization boundary | CanonicalizationService (producers must route through it, not eventRuntime directly) | PROVEN_RUNTIME |
| Mission creation from events | EventToMissionBridge | WIRED_UNPROVEN |
| Authentication of principals | **EXTERIOR** — gateway trusts req.authenticatedAgent from outside; no interior auth on /events | PROVEN_RUNTIME (code) — design gap worth a decision |
| Embedding/projection of events | EmbeddingService (async subscriber, non-blocking, seeded fallback) | PROVEN_RUNTIME |
| Knowledge storage | Neo4jAdapter + QdrantAdapter (thin REST wrappers) | WIRED_UNPROVEN; qdrant currently (unhealthy) |
| Durable execution | **NOBODY in live** — Temporal server runs but no PING worker connects; MissionScheduler 5s poll is the durable loop | PROVEN_RUNTIME (negative) |

---

## (e) CONTRADICTIONS

| CLAIM | SOURCE A | SOURCE B | STRONGER EVIDENCE | STATUS |
|---|---|---|---|---|
| "Event Authority sequence is certified (ce3f8687...)" | Frozen worktree @84da2d40c: sequence column, backfill, cert commit | Live container /app + live DB: no sequence column, 739 rows without it | SOURCE B (LIVE RUNTIME TRACE > commit) | CONFIRMED — certification exists only in frozen, undeployed code; live system has NO sequence authority |
| "Witness bypass removed (91e1337f4) / replay root bound (84da2d40c)" | Frozen worktree | Live image gateway-src (2026-09-16 snapshot, has witness pipeline but verify-gate provenance vs the two fixes unknown) | UNKNOWN pending byte diff | OPEN — needs canonical_workers.js diff live-vs-frozen |
| "POST /events is authenticated" | routes/events.js comment: "exterior auth middleware attaches the verified agent identity" | routes/events.js code: no auth middleware on the route; identity is opportunistic (req.authenticatedAgent may be absent) | B (code over comment) | CONFIRMED — interior auth is absent; exterior layer carries the burden (unverified) |
| "Kernel pipeline is the canonical path" | Older docs / gateway file names (kernel_replay_execution_provider, append_orchestrator) | Live routes/events.js: "emit directly through UnifiedEventRuntime (ping_events), not through the kernel pipeline (repository_events). The kernel's reducer/projection registries are empty and EventBridge adds a 5s delay" | B (live code + comment) | CONFIRMED — kernel event path is bypassed/dead; repository_events = LEGACY |
| "Temporal runs durable execution" | lifecycle.js START_ORDER lists temporalRuntime; ping-temporal-dev container Up | gateway-src has no temporal/ dir; no Temporal SDK worker in the image | B (code absence > lifecycle list) | CONFIRMED — Temporal is a running server with zero PING workers; DORMANT |
| "/home/nolan/ping is the canonical repo" | Task framing / checkout location | Its remote is github.com/ngesk2/crx-runtime.git, package name "crx-monorepo"; live runs gateway-src which is NOT in git | B | CONFIRMED — live code lives outside git; /home/nolan/ping is a feature-branch checkout of the crx lineage, not the deployed artifact |
| "context/ compiler is in the live stack" | main repo ping-runtime/context/ exists | Live gateway-src ping-runtime/ has NO context dir (only packets + ConstitutionalQueryAPI) | B | CONFIRMED — context compiler = BUILT_NOT_LIVE (newest in harvest-12h) |
| "AcquisitionManager is a component" | Task topic list / prior plans | Zero files case-insensitively across main repo and gateway-src | B | CONFIRMED — phantom; matches 2026-09-18 ruling, do not hunt |
| "Qdrant is the knowledge projection" | gateway_runtime wires QdrantAdapter, embedding projection | ping-qdrant container is (unhealthy) | B | OPEN — retrieval path degraded until Qdrant healthy; embedding falls back to seeded vectors (by design, but semantic retrieval is broken) |

---

## (f) UNKNOWNS

| QUESTION | WHY UNKNOWN | WHAT WOULD RESOLVE | BLOCKS ACTION? |
|---|---|---|---|
| Does the live witness path include the 91e1337f4 bypass-removal and 84da2d40c root-binding? | Read-only recon did not byte-diff canonical_workers.js + witness files live vs frozen | `diff` of gateway-src vs frozen worktree on ping-runtime/workers/canonical_workers.js and gateway/*witness* (read-only) | YES — determines whether live attestations are certified-correct |
| What is /tmp/pgq6.js (PID 457) in the gateway container? | Only process list observed; executing/reading it was out of scope caution | Read the file bytes from the image (docker cp) and trace its origin in the Dockerfile | YES — unknown code in the live trust boundary |
| Is exterior auth actually deployed in front of the gateway? | Gateway code assumes req.authenticatedAgent; the exterior layer is off-Pig-WDS plane | Inspect the reverse proxy / ingress config serving the gateway | YES — if absent, POST /events is unauthenticated |
| Why is ping-qdrant (unhealthy) and ping-vault (unhealthy)? | docker ps shows state only, no logs read | docker logs (read-only) | PARTIAL — degrades retrieval; vault may affect secret-backed connectors |
| Where did ping-gateway-src come from / which commit? | Not in git; no provenance file checked | Look for a build provenance/manifest in ping-gateway-build/Dockerfile | PARTIAL — needed to map live code to a commit for cert comparison |
| What are the 80 unpushed harvest-12h commits' semantic deltas vs live? | Only log subjects sampled (context-pack, lineage, workers) | Read-only log/diff of sprint/harvest-12h vs gateway-src tree | NO for recon, YES before any merge |
| Do the 17 local-only commits on the frozen worktree mutate 84da2d40c? | rev-list counted 17 ancestors not on remotes; HEAD is still 84da2d40c | git log --oneline 84da2d40c~17..84da2d40c (read-only) | NO (frozen = FROZEN; ancestry detail only) |
| Which PING code actually produced the 739 live events (sources, types)? | Only count(*) and schema queried | SELECT event_type/source counts (SELECT-only, allowed) | NO for recon; useful for spine confidence |

---

## (g) CANDIDATE DELETIONS / MERGES

(All candidates only — no action taken. Nolan's rule: classify, never delete on naming alone; deletions need his word or deadness proof.)

1. **Nested frozen worktrees** (agent-exec, agent-smoke-abc123def456, oracle-assembly, playbook, python-prod — all @5b102c664 / 3e0c3ddd1, 2026-09-15/16): four of five share the identical SHA 5b102c664. Candidates for archive-then-remove after confirming nothing unique (agent-smoke carries "uncommitted changes preserved" per its commit message — inspect before touching).
2. **Kernel event pipeline in live-image lineage** (repository_events path, EventBridge 5s delay): code-confirmed dead per routes/events.js comment. Candidate: mark PRESERVED_INACTIVE / delete after harvest-12h and orca-autonomy code is checked for dependencies (EventRepository was just redefined as derived adapter in orca-autonomy ae55b77ff — do not delete until that converges).
3. **Duplicate Temporal wiring scaffolding** (lifecycle START_ORDER temporalRuntime, main repo ping-runtime/temporal/ vs orca-autonomy temporal worker lifecycle): converging to one owner needed; currently two BUILT_NOT_LIVE implementations + one DORMANT server.
4. **`/tmp/bisect-eval006`** (detached scratch): candidate for removal after bisect work is done.
5. **Stale `stash@{0}` night-shift-2026-09-15 entries** on all 7 worktrees: dist+node_modules churn, safe to drop once confirmed no unique content (needs `git stash show`, read-only).
6. **Temp branches**: temp_checkpoint, opencode/* (4), agent/smoke-abc123def456 (after smoke content preserved): candidates for deletion review.
7. **gateway test_* files in the live image** (test_commissioning.js, test_correlation_chain.js, ~15 files): they ship in the production image; consider excluding from future builds (not deleting from source).

---

## (h) TOP-5 HIGHEST-CONFIDENCE IMPROVEMENT CANDIDATES

1. **Close the certified-code/live-code gap for Event Authority.** The P0 sequence cert (ce3f8687...) and witness fixes (91e1337f4, 84da2d40c) are frozen and certified but NOT deployed; the live system has no sequence authority at all. Highest leverage: a deliberate, Nolan-approved promotion path for the frozen worktree's event/witness code into the gateway build pipeline (needs the byte-diff from unknown #1 first).
2. **Establish provenance for the live image.** /home/nolan/ping-gateway-src is not in git and the image is tagged devin-boundary2 (2026-09-16). Record a build provenance record (source commit/tree hash, build time, Dockerfile) so "what is running" is always answerable; today it required md5 forensics.
3. **Fix or formally degrade the Qdrant and Vault health.** ping-qdrant is (unhealthy) — the knowledge/retrieval half of the spine (EmbeddingService -> Qdrant projection -> HybridSearch -> EvidenceAuthority) is degraded in practice; ping-vault is (unhealthy) — check whether any live connector depends on it.
4. **Resolve the auth boundary explicitly.** The gateway assumes exterior auth; nothing in the live code verifies it is present. Either prove the exterior layer exists (config evidence) or add interior auth to /events — currently an unverified trust assumption on the canonical event ingress.
5. **Consolidate the harvest-12h divergence.** 80 unpushed commits of context-pack/lineage/worker work (2026-09-17) sit outside both git remotes and the live image. Push or archive promptly: it is the largest unreconciled delta in the universe and the likeliest source of a future "which implementation is real" dispute.

---

## Appendix: method notes

- Pig access via pigwsl-run.sh; all scripts <4KB, no backticks/single-quote nesting.
- git: rev-parse, log, branch -a, worktree list, status --porcelain, stash list, rev-list, remote -v, tag, ls-files only.
- Live service identity: `md5sum` of /app files inside ping-gateway container vs host trees (read-only docker exec).
- DB: SELECT-only against information_schema + count(*) via the container's own env (values never exposed).
- Not done (out of track/scope): witness code diff, container log reads, exterior auth verification, Oracle plane, any test execution.
