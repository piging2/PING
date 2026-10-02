# DELIVERABLE 4 — OBSERVABILITY MAP

**Source:** `partials/agent-c-observability.md` (full evidence index). **Master caveat:** the deployed `ping-gateway:devin-boundary2` image is a STALE build (md5 ≠ cc6856c3 `server.js`); live `/health`/`/ops` claims describe that image, not the audited source.

**Bottom line:** one real observability plane exists — the canonical event log. Everything else named "observability" is unwired code, empty tables, env fiction, fabricated UI values, or hardcoded literals. Do NOT merge these concepts.

## The planes (kept separate)

**1a. Application logs — RUNTIME_PROVEN (unstructured, unqueryable).** `console.log` everywhere; no correlation IDs; `LOG_LEVEL=INFO` set but `[EventBridge] DEBUG` spam emitted anyway.

**1b. Canonical events — RUNTIME_PROVEN (the one live, authoritative plane).** `ping_events`: live writes (live `/health`: emitted==persisted==216; crx_runtime: 739 rows with real causation/correlation chains); auth-gated `/events` traversal API (`getChildren`/`getDescendants`/`getAncestors`/`getCorrelationGroup` recursive CTEs).

**1c. Audit records (who-did-what) — MISSING at runtime.** `audit_log` table: 0 rows, no writers. Policy verdicts are memory-only counters. The `gateway/*audit*.js` classes are static codebase audits, not audit trails.

**1d. Metrics — MISSING.** `metrics_port.js`, `telemetry_subsystem.js` unwired; `telemetry_metrics` table 0 rows, no writers; PostHog connector inert (0 events ever sent).

**1e. Distributed traces — MISSING.** No `@opentelemetry` in any package.json (verified 2026-09-22). `OTEL_*`/`LOKI_URL` env vars with zero code readers — config fiction. `opentelemetry_witness_instrumentation.js` unwired ("witness activation DEFERRED").

**1f. Health endpoints — RUNTIME_PROVEN but shallow.** Prove ~process existence. `event_runtime` health is hardcoded `{status:'healthy'}` (cannot report otherwise by construction). Postgres — the canonical store — has NO health check. `/ops/status` 500s in the deployed build (`fingerprint.generate is not a function`) while `/ops/health` returns 200: the ops surface disagrees with itself.

**1g. Provenance (memory) — RUNTIME_PROVEN for writes; retrieval UNRESOLVED.** 68/68 knowledge rows carry `source_event_id`+`correlation_id`; whether retrieval surfaces them is unverified.

**1h. Debug output / historical reports — ARCHAEOLOGICAL.** `audit_reports/*.md`; dead event tables (`canonical_events`, `events`, `repository_events`, `mission_events`, `event_outbox` — all 0 rows): schema without writers is a trap, not a feature.

## Correlation-identity map (no new ID needed — edge linkage only)
```
mission --(payload.missionId)--> events --(correlation_id)--> worker chains
        --(source_event_id)--> knowledge_nodes
```
Joins today. Missing: `request_id` at ingress, `tool_call_id` anywhere. `correlation_id` FRAGMENTS mission lifecycles (595 distinct in prod — silent fragmentation already visible) rather than grouping them; `MISSION_*` events carry no `causation_id` (correlated, not causally linked). Recommendation: link edges, do not invent another ID.

## Phantom surfaces (no authoritative data behind them)
1. **ui-next dashboard fabricates "live" metrics** — `MissionControlHeader.tsx:30-31,74`: `latency: Math.random()*100+50`, `contextUsage: Math.random()*4096`, `` `${Math.floor(Math.random()*50+20)} tok/s` `` beside a pulsing "Live" indicator. A dashboard that invents numbers is worse than none.
2. **`/ops/*` asserts `generated_runtime_authoritative: true` as a hardcoded literal** while reporting empty knowledge graphs and degraded drift — self-asserted authority, the exact "observability as hidden truth" anti-pattern.
3. **PostHog/email/sms "healthy"** with `not configured` credentials and 0 events ever sent. Registration scored as health.
4. **Docker reports ping-qdrant "unhealthy"** from a permanently broken probe (no `curl` in image; failing streak 3136) while the service answers version 1.18.2 — false-negative by construction.
5. **`lineage` table empty (0 rows)** despite `LINEAGE_CREATED` events — lineage is computed on read from `causation_id`; the table is another dead schema.

## The invariant the sprint must hold
Observability failure MUST NOT change canonical business semantics, and observability must never become a hidden source of canonical truth. Today this holds by accident (too little wired to interfere). Any future wiring must keep `emit()` independent of sinks — `telemetry_subsystem.js`'s "never influences replay determinism" is the right instinct, currently unenforced by code.
