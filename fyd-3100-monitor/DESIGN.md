# FYD :3100 monitor probe design

## Why this exists

Baseline (proven 2026-09-24): FYD itself was not monitored on :3100. The Pig
had host-level health checks, and the only :3100 signal was a page probe
(`probe-3100-win.sh` hit `/sites/coppersmith-plumbing`). When FYD goes wrong
there was no way to say which layer failed: host asleep, tunnel down, or the
FYD process itself wedged.

## The three failure domains

The probe (`fyd-3100-probe.sh`) reports each domain separately as JSON lines:

| domain         | what it proves                                      | how (remote mode)                          |
|----------------|-----------------------------------------------------|--------------------------------------------|
| host           | the Pig is reachable at all                         | ssh pigwsl -> wsl echo ok                  |
| network        | the :3100 TCP port is reachable over the tunnel     | /dev/tcp to the Tailscale IP port 3100     |
| fyd-liveness   | the FYD Node process is alive and routing           | GET /api/fyd/healthz -> 200                |
| fyd-readiness  | FYD can serve writes (journal + claim store usable) | GET /api/fyd/readyz -> 200 (503 = not ready)|
| fyd-serving    | real page routes still render                       | GET /sites/coppersmith-plumbing -> 200      |

Exit codes: 0 = all green; 1 = FYD down/not ready; 2 = host or network down
(FYD verdict impossible, do not blame FYD).

## New FYD endpoints (this lane)

- `GET /api/fyd/healthz` -- liveness only. No I/O, no dependencies. 200 means
  the process is up and the route layer renders.
- `GET /api/fyd/readyz` -- readiness. Bounded, non-mutating checks: owner
  journal root writable, claim store dir writable, event-loop not stalled.
  200 = ready, 503 = not ready (a watcher must pull it from the serving set).
  The diagnostic request log is best-effort and deliberately NOT a readiness
  check: logging must never be able to wedge serving.

## What the probe does NOT do

- It NEVER restarts :3100. Restart is a separate gated action via
  /home/nolan/start-3100.sh from a non-PTY ssh with stdio on files, followed
  by the house-protocol verification (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 in
  the running process env + an approve-path probe). Auto-restart is a policy
  decision for Nolan, not a monitor default.

## Deployment (NOT done: Pig unreachable at design time)

1. Copy `fyd-3100-probe.sh` to the Pig (WSL side, e.g. /home/nolan/bin/).
2. Local mode on a cron: `*/5 * * * * /home/nolan/bin/fyd-3100-probe.sh --local >> /home/nolan/fyd-3100-probe.log 2>&1`
3. Remote mode from the operator VM on a cron for the tunnel/host view:
   `*/5 * * * * /home/hatch/workspace/fyd-3100-monitor/fyd-3100-probe.sh --remote`
4. Alerting rule: page on `fyd down` only when `host up` and `network up`
   (otherwise the incident is host/tunnel, not FYD).

## Verification status

- Script syntax: `bash -n` clean (run at install time).
- Live run against :3100: NOT RUN -- Pig unreachable at design time, and the
  lane is not deployed. First live run happens post-deploy as part of the
  deployment verification (healthz + readyz + probe in both modes).
