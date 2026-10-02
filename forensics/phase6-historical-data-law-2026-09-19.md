# PHASE 6 (25-phase): Historical Data Law — the eras and how to read them (2026-09-19)

Durable law for the event authority convergence. This document does not change code; it states the rules that every reader, writer, adapter, replay, witness, and lineage traversal must obey when history spans multiple identity and representation eras.

Ground truth: worktree /home/nolan/worktrees/constitutional-convergence-authority-law @ 98ef51c9c. Governing law (Nolan, permanent): "Refactor authority, preserve mechanism." No deletion of history, tables, or implementations. No em dashes used in this document.

## The first law

Old data is EVIDENCE. It is never destroyed, rewritten, recomputed, or normalized.

Concretely:
- No recomputation of old identity values. Era H 64-hex IDs stay exactly as stored (runtime/kernel/authorities/identity_authority.js:35-39: "Era H (stored 64-hex IDs) and V1 (zero persisted rows) are never rewritten").
- No rewriting of canonical_events UUIDs. Every canonical_events.event_id row keeps its stored UUID v5 byte-for-byte, forever.
- No rewriting of historical ping_events identities. An accepted row's event_id is immutable; convergence and backfill may ADD annotations, never change the identity.
- No destructive normalization. Tenant-scoped sequence numbers, per-tenant rows, old payload shapes, old metadata shapes: all preserved as recorded.

## The era mechanism

New records carry explicit version fields. Historical records keep their original semantics and are INTERPRETED per their era by every reader.

### Version fields on new records

- identity_version: the IdentityAuthority version in the ID preimage. V2 = '2.0.0' (runtime/kernel/authorities/identity_authority.js:38, 77-79). New UER events mint IDs under 2.0.0.
- envelope_version: the canonical envelope authority version. CanonicalEventEnvelope._authorityVersion = '1.0.0' (gateway/canonical_event_envelope.js:29); canonical_events.event_version column already defaults to '1.0.0' (database/canonical_events.sql:8).
- canonicalization_version: the canonical-bytes/canonical-hash rule version used to build the representation. Stored on representations, not on the logical event.

### Era detection for historical rows

A reader distinguishes eras by the identity SHAPE, then by stored version fields. Identity shape is the primary discriminator because old rows have no version columns:

| Era | Identity shape | Stored version | Interpretation |
|---|---|---|---|
| Era H | 64-hex (no prefix), from the old 64-hex identity path | none (NULL) | Legacy pre-convergence identities. Never recomputed. Ordering evidence: whatever the row's own fields say; do not invent sequence positions. |
| Era V2 | `event_<16hex>`, self-identifying prefix | identity_version 2.0.0 in the preimage (not a column today; see additive fields below) | Canonical logical identity. Identity = {event_type, source, namespace, logical_id|payload} canonicalized via CanonicalBytes (RFC-8785), hashed via CanonicalAuthority.hashBytes. Timestamp is observation metadata, never identity input. |
| Envelope era (canonical_events) | UUID v5 (xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx) | event_version '1.0.0' (column exists, database/canonical_events.sql:8) | REPRESENTATION identity, not a second logical identity. envelope_id semantics: identifies the envelope rendering of an ingress event. Canonical identity for the logical event is assigned only at convergence (UER emit -> event_<16hex>). |
| Constitutional-sourcing era | identityAuthority.generateId('event', ...) producing `event_<16hex>`-style IDs in the constitutional_events table | none | DEAD lineage. gateway/constitutional_event_sourcing.js is not reachable from the live boot path (see Phase 11 doc). Rows in constitutional_events, if any exist anywhere, are forensic evidence only; they never enter UER replay, witness, or lineage. |

### Nullable additive fields

Historical rows get NULL version fields, and NULL means "era detected by identity shape, interpreted under original semantics". Additive fields must be NULLABLE and must never backfill a version onto an old row:

- ping_events: additive nullable columns (proposed, not yet implemented): identity_version VARCHAR, envelope_version VARCHAR, canonicalization_version VARCHAR. Era H rows keep these NULL. NULL = interpret by identity shape (64-hex => era H semantics).
- canonical_events: event_version already exists ('1.0.0' default). The adapter's convergence markers live in metadata.legacy_ingress (disposition, canonical_event_id, exception, accepted_at, adapter_version) rather than in schema changes, and that pattern continues: additive JSONB markers, no destructive column rewrites.
- The adapter's cross-reference is the durable bridge between eras: canonical_events.metadata.legacy_ingress.canonical_event_id (forward: envelope-era UUID -> canonical V2 ID) and ping_events.metadata.original_event_id (reverse: V2 ID -> original envelope-era UUID). This is the deterministic both-directions mapping Phase 5 needs, and it exists today (legacy_ingress_adapter.js: _markAccepted, _convergeRow metadata).

## What "interpretable" means for each consumer

### Replay over mixed-era history

UER.replay() reads ping_events ORDER BY sequence ASC (ping-runtime/events/unified_event_runtime.js:322-377). The certified sequence is a database allocation position; pre-sequence rows were deterministically backfilled ORDER BY timestamp, event_id and are classified LEGACY BACKFILL ORDER, not proven historical execution order (unified_event_runtime.js:87-106). Interpretability rule:

- A replay consumer MUST NOT treat the replay order of era-H backfilled rows as proven causal or wall-clock order. It is the strongest stable storage evidence available, labeled as such.
- Gap tolerance: sequence gaps are normal (allocation positions consumed by conflicts/rollbacks); a gap is never a defect and never triggers repair writes.
- canonical_events rows NEVER enter UER replay until converged through the adapter into ping_events. An unconverged canonical_events row is ingress evidence, not replay input.
- Replay NEVER writes: no marking, no re-emission, no state changes on either store (UER replay contract).

### Witness over mixed-era history

WitnessWorker authenticates the trigger ONLY against the canonical ping_events row and requires event_type REPLAY_COMPLETED (ping-runtime/workers/canonical_workers.js:460-509). Interpretability rule:

- A witness attestation over a mixed-era replay is valid only if every event in the attested range is a canonical ping_events row (any era) with a certified sequence position. Era does not disqualify; absence from ping_events does.
- The attestation binds witness_root + the canonical replay event_id; era is provenance context, never a trust input. The W-1A attestation algorithm/version fields (witness-attest/v1, witness-input/v1 at canonical_workers.js:456-457) are versioned independently of identity eras.
- The legacy WITNESS_CREATE command path stays closed (canonical_workers.js:527-530). No mixed-era exception reopens it.

### Lineage over mixed-era history

UER lineage traversal (getChildren/getDescendants/getAncestors/getCorrelationGroup, unified_event_runtime.js:379-531) joins on causation_id/correlation_id and event_id as opaque strings. Interpretability rule:

- Lineage is era-agnostic: edges are string joins, and the adapter carried the original IDs forward (payload._canonical_event_id, metadata.original_event_id) so envelope-era and V2-era rows resolve through the cross-reference.
- Causation chains that cross the ingress boundary resolve as: canonical_events row (envelope-era UUID) -> metadata.legacy_ingress.canonical_event_id -> ping_events row (V2 event_<16hex>) -> descendants in ping_events.
- Unknown or missing cross-references are reported as INCOMPLETE LINEAGE, never silently bridged. A lineage walk that cannot resolve an era boundary returns the boundary as a finding, not as an error and not as a fabricated edge.

## Reader obligations (durable)

1. Every reader of either store must implement era detection by identity shape first, version field second. Code that pattern-matches only one era shape is a defect.
2. Every reader must treat a NULL version field as "historical; original semantics apply", never as "default to the current version".
3. No reader may write a version onto a historical row as a side effect of reading. Reads are read-only with respect to era metadata.
4. No migration may change a stored event_id, event_type, or the identity-relevant payload of a historical row. Additive annotation only.
5. The adapter's documented compatibility exception (capability-bound registry exception) applies to convergence acceptance of unregistered legacy types; it never changes the era interpretation of the row. An exception-accepted row keeps its original envelope-era UUID and gains a V2 canonical ID, with both recorded.

## What this law forbids, restated for operators

- Rewriting canonical_events.event_id values to V2 IDs (they become envelope_id explicitly).
- "Fixing" era H 64-hex IDs by reminting them as event_<16hex> (reminting is exactly the defect Phase 10 removes).
- Backfilling sequence positions onto canonical_events rows to make them look like UER-ordered events (order authority belongs to UER; the envelope's per-tenant sequence is representation metadata).
- Deleting canonical_events, constitutional_events, mission_events, or any historical table to "simplify" the architecture (preservation law).
- Interpreting the absence of a version field as version 1.0.0/2.0.0 of anything (NULL means historical, interpret by shape).
