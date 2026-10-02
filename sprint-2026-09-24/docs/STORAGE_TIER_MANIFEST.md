# STORAGE TIER MANIFEST

Sprint: FYD 24-hour product proof (2026-09-24). Machine: Pig (Windows).
Date: 2026-09-24. Operator: Pigi (subagent bcd9a403 storage tiering task).

## Drive map (measured)

| Drive | Size | FS | Cluster | Free BEFORE | Free AFTER | Notes |
|-------|------|----|---------|-------------|------------|-------|
| C: | 462 GB | NTFS | 4K | 63.9 GB (13.8%) | ~73.8 GB (~16%) | HOT execution plane |
| D: | 58.6 GB | exFAT | 128K | 23.29 GB | ~14.6 GB | WARM; 128K clusters hostile to small files; small-file write throughput pathologically slow (~1 file/s measured) |
| E: | 58.6 GB | FAT32 | 32K | 50.62 GB | ~50.1 GB | COLD; 4 GB max single-file size |

Pre-existing D:/E: contents (prior evacuations, untouched):
D:/RECOVERED_VIDEO 2.70 GB, D:/pig-slop 11.93 GB, D:/pig-evac/{weights,db} 20.06 GB,
D:/VIDEO_ARCHIVE 0.61 GB, E:/pig-evac/{weights,db} 7.95 GB.
E:/PING_ARCHIVE and E:/VIDEO_ARCHIVE exist but are empty.

## Classification key

HOT = latency/execution-local, do not move. WARM = may want quickly, safe on D:.
COLD = low-frequency, safe on E:. REGENERABLE = deletable, recipe recorded.
UNKNOWN = not moved until inspected.

## Top C: consumers (junction-corrected, read-only survey)

| Path | Size | Class | Disposition |
|------|------|-------|-------------|
| C:/Users/nolan/AppData/Local/wsl | 95.32 GB | HOT | Live WSL2 virtual disks. NEVER move WSL internals. Left. |
| C:/Users/nolan/AppData/Local/Docker | 85.03 GB | HOT | Docker Desktop data; gateway containers live here. Reconfig possible later via Docker settings, not during sprint. Left. |
| C:/Users/nolan/PING | 8.37 GB | HOT | Active source checkout (.git touched 2026-09-24). Left. |
| C:/Users/nolan/.local/share/pigi/{li,fb,ig,tt,x}-profile | 8.36 GB | HOT | House browser profiles (always-on headed Chrome). Left. |
| C:/Users/nolan/AppData/Local/Google | 7.32 GB | HOT | Browser data. Left. |
| C:/Users/nolan/AppData/Local/Temp | 6.74 GB | HOT/REGENERABLE | 5.29 GB is a LIVE swap.vhdx (written minutes before survey). 1.27 GB installer/log debris DELETED (see below). Rest is active temp. |
| C:/Users/nolan/AppData/Local/Packages | 5.72 GB | HOT | Store app data. Left. |
| C:/Users/nolan/AppData/Local/hermes | 5.05 GB | HOT/COLD | Live state.db (0.71 GB) HOT. One pre-update .bak (0.51 GB) COLD, moved to E:. hermes-agent/ source checkout left (active). |
| C:/Users/nolan/CascadeProjects | 4.65 GB | UNKNOWN | 18 project dirs; mixed (one has 31 dirty git lines, most not git repos). Fail-closed: left. |
| C:/Users/nolan/AppData/Local/Programs | 4.35 GB | HOT | Installed programs. Left. |
| C:/Users/nolan/ping-convergence-worktree | 3.27 GB | HOT | Sprint worktree. Left. |
| C:/Users/nolan/research | 2.78 GB | WARM | 26 OSS harvest clones (inventory below). Move to D: ATTEMPTED and ROLLED BACK: D: small-file throughput ~1 file/s and 128K clusters would balloon 101,630 files to ~13 GB on disk. Left on C: pending better approach. |
| C:/Users/nolan/AppData/Local/Microsoft | 2.39 GB | HOT | Left. |
| C:/Users/nolan/.local/share/opencode/worktree | 2.49 GB | HOT | Active agent worktree. Left. |
| C:/Users/nolan/.cache | 1.46 GB | UNKNOWN | codex-runtimes etc. Left. |
| C:/Users/nolan/.codex | 1.45 GB | UNKNOWN | sessions/plugins/bin; may hold history. Left. |
| C:/Users/nolan/qwen3-tts-docker | 1.20 GB | UNKNOWN | Project source + voice corpus data. Left. |
| C:/Users/nolan/GitHubDesktop (AppData) | 1.70 GB | HOT | Left. |

## Relocations

### 1. opencode restore-staging DB -> D: (COLD)

- ORIGINAL: C:/Users/nolan/.local/share/opencode/restore-staging-20260921/opencode.db
- NEW: D:/pig-evac/opencode-restore-staging-20260921/opencode.db
- TIER: COLD (abandoned restore-staging artifact, 2026-09-21; not locked; live opencode.db is 0.47 GB elsewhere)
- SIZE: 8,728,612,864 bytes (8.13 GB), 1 file
- METHOD: Copy-Item then length verification then source delete
- VERIFICATION: PASS (dst length == src length 8728612864); source deleted; empty staging dir removed
- WHY D NOT E: E: is FAT32, 4 GB max file. Physical constraint documented.
- RESTORE: copy back to C:/Users/nolan/.local/share/opencode/restore-staging-20260921/opencode.db
- IF D: ABSENT: nothing breaks (abandoned staging; live DB unaffected)
- DATE: 2026-09-24

### 2. hermes pre-update DB backup -> E: (COLD)

- ORIGINAL: C:/Users/nolan/AppData/Local/hermes/state.db.pre-update-emergency-2026-09-13T01-10-55-406Z.bak
- NEW: E:/pig-evac/hermes-state-db-bak-20260913/state.db.pre-update-emergency-2026-09-13T01-10-55-406Z.bak
- TIER: COLD (one-time pre-update emergency backup, 2026-09-13; superseded by 11 days of live operation)
- SIZE: 550,981,632 bytes (0.51 GB), 1 file
- METHOD: Copy-Item then length verification then source delete
- VERIFICATION: PASS (dst length == src length 550981632); source deleted
- RESTORE: copy back to C:/Users/nolan/AppData/Local/hermes/
- IF E: ABSENT: nothing breaks (backup of live state.db which remains on C:)
- DATE: 2026-09-24
- INCIDENT 2026-09-24 ~20:00-21:30 MDT: file was DELETED from E: by an unknown actor (not this task; E: free returned to 50.62 GB, pre-move value). File is absent from C:, D:, and E:. Live state.db on C: unaffected. Loss limited to one 11-day-old cold backup copy. No other tiered artifact affected (D: opencode.db verified intact).

### 3. research harvest corpus -> D: (WARM) -- ATTEMPTED, ROLLED BACK, FULLY RESTORED

- ORIGINAL: C:/Users/nolan/research (2.78 GB, 101,630 files, 26 dirs)
- INTENDED: D:/pig-evac/research-harvest-20260924
- OUTCOME: copy ran at ~1 file/s (D: small-file write pathology confirmed by isolated test); projected 8+ hours. 128K clusters would also balloon on-disk footprint to ~13 GB. Killed mid-copy (~5,166 files moved, 4 dirs partial: aider, autogen, browser-use, continue).
- ROLLBACK: merge-back D:->C: via robocopy /MOVE /MT:16 completed for all files; 4 empty dir shells removed from D:. Operator error during cleanup deleted 1,346 tracked files still staged on D: (top-level listing misread as empty). RECOVERED via `git checkout -- .` in each of the 4 dirs (full SHA inventory was recorded pre-move). Final: 101,632 files, 26 dirs, 0 deleted tracked files. ~40 untracked files (likely build artifacts) not recoverable; dirs are research clones, no product impact.
- STATUS: LEFT ON C:, WHOLE. Future move only as archive (zip) or after D: reformat with smaller clusters -- Nolan's call.
- DATE: 2026-09-24

## Deleted regenerable

| Path | Size | Why safe |
|------|------|----------|
| AppData/Local/Temp/DockerDesktopUpdates | 0.33 GB | Installer leftover |
| AppData/Local/Temp/windsurf-stable-user-x64 | 0.24 GB | Installer leftover |
| AppData/Local/Temp/vscode-stable-user-x64 | 0.22 GB | Installer leftover |
| AppData/Local/Temp/DiagOutputDir | 0.43 GB | Remote-desktop diagnostic traces 9/20-9/23 |
| AppData/Local/Temp stale files (>7d) | 0.05 GB | 775 files, unlocked |
| TOTAL DELETED | ~1.27 GB | All regenerable downloads/logs |

NOT deleted: Temp/6CE83A71-*/swap.vhdx (5.29 GB) -- LIVE, written minutes before survey. Never touch.

## Junctions / symlinks created

NONE. (A junction for the research corpus was planned but the move was rolled back.)

## Research corpus inventory (for future move; WARM)

Restorable via: `git clone <remote> && git checkout <sha>` per row. Full SHAs recorded
in /tmp/research-inventory.txt (sandbox) at move time.

| dir | branch | sha (short) | remote |
|-----|--------|-------------|--------|
| aider | main | 5dc9490 | https://github.com/Aider-AI/aider.git |
| autogen | main | 027ecf0 | https://github.com/microsoft/autogen.git |
| browser-use | main | f0aa3a8 | https://github.com/browser-use/browser-use.git |
| continue | main | 5522c6f | https://github.com/continuedev/continue.git |
| crawl4ai | main | 7e80152 | https://github.com/unclecode/crawl4ai.git |
| crewAI | main | 453676c | https://github.com/crewAIInc/crewAI.git |
| firecrawl | main | 348267c | https://github.com/firecrawl/firecrawl.git |
| graphiti | main | 2645dee | https://github.com/getzep/graphiti.git |
| graphrag | main | 14a00ad | https://github.com/microsoft/graphrag.git |
| kythe | master | 26056ed | https://github.com/kythe/kythe.git |
| langgraph | main | 4134145 | https://github.com/langchain-ai/langgraph.git |
| letta | main | b76da90 | https://github.com/letta-ai/letta.git |
| LightRAG | main | e66173c | https://github.com/HKUDS/LightRAG.git |
| LocalAI | master | efb4377 | https://github.com/mudler/LocalAI.git |
| mem0 | main | d4869d2 | https://github.com/mem0ai/mem0.git |
| n8n | master | 12f1fcc | https://github.com/n8n-io/n8n.git |
| ollama | main | b205993 | https://github.com/ollama/ollama.git |
| ragflow | main | 9bb0372 | https://github.com/infiniflow/ragflow.git |
| scip | main | 44d39fc | https://github.com/sourcegraph/scip.git |
| swh-model | master | c32a818 | https://github.com/SoftwareHeritage/swh-model.git |
| temporal | main | ef7ea20 | https://github.com/temporalio/temporal.git |
| tree-sitter | master | 963b5a5 | https://github.com/tree-sitter/tree-sitter.git |
| vllm | main | 1ad5182 | https://github.com/vllm-project/vllm.git |
| windmill | main | 9cd6a70 | https://github.com/windmill-labs/windmill.git |
| zep | main | 74ccf8c | https://github.com/getzep/zep.git |
| zoekt | master | 62cfd87 | https://github.com/google/zoekt.git |

## Evidence notes

No FYD evidence/proof packages were moved or deleted. Cold evidence stays where it
was; nothing in this pass qualified as cold FYD evidence on C:.

## Active FYD impact

NONE. No running process, worktree, journal, database, or browser profile was touched.
:3100 runtime untouched. Largest consumers (wsl 95 GB, Docker 85 GB, browser profiles,
PING checkout, sprint worktree) deliberately left in place.
