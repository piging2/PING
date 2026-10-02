# P0 Pig Reliability Incident: Evidence Record v2 (2026-09-28 ~06:00 MDT)

Status: FORENSICS IN PROGRESS. No restarts, no power-policy changes, no :3100 relaunch.
All commands were read-only. Nothing was rebooted, restarted, or reconfigured by this lane.

Bindings (Nolan 2026-09-28 ~05:45, 100-hour program T+0):
- P0-HOST-01: reboot already occurred; capture what remains; OBSERVED FACT vs INFERENCE
  vs UNKNOWN; no blind restarts until surviving evidence is captured.
- P1-REL-01: five :3100 kills 05:11-05:16 is a real defect until explained; instrument
  ownership; preserve evidence before respawning; goal KILLER IDENTIFIED or FAILURE
  CLASS NARROWED WITH EVIDENCE; no repeated restarts called "restored".
- Restore ONLY the minimum FYD path once the P0 boundary is safe. Other lanes will not
  touch infrastructure.

## 1. OBSERVED FACTS

### Windows host lifecycle
- F1. `LastBootUpTime` = 2026-09-28 05:24:27 MDT (CIM, observed ~05:47).
- F2. Kernel-General 12 at 05:24:28: OS started 2026-09-28T11:24:27.5Z. Hypervisor
  started 05:24:28. Wininit 12 (LSASS) 05:24:48. EventLog 6005/6009 05:24:49.
- F3. Kernel-Power 41 at 05:24:31: "rebooted without cleanly shutting down first."
- F4. EventLog 6008 at 05:24:49: "previous system shutdown at 5:06:47 AM was unexpected."
- F5. Exactly one 6005 in System log 03:30-06:05 (narrow id query). Full 00:00-06:05
  enumeration ran in evt2 (results pending delivery).
- F6. ZERO Kernel-Power 506/507/42/107, ZERO BugCheck 1001, ZERO User32 1074 in
  03:30-06:05. `powercfg /lastwake`: Wake History Count 0.
- F7. AC+DC "Sleep after" = 0 (Never). No sleep/resume logged anywhere in window.

### The 05:11:02 anchor (PigiFydStackWatch log, Windows clock)
- F8. 2026-09-28 05:11:02: ALL layers healthy: postgres, journal-gateway (:18199),
  fyd-3100 (tailnet 200), ask-read-path. This run executed WSL docker commands and a
  tailnet HTTP probe successfully: Windows + WSL + Docker + :3100 + network were UP.
- F9. NO watchdog runs logged for 05:16:02 or 05:21:02. Next run 05:26:05: postgres
  UNHEALTHY ("docker: command not found in this WSL 2 distro"); stuck at LAYER 1
  since (05:31, 05:36 same).
- F10. Watchdog restart stamps: fyd-3100.lastrestart = Sep 26 12:46; journal-gateway
  stamps Sep 26 18:01. No watchdog-initiated restarts since.

### :3100 (FYD served surface)
- F11. /home/nolan/3100.log: 10,641,280 bytes, mtime Sep 28 05:16. Tail shows FIVE
  cycles of: `Killed` -> `> website@0.1.0 start` / `> next start -p 3100` ->
  `Next.js 15.5.24` / `Ready in ~461ms` -> serves traffic -> `Killed`
  (log lines ~10946, 11938, 11963, 12006, 12035).
- F12. /home/nolan/3100-restarts.log: last entries 2026-09-28T02:39:55Z and
  2026-09-28T03:00:43Z (2026-09-27 20:39 / 21:00 MDT). NOTHING after.
- F13. No rebuild: .next/BUILD_ID dated Sep 27 21:00. No files under
  /home/nolan/projects/ping modified 05:08-05:18. Only 3100.log modified in
  /home/nolan 05:08-05:20.
- F14. `start-3100.sh.bak-20260927` diff: identical fuser -k + npm start behavior,
  ZERO attribution logging (grep count 0).
- F15. Ruled out as killer: start-3100.sh (F12), PigiFydStackWatch (F10),
  cron (empty crontab; /etc/cron.d only e2scrub), heartbeat pig-health.sh
  (grep: no kill/fuser/pkill), fyd-dev-ready.sh (read-only, verified by reading).
  No interactive SSH login 04:00-05:30 (auth.log). No sub-5-min scheduled tasks.
  WSL guest 31Gi free (no memory pressure in current instance).

### WSL / Docker / browsers / network (post-reboot state)
- F16. WSL `uptime -s` = 2026-09-28 05:28:44 MDT.
- F17. CDP: five chrome.exe mains with --remote-debugging-port 9223-9227
  (fb/ig/x/li/tt profiles), started 05:25:03-05:25:04. All five ports OPEN from
  Windows side (Invoke-WebRequest /json/version -> Chrome/153.0.8010.53).
- F18. Tailscale service: Running, Automatic.
- F19. Docker Desktop: 0 processes. Run-key autostart entry exists.
  Docker logs last written 05:04:56 (init.log) / 04:37:55 (host).
- F20. WSL `ss`: no listeners on 3100/18199/9223/5432. `docker ps`: daemon down.
- F21. Scheduled tasks (all PT5M, Ready): PigiFBLogin/IG/LI/TT/XLogin
  (chrome-cdp-watchdog-*.ps1), PigiFydStackWatch, PigiGatewayWatch, PING-TunnelWatch.
- F22. ping-gateway-watchdog.log: "ambiguous probe (code=-1); no action" 05:29-05:44.
- F23. Zero WLAN/NetworkProfile/Netwtw/Tcpip/DNS/Tailscale/Ndis events in System log
  03:30-04:10.

### Monitoring timeline (prior records)
- F24. 03:41 HOST_ASLEEP (SSH+tailnet down); 03:56 all healthy; 05:21 tunnel failed;
  05:26 heartbeat HOST=UP (last boot 05:24, WSL uptime 86s, Docker/:3100/gateway down);
  05:28 tunnel recovered; 05:31 route reachable.

### Post-reboot hardware/dump forensics (evt2, observed ~06:05)
- F25. Full 00:00-06:05 boot enumeration: exactly ONE boot (05:24:27). No 6005 at
  03:56 or any other time. The host was NOT rebooted at 03:41.
- F26. WHEA/disk/battery/thermal 04:00-05:35: only CORRECTED PCIe AER errors at
  05:24:50 (boot enumeration noise). No disk errors, no battery events, no thermal
  events, no UNCORRECTED hardware errors.
- F27. Dumps: NONE. No minidump directory entries, no MEMORY.DMP. No BugCheck 1001
  (consistent with F6). The unexpected shutdown left no crash dump.
- F28. SleepStudy report (generated 2026-09-28 05:45): the ONLY sessions in the
  report are from 2026-05-27. The system has recorded NO sleep/idle session in
  four months.

## 2. INFERENCES

- I1. The 05:24 event WAS a Windows reboot after unexpected shutdown (F1-F3). The
  product lane's "~06:00 re-interpretation" (Windows up since 03:56, WSL-only
  restart) is FALSIFIED.
- I2. Shutdown window is (05:11:02, 05:16:02] (F8 healthy at 05:11:02; F9 missed
  05:16:02/05:21:02 runs). F4's "05:06:47" is contradicted by F8 and treated as an
  unreliable reconstructed timestamp. RESOLVES the 3100.log-mtime-vs-6008
  contradiction: kills at ~05:11-05:16 happened while the host was UP.
- I3. The 03:41-03:56 event was NOT Windows sleep and NOT a reboot. Now OBSERVED,
  not inference: F6 (zero 506/507/42/107 sleep/resume/reboot-request events),
  F25 (exactly one boot 00:00-06:05, at 05:24:27), F28 (SleepStudy: no sleep
  session recorded in four months). Classification: state C, transport failure,
  mislabeled HOST_ASLEEP. Exact failed transport layer remains UNKNOWN (F23:
  zero Windows-side network events 03:30-04:10).
- I4. (P1-REL-01) The :3100 kills are a deliberate external kill+restart loop:
  SIGKILL + `npm start -- -p 3100`, 5 cycles in (05:11:02, 05:16], via an
  UNATTRIBUTED path. The server was healthy before each kill (serving traffic,
  no crash/OOM in log). Not the blessed script, not the watchdog, not cron, not
  the heartbeat, not fyd-dev-ready, not interactive SSH, not any sub-5-min task,
  not keep-awake (pidfile-scoped), not start-18199 (:18199 only), not
  start-3101-edge (:3101 only), not the tunnel watch. Pig-wide "fuser -k" hunt
  found NO undiscovered kill script (only known start-*.sh variants and docs).
  Remaining vehicles: start-3100.sh.bak-20260927/.bak-20260924 (F14: identical
  behavior, zero attribution) or inline `fuser -k`+`npm start` via SSH (no
  script trace). FAILURE CLASS NARROWED WITH EVIDENCE. Actor still UNKNOWN.
- I5. CDP is UP (F17). "CDP down" reports were WSL-side probe artifacts (WSL cannot
  reach Windows-bound ports; known limitation). The 05:25:03 Chrome farm relaunch
  came from the Pigi*Login scheduled tasks (F21).
- I6. Docker is down because Docker Desktop (Windows) did not launch after the
  05:24:27 reboot: 0 processes, no post-05:24 log writes, despite a Run-key
  entry and an Active console logon (explorer started 05:24:56, i.e. auto-logon).
  Containers likely intact but unreachable (daemon down, not deleted). The FYD
  watchdog is wedged at LAYER 1 (F9: no `docker` CLI in WSL) and never reaches
  the :3100 layer, so no post-reboot :3100 auto-restart occurred. Why Docker
  Desktop skipped launch is UNKNOWN (it did not try and fail visibly; it never
  wrote a log).
- I7. The kill loop (05:11-05:16) and the host shutdown ((05:11:02, 05:16:02])
  coincide in the same ~5-minute window. Causal link UNKNOWN.
- I8. The 05:06:47 event-log stall (F4's timestamp) with a healthy 05:11:02
  watchdog (F8) suggests the system began degrading ~05:06 and died by 05:16:02,
  rather than an instantaneous power cut at 05:06:47. Mechanism UNKNOWN
  (pending evt2: WHEA/disk/dumps/SleepStudy).

## 3. UNKNOWNS

- U1. Exact actor of the 5 kill/restart cycles (which lane/script/person; lane
  inline commands vs .bak script vs undiscovered script).
- U2. Root cause of the (05:11:02, 05:16:02] unexpected shutdown. evt2 narrowed it:
  no BugCheck/dump (F27), no uncorrected WHEA (F26), no disk/thermal/battery
  events (F26), no clean-shutdown request (F6). Remaining candidates: sudden
  power loss, hard hang, or firmware-level event that left no trace. The 6008
  "05:06:47" timestamp is unreliable (contradicted by F8).
- U3. Whether the kill loop caused/contributed to the shutdown or was coincidental.
- U4. Root cause of the 03:41-03:56 transport failure (F23: no Windows-side
  network events; check Tailscale/adapter logs next if needed).
- U5. Why Docker Desktop failed to autostart post-reboot (F19).
- U6. Why WSL first started 05:28:44, ~4 min after the 05:24:27 boot (likely first
  `wsl --` invocation; unconfirmed).

## 4. RECOVERY GATING (per 100-hour program bindings)

DO NOT restart :3100 / Docker / gateway until:
  (a) evt2 surviving evidence is fully captured and reviewed (in flight);
  (b) the kill-loop actor is identified OR explicitly accepted as UNKNOWN-WITH-
      EVIDENCE by Nolan (killer unknown + loop vehicle unknown = relaunching
      into the same grinder is not permitted);
  (c) Docker Desktop's post-reboot failure is understood (the FYD path needs
      postgres; the watchdog is wedged behind it).

Prepared (not started): ~/workspace/pig/incident-2026-09-28/3100-lifecycle-watch.sh
(read-only PID/PPID/ancestor/resource/dmesg observer; logs only, never restarts).

Minimum FYD path (URL -> evidence -> objects -> SiteSpec -> renderer -> browser ->
Ask FYD) restoration is STAGED, not started. CDP/browser side is already healthy
(F17); the blocked layers are Docker/postgres (F19/F20) and :3100 (gated above).
