# PIG Storage Reconciliation — 20-Phase Execution Log

Directive: Nolan's "PING — CRITICAL STORAGE RECONCILIATION / CONSERVATIVE MIGRATION MODE".
Governing law: CLASSIFY → PRESERVE → COPY → VERIFY → SWITCH → VERIFY AGAIN → DELETE SOURCE COPY → MEASURE.
NEVER delete-then-hope. No tar/zip/bundles/dumps of the full filesystem (Phase 0).
Dirty git worktrees are class A until proven otherwise.
Architecture reports are NEVER deletion lists. The compiled constitutional compiler tree is
PRESERVATION-WORTHY (class A/B, migrate-or-preserve, never disposable build output).

Targets: below 95% immediate | below 90% next | 80-85% healthy.
C: = 463G total. 95% = free > 23.15G. 90% = free > 46.3G. 85% = free > 69.5G. 80% = free > 92.6G.

## Phase map (reconstructed from the directive's governing law and referenced phase numbers)

- Phase 0: Safety lock. No full-filesystem archives. No blind prunes
  (`docker system prune -a --volumes` banned). No delete-then-hope. STATUS: DONE (standing)
- Phase 1: Measure ground truth. C: free, VHDX sizes/mtimes, per-consumer sizes. STATUS: DONE
  (parent 16:55 measurement + RCA agents A/B/C/D)
- Phase 2: Classify all major consumers (class A/B/C + disposal classes). STATUS: DONE (initial)
- Phase 3: Preserve evidence. Ledger entries before narration; receipts. STATUS: ONGOING
- Phase 4: Identify the ACTIVE writer. STATUS: DONE — qwen3-tts-service boot-time
  HF download of Qwen3-TTS-12Hz-1.7B-Base (~4.3G into docker_data.vhdx via a VM-side
  bind copy), FL-20260919-RCA-005
- Phase 5: Inhibit the writer (reversible, non-destructive). STATUS: DONE 17:01 MDT —
  `docker stop qwen3-tts-service` (unless-stopped; stays stopped; all data preserved)
- Phase 6: Measure after inhibition; confirm leak stopped. STATUS: DONE —
  C: free flat at 22.37G (was falling ~150-250 MB/min); docker_data.vhdx mtime stale
  since 16:52:58 (download had completed/stalled just before the stop)
- Phase 7: Classify reclaimable Docker space per rules (targeted only, no blind prune).
  STATUS: IN PROGRESS (pending agent A Windows side)
- Phase 8: Execute conservative Docker reclamation (reviewed, specific deletions only).
  STATUS: PENDING
- Phase 9: Re-measure; assess VHDX compaction need. STATUS: PENDING
- Phase 10: VHDX compaction decision (needs wsl --shutdown: brief full PING downtime).
  STATUS: PENDING (deferred until after safe reclamations + re-measure)
- Phase 11: Classify WSL-side candidates. STATUS: DONE (initial, agent C/D)
- Phase 12: Migrate (COPY) class A/B data to destination. STATUS: BLOCKED —
  no secondary volume exists (only /mnt/c; no D:, no external). Migration off-disk
  impossible; recorded as real blocker. Reclamation must come from reviewed deletion
  or VHDX compaction.
- Phase 13: Verify writer stays stopped; monitor for regrowth. STATUS: ONGOING
  (qwen3-tts-service exited; will re-check before any deletion)
- Phase 14: Verify copies (hashes). STATUS: N/A while Phase 12 blocked
- Phase 15: Switch references to migrated copies. STATUS: N/A while Phase 12 blocked
- Phase 16: Verify again post-switch. STATUS: N/A while Phase 12 blocked
- Phase 17: Migration receipts (every destructive action + copy recorded here).
  STATUS: ONGOING (see Receipts)
- Phase 18: Deletion gate — every box checked or NO delete. Gate items per deletion:
  [ ] classified SAFE_DISPOSABLE or operator-approved [ ] no active writer depends on it
  [ ] preserved/copy verified or regeneratable proven [ ] measured before/after.
  STATUS: ARMED
- Phase 19: Final measurement vs targets. STATUS: PENDING
- Phase 20: RCA report with receipts, classifications, writer evidence. STATUS: PENDING
  (report path: ~/workspace/your_files/PING_PIG_DISK_WSL_INCIDENT_RCA.md)

## Ground-truth measurements (MDT 2026-09-19)

| Time  | C: free | C: used% | docker_data.vhdx | vhdx mtime | Note |
|-------|---------|----------|------------------|------------|------|
| 16:18 | 31.84G  | ~93.1%   | 151.63G          | —          | post-recovery |
| 16:55 | ~23G    | ~95.0%   | 152G             | 16:50      | parent measurement; ~9G/37min leak |
| 16:58 | 22.37G  | ~95.2%   | 151.63G          | —          | writer found |
| 17:01 | —       | —        | —                | —          | Phase 5: docker stop qwen3-tts-service |
| 17:03 | 22.37G  | ~95.2%   | 151.63G          | 16:52:58   | leak stopped (flat, mtime stale) |

## Classification ledger (Phase 2/7/11)

### Docker / docker_data.vhdx (151.63G physical, ~134.6G attributable, ~17G internal slack)
- 28.34G reclaimable images (of 90.06G): REGENERATABLE (TTS/CUDA rebuildable from Dockerfiles).
  Targeted `docker image prune` of dangling only; verify none referenced. PENDING Phase 8.
- 20.48G build cache (19.78MB reclaimable per Docker): REVIEW_REQUIRED. Ten 690MB
  7d entries (~6.9G, possible curious-squid-gateway rebuild series). Do NOT blind-prune;
  identify owning builds first. PENDING.
- 619.5MB reclaimable volumes (of 23.55G): orphan pgdata volumes ~40-74MB each
  (19c5cf62 73.65MB, pgdata 69.77MB, fc69e3e9 57.89MB, 4x ~48MB, 5x ~40MB).
  POSSIBLE old scratch postgres data. Verify unreferenced, then targeted `docker volume rm`. PENDING.
- 4.3G partial Qwen3-TTS-12Hz-1.7B-Base download (VM-side bind copy in docker_data.vhdx,
  from stopped qwen3-tts-service): UNKNOWN_DO_NOT_TOUCH (removal path unclear without
  VM surgery; container definition preserved). Flagged.
- compose_ollama_data 19.59G: REVIEW_REQUIRED (model weights; in use by ollama).
- cosyvoice-tts writable 484MB (whisper small.pt + triton/nv caches): REGENERATABLE
  (cache) + model file; container running, do not touch while up.

### WSL / Ubuntu (ext4.vhdx 61.98G)
- 671MB orphaned modelscope ._____temp range chunks (2026-09-19 15:19, downloader debris):
  SAFE_DISPOSABLE (high-confidence). Phase 18 gate: single item, no dependents.
  PENDING deletion + measure.
- /home/nolan/qwen3-tts-models 8.8G: REGENERATABLE (re-download; voice program paused).
  Needs Nolan's word. DO NOT TOUCH.
- /home/nolan/cosyvoice-models 6.46G (5.7G downloaded 15:15-15:19 today): REGENERATABLE.
  Needs Nolan's word. DO NOT TOUCH.
- /home/nolan/voice-factory-data 1.4G: REVIEW_REQUIRED (corpus + generated audio).
- /home/nolan/ping 16G: .git 3.6G (two 1.8G packs, origin UNKNOWN → UNKNOWN_DO_NOT_TOUCH);
  worktrees/ 13G (4x 3.0G in-repo worktrees on 5b102c664): CLASS A until proven otherwise
  (dirty-worktree rule; convergence lanes own them). 4x untracked 212M crx-ui-next.tar
  (848M duplication): REVIEW_REQUIRED (convergence lanes).
- Compiled constitutional compiler tree: PRESERVATION-WORTHY class A/B per Nolan's
  archaeology correction. NEVER disposable. (Location TBD from archaeology report;
  do not infer deletion from it.)

### Windows C: (pending agent A scan)
- Awaiting: VHDX physical vs logical, top dirs, shadow storage, Temp/browsers/WinSxS,
  pagefile, dumps, Dell remnants.

## Receipts (Phase 17)

- R-001 (17:01 MDT): `docker stop -t 30 qwen3-tts-service` → STATUS=exited.
  Reversible via `docker start qwen3-tts-service`. Reason: inhibited active 4.3G model
  download onto 96% C:; voice program paused; zero active API connections; no
  dependents observed. Non-destructive. Before: C: 22.37G free falling. After: flat.
- (further receipts appended as phases execute)

## Blockers

- B-001: No migration destination. Only C: exists (no D:, no external, no network share
  configured). Phases 12/14/15/16 cannot execute off-disk. Reclamation limited to
  reviewed deletion + VHDX compaction.
- B-002: VHDX compaction (reclaims ~17G slack, the single biggest lever toward 90%)
  requires wsl --shutdown → full PING downtime for the duration. Decision pending
  Phase 9 re-measurement.

## Updates 17:10 MDT
- B-003: 641M ._____temp debris is root-owned (Permission denied as nolan); deletion
  declined — zero C: effect without Ubuntu VHDX compaction (not worthwhile).
- docker-desktop-data distro not accessible (WSL_E_DISTRO_NOT_FOUND); in-VM fstrim unavailable.
- Orphan volumes: 22 unreferenced; named project volumes UNKNOWN_DO_NOT_TOUCH;
  hex orphans skipped (logical-only gain, no C: effect pre-compaction).
- PROVEN: only VHDX compaction returns space to C:. Phase 10 (compact docker_data.vhdx,
  ~10-17G slack) is the C: lever. Deferred until agent A completes; restart path TBD.

## SURGICAL ORDER (supersedes 20-phase directive) — executed 2026-09-19 ~16:59-17:06 MDT
Nolan's priority change: ACTIVE-WRITER FORENSICS → CONTAINMENT → MIGRATION → RECLAMATION.
Read-only suspension for the lane REMAINS; only the ordered containment action was executed.

### Axiom S1 — Stop the leak before optimizing storage: DONE
Writer PROVEN (qwen3-tts-service HF download, 4.2 GB net in). Contained via `docker stop -t 30` ~16:55 MDT.

### Axiom S2 — Reconciliation table (2026-09-19 ~17:00 MDT)
| STORAGE FAMILY | WINDOWS BYTES | WSL VISIBLE BYTES | DOCKER ACCOUNTED BYTES | ACTIVE WRITER | RECLAIMABLE? | MIGRATABLE? | AUTHORITATIVE? | ACTION |
|---|---|---|---|---|---|---|---|---|
| C: NTFS total | 462 GB (430.1 used / 31.872 free, 93.1%) | — | — | none | — | — | — | monitor |
| docker_data.vhdx | 151.631 GB physical | — | ~134.6 GB logical (~17 GB slack, approx) | none (stopped) | via compaction only (NOT AUTHORIZED) | no target exists | contains PG (authoritative) | hold |
| Ubuntu /dev/sdd | physical VHDX path unlocated (subagent A pending) | 61 GB used | — | none | via compaction only | no target exists | contains repos/worktrees (preserve) | hold |
| Docker images | inside VHDX | — | 90.06 GB (28.34 reclaimable) | none | logical only; needs Nolan's word per image | no target | no (regeneratable) | hold |
| Docker volumes | inside VHDX | — | 23.55 GB (0.62 reclaimable) | none | 619.5 MB review-required | no target | PG volumes: YES — never prune | hold |
| Build cache | inside VHDX | — | 20.48 GB (19.78 MB reclaimable) | none | logical only (proven 1:10 C: conversion) | no target | no | hold |
| /home/nolan/ping | inside Ubuntu VHDX | 16.63 GB | — | none | no (class A/B) | no target | git history: YES | hold |
| qwen3-tts-models | inside Ubuntu VHDX | 9.36 GB | — | none (was: qwen dl) | regeneratable; Nolan's word | no target | no | hold |
| cosyvoice-models | inside Ubuntu VHDX | 6.46 GB (incl 671 MB temp debris) | — | none | debris safe-disposable (root-owned) | no target | no | hold |

### Axiom S3 — Per-container writer proof (2026-09-19)
Only qwen3-tts-service showed anomalous behavior: 4.2 GB network input in docker stats, "Fetching 4 files" for Qwen3-TTS-12Hz-1.7B-Base, 4.3 GB new files in VM-side /app/models. All other running containers: writable layers KB-scale (cosyvoice-tts 484 MB layer noted but static, up 44 min, no growth signal; open-webui 55.7 MB static). Postgres/Qdrant/Redis/Vault/Gateway: KB-scale layers, healthy or healthcheck-passing. Five exited scratch containers: 8-160 kB layers. Growth vector 11 (non-Docker WSL process): no signal (C: flat).

### Phase A — T0/T1 deltas: LEAK = 0
T0 ~16:59 → T1 ~17:06 (~7 min): C_FREE_DELTA 0, VHDX_DELTA 0, DOCKER_DELTA 0. Unexplained remainder: 0 GB/h. One-time +9.5 GB step (22.36→31.872) between stop verification and T0 remains OPEN (safe direction, stable since).

### Phase B — Containment: EXECUTED
`docker stop -t 30 qwen3-tts-service` ~16:55 MDT → Exited (137). Verified: no :5000 connections, no API lines, C: flat, VHDX static. Rollback: `docker start qwen3-tts-service` (FORBIDDEN while voice cloning paused).

### Phase C — Destination hunt: NO TARGET EXISTS
Single Samsung PM9A1 NVMe 512 GB. C: only. No USB, no net shares, no D:. Phases D/F/G BLOCKED.

### Phase E — Headroom: NO-OP without compaction
Logical reclamation does not move C: free (proven 1:10 conversion). No deletions executed. Candidates documented in FL-2026-0919-RCA-008.

### Status
WRITER_RESOLVED. CONTAINMENT_VERIFIED. MIGRATION_BLOCKED_NO_TARGET. Convergence freeze HOLDS (93.1% > 90%).

### Agent A correction (17:05 MDT, FL-20260919-RCA-009)
fsutil queryAllocRanges PROVES zero sparse slack on both large VHDXs (physical == logical).
The "~17 GB slack" in the table above is FALSIFIED as sparse slack; it is VHDX-internal
unattributed consumption (ext4 metadata, un-zeroed freed blocks). Compaction yield UNKNOWN,
likely smaller than estimated. Ubuntu VHDX located at
`C:\Users\nolan\AppData\Local\wsl\{a112dee4-421d-4e51-81a9-46c985479613}\ext4.vhdx`
(62.01 GB). Combined VHDXs = 213.76 GB (~50% of C: used). Full: ~/workspace/pig/rca-agentA-storage.md.
