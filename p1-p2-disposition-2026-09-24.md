# P1/P2 Infrastructure Disposition — 2026-09-24

Lane: event-bus classification + Qdrant/Postgres/Vault/CosyVoice disposition.
Canonical source tree verified: `/home/nolan/ping` (carries the 2026-09-24 deprecation notices).
Live process verified: `ping-gateway` container runs `node gateway/server.js` (Up 2 days).
Freeze rule applied throughout: only A (canonical truth at risk), B (security boundary at risk),
C (active FYD path blocked), D (live reliability failure) authorize new core work.

## 1. EVENT BUS CLASSIFICATION

### Canonical path: UnifiedEventRuntime (KEEP)

- `ping-runtime/events/unified_event_runtime.js`. Sole production writer of `ping_events`
  (pinned by `gateway/event_bus_convergence.test.js`: "UER is the sole production writer of ping_events").
- Registry: `gateway/generated/event_registry.json`, 235 event types, schema 1.0.0, generated 2026-09-23.
- Live producers (verified): canonical_workers.js, intelligence_worker.js, canonicalization_service.js,
  mission_scheduler.js, mission_runtime.js, event_bridge.js, routes/events.js, routes/identities.js,
  social_ingest_adapter.js, knowledge_ingest_adapter.js, business_emitters.js, evidence_authority.js,
  embedding_service.js.
- Live consumers: EventBridge (repository_events + canonical_events -> UER -> ping_events, transitional
  convergence mechanism, KEEP), event_to_mission_bridge.js (UER -> mission creation, does not modify
  state, KEEP), routes/events.js (GET /, /recent, /stats, /:stream read ping_events).
- F-01 mission events (event side only; state semantics owned by the sibling lane):
  mission_runtime.js emits MISSION_CREATED, MISSION_ASSIGNED, MISSION_STARTED, MISSION_COMPLETED,
  MISSION_FAILED, MISSION_LEASE_EXPIRED, MISSION_RETRY_RECLAIMED via UER. All canonical observations.
  Standing rule restated: HOLD is non-dispatchable; lease expiry cannot return UNKNOWN to created;
  only reconciliation evidence moves HOLD.

### Legacy path: ConstitutionalEventBus (DEPRECATE, no rewrite)

- `gateway/event_bus.js`. Deprecation notice present (2026-09-24, mission/event-bus convergence stream).
  Writes the legacy `events` table with self-minted IDs; bypasses the UER journal entirely.
- Reachability correction vs the earlier classification: the sole instantiation site
  (`gateway/knowledge_compiler.js:798`) is reachable ONLY via `gateway/end_to_end_verifier.js`,
  which instantiates it inside `if (require.main === module)` (manual run only). The live
  `server.js -> bootstrap/gateway_runtime.js` require graph contains zero references to
  knowledge_compiler or end_to_end_verifier. Net: the bus has ZERO live instantiation in the
  running gateway. Removing it would break nothing in the live process; it would break only a
  manual verifier run.
- Live event types: PASS_COMPLETED, PASS_FAILED (knowledge_compiler.js:77,93 and
  reflection_pass.js:49,64 via _emitEvent, aggregate_type COMPILER_PASS). Ephemeral internal
  signals: pass lifecycle telemetry. The canonical transition is the persisted pass output,
  not the event. No live readers: replayPass (knowledge_compiler.js:864) has zero callers.
- Verdict: keep the types documented as ephemeral; sanctioned direction is knowledge_compiler -> UER;
  do not migrate legacy `events` rows blindly. Removal is a future wave (fails freeze: no A/B/C/D).

### Dead buses, publishers, subscribers (classify only, no action this wave)

| Item | Evidence | Verdict |
|---|---|---|
| MissionEventBus (`gateway/mission_event_bus.js`) | Zero instantiation sites, zero requirers, zero publish sites in the main tree | DEAD, removal candidate future wave |
| MissionGenerated / MissionStarted / MissionCompleted publishes (`self_improvement_loop.js:135`, `mission_execution_authority.js:105,173`) | Writers never constructed in production (no `new SelfImprovementLoop`, no `new MissionExecutionAuthority`); obsolete string-first convention incompatible with current `publish(event)` signature | DEAD |
| `commit_acquired` (`acquisition_authority.js:157`) | Calls `.emit()`, which does not exist on ConstitutionalEventBus public API; `ContinuousAcquisition` never instantiated in production | DEAD path |
| `control_center_subscription.js` | Self-declared dormant (own deprecation notice 2026-09-24); absent from bootstrap require graph; only referenced by a dormant-inventory test file list | DEAD, archive only with approval |

### What breaks if each bus were removed

- ConstitutionalEventBus removed: nothing in the live gateway (zero instantiation). Manual
  end_to_end_verifier runs would fail at KnowledgeCompiler construction. Legacy `events` table
  stops receiving writes it already was not receiving.
- MissionEventBus removed: nothing (never wired).
- UER removed: everything. It is the canonical journal; 12+ producers and all mission state
  observations flow through it. Not removable, ever, without a replacement journal.

## 2. QDRANT INVENTORY + DISPOSITION

### Live plane: brain-qdrant (host 6333/6334, Up 2 days)

Collections (queried live): `constitutional_documents` 26 pts green, `constitutional_memory` 0 pts green,
`knowledge` 389 pts green.

Writers:
- JS live path: `gateway/bootstrap/gateway_runtime.js:486` constructs QdrantAdapter with
  QDRANT_URL=http://host.docker.internal:6333 (brain-qdrant) + EmbeddingService upserts the
  `knowledge` collection (`ping-runtime/embeddings/embedding_service.js`). Fail-soft: init failure
  disables async projection, pipeline continues.
- Python integrated path (no worker services currently running): single construction site
  `ProjectionAuthority.get_client()` (`runtime/authorities/projection_authority.py`), pinned by
  `runtime/authorities/test_qdrant_access_sovereignty.py`. Upsert workers:
  `runtime/kernel/workers/qdrant_projection_worker.py` (Postgres events -> projections),
  `runtime/projection_worker/constitutional_projection_worker.py` (Vault docs + Postgres events ->
  constitutional_memory). URL + api key resolve via ConfigurationAuthority (values not accessed).

Readers:
- JS: HybridSearch reads `knowledge` (`ping-runtime/search/hybrid_search.js:99`); health check registered.
- Python: `runtime/retrieval/retrieval_service.py`, `runtime/workers/retriever_worker.py`,
  `runtime/retrieval/retrieval_service.py` via `ProjectionAuthority.search_collection`
  (fallback chain constitutional_documents -> constitutional_memory). All fail-soft.

Tenant namespace / metadata filters: NONE on any path. Python upsert payloads carry
event/document metadata (no tenant_id). JS search takes collection + vector + limit only.
`ProjectionAuthority.search_collection` applies no filter. Tenant isolation at the Qdrant layer
is unproven. The sibling TenantOS lane's trace currently covers Postgres/Mission Control
projections; no Qdrant-specific hostile test has been published. Do not duplicate; do not touch
ping-qdrant until that trace lands.

Canonical sources: Vault documents + PostgreSQL events. Qdrant is a derived projection
("TRUTH != EMBEDDINGS"). Rebuild paths: `runtime/projection_worker/rebuild_certification.py`
(destroy + rebuild constitutional_memory from truth sources, verify identical counts/hashes/lineage);
`qdrant_projection_worker` replays Postgres events; JS EmbeddingService re-indexes from source types.

### ping-qdrant (isolated, no live consumers)

Up ~1 hour, healthy, internal-only network (shares only with ping-vault and ping-redis, neither a
consumer), no host ports published in running config, API-key protected (key not pursued; secret).
Collections/points NOT VERIFIED (auth required). Compose-declared consumers (ping-projection-worker
etc.) are not running. Status: decommission CANDIDATE only. No deletion, no data touched, no auth
bypass attempted. Blocked on the sibling tenant-isolation trace.

### constitutional_memory (read-only investigation)

0 points on the live plane. No live writer (no projection-worker service running). No live reader
(gateway HybridSearch targets `knowledge`; Python fallback chain has no running workers). Cannot
prove tenant isolation AND shows no live consumer: decommission candidate per the rule, but deletion
is a future wave per the freeze rule. Classify only.

### Qdrant disposition vs the freeze rule

No A (canonical truth safe: derived, rebuildable, plane healthy), no B (no multi-tenant data flows
today; single-tenant, fail-soft), no C, no D. BACKLOG: (1) ping-qdrant decommission decision after
sibling trace lands; (2) constitutional_memory collection disposition; (3) tenant-filter design for
Qdrant when multi-tenancy becomes real; (4) ping-qdrant collection inventory via an authorized path.

## 3. VAULT (non-secret inventory)

- `ping-vault`: Up 2 days, health UNHEALTHY (healthcheck failing), dev server mode
  (VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200, dev root-token auth), port 8200 published.
  Volume ping_ping_vault -> /vault/data, but dev mode is in-memory by default: treat as non-durable.
- Secret classes (types only, zero values read): openai, anthropic, google, postgres, qdrant, jwt,
  google_drive API keys/credentials + generic path/key accessor. KV v2 at /ping. AppRole ping-app.
- Consumers via get_secret_adapter(): retrieval_service.py, constitutional_projection_worker.py,
  configuration.py, google_drive_ingestion_adapter.py. ALL reads fall back to environment variables,
  so vault loss or restart breaks nothing. The vault is vestigial today.
- Migration/recreation: HOLD per standing directive. No values read, no recreation attempted.

## 4. COSYVOICE

- Container `cosyvoice-tts`: present, state exited (stopped, NOT removed, NOT uninstalled).
- Dependency check re-run against the current tree: zero references to cosyvoice/TTS in
  gateway/, ping-runtime/, runtime/. No running container carries COSY/TTS/5001 env.
  No authorized consumer. Voice cloning stays paused per standing directive.
- Data/config preserved on host bind mounts (untouched). Restart procedure (written, exact):
  `cd /mnt/c/Users/nolan/qwen3-tts-docker && docker compose -f docker-compose.cosyvoice.yml up -d`
  (or `docker start cosyvoice-tts`).
- Verdict: STOPPED, already handled. Nothing further this wave. Do not uninstall.

## 5. POSTGRES

- `brain-postgres` owns 0.0.0.0:5432 exclusively. Up 2 days.
- No second publisher of host 5432. Other instances on distinct host ports:
  ping-postgres -> 5433, ping-rc-postgres -> 127.0.0.1:15433, ping-test-pg -> 55433,
  ping-gauntlet-pg -> 127.0.0.1:54339, swarm02-pg -> 55434.
- No violation found. Healthchecks remain deferred to a maintenance window.

## 6. BACKLOG (fails the A/B/C/D freeze test)

1. ConstitutionalEventBus removal + legacy `events` table disposition. Reason: zero live
   instantiation; no canonical truth at risk; cleanup, not A/B/C/D.
2. MissionEventBus / dead publishers / control_center_subscription deletion. Reason: ordinary
   dead code; no A/B/C/D.
3. ping-qdrant decommission. Reason: isolated and consumer-free, but blocked on the sibling
   tenant-isolation trace; no A/B/C/D urgency.
4. constitutional_memory disposition. Reason: empty and consumer-free, but deletion needs its
   own wave; no A/B/C/D.
5. Qdrant tenant-filter design. Reason: no multi-tenant data flows today; premature.
6. Vault migration/recreation. Reason: already HOLD; consumers survive on env fallback.
7. Ephemeral legacy event-type renames. Reason: cosmetic; no A/B/C/D.

## NAMED DECISIONS

- D1: UER (`ping_events`) is the sole canonical event journal. All classification converges toward it.
  ConstitutionalEventBus is legacy, frozen, effectively uninstantiated in the live process.
- D2: No event-bus code changes this wave beyond the existing Phase-0 deprecation/direction tests.
  The earlier classification's "production instantiation" claim is corrected: the bus has zero live
  instantiation (manual-verifier-only reachability).
- D3: Live Qdrant plane is brain-qdrant; ping-qdrant is an isolated standby, decommission candidate
  only, untouched until the sibling tenant-isolation trace lands.
- D4: Qdrant holds no canonical truth (derived projection, rebuildable from Vault docs + Postgres
  events). No tenant filters exist on any Qdrant path; tenant design is backlogged, not built.
- D5: Vault migration stays HOLD. CosyVoice stays stopped (not uninstalled). brain-postgres keeps
  exclusive host 5432. Gateway cutover untouched; live 8080 not contacted.
- D6: Seven items backlogged with reasons above. No Wave 4 spawned.
