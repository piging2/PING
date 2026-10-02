# Gateway Deployment Convergence Trace + Plan

Date: 2026-09-24. Mission mandate 1B. Status: TRACE + PLAN ONLY.
No container was replaced, restarted, or modified. No host files were written.
The live instance is untouched and healthy.

Live instance under trace:
- Container: ping-gateway, id a374a21b28d19e89204929e88afc2dc80fffeb33033d0e45a6881b95c2ea3290
- Created: 2026-09-24T11:55:06Z (05:55 MDT) via docker run (OPS-002, gw-recreate2.sh)
- Image: ping-gateway:candidate-3c5d280dd, digest sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2
- Health: healthy, FailingStreak 0, health log cadence 30s all exit 0
- RestartCount: 0

## View A. Declared deployment (compose file)

File: /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml
(live copy; modified 2026-09-24 11:48 UTC by ops-lane to add memory limits; backups
.docker-compose.oracle.yml.ops-lane-bak and .bak-20260916-oracle-triage sit alongside it)

Gateway service declares:
- build: context ../../ (the snapshot tree), dockerfile gateway/Dockerfile. No image: tag.
  A compose build therefore produces oracle-gateway:latest.
- container_name: ping-gateway
- mem_limit: 1g, memswap_limit: 1g (added 11:48; absent from the 11:42 capture)
- restart: unless-stopped
- networks: ping_internal (bridge, 172.20.0.0/16). With -p oracle this materializes
  as oracle_ping_internal. Without -p, a different network name results.
- ports: 127.0.0.1:8080:8080
- environment: POSTGRES_HOST=postgres, POSTGRES_PORT=5432,
  POSTGRES_DB=${POSTGRES_DB:-crx_runtime}, POSTGRES_USER=${POSTGRES_USER:-ping},
  POSTGRES_PASSWORD=${POSTGRES_PASSWORD}, QDRANT_HOST=qdrant, QDRANT_PORT=6333,
  QDRANT_URL=http://qdrant:6333, OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://host.docker.internal:11434},
  LOG_LEVEL=${LOG_LEVEL:-INFO}, NODE_ENV=production
- .env present at the compose dir (mode 600) with names: POSTGRES_HOST, POSTGRES_PORT,
  POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, QDRANT_HOST, QDRANT_PORT, QDRANT_URL,
  LOG_LEVEL, NODE_ENV. OLLAMA_BASE_URL is NOT in .env, so compose falls back to the
  declared default http://host.docker.internal:11434.
- depends_on: postgres with condition service_healthy
- healthcheck: CMD-SHELL node -e hitting http://localhost:8080/health, interval 15s,
  timeout 5s, retries 3, start_period 30s. No .on('error') handler; logs status code
  to stderr on non-200.
- logging: journald (x-logging anchor, tag {{.Name}})
- Also declares: version: "3.8" (obsolete, compose warns and ignores it)

Context note: `docker compose -p oracle ps` shows compose managing exactly one service:
ping-qdrant (service qdrant, running, labels intact, healthcheck matches compose exactly).
ping-postgres has empty labels: not compose-managed either. Scheduler, temporal, litellm
are declared but absent. The compose project is therefore a partial document of the fleet.

The authoritative compose copy on the Pig (/home/nolan/ping) exists only inside worktrees
(agent-exec, playbook, oracle-assembly, python-prod); the main tree has no compose file
mentioning ping-gateway. The host snapshot copy is the only one that matters for the
running fleet.

## View B. Actual deployment (docker inspect, live 2026-09-24 ~12:25 UTC)

- Image: ping-gateway:candidate-3c5d280dd @ sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2
- Created 2026-09-24T11:55:06Z, StartedAt 11:55:36Z (after the proven docker restart),
  Status running, Health healthy, RestartCount 0, OOMKilled false
- Ports: 8080/tcp -> 127.0.0.1:8080
- RestartPolicy: unless-stopped
- Healthcheck: CMD-SHELL node -e http GET http://127.0.0.1:8080/health with
  .on('error',()=>process.exit(1)), Interval 30s, Timeout 10s, StartPeriod 40s, Retries 3
- Memory: 1073741824 (1g), MemorySwap: 1073741824 (1g)
- Env names (values never read): LOG_LEVEL, POSTGRES_PASSWORD, QDRANT_HOST, QDRANT_PORT,
  QDRANT_URL, POSTGRES_DB, POSTGRES_USER, OLLAMA_BASE_URL, POSTGRES_PORT, NODE_ENV,
  POSTGRES_HOST, plus base-image PATH, NODE_VERSION, YARN_VERSION. Name set matches
  the compose declaration exactly.
- Network: oracle_ping_internal, IP 172.20.0.4, DNS names ping-gateway
- Labels: {} (empty). No compose labels: compose does not manage this container.
- Entrypoint: docker-entrypoint.sh, Cmd: node gateway/server.js, Workdir: /app, User: nodejs
- Mounts: none. Log driver: json-file.

Drift check vs the 2026-09-24 captures: gw-inspect-evidence.txt (11:54),
gateway-recreate2-evidence.txt (11:55), gateway-restart-evidence.txt (11:55) all match
live state exactly. The container has NOT drifted since the OPS-002 proof. The only
change since the 11:42 compose-evidence capture is on the compose side: mem_limit /
memswap_limit 1g were added to the live compose file at 11:48 (convergence already begun).

## View C. Restart procedure (what exists today)

1. `docker restart ping-gateway` is the proven restart. Proven 2026-09-24 11:55 UTC
   (gw-restart-proof.sh): recovery to healthy in 21s, memory limits and healthcheck
   persisted (restart preserves the container, so config cannot drift).
2. Docker daemon restart policy unless-stopped: auto-restart on daemon reboot or crash.
3. systemd timers on ping-core-01: pg-backup.timer (next Fri 2026-09-25 03:35 UTC) and
   qdrant-snapshot.timer (next Fri 2026-09-25 04:01 UTC), both installed and active.
   They cover backups/snapshots only; nothing restarts or watches the gateway.
4. There is no systemd unit, cron job, or watchdog for ping-gateway itself.
5. Rollback pattern exists as a script (gw-recreate2.sh): stop, rename old container to
   ping-gateway-preopslane, docker run the new one with the proven flags, watch health,
   roll back by rename+start on unhealthy. The preserved container was cleaned up after
   the proof; no spare gateway container exists right now.
6. `docker compose -p oracle up -d gateway` must NOT be used as a restart today: compose
   does not recognize the unlabeled container, the name ping-gateway is taken (conflict),
   and compose would build a fresh unpinned image (see release risk below).

## View D. Release procedure (what exists today)

Plain statement: there is no documented, repeatable release procedure for the gateway.

- What built candidate-3c5d280dd: not determinable from on-box evidence. Memory records
  the promotion completing 2026-09-21 12:05:20Z (health battery, signed-write checks,
  rollback boot-tested on 8083), and separately records that no promotion record was
  found and deployment_registry held 0 rows (2026-09-22). The tag
  ping-gateway:candidate-3c5d280dd and memory/2026-09-21.md are the only records.
- Source SHA associated in memory: 3c5d280dd3735ceb2deb4433384902d07552d372.
  Whether the image is reproducible from that source is unverified (open item per
  Nolan's 2026-09-22 image policy).
- OPERATOR_RUNBOOKS.md (Pig) contains no promotion/release/rollback section.
  RESTORE-2026-09-16.md covers backup/restore only. No promotion script exists on the Pig.
- Image policy (Nolan 2026-09-22, tightened 2026-09-23): keep exactly the live image
  plus ONE verified rollback (ping-gateway:candidate-84486f056) until 3c5d280dd is
  reproducible from source. Both images are present on the host.
- Pending next candidate: jev/verdict-authority-hardening @ fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f
  (P0 gate). NOT promoted; promotion is a separate future mission with PRODUCTION GATE
  CLOSURE as acceptance criteria.
- Side observation: oracle-gateway:latest (715cb3b575ae) was built on-box at
  2026-09-24T11:50:35Z by `docker compose -p oracle up -d gateway` (recreate-gateway.sh).
  It carries compose labels, is unused by any container, and its content is unvetted
  relative to the pinned candidate digest. It must never be deployed as a release.

## Four-way diff table

Ratings: cosmetic (no behavioral effect) / operational risk (could break ops handling) /
release risk (could ship the wrong code or config).

| # | Aspect | Declared (compose) | Actual (live) | Restart procedure | Release procedure | Rating |
|---|--------|-------------------|---------------|-------------------|-------------------|--------|
| 1 | Compose management | expects to own ping-gateway | labels {} : NOT managed | docker restart works, compose up conflicts on the taken name | no procedure; compose path would be the naive guess | operational risk |
| 2 | Image identity | build: only, no image: tag; compose would build oracle-gateway:latest from the Sep-16 snapshot source | pinned tag ping-gateway:candidate-3c5d280dd, digest sha256:4aa9d7f6... | n/a (restart keeps image) | unpinned build would silently replace verified code with unvetted code | RELEASE RISK (highest) |
| 3 | Healthcheck | 15s interval, 5s timeout, 30s start, http://localhost:8080/health, no error handler, logs on failure | 30s interval, 10s timeout, 40s start, http://127.0.0.1:8080/health, .on('error') handler, OPS-002 proven | restart preserves actual | n/a | cosmetic to low operational; actual is the proven one |
| 4 | Memory limits | 1g / 1g (added 11:48, converged) | 1g / 1g | preserved across restart | n/a | resolved, no action |
| 5 | Logging driver | journald | json-file | preserved across restart | n/a | cosmetic (log routing/retention differs) |
| 6 | Env names | 11 names incl OLLAMA_BASE_URL | same 11 names | preserved across restart | n/a | converged on names |
| 7 | Env values | from .env + defaults; OLLAMA_BASE_URL falls back to default (not in .env) | inherited from previous container via --env-file | preserved across restart | n/a | verify value equality in rehearsal (unverified) |
| 8 | depends_on postgres healthy | declared | absent (docker run has no ordering) | n/a | n/a | low operational; matters only at cold boot |
| 9 | Network | ping_internal declared | oracle_ping_internal (project-prefixed) | n/a | n/a | cosmetic, but -p oracle is a trap: omitting it creates a wrong-named network |
| 10 | Ports | 127.0.0.1:8080:8080 | same | n/a | n/a | converged |
| 11 | Restart policy | unless-stopped | unless-stopped | daemon enforces | n/a | converged |
| 12 | container_name | ping-gateway | ping-gateway | n/a | n/a | converged (this is also the conflict trap) |
| 13 | version: "3.8" | declared, obsolete | n/a | n/a | n/a | cosmetic (compose warns) |
| 14 | LITELLM_API_KEY unset | compose warns, blanks it | n/a (litellm not running) | n/a | n/a | cosmetic |

Single riskiest divergence: #2, image identity. The compose file's build-only gateway
service, if ever acted on (`compose up`, `compose up --build`, or a future operator
following the file as documentation), produces and deploys oracle-gateway:latest from
the Sep-16 snapshot source instead of the verified pinned digest. That silently swaps
the OPS-002-proven instance for unvetted code, bypasses the image policy (live + one
rollback), and would also flip the healthcheck params and logging driver. The absence
of compose labels (#1) is currently protective: it stops compose from touching the
container, but it also means compose cannot restart, audit, or roll back the gateway,
and `compose ps` under-reports the fleet.

## Convergence plan (safety-ordered)

Phase 0 (done): trace captured in this document. No changes made.

Phase 1. Make the compose file describe reality exactly. File-only edits on the host,
zero container impact. Back up the file first (pattern already in use). Edits:
  a. Pin the image: add `image: ping-gateway:candidate-3c5d280dd` to the gateway
     service. Keep the build: block as provenance documentation, and consider
     digest-pinning (`image: ping-gateway@sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2`)
     at cutover time. Document that `compose build`/`up --build` is NOT the release path.
  b. Copy the proven healthcheck verbatim (30s interval, 10s timeout, 40s start period,
     3 retries, the 127.0.0.1 URL with .on('error') handler).
  c. Set logging to match reality (json-file) OR keep journald as declared intent with
     an explicit comment; the file must say which is true today. Recommendation: match
     reality, record intent separately.
  d. Make the network name explicit regardless of -p: set `name: oracle_ping_internal`
     on the ping_internal network, and document the required `-p oracle` invocation.
  e. Remove the obsolete `version: "3.8"` line.
  f. Keep mem_limit/memswap_limit 1g (already converged), depends_on (harmless and
     truthful about startup order), and the env block as-is.
  g. Render check: `docker compose -p oracle config` must render without warnings
     (except none), and every gateway field must be eyeball-diffed against
     `docker inspect ping-gateway`.

Phase 2. Rehearsal path, no live touch:
  a. Rendered-config diff: script the field-by-field comparison of `compose config`
     output vs live `docker inspect` (image digest, ports, restart policy, healthcheck
     test/interval/timeout/retries/start_period, memory, network, env NAMES, labels
     expectation, logging driver, user, entrypoint/cmd).
  b. Side-port rehearsal: bring up the compose-defined gateway on an isolated port
     (e.g. 8081) with a distinct container_name (e.g. ping-gateway-rehearsal), same
     image digest, same env. Run the /health battery and the gateway smoke checks.
     Tear it down afterward. Success proves compose can recreate reality.
  c. Env value equality: verify each of the 11 env values in the rehearsal container
     matches the live container (this closes item #7 without reading live secrets
     into any log; compare hashes, not values).
  d. Name-conflict drill (read-only planning): confirm the cutover runbook handles the
     taken-name trap explicitly (compose will not adopt the unlabeled container).

Phase 3. Cutover as a future bounded mission (NOT this mission), with acceptance criteria:
  - Preconditions: Phase 1 file edits committed/backed up; Phase 2 rehearsal green;
    rollback image ping-gateway:candidate-84486f056 present; explicit operator go-ahead.
  - Procedure: rename live to ping-gateway-precutover (rollback retained), then
    `docker compose -p oracle up -d gateway`, then health-gate exactly like
    gw-recreate2.sh (healthy within the proven window, /health 200, rollback on
    unhealthy by rename-back + start).
  - Acceptance: container carries compose labels (project oracle, service gateway);
    `docker compose -p oracle ps` lists gateway running; image digest identical
    (sha256:4aa9d7f6...); env name+value equality; 1g limits; healthcheck healthy;
    /health 200; rollback container retained until healthy, then removed only after
    a soak period per the image policy.
  - Failure: any acceptance item fails -> roll back to ping-gateway-precutover,
    record the diff that caused it, do not retry blindly.

## What is NOT to be done now

- No `docker compose up`, no `--build`, no container replacement, no `docker restart`.
- No deletion of any gateway image, especially ping-gateway:candidate-84486f056
  (the one verified rollback) and ping-gateway:candidate-3c5d280dd (live).
- Do not deploy oracle-gateway:latest anywhere; treat it as unvetted build output.
- Do not promote jev/verdict-authority-hardening @ fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f;
  that is a separate release mission with PRODUCTION GATE CLOSURE criteria.
- Do not adopt the live container into compose by labeling it in place; labels are
  set at creation, and any adoption path goes through the Phase 3 cutover.
- No host file writes were made in this mission; the Phase 1 compose edits are
  planned work, not executed work.

## Evidence refs

- ~/workspace/ping-build-program/fleet/work/ops-lane/compose-evidence.txt (11:42 capture)
- ~/workspace/ping-build-program/fleet/work/ops-lane/gateway-recreate2-evidence.txt (11:55)
- ~/workspace/ping-build-program/fleet/work/ops-lane/gateway-restart-evidence.txt (11:55)
- ~/workspace/ping-build-program/fleet/work/ops-lane/gw-inspect-evidence.txt (11:54)
- ~/workspace/ping-build-program/fleet/work/ops-lane/gw-recreate2.sh (proven recreate+rollback)
- ~/workspace/ping-build-program/fleet/work/ops-lane/gw-restart-proof.sh (proven restart)
- ~/workspace/ping-build-program/fleet/work/ops-lane/recreate-gateway.sh (the 11:50 compose build precedent)
- memory/2026-09-21.md (promotion record), memory/2026-09-22.md (image policy, provenance gap)
