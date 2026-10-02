# Range 2401-2450 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-2401..2450: family health-semantics (subset of the 150-mission family spanning ORA-2351..ORA-2500).
"{it} health endpoint must reflect actual serving capability, not process aliveness."
Pass criterion: "{it} reports unhealthy when its critical dep is down; FAIL on 200-OK-while-broken."

## Method
Read-only SSH probes against 129.146.60.17. No services stopped; baseline untouched.

## Evidence
1. postgres (ping-postgres): docker healthcheck = `pg_isready -U ping -d crx_runtime`, interval 10s, retries 5.
   pg_isready connects, authenticates, and verifies the named database accepts connections: actual serving
   capability, not process aliveness. Container reports healthy. -> PROVEN.

2. qdrant (ping-qdrant): native HTTP endpoints respond:
   - GET /healthz -> "healthz check passed"
   - GET /readyz -> "all shards are ready"
   These reflect serving capability (shard readiness), not process aliveness. -> PROVEN.
   (Note: the docker healthcheck is only a TCP connect to 6333, weaker than the HTTP endpoints;
   the mission is about the service's health semantics, which the native endpoints satisfy.)

3. gateway (ping-gateway): GET http://127.0.0.1:8080/health returns a per-component status document:
   top-level status, components.gateway (with memory stats), generated_artifacts, integrations
   (posthog/email/sms with individual health), event_governance, event_runtime, canonicalization,
   qdrant {"status":"healthy","version":"1.7.0"} (matches the running qdrant/qdrant:v1.7.0),
   embedding (collection "knowledge", vectorSize 768, model nomic-embed-text).
   Code path (server.js /health): `await pool.query('SELECT 1')` -> 200 healthy; on throw -> 503 unhealthy
   with per-dep error. So postgres-down is covered. What is NOT verified without a dep-down test:
   whether qdrant-down flips the qdrant component to unhealthy (vs. 200-OK-while-broken). That test
   requires stopping qdrant on the live host -> out of scope. -> ADAPT with staging followup.

4. Correction during investigation: an older server.js variant's /health checked only postgres; the LIVE
   /health (richer, served on 8080) includes qdrant and integration statuses. Verdicts follow the live evidence.

## Verdicts
- postgres: PROVEN. qdrant: PROVEN. gateway: ADAPT (dep-down half unverified on live).
- js-worker-a/b, python-adapter, event-ingest, witness, scheduler, backup-agent, health-monitor,
  log-shipper, reverse-proxy, cert-renewer, ollama: N-A (not deployed; no health endpoint to evaluate).

## Followup (gateway ADAPT)
On staging: stop qdrant, curl /health, expect qdrant component unhealthy and top-level status != healthy;
restart, stop postgres, expect 503 with postgresql error. File PROVEN (both flip) or REJECTED (200-OK-while-broken).
