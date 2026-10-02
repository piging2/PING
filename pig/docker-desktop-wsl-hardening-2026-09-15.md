# Docker Desktop WSL-First Hardening — Track 4 Findings (2026-09-15)

All checks read-only. No changes made; nothing restarted, installed, removed, or edited.

## Docker Desktop state
- Version: **4.79.0.230596** (FileVersion and ProductVersion of `C:\Program Files\Docker\Docker\Docker Desktop.exe`)
- Processes RUNNING: com.docker.backend (x2), com.docker.build, docker-sandbox, Docker Desktop (x5), docker (x2)
- Earlier report that Docker Desktop would not start is stale: it is running and healthy as of 15:0x MDT today.
- WSL distros: `Ubuntu` (default, Running, v2) and `docker-desktop` (Running, v2). WSL2 kernel 6.6.114.1-microsoft-standard-WSL2.

## Where settings live (4.79.0)
- Legacy `%APPDATA%\Docker\settings.json` does NOT exist anymore (confirmed: only cagent/, extensions/, .trackid, analyticsmonitor.dat, features-overrides.json ({}), locked-directories, marlin.dat, reports.log, settings-store.json, unleash-v2-docker-desktop.json).
- Canonical settings file: **`C:\Users\nolan\AppData\Roaming\Docker\settings-store.json`** (360 bytes). Full contents:
  AutoStart=false, DisplayedOnboarding=true, EnableDockerAI=true, InferenceCanUseGPUVariant=true,
  **IntegratedWslDistros=["Ubuntu"]**, LastContainerdSnapshotterEnable=1780181278, LicenseTermsVersion=2,
  SettingsVersion=44, UpdateInstallTime=0, UpdatePreviousVersion="", UseContainerdSnapshotter=true.
- Registry: `HKCU\Software\Docker` (and `\Desktop` subkey) does NOT exist for nolan. Settings are file-based only.
- Electron frontend persisted state (`%APPDATA%\Docker Desktop\persisted-state.json`, Preferences, Local Storage leveldb) contains NO Resource Saver / auto-pause keys (searched: saver, pause, resource, power).

## WSL integration state for Ubuntu: ENABLED
- Evidence: `settings-store.json` → `"IntegratedWslDistros": ["Ubuntu"]`.
- Runtime confirmation from inside Ubuntu WSL as nolan:
  - `/usr/bin/docker` → symlink to `/mnt/wsl/docker-desktop/cli-tools/usr/bin/docker` (standard integration shim).
  - `/var/run/docker.sock`: srw-rw---- root:docker (integration proxy socket, dated 2026-09-15 10:02).
  - `docker version`: Client 29.5.3 → **Server: Docker Desktop 4.79.0 (230596)** — daemon REACHABLE from WSL.
  - `docker compose version`: v5.1.4.
  - `docker info`: Paused: 0, CPUs 24, Memory 31.19 GiB.
- The previously dead proxy socket (noted 2026-09-15 in AGENTS.md) is now alive; no restart needed.

## Resource Saver state: NOT DETERMINABLE from on-disk stores
- No saver/autoPause key in settings-store.json, persisted-state.json, Preferences, leveldb, or registry.
- docker-desktop distro is isolated (no bash, no /mnt/c) so its internal VM config could not be read.
- Behavioral data: `docker info` shows Paused: 0 (no containers currently paused); daemon responsive.
- Action: check Docker Desktop dashboard → Settings (General) for the Resource Saver toggle; no restart or admin rights needed to read it.

## Second/conflicting Docker engine inside Ubuntu WSL: NO
- No `dockerd` binary; `docker.service` unit not found; `systemctl` shows no docker/containerd units; `dpkg -l` shows zero docker/containerd apt packages; no dockerd/containerd processes. Single engine only (Docker Desktop).

## Linux-side source path convention (policy record, no changes made)
- Canonical PING repo lives Linux-side at `/home/nolan/ping` (WSL Ubuntu ext4). All development source trees and volume mounts must use Linux-side paths. Do NOT bind-mount `/mnt/c/...` source trees for normal development (DrvFs 9p perf, hangs on `git status`, and WSL/Windows semantic mismatch).
- PING docker-compose files were NOT touched (off-limits per track instructions).

## Changes needing Nolan/admin/restart approval: NONE
- Nothing in this track required a change. If Resource Saver needs to be toggled or WSL integration altered, that is a Docker Desktop Settings change (no admin rights, but integration toggle restarts the engine — schedule at a quiet time).
