# PHASE 8: Forensic Packets Classification (2026-09-19)

Read-only forensic analysis of the four outstanding forensic packets under
~/workspace/forensics/recon-2026-09-19/:
lane-p-artifact-parity.md, recon-d-downstream-matrix.md,
w0-extended-board-questions.md, lane-o-oracle-gates.md (sections 7 and 8,
plus section 9 confirmations where lane-o2-readiness.md supersedes them).

No Pig or Oracle access was used; no implementation was performed; nothing
was mutated. W-1A (commit 98ef51c9) was consulted as evidence: it is complete,
tested, unmerged, and undeployed. Findings it addresses are marked CLOSED
only at the forensic level; merge and deploy remain gated on the operator's
promotion constraints (three-pipeline witness split; open authority-conflict
escalation). Nothing in this file claims independent verification.

## Classification legend

- CLOSED: already resolved in source, terminally classified, or implemented
  and tested (merge/deploy still pending where noted).
- ACTIONABLE: a concrete, currently open defect or task.
- SUPERSEDED: a newer packet or newer live evidence replaced it.
- BLOCKING: blocks the event-authority convergence or a merge/deployment
  decision.
- DUPLICATE: same finding recorded elsewhere; the canonical location is named.
- NEEDS LIVE PROBE: cannot be decided from text; requires a live read-only
  (or operator-authorized) probe.

Separability test for ACTIONABLE items: can it be implemented WITHOUT
touching event authority semantics, identity minting, ordering, or the two
canonical tables (ping_events, canonical_events)?

---

## Packet 1: lane-p-artifact-parity.md

| # | Finding / location | Classification | Rationale | Separable? |
|---|---|---|---|---|
| P1 | Parity claim FALSIFIED: certified commit ce3f8687c5 exists only on local branch/worktree; running image ping-gateway:devin-boundary2 (built 2026-09-16) predates certification by ~54h; 3 files mismatch (unified_event_runtime.js, gateway_runtime.js, routes/events.js); no source SHA recorded in artifact (labels null); identity scheme differs (64-hex content hash vs event_<16hex> via IdentityAuthority/RFC-8785); no sequence column live. NEXT BROKEN ARROW: certified->running promotion gate | BLOCKING | This is the source/build/live reconciliation the W-1A promotion constraints and the convergence backlog already require. Nothing certified can be deployed, and no convergence-track merge/deploy decision can proceed, until a reproducible build-and-deploy path from the certified SHA exists with the SHA recorded in the artifact. | n/a (this IS the convergence-track gate) |
| P2 | Image records no source SHA: docker inspect Config.Labels = null | ACTIONABLE | No provenance recorded in the artifact; the lane-o provenance manifest template (section 5) is the intended fix. Must be paired with P1: the promotion gate must require the SHA in the artifact. | YES (build/provenance change only) |
| P3 | Deployed routes GET /events/:stream and POST /events/processed|/failed still consult the dormant-store-first read authority (same flag as the 2026-09-18 audit); only POST /events goes to UnifiedEventRuntime | ACTIONABLE | Open defect in the certified route file: read authority is split. The 2026-09-18 audit flagged it; LANE-P confirms it persists in the certified revision. | NO: it reads the two tables and changes the read-authority path; this is convergence-track work |
| P4 | Foreign probe processes inside the live gateway container: PID 457 node /tmp/pgq6.js still running plus /tmp/pgq*.js, emit-obs-recovery-probe.js, reconcile-pg-probe.js, verify_events.js, orca-autonomy-* scripts (Sep 18 05:15-06:06 MDT and later); read-only SELECT probes, consistent with sibling-lane forensics | ACTIONABLE | Hygiene issue: production container holds live probe processes from earlier forensics work; one is still alive. Sweep/kill them; no forensics tooling should live in /tmp of a production container. | YES (ops hygiene only) |
| P5 | Live gateway idle: zero ping_events writes since 2026-09-16 17:54 UTC despite 26h uptime; all 739 rows written in a ~4.5 min window on 2026-09-16 | CLOSED | Recorded observation, not a defect. Informative: the live emit path is currently unexercised. | n/a |
| P6 | Downstream consumer delivery INFERRED only (mechanism present, never exercised live): EventBridge polls only legacy tables; zero handler/integration activity in 26h of logs | NEEDS LIVE PROBE | Mechanism is source-verified but no consumer delivery has ever been observed live. Completing the proof requires an authorized live emit through POST /events, which is a prohibited DB write until the promotion gate (P1) is cleared; it also needs an operator-authorized probe. | n/a |

---

## Packet 2: recon-d-downstream-matrix.md

| # | Finding / location | Classification | Rationale | Separable? |
|---|---|---|---|---|
| D-CRIT | Witness trigger arrow disconnected at frozen HEAD: 91e1337f4 removed REPLAY_COMPLETED->WITNESS_CREATE (bridge), WITNESS_CREATE mapping (scheduler), and witness eventType; 84da2d40c installed no replacement; WitnessWorker unreachable in production bootstrap; WITNESS_CREATED and WITNESS_REJECTED both unproducible at HEAD | CLOSED | Implemented and tested in W-1A (commit 98ef51c9): bridge map entry REPLAY_COMPLETED -> WITNESS_ATTEST, scheduler MISSION_WORKER_MAP entry, dispatch-time consistency guard; invariant harness 18/18 pass-after (8 end-to-end genuine replay probes). Merge/deploy still gated on promotion constraints. | n/a |
| D-a | 12-leaf compiled witness authority (gateway/replay/kernel/witness_authority.js) vs 13-leaf TS source (runtime/kernel/replay/witness_authority.ts:193, adds constitutional_law_commitment); compiled artifact is what KernelReplayExecutionProvider loads; silent invalidation of all historical roots on recompile | ACTIONABLE | Open convergence item, owned by W-2 per the W-1A next-broken-arrow. Must be paired with a root-version marker (D-f) before recompile, or every historical attestation is silently invalidated. | YES (witness artifact; does not change event identity minting, ordering, or the two tables) |
| D-b | witness_root bound into WITNESS_CREATED.payload.witness (+16 lines in 84da2d40c) | CLOSED | Landed at 84da2d40c; certified. Additive, non-breaking for tolerant readers. | n/a |
| D-c | Verified-only attestation contract (91e1337f4 removed the unverified-creation bypass) | CLOSED | Landed; certified. | n/a |
| D-c2 | Partial-skip attestation hole: KernelReplayExecutionProvider silently truncates at maxEvents (slice, no flag) and skips malformed envelopes (continue, stats.failures++ only); status stays ok; ReplayWorker sets verified=true when violations empty; a witness then attests a truncated/skipped input set | ACTIONABLE | Concrete false-attestation risk in the current design; the verified-only contract is only as strong as the provider's definition of ok. W-1A explicitly scoped this out (provider outside allowlist); W-2 owns the provider fail-closed (skipped/truncated envelopes must force verified:false or verified:partial). | YES (replay provider domain; no touch to event authority semantics, identity, ordering, or the tables) |
| D-d | WITNESS_CREATE fallback removal (91e1337f4) | CLOSED | Landed; correct as a security measure. The disconnect side-effect is D-CRIT (implemented by W-1A). | n/a |
| D-e | Witness identity semantics decision: no separate witness_id vs introduce one; legacy witness_<16hex> scheme persists in dead-letter rows via 4e7eb117b | CLOSED | Recommendation adopted in the W-1A invariant: no independent witness_id; WITNESS_CREATED.event_id is the sole attestation identity; legacy dead-letter witness_id values classified LEGACY historical data. Formal operator confirmation still prudent at merge time. | n/a |
| D-f | Witness provenance / principal binding: no principal, no law/policy version, no algorithm version in WITNESS_CREATED at HEAD; needed as the marker distinguishing 12-leaf from 13-leaf roots | ACTIONABLE (residual) | W-1A bound witness-attest/v1 (algorithm_version) and witness-input/v1 (input_schema_version) plus coverage fields into the attestation. Remaining for W-2: bind the replay kernel engine version and leaf-count semantics honestly, without certifying the 12-leaf construction as universally canonical. | YES (additive attestation payload fields) |
| D-g | Witness restart relies on content-addressed emit idempotency (reaper + ON CONFLICT dedup) | CLOSED | Documented design; no change required. Fragility note (nondeterminism hazards) is addressed by the W-1A logical_id attestation identity (Q4 fix). | n/a |
| D-P2 | Part 2 classification table (spine canonical; AcquisitionManager/ConstitutionalEventStore/IEventAuthority phantom; EventRepository/EventBridge/event_queue LEGACY; LegacyIngressAdapter canonical-allowlisted; Python/Go planes legacy/unwired) | CLOSED | Terminal classifications recorded; consistent with the closed findings list in the task context. No further action. | n/a |
| D-dual | Dual-emit LIVE in the running image (old EventBridge started at gateway_runtime.js:542/549 of the live source; legacy_ingress_adapter.js absent there), fenced in branch source | DUPLICATE | Canonical location: lane-p-artifact-parity.md (P1 / overall verdict). It is the same source/build/live split; additionally it is an instance of the open authority-conflict escalation (two live event authorities). | n/a |
| D-i1 | No witness_id needed; witness_root is proof content, not identity; routing proof content through generateId would conflate proof with identity | CLOSED | Model conclusion recorded; adopted in W-1A invariant. | n/a |
| D-i2 | MerkleTree.hashBytes uses crypto.createHash('sha256') directly (gateway/replay/kernel/merkle_tree.js:213-217) instead of CanonicalAuthority.hashBytes: Hash Authority cannot see, version, or rotate the witness hash function | ACTIONABLE | Sovereignty blemish. Packet recommends routing MerkleTree.hashBytes through CanonicalAuthority during the 13-leaf recompilation (D-a): both changes touch the same artifact, so they should land together. | YES (witness hashing domain) |
| D-i3 | Do not extend the second identity scheme (legacy witness_<16hex>) | DUPLICATE | Canonical location: D-e. | n/a |
| D-i4 | attestation: witness-<16hex> is misnamed: derived from the REPLAY_COMPLETED event_id, not the root; cannot serve as proof; if a stable handle is needed, derive it from (witness_root, replay_fingerprint) content | ACTIONABLE | Open naming/derivation fix. W-1A keeps event_id as the attestation identity; the attestation field's derivation remains from a sibling event's identity. | YES (field derivation/presentation; no authority semantics change) |
| D-l1 | LineageWorker builds causationChain from only the immediate causation_id (canonical_workers.js:530-), never walks the chain | ACTIONABLE | A "chain" of length 1 is not a chain. If LINEAGE_CREATED is ever to be consumed, the walk needs the full causation DAG with cycle detection. | YES (lineage domain) |
| D-l2 | LINEAGE_CREATED is write-only: bridge marks it terminal; ProjectionWorker's registration dormant; EvidenceAuthority reads lineage.source_id, not LINEAGE_CREATED events | ACTIONABLE | Pipeline produces records nobody queries. Either wire a real consumer or record the explicit decision that lineage is write-only telemetry. | YES (lineage domain) |
| D-l3 | Dead gateway/lineage_authority.js mints edge_id with Date.now(): non-replayable identity; unwired, but invites misuse | ACTIONABLE | Fence (PRESERVED_INACTIVE) or delete; silent coexistence is how sovereignty violations become live. | YES (file disposition only) |
| D-lrec | When LineageWorker processes WITNESS_CREATED, copy witness_root, replay_fingerprint, upstreamEventId by reference into LINEAGE_CREATED payload (orthogonality-preserving stronger binding) | ACTIONABLE | Additive, non-breaking recommendation. Depends on D-CRIT being deployed (WITNESS_CREATED must flow first). | YES (additive lineage payload) |
| D-o1 | external_agent_adapter.js: CONFORMS (constraints.no_canonical_events, emission only via eventRuntime.emit) | CLOSED | Recorded; no action. | n/a |
| D-o2 | hermes_dispatch.py: CONFORMS | CLOSED | Recorded; no action. | n/a |
| D-o3 | orca_control_loop.js: CONFORMS (read-only) | CLOSED | Recorded; no action. | n/a |
| D-o4 | Python witness_worker.py / replay_worker.py (root, workers/): VIOLATION (legacy, unwired): random-UUID witness_id, sig_ values, verified:false attestations outside the canonical path | ACTIONABLE | Latent sovereignty violation. Per packet recommendation: fence explicitly (PRESERVED_INACTIVE headers + no launcher) or remove. | YES (file disposition only) |
| D-o5 | workers/repository_client.py: VIOLATION (legacy, unwired): UUID event IDs client-side, bypasses IdentityAuthority | ACTIONABLE | Fence or remove for the same reason as D-o4. | YES (file disposition only) |
| D-o6 | MissionEventBus / EventOutbox: VIOLATION (legacy, unwired): own event ID/hash generation, calls legacy witnessAuthority.createWitness | ACTIONABLE | Fence or remove for the same reason. | YES (file disposition only) |
| D-o7 | gateway alternate witness minters (witness_recorder.js, witness_chain.js, pipeline_witness.js, constitutional_proof_artifact.js, replay_certificate_authority.js): VIOLATION (legacy, unwired) | ACTIONABLE | Fence or remove; each is a latent competing truth source. | YES (file disposition only) |
| D-o8 | DeadLetterAuthority via legacy WitnessAuthority: BOUNDARY CASE (live): mints witness_<16hex> for dead-letter rows; no canonical events; no replay-attestation claim | CLOSED | Boundary recorded; does not violate the ORCA contract as stated. Legacy IDs classified LEGACY per D-e. | n/a |

---

## Packet 3: w0-extended-board-questions.md

| # | Finding / location | Classification | Rationale | Separable? |
|---|---|---|---|---|
| W-planB | CURRENT BUILD: no local image contains 91e1337f4 or 84da2d40c (verified by extracting bridge/scheduler from images) | DUPLICATE | Canonical location: lane-p-artifact-parity.md P1. | n/a |
| W-planL | CURRENT LIVE: runs pre-91e code; old trigger connected; unverified-creation bypass LIVE; 26 REPLAY_COMPLETED -> 26 WITNESS_CREATED observed | DUPLICATE | Canonical location: lane-p-artifact-parity.md P1 (same source/build/live split; live additionally carries the old dual-emit bridge per D-dual). | n/a |
| W-Q1 | Who emits WITNESS_CREATED: WitnessWorker only | CLOSED | Evidence recorded; no other executable emitter repo-wide. | n/a |
| W-Q2 | Who consumes WITNESS_CREATED: EventToMissionBridge -> LINEAGE_CREATE; LineageWorker; /mc/witness/stats observability | CLOSED | Evidence recorded. | n/a |
| W-Q3 | Consumer leg source/artifact/bootstrap/live reachability: PROVEN live (LINEAGE_CREATED rows with causationChain into WITNESS_CREATED event ids) | CLOSED | Evidence recorded. | n/a |
| W-Q4 | Retry -> second witness: PROVEN (sandbox): two WITNESS_CREATED rows, distinct event_ids, same root; root cause wall-clock (constitutionalTimeAuthority.nowAsISOString) inside the identity preimage via BaseWorker._emit | CLOSED | Implemented and tested in W-1A: logical_id = { kind, replay_event_id, witness_root } through _emit into emit(); wall-clock demoted to observation metadata; retry dedups via ON CONFLICT. Merge/deploy gated on promotion constraints. | n/a |
| W-Q5 | Wall-clock in identity preimage: PROVEN (source) | DUPLICATE | Canonical location: W-Q4 (same defect, same fix). | n/a |
| W-Q6 | Fabrication via unauthenticated POST /missions: PROVEN (sandbox): forged REPLAY_VERIFY mission minted fabricated WITNESS_CREATED with attacker root | CLOSED | Implemented and tested in W-1A: bearer-token auth on POST /missions (503 when unconfigured, 401 on wrong token, 400 on invalid body); worker-side canonical authentication as defense in depth. Merge/deploy gated on promotion constraints. | n/a |
| W-Q7 | EventGovernance.validateEvent enforces no payload schema (registry payload_schema entries unread) | CLOSED | Implemented and tested in W-1A: in-code WITNESS_CREATED schema enforced at validateEvent (PAYLOAD_SCHEMA_VIOLATION on malformed). Residual below is separate. | n/a |
| W-Q7r | Residual: generated event_registry.json WITNESS_CREATED payload_schema entry is wrong-shaped and still unenforced-by-registry (outside the W-1A allowlist) | ACTIONABLE | Regenerate the registry entry to match the enforced in-code schema. | YES (registry file only; no authority semantics) |
| W-Q8 | event_type fallback mismatch: MissionScheduler._dispatch builds event_type from payload.event_type || mission.mission_type while worker selection comes from mission_type; sandbox proved REPLAY_VERIFY mission executed WitnessWorker | CLOSED | Implemented and tested in W-1A: dispatch-time consistency guard (event_type must be in the assigned worker's registered eventTypes; mismatch fails the mission without dispatch). Verified against every bridge mapping. | n/a |
| W-Q9 | Replay regenerating same witness: SPLIT (content yes: replay_id deterministic, same root; identity no: new event_id per Q4/Q5) | CLOSED / DUPLICATE | Content determinism recorded (CLOSED); the identity half is W-Q4 (DUPLICATE). | n/a |
| W-Q10 | Omitted hash inputs: spine timestamp, metadata (causation/correlation/confidence), sequence omitted from identity preimage; witness payload omits violations, event_count, leaf_count, engine version | CLOSED | Deliberate design (F7/D1); recorded. The witness-payload coverage gaps (violations, event_count, leaf_count, engine version) fold into D-f / W-2. | n/a |
| W-Q11 | Truncated leaf: PROVEN FAIL-OPEN (replayEvents.slice(0, maxEvents) with no flag; malformed envelopes skipped via continue; status stays ok; verified:true possible over truncated input) | DUPLICATE | Canonical location: recon-d change (c) sub-finding D-c2 (same defect, W-2 owner). Sandbox proof in W-0 stands as evidence. | n/a |
| W-Q12 | Algorithm version unversioned: PROVEN (no engine/algorithm/input-schema version in REPLAY_COMPLETED or WITNESS_CREATED payloads) | DUPLICATE | Canonical location: recon-d change (f) D-f (W-1A bound witness-attest/v1 and witness-input/v1; kernel engine/leaf-count binding is the W-2 residual). | n/a |
| W-H1 | H1 PROVEN / lane WRITER UNIT READY (bounded W-1 unit specified) | CLOSED | Record; the unit was implemented as W-1A. | n/a |
| W-r1 | W-1A residual: direct-invocation seam preserved for EVAL-010; follow-up is to evolve EVAL-010 to inject a mock attestationSource, then delete the seam | ACTIONABLE | The seam is unreachable from the mission pipeline (production bootstrap always wires a pool; dispatch without a source fails closed), so this is test-hygiene, not a live hole. | YES (test evolution only) |
| W-r2 | W-1A residual: scratch PG container w1a-scratch-pg (127.0.0.1:15439) left running for coordinator re-verification; holds no user data | ACTIONABLE | Stop/remove the scratch container when re-verification is done; contains no user data. | YES (ops hygiene only) |

---

## Packet 4: lane-o-oracle-gates.md (sections 7, 8; section 9 with lane-o2-readiness.md supersession)

lane-o2-readiness.md (2026-09-19 ~19:30 MDT) is the newer Oracle evidence.
Items it re-verified or closed are marked SUPERSEDED with the o2 fact.

| # | Finding / item | Classification | Rationale | Separable? |
|---|---|---|---|---|
| O-S1 | Verify SSH PasswordAuthentication off and enumerate ubuntu authorized_keys (read-only check before any change) | ACTIONABLE | Still open. o2 verified key auth, sudo NOPASSWD, and no password prompts, but did not check the sshd PasswordAuthentication setting or enumerate authorized_keys. Pre-deploy checklist item. | YES (host hardening) |
| O-S2 | Firewall: verify ufw/iptables default-deny posture; confirm no broad public ingress | ACTIONABLE | Still open. o2 found: iptables INPUT policy ACCEPT (RELATED/ESTABLISHED allowed, tcp/22 NEW allowed, final REJECT); ufw NOT installed; all service ports bind 127.0.0.1; only 22 and rpcbind(111) on 0.0.0.0. Risk low today, but a future 0.0.0.0 publish would be exposed. Pre-deploy runbook item: verify no 0.0.0.0 publish or set default-deny. | YES (host hardening) |
| O-S3 | Postgres bound to the docker internal network only; no host port publish without operator approval | SUPERSEDED | o2 verified: all live service ports bind 127.0.0.1 only (8080 gateway, 5432 postgres, 6333/6334 qdrant). | n/a |
| O-S4 | Audit listening sockets after deploy (ss -tlnp); every open port must map to a named consumer | ACTIONABLE | Post-deploy checklist item. o2 verified the current state (only 22 and 111 on 0.0.0.0); the audit must be re-run after the certified deploy. | YES (host hardening) |
| O-S5 | Never mount /var/run/docker.sock into application containers | SUPERSEDED | o2 verified: no docker.sock mounts observed in the live gateway inspect. Remains a standing runbook rule for the new deploy. | n/a |
| O-S6 | Run application containers as non-root where the image supports it; record UID/GID | ACTIONABLE | Not verified by o2. Pre-deploy checklist item. | YES (host hardening) |
| O-S7 | .env files and secret material root:ubuntu 0600 or tighter before first start | SUPERSEDED | o2 verified: /opt/ping/.env is 0600 ubuntu:ubuntu. Remains the standard for the certified path (which must NOT copy the live credential). | n/a |
| O-S8 | No broad public ports for convenience; exceptions need operator word + named consumer | SUPERSEDED | o2 verified the binding layer (127.0.0.1 only). | n/a |
| O-LADDER | Certification ladder: ARCHITECTURE_READY -> ... -> BUSINESS_PATH_PROVEN, each stage claimed only with its gate evidence | CLOSED | Standing reference definition; o2's NEXT MUTATION still operates under it. No action. | n/a |
| O-tree | tree-sitter@0.21.1 BLOCKED at Docker build time on ARM64 (no linux-arm64 prebuild; gateway/Dockerfile has no toolchain); recommended W1: add build-base + python3 to gateway Dockerfile | ACTIONABLE | Still open per o2 (repo tree unchanged; blockers stand). Also note the boot-path caveat from lane-o: tree-sitter is NOT in the gateway boot chain, so this is build-time, not boot-time. | YES (build file change; boot chain untouched; no authority semantics) |
| O-temp | @temporalio/core-bridge@1.8.0 BLOCKED at require time on Alpine/musl (glibc-linked binary accepted silently at install, fails at dlopen); recommended W1: REMOVE @temporalio/* from the Oracle gateway package set (no temporal service in the main compose; Temporal deferred to a real workflow) | ACTIONABLE | Still open per o2. Boot-path caveat: only gateway/temporal_runtime.js requires it, reached only via lazily loaded bootstrap/wiring.js; gateway boot does not touch temporal. | YES (dependency removal; lazy-load path only; no authority semantics) |
| O-dock | Three missing Dockerfiles referenced by compose.yaml: Dockerfile.witness, Dockerfile.replay, Dockerfile.projection (all dev profile); Python sources exist | ACTIONABLE | Still open per o2 (M1 workers). Low-risk authoring on the Dockerfile.worker-runtime pattern (python:3-alpine, copy workers/ + kernel/, CMD the worker). | YES (packaging only) |
| O-redis | No redis service in compose.yaml though gateway/package.json depends on bullmq/ioredis; bullmq modules reached only via lazily loaded bootstrap/wiring.js | ACTIONABLE | Add redis:7-alpine (arm64 verified) to the Oracle compose. Cheap; unblocks lazily loaded queue paths. | YES (packaging only) |
| O-ollama | Ollama nvidia reservation BLOCKED as written (no /dev/nvidia* on host); ollama deferred to proven need (M2) | CLOSED | o2 confirmed: ollama excluded from the budget until an AI route is exercised; nvidia block dropped in the Oracle compose. | n/a |
| O-host | Host state change: Docker 29.1.3 + Compose 2.40.3 + git 2.43.0 present though the brief said absent | SUPERSEDED | o2 closed it: all three came from official Ubuntu 24.04 apt packages (docker.io, docker-compose-v2, git), installed 2026-09-15 03:56 UTC per apt history.log. Legitimate install; who invoked apt is unrecorded. | n/a |
| O-ssh | SSH gate confirmation | CLOSED | o2: CLEARED (reachable, key auth, sudo NOPASSWD, aarch64, no GPU). | n/a |
| O-arm | ARM64 image gate (10 images) | CLOSED | o2: CLEAR; live empirical proof added (postgres:17-alpine, qdrant:v1.7.0, node 20-alpine gateway all healthy on arm64). | n/a |
| O-stack | Minimum-stack scope: M0 = postgres + gateway + worker-runtime + redis | CLOSED | o2 confirmed M0 with one change: recommend postgres pin matching the certified compose and certified SHA's schema pin, not the incidental live stack's 17-alpine. | n/a |
| O-pin | Source pin: which SHA/branch the Oracle host is built from; tree is DIRTY (modified CERTIFICATION.md, CONTRADICTIONS.md, EVAL-006; untracked evidence/, tests/mc1-legacy-ingress/) | ACTIONABLE | A certified deployment must record dirty_tree=true or pin a clean SHA; deploying a dirty tree silently is forbidden. Operator/certification decision pending. | YES (process gate; no authority semantics) |
| O-sec | Secrets path: how Postgres credentials and API keys reach the host | ACTIONABLE | Still open per o2 (BLOCKER 3): the live stack used /opt/ping/.env (0600); the certified path must not copy the live credential. Operator decision pending. | YES (process question) |
| O-coex | NEW from lane-o2 (not in lane-o): live Oracle stack on the host owns ports 8080/5432/6333, volumes oracle_pgdata / oracle_qdrant_storage, and compose project name `oracle` (gateway 36h, postgres 38h, qdrant 47h; image oracle-gateway built 2026-09-17T12:59Z, NOT the constitutional-convergence-v2 compose) | BLOCKING | Deploying the certified convergence minimum stack as-is collides on ports, project name, and possibly volumes. Needs an operator decision first: (a) retire the live stack after backup verification, or (b) deploy on distinct ports/volumes/project name. No Phase 2 mutation until decided. | n/a (operator decision; the deploy mechanics themselves are separable, but nothing deploys until the decision) |

## Cross-packet duplicate map

- W-planB -> P1; W-planL -> P1; D-dual -> P1.
- W-Q5 -> W-Q4; W-Q9 (identity half) -> W-Q4.
- W-Q11 -> D-c2 (canonical: recon-d change (c) sub-finding).
- W-Q12 -> D-f (canonical: recon-d change (f)).
- W-Q7r is the registry half of W-Q7 (W-1A implemented the enforceable half).
- W-r provider boundary -> D-c2.
- D-d side-effect -> D-CRIT.
- D-i3 -> D-e.
- W-1A promotion constraint 1 (three-pipeline witness split) -> P1.
- W-1A promotion constraint 2 (second live event authority) -> the open authority-conflict escalation (operator), referenced by D-dual.

---

## Summary counts

| Classification | Count |
|---|---|
| CLOSED | 28 |
| ACTIONABLE | 28 |
| SUPERSEDED | 5 |
| BLOCKING | 3 |
| DUPLICATE | 10 |
| NEEDS LIVE PROBE | 1 |

## BLOCKING findings (3)

1. **P1 (lane-p): the certified->running promotion gate is missing.** The certified commit ce3f8687c5 exists only on local branch/worktree; the running image predates certification by ~54h; three key files mismatch; the artifact records no source SHA; identity schemes differ; no sequence column live. Source, build artifact, and live runtime are three different pipelines (W-1A's promotion constraint 1). Nothing certified can be built, deployed, or rolled out until the reproducible build-and-deploy path from the certified SHA is defined and executed with the SHA recorded in the artifact. This also blocks W-1A merge/deploy.
2. **The second live event authority (open authority-conflict escalation with the operator).** The live runtime mounts TWO effective event authorities: UnifiedEventRuntime -> ping_events and CanonicalEventEnvelope -> canonical_events (live bootstrap gateway_runtime.js:480, POST /canonical-events), with its own UUID v5 ID scheme, per-tenant sequence, and table, bypassing the registry, governance, canonicalization, and IdentityAuthority; the old live bridge re-emits canonical_events rows through UnifiedEventRuntime.emit(), minting a second ID for one logical event (D-dual, lane-f2). Per the W-1A promotion constraints: no Event-authority writer unit is authorized until the operator resolves which authority owns event emission and identity.
3. **O-coex (lane-o2): Oracle host coexistence.** A live Oracle stack (not authored by lane-o, not the certified compose) owns ports 8080/5432/6333, volumes oracle_pgdata / oracle_qdrant_storage, and compose project name `oracle`. Operator decision required: retire the live stack after backup verification, or deploy the certified stack on distinct ports/volumes/project name. No Phase 2 mutation until decided.

## ACTIONABLE and SAFELY SEPARABLE findings (implementation candidates)

All ACTIONABLE findings except P3 are separable: implementable without
touching event authority semantics, identity minting, ordering, or the two
canonical tables. The non-separable exception is P3 (deployed routes still
consulting the dormant-store-first read authority: it reads the two tables
and changes the read-authority path, so it is convergence-track work).

### Witness layer (separable)
- D-a: recompile witness authority to 13 leaves (W-2), paired with a root-version marker (D-f).
- D-f (residual): bind replay kernel engine version + leaf-count semantics into the attestation honestly (W-2).
- D-c2: replay provider fail-closed on silent truncation/skip (W-2).
- D-i2: route MerkleTree.hashBytes through CanonicalAuthority (with D-a, same artifact).
- D-i4: fix the misnamed `attestation` field or derive the stable handle from (witness_root, replay_fingerprint).
- W-Q7r: regenerate the event_registry.json WITNESS_CREATED payload_schema entry to match the enforced in-code schema.
- W-r1: evolve EVAL-010 to inject a mock attestationSource, then delete the W-1A direct-invocation seam.

### Lineage (separable)
- D-l1: walk the full causation DAG with cycle detection in LineageWorker.
- D-l2: decide: wire a real consumer for LINEAGE_CREATED or record it as write-only telemetry.
- D-l3: fence (PRESERVED_INACTIVE) or delete the dead Date.now()-minting LineageAuthority.
- D-lrec: copy witness_root, replay_fingerprint, upstreamEventId by reference into LINEAGE_CREATED when processing WITNESS_CREATED (after D-CRIT is deployed).

### Legacy-plane fencing (separable)
- D-o4: fence or remove the unwired Python witness/replay workers (complete alternate witness minters).
- D-o5: fence or remove workers/repository_client.py (client-side UUID IDs).
- D-o6: fence or remove MissionEventBus / EventOutbox.
- D-o7: fence or remove the five alternate gateway witness minters (witness_recorder, witness_chain, pipeline_witness, constitutional_proof_artifact, replay_certificate_authority).

### Build and provenance (separable)
- P2: record the source SHA/digest in the build artifact; fill the lane-o provenance manifest at each deploy.
- O-tree: remediate tree-sitter ARM64 build (recommended: add build-base + python3 to gateway Dockerfile).
- O-temp: remediate temporal on musl (recommended: remove @temporalio/* from the Oracle gateway package set).
- O-dock: author the three missing Dockerfiles (witness, replay, projection) on the Dockerfile.worker-runtime pattern.
- O-redis: add redis:7-alpine to the Oracle compose.
- O-pin: pin a clean SHA (or record dirty_tree=true) before any certified deploy; the tree is currently dirty.
- O-sec: resolve the secrets path for the certified deploy (operator decision).

### Ops hygiene (separable)
- P4: sweep stray forensic probe processes from the live gateway container (/tmp/pgq*.js still-running PID).
- W-r2: stop/remove the w1a-scratch-pg scratch container when re-verification is done.

### Pre/post-deploy host checklist (separable)
- O-S1: verify PasswordAuthentication off; enumerate ubuntu authorized_keys.
- O-S2: firewall posture (iptables default ACCEPT noted; decide default-deny or enforce no 0.0.0.0 publish).
- O-S4: re-run listening-socket audit after the certified deploy.
- O-S6: run application containers as non-root where supported; record UID/GID.

### The one ACTIONABLE that is NOT separable
- P3: fix the split read authority in the certified route file (GET /events/:stream, POST /events/processed|/failed consulting the dormant store first). It reads the two canonical tables and changes the read-authority path; it belongs to the event-authority convergence track, not to an independent fix.

---

## What this phase does NOT cover (explicitly out of scope)

- The four agent packets (agent-a through agent-d) and lanes c/c2, f/f2, m, t/t2 were not re-classified here; their findings are assumed already triaged elsewhere.
- The W-1A promotion constraints are operator decisions, not defects: (1) reconcile source/build/live before any rollout; (2) resolve the authority-conflict escalation before authorizing any Event-authority writer unit. Both stand.
- No live probes were run; P6 awaits an operator-authorized live emit through the promotion gate.
- Nothing commits, merges, deploys, or deletes without the operator's word; all convergence-track and fencing work above is implementation-candidate only.

*Report produced 2026-09-19, local read-only, this VM. Files read:
lane-p-artifact-parity.md, recon-d-downstream-matrix.md,
w0-extended-board-questions.md, lane-o-oracle-gates.md, lane-o2-readiness.md,
w1-writer-packet.md (background evidence only).*
