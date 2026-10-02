# LANE 1 — Serve Path Verification Evidence
Date: 2026-09-25 ~06:35-06:45 MDT | Worker: lane1 subagent | Pig: 100.79.154.43 (Tailscale)

## 1. SSH connectivity — GREEN
- Working route: `ssh -F ~/.ssh/pig-config pigwsl` (Host pigwsl: HostName 100.79.154.43, User nolan, BatchMode, ConnectTimeout 25, ProxyCommand nc -X connect -x hatch-egress-proxy:3130 %h %p). Round trip `echo PIG_OK` returned PIG_OK in ~1.3-1.6s per call, stable across ~25 calls.
- NOTE: the documented `muse-ssh@100.79.154.43` route returned `Permission denied (publickey,keyboard-interactive)` — red for that route. All work below used the pigwsl route.
- Remote identity: host `Pig`, user `pig\nolan`, Windows 10.0.26200. Remote shell wrapper only accepts single commands (no `;` chains); PowerShell works via `powershell -NoProfile -Command "..."`.

## 2. Port probes from the Pig — GREEN (all three respond, PING Social Next.js)
- :3100 → HTTP 200 (curl.exe `CODE=200`; PowerShell RawContent header line `HTTP/1.1 200 OK`). Body starts `<!DOCTYPE html><html lang="en" ...` with `/_next/image?url=%2Fimages%2Fping-social-logo.png` and JSON-LD Organization "PING" / founder Nolan Geske.
- :3101 → HTTP 2xx (Invoke-WebRequest returned full PING Social body, no HTTP error thrown; same doctype/logo/JSON-LD markers). Body start identical family to :3100 (css chunk hashes differ: 67bea96c31455aff on :3100 vs da8d45e999a849e9 on :3101 → different builds).
- :3102 → HTTP 2xx, same PING Social build family as :3101.
- Listeners (Windows side): `:3100` = 100.79.154.43:3100 LISTENING, PID 5676 (svchost, started 9/16) → this is `netsh interface portproxy`: `100.79.154.43 3100 -> 172.21.65.209 3100` (172.21.65.209 = WSL2 VM IP). `:3101`/`:3102` = `::1:3101` / `::1:3102` LISTENING, PID 39580 = `C:\Program Files\WSL\wslrelay.exe` (started 9/22) — localhost-only WSL relay.
- Listeners (inside WSL Ubuntu, `ss -ltnp`): `*:3100` = next-server PID 10404; `*:3101` = next-server PID 62734; `*:3102` = next-server PID 29835.

## 3. What serves :3101 — PARTIAL vs reported branch/commit
- PID 62734: `next-server (v15.5.24)` (process title; argv replaced). Parent PID 62733 cmdline: `next start -p 3101`. So :3101 = plain `next start -p 3101` (no pm2/service wrapper observed).
- cwd: `/home/nolan/build-edge-port` (linked git worktree).
- Git state in build-edge-port: DETACHED HEAD, `git branch --show-current` = empty, HEAD = `8faf96d0b1e964c0240450d2166c6389b71682e9` (2026-09-25 05:33:29 -0600, "Q-J-07: accept owner NL 'move X first' as promote_first (worker E)").
- Reported branch `fyd/sprint-integration-2026-09-24` exists; `git rev-parse` → `28e4ba00ff5301146190f93e48ac8d814f58155f`, checked out in main worktree `/home/nolan/projects/ping` (worktree list: `/home/nolan/projects/ping 28e4ba00 [fyd/sprint-integration-2026-09-24]`).
- `git merge-base --is-ancestor 28e4ba00 HEAD` → true (exit 0). Running HEAD is 5 commits AHEAD of 28e4ba00: `fb520d79` (320px overflow cap), `f1dc8711` (visibility fail-closed guards), `a75c6784` (edge object layer restore), `6409e283` (people branch Q-F-06), `8faf96d0` (Q-J-07).
- Build freshness: `/home/nolan/build-edge-port/.next/BUILD_ID` dated Sep 25 05:36 (after HEAD commit 05:33); server process started `Fri Sep 25 05:40:15 2026`. So the served build corresponds to 8faf96d0, NOT to the reported 28e4ba00.
- :3100 contrast (for the Tailscale surface): PID 10404 cwd `/home/nolan/projects/ping`, `.next/BUILD_ID` dated Sep 24 19:24, process started Thu Sep 24 18:59:56 — matches reported branch/commit exactly.
- Nothing restarted, nothing modified. :3100 and :3102 configs untouched.

## 4. NEXT_PUBLIC_FYD_DEMO_OWNER_MODE in :3101 env — GREEN
- `grep -a -o 'NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=[A-Za-z0-9_]*' /proc/62734/environ` → `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`. Read-only /proc read; no other env values extracted.

## 5. Nolan's Tailscale surface — GREEN
- `http://100.79.154.43:3100` — binds the Tailscale IP on Windows, portproxy → WSL2 172.21.65.209:3100 → next-server PID 10404 serving `/home/nolan/projects/ping` on branch `fyd/sprint-integration-2026-09-24` @ `28e4ba00`.
- :3101 is reachable ONLY from the Pig itself (localhost ::1 via wslrelay); it is NOT on the Tailscale interface. So Nolan over Tailscale sees :3100 (reported commit), while :3101 (5 commits newer, detached worktree) is Pig-local.

## Caveats
- The Pig was intermittent overnight; during this run (06:35-06:45 MDT) SSH was stable (~1.5s round trips, ~25 successful calls, zero drops).
- :3101/:3102 HTTP status read as 2xx via Invoke-WebRequest success (no exception); explicit numeric code capture only for :3100 (200). Bodies verified as the PING Social Next.js app on all three.
