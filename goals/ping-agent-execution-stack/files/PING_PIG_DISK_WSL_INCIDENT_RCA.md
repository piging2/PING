BEGIN FINAL RESPONSE
ROOT CAUSE PARTIALLY RESOLVED

# PING Pig Disk + WSL Incident RCA

Date: 2026-09-19
Incident window: 15:11 MDT (last healthy) to 15:26 MDT (detection)
Second occurrence (same failure mode): 16:14 to ~16:55 MDT, inhibited ~16:55 MDT
Surgical order (supersedes 20-phase directive): executed 2026-09-19 ~16:59-17:06 MDT
Status: ROOT CAUSE PARTIALLY RESOLVED
Report: RCA coordinator lane. Forensic agents A (Windows storage), B (Docker),
C (CosyVoice), D (Git). Ledger: ~/workspace/FAILURE_LEDGER.md entries
FL-20260919-012 (initial diagnosis) and FL-20260919-RCA-001 through RCA-008.

## 1. What happened (verified timeline)

- 15:11 MDT: last verified healthy heartbeat.
- 15:14:15 MDT: `cosyvoice3-eval` container start from Ubuntu, 4 Docker bind-mount
  warnings (transient staged-bind failures, all retried; mounts verified present after).
- 15:15:22 to 15:19:58 MDT: modelscope range-downloader pulls Fun-CosyVoice3-0.5B-2512
  (~5.70 GB: llm.pt 2.02 GB, flow.pt 1.33 GB, flow.decoder.estimator.fp32.onnx 1.33 GB,
  model.safetensors 988 MB, hift.pt 83 MB, campplus.onnx 28 MB) plus 671 MB of orphaned
  `._____temp` range chunks into `/home/nolan/cosyvoice-models` (bind-mounted).
  Peak transient usage exceeded final file sizes (full llm.pt ranges re-written after assembly).
- 15:20:01 MDT: Ubuntu VHDX last write activity.
- 15:21:12 MDT: eight Docker log-hook writes fail with input/output errors inside Ubuntu.
- 15:22:53 MDT: Ubuntu distro agent exits unexpectedly (distro crash).
- 15:26 MDT: heartbeat DEGRADED. It falsely reported Docker, PostgreSQL, and gateway
  down; all three were actually up (probe artifact, see section 6).
- 16:00 to 16:20 MDT: recovery (Nolan-authorized). Deleted Temp, Chrome caches,
  `Videos/CacheClip` (23.59 GB), `ProgramData/Dell` (3.96 GB); ran
  `docker builder prune -f` and `docker system prune -f`; restarted WSL and Docker;
  restarted brain-postgres (stale 5432 port forward). C: free 31.84 GB at 16:18.
- 16:14 to 16:52 MDT: SECOND OCCURRENCE. `qwen3-tts-service` (restart=unless-stopped)
  auto-restarted with Docker during recovery and immediately began downloading
  Qwen3-TTS-12Hz-1.7B-Base (~4.3 GB) from HuggingFace on boot. C: fell from 31.84 GB
  to ~23 GB in ~35 minutes (~150-250 MB/min). Same failure mode, same missing inhibition.
- 17:01 MDT: reconciliation lane stopped `qwen3-tts-service` (reversible `docker stop`;
  zero active API connections; voice program paused by Nolan). Leak verified stopped:
  C: free flat at 22.37 GB, docker_data.vhdx mtime stale since 16:52:58.
- ~16:55 MDT: surgical containment. `docker stop -t 30 qwen3-tts-service` ->
  Exited (137). C: free stepped +9.5 GB (22.36 -> 31.872 GB) in the ~4 min after
  the stop (one-time, safe direction, mechanism OPEN, pending Windows accounting).
- 16:59 to 17:06 MDT: surgical order Phase A T0/T1 (~7 min). Deltas: C: free 0 GB
  (31.872 -> 31.872), VHDX 0 GB (151.631 GB), Docker df identical. VHDX mtime
  micro-advances only (16:57:35 -> 17:00:08, daemon metadata + healthchecks).
  NO ACTIVE LEAK. Growth rate 0 GB/h. Phase C: NO migration destination exists
  (single 512 GB NVMe, C: only, no USB, no network shares). C: at 93.1%; convergence
  writes stay frozen until < 90%. Full surgical report: FL-20260919-RCA-008.

Verified immediate mechanism (unchanged from FL-20260919-012):

C: critically full -> Ubuntu VHDX writes fail -> Ubuntu becomes unreachable ->
WSL-dependent probes fail -> heartbeat falsely reports downstream services down.

## 2. Root-cause tree

### PRIMARY ROOT CAUSE (PROVEN)

Ungoverned capacity on a single shared C: volume. No capacity budget, no growth-rate
monitoring, no inhibition of optional storage-heavy work. Years of accumulated
development and AI weight brought C: to the brink with no warning:

- Docker images 90.06 GB (TTS/CUDA/PyTorch images 14.1 + 14.1 + 13.0 GB; ollama 8.03 GB;
  open-webui 6.73 GB), build cache 20.48 GB, named volumes 23.55 GB
  (compose_ollama_data alone 19.59 GB of model weights)
- WSL-side model/data dirs: qwen3-tts-models 8.8 GB, cosyvoice-models 6.46 GB,
  voice-factory-data 1.4 GB
- /home/nolan/ping 16 GB (including 13 GB of in-repo worktrees and 848 MB of
  duplicated untracked tars)
- Pre-recovery: 4.18 GB Temp, 23.59 GB Videos/CacheClip, 3.96 GB ProgramData/Dell,
  41.16 GB Docker build cache (all removed during recovery; evidence destroyed)

The disk did not fill because of one bad actor. It filled because nothing on the
machine measures, budgets, or governs C: consumption, and production PING shares the
volume with unbounded AI experimentation.

### TRIGGER (HIGH-CONFIDENCE INFERENCE)

The CosyVoice Fun-CosyVoice3-0.5B-2512 modelscope download, 15:15:22-15:19:58 MDT,
the largest single new writer in the incident window (~6.37 GB into the Ubuntu VHDX
via verified bind mounts). Byte arithmetic: the 5.7 GB download SUCCEEDED, so at least
5.7 GB was free at 15:15; C: reached 99.90% (~455 MB free) by 15:22:53. Timestamp
correlation alone is not causality, but the download completing inside the window in
which the volume went from gigabytes-free to full makes it the trigger. The
"writes fell through to the container writable layer" hypothesis was FALSIFIED
(writable layer 160 kB; all 4 binds verified mounted via SHA256 match).

### CONTRIBUTING CAUSES

1. VHDX non-compaction (PROVEN): `docker builder prune -f` reclaimed 20.68 GB inside
   Docker while host C: free moved only ~2 GB. The docker_data.vhdx (151.63 GB physical)
   holds freed-but-uncompacted blocks. CORRECTION (agent A, fsutil queryAllocRanges):
   zero SPARSE slack on both large VHDXs (physical == logical); the unaccounted
   ~17 GB is VHDX-internal consumption Docker does not attribute (ext4 metadata,
   un-zeroed freed blocks), not sparse ranges. Prune without compaction does not restore
   host headroom, and compaction yield is now UNKNOWN (likely smaller than first
   estimated). Both VHDXs total 213.76 GB = ~50% of C: used.
2. Docker Desktop WSL-bind path confusion (VERIFIED): `qwen3-tts-service`'s
   `/app/models` bind resolved to a VM-side copy, not the host's
   `/home/nolan/qwen3-tts-models`. Same names, different owners/dates/sizes. 4.3 GB
   downloaded invisibly to host-side accounting, straight into docker_data.vhdx.
3. Pre-recovery accumulation left zero margin: Temp, caches, CacheClip, Dell, and
   41 GB of build cache were all at or near peak simultaneously.
4. Login-dependent stack (FAILURE_MODES.md F13): no WSL/Docker auto-recovery without
   Nolan's logon; recovery required manual intervention.

### BLAST-RADIUS AMPLIFIERS

1. Single-vantage heartbeat (PROVEN): every probe rode the WSL transport
   (pigwsl-run.sh). When Ubuntu died, the heartbeat reported Docker, PostgreSQL, and
   gateway down. All three were up. Diagnosis was wrong for the entire outage.
2. Ubuntu crash killed the observer, not just the observed: the only disk probe ran
   inside the crashed distro.
3. No auto-recovery path: the distro stayed down until manual `wsl --shutdown` +
   restart; Docker Desktop held an error dialog awaiting a click.
4. Post-recovery PostgreSQL/gateway auth loop (stale 5432 port forward on
   brain-postgres) extended the outage after WSL returned.

### MONITORING FAILURE (PROVEN, FL-20260919-RCA-001)

No pre-failure Windows-side C: capacity alert existed. The only disk probe ran
`df /` INSIDE Ubuntu, which reports the ext4 virtual filesystem, not host C:.
Health log proof: 2026-09-18 17:11 MDT shows `"disk": "ok 6%"` while host C: was
approaching 100% the next day. FAILURE_MODES.md F9 recorded disk pressure as a known
mode with "Detection: none proactive." The 5% C: free probe was added DURING recovery,
after the failure. The 5% value is reactive (10% first, lowered to 5% because
post-recovery free was only 6.1%), not derived from growth-rate analysis. No WARNING
tier, no rate input, no absolute-GB floor, no inhibition hook: breaching it only flips
a status string.

### RECOVERY WEAKNESS

1. Prune reclaimed logical space only; host free stayed ~2 GB until file deletions.
2. brain-postgres stale 5432 forward caused the gateway auth loop; required container restart.
3. Recovery destroyed forensics: Temp contents, Chrome caches, CacheClip, Dell data,
   pre-prune `docker system df -v`, build-cache composition. All marked
   evidence-destroyed in the ledger, never "lost".
4. The same failure mode recurred 16:14-16:52 (qwen3-tts-service boot download) because
   recovery restarted the writer without any inhibition.

### ARCHITECTURAL WEAKNESS (PROVEN LIVE, not theoretical)

Production PING (postgres, gateway) shares C: with unbounded AI experimentation, with
no capacity isolation and no admission control on storage-heavy work. Proof: the
failure mode recurred within the hour of recovery (qwen3-tts-service downloading
4.3 GB onto a 96% disk) and would have crashed the machine again without the
17:01 intervention. Voice cloning is paused by Nolan, yet its containers auto-restart
and download multi-GB models on boot with no gate.

## 3. C: storage accounting (post-recovery, verified)

| Path / consumer | Size | Owner/producer | Last modified | Regeneratable | Class |
|---|---|---|---|---|---|
| docker_data.vhdx (physical) | 151.63 GB | Docker Desktop | 16:52:58 MDT | n/a (infra) | DERIVED |
| Images total | 90.06 GB | docker builds | various | mostly yes | DERIVED |
| qwen3-tts-docker-cosyvoice-tts:latest | 14.1 GB | voice lane | 09-16 | yes (Dockerfile) | DERIVED |
| cosyvoice-tts:latest | 14.1 GB | voice lane | 09-08 | yes (Dockerfile) | DERIVED |
| qwen3-tts-docker-qwen3-tts:latest | 13.0 GB | voice lane | 09-08 | yes (Dockerfile) | DERIVED |
| ollama/ollama | 8.03 GB | ollama | various | yes (pull) | DERIVED |
| open-webui | 6.73 GB | open-webui | various | yes (pull) | DERIVED |
| Build cache | 20.48 GB | docker builds | mixed (10h-12d) | yes | DERIVED |
| Local volumes | 23.55 GB | containers | various | mixed | DERIVED |
| compose_ollama_data | 19.59 GB | ollama | 09-19 | yes (re-pull) | DERIVED |
| VM-side qwen3 bind copy (partial Base download) | ~4.3 GB | qwen3-tts-service boot | 09-19 16:52 | yes (re-download) | DERIVED |
| Ubuntu ext4.vhdx (physical) | 61.98 GB | WSL2 | 15:20:01 (pre-crash) | n/a (infra) | DERIVED |
| /home/nolan/ping | 16 GB | convergence lanes | 09-19 14:02 | canonical source | CANONICAL source; worktrees CLASS A |
| /home/nolan/qwen3-tts-models | 8.8 GB | voice lane | 09-10 | yes | REVIEW_REQUIRED |
| /home/nolan/cosyvoice-models | 6.46 GB | voice lane | 09-19 15:19 | yes | REVIEW_REQUIRED |
| /home/nolan/voice-factory-data | 1.4 GB | voice lane | various | corpus: review | REVIEW_REQUIRED |
| modelscope ._____temp debris | 641 MB | downloader (root) | 09-19 15:19 | yes (debris) | SAFE_DISPOSABLE (root-owned; skipped, zero C: effect) |
| 4x untracked crx-ui-next.tar | 848 MB | convergence lanes | 09-16 | review | REVIEW_REQUIRED |
| .git packs (2x 1.8 GB) | 3.6 GB | git history | 09-16/09-17 | canonical history | CANONICAL_DO_NOT_TOUCH |
| C: free (post-inhibition) | 31.872 GB (93.1%) | — | 17:06 MDT | — | — |

Windows-side NTFS detail (direct-on-C: consumers): pending agent A scan; section to
be completed on its delivery. Pre-recovery evidence destroyed by recovery is listed
in section 8, not estimated here.

Unexplained bytes (UNKNOWN, not guessed):

- Pre-15:14 C: free baseline (no snapshot): cannot apportion the final fill between
  background accumulation and the CosyVoice download.
- Per-minute consumption 15:09-15:21 MDT.
- Whether voice-clone child agents (active 15:09-15:15) ran docker builds into
  docker_data.vhdx in the window (build-cache composition at 15:14 unmeasured).
- Per-container json-log sizes (data VHDX not mounted in Ubuntu WSL).
- Composition of the VHDX-internal unaccounted ~17 GB (NOT sparse slack per agent A;
  likely ext4 metadata + un-zeroed freed blocks; compaction yield unknown).
- ~4-5 GB gap between the 16:18-16:55 C: drop (~8.8 GB) and the qwen3-tts-service
  download (4.2 GB net in): candidates are VSS shadow-copy resumption, pagefile, or
  other Windows-side writers (pending agent A).

## 4. The writer that was found (second occurrence)

`qwen3-tts-service` (image qwen3-tts-docker-qwen3-tts, restart=unless-stopped) is the
proven active writer of the 16:14-16:52 recurrence: 4.2 GB network in, 0 B block
write (binds bypass container block accounting), `/app/models` 4.3 GB dated 16:16 MDT,
logs show `Loading model: Qwen/Qwen3-TTS-12Hz-1.7B-Base ... Fetching 4 files: 100%`.
Inhibited 17:01 MDT via reversible `docker stop` (receipt R-001). C: flat since.
Note: if the container is ever `docker start`ed again, the download resumes with no
gate. This is an EXECUTION_INHIBIT-class workload (see section 7).

## 5. Prevention design: capacity states

Inputs (all required, sampled every 60 s from the Windows vantage, never from inside WSL):

- Absolute free GB on C:
- Free percentage on C:
- Consumption rate: GB/hour over trailing 15-min and 1-hour windows
- Docker growth: docker_data.vhdx physical delta over the same windows
- Infrastructure reserve: fixed 20 GB floor (VHDX burst headroom + Windows Update +
  pagefile growth + shadow copies). Never allocated to workloads.

States:

- NORMAL: free > 15% AND free > 30 GB AND 15-min rate < 1 GB/h.
  All workloads allowed. This is the only state in which optional storage-heavy
  work (model downloads, docker builds, new large image pulls, eval container
  starts) may LAUNCH.
- WARNING: free < 15% OR free < 30 GB OR 15-min rate > 2 GB/h.
  Alert the operator (not just a status flip). Inhibit NEW optional storage-heavy
  launches. Snapshot df/du/VHDX state as evidence. Running work continues.
- CRITICAL: free < 8% OR free < 15 GB OR projected exhaustion within 4 h at current rate.
  Inhibit ALL optional workloads, including container restarts that trigger
  boot-time downloads. Loud alert. Freeze non-essential writes.
- EXECUTION_INHIBIT: free < 5% OR free < 8 GB OR projected exhaustion within 2 h.
  Block optional workload starts entirely at the launch hook. Only PING-critical
  services (postgres, gateway, redis, qdrant, vault) may run or restart. Page Nolan.

Calibration notes (audit, not acceptance): the crash occurred at 0.1% (~0.5 GB).
5% of 463 GB = 23 GB, roughly 4x the largest observed single burst (6.4 GB), so 5%
is a defensible EXECUTION_INHIBIT floor, not a WARNING. The old single threshold
(5% -> DEGRADED status only) is rejected as policy: it had no tiers, no rate input,
and no inhibition. Rate matters more than static levels: at the observed 15 GB/h
leak, even WARNING gives under 2 h of lead time.

Launch hook (where inhibition binds): every path that starts optional heavy work
must consult the state first: `docker run`/`docker start` wrappers for TTS/voice/eval
containers, model-download entry points, and build invocations. Prefer refusing the
launch with a clear reason over any automatic deletion. Never auto-delete to make
room: preserve evidence, inhibit instead.

## 6. Multi-vantage health design

States per component: HEALTHY, DEGRADED, UNREACHABLE_FROM_THIS_VANTAGE,
DEPENDENCY_FAILURE, CONFIRMED_DOWN, UNKNOWN.

Vantages (probed independently; no vantage derives another's state):

- Windows (ssh/powershell/npipe): C: capacity, WSL distro list/state, Docker Desktop
  process, docker engine via npipe (`docker version`), container states, port checks.
- Ubuntu WSL (pigwsl-run.sh): distro liveness, docker CLI, container states.
  This vantage DIES with the distro; its silence is data about the transport, not
  about Docker.
- Docker engine: daemon reachable, per-container state.
- PING containers: postgres, gateway, redis, qdrant, vault individually.
- PostgreSQL / gateway: protocol-level checks (pg_isready, HTTP /health), not
  container-state inference.
- Oracle: control/authority/durability plane reachability (see section 7).
- Network: Tailscale/proxy/SSH banner.

Composition rules (the incident's lesson):

1. A WSL transport failure marks WSL UNREACHABLE_FROM_THIS_VANTAGE and everything
   behind it UNKNOWN, never down. The 15:26 "docker=down / postgres=bad missing /
   gateway=bad missing" readings are the canonical example of the forbidden inference.
2. CONFIRMED_DOWN requires either the owning vantage to report it or two independent
   vantages to agree.
3. DEPENDENCY_FAILURE is for "X is up but its dependency is confirmed down"
   (e.g., gateway DEPENDENCY_FAILURE when postgres is CONFIRMED_DOWN), distinct from
   X being down itself.
4. Disk capacity is a Windows-vantage measurement. The WSL-side `df /` probe is
   retired as a capacity signal (it measures the virtual disk); it may remain as a
   distro-health signal only.

## 7. Oracle acceptance test (design only, no migration)

Objective: prove Oracle owns control, authority, and durability while the Pig owns
execution, GPU, and browser work, such that disabling Pig/WSL leaves PING alive.

Preconditions: Oracle reachable; canonical event/mission/evidence stores dual-homed
or replicated per the Runtime Distribution v1 milestone (not built in this pass).

Test script:

1. Baseline: from Oracle, read canonical events, open missions, and evidence for a
   known mission id. Record counts/hashes. From the Pig, confirm the same via gateway.
2. Disable: `wsl --shutdown` on the Pig (or stop the Ubuntu distro). Do not touch Oracle.
3. Assert (Oracle vantage): PING API alive; canonical events, missions, and evidence
   still readable and unchanged; no new canonical writes are lost (they queue or the
   control plane reports Pig executor unavailable, explicitly).
4. Assert (Pig vantage): only the Pig executor is reported unavailable; nothing
   reports canonical data as missing or destroyed.
5. Re-enable: start WSL/Ubuntu; Pig executor re-registers with Oracle (explicit
   re-registration, not silent resume).
6. Assert: executor resumes assigned missions; no duplicate mission execution
   (idempotency on re-registration); event/mission counts reconcile with baseline.

Pass criteria: steps 3-4 hold with zero canonical-data unavailability; step 6 shows
no duplication. Fail criteria: any canonical read fails while Pig is disabled, or a
re-registered executor double-executes. This test is the acceptance gate for the
Runtime Distribution v1 Oracle cutover; it is not run in this pass.

## 8. Evidence destroyed by recovery (recorded, not estimated)

- `C:\Users\nolan\AppData\Local\Temp` contents (4.18 GB)
- Chrome Default Cache + Code Cache (~0.28 GB)
- `C:\Users\nolan\Videos\CacheClip` (23.59 GB)
- `C:\ProgramData\Dell` (3.96 GB)
- Pre-prune `docker system df -v` (no inventory captured)
- Docker build-cache composition at 15:14 (41.16 GB pre-prune)
- Pre-prune writable-layer sizes, per-container log sizes
- Exact bytes of Temp/cache/CacheClip/Dell composition

All are marked evidence-destroyed in the failure ledger (FL-20260919-RCA-001..007).
UNAVAILABLE is used only for the Git commits question, which was resolved: both
commits EXIST and are small (the "large Git objects" attribution was falsified).

## 9. Reconciliation receipts (this pass)

- R-001 (~16:55 MDT): `docker stop -t 30 qwen3-tts-service` -> Exited (137). Reversible via
  `docker start qwen3-tts-service` (FORBIDDEN while voice cloning paused). Reason: active
  4.3 GB model download onto 96% C:; voice program paused; zero active connections;
  no dependents. Before: C: 22.36 GB free and falling ~150-250 MB/min. After: one-time
  +9.5 GB step to 31.872 GB (mechanism OPEN, safe direction), then flat 0 GB/h across
  T0->T1 (~7 min, 16:59-17:06 MDT).
- R-002 (17:06 MDT): surgical order executed (Axioms S1-S3, Phases A-C). Writer PROVEN
  and CONTAINED. No active leak. NO migration destination exists (single 512 GB NVMe,
  C: only). Phases D/F/G blocked. VHDX compaction NOT AUTHORIZED (needs explicit
  operator approval + `wsl --shutdown` downtime). Full detail: FL-20260919-RCA-008.
- R-003 (17:05 MDT): agent A Windows accounting complete (read-only). VHDX inventory via
  fsutil: docker_data.vhdx 151.63/151.63 GB (slack 0); Ubuntu ext4.vhdx 62.01/62.01 GB
  at `C:\Users\nolan\AppData\Local\wsl\{a112dee4-421d-4e51-81a9-46c985479613}\`
  (custom Lxss BasePath; slack 0). Combined 213.76 GB = ~50% of C: used. CORRECTION:
  the ~17 GB "slack" was falsified as sparse slack (physical == logical); compaction
  yield now UNKNOWN. New large consumers: pigi browser profiles 15.60 GB, opencode
  10.76 GB (opencode.db 8.13 GB, ongoing-growth candidate, do not touch), Chrome
  9.98 GB (weights.bin 3.98 GB). VSS 0 bytes. Full: ~/workspace/pig/rca-agentA-storage.md.
  Ledger: FL-20260919-RCA-009.
- Blockers: (B-001) no migration destination exists, only C:; (B-002) VHDX compaction
  needs wsl --shutdown (brief full PING downtime), deferred pending agent A;
  (B-003) 641 MB temp debris root-owned, zero C: effect without Ubuntu VHDX compaction.

## 10. Remaining work (not done in this pass)

1. Agent A Windows-side accounting (in flight at report time); should also resolve the
   +9.5 GB one-time step (22.36 -> 31.872 GB, ~16:56-16:59 MDT).
2. Phase 10 (SUSPENDED by surgical order — needs explicit operator authorization):
   compact docker_data.vhdx (VHDX-internal freed blocks; yield UNKNOWN after agent A
   falsified the sparse-slack estimate) via wsl --shutdown +
   Optimize-VHD, then restart Docker Desktop and verify all PING containers.
   Expected result: C: 93.1% -> ~89-91%. Do NOT execute under current orders.
3. Implement the section 5 capacity states and section 6 multi-vantage health.
4. Bind the launch hook (section 5) to TTS/voice/eval container starts and model downloads.
5. Operator decisions needed (via the single GRILLING-BRIEF surface, not here):
   qwen3-tts-models 8.8 GB, cosyvoice-models 6.46 GB, 848 MB duplicated tars,
   28.34 GB reclaimable images, 20.48 GB build cache triage, named orphan volumes.

## 11. Drive disappearance diagnosis (2026-09-19 ~17:10-17:22 MDT, root-cause pass)

**WHERE DID GOOGLE DRIVE GO? Answer: it never crashed and was never uninstalled. It autostarted after Nolan's manual reboot on 9/16 10:00 AM, exited cleanly within ~1 second before mounting G:, and has not run since.**

Verified timeline:
- 2026-09-16 09:59:37 MDT: Windows restart initiated by StartMenuExperienceHost.exe on behalf of Pig\nolan (manual Start-menu restart, unplanned reason code).
- 2026-09-16 10:00:12 MDT: boot completed.
- 2026-09-16 10:00:56 MDT: Google Drive for desktop 130.0.2.0 autostarted via HKCU Run entry (`GoogleDriveFS.exe --startup_mode`). Child process exited code 0 within ~70ms. Parent: "not restarting and exiting." No crash report, no event-log error, no Drive log error.
- 2026-09-19 17:10 MDT: still no Drive process, no G: mount. Installed, signed in (refresh tokens in DriveFS config), configured: mount G:, streaming mode, 2 accounts, mirror root "PING" (145,859 items, ~6.29 GB at C:\Users\nolan\PING).

Configuration evidence (VERIFIED): `autostart_on_login: true`, `mount_point_path: "G"`, `show_mount_point_in_sidebar: true`. Registry `HKCU\SOFTWARE\Google\DriveFS\Share` present. Driver `googledrivefs31931.sys` loaded and running. StartupApproved\Run has no GoogleDriveFS entry (absence is not proof of disabled status).

Restoration attempts (authorized, non-destructive, 2026-09-19 ~17:14 and 17:15 MDT):
- Launch with `--startup_mode`: child exited code 0, no mount.
- Launch without flag: child reached UI init, then "Failed Create WebView2 controller - 0x80070578" -> UI_FATAL_ERROR (80103) -> exit 0x24 -> parent restart loop (7 restarts) -> parent gave up. No process remains; no runaway loop.
- Interpretation: in a headless SSH session Drive's WebView2 UI cannot initialize (expected environmental limitation, not proof of broken install). The 9/16 interactive-session early exit logged no error; its internal reason is UNKNOWN.

Drive cache pressure (VERIFIED, NEUTRAL): `C:\Users\nolan\AppData\Local\Google\DriveFS` = ~1.084 GB total; metadata DBs ~1.0 GB, content_cache ~5 MB, thumbnails ~1 MB. Drive cache did NOT cause this incident.

Streaming vs mirror (VERIFIED): Drive was configured for BOTH a streaming virtual mount at G: AND a mirrored local root at C:\Users\nolan\PING (~6.4-8.4 GB). Copying into the mirrored root does not free C: space. Only the streaming mount helps for offload, and it requires the app running.

**Action required: Nolan must launch Google Drive once from his interactive desktop session (Start menu). If it exits there too, deeper repair is needed. Until G: is restored and healthy, no migration design is executed.**

## 12. Writer proof validation + the unexplained +9.5 GB (reconciliation)

- Recurrence writer (PROVEN, retained): qwen3-tts-service auto-restarted during recovery and downloaded Qwen3-TTS-12Hz-1.7B-Base (~4.2-4.3 GB) into docker_data.vhdx. Contained by `docker stop -t 30 qwen3-tts-service` ~16:55 MDT (exit 137). Do not restart.
- Growth velocity since containment: 0 GB/hour (VHDXs flat at 151.63 / 62.01 GB, mtimes stable 17:13).
- The +9.5 GB C: free step (~16:56-16:59 MDT): remains OPEN/UNEXPLAINED. It reversed the recurrence exactly (31.8 -> 23 -> back to 31.84). VSS currently 0 bytes, no shadows; historical auto-purge unproven. Leading hypothesis: deleted-but-open temp files released when the container stopped, or Windows reclaiming temp/cache; cannot be proven from current state.
- Original trigger (HIGH-CONFIDENCE INFERENCE, retained): CosyVoice ModelScope download (~5.70 GB + ~671 MB debris) ~15:15-15:19 MDT.
- Falsified this pass: the "17 GB sparse VHDX slack" estimate. Physical == logical on both large VHDXs (fsutil alloc-range sums). Compaction yield is unknown, not 17 GB.
- Google Drive (DISPROVEN as contributor): ~1 GB cache, not running during incident, no mechanism to write multi-GB.

## 13. Root cause vs amplifiers vs symptoms (adjudicated)

- ROOT CAUSE: ungoverned capacity on one shared 463 GB C: volume. No meaningful reserve, no growth monitoring, no launch inhibition for optional heavy model downloads, no warning thresholds. Optional downloads (CosyVoice, Qwen3-TTS) could run to disk exhaustion with nothing stopping them.
- DIRECT WRITERS: CosyVoice ModelScope download (likely original, ~6.4 GB) and qwen3-tts-service Qwen3-TTS model download (proven recurrence, ~4.3 GB).
- AMPLIFIERS: Docker VHDX 151.63 GB (90 GB images with 28 GB reclaimable, 20.5 GB build cache, 23.5 GB volumes) + Ubuntu VHDX 62.01 GB = ~213.6 GB (~50% of used C:) all sharing the single volume with user data and Windows.
- SYMPTOM/CONTAINER: docker_data.vhdx size is where the bytes sit, not the mechanism.
- NOT MATERIAL: Google Drive cache (~1 GB), VSS (0 bytes), pagefile-class files (sizes unknown but not incident writers).
- CASCADE MECHANISM (PROVEN): C: full -> Ubuntu VHDX writes fail -> Ubuntu unreachable -> WSL-dependent probes fail -> downstream services falsely appear down.

## 14. Full C: inventory: KEEP LOCAL / DRIVE CANDIDATES / UNKNOWN (top items)

KEEP LOCAL (active compute, canonical, or forbidden to move):
- docker_data.vhdx 151.63 GB (Docker active images/containers/volumes; never move internals to Drive)
- Ubuntu ext4.vhdx 62.01 GB (active WSL distro; /home/nolan/ping 16.6 GB, qwen3-tts-models 9.4 GB, projects 7.3 GB, cosyvoice-models 6.5 GB, worktrees 5.0 GB, archives 4.6 GB, research 3.1 GB)
- Postgres + Qdrant data (inside Docker volumes; canonical runtime state)
- Active Git repos/worktrees (ping-convergence-worktree 3.27 GB)
- Chrome on-device model weights.bin 3.98 GB (DERIVED, regeneratable; keep unless space forces)
- pigi engagement browser profiles 15.6 GB (DERIVED, re-login regeneratable; keep for now per cache rule)
- opencode.db 8.13 GB (session history; DERIVED)
- hermes data 5.06 GB (UNKNOWN authority; keep, classify later)
- UWP Packages 5.44 GB, Programs 5.36 GB (installed software)

DRIVE MIGRATION CANDIDATES (inactive, low-churn, originals retained until verified; EXECUTE ONLY after G: healthy):
- C:\Users\nolan\PING mirror content (~6.4-8.4 GB): already mirrored to Drive; eligible for cloud-only transition once streaming mount works (frees local mirror bytes)
- WSL archives 4.6 GB (inactive datasets; copy as tar archives, never live dirs)
- WSL research 3.1 GB (inactive snapshots; copy, verify, retain original)
- CascadeProjects 4.06 GB (project dir; classify active vs finished first)
- C:\Users\nolan\research 2.85 GB (inactive)
- Inactive model dirs inside Ubuntu only if proven unused (cosyvoice-models 6.5 GB: classify; qwen3-tts-models 9.4 GB: KEEP, voice cloning paused not abandoned)
- Database dumps to Drive (Postgres pg_dump of ping_events/ping_missions; scheduled; never live DB files)
- Finished reports/artifacts/evidence exports from ~/workspace/your_files (DERIVED, already durable elsewhere)

UNKNOWN (classify before any decision): hermes 5.06 GB, .codex 1.37 GB, uv 1.23 GB, qwen3-tts-docker 1.20 GB, .vscode 1.09 GB, pnpm 0.78 GB, OpenAI 0.71 GB, ms-playwright 0.68 GB.

## 15. Capacity budget (463 GB C: volume, computed)

- NORMAL: >= 100 GB free (>= 21.6%)
- WARNING: < 80 GB free (< 17.3%)
- CRITICAL: < 60 GB free (< 13.0%)
- EMERGENCY: < 40 GB free (< 8.6%)
- Launch inhibition: any optional model download, Docker build, or package operation must declare expected bytes; if projected post-op free < CRITICAL, the operation does not start.
- Current: 31.9 GB free (6.9%) = EMERGENCY. To reach WARNING: free 48.1 GB. To reach NORMAL: free 68.1 GB. Convergence builds/tests/package ops/Docker builds stay frozen until < 90% used (41.7 GB free).
- Monitoring: C: free + growth velocity; both VHDX sizes/deltas; per-container network/download activity; Docker logs/volumes/images/build cache; Drive mount health; backup age; optional-work launch gate.

## 16. Long-term storage solution (recommended)

C: stays the LOCAL ACTIVE COMPUTE plane (Windows, Docker VHDX, Ubuntu VHDX, active DBs, active models, active repos/worktrees, bounded caches). It cannot be relieved by relocation: there is no second local disk, no USB, no network shares, and Drive streaming is not block storage for VHDXs.

Google Drive (streamed, cloud-backed) becomes the DURABLE LOW-CHURN plane: reports, docs, archives, finished artifacts, exports, database dumps, config backups, repo bundles/snapshots, evidence packages, inactive datasets. Mirror of C:\Users\nolan\PING transitions to cloud-only once streaming is healthy.

Oracle becomes the PRODUCTION runtime plane later, receiving only a deliberately built runtime distribution (never raw artifacts, never live DBs), after runtime-distribution and deployment gates are satisfied.

Prevention: capacity states above + launch inhibition + writer monitoring are the fix for the root cause. Compaction (STORAGE-001) is a one-time lever, not a strategy; it is frozen per Nolan's keep-VHDX direction until he says otherwise.

## 17. Path below 90% (explicit authorization boundaries)

Option A (recommended, needs Nolan): launch Google Drive interactively -> verify G: healthy -> migrate inactive candidates (section 14) via COPY -> VERIFY (hash/count) -> switch reference -> retain original. Estimated yield: 10-20 GB depending on classification.
Option B (needs Nolan): VHDX compaction (STORAGE-001). Yield unknown (slack theory falsified); Docker-internal prune already done; risk: VHDX operations on 150+ GB files. Frozen until Nolan's word.
Option C (needs Nolan per image): delete specific Docker images Nolan names as unused. Forbidden: prune -a, volume prune, image prune -a.
Option D (highest-confidence bloatware): EXHAUSTED this pass. No unambiguous candidates found (Spotify 410 MB is active use; Xbox overlays 62 MB immaterial/OS-adjacent; Dell bloat already removed). Nothing deleted.
Nothing in this plan deletes user data, worktrees, VHDXs, DBs, caches, or trash.

## 18. Open unknowns

1. The +9.5 GB C: free step (~16:56-16:59 MDT): mechanism unproven.
2. Why Drive's child exited cleanly at 9/16 interactive autostart: not logged.
3. VHDX compaction yield: unknown (prior slack estimate falsified).
4. hermes 5.06 GB, .codex 1.37 GB contents/authority: unclassified.
5. qwen3-tts-models 9.4 GB vs voice-cloning-paused: keep (not abandoned).
6. cosyvoice-models 6.5 GB active vs inactive: classify before any move.
