# Flashdrive / N: staged move plan — 2026-09-29 (Pig C: storage audit lane)

Status: READ-ONLY AUDIT. Nothing moved, nothing deleted tonight.
Deliverable owner: Pigi operator. Execute only on Nolan's word.

## 1. Baseline (verified 2026-09-29 ~19:40-19:55 MDT)

- C: 463G total, 440G used, 23G free, 96% used. Stop line: 3% free (~13.9G). Current margin ~9G.
- /mnt/: only `c`, `wsl`, `wslg`. No D:/E: flashdrive mounted (confirmed). "Fill up the flashdrive" is pending hardware: Nolan must plug one in first.
- NUSYN 1TB (drive N:) has NOT arrived. ETA ~1 week from 2026-09-29. Plan targets it as the capacity plane when it lands.

### Top C: consumers (ranked, live readings tonight)

1. /mnt/c/Users/nolan/AppData/Local/wsl/{a112dee4-421d-4e51-81a9-46c985479613}/ext4.vhdx — **119G** (mtime 19:45 tonight, live WSL Ubuntu distro). HOT. DO NOT MOVE. WSL distros must stay on internal NTFS; moving a live distro vhdx to USB/exFAT breaks WSL and is unsupported mid-convergence.
2. /mnt/c/Users/nolan/AppData/Local/Docker/wsl/disk/docker_data.vhdx — **106G** (mtime 19:45 tonight, live). HOT. DO NOT MOVE. Docker data-root on external media is unsupported and slow.
3. /mnt/c/Windows — ~26G, /mnt/c/Program Files — ~15G, /mnt/c/ProgramData — ~4.1G, /mnt/c/Program Files (x86) — ~3.3G (OS/apps, from the on-Pig native audit earlier today; a later 9P-based `du` gave unreliable system-dir totals — including an impossible 2.1E for Windows from junction double-counting — so these native-audit figures stand).
5. /mnt/c/Temp — 943M, /mnt/c/tmp — 262M (stale temp, PHASE 1 candidates; live readings 2026-09-29 ~20:00 MDT; the earlier on-Pig audit had logged 2.7G before its cleanup).
6. Stale WSL swap vhdx files under AppData/Local/Temp: 132M (Sep 27) + 228M (Sep 29 18:36) (PHASE 1 candidate, verify unheld first).
7. /mnt/c/$Recycle.Bin — ~357M (PHASE 1 candidate via empty recycle bin).
8. Home-dir bulk (sizes from tonight unless noted): Documents 396M, Downloads 118M, Projects.zip 45M, Videos top-level 6.3M, OneDrive 3.5M. Hundreds of loose research/report files at C:\Users\nolan root (pending total size from background scan; PHASE 2 archive candidates).
9. Agent/updater caches (from on-Pig audit today): @opencode-aidesktop-updater + antigravity-updater + obsidian-updater ~0.7G, Electron cache ~0.4G (PHASE 1 candidates).
10. Docker images: 92.53G total, **17.38G reclaimable** per `docker system df` (PROPOSAL ONLY: requires container audit first; this is a prune, not a move).

### Explicitly NOT in this plan (HOT, stay on internal NVMe)

- ext4.vhdx 119G, docker_data.vhdx 106G.
- /mnt/c/Users/nolan/PING (canonical repo 6.3G live), worktrees (ping-convergence-worktree 3.4G), live DBs/Postgres data.
- AppData/Local/Google (Chrome user data 8.0G live 2026-09-29), AppData/Local/hermes (4.9G), .codex (1.5G), .cursor (562M), .devin, .vscode, .gemini (agent/editor data: demotion needs Nolan's review, not an audit-lane call). CrashDumps 21M.
- /mnt/c/Users/nolan/research (3.0G live), Documents, user media.

## 2. Tier layout (from nusyn-1tb-plan.md)

- HOT (internal NVMe, stays): active worktrees, live DBs, WSL2 ext4 checkouts, the two vhdx files above.
- WARM (N: capacity plane when it arrives; flashdrive D:/E: as stopgap): logs, screenshots, old artifacts, stale downloads, loose research reports, media working copies.
- COLD (N:\ARCHIVE, later a second device/cloud): backups, old workspaces, forensic material. N: alone is NOT a backup; irreplaceable material needs a second verified copy before its C: copy is deleted.

## 3. Phase 0 — verification (runs before any move; no data movement)

Goal: establish byte-exact baselines and confirm the destination exists and is writable.

Step 0.1 — confirm destination.
```
~/workspace/bin/pigwsl-exec "ls /mnt/"
```
Expected: `d` or `e` (flashdrive) or `n` (NUSYN) present. If absent, STOP: phases 1-2 cannot proceed; remain in conservative mode.

Step 0.2 — record baselines for every candidate.
```
~/workspace/bin/pigwsl-exec "du -sb /mnt/c/Temp /mnt/c/Users/nolan/AppData/Local/Temp 2>/dev/null | tee /tmp/phase0-baseline.txt"
~/workspace/bin/pigwsl-exec "df -h /mnt/c | tee -a /tmp/phase0-baseline.txt"
```
Copy /tmp/phase0-baseline.txt to ~/workspace/pig-storage/phase0-baseline-2026-09-29.txt on this VM.

Step 0.3 — per-candidate file inventory (example: Temp).
```
~/workspace/bin/pigwsl-exec "find /mnt/c/Temp -type f | wc -l"
~/workspace/bin/pigwsl-exec "du -sb /mnt/c/Temp"
```
Record: file count + byte count. These two numbers are the verification anchors for the phase.

Rollback for Phase 0: nothing moved; no rollback needed. If any baseline command fails, STOP and report.

## 4. Phase 1 — safe bulk (logs/temp/screenshots; target ~3-5G)

Order: smallest risk first. Each step: move (never copy-then-hope), verify byte counts, then delete source.

### Step 1.1 — stale WSL swap.vhdx files (360M)

Source files (verified 2026-09-29):
- /mnt/c/Users/nolan/AppData/Local/Temp/1DC45FF1-7678-424A-A274-92A777EF7F35/swap.vhdx (132M, Sep 27)
- /mnt/c/Users/nolan/AppData/Local/Temp/DE02B3CC-E5EA-4647-8695-701943EB00CC/swap.vhdx (228M, Sep 29 18:36)

Verify unheld first (a vhdx under Temp with today's mtime may belong to a live WSL session):
```
~/workspace/bin/pigwsl-exec "wsl.exe -l -v"
```
Only proceed for files whose session is NOT in the running list. If in doubt, SKIP the Sep 29 file.

Move commands (destination D: shown; substitute /mnt/n for N:):
```
~/workspace/bin/pigwsl-exec "mkdir -p /mnt/d/WARM/logs && mv /mnt/c/Users/nolan/AppData/Local/Temp/1DC45FF1-7678-424A-A274-92A777EF7F35/swap.vhdx /mnt/d/WARM/logs/swap-20260927.vhdx"
```
Verification:
```
~/workspace/bin/pigwsl-exec "ls -l /mnt/d/WARM/logs/swap-20260927.vhdx; du -sb /mnt/d/WARM/logs/swap-20260927.vhdx"
```
Compare byte count to the Phase 0 baseline (132M = 138412032 bytes expected; recheck live at execution). Then spot checksum:
```
~/workspace/bin/pigwsl-exec "sha256sum /mnt/d/WARM/logs/swap-20260927.vhdx | head -c 16"
```
Note: source is already moved, so checksum is a transfer-integrity record only; the byte-count match is the gate. Source dir left behind is empty; remove only the empty GUID dir:
```
~/workspace/bin/pigwsl-exec "rmdir /mnt/c/Users/nolan/AppData/Local/Temp/1DC45FF1-7678-424A-A274-92A777EF7F35"
```
Rollback: file is intact at /mnt/d/WARM/logs/; move it back with `mv` if needed. No data destroyed.

### Step 1.2 — C:\Temp + C:\tmp stale files (~1.2G: 943M + 262M live 2026-09-29)

Also covers %LOCALAPPDATA%\Temp (1.8G live 2026-09-29, includes the Step 1.1 swap.vhdx files). Same move-first pattern; only files older than 7 days.

List first, move only files older than 7 days (keeps anything a running installer may need):
```
~/workspace/bin/pigwsl-exec "find /mnt/c/Temp -type f -mtime +7 | wc -l"
~/workspace/bin/pigwsl-exec "find /mnt/c/Temp -type f -mtime +7 -exec du -sb {} + | awk \"{s+=\$1} END {print s}\""
```
If the operator confirms the numbers, move (not delete) to WARM:
```
~/workspace/bin/pigwsl-exec "mkdir -p /mnt/d/WARM/temp-archive && find /mnt/c/Temp -type f -mtime +7 -exec mv -t /mnt/d/WARM/temp-archive {} +"
```
Verification:
```
~/workspace/bin/pigwsl-exec "find /mnt/d/WARM/temp-archive -type f | wc -l; du -sb /mnt/d/WARM/temp-archive"
~/workspace/bin/pigwsl-exec "find /mnt/c/Temp -type f -mtime +7 | wc -l"
```
Post-move stale count must be 0 and destination count must equal the Phase 0 stale count.
Rollback: files are intact under /mnt/d/WARM/temp-archive; `mv` back if anything breaks within 48h. After 48h clean with Nolan's word, delete the archive.

### Step 1.3 — updater and Electron caches (~1.1G)

Candidates (from on-Pig audit today): AppData/Local/@opencode-aidesktop-updater, AppData/Local/antigravity-updater, AppData/Local/electron (verify names live at execution; the Aug 29 `devin` and `obsidian-updater` dirs seen in the Local listing are adjacent candidates — confirm each is a pure updater cache before including).

Per-candidate pattern:
```
~/workspace/bin/pigwsl-exec "du -sb /mnt/c/Users/nolan/AppData/Local/@opencode-aidesktop-updater | tee -a /tmp/phase1-cache-baseline.txt"
~/workspace/bin/pigwsl-exec "mkdir -p /mnt/d/WARM/caches && mv /mnt/c/Users/nolan/AppData/Local/@opencode-aidesktop-updater /mnt/d/WARM/caches/"
~/workspace/bin/pigwsl-exec "du -sb /mnt/d/WARM/caches/@opencode-aidesktop-updater"
```
Byte counts must match before the source path is considered gone (mv already removed it; the match proves the transfer).
Rollback: `mv` the directory back to AppData/Local. Updater caches regenerate on next update check, so worst case is a re-download, not data loss.

### Step 1.4 — t1-shots screenshots (small, pending live size)

- /mnt/c/Users/nolan/t1-shots/*.png (cop-desktop.png, hpp-desktop.png, etc.)
- Move to /mnt/d/WARM/screenshots/t1-shots/, verify with `find -type f | wc -l` and `du -sb` on both sides.
Rollback: move back; screenshots are archival, zero runtime references.

## 5. Phase 2 — archives (loose reports, old artifacts, media; target sized at execution)

Gate: Phase 1 verified green AND destination has 3x headroom over the candidate set. Each candidate gets its own Phase-0-style baseline (file count + `du -sb` + spot sha256) before moving.

### Step 2.1 — loose home-dir research/report files

C:\Users\nolan root holds hundreds of .md/.ps1/.json/.csv artifacts (forensic reports, discovery docs, diff files, timeline CSVs). These are archival, not referenced by running services.

Procedure per batch (batch by prefix, e.g. MUSE_*, CRX_*, *REPORT*):
```
~/workspace/bin/pigwsl-exec "ls /mnt/c/Users/nolan/MUSE_* 2>/dev/null | wc -l"
~/workspace/bin/pigwsl-exec "du -sb /mnt/c/Users/nolan/MUSE_* 2>/dev/null | awk \"{s+=\$1} END {print s}\""
~/workspace/bin/pigwsl-exec "mkdir -p /mnt/d/WARM/reports && mv /mnt/c/Users/nolan/MUSE_* /mnt/d/WARM/reports/"
~/workspace/bin/pigwsl-exec "ls /mnt/d/WARM/reports/MUSE_* | wc -l; du -sb /mnt/d/WARM/reports | head -1"
```
Counts must match; leftover source glob must expand to nothing.
REQUIREMENT: irreplaceable forensic originals need a second verified copy before the C: copy is deleted. Since this step MOVES (source gone after mv), the WARM copy IS the copy; for anything Nolan flags irreplaceable, copy to COLD (second device/cloud) first, then move.

### Step 2.2 — stale downloads review

Downloads is 118M. List, Nolan eyeballs, move agreed-stale items to /mnt/d/WARM/downloads-staging/. Same verify pattern. Never bulk-move Downloads blind.

### Step 2.3 — media working copies (pending sizes from background scan)

Candidates: DaVinci Resolve Media, VoiceCaptures, Videos/CacheClip, Videos/Captures, Videos/Screen Recordings (Media_Processing_Work confirmed tiny at 744K live, no action needed). Move to /mnt/d/WARM/media/ with per-dir `du -sb` + `find -type f | wc -l` verification and a 5-file sha256 spot sample.

### Step 2.4 — COLD backups

Only after WARM is stable: copy (not move) finished archives to N:\ARCHIVE when NUSYN arrives. Copy, verify (`du -sb` equal + sha256 spot), keep WARM as the working copy until a second device/cloud holds COLD.

## 6. Immediate cleanups — PROPOSALS ONLY (execute nothing without Nolan)

P1. Empty Recycle Bin (~357M). Exact command (PowerShell, run on Pig):
```
powershell.exe -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"
```
Verify: `df -h /mnt/c` before/after; expect ~357M freed.

P2. Clear stale %TEMP% files older than 7 days (user temp, overlaps Phase 1.2 partially; do Phase 1.2 instead of this if the plan is approved, not both blindly):
```
~/workspace/bin/pigwsl-exec "find /mnt/c/Users/nolan/AppData/Local/Temp -type f -mtime +7 -delete"
```
Verify: `du -sh /mnt/c/Users/nolan/AppData/Local/Temp` before/after. NOTE: `-delete` is destructive; prefer the Phase 1.2 move-first pattern.

P3. Docker image prune (17.38G reclaimable per `docker system df`). Requires container audit first:
```
~/workspace/bin/pigwsl-exec "docker system df"
~/workspace/bin/pigwsl-exec "docker ps -a --format \"table {{.Names}}\t{{.Image}}\t{{.Status}}\""
```
Only prune images with no running/stopped container referencing them AND Nolan's confirmation that no image is a pinned build env:
```
~/workspace/bin/pigwsl-exec "docker image prune -a --filter \"until=720h\""
```
Verify: `docker system df` before/after + `df -h /mnt/c`.

P4. Do NOT do tonight: compacting either vhdx (needs WSL/Docker stopped; service interruption; owner gate), touching AppData/Local/Google or hermes, deleting any agent data dir.

## 7. Verification standard (every phase)

1. `du -sb <src>` before, `du -sb <dst>` after: byte counts must match exactly.
2. `find <path> -type f | wc -l` before/after: file counts must match.
3. Spot sha256: 5 files per batch (or all files if fewer than 5), recorded in ~/workspace/pig-storage/phaseN-checksums-2026-09-29.txt.
4. `df -h /mnt/c` before/after each phase: freed space must reconcile with moved bytes (within filesystem slack).
5. Abort rule: if C: free drops below 3% at any check, STOP all phases immediately and report.

## 8. Rollback notes (per phase)

- Phase 0: no movement, no rollback needed.
- Phase 1: every step is a `mv` to /mnt/d/WARM/... (or /mnt/n/...). Nothing is deleted. Rollback = `mv` the item back to its original C: path. Keep the WARM tree intact until Nolan confirms the freed space is stable (48h).
- Phase 2: same `mv` discipline. For irreplaceable items, the COLD second copy must verify before the WARM copy becomes the only copy.
- Destructive commands (Clear-RecycleBin, -delete, docker prune) have NO rollback: they are proposals requiring Nolan's explicit word, run only after Phases 0-1 prove the verification discipline.
