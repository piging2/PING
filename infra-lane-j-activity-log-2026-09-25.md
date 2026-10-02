# LANE J activity log - FYD/PING infra watch (read-only)

## Pass 1 - 2026-09-25 09:33-09:35 MDT
All ports listening, all HTTP 200. Env flag NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live in :3100 env.

### Shared-infra timeline (all times MDT, reconstructed from process lstart + git + mtimes)
- 2026-09-24 14:15 - /home/nolan/start-3100.sh last modified (untouched since, not used today)
- 2026-09-24 14:47:34 - journal gateway :18199 started (node tools/fyd-journal-gateway/server.mjs, pid 52289), still running
- 2026-09-24 19:02-19:22 - merges into fyd/sprint-integration-2026-09-24: UNIT-3-Ask-FYD, UNIT-1 idempotency, UNIT-4 edge-port (568b3e5e), Q-P0-02 claim-gate fix
- 2026-09-24 20:02:35 - :3102 started (next-server, /home/nolan/build-edge-port, pid 29835), longest-lived, still running
- 2026-09-24 20:03:27 - fix(fyd): ObjectDoorway pill width cap
- 2026-09-25 05:27-05:45 - tenantos FYD journal seam commit + merges workerB/tenantos-fyd-seam and workerE/intent-move-first into integration branch
- 2026-09-25 05:40:15 - :3101 started (next-server, /home/nolan/build-edge-port, pid 62734)
- 2026-09-25 06:47:39 - :3103 and :3104 started (lane7-sites, lane7-3104, pid 72971/72973, identical BUILD_ID SiVMK8cG5GxNI0Kpe45Vt)
- 2026-09-25 08:21:49 - :3100 started (next-server, /home/nolan/projects/ping, pid 2303)
- 2026-09-25 08:22:54 - HEAD 82b42053 committed on fyd/sprint-integration-2026-09-24 (INV-12), one minute AFTER :3100 started
- 2026-09-25 09:33-09:35 - Lane J read-only health + provenance verification

### Hazard notes (carried forward)
- :3100 serves a dirty tree: 43 modified + 7 untracked files over 82b42053; HEAD landed after server start. A restart (Lane A only, via start-3100.sh) changes served code state.
- Stale build dirs in ping tree: .next.integration-build-20260924/, .next.pre-purehead-20260924/ (multiple lanes built in same tree).
- build-edge-port has .next + .next.bak-workerG-qf06 (worker G moved a build aside). :3101 and :3102 share BUILD_ID gYd8c8bgtKEjKT3jNjfsb.
- C: drive 88% full (59G free) - watch item, not critical.
- No duplicate listeners, no restart collisions observed. Each port has exactly one process.
