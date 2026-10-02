# NUSYN 1TB SSD plan (N:) — recorded 2026-09-29

Nolan bought a 1TB NUSYN external SSD. Intended as drive N:. Has NOT arrived yet. ETA ~1 week from 2026-09-29.
No action until it arrives. This file is the planning record.

## Principle
Internal NVMe = compute plane. External NUSYN = capacity plane.
HOT -> WARM -> COLD lifecycle.

- HOT (internal NVMe): today's active PING/FYD worktrees, live databases, WSL2 ext4 checkouts.
- WARM (NUSYN N:): active supporting data, large repos, datasets, artifacts, agent scratch/outputs.
- COLD (archive/backup): eventually another device/cloud. NUSYN is storage, NOT backup.

## Intended N: layout
N:\
  WORK\muse\{repos,worktrees,scratch,outputs}
  WORK\devin\{repos,worktrees,scratch,outputs}
  WORK\hermes\
  WORK\shared\
  PROJECTS\{ping,fyd,other}\        <- mirrors/snapshots/less-active repos
  DATA\{datasets,acquisitions,observations,corpora,imports}\
  ARTIFACTS\{builds,exports,reports,screenshots,generated}\
  DOWNLOADS\
  ARCHIVE\{repos,datasets,old-workspaces}\
  BACKUP-STAGING\

## Canonical repo rule
One canonical repository per project (N:\PROJECTS\ping). Agents get worktrees, not independent authoritative copies:
  N:\PROJECTS\ping -> N:\WORK\muse\worktrees, N:\WORK\devin\worktrees
This addresses the "which copy is real?" / stranded-worktree problem.

## WSL note
Hot Linux-heavy checkouts (git/npm/tests) stay in the WSL2 ext4 filesystem on internal NVMe
(/home/nolan/ping canonical HOT checkout + worktrees), NOT under /mnt/n (9P is slow for this).
N: is reached from WSL via /mnt/n; consider /etc/fstab entry for stable mount.

## Constraints / sequencing
- Do NOT migrate canonical checkouts mid-convergence. The trackc vs fyd/convergence-2026-09-28
  branch convergence must resolve first (or the migration rides along with it deliberately).
- Format NTFS (not exFAT) when the drive arrives. Assign letter N: via diskpart/Disk Management.
- Irreplaceable material (voice originals, source evidence, forensic material) must have a second
  verified copy somewhere before its C: copy is deleted. N: alone is not a backup.
- The C: storage incident (2026-09-29) Phase 1 audit should plan N: as the primary cold-data
  destination; D:/E: flash drives stay secondary/conservative.
- When the drive arrives: produce the exact setup sequence (drive letter + NTFS + WSL mount +
  directory creation + git worktree + Muse/Devin env-var migration) without breaking current PING paths.
