# AGENT C — Observability Reality Audit

**Target:** `/home/nolan/ping` @ `cc6856c3bc78e0535e66f168c66dc31abee2c073`, branch `refactor/runtime-authority-convergence`
**Auditor:** Agent C (observability lane) · **Date:** 2026-09-22 ~19:36–20:15 MDT
**Method:** read-only. Pig bridge (`~/workspace/pig/pigwsl-run.sh`) for source greps; `docker ps/inspect/exec`, `ss`, `curl` for running state. No installs, no service starts, no edits, no commits.

## 0. Master caveat (affects every runtime claim below)

**OBSERVED FACT:** the running `ping-gateway` container (`ping-gateway:devin-boundary2`, `node gateway/server.js`, :8080) is a **stale build**: container `/app/gateway/server.js` md5 `2ff3b92688b6734c43f432d9cc608999` ≠ repo `gateway/server.js` md5 `ab6d154396a61ad81b50843672f920e9` at cc6856c3. Runtime observations describe the deployed image; source observations describe cc6856c3. Where both agree (event table shape, health authority design, ID propagation), confidence is high; where they could differ, it is marked.

**Running containers (OBSERVED FACT, `docker ps`, 2026-09-22 19:36 MDT):** ping-gateway, ping-postgres, ping-qdrant (unhealthy), ping-redis (healthy), ping-vault (unhealthy), ollama, brain-postgres, brain-qdrant, open-webui, ping-test-pg, ping-rc-gateway, ping-rc-postgres, cosyvoice-tts. **No Prometheus, Grafana, Tempo, Loki, or OTEL collector container exists.** Listening ports include :8080 (gateway), :5432/:5433 (postgres), :6379 (redis), :6333/:6334 (qdrant), :8200 (vault), :11434 (ollama), :3100/:3101/:3210 (next-server), :3001 (open-webui). **Nothing listens on :9090 (Prometheus), :3000 (Grafana), :3200 (Tempo), or an OTEL gRPC port.**

---

## 1. Observability map (do NOT merge concepts)

### 1a. Application logs — RUNTIME_PROVEN (unstructured, unqueryable)

- **What executes:** `console.log` / `console.error` with `[Component]` text prefixes. **No structured logging library** — `winston`/`pino`/`bunyan` appear in zero source files and zero `package.json` deps (OBSERVED FACT, repo-wide grep at cc6856c3).
- **No correlation context:** log lines carry no `correlation_id`, `request_id`, or trace context; a log line cannot be joined to `ping_events` or to a worker chain (OBSERVED FACT — sampled `docker logs --tail` output and source).
- **Level hygiene broken:** container env sets `LOG_LEVEL=INFO` (OBSERVED FACT, `docker inspect ping-gateway` env), yet the gateway emits `[EventBridge] DEBUG …` lines every poll cycle in production (OBSERVED FACT, `docker logs ping-gateway`). The level is not respected by emitters.
- **Volume:** the EventBridge poll loop logs `_poll() START` / `Poll cycle complete` continuously — production log spam with zero signal (OBSERVED FACT).
- **Sink:** docker stdout only. `LOKI_URL=http://loki:3100` exists in `.env.base:76` / `.env.example:181`, but **zero JS files reference `LOKI_URL`** and no `loki` host/container exists (OBSERVED FACT). Logs are not aggregated anywhere.

### 1b. Canonical events — RUNTIME_PROVEN (the one live, authoritative plane)

- **Source:** `ping-runtime/events/unified_event_runtime.js` → `ping_events` table. `emit()` mints deterministic `event_id` = SHA-256(`{eventType, source, [namespace], [logical_id|payload]}`); `causation_id`/`correlation_id` ride in `metadata` (JSONB) with dedicated expression indexes (`idx_ping_events_causation`, `idx_ping_events_correlation`) — SOURCE_PRESENT at cc6856c3, lines ~40–70.
- **Live write path proven:** live gateway `/health` → `event_runtime: {emitted: 216, persisted: 216, deduplicated: 0, dispatched: 84, failed: 0, handlers: 28}` — emitted == persisted, so the persistence path works end-to-end (OBSERVED FACT, `curl localhost:8080/health`, 200).
- **Production data (OBSERVED FACT, read-only SQL on `ping-postgres`/`crx_runtime`):** 739 rows; types `MISSION_CREATED/ASSIGNED/STARTED/COMPLETED` ×144 each + worker chain `OBSERVATION_CREATED → CLASSIFICATION_CREATED → RECOMMENDATION_CREATED → CLAIM_CREATED → PROJECTION_CREATED → LINEAGE_CREATED → WITNESS_CREATED → REPLAY_COMPLETED` ×18 each. Metadata keys in the wild: `correlation_id, causation_id, namespace, confidence, confidence_source, canonical_hash, canonical_version, canonical_object_id, schema_version, lifecycle_stage, evidence`. **No `mission_id` metadata key exists in production** — mission linkage is via `payload->>'missionId'` (camelCase), confirmed by payload key sample on `MISSION_*` rows.
- **Lineage proven in data:** 595 distinct `correlation_id`s over 739 events; 595 events have NULL `causation_id` (chain roots), 144 carry a parent link, 0 self-links. Worker-hop propagation is not just code — it happened.
- **Read path:** `gateway/routes/events.js` mounted at `/events` (OBSERVED FACT, `gateway/bootstrap/gateway_runtime.js:682`) exposes `/events/:eventId/{children,descendants,ancestors}` and `/events/correlation/:correlationId` — causation/correlation traversal is queryable. It is **auth-gated** (`{"status":"denied","reason":"Missing authentication","code":"MISSING_AUTH"}` — OBSERVED FACT, unauthenticated curl). Good: the read path exists and is protected; it is not a public firehose.
- **Staleness note:** the `crx_runtime` copy's newest row is 2026-09-16 17:54 UTC (6 days old). The live gateway writes to `host.docker.internal:5432`/`ping_runtime` per its env (OBSERVED FACT); that DB was not directly queried (no psql client on the WSL host; not pursued — the live `/health` counters already prove the live write path). Treat `crx_runtime` numbers as a recent-but-stale window, not as "events stopped."

### 1c. Audit records (who-did-what) — MISSING at runtime

- **`audit_log` table exists, 0 rows, no writers:** schema `(id, audit_id, action, actor, resource_type, resource_id, timestamp, details, ip_address, user_agent)` is present in `crx_runtime` (OBSERVED FACT), but **zero non-migration JS files reference `audit_log`** and the count is 0 (OBSERVED FACT). Dead schema.
- **The `gateway/*audit*.js` classes** (`AuditScanner`, `AuthorityPurityAudit`, `ReplayAuditReport`, `ReplayKernelAudit`) are **static codebase/replay audits**, not runtime audit trails (OBSERVED FACT — class inspection). Do not confuse them with an audit log.
- **Policy decisions leave no durable trail:** `ping-runtime/events/event_governance.js` contains no persistence calls (no `INSERT`, no pool query — OBSERVED FACT); governance verdicts (216 passed / 0 rejected per live `/health`) exist only as in-memory counters. A rejected event would be visible in counters until restart, then gone.
- **`ping-runtime/orchestration/audit_reports/*.md`** are historical markdown reports (e.g. `audit_event_fabric.md`) — ARCHAEOLOGICAL, not a live stream.

### 1d. Metrics — MISSING (two dead subsystems + one inert integration)

- **No metrics backend anywhere:** no `prometheus`/`grafana` service in any `compose*.yaml` (OBSERVED FACT — only `temporalio` in `compose.brain.yaml`, which is Temporal the workflow engine, not Tempo the trace backend); no `prom-client` in `pnpm-lock.yaml` (count 0); no scrape target; nothing on :9090.
- **`gateway/metrics_port.js` — SOURCE_PRESENT, never instantiated.** Abstract `MetricsPort` class; its doc comment names `PrometheusMetricsProvider` / `OpenTelemetryMetricsProvider` / `StatsDMetricsProvider`, none of which exist as files; the only repo references are docs and manifest JSONs (OBSERVED FACT). Zero callers of `.increment()/.gauge()/.histogram()` outside the file itself.
- **`gateway/telemetry_subsystem.js` — SOURCE_PRESENT, never wired.** Not imported by `gateway/bootstrap/gateway_runtime.js` (zero matches — OBSERVED FACT). Its `CREATE TABLE` DDL (`metric_id VARCHAR(255) PRIMARY KEY`) **disagrees with the actual `telemetry_metrics` table DDL** (`metric_id integer … nextval(...)`) — two schemas for one table name, neither receiving writes: **0 rows** (OBSERVED FACT).
- **PostHog — registered but inert (phantom integration):** `ping-runtime/connectors/posthog_connector.js` + `posthog_integration.js` are SOURCE_PRESENT and the connector is registered (live `/health` shows it). But live status is `{apiKey: "not configured", eventCount: 0, sent: 0, queuedEvents: 0}` while the parent reports `"status": "healthy"` (OBSERVED FACT). `sync()` reads the private `_sentEvents` array — with no API key nothing is ever sent. An analytics integration that has never delivered an event reports healthy.

### 1e. Distributed traces — MISSING (env fiction + unwired code)

- **Zero OTEL in the dependency tree:** no `@opentelemetry/*` in `pnpm-lock.yaml` (OBSERVED FACT). The only `otel` matches in the repo are Next.js build artifacts (`.nft.json`, `.next/trace`) — not application instrumentation.
- **Env vars with no readers:** `OTEL_ENABLED=true` and `OTEL_EXPORTER_ENDPOINT=http://otel:4317` (`.env.base:73-74`, `.env.example:175-177`) — **zero JS files reference `OTEL_ENABLED` or `OTEL_EXPORTER_ENDPOINT`** (OBSERVED FACT), and no `otel` host/container is running or resolvable. CONFIG_PRESENT at best; functionally DOCUMENTED_ONLY.
- **`gateway/trace_port.js`** — abstract `TracePort`, same pattern as MetricsPort; referenced only by docs/manifests, **not imported by `gateway_runtime.js` or `server.js`** (OBSERVED FACT).
- **`gateway/opentelemetry_witness_instrumentation.js`** — "witness instrumentation" querying a `witness_instrumentation_rules` table; **not wired into boot** (OBSERVED FACT). The only place `trace_id`/`span_id` appear in source (7/6 mentions). No spans are created, exported, or stored anywhere.
- **No Tempo/Jaeger/Zipkin:** nothing configured, nothing running, nothing receiving.

### 1f. Health endpoints — RUNTIME_PROVEN but shallow (prove ~process existence)

- **Surface:** `GET /health` and `/ops/health` (200, via `HealthAuthority` singleton, `gateway/health_authority.js`); `/ops/{status,drift,dashboard,system}` (P046–P050, `gateway/routes/ops.js`). No `/readyz`/`/livez` (404 — OBSERVED FACT).
- **What each check actually proves (OBSERVED FACT, `gateway_runtime.js:726-759` + live output):**
  - `gateway`: `process.uptime()` + `process.memoryUsage()` — process existence only.
  - `generated_artifacts`: artifact count > 0 — config loaded.
  - `integrations`: `status.healthy === status.total` where "healthy" means *registered*; posthog/email/sms report healthy with `"not configured"` credentials and 0 events sent — **registration is scored as health**.
  - `event_governance`: `rejected === 0` — in-memory counter.
  - `event_runtime`: **hardcoded `{status: 'healthy'}`** — the check cannot fail by construction (`gateway_runtime.js` returns literal healthy with stats).
  - `canonicalization`: static string `boundary: 'canonicalization_service'`.
  - `qdrant`: HTTP fetch of version (`1.18.2`) — reachability only.
  - `embedding`: in-memory stats (`embedded: 0, fallback: 30`) — always healthy.
- **Not checked at all:** postgres (the canonical event store!), vault, redis. The single most important dependency for the event plane has no health check (OBSERVED FACT — no `registerHealthCheck('postgres'|'database'|'pool'|…)`).
- **Live breakage:** `GET /ops/status` → **500 `{"status":"error","error":"fingerprint.generate is not a function"}`** (OBSERVED FACT) — the flagship ops endpoint is broken in the deployed build. `GET /ops/drift` → 200 but `{"status":"degraded","healthy":false,… "platformHash": null, "dependencyGraphHash": null}` — the drift detector degrades when it cannot compute hashes.
- **Disagreeing signals (the qdrant case):** docker reports `ping-qdrant` **(unhealthy)** while the gateway reports qdrant **healthy**. Root cause (OBSERVED FACT): the qdrant image contains **no `curl` binary**, so its docker `HEALTHCHECK` (`curl -f http://localhost:6333/health`) fails with streak 3136 — a permanently broken probe, not a broken dependency. Lesson: neither signal proves vector search works; one is a dead probe, the other is a version fetch.

### 1g. Provenance (memory) — RUNTIME_PROVEN for writes; retrieval UNRESOLVED

- `knowledge_nodes(source_event_id, correlation_id, confidence_provenance, …)` — INSERT in `ping-runtime/knowledge/knowledge_graph.js:94-96` threads the originating event into every knowledge write (SOURCE_PRESENT, wired).
- Production: 68 rows; **68/68 have `source_event_id`, 68/68 have `correlation_id`, 54/68 have `confidence_provenance`** (OBSERVED FACT). Memory writes are provably attributable to originating events.
- Whether *retrieval* surfaces provenance to the consumer (recall path) was not verified in this pass — UNRESOLVED.

### 1h. Debug output / historical reports

- `[EventBridge] DEBUG` poll spam in production logs (1a). `/ops/system` returns `"containers": {}` and `"git": {}` — empty debug-grade sections served as an ops API (OBSERVED FACT).
- `evidence/`, `audit_reports/`, `WAVE_*.md`, `PHASE_22_ARCHITECTURE_REVIEW.md` — ARCHAEOLOGICAL. Never cite as current behavior.

---

## 2. Correlation-identity map

Do not invent a new ID. The existing set, with joinability verdicts:

| Identity | Minted by | Rides in | Production evidence | Joins |
|---|---|---|---|---|
| `event_id` | `UnifiedEventRuntime.emit` — SHA-256 deterministic content hash | `ping_events.event_id` (PK) | 739 rows | everything downstream |
| `causation_id` | `BaseWorker._emit` = triggering `event.event_id` | `metadata->>'causation_id'` (indexed) | 144/739 non-null, 0 self-links | immediate parent hop |
| `correlation_id` | worker chain inherits from triggering event; `mission_scheduler` seeds `payload.correlation_id \|\| payload.event_id \|\| mission.mission_id` | `metadata->>'correlation_id'` (indexed) | 595 distinct / 739 events | worker-chain group |
| `mission_id` | orchestration plane (`ping_missions`, 144 rows) | `payload->>'missionId'` (camelCase!) on `MISSION_*` events; **absent from metadata** | 144 missions, lifecycle balanced 144×4 | mission lifecycle group |
| `namespace` | emit / worker inheritance | `ping_events.namespace` + `knowledge_nodes.namespace` | `core::system` default; `tenant::<id>` boundary | privacy-plane join |
| `source_event_id` | knowledge write | `knowledge_nodes.source_event_id` | 68/68 populated | event → memory-write |
| `execution_id` | gateway-side runtime (`artifact_authority`, `automatic_mission_generator`, `constitutional_desktop_runtime`, …) | gateway plane only | source-only | **separate plane from `mission_id`** — do not merge |
| `session_id` / `agent_id` | gateway/chat plane (76/47 mentions) | gateway plane only | source-only | joinability to event plane unverified |
| `trace_id` / `span_id` | only `opentelemetry_witness_instrumentation.js` (unwired) | nowhere | dead | — |
| `request_id` | **nothing** — no request-ID middleware in gateway | — | MISSING | HTTP ingress cannot join the event plane |
| `tool_call_id` | not observed in source | — | MISSING | MCP/tool linkage unverified |

**End-to-end join verdict (SUPPORTED INFERENCE from the above facts):**
- ✅ `mission --(payload.missionId)--> MISSION_* events --(correlation_id)--> worker-chain events --(source_event_id)--> knowledge_nodes` — the spine is joinable today with existing IDs.
- ❌ HTTP request → mission: **no `request_id`** at ingress; a chat/API call cannot be tied to the mission it spawns except by timestamp proximity.
- ❌ Policy decision → event: `event_governance` verdicts are memory-only; a rejection leaves no durable record with an ID.
- ❌ MCP call / tool result → event: no `tool_call_id` observed; tool-plane linkage is UNRESOLVED.
- ⚠️ Two execution identities coexist (`mission_id` in ping-runtime, `execution_id` in gateway) with no proven mapping between them.
- ⚠️ `correlation_id` does **not** group a mission's four lifecycle events (595 distinct IDs ≈ one per emission); lifecycle grouping requires `payload->>'missionId'`. Anyone joining on `correlation_id` alone will silently fragment missions.

**No new ID is needed for the event→knowledge spine.** The gap is at the edges: ingress (`request_id`) and tool plane (`tool_call_id` or equivalent) have no identity at all — that is a missing-link problem, not a new-ID-namespace problem; the natural fix is propagating `correlation_id` from ingress, reusing the existing field.

---

## 3. Per-component reality matrix

| Component | Source? | Config? | Compose? | Running? | Called? | Receiving data? | Queryable? | Used for decisions? | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Prometheus | none | none | no | no | n/a | no | n/a | no | **MISSING** |
| Grafana | docs only | none | no | no | n/a | no | n/a | no | **MISSING** |
| Loki | none | `LOKI_URL` in `.env.base/.env.example` only | no | no | no (0 refs) | no | n/a | no | **CONFIG_PRESENT** (env fiction) |
| Tempo / Jaeger / Zipkin | none | none | no | no | n/a | no | n/a | no | **MISSING** |
| OTEL SDK / exporter | none (no `@opentelemetry/*` in lockfile) | `OTEL_ENABLED`, `OTEL_EXPORTER_ENDPOINT` in env files only | no | no | no (0 refs) | no | n/a | no | **CONFIG_PRESENT** (env fiction) |
| `gateway/trace_port.js` | yes (abstract) | n/a | n/a | n/a | **no** (unwired) | no | n/a | no | **SOURCE_PRESENT** (dead) |
| `gateway/opentelemetry_witness_instrumentation.js` | yes | n/a | n/a | n/a | **no** (unwired) | no | n/a | no | **SOURCE_PRESENT** (dead) |
| `gateway/metrics_port.js` | yes (abstract) | n/a | n/a | n/a | **no** (uninstantiated) | no | n/a | no | **SOURCE_PRESENT** (dead) |
| `gateway/telemetry_subsystem.js` | yes | n/a | n/a | n/a | **no** (unwired) | no | n/a | no | **SOURCE_PRESENT** (dead; DDL disagrees with table) |
| `telemetry_metrics` table | yes (migration) | n/a | n/a | n/a | no writers | **0 rows** | yes (empty) | no | **SOURCE_PRESENT** (dead schema) |
| `audit_log` table | yes (migration) | n/a | n/a | n/a | no writers | **0 rows** | yes (empty) | no | **SOURCE_PRESENT** (dead schema) |
| PostHog integration | yes | no API key | n/a | registered | yes (registered) | **0 events sent** | n/a | no | **SOURCE_PRESENT** (inert; reports healthy) |
| Canonical events (`ping_events`) | yes | yes | n/a | **yes** | **yes** | **yes** (216/216 live) | **yes** (auth-gated `/events` + lineage routes) | yes (workers dispatch on it) | **RUNTIME_PROVEN** |
| `canonical_events` / `events` / `repository_events` / `mission_events` / `event_outbox` tables | yes (migrations) | n/a | n/a | n/a | no | **0 rows each** | yes (empty) | no | **ARCHAEOLOGICAL** (dead schema — do not merge with `ping_events`) |
| `HealthAuthority` + `/health`, `/ops/health` | yes | n/a | n/a | **yes** | **yes** | n/a | **yes** (200) | no (nothing consumes it) | **RUNTIME_PROVEN** (shallow — §1f) |
| `/ops/status` | yes | n/a | n/a | **yes** | **yes** | n/a | **500 live** | no | **RUNTIME_PROVEN** (broken) |
| `/ops/drift` | yes | n/a | n/a | **yes** | **yes** | n/a | yes (200, degraded) | no | **RUNTIME_PROVEN** (degraded) |
| `/ops/dashboard`, `/ops/system` | yes | n/a | n/a | **yes** | **yes** | n/a | yes (200) | no | **RUNTIME_PROVEN** (thin — empty sections, self-asserted `generated_runtime_authoritative: true`) |
| ui-next MissionControlHeader | yes | n/a | n/a | unknown (next-server on :3100/:3101/:3210; :3100 serves PING site) | n/a | n/a | n/a | no | **SOURCE_PRESENT** (fabricated values — §5) |
| Application logs (console) | yes | `LOG_LEVEL` (ignored) | n/a | **yes** | **yes** | n/a | no (no aggregation) | no | **RUNTIME_PROVEN** (unstructured) |
| Knowledge provenance (`source_event_id`, `correlation_id`, `confidence_provenance`) | yes | n/a | n/a | **yes** | **yes** | **yes** (68 rows, fully populated) | yes (SQL) | not verified | **RUNTIME_PROVEN** (writes) |
| "Observability system" (docs) | docs only (`PRESENTPING_INFRASTRUCTURE_ALIGNMENT.md:128`, `WAVE_3H…`, `WAVE_3C…`) | n/a | n/a | no | n/a | no | n/a | no | **DOCUMENTED_ONLY** |

---

## 4. Adversarial observability test designs (DESIGNED ONLY — not executed)

Core invariant for all: **observability failure MUST NOT change canonical business semantics, and observability must never become a hidden source of canonical truth.** (Today this mostly holds by accident — there is so little observability wired in that it cannot interfere. The risk is future wiring that inverts the dependency.)

| # | Test | Failure mode | Expected safe behavior | Current expected behavior (from source) | Evidence | Sprint priority |
|---|---|---|---|---|---|---|
| T1 | Emit event with **missing `correlation_id`** | orphaned chain: spine defaults `correlation_id` to the new event's own ID | chain still persisted; a monitor flags the break; canonical write unaffected | `unified_event_runtime.js` defaults silently; `BaseWorker._emit` repairs it for worker hops only — direct `emit()` callers get silent fragmentation | `unified_event_runtime.js` emit; `canonical_workers.js:44-47`; prod: 595 distinct correlation_ids | P1 — silent fragmentation already visible in prod data |
| T2 | **Duplicate `correlation_id`** across unrelated missions | false chain merge: unrelated events appear causally linked | dedupe or namespace-scoped correlation; merge flagged | no uniqueness constraint; `idx_ping_events_correlation` is a plain index; `/events/correlation/:id` would return a merged lie | schema DDL in `unified_event_runtime.js` init | P1 |
| T3 | **Orphaned span / missing parent span** | n/a — no spans exist | n/a | vacuously passes; test becomes relevant only if tracing is ever wired | §1e | P3 (dormant) |
| T4 | **Tool execution with no audit event** | unauditable side effect | fail-closed: execution blocked or flagged until evented | **no audit plane exists** (`audit_log` 0 rows, no writers); nothing would notice | §1c | P0 — the gap is structural, not a bug |
| T5 | **Audit event with no execution** | phantom action in the record | reconciliation flags phantoms | n/a — no audit plane to contain phantoms; `mission_scheduler.js` comments show phantom-completion was a real past bug class ("produce a phantom completion") | `mission_scheduler.js:219-221` comment | P1 |
| T6 | **Memory retrieval with no provenance** | unattributable knowledge served to agents | retrieval carries `source_event_id`/`confidence_provenance` or is marked unknown | writes carry provenance (68/68); **retrieval surfacing unverified** | §1g | P1 |
| T7 | **Memory write with no originating event** | knowledge with no lineage | write rejected or quarantined | `knowledge_graph.js` INSERT accepts caller-supplied `source_event_id`; no NOT NULL / FK enforcement seen | `knowledge_graph.js:66,94-96` | P1 |
| T8 | **Health healthy while dependency dead** | false confidence; load sent to a degraded system | health reflects dependency probes; degraded → 503 | **already the steady state**: posthog/email/sms "healthy" with `not configured`; `event_runtime` hardcoded healthy; postgres/vault/redis not checked at all | §1f; live `/health` output | P0 |
| T9 | **Logger says success while transaction rolls back** | log/event divergence; operators believe a write happened | logs derived from commit outcome, not intent | logs are `console.log` at intent points; no commit-coupled logging seen; `emit()` returns `{status}` which callers *may* ignore | `canonical_workers.js:78-80` throws on non-ok (good); other call sites unverified | P1 |
| T10 | **Trace says failure while side effect succeeded** | n/a — no traces | n/a | vacuously passes today | §1e | P3 (dormant) |
| T11 | **Secret in MCP args / event payload / trace** | credential exfiltration into observability stores | allowlist-based payload scrubbing before persistence | **no scrubbing seen** in `emit()` path; `ping_events.payload` is free-form JSONB; gateway container env itself carries `MUSE_LEVEL_1_KEY`/`MUSE_LEVEL_2_KEY` values (observed via `docker inspect` — redacted here) | `unified_event_runtime.js` emit; container env | P0 |
| T12 | **PII in memory / trace** | PII in `knowledge_nodes.data` / event payloads | classification + redaction at the boundary | `namespace` boundary exists (`core::`/`tenant::`) and is preserved through workers (good); field-level PII policy unverified | `canonical_workers.js:35-38` | P2 |
| T13 | **Huge payload into `ping_events.payload`** | JSONB bloat; slow lineage queries | size cap + off-table blob store | no size check seen in `emit()` | `unified_event_runtime.js` emit | P2 |
| T14 | **High-cardinality labels** (metrics future) | metric explosion when/if a backend is wired | bounded label sets | n/a — no backend; becomes P1 the day `metrics_port` gets a provider | §1d | P3 (dormant) |
| T15 | **Observability sink unavailable** (Loki/OTEL/Prometheus down) | business path blocks on telemetry | telemetry is fire-and-forget; never on the critical path | trivially satisfied today (nothing to fail); **regression risk**: any future wiring must keep `emit()` independent of sinks — note `TelemetrySubsystem`'s doc constraint "never influences replay determinism" as the right instinct, currently unenforced by code | `telemetry_subsystem.js` header | P1 (guardrail for future work) |
| T16 | **`/ops/*` consumer trusts `generated_runtime_authoritative: true`** | dashboard treated as ground truth while reporting empty/degraded internals | the flag is computed from verification, not asserted | **the flag is a hardcoded literal** in every `/ops` response (`ops.js`); `/ops/dashboard` asserts it while reporting `knowledge_objects: 0`, `total_nodes: 0` | `gateway/routes/ops.js`; live `/ops/dashboard` | P1 — self-asserted authority is the exact "observability as hidden truth" anti-pattern |

---

## 5. Phantom findings (surfaces with no authoritative data behind them)

1. **ui-next dashboard fabricates "live" metrics.** `CascadeProjects/infra/ui-next/src/components/MissionControlHeader.tsx:30-31,74` — `latency: Math.random() * 100 + 50`, `contextUsage: Math.random() * 4096`, `` `${Math.floor(Math.random() * 50 + 20)} tok/s` `` — rendered next to a pulsing "Live" indicator. (OBSERVED FACT, source.) A dashboard that invents its numbers is worse than no dashboard.
2. **`/ops/status` is broken in the deployed build** (500, `fingerprint.generate is not a function`) while `/ops/health` on the same router returns 200 healthy — the ops surface disagrees with itself. (OBSERVED FACT.)
3. **PostHog/email/sms "healthy" with `not configured` credentials and 0 events ever sent.** Registration scored as health. (OBSERVED FACT.)
4. **`event_runtime` health is hardcoded `{status: 'healthy'}`** — it cannot report otherwise by construction. (OBSERVED FACT, source.)
5. **OTEL/Loki env vars point at nonexistent infrastructure** with zero code readers — config that implies an observability pipeline which does not exist. (OBSERVED FACT.)
6. **`generated_runtime_authoritative: true` is a hardcoded literal** asserted by endpoints that simultaneously report empty knowledge graphs and degraded drift state. (OBSERVED FACT.)
7. **Docker reports `ping-qdrant` (unhealthy) for a broken probe** (no `curl` in image; failing streak 3136) while the service answers version `1.18.2` — the platform's own health signal is false-negative by construction. (OBSERVED FACT, root-caused.)
8. **Dead event tables** (`canonical_events`, `events`, `repository_events`, `mission_events`, `event_outbox` — all 0 rows) and dead `audit_log`/`telemetry_metrics` tables invite future code to read/write the wrong store. Schema without writers is a trap, not a feature. (OBSERVED FACT.)

---

## 6. UNRESOLVED QUESTIONS (grill candidates — for the existing GRILLING-BRIEF.md surface; no new file created)

1. **Which postgres does the live gateway actually write?** Container env says `host.docker.internal:5432`/`ping_runtime`; the `ping-postgres` container holds `crx_runtime` (stale 2026-09-16). The live `/health` counters prove writes succeed *somewhere*, but I did not directly observe the target DB's `ping_events`. Is `crx_runtime` a legacy DB and `ping_runtime` (host) the live one — and does the host copy have the same table shape/lineage?
2. **Does the deployed `devin-boundary2` image's event/health code match cc6856c3 semantics?** md5 mismatch on `gateway/server.js` proves the image is stale; the runtime claims in §1b/§1f come from that image. How far behind is it, and do any findings invert on the current source?
3. **Where do MCP/tool calls get recorded, if anywhere?** No `tool_call_id` in source; no tool-call table in `crx_runtime`. Is tool execution observable at all, or is it a complete blind spot between mission dispatch and event emission?
4. **Does memory *retrieval* surface `source_event_id`/`confidence_provenance`?** Writes are proven; the recall path is unverified. Can an agent distinguish "knowledge from event X" from "knowledge with no lineage" at read time?
5. **Is there any payload scrubbing before `ping_events` persistence?** `emit()` takes free-form `payload` JSONB with no size cap or secret/PII filter observed. What is the policy — and has anything sensitive already been persisted in the 739-row window?
6. **Who consumes `/health` / `/ops/*`?** Nothing in-repo appears to poll them (no consumer found). If no automation acts on health, the shallow checks (§1f) are display-only — is that acceptable, or should something page on `degraded`?
7. **Should `ping_missions` (144 rows, consistent with events) be considered the mission-observability plane instead of events?** It exists and is populated, but I did not map its columns or writers. Does it carry the `missionId`↔`correlation_id` bridge explicitly?
8. **What is `ping-rc-gateway` / `ping-rc-postgres`?** A second live gateway+DB pair ("rc" = release candidate?) running the same 9h uptime. Does observability (events, health) aggregate across main and rc, or are they two blind silos?
9. **`lineage` table is empty (0 rows) despite `LINEAGE_CREATED` events.** Where does lineage actually materialize — is it computed on read from `causation_id`, making the table another dead schema, or is a writer missing?
10. **The `telemetry_metrics` DDL disagreement** (migration: integer PK + sequence; `telemetry_subsystem.js`: VARCHAR(255) PK) — which one is canonical, and is either one *supposed* to be receiving data from a planned wiring?

---

### Evidence index (strongest-first)

- **RUNTIME_PROVEN:** `ping_events` live writes (live `/health`: emitted==persisted==216; `crx_runtime`: 739 rows with real causation/correlation chains); `/events` lineage routes mounted + auth-gated; `HealthAuthority` checks executing; console logging (unstructured, DEBUG-spammy); knowledge provenance populated 68/68; `/ops/status` 500ing; `/ops/drift` degraded.
- **SOURCE_PRESENT (dead):** `metrics_port.js`, `trace_port.js`, `telemetry_subsystem.js`, `opentelemetry_witness_instrumentation.js` (all unwired); `audit_log` + `telemetry_metrics` tables (0 rows, no writers); PostHog connector (inert).
- **CONFIG_PRESENT (fiction):** `OTEL_*`/`LOKI_URL` env vars with zero code readers.
- **DOCUMENTED_ONLY:** "observability system" in `PRESENTPING_INFRASTRUCTURE_ALIGNMENT.md`, `WAVE_3H/3C` docs.
- **ARCHAEOLOGICAL:** `canonical_events`/`events`/`repository_events`/`mission_events`/`event_outbox` (0 rows); `audit_reports/*.md`.
- **MISSING:** Prometheus/Grafana/Tempo/Loki/OTEL (no source, config-consumers, compose, containers, or data); structured logging; `request_id` at ingress; `tool_call_id`; runtime audit records; metrics of any kind.

**Bottom line:** PING has exactly one real observability plane — the canonical event log (`ping_events`) with genuine causation/correlation lineage and an auth-gated traversal API — plus process-existence health checks and unstructured console logs. Everything else named "observability" (metrics, traces, audit log, OTEL/Loki/Prometheus/Grafana, the ui-next "live" numbers, `generated_runtime_authoritative`) is unwired code, empty tables, env fiction, fabricated UI values, or hardcoded literals. The event plane is joinable mission→chain→knowledge with existing IDs; ingress requests, policy verdicts, and tool calls have no identity and leave no durable trace.
