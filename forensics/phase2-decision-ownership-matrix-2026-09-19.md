# PHASE 2 (25-phase): Decision Ownership Matrix — event authority convergence (2026-09-19)

Ground truth: Phase 0 scope pin (worktree /home/nolan/worktrees/constitutional-convergence-authority-law @ 98ef51c9c, clean). Phase 1 call-graph reverify (4 constructor injection sites in gateway/bootstrap/gateway_runtime.js:410/416/420/428, POST /canonical-events, dotted HPP types absent from the 233-type UER registry, AIWorkspaceAuthority wired but falsified as an envelope writer). All factual claims below cite file:line in that worktree. Cross-agent/secondary verification; not claimed as independent.

Governing law (Nolan, permanent): "Refactor authority, preserve mechanism." ONE DECISION -> ONE OWNER. ONE LOGICAL EVENT -> ONE CANONICAL IDENTITY. ONE AUTHORITATIVE RUNTIME COMMIT. MANY PRESERVED REPRESENTATIONS. UnifiedEventRuntime (UER) is the MAIN constitutional runtime Event Authority. CanonicalEventEnvelope and canonical_events SURVIVE with a narrower explicit role. No deletion of implementations, tables, history, or mechanisms.

## Reading the rows

- "UnifiedEventRuntime" column: what it actually decides TODAY in code.
- "CanonicalEventEnvelope" column: what it actually decides TODAY in code.
- "CONFLICT?": yes/no with one-line evidence. A yes means two components currently exercise the same decision; a no means only one (or none) does.
- "PROPOSED OWNER": the single owner under the corrected law.
- "ADAPTER-PROJECTION": what the non-owner becomes. Preservation, not deletion.

## Matrix

### 1. Event identity
- UER: mints `event_<16hex>` via IdentityAuthority.generateId('event', identityData) at emit step 4, AFTER validation fails closed; identity material = {event_type, source, namespace, logical_id|payload}; timestamp excluded; identity_version 2.0.0 in the hash preimage; F7/D1 value-domain rejection mints NO id (ping-runtime/events/unified_event_runtime.js:129-148; runtime/kernel/authorities/identity_authority.js:73-87).
- CanonicalEventEnvelope: generates UUID v5 (SHA1 over DNS namespace + `${tenantId}:${eventType}:${timestamp}:${sequence}`) at canonical_event_envelope.js:71-97, computed BEFORE validation (canonical_event_envelope.js:126-143).
- CONFLICT? YES. At the Phase 1 seam one logical business event receives the envelope UUID v5 at ingress and a second event_<16hex> at convergence via LegacyIngressAdapter (Phase 1: identity seam).
- PROPOSED OWNER: UnifiedEventRuntime via IdentityAuthority.
- ADAPTER-PROJECTION: the envelope UUID becomes envelope_id, a certified REPRESENTATION identity, never a second logical identity (Phase 4/5 work).

### 2. Event payload canonicalization
- UER: delegates to CanonicalBytes.serialize -> CanonicalAuthority.hashBytes (RFC-8785 path; identity_authority.js:54-61, 83-87). The spine canonicalizes; it does not invent a competing canonicalization.
- CanonicalEventEnvelope: none per event. It validates shape (executeValidateEvent, canonical_event_envelope.js:191-209) and hashes only its published authority CONTRACT (publishContract, canonical_event_envelope.js:377-393 via computeCanonicalHash).
- CONFLICT? NO. The envelope does not claim this decision.
- PROPOSED OWNER: CanonicalAuthority via UER (the canonical authority already selected by UER).
- ADAPTER-PROJECTION: envelope becomes a consumer of the certified representation; its shape validation survives as ingress-side validation mechanism.

### 3. Event persistence
- UER: single SQL writer; INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING; idempotent retry re-reads the stored row (unified_event_runtime.js:185-213).
- CanonicalEventEnvelope: INSERT INTO canonical_events ... ON CONFLICT (tenant_id, sequence) DO NOTHING (canonical_event_envelope.js:174-189); owns its own table DDL via database/canonical_events.sql.
- CONFLICT? YES. Two stores both persist "canonical" event rows; the adapter bridges them but reminting at convergence means two identities (see 1).
- PROPOSED OWNER: ping_events via UER. ONE authoritative runtime commit.
- ADAPTER-PROJECTION: canonical_events = UPSTREAM INGRESS STORE / LEGACY INGRESS SURFACE / COMPATIBILITY JOURNAL (MC-1 classification, already in legacy_ingress_adapter.js header). Converged via LegacyIngressAdapter; never deleted; no schema change.

### 4. Event ordering
- UER: PostgreSQL-allocated global sequence (nextval DEFAULT at insert; ALTER SEQUENCE ... OWNED BY; UNIQUE index). Contract: unique, monotonically allocated, NOT gapless, NOT commit order, NOT wall-clock, NOT causal; sequence is storage metadata assigned after identity, never an input to identity or hash (unified_event_runtime.js:79-106, 165-183). P0-certified (ce3f8687c5, Phase 0).
- CanonicalEventEnvelope: per-tenant MAX(sequence)+1 (getNextSequence, canonical_event_envelope.js:106-114). Its publishContract still guarantees "sequence is monotonically increasing per tenant" and "ordered" (canonical_event_envelope.js:353-375).
- CONFLICT? YES. Two different order semantics: global allocation position vs per-tenant MAX+1.
- PROPOSED OWNER: UER sequence authority.
- ADAPTER-PROJECTION: the envelope's per-tenant sequence survives as a representation field (adapter already preserves original_sequence in provenance metadata; legacy_ingress_adapter.js header). It must never be presented as the canonical order.

### 5. Event hash
- UER: no per-event hash column; identity derives from CanonicalAuthority.hashBytes via IdentityAuthority. ReplayCanonicalizerAuthority computes canonical hashes over replayed event sets (replay_canonicalizer_authority.js:63-68).
- CanonicalEventEnvelope: no per-event hash; only the authority contract hash (canonical_event_envelope.js:377-393).
- CONFLICT? NO. Neither stores a competing per-event hash. (gateway/constitutional_event_sourcing.js computes its own canonical_hash/witness_hash per event, but that module is dead in the live path; see Phase 11 doc.)
- PROPOSED OWNER: existing constitutional hash authority (CanonicalAuthority).
- ADAPTER-PROJECTION: both components consume CanonicalAuthority; no change.

### 6. Event provenance
- UER: records source + layered provenance at convergence: metadata {ingress_surface, adapter, adapter_version, original_event_id, original_event_type, original_source, original_timestamp, original_metadata, original_sequence, tenant_id, actor, event_version} (legacy_ingress_adapter.js: _convergeRow metadata, ~:268-284); causation_id/correlation_id passed through (unified_event_runtime.js:150-162).
- CanonicalEventEnvelope: records claimed source/actor, tenant_id, causation_id, correlation_id, event_version, metadata (canonical_event_envelope.js:126-189). Actor is CLAIMED, never verified (F3 frozen finding; same note in legacy_ingress_adapter.js header: "actor (claimed, NOT verified)").
- CONFLICT? YES. The envelope presents claimed actor/tenant provenance as authoritative envelope fields; convergence re-records them as claimed provenance layers.
- PROPOSED OWNER: UER with the adapter's provenance layers (preserve originals, mark claims as claims).
- ADAPTER-PROJECTION: envelope fields carried as original_* provenance; never treated as verified principals.

### 7. Event authentication
- UER: none. source is a free string; emit performs no principal authentication.
- CanonicalEventEnvelope: none. actor is accepted as given.
- CONFLICT? NO. Neither authenticates; both absent.
- PROPOSED OWNER: authenticated ingress -> UER (F3 reopened in a later phase; currently FROZEN).
- ADAPTER-PROJECTION: envelope's actor stays a claimed-provenance field; explicit UNKNOWN until F3 is addressed. No code may present it as authenticated.

### 8. Event certification
- UER: acceptance (emit returns status ok) is the de facto certification of the canonical event. Derived attestations: W-1A pipeline certifies REPLAY_COMPLETED, then WitnessWorker attests WITNESS_CREATED from the canonical row (ping-runtime/workers/canonical_workers.js:460-509).
- CanonicalEventEnvelope: no per-event certification. publishContract certifies the authority's contract, not events (canonical_event_envelope.js:377-393).
- CONFLICT? NO. The envelope certifies nothing per event.
- PROPOSED OWNER: UER (acceptance = certified accepted event; replay/witness attestations are derived certifications over canonical history).
- ADAPTER-PROJECTION: the envelope may certify REPRESENTATIONS of already-accepted canonical events (candidate Phase 3 role); it must never originate a certification claim for an unaccepted event.

### 9. Event replay eligibility
- UER: replay() is the canonical replay reader: read-only SELECT from ping_events WHERE sequence > cursor ORDER BY sequence ASC; never creates, rewrites, re-emits, or marks (unified_event_runtime.js:322-377).
- CanonicalEventEnvelope: no replay. Read APIs (executeQueryEvents, executeGetUnprocessed, canonical_event_envelope.js:226-260) query canonical_events rows; that is domain querying, not replay.
- CONFLICT? NO.
- PROPOSED OWNER: UER canonical history (ping_events, certified sequence order).
- ADAPTER-PROJECTION: envelope read APIs remain as domain read APIs over the ingress/journal store. They must not be presented as replay input.

### 10. Event mission triggering
- UER: EventToMissionBridge subscribes to UER event types and creates missions (ping-runtime/orchestration/event_to_mission_bridge.js:97-110). REPLAY_COMPLETED -> WITNESS_ATTEST is in EVENT_MISSION_MAP (:73-76).
- CanonicalEventEnvelope: none. No subscription surface, no trigger map.
- CONFLICT? NO.
- PROPOSED OWNER: canonical UER event stream.
- ADAPTER-PROJECTION: not applicable; the envelope never had this decision.

### 11. Event processing state
- UER: ping_events.processed column EXISTS (created in initialize, unified_event_runtime.js:62-78) and query() can filter unprocessed (unified_event_runtime.js:308-321), but NO code writes processed=TRUE on ping_events (repo-wide grep: writers target canonical_events, mission_events; none target ping_events). Today it is dead state in the canonical store.
- CanonicalEventEnvelope: executeMarkProcessed / executeMarkFailed mutate processed/processed_at/worker/retries/last_error on canonical_events rows (canonical_event_envelope.js:302-323). LegacyIngressAdapter reuses these same columns on canonical_events for convergence state with explicit per-row states UNPROCESSED/RETRYABLE/REJECTED/ACCEPTED (legacy_ingress_adapter.js:355-420).
- CONFLICT? PARTIAL. Same column semantics live in two stores; one is live operational state (canonical_events), the other is never written (ping_events).
- PROPOSED OWNER: UER owns the meaning of processing state for canonical events; canonical_events.processed is owned by the adapter as CONVERGENCE progress state, explicitly not acceptance (already the adapter's documented semantics).
- ADAPTER-PROJECTION: either ping_events.processed gets an explicit owner and writer in a later phase, or it is formally classified as unused/reserved. canonical_events.processed stays as the durable convergence marker. No semantic merge by accident.

### 12. Event witness creation
- UER: WitnessWorker derives attestations ONLY from verified REPLAY_COMPLETED ping_events rows (read via _readCanonicalReplayEvent, canonical_workers.js:497-509); emits WITNESS_CREATED via BaseWorker._emit through the UER emit path (canonical_workers.js:31-47); attestation identity passed as logical_id for idempotent retry (canonical_workers.js:474-480). The legacy WITNESS_CREATE command path is closed (rejected, canonical_workers.js:527-530).
- CanonicalEventEnvelope: none.
- CONFLICT? NO. The old kernel WitnessAuthority (runtime/kernel/authorities/witness_authority.js:30) is not referenced by unified_event_runtime.js or gateway/bootstrap/gateway_runtime.js (repo-wide grep returns no wiring).
- PROPOSED OWNER: witness input = verified replay / canonical event path only.
- ADAPTER-PROJECTION: the envelope cannot originate witness input; it may render certified representations of WITNESS_CREATED rows like any other accepted event.

### 13. Event lineage
- UER: getChildren / getDescendants / getAncestors / getCorrelationGroup traverse causation_id/correlation_id over ping_events with expression indexes (unified_event_runtime.js:379-531). Old kernel LineageAuthority (runtime/kernel/authorities/lineage_authority.js:27) is pure edge creation, not wired into the UER path.
- CanonicalEventEnvelope: stores causation_id/correlation_id as pass-through columns; no traversal, no lineage decision.
- CONFLICT? NO.
- PROPOSED OWNER: UER (lineage from the same runtime history; canonical IDs from the same store).
- ADAPTER-PROJECTION: the envelope's causation/correlation survive as the passthrough the adapter converges (baseOptions in legacy_ingress_adapter.js _convergeRow). Mixed-era lineage resolves through the historical data law (Phase 6 doc).

### 14. Certified envelope representation
- UER: none today. emit returns the in-memory event object; there is no separate certified representation layer.
- CanonicalEventEnvelope: builds the TenantOS envelope (canonical_event_envelope.js:126-189) and publishes guarantees (deterministic_id, immutable, ordered, tenant_isolated; canonical_event_envelope.js:353-375). These guarantees are currently asserted independently of UER.
- CONFLICT? YES, on the guarantees: "ordered" and "deterministic_id" are decided by the envelope's own UUID/MAX+1 machinery, competing with UER's certified sequence and IdentityAuthority IDs.
- PROPOSED OWNER: candidate CanonicalEventEnvelope as the CERTIFIED EVENT REPRESENTATION authority (preferred order from Phase 1: certified event representation / immutable envelope). Its mechanisms (validation, envelope construction, tenant metadata, serialization, provenance shaping, read APIs) are harvested; its independent truth decisions (UUID as identity, MAX+1 as order) are refactored away.
- ADAPTER-PROJECTION: UER's canonical event remains the logical event; the envelope renders the certified representation for tenants and consumers, deriving identity/order from the canonical event rather than minting its own.

### 15. Legacy/domain read representation
- UER: query() reads ping_events (unified_event_runtime.js:303-321).
- CanonicalEventEnvelope: executeQueryEvents / executeGetStats / executeGetUnprocessed read canonical_events; exposed over HTTP at POST/GET /canonical-events via gateway/routes/canonical_events.js:19 (mounted at gateway/bootstrap/gateway_runtime.js:696 per Phase 1). This is the producer-domain read surface.
- CONFLICT? YES if both are presented as canonical reads. Today canonical_events reads are producer-domain reads; the risk is presentational, not mechanical.
- PROPOSED OWNER: candidate canonical_events as LEGACY/DOMAIN READ REPRESENTATION (compatibility journal / domain projection / audit / migration-legacy; Phase 1 preferred order).
- ADAPTER-PROJECTION: reads remain fully functional, but every consumer-facing surface must distinguish them from canonical acceptance (the adapter's ACCEPTED/REJECTED markers are the machine-readable distinction; legacy_ingress_adapter.js PER-ROW STATES).

## Phase 1 seam facts incorporated

- Constructor injection sites (gateway/bootstrap/gateway_runtime.js:410 AIWorkspaceAuthority, :416 ReviewAuthority, :420 CustomerAuthority, :428 ProjectAuthority) are the producer migration seam for decisions 1, 3, 4, 14.
- POST /canonical-events (gateway/routes/canonical_events.js:19) is the fifth producer surface; it feeds decisions 3 and 15 and converges through the adapter.
- The registry gap (review.flagged, project.created, project.updated, project.artifact_added absent from gateway/generated/event_registry.json; UNREGISTERED_EVENT fails closed at ping-runtime/events/event_governance.js:185): today the dotted HPP types CANNOT migrate through UER emit without (a) a governance policy change (registry addition), (b) extension of the capability-bound compatibility exception, or (c) envelope-side delegation. This constrains decisions 1 and 8 for those types until governance rules.
- AIWorkspaceAuthority (ping-runtime/business/ai_workspace_authority.js:88, via :115/136/155/175) passes legacy-shaped params and every call throws at executeValidateEvent; it is not an effective writer today, so its seam row is wire-only (no live traffic to migrate).

## Unresolved items the matrix cannot close by itself

1. DOTTED-TYPE REGISTRY GAP (decisions 1, 8). Resolving requires a governance policy decision, not just code: register the 4 dotted types (+ the 3 uppercase customer types that are also absent: CUSTOMER_IMPORTED, CUSTOMER_EMAIL_SYNCED, CUSTOMER_CALENDAR_SYNCED per Phase 1's registry table) in event_registry.json, or extend the documented capability-bound exception. This is Nolan's call.
2. EVENT AUTHENTICATION (decision 7). Nobody authenticates principals today; F3 is frozen. The proposed owner (authenticated ingress -> UER) cannot be implemented until F3 is reopened. Until then the envelope's actor must be labeled claimed, never trusted.
3. ping_events.processed (decision 11). Either give it an owner and writer or formally classify it reserved/unused. Leaving dead state in the canonical store invites a future accidental semantic merge.
4. Consistency model (Phase 8) for decision 3/14: same-transaction derivation vs durable-derived with retry-same-identity. The matrix assigns ownership; the transactional boundary is a separate decision.
