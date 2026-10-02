# Tenant Boundary Map — TenantOS Execution Substrate (swarm-01)

Date: 2026-09-23. Scope: the autonomous tenant execution loop
(TENANT INTENT → MISSION → DURABLE RUN → BOUNDED WORK → CAPABILITY DECISION →
MCP/TOOL EXECUTION → RESULT → VERIFICATION → EVENT/EVIDENCE → MEMORY →
MISSION CONTROL → NEXT WORK), traced across the two trees that implement it:

- `/home/nolan/ping` — gateway + ping-runtime (the substrate; Node/Express,
  Postgres, Qdrant, Redis). Live gateway on Pig :8080 (image
  `ping-gateway:devin-boundary2`, healthy, uptime ~31.5h at probe time).
- `/home/nolan/projects/ping` — Next.js product repo (port 3100). FYD product
  tenant contract lives here under `src/fyd/tenant/` + `src/fyd/boundary/`
  (HARD EXCLUSION ZONE for wave writes; referenced, never touched).

Method: read-only source inspection + 9 executable isolation tests
(`tests/t1..t9`, `tests/run-all.sh`) that run the REAL code paths with stubbed
I/O and synthetic fixtures. 9/9 leak classes demonstrated pre-fix.

Headline: the substrate has NO caller→tenant binding. Two parallel tenant
mechanisms exist — `tenant_id` columns and `tenant::<id>` namespace strings —
with no canonical mapping between them, and neither is bound to an
authenticated caller (the gateway has no auth middleware at all). Tenant
identity is self-asserted at every ingress and is dropped at the canonical→
spine bridge, after which the whole loop runs as `core::system`.

Live ground truth: `GET /tenants` → `{"tenants":[],"count":0}`. The tenant
registry is EMPTY in production. There is one production tenant-like
environment (single-tenant reality, cf. memory 2026-09-14); multi-tenancy is a
design contract with zero live tenants, which is exactly why the boundary must
be proven BEFORE tenant B arrives.

---

## Hop-by-hop

### 1. TENANT — how a tenant comes into existence

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| Tenant registry (CRUD) | `gateway/routes/tenants.js:18` → `ping-runtime/runtime/tenant_registry.js:50` | `tenant_id` string from `req.body` (POST /tenants) | REFACTOR |
| tenant_registry table | `database/canonical_events.sql:54` | `tenant_id VARCHAR(255) PRIMARY KEY`, FK targets | KEEP |
| Product tenant config | `/home/nolan/projects/ping/src/config/tenant.ping.v1.json` | static JSON identity/brand | KEEP (product lane) |

Findings:
- POST /tenants accepts `tenant_id` from the request body with no auth and no
  caller binding (`routes/tenants.js:20-44`). Anyone who can reach :8080 can
  register/overwrite a tenant (`ON CONFLICT DO UPDATE`, tenant_registry.js:63).
- The registry's own docstring says the id format is `tenant://{id}`
  (tenant_registry.js:38), while the namespace mechanism uses `tenant::<id>`
  and the canonical-events route uses bare `tenant_id`. Three spellings, no
  canonical mapping. PROPOSAL: canonical form `tenant::<slug>` everywhere
  (kit: `tenant-context.js`).
- Live registry is empty; nothing resolves a caller to a tenant.

### 2. IDENTITY — who the caller is

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| Gateway auth middleware | `gateway/bootstrap/gateway_runtime.js:116` | NOTHING. `_setupMiddleware` installs only `express.json()` + CORS `*`. Zero auth on any route. | REFACTOR (P0) |
| ExteriorAuthMiddleware | only in `worktrees/oracle-assembly/...` (not live) | `{agentId, agentName}`, no tenant (memory 2026-09-12) | DROP (dead; do not resurrect as-is) |
| identities routes | `gateway/routes/identities.js` | no tenant/namespace refs at all | REFACTOR |
| FYD identity (product) | `src/fyd/identity/principal.ts`, `session.ts` | principal/session, exclusion zone | KEEP (product lane; consume, don't duplicate) |

Findings:
- There is NO authentication on the substrate HTTP surface. `/tenants`,
  `/canonical-events`, `/ingest`, `/missions`, `/knowledge`, `/mc/*` are all
  unauthenticated. Tenant identity therefore cannot be "propagated" — there is
  no authenticated principal to propagate FROM. This is the root defect; every
  downstream boundary is caller-asserted.
- Bearer tokens in the gateway container env (memory) are for OUTBOUND
  connectors, not inbound auth (probe: only hits are connector `auth: api_key`
  declarations).

### 3. AUTHORIZATION — is this caller allowed this tenant's scope

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| `authorizeNamespace` | `ping-runtime/canonicalization/canonicalization_service.js:76` | `requested` override string, format-only check | REFACTOR (P0) |
| `resolveNamespace` | same file :57 | `requested \|\| per-source map \|\| default` — override wins unconditionally | REFACTOR (P0) |
| Capability resolver | `ping-runtime/runtime/capability_resolver.js` | no tenant/namespace refs | PROPAGATE (thread ctx through) |
| ORCA work-order auth | `orca_control_loop.js:729` | hardcoded `NAMESPACE='core::system'` (:42) | REFACTOR |
| Product grants | `/home/nolan/projects/ping/src/lib/ping/grants.ts` | no tenant refs | KEEP (product lane) |

Findings (T1 demonstrated):
- `resolveNamespace(source, requested)`: `requested` wins over everything with
  only a regex check. The ingest route's comment calls this "the route guard
  for the namespace boundary" (`routes/ingest.js:47`) — it guards shape, not
  authority. Any caller can emit into `tenant::<victim>`.
- ORCA authorizes every work order in `core::system`; tenant work and system
  work are indistinguishable (T9).

### 4. OBJECTS — tenant-owned records

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| `ping_objects.sql` | `database/ping_objects.sql` | NO tenant column | REFACTOR (add tenant_id when objects go multi-tenant) |
| canonical object authority | `gateway/canonical_object_authority.js` | no tenant refs | PROPAGATE |
| knowledge graph addNode | `routes/knowledge.js:66` | `namespace` from `req.body` (caller-asserted) | REFACTOR |

### 5. MEMORY — vector + persisted memory

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| Qdrant collections | `gateway/memory_vector_store_authority.js:35` | 12 FIXED global collections (`memory_facts`…`memory_failures`), none tenant-scoped | REFACTOR (T8) |
| `storeEmbedding`/`searchMemory` | same file :74/:96 | collection + id + payload; no tenant param | PROPAGATE (require payload.namespace) |
| HybridSearch privacy filter | `ping-runtime/search/hybrid_search.js:57` | `payload.namespace !== namespace → drop`, but `namespace` is the CALLER's string | REFACTOR (T4) |
| knowledge `/search` route | `gateway/routes/knowledge.js:27` | `namespace` from `req.body`, required-but-unbound | REFACTOR (T4) |
| embedding service | `ping-runtime/embeddings/embedding_service.js:203` | namespace from options/identity/object (caller chain) | PROPAGATE |

Findings: the read path DOES filter by namespace (good instinct, wrong trust
root). Since the namespace is self-asserted and the gateway is unauthenticated,
the filter is a cooperative label, not a boundary. Shared index + shared
collections = cross-tenant vector reads are one string away.

### 6. MISSIONS — durable work items

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| `ping_missions` table | `mission_runtime.js:78` (CREATE TABLE in `initialize()`) | NO tenant_id column; `payload` JSONB may contain inert `_tenant_id` | REFACTOR (P0) |
| `POST /missions` | `gateway/routes/missions.js:22` | `{missionType, payload, priority, createdBy}` — no tenant | REFACTOR |
| `GET /missions/pending\|active\|stats` | same file :33/:44/:12 | global, no filter | REFACTOR (T3/T6) |
| mission idempotency | `mission_runtime.js:71` | `sha256(missionType:payload)` — cross-tenant collision domain | note |
| event→mission bridge | `ping-runtime/orchestration/event_to_mission_bridge.js:128` | threads `event.namespace` (already laundered, see hop 8) | PROPAGATE (fix the source) |

Findings (T3): missions are global. Any tenant's worker can list/claim any
mission. `payload._tenant_id` (written by the event bridge) is opaque JSON —
no query reads it.

### 7. RUNS / WORKERS — background execution

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| WorkerRuntime.dispatch | `ping-runtime/workers/worker_runtime.js:68` | `worker._event = event` so `BaseWorker._emit` preserves `event.namespace` | KEEP (mechanism) |
| background_workers.js | `gateway/background_workers.js` | no tenant/namespace refs | PROPAGATE |
| mission_scheduler | `ping-runtime/orchestration/mission_scheduler.js:235` | `namespace: payload.namespace` (threaded, laundered upstream) | PROPAGATE (fix the source) |
| retries / DLQ | `bullmq_adapter.js`, `dead_letter_authority.js`, scheduler `:98` | retry policy exists; NO tenant/namespace carried | PROPAGATE |

Findings: the worker namespace-preservation machinery is CORRECT — but it
preserves the namespace the bridge already laundered to `core::system`. The
mechanism is sound; its input is poisoned. Retries/DLQ carry no tenant marker
at all, so a retried tenant job is indistinguishable from a system job.

### 8. EVENTS — the spine

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| `canonical_events` table | `database/canonical_events.sql:11` | `tenant_id VARCHAR(255) NOT NULL`, `UNIQUE(tenant_id, sequence)`, indexed | KEEP |
| canonical envelope | `gateway/canonical_event_envelope.js:146` | `tenant_id` in envelope, per-tenant sequences, `generateEventId(tenantId,…)` | KEEP |
| POST /canonical-events | `gateway/routes/canonical_events.js:21` | `tenant_id` from `req.body` (caller-asserted, unauthenticated) | REFACTOR |
| EventBridge (canonical→spine) | `ping-runtime/events/event_bridge.js:271` | reads `tenant_id`, then DROPS it: emit without `options.namespace` | REFACTOR (P0 — the laundering point) |
| UnifiedEventRuntime.emit | `ping-runtime/events/unified_event_runtime.js:104` | `options.namespace \|\| 'core::system'` — single choke point, correct default | KEEP |
| `ping_events` (spine) | `database/events.sql` | NO tenant column; has `namespace` (populated by emit) | REFACTOR (add tenant_id or keep namespace-only w/ mapping) |
| event query API | `unified_event_runtime.js:224` | filters: eventType/source/since/limit — NO namespace/tenant option | REFACTOR |
| `/events` routes | `gateway/routes/events.js` | no tenant/namespace refs | REFACTOR |

Findings (T2 demonstrated — the P0): the bridge is where tenant identity DIES.
`tenant_id` enters `canonical_events` correctly, the bridge copies it to
`payload._tenant_id` + `metadata.tenant_id`, then emits with NO namespace, so
the spine stamps `core::system`. Everything downstream (mission projection,
scheduler, workers, Qdrant embeddings via `event.namespace`) inherits the
laundered namespace. The tenant survives ONLY as unenforced metadata —
forensically recoverable, operationally invisible. Two emit sites affected:
`:179` (repository bridge) and `:278` (canonical bridge).

### 9. TOOLS / MCP — capability execution

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| `ping_mcp_server.py` (12 tools) | `mcp/ping_mcp_server.py` | NO tenant param on any tool; thin proxy to global Mission Control endpoints | REFACTOR (T5) |
| `tool_gateway.js` | `gateway/tool_gateway.js` | no tenant/namespace refs | PROPAGATE |
| connectors/capability registry | `ping-runtime/connectors/*` | per-connector auth, no tenant | PROPAGATE |

Findings (T5): `search_memory`, `recent_events`, `lineage_lookup`,
`credential_inventory`, etc. all proxy tenant-unaware endpoints. An agent
acting for tenant A gets tenant B's memories/events/credentials through the
official tool surface.

### 10. EVIDENCE / VERIFICATION

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| EvidenceAuthority | `ping-runtime/evidence/evidence_authority.js:19` | `NAMESPACE_RE` format checks + object/identity namespace consistency | KEEP (checks are sound) |
| verification_authority | `gateway/verification_authority.js` | (not tenant-aware; constitutional sprint owns authority mapping) | consume sprint cert |

Findings: evidence checks validate namespace SHAPE and consistency, never
authority. A well-formed lie passes.

### 11. PROJECTIONS / QDRANT

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| projection writes | `embedding_service.js:138,146` | `namespace: event.namespace` (laundered upstream) | PROPAGATE (fix the source) |
| Qdrant sovereignty docs | `projects/constitutional-runtime/QDRANT_*.md` | constitutional sprint area | consume, don't duplicate |

### 12. UI — Mission Control

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| `/mc/*` routes (25+ widgets) | `gateway/routes/mission_control.js` | NO tenant input, NO tenant filter; `requirePG` = postgres-availability only | REFACTOR (T6) |
| `/mc/dashboard`, `/business/*`, `/inbox`, `/queues`, `/activity`, `/replay/*`, `/witness/*`, `/dead-letters` | same file | all global | REFACTOR |

Findings (T6 demonstrated): Mission Control is a single-tenant dashboard over a
global data plane. The moment tenant B exists, every widget leaks.

### 13. LOGS / TRACES

| Mechanism | File | Carries tenant as | Verdict |
|---|---|---|---|
| `asyncHandler` / `logRequest` | `gateway/route_middleware.js:19,53` | logs FULL `req.query` + `req.body` to stdout on EVERY route | REFACTOR (P0 privacy) |
| bridge DEBUG logs | `event_bridge.js` | row counts (not content) — acceptable | KEEP |

Findings (T7): tenant payloads and PII in request bodies go to docker logs
verbatim. (Constitutional sprint's s4-leak covers the Next.js repo; this is the
substrate-side instance.)

---

## Attack classes → status

| Attack | Status | Evidence |
|---|---|---|
| Cross-tenant reads | CONFIRMED (structural) | T4, T5, T6; `query()` has no namespace option |
| Cross-tenant writes | CONFIRMED (structural) | T1, T3; unauthenticated POST /ingest, /missions, /canonical-events |
| System-namespace laundering | CONFIRMED (live code path) | T2; bridge emit drops namespace → `core::system` |
| Shared caches/indexes | CONFIRMED | T8; 12 global Qdrant collections |
| Shared agent context | CONFIRMED | T9; ORCA loop hardcoded `core::system` |
| MCP results crossing tenants | CONFIRMED | T5; 12/12 tools tenant-unaware |
| Logs/traces leaking tenant data | CONFIRMED | T7; full bodies in stdout |
| Background workers losing tenant identity | CONFIRMED | T2 chain; workers preserve laundered namespace; retries/DLQ carry nothing |
| Retries losing tenant identity | CONFIRMED | scheduler retry policy + DLQ have no tenant marker |
| Mission Control missing tenant filters | CONFIRMED | T6; zero tenant refs in 25+ widgets |
| Admin/system execution becoming tenant execution | NOT OBSERVED | reverse direction is the live problem (tenant→system laundering) |
| Tenant registry poisoning | CONFIRMED (structural) | unauthenticated POST /tenants with upsert |

## Verdict summary

- KEEP: `tenant_id` columns + envelope + per-tenant sequences (canonical_events);
  UnifiedEventRuntime.emit's single namespace choke point; worker
  `BaseWorker._emit` namespace preservation; evidence namespace-consistency
  checks; FYD product contract (`src/fyd/tenant/`, `src/fyd/boundary/`) as the
  product-side reference (exclusion zone — consume, don't touch).
- PROPAGATE: thread the (now-correct) tenant context through capability
  resolver, tool gateway, background workers, scheduler/retries/DLQ, embedding
  service, mission-control handlers, MCP tools. No new systems — the context
  object is defined once (`src/tenanos/tenant/tenant-context.js`).
- REFACTOR: `resolveNamespace`/`authorizeNamespace` (binding policy, P-004);
  EventBridge emit (namespace propagation, P-003); mission runtime + routes
  (tenant scoping); knowledge/MCP/mission-control read paths (tenant input +
  filter); route_middleware logging (redaction, P-005); Qdrant collection
  strategy; gateway auth (the root P0 — needs Nolan's auth decision, grilling
  brief candidate, NOT silently designed by swarm).
- REPLACE/DROP: none proposed. Burden of proof not met for any replacement;
  ExteriorAuthMiddleware is dead code in a worktree (DROP = leave it there,
  do not resurrect).
- New code (additive only, per coordinator directive): `src/tenanos/tenant/`
  kit — `tenant-context.js`, `namespace-binding.js`, `bridge-tenant.js`,
  `tenant-scope.js` + `__tests__/tenant-kit.test.js` (P-002). No second
  orchestrator, no second event authority, no second capability system.

## What was NOT invented

No TenantAuthority. The missing piece is not an authority — it is (a)
authentication (who is calling), (b) a canonical tenant-identity string, and
(c) propagation of that identity through existing mechanisms. The kit defines
(b) and (c); (a) is a Nolan decision (auth model for the gateway), recorded as
an open question, not silently built.

---

## Wave filing (2026-09-23 ~19:40 MDT, post-restart resume)

Filed **P-20260923-092** — the tenant boundary kit as strict TypeScript, purely
additive under `src/tenanos/`:

- `src/tenanos/tenant/tenant-context.ts` — canonical `tenant::<slug>` mapping,
  fail-closed TenantContext, TenantBoundaryError (establish)
- `src/tenanos/tenant/namespace-binding.ts` — source→namespace binding policy
  for the resolveNamespace honor-system fix (enforce at ingress)
- `src/tenanos/tenant/bridge-tenant.ts` — bridge emit options so tenant_id
  survives as the enforced spine namespace, not laundered `core::system`
  (propagate)
- `src/tenanos/tenant/tenant-scope.ts` — namespacePredicate / tenantIdPredicate /
  filterMissionsByTenant for substrate read paths (enforce at read)
- `src/tenanos/__tests__/tenant-kit.test.ts` — 14 tests, green under the
  verbatim scoped jest config; tsc --noEmit strict clean

Evidence: diffs/P-20260923-092.diff (git apply --check OK), STATE.json entry
with test_results, check-overlap.py clean for this proposal, TEST-RUN-LOG.md,
TS sources in kit-ts/ (diff source of truth; kit/ keeps the original JS).

ID history: checkpoint plan called this P-002; P-20260923-002 is under ID
collision (swarm-17 diff file vs swarm-14 STATE entry) — never reuse. 089/090/091
were claimed by other swarms mid-run; filed as 092.

Swarm-08 coordination: P-20260923-088 (MC-side tenant-filter spec,
PROJECTION-WIRING.md) names swarm-01 as suggested owner of the BACKEND work.
This kit IS the backend half — 088's spec consumes namespacePredicate /
tenantIdPredicate / filterMissionsByTenant / emitOptionsForCanonicalRow. No
duplication of 088. The /home/nolan/ping REFACTOR targets (bridge emit,
resolveNamespace, route_middleware logging) remain classification-only: they
live outside the wave's src/tenanos/** root. Gateway auth (root P0) is still a
Nolan decision, not designed here.

Next: coordinator assigns writer → branch → Gate 2+; backend consumers
(unifiedEventRuntime.query namespace param + default-deny, ping_missions
tenant_id migration) are follow-up proposals against the wave root once the
kit integrates.

### Filename-collision incident (2026-09-23 ~19:40-19:52 MDT, honest record)

This worker initially wrote the kit diff to diffs/P-20260923-089.diff using a
STALE directory listing — P-20260923-089 had been registered by swarm-18 minutes
earlier (STATE.json grew 22→26 proposals during this run). The write destroyed
swarm-18's file; a concurrent swarm-16 write collided on the same path too.
Recovery, in order: (1) renamed my file to P-20260923-092 (free at the time);
(2) discovered another worker had reconstructed swarm-18's content into the 092
path; (3) restored 089.diff to swarm-18's MemoryCandidate bytes (schema bodies
verified identical across their reconstructions — only header comments differed);
(4) regenerated the tenant-kit diff deterministically from kit-ts/ sources into
092.diff; (5) verified both apply cleanly and the 092 tree passes 14/14 tests.
Orphaned bodies seen mid-incident: a swarm-05 knowledge_graph P0 demotion fix
(no STATE entry at the time) — since preserved by another worker as
diffs/COLLISION-P-20260923-089-swarm05-P0FIX-UNREGISTERED.diff; a mislabeled
COLLISION-*-tenant-kit-UNREGISTERED.diff actually holds MemoryCandidate bytes.
Lesson: re-read STATE.json (not just diffs/) immediately before writing a new
diff file; treat the diffs/ directory as a concurrent-write zone and verify
after every write.
