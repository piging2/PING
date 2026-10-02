# Recon Track G: Storage Architecture + Mission Control + Oracle Deployment
**Agent:** G (read-only architectural reconnaissance) | **Date:** 2026-09-19 (MDT) | **Program sections 21-23**
**Law honored:** absolute read-only. No source edits, no commits, no DB writes (SELECT-only probes on live Oracle), no installs, no deploys, no secret reads (key names redacted), no private-key contents read. Writable artifact: this file only.

## Method
Evidence hierarchy applied: LIVE RUNTIME TRACE (Oracle host 129.146.60.17 via Pig SSH, gateway /health and /mc/dashboard, Qdrant REST, PG information_schema + SELECT counts) > CURRENT EXECUTABLE CODE (main repo `/home/nolan/ping` @ feature/approval-effect-identity 88c9651be; oracle-deploy worktree @ 6b4222467) > CURRENT CONFIGURATION (docker-compose.oracle.yml, bootstrap.sh) > DOCUMENTATION.

Maturity labels used: PROVEN_RUNTIME, PROVEN_DURABLE, PROVEN_RESTART, PROVEN_INTEGRATION, PROVEN_UNIT, WIRED_UNPROVEN, BUILT_NOT_LIVE, EXPERIMENTAL, DOCUMENTED_ONLY, PRESERVED_INACTIVE, LEGACY, FALSIFIED, UNKNOWN.

---

## (a) Datastore census

### Census table
| Store | Maturity | Unique query enabled | Source of truth | Rebuild from | If deleted |
|---|---|---|---|---|---|
| **Postgres 17** (ping-postgres, db `crx_runtime`) | PROVEN_RUNTIME | Canonical event log (`ping_events`: event_id PK sha256, event_type/source/timestamp/namespace/processed, payload+metadata JSONB, GIN-able indexes on type/source/namespace/causation/correlation); mission state (`ping_missions` 419 rows); knowledge graph nodes/edges (`knowledge_nodes` 178, edges 0); registries | ITSELF (canonical truth) | Replay from append-only history; projections rebuild from events | Total loss of truth. Must be backed up. Only non-rebuildable store. |
| **Qdrant 1.7.0** (ping-qdrant, collection `knowledge`, 112 vectors, 768-dim cosine) | PROVEN_RUNTIME (running, healthy) | Approximate-nearest-neighbor semantic search over embedded event/document text | Postgres (events/documents that were embedded) | Re-embed from PG event payloads + re-upsert | Semantic search falls back to PG keyword/JSONB search; gateway explicitly non-blocking on Qdrant failure (bootstrap: "Init failure here must NOT disable the PG-backed pipeline") |
| **Neo4j** (compose.brain.yaml only) | BUILT_NOT_LIVE | Graph traversal (multi-hop neighborhood queries) | Postgres `knowledge_nodes`/`knowledge_edges` (live `/knowledge` routes query PG-backed KnowledgeGraph, not Neo4j) | PG tables | Nothing observable: `neo4jAdapter` is instantiated in `gateway_runtime.js:483` but referenced NOWHERE else in live code. Zero runtime consumers. |
| **Redis** (`adapters/redis_adapter.js`) | BUILT_NOT_LIVE | Ephemeral cache / rate-limit counters / sessions | Postgres or in-memory | N/A (nothing reads it) | Nothing: adapter is required by zero live files |
| **MinIO/S3** (`adapters/s3_adapter.js`) | BUILT_NOT_LIVE | Large immutable artifact/blob storage | Would be PG today | N/A | Nothing today: required by zero live files; artifact tables on Oracle (`hpp_project_artifacts`, `repository_objects`, `repository_snapshots`) are all 0 rows |
| **ClickHouse** | ABSENT | Analytics/OLAP aggregations | N/A | N/A | Nothing; zero mentions in repo |
| **Temporal** (compose.brain.yaml; profile-gated `temporal` in docker-compose.oracle.yml) | EXPERIMENTAL | Durable workflow execution (mission workflows with stub activities exist in code) | Postgres mission tables | N/A | Nothing: NOT running on Oracle; workers run as plain Node processes |
| **Kafka/Zookeeper** (`gateway/messaging_port.js`, `publication_port.js`) | BUILT_NOT_LIVE | Cross-repo pub/sub | N/A | N/A | Nothing: required by zero live bootstrap files |
| **OpenSearch / DuckDB / Tika** | DOCUMENTED_ONLY | Full-text / analytics / doc extraction | N/A | N/A | Only `generate_secrets.py` mentions them; no live wiring |
| **Vault** (compose.yaml `vault:` service) | WIRED_UNPROVEN | Secret storage | N/A | N/A | Unknown wiring on Oracle; compose-level only |
| **Ollama** | EXPERIMENTAL (absent on Oracle) | Real text embeddings (`nomic-embed-text`) | N/A | N/A | Not running on Oracle host (curl to 127.0.0.1:11434 empty). Embeddings fall back to deterministic SHA-256-seeded pseudo-vectors tagged `embedding: 'fallback'` |

### Oracle PG table census (live SELECT, db `crx_runtime`, user `ping`)
27 tables. Populated: `ping_events` 2182, `ping_missions` 419, `knowledge_nodes` 178, `exterior_agent_credentials` 2, `repository_store_migrations` 11. **All others 0 rows**, including `canonical_events` (0), `repository_events` (0), `mission_events` (0), `mission_executions` (0), `customers` (0), `tenant_registry` (0), `telemetry_metrics` (0), `knowledge_edges` (0), `repository_objects` (0), `repository_snapshots` (0), `hpp_project_artifacts` (0).

Event source distribution (top): mission-runtime 1677, replay/witness/lineage 61 each, recommendation/claim/classification/projection 51 each, `api:muse-level-2` 44, observation 25. Test pollution present: `python-worker-flaky` 4, `python-worker-fail` 4, `my-test-source` 1 — experiment rows live inside the canonical event store on the production host.

### Postgres-alone verdict
**Yes for the first product stage, with one gap.** Postgres 17-alpine today holds: canonical event history, mission state, the knowledge graph (nodes+edges via SQL, served by `/knowledge` routes), registries, and outbox/dead-letter tables. The only capability Postgres cannot natively provide is ANN vector search (no pgvector references in live schema; only a historical `pg_dump.sql` mention), which is Qdrant's entire unique contribution. Everything else in the census is either dead code (Neo4j adapter, Redis, MinIO, Kafka) or profile-gated/absent (Temporal, Ollama, ClickHouse).

Recommendation: ship stage 1 as **Postgres + Qdrant only** (matches the live Oracle footprint exactly). Defer or delete: Neo4j adapter instantiation, redis_adapter, s3_adapter, Kafka ports, OpenSearch/DuckDB/Tika references. Keep Temporal profile-gated; do not enable until a durable-workflow need is proven against plain Node workers.

---

## (b) Mission Control truthfulness audit (UI CLAIM <= BACKEND PROOF)

Audit target: `CascadeProjects/infra/ui-next` in the **oracle-deploy worktree** @ 6b4222467 (the branch carrying the UI cleanup commits). The main-repo copy of ui-next is an older divergent subset; the worktree is the superset under active truthfulness repair.

### Cleanup commits verified (all 2026-09-18, all by Trish Nikitha)
- `25a03ab96` "stop fabricating mission API responses": `/api/missions` GET/POST previously returned mock-data missions and `{success:true, mission:body}`; now returns 503 with "no gateway contract is configured." PASS.
- `de1aa3e16` "remove unsupported mission mutations": 15 lines of fake mutation handlers removed from `MissionDetail.tsx`. PASS.
- `fe5f30324` "remove unwitnessed mission detail contract": -190/+14 in `MissionDetail.tsx`, removing a detail contract with no witness backing. PASS.
- `6b4222467` "hide fixture-backed missions board": `/missions` page replaced with "Missions unavailable — Mission data cannot be shown until a gateway contract is configured and witnessed." PASS. The header explicitly states the precondition (configured + witnessed), which is the correct bar.

### Per-surface pass/fail (worktree UI)
| Surface | Backend proof available? | Verdict |
|---|---|---|
| `/missions` page + `/api/missions` route | No gateway contract configured in this UI | **PASS (hidden, 503 with reason)** — cleanup commits |
| `/missions/[id]` detail | Removed unwitnessed contract | **PASS (removed)** |
| `/witness` (WitnessTimeline) → `GET http://localhost:8080/api/witness` | **404 on live Oracle gateway** (verified). Real gateway serves `/mc/witness/stats` and `/witness/stats` under other mounts, not `/api/witness` | **FAIL** — contract mismatch; surface is dead against the real gateway |
| `/observation` (ObservationDashboard) → `GET /api/observation?range=` | No such route on live gateway | **FAIL** — dead surface |
| `/command-center` (ConstitutionalMixer, DecisionEngine, KnowledgeGalaxy, TimeMachine, OllamaControlRoom, ReasoningPuppetStrings, SemanticMemory) → `GET /api/commands`, `/api/commands/history`, `POST /api/commands/execute` | No such routes (verified 404-class absence in route crawl of main repo; live Oracle `/api/*` 404s) | **FAIL** — dead surfaces; names like "ConstitutionalMixer" and "TimeMachine" imply capabilities with no backend |
| `/pipeline` (PipelineBoard) → `GET /api/pipeline` | No such route | **FAIL** |
| `/notifications` (NotificationPanel) → `GET /api/notifications` | No such route | **FAIL** |
| `/chat` (CockpitDashboard) → `GET /api/system/state` | No such route; main gateway has `/health` (real) and `/mc/system` (exists) but not this path | **FAIL** |
| `/knowledge` (KnowledgeGalaxy) | Component has **zero** fetch calls (0 fetch/axios/WebSocket in source); purely decorative | **FAIL** — renders with no data path at all |
| `mock-data/` (issues, users, teams, projects, labels, priorities, status, cycles) | Still imported by ~20 components (badges, selectors, group-issues, issue-line, all-issues, MissionBoard, MissionList, sidebar create-issue flow) | **FAIL (latent)** — fixture dependency remains wherever these components render; the missions page was hidden but the components still exist and still import fixtures |
| `GATEWAY_URL = 'http://localhost:8080'` hardcoded in 7 components | Main compose sets `NEXT_PUBLIC_GATEWAY_URL=http://gateway:8080` for the ui service; components ignore the env var entirely | **FAIL** — localhost assumption breaks any remote/Oracle deployment of the UI itself |
| `/missions` real contract exists? | Main-repo gateway mounts `POST /missions`, `GET /missions/stats`, `/missions/:id/*`; **deployed Oracle gateway returns 403 `MISSING_AUTH` on `/missions`** — auth layer exists in the deployed image, no credentials wired in the UI | **BLOCKED** — contract exists but UI has no auth story |

### Fixture audit summary
The four cleanup commits fixed exactly the surfaces they touched (missions API route, mutations, detail contract, missions page). The remaining UI is **not yet truthful**: 8 more surfaces fetch from `/api/*` endpoints that 404 against the live Oracle gateway, KnowledgeGalaxy fetches nothing at all, and `mock-data/` remains the data source for ~20 components. UI CLAIM >> BACKEND PROOF on every surface except /health and the hidden missions page.

Note on the real backend (main repo `gateway/routes/`): 137 routes exist including `/mc/dashboard` (verified live on Oracle: missions completed 417 / failed 2, matching `ping_missions` 419 rows), `/mc/witness/stats`, `/mc/replay/stats`, `/mc/activity`, `/missions/*`, `/events/*`, `/knowledge/*` (PG-backed). The honest UI rebuild path is to re-point components at these real contracts — but the worktree UI was written against an `/api/*` contract that never existed in any gateway.

### Demo-seed contamination (live Oracle, PROVEN_RUNTIME)
`gateway_runtime.js:_seedBusinessEvents` inserts fictional customers ("Sarah Chen", "Mike Rodriguez", "Emily Watson", sarah@example.com) and leads ("Kitchen remodel estimate request") into `ping_events` on first boot when the table is empty. Verified on Oracle: **8 rows match the seed** (`payload like '%Sarah Chen%'`). These fictional rows are indistinguishable from real business data in any UI backed by `ping_events` — a truthfulness defect at the source, not just the UI.

---

## (c) Oracle read-only inspection + minimum viable deployment

### Verified host facts (2026-09-19, live SSH from Pig; unreachable from hatch VM — ICMP 100% loss, egress proxy resets SSH)
- Hostname `ping-core-01`, kernel `6.17.0-1020-oracle` aarch64, **Ubuntu 24.04.4 LTS** (minimized image)
- **CPU: 1 vCPU** (nproc=1, verified twice)
- **RAM: 5.9 GiB total; 753 MiB used; 5.15 GiB available** (idle)
- **Disk: 45G total; 19G used; 26G free (42%)** on /dev/sda1
- Docker Compose v2.40.3 present
- Top RSS processes: node, dockerd, containerd, qdrant, postgres, snapd, fluentd — no runaway consumers

### Verified running deployment
| Container | Image | Uptime | Health | Memory | Ports |
|---|---|---|---|---|---|
| ping-gateway | oracle-gateway (built image) | 36h | healthy | **136 MiB** | 127.0.0.1:8080 |
| ping-postgres | postgres:17-alpine | 37h | healthy | **47 MiB** | 127.0.0.1:5432 |
| ping-qdrant | qdrant/qdrant:v1.7.0 | 47h | healthy | **22 MiB** | 127.0.0.1:6333-6334 |

All ports bound to **loopback only** — good posture. Live probes: `/health` healthy (node RSS 161MB); `/mc/dashboard` live (missions 417 completed / 2 failed); Qdrant `knowledge` collection green, **112 vectors**; Postgres `crx_runtime` 27 tables as censused. **Temporal NOT running** (profile-gated). **Ollama NOT running** → embeddings are SHA-256-seeded pseudo-vectors (`embedding:'fallback'`). Gateway image digest: `sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73` (postgres image; gateway RepoDigests not exposed — record gap). Qdrant v1.7.0 pinned.

### Resource arithmetic (current vs minimum)
Current steady-state: ~205 MiB containers + OS/journald/snapd ≈ **under 800 MiB used of 5.9 GiB** — the box is ~87% idle on RAM. Disk: 26G free; current data footprint tiny (2182 events, 419 missions, 112 vectors — single-digit MB). Headroom is enormous: even 100x event volume stays under 1 GiB in PG.

**Minimum viable deployment (boring, restartable, backupable, observable, small):**
1. **Postgres 17-alpine** (pinned digest, named volume `pgdata`) — the only non-rebuildable store. `restart: unless-stopped`, `pg_isready` healthcheck (already in compose).
2. **Gateway** (pinned image digest, recorded at deploy time) — stateless, reads all config from env, `restart: unless-stopped`, `/health` healthcheck (already in compose).
3. **Qdrant v1.7.0** (pinned, named volume `qdrant_storage`) — rebuildable projection; keep because it is already live and healthy, but mark it explicitly non-authoritative with a documented rebuild procedure (re-embed from `ping_events`).
4. **Nothing else.** No Temporal (not proven needed; workers run as Node processes), no Ollama on this box (1 vCPU cannot serve embeddings sanely; either embed off-box or accept seeded-vector fallback explicitly), no Neo4j/Redis/MinIO/Kafka (no live consumers), no LiteLLM (profile-gated, not running).

### Deployment design (no mutation; plan only)
- **Bootstrap:** `infrastructure/oracle/bootstrap.sh` exists (apt docker.io, ping user, git clone, volumes) but defaults `PING_REPO=https://github.com/theoperatore/ping.git` and branch `main` — verify these against the actual canonical repo/branch before any run; a bootstrap that clones the wrong repo is a footgun. `d6d2a474f` already fixed branch default to main.
- **Persistent volumes:** `pgdata`, `qdrant_storage` as named Docker volumes (already in compose). Add: volume labels + a `VOLUME_IDENTITY` file written at first init (per 2026-09-18 continuity rulings, the guard's expected store identity must live outside the guarded store).
- **Backup:** nightly `pg_dump -Fc` of `crx_runtime` to object storage or off-host scp (DB is <10MB today; full dump is seconds). Qdrant: snapshot API to same destination; documented as rebuildable-from-PG so backup is belt-and-braces. Record deployment SHA + image digests in a `DEPLOYMENT.md` sidecar at deploy time (gateway digest capture is currently a gap).
- **Restore:** documented procedure: fresh VM → bootstrap → compose up postgres → `pg_restore` → gateway starts, self-heals schema (`CREATE TABLE IF NOT EXISTS`), Qdrant re-embeds. Restore must be rehearsed, not just written.
- **Restart proof:** `docker compose down && docker compose up -d` then assert `/health` healthy, `ping_events` count unchanged, `/mc/dashboard` missions count unchanged. Record as PROVEN_RESTART before claiming it.
- **Health checks:** existing per-service healthchecks are good; add a host-level cron/systemd timer that curls `/health` and pages on failure (currently nothing watches the watcher).
- **Version pinning:** postgres:17-alpine → pin digest; qdrant:v1.7.0 already pinned by tag, pin digest too; gateway → record immutable digest per deploy, never `latest`.
- **Deployment SHA recording:** append-only `deployments.log` (timestamp, git SHA, image digests, operator) — cheap, satisfies the O18-style evidence manifest at small scale.

---

## (d) Decision-ownership rows
| Decision | Owner (evidence) | Status |
|---|---|---|
| Which event table is canonical | UnifiedEventRuntime → `ping_events` (live: 2182 rows; `canonical_events`/`repository_events` 0 rows on Oracle) | PROVEN_RUNTIME (converged 2026-09-18) |
| Vector search authority | QdrantAdapter via embedding_service; PG has no vector index | WIRED_UNPROVEN (works, but vectors are seeded fallbacks on Oracle) |
| Knowledge graph queries | PG-backed KnowledgeGraph (`/knowledge` routes use `pool`, not Neo4j) | PROVEN_RUNTIME |
| UI data contracts | No owner: worktree UI expects `/api/*` (404), real gateway serves `/mc/*` + `/missions` + `/events` | CONTRADICTION (open) |
| Mission creation path | `POST /missions` exists in code; deployed gateway gates with `MISSING_AUTH`; UI POST removed (503) | Partially owned; auth story missing |
| Seed/demo data | `gateway_runtime._seedBusinessEvents` (runs on empty `ping_events`) | Owned but truthfulness-defective |
| Oracle deploy shape | `docker-compose.oracle.yml` (postgres+qdrant+gateway, temporal/litellm profile-gated) | DOCUMENTED + matches live (minus gated profiles) |

## (e) Contradictions
1. **UI contract vs gateway contract:** 8 UI surfaces fetch `/api/{witness,observation,commands,pipeline,notifications,system/state}`; live gateway 404s them. Real routes are `/mc/*`. UI CLAIM >> BACKEND PROOF.
2. **`NEXT_PUBLIC_GATEWAY_URL` vs hardcoded `localhost:8080`:** compose provides the env var; 7 components ignore it. UI cannot be deployed remotely as written.
3. **Seeded customers in canonical store:** 8 fictional rows (`Sarah Chen` etc.) in production `ping_events`; first-boot seeding contaminates the source of truth.
4. **Qdrant "semantic" search over seeded vectors:** no Ollama on Oracle → 112 vectors are SHA-256 pseudo-embeddings. Nearest-neighbor over hash-derived vectors is not semantic search; any UI claiming semantic results on Oracle is overstating.
5. **`/mc/dashboard` `eventSummary.total: 0`** while `ping_events` holds 2182 rows (window 24h, cap 500) — either a window/query bug or intentional; unverified. Flag for the owning agent.
6. **Neo4j adapter instantiated, never used** — code says "Knowledge Adapters initialized (Neo4j + Qdrant)" at boot; only Qdrant has consumers.
7. **Deployed gateway image ≠ main repo HEAD:** Oracle runs `oracle-gateway` with `MISSING_AUTH` on `/missions`; main repo `routes/missions.js` has no auth. The deploy pipeline (worktree → image) diverges from the audited main branch — provenance gap (image digest not recorded anywhere found).

## (f) Unknowns
- Gateway image digest for `oracle-gateway` (RepoDigests empty; only config hash captured). Cannot prove which commit is deployed.
- Whether `/mc/dashboard` `eventSummary.total: 0` is a bug or window semantics.
- What `exterior_agent_credentials` (2 rows) authorizes; not inspected (credential-adjacent, left alone per law).
- Vault service wiring on Oracle (compose-level only, not deployed).
- Whether the 2182 `ping_events` rows minus 8 seeds are all legitimate production events (test sources like `python-worker-flaky`, `my-test-source` suggest not).
- `repository_events` empty but code still references EventRepository as projection adapter — confirmed consistent with convergence ruling, but the table's continued creation cost is unexamined.
- Restart durability of the Oracle deployment (never observed a restart in this window).

## (g) Candidate deletions / merges
1. **Delete `neo4jAdapter` instantiation** (`gateway_runtime.js:483`) or wire it to real queries — today it is boot-log theater. (Reversible; surgical.)
2. **Delete `adapters/redis_adapter.js`** — zero requirers. Or document as planned with a DO_NOT_USE marker.
3. **Delete `adapters/s3_adapter.js`** — zero requirers; artifact tables empty on Oracle.
4. **Remove Kafka `messaging_port`/`publication_port`** from live paths or mark experimental — zero bootstrap requirers.
5. **Remove OpenSearch/DuckDB/Tika/Kafka/Zookeeper from `generate_secrets.py`** or scope to brain profile — secret sprawl for stores that are not deployed.
6. **Gate `_seedBusinessEvents` behind an explicit env flag** (`PING_SEED_DEMO=false` default) and never run it against a database that will hold production data; add a `seeded` marker column or distinct source (`seed:demo`) so seeded rows are filterable. (Needs Nolan's word: changes first-boot behavior.)
7. **Merge the two ui-next trees**: the worktree UI (superset, `/api/*` contract) and the main-repo UI must converge on ONE contract — the real gateway routes (`/mc/*`, `/missions`, `/events`, `/knowledge`). The `/api/*` contract should be deleted, not implemented, unless a deliberate API versioning decision says otherwise.
8. **Drop `canonical_events`/`repository_events` table creation** from the Oracle schema path once convergence certifies them as preserved-history-only (they are 0 rows; keep the ruling's PRESERVED history, stop creating empty tables on new deploys).

## (h) Top-5 highest-confidence improvements
1. **Re-point the worktree UI at the real gateway contract** (`/mc/dashboard`, `/mc/witness/stats`, `/mc/activity`, `/missions/stats`, `/events/recent`, `/knowledge`) and delete the `/api/*` fetch paths + `mock-data/` imports per surface; keep the 503-with-reason pattern from `25a03ab96` for anything still unwired. This closes the largest UI CLAIM > BACKEND PROOF gap. Confidence: high (both sides verified live).
2. **Stop demo-seeding production databases**: env-gate `_seedBusinessEvents`, mark/tag seeded rows, and purge or quarantine the 8 fictional rows on Oracle. Confidence: high (8 rows verified live).
3. **Declare the Oracle deploy shape as postgres + gateway + qdrant (pinned digests), record deployment SHAs**, and add nightly `pg_dump -Fc` + a rehearsed restore. Confidence: high (matches live footprint; backup is currently unverified).
4. **Make Qdrant honest**: either provision real embeddings (off-box Ollama or API embeddings) or label the knowledge surface "keyword + hash-vector fallback" until then. Confidence: high (fallback code path verified, Ollama absent verified).
5. **Delete or quarantine dead store adapters** (Neo4j instantiation, redis_adapter, s3_adapter, Kafka ports) so the codebase stops implying a 9-store architecture it does not run. Confidence: high (zero-consumer evidence for each).

---
*End of Track G report. All live values observed 2026-09-19 ~00:45-01:00 UTC (2026-09-18 ~18:45-19:00 MDT) via read-only probes.*
