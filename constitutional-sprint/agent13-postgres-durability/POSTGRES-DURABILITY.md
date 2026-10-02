# POSTGRES / DURABILITY — Agent 13

**Sprint:** PING constitutional convergence, night shift · **Date:** 2026-09-23 ~20:00–21:00 MDT
**Mode:** READ-ONLY. No repo writes, no commits (COMMITS CREATED: NONE), no DDL/DML against any live database
(read-only SELECT, `\d`-equivalents via information_schema, `docker inspect`, config/env-name reads).
No secret values printed or transmitted at any point (credential env values never read; only names).
**Bases:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (no event machinery — confirmed,
not inventoried here); (b) CANONICAL CORE `/home/nolan/ping` branch `refactor/runtime-authority-convergence`
(inspected only). Worktree copies under `/home/nolan/ping/worktrees/` were excluded from writer attribution
(they are duplicate checkouts, not the live tree).
**Transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'` (stdin-fed scripts).
**Raw evidence:** `~/workspace/constitutional-sprint/agent13-postgres-durability/evidence/`
(`pg-inventory.out`, `pg-tables.out`, `pg-triggers2.out`, `pg-schema.out`, `pg-counts.out`,
`pg-writer-grep.out`, `pg-writers-detail.out`).

**Read first (prerequisites):** `../event/EVENT-FORENSICS.md`, `../authority-map/AUTHORITY-MAP.md`,
`../security/SECURITY-SWEEP.md`, `../reachability/REACHABILITY.md`, `../recovery/RECOVERY.md`.

---

## 0. Headline findings

1. **The live canonical journal is `brain-postgres` → database `ping_runtime`, NOT `ping-postgres`/`crx_runtime`.**
   Proven by the running gateway container's own routing env (`POSTGRES_HOST=host.docker.internal`,
   `PORT=5432`, `DB=ping_runtime` — names only, values not printed) resolving to `brain-postgres`
   (`0.0.0.0:5432` on the host), corroborated by `ping_events` rows with `created_at` up to
   2026-09-23 23:24 UTC (minutes before this scan). The recovery agent's R1 names
   `ping-postgres`/`crx_runtime` as "the actual journal of record for the live gateway" — that DB has
   **zero rows in every table**; it is an initialized-but-unused schema. The live journal's durability
   facts therefore attach to `brain-postgres` (named volume `compose_postgres_data`), not to the
   anonymous volume the recovery report describes. **Cross-check note for the recovery agent, not a duplication.**
2. **The append-only trigger does NOT protect the live journal.** `trg_ping_events_append_only`
   (function `ping_events_no_mutation()`) exists only in the staging/test DBs
   (`ping-postgres/lanea_gate`, `ping-rc-postgres/lanea_gate`, `ping-rc-postgres/rc_staging`).
   The live `brain-postgres/ping_runtime.ping_events` (2,429 rows, written today) has **no triggers at all**,
   and the trigger exists **nowhere in `/home/nolan/ping` source** (no `.js`/`.ts`/`.py`/`.sql`/`.sh`
   defines it — verified excluding worktrees). It was applied ad hoc during the 2026-09-16 incident
   (first live row 2026-09-16 12:24 UTC) and never promoted to the production DB or to source.
   Patch proposed: `../patches/agent13-postgres/P1-append-only-trigger-live-journal.md`.
3. **Schema divergence between live and staging:** staging `ping_events` has a `sequence BIGINT` column
   (+ `idx_ping_events_sequence`); the live table does not. The live `UnifiedEventRuntime.initialize()`
   (`ping-runtime/events/unified_event_runtime.js:43-63`) creates no `sequence` column and no trigger —
   so the staging schema came from a migration path that is not in the live code path. **CONFLICTING.**
4. **One proven direct-SQL bypass of the event/governance layer:** `gateway/append_orchestrator.js:91`
   does a raw `INSERT INTO repository_events (event_id, object_id, event_type, sequence, payload, timestamp)`
   that skips the kernel `EventRepository.appendEvent` hash chain (`RuntimeID`, `PreviousEventHash`,
   `CanonicalEventHash`, `ReducerHash`, `WitnessHash`, `ReplayHash` — `runtime/kernel/event_repository.js:117`).
   Any row written through it breaks the per-object hash-chain invariant the replay story depends on.
   Patch proposed: `../patches/agent13-postgres/P2-append-orchestrator-bypass.md`.
5. **Secondary journals are live in code but empty in the live DB:** `repository_events` = 0 rows,
   `canonical_events` = 0 rows, `ping_bridge_cursors` = 0 rows in `brain-postgres/ping_runtime`,
   while EventBridge polls every 5s (observed in gateway logs: "canonical query returned 0 rows").
   The kernel `EventRepository` writers (`agent_memory_authority.js`, `distributed_desktop_agents.js`,
   `automatic_mission_generator.js`, `continuous_replay_authority.js`) are wired in source but produce
   nothing in the live DB — either those agents aren't running in the deployed image
   (`ping-gateway:devin-boundary2`, source not on Pig — same caveat as EVENT-FORENSICS §2D) or their
   writes go elsewhere. Either way: **the three-table convergence story is code-true, data-false tonight.**
6. **Durability = single-machine volume, no backups, no WAL archiving.**
   All six postgres containers: `archive_mode=off`, `wal_level=replica`, `fsync=on`. No crontab, no
   scheduled dump, no replica. The only dump artifact (`/home/nolan/ping/pg_dump.sql`, 2026-09-16 09:41)
   is the **June-era `crx_runtime`** (19 COPY blocks: `objects`, `observations`, `events`… — zero
   `ping_events` rows); it is not a backup of the live journal and its schema does not match the live DB.
   (Recovery agent's backup findings R1–R17 confirmed and not duplicated; the live-DB identity correction
   in finding 1 above is the delta.)
7. **Ghost tables:** `tenants`, `capability_requests`, `agent_workspaces`, `system_metadata` exist in the
   live DB with **zero references in `/home/nolan/ping` source** (no CREATE TABLE, no SELECT/INSERT) —
   schema ghosts from an older generation. `exterior_agent_credentials` has 2 rows and no code references:
   written by an unknown/external path, never read by live code (stale).
8. **The four `h13_*` databases** (`h13_approvals`, `h13_dur`, `h13_effect`, `h13_social`;
   tables `proposed_actions`, `effects`) have **zero references anywhere in `/home/nolan/ping` source**
   (the string `h13` does not occur). Their writer is outside both inspected bases — owner UNKNOWN.

### Per-database liveness summary

| # | Container : port | Database | Tables | Non-zero tables | Verdict |
|---|---|---|---|---|---|
| 1 | brain-postgres :5432 | **ping_runtime** | 33 | `ping_events`=2429, `ping_missions`=472, `knowledge_nodes`=27, `exterior_agent_credentials`=2 | **LIVE** — the canonical journal DB |
| 2 | brain-postgres :5432 | crx_runtime | 43 | `observations`=7176 (stale; writer `observation_worker.py` not running) | DORMANT/LEGACY |
| 3 | brain-postgres :5432 | h13_approvals / h13_dur / h13_effect / h13_social | 2 each | `effects`=1, `proposed_actions`=3 in h13_approvals | DORMANT, owner UNKNOWN |
| 4 | ping-postgres :5433 | crx_runtime | 35 | none (all 0) | DORMANT — initialized schema, unused |
| 5 | ping-postgres :5433 | lanea_gate | 1 (`ping_events`) | 6 rows; has `sequence` + append trigger | DORMANT staging, CONFLICTING schema |
| 6 | ping-rc-postgres :15433 | rc_staging | 27 | none (all 0); has `sequence` + append trigger | DORMANT staging, CONFLICTING schema |
| 7 | ping-rc-postgres :15433 | lanea_gate | 1 | 6 rows; `sequence` + append trigger | DORMANT staging, CONFLICTING schema |
| 8 | ping-rc-postgres :15433 | crx / collmu99638e | 0 / 1 | none | DORMANT ghosts |
| 9 | ping-test-pg :55433 | pingtest / ping-fyd-demo / swarm02_test | 26–33 | none (all 0); `ping_transitions` has prevent-update/delete triggers | DORMANT test |
| 10 | ping-gauntlet-pg :54339 | ping_gauntlet | 2 | none | DORMANT test |
| 11 | swarm02-pg :55434 | swarm02_test | 0 | — | DORMANT test (container 17 min old) |

No RLS policies and no enabled RLS on any table in any database (verified via `pg_policies` +
`relrowsecurity` — all empty). All tables `public` schema.

---

## 1. Per-table matrix — LIVE database `brain-postgres` / `ping_runtime`

Legend — CANONICAL? = is the table itself the journal of record · DERIVED? = point state /
projection recomputed from events · LEGACY? = older-generation schema with no live code path ·
DURABLE? = storage durability (all tables share the container's volume; backups uniformly absent) ·
REPLAYABLE? = contents reconstructable from the event journal · CLASS ∈ LIVE / DORMANT / DUPLICATE /
CONFLICTING / LEGACY.

| TABLE | OWNER (code) | WRITERS (file:line) | READERS (file:line) | CANONICAL? | DERIVED? | LEGACY? | DURABLE? | REPLAYABLE? | CLASS |
|---|---|---|---|---|---|---|---|---|---|
| ping_events | UnifiedEventRuntime | `ping-runtime/events/unified_event_runtime.js:152` (`emit`, `ON CONFLICT DO NOTHING`) | `gateway/routes/events.js:19,34,46,65` (SELECT fallbacks); `runtime/kernel/event_read_authority.js` (CQRS read side); `unified_event_runtime.js:163` (dedup re-read), `:227` (query API); `ping-runtime/events/event_bridge.js:156,258` (bridge dedup); `ping-runtime/orchestration/mission_runtime.js:370,384`; `gateway/social_ingest_adapter.js:143,158`; `gateway/bootstrap/gateway_runtime.js:842` (health COUNT) | YES — sovereign journal | no | no | volume-only, no backup | YES (is the journal; ordering by `timestamp`, no sequence col) | LIVE |
| repository_events | kernel EventRepository | `runtime/kernel/event_repository.js:117` (`appendEvent`, hash-chained) · **BYPASS:** `gateway/append_orchestrator.js:91` (raw INSERT, no chain fields) | `runtime/kernel/event_repository.js:93,159,181,189`; EventBridge poll (bridges to `ping_events`) | secondary journal | no | no | volume-only | YES per-object (`object_id,sequence` + hash chain) — 0 rows live | DORMANT (code-wired, data-empty) |
| canonical_events | Canonical Event Envelope Authority | `gateway/canonical_event_envelope.js:174` (INSERT) | `gateway/canonical_event_envelope.js:234,340`; `ping-runtime/events/event_bridge.js:239` (unprocessed COUNT) | secondary journal | no | no | volume-only | YES (`sequence`, `processed` flags) — 0 rows live | DORMANT |
| ping_missions | MissionRuntime | `ping-runtime/orchestration/mission_runtime.js:79` (INSERT); updates in same file | mission_control routes (30 read-file refs) | no | YES (mission state) | no | volume-only | PARTIAL (mission lifecycle events flow through `ping_events`, but status columns are point state) | LIVE |
| knowledge_nodes | KnowledgeGraph | `ping-runtime/knowledge/knowledge_graph.js:94` (INSERT, 12 cols incl. `confidence_provenance`) | knowledge graph readers (15 read-file refs) | no | YES (projection of events) | no | volume-only | PARTIAL (rebuildable from source events only if promotion path is complete — UNPROVEN) | LIVE |
| knowledge_edges | KnowledgeGraph | `knowledge_graph.js` (9 insert refs) | 6 read-file refs | no | YES | no | volume-only | PARTIAL | DORMANT (0 rows) |
| ping_bridge_cursors | EventBridge | `ping-runtime/events/event_bridge.js:213,321` (upsert cursor) | `event_bridge.js` `initialize()` SELECT restores | no | no (operational cursor) | no | volume-only | N/A (cursor, not domain state) | DORMANT (0 rows — bridge never persisted a cursor; consistent with empty secondaries) |
| tenant_registry | TenantRegistry | `ping-runtime/runtime/tenant_registry.js:59` (`registerTenant`); `:185` DELETE | `tenant_registry.js:95,109` | no | no | no | volume-only | NO (registry point state) | DORMANT (0 rows; no caller of `registerTenant` found in gateway bootstrap — the `tenant::<id>` validation branch in `ping-gateway-src` reads a `tenants` registry that does not exist as a table) |
| tenants | — (no code) | none found | none found | no | no | YES (ghost) | volume-only | N/A | LEGACY — schema ghost, 0 rows, zero references in source (no CREATE TABLE anywhere) |
| customers | CustomerAuthority | `ping-runtime/business/customer_authority.js:448` (raw INSERT via `this._storage.query`) + `canonical_event_envelope.executeEmitEvent` at `:541` (dual write) | customer_authority readers | no | YES (entity state) | no | volume-only | PARTIAL (business events bridged via envelope → `ping_events`, but the raw INSERT is outside the journal) | DORMANT (0 rows) |
| google_reviews | BusinessProfile (google) | `gateway/google/business_profile.js` (`this._storage.query` INSERT/UPDATE) | same file | no | YES | no | volume-only | NO (external source; re-ingestible from Google, not from journal) | DORMANT (0 rows) |
| review_flags | BusinessProfile (google) | `gateway/google/business_profile.js` | same file | no | YES | no | volume-only | NO | DORMANT (0 rows) |
| exterior_agent_credentials | UNKNOWN | none found in `/home/nolan/ping` source | none found | no | no | YES | volume-only | NO | LEGACY/STALE — 2 rows, writer and reader both outside inspected bases |
| capability_requests | — (no code) | none | none | no | no | YES (ghost) | volume-only | N/A | LEGACY — 0 rows, zero source references |
| agent_workspaces | — (no code) | none | none | no | no | YES (ghost) | volume-only | N/A | LEGACY — 0 rows, zero source references |
| system_metadata | — (no code) | none (has `update_system_metadata_updated_at` trigger) | none | no | no | YES (ghost) | volume-only | N/A | LEGACY — 0 rows, zero source references |
| event_outbox | EventOutbox (NATS) | `gateway/event_outbox.js:132` (INSERT) | NATS publisher (dormant per EVENT-FORENSICS: no NATS on live path) | no | no | no | volume-only | N/A | DORMANT — written, never read (dead pipeline) |
| event_processing | EventReadAuthority / dormant py | `runtime/kernel/event_read_authority.js:306`; dormant `runtime/constitutional_event_loop.py:122,146`, `runtime/constitutional_runtime.py:102,126` | 15 read-file refs | no | no | no | volume-only | N/A | DORMANT (0 rows) |
| mission_events | MissionRuntime | mission code (3 ins refs) | 3 read refs | no | no | no | volume-only | PARTIAL | DORMANT (0 rows) |
| mission_executions | MissionRuntime | mission code (6 ins refs) | 12 read refs | no | no | no | volume-only | PARTIAL | DORMANT (0 rows) |
| repository_objects | kernel EventRepository | `event_repository`-adjacent (6 ins, 12 upd refs) | 27 read refs | no | YES (snapshot) | no | volume-only | YES (snapshots of replayable objects) | DORMANT (0 rows) |
| repository_snapshots | kernel EventRepository | snapshot writer (3 ins refs) | 3 read refs | no | YES | no | volume-only | YES | DORMANT (0 rows) |
| repository_dead_letters | DeadLetterAuthority | `gateway/dead_letter_authority.js:154` (INSERT); `:360,374` (UPDATE) | 3 read refs | no | no | no | volume-only | N/A | DORMANT (0 rows) |
| repository_store_migrations | kernel EventRepository | migration runner | — | no | no (ops) | no | volume-only | N/A | DORMANT (0 rows — no migrations ever recorded) |
| ai_workspace_results | AIWorkspaceAuthority | `ping-runtime/business/ai_workspace_authority.js` (1 ref) | same | no | YES | no | volume-only | NO | DORMANT (0 rows) |
| commits | commit-service | commit writers (3 ins, 7 upd refs) | 3 read refs | no | no | no | volume-only | N/A | DORMANT (0 rows) |
| filesystem_cache | — | 3 ins refs | — | no | YES (cache) | no | volume-only | N/A (cache) | DORMANT (0 rows) |
| hpp_projects | ProjectAuthority | `ping-runtime/business/project_authority.js` (1 ref) | — | no | YES | no | volume-only | NO | DORMANT (0 rows) |
| hpp_project_artifacts | ProjectAuthority | 1 ref | — | no | YES | no | volume-only | NO | DORMANT (0 rows) |
| projections | — | 3 ins, 8 upd refs | 29 read refs | no | YES | no | volume-only | YES (by definition, if projector is complete — the FYD `dump.py` path is the proven one) | DORMANT (0 rows in DB; live projections live in `/home/nolan/ping/var/fyd-projections/*.json`) |
| execution_graphs | — | 3 ins, 9 upd refs | 3 read refs | no | YES | no | volume-only | PARTIAL | DORMANT (0 rows) |
| graph_node_states | — | 3 ins, 6 upd refs | 3 read refs | no | YES | no | volume-only | PARTIAL | DORMANT (0 rows) |
| runtime_registry | — | 12 ins, 9 upd refs | 9 read refs | no | no | no | volume-only | NO | DORMANT (0 rows) |
| deployment_registry | — | 12 ins, 3 upd refs | 9 read refs | no | no | no | volume-only | NO | DORMANT (0 rows) |
| telemetry_metrics | — | 3 ins, 3 upd refs | 3 read refs | no | YES (metrics) | no | volume-only | NO | DORMANT (0 rows) |

Row counts are `SELECT COUNT(*)` (authoritative; `reltuples` estimates were stale). Counts taken 2026-09-23 ~20:05 MDT.

---

## 2. Other databases — condensed matrix

### `brain-postgres` / `crx_runtime` — DORMANT/LEGACY (43 tables, only `observations` non-zero)

The June-era schema generation. `observations` = **7,176 rows** (`SELECT COUNT(*)`), writer
`observation_worker.py:75` (`INSERT INTO observations …`), a root-level Python worker that is
**not running** anywhere (no process, no container — verified 2026-09-23). Its connection comes from
`runtime.configuration.get_postgres_config` (defaults unresolvable without secrets; not pursued).
Data is stale (last era before the 2026-09-16 re-initialization). All other 42 tables = 0 rows,
including `events` (the dormant Python `PostgresEventRepository` target — EVENT-FORENSICS §2B #4
already proved it unwired), `ping_events` (0 rows — the old generation never used the JS journal),
`authority_*`, `objects`, `relationships`, `lineage`, `projections`, `audit_log`, `topics`,
`claims`, `citations`, `entities`. Triggers present: `trigger_update_event_processing_updated_at`
(on `event_processing`), `update_projections_updated_at`, `update_system_metadata_updated_at`
— `updated_at` maintenance triggers on tables with 0 rows.

**Correction to RECOVERY.md R2:** `/home/nolan/ping/pg_dump.sql` (2026-09-16 09:41, 1.4 MB) dumps exactly
this generation (19 COPY blocks incl. `observations`, `objects`, `events`; zero `ping_events` rows).
It is a snapshot of the *previous* `crx_runtime`, not of the live journal.

### `brain-postgres` / `h13_*` (×4) — DORMANT, owner UNKNOWN

Tables `proposed_actions`, `effects`. `h13_approvals`: `effects`=1 row (`SELECT COUNT(*)` returned 1
via n_live_tup; earlier reltuples showed rows~1/3), others 0. The string `h13` occurs **nowhere** in
`/home/nolan/ping` source (js/ts/py/json/md-excluded); `ping-runtime/approval/business_action_authority.js`
references `proposed_actions` but names no database. Writer is outside both inspected bases
(possibly Hermes or another agent's tooling — not verified). **Do not touch; flag for the coordinator
to identify the owner before any convergence move.**

### `ping-postgres` / `crx_runtime` — DORMANT (35 tables, all 0 rows)

Initialized at container creation from the bind-mounted initdb schema
(`/home/nolan/projects/constitutional-runtime/brainos/orchestration/constitutional/canonical_state/schema.sql`
→ `/docker-entrypoint-initdb.d/01-schema.sql`, per `docker inspect` mounts). Never written to.
Contains the `events` table with `trigger_prevent_event_updates` / `trigger_prevent_event_deletes`
(from the checked-in `database/events.sql`, 2026-06-14) — a *different* append-only trigger pair from
`trg_ping_events_append_only`, on a table nothing writes. DUPLICATE schema of the dormant generation.

### `ping-postgres` / `lanea_gate`, `ping-rc-postgres` / `lanea_gate`, `ping-rc-postgres` / `rc_staging` — DORMANT staging, CONFLICTING schema

Each has `ping_events` (6 rows in the two `lanea_gate` DBs, 0 in `rc_staging`) with:
- a `sequence BIGINT` column (+ `idx_ping_events_sequence`) that the **live** table and the live
  `UnifiedEventRuntime.initialize()` do not have;
- `trg_ping_events_append_only` (BEFORE UPDATE/DELETE → `ping_events_no_mutation()`), which the live DB lacks.

The RC gateway (`ping-rc-gateway`, overall `unhealthy` per REACHABILITY.md) points at `rc_staging`
(verified via its container env names). So the staging tier has *stronger* journal hardening
(sequence + append-only trigger) than production — the hardening was built/tested in staging and
never promoted. The trigger function contains a dead branch: `IF TG_OP = 'TRUNCATE'` can never fire
because a `BEFORE … FOR EACH ROW` trigger cannot be attached to TRUNCATE (Postgres rejects it);
statement-level TRUNCATE on these tables is therefore **not** blocked despite the function's intent.
(Also noted: `database/events.sql`'s older `trigger_prevent_event_updates/deletes` pair uses yet a
third naming convention — three generations of "append-only" intent, none in the live path.)

### `ping-test-pg` (`pingtest`, `ping-fyd-demo`, `swarm02_test`), `ping-gauntlet-pg` (`ping_gauntlet`), `ping-rc-postgres` (`crx`, `collmu99638e`), `swarm02-pg` (`swarm02_test`) — DORMANT test

All tables 0 rows (except the 6-row staging `ping_events` above). `ping-fyd-demo`/`pingtest` carry
`ping_objects` / `ping_relationships` / `ping_transitions` with `trigger_prevent_transition_updates` /
`trigger_prevent_transition_deletes` (from checked-in `database/ping_objects.sql`) — a test-era object
schema nothing in the live path writes. `swarm02_test` (both containers) is empty; the `swarm02-pg`
container was 17 minutes old at scan time (flapping or freshly created).

---

## 3. Direct-SQL-bypass list (writes that skip the event/governance layer)

These are raw `pool.query`/`storage.query` INSERT/UPDATE/DELETE statements that do **not** go through
`UnifiedEventRuntime.emit` (validation + governance + canonical envelope + dedup). Whether each is a
*violation* or *by-design* is noted.

| # | Location | Statement | Skips | Assessment |
|---|---|---|---|---|
| B1 | `gateway/append_orchestrator.js:91` | `INSERT INTO repository_events (event_id, object_id, event_type, sequence, payload, timestamp) VALUES ($1..$5, NOW())` | kernel `EventRepository.appendEvent` (`runtime/kernel/event_repository.js:117`) with its hash chain (`RuntimeID`, `PreviousEventHash`, `CanonicalEventHash`, `ReducerHash`, `WitnessHash`, `ReplayHash`) | **VIOLATION (PROVEN).** A row written here has no chain fields; the per-object replay invariant is broken for that row. Patch proposed: `../patches/agent13-postgres/P2-append-orchestrator-bypass.md`. |
| B2 | `ping-runtime/business/customer_authority.js:448` | `INSERT INTO customers (…) VALUES ($1..$20)` via `this._storage.query` (file header claims "No direct pool.query()" — stale) | `CanonicalizationService` / `UnifiedEventRuntime` (the same method also calls `canonicalEventEnvelope.executeEmitEvent` at `:541`, so this is a **dual write**: one journaled, one not) | **VIOLATION (PROVEN).** The journaled envelope and the raw row can diverge; no transaction binds them (separate awaits). |
| B3 | `gateway/google/business_profile.js:32,127,186,196,217,264` | `INSERT`/`UPDATE` on `google_reviews`, `review_flags` via `this._storage.query` | event layer entirely | Violation in the letter; low risk in practice (external-source cache, 0 rows live). Noted, not patched. |
| B4 | `ping-runtime/knowledge/knowledge_graph.js:94` | `INSERT INTO knowledge_nodes (…12 cols…)` | event layer (projection writer) | By-design IF `knowledge_nodes` is treated as a derived projection; the promotion path's completeness is UNPROVEN (see REPLAYABLE?=PARTIAL above). |
| B5 | `ping-runtime/orchestration/mission_runtime.js:79` (+ updates) | `INSERT INTO ping_missions` | event layer | By-design (mission state is point state); mission lifecycle *events* separately flow through the bridge. Dual-path noted. |
| B6 | `runtime/kernel/event_read_authority.js:306` | `INSERT INTO event_processing (…)` | — | By-design (read-side bookkeeping). Dormant (0 rows). |
| B7 | `runtime/constitutional/src/ping-projector.integration.test.ts:128` | `DELETE FROM ping_events` | the append-only trigger (absent in live DB; present in staging) | Test-only. Would fail in staging DBs (trigger) — evidence the trigger is real where it exists. |
| B8 | `ping-runtime/runtime/tenant_registry.js:185` | `DELETE FROM tenant_registry WHERE tenant_id = $1` | — | By-design registry admin. Dormant (0 rows). |

No raw `UPDATE`/`DELETE` against `ping_events` exists in non-test source. The live table is protected
only by `ON CONFLICT (event_id) DO NOTHING` on insert and by whoever holds the DB credentials —
there is no DB-level mutation guard in production.

---

## 4. Dead / stale table lists

**Written but never READ by live code (dead writes):**
- `public.event_outbox` (`brain-postgres/ping_runtime`) — written by `gateway/event_outbox.js:132`;
  the only consumer is the NATS publisher, which is not on the live path (EVENT-FORENSICS §2E:
  "NATS is NOT on the live path"). Dead pipeline; 0 rows.
- `public.tenants`, `public.capability_requests`, `public.agent_workspaces`, `public.system_metadata`
  (live DB) — never written AND never read: pure schema ghosts (no CREATE TABLE in source either).

**Read but never WRITTEN by live code (stale/legacy):**
- `public.exterior_agent_credentials` (live DB) — 2 rows; zero references in `/home/nolan/ping`
  source for either reading or writing. Seeded by an external/unknown path; no live consumer.
- `public.observations` (`brain-postgres/crx_runtime`) — 7,176 rows; the only writer
  (`observation_worker.py:75`) is not running; readers exist (`canonical_workers.js`,
  `canonicalization_service.js`, `gateway/routes/ingest.js`, `mission_control.js`) but the DB is
  dormant, so reads hit a frozen snapshot.
- `public.authority_objects` / `authority_lineage` / `authority_supersession` (6–12 read-file refs,
  0 insert refs in live code) — read-side references to a write path that no longer exists.
- `public.event_processing` — read-file refs exist; the only live writer
  (`event_read_authority.js:306`) has produced 0 rows.

**Written AND read but with 0 rows in the live DB (wired but dark):**
`repository_events`, `canonical_events`, `ping_bridge_cursors`, `customers`, `tenant_registry`,
`google_reviews`, `review_flags`, `mission_events`, `mission_executions`, `repository_objects`,
`repository_snapshots`, `repository_dead_letters`, `knowledge_edges`, `event_processing`,
`ai_workspace_results`, `hpp_projects`, `hpp_project_artifacts`, `projections`, `execution_graphs`,
`graph_node_states`, `runtime_registry`, `deployment_registry`, `telemetry_metrics`, `commits`,
`filesystem_cache`. The gateway boots all of their writers/readers, but the deployed workload only
ever touches `ping_events`, `ping_missions`, and `knowledge_nodes`.

---

## 5. Durability assessment

| Aspect | Live DB (`brain-postgres`/`ping_runtime`) | Evidence |
|---|---|---|
| Storage | Named Docker volume `compose_postgres_data` → `/var/lib/postgresql/data` | `docker inspect brain-postgres` mounts |
| fsync / crash safety | `fsync=on`, `wal_level=replica` | `pg_settings` (all 6 containers identical) |
| WAL archiving / PITR | **OFF** (`archive_mode=off`, `archive_command=(disabled)`) | `pg_settings` |
| Replication / standby | None | `docker ps`: no replica containers; no replica config found |
| Scheduled backups | **None** — no crontab for nolan, no Task Scheduler wiring (per RECOVERY.md), no backup container | verified 2026-09-23 |
| Manual dumps | `/home/nolan/ping/pg_dump.sql` (2026-09-16 09:41) — June-era `crx_runtime`, 19 COPY blocks, **zero `ping_events` rows**; schema does not match live DB | `head`/`grep ^COPY` on the dump |
| RLS | None, anywhere | `pg_policies` empty + `relrowsecurity` false on all tables, all DBs |
| Append-only enforcement (live) | **Absent** — no triggers on `ping_events`; mutation guard is code-only (`ON CONFLICT DO NOTHING` on insert) | `information_schema.triggers` empty for live table |
| Single-machine risk | Total — one Pig, one volume, no off-machine copy | topology |

**Net:** the canonical journal is durable against process/container crash (volume + fsync) and against
nothing else: no backup, no PITR, no replica, no off-machine copy, and no DB-level append-only guard.
A `DELETE FROM ping_events` issued with the app credentials (or any operator with Pig docker access)
would succeed silently on the live DB. This is the highest-severity durability finding; the patch
(`../patches/agent13-postgres/P1-append-only-trigger-live-journal.md`) closes the mutation hole but
not the backup hole — the backup hole belongs to the recovery domain (flagged, not duplicated).

---

## 6. Classification rollup (all databases)

- **LIVE:** `brain-postgres.ping_runtime.ping_events` (canonical journal), `.ping_missions`, `.knowledge_nodes`.
- **DORMANT (code-wired, data-empty or workload-absent):** all other tables in `ping_runtime`;
  `ping-postgres.crx_runtime` (whole DB); `ping-postgres.lanea_gate`, `ping-rc-postgres.lanea_gate`,
  `ping-rc-postgres.rc_staging` (staging tier); all `ping-test-pg` DBs; `ping-gauntlet-pg`;
  `swarm02` DBs; `brain-postgres.crx_runtime` (frozen June generation); `brain-postgres.h13_*`
  (owner unknown).
- **DUPLICATE:** `ping_events` exists in 8 databases (`ping_runtime`, `crx_runtime`×2, `lanea_gate`×2,
  `rc_staging`, `pingtest`, `ping-fyd-demo`, `ping_gauntlet`); `crx_runtime` schema exists in 2 containers;
  `repository_events`/`canonical_events` in 5+ DBs. Only one copy is live.
- **CONFLICTING:** `ping_events` schema — live lacks `sequence` + append trigger; staging has both.
  Three generations of append-only triggers (`trg_ping_events_append_only` /
  `trigger_prevent_event_updates|deletes` on `events` / `trigger_prevent_transition_*` on
  `ping_transitions`), none in the live path, none in source.
- **LEGACY:** `tenants`, `capability_requests`, `agent_workspaces`, `system_metadata`,
  `exterior_agent_credentials` (live DB ghosts/stale); `events` table + dormant Python event stack;
  `observations` 7,176 frozen rows; the entire `crx_runtime` June generation.

---

## 7. Findings table (shared record format)

Columns: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY /
CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS.

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| postgres | live journal identity | The live canonical journal is `brain-postgres` DB `ping_runtime`, not `ping-postgres`/`crx_runtime` | gateway container env names (`POSTGRES_HOST=host.docker.internal`, `PORT=5432`, `DB=ping_runtime`); host.docker.internal→192.168.65.254; `brain-postgres` binds 0.0.0.0:5432; `SELECT COUNT(*)`=2429, `MAX(created_at)`=2026-09-23 23:24 UTC on `ping_runtime.ping_events`; `ping-postgres/crx_runtime` all tables 0 rows | ping-gateway container (:8080) | brain-postgres:5432/ping_runtime | UnifiedEventRuntime.emit | routes/events.js, EventReadAuthority, EventBridge | UnifiedEventRuntime | LIVE (corrects RECOVERY.md R1) | PROVEN | none (correction of another agent's claim) | recovery agent, event-forensics | agent20-convergence, recovery |
| postgres | append-only hardening | The live `ping_events` has NO append-only trigger; `trg_ping_events_append_only` exists only in staging DBs and nowhere in source | `information_schema.triggers` empty for `brain-postgres/ping_runtime.ping_events`; trigger present in `ping-postgres/lanea_gate`, `ping-rc-postgres/lanea_gate`, `ping-rc-postgres/rc_staging`; `grep -rn trg_ping_events_append_only` over `/home/nolan/ping` source (excl. worktrees) = 0 hits; `unified_event_runtime.js:43-63` creates no trigger | — | — | — | — | UNOWNED (ad-hoc, 2026-09-16 incident) | CONFLICTING (staging ahead of prod) | PROVEN | DB-layer append-only boundary missing in prod | P1 patch | agent01-event-authority, agent20 |
| postgres | schema divergence | Staging `ping_events` has `sequence BIGINT` + index; live table does not; live `initialize()` never creates it | `information_schema.columns` both DBs; `unified_event_runtime.js:43-63` CREATE TABLE text | — | — | — | — | UNOWNED | CONFLICTING | PROVEN | schema migration boundary (no migration runner owns the delta) | P1 patch (decision: add or drop) | schema agent, agent20 |
| postgres | direct-SQL bypass | `gateway/append_orchestrator.js:91` INSERTs into `repository_events` bypassing the kernel hash chain | file:line + `runtime/kernel/event_repository.js:117` chain fields absent from the bypass INSERT column list | append_orchestrator | repository_events | append_orchestrator.js:91 | EventRepository readers, EventBridge | kernel EventRepository (bypassed) | LIVE VIOLATION | PROVEN | EventRepository hash-chain invariant | P2 patch | agent01-event-authority, replay agent |
| postgres | dual write | `customer_authority.js:448` raw INSERT INTO customers alongside `:541` envelope emit, unbound by transaction | file:lines 448 vs 541 (separate awaits) | CustomerAuthority | customers + canonical_events | customer_authority.js | customer_authority readers | Canonical Event Envelope Authority (partially bypassed) | LIVE VIOLATION (dormant data: 0 rows) | PROVEN | single-governed-write boundary | — | agent01, agent20 |
| postgres | secondary journals dark | `repository_events`, `canonical_events`, `ping_bridge_cursors` = 0 rows in live DB while EventBridge polls every 5s | `SELECT COUNT(*)` ×3 = 0; gateway log "canonical query returned 0 rows"; writers exist in source (`event_repository.js:117`, `canonical_event_envelope.js:174`, agent authorities) | EventBridge | ping_events | (none observed) | EventBridge | UnifiedEventRuntime | DORMANT (code-wired, data-empty) | PROVEN (data) / UNVERIFIED (why — deployed image source not on Pig) | convergence-to-spine boundary (claimed, not occurring) | event-forensics §2D caveat | agent01, agent20 |
| postgres | ghost tables | `tenants`, `capability_requests`, `agent_workspaces`, `system_metadata` exist in live DB with zero source references | `grep -rl` = 0 files each; no CREATE TABLE in source | — | — | — | — | UNOWNED | LEGACY | PROVEN | schema ownership (nothing owns these tables) | — | schema agent |
| postgres | stale credentials table | `exterior_agent_credentials` has 2 rows, no code references in `/home/nolan/ping` | `SELECT COUNT(*)`=2; `grep -rn` = 0 hits excl. worktrees/md | UNKNOWN (external) | — | UNKNOWN | none in inspected bases | UNOWNED | LEGACY/STALE | PROVEN (existence+staleness); writer UNVERIFIED | credential-table ownership | — | security agent |
| postgres | unknown-owner DBs | `brain-postgres.h13_*` (`proposed_actions`, `effects`) have no references in either inspected base | `grep -rn h13` = 0 hits; `business_action_authority.js` names the table but no DB | UNKNOWN | — | UNKNOWN | UNKNOWN | UNOWNED | DORMANT | PROVEN (absence) | ownership boundary | coordinator must identify owner | agent20 |
| postgres | backup absence | No backup, WAL archive, replica, or schedule protects the live journal; the only dump is June-era and schema-mismatched | `pg_settings` (archive_mode=off ×6); no crontab; `pg_dump.sql` 2026-09-16 09:41, 19 COPY blocks, 0 ping_events rows; RECOVERY.md R1–R17 (not duplicated) | — | — | — | — | UNOWNED | LIVE RISK | PROVEN | durability boundary | recovery agent (owner of the backup fix) | recovery, agent20 |
| postgres | dead trigger branch | `ping_events_no_mutation()`'s `TG_OP='TRUNCATE'` branch can never fire (row trigger) | function def via `pg_get_functiondef`; Postgres trigger semantics | — | — | — | — | UNOWNED | DORMANT defect | PROVEN | — | P1 patch (remove or add statement trigger) | — |
| postgres | dead pipeline | `event_outbox` written by `gateway/event_outbox.js:132`, never read (NATS not on live path) | file:line + EVENT-FORENSICS §2E (NATS dormant) | event_outbox.js | (NATS, absent) | event_outbox.js:132 | none live | UNOWNED | DORMANT/DEAD | PROVEN | transport boundary (designed-for-NATS, NATS absent) | — | agent01 |

---

## 8. Patch index

Per the patch rule (live core / live DB = PROPOSE ONLY), no patch was applied. Two proposals written
as WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT docs (no new canonical database created):

- `../patches/agent13-postgres/P1-append-only-trigger-live-journal.md` — promote the staging-proven
  `ping_events_no_mutation()` trigger to `brain-postgres.ping_runtime.ping_events`; decide the
  `sequence`-column divergence; remove or fix the dead TRUNCATE branch.
- `../patches/agent13-postgres/P2-append-orchestrator-bypass.md` — route
  `gateway/append_orchestrator.js:91` through `EventRepository.appendEvent` (or quarantine it with a
  chain-integrity assertion), so the `repository_events` hash chain cannot be silently broken.

## 9. Open questions for the coordinator

1. **Which bytes run in `ping-gateway:devin-boundary2`?** (inherited from EVENT-FORENSICS §2D —
   unresolved here too). It determines whether the wired-but-dark writers (`repository_events`,
   `canonical_events` producers) are actually deployed.
2. **Who owns `brain-postgres.h13_*`?** No references in either inspected base; do not migrate or drop
   until the writer is identified.
3. **Who wrote the 2 rows in `exterior_agent_credentials`?** Credential-adjacent table with no code
   path — worth a security-agent glance.
4. **`sequence` on `ping_events`: adopt or drop?** Staging has it, live doesn't, live code doesn't
   create it. The ordering story (EVENT-FORENSICS §2E: "timestamp ordering, weaker than a sequence")
   depends on this decision.
5. The `ping_events` in the two `lanea_gate` DBs (6 rows each) and their provenance were not traced —
   out of scope, flagged as staging.
