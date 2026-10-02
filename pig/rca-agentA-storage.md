# RCA Agent A: Windows-side C: storage accounting (post-recovery, READ-ONLY)
**Measured:** 2026-09-19 ~16:44-17:05 MDT via `ssh pigwsl` + PowerShell (no writes, no deletes, no restarts).
**Volume state:** C: total 462 GB | free 31.93 GB (6.9%) | used ~430 GB.
Evidence grades: VERIFIED / HIGH-CONFIDENCE INFERENCE / POSSIBLE / UNKNOWN.

## VHDX inventory (physical vs logical)

| PATH | LOGICAL | PHYSICAL (allocated) | SLACK | LAST MODIFIED | PRODUCER | REGENERATABLE? |
|---|---|---|---|---|---|---|
| `C:\Users\nolan\AppData\Local\Docker\wsl\disk\docker_data.vhdx` | 151.63 GB | 151.63 GB | 0 GB | 2026-09-19 16:46 | Docker Desktop data distro (VERIFIED) | No (images/containers); build cache already pruned |
| `C:\Users\nolan\AppData\Local\wsl\{a112dee4-421d-4e51-81a9-46c985479613}\ext4.vhdx` | 62.01 GB | 62.01 GB | 0 GB | 2026-09-19 16:46 | WSL Ubuntu distro (VERIFIED via HKCU Lxss BasePath) | No |
| `C:\Users\nolan\AppData\Local\Docker\wsl\main\ext4.vhdx` | 0.12 GB | 0.12 GB | 0 GB | 2026-09-19 16:46 | Docker Desktop distro (VERIFIED) | Yes |
| `...\AppData\Local\Temp\{GUID}\swap.vhdx` | 0.04 GB | n/m | n/m | 2026-09-19 16:13 | WSL swap (HIGH-CONFIDENCE INFERENCE) | Yes |

Physical measured via `fsutil file queryAllocRanges` (allocated-range sum). **Zero sparse slack on both large VHDXs**: the 16:00-16:20 `docker system prune` (~20 GB reclaimed per Docker) freed space *inside* the VHDX's ext4, not on the host NTFS. Host free went only ~2 GB -> 31.84 GB because the VHDX was never compacted. Combined VHDX footprint: **213.76 GB of 430 GB used (~50%)**.

Note: Ubuntu lives at a *custom* BasePath `AppData\Local\wsl\{guid}\`, NOT the default `Packages\CanonicalGroupLimited.Ubuntu*\LocalState\` path (no vhdx there). Both `Ubuntu` and `docker-desktop` report state Running as of 16:46.

## Top-15 largest directories on C: (current, post-recovery)

| # | PATH | SIZE | LAST MODIFIED | PRODUCER (grade) | REGENERATABLE? | CANONICAL/DERIVED/UNKNOWN |
|---|---|---|---|---|---|---|
| 1 | `...\AppData\Local\Docker` (docker_data.vhdx) | 151.78 GB | 2026-09-19 16:46 | Docker Desktop (VERIFIED) | Partial (cache pruned already) | DERIVED (container layers/images) |
| 2 | `...\AppData\Local\wsl` (Ubuntu ext4.vhdx) | 62.01 GB | 2026-09-19 16:46 | WSL Ubuntu (VERIFIED) | No | CANONICAL (distro filesystem) |
| 3 | `...\​.local\share\pigi` (fb-profile 4.63 + ig-profile 4.59 + li-profile 4.72 + tt-profile 0.61 GB) | 15.60 GB | 2026-09-19 | Pigi engagement-automation browser profiles (HIGH-CONFIDENCE INFERENCE) | Yes (re-login) | DERIVED |
| 4 | `...\​.local\share\opencode` (opencode.db 8.13 GB + worktree 2.49 GB + log 0.09 GB) | 10.76 GB | 2026-09-19 16:42 (db) | opencode agent session store (HIGH-CONFIDENCE INFERENCE) | worktree yes; db history no | DERIVED |
| 5 | `...\AppData\Local\Google\Chrome` (User Data 8.97 GB, incl. OptGuideOnDeviceModel\weights.bin 3.98 GB + DriveFS 1.01 GB) | 9.98 GB | 2026-09-19 | Chrome + Chrome on-device AI model (VERIFIED by filename) | Yes (re-download) | DERIVED |
| 6 | `C:\Users\nolan\PING` | 8.42 GB | 2026-09-18 | Nolan/Pigi project work (VERIFIED by name) | No | CANONICAL (project files) |
| 7 | `...\AppData\Local\Packages` | 5.44 GB | n/m | UWP/MSIX app data (HIGH-CONFIDENCE INFERENCE) | Partial | DERIVED |
| 8 | `...\AppData\Local\Programs` | 5.36 GB | n/m | User-installed programs e.g. GitHub Desktop (VERIFIED) | Yes (reinstall) | DERIVED |
| 9 | `...\AppData\Local\hermes` | 5.06 GB | n/m | Hermes agent (HIGH-CONFIDENCE INFERENCE from name) | UNKNOWN | UNKNOWN |
| 10 | `C:\Users\nolan\CascadeProjects` | 4.06 GB | 2026-08-22 | Project dir (VERIFIED by name) | No | CANONICAL |
| 11 | `C:\Users\nolan\ping-convergence-worktree` | 3.27 GB | 2026-09-18 | Git worktree (VERIFIED by name) | Yes (re-clone) | DERIVED |
| 12 | `...\AppData\Local\Microsoft` | 3.24 GB | n/m | Windows/Microsoft apps (VERIFIED) | Partial | DERIVED |
| 13 | `C:\Users\nolan\research` | 2.85 GB | 2026-07-30 | Project dir (VERIFIED by name) | No | CANONICAL |
| 14 | `...\​.cache` (no huggingface/ subdir; no .ollama; no .npm on Windows side) | 1.46 GB | 2026-07-08 | Assorted tool caches (POSSIBLE) | Yes | DERIVED |
| 15 | `C:\Users\nolan\.codex` | 1.37 GB | 2026-09-19 06:23 | Codex agent (HIGH-CONFIDENCE INFERENCE) | Partial | DERIVED |

Also notable (below top-15): `uv` 1.23 GB, `qwen3-tts-docker` 1.20 GB, `.vscode` 1.09 GB, `GitHubDesktop` 0.99 GB, `PowerToys` 0.94 GB, `pnpm` 0.78 GB, `OpenAI` 0.71 GB, `ms-playwright` 0.68 GB, `npm-cache` 0.47 GB, `pip\Cache` 0.10 GB, `Documents` 0.37 GB, `Downloads` 0.11 GB.

## Post-recovery small dirs (were large pre-recovery)

| PATH | CURRENT SIZE | PRE-RECOVERY | PRODUCER |
|---|---|---|---|
| `...\AppData\Local\Temp` | 0.24 GB (largest item: WSL swap.vhdx 0.04 GB) | contents deleted 16:00-16:20 | Windows/apps (VERIFIED) |
| `...\Chrome\User Data\Default\Cache` | 0 GB | deleted 16:00-16:20 | Chrome (VERIFIED) |
| `...\Chrome\User Data\Default\Code Cache` | 0 GB | deleted 16:00-16:20 | Chrome (VERIFIED) |
| `C:\Users\nolan\Videos` | 0.02 GB | CacheClip 23.59 GB deleted | Nolan video work (VERIFIED by name) |
| `C:\ProgramData\Dell` | 0.34 GB (DTPDB.DB regrown 16:57) | 3.96 GB deleted; Dell services recreating | Dell bloatware (VERIFIED) |
| Edge `...\Default\Cache` | 0.08 GB | not cleared | Edge (VERIFIED) |
| `C:\Windows\Temp` | 0.01 GB | n/m | Windows (VERIFIED) |
| `C:\Windows\SoftwareDistribution` | 0.04 GB | n/m | Windows Update (VERIFIED) |
| `C:\Windows\Minidump` | 0 GB | n/m | none present |
| `C:\Windows\Logs\CBS` | 0.06 GB | n/m | Windows servicing (VERIFIED) |
| `C:\Windows\System32\winevt\Logs` | 0.386 GB | n/m | Event logs (VERIFIED) |
| `C:\$Recycle.Bin` | 0.35 GB | n/m | deleted files (VERIFIED) |

`C:\pagefile.sys`, `C:\hiberfil.sys`, `C:\swapfile.sys`, `C:\Windows\MEMORY.DMP`: not visible via Get-Item (access-restricted system files) -> sizes UNKNOWN. No Firefox profile found (`AppData\Local\Mozilla` absent).

## Top-5 largest single files (from targeted scans; global recursive sort was aborted as too slow)

1. `docker_data.vhdx` 151.63 GB (VERIFIED)
2. Ubuntu `ext4.vhdx` 62.01 GB (VERIFIED)
3. `.local\share\opencode\opencode.db` 8.13 GB (HIGH-CONFIDENCE: opencode session SQLite)
4. `Chrome\User Data\OptGuideOnDeviceModel\2025.8.8.1141\weights.bin` 3.98 GB (VERIFIED: Chrome on-device model)
5. Not fully established globally; largest seen elsewhere: `ProgramData\Microsoft\Search\...\Windows.db` 0.42 GB. (UNKNOWN whether any single file in Packages/Programs/PING exceeds this; not scanned.)

## Volume Shadow Copy

- `vssadmin list shadowstorage`: C: used 0 bytes (0%), allocated 0 bytes (0%), max 9.24 GB (1%).
- `vssadmin list shadows`: no shadows found.
- **VSS is consuming nothing now.** Whether a shadow copy existed pre-incident and was auto-purged when the disk hit ~0 free: UNKNOWN (no evidence either way post-recovery).

## Pre-recovery evidence DESTROYED by the 16:00-16:20 recovery (UNAVAILABLE-destroyed, never measured by this agent)

1. `C:\Users\nolan\AppData\Local\Temp` entire contents
2. Chrome `Default\Cache` + `Default\Code Cache` entire contents
3. `C:\Users\nolan\Videos\CacheClip` (reported 23.59 GB at deletion time)
4. `C:\ProgramData\Dell` (reported 3.96 GB at deletion time; 0.34 GB has regrown)
5. Docker build cache: reported 41.16 GB before `docker builder prune`/`docker system prune`, ~20 GB reclaimed per Docker's own accounting (host saw almost none of it: VHDX uncompacted)
6. Pre-recovery Temp/Cache composition, per-file timestamps, and what was actively being written at 15:21-15:22 (the actual crash filler) are unrecoverable from the Windows side.

## Key accounting takeaways

- Post-recovery used ~430 GB; the two WSL VHDXs alone = 213.76 GB (~50% of used space), both fully allocated on NTFS (zero sparse slack).
- Largest non-VHDX consumers: pigi engagement browser profiles 15.6 GB, opencode session db+worktree 10.76 GB, Chrome data 9.98 GB (incl. 3.98 GB on-device model), PING project 8.42 GB.
- Docker prune freed Docker-internal space but essentially zero host bytes; a VHDX compact (not performed, read-only task) would be required to return host space.
- Junction warning: `C:\Users\nolan\Application Data` (11.12 GB) and `Local Settings` (250.99 GB) are NT junctions back into AppData; excluded from totals to avoid double counting.
