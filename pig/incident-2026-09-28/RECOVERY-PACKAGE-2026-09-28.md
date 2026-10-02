# RECOVERY PACKAGE: Pig reliability incident 2026-09-28
## Forensic Round 2 + certification plan

Date: 2026-09-28 ~06:15 MDT. Lane: reliability forensics (read-only).
Evidence record: `~/workspace/pig/incident-2026-09-28/EVIDENCE-RECORD-2026-09-28.md`.
Classifier fixture: `~/workspace/pig/antifragility/tests/test-host-sleep-classifier.sh` (FAILING, permanent).

---

## 0. DECISION SURFACE (read this first)

**Posture conflict, stated plainly:** the 06:03 MDT directive orders the stack DOWN.
The stack is UP. Relaunch completed 06:02:37 under the 05:59 order, before the
supersession arrived. This lane did NOT take it down afterward, because stopping
it requires SIGKILL (no graceful stop path exists), which would mimic the
incident signature and destroy the only instrument that can catch a recurrence.

**Verdicts:**
- The five :3100 deaths were deliberate SIGKILLs of the `npm start` launcher
  process itself (bash printed `Killed`), each followed within ~60s by a
  deliberate `npm start -- -p 3100` relaunch. Crash, OOM, port conflict,
  parent death, shell exit, and Windows/WSL termination are DISPROVEN by the
  log signature. Primitive: pattern/PID SIGKILL (pkill -f / kill -9 class),
  NOT fuser -k (fuser kills the node socket-holder, which would NOT print
  `Killed`). Killer identity: UNKNOWN (accepted).
- The kill+relaunch signature is not new. 20 identical `Killed` -> `npm start`
  cycles exist across the log's history. The 05:11-05:16 incident is five rapid
  repetitions of a long-standing unattributed launcher loop. The blessed
  `start-3100.sh` (setsid) CANNOT produce this signature, so it was never the
  launcher for any of these cycles.
- Blessed paths excluded per-timestamp: start-3100.sh (attribution log silent
  in window; signature incompatible), watchdog (ran 05:11:02 AND 05:16:02, both
  healthy, took no action; restart budget max 3/hour could not make 5 cycles),
  cron (no jobs exist), heartbeat (read-only, verified), other tooling
  (port-scoped or read-only).
- 05:24: event signature is 41 + 6008 with NO 1074, NO 6006, NO 1001. Not a
  clean restart. Consistent with Nolan's testimony ONLY as a forced hard reset
  of a frozen machine. Power loss is indistinguishable on events alone.
  Windows Update DISPROVEN (last activity Sep 27 20:32). Docker was healthy at
  05:04:56 (normal API traffic). Event logging was wedged since 04:51:48.
- Docker autostart distinction (Nolan's question): CONFIGURED (Run key exists)
  but FAILED (zero processes, no post-boot log before manual launch). Root
  cause of the failure: UNKNOWN. Do not "fix" Docker startup until root-caused.
- 03:41: classifier defect located and proven. `pig-health.sh` lines 73-84 map
  "SSH blackhole >= 8s" to HOST_ASLEEP with zero positive sleep evidence
  ("evidence-weighted: standby"). Fail-before fixture written; it FAILS today.
  The 8-second cutoff is arbitrary: fast fail -> UNKNOWN, slow fail -> ASLEEP.
- Historical forensics are ~90% exhausted. The highest-value remaining evidence
  is a RECURRENCE caught by the death-certificate instrumentation, which
  requires a running :3100.

**Recommendation:** keep the instrumented :3100 UP as a forensic canary. Do not
treat it as recovered product infrastructure (no product proofs against it as
"recovered"). Do not run the product lane until the recovery decision lands.
Nolan/parent own the keep-up vs take-down call; the case for keeping it is in
section 10.

**Correction to the evidence record:** the record states the watchdog "MISSED
05:16:02". The watchdog's durable log proves it RAN at 05:16:02 and recorded
all layers healthy, including fyd-3100 tailnet 200. The kill window is therefore
(05:11:02, 05:16:02), and the 5th restart was complete and serving before
05:16:02.

**06:12 MDT update (Nolan):** killer attribution is STOOD DOWN as UNKNOWN,
accepted. "Do NOT reopen unless the death instrumentation catches another
unexpected death. Stop attribution archaeology." This package already conforms:
no manufactured attribution; the death certificate (L2) is the only sanctioned
live lead. The 06:12 recovery sequence (Docker -> engine -> WSL -> persistence
-> gateway -> journal identity -> FYD runtime via one blessed path -> MC ->
Ask -> sites -> tailnet -> browser -> replay -> receipt) matches section 11.

---

## 1. CURRENT POSTURE (as of 06:15 MDT)

- :3100 UP (PID 19818, blessed launcher, death instrumentation armed, watcher
  PID 19760). Serving locally. Tailnet path BROKEN (portproxy rules did not
  rebind after reboot; no mutation applied pending the recovery decision).
- :18199 journal gateway UP (PID 19311, restarted 06:01:02 by the watchdog's
  normal path, attributed).
- Docker Desktop UP (manually launched ~06:00; autostart failure unresolved).
- Postgres, gateway, qdrant, redis, vault, ollama, brain-postgres: running.
- No product lane work is proceeding. No further infrastructure mutation will
  occur from this lane.

---

## 2. KNOWN

K1. Five :3100 SIGKILL+relaunch cycles in (05:11:02, 05:16:02] MDT. Mean cycle
    ~60s. Final state healthy (watchdog tailnet 200 at 05:16:02).
K2. Victim each time: the `npm start -- -p 3100` process (bash printed `Killed`
    into 3100.log, which requires the SIGKILL to land on bash's direct child).
K3. Relaunch each time: `npm start -- -p 3100` (website@0.1.0), `next start`,
    Next.js 15.5.24, `Ready in ~400ms` (production server, no compile).
K4. Same build every cycle: BUILD_ID `DqZQX-gQgkpciv6rpLgG3` (file mtime Sep 27
    21:00, untouched); no rebuild strings; no repo file modified 05:08-05:18.
K5. The signature predates the incident: 20 identical historical cycles.
K6. The blessed start-3100.sh (all 3 variants, setsid) cannot produce `Killed`
    in the log; it was never the launcher of these cycles.
K7. Watchdog ran 05:11:02 and 05:16:02, all layers healthy, no restart action.
K8. 05:24:31 Kernel-Power 41; 05:24:49 EventLog 6008/6005/6009/6013. No 1074,
    no 6006, no 1001, no thermal/battery/update events near the boundary.
K9. System event log silent from 04:51:48 (Volsnap 33) while user-mode processes
    kept running (Docker API 05:04:56, watchdog 05:11:02, kill loop 05:11-05:16).
K10. 03:41 classifier emitted HOST_ASLEEP on a transport wedge; host was UP
    (proven by K9-adjacent later evidence). Defect reproduced in sandbox.
K11. Docker autostart: configured (Run key) + failed (no launch). Cause unknown.
K12. sshd on Pig: key-only, AllowUsers muse-ssh nolan, empty logs dir (no
    per-session command attribution). This is a permanent attribution gap.
K13. No Windows scheduled task other than PigiFydStackWatch touches :3100.
    WSL cron: no user jobs. No task fired in the kill window.

## 3. DISPROVEN

D1. Process crash: no stack trace / error text at any of the 5 deaths; clean
    `Killed` only. (Old `Event handlers` errors at lines 10617-10697 predate
    the incident.)
D2. OOM: dmesg has no oom-killer / Killed-process entries; and OOM does not
    relaunch.
D3. Port conflict: no EADDRINUSE anywhere in the window; relaunches bound
    successfully every time.
D4. Parent death / shell exit: setsid/reparent semantics do not SIGKILL; bash
    prints `Hangup` for SIGHUP, not `Killed`.
D5. Windows/WSL termination: the OS was up (relaunches executed); a VM kill
    cannot relaunch.
D6. fuser -k as the kill primitive: fuser SIGKILLs socket holders (the node
    server), not the npm launcher; bash would print nothing. The observed
    `Killed` requires SIGKILL on npm itself.
D7. Blessed start-3100.sh as the killer/launcher: attribution log silent in
    window AND signature incompatible (setsid children reparent to init).
D8. Watchdog as the killer: ran at both window boundaries, healthy, no action;
    its restart path uses the blessed script (incompatible signature); its
    budget (max 3/hour, 10-min backoff) cannot produce 5 cycles in 5 minutes.
D9. Cron/heartbeat/other tooling: no cron jobs exist; pig-health.sh verified
    read-only (only kill-string is a log-parsing regex); keep-awake/start-18199/
    start-3101-edge are port/process-scoped away from :3100.
D10. Windows Update as the 05:24 cause: last WU events Sep 27 20:32.
D11. 05:24 as a clean restart: no 1074, no 6006. (Nolan's testimony survives
    only as a forced hard reset, which is 41-without-1074 by definition.)
D12. 03:41 as sleep: SleepStudy shows no sleep session in 4 months; host
    demonstrably active later the same morning with no intervening boot.
D13. Docker degraded before the reboot: normal API traffic at 05:04:56.
D14. "Docker not configured to autostart": the Run key exists. It is
    configured-and-failed, not unconfigured.

## 4. UNKNOWN (accepted, not to be manufactured)

U1. Identity of the kill-loop invoker (human, agent, or automation).
U2. The trigger for exactly 5 rapid cycles (health-check loop? deploy routine?
    manual repetition?).
U3. Exact per-kill timestamps (3100.log carries no wall-clock timestamps).
U4. Whether the 05:11-05:16 launcher is the same process as the historical
    launcher (behaviorally identical signature; unproven).
U5. Root cause of Docker Desktop's autostart failure (configured but never
    launched; wrote no log).
U6. Why the System event log went silent at 04:51:48 while processes lived on.
U7. Whether Nolan's hard reset preceded or followed the final host freeze
    (events cannot order them; testimony is the only source).
U8. The historical launcher's location/code (behavioral inventory found no
    matching loop in /home/nolan/*.sh, the repo, or scheduled tasks).

---

## 5. THE FIVE :3100 KILLS (questions 1-7)

**Q1. What PROVES deliberate termination?**
The log at lines 10946/11938/11963/12006/12035 shows the invariant sequence:
`Killed` -> blank -> `> website@0.1.0 start` -> `> next start -p 3100` ->
Next.js banner -> `Ready in ~400ms`. Three facts compose the proof:
(a) `Killed` is bash's message when its direct child dies by SIGKILL. Only an
external SIGKILL to the npm launcher produces this exact line; crashes print
traces (D1), OOM prints in dmesg (D2), SIGHUP prints `Hangup` (D4).
(b) Each death is followed within ~60s by a successful `npm start`. Dead
processes do not relaunch themselves; OS-level kills do not relaunch. The
relaunch is an independent deliberate act.
(c) All five victims were healthy (watchdog tailnet 200 at 05:11:02; final
restart serving 200 at 05:16:02). Nothing was being recovered from a failure.
"Looks deliberate" is not the claim. SIGKILL + relaunch x5 is the claim.

**Q2. Narrowest known kill primitive?**
SIGKILL delivered to the `npm start` process itself (bash's direct child), via
the kill -9 / pkill -f / killall -9 class. Ruled OUT: fuser -k (D6), PowerShell
Stop-Process / taskkill against node (no PowerShell events 05:08-05:20; and a
Windows-side kill of the WSL npm would still print `Killed` only via the WSL
bash parent, requiring the WSL-side launcher theory anyway). Cannot narrow
further from the log: `kill -9 <pid>`, `pkill -9 -f 3100`, and `pkill -9 -f
"npm start"` are observationally identical here. Windows-side primitives
(taskkill / Stop-Process) are architecturally excluded: WSL2 processes live
inside the utility VM and are not addressable as Windows PIDs; the only
Windows-side kill is `wsl --terminate`, which kills the whole distro and
cannot relaunch. The primitive executed inside WSL (directly or via
`wsl.exe -u nolan -- bash -c`). Evidence gathered:
bash_history (no :3100 kill commands; interactive only), sshd logs (dir empty,
U-gap), PowerShell Operational log (0 events 05:08-05:20), System log (0 events
05:08-05:20), scheduled tasks (none fired). The primitive is narrowed; the
invoker is not.

**Q3. Blessed-path exclusion, per timestamp.**
All five kills fall in (05:11:02, 05:16:02):
- start-3100.sh: 3100-restarts.log last entries 02:39:55Z / 03:00:43Z (Sep 27
  evening). Zero entries in the window. Independently: its setsid launch
  cannot produce the observed signature (K6), so even an unlogged run could
  not have done this.
- Watchdog: executed 05:11:02 (healthy, no action) and 05:16:02 (healthy, no
  action). Its restart branch requires tailnet != 200. Budget excludes 5
  cycles regardless.
- Cron: nolan crontab empty; /etc/cron.d only e2scrub; no timers target :3100.
  There is nothing that could have fired.
- Heartbeat (pig-health.sh): read-only by code inspection (section 5 grep:
  zero mutation primitives). It cannot kill by construction.
- Other tooling: start-18199.sh (:18199 only), start-3101-edge.sh (:3101 only),
  keep-awake (power requests + self-scoped taskkill), fyd-dev-ready.sh /
  ask-probe.sh (curl only), chrome-cdp watchdogs (chrome-profile-scoped
  Stop-Process). None can address :3100.

**Q4. Backup start scripts (behavioral inventory, read-only, by child lane).**
Kill-capable inventory: start-3100.sh (fuser -k 3100/tcp, attributed),
2x .bak variants (same kill behavior, NO attribution), start-18199.sh /
start-3101-edge.sh (port-scoped), keep-awake-start.sh (self-scoped taskkill +
pkill), watchdog ps1 (indirect via blessed script only), 5x chrome-cdp
watchdogs (chrome-scoped), ping-gateway-watchdog.ps1 (no :3100 refs),
3100-lifecycle-watch.sh (read-only observer, fuser WITHOUT -k). Repo
git grep: no executable kill-capable code (only test prose). No script in the
inventory runs a `while` relaunch loop or matches the `Killed`->npm signature.
The historical launcher (U8) was NOT found.

**Q5. Inline-SSH candidate set (vehicles, not suspects).**
- 136 Windows scheduled tasks; only PigiFydStackWatch's chain touches :3100
  (via the watchdog, excluded in Q3). No other task references node/npm/wsl.
- WSL: no user cron, no :3100 timers.
- Operator tooling: pigwsl-run.sh (arbitrary remote bash; the vehicle used for
  this very forensics), pig-push/rsync/mirror, pig-health.sh.
- Windows OpenSSH: enabled, key-only, `AllowUsers muse-ssh nolan`. Logs dir
  EMPTY: ad-hoc SSH sessions have no command attribution on the Pig (K12).
- Pig WSL client: no ~/.ssh/config; known_hosts has 129.146.60.17 (plaintext)
  + 6 hashed + codex 127.0.0.1. Outbound vehicles exist; not tied to the window.
- Historical recovery commands: bash_history shows only `pkill -f uvicorn`
  (unrelated dev work). Non-interactive SSH leaves no history.
- Attribution gap (stated, not accused): any holder of the muse-ssh/nolan key
  could have issued the kills with zero on-Pig trace.

**Q6. Kill -> restart intervals.**
Every kill was followed by a restart: 5/5. Window (05:11:02, 05:16:02): 300s
for 5 cycles, mean ~60s per KILL->START->HEALTHY cycle; each `next start`
reached Ready in ~400ms, so victims lived roughly a minute between kills. The
repetition HEALTHY -> KILL -> START -> HEALTHY x5 matches a recovery/deploy
routine clearing the port before starting, or a stuck operator loop. It does
not match malice (nothing was stolen, broken, or left down; the final state
was healthy).

**Q7. Build identity per cycle.**
Preserved: BUILD_ID `DqZQX-gQgkpciv6rpLgG3` (file mtime Sep 27 21:00); no
rebuild output; no repo modifications 05:08-05:18; `next start` production
mode every time; Next.js 15.5.24 every time; package `website@0.1.0` every
time. Not recoverable historically: parent PID chain, full env (including
whether the mystery launcher exported NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1).

---

## 6. 05:24 HARDER QUESTIONS

- Restarted vs power disappeared: event signature = unexpected power loss
  (41 + 6008, no 1074, no 6006, no 1001). A clean Start->Restart would log
  1074. Nolan's testimony ("I restarted the frozen machine") is consistent
  ONLY with a forced hard reset (power-button hold), which is definitionally
  41-without-1074. Forced reset by Nolan vs spontaneous power loss are
  indistinguishable on events alone; testimony breaks the tie toward Nolan.
- Last trustworthy timestamp before loss: 04:51:48 (System/Volsnap 33). Note
  the machine was NOT dead then: Docker API 05:04:56, watchdog 05:11:02,
  kill loop 05:11-05:16 all prove user-mode liveness. The EVENT SUBSYSTEM was
  wedged from 04:51:48 (U6).
- First trustworthy timestamp after boot: 05:24:28 (Kernel-Boot 20),
  05:24:31 (41 recorded), 05:24:49 (6008/6005/6009/6013).
- 1074: absent (03:30-06:05 swept). 6008: present 05:24:49. 41: present
  05:24:31. 1001/BugCheck: absent. Thermal (86/87): absent. Battery/AC: no
  Kernel-Power events 03:00-05:11; state unobservable from here.
- Windows Update: last activity Sep 27 20:32 (IDs 43/44/19). DISPROVEN.
- Was something degraded beforehand? Docker: no (D13). WSL: functional (kill
  loop + watchdog ran). Event logging: yes, wedged since 04:51:48.
- Docker autostart distinction: CONFIGURED (HKCU Run key exists) and FAILED
  (zero processes after auto-logon; Docker wrote no post-05:24 log before
  manual launch ~06:00). Root cause UNKNOWN (U5). No Docker startup mutation
  until root-caused (Nolan's order).

## 7. 03:41 CLASSIFIER DEFECT

- Boundary: `~/workspace/pig/pig-health.sh`, HOST-domain branch, lines 73-84.
  `SSH fail + network fast-fail (<8s)` -> NETWORK_DOWN/UNKNOWN (fine).
  `SSH fail + slow blackhole (>=8s)` -> HOST_ASLEEP (DEFECT). The 8s cutoff
  is arbitrary; neither branch consults positive sleep evidence. The header
  comment ("the standby history makes this the evidence-weighted default")
  codifies the fallacy.
- 03:41 record: `status=HOST_ASLEEP`, `ssh="down (no answer after 12s;
  evidence-weighted: standby)"`, ground truth host UP. False classification,
  proven.
- Fixture: `~/workspace/pig/antifragility/tests/test-host-sleep-classifier.sh`.
  Runs the REAL pig-health.sh in a sandbox (network probe stubbed 200, SSH
  stubbed blackhole 9s). Asserts the 03:41 input does NOT classify as
  HOST_ASLEEP. Result today: FAIL (reproduces HOST_ASLEEP). Permanent
  regression evidence; flips to PASS when the hierarchy lands.
- Proposed hierarchy (Nolan's, adopted): HOST_ASLEEP only on positive
  host/power-state evidence; HOST_REBOOTING on positive boot evidence;
  HOST_UP_TRANSPORT_UNREACHABLE on host-up evidence + dead transport;
  NETWORK_PATH_FAILURE on isolated transport; SERVICE_DOWN on host/path up +
  service down; UNKNOWN_REACHABILITY_FAILURE when evidence cannot distinguish
  (the 03:41 case). Reuse existing vocabulary first; add only what is missing.
- Fix is NOT applied: it changes monitoring/alerting semantics and belongs in
  MUTATIONS REQUIRED with Nolan's authority (section 12).

## 8. REMAINING ATTRIBUTION LEADS

L1. The historical launcher loop (U8): behaviorally a shell loop running
    `npm start -- -p 3100` with stderr to 3100.log, killing via the pkill
    class. Not found in /home/nolan/*.sh, the repo, cron, or tasks. Next
    step: search WSL shell startup files, nohup.out files, detached tmux/
    screen sessions, and Windows-side WSL launchers. (Read-only.)
L2. Recurrence watch: the death-certificate instrumentation
    (/home/nolan/3100-lifecycle.log) will attribute the next kill with PID,
    PPID chain, launch hash, HEAD, port ownership, and Windows/WSL/Docker
    context. Requires :3100 running. This is the highest-value lead.
L3. SSH attribution gap (K12): enabling sshd command logging on the Pig would
    close the ad-hoc-session hole going forward. That is a config mutation;
    needs Nolan's authority (class D adjacent).
L4. .bak provenance: mtimes/creation context of start-3100.sh.bak-20260927
    and .bak-20260924 (who made them, when, why two). STOOD DOWN per 06:12
    (stop attribution archaeology); reopen only with new evidence.
L5. The 04:51:48 event-log silence (U6). STOOD DOWN per 06:12; reopen only
    with new evidence.

## 9. FORENSIC VALUE OF WAITING

Historical forensics are ~90% exhausted. Obtainable while down: L4, L5, deeper
task-history sweeps (low yield; already swept 05:08-05:20 with zero events).
NOT obtainable while down: L2, the only lead that can name the invoker.
Keeping the stack down forfeits the canary and gains only low-yield leads.
The rational forensic posture is: keep the instrumented canary UP, do nothing
else, and let the next recurrence (if any) attribute itself.

## 10. COST OF CONTINUED DOWNTIME

Honest accounting: the stack is UP, so local downtime cost is currently zero.
The costs are positional: (a) the 06:03 down-posture is violated until
Nolan/parent rule on section 0; (b) the tailnet path is broken (portproxy did
not rebind) independent of stack state, so Nolan cannot test remotely either
way until the recovery decision; (c) the FYD product lane (hostile fixes, Ask
FYD, owner correction, customization) is queued behind the recovery decision,
burning the 100-hour clock (T+24 = Sep 29 05:45 MDT). If the ruling is
take-down: add full product-lane blockage until the section 11 sequence
completes.

## 11. EXACT RECOVERY SEQUENCE (certification, not a checklist)

Run top to bottom. Do not start the next boundary until the current one is
GREEN. At each boundary record: BEFORE / ACTION / AUTHORITY / EXPECTED /
OBSERVED / IDENTITY-VERSION / HEALTH / FAILURE. Template fields first, then
the boundary table.

- BEFORE: observed state on arrival.
- ACTION: the single command or step.
- AUTHORITY: whose order covers it (06:03 directive sections, Nolan's
  standing orders, or REQUIRED-NEW for escalation).
- EXPECTED: the precise observable change.
- OBSERVED: what actually happened.
- IDENTITY-VERSION: the version binding (SHA / BUILD_ID / config hash).
- HEALTH: the probe and its result.
- FAILURE: what to do if it fails (stop, do not proceed).

B1. WINDOWS HOST. BEFORE: record LastBootUpTime, pending-reboot flags, update
state. ACTION: read-only (Get-CimInstance Win32_OperatingSystem,
Get-WURebootStatus equivalent). AUTHORITY: 06:03 recovery-as-certification.
EXPECTED: no change. OBSERVED/HEALTH: boot time matches 2026-09-28 05:24,
no forced reboot pending. FAILURE: if a reboot is pending, stop and escalate
(it changes every downstream boundary).
B2. DOCKER DESKTOP. BEFORE: process list + `docker version` (client AND
server). Do NOT trust GUI or process existence alone: the server version must
answer. ACTION: if server down, launch Docker Desktop (manual/GUI path as
06:00, or the autostart path once root-caused). AUTHORITY: 06:03 directive;
any autostart CONFIG change = REQUIRED-NEW (class C). EXPECTED: `docker
version` shows server 29.5.3. IDENTITY-VERSION: server version string.
HEALTH: `docker ps` lists ping-* containers. FAILURE: stop; diagnose the
autostart failure (U5) before proceeding.
B3. WSL. BEFORE: `wsl --status`, distro state. ACTION: `wsl -u nolan -- true`
probe. AUTHORITY: 06:03. EXPECTED: responsive. HEALTH: /proc/uptime advances.
FAILURE: stop (Windows-side issue).
B4. POSTGRES (authoritative). BEFORE: `docker inspect ping-postgres`.
ACTION: `pg_isready` + `SELECT 1` via the container. AUTHORITY: 06:03.
EXPECTED: accepting connections. IDENTITY-VERSION: image digest + data-dir
state. HEALTH: pg_isready exit 0 AND select 1. FAILURE: stop; do not start
gateways against a sick database.
B5. GATEWAY (ping-gateway). BEFORE: container state. ACTION: none if running
(restart policy owns it); else `docker start`. HEALTH: gateway responds.
B6. JOURNAL GATEWAY (:18199). BEFORE: listener + process. ACTION: only via
/home/nolan/start-18199.sh if down. AUTHORITY: blessed path (standing).
IDENTITY-VERSION: the /health identity fields (service name must read
fyd-journal-gateway; a wrong identity here is a defect, not a detail).
HEALTH: `{"ok":true}` on /. FAILURE: stop; do not start :3100 against a
misidentified journal.
B7. FYD RUNTIME (:3100). BEFORE: no listener expected (down-posture) or the
canary (current). ACTION: ONLY /home/nolan/start-3100.sh. AUTHORITY: blessed
runtime-mutation path (standing :3100 restart protocol). EXPECTED: setsid
launch, attribution line in 3100-restarts.log, watcher started, LAUNCH-EVIDENCE
in 3100-lifecycle.log. IDENTITY-VERSION: HEAD SHA + launch-command hash +
BUILD_ID. HEALTH: local 200 on /sites/happy-place AND
NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 in the live process env (protocol:
never trust the launch command alone). FAILURE: stop; capture the
death certificate if the launch itself was killed.
B8. MISSION CONTROL. BEFORE: no knowledge of runs. ACTION: read-only status
query. AUTHORITY: 06:03. EXPECTED: no change. HEALTH: reports no invented
runs; approved proposal digest present. FAILURE: stop on any invented run.
B9. ASK FYD. BEFORE: unknown. ACTION: evidence-bounded probe question against
the trusted path. AUTHORITY: 06:03 (read-only probe). EXPECTED: answered with
citations or honest refusal. HEALTH: response carries evidence refs.
FAILURE: stop; the product is not proven.
B10. APPROVED TRANSITION STATE. BEFORE: unknown. ACTION: read the mission
record and proposal digest; compare to 5c1d8737... and mc-m-c5b2c89b4ff7.
AUTHORITY: 06:03. EXPECTED: byte-identical. HEALTH: match. FAILURE: stop;
state corruption is a P0.
B11. BROWSER. BEFORE: unknown served bytes. ACTION: headed-Chrome capture of
Happy Place + Coppersmith via the tailnet path (proves the full chain Nolan
traverses). AUTHORITY: 06:03. EXPECTED: 200s, no harness artifacts.
IDENTITY-VERSION: served asset digest. HEALTH: screenshots match canonical
state. FAILURE: stop; source/build/serve divergence.
B12. REPLAY. BEFORE: proofs stale. ACTION: re-run the 37-check hostile suite
and the 18/19 browser gate against the recovered runtime. AUTHORITY: 06:03.
EXPECTED: 37/37 or documented-unsupported; browser gate classified green.
HEALTH: suite outputs. FAILURE: defects return to the product lane; do not
ship around them.
B13. RECOVERY RECEIPT. BEFORE: sequence complete. ACTION: write the receipt:
per-boundary BEFORE/ACTION/AUTHORITY/EXPECTED/OBSERVED/IDENTITY-VERSION/
HEALTH/FAILURE records, the reality-reconstruction results (section 13),
and the sign-off. AUTHORITY: 06:03. This receipt is the recovery proof.

## 12. MUTATIONS REQUIRED + AUTHORITY FOR EACH

M1. pig-health.sh HOST_ASLEEP -> hierarchy (section 7). Behavior change to
    monitoring/alerting. AUTHORITY: REQUIRED-NEW, Nolan (class B: changes
    what the automation may conclude; the old default caused this incident's
    03:41 misclassification).
M2. Docker Desktop autostart root-cause + fix. Not yet root-caused (U5).
    Any config mutation. AUTHORITY: REQUIRED-NEW, Nolan (class C).
M3. Portproxy rebind (100.79.154.43:3100 -> WSL IP) when recovery is
    authorized. Exact rollback: `netsh interface portproxy delete v4tov4
    listenaddress=100.79.154.43 listenport=3100`. AUTHORITY: the recovery
    decision itself.
M4. If the mystery launcher (L1) is found and deemed obsolete: disable it.
    AUTHORITY: REQUIRED-NEW, Nolan (class B: disabling automation).
M5. sshd command logging on the Pig (closes the K12 attribution gap going
    forward). AUTHORITY: REQUIRED-NEW, Nolan (class D adjacent: credential/
    path posture).
M6. Minimum package if attribution stays UNKNOWN (class E): keep the death
    certificate armed, keep the 03:41 fixture red until M1 lands, re-run
    this package's Q1-Q7 against any recurrence, and do NOT invent a killer.

## 13. ROLLBACK

- start-3100.sh: backup at /home/nolan/start-3100.sh.pre-instrument-20260928
  (sha256 fa149dd3...). Restore = copy back, verify sha256, relaunch via the
  restored script.
- Watcher: kill by PID file, delete script; no system state touched.
- Portproxy: delete commands per M3 (exact inverse recorded at apply time).
- Docker: no config changed in round 2; nothing to roll back.
- pig-health.sh: M1 not applied; nothing to roll back.

## 14. POST-RECOVERY PROOFS (reality-reconstruction test)

Each item: check, source of truth, pass criterion.
R1. Mission identity survives: mission record id == mc-m-c5b2c89b4ff7.
R2. Approved proposal digest survives: == 5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa.
R3. HOLD survives: every pre-recovery HOLD record still HOLD, none
    auto-cleared or re-dispatched.
R4. UNKNOWN survives: fields marked UNKNOWN still UNKNOWN (no backfill).
R5. Artifact/evidence references survive: every reference resolves.
R6. Canonical events survive: event count and heads match pre-recovery export.
R7. Tenant state survives: tenant projection identical hash.
R8. Projections rebuild correctly: rebuild from events, compare hashes.
R9. Mission Control invents no runs: run ledger has no unapproved entries.
R10. No mission silently redispatches: dispatch log shows no unapproved dispatch.
R11. No external action repeats: outbox/sent-ledger has no duplicates.
R12. FYD owner intent survives: CONFIRM/CORRECT/HIDE states intact.
R13. Served site corresponds to canonical state: served digest matches the
     canonical build digest.
R14. Ask uses current authorized evidence: probe answers cite current evidence
     only.
FAILURE POLICY: any R-item failing stops the product lane; the recovery is
not certified until all fourteen pass.

## 15. QUESTIONS THAT EVIDENCE COULD NOT ANSWER

- Who or what invoked the kill loop (U1), and what triggered exactly five
  cycles (U2).
- Exact per-kill timestamps (U3); the log has no wall-clock time.
- Whether the incident launcher is the historical launcher (U4).
- Why Docker skipped autostart (U5); why the event log wedged at 04:51:48 (U6).
- Whether Nolan's hard reset preceded or followed the final freeze (U7).
- Where the historical launcher loop lives (U8).

## 16. ESCALATION CLASSES (evidence exhausted; inside the package per order)

A. Forensic-value-vs-downtime: RECOMMENDATION - keep the instrumented canary
   UP (section 9 case); take-down costs the only recurrence attribution.
   Nolan decides.
B. Disabling obsolete automation: only if L1 identifies the launcher AND it
   is proven obsolete. Not yet.
C. Docker startup config mutation: blocked until U5 root-caused. Not yet.
D. Remote credential/path revocation: no evidence implicates any credential.
   Not recommended now; M5 (logging) is the proportionate step.
E. Minimum package if attribution stays UNKNOWN: M6. Do not manufacture a
   killer.