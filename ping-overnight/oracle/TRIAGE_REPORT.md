# Oracle Triage + Persistence Proof Report
## PING overnight convergence sprint, 2026-09-16/17

Agent: Oracle triage + persistence proof (subagent, sole Oracle writer tonight).
Window: 2026-09-16 19:50 MDT to 2026-09-17 ~02:05 MDT (Oracle times below in UTC).
Access path: cloud VM -> pigwsl -> WSL Ubuntu -> ssh ubuntu@129.146.60.17 (passwordless, as documented).

---

## 1. Environment verification (Task 1)

| Item | Value |
|---|---|
| Host | ping-core-01, Ubuntu 24.04.4 LTS, kernel 6.17.0-1020-oracle, aarch64 |
| RAM / disk | ~5.8 GB RAM, ~28 GB disk free (per operator brief; not re-measured) |
| docker | 29.1.3, build 29.1.3-0ubuntu3~24.04.2 |
| docker compose | 2.40.3+ds1-0ubuntu1~24.04.1 |
| git | 2.43.0 |
| docker service | active since 2026-09-15 18:29:21 UTC |
| passwordless sudo | yes (used for systemctl) |
| /opt/ping | full deployment tree present; .env mode 600 (read on-box only, never printed) |
| gateway node | v20.20.2 inside ping-gateway |
| postgres image | postgres:17-alpine |
| qdrant image | qdrant/qdrant:v1.7.0 (Debian 12 bookworm base, has bash and perl; no wget/curl/nc) |

Compose project: `oracle`. Live config file (per container labels and `docker compose ls`):
`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml`
Backup of pre-edit file: same path with suffix `.bak-20260916-oracle-triage`.

Divergence noted: `/opt/ping/infrastructure/oracle/docker-compose.oracle.yml` is an older variant that lacks both the qdrant and gateway healthchecks. The deployed snapshot copy is the live authority. The two should be reconciled by whoever owns the release process; I did not touch the older copy.

---

## 2. Healthcheck triage and repair (Task 2)

### 2a. ping-qdrant: UNHEALTHY, failing streak 7387

Healthcheck test (before fix):
`["CMD-SHELL", "timeout 5 sh -c 'cat < /dev/null > /dev/tcp/localhost/6333' || exit 1"]`

Health log output on every probe:
`sh: 1: cannot create /dev/tcp/localhost/6333: Directory nonexistent`, exit 1.

Exact root cause: `/dev/tcp` is a bashism. Docker executes CMD-SHELL with `/bin/sh`, which in this image is dash. Dash has no `/dev/tcp` pseudo-device, so the redirection fails before any network I/O happens. The qdrant server itself was healthy the whole time (`/`, `/healthz`, `/readyz`, `/cluster` all returned HTTP 200 from the host). The test was broken, not the service.

Fix applied (one word): `sh -c` changed to `bash -c`. Bash exists in the qdrant image (verified via `docker exec`). Semantics unchanged: TCP connect to localhost:6333, 5s timeout.

### 2b. ping-gateway: UNHEALTHY, failing streak 7361

Healthcheck test (before fix):
`["CMD-SHELL", "node -e \"require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""]`

Health log: exit 1 with empty output on every probe.

Exact root cause, in two parts:
1. The empty output is by design of the test command: the one-liner never logs anything, so a non-200 status produces exit 1 with zero output. There was no crash and no connection error (a connection error would have printed a stack).
2. The exit 1 was correct behavior: the app's `/health` endpoint was returning HTTP 503 because its `qdrant` component reported `{status: "error", error: "fetch failed"}`. Tracing the code: `ping-runtime/search/qdrant_adapter.js` line 10 builds its URL as `process.env.QDRANT_URL || 'http://localhost:6333'`. The compose file set `QDRANT_HOST=qdrant` and `QDRANT_PORT=6333` but never set `QDRANT_URL`, so the adapter probed `http://localhost:6333` from inside the gateway container, where nothing listens (ECONNREFUSED, surfaced by undici as `TypeError: fetch failed`). I verified from inside the container that `http://qdrant:6333/healthz` returns 200 while `http://localhost:6333/healthz` fails ECONNREFUSED. The legacy fallback `http://brain-qdrant:6333` in `gateway/qdrant_client.js` is a second wrong default but is not on the live `/health` path.

Fix applied: added `QDRANT_URL: http://qdrant:6333` to the gateway service environment in the compose file. This also let the previously `not_initialized` embedding component initialize (now healthy: nomic-embed-text, collection `knowledge`, vectorSize 768).

Additionally, the gateway healthcheck test now logs the status code to stderr on failure (`console.error('health status: ' + r.statusCode)`), so the next triage will not face an empty log. Pass/fail semantics are unchanged.

### 2c. How the fixes were applied (safe)

Edited only the live compose file (3-line diff, backup kept). Then:
`docker compose -f <file> --project-name oracle up -d qdrant gateway`
This recreated the two containers with identical images and the same named volumes. postgres was not touched. No `down -v`, no volume prune, no system prune.

### 2d. Post-fix state (verified 2026-09-17 ~01:55 UTC and again ~02:02 UTC)

- ping-qdrant: healthy, failing streak 0, health log exit 0
- ping-gateway: healthy, failing streak 0, health log exit 0
- ping-postgres: healthy throughout (31h uptime, never restarted)
- `GET /health`: overall `healthy`; qdrant component `healthy` version 1.7.0; embedding `healthy`; gateway/integrations/event_governance/event_runtime/canonicalization all `healthy`
- After the later `docker restart` (see section 4), all three returned to healthy with streak 0.

---

## 3. ping_events table truth (Task 3)

Connected with real credentials read from /opt/ping/.env on-box (role `ping`, db `crx_runtime`). 31 tables in `public`.

| Table | Rows (start of window) | Rows (end) |
|---|---|---|
| ping_events | 985 | 1013 |
| ping_missions | 192 | 198 |
| canonical_events | 0 | 0 |
| event_outbox | 0 | 0 |
| mission_events | 0 | 0 |
| mission_executions | 0 | 0 |

Schema notes for ping_events: `event_id varchar(64)` PRIMARY KEY (duplicates impossible at DB level; GROUP BY check confirmed 0 duplicates), `event_type`, `source`, `timestamp`/`created_at` timestamptz default now(), `payload` jsonb, `metadata` jsonb, `namespace` default `core::system`, `processed` boolean default false. Indexes on event_id (pk), namespace, type, source, timestamp, processed, metadata causation_id, metadata correlation_id.

Append-only character: conventional, not DB-enforced. There are no triggers on ping_events and no `updated_at` column. Nothing in the observed window performed an UPDATE or DELETE; the table only grows by INSERT (985 to 1013 during this run, all inserts).

Namespaces present: `core::system` (822 at baseline), `tenant::hpp` (153), `core::owner` (10).

Event type mix at baseline: 192 missions x 4 lifecycle events (MISSION_CREATED/ASSIGNED/STARTED/COMPLETED = 768), 24 each of REPLAY_COMPLETED, CLASSIFICATION_CREATED, LINEAGE_CREATED, OBSERVATION_CREATED, CLAIM_CREATED, PROJECTION_CREATED, WITNESS_CREATED, RECOMMENDATION_CREATED, plus 7 SYSTEM_HEALTH_CHECK, 3 CUSTOMER_CREATED, 2 PROJECT_CREATED. Baseline window: 2026-09-15 15:33 to 19:02 UTC (deploy window).

Honesty note: `processed` is false on all 985 baseline rows. The EventBridge polls `canonical_events` (empty), so nothing ever flips `processed` on ping_events. The flag is currently write-only.

Credentials: two active exterior agent credentials exist (`muse` Level 1 Observe, `muse-level-2` Level 2 Workspace Write). The proof used the Level 2 key via `Authorization: Bearer`, read from the DB on-box and never written to any delivered file.

---

## 4. Persistence proof: full chain log (Task 4)

Chain: authenticated input -> canonical event persisted -> deterministic mission -> routed to a JS worker -> result/evidence captured -> container restart (volumes intact) -> survival verified -> runtime reconnects, scheduler resumes, new work executes.

All HTTP calls used `Authorization: Bearer <muse-level-2 key>` against `http://127.0.0.1:8080` from the Oracle host. Times in UTC.

### Phase A, pre-restart (2026-09-17 01:59:53 to 02:00:04 UTC)

1. Auth check: `GET /events/stats` returned 200. Authenticated input path confirmed.
2. `POST /events` body `{event_type: "ENTITY_CREATED", aggregate_id: "oracle-triage-20260916", aggregate_type: "persistence_proof", event_data: {probe: "oracle-overnight-convergence", phase: "A-pre-restart", input: "deterministic-seed-001", purpose: "persistence-proof-input"}}` returned 200, `status: ok`.
   - E1 = `c2a902a87642210f44880a81809580d1b77eea350d63e32f5907c1a8c6f7f9a2`
   - Precomputed expected event_id (sha256 of Node-style JSON `{eventType, source, payload}` with source `api:muse-level-2`) matched E1 exactly. Deterministic event identity confirmed.
   - DB row: ENTITY_CREATED, source `api:muse-level-2`, namespace `core::system`, created_at 2026-09-17 01:59:53.949795+00.
   - `ENTITY_CREATED` was chosen because it is governance-registered, has no CanonicalWorker subscription, and has no event-to-mission-bridge mapping, so the input event persists without side effects. (Governance rejects unregistered types with UNREGISTERED_EVENT; verified in code.)
3. `POST /missions` body `{missionType: "REPLAY_VERIFY", payload: {event_id: E1, event_type: "REPLAY_VERIFY", documentId: "oracle-triage-doc-001", probe: "oracle-overnight-convergence", phase: "A-pre-restart", correlation_id: E1, namespace: "core::system"}, priority: 5, createdBy: "oracle-triage-agent"}` returned 200, `status: ok`.
   - M1 = `7b026dfacf31c414`
   - Precomputed expected mission_id (sha256(`REPLAY_VERIFY:` + E1)[0:16], per `mission_runtime.js` `create()`) matched M1 exactly. Deterministic mission identity confirmed, idempotent by construction (ON CONFLICT DO NOTHING).
4. The gateway's in-process MissionScheduler (5s poll, observed `Started, polling every 5000ms`) picked up M1 and routed it to the JS `replay` worker:
   - created_at 2026-09-17 01:59:53.957803+00, status `created`
   - assigned_to `replay` at 01:59:54.942815+00 (MISSION_ASSIGNED event `a6369ccd51204033cf020f24cfbc333f80599ae7414508e17427b2cfc54133b7`)
   - started 01:59:54.944649+00 (MISSION_STARTED event `b4b033808218dcc0fdb4d2e880742b9a481910f9a88331f36da55a676b6e1329`)
   - completed 01:59:54.966114+00 (MISSION_COMPLETED event `cebe09ed2e63c5f1a9650eef962f8a2b7b6f1bdd6f9dfc96b6ea1b25514a21a8`)
   - result: `{"worker": "replay", "duration_ms": 23, "completed_at": "2026-09-17T01:59:54.964Z"}`
   - MISSION_CREATED event for M1: `5ba37268e5ade70eb645211a030cf6583fb994aab36ef4f6c5f171eaf6efd15a` (01:59:53.959828+00)
5. Worker evidence captured as canonical events:
   - E2 = `4c73255e5ea79be7575b51dc97e89719f3e39119c126287f8196818630039694`, REPLAY_COMPLETED, source `replay`, created 01:59:54.958945+00, `replay.verified = true`, `replay.reason = kernel_verified`, correlation_id = E1. A real kernel replay (KernelReplayExecutionProvider is injected in the live gateway), not a structural no-op.
   - The bridge then auto-created WITNESS_CREATE mission `f880ce916d47ed2f` (event-to-mission-bridge, completed by `witness`), producing E3 = `d99c5ceb1bce5be57f93e4b93cb142b06aa8abbc5d25d5392d3e07d3678ea7b1`, WITNESS_CREATED, attestation `witness-4c73255e5ea79be7`, documentId `oracle-triage-doc-001`, created 01:59:59.944747+00.
   - The bridge then auto-created LINEAGE_CREATE mission `3a38311416c6f288` (completed by `lineage`), producing LINEAGE_CREATED at 02:00:04.946169+00. The cascade settled there (0 events in the following 20s window); no runaway loop. Total probe footprint: +16 events, +3 missions.

### Phase B, restart (2026-09-17 ~02:00:07 UTC)

`docker restart ping-gateway ping-qdrant`. postgres was NOT restarted (31h continuous uptime). No volumes were touched; no `down -v`, no prune of any kind. Container IDs unchanged (same containers, new PIDs).

### Phase C, post-restart verification (2026-09-17 02:01 to 02:03 UTC)

Survival check, field by field against the Phase A record:
- E1 row present: same event_id, ENTITY_CREATED, source `api:muse-level-2`, namespace `core::system`, created_at 2026-09-17 01:59:53.949795+00 (unchanged, not re-created).
- E2 row present: same event_id, `verified=true`, `reason=kernel_verified`, created_at 01:59:54.958945+00 (unchanged).
- E3 row present: same event_id, attestation `witness-4c73255e5ea79be7`, created_at 01:59:59.944747+00 (unchanged).
- M1 row present: status `completed`, assigned_to `replay`, result JSON identical, created_at/completed_at unchanged.
- `GET /health`: overall `healthy`; qdrant `healthy` (v1.7.0); embedding `healthy`; all other components healthy.
- EventBridge: 36 `Poll cycle complete` log lines in 3 minutes, 0 errors. Polling resumed.
- MissionScheduler restarted (`polling every 5000ms`); `replay` CanonicalWorker re-registered.
- Qdrant `knowledge` collection present after restart (volume `qdrant_storage` intact).

New work executes post-restart:
- `POST /events` (ENTITY_CREATED, phase C-post-restart, input deterministic-seed-002) returned 200. E4 = `400aa4f26dfda7dfe96fd7a06c624f32cfe0dace5817e53bed27e3ed2176b8c5`.
- `POST /missions` (REPLAY_VERIFY, documentId `oracle-triage-doc-002`) returned 200. M4 = `d65ce50abf143925`, deterministic precompute matched. Status `completed|replay` within 5 seconds.
- M4 evidence: REPLAY_COMPLETED `d981efe1956a8777...`, verified=true, reason=kernel_verified, 02:01:55.327228+00; WITNESS_CREATED `0d468fbe5f66c208...`, 02:02:00.304404+00.

Final counts: ping_events 1013, ping_missions 198. All three containers healthy with failing streak 0.

---

## 5. Replay proof (Task 5)

VERIFIED, no missing edge. Two live kernel replays executed during this run, each followed by a witness attestation:
- E2 `4c73255e5ea79be7575b51dc97e89719f3e39119c126287f8196818630039694`: REPLAY_COMPLETED, verified=true, reason=kernel_verified, correlation E1, upstream document `oracle-triage-doc-001`. Witness: E3 `d99c5ceb1bce5be57f93e4b93cb142b06aa8abbc5d25d5392d3e07d3678ea7b1` (WITNESS_CREATED, attestation `witness-4c73255e5ea79be7`).
- Post-restart: REPLAY_COMPLETED `d981efe1956a8777...` verified=true kernel_verified (02:01:55.327228+00, correlation E4), WITNESS_CREATED `0d468fbe5f66c208...` (02:02:00.304404+00).

The replay surface is the in-process CanonicalWorkers fleet (`replay` handles REPLAY_VERIFY/PROJECTION_CREATED; `witness` handles WITNESS_CREATE/REPLAY_COMPLETED). Read-only replay views also exist at `GET /mission_control/replay/stats`, `/replay/trace/:correlationId`, `/witness/stats` (requirePG). There is no HTTP endpoint to trigger an ad-hoc replay of an arbitrary event; triggering is via the worker fleet, which is the supported path and was exercised here.

---

## 6. Notes and follow-ups

- The compose backup `.bak-20260916-oracle-triage` sits next to the live file; remove it once the morning crew is satisfied.
- The older `/opt/ping/infrastructure/oracle/docker-compose.oracle.yml` lacks the healthchecks and should be reconciled with the deployed copy by the release owner.
- `POSTGRES_PASSWORD` and friends interpolate from the `.env` beside the live compose file; a bare `docker compose up -d` (all services) would also try to start the `scheduler` service (defined, not profile-gated, currently not running). I deliberately scoped recreation to `qdrant gateway`. Starting the scheduler service is a decision for the morning crew, not something I did.
- Minor log noise, pre-existing: `fatal: not a git repository` lines from the scheduler volume mount context. Harmless.
- Temp scripts used for the proof were removed from the Oracle box (/tmp/phase_a.py, /tmp/phase_c.py). No secrets were written to any delivered file; the Bearer key lived only in process memory on-box.

---

## 7. Morning-Deliverable (paste-ready)

### Persistent Oracle State

- VERIFIED: ping_events is the durable canonical store. 1013 rows at end of run (985 at start; all growth was inserts). event_id is the primary key; a GROUP BY check found 0 duplicate event_ids. No triggers enforce append-only at the DB level (convention only, no updated_at column, no UPDATE/DELETE observed).
- VERIFIED: Namespaces present are core::system, tenant::hpp, core::owner.
- VERIFIED: ping_missions holds 198 rows with full lifecycle columns; mission_id is deterministic (sha256 of `missionType:event_id`, 16 hex chars), idempotent via ON CONFLICT DO NOTHING.
- VERIFIED: Qdrant `knowledge` collection and its vectors survived the qdrant container restart (volume qdrant_storage intact).
- PARTIAL: the `processed` boolean on ping_events is write-only; all 985 baseline rows are false because the EventBridge polls the empty canonical_events table, not ping_events. Nothing consumes the flag today.
- UNKNOWN: whether the 1 GB snapshot tarball `ping-oracle-clean-snapshot.tar.gz` is restorable as a full disaster-recovery path; not tested tonight (out of scope, no restore was attempted).

### Oracle Services

- VERIFIED: ping-postgres (postgres:17-alpine) healthy for the full 31h, never restarted, all queries served.
- VERIFIED: ping-qdrant healthcheck repaired and green. Root cause was a broken test, not a broken service: the test used the bashism `/dev/tcp` under dash `sh`, failing every probe with `cannot create /dev/tcp/localhost/6333: Directory nonexistent` while qdrant served 200s. Fix: `sh -c` to `bash -c` (one word). Failing streak 7387 is now 0.
- VERIFIED: ping-gateway healthcheck repaired and green. Root cause was a real app-level 503: the QdrantAdapter probed `http://localhost:6333` (default) because compose never set QDRANT_URL, so the `/health` qdrant component reported `fetch failed`. Fix: added `QDRANT_URL: http://qdrant:6333` to the gateway env. Side benefit: the embedding component went from `not_initialized` to healthy (nomic-embed-text, collection `knowledge`). The docker healthcheck's empty output on failure was by design of its one-liner; it now logs the status code to stderr. Failing streak 7361 is now 0.
- VERIFIED: gateway `/health` returns 200 overall with all components healthy after the fix and after the restart.
- PARTIAL: compose hygiene. The live config is the snapshot copy; the older `/opt/ping/infrastructure/oracle/docker-compose.oracle.yml` lacks both healthchecks and is now divergent. Also, the `scheduler` service is defined but not running; bringing it up is an open decision.

### Persistence/Restart Proof

- VERIFIED: authenticated input. `POST /events` with `Authorization: Bearer` (muse-level-2 key) returned 200; source stamped `api:muse-level-2`; event_id matched a precomputed deterministic sha256.
- VERIFIED: canonical event persisted. E1 `c2a902a87642210f44880a81809580d1b77eea350d63e32f5907c1a8c6f7f9a2` (ENTITY_CREATED, 2026-09-17 01:59:53.949795+00 UTC) in ping_events.
- VERIFIED: deterministic mission. M1 `7b026dfacf31c414` (REPLAY_VERIFY) matched precomputed sha256(`REPLAY_VERIFY:`+E1)[0:16].
- VERIFIED: routed to a JS worker. The in-process MissionScheduler (5s poll) assigned M1 to the `replay` worker; lifecycle MISSION_CREATED `5ba37268...` / ASSIGNED `a6369ccd...` / STARTED `b4b03380...` / COMPLETED `cebe09ed...`; result `{"worker":"replay","duration_ms":23,"completed_at":"2026-09-17T01:59:54.964Z"}`.
- VERIFIED: result/evidence captured. REPLAY_COMPLETED E2 `4c73255e5ea79be7575b51dc97e89719f3e39119c126287f8196818630039694` (verified=true, reason=kernel_verified), WITNESS_CREATED E3 `d99c5ceb1bce5be57f93e4b93cb142b06aa8abbc5d25d5392d3e07d3678ea7b1` (attestation `witness-4c73255e5ea79be7`). The bridge also completed WITNESS_CREATE `f880ce916d47ed2f` and LINEAGE_CREATE `3a38311416c6f288` missions; the cascade settled with no runaway loop.
- VERIFIED: restart without destroying volumes. `docker restart ping-gateway ping-qdrant`; postgres untouched; no down -v or prune anywhere.
- VERIFIED: survival. Post-restart, E1/E2/E3 rows and the M1 row exist with identical identifiers, payloads, results, and original created_at timestamps.
- VERIFIED: runtime reconnects, scheduler resumes, new work executes. Post-restart: E4 `400aa4f26dfda7dfe96fd7a06c624f32cfe0dace5817e53bed27e3ed2176b8c5`, M4 `d65ce50abf143925` completed by `replay` in under 5s, with REPLAY_COMPLETED (verified=true, kernel_verified, 02:01:55.327228+00) and WITNESS_CREATED (02:02:00.304404+00). EventBridge polling resumed (36 clean cycles in 3 min).
- VERIFIED: replay/witness. Two live kernel replays with verified=true plus witness attestations, all identifier-captured. No missing edge; there is no ad-hoc replay HTTP trigger, and none was needed because the worker fleet path is the supported surface.

Blockers: none. The night's objectives are complete. Recommended morning actions: (1) reconcile the two compose copies, (2) decide on starting the `scheduler` service, (3) remove the `.bak-20260916-oracle-triage` backup once reviewed.
