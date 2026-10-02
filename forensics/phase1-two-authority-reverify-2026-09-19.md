# PHASE 1: Two-Authority Re-verification (2026-09-19)

Cross-agent forensic re-trace of the two effective event paths by ACTUAL REACHABLE CALL SITES, not class definitions. Read-only everywhere: no source edits, no commits, no DB writes, no container restarts, no secret values read (env var names only, none needed).

- Primary source: /home/nolan/worktrees/constitutional-convergence @ 98ef51c9c (git rev-parse verified 2026-09-19)
- Live cross-check: ping-gateway container (image ping-gateway:devin-boundary2), read-only via `docker exec ... cat/grep/sha256sum/sed`. Container /app source SHA is unrecoverable (no git metadata in image); file-level comparison used instead.
- Reachability root: gateway/server.js -> gateway/bootstrap/gateway_runtime.js require closure.

Evidence states: SOURCE_VERIFIED (read the code), REACHABILITY_VERIFIED (traced from the gateway closure), LIVE_VERIFIED (observed in the running container /app), FALSIFIED (claim contradicted by evidence), BLOCKED (could not be established read-only, with reason).

No em dashes are used in this document.

---

## PATH A: UnifiedEventRuntime -> ping_events

### A1. The writer choke point

Single SQL writer to ping_events in the worktree: exactly one `INSERT INTO ping_events` outside tests/evals.

| Component | File:line | Reachable? | Role | Evidence |
|---|---|---|---|---|
| UnifiedEventRuntime class | ping-runtime/events/unified_event_runtime.js:23 | REACHABILITY_VERIFIED | Sole writer class | SOURCE_VERIFIED |
| Instantiation | gateway/bootstrap/gateway_runtime.js:438 | REACHABILITY_VERIFIED | `new UnifiedEventRuntime({pool, eventValidator, eventGovernance, integrationManager, legacyIngressCapability})`, then `initialize()` | SOURCE_VERIFIED |
| emit() | unified_event_runtime.js:122 | REACHABILITY_VERIFIED | The single emit path; 8 steps | SOURCE_VERIFIED |
| INSERT | unified_event_runtime.js:245 | REACHABILITY_VERIFIED | `INSERT INTO ping_events (...) VALUES (...) ON CONFLICT (event_id) DO NOTHING RETURNING sequence` | SOURCE_VERIFIED |
| initialize() DDL | unified_event_runtime.js:55-115 | REACHABILITY_VERIFIED | Creates ping_events, the PG sequence, backfill, unique index | SOURCE_VERIFIED |

### A2. Reachable emit() call sites (worktree, from the gateway closure)

| # | Call site | File:line | Reachable? | What it emits | Evidence |
|---|---|---|---|---|---|
| 1 | POST /events route | gateway/routes/events.js:79 | REACHABILITY_VERIFIED (mounted gateway_runtime.js:692) | HTTP ingress, source='api', metadata {aggregate_id, aggregate_type} | SOURCE_VERIFIED |
| 2 | Business emitters | ping-runtime/business/business_emitters.js:14-93 | REACHABILITY_VERIFIED (instantiated gateway_runtime.js:578-579 via CanonicalizationService) | REVIEW_RECEIVED/RESPONDED, CUSTOMER_CREATED/UPDATED, LEAD_CREATED/CONVERTED, PROJECT_CREATED/UPDATED/COMPLETED, ESTIMATE_CREATED/SENT/ACCEPTED, INVOICE_CREATED/SENT/PAID, EMAIL_SENT/RECEIVED, SMS_SENT, GOOGLE_REVIEW_RECEIVED, GITHUB_COMMIT_SYNCED, SYSTEM_HEALTH_CHECK, WORKER_COMPLETED | SOURCE_VERIFIED |
| 3 | One-time seed | gateway_runtime.js:642 -> _seedBusinessEvents:847 | REACHABILITY_VERIFIED (runs only when `SELECT COUNT(*) FROM ping_events` = 0) | Seed customers/leads/projects/estimates/reviews/invoices via emitter set #2 | SOURCE_VERIFIED |
| 4 | BaseWorker._emit | ping-runtime/workers/canonical_workers.js:72 | REACHABILITY_VERIFIED (8 workers registered via registerCanonicalWorkers, gateway_runtime.js:525) | Downstream pipeline events: OBSERVATION_CREATED, CLAIM_CREATED, CLASSIFICATION_CREATED, RECOMMENDATION_CREATED, PROJECTION_CREATED, REPLAY_VERIFY/REPLAY_COMPLETED, WITNESS_CREATED, LINEAGE_CREATED; namespace + causation/correlation inheritance | SOURCE_VERIFIED |
| 5 | LegacyIngressAdapter._convergeRow | ping-runtime/events/legacy_ingress_adapter.js:296 (phase 1), :310 (phase 2) | REACHABILITY_VERIFIED (instantiated + started gateway_runtime.js:467-477) | Bridge re-emission of canonical_events rows (see Bridge section) | SOURCE_VERIFIED |
| 6 | IntelligenceWorker._emit | ping-runtime/workers/intelligence_worker.js:53 | FALSIFIED as reachable | Registered with eventTypes:[] and explicitly skipped (canonical_workers.js:937-947); structurally dormant, processes zero events on the live path | SOURCE_VERIFIED |

No other non-test `.emit(` call on the runtime exists in the closure. `gateway/event_port.js` `this.emit` calls are a different class (EventPort). `gateway/acquisition_authority.js:157` uses an injected `_eventBus` and the file is not in the gateway closure (no require from server.js/gateway_runtime.js).

### A3. Readers of ping_events (worktree, reachable)

| Reader | File:line | Reachable? | How it reads | Evidence |
|---|---|---|---|---|
| GET /events, /recent, /stats, /:stream | gateway/routes/events.js:14-66 | REACHABILITY_VERIFIED | EventReadAuthority first (which reads repository_events, see note), then FALLBACK direct pool queries against ping_events | SOURCE_VERIFIED |
| Causal traversal endpoints | gateway/routes/events.js:117,125,132,139 | REACHABILITY_VERIFIED | runtime.getChildren / getDescendants / getAncestors / getCorrelationGroup (unified_event_runtime.js:427,448,480,511) | SOURCE_VERIFIED |
| runtime.query / runtime.replay | unified_event_runtime.js:321,375 | Capability exists; replay() has ZERO production callers | query() has no non-test callers found either; replay() is available-but-unwired | SOURCE_VERIFIED |
| Mission control widgets | gateway/routes/mission_control.js:33 | REACHABILITY_VERIFIED (mounted; route file required gateway_runtime.js:96) | Direct `SELECT COUNT(*) ... FROM ping_events` | SOURCE_VERIFIED |
| EventToMissionBridge | ping-runtime/orchestration/event_to_mission_bridge.js:95-105 | REACHABILITY_VERIFIED (gateway_runtime.js:586-590, started) | In-memory `runtime.on(eventType)` subscriptions, NOT SQL polling; creates missions in MissionRuntime per EVENT_MISSION_MAP | SOURCE_VERIFIED |
| MissionRuntime | ping-runtime/orchestration/mission_runtime.js:403,417 | REACHABILITY_VERIFIED | Reads correlation chain from ping_events by event_id / correlation_id | SOURCE_VERIFIED |
| WitnessWorker | ping-runtime/workers/canonical_workers.js:501-515 | REACHABILITY_VERIFIED (registered for REPLAY_COMPLETED) | `_readCanonicalReplayEvent`: `SELECT ... FROM ping_events WHERE event_id = $1`; attests only if row is REPLAY_COMPLETED; envelope claims untrusted | SOURCE_VERIFIED |
| EvidenceAuthority | ping-runtime/evidence/evidence_authority.js:54,95 | REACHABILITY_VERIFIED (gateway_runtime.js:545) | Resolves supporting events by event_id; traces Qdrant hits back to ping_events rows | SOURCE_VERIFIED |
| HybridSearch | ping-runtime/search/hybrid_search.js:7 | REACHABILITY_VERIFIED (gateway_runtime.js:548) | Via EvidenceAuthority | SOURCE_VERIFIED |
| EmbeddingService | ping-runtime/embeddings/embedding_service.js:115-120 | REACHABILITY_VERIFIED (subscribed gateway_runtime.js:513) | In-memory `subscribe(unifiedEventRuntime)` via on(); projects to Qdrant | SOURCE_VERIFIED |
| orca control-loop / measurements | orca/control-loop/orca_control_loop.js, orca/measurements/measure.js | NOT reachable from gateway closure | Reads ping_events, but no require path from server.js/gateway_runtime.js | SOURCE_VERIFIED (negative) |

Note: EventReadAuthority (runtime/kernel/event_read_authority.js:43+) reads from `repository_events`, not ping_events. The /events route only reaches ping_events through its pool fallback when the read authority returns empty. This is a legacy read path pointed at the wrong table; the ping_events reads that matter are the fallbacks, the traversal methods, and the direct SQL readers above.

### A4. Identity, ordering, and ownership (Path A)

- ID generation: `IdentityAuthority.generateId('event', identityData)` (unified_event_runtime.js:207). Implementation: runtime/kernel/authorities/identity_authority.js:73. Preimage = `{ type:'event', version:'2.0.0', identity_version:'2.0.0', event_type, source, namespace, [logical_id|payload] }`. CanonicalBytes.serialize -> RFC-8785 CanonicalJson (gateway/replay/kernel/canonical_json.js, via runtime/kernel/authorities/canonical_authority.js:37-60) -> CanonicalAuthority.hashBytes -> `event_` + first 16 hex chars. New IDs are `event_`-prefixed (self-identifying era); Era H 64-hex IDs never recomputed. F7/D1 value-domain boundary throws BEFORE any ID is minted (rejected events get no ID, no persistence, no acceptance claim). All SOURCE_VERIFIED.
- Timestamp ownership: `constitutionalTimeAuthority.nowAsISOString()` assigned by the runtime at emit step 5 (unified_event_runtime.js:229); implementation runtime/kernel/authorities/constitutional_time_authority.js:122. Timestamp is deliberately EXCLUDED from the identity preimage (wall-clock is observation metadata). SOURCE_VERIFIED.
- Namespace ownership: runtime resolves the `core::system` default BEFORE identity (unified_event_runtime.js:128, C-007 fix); governance validates the canonical privacy boundary `core::<name> | tenant::<id>` at the single choke point (step 3); CanonicalizationService resolves per-source namespaces pre-persistence (review-authority etc -> tenant::hpp; ping-runtime/canonicalization/canonicalization_service.js:54-62). SOURCE_VERIFIED.
- Principal/originator: the `source` string is producer-claimed, not authenticated (F3 frozen finding, noted in legacy_ingress_adapter.js:272). SOURCE_VERIFIED.
- Causation/correlation: options.causation_id -> metadata.causation_id; options.correlation_id -> metadata.correlation_id, defaulting to the event's own eventId (unified_event_runtime.js:234-236). Indexed expression indexes on both (DDL lines 88-89). SOURCE_VERIFIED.
- Sequence/order: PostgreSQL sequence `ping_events_sequence_seq`, column DEFAULT nextval (DDL lines 97-100); INSERT never supplies it. Certified contract (P0): allocation position only; NOT gapless, NOT commit order, NOT wall-clock, NOT causal; excluded from identity preimage and canonical hash. Backfill classified LEGACY BACKFILL ORDER. No MAX()+1 anywhere in the canonical path. SOURCE_VERIFIED.
- Processed state: `processed` boolean, default FALSE; emit() never sets TRUE. Marked by EventReadAuthority/routes (/events/processed, /events/failed, /events/unprocessed) and by the bridge adapter. SOURCE_VERIFIED.
- Hashing: CanonicalAuthority.hashBytes over RFC-8785 canonical bytes (see ID generation). The envelope path uses a different hash (SHA-1 UUID v5); the two paths do not share a hash function. SOURCE_VERIFIED.
- Mission creation: EventToMissionBridge only. No mission is created from canonical_events except via convergence into ping_events first. EVENT_MISSION_MAP (event_to_mission_bridge.js:25-75) covers business types (CUSTOMER_*, LEAD_*, PROJECT_*, ESTIMATE_*, INVOICE_*, REVIEW_*, EMAIL_*, SMS_*, GOOGLE_REVIEW_RECEIVED) plus pipeline types (CLAIM_CREATED through WITNESS_CREATED) and the W-1A REPLAY_COMPLETED -> WITNESS_ATTEST trigger. SOURCE_VERIFIED, REACHABILITY_VERIFIED.
- Replay consumption: the certified `replay({afterSequence, limit, consumer})` reader (unified_event_runtime.js:375) has no production callers; every `.replay(` match in gateway/ping-runtime is the DeterministicReplayEngine kernel API, not this reader. Replay-as-certified-capability is available but unconsumed on the live path. SOURCE_VERIFIED.
- Witness consumption: WitnessWorker authenticates against the canonical ping_events row (canonical_workers.js:501-515). No witness path reads canonical_events. SOURCE_VERIFIED.
- Lineage consumption: runtime causal traversal methods + mission_runtime correlation reads; all against ping_events. SOURCE_VERIFIED.
- Projection consumption: ProjectionWorker + EmbeddingService project dispatched ping_events rows to Qdrant; EvidenceAuthority verifies Qdrant hits back against ping_events. SOURCE_VERIFIED.

---

## PATH B: CanonicalEventEnvelope -> canonical_events

### B1. The writer choke point

Single SQL writer to canonical_events in the worktree: exactly one `INSERT INTO canonical_events` outside tests.

| Component | File:line | Reachable? | Role | Evidence |
|---|---|---|---|---|
| CanonicalEventEnvelope class | gateway/canonical_event_envelope.js:27 | REACHABILITY_VERIFIED | Sole writer class | SOURCE_VERIFIED |
| Instantiation | gateway/bootstrap/gateway_runtime.js:479 | REACHABILITY_VERIFIED | `new CanonicalEventEnvelope(this._storage, { repoRoot })`, then `initialize()` (runs database/canonical_events.sql) | SOURCE_VERIFIED |
| executeEmitEvent() | canonical_event_envelope.js:126 | REACHABILITY_VERIFIED | The single emit path | SOURCE_VERIFIED |
| INSERT | canonical_event_envelope.js:174 | REACHABILITY_VERIFIED | `INSERT INTO canonical_events (...) VALUES (...) ON CONFLICT (tenant_id, sequence) DO NOTHING` | SOURCE_VERIFIED |

### B2. Reachable executeEmitEvent() call sites (worktree, from the gateway closure)

| # | Call site | File:line | Reachable? | Event types emitted | Evidence |
|---|---|---|---|---|---|
| 1 | POST /canonical-events route | gateway/routes/canonical_events.js:19 | REACHABILITY_VERIFIED (mounted gateway_runtime.js:696; 503 fallback at :707) | Any producer-supplied type (HTTP ingress; requires tenant_id, event_type, source, actor, payload) | SOURCE_VERIFIED |
| 2 | ReviewAuthority | ping-runtime/business/review_authority.js:78 | REACHABILITY_VERIFIED (instantiated gateway_runtime.js:412) | `review.flagged` (source 'review-authority', actor 'system') | SOURCE_VERIFIED |
| 3 | ProjectAuthority | ping-runtime/business/project_authority.js:150,197,301 | REACHABILITY_VERIFIED (instantiated gateway_runtime.js:426) | `project.created`, `project.updated`, `project.artifact_added` (source 'project-authority', actor 'system') | SOURCE_VERIFIED |
| 4 | CustomerAuthority._emitEvent | ping-runtime/business/customer_authority.js:153,204,253,413 via :541 | REACHABILITY_VERIFIED (instantiated gateway_runtime.js:420) | `CUSTOMER_IMPORTED`, `CUSTOMER_EMAIL_SYNCED`, `CUSTOMER_CALENDAR_SYNCED`, `CUSTOMER_UPDATED`, `CUSTOMER_CREATED` (source 'customer-authority', actor 'system') | SOURCE_VERIFIED |
| 5 | AIWorkspaceAuthority._persist | ping-runtime/business/ai_workspace_authority.js:88 (called from :115,136,155,175) | WIRED but FALSIFIED as an effective writer | Passes legacy-shaped params (`aggregateId`, `aggregateType`, `eventData`, `authority`) instead of the required (`source`, `actor`, `payload`). `executeValidateEvent` (canonical_event_envelope.js:196-213) requires source, actor, payload; the call throws `Invalid event: source required, actor required, payload required` on every invocation. It can never successfully write. | SOURCE_VERIFIED |

Note the event_type style split: the HPP authorities use producer-controlled, unbounded types (`review.flagged`, `project.created`, lowercase dotted), while the customer authority uses UPPER_SNAKE (`CUSTOMER_CREATED`). This matches the MC-1 note that canonical_events.event_type is producer-controlled and unbounded, which is why no registry pre-registration is possible and the LegacyIngressAdapter needs its documented compatibility exception.

### B3. Readers of canonical_events (worktree, reachable)

| Reader | File:line | Reachable? | How it reads | Evidence |
|---|---|---|---|---|
| GET /canonical-events, /stats, /unprocessed | gateway/routes/canonical_events.js:42,58,64 | REACHABILITY_VERIFIED | executeQueryEvents (canonical_event_envelope.js:234, ORDER BY tenant_id, sequence ASC), executeGetStats (:271), executeGetUnprocessed (:327) | SOURCE_VERIFIED |
| LegacyIngressAdapter._selectWorkRows | ping-runtime/events/legacy_ingress_adapter.js:201 | REACHABILITY_VERIFIED | Polls `WHERE processed IS DISTINCT FROM TRUE AND disposition <> 'REJECTED' ORDER BY created_at`, batch 50, every 5000ms | SOURCE_VERIFIED |
| replay_canonicalizer / replay_validator authorities | gateway/replay_canonicalizer_authority.js:63, gateway/replay_validator_authority.js:75,134 | NOT reachable from gateway closure | Only referrer is gateway/replay_rule_set.js, itself only required by gateway/constitutional_classifier.js and gateway/replay_kernel_audit.js, neither of which is required from the closure | SOURCE_VERIFIED (negative) |

### B4. Identity, ordering, and ownership (Path B)

- ID generation: `generateEventId(tenantId, eventType, timestamp, sequence)` (canonical_event_envelope.js:72). UUID v5: DNS namespace `6ba7b810-9dad-11d1-80b4-00c04fd430c8`, name = `${tenantId}:${eventType}:${timestamp}:${sequence}`, SHA-1, version/variant bits set. Timestamp IS in the preimage (unlike Path A, where it is deliberately excluded). SOURCE_VERIFIED.
- Ordering: `getNextSequence` (canonical_event_envelope.js:100) = `SELECT COALESCE(MAX(sequence),0)+1 ... WHERE tenant_id = $1`. Per-tenant MAX()+1, no PG sequence, no advisory lock; concurrent writers can collide (absorbed by ON CONFLICT DO NOTHING, which silently drops the later row). This is the exact pattern the P0 certification forbids on the canonical path. SOURCE_VERIFIED.
- Timestamp ownership: `constitutionalTimeAuthority.nowAsISOString()` at emit (canonical_event_envelope.js:139), same authority as Path A. SOURCE_VERIFIED.
- Namespace/tenant ownership: `tenant_id` column is the tenant boundary; validation requires it; all reads filter by it; contract claims tenant isolation (canonical_event_envelope.js:340-368 publishContract). SOURCE_VERIFIED.
- Principal/originator: `actor` column, producer-claimed ('system' in all four authorities), not verified. SOURCE_VERIFIED.
- Causation/correlation: `causation_id`, `correlation_id` top-level columns (not metadata), passed through nullable. SOURCE_VERIFIED.
- Processed state: `processed` boolean + `processed_at`, `worker`, `retries`, `last_error` columns; the adapter and the old bridge both use them as the progress primitive. SOURCE_VERIFIED.
- Validation: `executeValidateEvent` (canonical_event_envelope.js:196) requires event_id, event_type, event_version, tenant_id, timestamp, sequence, source, actor, payload; throws on failure. Runs BEFORE the INSERT (line 167). SOURCE_VERIFIED.
- Mission creation from canonical_events: NONE directly. The only path to missions is convergence into ping_events (bridge) then EventToMissionBridge. FALSIFIED that any direct canonical_events -> mission path exists; no such code found. SOURCE_VERIFIED (negative).
- Replay/witness/lineage/projection consumption of canonical_events: NONE on the reachable path. All four consume ping_events. SOURCE_VERIFIED (negative).

### B5. Path B reads served

The envelope serves: filtered event queries (tenant/eventType/correlationId/time range, ordered by tenant_id, sequence), per-tenant stats (total, types, first/last, unprocessed count), unprocessed queues, and mark-processed/mark-failed transitions. These are the legacy ingress surface's own operational reads plus the adapter's work-selection poll. SOURCE_VERIFIED.

---

## BRIDGE TRACE: canonical_events -> ping_events

### Worktree: LegacyIngressAdapter (the wired convergence path)

| Item | File:line | Evidence |
|---|---|---|
| Class + classification | ping-runtime/events/legacy_ingress_adapter.js:1-110 | ADAPTER; canonical_events = UPSTREAM INGRESS STORE / LEGACY INGRESS SURFACE, NON-CANONICAL UNTIL CONVERGED; supersedes EventBridge (PRESERVED_INACTIVE) | SOURCE_VERIFIED |
| Wiring | gateway/bootstrap/gateway_runtime.js:467-477 | Instantiated with pool, eventRuntime, pollIntervalMs 5000, batchSize 50, legacyIngressCapability; `initialize()` then `start()` | REACHABILITY_VERIFIED |
| Work selection | legacy_ingress_adapter.js:201-215 | No cursor; selects by per-row state (`processed IS DISTINCT FROM TRUE`, disposition <> 'REJECTED'), ORDER BY created_at | SOURCE_VERIFIED |
| Phase 1 emit | legacy_ingress_adapter.js:296-303 | `emit(row.event_type, row.source || 'canonical_events', payload, baseOptions)`; full validator + governance, no exception | SOURCE_VERIFIED |
| Phase 2 emit | legacy_ingress_adapter.js:310-318 | Only after UNKNOWN_EVENT_TYPE; presents `legacyIngressCapability` (object-identity compared) + `_skipGovernance`; excepts ONLY registry-membership and registry-derived governance checks | SOURCE_VERIFIED |
| Namespace resolution | legacy_ingress_adapter.js:341-349 | `tenant::<tenant_id>`; malformed tenant_id -> durable REJECTED, never collapsed to core::system | SOURCE_VERIFIED |
| Mark accepted | legacy_ingress_adapter.js:356-377 | `UPDATE canonical_events SET processed=TRUE, processed_at=NOW(), worker='legacy_ingress_adapter', metadata \|= {legacy_ingress:{disposition:'ACCEPTED', canonical_event_id, exception, accepted_at}}` | SOURCE_VERIFIED |
| Mark rejected | legacy_ingress_adapter.js:397-423 | processed stays FALSE; disposition REJECTED in metadata.legacy_ingress; never confused with acceptance | SOURCE_VERIFIED |

Remint field mapping (worktree adapter, _convergeRow lines 259-294):

| canonical_events field | Becomes in ping_events | Preserved? |
|---|---|---|
| event_id (UUID v5) | payload._canonical_event_id + metadata.original_event_id | As provenance only; NOT the identity (new event_<16hex> minted) |
| event_type | event_type (passed through) | Yes, verbatim |
| source | source (row.source, fallback 'canonical_events') | Yes, true origin preserved |
| tenant_id | namespace = tenant::<tenant_id>; payload._tenant_id; metadata.tenant_id | Yes, as namespace + provenance |
| actor | payload._actor; metadata.actor (claimed, NOT verified) | As provenance only |
| timestamp | metadata.original_timestamp | As provenance only; the ping_events timestamp is RE-assigned by emit (nowAsISOString) |
| sequence (per-tenant) | metadata.original_sequence | As provenance only |
| causation_id / correlation_id | options.causation_id / correlation_id (passed through) | Yes |
| payload | payload (merged with _canonical_event_id, _tenant_id, _actor keys) | Yes, plus ingress identity keys |
| metadata | metadata.original_metadata | As provenance only |
| event_version | metadata.event_version | As provenance only |
| processed/retries/last_error | Not carried; per-row state stays on the canonical_events row | No (by design) |

Lost in the remint: the original UUID v5 as an identifier (replaced by the V2 event_<16hex>), the original timestamp as the event timestamp, the per-tenant sequence position (replaced by the PG-allocated global position), and any claim that the row was "processed" upstream. All preserved values above are SOURCE_VERIFIED from legacy_ingress_adapter.js:259-294.

### Live container: old EventBridge (the running convergence path)

| Item | File:line (container /app) | Evidence |
|---|---|---|
| Class | /app/ping-runtime/events/event_bridge.js | Polls repository_events + canonical_events, re-emits through UnifiedEventRuntime into ping_events | LIVE_VERIFIED |
| Wiring | /app/gateway/bootstrap/gateway_runtime.js:73 (require), :542-551 | `new EventBridge({pool, eventRuntime, pollIntervalMs:5000, batchSize:50})`, `initialize()`, `start()` | LIVE_VERIFIED |
| Worktree status of this class | ping-runtime/events/event_bridge.js:1-24 | CLASSIFICATION: PRESERVED_INACTIVE (MC-1); retired, not wired in worktree | SOURCE_VERIFIED |

Live old-bridge remint (_bridgeCanonicalEvents, container event_bridge.js:237-330), contrasted with the worktree adapter:

| Behavior | Live old bridge | Worktree adapter |
|---|---|---|
| source | OVERWRITTEN to 'canonical_events' (original lost from source column) | Original row.source preserved |
| namespace | Not passed; collapses to core::system default | tenant::<tenant_id>, fail-closed on malformed |
| timestamp | Replaced by emit; original NOT preserved in metadata | Original preserved as metadata.original_timestamp |
| metadata | Rebuilt from scratch (bridged_from, original_event_id, tenant_id, actor, event_version); original row.metadata NOT carried | Original row.metadata carried as metadata.original_metadata |
| governance | `_skipGovernance: true` honored unconditionally (bypass) | Skipped only with the unforgeable capability object (phase 2) |
| Dedup | Vacuous: `event_id::text NOT IN (SELECT event_id FROM ping_events WHERE source='canonical_events')` compares source-table UUIDs against reminted SHA-256 IDs; can never match | Per-row processed flag + deterministic re-mint (idempotent by identity) |
| Cursor | Lexicographic `event_id > $last` over random UUIDs (C-035: can permanently skip rows) | No cursor; per-row durable state |
| Progress on failure | Cursor advances past failed rows (C-037) | Failed rows stay UNPROCESSED (retryable) or durable REJECTED |

All LIVE_VERIFIED from the container file; worktree column SOURCE_VERIFIED.

---

## REACHABLE WRITER INVENTORY: worktree vs live container

### Writers to ping_events

| Writer | Worktree (98ef51c9c) | Live container (devin-boundary2) |
|---|---|---|
| UnifiedEventRuntime.emit | Sole SQL writer (unified_event_runtime.js:245) | Sole SQL writer (container unified_event_runtime.js:149) |
| POST /events | Reachable (routes/events.js:79) | Present in container (not line-verified; route file exists) |
| Business emitters via CanonicalizationService | Reachable | Present in container (wiring section visually identical through line ~540) |
| BaseWorker._emit (8 canonical workers) | Reachable | Present (container canonical_workers.js has WitnessWorker ping_events read at :451) |
| Bridge re-emission | LegacyIngressAdapter (reachable, started) | Old EventBridge (reachable, started); legacy_ingress_adapter.js ABSENT from container |
| IntelligenceWorker._emit | Dormant (eventTypes:[]) | Not verified; assumed same or older |

### Writers to canonical_events

| Writer | Worktree (98ef51c9c) | Live container (devin-boundary2) |
|---|---|---|
| CanonicalEventEnvelope.executeEmitEvent | Sole SQL writer (canonical_event_envelope.js:174) | Sole SQL writer; FILE BYTE-IDENTICAL (sha256 3bbfaceb9a54cd2b4c890c022bfdc3bbe3bba1de7dc82e87f66ed1f32974efb3 both sides) |
| POST /canonical-events | Reachable (mounted :696) | Mounted (container :794) |
| ReviewAuthority / ProjectAuthority / CustomerAuthority | Reachable, effective | Wired (container :491-501) |
| AIWorkspaceAuthority | Wired but BROKEN (throws on validation) | Wired (container :491); same broken call shape presumed (file not diffed; the authority file was not compared) |

### Critical live-vs-worktree divergence (Path A identity and ordering)

The live UnifiedEventRuntime is NOT the certified code:

| Aspect | Worktree (certified) | Live container |
|---|---|---|
| ID scheme | `event_<16hex>` via IdentityAuthority, RFC-8785 canonicalization, identity_version 2.0.0 in preimage | 64-hex `crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex')` (container unified_event_runtime.js:80-82); namespace only in preimage when provided |
| Validation vs minting | Validate BEFORE minting (F7/D1; rejected events get no ID) | Mint FIRST (step 1), validate after (step 2) |
| Sequence | PG sequence `ping_events_sequence_seq`, certified allocation-position contract | No sequence column handling at all (358-line file; no nextval/MAX) |
| Replay reader | `replay({afterSequence, limit, consumer})` exists (lines 375-424) | ABSENT (no replay method) |
| Governance bypass | `_skipGovernance` honored ONLY with capability object | `_skipGovernance: true` honored unconditionally |
| File hash | 0bc2cc32e1a635d05f91821b905370d2cb9e78cfc37867e0f6cd7119305e1f3e | 2f56ba17e694eff76d0a2384510415759937a6dd2c44a4a06ed26d8b7491807c |

Consequence: the same logical event mints DIFFERENT IDs under the two builds (64-hex JSON.stringify hash vs event_ 16-hex RFC-8785 hash), and live IDs are JSON key-order dependent (JSON.stringify is not canonical). Any certification claim about ping_events identity semantics applies to the worktree code only, not to rows minted by the running container. The canonical_events path (CanonicalEventEnvelope) is byte-identical and unaffected. All LIVE_VERIFIED / SOURCE_VERIFIED as labeled.

---

## PHANTOM / DORMANT / LEGACY RE-CHECK

| Class | Working model | Re-verification |
|---|---|---|
| AcquisitionManager | PHANTOM | CONFIRMED, stronger: zero references in the entire tree, no such class is even defined. (A different class, AcquisitionAuthority in gateway/, exists but is not in the gateway closure and uses an injected eventBus, not the runtime.) |
| ConstitutionalEventStore | PHANTOM | CONFIRMED: zero references anywhere in the tree. |
| IEventAuthority | DORMANT | CONFIRMED, stronger: zero references anywhere; no interface definition exists in the tree. |
| EventRepository | LEGACY_UNREACHABLE | CONFIRMED with nuance: gateway/event_repository.js defines `class EventRepository extends KernelEventRepository` (line 15); it writes ONLY to `repository_events` / `event_processing` (runtime/kernel/event_repository.js:24,55,117), never ping_events. It IS instantiated in the live closure via GatewayToKernelAdapter (gateway_runtime.js:386-387), but the adapter's only runtime call is `shutdown()` (:837); `executeEvent`/appendEvent is never invoked from the closure. Its `appendEvent` users (automatic_mission_generator.js, continuous_replay_authority.js) have no require path from server.js/gateway_runtime.js. So: instantiated-but-never-invoked; LEGACY_UNREACHABLE for the write path holds. |

---

## CONTRADICTIONS WITH THE WORKING MODEL

1. CONTRADICTION (working model: "the 4 mounted HPP business authorities" write canonical_events): only THREE of the four can actually write. AIWorkspaceAuthority._persist (ai_workspace_authority.js:88, called from :115,136,155,175) passes a legacy-shaped command (`aggregateId`, `aggregateType`, `eventData`, `authority`) while `executeEmitEvent` destructures and validates `source`, `actor`, `payload` (canonical_event_envelope.js:196-213). Every invocation throws `Invalid event: source required, actor required, payload required`. The authority is wired and its public methods are reachable, but it is FALSIFIED as an effective canonical_events writer. Effective writers: POST /canonical-events, ReviewAuthority, ProjectAuthority, CustomerAuthority.

2. CONTRADICTION (working model: live image "runs an older pre-convergence build", stated neutrally): the divergence is sharper than "older". The live UnifiedEventRuntime uses a DIFFERENT identity scheme (SHA-256 over JSON.stringify, 64-hex, mint-before-validate, namespace-conditional preimage) versus the worktree's certified scheme (event_<16hex>, RFC-8785, identity_version in preimage, validate-before-mint). Same logical event, different IDs, and live IDs are key-order dependent. Any identity/ordering certification attached to the worktree code does not describe rows minted by the running container. The canonical_events side is byte-identical, so the divergence is confined to Path A.

3. NUANCE, not contradiction (EventRepository LEGACY_UNREACHABLE): the class is instantiated inside the live require closure (via GatewayToKernelAdapter, gateway_runtime.js:386), so "unreachable" needs the qualifier: instantiated but its write path is never invoked; it cannot write ping_events by construction (targets repository_events/event_processing). Classification holds with this qualifier.

4. NEW FINDING (not in the working model): the certified `UnifiedEventRuntime.replay({afterSequence, limit, consumer})` reader (unified_event_runtime.js:375) has ZERO production callers. All `.replay(` hits in gateway/ping-runtime are the DeterministicReplayEngine kernel API. Replay consumption of ping_events is an available-but-unwired capability in the worktree, and does not exist at all in the live container. Any claim that the certified replay reader is exercised on the live path is FALSIFIED.

5. NEW FINDING (not in the working model): EventReadAuthority, the read side wired into GET /events, reads `repository_events` (runtime/kernel/event_read_authority.js:43+), not ping_events. The /events route reaches ping_events only through its pool-query fallback when the read authority returns empty (routes/events.js:17-19, 28-30, 41-43, 55-58). The legacy read path points at the legacy table.

6. CONFIRMED (working model): two effective event authorities; single SQL writer per table in both worktree and live container; bridge is the only table-to-table path; mission creation flows only through ping_events (EventToMissionBridge); nothing bridges canonical_events to missions directly; witness/lineage/projection consume ping_events only.

---

## TRACE BLOCKED ITEMS

None required a DB write or restart. Two items were not fully established and are marked accordingly above rather than blocked: (a) whether POST /events and the business-emitter wiring in the LIVE container match the worktree line-for-line (route files exist in the container; only the runtime and bridge files were line-compared); (b) whether the live AIWorkspaceAuthority carries the same broken call shape (authority file not diffed; presumed same given the envelope is byte-identical and the wiring lines match).
