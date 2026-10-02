# FYD Reachability Report — 2026-09-21 ~09:35 MDT

Status: DEV / LOCAL / CANDIDATE. Never production. Server left running; nothing altered.

## PROCESS
- PID 88840, `next-server (v15.5.24)`, user nolan, started 2026-09-21 09:01:48 MDT (per earlier ps inspection)
- Worktree: /home/nolan/projects/ping, branch `fyd/sitespec-generator`, HEAD `8a99742`

## BIND
- Inside WSL2: `*:3100` (all WSL interfaces, verified via `ss -tlnp`)
- On Windows (Pig host): listener exists ONLY on `[::1]:3100` (IPv6 loopback, WSL localhost relay)
- NOT bound on Windows IPv4 loopback `127.0.0.1:3100`, NOT on the Tailscale interface `100.79.154.43:3100`, NOT on any LAN interface

## PORT
- 3100 (actual)

## ROUTES (proven via HTTP)
- `/` → 200 (WSL-local)
- `/sites/happy-place` → 200 (WSL-local and Windows `[::1]`)
- `/sites/coppersmith-plumbing` → 200 (WSL-local)
- `/sites` → 404, `/sites/fyd` → 404 (no FYD/PING route mounted; app also carries the PING Social site pages)

## FROM PIG LOCAL — HTTP status (evidence)
- WSL shell `curl http://127.0.0.1:3100/…` → 200 / 200 / 200
- Windows PowerShell `Invoke-WebRequest http://[::1]:3100/sites/happy-place` → 200
- Windows PowerShell `http://127.0.0.1:3100/sites/happy-place` → FAIL (connection refused)
- Windows PowerShell `http://100.79.154.43:3100/sites/happy-place` → FAIL (connection refused)
- WSL `curl http://100.79.154.43:3100/` → 000 (connection failed)

## WORKING URL (exactly one, proven)
**There is no URL proven reachable from Nolan's current device.** Per the no-guessing rule, none is asserted.

The only URL with end-to-end evidence is Pig-Windows-local:
`http://[::1]:3100/sites/happy-place` — proven 200 from the Pig's own Windows side.
It works only if Nolan is operating on the Pig itself (or in a session on it). It is NOT reachable from his phone, school computer, or any remote device.

## TESTED FROM NOLAN PATH
- Not tested and not claimed. Nolan's device path to the Pig was not exercised; no evidence exists that any URL works from where he is now.
- The earlier claim that `http://100.79.154.43:3100/...` was Nolan-accessible is DISPROVEN: the Tailscale IP fails even from the Pig's own Windows side, so a remote tailnet device (e.g. his iPhone at 100.111.42.94) cannot reach it either.

## THE EXACT BOUNDARY (where reachability stops)
RENDER VERIFIED (200s, correct routes) != SERVER RUNNING (PID 88840, bound in WSL2) != USER REACHABLE (no path from Nolan's network).

Making it reachable requires one of these, each a firewall/listener/security change — STOPPED here per order, Nolan's decision required:

1. **Tailscale path (recommended, still private):** add a Windows port forward for 3100 to the WSL relay (e.g. `netsh interface portproxy` or WSL mirrored networking) + allow TCP 3100 inbound on the Tailscale interface in Windows Firewall. Then `http://100.79.154.43:3100/sites/happy-place` becomes reachable from any of Nolan's tailnet devices. No public Internet exposure.
2. **SSH tunnel path:** from Nolan's device, `ssh -L 3100:localhost:3100 <pig>` then open `http://localhost:3100/sites/happy-place`. Requires Nolan to have SSH client + key access to the Pig from his device, which is not established today (the working SSH route is from this sandbox via the egress proxy, not from Nolan's devices).

No existing SSH tunnel, BFF, or dev-access path for Nolan's devices was found (memory search: only sandbox-side SSH via proxy; tailnet has pig + his iPhone, no laptop).

## Recommended next step
Nolan picks option 1 or 2 (or says he is at the Pig, in which case `http://[::1]:3100/sites/happy-place` works now). Implementation is a small, explicit network change — not a product-lane change — and must be his call.
