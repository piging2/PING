# Recovery receipt: tailnet :3100 outage 2026-09-28

## Incident
- 05:16:02 MDT: last healthy tailnet probe of FYD :3100.
- 05:24:27 MDT: unexpected Windows reboot (Kernel-Power 41; Nolan: likely his own restart of a frozen machine).
- 05:24:56 MDT: \FYD-Tailscale-3100 logon task re-applied portproxy rule with fresh WSL IP.
- 05:16 -> 06:21: tailnet path returned -1/000 while WSL-local :3100 returned 200.
- 06:21:02 MDT: tailnet probe 200. Path recovered independently.

## Failed state captured (before mutation)
- WSL: :3100 on *:3100 (next-server pid 23046), WSL IP 172.21.65.209, local curl 200.
- Windows: 100.79.154.43:3100 LISTENING (svchost/iphlpsvc), [::1]:3100 (pid 19044).
- Portproxy: 100.79.154.43:3100 -> 172.21.65.209:3100 (correct target; no drift).
- Tailscale: node online, 100.79.154.43. Serve: no config (present, unused).
- FYD: HEAD 0264d517ea53358d9246ddbbba66bb9dd0beb0d4, BUILD_ID DqZQX-gQgkpciv6rpLgG3,
  NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live on pid 23046.
- Watchdog log: 06:06:04 "LAYER fyd-3100 UNHEALTHY (tailnet probe code=-1)" ->
  "restarting :3100 via /home/nolan/start-3100.sh". Probes 06:11, 06:16 still -1.

## Root cause (epistemic, proven)
The watchdog's Layer 3 used the TAILNET probe as the :3100 health criterion and
restarted the PROCESS on transport failure. Evidence the restart was unnecessary:
the process was locally 200 before, during, and after; the tailnet path stayed
down at 06:11 and 06:16 after the restart and recovered on its own at 06:21.
TRANSPORT FAILURE was treated as PROCESS FAILURE. The 06:06 restart was churn.

## Correction (smallest, authority-owned)
Split Layer 3 in pigi-fyd-stack-watchdog.ps1 into:
- fyd-3100-process: WSL-local probe; restart ONLY on local failure (with reason,
  prior PID, new PID, health result, timestamp logged).
- fyd-3100-transport: tailnet probe; on failure with healthy process ->
  alert-only, NEVER restart the process.
Backup: pigi-fyd-stack-watchdog.ps1.bak-20260928-0626. Deployed via pigwsl-put,
sha256 6af75a8bfd58aef2aba15b1e7cfb17c13c04fdf813e70d6a600839c14a59af5f.
Proven live: manual run 06:28:10 logged "LAYER fyd-3100-process healthy
(WSL-local 200 pid=23046)" and "LAYER fyd-3100 healthy (local 200, tailnet 200)".

## Proof sequence
1. local :3100: 200 (0.03s)
2. Windows boundary: portproxy rule correct, listener on Tailscale IP present
3. tailnet: 200 (two vantages: sandbox->egress-proxy->tailnet; Pig-Windows->tailnet)
4. Happy Place: http://100.79.154.43:3100/sites/happy-place -> 200
5. Coppersmith: http://100.79.154.43:3100/sites/coppersmith -> 307 -> /sites/coppersmith-plumbing -> 200
6. refresh: multiple re-fetches stable 200
7. mobile/browser: mobile UA 200; real-device render needs browser delegation
8. Ask: ok:true local + tailnet, evidence-bounded, citations
9. MC: /mission-control 200; /api/mc/* reachable
10. restart/recovery: 06:06 restart recovered; budget alert-only worked; new watchdog live

## Timeline note (05:16 correlation)
The tailnet failure window spans the pre-reboot kill loop (~05:00-05:16), the
05:24 reboot, and post-reboot reconvergence. The single transport-level smoking
gun is not pinned; the process was healthy throughout. Coincidence not ruled out;
no causal claim made. Killer attribution remains UNKNOWN per standing order.

## Wake policy
Per-run wake inhibition already implemented in the watchdog (ES_SYSTEM_REQUIRED
during probe, released in finally). No global power-policy change made.
