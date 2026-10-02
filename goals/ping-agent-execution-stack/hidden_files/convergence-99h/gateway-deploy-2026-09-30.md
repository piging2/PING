# Gateway deployment: promote ping-gateway:retry-fix-20260930 (2026-09-30 ~17:47 MDT)

P0-1 of CEO-ORDER-CONTINUITY-NOT-FEATURE-WAVE-2026-09-30.md. Bounded swap, no unrelated changes, no push, no new images.

## Preflight (execution time, Pig via pigwsl-exec)

- New image present: `ping-gateway:retry-fix-20260930`
  - Image ID: `5a29b79e492d` (matches proven build)
  - Digest: `sha256:5a29b79e492d5ec6c60c49bd16d1eae4c2df04fb20bd88b2c0497d3d52a380b9`
- Running container before swap: `ping-gateway`
  - Image: `ping-gateway:repair-cert-20260924` (ID 4472c543484e)
  - Status at preflight: Up 2 hours
  - Config recorded (Pig-side, /tmp/pg-inspect-old.json; env values never left the Pig):
    - name=ping-gateway, entrypoint=['docker-entrypoint.sh'], cmd=['node','gateway/server.js'], workdir=/app
    - 16 env vars (LOG_LEVEL, MUSE_LEVEL_1_KEY, MUSE_LEVEL_2_KEY, NODE_ENV, NODE_VERSION, PATH, PORT, POSTGRES_*, QDRANT_*, YARN_VERSION)
    - ports: 8080/tcp -> host 8080
    - bind: /var/lib/docker/volumes/muse-workspace/_data -> /app/workspace/muse
    - network: pig-promotion_default
    - restart: unless-stopped
- Live patch in OLD running container verified before swap:
  - `/app/ping-runtime/orchestration/mission_runtime.js` MD5 = `7b46c11ab3a416859780b678f723d859` (matches proven)
  - Patched file saved Pig-side to /tmp/mission_runtime.live.js for exact rollback
- Baseline /health (before swap): reachable, HTTP 503, status=unhealthy
  - gateway: healthy, generated_artifacts: healthy, integrations: healthy,
    event_governance: degraded, event_runtime: healthy, canonicalization: healthy,
    qdrant: healthy, embedding: not_initialized
  - (503 is the pre-existing baseline; invariant = reachable with no NEW unhealthy components)

## Swap

- `docker stop ping-gateway`, `docker rm ping-gateway`, then `docker run` from
  `ping-gateway:retry-fix-20260930` with the identical recorded configuration
  (same env values, ports, bind, network, restart policy, workdir, entrypoint, cmd).

## Post-swap verification (all green, ~17:52 MDT)

- Container: `ping-gateway` running, image `ping-gateway:retry-fix-20260930`, status Up (stable at 2+ min)
- Swap ops: STOP rc=0, RM rc=0, RUN rc=0, new container id `0a99cf4eae2a986e077f3685e7abdfce33d2b6d77de2686f0f80cd306d4bcd41`
- MD5 inside RUNNING container: `7b46c11ab3a416859780b678f723d859` — MATCH (proven value)
- Code-level proof in running container: `mission_runtime.js` line 175 has
  `status IN ('running', 'assigned', 'retry_pending')` — the retry-schedule update guard is live
- /health: reachable. HTTP 503 with status=unhealthy, same as pre-swap baseline, but the
  component profile IMPROVED: event_governance went degraded -> healthy.
  gateway: healthy, generated_artifacts: healthy, integrations: healthy,
  event_runtime: healthy, canonicalization: healthy, qdrant: healthy,
  embedding: not_initialized (pre-existing, unchanged)
- Mission queue: completed=623, created=1, failed=29 (29 = quarantined jev-shadow, terminal, expected)
  - retry_pending count = 0
  - The single `created` mission is `3b0f430a06a41357` (INTELLIGENCE_RESEARCH, created
    2026-09-30 12:14:51 MDT). Scheduler logs show it being evaluated and skipped each poll
    cycle ("No worker for mission type 'INTELLIGENCE_RESEARCH' — skipping") — a missing-worker
    condition (pre-existing, no producer/worker registered), NOT poison-mission starvation.
    getPending() is cycling normally; no head-of-queue blockage.
- Rollback artifacts retained Pig-side only (never left the Pig): /tmp/pg-inspect-old.json
  (full prior config incl. secret env values), /tmp/mission_runtime.live.js (prior patched file),
  /tmp/health-before.json, /tmp/health-after.json

## Outcome

PROMOTED. No invariant failure; no rollback performed.
- Old image: ping-gateway:repair-cert-20260924 (4472c543484e) + container-only live patch
- New image: ping-gateway:retry-fix-20260930 (5a29b79e492d)
- Running image after work: ping-gateway:retry-fix-20260930
- First broken edge: none on the deployment path. The only non-draining mission
  (INTELLIGENCE_RESEARCH, no registered worker) is a pre-existing capability gap, not a
  regression from this promotion.
