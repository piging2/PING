# S3 — Semantic Audit: core gateway/ + authorities/ + constitution/ + kernel/

**Worker:** S3 (core gateway authorities + constitution). **Date:** 2026-09-23 ~20:35–21:30 MDT.
**Mode:** READ-ONLY. COMMITS CREATED: NONE. No repo writes, no process touches, no secret values printed.
**Bases:** CORE `/home/nolan/ping` @ `refactor/runtime-authority-convergence`, HEAD `cc6856c3b` (PRIMARY; every claim grounded in live code, top-level audit .md files treated as pointers only). ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` consulted for seam claims.
**Transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'` (stdin-fed scripts; bounded greps; `rg` absent on Pig, GNU grep used).
**Read first (applied):** `event/EVENT-FORENSICS.md`, `authority-map/AUTHORITY-MAP.md`, `security/SECURITY-SWEEP.md`, `reachability/REACHABILITY.md`, `agent20-convergence/GLOBAL-AUTHORITY-MAP.md` — with the two liveness dimensions (declared-live vs actually-reachable).

## Scope verdict up front

The live composition root is `gateway/server.js` → `gateway/bootstrap/gateway_runtime.js` (GatewayRuntime). Everything in this file is classified against that root: DEFINED → IMPORTED → CONSTRUCTED → INITIALIZED → STARTED → REGISTERED → CALLED → PERSISTING → READ BACK → RESTARTED → TESTED. Mechanisms not reachable from it are DORMANT unless proven otherwise — naming, comments, and `authorities/registry.yaml` statuses are not evidence of liveness.

**Headline findings:**
1. **CanonicalizationService is real and live, but its sovereignty is partial by design violation:** `POST /ingest` honors it; `POST /events`, `POST /canonical-events`, and `POST /identities` all bypass it and hit `UnifiedEventRuntime.emit` (or a separate envelope) directly. The file's own header — "The REST route (POST /ingest) and every producer (emitters, workers, capture adapters) are thin adapters over this service" — is false for the three HTTP ingest paths.
2. **Two live IdentityAuthorities mint the same `type_hash16` ID format through divergent serializers** (`runtime/kernel/authorities/identity_authority.js` vs compiled `gateway/constitutional-dist/identity-authority.js`), while comments in `routes/identities.js` and `social_ingest_adapter.js` claim "the ONE IdentityAuthority". A third scheme (UUIDv5 `tenantId:eventType:timestamp:sequence` in `CanonicalEventEnvelope`) is live via `POST /canonical-events`. A fourth (`runtime/kernel/identity/identity-authority.ts`) is an interface with zero importers.
3. **`computeCanonicalHash` (constitutional_validation.js:348) silently drops nested object content** (`JSON.stringify(obj, Object.keys(obj).sort())` — the replacer array is built from top-level keys only, so every nested object is stripped to the intersection with top-level keys). It backs `GET /constitution`'s `platformHash` ("deterministic platform state") and `CanonicalEventEnvelope` hashing. This is a FAKE-verification defect, live.
4. **`GET /identities` orders by a `sequence` column that does not exist**: the single `CREATE TABLE ping_events` in the codebase (`unified_event_runtime.js:44`) has no `sequence` column; no migration adds one. The route 500s on any code-created schema.
5. **Dormant second composition roots** (`bootstrap/index.js` DI container, `bootstrap/constitutional_runtime.js`, `bootstrap/main.js` removed-but-referenced) and an unwired `gateway/approval_authority.js` (378 lines, zero requirers) — the code-patch approval authority has no live gate.
6. **`authorities/registry.yaml` is aspirational, not authoritative** — loaded only by code generators and a Python intent-graph script; its statuses do not map to actual module names.

---

## Shared-record rows

Format: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS

### S3-01 — CanonicalizationService (namespace auth + canonicalizeAndEmit)

- **DOMAIN:** event-ingest boundary · **COMPONENT:** `ping-runtime/canonicalization/canonicalization_service.js`
- **CLAIM:** "The Canonicalization Boundary law: every observation, command, artifact, decision, memory, plan, and external event MUST cross this boundary before it exists." "The REST route (POST /ingest) and every producer (emitters, workers, capture adapters) are thin adapters over this service." "it wraps resolveNamespace so resolution + validation have exactly one owner."
- **EVIDENCE:** DEFINED `ping-runtime/canonicalization/canonicalization_service.js:1-190` (constructor takes `{eventRuntime, namespaces, defaultNamespace}`; `resolveNamespace` enforces `NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/`; `authorizeNamespace` returns `{authorized:true,namespace}|{authorized:false,reason}`; `canonicalizeAndEmit` builds `createCanonicalObject` envelope then `this._eventRuntime.emit(...)` with namespace + timestamp-stripped `logical_id` + confidence/evidence/lifecycle metadata; duck-typed `emit()` routes to `canonicalizeAndEmit`). IMPORTED `gateway/bootstrap/gateway_runtime.js:98`. CONSTRUCTED `:447` (`new CanonicalizationService({ eventRuntime: unifiedEventRuntime, namespaces: {...} })`). REGISTERED in services map `:664`. CALLED by `gateway/routes/ingest.js:48,53` (`authorizeNamespace` → `canonicalizeAndEmit`, mounted `:691` as `POST /ingest`) and by business emitters via duck-typed `emit()` (`ping-runtime/business/business_emitters.js:14-83` call `this._er.emit(...)`; constructed with the service at `gateway_runtime.js:568-572`). PERSISTING via `UnifiedEventRuntime.emit` → `ping_events`. TESTED: zero test files reference it (`grep -rln CanonicalizationService tests test gateway/tests gateway/verify` → empty).
- **CALLER:** `createIngestRoutes` (POST /ingest); ReviewEmitter/CustomerEmitter/ProjectEmitter/ConnectorEmitter/SystemEmitter · **CALLEE:** `createCanonicalObject` (`ping-runtime/canonicalization/canonical_object.js`), `UnifiedEventRuntime.emit`
- **WRITER:** via emit → `ping_events` · **READER:** read routes
- **AUTHORITY:** Declared: CanonicalizationService (boundary). Actual: only for /ingest + emitters.
- **CLASSIFICATION:** CANONICAL_LIVE but PARTIAL sovereignty — the bypass surface is live: `POST /events` (`gateway/routes/events.js:97,120`) calls `eventRuntime.emit` directly with source `'api'` and no `authorizeNamespace`/`canonicalizeAndEmit`; `POST /canonical-events` (`gateway/routes/canonical_events.js:22`) calls `canonicalEventEnvelope.executeEmitEvent` (separate table, separate ID scheme); `POST /identities` (`gateway/routes/identities.js:178`) calls `eventRuntime.emit('OBJECT_CREATED', 'api', ...)` directly with its own hand-rolled `payload_hash` (via dist `HashAuthority.canonicalizeObject`), no namespace auth, no canonical envelope.
- **CONFIDENCE:** PROVEN (source-traced end to end)
- **BROKEN BOUNDARY:** Declared "every producer crosses this boundary" ≠ actual (three HTTP ingest paths bypass it). Namespace-format is redundantly enforced at emit level (`EventGovernance._validateCanonicalNamespace`, same regex, `ping-runtime/events/event_governance.js`), but per-source namespace binding (`options.namespaces` map) exists ONLY in the service — a `POST /events` caller can claim any format-valid namespace.
- **DEPENDENCIES:** `UnifiedEventRuntime` (live), `createCanonicalObject` (live), `namespaces` source→namespace map (configured in bootstrap)
- **AFFECTS AGENTS:** Agent 01 (owns CP-1 ingest-boundary case; Agent 01's append-orchestrator work must not create a second ingest authority)

### S3-02 — UnifiedEventRuntime → ping_events (spine)

- **DOMAIN:** event durability · **COMPONENT:** `ping-runtime/events/unified_event_runtime.js`
- **CLAIM:** single event spine; `INSERT INTO ping_events … ON CONFLICT (event_id) DO NOTHING`; content-hash IDs.
- **EVIDENCE:** CONSTRUCTED `gateway_runtime.js:433`, INITIALIZED `:439` (`CREATE TABLE IF NOT EXISTS ping_events (event_id VARCHAR(64) PRIMARY KEY, event_type, source, timestamp TIMESTAMPTZ DEFAULT NOW(), payload JSONB, metadata JSONB, namespace VARCHAR(255) DEFAULT 'core::system', processed BOOLEAN, created_at)` — the ONLY `CREATE TABLE ping_events` in the codebase; no `sequence` column). `emit` (`:73-198`): content-hash identity `sha256(JSON.stringify({eventType, source, [namespace], [logical_id|payload]}))` — key-order-sensitive `JSON.stringify`, not canonical bytes (F8, corroborated). Governance step `:101-118` always passes a namespace (default `core::system`) through `EventGovernance.validateEvent`, so namespace-FORMAT is enforced on every emit path including the /events bypass. Duplicate delivery suppresses handlers/integrations (convergence, not reconstruction).
- **CALLER:** CanonicalizationService, routes/events.js, routes/identities.js, EventBridge, emit-overlay.py · **CALLEE:** EventValidator, EventGovernance, IntegrationManager, in-process `.on()` subscribers (embedding_service.js:132, event_to_mission_bridge.js:95, gateway_runtime.js:598)
- **WRITER:** emit · **READER:** EventReadAuthority + SQL fallbacks; EventBridge
- **AUTHORITY:** UnifiedEventRuntime — sovereign for the journal. PROVEN.
- **CLASSIFICATION:** CANONICAL_LIVE
- **CONFIDENCE:** PROVEN
- **BROKEN BOUNDARY:** none on the spine itself; the boundary violations are at its callers (S3-01) and in the identity hash (F8 key-order caveat — Agent 05).
- **DEPENDENCIES:** Postgres pool; `event_registry.json` (EventValidator); EventGovernance
- **AFFECTS AGENTS:** Agent 05 (identity-hash law), Agent 13 (durability — the journal this row owns has no backup story per GLOBAL-AUTHORITY-MAP row 19)

### S3-03 — IdentityAuthority ×2 live + 1 live scheme + 1 dead interface (CONFLICTING)

- **DOMAIN:** identity · **COMPONENT:** (a) `runtime/kernel/authorities/identity_authority.js` (9226b); (b) `gateway/constitutional-dist/identity-authority.js` (compiled, untracked) from `runtime/constitutional/src/identity-authority.ts`; (c) `gateway/canonical_event_envelope.js` `generateEventId`; (d) `runtime/kernel/identity/identity-authority.ts`
- **CLAIM:** (a) header: "Constitutional Constraint: All ID generation must flow through this method… This guarantees one constitutional identity law for the entire runtime." (b) dist header: "All ID generation must route through this authority"; Dockerfile: "Compile the constitutional authorities (single source of truth for identity". `routes/identities.js:6`: "mints a PING identity through the ONE IdentityAuthority (compiled from runtime/constitutional/src at Docker build time; never reimplemented here)". `social_ingest_adapter.js` comment: "ids minted by the ONE IdentityAuthority".
- **EVIDENCE:** (a) kernel: `generateFromCanonicalHash(canonicalBytes, type)` → `` `${type}_${hash.substring(0,16)}` `` where hash = `CanonicalAuthority.hashBytes(CanonicalBytes.serialize(...))`. `ping-runtime/authorities/identity_authority.js` (1159b) is a proper PATCH_004 shim re-exporting (a) — not a duplicate. Consumed by `createCanonicalObject` (`ping-runtime/canonicalization/canonical_object.js` imports `../authorities/identity_authority.js`) → all canonical-envelope object IDs. (b) dist: static `generateId(type, context)` → `` `${type}_${hash16}` `` where context is canonicalized via `HashAuthority.canonicalizeObject` (undefined→null) then `JSON.stringify`, then `hashCanonical`. Consumed by `POST /identities` (`routes/identities.js:38,139-176` via `require('../constitutional-dist/identity-authority.js')`) and `social_ingest_adapter.js:39,176`. **The two serializers diverge**: kernel `CanonicalBytes.serialize` maps `undefined` → literal 9-byte `"undefined"` and concatenates array elements WITHOUT comma separators (`Buffer.concat(['[', ...elements, ']'])` — `["ab","c"]` and `["a","bc"]` serialize identically: ambiguous encoding); dist `canonicalizeObject` maps `undefined`→`null` and uses `JSON.stringify`. Same semantic context containing `undefined` (or colliding array splits) yields DIFFERENT `type_hash16` IDs from (a) vs (b). (c) `CanonicalEventEnvelope.generateEventId(tenantId, eventType, timestamp, sequence)` → UUIDv5 of `` `${tenantId}:${eventType}:${timestamp}:${sequence}` `` — live via `POST /canonical-events` (`routes/canonical_events.js`), persisted to `canonical_events` table; a third event-ID scheme for the same "event identity" decision. (d) `runtime/kernel/identity/identity-authority.ts`: interface-only (`IIdentityAuthority`, `IClockAuthority`), header "Only this interface crosses subsystem boundaries" — **zero importers** in any JS/TS searched (same abandoned-contract class as `IEventAuthority`). Dist files are NOT tracked in git (`git ls-files gateway/constitutional-dist/` → empty) — build artifact present on disk/container, compiled at Docker build (`gateway/Dockerfile:12-17`).
- **CALLER:** (a) canonical_object.js, constitutional_validation? (b) routes/identities.js, social_ingest_adapter.js (c) routes/canonical_events.js (d) none
- **AUTHORITY:** Declared: "ONE IdentityAuthority" (two different files make the claim). Actual: (a) owns canonical-envelope object IDs; (b) owns gateway-minted identity/profile/post IDs; (c) owns canonical_events IDs. No bridge.
- **CLASSIFICATION:** (a) CANONICAL_LIVE · (b) CANONICAL_LIVE · (c) CANONICAL_LIVE (secondary) · (d) DORMANT (abandoned contract) → overall CONFLICTING
- **CONFIDENCE:** PROVEN (both code paths traced to live routes; serializer divergence read line-by-line)
- **BROKEN BOUNDARY:** naming/enforcement mismatch — "ONE IdentityAuthority" is claimed in two places while two incompatible implementations mint the same ID format. The array-without-comma encoding in `CanonicalBytes.serialize` is a latent collision defect in the "one constitutional identity law".
- **DEPENDENCIES:** (a) `CanonicalBytes`/`CanonicalAuthority` (kernel); (b) `HashAuthority` (dist); (c) `canonical_events` table
- **AFFECTS AGENTS:** Agent 05 (identity-hash law; digest-stability migration analysis must cover BOTH serializers + the ambiguous array encoding; CP-2/CP-3); Agent 02 (witness — which IDs witnesses bind)

### S3-04 — computeCanonicalHash drops nested content (FAKE verification, LIVE)

- **DOMAIN:** hashing/verification · **COMPONENT:** `ping-runtime/authorities/constitutional_validation.js:348`
- **CLAIM:** "Compute canonical hash of an object" — used as the platform-integrity hash.
- **EVIDENCE:** `function computeCanonicalHash(obj) { const canonical = JSON.stringify(obj, Object.keys(obj).sort()); return sha256(canonical); }` — the replacer ARRAY is computed once from the TOP-LEVEL keys; per `JSON.stringify` semantics, every nested object is then serialized keeping ONLY properties named in that array. Any nested key not also a top-level key is silently dropped before hashing. Two semantically different objects with the same top-level keys hash identically. Consumed by: `GET /constitution` (`gateway/routes/constitution.js:100`, `platformHash = computeCanonicalHash(platformInput)` — the endpoint's header claims "This endpoint is the single source of constitutional truth… Response is deterministic"); `CanonicalEventEnvelope` (`gateway/canonical_event_envelope.js:23` imports it).
- **CALLER:** routes/constitution.js, canonical_event_envelope.js · **CALLEE:** node crypto
- **AUTHORITY:** Declared: canonical hash. Actual: lossy, collision-prone digest.
- **CLASSIFICATION:** CANONICAL_LIVE (wired) but SEMANTICALLY BROKEN — FAKE verification/determinism
- **CONFIDENCE:** PROVEN (function body + two live call sites read)
- **BROKEN BOUNDARY:** "deterministic platform state" / "single source of constitutional truth" claims on `/constitution` are not backed by the hash function — the hash cannot distinguish platform states that differ only in nested content.
- **DEPENDENCIES:** none (pure)
- **AFFECTS AGENTS:** Agent 05 (canonical bytes — this is a fourth hash function with its own divergent semantics, must be in the serializer inventory); Agent 02 (any witness/attestation that trusts `platformHash`)

### S3-05 — GET /identities `ORDER BY sequence` on a column that does not exist

- **DOMAIN:** identity read · **COMPONENT:** `gateway/routes/identities.js` (GET `/`)
- **CLAIM:** "Sanitized list: public fields only, canonical acceptance order."
- **EVIDENCE:** Query: `SELECT … FROM ping_events WHERE event_type='OBJECT_CREATED' AND payload->>'schema'='ping.identity@1' ORDER BY sequence ASC NULLS LAST`. The single `CREATE TABLE ping_events` in the codebase (`ping-runtime/events/unified_event_runtime.js:44`) defines columns `event_id, event_type, source, timestamp, payload, metadata, namespace, processed, created_at` — no `sequence`. `database/events.sql` does not mention `ping_events` at all; `database/fix_pipeline_blockers.sql` has no sequence; no migration adds a sequence column to ping_events (`grep -rn "ADD COLUMN.*sequence"` → empty). Against any code-created schema this route raises `column "sequence" does not exist` → 500. (Whether the long-lived Oracle container's table carries a legacy `sequence` column cannot be proven from Pig-side code — flagged BLOCKED on a live read-only probe.)
- **CALLER:** HTTP GET /identities · **CALLEE:** Postgres pool
- **AUTHORITY:** route handler (broken SQL)
- **CLASSIFICATION:** CANONICAL_LIVE route, BROKEN read path (code-proven)
- **CONFIDENCE:** PROVEN (schema vs query compared; exhaustive DDL search)
- **BROKEN BOUNDARY:** "canonical acceptance order" is unimplementable — `ping_events` has no sequence by design (ordering is timestamp-based per GLOBAL-AUTHORITY-MAP row 4).
- **DEPENDENCIES:** `ping_events` table
- **AFFECTS AGENTS:** Agent 01 (identities route is in the event-authority surface); Agent 13 (schema ownership — who may add the column vs fix the query)

### S3-06 — authorities/registry.yaml (aspirational, not authoritative)

- **DOMAIN:** authority registry · **COMPONENT:** `authorities/registry.yaml`
- **CLAIM:** "Maps every authority to its intent, owner, and status." Statuses: implemented / missing_package / missing_implementation / fragmented / mostly_intact / ratified.
- **EVIDENCE:** Names authorities (`ReplayAuthority`, `CanonicalHashAuthority`, `GovernanceAuthority`, `CapabilityAuthority`, `WitnessAuthority`, `EvidenceAuthority`, `CanonicalIdentityService`, …) that do not correspond to actual module/class names in the live tree. Loaded by: `gateway/generated/*_generator.js` (4 files) and `scripts/intent_graph_builder.py` only — NOT by `gateway_runtime.js` or any live composition. No live code consults it for routing, construction, or authorization decisions.
- **CLASSIFICATION:** DORMANT documentation (generator input), not a wiring manifest
- **CONFIDENCE:** PROVEN (importer enumeration)
- **BROKEN BOUNDARY:** none — but it must never be cited as evidence of what is "implemented"; e.g. it lists `ReplayAuthority: implemented` while full-journal replay has no live consumer (CP-5).
- **DEPENDENCIES:** none live
- **AFFECTS AGENTS:** coordinator (do not treat as source of truth); Agent 08 (patch pipeline must not trust it)

### S3-07 — Dormant second composition roots in gateway/bootstrap/

- **DOMAIN:** composition/boot · **COMPONENT:** `gateway/bootstrap/index.js`, `gateway/bootstrap/constitutional_runtime.js`, `gateway/bootstrap/main.js`, `gateway/bootstrap/wiring.js`, `gateway/bootstrap/lifecycle.js`, `gateway/bootstrap/container.js`
- **CLAIM:** `index.js` header: "Replaces SecondBrain as the application entry point… Bootstrap owns construction and lifecycle… Services receive dependencies via container". `main.js` header says the file is REMOVED (exits 1) and points at `index.js` + `omni_router_bootstrap.js` as canonical.
- **EVIDENCE:** Live entrypoint is `gateway/server.js` → `new GatewayRuntime()` from `bootstrap/gateway_runtime.js` (Dockerfile `CMD ["node", "gateway/server.js"]`; `package.json` main `server.js`). `bootstrap/index.js` (`wireContainer` + `Lifecycle`) is referenced ONLY by the removed `main.js` (which `process.exit(1)`s). `bootstrap/constitutional_runtime.js` (requires `../event_repository` shim + `../runtime/constitutional_execution_pipeline`, `Dispatcher`, `ReducerRegistry`, …) has zero requirers. `runtime/kernel/omni_router_bootstrap.js` is referenced only by the removed `main.js`. `wiring.js:buildDependencyGraph` is lazily required at REQUEST TIME by `GET /constitution` (`routes/constitution.js:19-24`) — the "deterministic platform state" endpoint depends on the dormant DI wiring module.
- **CLASSIFICATION:** DORMANT (index/lifecycle/container/wiring/constitutional_runtime/omni_router_bootstrap) — a parallel composition universe that never starts. `gateway_runtime.js` is the sole live root.
- **CONFIDENCE:** PROVEN (entrypoint chain + importer enumeration)
- **BROKEN BOUNDARY:** `/constitution` computes its "single source of constitutional truth" from a wiring module that is not the live composition — the truth it reports is about a container that never runs.
- **DEPENDENCIES:** none live
- **AFFECTS AGENTS:** Agent 08 (the DI bootstrap must be classified before any removal); coordinator (any proposal to "switch to the DI container" is a second-root resurrection — write-gate)

### S3-08 — gateway/approval_authority.js unwired (code-patch approval has no live gate)

- **DOMAIN:** change authorization · **COMPONENT:** `gateway/approval_authority.js` (378 lines, `module.exports = { ApprovalAuthority }`)
- **CLAIM:** (class name) approval authority for code patches.
- **EVIDENCE:** Zero requirers in `gateway/` (`grep -rl approval_authority gateway --include=*.js` → empty); not imported, constructed, or referenced in `gateway_runtime.js`. No route mounts it.
- **CLASSIFICATION:** DORMANT
- **CONFIDENCE:** PROVEN
- **BROKEN BOUNDARY:** the decision "who approves a code patch" has NO live authority — absent boundary (same class as GLOBAL-AUTHORITY-MAP row 20, recovery authorization). Any convergence wave that applies patches does so without the mechanism the repo names for the job.
- **DEPENDENCIES:** none live
- **AFFECTS AGENTS:** Agent 08 (audit-only per WRITER-OWNERSHIP; the approval gate it would audit does not run); coordinator (patch-application authorization is unowned)

### S3-09 — EventReadAuthority: live but shares sovereignty with SQL fallbacks

- **DOMAIN:** event query · **COMPONENT:** `runtime/kernel/event_read_authority.js` (+ `ping-runtime/events/event_read_authority.js` PATCH_003 shim — proper delegation, not a duplicate; `runtime/kernel/events/event-authority-interface.ts` — zero importers, ABANDONED CONTRACT, same class as S3-03(d))
- **CLAIM:** "Constitutional read-side authority for event queries (CQRS)."
- **EVIDENCE:** CONSTRUCTED `gateway_runtime.js:382` (`new EventReadAuthority(this._pool)`), passed to `createEventRoutes` (`:682`) and context/system routes. But every GET handler in `gateway/routes/events.js` (`:17-80`) falls back to raw `pool.query('SELECT * FROM ping_events …')` when the authority returns empty; `markProcessed`/`markFailed`/`getUnprocessedEvents` go to the authority only. Corroborates EVENT-FORENSICS §2B #3 exactly — no drift in this branch.
- **CLASSIFICATION:** CANONICAL_LIVE, PARTIAL sovereignty (declared authority ≠ de-facto read path in several handlers)
- **CONFIDENCE:** PROVEN
- **BROKEN BOUNDARY:** the CQRS read-side boundary leaks — callers cannot tell whether rows came from the authority or the fallback.
- **DEPENDENCIES:** Postgres pool
- **AFFECTS AGENTS:** Agent 01 (fix = "authority or fallback, not both" per write-gate watch)

### S3-10 — /api/v1/repository: fourth persistence surface with DELETE

- **DOMAIN:** artifact persistence · **COMPONENT:** `ping-runtime/events/repository_store.js` (RepositoryStore), `gateway/routes/repository.js`
- **CLAIM:** "RepositoryStore is pure persistence only… VerificationAuthority.verify(object) before RepositoryStore.append(object)… Persistence never stores unconstitutional artifacts."
- **EVIDENCE:** Mounted `gateway_runtime.js:685` as `/api/v1/repository` (constructed from `RepositoryStore`, line ~12 require + services). `POST /objects` takes `{object_id, kind, data, metadata}` with no envelope validation at the route; `DELETE /objects/:id` exists (`routes/repository.js`) — a DELETE on a store whose header claims constitutional persistence. Whether `VerificationAuthority.verify` actually gates `append` was not fully traced (route calls `repoStore.append` directly); the claim is at the class header, enforcement unverified in this pass. Separate from `ping_events`, `repository_events`, `canonical_events` — a fourth durable surface.
- **CLASSIFICATION:** CANONICAL_LIVE (mounted), WEAK/UNVERIFIED enforcement
- **CONFIDENCE:** MEDIUM (mounted + route bodies read; verify-gate not fully traced — flagged for Agent 02/06)
- **BROKEN BOUNDARY:** a "constitutional" store with a DELETE endpoint and route-level no-validation intake; if VerificationAuthority is bypassable at the route, the "never stores unconstitutional artifacts" claim is naming without enforcement.
- **DEPENDENCIES:** Postgres; MigrationEngine
- **AFFECTS AGENTS:** Agent 02 (evidence), Agent 04 (projection vs canonical — is this store a projection or a source?)

### S3-11 — constitution/ laws are unenforced documentation

- **DOMAIN:** constitutional law · **COMPONENT:** `constitution/` (`EVENT_LAW.md`, `TRUTH_LAW.md`, `STATE_TRANSITION_LAW.md`, `TIME_LAW.md`, `GOVERNANCE.md`, `CONTINUITY.md`, `KNOWLEDGE.md`, `THESIS.md`, `authority_model.md`, `layer0_kernel.md`, `layering_law.md`, `mutation_law.md`, `replay_law.md`, `retrieval_law.md`, `source_of_truth_law.md`, `invariant_law.md`, `witness_law.md`, `terminology.md`, `ARCHIVE.md`, `CONSTITUTIONAL_PROOF.md`, `CONTINUITY.md`)
- **CLAIM:** (filenames) law.
- **EVIDENCE:** Zero code references to any `constitution/*.md` file (`grep -rln "constitution/EVENT_LAW\|constitution/TRUTH_LAW\|…" gateway ping-runtime runtime` → empty). No loader, no linter, no test asserts them. Enforcement lives in scattered JS (`EventGovernance`, `UnifiedEventRuntime`, trigger `trg_ping_events_append_only` per forensics). The HTTP `/constitution` endpoint (S3-04, S3-07) is the only runtime surface named "constitution" and it is broken in two independent ways.
- **CLASSIFICATION:** DORMANT as mechanism (documentation only) — classify, never delete; the laws may still be the right SPEC, but nothing executes them.
- **CONFIDENCE:** PROVEN
- **BROKEN BOUNDARY:** none (no false runtime claim) — but any convergence plan that says "the constitution enforces X" must point at the JS that enforces it, not the .md.
- **AFFECTS AGENTS:** all (law citations need code anchors)

### S3-12 — kernel/event_dispatcher.py (lone Python, dormant)

- **DOMAIN:** kernel · **COMPONENT:** `kernel/event_dispatcher.py`
- **CLAIM:** "Event Dispatcher — Maps event types to handlers and dispatches events for processing."
- **EVIDENCE:** Single Python file at `kernel/` top level; no importers in the live JS stack; the Python gateway stack is dormant per EVENT-FORENSICS §2D (api/main.py does not import the repositories). The live kernel is `runtime/kernel/*.js`.
- **CLASSIFICATION:** DORMANT
- **CONFIDENCE:** HIGH (importer search; Python-stack dormancy already proven)
- **AFFECTS AGENTS:** Agent 08 (dead-code classification)

### S3-13 — CanonicalizationService doc points at a nonexistent file

- **DOMAIN:** docs-in-code · **COMPONENT:** `ping-runtime/canonicalization/canonicalization_service.js` header
- **CLAIM:** "1. createCanonicalObject() (gateway/canonical_object.js — single envelope)"
- **EVIDENCE:** `gateway/canonical_object.js` does not exist (`ls` → No such file); the actual require is `./canonical_object` = `ping-runtime/canonicalization/canonical_object.js`. The consolidation claim itself verified (single `createCanonicalObject`, `canonical_object.js` header lists the ~15 consolidated implementations). Minor, but the "single envelope" pointer is stale.
- **CLASSIFICATION:** STALE COMMENT (no runtime effect)
- **CONFIDENCE:** PROVEN

### S3-14 — health.js unconditional-healthy fallback (dormant FAKE health)

- **DOMAIN:** health · **COMPONENT:** `gateway/routes/health.js`
- **CLAIM:** "Delegates to healthAuthority — single source of truth for system health."
- **EVIDENCE:** If `healthAuthority.getHealth` is unavailable, the route returns `{ status: 'healthy', … note: 'healthAuthority not available' }` with HTTP 200 — a hardcoded healthy. In the live composition `healthAuthority` IS wired (`gateway_runtime.js:43,678`, health checks registered `:726-750` including `canonicalization`), so the fallback is dormant. Same defect class as the qdrant/vault healthcheck misconfigs (REACHABILITY §5C): health signals that can report healthy while dark.
- **CLASSIFICATION:** DORMANT defect (mechanism present, not exercised live)
- **CONFIDENCE:** PROVEN
- **AFFECTS AGENTS:** Agent 12 (observability)

---

## Trace summary (DEFINED → TESTED) for the block's load-bearing mechanisms

| Mechanism | D | I | C | Init | Start | Reg | Called | Persist | ReadBack | Restart | Tested |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CanonicalizationService | ✓ | ✓ gr:98 | ✓ gr:447 | n/a | n/a | ✓ gr:664 | ✓ ingest + emitters | ✓ via emit | ✓ | ✓ (33h uptime) | ✗ none found |
| UnifiedEventRuntime | ✓ | ✓ gr:71 | ✓ gr:433 | ✓ gr:439 | n/a | ✓ gr:659 | ✓ | ✓ ping_events | ✓ | ✓ | ✓ (forensics live capture; no unit tests found) |
| EventBridge | ✓ | ✓ gr:72 | ✓ gr:462 | ✓ gr:468 | ✓ gr:469 | ✓ gr:661 | ✓ (5s poll) | ✓ re-emit | ✓ | ✓ | ✗ |
| EventReadAuthority | ✓ | ✓ gr:11 | ✓ gr:382 | n/a | n/a | ✓ gr:682 | ✓ + SQL fallbacks | n/a (read) | ✓ | ✓ | ✗ |
| CanonicalEventEnvelope | ✓ | ✓ gr:15 | ✓ (envelope svc) | ✓ initialize() | n/a | ✓ gr:687 | ✓ POST /canonical-events | ✓ canonical_events | ✓ | ✓ | ✗ |
| kernel IdentityAuthority | ✓ | ✓ (shim) | singleton | n/a | n/a | n/a | ✓ canonical_object | ✓ via envelope | ✓ | ✓ | ~ (deprecated-path test only, REACHABILITY C3) |
| dist IdentityAuthority | ✓ (TS) | ✓ adapters | static | n/a | n/a | n/a | ✓ identities/social adapter | ✓ via emit | ✓ | ✓ | ✓ (identity-authority.test.ts exists in src) |
| EventGovernance | ✓ | ✓ gr:50 | ✓ | ✓ loads policies | n/a | ✓ gr:777 | ✓ every emit | n/a | n/a | ✓ | ✗ |
| RepositoryStore | ✓ | ✓ gr:12 | ✓ | ✓ migrations | n/a | ✓ gr:685 | ✓ /api/v1/repository | ✓ repo tables | ✓ | ✓ | ✗ |
| approval_authority | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ — DORMANT |
| bootstrap/index DI | ✓ | ✗ (only removed main.js) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ — DORMANT |
| registry.yaml | ✓ | ✗ (generators only) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ — DORMANT |

(gr = gateway/bootstrap/gateway_runtime.js)

---

## Proposed diffs (PROPOSE ONLY — not applied)

### P-S3-A — Route POST /events through CanonicalizationService (closes S3-01 bypass)

- **WHY:** Three HTTP ingest paths bypass the declared canonical boundary; namespace per-source authorization exists only in the service. The spine's governance checks format but not source→namespace binding.
- **EVIDENCE:** S3-01 (routes/events.js:97,120 direct `eventRuntime.emit`; routes/identities.js:178; routes/canonical_events.js:22).
- **MINIMUM CHANGE:** In `gateway/routes/events.js` `createEventRoutes`, accept `canonicalizationService` as a 4th constructor arg (wired at `gateway_runtime.js:682`); replace the two direct `eventRuntime.emit(...)` calls with `canonicalizationService.canonicalizeAndEmit({ source:'api', eventType, payload, namespace: <tenant-derived or default>, logicalId, options:{metadata} })`; keep the BFF adapter normalization as a pre-step (adapter returns `{eventType, eventData, namespace?}` and the service call uses it). `POST /identities`: route through the service with `source:'identity-authority'`, keeping idempotency via the service's `logical_id` (identityId). `POST /canonical-events`: keep the separate table (bridge converges it) BUT route the envelope construction through `createCanonicalObject` so `canonical_hash` semantics are uniform — or document the table as a legacy intake with a sunset. Do NOT create a second boundary service.
- **TEST:** (1) `POST /ingest` and `POST /events` with identical body produce the same `event_id` (logical-identity convergence); (2) malformed namespace → 400 on both routes; (3) source claiming `tenant::other` without mapping → rejected on both; (4) existing `ping_events` rows unchanged (no re-mint).
- **RESULT (predicted):** single ingest authority; the 2026-09-16/17 live-capture behavior (authorizeNamespace on /events) becomes true in code. **BLOCKED first on B1** (which /events bytes run in Oracle) per GLOBAL-AUTHORITY-MAP CP-1 — do not converge route copies before the deployed-bytes question is closed.

### P-S3-B — Converge the two live IdentityAuthorities on one serializer (closes S3-03)

- **WHY:** Two live authorities mint the same `type_hash16` format with divergent undefined/array semantics; comments claim "ONE IdentityAuthority".
- **EVIDENCE:** S3-03 (kernel `CanonicalBytes.serialize` undefined→`"undefined"` bytes + comma-less arrays vs dist `canonicalizeObject` undefined→null + JSON.stringify).
- **MINIMUM CHANGE:** Adopt ONE serializer (recommendation: the dist `canonicalizeObject`+`JSON.stringify` semantics — JSON-compatible, no ambiguous array encoding — but the decision belongs to Agent 05's identity-hash law). Fix `CanonicalBytes.serialize` to (a) map `undefined`→`null`, (b) separate array elements with `,` (or length-prefix). Keep both IdentityAuthority entry points as thin adapters over the single serializer during migration; add the digest-stability migration analysis (persisted `type_hash16` IDs minted under old semantics must be rebound explicitly, per GLOBAL-AUTHORITY-MAP CP-2).
- **TEST:** (1) property test: `serialize` is injective over the JSON value domain (no two distinct values share bytes — the current comma-less arrays fail this); (2) `generateId`/`generateFromCanonicalHash` produce identical IDs for identical contexts across both authorities; (3) replay determinism test re-run against the kernel path (REACHABILITY C3).
- **RESULT (predicted):** "ONE IdentityAuthority" becomes true; removes the latent ID-collision class.

### P-S3-C — Replace computeCanonicalHash with the canonical serializer (closes S3-04)

- **WHY:** The function silently drops nested content; it backs the "single source of constitutional truth" endpoint and envelope hashing.
- **EVIDENCE:** S3-04 (constitutional_validation.js:348; call sites constitution.js:100, canonical_event_envelope.js:23).
- **MINIMUM CHANGE:** Reimplement `computeCanonicalHash(obj)` as `sha256(CanonicalBytes.serialize(obj))` (or the Agent-05-chosen canonical bytes) — one line, no call-site changes. Add a regression test with nested objects whose keys are absent at top level (currently collides; must differ after fix). Audit persisted hashes that were computed with the lossy version (contract hashes in `/constitution` responses are recomputed per-request — safe; any STORED `computeCanonicalHash` outputs need rebinding analysis).
- **TEST:** `computeCanonicalHash({a:1, b:{x:1}}) !== computeCanonicalHash({a:1, b:{y:2}})`; `GET /constitution` `platformHash` stable across identical states and sensitive to nested changes.
- **RESULT (predicted):** `/constitution`'s determinism claim becomes honest.

### P-S3-D — Fix GET /identities ordering (closes S3-05)

- **WHY:** `ORDER BY sequence` references a nonexistent column; "canonical acceptance order" is unimplementable as written.
- **EVIDENCE:** S3-05.
- **MINIMUM CHANGE (choose one, do not do both):** (i) change the query to `ORDER BY timestamp ASC, event_id ASC` (matches the journal's actual ordering authority — GLOBAL-AUTHORITY-MAP row 4); or (ii) add a real sequence via schema evolution owned by Agent 13. Recommended: (i) — one-line, no migration, honest about the journal's ordering semantics.
- **TEST:** `GET /identities` returns 200 with rows in timestamp order on a code-created schema.
- **RESULT (predicted):** the identities read path works; no fake "canonical acceptance order".

### P-S3-E — Classify (do not silently delete) the dormant composition roots + approval authority (closes S3-07, S3-08)

- **WHY:** Dormant second roots (`bootstrap/index.js`, `constitutional_runtime.js`) and an unwired `approval_authority.js` are resurrection hazards — a future patch could wire the wrong root or assume approval exists.
- **EVIDENCE:** S3-07, S3-08.
- **MINIMUM CHANGE:** Per STANDING-INVARIANTS.md #6 (classify, don't delete): add a `DORMANT.md` marker or header comment to each file stating "NOT in the live composition root (server.js → gateway_runtime.js); do not wire without coordinator approval; see S3-07/S3-08". For `approval_authority.js`: either wire it into the convergence patch pipeline (Agent 08's call) or mark it explicitly unwired so no one assumes patches are approved.
- **TEST:** `grep` audit: no live require chain reaches the marked files (CI-checkable).
- **RESULT (predicted):** the dormant inventory is explicit; resurrection requires a deliberate decision.

---

## Summary for the parent

S3 audited the core block (`gateway/`, `authorities/`, `constitution/`, `kernel/`) at `/home/nolan/ping` @ `refactor/runtime-authority-convergence` (`cc6856c3b`), read-only, no commits. The live composition root is `gateway/server.js` → `gateway/bootstrap/gateway_runtime.js`; every classification is traced DEFINED→TESTED against it.

**Sovereignty verdicts:**
- `UnifiedEventRuntime → ping_events`: sovereign, PROVEN (corroborates EVENT-FORENSICS; no drift in this branch — the `agent_memory_authority` writers claim re-verified live at `:617-731`).
- `CanonicalizationService`: live and correctly thin, but PARTIAL — `POST /events`, `POST /canonical-events`, `POST /identities` bypass it. Its "every producer" claim is false.
- Identity: CONFLICTING — two live `IdentityAuthority` implementations mint the same `type_hash16` format via divergent serializers (kernel `undefined`→`"undefined"` bytes + comma-less arrays vs dist `undefined`→`null` + JSON), while both claim "ONE IdentityAuthority". Plus a live UUIDv5 scheme in `CanonicalEventEnvelope` and a dead TS interface.
- Hashing: `computeCanonicalHash` (live, used by `GET /constitution` + envelope) silently drops nested content — FAKE verification.
- `authorities/registry.yaml`: aspirational, loaded only by generators — never cite as implementation evidence.
- `constitution/`: unenforced documentation (zero code references); the only runtime "constitution" surface (`GET /constitution`) is broken twice (lossy hash + dormant wiring module).
- Dormant but present: second DI composition root (`bootstrap/index.js`), `constitutional_runtime.js`, `approval_authority.js` (code-patch approval has no live gate), `kernel/event_dispatcher.py`, `runtime/kernel/identity/identity-authority.ts` + `runtime/kernel/events/event-authority-interface.ts` (abandoned contracts), `AppendOrchestrator` (Agent 01's case).
- `GET /identities` orders by a `sequence` column that exists in no code-side DDL — broken read path on code-created schemas.
- Shims done right (not duplicates): `ping-runtime/authorities/identity_authority.js`, `constitutional_time_authority.js`, `ping-runtime/events/event_read_authority.js` (PATCH_002/003/004) are pure delegations to `runtime/kernel/`. `RuntimeIdentityAuthority`/`ReplayIdentityAuthority` are defensible specializations, not duplicates.
- `POST /events` direct-emit still gets namespace-FORMAT validation at the governance layer (same regex) — the bypass is about per-source authorization, canonical envelope, and logical identity, not format.
- Business emitters DO honor the boundary (via the duck-typed `emit()`), and `EventBridge` convergence is live — the secondary-journal architecture is as forensics described.

**Proposed diffs:** P-S3-A (route /events through the service — BLOCKED on B1 deployed-bytes first), P-S3-B (one serializer for both IdentityAuthorities + fix comma-less arrays), P-S3-C (fix computeCanonicalHash), P-S3-D (fix /identities ordering), P-S3-E (classify dormant roots + approval authority). All PROPOSE ONLY, none applied.

**Confidence:** PROVEN for S3-01 through S3-09, S3-11, S3-13, S3-14 (source-traced); MEDIUM for S3-10 (verify-gate not fully traced); code-proven with a live-DB open item for S3-05's deployed state.

## Next adjacent gap I see

**The `/constitution` endpoint as a trust surface.** It is the fleet's advertised "single source of constitutional truth" and every fleet component is told to query it on startup — yet it (a) hashes with the lossy `computeCanonicalHash`, (b) builds its dependency graph from the dormant DI wiring module rather than the live `GatewayRuntime`, and (c) has a hardcoded-healthy fallback cousin in `/health`. If any convergence work depends on fleet handshake truth (Agent 12 observability, Agent 08 patch pipeline), that surface needs its own audit: what each `publishContract()` actually attests, and whether the reported graph matches the running composition. Second: **the `VerificationAuthority.verify`-before-`append` claim on `RepositoryStore`** (S3-10) was not fully traced — if the route can bypass it, the fourth persistence surface is an unguarded intake.
