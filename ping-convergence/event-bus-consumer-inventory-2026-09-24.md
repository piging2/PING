# Event-bus + legacy `events` lane — consumer inventory, classification, reachability proof, convergence plan

**Lane:** P1 Event-bus + legacy events
**Date:** 2026-09-24 (compiled from workspace-verified files; Pig-side state from evidence dated 2026-09-19 through 2026-09-24)
**Scope:** `~/workspace` verified directly; Pig (`/home/nolan/ping`, Oracle `/opt/ping/releases/...`) state carried in as evidence from the labeled forensic/proof files below.

> Live PING code runs on the Pig, not in this workspace. This workspace holds lane artifacts, test copies, and forensic evidence of Pig state. Pig-path findings below are each cited to the evidence file that proves them; nothing Pig-side was asserted from workspace files alone.

## 1. Consumer inventory

### 1a. Canonical path: UnifiedEventRuntime (UER) -> `ping_events` — THE spine

| # | Consumer / mechanism | Where | Proven state |
|---|---|---|---|
| U1 | `UnifiedEventRuntime` | Pig: `ping-runtime/events/unified_event_runtime.js`; workspace lane copy: `convergence-lane3/unified_event_runtime.js` | Sole production writer of `ping_events` (repo-wide Pig scan, convergence plan 2026-09-24; lane-f2 forensic). Append-only enforced live by DB trigger `trg_ping_events_append_only` (event-boundary REPORT, 2026-09-16; DDL copy `~/workspace/ping-overnight/event-boundary/trigger-append-only.sql`). |
| U2 | `POST /events` (gateway) | Pig: `gateway/routes/events.js` -> `UER.emit()` | Live. Namespace-authorization enforced 2026-09-16 (403 malformed, 401 unauth; 1017 -> 1018 -> 1018 idempotent re-emit). |
| U3 | `EventToMissionBridge` | Pig: `ping-runtime/orchestration/event_to_mission_bridge.js`; workspace proposal: `lane2-p0b/event_to_mission_bridge.js.new` (patch text, unwired) | Live on Pig: wired in `gateway/bootstrap/gateway_runtime.js:592`; maps REPLAY_COMPLETED -> WITNESS_ATTEST, PROJECT_SETUP, CUSTOMER_ONBOARD, LEAD_FOLLOWUP, etc. Live proof: LEAD_CREATED -> LEAD_FOLLOWUP mission created and completed, 15 MISSION_COMPLETED events (event-boundary REPORT). |
| U4 | Worker subscriptions | Pig: `ping-runtime/workers/canonical_workers.js` (`BUSINESS_EVENTS` + per-worker `eventTypes`) | Live. Dispatch-time consistency guard: `mission_scheduler.js` refuses cross-dispatch (`event_type_mismatch`, W-1A packet). |
| U5 | `ProducerEventPort` | Pig: `ping-runtime/events/producer_event_port.js`; workspace lane artifact: `phase7/producer_event_port.js` (identical seam) | Phase 7 (2026-09-19, commits cc8ad4e6a..ce25468ee): 5 producer families (Review/Project/Customer/AIWorkspace authorities + `POST /canonical-events`) migrated; 50/50 migration proofs on scratch PG. Registered/mapped types -> direct UER acceptance; 6 unregistered types stay on explicit RECEIPT seam until governance registers them (lane-h matrix). |
| U6 | `LegacyIngressAdapter` | Pig: `ping-runtime/events/legacy_ingress_adapter.js` | Sanctioned convergence path: receipt rows -> UER acceptance via allowlisted, capability-bound MC-1 exception. This is the *documented exception*, not a bypass. |
| U7 | `EventBridge` (retired in live image) | Pig worktree (classified PRESERVED_INACTIVE/RETIRED 2026-09-18, superseded by adapter) | Reachability 2026-09-23 observed the live gateway's EventBridge polling alive ("canonical query returned 0 rows", 0 unprocessed) — live-image wiring of the bridge, even though the worktree had retired it. Live-image/source divergence noted; re-proof needed against the promoted candidate. |
| U8 | `lane-b/emit.js` | `~/workspace/lane-b/emit.js` | Offline PROOF body generator (writes `bodies.json`), targets governed `POST /events` canonical-spine path. A producer tool, not a consumer. Not live by itself. |
| U9 | Lane/test harnesses | `convergence-lane3/*` (lane3-failbefore/passafter, phase12_collision_duplicate_law, witness-probe), `demotion-lane/*` tests | Test-only consumers of the UER law (collision dedup, witness availability, repository gate). Not live; never touch the live DB. |

### 1b. Old path: `ConstitutionalEventBus` -> `events` table — proven lossy, dormant

| # | Consumer / mechanism | Where | Proven state |
|---|---|---|---|
| B1 | `ConstitutionalEventBus` (`bus.publish`) | Pig: `gateway/event_bus.js` | **DORMANT.** Zero requirers in the live repo; not loaded by `gateway/server.js -> bootstrap/gateway_runtime.js`. Proven lossy: `generateId('event',{type:'event'})` is deterministic over constant input (live-verified: two calls return `event_87915f19feba823b`); every publish without explicit `event_id` collapses onto ONE row via `ON CONFLICT DO UPDATE`. Dormant-classification 2026-09-21. Deprecation marker added Phase 0 (2026-09-24). |
| B2 | `knowledge_compiler.js` `_emitEvent` | Pig: `gateway/knowledge_compiler.js` | **DORMANT.** Only live-code publisher (7 compiler passes, `aggregate_type='COMPILER_PASS'`); zero requirers; not loaded. |
| B3 | `knowledge_compiler.replayPass` | same file | **DORMANT.** Only reader of bus `events` rows (`bus.replay(inputId)`); unwired. |
| B4 | `end_to_end_verifier.js` import | Pig: `gateway/end_to_end_verifier.js:28` | Dead import; never used. Cleanup candidate (open item). |
| B5 | 10 other direct `events` writers | Pig: `constitutional_runtime.js`, `continuous_background_analyst.js`, `event_write_authority.js`, `constitutional_ollama_integration.js`, `witness_chain.js`, `eventstore_persistence.js`, `replay_log.js`, `lifecycle_visualizer.js`, `stage_registry.js` | **Unwired but importable.** No workspace code copies exist; only forensic mentions. Individual dormant/resurrection classification still open (see plan). |
| B6 | `MissionEventBus` / `mission_events` table | Pig: `gateway/mission_event_bus.js` | **DORMANT.** Never constructed (obs3 forensic 2026-09-20). Its `processed=TRUE` marking is on the dormant table only. Do not confuse with UER's `ping_events.processed` (dead column, 2429/2429 FALSE). |
| B7 | `missions` scheme (`MissionRepository`) | Pig: `gateway/repositories/mission_repository.js` + 5 readers | **DORMANT.** Zero instantiations; no `CREATE TABLE missions` DDL exists. Canonical scheme is `ping_missions` via `MissionRuntime`. Deprecation markers added Phase 0. |
| B8 | Worker-queue auth endpoints | Pig: `gateway/routes/events.js` (`POST /events/processed`, `/failed`; `GET /events/unprocessed`), `event_processing` table | **DORMANT.** Only consumer `WorkerRuntime._poll()` never called (dispatch-only mode). Unauthenticated worker-queue protocol flagged; must stay unwired until capability-bound worker identity exists (sec3 forensic). |

### 1c. The second authority: `CanonicalEventEnvelope` -> `canonical_events` — converging to PROJECTION

| # | Consumer / mechanism | Where | Proven state |
|---|---|---|---|
| C1 | `CanonicalEventEnvelope.executeEmitEvent` | Pig: `gateway/canonical_event_envelope.js`; workspace lane copy: `demotion-lane/canonical_event_envelope.js` | **WAS a second effective event authority** (live 2026-09-19: UUID-v5 IDs, per-tenant sequence, own table, bypassing registry/governance/IdentityAuthority — lane-f2 verdict). Phase 7 demoted it: receipt seam only, acceptance stays with UER via `LegacyIngressAdapter`. |
| C2 | `deriveRepresentationAfterCommit` | Pig: `ping-runtime/events/convergence_derivation.js` | Writes the certified representation into `canonical_events` AFTER UER commit. Never emits, never dispatches missions. This makes `canonical_events` a **PROJECTION**, not an authority. |
| C3 | `GET /canonical-events` read/processing routes | Pig: `gateway/routes/canonical_events.js` | Preserved on the envelope: read history + `POST /:id/processed|failed` on receipt rows. Read path, not a canonical writer. |
| C4 | `EventRepository` (`repository_events`) | Workspace lane copy: `demotion-lane/event_repository.js` (+ `.orig.js`) | **LEGITIMATE BOUNDED ADAPTER / PROJECTION, preserved.** `appendEvent()` carries a fail-closed acceptance gate (`UnanchoredCanonicalWriteError` / `EVENT_REPOSITORY_UNANCHORED_WRITE`) requiring proof of prior UER acceptance. Live `repository_events` table exists but is write-dormant (bridge SELECTs every 5s, errors=0; no live writer reachable — lane-f2). |

### 1d. Ephemeral signaling (not canonical history)

| # | Consumer / mechanism | Where | Proven state |
|---|---|---|---|
| E1 | `EventQueue` (in-process pub/sub: emit/subscribe/emitChain) | `~/workspace/gateway-hardening/new-engine.js:59` (`require('./event_queue')` — file absent, module cannot load) | Staging artifact (2026-09-13 gateway-hardening candidate). In-process only; no persistence; not an event bus. **Classify as ephemeral intra-process signaling; keep the name `EventQueue`; do NOT promote to bus semantics.** Not live. |
| E2 | FYD journal gateway | `~/workspace/fyd-journal-gateway/server.mjs` (restored 2026-09-24); live target: Pig `127.0.0.1:18199`, append-only `events.jsonl` | **Separate product journal** (FYD site overlays for the Ask FYD read path), not the PING event bus. Do NOT mix with PING canonical history; journal-identity boundary is the FYD-037/gateway lane's concern. Read-only consumers: `ping-object-reader.ts`, `src/fyd/social/config.ts`, `src/fyd/customize/server.ts` (all in `fyd/product-lane/...a69bb68fc84620a633df7394/`). Reachability 2026-09-23: nothing was listening on 18199 at that time. |

### 1e. Test/evidence-only (no runtime role)

`convergence-lane3/unified_event_runtime.js` (UER law copy under test), `lane2-p0b/event_to_mission_bridge.js.new` (patch text), `phase7/*` authorities (lane copies of the five families), `lane-h/lane-h-emission-law.js` + `governance-event-types-decision-matrix-2026-09-19.md`, `constitutional-sprint/reachability/*` + `fleet/*`, `forensics/*` (phase7 producer migration, lane-f2, W-1A, event-authority forensics), `ping-overnight/event-boundary/REPORT.md` + `trigger-append-only.sql`. None write any event table; none are required by any live path.

## 2. Classification table

| Component | Lives? | Emits canonical transitions? | Classification | Lane action |
|---|---|---|---|---|
| `UnifiedEventRuntime` -> `ping_events` | YES (Pig) | YES — sole writer | **CANONICAL SPINE (keep, guard)** | Unchanged. Re-prove against the promoted gateway candidate: sole-writer invariant + append-only trigger + sole-writer acceptance test in CI. |
| `EventToMissionBridge` | YES (Pig) | Dispatches (never mutates canonical log) | **CANONICAL DERIVATION (keep)** | Unchanged. Reconciliation (`reconcileMissingMissions`) already closes the persistence-vs-handler gap (lane2 M1). |
| `ProducerEventPort` + `LegacyIngressAdapter` | YES (Pig, since Phase 7) | Acceptance stays with UER | **CANONICAL INGRESS SEAM (keep)** | Unchanged. Governance must still decide the 6 unregistered types (lane-h D1). |
| `deriveRepresentationAfterCommit` -> `canonical_events` | YES (Pig) | No (derivation only) | **PROJECTION (keep)** | Unchanged. Assert in tests: derivation never emits, never dispatches, never remints. |
| `EventRepository` -> `repository_events` | Dormant-write on Pig; lane copy in workspace | Gated to prior UER acceptance | **BOUNDED PROJECTION/ADAPTER (keep)** | Unchanged. Do not touch per convergence plan. |
| `CanonicalEventEnvelope` as writer | Live writer on 2026-09-19 image; Phase 7 demoted to receipt seam | No (after Phase 7) | **LEGACY RECEIPT SEAM -> PROJECTION (converge)** | Verify the promoted candidate no longer wires it as an independent writer; if it does, route `POST /canonical-events` through the port and keep the table projection-only. |
| `ConstitutionalEventBus` -> `events` | NO (dormant) | No | **DEAD BUS (archive after write-idle)** | Phase 2c-4. Do NOT repair the `ON CONFLICT DO UPDATE`; do NOT silently forward `publish` to UER (identity semantics differ: constant minted ID vs content-addressed spine ID — silent forwarding corrupts dedup/collision guarantees). |
| `knowledge_compiler` | NO (dormant) | No | **DORMANT PRODUCER (migrate read path, then archive)** | Phase 1-2: compiler emits via optional `eventRuntime` (UER); `replayPass` -> UER replay with `lifecycle_id` in metadata; fallback flag removed only after production proof. |
| `events` table | Dormant-write | No | **LEGACY STORAGE + MIGRATION INPUT (preserve, never write canonically)** | Phase 3: backfill via EventBridge pattern (`source='events-backfill'`, originals in metadata); reconcile `database/events.sql` DDL drift vs live schema (BIGSERIAL vs event_id/aggregate_* columns). NO deletes, NO ID rewrites. |
| `mission_events` table + `MissionEventBus` | NO | No | **DEAD (archive)** | Never constructed; `processed=TRUE` marking exists only there. Archive with the missions scheme. |
| `missions` scheme + 5 readers | NO | No | **DEAD (archive)** | `git mv` to `archive/`, history preserved; do NOT create the table. Only after Phase 0-1 pins hold a full release cycle. |
| `EventQueue` (gateway-hardening) | NO (staging, unloadable) | No | **EPHEMERAL IN-PROCESS SIGNALING (keep name, no action)** | None. Do not rename to a bus; do not wire it to persistence. If the hardening candidate is ever shipped, re-classify then. |
| FYD journal gateway | Runs on Pig (separate service) | No PING semantics | **SEPARATE PRODUCT JOURNAL (out of lane)** | None here. Flag to gateway/FYD-037 lane: journal identity check for `FYD_GATEWAY_URL` posts. |
| 10 other direct `events` writers | Unwired-but-importable on Pig | No | **UNCLASSIFIED-DORMANT (pending individual triage)** | Classify each dormant vs resurrection candidate before any move. `event_write_authority.js` needs explicit review (name suggests authority intent). |

## 3. Reachability proof

Method: workspace `rg` require-graph + SQL-write scans across all PING-core lane dirs; Pig-side require-graph scans cited from the dated forensic files below. A consumer is "reachable" only if it is required by the live boot chain (`server.js -> bootstrap/gateway_runtime.js`) or the live scheduler/worker boot.

1. **UER is the sole reachable writer of `ping_events`.** Convergence plan (2026-09-24): repo-wide Pig scan excluding tests/evals leaves only `ping-runtime/events/unified_event_runtime.js` with `INSERT INTO ping_events`. Workspace scan: no file writes `INSERT INTO ping_events`; the only `ping_events` mention is `ops-watches/state.json` backup evidence. Live append-only trigger verified 2026-09-16 (`trg_ping_events_append_only`, UPDATE/DELETE rejected, INSERT/idempotency unaffected). **Invariant holds.**
2. **The old bus is unreachable.** `gateway/event_bus.js`: zero requirers in the Pig repo; absent from the live bootstrap require graph (`gateway_runtime.js` constructs `MissionRuntime` + `UnifiedEventRuntime` + `EventToMissionBridge` — lines 477/592/819 per plan). `knowledge_compiler.js` and `event_bus.js` likewise zero-requirer (2026-09-24 plan). Dormant-classification 2026-09-21 (authority 20 / replay 10 / dependency 20). Deprecation markers added Phase 0.
3. **`knowledge_compiler.replayPass` (the only reader of bus rows) is unreachable** — same zero-requirer result.
4. **`MissionEventBus` is never constructed** (obs3 forensic, `constitutional-sprint/fleet/observability/obs3-worker-queue.md`, 2026-09-20).
5. **`missions` scheme is unreachable** — zero instantiations of `MissionRepository`; no DDL; its 5 readers unwired (plan §1a).
6. **Worker-queue `event_processing` protocol is unreachable** — only consumer `WorkerRuntime._poll()` never called (sec3 forensic).
7. **The envelope's writer role was severed in source** (Phase 7, 2026-09-19: all five producer families + HTTP ingress through the port; receipt seam explicit). Residual to re-prove: the live image as of 2026-09-19 still mounted `CanonicalEventEnvelope` as a writer (`gateway_runtime.js:399-400,696`) and ran the retired EventBridge, while the reachability pass of 2026-09-23 saw EventBridge polling alive on the live gateway. **The promoted gateway candidate must be re-proved against the current source before the old path can be declared removed** — that verification belongs to the gateway release gates, with this lane's acceptance test (sole-writer invariant + append-only trigger + no `events` growth) as a gate condition.
8. **No NEW canonical writes to the legacy `events` table are possible through any reachable path** — all producers route through the port -> UER; the bus is unreachable; no workspace file writes the table. Historical compiler-pass rows in `events` remain **migration input only**.

## 4. Convergence plan (next steps, in dependency order)

1. **(gateway lane gate)** Re-prove on the promoted candidate image: (a) UER sole writer of `ping_events`; (b) `trg_ping_events_append_only` present and effective; (c) `CanonicalEventEnvelope` not mounted as an independent writer (or, if present, routes through `ProducerEventPort` with `canonical_events` projection-only); (d) no `events`-table growth over a full release cycle. Block archive steps until green.
2. **Compiler read-path (reversible, needs operator call):** `knowledge_compiler.replayPass` -> UER replay (`ping_events` via read authority), `lifecycle_id` in UER metadata; keep read-only fallback to `events` behind a flag; remove the flag only after the migrated path is proven.
3. **Compiler write-path (reversible):** optional `eventRuntime` (UER) param on `KnowledgeCompiler`; flip default only after compiler events appear in `ping_events` with spine IDs, namespaces, governance; bus becomes write-idle.
4. **Historical reconciliation (read-only, additive):** EventBridge-style one-shot reads `events` rows, re-emits via `UER.emit` with `source='events-backfill'`, `original_event_id`/`original_timestamp`/`backfill:true` in metadata, content-hash dedup. Original rows NEVER modified or deleted. Reconcile the `events` DDL drift (checked-in `database/events.sql` vs live columns) as a documentation fix first.
5. **Triage the 10 other direct `events` writers** (dormant vs resurrection candidate); explicit review of `event_write_authority.js`.
6. **Archive (git mv, not delete), after a full write-idle release cycle:** `gateway/event_bus.js`, `gateway/knowledge_compiler.js`, `gateway/repositories/mission_repository.js` + 5 dormant missions readers, `gateway/mission_event_bus.js`. Remove `end_to_end_verifier.js:28` dead import in the same cleanup pass.
7. **Governance decision (operator):** register the 6 unregistered types (`review.flagged`, `project.artifact_added`, `CUSTOMER_IMPORTED`, `CUSTOMER_EMAIL_SYNCED`, `CUSTOMER_CALENDAR_SYNCED`, `AI_WORKSPACE_RESULT_CREATED`) or keep them on the receipt seam; `review.received`/`review.replied` (BusinessProfileAdapter bypasses the port — pre-existing dead wiring) migrate-to-port vs explicit keep-direct.

## 5. Standing prohibitions (PING law, unchanged)

- Do NOT delete the `events` table or `ping_missions`. Do NOT create a `missions` table.
- Do NOT rewrite historical IDs; backfill creates NEW UER events referencing originals via metadata.
- Do NOT "fix" the bus's `ON CONFLICT DO UPDATE` into an append.
- Do NOT silently forward `bus.publish` to UER.
- Do NOT touch `event_repository.js` (legitimate bounded adapter, preserved).
- Do NOT touch the FYD factory or ORCA. No pushes; no main/master commits.

## 6. Evidence files referenced

- `ping-convergence/mission-event-bus-convergence-plan.md` (2026-09-24; Phase 0 done)
- `forensics/phase7-producer-migration-2026-09-19.md` (producer seam, 50/50 proofs)
- `forensics/recon-2026-09-19/lane-f2-event-authority.md` (second-authority verdict)
- `forensics/recon-2026-09-19/w1-writer-packet.md` (W-1A witness trigger; promotion constraints)
- `lane-h/governance-event-types-decision-matrix-2026-09-19.md` (6 unregistered types; emission law)
- `ping-overnight/event-boundary/REPORT.md` + `trigger-append-only.sql` (append-only, namespace auth, retry P0)
- `constitutional-sprint/reachability/REACHABILITY.md` (2026-09-23 live runtime state)
- `constitutional-sprint/fleet/observability/obs3-worker-queue.md` + `obs3-queue-trace.md` (MissionEventBus dormant, `processed` dead column)
- `convergence-lane3/unified_event_runtime.js` (UER law copy under test)
- `demotion-lane/event_repository.js` (bounded adapter with acceptance gate)
- `gateway-hardening/new-engine.js` (in-process `EventQueue`, staging, unloadable)
- `fyd-journal-gateway/README.md` + `server.mjs` (separate FYD journal; boundary note)

## 7. Open questions for the parent / operator

1. The promoted gateway candidate's wiring must be re-proved (plan step 1): is `CanonicalEventEnvelope` still mounted as a writer, and is the EventBridge wiring consistent with current source? (Pig-side check; this lane's acceptance test is the gate.)
2. Governance decision on the 6 unregistered types + `review.received`/`review.replied` port-migration vs keep-direct (operator call, lane-h D1/D4).
3. `event_write_authority.js` triage (dormant vs resurrection candidate) before any archival move.
4. Live `events`-table schema vs checked-in `database/events.sql` — reconcile before any backfill reads the table.

**Nothing was deleted, moved, or mutated by this lane.** This report is additive only.
