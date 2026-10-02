# EVENT AUTHORITY FORENSICS - Phase 0 (read-only)

Produced 2026-09-23 night shift. Sources: read-only greps/reads on the Pig via
pigwsl-exec.sh, plus read-only `docker exec` introspection of the live
`ping-gateway` container. Zero writes performed to any repo.

Headline: the proven canonical event authority is NOT in the
/home/nolan/projects/ping checkout. It lives inside the `ping-gateway`
container image at /app (a fuller tree than the constitutional-runtime
checkout on the Pig). The checkout trees are clients, adapters, legacy
duplicates, or dead interfaces. Classification table below with file:line
evidence for each.

Repo states at time of trace:
- /home/nolan/projects/ping: branch fyd-factory, HEAD e48ef710cb889bf4d59b833ef9766067a9e2bbf0, dirty
- /home/nolan/projects/constitutional-runtime: exists (partial mirror of container /app)
- ping-gateway container: Up 34h; /app tree = live implementation
- ping-postgres container: Up 34h (the journal's Postgres)
- Repo-booted FYD gateway at 127.0.0.1:18199: NOT RUNNING (no listener, no source on Pig)

## The 8 WHO answers

### WHO CREATES EVENT ID?
`UnifiedEventRuntime.emit()` - deterministic SHA-256 hex over
`JSON.stringify({eventType, source, [namespace], logical_id|payload})`,
deliberately no timestamp, so the same logical event always yields the same
ID and duplicate delivery converges on one row.
Evidence: container ping-gateway:/app/ping-runtime/events/unified_event_runtime.js:86-91.

Python constitutional path: `EventEnvelope.create()` mints event_id as
`CanonicalAuthority.hash_dict()` over the domain-identity fields
(event_type, event_category, occurred_at, correlation/causality/producer IDs,
schema_version, aggregate_sequence/version, stream_version, payload);
the `verify_event_id` pydantic validator rejects any envelope whose
event_id does not recompute.
Evidence: /home/nolan/projects/constitutional-runtime/constitution/models/event.py:7
(class EventEnvelope), verify_event_id validator (~line 46-66), create() (~line 87).

Consequence: event IDs are content-addressed in both live paths. No UUIDs on
the canonical path (the UUIDv4 generator in the PING site repo is legacy, see
table).

### WHO HASHES?
JS live path: node:crypto SHA-256 inside `emit()` (same file, line 91).
The central hashing/serialization authority exists as
`CanonicalAuthority` + `CanonicalBytes`
(container /app/runtime/kernel/authorities/canonical_authority; gateway shim at
/app/ping-runtime/authorities/canonical_authority.js, 73 lines) and is used by
the kernel `EventRepository` (hash-chain fields PreviousEventHash,
CanonicalEventHash, chain_root).

Python path: `constitution.authority.canonical_authority.CanonicalAuthority`
(/home/nolan/projects/constitutional-runtime/constitution/authority/canonical_authority.py:69)
- "Single sovereign authority - no sub-authorities". `hash_dict` /
`hash_string` / `hash_bytes` re-exported via constitution/hashing.py from
constitution/authority/internal/canonical_hash.py. `HashAuthority` exists at
constitution/authority/hash_authority.py (SHA256_V1) and is composed inside
CanonicalAuthority. `CanonicalHasher` at constitution/canonical_serialization.py:124.

Drift note: emit() hashes over `JSON.stringify(identity)` - NOT over the
canonical serializer output - while the kernel EventRepository uses
CanonicalBytes/CanonicalAuthority. Two serialization regimes feed ID/hash
material on adjacent paths. FYD's bff-envelope@1 uses a third (sorted-key
recursive JSON via src/lib/ping/dev-signer.ts canonicalizeJson). See Seams.

### WHO SEQUENCES?
The live JS spine (`ping_events`) has NO sequence column. Ordering is via
`timestamp`/`created_at` (DDL at unified_event_runtime.js:52-74;
causal ordering via metadata->>causation_id expression index).
The kernel `repository_events` table has a per-object INTEGER `sequence`
(DDL in container /app/runtime/kernel/event_repository.js:29).
The Python constitutional path sequences via the Postgres DB sequence
`global_sequence_seq` (server_default on Event.global_sequence;
storage/postgres/models.py:9 and :37; field comment: "assigned by database").
The FYD repo-booted gateway (18199, currently down) exposes a `sequence`
field in its journal reads (PING repo src/fyd/social/readers.ts:32
`asSequence`) - its minting logic is UNKNOWN (see Seams).
The PING site repo editor has a fourth: in-memory `SequenceAuthority`
(singleton counter with a test-only reset(); src/lib/editor/sequence-authority.ts:31).
Four sequencing models coexist; the live spine deliberately has none.

### WHO PERSISTS?
`UnifiedEventRuntime.emit()` step 5:
`INSERT INTO ping_events (event_id, event_type, source, timestamp, payload,
metadata, namespace) VALUES (...) ON CONFLICT (event_id) DO NOTHING`
(container unified_event_runtime.js:162-167). Pool = Postgres
(ping-postgres). DDL is self-bootstrapped in `initialize()` (lines 52-74).
Duplicate delivery: rowCount==0 -> deduplicated counter, early return BEFORE
handlers/integrations (lines 173-178), so redelivery never re-triggers
side effects.

Python path: `PostgresEventRepository.append_event`
(constitutional-runtime/storage/repositories.py:48-99) - dup check via
SELECT, INSERT EventModel, plus transactional outbox row
(OutboxMessage, topic `constitutional.events.<event_type>`).
The kernel JS `EventRepository` persists `repository_events`
(container /app/runtime/kernel/event_repository.js).

Table inventory on the canonical DB: `ping_events` (live spine),
`repository_events` (kernel, being converged), `canonical_events` (business
events, bridged), `event_processing` (worker processing markers),
`repository_objects` (RepositoryStore, non-event objects), plus Postgres-side
OutboxMessage. In the Pig-checkout inference gateway: a separate `events`
table with two incompatible writer schemas (self-documented - see table).

### WHO READS?
- `EventReadAuthority` (kernel;
  container /app/runtime/kernel/event_read_authority.js:39 getAllEvents)
  reads `repository_events` (SELECT event_id, event_type, timestamp,
  object_id as stream, aggregate_type, payload). The gateway shim at
  /app/ping-runtime/events/event_read_authority.js (24 lines) re-exports it.
- Gateway routes GET /events, /events/recent, /events/stats
  (container /app/gateway/routes/events.js:17-86) read via
  eventReadAuthority with a pool fallback `SELECT * FROM ping_events`.
- FYD site: `readJournalEvents` (PING repo src/fyd/social/readers.ts:38-62)
  GETs `/events/<TYPE>` on the repo-booted gateway and derives net state
  with last-wins ordering (sequence DESC, created_at DESC, event_id DESC);
  `readSocialState`, feed, like/follow projections all build on it.
- PING repo `src/lib/ping/ping-object-reader.ts` reads objects from the
  gateway journal.
- Python: `PostgresEventRepository.load_events/load_stream/load_all`
  (repositories.py), ordered by global_sequence.

### WHO STREAMS?
JS live path - in-process, no message bus found in the container:
(a) handlers subscribed via `runtime.on(eventType, handler)`, dispatched on
first delivery only (unified_event_runtime.js:181-190);
(b) `IntegrationManager.emit(event_type, payload)` step 7 (lines 193-199);
(c) `EventBridge` (ping-runtime/events/event_bridge.js:1-19) polls
`repository_events` + `canonical_events` every 5s with per-source
last-event_id cursors and re-emits through UnifiedEventRuntime into
`ping_events` - the convergence mechanism.
No NATS client in the JS container tree.

Python path: transactional outbox (OutboxMessage rows in the same Postgres
transaction as the event) + `EventBus.project_new_events()`
(transport/event_bus.py:8) projecting the event log to NATS with
`_last_published_sequence` cursor. `runtime/messaging/outbox.py` is a
separate SQLite outbox (UNWIRED - see NEXT).
### WHO REPLAYS?
JS side: causal-graph replay queries on the spine -
`getChildren` / `getDescendants` / `getAncestors` / `getCorrelationGroup`
(container unified_event_runtime.js:252-358), all walking
metadata->>causation_id / correlation_id with created_at ordering.
`replay_worker.py`, `projection_replay.py` (container /app) and the truth
matrix record a captured 2026-09-16/17 replay chain (playbook -> mission ->
REPLAY_VERIFY -> REPLAY_COMPLETED -> WITNESS_CREATED) verified by
DeterministicReplayEngine with ReplayWitness attestation.

Python side: `ReplayEngine.replay_from_transcript`
(constitutional-runtime/kernel/replay.py:1-40) - pure function over
ReplayTranscript -> ReplayWitness via CanonicalAuthority.compute_witness;
`runtime/replay/replay_verifier.py`; `PostgresEventStream`
(storage/postgres/event_stream.py) implements the kernel EventStream
interface so replay depends on the interface, not the DB;
tests/test_replay_harness.py.

FYD site: projections rebuilt by re-reading the journal (proceduralize
generator; social readers' last-wins netting). Determinism note from the
truth matrix: the deployed event identity formula differs from the inspected
source per known-vector self-test (d1b47668...) - the container image was
built from a fuller tree than any Pig checkout.

### WHO MAY WRITE?
Canonical spine (proven live, Bearer <redacted>): POST /events on the gateway
(container /app/gateway/routes/events.js:87-139) - tenant registry check,
`authorizeNamespace` (namespace syntax core::<name> | tenant::<id>),
`EventGovernance.validateEvent` at emit step 3
(unified_event_runtime.js:110-128), then emit(). Response: {event_id,
event_type, status:'ok'}.
Also: anything holding a UnifiedEventRuntime instance calling emit()
(in-container workers/adapters via routes: only events.js matched
`eventRuntime.emit` under /app/gateway/routes/).

Python constitutional path: `EventApplicationService.create_event`
(application/event_service.py:24) ("owns canonical serialization, hashing,
duplicate detection"), `runtime/event_emitter.py:emit_event`
(best-effort, "mirrors the /events POST path"), `kernel/aggregate.py`,
`runtime/loop.py`, `storage/event_store.py`,
`capabilities/github/acquire_repository.py` via append_event.

FYD social path: signed bff-envelope@1 envelopes (Ed25519 by the FYD dev
identity over canonical bytes of {type, payload, metadata};
PING repo src/fyd/social/envelope.ts:55-93) POSTed to the repo-booted
gateway /events (src/fyd/social/config.ts:13-19); the gateway mints
event_id/sequence and attests by re-reading the journal
(attestation-gate.ts). Client-side C1 dedup uses content-hash action IDs
(fyd-social@1; transition-id.ts:18-30) but the journal event ID is
gateway-minted.

Explicitly NOT the canonical spine (do not wire new writers to these):
- Pig-checkout inference gateway POST /api/v1/events
  (constitutional-runtime/gateway/server.js:511-523) writing canonical_state
  columns into the same `events` table the GET routes read with PING-schema
  columns - self-documented "known architectural inconsistency" (line 509).
- `gateway/event_emitter.js:81` INSERT INTO events (stream, event_type,
  payload, created_at) - the other half of that inconsistency.
- HPP `logEvent` (PING repo src/lib/events.ts:234) - in-memory, UUID IDs.
- Editor `event-system`/`durable-event-store` (PING repo src/lib/editor/) -
  in-memory singleton.

## Classification table

| Component | Class | Evidence |
|---|---|---|
| UnifiedEventRuntime (container /app/ping-runtime/events/unified_event_runtime.js) | CANONICAL_AUTHORITY | Header: "Single canonical event pipeline. Every event flows through here." Owns ID creation (sha256 content hash), persistence (ping_events, ON CONFLICT DO NOTHING), dedup, dispatch, causal replay queries. |
| EventWriteAuthority path (POST /events -> authorizeNamespace -> EventGovernance -> emit) | CANONICAL_AUTHORITY | container /app/gateway/routes/events.js:87-139; governance at unified_event_runtime.js:110-128. |
| EventReadAuthority (kernel + gateway shim) | CANONICAL_AUTHORITY | container /app/runtime/kernel/event_read_authority.js:22-; shim at /app/ping-runtime/events/event_read_authority.js (24 lines, pure delegation). |
| CanonicalAuthority + CanonicalBytes (JS kernel) | CANONICAL_AUTHORITY | container /app/runtime/kernel/authorities/canonical_authority; "Single sovereign authority - no sub-authorities". |
| CanonicalAuthority (Python) | CANONICAL_AUTHORITY | constitutional-runtime/constitution/authority/canonical_authority.py:69; hash_dict used by EventEnvelope.create/verify. |
| ConstitutionalTimeAuthority | CANONICAL_AUTHORITY | emit() line 25, 148; read routes. |
| EventGovernance (JS) | CANONICAL_AUTHORITY | emit step 3; namespace is the canonical privacy boundary (core::<name> \| tenant::<id>). |
| HashAuthority (Python) | CANONICAL_AUTHORITY (composed) | constitution/authority/hash_authority.py; composed inside CanonicalAuthority (SHA256_V1). |
| EventBridge | ADAPTER | /app/ping-runtime/events/event_bridge.js:1-19; polls repository_events + canonical_events, re-emits via UnifiedEventRuntime. Convergence, not authority. |
| PostgresEventRepository (Python) | ADAPTER | storage/repositories.py:48; implements EventRepository ABC; dup-check + transactional outbox. |
| PostgresEventStream (Python) | ADAPTER | storage/postgres/event_stream.py; replay depends on kernel EventStream interface. |
| runtime/event_emitter.py emit_event | ADAPTER | "mirrors the /events POST path"; best-effort, swallowed errors. |
| EventBus (Python) | ADAPTER | transport/event_bus.py:8; projects event log -> NATS. |
| FYD social client (actions/envelope/readers/attestation/key-custody) | ADAPTER | PING repo src/fyd/social/ (git commit 14ff033c, 2026-09-21); signed envelopes over the repo-booted gateway. |
| FYD AcquisitionAdapter | INTERFACE (types only) | src/fyd/acquisition/acquisition-adapter.ts:1-22 "No implementation in this module". |
| IEventAuthority | UNWIRED | constitutional-runtime/runtime/kernel/events/event-authority-interface.ts:10; exactly 1 repo-wide reference (itself); zero implementations, zero callers. |
| EventRepository (TS contracts) | INTERFACE | runtime/contracts/src/events/index.ts:66; mirrored by HPP copy. |
| EventRepository (Python ABC) | INTERFACE | storage/repositories.py:14 (append_event/load_events/load_stream/load_all/verify_hash). |
| ReplayRepository/EventRepository (HPP) | INTERFACE | PING repo src/lib/events.ts:38,111. |
| ConstitutionalEventStore | DOES NOT EXIST | Zero hits across all /home/nolan/projects checkouts and the container. |
| AcquisitionManager / collectEvidence / batchCollectEvidence | DO NOT EXIST | Zero code hits anywhere. Sole mention is a doc checkbox in happy-place-platform-forensic/.../MEDIA_AUTHORITY_COMPATIBILITY_AUDIT.md:81 ("Media uses AcquisitionManager") - a claim in a forensic archive, not code. |
| computeEventIdFromEvent | DOES NOT EXIST | Closest analog is the inline SHA-256 in emit() (unified_event_runtime.js:91). |
| HPP EventRepository + InMemoryEventRepository + logEvent | LEGACY | PING repo src/lib/events.ts:111-284; UUIDv4 IDs (:217), in-memory singleton (:198), self-documented "NOT SUITABLE FOR PRODUCTION"; same interface name, divergent semantics from canonical. |
| Editor event-system / durable-event-store / sequence-authority | LEGACY/DORMANT | PING repo src/lib/editor/; in-memory singleton ("Constitutional Law: Event Store Must Be Durable" but memory-only); SequenceAuthority.reset() "for testing only". |
| Kernel EventRepository / repository_events path | LEGACY/DORMANT | container /app/runtime/kernel/event_repository.js; route comment: "not through the kernel pipeline (repository_events). The kernel's reducer/projection registries are empty"; EventBridge converges its rows into ping_events. |
| Pig-checkout inference gateway (server.js + event_emitter.js) | LEGACY/DIVERGENT | constitutional-runtime/gateway/server.js:509-510 self-documents "known architectural inconsistency": POST /api/v1/events writes canonical_state columns; GET routes SELECT PING-schema columns; two writers, one table, mismatched schemas. Not the container's live tree. |
| EventStore (Python, storage/event_store.py:12) | DUPLICATE | Second append_event implementation over the same EventModel table (cf. PostgresEventRepository.append_event). Convergence: pick one, retire the other. |
| OwnerEventLog (FYD owner events) | DUPLICATE | PING repo src/fyd/object/owner-events.ts:1-28; parallel append-only journal, own content-hash ID namespace (fyd-owner@1), JSON files at data/fyd-owner/<objectId>.json. Bypasses the canonical authority entirely. |
| EventRepository name (x3) | DUPLICATE | Same name, three interfaces (TS contracts, HPP TS, Python storage) with different method shapes. |
| FYD action IDs (fyd-social@1 / fyd-owner@1) | DUPLICATE (client-side only) | Mirror UnifiedEventRuntime.emit's content-hash pattern locally; harmless as client dedup keys, but they are not the journal's event IDs. |
| runtime/messaging/outbox.py (SQLite outbox) | UNWIRED | Zero callers anywhere in the Pig checkout; no running process. Parallel to the Postgres OutboxMessage table, never wired. |
| notification/outbox_processor.py | DORMANT | No running process found; no scheduler entry verified. |
| EventBus (Python, transport/event_bus.py) | ADAPTER (Hermes-scoped) | Second pass: callers are only hermes/hermes_runtime.py, hermes/runtime/artifact_repository.py, and tests. Not wired into the JS gateway live path or the main loop. |
| ping-rc-gateway container | SANDBOX (not canonical) | Image ping-gateway:rc-4d522a6b, 8080->127.0.0.1:18099, DB ping-rc-postgres/rc_staging. Release-candidate sandbox; distinct from the FYD 18199 gateway. |
| Repo-booted FYD gateway (127.0.0.1:18199) | UNKNOWN (seam) | Second pass: no docker container maps 18199, no Pig scripts reference it, no pm2. Ad-hoc sprint-demo service, currently down; implementation unlocatable read-only. See NEXT #1. |
| IdentityAuthority kernel impl | UNKNOWN | Shims exist (container /app/ping-runtime/authorities/identity_authority.js:42) delegating to /app/runtime/kernel/authorities/identity_authority; zero JS callers found in /app. Python-side usage unverified. See NEXT. |
| Repo-booted FYD gateway (127.0.0.1:18199) | UNKNOWN (seam) | Implementation absent from all Pig checkouts; DDL of its sequence-bearing ping_events not found; process down at trace time. See NEXT. |
| ping-rc-gateway container (Up 34h) | UNKNOWN | Second gateway on the Pig; target DB and role unverified. See NEXT. |

## Seams recorded

1. ACQUISITION SEAM (the mission-critical gap). Nothing named
AcquisitionManager/collectEvidence/batchCollectEvidence exists in code.
FYD's AcquisitionAdapter is types-only with an explicit "no implementation"
note. The FYD core loop's first beat (URL -> OBSERVATIONS) has NO wired path
into the canonical event authority: observations never become events through
any proven code path. `capabilities/github/acquire_repository.py` in
constitutional-runtime appends via append_event (Python path) and is the
closest thing to an acquisition->event wire, but it is not AcquisitionManager
and is unverified live. Any multi-source acquisition milestone must build
this seam on the canonical spine (UnifiedEventRuntime.emit), not invent a
second authority.

2. FYD GATEWAY SEAM. FYD social writes (signed bff-envelope@1 POST /events)
and reads (GET /events/<TYPE> exposing `sequence`) target the repo-booted
gateway at 127.0.0.1:18199 (default in src/fyd/social/config.ts:17-18).
Its implementation is not in any Pig checkout, its ping_events-with-sequence
DDL is nowhere, and no process was listening at trace time - FYD social
writes are dead tonight. The journal schema the FYD clients expect
(event_id, event_type, source, timestamp, created_at, sequence, payload,
metadata) matches neither the live spine schema (no sequence column) nor the
kernel schema. Evidence needed in NEXT.

3. SEQUENCE SEAM. Four ordering models: none (live spine), per-object
INTEGER (repository_events), DB global sequence (Python EventModel),
BIGINT sequence (FYD gateway journal). Replay across tables must pick one
ordering semantic per stream and record it; do not pretend they are the
same.

4. SERIALIZATION DRIFT. At least three canonicalizers feed identity/hash
material: JSON.stringify (emit's ID material), CanonicalBytes /
canonical_encoder (kernel), sorted-key recursive JSON (bff-envelope@1,
fydActionId, owner events). Deterministic IDs are only deterministic within
one serializer. Any cross-path ID agreement claim must name the serializer.

5. TRIGGER HOLE. Per the truth matrix (research/website-truth-matrix.md,
row 1): the append-only DB trigger rejects UPDATE/DELETE but does not cover
TRUNCATE. No code path uses TRUNCATE; still a recorded gap.

6. FORMULA DIVERGENCE. Truth matrix row 4: the deployed event identity
formula differs from inspected source per known-vector self-test
(d1b47668...) - the container image was built from a fuller tree than any
Pig checkout. Forensic file:line evidence from checkouts must be treated as
approximate for the container; the container's own files (read via docker
exec) are authoritative.

## Standing decisions absorbed (parent handoff, 2026-09-23)
- Connector credentials: QUEUE FOR MORNING. This lane uses no live
credentials; no OAuth flows, no tokens, no account connections. Fixtures or
recorded responses only if a connector path is probed.
- Vendor veto: no paid/heavy vendor enters any hot path on this lane's
recommendation without the decision gate. This lane is read-only forensics;
it adopts nothing. Any ADOPT recommendation in future phases must answer the
seven gate questions (removes commodity code? improves URL->trusted-FYD
loop? removable? PING remains authority? what data does it own? what fails
if it disappears? cost at 10/1,000/100,000 FYDs?).
