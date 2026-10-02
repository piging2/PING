# Agent D Recon: Downstream Effect Matrix, Event Authority, Identity/Lineage/ORCA

Scope: read-only forensic planning sprint, `LOCAL_WORKTREE` at frozen HEAD `84da2d40c9dae3c4f7c6070845e073b1471d245a` (branch `constitutional-convergence-v2`), observed 2026-09-19. No source files were modified; no tests were run against shared state. All file:line citations are from the frozen worktree unless a different plane is named explicitly. Planes: `LOCAL_WORKTREE` (this worktree), `LOCAL_BRANCH` (other branches), `LIVE_RUNTIME` (running `ping-gateway:devin-boundary2`, whose source is `/home/nolan/ping-gateway-src`), `PUBLIC_GITHUB` (not consulted).

## CRITICAL FINDING: the witness trigger arrow is disconnected at frozen HEAD

Commit `91e1337f4` removed the only live path that invoked the witness worker, and `84da2d40c` did not install a replacement. Directly verified:

- `ping-runtime/orchestration/event_to_mission_bridge.js` (at HEAD): `EVENT_MISSION_MAP` has no `REPLAY_COMPLETED` entry. The removed line was `REPLAY_COMPLETED: { missionType: 'WITNESS_CREATE', priority: 1 }`.
- `ping-runtime/orchestration/mission_scheduler.js` (at HEAD): `MISSION_WORKER_MAP` has no `WITNESS_CREATE` entry.
- `ping-runtime/workers/canonical_workers.js`: `WitnessWorker` registers `eventTypes: ['REPLAY_COMPLETED']` and `WorkerRuntime.dispatch` selects workers strictly by registered event types.
- `ping-runtime/workers/worker_runtime.js`: dispatch-only; `start()` does not poll. The only non-test caller of `WorkerRuntime.dispatch` in the entire tree is `MissionScheduler._dispatch` (mission_scheduler.js:226). Test files `gateway/test_commissioning.js:356` and `gateway/test_kernel_pipeline.js:254` call dispatch directly but are not production.
- `gateway/bootstrap/gateway_runtime.js`: no `unifiedEventRuntime.on('REPLAY_COMPLETED', ...)` registration exists. The only runtime `.on()` loop registers `GRAPH_PROJECTION_EVENTS` (gateway_runtime.js:608), which does not include `REPLAY_COMPLETED` and routes to `knowledgeGraph.addNode`, not `workerRuntime.dispatch`.
- `gateway/test_pipeline_bridge.js:65` asserts `EVENT_MISSION_MAP['REPLAY_COMPLETED'] === undefined` with the message "replay completion directly triggers the witness worker", but no code implements the direct trigger. The assertion documents intent, not mechanism.

Consequence: at frozen HEAD, `ReplayWorker` emits `REPLAY_COMPLETED` (persisted to `ping_events`, delivered to `.on()` handlers) but nothing dispatches it to `WorkerRuntime`. `WitnessWorker.handle` is unreachable in the production bootstrap. `WITNESS_CREATED` cannot be produced end to end; `WITNESS_REJECTED` cannot be produced either. The `EVAL-010_witness_failure_honesty.js` certification instantiates `WitnessWorker` directly and never exercises the bootstrap path, so the certification is valid for the worker unit but says nothing about pipeline reachability.

This finding colors every row of the Part 1 matrix: several downstream effects are currently masked because the events they would consume are never emitted.

---

# PART 1: Downstream effect matrix

## Shared mechanics (apply to every change below)

1. **Content-addressed event identity.** `ping-runtime/events/unified_event_runtime.js:190-213`: `event_id = identityAuthority.generateId('event', identityData)` where `identityData = { event_type, source, namespace, payload | logical_id }`, hashed via CanonicalJson (RFC-8785, F7/D1 domain) then `CanonicalAuthority.hashBytes`, producing `event_<16hex>`. **Any change to the WITNESS_CREATED payload shape changes its event_id.** There is no separate stable attestation key.
2. **Idempotent persistence.** `unified_event_runtime.js:243-247`: `INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING`. Re-emitting byte-identical content dedupes; emitting changed content creates a NEW row. The old row is never updated in place.
3. **Sequence is storage metadata, not identity.** `unified_event_runtime.js:239-242, 283-286`: PostgreSQL allocates `sequence` via column DEFAULT; it is assigned after identity and never fed back into `event_id` or any hash. Replay ordering (`replay()`, unified_event_runtime.js:375) is by `sequence ASC`.
4. **Witness payload nesting.** `WITNESS_CREATED` carries a nested `payload.witness` object (`documentId`, `eventType`, `witness_root`, `replay_fingerprint`, `attestation`). `gateway/routes/mission_control.js:620` returns `w.payload.witness` verbatim to API consumers.
5. **Restart idempotency depends on (1).** `mission_scheduler.js:205-216`: the reaper recovers abandoned leases; every mission transition is conditional on status. A witness mission retried after a crash re-emits; dedupe holds only if the payload is byte-identical on retry. Any change that injects nondeterminism into the preimage (timestamps, random IDs) breaks restart safety.
6. **Merkle hashing bypasses the Hash Authority.** `gateway/replay/kernel/merkle_tree.js:213-217`: `hashBytes` uses `crypto.createHash('sha256')` directly with domain-separation prefixes, not `CanonicalAuthority.hashBytes`. So Hash Authority changes do not propagate to `witness_root`, and `witness_root` changes do not propagate to the Hash Authority. The 12/13-leaf drift (below) lives inside this file's compiled copy.
7. **The witness_root preimage today.** `gateway/replay/kernel/witness_authority.js` builds leaves from the event stream; `ping-runtime/workers/canonical_workers.js` `ReplayWorker` emits `witness_root` inside `REPLAY_COMPLETED.payload.replay`; `WitnessWorker` (84da2d40c) requires `payload.replay.verified === true` and non-empty `payload.replay.witness_root`, else emits `WITNESS_REJECTED`.
8. **`attestation` is a pointer, not proof.** `canonical_workers.js` WitnessWorker emits `attestation: witness-<first 16 chars of the REPLAY_COMPLETED event_id>`. It is derived from the replay event's identity, not from the root. Two replays of identical content under different event_ids yield different attestation strings.

## Change (a): source/compiled replay-root convergence (12-leaf compiled JS vs 13-leaf TS source)

The compiled `gateway/replay/kernel/witness_authority.js` builds 12 leaves; the TS source `runtime/kernel/replay/witness_authority.ts:193` builds 13, adding `leaf_id: toWitnessLeafId('constitutional_law_commitment')`. Verified by direct grep (0 occurrences of `constitutional_law_commitment` in the compiled file, present in TS). The compiled artifact is what `KernelReplayExecutionProvider` loads (`gateway/kernel_replay_execution_provider.js` requires the compiled path).

| CHANGE | DIRECT CALLERS | DIRECT CONSUMERS | DATA SHAPE CHANGE? | EVENT ID CHANGE? | HASH CHANGE? | REPLAY CHANGE? | MIGRATION REQUIRED? | BACKFILL REQUIRED? | OLD EVENTS STILL READABLE? | ORACLE IMPACT? | UI IMPACT? | COMPATIBILITY IMPACT? | ROLLBACK COST? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (a) Recompile witness authority to 13 leaves | KernelReplayExecutionProvider (only loader of compiled artifact) | ReplayWorker (reads witness_root from provider result); WitnessWorker (gates on non-empty root); /replay/trace join (no root read) | Yes: witness_root value changes for every replay; leaf schema gains one leaf | Yes: WITNESS_CREATED payload contains witness_root, so event_id changes for all future attestations | Yes: every witness_root recomputed | Yes: replay verification results change (root mismatch vs any previously recorded root) | No schema migration; code recompile only | No backfill possible without re-running replay; old roots are orphaned, not migrated | Yes: rows immutable, old WITNESS_CREATED rows remain queryable; but their roots no longer match recomputation | Oracle packaging embeds the compiled JS; any Oracle bundle built from the old artifact keeps producing 12-leaf roots until rebuilt and redeployed | /replay/trace shows roots as opaque strings; no UI breakage, but displayed roots change | Python plane unaffected (does not read witness_root); external adapters unaffected; replay certificates issued against 12-leaf roots become unverifiable | Low code cost, HIGH trust cost: every historical attestation is silently invalidated the moment the new artifact runs |

Dangerous downstream effect: this is a silent invalidation of all prior witness roots. Any consumer that caches or pins a root (evidence bundles, replay certificates, ORCA evidence JSON) will fail open or closed depending on its own comparison logic. Must be paired with a root-version marker (change f) or every historical attestation becomes suspect.

## Change (b): WITNESS_CREATED root binding as in 84da2d40c

`ping-runtime/workers/canonical_workers.js` (+16 lines in 84da2d40c): WitnessWorker extracts `payload.replay.witness_root`, rejects with `missing_witness_root` when absent, and binds `witness_root` into the emitted `WITNESS_CREATED.payload.witness`.

| CHANGE | DIRECT CALLERS | DIRECT CONSUMERS | DATA SHAPE CHANGE? | EVENT ID CHANGE? | HASH CHANGE? | REPLAY CHANGE? | MIGRATION REQUIRED? | BACKFILL REQUIRED? | OLD EVENTS STILL READABLE? | ORACLE IMPACT? | UI IMPACT? | COMPATIBILITY IMPACT? | ROLLBACK COST? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (b) witness_root bound into WITNESS_CREATED | WitnessWorker only | /replay/trace/:correlationId (returns payload.witness verbatim); /witness/stats (counts only); LineageWorker (ignores payload content); KnowledgeGraph (not subscribed to WITNESS_CREATED) | Yes: payload.witness gains witness_root field | Yes: payload change alters event_id for all future attestations | No: root itself unchanged, only carried | No: replay execution untouched | No | No: old attestations without root remain as-is | Yes: old rows readable; distinguishable by absence of payload.witness.witness_root | None beyond (a): packaging unchanged | /replay/trace consumers see a new field; additive, non-breaking for tolerant readers | Additive field; strict-schema consumers need update | Trivial: revert the 16 lines; new-shape rows already written stay readable |

Note: because of the disconnected trigger (Critical Finding), this change is certified but not yet exercisable end to end. Its downstream effects are latent until the dispatch path is repaired.

## Change (c): verified-replay-only attestation contract

WitnessWorker emits `WITNESS_CREATED` only when `payload.replay.verified === true` (kernel status ok AND violations empty, `canonical_workers.js` ReplayWorker); otherwise emits `WITNESS_REJECTED`. The unverified-creation bypass was removed in `91e1337f4`.

| CHANGE | DIRECT CALLERS | DIRECT CONSUMERS | DATA SHAPE CHANGE? | EVENT ID CHANGE? | HASH CHANGE? | REPLAY CHANGE? | MIGRATION REQUIRED? | BACKFILL REQUIRED? | OLD EVENTS STILL READABLE? | ORACLE IMPACT? | UI IMPACT? | COMPATIBILITY IMPACT? | ROLLBACK COST? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (c) verified-only attestation (already landed) | WitnessWorker only | /witness/stats counts WITNESS_REJECTED (mission_control.js:532, 546); /replay/trace shows both types (mission_control.js:597) | No new fields; but the WITNESS_REJECTED type now carries real rejections (was previously unreachable) | No for identical inputs | No | No | No | No | Yes | None | /witness/stats rejection counts become meaningful; dashboards showing zero rejections will now show nonzero | Python witness_worker.py violates this contract (emits verified: False attestations); any consumer trusting WITNESS_CREATED unconditionally is now safer, but must still filter by source plane | Low: re-adding a bypass is one mapping, but would re-open the exact hole 91e1337f4 closed |

Dangerous downstream effect: `ReplayWorker` treats provider status `conversion_failed` as unverified (safe), but **partial envelope skips can still yield status ok** (`gateway/kernel_replay_execution_provider.js`: malformed envelopes are silently skipped after incrementing failure stats). A replay that skipped malformed envelopes can still be `verified: true` and therefore attested. The verified-only contract is only as strong as the provider's definition of ok. This is the highest-risk false-attestation path in the current design.

## Change (d): WITNESS_CREATE fallback removal (landed in 91e1337f4)

Removed `REPLAY_COMPLETED -> WITNESS_CREATE` mission mapping from the bridge and the scheduler's `WITNESS_CREATE` worker mapping.

| CHANGE | DIRECT CALLERS | DIRECT CONSUMERS | DATA SHAPE CHANGE? | EVENT ID CHANGE? | HASH CHANGE? | REPLAY CHANGE? | MIGRATION REQUIRED? | BACKFILL REQUIRED? | OLD EVENTS STILL READABLE? | ORACLE IMPACT? | UI IMPACT? | COMPATIBILITY IMPACT? | ROLLBACK COST? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (d) WITNESS_CREATE fallback removal | None remaining (bridge entry deleted) | WitnessWorker (now triggerless in bootstrap) | No | No | No | No | No | No | Yes | None | /witness/stats will show zero new attestations until a trigger is installed | Test files updated in the same commit; EVAL-006 touched (WIP in worktree, uncommitted) | Low code cost, but rollback re-opens the unverified bypass the commit was created to close |

Dangerous downstream effect: **this is the commit that disconnected the witness pipeline** (see Critical Finding). The fallback was the only live invocation path. Its removal was correct as a security measure, but the replacement direct trigger was never installed. Until a `REPLAY_COMPLETED -> workerRuntime.dispatch` registration is added to the bootstrap (or a mission path reintroduced with the verified gate), the entire witness subsystem is write-dead: no `WITNESS_CREATED`, no `WITNESS_REJECTED`, no lineage records from witness events, no witness stats movement.

## Change (e): witness identity semantics decision

Open decision. Current state at HEAD: the canonical path uses **no separate witness_id**. The attestation record's identity is the `WITNESS_CREATED.event_id` (content-addressed by Event Authority). The `attestation` field is a pointer string (`witness-<16hex of replay event_id>`). Separately, the LEGACY `WitnessAuthority.createWitness` (runtime/kernel/authorities/witness_authority.js, used by gateway/witness_authority.js and gateway/dead_letter_authority.js) mints `witness_<16hex>` IDs via `CanonicalAuthority.hash` over `{record_id, event_type, input_hash, output_hash}` (4e7eb117b normalized undefined to null). Dead-letter records carry these legacy `witness_id` values today.

| CHANGE | DIRECT CALLERS | DIRECT CONSUMERS | DATA SHAPE CHANGE? | EVENT ID CHANGE? | HASH CHANGE? | REPLAY CHANGE? | MIGRATION REQUIRED? | BACKFILL REQUIRED? | OLD EVENTS STILL READABLE? | ORACLE IMPACT? | UI IMPACT? | COMPATIBILITY IMPACT? | ROLLBACK COST? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (e) Decide: no witness_id (event_id is the identity) vs introduce witness_id | WitnessWorker (canonical); DeadLetterAuthority + legacy WitnessAuthority (legacy scheme) | repository_dead_letters rows (store legacy witness_id); /replay/trace (uses upstreamEventId, not witness_id) | Only if a witness_id field is added to WITNESS_CREATED | Yes if payload gains a witness_id field | No | No | Only if the decision retires the legacy authority: dead-letter rows keep their witness_id values as historical data | No | Yes, with a caveat: legacy witness_id values in dead-letter rows become unresolvable to any canonical event unless mapped | None | None | Introducing witness_id creates a second identity scheme competing with event_id; every consumer must be told which is canonical | Decision cost, not code cost: reverting a wrong decision means re-educating consumers |

Recommendation embedded in the matrix: keep `WITNESS_CREATED.event_id` as the sole attestation identity. A separate `witness_id` adds a competing scheme with no new capability (the event_id is already content-addressed and unique). The legacy `witness_<16hex>` IDs in dead-letter rows should be classified LEGACY and left as historical values, not extended.

## Change (f): witness provenance / principal binding

Not implemented at HEAD. `WITNESS_CREATED` carries no principal field: no `attested_by`, no executor identity, no law/policy version, no witness algorithm version. Namespace is inherited from the triggering event via `BaseWorker._emit`. The `source` field records the emitting worker name.

| CHANGE | DIRECT CALLERS | DIRECT CONSUMERS | DATA SHAPE CHANGE? | EVENT ID CHANGE? | HASH CHANGE? | REPLAY CHANGE? | MIGRATION REQUIRED? | BACKFILL REQUIRED? | OLD EVENTS STILL READABLE? | ORACLE IMPACT? | UI IMPACT? | COMPATIBILITY IMPACT? | ROLLBACK COST? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (f) Add principal / law-version / algorithm-version to attestation | WitnessWorker (would populate) | /replay/trace (returns witness object verbatim); future auditors; ORCA evidence-chain verifier (does not read witness today) | Yes: new payload fields | Yes: any new payload field changes event_id | No | No | No | No: old attestations simply lack provenance | Yes: old rows readable, provenance-absent | Oracle bundles should record which artifact version produced a root; without an algorithm-version field, 12-leaf vs 13-leaf roots are indistinguishable in the log | Additive fields surface in /replay/trace; non-breaking | Additive if optional; breaking if any consumer is updated to REQUIRE provenance (old rows would fail the new check) | Low if additive; high if made mandatory (splits the event log into pre/post provenance eras) |

This change is the natural companion to (a): an `algorithm_version` or `leaf_schema_version` field in the attestation is the only way to distinguish 12-leaf roots from 13-leaf roots after the fact. Without it, root convergence (a) silently invalidates history with no marker.

## Change (g): witness restart proof

Mechanism at HEAD: `MissionScheduler` reaper recovers abandoned leases (mission_scheduler.js:205-216); all mission transitions are conditional on status; retried witness missions re-emit byte-identical payloads and dedupe via `ON CONFLICT (event_id) DO NOTHING`. There is no separate witness restart ceremony; restart safety is inherited from content-addressed idempotency.

| CHANGE | DIRECT CALLERS | DIRECT CONSUMERS | DATA SHAPE CHANGE? | EVENT ID CHANGE? | HASH CHANGE? | REPLAY CHANGE? | MIGRATION REQUIRED? | BACKFILL REQUIRED? | OLD EVENTS STILL READABLE? | ORACLE IMPACT? | UI IMPACT? | COMPATIBILITY IMPACT? | ROLLBACK COST? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (g) Rely on emit idempotency for witness restart (current design) | MissionScheduler reaper; UnifiedEventRuntime.emit | None directly | No | No | No | No | No | No | Yes | None | None | None, provided the payload stays deterministic | N/A (no change) |

Fragility: restart safety breaks if any future change injects nondeterminism into the witness preimage. Concrete hazards already present: (1) `attestation` embeds the replay event's `event_id`, which is stable per replay event but means the attestation is not a pure function of replay content; (2) if `logical_id` is ever omitted and full payloads compared, any upstream payload nondeterminism (e.g., timestamps inside replay results) produces a new event_id on retry, creating duplicate attestations instead of deduping. Any witness change must be reviewed against this property.

---

# PART 2: Event authority follow-up

All classifications below are against the certified PostgreSQL spine (`UnifiedEventRuntime.emit` -> single `INSERT INTO ping_events`, `ping-runtime/events/unified_event_runtime.js:245`). "Canonical" means it participates in the certified path; "projection" means it derives from canonical state without writing it; "legacy" means it exists in source but is not on the live path; "duplicate" means it independently exercises the same capability (sovereignty violation); "unknown" means reachability could not be established read-only.

## The spine (verified by direct read)

- `UnifiedEventRuntime.emit` (`ping-runtime/events/unified_event_runtime.js:122-300`): identity material built from `{event_type, source, namespace, payload|logical_id}` with timestamp deliberately excluded; event-type validation BEFORE identity minting (F7/D1, rejected events get no ID, no persistence); governance check; `identityAuthority.generateId('event', material)` -> `event_<16hex>` (V2, `identity_version: 2.0.0` in preimage); single `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace) ... ON CONFLICT (event_id) DO NOTHING RETURNING sequence`; `sequence` allocated by PG column DEFAULT, exposed on the in-memory event but never fed back into identity. Dispatch to `.on()` handlers only; no worker dispatch. **Classification: canonical.**
- Only `INSERT INTO ping_events` in non-test production code in the whole worktree: the one above. EVAL files contain the string only in mock-pool matchers. **The spine is the single writer. Verified.**

## Classification table

| Component | Location | Classification | Evidence |
|---|---|---|---|
| UnifiedEventRuntime | ping-runtime/events/unified_event_runtime.js | canonical | Sole INSERT INTO ping_events; sole sequence allocation; sole identity minting via IdentityAuthority |
| IdentityAuthority.generateId('event', ...) | ping-runtime/authorities/identity_authority.js (called at unified_event_runtime.js:201) | canonical | Only ID minter on the spine; V2 era, F7/D1 value-domain boundary |
| PostgreSQL sequence allocation | ping_events.sequence column DEFAULT (nextval) | canonical | Allocated post-identity; replay() orders by sequence ASC |
| CanonicalJson.canonicalize (RFC-8785) | ping-runtime/authorities via identity path | canonical | Inside the identity preimage |
| ConstitutionalEventStore | nowhere in worktree | phantom | Zero matches for the name in .js/.ts/.py; prior recon's SQLite archaeology refers to an older architecture not present at this HEAD |
| EventRepository (runtime/kernel/event_repository.js:15, appendEvent at :102) | runtime/kernel/event_repository.js; gateway shim gateway/event_repository.js | legacy | Has appendEvent -> repository_events, NO project() method (the constitutional end-state was never implemented); required only by gateway/constitutional_execution_pipeline.js and gateway/bootstrap/constitutional_runtime.js, neither in the live boot |
| EventRepository as derived-projection adapter (EventRepository.project(E)) | does not exist | unimplemented | Agent B's constitutional decision C2 has no implementation at HEAD |
| IEventAuthority | runtime/kernel/events/event-authority-interface.ts | phantom | Interface only; zero implementers; its event vocabulary (ExecutionStarted, WitnessGenerated, clearHistory()) is incompatible with the append-only spine |
| EventBridge (dual-emit repository_events + canonical_events -> ping_events) | ping-runtime/events/event_bridge.js | legacy (fenced) | Header at line 2: "CLASSIFICATION: PRESERVED_INACTIVE (MC-1, 2026-09-18). DO NOT DELETE."; not started in gateway_runtime.js boot (line 470: "Supersedes EventBridge (PRESERVED_INACTIVE)") |
| LegacyIngressAdapter | gateway/legacy_ingress_adapter.js | canonical (allowlisted) | Started in boot (gateway_runtime.js:471-477); sole holder of the legacy-ingress capability object; converges canonical_events rows through emit() |
| MissionEventBus | gateway/mission_event_bus.js | legacy | Writes mission_events with own event ID/hash; calls legacy witnessAuthority.createWitness; no require path found in bootstrap |
| EventOutbox | gateway/event_outbox.js | legacy | No bootstrap wiring found |
| witness_recorder.js, witness_chain.js, pipeline_witness.js, constitutional_proof_artifact.js, replay_certificate_authority.js | gateway/ | legacy | No bootstrap wiring found; alternate witness minters, none on the live path |
| runtime/kernel/authorities/witness_authority.js (legacy WitnessAuthority) | runtime/kernel/authorities/ | legacy (live-adjacent) | Still called by DeadLetterAuthority (4e7eb117b) for dead-letter witness_id values; mints witness_<16hex> outside the event log |
| gateway/witness_authority.js | gateway/ | legacy | Required by dead_letter_authority.js only |
| AcquisitionManager | nowhere in worktree | phantom | Zero matches in .js/.ts/.py; its callers cannot be classified because it does not exist at this HEAD |
| SQLite writers (document_tracker.js, embedding_cache.js, persistence_adapter.js) | gateway/ | legacy / operational | better-sqlite3 used for document tracking and embedding cache; not canonical event stores; no ping_events writes |
| In-memory event queue (ping-runtime/events/event_queue.js) | ping-runtime/events/ | legacy (fenced) | Preserved with header; superseded by UnifiedEventRuntime |
| Python witness_worker.py / replay_worker.py (root and workers/ copies) | worktree root, workers/ | legacy (unwired) | Generates random-UUID witness_id, sig_ values, verified: False; writes to `events` table (BrainOS schema), never to ping_events; constitutional_runtime.py wires them but no compose/shell launcher or bootstrap path invokes constitutional_runtime.py |
| Python repository_client.py | workers/ | legacy | Generates UUID event IDs client-side, POSTs to /events; bypasses IdentityAuthority for any event it would submit |
| Go files | none reference ping_events | n/a | Zero Go references to ping_events |
| UnifiedEventRuntime.replay() (sequence-ordered reader) | unified_event_runtime.js:375 | canonical API, zero consumers | No production callers found; the query() path (timestamp-ordered) is what routes use |
| query() path | unified_event_runtime.js | canonical (read) | Used by mission_control routes and MissionRuntime.getTrace |
| ORCA control loop ping_events reads | orca-autonomy worktree, orca_control_loop.js:162,969 | projection (read-only) | Counts by event_type; reads MISSION_* lifecycle events for evidence-chain verification; does not read or write witness events |

## Dual-emit status: branch source vs live runtime (verified, not inferred)

- `LOCAL_WORKTREE` (84da2d40c): the old `EventBridge` file exists but is classified `PRESERVED_INACTIVE` and is not started; `de1112454` ("converge legacy ingress on constitutional event authority") fenced it and installed `LegacyIngressAdapter` as the single ingress. **Dual emission is fenced in branch source.**
- `LIVE_RUNTIME` source (`/home/nolan/ping-gateway-src`, the code inside image `ping-gateway:devin-boundary2`): `gateway/bootstrap/gateway_runtime.js:73` requires the old `EventBridge`, and lines 542/549 instantiate and `start()` it. The old bridge file there has no PRESERVED_INACTIVE header. `legacy_ingress_adapter.js` does not exist in that source tree. **Dual emission (repository_events + canonical_events -> ping_events) is LIVE in the running image.** The prior recon claim is confirmed against the live-image source.
- `ce3f8687c` ("cert(events): database sequence and replay authority") certified the sequence/replay path in branch source; it did not touch the bridge and is not deployed to the live image either.

Operational consequence for the matrix: any witness or replay change certified against the worktree is not live until the image is rebuilt and redeployed. The live image additionally re-emits legacy rows into `ping_events` through a path that bypasses the current spine's validation, so live `WITNESS_CREATED`/`REPLAY_COMPLETED` rows (if any) may carry Era-H identity semantics, not V2.

---

# PART 3: Identity, lineage, ORCA

## Identity verdict

1. **Witness identity does not require IdentityAuthority in the canonical path, and that is correct.** The `WITNESS_CREATED.event_id` IS minted by IdentityAuthority (via `emit()`), so the attestation record's identity is already authority-owned. What does not go through IdentityAuthority is the *proof content* (`witness_root`), which is correct: `witness_root` is a content digest, not an identity. Routing it through `generateId` would conflate proof with identity and mint IDs for non-event objects.
2. **`witness_root` belongs to the replay/hash domain, with one sovereignty blemish.** The Merkle tree hashes with `crypto.createHash('sha256')` directly (`gateway/replay/kernel/merkle_tree.js:213-217`) instead of `CanonicalAuthority.hashBytes`. Per the constitutional rule (declared authority must match actual capability ownership), this is a bypass: the Hash Authority cannot see, version, or rotate the witness hash function. It does not affect correctness today (SHA-256 both ways), but it means a future hash-authority migration would silently miss witness roots. Recommend routing `MerkleTree.hashBytes` through `CanonicalAuthority` when the 13-leaf recompilation (change a) is done, since both changes touch the same artifact.
3. **A separate `witness_id` would introduce a second identity scheme.** The legacy `witness_<16hex>` scheme (runtime/kernel/authorities/witness_authority.js, still used for dead-letter rows via 4e7eb117b) is the concrete example of the confusion a second scheme causes: those IDs are unresolvable to canonical events. Do not extend it; classify dead-letter `witness_id` values as LEGACY historical data.
4. **`attestation: witness-<16hex>` is misnamed.** It is derived from the REPLAY_COMPLETED event_id, not from the root or the attestation content. It cannot serve as proof and should not be presented as such. If a stable attestation handle is needed, derive it from `(witness_root, replay_fingerprint)` content, not from a sibling event's identity.

## Lineage verdict

The prior forensics framing suggested `LineageWorker` is wrong to use event causation instead of witness contents. **That framing is incorrect; the current separation is the right model:**

- **Lineage answers "what caused what"** (the causal DAG of events via `metadata.causation_id` / `correlation_id`). Consumers: audit trails, evidence-chain traversal, the ORCA chain verifier.
- **Witness answers "was this replay verified and what root did it produce"** (a claim about execution correctness). Consumers: replay certification, tamper detection, `/replay/trace`.
- These are orthogonal claims. Forcing witness hashes into lineage edges would couple lineage creation (which happens for every event) to replay scheduling (which happens rarely and only for projections). The result would be either null references everywhere or lineage gated on replay, both worse.

Actual defects in the lineage implementation (not the model):

1. `LineageWorker` (`canonical_workers.js:530-`) builds `causationChain` from only the immediate `causation_id` and never walks the chain; a "chain" of length 1 is not a chain.
2. `LINEAGE_CREATED` is write-only: the bridge marks it terminal, no consumer reads it, and `ProjectionWorker`'s `LINEAGE_CREATED` registration is dormant (no mission path). The lineage pipeline produces records nobody queries; `EvidenceAuthority` checks `lineage.source_id` on evidence candidates, not `LINEAGE_CREATED` events.
3. The dead `LineageAuthority` (`gateway/lineage_authority.js`) mints `edge_id` with `Date.now()`, which is non-replayable identity; it is not wired into the boot, but its presence invites misuse.

The genuinely useful stronger binding that preserves orthogonality: when `LineageWorker` processes a `WITNESS_CREATED` event (via the `WITNESS_CREATED -> LINEAGE_CREATE` mission), it should copy `witness_root`, `replay_fingerprint`, and `upstreamEventId` **by reference** into the `LINEAGE_CREATED` payload. This is additive and non-breaking: lineage stays causation-based, but attestation-lineage records carry the root they attest, so an auditor traversing from any event reaches its attestation without a second join. Do NOT make lineage creation depend on witness existence.

## ORCA contract verdict

Target contract: executor performs work; PING records canonical events; PING replay verifies; PING witness attests only verified replay; executor may supply evidence but must not mint canonical witness truth.

| Adapter / surface | Verdict | Evidence |
|---|---|---|
| external_agent_adapter.js (all profiles: codex, opencode, goose, qwen, crush, hermes, ollama, copilot, cloud-subagent) | CONFORMS | Single gate for all executor families (profiles at lines 58-176 are invocation configs, not separate code paths). Line 285 enforces `constraints.no_canonical_events === true` and `no_mission_state_writes === true`. The only emission path is `recordVerifiedResult` via the injected `eventRuntime.emit` (line 438), which is the canonical spine. No WITNESS references in the adapter. |
| hermes_dispatch.py (orca-autonomy) | CONFORMS | Zero witness references; dispatch only |
| orca_control_loop.js | CONFORMS (read-only) | Reads ping_events for counts (line 162) and MISSION_* lifecycle events (line 969); writes nothing; does not read or mint witness events |
| Python compatibility runtime (root witness_worker.py, workers/witness_worker.py) | VIOLATION (legacy, unwired) | Mints `witness_id` (random UUID), `sig_<uuid>` signatures, `verified: False` attestations outside the canonical path. Not reachable from the Node bootstrap or any compose launcher found, so the violation is latent, not live. If `constitutional_runtime.py` is ever launched, it becomes a live sovereignty violation: two independent witness-truth minters. |
| workers/repository_client.py | VIOLATION (legacy, unwired) | Generates UUID event IDs client-side, bypassing IdentityAuthority |
| MissionEventBus / EventOutbox | VIOLATION (legacy, unwired) | Own event ID/hash generation; calls legacy witnessAuthority.createWitness; no bootstrap wiring |
| gateway/witness_recorder.js, witness_chain.js, pipeline_witness.js, constitutional_proof_artifact.js, replay_certificate_authority.js | VIOLATION (legacy, unwired) | Alternate witness minters with no bootstrap wiring; each is a latent competing truth source |
| DeadLetterAuthority via legacy WitnessAuthority | BOUNDARY CASE (live) | `gateway/dead_letter_authority.js` calls `witnessAuthority.createWitness` (4e7eb117b) to mint `witness_<16hex>` for dead-letter rows. This is live code on the operational path (dead letters), but it does not emit canonical events and does not claim replay attestation, so it does not violate the ORCA contract as stated. It does perpetuate the second identity scheme (see change e). |

---

## Open questions and recommended follow-ups

1. **Install the witness trigger or formally suspend the witness pipeline.** The disconnected `REPLAY_COMPLETED` arrow (Critical Finding) means every witness certification at HEAD is unit-only. Either add a direct `unifiedEventRuntime.on('REPLAY_COMPLETED', e => workerRuntime.dispatch(e))` registration in the bootstrap (preserving the verified-only gate inside the worker), or record an explicit decision that the witness pipeline is suspended pending the trigger design.
2. **Close the partial-skip attestation hole.** `KernelReplayExecutionProvider` can return `verified: true` after silently skipping malformed envelopes. Decide whether skipped envelopes must force `verified: false` (fail-closed) or be surfaced as a distinct `verified: partial` state that the witness worker rejects.
3. **Pair the 13-leaf recompilation with a root-version marker** (change f) so historical 12-leaf roots remain interpretable after convergence.
4. **Route MerkleTree hashing through CanonicalAuthority** during the recompilation to close the hash-sovereignty bypass.
5. **Reconcile live vs certified before any witness rollout.** The live image runs the old dual-emit bridge and predates the witness commits; no witness change is live until the image is rebuilt. A promotion gate (certified SHA -> built image -> running image) is the missing control.
6. **Decide the disposition of the Python witness plane.** It is currently unwired, but it is a complete alternate witness minter. Either fence it explicitly (PRESERVED_INACTIVE headers + no launcher) or remove it; silent coexistence is how sovereignty violations become live.
7. **LineageWorker chain walk.** If lineage records are ever to be consumed, the single-hop `causationChain` must walk the full causation DAG with cycle detection; otherwise `LINEAGE_CREATED` remains write-only telemetry.

*Report produced read-only from LOCAL_WORKTREE 84da2d40c on 2026-09-19. No repo files modified.*
