# PHASE 2: Authority Matrix — the two live event authorities (2026-09-19)

Built from the Phase 1 call-site trace (phase1-two-authority-reverify-2026-09-19.md), which traced actual reachable call sites from gateway/server.js -> gateway/bootstrap/gateway_runtime.js, cross-checked against the live Pig container. Convergence law applied: ONE AUTHORITY PER DECISION, not one implementation for everything. Nothing here is chosen by naming or intuition; every row cites the traced semantics.

No em dashes are used in this document.

## The two paths (established)

- PATH A: UnifiedEventRuntime.emit() -> ping_events. Single SQL writer (unified_event_runtime.js:245). Identity: event_<16hex> via IdentityAuthority, RFC-8785 canonical bytes, timestamp excluded from preimage, validate-before-mint. Ordering: PostgreSQL sequence nextval, certified allocation-position contract. All downstream consumers (mission, replay, witness, lineage, projection) read ping_events only.
- PATH B: CanonicalEventEnvelope.executeEmitEvent() -> canonical_events. Single SQL writer (canonical_event_envelope.js:174). Identity: UUID v5 (SHA-1) over tenantId:eventType:timestamp:sequence, timestamp IN preimage, nondeterministic across re-emits. Ordering: per-tenant MAX(sequence)+1, race-prone. No reachable consumer except the envelope's own operational reads and the convergence adapter's work poll.
- BRIDGE: LegacyIngressAdapter (worktree, wired, started) converges canonical_events rows into ping_events via idempotent re-mint, preserving provenance (field mapping in Phase 1 doc). The live container runs the retired old EventBridge (PRESERVED_INACTIVE in worktree), which drops provenance; that bridge is not the convergence path.

## Authority matrix

| # | DECISION | UnifiedEventRuntime | CanonicalEventEnvelope | CONFLICT? | PROPOSED OWNER | ADAPTER / PROJECTION |
|---|---|---|---|---|---|---|
| 1 | event identity | event_<16hex>; IdentityAuthority.generateId; RFC-8785 canonical bytes; timestamp excluded; validate-before-mint; deterministic and idempotent (same logical event -> same ID; retries converge; ON CONFLICT DO NOTHING works) | UUID v5 (SHA-1, DNS namespace) over tenantId:eventType:timestamp:sequence; timestamp IN preimage; re-emission of the same logical event mints a NEW id (true duplicates) | YES, genuine | UnifiedEventRuntime | The CEE UUID is retained as the ingress receipt identifier: payload._canonical_event_id + metadata.original_event_id on the converged ping_events row. No second acceptance identity is ever minted. The adapter remint is the bridge. |
| 2 | event payload canonicalization | RFC-8785 via CanonicalJson/CanonicalAuthority at the single emit choke point, before identity | Field-presence validation only (executeValidateEvent); no canonicalization of payload bytes; no canonical hash | NO (only UER claims it) | UnifiedEventRuntime | CEE validation stays as the ingress contract (schema gate), not a canonicalization authority. |
| 3 | event persistence | INSERT INTO ping_events; ON CONFLICT (event_id) DO NOTHING; PG-allocated sequence; durable | INSERT INTO canonical_events; ON CONFLICT (tenant_id, sequence) DO NOTHING; per-tenant MAX+1 | STRUCTURAL: two durable journals exist | ping_events is the journal of accepted truth ("what PING accepted as having happened"). canonical_events is the ingress receipt journal ("what a producer asserted"), explicitly NON-CANONICAL UNTIL CONVERGED (the adapter's own classification). | LegacyIngressAdapter is the single convergence mechanism. Every canonical_events row reaches exactly one terminal state: ACCEPTED (converged to exactly one ping_events row) or REJECTED (durable, never confused with acceptance). |
| 4 | event ordering | PG sequence nextval; global allocation position; certified contract (not gapless, not commit order, not wall-clock, not causal; excluded from identity and hash) | Per-tenant MAX(sequence)+1; read-modify-write; no lock; collisions absorbed by ON CONFLICT DO NOTHING (silently drops the later row) | YES if conflated; NO once scoped | UER owns canonical event order (the only order mission/replay/witness may rely on). CEE owns tenant-scoped receipt order for its own operational reads (unprocessed queue). | Law: never read canonical_events.sequence as canonical order. |
| 5 | event hash | CanonicalAuthority.hashBytes over RFC-8785 canonical bytes (identity and hash share the pipeline) | None. UUID v5 is an identifier, not a content hash (SHA-1 over a formatted name string, not over canonical content). | NO | UnifiedEventRuntime (via CanonicalAuthority) | None needed. |
| 6 | event provenance | source (producer-claimed, not authenticated); causation_id/correlation_id in metadata; namespace; original_* fields for converged rows | source, actor, tenant_id as top-level columns; causation_id/correlation_id as top-level columns; all producer-claimed | PARTIAL (different stages of the same event's life) | Split by stage: CEE owns ingress-asserted provenance (what the producer claimed); UER owns acceptance provenance (what PING recorded). | The adapter's remint field mapping is the provenance bridge (already implemented, Phase 1 doc): source preserved, tenant->namespace tenant::<id>, causation/correlation passed through, originals in metadata. Nothing is dropped by the worktree adapter. |
| 7 | event authentication | EventGovernance validation at the emit choke point; bearer auth on POST /events (exteriorAuthMiddleware) and POST /missions (W-1A); source string is producer-claimed | Schema validation only; actor producer-claimed ('system' in all wired authorities); the live old bridge honors _skipGovernance unconditionally (retired defect, not authority) | NO | UER's governance choke point owns acceptance authentication. | CEE validation is an ingress schema gate only. It authenticates nothing. |
| 8 | event certification | P0 certified acceptance path: PG sequence + certified replay reader + idempotent identity. Certification means "PING accepted this as having happened." | No certification semantics. It records receipt of a producer assertion, nothing about truth. | NO once named precisely | UnifiedEventRuntime | The word "certification" applies only to ping_events acceptance records. Do not call CEE receipt "certification of truth". |
| 9 | event replay eligibility | Certified replay({afterSequence, limit, consumer}) reader exists but has ZERO production callers; the exercised kernel (DeterministicReplayEngine) replays transcripts, not the journal reader. Available but unwired. | No replay consumption; the envelope's ordered queries are read APIs, not replay. | NO | UnifiedEventRuntime owns replay eligibility (the journal replay reads). | Known gap (actionable, separate track): the certified journal reader is unwired. Not a two-authority conflict. |
| 10 | event mission triggering | EventToMissionBridge subscribes in-memory to UER dispatches; creates missions per EVENT_MISSION_MAP. The ONLY mission path. | FALSIFIED that any direct canonical_events -> mission path exists. Missions happen only after convergence into ping_events. | NO | UnifiedEventRuntime (via the bridge) | Law: missions are created from accepted events only; a canonical_events row is never mission-eligible until converged. |
| 11 | event processing state | processed boolean on ping_events (default FALSE; emit never sets TRUE) | processed + processed_at + worker + retries + last_error on canonical_events; the adapter's work-selection primitive | NO (per-table operational state) | Each table owns its own processing state. | Law: canonical_events.processed=TRUE means "converged or rejected by the adapter", never "accepted as canonical". |
| 12 | event witness creation | WitnessWorker authenticates REPLAY_COMPLETED against the canonical ping_events row (W-1A: canonical_workers.js:501-515). Sole WITNESS_CREATED emitter. | No witness path reads canonical_events. | NO | UnifiedEventRuntime | Law: witness attests accepted events only. W-1A is compatible with this law (it reads the canonical journal; the envelope is not a witness source). |
| 13 | event lineage | Causal traversal (getChildren/getDescendants/getAncestors/getCorrelationGroup) on ping_events; mission correlation reads. | causation_id/correlation_id columns exist; zero reachable consumers. | NO | UnifiedEventRuntime | The adapter passes causation/correlation through, so lineage survives convergence. |

## Reading the matrix

Genuine conflicts: exactly three, and they are the same structural question asked three ways: identity (row 1), ordering (row 4), persistence (row 3). Every other row has a single natural owner once the decision is named precisely. The resolution for all three is one structural answer:

**Model B: canonical journal + envelope/ingress authority.**

- ping_events (via UnifiedEventRuntime) is the canonical journal: identity, canonicalization, hash, ordering, certification, replay eligibility, mission triggering, witness, lineage.
- canonical_events (via CanonicalEventEnvelope) is the ingress receipt journal: producer-surface validation, tenant-scoped receipt ordering, ingress-asserted provenance. It is explicitly non-canonical until converged.
- LegacyIngressAdapter is the single deterministic convergence mechanism: ingress receipt -> canonical acceptance, idempotent by identity, provenance-preserving, with durable per-row ACCEPTED/REJECTED terminal states.

This is not choosing a winner by intuition. It follows from the call graph: every downstream constitutional consumer (mission bridge, witness worker, lineage traversal, projection workers, evidence authority) reads ping_events; nothing constitutional reads canonical_events. The envelope's own name ("Canonical") notwithstanding, the code proves it canonicalizes nothing, certifies nothing, and authenticates nothing; it receives, validates shape, and receipts. Naming does not establish authority; the call graph does.

## Convergence hypotheses (Phase 3 decision)

Hypothesis 1 (envelope upstream of UER: producers -> CEE -> canonical_events -> adapter -> UER -> ping_events -> downstream): VALID. This is exactly what the traced call graph shows.

Hypothesis 2 (UER emits canonical runtime event; envelope produces a certified immutable representation in canonical_events afterwards): FALSIFIED by the call graph. The envelope never consumes ping_events; the adapter flows the other direction. There is no code path that would implement Hypothesis 2.

Therefore the retained architecture is Hypothesis 1, with "certifies" precisely scoped: the envelope performs ingress receipt validation (shape, tenant, receipt identity, receipt order), NOT truth certification. Truth certification happens once, at UER acceptance.

## Round-trip relationship (Phase 4 proof)

The deterministic relationship already exists in the worktree adapter; no second random identity is invented:

- Given ping_events.event_id X: read X's metadata.original_event_id (and payload._canonical_event_id) -> the canonical_events row (UUID v5 receipt id).
- Given canonical_events.event_id Y: read Y's metadata.legacy_ingress -> {disposition: ACCEPTED|REJECTED, canonical_event_id (the ping_events event_<16hex>), accepted_at}. ACCEPTED gives the ping_events row; REJECTED terminates with no canonical row, by design.
- Preserved across the bridge: event_type (verbatim), source (true origin), tenant_id (as namespace tenant::<id> plus provenance), actor (as provenance), timestamp (as metadata.original_timestamp; the ping_events timestamp is re-assigned at acceptance), per-tenant sequence (as metadata.original_sequence), causation_id/correlation_id (passed through), payload (merged with ingress identity keys), original metadata (as metadata.original_metadata), event_version (as metadata.event_version).
- Lost by design: the UUID as an identifier (replaced by the V2 acceptance identity), the original timestamp as the event timestamp, the per-tenant sequence position (replaced by the PG-allocated global position), upstream "processed" claims.

Smallest additive bridge required: NO schema change. The schemas already express the relationship via metadata. What is missing is (a) the relationship as a first-class read-only API instead of ad-hoc metadata reads, and (b) an enforced invariant that no new canonical_events consumer bypasses convergence. Both are additive: two read-only resolver methods plus invariant tests.

## No dual-write (Phase 5 compliance)

There is exactly one writer per table and one convergence direction. No try-write-both exists or is proposed. The canonical authority (UER -> ping_events) commits once per acceptance. The ingress receipt (CEE -> canonical_events) is written once at ingress; that is the receipt, not a second canonical commit. The adapter's convergence emit is idempotent by identity: the same canonical_events row always re-mints the same event_<16hex> (the ingress receipt id is inside the identity preimage via payload._canonical_event_id), so a crash between emit and mark-accepted safely retries into ON CONFLICT DO NOTHING. Partial failure is unambiguous: unprocessed rows are retried, rejected rows are terminal, accepted rows are exactly-once by identity.

## What the implementation unit must establish (Phase 14 scope)

1. The law above, as a durable document in the repo (additive).
2. Two read-only round-trip resolvers (additive, no behavior change).
3. Invariant tests enforcing: one SQL writer per table; no reachable canonical_events -> mission/replay/witness consumer; convergence preserves provenance and is idempotent; round-trip resolvers return the linked rows.
4. W-1A compatibility statement (Phase 13): W-1A operates strictly on the acceptance side (witness authenticates ping_events rows); it neither touches canonical_events nor creates a second path. Compatible.

Explicitly out of scope for this unit: changing the read path (EventReadAuthority -> repository_events with ping_events fallback; ugly but not a second authority), wiring the certified replay() reader (separate actionable gap), any Oracle deployment (blocked on the operator's coexistence decision), any change to the ConstitutionalEventSourcing dead switch (PRESERVED_INACTIVE).
