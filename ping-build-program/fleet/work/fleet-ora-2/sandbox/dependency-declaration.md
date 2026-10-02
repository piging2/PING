# Declared dependency extraction (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). Extracted read-only from the live Oracle host
(ping-core-01) via docker inspect. Env VALUES never read; only names.

## ping-gateway (image: ping-gateway:candidate-3c5d280dd @ sha256:4aa9d7f6...)
Declared env names: LOG_LEVEL, POSTGRES_PASSWORD, QDRANT_HOST, QDRANT_PORT,
QDRANT_URL, POSTGRES_DB, POSTGRES_USER, OLLAMA_BASE_URL, POSTGRES_PORT, NODE_ENV,
POSTGRES_HOST (+ image-default PATH, NODE_VERSION, YARN_VERSION).
Declared runtime deps: postgres (POSTGRES_HOST/PORT/DB/USER/PASSWORD),
qdrant (QDRANT_HOST/PORT/URL), ollama (OLLAMA_BASE_URL).
NOTE: OLLAMA_BASE_URL is declared but ollama has no consumer container and is
veto-gated (REJECTED for production). The declaration exists; the dep is dormant.
Missing-declared-dep behavior: typed FAIL at startup (fail-fast on required env);
never a silent degraded start. (Startup contract; the worker never restarts the
gateway to test it.)

## ping-postgres (image: postgres:17-alpine @ sha256:18cfe3ef...)
Declared env: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (+ PG image defaults).
Declared deps: volume oracle_pgdata; pg_isready healthcheck (to be added per F12).
Trust-auth: passwordless `psql -U ping` inside the container network reaches
authentication (fails only on database name, not on password) — trust path confirmed.
Actual database is crx_runtime (database "ping" does not exist).

## ping-qdrant (image: qdrant/qdrant:v1.7.0 @ sha256:ff163987...)
Declared deps: volume oracle_qdrant_storage; log driver journald (declared in live
inspect; journald SystemMaxUse unset — 440 MB observed, F10 followup).

## Design-spec workers (digestion/newsletter/projection/witness/replay, python-adapter)
Declared deps per reproducibility-designs.md: node:24-alpine digest-pinned base,
depends_on postgres+qdrant healthy (compose), mem 512m-1g. python-adapter:
python:3.12-alpine, declared deps per requirements.txt (to be written with the
first real adapter).

## Backup systemd-timer design
Declared deps: `docker exec pg_dump` path on the host + off-host scp target.
Missing-dep behavior: typed FAIL (timer logs the failure; never a silent skip).

## compose.proposed.yaml service-dependency graph
Review: depends_on with healthy conditions (postgres/qdrant) before gateway and
workers; no cycles; ollama excluded (veto-gated).
