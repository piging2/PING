# Deployment Map — 2026-09-30 ~12:05 MDT (Writer D, read-only probes)

Two gateway planes exist. Both are live. The forensics-fix report conflated them.

## Oracle plane (the wiring-order "deployed" target)
- Container: ping-gateway, image ping-gateway:candidate-3c5d280dd
- Digest: sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2
- Unused sibling image on host: ping-gateway:candidate-84486f056 (467af2dabc08)
- Source SHA: lane-1 forensics PROVED event files byte-identical to cc6856c
- Command: entrypoint docker-entrypoint.sh, CMD ["node", "gateway/server.js"], USER nodejs
- Port: 127.0.0.1:8080 -> 8080, network oracle_ping_internal, restart unless-stopped
- Healthcheck: GET /health, interval 30s, start-period 40s
- Auth: NONE on /ingest (POST empty body -> 400 validation "source (string) required", not 401);
  NONE on /events (GET -> 200; POST empty -> 500; no tenant check, no authorizeNamespace)
- DB: host `postgres` (docker network alias -> container ping-postgres, postgres:17-alpine),
  database crx_runtime, user ping, port 5432
- ping_events: 2557 rows, HAS sequence column + UNIQUE(sequence), HAS append-only
  trigger trg_ping_events_append_only (BEFORE DELETE OR UPDATE -> RAISE EXCEPTION)
- Newest row: 2026-09-21. Nine days stale.

## Pig plane (what the forensics-fix team actually probed)
- Container: ping-gateway, image ping-gateway:repair-cert-20260924 (4472c543484e), Pig docker only
- Auth: Bearer <redacted> enforced globally via gateway/exterior_auth_middleware.js
  (ExteriorAuthMiddleware, wired in gateway/bootstrap/gateway_runtime.js)
- DB: host brain-postgres (container brain-postgres, postgres:15-alpine),
  database ping_runtime, user postgres
- ping_events: 2568 rows, NO sequence column, NO append-only trigger
- The 11 forensics OBSERVATION_CREATED events landed HERE at 2026-09-30 17:46 UTC.

## Merged line (this lane)
- Branch: deploy/interval10-forensics-20260930 @ 67da6aab1
- Worktree: /home/nolan/ping-worktrees/deploy-merge-20260930 (dedicated, per-lane)
- Base: interval10/integrated-20260930 @ cafe156e3
- Merges (local only, no push): mission-labels (14c5694ef), approval-events (9fa1d1a51),
  ingest-producer (67da6aab1)
- Registry re-run verified: 239 events, hash 58ec6795710302c327e83eb6d84537f032542f202754932d22a5641903fa2941,
  byte-identical to committed registry.json

## DEPLOYMENT BLOCKER (do not deploy on a hypothesis)
- Merged ping-runtime/events/unified_event_runtime.js initialize() runs:
  ALTER TABLE ping_events ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
  UPDATE ping_events SET tenant_id = 'UNKNOWN' WHERE tenant_id IS NULL;   <-- BLOCKED
  ALTER TABLE ping_events ALTER COLUMN tenant_id SET DEFAULT 'UNKNOWN';
- Oracle's trg_ping_events_append_only raises on ANY UPDATE -> initialize() throws ->
  gateway_runtime.js catches at line 652 -> pgAvailable=false -> gateway boots DEGRADED
  with a dead event path while /health stays green (silent failure).
- Pig plane has no such trigger, but deploying the merged line there would REMOVE the
  working bearer auth (worktree code has no bearer middleware) -> forbidden by directive.
- Resolution needs Nolan/lane-owner decision: trigger-aware backfill vs code change
  (COALESCE reads) vs trigger maintenance window. Not decided by this lane.
