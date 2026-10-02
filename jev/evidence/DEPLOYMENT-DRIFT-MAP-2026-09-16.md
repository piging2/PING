# Deployment drift map — Sep-16 deployment vs jev-surgical worktree

Observed: 2026-09-23 ~07:30-08:00 MDT. Method: Pig SSH (`~/workspace/pig/pigwsl-run.sh`), `docker inspect` (env keys only, never values), `docker exec` read-only code inspection, read-only Postgres SELECTs as the `postgres` role via local socket. NO writes, NO restarts, NO redeploys, NO DB mutations, NO trigger changes, NO secret output. Builds on [WITNESS-forensic-7-cases.md](sandbox://workspace/jev/evidence/WITNESS-forensic-7-cases.md), [SYNTHETIC-CONFIDENCE-CEILING.md](sandbox://workspace/jev/evidence/SYNTHETIC-CONFIDENCE-CEILING.md), [DISPATCH-PATH-FORENSICS.md](sandbox://workspace/jev/evidence/DISPATCH-PATH-FORENSICS.md), [EVENTBRIDGE-TRUST-FORENSICS.md](sandbox://workspace/jev/evidence/EVENTBRIDGE-TRUST-FORENSICS.md); corrects parts of them where the live topology differs.

## 1. LIVE TOPOLOGY

### Running containers (all `docker ps -a` entries; none stopped)
| Container | Image | Digest | Built | (Re)started | Ports |
|---|---|---|---|---|---|
| ping-gateway | ping-gateway:devin-boundary2 | sha256:5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20 | 2026-09-16T18:02:47Z | 2026-09-22T16:54:48Z | 0.0.0.0:8080→8080 (public) |
| ping-rc-gateway | ping-gateway:rc-4d522a6b | sha256:fb6f3069d642f55273697b579168b30e7b2b42bbd491cfcb53d07bf62f98ee38 | 2026-09-20T03:23:13Z | 2026-09-22T16:55:36Z | 127.0.0.1:18099→8080 (loopback only) |
| ping-postgres | postgres:15-alpine | — | — | 20h uptime | 0.0.0.0:5433→5432 |
| brain-postgres | postgres:15-alpine | — | — | 20h uptime | 0.0.0.0:5432→5432 |
| ping-rc-postgres | postgres:16 | — | — | 20h uptime | 127.0.0.1:15433→5432 |
| ping-test-pg | postgres:17-alpine | — | — | 20h uptime | 0.0.0.0:55433→5432 |
| ping-qdrant | qdrant/qdrant:latest | — | — | up (unhealthy) | 6333 |
| brain-qdrant | qdrant/qdrant:latest | — | — | up | 6333-6334 |
| ping-redis / ping-vault / ollama / cosyvoice-tts / open-webui | — | — | — | up | — |

Notable: **no `ping-gateway-prev` container exists** (the 2026-09-13 note is stale). **No `curious-squid-gateway:phase4-eventauth8` container is running**; the current public gateway is `ping-gateway:devin-boundary2`.

### ping-gateway (public deployment spine)
- cmd: `node gateway/server.js`, entrypoint `docker-entrypoint.sh`, NODE_ENV=production.
- env keys (values never read): LOG_LEVEL, MUSE_LEVEL_1_KEY, MUSE_LEVEL_2_KEY, NODE_ENV, NODE_VERSION, PATH, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER, QDRANT_HOST, QDRANT_PORT, QDRANT_URL, YARN_VERSION.
- mounts: one volume (`muse-workspace` → `/app/workspace/muse`).
- Database it actually writes to: **POSTGRES_DB=ping_runtime, POSTGRES_HOST=host.docker.internal, PORT=5432** → resolves to **brain-postgres:5432, database ping_runtime**. This answers the open spine question: the Sep-16 deployment spine is **ping_runtime**, not crx_runtime.

### ping-rc-gateway (staging spine)
- POSTGRES_DB=rc_staging, POSTGRES_HOST=ping-rc-postgres → separate database spine. Separate code lineage (built 2026-09-20). Loopback-only. **Not inventoried in depth**: its postgres role is not `postgres` (connection as postgres role fails FATAL), so read-only SELECTs would need the rc credentials — recorded as UNOBSERVABLE under the read-only authorization. Smallest exact requirement: postgres superuser on ping-rc-postgres, or the rc DB user credentials.

### Database: brain-postgres / ping_runtime
- 33 tables including ping_events, repository_events, canonical_events, ping_bridge_cursors, ping_missions, exterior_agent_credentials, tenants, tenant_registry.
- **ping_events: 2321 rows, latest 2026-09-22 23:34:32 UTC (17:34 MDT)** — the spine is live and writing today.
- **repository_events: 0 rows. canonical_events: 0 rows. ping_bridge_cursors: 0 rows.** Both bridged tables are empty; the bridge has never ingested anything in this DB.
- Daily volumes: 2026-09-16: 872 (confirms the memory observation exactly), 09-17: 72, 09-18: 45, 09-19: 216, 09-20: 684, 09-21: 144, 09-22: 288.

### Route table (deployed image, /app/gateway/routes/)
POST routes include: /events, /events/processed, /events/failed, /canonical-events, /canonical-events/:id/processed, /canonical-events/:id/failed, /ingest, /orchestration/missions, /orchestration/missions/:id/dispatch, /orchestration/missions/:id/output, /orchestration/engine/compile, /orchestration/engine/loop, /orchestration/engine/git-diff, /missions, /capabilities (authMiddleware), /customers/*, /connectors/*, /reviews/*, /knowledge/search|nodes|edges, /tenants, /ollama/chat|autocomplete, /ai/chat|embed|select, /ai-workspace/*, /runtime (incl. tenant heartbeat).

**Auth posture (deployed):** `/events`, `/canonical-events`, `/ingest`, `/orchestration`, `/missions` are ALL mounted behind `ExteriorAuthMiddleware.middleware()` (gateway_runtime.js:790, 794, 798, 900, 915). The middleware is fail-closed: requires `Authorization: Bearer <api_key>`, key looked up in `exterior_agent_credentials`, **unknown agents DENIED**. `/capabilities` uses authMiddleware. **2 credentials exist** in exterior_agent_credentials (count only; values never read).

**Correction to the worktree record:** the "no auth observed at route or mount layer" finding (LP-2 / witness forensics) does NOT hold against the live deployment. The deployed image enforces exterior authentication on the HTTP ingress paths. The unauthenticated-forgery leg is closed at the mount layer in production.

**Deployed POST /events additionally:** validates a claimed `tenant_id` against the `tenants` table (format-checked `^[a-zA-Z0-9_-]+$`; unknown or inactive tenant → rejected, never stored; business_id must match the registry row), then enforces `namespace = tenant::<tenant_id>` through governance. Source is set to `api:<agentId>` (or `api` if no agent) — every emitted event is attributable to a credentialed agent.

**Deployed POST /canonical-events:** presence-only validation at route (tenant_id, event_type, source, actor, payload); behind exterior auth at mount.

### Bridge (deployed)
- EventBridge instantiated and started in the deployed bootstrap (gateway_runtime.js:542-549, poll 5s). `_skipGovernance: true` present at both bridge emit sites (event_bridge.js:184, 283) — same as worktree.
- Bridge map (deployed path /app/ping-runtime/orchestration/event_to_mission_bridge.js:64-66): REPLAY_COMPLETED → WITNESS_CREATE, WITNESS_CREATED → LINEAGE_CREATE, LINEAGE_CREATED terminal. Same as worktree.
- But: zero bridged rows, zero cursor rows, both source tables empty. The bridge is mechanism-live, ingestion-quiet.

### Workers (deployed canonical_workers.js)
- Registration shape matches the worktree: witness on ['WITNESS_CREATE','REPLAY_COMPLETED'] (:731); projection on [...,'RECOMMENDATION_CREATED','LINEAGE_CREATED'] (:726); replay on ['REPLAY_VERIFY','PROJECTION_CREATED'] (:730); lineage on ['LINEAGE_CREATE','WITNESS_CREATED'] (:732); intelligence dormant (eventTypes: []).
- **Witness gate (deployed :489): `payload.replay.verified === true` — boolean-only, same as worktree.** No authority binding, no subject binding, no violations cross-check.
- Replay worker (deployed :337-347): `verified = (status==='ok' && violations.length===0)`, reason 'kernel_verified', `fingerprint: kernelResult.fingerprint || null`. Same as worktree.
- **P2/P3/P4 ABSENT from the deployed image:** no `/app/ping-runtime/jev/` directory; no ACCEPT_CLAIM anywhere; registry has 233 events with **JEV_DECISION_EVALUATED absent** (REPLAY_COMPLETED, WITNESS_CREATED, WITNESS_REJECTED, LINEAGE_CREATED all REGISTERED). Worktree registry is 235. The typed-decision work was never deployed.

### Emit behavior (deployed unified_event_runtime.js:75-125)
- Unregistered event_type → `{status:'error'}` (fail-closed). Registry loads from `gateway/generated/event_registry.json` (233 events in this image).
- Governance runs at emit unless `_skipGovernance`; namespace defaults to `core::system` at the single choke point; the canonical privacy boundary (core::\* | tenant::\*) is validated there.

## 2. WRITER INVENTORY (ping_events, ping_runtime)

| Source | Rows | Class |
|---|---|---|
| mission-runtime | 1800 | gateway mission layer |
| lineage / witness / projection / replay | 63 each | canonical workers |
| recommendation / claim / classification | 60 each | canonical workers |
| api:muse | 41 | credentialed exterior agent (api:<agentId> pattern) |
| observation | 18 | observation worker |
| worker-runtime:external-agent-adapter | 9 | — |
| project-authority, customer-authority | 7, 5 | authorities |
| api:muse-level-2, email-connector, review-authority, sms-connector | 2, 2, 2, 1 | connectors/agents |

- **No writer other than the gateway's own pipeline and two credentialed exterior agents.** No `ping-gateway-prev`, no orphaned container, no cron writes visible as distinct sources.
- **The 2026-09-16 06:52 MDT writer — IDENTIFIED.** Window 12:50-12:55 UTC shows `mission-runtime` (MISSION_CREATED/ASSIGNED/STARTED/COMPLETED) and `claim` (CLAIM_CREATED, namespace tenant::hpp). The "unidentified writer" was the gateway's own mission runtime processing HPP tenant claims. Nothing exotic.
- **No verdict-shaped row has ever arrived via `repository_events` or `canonical_events`** (zero rows with those sources), via bare `api` source, or from any non-worker source.

### Verdict-shaped row scan
| Event type | Count | Sources | Namespaces | Latest |
|---|---|---|---|---|
| REPLAY_COMPLETED | 63 | replay | core::system 41, tenant::hpp 21, core::owner 1 | 2026-09-22 23:34:22 UTC |
| WITNESS_CREATED | 63 | witness | same split | 2026-09-22 23:34:27 UTC |
| LINEAGE_CREATED | 63 | lineage | same split | 2026-09-22 23:34:32 UTC |
| WITNESS_REJECTED | 0 | — | — | — |
| JEV_DECISION_EVALUATED | 0 | — | — | — (not in deployed registry) |

- Sampled latest REPLAY_COMPLETED payload: `{reason:'kernel_verified', verified:true, violations:[], fingerprint:'sha256:…', witness_root:'…', eventType:'PROJECTION_CREATED'}` — genuine shape; **fingerprint is present** in production (the worktree's nullable-fingerprint concern is not manifesting in live data).
- Sampled latest WITNESS_CREATED payload: `{witness:{eventType:'REPLAY_COMPLETED', timestamp, attestation:'witness-bab484b3f9b6705f'}, upstreamEventId:'bab484b3f…addc'}` — no authority object carried, consistent with the boolean-only gate.
- Missions: WITNESS_CREATE / REPLAY_VERIFY / PROJECTION_CREATE / LINEAGE_CREATE all 63, all `completed`; CLAIM_GENERATE / CLASSIFICATION_CREATE / RECOMMENDATION_CREATE 60 each. The genuine pipeline cycles claim→…→lineage end-to-end in production.

## 3. TENANT / NAMESPACE BEHAVIOR

- Namespace distribution: core::system 2134, tenant::hpp 177, core::owner 10.
- tenant::hpp rows come from pipeline worker sources (claim/classification/recommendation/projection/replay/witness/lineage/observation + authorities/connectors) — **the namespace is preserved through the whole chain**; the deployed POST /events tenant-registry validation plus emit-time governance keep tenant rows as tenant::<id>.
- The bridge's `core::system` rewrite of tenant canonical_events rows (EVENTBRIDGE-TRUST-FORENSICS) is **code-present but unexercised**: zero bridged rows exist, so no rewrite is observable in the live data. The defect is latent, not manifest.
- No `tenant::<id>` namespace appears that is not backed by the tenants registry path (all tenant::hpp rows trace to the validated pipeline).

## 4. DRIFT VS SOURCE (worktree jev-surgical @ cc6856c3b)

| Dimension | Deployed (devin-boundary2, built 2026-09-16) | Worktree (cc6856c3b + uncommitted) |
|---|---|---|
| HTTP ingress auth | ExteriorAuthMiddleware, fail-closed Bearer, on /events /canonical-events /ingest /orchestration /missions | **Absent**: no exterior_auth_middleware.js, zero mentions in gateway_runtime.js |
| Tenant validation on POST /events | tenants-table check, unknown/inactive rejected, tenant::<id> namespace enforced | Not in the forensically examined worktree path |
| Witness gate | boolean-only `verified===true` (:489) | boolean-only (:493) — SAME |
| Bridge + _skipGovernance | present, started, map REPLAY→WITNESS→LINEAGE | same semantics (bridge file at different in-image path: orchestration/ vs events/) |
| Replay joint computation | status ok ∧ zero violations; fingerprint \|\| null | SAME |
| P2/P3/P4 Jev work | ABSENT (no jev/ dir, no JEV_DECISION_EVALUATED) | PRESENT (uncommitted) |
| Registry | 233 events | 235 events |
| Adversarial suites | absent | present (uncommitted) |

Classification:
- **DEPLOYED ONLY**: exterior auth + tenant validation (the deployment is NEWER than the worktree on ingress hardening; the image descends from the eventauth lineage, not from this worktree).
- **SOURCE ONLY**: P2/P3/P4, JEV_DECISION_EVALUATED, adversarial test suites (the worktree is NEWER on Jev decision machinery; none of it has deployed).
- **SEMANTIC DRIFT (correction)**: the worktree record's "unauthenticated POST /events" and "no auth at route or mount" claims are **false against the live deployment**. LP-2's external leg must be restated: the live ingress requires a valid agent credential. What remains open on the live topology is the **authenticated-agent forgery class**: a holder of either of the 2 API keys can POST `{event_type:'REPLAY_COMPLETED', event_data:{replay:{verified:true}}}` — the type is registered, the payload is not validated, governance passes it (registered type, valid namespace), and the witness attests on the boolean. TYPE VALIDATION != AUTHENTICATION != AUTHORIZATION != EVIDENCE VALIDITY holds in production: a valid key proves *which agent called*, not that the agent may declare verification.
- **NO DRIFT**: witness gate, replay joint computation, bridge map, terminal LINEAGE_CREATED, dormant intelligence worker, dead ProjectionWorker LINEAGE_CREATED entry (present in both), empty bridged tables in production (the internal twin is mechanism-live, producer-quiet in BOTH environments).

## 5. HIGHEST-VALUE DEFECT TO FIX FIRST (once authorized)

**Authenticated-agent verdict forgery on the live spine.** The exterior auth closed the anonymous leg, but the constitutional hole is unchanged: nothing binds a verdict-shaped event to the worker that is allowed to produce it. Concretely: `POST /events` with either valid agent key, `event_type: REPLAY_COMPLETED`, `event_data: {replay:{verified:true}}` → type registered → governance passes → ping_events → bridge → WITNESS_CREATE mission → WitnessWorker (boolean gate) → WITNESS_CREATED → witness stats/chain tails polluted. Zero kernel involvement, fully credentialed.

Smallest constitutional boundary (no new authority): **verdict-class admission at the spine** — REPLAY_COMPLETED, WITNESS_CREATED/WITNESS_REJECTED, LINEAGE_CREATED (and JEV_DECISION_EVALUATED when it deploys) may enter ping_events **only from the worker emit path** (source in {replay, witness, lineage, jev-shadow}); the same types arriving at the /events or /canonical-events HTTP ingress are rejected (or journaled-but-inert with a logged rejection). Complementary and independently sufficient: the witness authority-binding checks from the forensic record (provider === 'KernelReplayExecutionProvider', replay.documentId === payload.documentId, violations empty, fingerprint non-null) — which close attestation even for a verdict that reaches the journal. Either changes the ceiling; both together close entry and attestation.

Why this before the bridge denylist: the bridge denylist from the prior record guards tables that are **empty in production** — real but latent. The authenticated-agent HTTP leg is the live, reachable, credentialed path today.

### Falsification condition (for the fix, once authorized)
1. `POST /events` with a valid agent key and forged `REPLAY_COMPLETED{replay:{verified:true}}` → rejected (4xx) or journaled-but-inert: NO `WITNESS_CREATED`, NO witness-stats inflation, NO downstream mission.
2. `gateway/test_witness_adversarial.js`: 7 WEAK reject, 5 STRONG hold (no STRONG flips to attest).
3. Genuine pipeline unaffected: kernel-verified replays still produce WITNESS_CREATED through bridge→mission→dispatch (the live pipeline's ~daily volume is the liveness oracle).
4. Legitimate non-verdict ingestion with a valid key still succeeds (no over-broad breakage).
If (1) fails while (3) passes, the defect stands. If the fix breaks (3), it is the wrong boundary.

## EVIDENCE PACKET
- Problem: Sep-16 deployment drift map — live topology, writer inventory, verdict-row scan, namespace behavior, drift vs worktree.
- Source evidence: `docker inspect` digests/config, in-image code reads (gateway_runtime.js:790/794/900/915, events.js:87-140, canonical_events.js:19-42, unified_event_runtime.js:75-125, event_validator.js, exterior_auth_middleware.js:1-80/245, canonical_workers.js:489, event_to_mission_bridge.js:64-66, event_bridge.js:184/283), and read-only SELECTs against brain-postgres/ping_runtime.
- Constraints honored: SELECTs only; no container writes/restarts; env keys only (values never read or printed); credential counts only; no secret output.
- Unobservable under authorization: ping-rc-gateway's rc_staging DB contents (needs its postgres role/credentials); in-image Qdrant projection state for verdict types (qdrant unhealthy on ping side; not needed — dispatch forensics already proved exclusion).
- Files touched: none (read-only investigation). Worktree untouched.
- Authority before/after: no change. Persistence effect: none. Security effect: findings reported, not exploited — no forged events or rows were posted/inserted during this investigation; the 2 exterior credentials were counted, never read.

## NEXT UNCERTAINTY
The rc spine (ping-rc-gateway → rc_staging, image rc-4d522a6b built 2026-09-20): does its code match devin-boundary2 (exterior auth present?) or the worktree (P2/P3/P4 present?)? It is loopback-only, so blast radius is smaller, but a drifted staging gateway is exactly how a "fixed in staging, broken in prod" (or the reverse) falsification gap opens. After that: integration research per the directive's standing fallback (external systems as executor/adapter/index/source/transport), and the dormant-bridge-producer question (repository_events is empty *today*; the _skipGovernance trust stays latent until a writer appears).
