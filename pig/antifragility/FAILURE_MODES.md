# Pig Antifragility — Failure-Mode Register

Audit date: 2026-09-18 ~12:10 MDT. Method: read-only live probes from Pig WSL via pigwsl-run.sh / pig-ssh.sh, plus Windows-side PowerShell checks. No changes made during audit.

Evidence grades: PROVEN (command/log evidence this session) · OBSERVED (seen in transcript history) · INFERRED (plausible, not observed) · UNKNOWN.

## F1 — Commute blackout (~7am, ~4pm MT)
Pig drops off network during Nolan's commute. Blast radius: ALL Pig-side work (FB/IG/Threads/X passes, Meta AI research, convergence probes, SSH). Detection: SSH timeout. Recovery: wait, retry with backoff; runbook says wait 10 min after first failure, do not hammer. Tested: OBSERVED repeatedly, recovery is manual patience. SPOF: yes, single machine. Note: health checks must label blackout-window unreachability as LIKELY_BLACKOUT, not OUTAGE.

## F2 — SSH session loss mid-script
PROVEN today: `run_pass.sh` lost its SSH session 11:52 MDT while the Pig worker kept running. Blast radius: result collection breaks; worker continues detached (good) but may leave strays (F3). Detection: none automatic. Recovery: "orphan reaper should collect the result" — asserted, not proven. Tested: NO.

## F3 — Orphaned processes from killed sessions
PROVEN today: PID 92744 (`bash -s`, from a 06:08 SSH session) + PID 92761 (`docker exec ping-gateway node /tmp/pgq6.js`), 6h elapsed, 00:00:00 CPU, stuck in futex_wait. A probe script querying 7 event IDs, hung with zero CPU. Blast radius: leaked docker exec sessions, confusion about what is live. Detection: none. Recovery: manual kill. Tested: NO (until Phase 3 cleanup).

## F4 — CDP wedge (CDP up, browser unresponsive)
OBSERVED: 22 consecutive IG CDP wedges; passes do zero actions. Blast radius: engagement passes silently do nothing. Detection: NONE — existing watchdogs probe only /json/version, which answers during a wedge. Recovery: only known recovery is Nolan manually closing/reopening the Chrome window. Tested: YES (manual recovery works). SPOF: Nolan. This is the failure mode that actually bites; the probes cannot see it.

## F5 — CDP down (Chrome closed/crashed)
Existing per-profile watchdogs (PigiFBLogin, PigiIGLogin, PigiTTLogin, PigiXLogin, PigiLILogin — all Ready, every ~5 min, Interactive only) probe /json/version and relaunch the profile Chrome via hidden-launch.vbs. PROVEN by logs: Sep 16 10:00 (23s after Windows boot), Sep 16 11:16, Sep 17 19:59 — "CDP down; no fb-profile chrome process running" → "relaunch OK; CDP :9223 up". Detection: yes. Recovery: automatic, tested PROVEN. Residual: silent — flapping is invisible, no alerting.

## F6 — Docker Desktop daemon down / not autostarted
Windows booted Sep 16 10:00; containers started Sep 17 17:28+ (after boot, cause UNKNOWN — possibly manual). Docker Desktop "start on login" setting UNVERIFIED (could not read settings cleanly through the shell layers). Blast radius: all PING containers. Detection: `docker ps` fails. Recovery: manual start. Tested: NO.

## F7 — ping-postgres restart policy = no
PROVEN: `restart=no`, RestartCount=0, started 2026-09-18T03:32:25Z (manual `docker run`; no compose file references ping-postgres). Every sibling (gateway, qdrant, vault, redis) is `unless-stopped`. Blast radius: on any Docker daemon restart, the CANONICAL store stays down while everything else recovers → gateway degraded against a missing DB. Detection: `docker ps` shows it absent. Recovery: manual `docker start`. Tested: NO. Fix: Phase 3 (metadata-only `docker update`, no restart).

## F8 — PostgreSQL volume loss / identity
Volume is a 64-hex compose-generated local name; plain Docker volume, no external protection, no backup tooling, no restore proof (per prior forensics). Blast radius: canonical history. Detection: convergence program's continuity guard (in progress). Recovery: none proven (L4+ unproven). Tested: NO. Escalated — needs cost/risk policy.

## F9 — Disk pressure
6% used, 903G free on /dev/sdd; mem 32G, 21G free. Healthy. Detection: none proactive. Mitigation: health check includes disk.

## F10 — WSL2 independent restart
PROVEN: Windows up ~2d (boot Sep 16 10:00), WSL up 17.8h (restarted ~Sep 17 18:19 independently). Blast radius: WSL-side processes die; Docker Desktop (separate VM) and Windows Chrome unaffected. Note: WSL restart does NOT restart Docker containers — combined with F7, a WSL+Docker restart sequence leaves postgres down.

## F11 — pigwsl-run.sh fragility modes
Documented in AGENTS.md from real incidents, re-confirmed today: 4KB script limit; single-quote stripping in heredocs; stdin eaten in loops; `$`/`$_` and `>` mangling through the ssh/cmd/PowerShell layers (hit twice this session: `$_` became `/usr/bin/bash.TaskName`, `2>$null` broke PowerShell parse). Blast radius: corrupted remote scripts, bizarre syntax errors. Detection: usually loud. Recovery: documented patterns (short scripts, base64 chunked transfers, checksums). Tested: YES.

## F12 — Clock skew
Checked: Fri Sep 18 12:06:49 MDT = 18:06:49 UTC. None. Non-issue.

## F13 — Windows Update forced reboot with no interactive logon
All Pigi* scheduled tasks are "Interactive only". After a reboot where Nolan does not log on, NO watchdogs run and Chrome never relaunches. Last boot Sep 16 10:00 (Update-initiated? UNKNOWN). Blast radius: full Pig-side outage until logon. Detection: Windows uptime jump. Recovery: Nolan logs in. Tested: NO. SPOF: Nolan's logon. Changing tasks to "run whether user is logged on or not" needs his credential/service account → escalate, do not touch.

## F14 — ping-qdrant / ping-vault UNHEALTHY
OBSERVED: both Up 19h but (unhealthy). Blast radius: qdrant = projection (rebuildable); vault = secrets backend (dependents UNKNOWN). Detection: `docker ps` health column. Recovery: none attempted. NOT touching during convergence probes — flagged to parent.

## F15 — Credential handling
Bearer tokens resolve at runtime from ping-gateway container env; no copying observed in Pig-side scripts. OK. Constraint stands: never write tokens to files.

## F16 — Chrome profile corruption
Not observed. UNKNOWN. Recovery would require Nolan re-login. Unmitigated; low frequency.

## F17 — Egress proxy SPOF
All Pig SSH from here goes through hatch-egress-proxy:3130 (ProxyCommand). Blast radius: total loss of Pig access from the cloud side. Detection: SSH timeout. Recovery: none available from here (hatch infra). SPOF: yes. Tested: NO.

## F18 — Docker Desktop bind-mount staging loss after Windows reboot
PROVEN 2026-10-03: after the 13:56 MDT Windows reboot (battery outage), every WSL container restarted except `ping-gateway`, which exited 127. The inspect error was NOT a missing command: `OCI runtime create failed ... failed to fulfil mount request: open /run/desktop/mnt/host/wsl/docker-desktop-bind-mounts/Ubuntu/<hash>: no such file or directory`. The container's actual mount source (`bind /var/lib/docker/volumes/muse-workspace/_data -> /app/workspace/muse`) EXISTS on the WSL side (volume `muse-workspace` present, `_data` intact, dated Sep 29). The failure is Docker Desktop's internal bind-mount staging path not being recreated on boot; it is a boot-time race, not data loss. Exit 127 here means "container never started", not "command not found" — do not chase the image entrypoint on this signature. Sibling containers (ping-postgres, ping-qdrant, ping-redis, ollama) restarted fine because their volume mounts go through Docker Desktop's volume driver, not the bind-mount staging path; a `bind` of a `/var/lib/docker/volumes/...` path is the fragile pattern. Detection: heartbeat `gateway=bad GW=exited` (F14-style). Recovery: `docker restart ping-gateway` on the Pig (staging path is recreated on restart). Watchdog probes showed "ambiguous" during the down window and took no action — a watchdog that cannot classify a stopped container is a detection gap (see Contradictions C6 if formalized). Tested: NO (restart not yet run; Nolan at the Pig).

### Container-health triage recipe (cloud side, read-only, proven 2026-10-03)
All via `echo '<cmd>' | timeout 60 ~/workspace/pig-fb/pigwsl-exec.sh` (stdin-fed, never the `-s` arg form):
1. `docker ps -a --format "{{.Names}} {{.State}} {{.Status}}"` — locate the container, read State + ExitCode + "Up Xm".
2. `docker logs <name> --tail 15` — distinguish app crash (stack trace at tail) from runtime failure (old logs, nothing new).
3. `docker inspect <name> --format "{{json .State}}"` — the `Error` field is the runtime verdict (mount, OOM, entrypoint).
4. `docker inspect <name> --format "{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}} {{end}}"` — bind mounts of Docker-internal paths are the suspect class.
5. Verify each Source exists on WSL (`ls -la <source>`). Source present + staging-path error = Docker Desktop bind-mount staging loss (F18). Source absent = real data/volume loss.
6. Never restart from the cloud side under the read-only heartbeat rule; hand the verdict + recovery command to Nolan.

## Contradictions (docs/scripts vs actual machine state)
- C1: Runbook presents CDP :9223 as the Pig's always-on Chrome endpoint; from Pig WSL, `localhost:9223` is UNREACHABLE (Chrome binds 127.0.0.1 on Windows only; WSL has no route — PROVEN: instant refused on localhost, timeout on gateway IP). Sanctioned path is PowerShell-from-WSL (`cdp-health.sh` pattern). Any new WSL-side tooling assuming localhost:9223 will fail. Trap, not bug.
- C2: Postgres treated as canonical durable store, but its container restart policy is `no` while all siblings are `unless-stopped`. Cause: imperative `docker run`, not compose. → fixed Phase 3.
- C3: "Orphan reaper should collect the result automatically" (FB pass note) vs PROVEN 6h-old hung `docker exec` with zero reaping. Reaper unproven.
- C4: Watchdogs probe /json/version (liveness), but the recurring real failure is wedge (F4: CDP up, unresponsive). The probe cannot detect the failure mode that actually bites.
- C5: `ensure-cdp.sh` fires `schtasks /run /tn PigiFBLogin` — task exists and is Ready. No contradiction; verified.
