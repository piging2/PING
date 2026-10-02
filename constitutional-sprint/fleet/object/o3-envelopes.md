# O3 — Envelope/Schema Inventory (event/object envelopes across both repos)

**Worker:** O3 (schema/envelope inventory). **Mode:** READ-ONLY. **Commits created:** NONE. All changes below are PROPOSALS only (never applied).
**Bases:** ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f`; CORE `/home/nolan/ping` @ `refactor/runtime-authority-convergence` (live code; no writes, no process touches, secrets metadata-only).
**Read first:** `~/workspace/constitutional-sprint/evidence/EVIDENCE-OBJECT-INTENT.md`, `~/workspace/constitutional-sprint/authority-map/AUTHORITY-MAP.md`.
**Date:** 2026-09-23 MDT.

---

## Summary

**16 envelopes inventoried. Headline finding: TWO live event envelopes both claim to be THE canonical one, and the bridge between their journals re-identifies events, so the same logical event carries two different identities in two journals.**

- **E1** (CORE `UnifiedEventRuntime` → `ping_events`): the LIVE spine per `gateway/routes/events.js`. Lowercase fields, `event_id` = SHA-256 over **non-canonical** `JSON.stringify`. Payload key order is caller-controlled → identity is not stable across serialization (F1).
- **E2** (CORE `StandardEventSchema` → `repository_events`): claims "Every persisted event must conform to one immutable constitutional schema. **No authority may define custom envelopes**." Uppercase fields, canonical hashing, per-object sequence, hash chain. Also live (mission/replay authorities emit here). `routes/events.js` explicitly bypasses it for POST /events ("not through the kernel pipeline ... EventBridge adds a 5s delay for no benefit").
- **The bridge** (`ping-runtime/events/event_bridge.js`) copies `repository_events` → `ping_events` with a **new** content-derived `event_id`; the original survives only inside `payload._repository_event_id` / `metadata.original_event_id`. Two identities for one logical event; cross-journal correlation requires knowing the convention (F2).
- **E3** (older `gateway/canonical_event_envelope.js` → `canonical_events`, UUID v5 over tenant:timestamp:sequence): no live producers found → LEGACY.
- **E4** (canonical object envelope `ping-runtime/canonicalization/canonical_object.js`): single immutable envelope, identity derived from canonical hash. Solid; one soft spot: `identity.created_at` is `now`, so two identical payloads produce identical `id` but non-identical identity blocks (F6).
- **E5** (FYD projection dump JSON): digest-verified, consistent with adapter digest law. OK.
- **E8** (`bff-envelope@1`): signed with the dev stand-in serializer (`canonicalizeJson`, drops `undefined`), explicitly NOT the constitutional serializer, yet it signs live social writes that land in the journal (F5).
- **Reader leniency** (`ping-object-reader.ts` `eventPayload`/`eventId`/`eventTime`): accepts `payload|data|event_data|body`, `id|eventId|event_id`, five timestamp aliases, and silently defaults a missing timestamp to epoch zero → ordering skew instead of failure (F4).
- **Aggregate placement drift**: `aggregate_id`/`aggregate_type` are top-level columns in `repository_events` but nested inside `metadata` JSONB in `ping_events` (F3).
- **Owner intent duality**: adapter `OwnerEvent` (fyd-owner@1, content-hash ID) and core `FYD_SITE_OVERLAY` ops (journal, presentation-intent ops with demo-owner marker) are two envelopes for owner intent with different identity derivations (F7).
- **12 minor**: E1 has no `sequence` column at all; ordering on the live journal is by wall-clock `timestamp` with `(timestamp, event_id)` tie-break in every reader.

---

## ENVELOPE MAP

Columns: DOMAIN / ENVELOPE / FIELDS / ID FIELD / HASH RULE / PRODUCER / CONSUMERS / VALIDATION / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / AFFECTS AGENTS.

### E1 — CORE `ping_events` row (UnifiedEventRuntime spine)

- **DOMAIN:** CORE (`/home/nolan/ping`)
- **ENVELOPE:** `ping_events` row, produced by `ping-runtime/events/unified_event_runtime.js:74-175` (`emit`)
- **FIELDS:** `event_id` (PK), `event_type`, `source`, `timestamp` (TIMESTAMPTZ, set by `constitutionalTimeAuthority.nowAsISOString()` at emit), `payload` (JSONB), `metadata` (JSONB: `schema_version: '1.0.0'`, `namespace`, `causation_id`, `correlation_id`, `confidence?`, plus `aggregate_id`/`aggregate_type` when posted via gateway), `namespace` (default `'core::system'`), `processed`, `created_at`
- **ID FIELD:** `event_id` = `sha256(JSON.stringify({eventType, source, [namespace], [logical_id|payload]}))`. Namespace and logical_id only included when provided. No timestamp in the identity material.
- **HASH RULE:** None canonical. Identity hash uses plain `JSON.stringify` (insertion order, no key sorting). Collision check on `ON CONFLICT DO NOTHING` re-reads stored payload and compares with **shallow** sorted-keys compare (`JSON.stringify(o, Object.keys(o).sort())` — top level only); semantic mismatch fails closed ("Event ID collision: same event_id with different payload semantics").
- **PRODUCER:** `UnifiedEventRuntime.emit`. HTTP producers: `gateway/routes/events.js` POST `/events` (both the `{event_type, aggregate_id, aggregate_type, event_data}` canonical-spine lane and the `{type, payload, proof, metadata}` BFF lane after ingest adapters); `tools/fyd-site-projection/emit-overlay.py` (FYD_SITE_OVERLAY); `EventBridge` (repository_events → ping_events copies, `source='repository_events'`).
- **CONSUMERS:** `runtime/kernel/event_read_authority.js` (markProcessed/markFailed write to separate `event_processing` table), `EventBridge` cursor checks, `tools/fyd-site-projection/dump.py` (`SELECT event_id, timestamp, payload AS event_data ... WHERE event_type='FYD_SITE_OVERLAY'`), adapter `queryFydSiteOverlays` via gateway `GET /events/<type>`.
- **VALIDATION:** `EventValidator.isRegistered(eventType)` against `gateway/generated/event_registry.json` (234 types, generated 2026-09-21); `EventGovernance.validateEvent` enforces the namespace privacy boundary (`core::<name> | tenant::<id>`) at this one choke point. POST `/events` requires shape per lane. Fail-closed when no pool.
- **CLASSIFICATION:** CANONICAL_LIVE (spine)
- **CONFIDENCE:** HIGH
- **BROKEN BOUNDARY:** F1 (identity not stable across serialization — see findings)
- **AFFECTS AGENTS:** any agent that re-emits or deduplicates by `event_id`; FYD overlay emitters; EventBridge.

### E2 — CORE `repository_events` row (StandardEventSchema / kernel pipeline)

- **DOMAIN:** CORE
- **ENVELOPE:** `repository_events` row, produced by `runtime/kernel/authorities/standard_event_schema.js` (`StandardEventSchema.create`), persisted by `runtime/kernel/event_repository.js` (`EventRepository.appendEvent`)
- **FIELDS:** `event_id`, `object_id`, `event_type`, `aggregate_type`, `sequence` (per-object), `payload` (JSONB), `witness` (JSONB), `timestamp` (BIGINT millis), `authority`, `authority_version`, `causation_id`, `correlation_id`, `created_at` (TIMESTAMPTZ, `constitutionalTimeAuthority.now()`), `RuntimeID`, `PreviousEventHash`, `CanonicalEventHash`, `ReducerHash`, `WitnessHash`, `ReplayHash`, `chain_root`
- **ID FIELD:** `event_id` = `identityAuthority.generateEventId(eventType, aggregateId)` → `'evt'`-prefixed hash over `CanonicalBytes.serialize({type:'evt', version, identity_version, event_type, aggregate_id})` — deterministic, canonical. Note: identity does NOT include sequence or payload.
- **HASH RULE:** `CanonicalBytes.serialize` (sorted-key canonical) + `CanonicalAuthority.hash`. `CanonicalEventHash` over {event_id, event_type, aggregate_id, aggregate_type, aggregate_version, sequence, authority, authority_version, timestamp, payload_version, payload, ReplayID, PreviousEventHash, ReducerHash}; `WitnessHash` from WitnessAuthority; `ReplayHash` over {CanonicalEventHash, WitnessHash, ReplayID}; `canonical_hash` via `hashEventCanonical`. `chain_root = f(previousHash, canonicalEventHash)`. Event object frozen (`Object.freeze`).
- **PRODUCER:** `StandardEventSchema.create` callers; `appendEvent` called from gateway mission/replay/execution machinery (`gateway/mission_authority_v2.js`, `gateway/automatic_mission_generator.js`, `gateway/replay_authority.js`, `gateway/trigger_authority.js`, `gateway/execution_graph_authority.js`, `gateway/constitutional_execution_pipeline.js`, `gateway/patch_authority_v2.js`, ...)
- **CONSUMERS:** `EventBridge._bridgeRepositoryEvents` (one-way copy to `ping_events`); replay machinery; `gateway/eventstore_persistence.js` (dead class, per EVIDENCE-OBJECT-INTENT H1).
- **VALIDATION:** `StandardEventSchema.validate` (required-field list); `INSERT` has no `ON CONFLICT` — duplicate `event_id` would hard-error at the DB.
- **CLASSIFICATION:** CANONICAL_LAW claim, CONFLICTING in practice (see N1)
- **CONFIDENCE:** HIGH (mechanism + live producers)
- **BROKEN BOUNDARY:** F2 (two canonical event envelopes; bridge re-identification), F3 (aggregate placement drift)
- **AFFECTS AGENTS:** mission/replay/execution agents; any agent correlating events across the two journals.

### E3 — CORE `canonical_events` row (legacy gateway envelope)

- **DOMAIN:** CORE
- **ENVELOPE:** `gateway/canonical_event_envelope.js` (`executeEmitEvent` → `INSERT INTO canonical_events ... ON CONFLICT (tenant_id, sequence) DO NOTHING`)
- **FIELDS:** `tenant_id`, `sequence`, `event_id`, payload, `processed`/`retries`/`last_error` (operational metadata, not evidence)
- **ID FIELD:** `event_id` = deterministic UUID v5 over `tenantId:eventType:timestamp:sequence` (DNS namespace, `canonical_event_envelope.js:66-90`). Note: timestamp is IN the identity material → re-emitting the same logical event at a different timestamp yields a different ID (contrast E1, where timestamp is excluded).
- **HASH RULE:** UUID v5 (SHA-1 based)
- **PRODUCER:** `executeEmitEvent`; no live producers found (evidence file §4.1.3)
- **CONSUMERS:** `EventBridge` polls it (`ping_bridge_cursors` source `canonical_events`)
- **VALIDATION:** `ON CONFLICT (tenant_id, sequence) DO NOTHING`
- **CLASSIFICATION:** LEGACY (superseded; insert-safe but not on the live path)
- **CONFIDENCE:** MEDIUM (liveness inferred from absence of producers, not exhaustively proven)
- **BROKEN BOUNDARY:** none live; latent: a third event-ID derivation rule if ever rewired
- **AFFECTS AGENTS:** none currently

### E4 — CORE canonical object envelope

- **DOMAIN:** CORE
- **ENVELOPE:** `ping-runtime/canonicalization/canonical_object.js` (`createCanonicalObject`); authority shim `gateway/canonical_object_authority.js` ("Nothing else creates constitutional objects")
- **FIELDS:** `id`, `kind`, `authority`, `canonical_hash`, `identity` {namespace, version:'v1', created_at, created_by}, `lineage` {source_id, source_kind, derivation_path, provenance_chain}, `relationships`, `health`, `confidence`, `metadata` {lifecycle_id, timestamp, schema_version, constitution_version, runtime_version, ...extra}, `payload`, `witness`, `certificate`, `schema_version`, `canonical_version`, `constitution_version`, `canonical_bytes` (optional)
- **ID FIELD:** `id` = explicit `options.id`, else `identityAuthority.generateFromCanonicalHash(canonicalBytes, kind)` — content-derived, stable across serialization
- **HASH RULE:** `canonical_hash = CanonicalAuthority.hashBytes(CanonicalBytes.serialize(payload))`; `verifyCanonicalObject` recomputes and compares. Header documents consolidation of ~15 isomorphic implementations.
- **PRODUCER:** `createCanonicalObject()` only (enforced by `canonical_object_authority.js`)
- **CONSUMERS:** knowledge/object builders (per header consolidation list), replay certificates, witness objects
- **VALIDATION:** `verifyCanonicalObject` (kind, payload, canonical_hash presence + recompute)
- **CLASSIFICATION:** CANONICAL_LIVE
- **CONFIDENCE:** HIGH
- **BROKEN BOUNDARY:** F6 (identity block carries `created_at: now` → identical payloads yield identical `id` but non-identical envelopes; byte-identity of the envelope is not content-determined)
- **AFFECTS AGENTS:** object compilers, replay/witness consumers that compare envelopes byte-wise

### E5 — FYD projection dump JSON

- **DOMAIN:** CORE tooling → ADAPTER read seam (`/home/nolan/ping/var/fyd-projections/<siteId>.json`, produced by `tools/fyd-site-projection/dump.py`, DUMPER_VERSION `fyd-projection-dump@1.1.0`)
- **ENVELOPE:** `{ meta: {siteId, dumpedAt, dumperVersion, baseDigest, fixtureFileDigest, fixtureHeader, overlayEventIds[], graphDigest, generatedAt, eventSequences, presentationIntentDigest}, graph: {objects: PingObject[], relationships: PingRelationship[]}, presentationIntent: {directives[], provenance{}} }`
- **ID FIELD:** `meta.graphDigest` = sha256 over canonical form of graph (recursive key sort, arrays keep order, compact separators) — same rule as adapter `canonicalize()` (`src/lib/ping/ask-composer.ts`)
- **HASH RULE:** sha256 over canonical graph bytes; `presentationIntentDigest` separately digested; base fixture digest recorded
- **PRODUCER:** `dump.py` (base mechanically extracted from committed machine-generated fixture TS; overlays from `ping_events` in `(timestamp, event_id)` order; exit 2 on overlay query failure — fail closed; atomic tmp+rename write)
- **CONSUMERS:** adapter `getPingObjectGraph(Sync)` (`src/fyd/data/ping-object-source.ts`) — fails closed on siteId mismatch, missing provenance ref, or digest mismatch
- **VALIDATION:** digest recompute + tenant check + provenance refs; overlay ops validated (unknown op kinds abort the dump)
- **CLASSIFICATION:** DERIVED (point snapshot, digest-bound)
- **CONFIDENCE:** HIGH
- **BROKEN BOUNDARY:** none in the envelope itself; the op vocabulary is implemented twice (Python `dump.py::apply_overlays` vs TS `applyTenantOverlays`) — D3 in EVIDENCE-OBJECT-INTENT
- **AFFECTS AGENTS:** FYD read seam; customize apply layer

### E6 — ADAPTER PingObject / PingRelationship (FYD object shape)

- **DOMAIN:** ADAPTER (`src/lib/ping/types.ts`)
- **ENVELOPE:** `PingObject` {id, schema, controllerId, visibility, title, description, fields: Record<string, string|string[]>, createdAt, updatedAt, provenance: {kind: 'canonical-journal'|'website-derived'|'overlay-authored', ref, updatedRefs?, derivedAt}, ownerFieldCorrections?: OwnerFieldCorrection[]}; `PingRelationship` {id, subject, predicate, object, status, createdAt, evidenceRef}; `ProjectionMeta` {dumperVersion, baseDigest, graphDigest, overlayEventIds, generatedAt, eventSequences, presentationIntentDigest?}
- **ID FIELD:** website-derived: `website-business-<sha16>` (proceduralizer; explicitly "not a canonical PING identity"); journal-added: gateway IDs. `deriveBusinessId`/`deriveRelationshipId` use sha256 of (sourceUrl, controller, sorted fields).
- **HASH RULE:** none at object level (graph-level digest only, E5)
- **PRODUCER:** `dump.py` base extraction; overlay `add_object`/`add_relationship` ops force `provenance.ref = ping-event:<event_id>`
- **CONSUMERS:** all FYD pages/routes, ObjectView composer, Ask pipeline
- **VALIDATION:** shape checks at read seam (object/relationship structure, provenance refs)
- **CLASSIFICATION:** ADAPTER (shape authority for the TS surface; B2 in EVIDENCE-OBJECT-INTENT)
- **CONFIDENCE:** HIGH
- **BROKEN BOUNDARY:** provenance.kind 'overlay-authored' exists (2026-09-22) for demo-operator content that is "neither the website's own words nor a recorded journal fact" — the envelope does not distinguish journal-backed from operator-authored at the ID level
- **AFFECTS AGENTS:** FYD render/ask agents that treat all objects as equally evidenced

### E7 — CORE FYD_SITE_OVERLAY gateway POST envelope (owner intent, journal lane)

- **DOMAIN:** CORE tooling → CORE journal
- **ENVELOPE:** `{event_type: 'FYD_SITE_OVERLAY', aggregate_id: 'fyd-site:<site>', aggregate_type: 'fyd_site', event_data: {siteId, ops: Op[]}}` (posted by `tools/fyd-site-projection/emit-overlay.py:44-51`)
- **ID FIELD:** becomes E1 `event_id` at the gateway: sha256 over `{eventType:'FYD_SITE_OVERLAY', source:'api', payload:{siteId, ops}}`. Deterministic by content → re-emitting identical ops is a dedupe no-op (ON CONFLICT DO NOTHING), which means **the same logical correction emitted twice is indistinguishable from once** — no intent sequence is recorded.
- **HASH RULE:** E1 rule
- **PRODUCER:** `emit-overlay.py`; customize apply layer (`src/fyd/customize/apply-layer.ts`) via presentation-intent ops
- **CONSUMERS:** `dump.py` (overlay replay), adapter `queryFydSiteOverlays` → `applyTenantOverlays`
- **VALIDATION:** POST route requires all four fields; op vocabulary validated by dump.py (unknown ops abort) and TS reader (malformed → throw). Event-type registry: `dump.py` header notes `FYD_SITE_OVERLAY` may not be registered in the main deployment's baked registry (FAILURE_LEDGER FL-20260921-231) → on the main journal the emit can be rejected by `EventValidator.isRegistered` (NOT PROVEN live; medium confidence)
- **CLASSIFICATION:** ADAPTER↔CORE seam (owner intent evidence in the core journal)
- **CONFIDENCE:** HIGH for shape; MEDIUM for registry membership on main
- **BROKEN BOUNDARY:** F7 (owner-intent duality with E10); op `set_presentation_intent` carries `approval` with demo-owner marker + proposal digest — authorization evidence rides inside an op, not in the envelope
- **AFFECTS AGENTS:** owner-mutation agents; customize lane

### E8 — ADAPTER bff-envelope@1 (social ingest)

- **DOMAIN:** ADAPTER → CORE (`src/fyd/social/envelope.ts:52,68`)
- **ENVELOPE:** `{type: 'OBJECT_CREATED'|'OBJECT_UPDATED'|'RELATIONSHIP_CREATED', payload: Record<string,unknown>, proof: {algorithm:'ed25519', signature (base64), publicKey (PEM SPKI)}, metadata: {source:'fyd-social', generator, producedAt, ...}}`
- **ID FIELD:** on the wire: none — identity is the Ed25519 signature over canonical bytes. Post-ingest: `fydActionId` (sha256 of canonical bytes + `fyd-social@1` generator binding, `src/fyd/social/transition-id.ts:22`) is used for C1 idempotency dedupe; the journaled row gets an E1 content `event_id`.
- **HASH RULE:** signed bytes = `canonicalizeJson({type, payload, metadata})` from `src/lib/ping/dev-signer.ts:61` (sorted-key, **undefined dropped**) — header explicitly labels this "a clearly labeled dev stand-in, not the constitutional path" and "kept separate from the constitutional canonicalizeObject"
- **PRODUCER:** `buildSignedEnvelope` (FYD dev key custody, `FYD_DEV_KEY_DIR`, identity regex `^identity_[0-9a-f]{16}$`)
- **CONSUMERS:** `gateway/social_ingest_adapter.js` `normalizeBffEnvelope` → per-type normalizers → `normalized.payload_hash` → POST-lane emit → E1 row
- **VALIDATION:** `verifyBffProof` (Ed25519), event-type vocabulary, `rejectSecrets(payload)`, `payload_hash` recompute, gateway signature of the "ONE IdentityAuthority" minting (route comment)
- **CLASSIFICATION:** ADAPTER (live social write path)
- **CONFIDENCE:** HIGH
- **BROKEN BOUNDARY:** F5 (dev serializer signs live journal writes)
- **AFFECTS AGENTS:** social-write agents; anything verifying signatures must use the dev serializer, not the constitutional one

### E9 — CORE knowledge-envelope@1 (Lane B ingest)

- **DOMAIN:** CORE (`gateway/knowledge_ingest_adapter.js:51`, `normalizeKnowledgeEnvelope:229`)
- **ENVELOPE:** same intake slot as E8 (`{type, payload, proof, metadata}`), selected when `payload.schema` starts with `'ping.knowledge.*'`; normalizes through the knowledge adapter instead of the social one
- **ID/HASH/VALIDATION:** per-adapter; `_ingest.adapter = 'knowledge-envelope@1'` recorded in metadata
- **CLASSIFICATION:** ADAPTER→CORE seam (additive Lane B, 2026-09-21; "The social path is untouched")
- **CONFIDENCE:** MEDIUM (shape read from adapter code; end-to-end trace not run)
- **BROKEN BOUNDARY:** one HTTP shape (`{type,payload,proof,metadata}`) fans out to two different normalizers by payload sniffing — a schema-ambiguous intake
- **AFFECTS AGENTS:** knowledge-ingest agents

### E10 — ADAPTER OwnerEvent (owner intent, adapter lane)

- **DOMAIN:** ADAPTER (`src/fyd/object/owner-events.ts:96`)
- **ENVELOPE:** `{id, seq, at, objectId, type: OwnerEventType, actor: OwnerEventActor, target: OwnerFactTarget, previousBasis, newValue, evidence: {kind, ref, detail?}, note, generator: 'fyd-owner@1'}`
- **ID FIELD:** `id` = `fydOwnerEventId` = sha256 over `canonicalizeJson({...body, generator_version})` where body includes `seq` (excludes `id`). Same logical event appended at the same position always yields the same ID.
- **HASH RULE:** sha256 over dev `canonicalizeJson` bytes (sorted-key, undefined dropped — same dev serializer as E8)
- **PRODUCER:** `appendOwnerEvent` (`:622`), via `applyOwnerCommand` (`src/fyd/object/owner-store.ts`); store `data/fyd-owner/<objectId>.json`, atomic tmp+rename, append-only
- **CONSUMERS:** `projectOwnerState` (pure fold → OwnerOverrides), owner overlay composer
- **VALIDATION:** fail-closed reducer (unknown types throw; objectId mismatch throws); mutation route gated on demo-owner-mode + digest echo; migration of v1 files transparent on read
- **CLASSIFICATION:** CANONICAL_LIVE (adapter lane)
- **CONFIDENCE:** HIGH
- **BROKEN BOUNDARY:** F7 (duality with E7); D2 owner-store key split (slug-keyed vs object-ID-keyed logs for the same business — EVIDENCE-OBJECT-INTENT §3.1 C6); actor is demo-only
- **AFFECTS AGENTS:** owner-mutation agents; the two key regimes mean the same business's intent can land in two logs

### E11 — ADAPTER ResourceClaim

- **DOMAIN:** ADAPTER (`src/fyd/claim/types.ts`)
- **ENVELOPE:** `{version: 1, resourceId, kind: 'fyd-site', state: 'observed'|'claimed'|'verified-controlled', sourceUrl, observedAt, claimedBy: {kind: 'demo-owner'|'google', actorId, actorLabel, authenticatedAt, authNote}|null, verification: {method, verifiedAt, verifiedBy, basis, artifacts, proofNote}|null, history: ClaimEvent[]}`
- **ID FIELD:** `resourceId` (caller-supplied; no derivation rule)
- **HASH RULE:** none
- **PRODUCER:** claim machine (`src/fyd/claim/machine.ts`); persisted by `writeClaim` (atomic replace of `data/fyd-claims/<resourceId>.json`)
- **CONSUMERS:** 4 claim routes, onboarding anonymous-preview
- **VALIDATION:** pure state machine; demo-owner-mode gate on routes; identity bridge `resolveClaimIdentity` demo-only
- **CLASSIFICATION:** CANONICAL_LIVE (adapter lane)
- **CONFIDENCE:** HIGH
- **BROKEN BOUNDARY:** D1 (release() nulls `verification`, destroying the persisted VerificationProof); no sequence/version beyond `version: 1`; no provenance chain linking `verification.artifacts` back to journal evidence
- **AFFECTS AGENTS:** claim/verification agents; onboarding

### E12 — ADAPTER Observation / Claim / Conflict / Snapshot (refresh lane)

- **DOMAIN:** ADAPTER (`src/fyd/refresh/types.ts`)
- **ENVELOPE:** `Observation` {observationId, observedAt, sourceKind, sourceUrl, evidenceRef, provenance: 'real'|'synthetic', claims[]}; `Claim` {claimId, entityId, field, value, normalizedValue, sourceKind, sourceUrl, observedAt, evidenceRef, confidence 0..1, grade: 'website_statement'|'provider_statement'|'synthetic_fixture', label}; `Conflict` {conflictId, entityId, field, kind:'value_disagreement', claims:[Claim,Claim], status, detectedAt, surfaceText, resolution?}; `Snapshot` {snapshotId, capturedAt, provenance, sourceKind, sourceUrl, claims[]}
- **ID FIELD:** `claimId` = hash of `entityId|field|sourceKind|normalizedValue` (stable); `observationId` = **timestamp-based** (not stable — two observations of the same fetch differ); facebook lane uses `syntheticClaimId`
- **HASH RULE:** claim IDs content-derived; observation IDs not
- **PRODUCER:** `website-observe.ts` (pure extraction, no persistence, no network); `facebook-source.ts`
- **CONSUMERS:** none live — no route imports the lane; `run-t2.ts` manual script; snapshots via `snapshot-store.ts` (same-ID overwrite)
- **VALIDATION:** none on a live path (DORMANT)
- **CLASSIFICATION:** DORMANT (ADAPTER); shape authority only
- **CONFIDENCE:** HIGH
- **BROKEN BOUNDARY:** observation identity is time-based, so observation-level deduplication/correlation is impossible; refresh snapshots are overwrite stores (R5 in EVIDENCE-OBJECT-INTENT)
- **AFFECTS AGENTS:** refresh/diff agents (currently manual)

### E13 — MISSION shapes

- **DOMAIN:** both
- **ENVELOPE (tandem/mission envelope):** `{job_id, mission_id, parent_run_id, initiated_by, auth_ref, delegated_to, capability, brief_ref, objective, expected_output, created_at, status}` (see `~/workspace/pig-fb/new-job.sh`; e.g. `.../meta-ai-intel/<run>.job.json`; `runs.jsonl` joins on `job_id == run_id`)
- **ID FIELD:** `job_id` = timestamp+slug (`%Y%m%d-%H%M%S-<brief-slug>`) — wall-clock derived, not content-derived
- **HASH RULE:** none
- **PRODUCER:** `new-job.sh` (delegator: cron worker or Muse)
- **CONSUMERS:** `meta-pass.sh`, tandem runs ledger
- **VALIDATION:** brief must exist; objective truncated to 1200 chars
- **CLASSIFICATION:** ADAPTER (operational, not constitutional)
- **CORE mission hash:** `CanonicalAuthority.hashMission(reasoning, tasks, priority)` — hash-only schema `{reasoning, tasks, priority}`, no persisted envelope found in this sweep
- **CONFIDENCE:** HIGH (tandem); MEDIUM (core mission envelope persistence — NOT PROVEN whether `mission_authority_v2` persists a mission object envelope to `repository_events` with a defined shape)
- **BROKEN BOUNDARY:** job IDs are wall-clock derived; two jobs created in the same second with the same slug collide (`RUN_ID` identical) — second `new-job.sh` run would overwrite the first `.job.json`. Low probability, real mechanism.
- **AFFECTS AGENTS:** tandem/meta-ai delegation agents

---

## Findings (hunts)

### F1 — E1 `event_id` is not stable across serialization (PROVEN)

**WHY:** Identity must be a pure function of logical content. E1 derives `event_id` from `JSON.stringify` of the identity material, so payload key order — which callers control — changes the ID. Worse, `namespace` and `logical_id` are only hashed when provided ("so legacy callers keep their existing event IDs"), meaning the same logical event emitted with and without them gets two different IDs *by design*.

**EVIDENCE:** `ping-runtime/events/unified_event_runtime.js:79-90` (`identity` built with insertion order `eventType, source, [namespace], [logical_id|payload]`; `JSON.stringify(identity)` not canonicalized). The collision guard (`:161-174`) uses a *shallow* sorted-keys compare (`JSON.stringify(o, Object.keys(o).sort())`), so nested key-order variants are misclassified as semantic collisions and hard-rejected.

**MINIMUM CHANGE:** Build the identity material through `CanonicalBytes.serialize` (sorted-key, recursive) before hashing; always include a normalized namespace key and the `logical_id|payload` discriminator so the identity schema is fixed regardless of caller options.

**TEST:** Emit the same logical event twice with payload keys in different orders and with/without `namespace`; assert identical `event_id` both times and one `persisted` + one `deduplicated` in stats.

**RESULT:** PROPOSAL ONLY (read-only worker; not applied).

### F2 — Two live event envelopes; the bridge re-identifies events (PROVEN)

**WHY:** E2's header claims "No authority may define custom envelopes," yet E1 (`UnifiedEventRuntime`) defines one and `gateway/routes/events.js` routes the entire POST spine around E2. Both journals are live (`appendEvent` has mission/replay/execution producers). The one-way `EventBridge` (`ping-runtime/events/event_bridge.js:127-215`) re-emits `repository_events` rows through `emit()`, minting a **new** E1 `event_id`; the original survives only as `payload._repository_event_id` and `metadata.original_event_id`. One logical event, two identities, in two journals.

**EVIDENCE:** `runtime/kernel/authorities/standard_event_schema.js:22-28` (the no-custom-envelopes claim); `gateway/routes/events.js:112-116` (explicit bypass of the kernel pipeline); `ping-runtime/events/event_bridge.js:177-195` (re-emit with new ID); `event_repository.js:24-46` vs `unified_event_runtime.js:47-68` (different column regimes).

**MINIMUM CHANGE:** Either (a) make the bridge preserve identity: pass the original `event_id` as `options.logical_id` so the E1 ID is derived deterministically from the source identity (documents the cross-journal lineage in the ID itself), or (b) declare one journal canonical and deprecate producers on the other.

**TEST:** Emit via `StandardEventSchema.create` + `appendEvent`, run one bridge cycle, assert `ping_events` row exists whose `event_id` is either identical to the source ID (option b) or a deterministic function of it (option a), and assert a reader can correlate both rows without knowing the `_repository_event_id` convention.

**RESULT:** PROPOSAL ONLY.

### F3 — Aggregate placement drift between the two journals (PROVEN)

**WHY:** In E2, `aggregate_id`/`aggregate_type` are first-class columns. In E1 they are buried in `metadata` JSONB (set only by the gateway POST lane: `routes/events.js:103,112-116`). Readers crossing journals must know this; a reader that filters E1 rows by a nonexistent `aggregate_id` column silently matches nothing.

**EVIDENCE:** `runtime/kernel/event_repository.js:117-121` (columns in INSERT) vs `unified_event_runtime.js:140-152` (metadata merge) and `gateway/routes/events.js:103`.

**MINIMUM CHANGE:** Promote `aggregate_id`/`aggregate_type` to nullable indexed columns on `ping_events` (backfill from `metadata`), or add a documented accessor that both readers use.

**TEST:** Insert via both lanes for the same aggregate; query each journal by aggregate; assert both return the event.

**RESULT:** PROPOSAL ONLY.

### F4 — Adapter reader accepts any shape; missing timestamp becomes epoch zero (PROVEN)

**WHY:** `eventPayload` accepts `payload|data|event_data|body`; `eventId` accepts `id|eventId|event_id`; `eventTime` accepts `createdAt|created_at|acceptedAt|timestamp|producedAt` and defaults to `new Date(0)` when none match. A malformed row is silently normalized instead of rejected — and epoch-zero timestamps sort first in overlay application, so a malformed overlay would apply *before* the base instead of failing.

**EVIDENCE:** `src/lib/ping/ping-object-reader.ts:191-212`; `queryFydSiteOverlays` sorts `(timestamp, event_id)` and applies in that order (`fyd-tenant-graph.ts`).

**MINIMUM CHANGE:** Fail closed in `eventTime` (throw `FYD_OVERLAY_MALFORMED` like the ops-shape check already does) instead of defaulting to epoch zero; log-and-skip for unknown wrapper keys rather than silently accepting four.

**TEST:** Feed a row with no timestamp field; assert throw, not epoch-zero ordering.

**RESULT:** PROPOSAL ONLY.

### F5 — Live social writes are signed with the dev stand-in serializer (PROVEN)

**WHY:** `bff-envelope@1` signs with `canonicalizeJson` (drops `undefined`), which the file header itself labels "a clearly labeled dev stand-in, not the constitutional path." A payload containing an `undefined` field verifies under the dev serializer but would hash differently under the constitutional serializer — the signature binds a different byte string than the constitutional canonicalization would.

**EVIDENCE:** `src/fyd/social/envelope.ts:1-17`, `src/lib/ping/dev-signer.ts:61`; AUTHORITY-MAP Overlap 3 documents the divergent `undefined` semantics vs `canonicalize` (undefined → null).

**MINIMUM CHANGE:** Either promote one serializer to constitutional status and use it in both `buildSignedEnvelope` and `verifyBffProof`, or version the envelope (`bff-envelope@2`) with the constitutional serializer and reject `@1` after migration.

**TEST:** Round-trip a payload containing `undefined` through sign → verify → journal → re-verify with the constitutional serializer; assert identical bytes.

**RESULT:** PROPOSAL ONLY.

### F6 — Canonical object identity block is not content-determined (PROVEN)

**WHY:** `id` derives from the canonical hash (stable), but the `identity` block embeds `created_at: now` and `metadata.timestamp: now`. Two `createCanonicalObject` calls with identical payloads produce identical `id`/`canonical_hash` but non-identical envelopes. Any consumer comparing envelopes byte-wise (or hashing the envelope rather than the payload) sees two different objects.

**EVIDENCE:** `ping-runtime/canonicalization/canonical_object.js:89-93, 122-131`; `verifyCanonicalObject` correctly verifies only the payload hash, so the verifier tolerates this — but nothing stops a consumer from hashing the envelope.

**MINIMUM CHANGE:** Document that envelope byte-identity is NOT guaranteed and only `(id, canonical_hash)` are the identity; or move wall-clock fields out of the identity block into a non-hashed `observed` section excluded from any envelope-level hash.

**TEST:** Create the same object twice 1s apart; assert `id` and `canonical_hash` equal; assert documented non-identity of full bytes.

**RESULT:** PROPOSAL ONLY.

### F7 — Owner intent has two envelopes with different identity derivations (PROVEN)

**WHY:** Adapter-lane owner intent (E10: `fyd-owner@1`, sha256 over canonical body incl. `seq`) and journal-lane owner intent (E7: `FYD_SITE_OVERLAY` ops, E1 content ID over `{siteId, ops}`) describe the same class of fact with unrelated identities. `set_presentation_intent` additionally carries the demo-owner authorization marker *inside the op*, not in the envelope. Correlating "the owner correction in the log" with "the overlay op in the journal" requires out-of-band knowledge.

**EVIDENCE:** `src/fyd/object/owner-events.ts:126-136` vs `tools/fyd-site-projection/emit-overlay.py:44-51` and `dump.py:34-58`; EVIDENCE-OBJECT-INTENT §3.1 C6 (key split compounds this).

**MINIMUM CHANGE:** Include the owner-event content ID (`fydOwnerEventId`) in the corresponding overlay op (e.g. `op.ownerEventId`) so the journal op points at the log event; or converge on one lane.

**TEST:** Apply an owner correction through both lanes; assert the journal op references the log event ID and a reader can join them.

**RESULT:** PROPOSAL ONLY.

### F8 — Job IDs are wall-clock derived and can collide (PROVEN, low severity)

**WHY:** `RUN_ID=$(date +%Y%m%d-%H%M%S)-$SLUG`. Two `new-job.sh` invocations in the same second with the same brief slug produce the same filename; the second overwrites the first `.job.json`.

**EVIDENCE:** `~/workspace/pig-fb/new-job.sh`.

**MINIMUM CHANGE:** Append `$$` (PID) or a short random suffix to `RUN_ID`.

**TEST:** Run `new-job.sh` twice within one second; assert two distinct job files.

**RESULT:** PROPOSAL ONLY.

---

## Normalization conflicts (cross-envelope)

| # | Conflict | Envelopes | Severity |
|---|---|---|---|
| N1 | Two envelopes claim canonical event status; POST spine bypasses the kernel pipeline by documented decision | E1 vs E2 | HIGH |
| N2 | E1 identity hash uses non-canonical `JSON.stringify`; constitutional code uses `CanonicalBytes.serialize` | E1 vs E2/E4 | HIGH |
| N3 | Bridge re-identifies events (new `event_id`; original only in payload/metadata) | E1 vs E2 via EventBridge | HIGH |
| N4 | `aggregate_id`/`aggregate_type`: columns in E2, nested `metadata` in E1 | E1 vs E2 | MEDIUM |
| N5 | Reader accepts 4 payload keys / 3 ID keys / 5 timestamp keys; missing timestamp → epoch zero | E1/E2 rows vs adapter reader | MEDIUM |
| N6 | FYD overlay ops: same op vocabulary implemented twice (Python + TS); TS `set_field` mutates title/description directly while Python replay records via `updatedRefs` — same vocab, subtly different application semantics | E5/E7 producers vs two consumers | MEDIUM |
| N7 | Owner intent in two envelopes with unrelated IDs; auth marker rides inside the op | E7 vs E10 | MEDIUM |
| N8 | bff signature binds dev-serializer bytes, not constitutional bytes | E8 vs constitutional serializer | MEDIUM |
| N9 | Canonical object envelope bytes not content-determined (`created_at` in identity block) | E4 internal | LOW |
| N10 | Observation IDs timestamp-based (unstable); claim IDs content-based (stable) — mixed identity regimes in one lane | E12 internal | LOW |

---

## Classification rollup

| Classification | Envelopes |
|---|---|
| CANONICAL_LIVE | E1, E4, E10, E11 |
| CANONICAL_LAW (claimed, conflicting in practice) | E2 |
| ADAPTER (live seam/shape authority) | E6, E7, E8, E9, E13 |
| DERIVED | E5 |
| DORMANT | E12 |
| LEGACY | E3 |

## What was NOT proven (gaps for adjacent workers)

- Whether `FYD_SITE_OVERLAY` is registered in the main deployment's `event_registry.json` (dump.py cites FAILURE_LEDGER FL-20260921-231 saying it is not; an actual emit was not tested) — affects whether E7 can land on the main journal at all.
- Whether `mission_authority_v2` persists a defined mission-object envelope shape to `repository_events` (E13 core side).
- Behavioral verification of replay from either journal (EVIDENCE-OBJECT-INTENT already marks replay certificates BLOCKED).
- `EventValidator.isRegistered` vs `validateEventType` — only `isRegistered` exists in code; the `validateEventType` branch in `emit()` is defensive dead code.
- `canonical_object_authority.js` "Nothing else creates constitutional objects" — asserted, not exhaustively grep-verified across the core.

## Integrity

- Transport: `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "<cmd>"'`, batched, polite. Two transient SSH banner timeouts and one sandbox metadata-store timeout; all retried successfully. No pipes in remote commands (one earlier attempt with an unquoted pattern broke on cmd.exe quoting and was retried with single quotes).
- Repos: no writes made; no git mutation; no processes touched; no secret values recorded (bearer placeholders in `emit-overlay.py` are literal `<redacted>` strings in source comments).
- Live code over stale docs: all CORE claims cite `.js` files on the `refactor/runtime-authority-convergence` branch; stale top-level audit `.md` in `/home/nolan/ping` treated as pointers only.

---

## Next adjacent gap (for the coordinator)

**The replay/read seam: who reconstructs state from which journal, and with what ordering guarantee.** E1 rows have no `sequence` column — every overlay/journal reader orders by wall-clock `(timestamp, event_id)`, while E2 has per-object sequences and a hash chain. The natural follow-up is an inventory of read/replay authorities (`event_read_authority.js`, `EventBridge` cursors, `queryFydSiteOverlays`, `dump.py` journal selection incl. the main-vs-demo journal switch) mapping each consumer to its journal, its ordering key, and what happens on timestamp ties or clock skew. That is where N1/N3/N5 become live divergence rather than latent risk.
