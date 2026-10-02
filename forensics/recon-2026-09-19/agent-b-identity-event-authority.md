# Agent B Recon: Identity / Hash / Canonicalization + Event Authority

- **Track:** program sections 7-8 (IDENTITY/HASH/CANONICALIZATION + EVENT AUTHORITY)
- **Date:** 2026-09-18/19 MDT
- **Scope:** `/home/nolan/worktrees/constitutional-convergence` (FROZEN `constitutional-convergence-v2` @ 84da2d40c, inspect only) and `/home/nolan/ping` (main @ 88c9651be, branch `feature/approval-effect-identity`). Plus read-only inspection of the LIVE `ping-gateway` container (`ping-gateway:devin-boundary2`) filesystem. No other worktrees surveyed (`orca-autonomy`, `ping-codex-convergence`, `ping-event-runtime`, `ping-harvest-12h`, `ping-oracle-deploy`) and `/tmp/crx-runtime` excluded (out of assigned scope).
- **Law compliance:** read-only throughout. No source edits, no commits, no DB writes (no DB connection was even established), no service restarts, no secret reads (a live-DB census was abandoned rather than recover credentials), no tests executed (the cert harness was characterized from source only, per instructions not to run against shared DB).
- **Evidence hierarchy used:** LIVE RUNTIME TRACE (container FS inspection, `docker ps/inspect/exec` read-only) > CURRENT EXECUTABLE CODE (frozen worktree source) > INTEGRATION/BEHAVIORAL/UNIT TEST (source characterization) > DOCUMENTATION (EVIDENCE_LEDGER.md, OPERATING_SPEC.md, CONTRADICTIONS.md) > COMMENTS/NAMING.

---

## (a) Frozen-fact verification

### ce3f8687 — `cert(events): database sequence and replay authority`

| Claim | Result |
|---|---|
| Touches exactly 4 paths | **CONFIRMED.** `git show --stat ce3f8687` lists exactly: `EVIDENCE_LEDGER.md` (383 +/-), `OPERATING_SPEC.md` (36 +), `ping-runtime/events/unified_event_runtime.js` (143 +/-), `tests/event-sequence-replay/sequence_replay_cert.js` (431 +). Total 989 insertions, 4 deletions. |
| `ping-runtime/events/unified_event_runtime.js` byte-identical between ce3f8687 and worktree HEAD (84da2d40c) | **CONFIRMED.** `git diff ce3f8687 HEAD -- ping-runtime/events/unified_event_runtime.js` = 0 lines. (HEAD also contains 91e1337f4 and 84da2d40c which touched other files only.) |
| Worktree HEAD | `84da2d40c9dae3c4f7c6070845e073b1471d245a` matches the frozen pointer. Worktree is on branch `constitutional-convergence-v2`. Note: worktree has uncommitted modifications (`CERTIFICATION.md`, `CONTRADICTIONS.md`, `evals/.../EVAL-006...`, untracked `evidence/`) — not touched, reported as observed. |

### Certified sequence allocation path (frozen worktree, `ping-runtime/events/unified_event_runtime.js`, 532 lines)

- **Mechanism:** PostgreSQL sequence object. `initialize()` runs `CREATE SEQUENCE IF NOT EXISTS ping_events_sequence_seq`, `OWNED BY ping_events.sequence`, `ALTER COLUMN sequence SET DEFAULT nextval('ping_events_sequence_seq')`. The INSERT never supplies the column; allocation happens at insert attempt inside Postgres.
- **No MAX(sequence)+1:** grep for `MAX(sequence)` across the worktree finds hits only in (1) `gateway/canonical_event_envelope.js` (legacy writer), (2) test files mocking it, (3) `CONTRADICTIONS.md`/`EVIDENCE_LEDGER.md` documenting it, and (4) the runtime's own `initialize()` migration bookkeeping (`SELECT COALESCE(max(sequence),0)` backfill offset + `setval` high-water). The T11 falsification group in the cert statically asserts the emit persist block contains no `max(`.
- **No application-side counter:** no `nextSequence`, `_seqCounter`, `sequence++`, or `sequence + 1` in the runtime file (T11 asserts this statically).
- **Sequence excluded from identity/hash preimages:** `identityData = { event_type, source, namespace, logical_id|payload }` (step 1), `identityAuthority.generateId('event', identityData)` (step 4), persistence (step 6). T10 asserts statically that the identity block contains no `sequence` key and that minting precedes `event.sequence = sequence`. Timestamp is also deliberately excluded from identity (wall-clock = observation metadata; `logical_id` is the timestamp-stripped logical identity).
- **Duplicate handling:** `INSERT INTO ping_events (...) VALUES (...) ON CONFLICT (event_id) DO NOTHING RETURNING sequence`. On conflict the row count is 0, the duplicate is counted in `stats.deduplicated`, and the code re-reads the original row's sequence (`SELECT sequence FROM ping_events WHERE event_id = $1`) so the caller observes the one persisted position. A conflicted insert may still consume a sequence value internally — classified as normal under the allocation-position contract (monotonic uniqueness, not contiguity).
- **Transaction boundary:** emit() has NO explicit transaction. INSERT, handler dispatch, and integration routing are sequential awaits with no BEGIN/COMMIT wrapping. A handler throwing is caught and logged; the event is already persisted. Dispatch is post-persistence, not atomic with it.
- **Replay reader:** `replay({afterSequence, limit, consumer})` — `SELECT ... FROM ping_events WHERE sequence > $1 ORDER BY sequence ASC LIMIT $2`, read-only, no canonical writes, consumer errors stop delivery and report the cursor. `query()` (the other read path) orders by `timestamp DESC` — note: NOT sequence order.
- **Backfill:** pre-sequence rows get `row_number() OVER (ORDER BY timestamp, event_id)` offset by current max; classified in-code as LEGACY BACKFILL ORDER, not proven historical order. `setval` with three-arg form advances past the high-water mark. Unique index + NOT NULL enforced after.

### What `tests/event-sequence-replay/sequence_replay_cert.js` (431 lines) covers — characterized from source, NOT executed

Self-contained scratch-DB harness: creates its own database on a dedicated PG container (`p0-cert-postgres`, port 5434), runs everything through `UnifiedEventRuntime.emit()`, drops the DB in `finally`. Never touches the canonical store.

- **T1 legacy migration:** 5 legacy rows preserved, unique strictly-increasing backfill sequences following (timestamp, event_id) with identical timestamps, post-migration emit continues at 6.
- **T2 identical timestamps:** later emit gets larger sequence; replay follows sequence, not timestamp.
- **T3 duplicate idempotency:** same `logical_id` → same `event_id`, one row, one sequence; post-duplicate emit monotonic (gaps tolerated, never asserted absent).
- **T4 replay basics** (not read in full; group exists).
- **T5 reinitialization durability:** client reinit AND a real `docker restart p0-cert-postgres` preserve event_id + sequence + payload byte-identical; replay order identical.
- **T6 concurrency:** 20 parallel emits → 20 unique sequences, 20 unique event_ids, `event_[0-9a-f]{16}` format holds, replay strictly increasing.
- **T7/T8:** empty and single-event replay.
- **T9 consumer boundary:** in-order delivery, fail-fast with cursor on consumer error, replay performs zero writes (row count + table list unchanged).
- **T10 identity/hash invariance:** same logical event with different payload timestamps → same event_id; storage sequence does not leak into payload/metadata; static assertions on preimage/ordering.
- **T11 authority audit:** exactly one event table in the scratch DB; exactly one `INSERT INTO ping_events` in the runtime source; falsification scan for app counters; `max(sequence)` only in `initialize()` bookkeeping; the one allocator is the PG sequence.
- **Count caveat:** the source contains **68 `check()` calls + 3 `blocked()` calls = 71 result entries**, but `EVIDENCE_LEDGER.md:622` records "**73/73 checks pass** on live PostgreSQL 15". The 73 figure does not reconcile with the source I read (possible explanations: ledger counted at a different revision, or counts `note()` lines — unknowable from source). The empirical claim is DOCUMENTED_ONLY from my vantage point; I did not execute the harness. Flagged as a minor count discrepancy, not a substantive contradiction.

### 91e1337f4 / 84da2d40c (witness commits — verified frozen, not modified)

- `git show --stat 84da2d40c`: 3 files — `ping-runtime/workers/canonical_workers.js` (+16), `gateway/test_witness_negpath.js` (+29/-), `evals/constitutional-runtime/EVAL-010_witness_failure_honesty.js` (+13). Binds `witness_root` into attestations (`canonical_workers.js:331,491-508`); missing/empty `witness_root` → `rejected/missing_witness_root`.
- Both commits present in the frozen worktree and untouched.

---

## (b) Identity / preimage matrix

Canonical primitives (frozen worktree): `CanonicalBytes.serialize()` → RFC-8785 via `CanonicalJson` (compiled artifact from `canonical_json.ts`; F7/D1 fail-closed domain: rejects NaN/±Infinity/undefined, sparse arrays, circular refs, Buffer, functions, symbols, bigint; depth cap 64). `CanonicalAuthority.hashBytes()` = SHA-256. `IdentityAuthority.generateId(type, data)` = `{type}_{sha256(canonicalBytes({type, version:'2.0.0', identity_version:'2.0.0', ...data}))[0:16]}`.

| IDENTITY TYPE | PREIMAGE | OWNER | ALGORITHM | VERSION | COLLISION SEMANTICS | PERSISTENCE | CALLERS | MATURITY |
|---|---|---|---|---|---|---|---|---|
| `event_id` V2 (certified) | `{type:'event', version, identity_version, event_type, source, namespace, logical_id\|payload}` (timestamp excluded) | `IdentityAuthority.generateId` via `UnifiedEventRuntime.emit` step 4 | SHA-256 / RFC-8785 | 2.0.0 in preimage | deterministic; same logical event → same ID (idempotent retries converge) | `ping_events.event_id` PK | `UnifiedEventRuntime.emit` | PROVEN_INTEGRATION (cert T6/T10; not re-run here) |
| `event_id` Era H (live) | `JSON.stringify(identity)` (non-canonical; key-order dependent) | direct `crypto.createHash` in old `UnifiedEventRuntime.emit` | SHA-256, full 64-hex, unprefixed | none | deterministic-ish but serialization-order fragile | `ping_events.event_id` (live image) | old runtime emit | PROVEN_RUNTIME (live container) |
| `event_id` (TenantOS legacy) | `${tenantId}:${eventType}:${timestamp}:${sequence}` (wall-clock IN preimage → non-deterministic) | `CanonicalEventEnvelope.generateEventId` | UUID v5 (SHA-1 based) | `event_version '1.0.0'` | re-emission of same logical event → NEW id (true duplicates) | `canonical_events.event_id` | `executeEmitEvent` ← 4 business authorities + HTTP route | PROVEN_RUNTIME (wired in live image) |
| `event_id` (ConstitutionalEventSourcing) | `{type:'event', version, type:eventType, aggregate_id, timestamp}` via `generateId('event',…)` — **SAME `event_` output namespace as V2, different preimage, wall-clock included** | `ConstitutionalEventSourcing.emitEvent` | SHA-256 / RFC-8785 | 2.0.0 (but preimage differs) | non-idempotent (timestamp) | `constitutional_events.event_id` (UPSERT — see C8) | config-gated (`enable_event_sourcing`) | CONDITIONAL_DORMANT (live gate status UNKNOWN) |
| `event_id` (`EventWriteAuthority.createEvent`) | `{type:'event', version, type:eventType}` — same `event_` namespace, third preimage | `EventWriteAuthority` | SHA-256 / RFC-8785 | 2.0.0 | constant per eventType (payload NOT in preimage — every event of a type collides) | in-memory object | `knowledge_compiler.js`, `end_to_end_verifier.js` | BUILT_NOT_LIVE (not in gateway bootstrap) |
| `event_id` (`event_bus.js`) | `{type:'event', version, type:'event'}` — same namespace, constant preimage | `event_bus` | SHA-256 / RFC-8785 | 2.0.0 | constant (all events same ID) | in-memory | unknown | BUILT_NOT_LIVE |
| `artifact_id` | local `canonicalBytes()` = `JSON.stringify(obj, Object.keys(obj).sort())` — **broken**: replacer array silently DROPS nested keys not present at top level | `ArtifactAuthority.deterministicId` | SHA-256 double-hash → `art_<16hex>` | none | nested content excluded from identity; two artifacts differing only in dropped nested fields collide | artifact store | `execution/engine.js` (live) | CURRENT EXECUTABLE CODE (live path, defective serializer) |
| `mission_id` | `` `${missionType}:${payload.event_id}` `` or `` `${missionType}:${JSON.stringify(payload)}` `` — plain JSON.stringify (key-order fragile) | `MissionRuntime.create` | SHA-256 `[0:16]`, unprefixed | none | idempotent-by-construction when event_id present; fragile otherwise | `ping_missions.mission_id` PK, ON CONFLICT DO NOTHING | mission_runtime | PROVEN_RUNTIME (wired) |
| `work_order_id` | `'workorder:' + taskId` | `external_agent_adapter.workOrderId` | SHA-256 `[0:16]`, unprefixed | none | deterministic per taskId | work order objects | `issueWorkOrder` | CURRENT EXECUTABLE CODE |
| `result_id` | `'external-result:' + stableStringify(binding)` (local recursive key-sorted stringify — correct) | `external_agent_adapter.resultIdentity` | SHA-256 full 64-hex, unprefixed | none | deterministic per binding | result envelope; reused as `logical_id` for event emission | `verifyResultEnvelope` | CURRENT EXECUTABLE CODE |
| `effect_id` (main repo, approval branch) | `{event_type, aggregate_id, action_type}` via `CanonicalAuthority.hash` DIRECTLY — **third minting convention** sharing the `{prefix}_{16hex}` output shape (no `type`/`identity_version` in preimage) | `EffectAuthority.generateEffectId` | SHA-256 / RFC-8785 → `effect_<16hex>` | none | deterministic per (capability, target) | effects store or in-memory map | approval flow | EXPERIMENTAL (feature branch) |
| `node_id` (knowledge) | `` `${nodeType}:${label}:${JSON.stringify(data)}` `` | `KnowledgeGraph.addNode` | SHA-256 `[0:16]`, unprefixed | none | key-order fragile via JSON.stringify(data) | `knowledge_nodes.node_id` PK, ON CONFLICT DO UPDATE | knowledge_graph | PROVEN_RUNTIME (wired) |
| `edge_id` (knowledge) | `` `${sourceId}:${targetId}:${edgeType}` `` | `KnowledgeGraph.addEdge` | SHA-256 `[0:16]`, unprefixed | none | deterministic per triple | `knowledge_edges.edge_id` PK, ON CONFLICT DO NOTHING | knowledge_graph | PROVEN_RUNTIME (wired) |
| `witness_id` | `generateFromCanonicalHash(sha256(witnessRoot) bytes, 'witness')` → `witness_<16hex>` — **bypasses V2 versioning** (no identity_version in preimage); effectively double-hashed | `WitnessRecorder.record` | SHA-256 → `witness_<16hex>` | none in preimage | deterministic per witness root | witness objects | witness flow | CURRENT EXECUTABLE CODE |
| `witness_root` | ordered witness IDs → ordered canonical bytes → concat → `hashBytes` | `WitnessRecorder._generateWitnessRoot` | SHA-256 | — | — | bound into attestations @84da2d40c | canonical_workers | PROVEN_UNIT |
| `context_hash` | `JSON.stringify(context)` (non-canonical) | `ContextAuthority` (local `crypto.createHash`) | SHA-256 `[0:16]`, unprefixed | none | key-order fragile | context object field | context build | CURRENT EXECUTABLE CODE; self-violates canonical law "every hash → CanonicalAuthority" |
| `repository_events` chain | caller-supplied `event_id`; per-object `sequence` (caller-supplied); `PreviousEventHash`/`CanonicalEventHash`/`chain_root` via `CanonicalAuthority.hashChain` | `EventRepository.appendEvent` | SHA-256 chain | `authority_version` column | chain-linked per object_id | `repository_events` (no ON CONFLICT — duplicate throws) | many legacy authorities (capability_scheduler, agent_memory_authority, distributed_desktop_agents, automatic_mission_generator, continuous_replay_authority, GatewayToKernelAdapter) | LEGACY (code) / PRESERVED_AUDIT_HISTORY (decision) |
| `identity_authority` self-id | `{identity_version, constitutional_version:'4.0.0'}` | `IdentityAuthority._generateAuthorityId` | SHA-256 → `identity_<16hex>` | 2.0.0 | — | in-memory singleton | — | CURRENT EXECUTABLE CODE |

**Also noted:** `DeterministicIdAuthority` is self-declared DEPRECATED ("Constitutional Violation: Multiple identity authorities") yet still consumed by `WorkflowIdentityAuthority` (live via `gateway/temporal_scheduler_provider.js`). `CanonicalAuthority.hashEventSchema` / `hashEventCanonical` double-serialize (`this.hash(CanonicalBytes.serialize(...))` → `serialize(Buffer)` throws) — broken by inspection, reachable only from `runtime/kernel/authorities/standard_event_schema.js`, itself referenced only by a patch-validation script (`test_patch_011.js`): BUILT_NOT_LIVE, broken.

**Namespaces:** `'core::system'` / `'tenant::<id>'` are string literals validated by regex at the emit choke point; no ID minting. **Evidence IDs:** none minted in scope — `evidence_authority.js` anchors on `source_event_id` (FK into `ping_events`). **Relationship IDs:** covered by `knowledge_edges.edge_id`. **run_id/attempt_id:** no minted IDs found; work orders carry an integer `attempt` counter.

### Matrix findings (flagged)

- **F1 — Same output namespace, multiple minters (strongest).** `event_<16hex>` is minted from **four different preimages**: V2 canonical (UnifiedEventRuntime), `{type, aggregate_id, timestamp}` (ConstitutionalEventSourcing), `{type: eventType}` (EventWriteAuthority — every event of a type collides), `{type:'event'}` (event_bus — constant). The type prefix is the only domain separation and it is shared. An `event_` ID does not identify its minting authority, preimage, or determinism properties. `EventWriteAuthority`/`event_bus` are not in the gateway bootstrap (BUILT_NOT_LIVE); ConstitutionalEventSourcing is config-gated (CONDITIONAL_DORMANT).
- **F2 — Three minting conventions, one output shape.** `generateId` (V2, versioned preimage), `generateFromCanonicalHash` (unversioned), and direct `CanonicalAuthority.hash` + manual prefix (`effect_id`) all produce `{prefix}_{16hex}`. `witness_id` and all knowledge/mission/work-order/result/effect IDs skip V2 versioning; era migration cannot distinguish them.
- **F3 — Non-canonical serializers inside identity preimages** (mission_id payload branch, node_id, context_hash, artifact_authorities' broken replacer). Key-order dependence breaks the idempotency these IDs claim.
- **F4 — `artifact_authorities.js` local serializer is actively wrong**: `JSON.stringify(obj, Object.keys(obj).sort())` drops nested properties whose names are not top-level keys. Live via `execution/engine.js`.
- **F5 — Uniform 16-hex truncation is accidental, not designed.** V2, mission/node/edge/work-order/context IDs all truncate SHA-256 to 64 bits independently. Fine at current scale; no documented collision analysis; no shared rationale.

---

## (c) Event authority / store census

### Who decides "accepted"? (authorities)

| # | Authority | Scope | Verdict |
|---|---|---|---|
| 1 | `UnifiedEventRuntime.emit()` → `ping_events` | canonical acceptance | **SOLE CANONICAL** (frozen worktree). Single INSERT path, ON CONFLICT DO NOTHING, PG-sequence allocation, replay reader. |
| 2 | `CanonicalEventEnvelope.executeEmitEvent` → `canonical_events` | legacy ingress surface | **NOT an authority** — producer. MC-1 classifies `canonical_events` as UPSTREAM INGRESS STORE, NON-CANONICAL UNTIL CONVERGED. Still a live writer (falsification-relevant, not authority-breaking). |
| 3 | `EventRepository.appendEvent` → `repository_events` | derived hash-chain audit | **NOT an authority** per decision — but the decided end-state (`EventRepository.project(E)`) **is not implemented**; `appendEvent` remains a primary-style writer with caller-supplied sequences. Gap between decision prose and code. |
| 4 | `ConstitutionalEventSourcing.emitEvent` → `constitutional_events` | duplicate store | **DUPLICATE** (config-gated dormant). Own sequence allocator (MAX+1), own `event_` minter, history-mutating upsert. |
| 5 | Python `witness_worker.py` / `mission_control_knowledge_apis.py` → `events`, `authority_witness` | BrainOS lineage | **LEGACY** — no live PING python process found on Pig at inspection; superseded per "Replaces: BrainOS Python". |
| 6 | Old `EventBridge` (live image) | retired bridge | **RETIRED in worktree** (PRESERVED_INACTIVE), **still wired in the live image**, re-emitting both `canonical_events` AND `repository_events` into `ping_events` — including the frozen-defect repository leg (derived truth → source truth). |

### Stores (tables)

| Table | Writer(s) | Sequence semantics | Identity | Classification |
|---|---|---|---|---|
| `ping_events` | `UnifiedEventRuntime.emit` ONLY (non-test code) | **PG sequence** (worktree) / none (live image) | V2 `event_<16hex>` (worktree) / 64-hex (live image) | **CANONICAL** |
| `canonical_events` | `CanonicalEventEnvelope.executeEmitEvent` | `MAX(sequence)+1` per tenant, read-modify-write, no lock; in-memory `_sequences` Map also present | UUID v5 incl. wall-clock (non-deterministic); ON CONFLICT (tenant_id, sequence) DO NOTHING | **LEGACY INGRESS SURFACE** (converged by LegacyIngressAdapter in worktree / old EventBridge in live image) |
| `repository_events` | `EventRepository.appendEvent` (many legacy callers) | caller-supplied per-object chain position (different meaning from the other two `sequence` columns) | caller-supplied; chain-linked hashes | **DERIVED / PRESERVED_AUDIT_HISTORY** (decision); code still a primary writer |
| `constitutional_events` (+`constitutional_snapshots`) | `ConstitutionalEventSourcing.emitEvent` | `MAX(sequence_number)+1`, fallback `return 1` on DB error (collision risk) | `event_<16hex>` from non-canonical preimage | **DUPLICATE** (conditional dormant) |
| `events`, `authority_witness` | Python workers | uuid/hashlib ad hoc | uuid | **LEGACY** (BrainOS) |
| `ping_bridge_cursors` | old EventBridge | n/a (cursor store) | — | operational, retired with bridge |
| `event_processing` | `markProcessed/markFailed` | n/a | — | operational (worker bookkeeping) |

**Three different `sequence` columns, three different meanings:** `ping_events.sequence` = global DB allocation position; `canonical_events.sequence` = per-tenant MAX+1; `repository_events.sequence` = caller-supplied per-object chain position. Same column name, no shared semantics — a standing confusion hazard.

### Live deployment vs certified code (PROVEN_RUNTIME via container FS)

The running `ping-gateway` container (`ping-gateway:devin-boundary2`, up 25h, boots `node gateway/server.js` → `gateway/bootstrap/gateway_runtime.js`):

- `/app/ping-runtime/events/` contains **no `legacy_ingress_adapter.js`**; `unified_event_runtime.js` has **zero mentions of `sequence`** (no `nextval`, no replay-by-sequence).
- The live bootstrap wires `CanonicalEventEnvelope` (→ `canonical_events`), the OLD `UnifiedEventRuntime` (64-hex IDs, no sequence), and the OLD `EventBridge` (re-emitting `canonical_events` **and** `repository_events`).
- **Consequence:** the certified claims in ce3f8687 (DB sequence, boring replay, LegacyIngressAdapter convergence, "exactly one live writer to ping_events") describe the frozen worktree, NOT the running system. The live system has no certified ordering, no certified replay, and still runs the retired repository_events re-emission leg that MC-1 froze as a defect (C-035/C-037/vacuous dedup/convergence losses).

---

## (d) Falsification attempts and outcomes

1. **Second canonical writer to `ping_events`?** Grepped `INSERT INTO ping_events` across both repos: only `unified_event_runtime.js` in non-test code (evals/tests mock it). **Not found — single writer holds (worktree).** Live image: the old EventBridge re-emits *through* `emit()`, so still one writer function, but with the retired repository leg active.
2. **Alternate sequence allocator for canonical events?** `ping_events_sequence_seq` is the only allocator in the certified path (T11 static scan + my grep). **BUT** two other live-code sequence allocators exist for *other* event tables: `MAX(sequence)+1` per tenant in `canonical_event_envelope.js` (live, PROVEN_RUNTIME) and `MAX(sequence_number)+1` in `constitutional_event_sourcing.js` (config-gated). Neither writes `ping_events`, so the single-authority claim for `ping_events` survives; the *system* has three sequence-allocation regimes.
3. **Second minter of canonical `event_` IDs?** **FOUND.** `ConstitutionalEventSourcing.emitEvent` mints `event_<16hex>` from `{type, aggregate_id, timestamp}` — same namespace as V2 canonical IDs, different preimage, non-deterministic. Config-gated dormant; gate state in the live image UNKNOWN (manifest not located). `EventWriteAuthority` and `event_bus` mint two more variants (BUILT_NOT_LIVE).
4. **Duplicate/collision handling gaps?** `EventRepository.appendEvent` has NO `ON CONFLICT` (duplicate → throw); `canonical_events` dedups on `(tenant_id, sequence)` not logical identity (C-033: wall-clock UUIDv5 + MAX+1 → true duplicates on re-emit); `constitutional_events` UPSERT *mutates* history on conflict.
5. **In-memory alternate stores?** `UnifiedEventRuntime._handlers` is dispatch-only. `ConstitutionalEventSourcing._eventStore` is an in-memory mirror of its table. No hidden canonical in-memory log found.
6. **Python writers?** Found (`witness_worker.py` → `events`/`authority_witness`); no live process at inspection → LEGACY, not a live second authority.

---

## (e) Contradictions

- **C1.** Certified "exactly one live writer to ping_events / DB sequence / boring replay" vs the LIVE container: live image predates ce3f8687 and MC-1 (no sequence column, no LegacyIngressAdapter, old EventBridge with the retired repository_events leg still wired). The certification describes code, not the running system.
- **C2.** Decision: "EventRepository survives as DERIVED hash-chain audit/projection adapter (`EventRepository.project(E)`)" vs code: no `project()` method exists; `appendEvent` (caller-supplied sequence, no conflict handling) is the only write path and is called by many legacy authorities as a primary writer.
- **C3.** Canonical law "every hash → CanonicalAuthority / every identity → IdentityAuthority/RuntimeIdentityAuthority" vs: `context_authority.js` (direct sha256 of JSON.stringify), `artifact_authorities.js` (own serializer), `mission_runtime.js`, `knowledge_graph.js`, `external_agent_adapter.js` (direct createHash). The law is aspirational, not enforced.
- **C4.** "One constitutional identity law" vs four `event_` preimages sharing one output namespace (F1), three minting conventions sharing one output shape (F2), and Era H 64-hex vs V2 `event_<16hex>` vs UUIDv5 coexisting.
- **C5.** EVIDENCE_LEDGER "73/73" vs 68 check() + 3 blocked() = 71 entries in the harness source. Minor; reconciliation unknown.
- **C6.** V2 `identity_version` in preimage (events) vs `witness_id` via unversioned `generateFromCanonicalHash` — versioning discipline not uniform.
- **C7.** `canonical_events` dedup key `(tenant_id, sequence)` + wall-clock UUIDv5 ⇒ re-emission creates true duplicate rows (already recorded as C-033 in CONTRADICTIONS.md; still live in the image).
- **C8.** `ConstitutionalEventSourcing._persistEvent`: `ON CONFLICT (event_id) DO UPDATE SET event_data, occurred_at` — silently rewrites history; `_getNextSequenceNumber` falls back to `1` on DB error — sequence collision by design.
- **C9.** `CanonicalAuthority.hashEventSchema` / `hashEventCanonical` always throw (double-serialize Buffer) — dead-but-present in the canonical authority; reachable only via a patch-validation script.

## (f) Unknowns

- **U1.** Live DB contents (table census, row counts, which ID eras are actually stored) — abandoned rather than recover credentials. SELECT-only access was authorized but no credential path exists that isn't a secret read.
- **U2.** `enable_event_sourcing` value in the live deployment (manifest not found under /app).
- **U3.** Whether any scheduler/cron launches the Python BrainOS runtime (none running at inspection).
- **U4.** Live traffic through `CanonicalEventEnvelope` (wired; business authorities call `executeEmitEvent`).
- **U5.** 73 vs 71 check-count reconciliation.
- **U6.** Other worktrees + `/tmp/crx-runtime` not surveyed (out of scope).

## (g) Candidate deletions / merges (all PROPOSED, none executed)

1. `gateway/constitutional_event_sourcing.js` (+ `constitutional_events`/`constitutional_snapshots`) — duplicate store, duplicate `event_` minter, history-mutating upsert, MAX+1 with fallback-to-1. Strongest quarantine candidate.
2. `gateway/event_write_authority.js`, `gateway/event_bus.js` — unwired `event_` minters (one with constant preimage, one with per-type-constant preimage). Archive.
3. `ping-runtime/authorities/deterministic_id_authority.js` (self-declared deprecated) — migrate `WorkflowIdentityAuthority` to `generateId`.
4. `CanonicalAuthority.hashEventSchema`/`hashEventCanonical` — fix (use `hashBytes`) or delete.
5. Python BrainOS writers (`witness_worker.py`, `mission_control_knowledge_apis.py`, `runtime/constitutional_runtime.py`) — formally classify PRESERVED_INACTIVE.
6. `ping-runtime/events/event_bridge.js` — already PRESERVED_INACTIVE; keep as forensic evidence per the no-deletion rule.
7. Unify minting: route `effect_id`, `artifact_id`, `mission_id`, knowledge IDs, `work_order_id`, `result_id`, `witness_id` through `IdentityAuthority.generateId` V2 (or explicitly grandfather with era marking); fix `artifact_authorities` serializer via `CanonicalBytes.serialize`.
8. Give the three `sequence` columns distinct names or documented semantics; consider renaming `repository_events.sequence` → `chain_position` and `canonical_events.sequence` → `tenant_sequence` to end the shared-name confusion.

## (h) Top-5 highest-confidence improvements

1. **Quarantine `ConstitutionalEventSourcing`.** It is a second event store with its own sequence allocator, its own `event_`-namespace minter (different preimage, wall-clock → non-idempotent), and a history-mutating upsert. If `enable_event_sourcing` is ever true, it silently breaks the single-authority and immutability guarantees. Config-gated dormant is not fail-closed enough for a component this dangerous — remove the gate's ability to enable it or delete the module.
2. **Redeploy the certified stack.** The live `ping-gateway` image predates ce3f8687 and MC-1: no sequence column, no certified replay, no LegacyIngressAdapter, and the old EventBridge still re-emits the retired `repository_events` leg (the exact defect MC-1 froze). Every certified claim currently describes code that is not running.
3. **Implement or reclassify `EventRepository.project(E)`.** The constitutional decision describes a derived-projection end-state that does not exist in code; what exists is `appendEvent`, a primary-style writer with caller-supplied sequences and no conflict handling, called by many legacy authorities. Either build the projection path or correct the decision to match the code.
4. **Unify the `event_` identity namespace.** Four preimages mint `event_<16hex>`; `EventWriteAuthority`'s variant collides per event type by construction. Route all minting through the V2 `generateId('event', …)` preimage (or give each minter a distinct, documented type prefix), apply `identity_version` uniformly (witness IDs currently bypass it), and fix the `hashEventSchema`/`hashEventCanonical` double-serialize throw.
5. **Fix `canonical_events` dedup (C-033) or retire the writer.** Wall-clock in the UUIDv5 preimage plus `ON CONFLICT (tenant_id, sequence)` means re-emission manufactures true duplicates that the LegacyIngressAdapter then converges as distinct canonical events. Either make the envelope ID deterministic on logical identity (so ON CONFLICT absorbs retries) or stop the business authorities from writing `canonical_events` and emit through `UnifiedEventRuntime` directly.

---

### Method note

All findings above are from read-only source inspection (`git show/diff/grep`), the frozen worktree at 84da2d40c, `/home/nolan/ping` at 88c9651be, and read-only `docker exec` filesystem inspection of the live `ping-gateway` container. No code was executed against any database; the cert harness was characterized from source only. Maturity labels follow the program's evidence hierarchy; where a claim rests on documentation rather than executed code it is labeled accordingly.
