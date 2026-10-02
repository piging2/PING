# S4 — Core Root Workers: Lifecycle + Duplication Audit

**Worker:** S4 semantic-audit (core workers) · **Date:** 2026-09-23 ~20:10–20:35 MDT
**Mode:** READ-ONLY. COMMITS CREATED: NONE. PROPOSE ONLY — no patch applied.
**Bases:** CORE `/home/nolan/ping` @ `refactor/runtime-authority-convergence` (HEAD `cc6856c`); ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (pointer use only).
**Transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'` stdin-fed scripts. Evidence: `s4-scan1..8.out` + `s4-scan1..7.sh` in this directory.
**Prior reads:** EVENT-FORENSICS.md, AUTHORITY-MAP.md, SECURITY-SWEEP.md, REACHABILITY.md.

**Scope boundary:** Sibling agents 02/03 own witness/replay/lineage *verdicts*. This file owns LIFECYCLE (what starts what, what reads/writes what) and DUPLICATION across all workers in the block: `replay_worker.py`, `witness_worker.py`, `lineage_worker.py`, `observation_worker.py`, `claim_worker.py`, `filesystem_worker.py`, `constitutional_projection_worker.py`, `simple_projection_worker.py`, `projection_replay.py` (all at core root), plus their twins/drivers found during the hunt.

---

## 0. Headline verdict

**All 9 block workers are DORMANT. Nothing starts any of them.** No cron, no systemd unit, no running/stopped container (`docker ps -a` shows zero worker containers), no gateway bootstrap spawn, no test imports them. The same pipeline job (DOCUMENT_IMPORTED → … → PROJECTION_CREATED) is implemented **four times**: root Python workers, `workers/` Python variants, `runtime/projection_worker/` third variant, and the JS `ping-runtime/workers/canonical_workers.js` fleet — the JS fleet is the only one the live gateway bootstrap registers (`gateway/bootstrap/gateway_runtime.js:86-87,514`).

Two fake-completion hazards: (a) every root worker's `main()` is a **sample-event test harness** (`aggregate_id "test-doc-001"`) that prints "X worker test complete" while writing to the production-configured DB; (b) `compose.yaml` advertises 6 worker services but **3 reference Dockerfiles that do not exist** (`Dockerfile.projection`, `Dockerfile.witness`, `Dockerfile.replay`) — `dev` profile activation would fail at build.

---

## 1. Per-worker lifecycle trace

Legend for the trace chain: D=DEFINED · I=IMPORTED · C=CONSTRUCTED · N=INITIALIZED · S=STARTED · R=REGISTERED · K=CALLED · P=PERSISTING · B=READ BACK · T=RESTARTED · E=TESTED.

### 1.1 replay_worker.py (root, 155 lines)

| Stage | State | Evidence |
|---|---|---|
| D | yes | `class ReplayWorker` at `/home/nolan/ping/replay_worker.py`; docstring "Processes CLAIM_GENERATED events … Emits REPLAY_EXECUTED events" |
| I | only by dormant code | `./constitutional_runtime.py:17` (`from replay_worker import ReplayWorker`); scripts only mention the filename in review-bot arg lists (`scripts/constitutional_review_bot.py:27`, `scripts/constitutional_operating_mode.py:31`) |
| C | only in dormant driver | `constitutional_runtime.py:136` (`replay_worker = ReplayWorker(postgres_config)`) |
| N | `__init__(postgres_config)` | `get_postgres_config()` from `runtime/configuration.py` (exists) |
| S | **NOTHING** | no cron (`crontab -l` empty), no systemd unit, no container (docker ps -a: none), gateway bootstrap has zero `spawn`/`python` (`grep` over `gateway_runtime.js`: empty), compose `replay-worker` references **nonexistent `Dockerfile.replay`** |
| R | only in dormant driver | `constitutional_runtime.py:143` (`register_handler("CLAIM_GENERATED", replay_worker.handle_claim_generated)`) |
| K | never on real data | `main()` (lines 130-151) builds a **sample_event** with `"aggregate_id": "test-doc-001"`, calls `worker.handle_claim_generated(sample_event)`, prints "Replay worker test complete" |
| P | would write `events` (7-col shape: event_id, event_type, timestamp, aggregate_id, aggregate_type, event_data) via psycopg2 | class methods; in-tree writer classification (core AGENTS.md 14:25): `replay_worker:85` is a REACHABLE_WRITER (static) of the 7-col `events` shape — NOT the live `ping_events` schema |
| B | nothing reads it back | no reader found |
| T | n/a | never started |
| E | none | no test file references it; its own `main()` is a fake harness, not a test |

**Classification: DORMANT. Confidence: HIGH.** Last touched 2026-06-27 (`6357e70ca`, docs-phase commit).

### 1.2 witness_worker.py (root, 141 lines)

Same lifecycle shape as 1.1. `class WitnessWorker`; imported only by `constitutional_runtime.py:18`; constructed only there (`:137`); registered `("REPLAY_EXECUTED", witness_worker.handle_replay_executed)` (`:144`); `main()` (lines ~130-139) uses the same sample-event harness (`"test-doc-001"`, prints completion). Writes: `authority_witness` table (`INSERT INTO authority_witness (id, witness_root, created_at)`) + would emit WITNESS_CREATED into `events`. **Classification: DORMANT. Confidence: HIGH.**

### 1.3 lineage_worker.py (root, 153 lines)

Same shape. `class LineageWorker`; imported `constitutional_runtime.py:19`; constructed `:138`; registered `("WITNESS_CREATED", lineage_worker.handle_witness_created)` (`:145`); sample-event `main()`; writes `lineage` table (`INSERT INTO lineage (id, parent_id, child_id, edge_type, created_at)`) + LINEAGE_CREATED into `events`. **Classification: DORMANT. Confidence: HIGH.**

### 1.4 observation_worker.py (root, 162 lines)

Same shape. `class ObservationWorker`; imported `constitutional_runtime.py:15`; constructed `:133`; registered `("DOCUMENT_IMPORTED", observation_worker.handle_document_imported)` (`:141`); sample-event `main()`; reads document payload, writes `observations` table + OBSERVATION_CREATED into `events`. **Classification: DORMANT. Confidence: HIGH.**

### 1.5 claim_worker.py (root, 175 lines)

Same shape. `class ClaimWorker`; imported `constitutional_runtime.py:16`; constructed `:134`; registered `("OBSERVATION_CREATED", claim_worker.handle_observation_created)` (`:142`); sample-event `main()`; reads `observations`, writes claims into `events` as CLAIM_GENERATED. **Classification: DORMANT. Confidence: HIGH.**

### 1.6 filesystem_worker.py (root, 224 lines)

| Stage | State | Evidence |
|---|---|---|
| D | yes | "PING Filesystem Constitutional Worker — Phases 1-2: Repository Snapshot + Differential Tracking. Outputs SQL INSERT statements to stdout for piping into postgres container." |
| I | none in code | referenced only by docs/audits (`INGESTION_PIPELINE_REPORT.md`, `HASH_AUTHORITY_AUDIT.md`, core `AGENTS.md` 14:25 as REACHABLE_WRITER static `filesystem_worker:98`, `docs/forensics/*`, `repository_events.json`, orchestration JSONs) |
| C/N | module-level constants; `main()` takes `sys.argv[1]` phase | `SQL_FILE = .constitutional_events.sql`, `SNAPSHOT_PATH = .constitutional_snapshot.json` |
| S | **NOTHING scheduled** | no cron/systemd/compose/container; manual-run only (`python3 filesystem_worker.py [phase]`) |
| R/K | `main()` is REAL (not a sample harness): `scan_files(PING_ROOT)` → `emit_phase1_sql` / `emit_phase2_sql` to stdout | lines 208-220 |
| P | writes `.constitutional_snapshot.json` (EXISTS on disk: 214410 bytes, mtime Sep 16 09:41, **tracked in git** per `git ls-files`) and would write `.constitutional_events.sql` (**ABSENT** — no full SQL run ever materialized on disk) | `ls` evidence |
| B | unknown reader | no code reader found for either artifact (audits reference the snapshot as evidence) |
| E | none | no tests |

**Classification: DORMANT (manual-run tool, no scheduler). Confidence: HIGH.** Distinct from the chain workers: it is a repo-snapshot producer, not an event-chain consumer. Adjacent overlap (not full duplicate): `repository_scanner.py` emits REPOSITORY_FILE_DISCOVERED/UPDATED/DELETED (per core AGENTS.md 14:25) — same domain (filesystem → events), different mechanism; flag for the coordinator.

### 1.7 constitutional_projection_worker.py (root, 162 lines)

| Stage | State | Evidence |
|---|---|---|
| D | yes | `class ConstitutionalProjectionWorker`; "Processes LINEAGE_CREATED events and projects to Qdrant. Emits PROJECTION_CREATED events." |
| I | by dormant code only | `constitutional_runtime.py:20`; `runtime/projection_worker/rebuild_certification.py:115` (lazy `from constitutional_projection_worker import ConstitutionalProjectionWorker` inside `rebuild_collection()`) |
| C | `constitutional_runtime.py:138`; `rebuild_certification.py` (`ConstitutionalProjectionWorker()` then `worker.run()`) | **note:** root class defines no `run()` method in the 162-line file (methods: `project_to_qdrant`, `store_projection`, `handle_lineage_created`, `main`) — the `rebuild_certification` call would AttributeError if ever executed |
| S | NOTHING | `rebuild_certification.py` itself has **zero callers**; no scheduler/container |
| R | `constitutional_runtime.py:146` | dormant driver only |
| K | sample-event `main()` (4 sample_event/test-doc hits) | fake harness |
| P | `project_to_qdrant` is a **self-declared placeholder**: `print(f"Projecting document {document_id} to Qdrant (placeholder)"); return True` — success signal, no projection. `store_projection` would INSERT into `projections` table. | lines ~60-75 |
| E | none | no tests |

**Classification: DORMANT + DUPLICATE (×2, see §2). FAKE-COMPLETION hazard (placeholder returns True). Confidence: HIGH.**

### 1.8 simple_projection_worker.py (root, 120 lines)

| Stage | State | Evidence |
|---|---|---|
| D | yes | "Creates projections from PostgreSQL events to Qdrant without requiring sentence_transformers. Uses **random embeddings for testing purposes**. Uses docker exec to connect to PostgreSQL" |
| I | none | only self-mention in grep; no importers |
| S | NOTHING; **no `__main__` guard** — the entire file is top-level executable script code | `grep -c __main__` = 0; tail prints "Projection worker complete" |
| K | would run end-to-end on execution: `QdrantClient(host="localhost", port=6333)` at import, `sys.exit(1)` if unreachable; `docker exec brain-postgres psql -U postgres -d crx_runtime -c "SELECT … FROM events WHERE projected_to_qdrant = false"`; parses psql text output with brittle `line.split('|')` (breaks on `|` inside JSON payloads); upserts points with **random vectors** into `constitutional_memory` carrying `canonical_hash`, `embedding_hash`, `projection_signature` fields | full-file read |
| P | Qdrant `constitutional_memory` collection (random vectors!); `UPDATE events SET projected_to_qdrant = true` via docker exec | |
| B/E | none | no tests |

**Classification: DORMANT, BROKEN-BY-DESIGN. Confidence: HIGH.** Non-deterministic (random) embeddings written under deterministic-sounding field names (`projection_signature`, `canonical_hash`) is a determinism-boundary violation if it ever runs. Brittle host assumptions: requires `docker` CLI on the executing host, `brain-postgres` container name, `crx_runtime` DB, localhost Qdrant.

### 1.9 projection_replay.py (root, 311 lines)

| Stage | State | Evidence |
|---|---|---|
| D | yes | `class ProjectionReplay` — "minimal replay engine that verifies the system can rebuild Qdrant from events. No witness. No governance. … Just: Can system rebuild Qdrant from events?" |
| I | none | no importers; mentions only in orchestration JSONs + `PHASE_S15_PRE_AUDIT_READINESS_REPORT.md` + `repository_events.json` |
| C | module-level singletons at import: `EmbeddingAuthority(CONFIGURATION)`, `ExecutionAuthority()`, `ConfigurationAuthority.current()` | lines ~30-40 — import has side effects (authority construction) |
| S | NOTHING | no cron/systemd/compose/container |
| K | `main()` → `replay.run_replay(limit=100)` — "Run replay with limit for testing. Remove limit for full replay" | lines 283-301 |
| P | would rebuild Qdrant `constitutional_memory` from `events` via real `EmbeddingAuthority` | class body |
| E | none | no tests |

**Classification: DORMANT (manual one-shot tool, test-capped). Confidence: HIGH.** Adjacent overlap: JS `gateway/continuous_replay_authority.js` (event-forensics 2B#6: appends events; sibling agents own the replay verdict) — same "replay" domain, different mechanism; flag, do not adjudicate here.

---

## 2. DUPLICATION hunt — the same jobs, multiple fleets

### 2.1 Four implementations of the DOCUMENT_IMPORTED → PROJECTION_CREATED chain

| Fleet | Location | Driver | Event vocabulary | Persistence | Status |
|---|---|---|---|---|---|
| A. Root Python workers | `/home/nolan/ping/*_worker.py` (6 chain workers) | `constitutional_runtime.py` (DB poll `WHERE processed_at IS NULL`) | DOCUMENT_IMPORTED→OBSERVATION_CREATED→CLAIM_GENERATED→REPLAY_EXECUTED→WITNESS_CREATED→LINEAGE_CREATED→PROJECTION_CREATED | psycopg2 → `events`/`observations`/`lineage`/`authority_witness`/`projections` (7-col events shape) | **DORMANT** |
| B. `workers/` Python variants | `/home/nolan/ping/workers/{claim,lineage,observation,replay,witness,projection}_worker.py` (DIFFER from root: 96–118 lines vs 141–175; sha256 differ) | `workers/worker_runtime.py` (polls JS gateway `GET /events/unprocessed`, dispatches via `kernel/event_dispatcher.py`, marks via `POST /events/processed|failed`) | same 7 event types | `repository_client` → gateway HTTP `POST /events` (+ `/api/v1/repository/objects`) | **DORMANT** (no container; compose refs exist) |
| C. `runtime/projection_worker/` | `/home/nolan/ping/runtime/projection_worker/constitutional_projection_worker.py` (257 lines, differs from root 162-line twin) | `rebuild_certification.py` (zero callers) | LINEAGE_CREATED → rebuild | Qdrant rebuild | **DORMANT** |
| D. JS canonical fleet | `/home/nolan/ping/ping-runtime/workers/canonical_workers.js` (ObservationWorker:90, ClaimWorker:128, ProjectionWorker:163, ReplayWorker:226, WitnessWorker:451, LineageWorker:513, + Classification/Recommendation/Intelligence) | JS `WorkerRuntime` (`ping-runtime/workers/worker_runtime.js`), registered in gateway bootstrap (`gateway_runtime.js:86-87,514` via `registerCanonicalWorkers`) | same chain + CLASSIFICATION/RECOMMENDATION | in-process dispatch; gateway journal | **LIVE-REGISTERED** (bootstrap wires it; sibling agents own verdicts — lifecycle fact only) |

Root (A) vs `workers/` (B) are not copies: root uses `runtime.configuration.get_postgres_config()` + direct psycopg2; `workers/` uses `kernel.event_dispatcher.Event/EventHandler` + `repository_client` (gateway HTTP). Same event vocabulary, same job, divergent transports. **CLASSIFICATION: DUPLICATE (A↔B), CONFLICTING persistence (direct-DB vs gateway-HTTP).**

### 2.2 Three drivers, zero running

| Driver | Mechanism | Marks progress via | Status |
|---|---|---|---|
| `constitutional_runtime.py` (root) | psycopg2 poll of `events WHERE processed_at IS NULL` | `processed_at` column update | DORMANT — referenced only by docs; in-tree `dormant_classifications/` JSONs classify it dormant |
| `workers/worker_runtime.py` | HTTP poll of JS gateway `/events/unprocessed` → `kernel/event_dispatcher` | `POST /events/processed`, `/events/failed` (routes exist in worktree `gateway/routes/events.js:129-151`; deployed-container status = the event-forensics open question, unverified) | DORMANT — `Dockerfile.worker-runtime` exists and is valid, but `docker ps -a` shows no `ping-worker-runtime` container ever created |
| `runtime/constitutional_runtime.py` | `docker exec brain-postgres psql` via `ExecutionAuthority`, `LEFT JOIN event_processing` | `event_processing` table INSERT | DORMANT — zero callers |

**CLASSIFICATION: DUPLICATE (3 drivers, same job).** Note the schema disagreement between drivers: `processed_at IS NULL` vs `event_processing` table vs gateway `processed` flag — three progress-tracking mechanisms for the same fleet, mutually incompatible.

### 2.3 Qdrant-projection implementations (5×)

`constitutional_projection_worker.py` (root, placeholder) · `runtime/projection_worker/constitutional_projection_worker.py` (rebuild) · `workers/projection_worker.py` (dispatcher handler, minimal) · `simple_projection_worker.py` (random embeddings) · `projection_replay.py` (EmbeddingAuthority replay) — plus JS `embedding_service.js:132` subscriber (event-forensics: Qdrant projection, live). **CLASSIFICATION: DUPLICATE ×5 (Python) vs 1 live JS subscriber.**

### 2.4 Compose-level duplication/false advertising

`compose.yaml` WORKER LAYER (lines 197-333): `digestion-worker`, `newsletter-worker`, `projection-worker`, `witness-worker`, `replay-worker`, `worker-runtime`. Findings:
- `projection-worker` → `Dockerfile.projection`: **DOES NOT EXIST** (only `Dockerfile.worker-runtime` and `gateway/Dockerfile` exist at ≤2 depth; `git log --diff-filter=D` shows they were never present at those paths).
- `witness-worker` → `Dockerfile.witness`: **DOES NOT EXIST.**
- `replay-worker` → `Dockerfile.replay`: **DOES NOT EXIST.**
- All six carry `profiles: [dev]` (worker-runtime: dev+prod); none were ever instantiated (`docker ps -a` empty for all names).
- `digestion-worker`/`newsletter-worker` (brainos/rss, brainos/newsletter — Dockerfiles DO exist) are different jobs (RSS/ingest, newsletter ingest), not duplicates of this block; noted for context only.

**CLASSIFICATION: BROKEN DEFINITIONS (3/6 unbuildable) + DORMANT (6/6 never started). Confidence: HIGH.**

---

## 3. Shadow persistence & orphan producer/consumer findings

- **SHADOW-P1:** Root workers persist to the dormant crx Python schema (`events` 7-col, `observations`, `lineage`, `authority_witness`, `projections`) — NOT the live `ping_events` / `repository_events` / `canonical_events`. If any root worker/driver were started, it would write a parallel journal the live gateway never reads. **Shadow persistence: PROVEN (static).**
- **SHADOW-P2:** `simple_projection_worker.py` would upsert **random vectors** into the live `constitutional_memory` Qdrant collection with deterministic-sounding metadata (`projection_signature`, `canonical_hash`). The live JS `embedding_service.js` also projects to Qdrant — random-vector contamination of the same collection is the collision. **Shadow persistence: PROVEN (static), DETERMINISM BOUNDARY BROKEN if run.**
- **SHADOW-P3:** `filesystem_worker.py` `.constitutional_snapshot.json` (214 KB) is **tracked in git** — a machine-generated snapshot committed as source. Its SQL output (`.constitutional_events.sql`) was never materialized on disk. Orphan producer: no code reader for either artifact.
- **ORPHAN-C1:** `workers/witness_worker.py` emits `WITNESS_CREATED` + `REPLAY_WITNESSED`. Per in-tree writer classification (core AGENTS.md 14:25), these types are **CHECK-BLOCKED on the live dump** (absent from the 28-type CHECK constraint) — if fleet B were started, its witness emits would fail at the DB. Orphan-producer-by-schema.
- **ORPHAN-C2:** Python fleet B's loop is self-contained (emit to JS gateway → poll from JS gateway) but duplicates the JS canonical fleet's registered job. Started together, A/B/D would triple-process the same event vocabulary with three progress trackers. **Fan-out collision: PROVEN (static)** — cf. the historical incident documented in `gateway/test_dormant_worker_gate.js` (12,791 events instead of 247 from dual fan-out; that gate covers the JS WorkerRuntime, not the Python fleets).

## 4. FAKE health/completion findings

- **FAKE-H1 (all 6 root chain workers):** `main()` builds `sample_event` (`aggregate_id: "test-doc-001"`) and prints "X worker test complete". Executing a root worker as an ops run yields a success message while processing synthetic data against the production-configured DB. **This is fake completion, not a test** (no assertions, no exit-code signal, writes real rows).
- **FAKE-H2 (`constitutional_projection_worker.project_to_qdrant`):** prints "Projecting document … (placeholder)", returns `True`. A caller (`rebuild_certification.rebuild_collection`) treats `True` as success.
- **FAKE-H3 (`simple_projection_worker`):** prints per-event "Projected event … to Qdrant" for random-vector upserts.
- **FAKE-H4 (compose):** six advertised worker services; three unbuildable, zero running. A reader of `compose.yaml` would conclude a worker fleet exists.

---

## 5. Shared-record rows

Columns: DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS.

R1 | WORKER-LIFECYCLE | `replay_worker.py` (root) | DORMANT — defined, never started; main() is a sample-event harness ("test-doc-001") | `constitutional_runtime.py:17` (import), `:136` (construct), `:143` (register) — all in dormant driver | `ReplayWorker.handle_claim_generated` | `events` table (7-col, via psycopg2) | none | `runtime.configuration.get_postgres_config` | DORMANT | HIGH | fake-completion (H1): success message on synthetic data | psycopg2, runtime.configuration | S2/S3 (replay verdict must not cite this worker as live)

R2 | WORKER-LIFECYCLE | `witness_worker.py` (root) | DORMANT — same shape as R1; writes `authority_witness` | `constitutional_runtime.py:18/:137/:144` (dormant) | `WitnessWorker.handle_replay_executed` | `authority_witness`, `events` | none | `runtime.configuration` | DORMANT | HIGH | fake-completion (H1) | psycopg2 | S2/S3 (witness verdict)

R3 | WORKER-LIFECYCLE | `lineage_worker.py` (root) | DORMANT — same shape; writes `lineage` table | `constitutional_runtime.py:19/:138/:145` (dormant) | `LineageWorker.handle_witness_created` | `lineage`, `events` | none | `runtime.configuration` | DORMANT | HIGH | fake-completion (H1) | psycopg2 | S2/S3 (lineage verdict)

R4 | WORKER-LIFECYCLE | `observation_worker.py` (root) | DORMANT — same shape; writes `observations` | `constitutional_runtime.py:15/:133/:141` (dormant) | `ObservationWorker.handle_document_imported` | `observations`, `events` | none | `runtime.configuration` | DORMANT | HIGH | fake-completion (H1) | psycopg2 | S4 self

R5 | WORKER-LIFECYCLE | `claim_worker.py` (root) | DORMANT — same shape; reads `observations`, writes CLAIM_GENERATED | `constitutional_runtime.py:16/:134/:142` (dormant) | `ClaimWorker.handle_observation_created` | `events` | none | `runtime.configuration` | DORMANT | HIGH | fake-completion (H1) | psycopg2 | S4 self

R6 | WORKER-LIFECYCLE | `filesystem_worker.py` (root) | DORMANT manual-run tool — real snapshot logic, no scheduler; `.constitutional_snapshot.json` tracked in git (214 KB), `.constitutional_events.sql` never materialized | docs/audits only (no code caller) | `main(phase)` → `scan_files` → `emit_phase1/2_sql` | stdout SQL + `.constitutional_snapshot.json` | no code reader (audits cite it) | none (stdlib+logging) | DORMANT | HIGH | committed generated artifact; orphan producer | — | coordinator (snapshot provenance)

R7 | WORKER-LIFECYCLE | `constitutional_projection_worker.py` (root) | DORMANT + DUPLICATE×2; `project_to_qdrant` is a placeholder returning True; `rebuild_certification.py` calls nonexistent `worker.run()` | `constitutional_runtime.py:20/:138/:146` (dormant); `runtime/projection_worker/rebuild_certification.py:115` (itself zero callers) | `handle_lineage_created` | `projections` table | none | `runtime.configuration` | DORMANT + DUPLICATE | HIGH | fake-completion (H1, H2); broken caller contract (`run()` absent) | psycopg2 | S4 self; coordinator (projection consolidation)

R8 | WORKER-LIFECYCLE | `simple_projection_worker.py` (root) | DORMANT, BROKEN-BY-DESIGN — no `__main__`; random embeddings; brittle psql text parsing; docker-exec host assumptions | none | top-level script | Qdrant `constitutional_memory` (random vectors), `events.projected_to_qdrant` | none | none | DORMANT | HIGH | determinism boundary (random vectors as projections) | docker CLI, brain-postgres, crx_runtime, Qdrant :6333 | coordinator (quarantine)

R9 | WORKER-LIFECYCLE | `projection_replay.py` (root) | DORMANT one-shot tool, test-capped (`run_replay(limit=100)`); import-time authority construction | none (orchestration JSONs + PHASE_S15 mention only) | `ProjectionReplay.run_replay` | Qdrant `constitutional_memory` (via EmbeddingAuthority) | none | EmbeddingAuthority, ExecutionAuthority, ConfigurationAuthority | DORMANT | HIGH | import side effects; uncapped run untested | runtime.authorities.*, runtime.config | S3 (replay verdict: this is not the live replay path)

R10 | WORKER-DRIVER | `constitutional_runtime.py` (root) | DORMANT driver — DB poll `WHERE processed_at IS NULL`; registers root workers | no code caller (docs + `dormant_classifications/` only) | `ConstitutionalRuntime.run` | `events.processed_at` | — (owns loop) | psycopg2 | DORMANT | HIGH | — | root workers (R1–R5,R7) | coordinator

R11 | WORKER-DRIVER | `workers/worker_runtime.py` | DORMANT driver — polls JS gateway `/events/unprocessed`; valid Dockerfile but never instantiated (docker ps -a empty) | `compose.yaml` `worker-runtime` service (profiles dev+prod, never started) | `main()` loop → `kernel.event_dispatcher` | via `POST /events/processed|failed` (gateway routes exist in worktree; deployed status unverified — see event-forensics open question) | — | `kernel.event_dispatcher`, gateway HTTP | DORMANT | HIGH | deployed-bytes question for the /events/* contract | workers/* handlers | coordinator

R12 | WORKER-DRIVER | `runtime/constitutional_runtime.py` | DORMANT driver variant — docker-exec psql via ExecutionAuthority, `event_processing` table | zero callers | `run loop` (BATCH_SIZE 10) | `event_processing` | — | ExecutionAuthority, kernel.event_dispatcher | DORMANT + DUPLICATE (of R10/R11) | HIGH | third incompatible progress tracker | docker, brain-postgres | coordinator

R13 | WORKER-DUPLICATION | Root fleet (R1–R5) vs `workers/` fleet | DUPLICATE — same 7-event vocabulary, same job; divergent transports (direct psycopg2 vs gateway HTTP) and divergent progress tracking | — | — | `events`(7-col) vs gateway `POST /events` | — | — | DUPLICATE + CONFLICTING | HIGH | transport/schema divergence; fan-out collision if co-started (cf. dormant-worker-gate incident: 12791 vs 247 events) | — | S2/S3, coordinator

R14 | WORKER-DUPLICATION | Python fleets (A/B/C) vs JS `canonical_workers.js` | DUPLICATE job, single live registrant — JS fleet registered in gateway bootstrap (`gateway_runtime.js:514`); Python fleets unstarted | `gateway_runtime.js:86-87` requires; `:514` `registerCanonicalWorkers(workerRuntime, …)` | JS worker `handle(event)` | gateway journal (`ping_events`) | UnifiedEventRuntime | CANONICAL_LIVE (lifecycle fact; verdicts owned by S2/S3) | HIGH (registration) / MEDIUM (in-container liveness — deployed-bytes question) | — | `ping-runtime/workers/worker_runtime.js` | S2/S3

R15 | WORKER-DUPLICATION | Qdrant projection ×5 Python | DUPLICATE — R7 placeholder, `runtime/projection_worker/` rebuild, `workers/projection_worker.py` minimal handler, R8 random-embedding script, R9 authority replay; vs live JS `embedding_service.js:132` subscriber | — | — | Qdrant `constitutional_memory` (R8/R9) / `projections` table (R7) | — | — | DUPLICATE | HIGH | R8 determinism violation | Qdrant | coordinator

R16 | WORKER-COMPOSE | `compose.yaml` worker layer | 3/6 services unbuildable (`Dockerfile.projection|witness|replay` absent; never present per git); 6/6 never started | — | — | — | — | — | DORMANT + BROKEN DEFINITION | HIGH | false fleet advertising (H4) | docker profiles | coordinator

R17 | WORKER-SCHEMA | `workers/witness_worker.py` emits | ORPHAN-PRODUCER-BY-SCHEMA — emits WITNESS_CREATED/REPLAY_WITNESSED, CHECK-BLOCKED on live dump per in-tree writer classification (core AGENTS.md 14:25) | — | `repository_client.emit_event` | gateway `/events` → CHECK fail | — | — | CONFLICTING | MEDIUM (rests on in-tree dump analysis, not re-verified here) | schema gate | gateway event CHECK | S2

---

## 6. Proposed minimum changes (PROPOSE ONLY — none applied)

**P-1 — Disarm the fake-completion mains (R1–R5, R7).**
WHY: `python3 replay_worker.py` today writes synthetic rows ("test-doc-001") into the production-configured DB and prints success — an operator or agent could mistake it for a real worker run.
EVIDENCE: `replay_worker.py:130-155`; identical sample-harness pattern in witness/lineage/observation/claim/constitutional_projection (4 `sample_event`/`test-doc` hits each).
MINIMUM CHANGE: guard each `main()` with `if os.environ.get("PING_ALLOW_DORMANT_WORKER") != "1": raise SystemExit("dormant: refusing to run sample harness")`, plus a module docstring banner `# DORMANT — see constitutional-sprint S4 findings; do not schedule`.
TEST: run `python3 replay_worker.py` → expect immediate SystemExit with the refusal message; run with the env flag → expect the historical sample behavior unchanged.
RESULT: (not executed — read-only scope).

**P-2 — Fix or remove the unbuildable compose services (R16).**
WHY: `dev`-profile activation of `projection-worker`/`witness-worker`/`replay-worker` fails at build (missing Dockerfiles); the file advertises a fleet that cannot start.
EVIDENCE: `compose.yaml:252-320`; `find` ≤2 depth shows only `Dockerfile.worker-runtime` + `gateway/Dockerfile`; `git log --diff-filter=D` empty.
MINIMUM CHANGE: either commit the three missing Dockerfiles with pinned, reviewed contents, or delete the three services and annotate `worker-runtime` as `profiles: [manual]` with a comment pointing at S4.
TEST: `docker compose --profile dev config` renders; `docker compose --profile dev build projection-worker` succeeds or the service is gone.
RESULT: (not executed).

**P-3 — Quarantine `simple_projection_worker.py` (R8).**
WHY: random vectors under deterministic field names (`projection_signature`, `canonical_hash`) in the live `constitutional_memory` collection would corrupt the semantic layer the JS `embedding_service` maintains.
EVIDENCE: `simple_projection_worker.py` full-file read: `random` embeddings, `client.upsert(collection_name="constitutional_memory", …)`.
MINIMUM CHANGE: move to `archive/obsolete/` with a pointer README (CLASSIFY history — never delete), or add a hard refusal unless `PING_ALLOW_RANDOM_PROJECTION=1`.
TEST: `python3 archive/obsolete/simple_projection_worker.py` → refusal; `grep -rn simple_projection_worker` shows only the archive pointer.
RESULT: (not executed).

**P-4 — Consolidate projection twins (R7, R15).**
WHY: three `constitutional_projection_worker.py` variants (root 162 lines, `runtime/projection_worker/` 257 lines, `workers/projection_worker.py`) + R8 + R9 = five Python projection paths against one live JS subscriber.
EVIDENCE: sha256 differ (root vs workers), line-count differ (root vs runtime variant); `rebuild_certification.py` calls nonexistent `run()`.
MINIMUM CHANGE: designate ONE Python reference implementation (recommend: none live — document JS `embedding_service.js:132` as the live path), archive the other four with pointer notes; fix or delete the `run()` call in `rebuild_certification.py`.
TEST: `grep -rln constitutional_projection_worker` returns the designated file + archive pointers only; `python3 -c "import ast; …"` parse-checks the edited caller.
RESULT: (not executed).

**P-5 — Document `projection_replay.py` as a capped manual tool (R9).**
WHY: `run_replay(limit=100)` with a "remove limit for full replay" comment invites an unbounded production replay with no governance (its own docstring: "No witness. No governance.").
EVIDENCE: `projection_replay.py:283-301`.
MINIMUM CHANGE: require an explicit `--full` CLI flag to exceed the cap; log the cap and the invoking user at start.
TEST: `python3 projection_replay.py` → runs capped, logs cap; `--full` without a second confirmation env → refusal.
RESULT: (not executed).

---

## 7. Summary for the coordinator

1. **Lifecycle: everything in the block is dormant.** The 9 root workers + 3 Python drivers have no starter: no cron, no systemd, no container (ever), no gateway spawn, no test. The only worker fleet the live gateway bootstrap registers is the JS `canonical_workers.js` fleet (`gateway_runtime.js:514`).
2. **Duplication: the same pipeline exists 4×** (root Python, `workers/` Python, `runtime/projection_worker/` Python, JS canonical) and the same driver job 3× with three mutually incompatible progress trackers (`processed_at`, gateway `processed` flag, `event_processing` table).
3. **Fake completion: two live hazards.** Root worker mains print success on synthetic data ("test-doc-001") against the production-configured DB; `compose.yaml` advertises 6 worker services, 3 of which cannot build (missing Dockerfiles).
4. **Shadow persistence: proven statically.** Root workers target the dormant 7-col `events` schema, not `ping_events`; `simple_projection_worker` would poison `constitutional_memory` with random vectors; `workers/witness_worker` emits types CHECK-blocked on the live dump.
5. **History preserved, nothing deleted** — per the classify-never-delete rule; P-1..P-5 are proposals only.

## 8. Next adjacent gap

**In-container liveness of the JS canonical fleet + the deployed `/events/unprocessed|processed|failed` contract.** This audit proved the JS fleet is *registered* in the worktree bootstrap and that the gateway routes exist in worktree source — but the event-forensics open question ("which bytes run in the Oracle `ping-gateway` container") is still BLOCKED, and it gates two things at once: whether `WorkerRuntime` dispatch is actually driving the canonical workers in production, and whether the Python `workers/worker_runtime.py` HTTP contract would even function if started. A read-only live probe (GET `/events/unprocessed?limit=1` against the healthy :8080 gateway — allowed under the standing plain-GET exception) would close the route half; the dispatch half needs a log-level look at the gateway container's worker stats. This is the single question that decides whether the "one live fleet" claim is PROVEN or merely registered.
