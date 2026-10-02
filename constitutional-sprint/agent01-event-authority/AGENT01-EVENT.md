# AGENT 01 — EVENT AUTHORITY DOMAIN RECORD
**Re-dispatch (night shift), 2026-09-23 ~21:00 MDT. Role: Event Authority. Mode: PROPOSE ONLY.**
**Commits created: NONE. Live core (/home/nolan/ping): read-only. Oracle container: passive inspection only.**
**No secret values read or recorded (metadata only).**

Scope: event ingest/append/read paths. Worked from live code; the hundreds of toplevel audit .md files
were used as pointers only. Prior deliverables consumed: event/EVENT-FORENSICS.md,
FINDINGS-LOG.md (F4-F12, F17, B1, F23-F28), agent20-convergence/GLOBAL-AUTHORITY-MAP.md (§4, CP-1).

**Headline: B1 is CLOSED (byte-level proof). The repository_events write side is UNWIRED in the
current tree (corrects EVENT-FORENSICS.md §2B #6 "PROVEN live"). Two liveness dimensions applied
throughout per Agent 20 §4.**

---

## §1 — B1 CLOSURE: which POST /events code runs in the Oracle container — CLOSED

Method (all passive, via `oracle-ssh.sh -s` on the Oracle SSH chain; local copy of the script at
`agent01-event-authority/oracle-ssh.sh`): `docker ps`, `docker inspect` (cmd/entrypoint/image),
`docker image inspect` (created), `docker exec` `sha256sum`/`cat`/`grep`, `/proc/net/tcp` listen
state. NO mutation, NO restart, NO traffic, NO env/secret reads.

### 1.1 Container identity (verified live 2026-09-23 ~21:00 MDT)

| Field | Value |
|---|---|
| Host | Oracle `ping-core-01` (ubuntu) |
| Container | `ping-gateway`, image `ping-gateway:candidate-3c5d280dd`, Up 2 days |
| Image created | 2026-09-21T11:42:46Z |
| Process | PID 1 `node gateway/server.js` (WorkingDir `/app`), alive |
| Socket | LISTEN `0.0.0.0:8080` inside container (`/proc/net/tcp` state `0A`); host binds `127.0.0.1:8080` |
| Tag note | `3c5d280dd` IS a real commit in `/home/nolan/ping` (`git cat-file -t` = commit) |

### 1.2 Deployed bytes vs Pig-side copies (sha256, read-only)

| File (container path) | Deployed sha256 | Worktree `/home/nolan/ping` @ `cc6856c3b` | `ping-gateway-src` copy | Verdict |
|---|---|---|---|---|
| `/app/gateway/routes/events.js` (8497 B) | `4e3c66b60631b0d9213242e927470477e1da6ec54d697c5fa54157bd2daba8ac` | `4e3c66b6…` (identical; file clean in git) | `ad9b9c92…` (different) | **Deployed = worktree BFF-adapter branch, byte-identical** |
| `/app/ping-runtime/events/unified_event_runtime.js` | `99dc95fe57fe9868166ef94f0baa2088878e926a2dd7b40bfabef499b720e7d7` | identical | — | Deployed = worktree |
| `/app/gateway/routes/ingest.js` | `f1c1abdaf7745fdda40f6efda985c36752dd3e509b105001348d46119c7b0e38` | identical | — | Deployed = worktree |
| `/app/gateway/canonical_event_envelope.js` | `3bbfaceb9a54cd2b4c890c022bfdc3bbe3bba1de7dc82e87f66ed1f32974efb3` | identical | — | Deployed = worktree |
| `/app/gateway/social_ingest_adapter.js` | `93c3a5ebeb66b922a7bfb3420af45894ca2aecb1f95fb9e850402fae8fa03759` | present in worktree | — | Present in container |
| `/app/gateway/knowledge_ingest_adapter.js` | `bc7c5cbbc751e873ff7c7edcd96e276e35c035df8b7a7c26327921c6538a428f` | present in worktree | — | Present in container |

Full deployed `events.js` pulled to `agent01-event-authority/deployed-events.js` (sha256 matches
container-side value; kept as evidence, not a patch source).

Marker grep on the DEPLOYED file: `authorizeNamespace|canonicalizeAndEmit` = 0 matches;
`social_ingest_adapter|knowledge_ingest_adapter` = 2 matches; `tenant` = 0 matches.

### 1.3 What the deployed POST /events does (from deployed-events.js:71-128)

- BFF-envelope branch (`req.body.type && req.body.payload && !req.body.event_type`): selects
  `knowledge_ingest_adapter` when `payload.schema` starts with `ping.knowledge.`, else
  `social_ingest_adapter`; `normalize(...)` (typed errors → 400 on `INVALID_|UNKNOWN_|MISSING_|
  UNSUPPORTED_|PREDICATE_|SECRET_|SIGNER_` prefixes, else 500); then
  `eventRuntime.emit(norm.eventType, 'api', norm.eventData, { metadata: { aggregate_id,
  aggregate_type } })`.
- Legacy branch: requires `event_type, aggregate_id, aggregate_type, event_data`, then
  `eventRuntime.emit(event_type, 'api', event_data, ...)` directly. Comment in code:
  "Canonical spine: emit directly through UnifiedEventRuntime (ping_events), not through the
  kernel pipeline (repository_events). The kernel's reducer/projection registries are empty and
  EventBridge adds a 5s delay for no benefit."
- **No tenant-registry check, no `authorizeNamespace`, no `canonicalizeAndEmit` on POST /events.**
- POST /ingest (deployed `ingest.js`, 2 marker matches) DOES route through
  `authorizeNamespace` + `canonicalizeAndEmit`.
- Read routes: `EventReadAuthority` first, `SELECT * FROM ping_events …` fallback
  (deployed-events.js:60-69) — partial sovereignty confirmed in the deployed bytes.

### 1.4 Resolution of the three-way mismatch

- The 2026-09-16/17 live capture (POST /events → `authorizeNamespace` → 403, event
  `5e24e593…` persisted) matched NEITHER Pig-side copy. It is now explained: that capture
  described a **live-patched container**; the current image (built 2026-09-21T11:42:46Z from
  the worktree line, tag `candidate-3c5d280dd`) replaced it with the worktree BFF-adapter bytes.
  The capture's behavior is SUPERSEDED, not evidence of a third deployed copy.
- **B1 verdict: CLOSED.** The running POST /events is the worktree copy, proven by byte equality.
  Nothing was mutated to obtain this; nothing further is blocked on "which bytes are deployed."

---

## §2 — WRITER CLOSURE: every writer to the three journal tables

Insertion paths: DIRECT = SQL INSERT in the file; EMIT = via `UnifiedEventRuntime.emit`;
APPEND = via kernel `EventRepository.appendEvent`; BRIDGE = via EventBridge re-emit;
HTTP = adapter client POST. "Authority claimed" = the authority the writer presents itself under.

### 2.1 ping_events writers — ALL funnel through UnifiedEventRuntime.emit

The sole SQL writer: `ping-runtime/events/unified_event_runtime.js:152`
`INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace)
VALUES ($1..$7) ON CONFLICT (event_id) DO NOTHING`, with fail-closed semantic-mismatch check
on conflict (:161-174, per F17).

| # | Caller (file:line) | Insertion path | Authority claimed | Liveness (declared / actual) |
|---|---|---|---|---|
| W-1 | `gateway/routes/events.js:97` (BFF-envelope branch) | EMIT (`eventRuntime.emit`) | POST /events route, UnifiedEventRuntime | Declared YES (bootstrap:682; deployed bytes verified) / Process LIVE, clients dark tonight |
| W-2 | `gateway/routes/events.js:120` (legacy branch) | EMIT | POST /events route, UnifiedEventRuntime | Same as W-1 |
| W-3 | `ping-runtime/canonicalization/canonicalization_service.js:143` (`canonicalizeAndEmit`) | EMIT | CanonicalizationService (namespace auth + canonical envelope) | Declared YES (bootstrap:447; deployed bytes verified) / Process LIVE, clients dark tonight |
| W-4 | `gateway/routes/identities.js:178` (`OBJECT_CREATED`) | EMIT | POST /identities, "the ONE IdentityAuthority" | Declared YES (bootstrap:683) / Process LIVE |
| W-5 | `ping-runtime/events/event_bridge.js:179,278` (re-emit of polled rows) | BRIDGE→EMIT | EventBridge (cursor-tracked, dedupe-checked) | Declared YES (bootstrap:462, `start()`ed) / In-process LIVE |
| W-d1 | `ping-runtime/orchestration/mission_runtime.js:88,115,136,165,180,235,292` | EMIT | mission-runtime | DORMANT: 0 inbound refs, never constructed |
| W-d2 | `ping-runtime/workers/canonical_workers.js:72`, `intelligence_worker.js:53` | EMIT | worker | DORMANT: 0 inbound refs |
| W-d3 | `gateway/test_*.js` (many) | EMIT | test harness | DORMANT (test only) |

### 2.2 repository_events writers — NONE WIRED (corrects EVENT-FORENSICS.md §2B #6)

The SQL writer: `runtime/kernel/event_repository.js:117` `appendEvent` — plain
`INSERT INTO repository_events (event_id, object_id, event_type, aggregate_type, sequence,
payload, witness, timestamp, authority, authority_version, causation_id, correlation_id,
created_at, RuntimeID, PreviousEventHash, CanonicalEventHash, ReducerHash, WitnessHash,
ReplayHash, chain_root)`. **No ON CONFLICT clause**: a duplicate `event_id` raises a
unique-violation (fail-closed), not a silent replace. (The `ON CONFLICT … DO UPDATE` hits at
:76,:85 are on the separate operational `event_processing` table — `markProcessed`/
`markFailed` — not the journal.)

| # | Caller (file:line) | Insertion path | Authority claimed | Liveness (declared / actual) |
|---|---|---|---|---|
| R-1..R-4 | `ping-runtime/agents/agent_memory_authority.js:617,646,675,703,731`; `ping-runtime/agents/distributed_desktop_agents.js:579,607,635,663,691`; `gateway/automatic_mission_generator.js:595,624,653`; `gateway/continuous_replay_authority.js:588,616,647,675,700,729,758,783,812,841,870` | APPEND (kernel EventRepository) | agent/memory/mission journal authorities | **DORMANT: 0 inbound refs each; never constructed on any live path** (verified `grep -rln` over gateway/ping-runtime/runtime). The forensics' "PROVEN live" was call-site evidence only; construction-trace refutes it. |
| R-5 | `gateway/append_orchestrator.js:91` (`_appendReplayEvent`) | DIRECT (tx client; bypasses hash chain: only event_id/object_id/event_type/sequence/payload/timestamp) | AppendOrchestrator ("Constitutional Transaction Coordinator") | **DORMANT: 0 callers of `appendConstitutionalObject`; `authority_registry.js` (its only registrar) never required by live code** (only `worktrees/` hits). SPECIFICALLY CLOSED as requested. |
| R-d | 12 more files bearing `appendEvent` calls: `gateway/patch_authority_v2.js`, `mission_authority_v2.js`, `trigger_authority.js`, `constitutional_execution_pipeline.js`, `constitutional_watchers.js`, `best_in_class_integration.js`, `persistent_queue_authority.js`, `local_first_execution_authority.js`, `constitutional_desktop_runtime.js`, `runtime/kernel/authorities/capability_scheduler.js`, `runtime/kernel/execution/constitutional_execution_pipeline.js` (+ `gateway/eventstore_persistence.js` F18, `gateway/replay_authority.js`, `replay_persistence_port.js`, `execution_graph_authority.js`, `worker_registry.js` on ports) | APPEND or port | various | **ALL DORMANT: 0 inbound refs each** |
| R-ddl | `gateway/migration_engine.js:213-245` | DDL (`CREATE TABLE IF NOT EXISTS repository_events` + indexes) | migration | Not a writer; file itself unwired (0 inbound refs) |

Consequence: **EventBridge's `repository_events` poll is live infrastructure (cursor-tracked,
bootstrap:462) reading an insert-silent table.** The "three-table reality" is currently a
two-table reality: `ping_events` (sovereign) ← EventBridge ← `canonical_events` (live writers),
with `repository_events` polled but unwritten. The kernel hash-chain journal is dormant code,
not a live secondary. (If any agent later wires these writers, the hash-chain columns are
intact in the schema.)

### 2.3 canonical_events writers — LIVE

The SQL writer: `gateway/canonical_event_envelope.js:174` `executeEmitEvent` —
`INSERT INTO canonical_events …`. The UPDATEs at :308,:324 are `executeMarkProcessed`/
`executeMarkFailed` (operational markers `processed/processed_at/worker/retries/last_error`),
NOT on the emit path.

| # | Caller (file:line) | Insertion path | Authority claimed | Liveness (declared / actual) |
|---|---|---|---|---|
| C-1 | `ping-runtime/business/ai_workspace_authority.js:88` | via `executeEmitEvent` | AI workspace authority (business emitter) | Declared YES (ReviewEmitter/CustomerEmitter/ProjectEmitter/ConnectorEmitter/SystemEmitter constructed bootstrap:568-571) / In-process LIVE |
| C-2 | `ping-runtime/business/review_authority.js:78` | via `executeEmitEvent` | review authority | Same as C-1 |
| C-3 | `ping-runtime/business/project_authority.js:150,197,301` | via `executeEmitEvent` | project authority | Same as C-1 |
| C-4 | `ping-runtime/business/customer_authority.js:541` | via `executeEmitEvent` | customer authority | Same as C-1 |
| C-5 | `gateway/routes/canonical_events.js:29` | via `executeEmitEvent` | POST /canonical-events route | Declared YES (mounted bootstrap:687) / Process LIVE |
| C-6 | `gateway/google/business_profile.js:148,223` | via `executeEmitEvent` | BusinessProfileAdapter | Declared YES (constructed bootstrap:240) / In-process LIVE |

### 2.4 Adapter repo writers (HTTP only — no pg dependency in adapter)

| # | Caller (file:line) | Insertion path | Authority claimed | Liveness (declared / actual) |
|---|---|---|---|---|
| A-1 | `/home/nolan/projects/ping-constitutional` `src/lib/ping/ping-object-reader.ts:370` (`submitEnvelope` → POST /events, BFF envelope `{type,payload,proof,metadata}`) | HTTP | PingObjectReader ("ONE governed read authority"; write side: submitEnvelope) | Declared YES / **DARK tonight (F12: `PING_GATEWAY_BASE_URL` unset → GatewayNotConfiguredError)** |
| A-2 | `src/fyd/social/envelope.ts:76` (`submitEnvelope` → POST `fydGatewayBaseUrl()/events`) | HTTP | FYD social write authority | Declared YES / **DARK tonight (F13: phantom 127.0.0.1:18199)** |

### 2.5 UPDATE/DELETE verification on the emit path (F17 re-check, current source)

- **No UPDATE on any journal INSERT path.** The only UPDATEs found: kernel `event_processing`
  table (`markProcessed`/`markFailed`, operational markers) and `canonical_events`
  `executeMarkProcessed`/`executeMarkFailed` (operational markers). None touch
  `event_id/event_type/payload` of a journaled row.
- **No DELETE in any emit-path file** (`unified_event_runtime.js`, `event_bridge.js`,
  `event_repository.js` kernel, `canonical_event_envelope.js`, `routes/events.js`):
  grep returned zero matches.
- `repository_events` INSERT has no conflict clause → duplicate `event_id` fails closed
  (unique-violation), never replaces.
- `ping_events` INSERT: `ON CONFLICT (event_id) DO NOTHING` + fail-closed semantic-mismatch
  re-check (F17, unified_event_runtime.js:161-174) — confirmed in current source.
- `trg_ping_events_append_only`: NOT re-verified tonight (requires a DB catalog query;
  out of the passive-container scope for this task). Standing evidence remains the
  2026-09-16/17 live capture. Flagged for Agent 13's durability pass.

### 2.6 Ghost / abandoned inventory (unchanged, re-confirmed tonight)

- `ConstitutionalEventStore`: zero hits (ghost).
- `AcquisitionManager`: zero hits (ghost).
- `IEventAuthority`: zero implementations/imports (abandoned contract).
- NATS: exists only in dormant Python (`constitutional-runtime`); NOT on the live JS path.
- Python `EventStore`/`PostgresEventRepository`: dormant (no live callers; `api/main.py`
  import claim remains refuted).
- SQLite: no event tables (confirmed again tonight: no pg/SQLite event writes in adapter;
  `persistence_adapter.js` sqlite backend carries no event tables).

---

## §3 — LIVENESS RECLASSIFICATION (Agent 20's two dimensions)

Declared-live = static, import-reachable from the live composition root
(`gateway/bootstrap/gateway_runtime.js`, `gateway/server.js`).
Actually-reachable = process + env + transport verified.
A mechanism is not CANONICAL_LIVE unless the second holds.

| # | Mechanism | Declared-live | Actually-reachable | Classification |
|---|---|---|---|---|
| L-1 | `UnifiedEventRuntime → ping_events` (Oracle container) | YES (bootstrap:433; routes mounted; deployed bytes verified §1.2) | Process YES (`node gateway/server.js` PID 1, up 2 days, LISTEN :8080, host binds 127.0.0.1:8080). Env not verified (secrets excluded by task). Transport: adapter→gateway DARK (F12); no client traffic observed tonight | **CANONICAL_LIVE (process)**; ingest DARK from the adapter surface |
| L-2 | POST /events (deployed BFF-adapter branch) | YES (bootstrap:682; bytes verified) | Process LIVE; transport DARK (A-1 dark, A-2 dark) | LIVE-but-clientless |
| L-3 | POST /ingest → CanonicalizationService | YES (bootstrap:691,447; bytes verified) | Process LIVE; transport DARK (no live clients tonight) | LIVE-but-clientless |
| L-4 | POST /identities → identities.js:178 emit | YES (bootstrap:683) | Process LIVE | LIVE (route serves; no tonight traffic observed) |
| L-5 | POST /canonical-events → executeEmitEvent | YES (bootstrap:687) | Process LIVE | LIVE (route serves) |
| L-6 | Business emitters → canonical_events (C-1..C-4, C-6) | YES (bootstrap:568-571,240) | In-process LIVE (same gateway process) | LIVE |
| L-7 | EventBridge (5s poll, batch 50) | YES (bootstrap:462, `start()`ed) | In-process LIVE | LIVE (poll loop runs; repository_events leg insert-silent) |
| L-8 | In-process dispatch (`.on(type)`) + IntegrationManager | YES (emit lines 158-164+) | In-process LIVE | LIVE |
| L-9 | EventReadAuthority + SQL fallback (GET routes) | PARTIAL (fallback exists in deployed bytes) | Process LIVE; read transport not probed tonight (capture-era evidence only) | PARTIAL (unchanged from forensics) |
| L-10 | repository_events writers (R-1..R-5, R-d) | **NO** (0 inbound refs; never constructed) | NO | **DORMANT** (reclassified from forensics' "PROVEN live") |
| L-11 | Adapter POST /events (A-1 ping-object-reader) | YES (import-reachable from live routes) | **NO** (F12: GatewayNotConfiguredError) | DARK |
| L-12 | Adapter social POST (A-2 envelope.ts) | YES | **NO** (F13: phantom :18199) | DARK |
| L-13 | AppendOrchestrator._appendReplayEvent | **NO** (0 callers; registry unwired) | NO | DORMANT (closed §2.2) |
| L-14 | EventStorePersistence replace-on-conflict (F18) | NO (0 consumers, re-confirmed) | NO | DORMANT hazard |
| L-15 | NATS outbox | NO (dormant Python only) | NO | NOT ON LIVE PATH |

Net change vs the forensics: L-10 is the one reclassification (live → dormant). Everything else
is confirmed. The core event spine is process-live and byte-verified; the adapter's journal
surface is dark; the secondary `repository_events` journal is unwired.

---

## §4 — CP-1 RECOMMENDATION (single ingest-authority)

B1's closure unblocks CP-1: the deployed bytes are known (worktree BFF-adapter copy), so the
convergence target is a concrete diff, not a guess.

**Recommendation:** Name `CanonicalizationService` the single HTTP ingest authority.

1. Route POST /events through `canonicalizeAndEmit` (it already owns namespace authorization
   and canonical-envelope construction; POST /ingest proves the wiring).
2. Fold the two deployed `POST /events` normalizations into it as configuration, not divergent
   route code: (a) the BFF `social_ingest_adapter`/`knowledge_ingest_adapter` envelope
   normalization (deployed-events.js:71-107) becomes a pre-canonicalization adapter stage;
   (b) the src/build copy's tenant-registry validation (`namespace = tenant::<id>`) becomes a
   namespace-resolution rule inside `authorizeNamespace`/`resolveNamespace`, not a route fork.
3. The legacy direct-emit branch (deployed-events.js:110-128) is retired once (1)+(2) cover its
   callers; until then it stays as-is (no second authority is created — the branch is an
   adapter to the same `emit`, not a competing decider).
4. Do NOT create an EventAuthorityV2 or a parallel ingest store (write-gate rule 5).

Proposal (diff + WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT) landed at
`patches/agent01-event-authority/CP-1-single-ingest-authority.md` — PROPOSAL ONLY, nothing applied,
no commits. Applying it requires coordinator approval and belongs in the sprint worktree
(`/home/nolan/projects/ping-constitutional`), never `/home/nolan/ping`.

---

## §5 — Evidence artifacts kept

- `agent01-event-authority/oracle-ssh.sh` — local copy of the Pig script (used for the B1 probe;
  runs locally only; no secrets passed as arguments).
- `agent01-event-authority/deployed-events.js` — the deployed `/app/gateway/routes/events.js`
  (8497 B, sha256 `4e3c66b6…`), pulled read-only from the container.
- `patches/agent01-event-authority/CP-1-single-ingest-authority.md` — the CP-1 proposal.

## Open items for other agents

- Agent 13: `trg_ping_events_append_only` not re-verified tonight (needs a read-only DB catalog
  query); `repository_events` insert-silence means the bridge's cursor table for that source
  never advances — confirm no alerting depends on it.
- Agent 02: `gateway/append_orchestrator.js` `_appendWitness` inserts into `witnesses` (dormant
  with the rest of the orchestrator); witness table writers otherwise unmapped.
- Agent 03: `continuous_replay_authority.js` (the replay writer) is unwired — the only live
  replay-adjacent writer is EventBridge's deduped re-emit.
- Agent 20: L-10 reclassification (repository_events writers live→dormant) narrows the
  GLOBAL-AUTHORITY-MAP rows 1/6/24 ("three-table reality" → two-table + polled-empty third).

**B1: CLOSED. Writer closure: COMPLETE (with one reclassification). Liveness: RECLASSIFIED.**
**Commits created: NONE.**
