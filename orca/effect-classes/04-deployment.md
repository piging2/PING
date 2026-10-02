# Effect Class 04: Deployment

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `/home/nolan/ping/gateway/routes/deployments.js`,
`ping-runtime/runtime/deployment_registry.js` (lines 77, 204-211),
`database/canonical_events.sql:87-130` (deployment_registry,
runtime_registry), memory 2026-09-22/24 (jev promotion, CP-7 drift).

## What deploys today

The runtime has a Deployment REGISTRY AUTHORITY, not a deployment actuator.
`gateway/routes/deployments.js` + `deployment_registry.js`: register
(`executeRegisterDeployment`, `ON CONFLICT (tenant_id, version) DO UPDATE`),
resolve, list, status transition, complete, fail, rollback.
`executeRollbackDeployment` (lines 204-211) is **a status transition only**
(`status='rolled_back'`, `rolled_back_at` set) — it does NOT redeploy the
previous image; the `rollback_target` column exists but nothing consumes it
automatically.
Actual actuation is agent-run docker commands on the Pig (memory 2026-09-23/24:
"the running 8080 image", `ping-gateway:devin-boundary2`; a 2026-09-24
forensic found the prod image bundles files absent from the source tree,
never committed anywhere — deploy freeze held because a source-tree deploy
would be unreproducible). Security rule from memory (2026-09-22 jev
promotion): on security-relevant failure roll to "route closed," never back
to a known-ungated image.

- **Q1 Identity:** registry-level: `deployment_registry.deployment_id` UUID
  PK; natural identity `(tenant_id, version)` via `ON CONFLICT DO UPDATE`.
  The actual running artifact is identified by container image tag +
  `git_sha` + `version` in `deployment_registry`, and `runtime_registry`
  (`runtime_id` PK, `UNIQUE (tenant_id, component_type, component_name)`,
  with `version`, `build_sha`, `deployment_id`, `last_heartbeat`). No single
  stable "deployment operation" identity spans registry-record +
  container-actuation.
- **Q2 Provider idempotency key:** no key at the docker/runtime level.
  Registry-level bolt-on: `ON CONFLICT (tenant_id, version) DO UPDATE` makes
  re-registration idempotent.
- **Q3 Queryable:** YES. `deployment_registry` (status:
  deploying/running/failed/rolled_back; health; blue_version/green_version;
  rollback_target), `runtime_registry` (status, health, version, build_sha,
  last_heartbeat), `executeResolveActiveDeployment(tenant_id)`.
- **Q4 Reconcile:** probe = registry status + runtime heartbeat + container
  health endpoint / `docker ps` (agent-side). PROBE GAP: registry
  'deploying' + dead heartbeat = UNKNOWN, and there is no runtime-owned
  recovery — the reconciler must decide redeploy vs. hold.
- **Q5 Reversible:** registry status is reversible (DB update). The running
  container is reversible only by actually deploying the held previous image
  — nothing automated does this. Security boundary: never roll back to a
  known-vulnerable/ungated image.
- **Q6 UNKNOWN means:** registry says 'deploying', container may or may not
  be running the new image, health unknown. Consequence: traffic may be on
  old or new image; a second deploy could stack, collide on ports, or orphan
  the first attempt.
- **Q7 Retry safe:** when the registry shows no 'running' deployment for
  `(tenant_id, version)`; the target image is present/pinned (same tag =
  same content — docker-level idempotent); and the previous attempt's
  container is confirmed stopped or confirmed never started (probe first).
  Registration retry is always DB-safe.
- **Q8 HOLD:** when health is unknown after the deploy timeout (probe the
  health endpoint before any second attempt); when a previous deployment for
  the tenant is still in 'deploying'; when the rollback target is a
  known-ungated/vulnerable image (route closed instead); or when the image
  is unreproducible from the source tree (the 2026-09-24 CP-7 drift finding:
  image bundles files never committed anywhere).

Confidence: HIGH; MEDIUM on retry-safety (behavioral, not enforced).

## Port guidance

Close the registry-vs-actuation split: the "worker wrapper" must wrap the
agent/docker actuation boundary, not just the registry record. Give the
reconciler a real recovery verb (redeploy-pinned-image / hold), and make the
CP-7 unreproducible-image condition a hard HOLD. A rollback that only flips
a status column is not a rollback.
