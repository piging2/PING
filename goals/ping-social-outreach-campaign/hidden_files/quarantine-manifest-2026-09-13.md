# Quarantine Manifest: Adversarial Test Residue, 2026-09-13

Phase B of the reliability pass. Policy: label, do not delete. Written 2026-09-13 ~15:25 MDT by the quarantine worker.

## 1. Residue inventory

### 1a. Orca (ExecutionEngine) test missions and artifacts: DESTROYED BEFORE LABELING

The 2026-09-13 adversarial live tests targeted the unauthenticated `/orchestration/*` routes (documented in `~/workspace/tandem/adversarial-pass-2026-09-13.md` section 9 and `~/workspace/tandem/orchestration-auth-trace-2026-09-13.md`). They created:

- In-memory missions via `POST /orchestration/missions` (engine `_missions` list)
- In-memory worker-registry and reputation entries via `POST /orchestration/missions/:id/output` (caller-chosen workerId, attacker-chosen confidence values including 999 and -50)
- Container-disk artifacts via `POST /orchestration/missions/:id/dispatch` and `/output` at `/app/ping-runtime/orchestration/artifact_store/<sha256>.json` (prompt, proposal, consensus, merge-decision artifacts)
- In-memory state-machine and consensus corruption

**Disposition: all of this residue no longer exists.** The `ping-gateway` container was recreated from image `curious-squid-gateway:phase4-eventauth8` at 2026-09-13 21:09:51 UTC (15:09:51 MDT) as part of the Nolan-authorized credential rotation (RestartCount 0, fresh process). Evidence of the wipe:

- `docker exec ping-gateway ls -la /app/ping-runtime/orchestration/artifact_store/` shows only the 3 image-baked files from Jul 21 15:56 (`art_22009771086db070.json`, `art_dc02338004f26e2d.json`, `art_f12aa620b2ff1322.json`); directory mtime unchanged since image build, so no test files were ever added to this container layer
- The artifact store path is not on any volume (only volume is `muse-workspace` at `/app/workspace/muse`), so container recreation destroyed the writable layer
- In-memory `_missions`, worker registry, and reputation live in the Node process; the new process started at 21:09:51 UTC, so that state is gone
- `GET /orchestration/missions` and `GET /orchestration/engine` now return HTTP 401 unauthenticated (the auth fix from the adversarial pass is live in this image, see section 4), so in-memory state cannot even be read without credentials, let alone labeled

Per the task instructions, the gateway was NOT restarted by this worker to label residue; the restart that destroyed it was the authorized rotation recreation, which happened before this task started. No mission ids, titles, or timestamps of the in-memory Orca test missions could be recovered: they were never recorded anywhere outside process memory and the wiped disk layer.

### 1b. Orca test mission surviving in Postgres: ONE ROW (pre-existing, 2026-09-12)

`ping_missions` row:

- mission_id: `3e6a7b3b453b1d98`
- mission_type: `PROBE_TYPE`
- status: `created` (terminal-stuck; no worker handles PROBE_TYPE, MissionScheduler logs "No worker for mission type 'PROBE_TYPE' — skipping" every poll cycle)
- payload: `{"probe": 1}`
- created_by: empty
- created_at: 2026-09-12 19:21:29.977 UTC (13:21:29 MDT, Sep 12)
- priority 0, retries 0, lease_until null, claimed_at null, result null, error null

This predates the 09-13 adversarial pass by a day; it belongs to the 09-12 live-testing session, not the 09-13 adversarial Orca tests. It is the only mission-shaped residue anywhere in the system (it is the sole row in `ping_missions` with empty `created_by` and status `created`; all 340 other missions are `event-to-mission-bridge`/`completed`).

Associated `ping_events` row (system-generated bookkeeping, NOT a test emission):

- event_id `ef7cc539faf448c6e3e0d00391acfff1e4004e136d41e5424f9910ec3e519ce0`, type `MISSION_CREATED`, source `mission-runtime`, timestamp 2026-09-12 19:21:29.983 UTC, `processed = false`. Payload records the mission creation. Never entered the claim pipeline.

### 1c. Rotation smoke events in Postgres: THREE ROWS, clearly marked

All in `ping_events`, all `DOCUMENT_OBSERVED`, all from 2026-09-13 21:09 UTC:

1. `0df8f234351fc80482573c7e4ff759df576ea7ae1323a827f8e60e7db6b4c104` | source `api:muse` | 21:09:23.939 UTC | payload `{"note": "credential rotation smoke pretest"}` | metadata aggregate_id `key-rotation-2026-09-13-pretest`
2. `0d080f4290458ffc9ae4e083ae2a1cdcd9b465f2d03bfa4462b818e8da0cef97` | source `api:muse` | 21:09:55.742 UTC | payload `{"note": "credential rotation smoke test", "check": "l1-post-events"}` | aggregate_id `key-rotation-2026-09-13-l1`
3. `befacf7a7640071042b2ef74fabe9a4478bc0bc68055bfe545f594686aa74f56` | source `api:muse-level-2` | 21:09:55.757 UTC | payload `{"note": "credential rotation smoke test", "check": "l2-post-events"}` | aggregate_id `key-rotation-2026-09-13-l2`

ping_events rows are immutable; the existing marking IS the quarantine. Left untouched.

### 1d. Registry/reputation entries: zero trace in durable storage

- The reputation mutations (`registry.recordQuality/recordConfidence` with confidence 999/-50) were in-memory only in the ExecutionEngine. Destroyed by the 21:09:51 UTC recreation. Zero DB rows.
- `agent_registry`, `runtime_registry`, `tool_registry`, `capability_registry`, `prompt_registry`, `deployment_registry`: all 0 rows. `tenant_registry`: 1 row, `audit63` / "Ledger63 Falsification Tenant", registered 2026-09-01, unrelated to these tests. `capability_requests`: 17 rows, all legitimate `muse`/`muse-level-2` fs.list/fs.read/knowledge.search/event.search from 09-11 and 09-12, no test traces.
- No table named like `%reputation%`, `%worker%`, or `%orca%` exists in the database.

### 1e. Other test residue observed but OUT OF SCOPE (pre-existing, not from the 09-13 adversarial tests; no action taken)

- `/app/workspace/muse/test-persistence.txt`: "Post-restart persistence test - 2026-09-12T10:07:51-06:00". Self-labeled volume persistence test from 09-12. Left as-is.
- `ping_events` test rows from earlier e2e sessions: 4 `REVIEW_RECEIVED` rows (sources `live-e2e-test`, `e2e-chain-v2`, `live-test`, 2026-08-19 to 08-21, ids like `proj_999`/`cust_999`); 5 `LEAD_CREATED` rows (source `endpoint_under`, 2026-09-03, event ids `test-under-0001`..`0005`, payload `{"probe": "under"}`); 3 `OBSERVATION_CREATED` rows (source `api:muse`, 2026-09-12 19:23/19:26/19:28 UTC, observations "originator propagation probe", "full-chain originator probe", "full-chain originator probe 5"). These predate this phase and were not created by the 09-13 adversarial Orca tests. Flagged here only so a future pass does not mistake them for new residue.

## 2. Marker convention (established)

No existing test marker or namespace was found on the 09-13 adversarial residue (it had no metadata fields at all; the routes accepted raw caller input). Convention established for this and future test residue:

- **Orca records (missions, artifacts, registry/reputation entries):** metadata field `origin: "adversarial-test-2026-09-13"` wherever a metadata field is mutable, plus `[TEST]` prefix on titles where titles are mutable.
- **Postgres mission rows:** quarantine metadata under a `quarantine` key in payload, e.g. `{"quarantine": {"origin": "test-probe-2026-09-12", "labeled_at": "<ts>", "status": "inert, no worker handles this type"}}`. Note the origin is date-accurate per record, not blanket-labeled with the 09-13 adversarial tag.
- **ping_events:** immutable; never mutated. Existing event markings (event type, payload notes, aggregate ids) are the quarantine.

## 3. What was labeled and how

- **Nothing from the 09-13 adversarial Orca tests could be labeled**: the in-memory and disk state was destroyed by the authorized 21:09:51 UTC container recreation before this task began. Labeling was impossible, not skipped. This manifest is the quarantine record for that residue.
- **The 09-12 PROBE_TYPE mission row was deliberately NOT mutated.** Reasons: (a) stamping it `origin: "adversarial-test-2026-09-13"` would be false provenance (it is from 09-12); (b) its pristine state is evidence of what was injected; (c) it is inert (unclaimable, never completes, scheduler skips it deterministically every poll, and the MISSION_CREATED event is `processed=false`). The marker convention above is recorded here so a human can apply it later with the correct origin if desired.
- **The three DOCUMENT_OBSERVED rows were left untouched** (immutable); their clear marking is their quarantine.
- **Registry/reputation:** nothing to label; in-memory state destroyed, zero DB trace (verified below).

## 4. Material state change observed during this pass (flag for parent)

The adversarial pass recommended a one-line fix at `gateway_runtime.js:872` (`/orchestration` + `exteriorAuthMiddleware.middleware()`), listed as "NOT implemented, awaiting Nolan's explicit approval." **That fix is now live in the running image**: `/app/gateway/bootstrap/gateway_runtime.js:872` in container `ping-gateway` (image `curious-squid-gateway:phase4-eventauth8`) reads exactly `this._app.use('/orchestration', services.exteriorAuthMiddleware.middleware(), createOrchestrationRoutes(services.executionEngine));`, and unauthenticated `GET /orchestration/missions` and `GET /orchestration/engine` both return HTTP 401. Either Nolan approved it during the phase work or it landed with the eventauth8 image build. The approval trail should be confirmed; the unauthenticated Orca write surface is closed in the running container either way.

## 5. Invariant verification: test execution != production mission != PING knowledge

Queries run read-only via `~/workspace/bin/pig` -> `docker exec ping-postgres psql -U postgres -d ping_runtime` (no bearer keys used or needed).

**Q1. ping_events referencing test mission ids beyond the three DOCUMENT_OBSERVED rows:**
`SELECT count(*) FROM ping_events WHERE payload::text LIKE '%3e6a7b3b453b1d98%' OR metadata::text LIKE '%3e6a7b3b453b1d98%' OR event_id LIKE '%3e6a7b3b%'` => 1 row: the 09-12 MISSION_CREATED bookkeeping event (processed=false, never entered the claim pipeline). Zero rows on 2026-09-13 reference any test mission id.
`SELECT event_type, count(*) ... WHERE (payload ILIKE '%999%' OR payload ILIKE '%adversarial%' OR payload ILIKE '%probe%' OR metadata ILIKE '%adversarial%') AND timestamp >= '2026-09-13'` => 0 rows. The 50 older matches are all pre-09-13 e2e residue (section 1e).

**Q2. Claim/projection tables for test-derived content:**
- `knowledge_nodes`: 131 rows; `WHERE confidence > 1 OR confidence < 0 OR label ILIKE '%probe%' OR label ILIKE '%test%' OR data::text ILIKE '%adversarial%'` => 0 rows. No 999/-50 confidence values anywhere in the knowledge store.
- `projection_versions`, `projection_checkpoints`, `canonical_events`: all 0 rows.
- Today's 2 `CLAIM_CREATED` events (15:09 and 15:12 UTC) are structural provenance pointers from `api:muse` OBSERVATION_CREATED emissions, confidence null, no test content.
- `artifacts`, `artifact_references`, `mission_events`, `mission_executions`: all 0 rows.

**Q3. Reputation registry caller-poisoned values:**
The 999/-50 confidence submissions went to the in-memory ExecutionEngine registry, destroyed at 21:09:51 UTC. DB check: `capability_requests` (17 rows) shows only legitimate muse/muse-level-2 fs.list/fs.read/knowledge.search/event.search from 09-11/09-12. Expected result confirmed: zero trace of the poisoned confidence values in any durable store.

**Verdict:** the invariant holds. Orca test execution never reached Postgres (the engine has no `pool.query`/`pg` path; confirmed by code trace in the adversarial pass). The single PG-side probe mission (09-12) never executed and its bookkeeping event never processed into claims. No test-derived content exists in the PING knowledge plane (ping_events downstream claim/projection machinery, knowledge_nodes, projections).

## 6. Forward rule

Any future gateway restart clears all in-memory Orca state (missions, worker registry, reputation, consensus state); only container-disk artifacts under `/app/ping-runtime/` (non-volume path) and the volume `/app/workspace/muse` survive restarts, and nothing survives a container recreation. If adversarial or smoke tests run again, label missions/artifacts with `origin: "adversarial-test-<YYYY-MM-DD>"` (date-accurate) at creation time, and record mission ids/titles in this manifest pattern before any restart.
