# Storage baseline — 2026-09-30 (Incident Zero)

All values read-only. Times in UTC. C: figures from PowerShell Get-Volume / Get-Item on the Pig.
WSL-interior figures from `df`/`du` inside Pig WSL (user nolan, no sudo). Docker figures from
`docker system df -v` + `docker inspect` on the Pig. VHDX sizes are Windows-side file sizes.

| Metric | Value | Observed at (UTC) | Source |
|---|---|---|---|
| C FREE | 25.39 GB | 2026-09-30 11:27 | Get-Volume C |
| WSL VHDX SIZE (file on C:) | 118.51 GB | 2026-09-30 11:27 | Get-Item ext4.vhdx |
| WSL guest fs used | 97 GiB (~104 GB) | 2026-09-30 11:28 | df -h / inside WSL |
| DOCKER VHDX SIZE (file on C:) | 105.86 GB | 2026-09-30 11:27 | Get-Item docker_data.vhdx |
| POSTGRES DATA SIZE (live) | 114.6 MB | 2026-09-30 11:26 | docker volume: compose_postgres_data (brain-postgres mount, verified via inspect) |
| DOCKER IMAGE SIZE (unique) | ~50.4 GB | 2026-09-30 11:25 | docker system df -v |
| DOCKER VOLUME SIZE | ~24 GB | 2026-09-30 11:25 | docker system df -v (ollama 19.59 + qdrant 1.595 + open-webui 1.31 + pg 0.115 + orphans ~1.5) |
| DOCKER BUILD CACHE | 22.15 GB | 2026-09-30 11:25 | docker system df -v |
| OLLAMA/MODEL SIZE (Docker) | 19.59 GB | 2026-09-30 11:26 | volume compose_ollama_data (models: qwen2.5-coder 1.5b/7b/14b, llama3, nomic-embed-text) |
| MODEL SIZE (WSL-side) | 14.7 GB | 2026-09-30 11:28 | qwen3-tts-models 8.7G + cosyvoice-models 6.0G |
| VOICE CORPUS SIZE | 1.4 GB | 2026-09-30 11:28 | /home/nolan/voice-factory-data (corpus 750M, output 331M, rest generated) |
| DEVIN DB+WAL SIZE | 9.35 GB | 2026-09-30 11:27 | C:\Users\nolan\AppData\Roaming\Devin (Windows side, active DB) |
| D FREE | 6.42 GB | 2026-09-29 | prior Phase 2 report |
| E: | DEAD / RETIRED | 2026-09-29 | 37 disk errors, hardware failure |

## Deltas to watch (growth tracking)

Compare future observations against the table above. Suspected growers:
- DOCKER BUILD CACHE (22.15 GB; +11.3 GB appeared in the 11h before this baseline from the Qwen rebuild)
- /var/log/journal inside WSL (886 MB, grows continuously)
- ~/.npm/_cacache inside WSL (4.1 GB, grows with installs)
- Container writable layers (cosyvoice-tts layer hit 15 GB in one rebuild)
- New git worktrees/checkouts (each lane adds GBs; ~36 GB currently in worktree+project dirs)
- postgres WAL inside compose_postgres_data (small now at 115 MB; watch with event volume)

## Critical measurement note (standing)

VHDX files are dynamically expanding and DO NOT shrink when files are deleted inside the guest.
Always report LOGICAL BYTES FREED INSIDE GUEST separately from ACTUAL C: BYTES RECOVERED.
Actual C: recovery from in-guest deletions requires VHDX compaction
(wsl --shutdown + Optimize-VHD, or Docker Desktop equivalent) or relocation of the VHDX.

## POST-INCIDENT (2026-09-30 ~13:38 UTC, after BACKUP -> CLEAN -> COMPACT -> RESTART -> VERIFY)

| Metric | Before (11:27 UTC) | After (13:38 UTC) | Delta |
|---|---|---|---|
| C FREE | 25.39 GB (~5.1%) | 71.03 GB (15.37%) | +45.6 GB actual |
| WSL VHDX SIZE (file on C:) | 118.51 GB (peaked 127.25 GB pre-compaction) | 89.01 GB | -29.5 GB file |
| WSL guest fs used | 97 GiB | 85 GiB | -12 GiB logical |
| DOCKER VHDX SIZE (file on C:) | 105.86 GB (peaked 113.67 GB pre-compaction) | 88.82 GB | -17.0 GB file |
| POSTGRES DATA SIZE (live) | 114.6 MB | 111 MB | stable |
| DOCKER IMAGE SIZE | ~50.4 GB | 62.73 GB total (17 imgs) | note: df accounting differs post-restart |
| DOCKER VOLUME SIZE | ~24 GB | 24.02 GB | stable |
| DOCKER BUILD CACHE | 22.15 GB | 0 B | -22.15 GB |
| LARGEST WRITABLE LAYER | 15.0 GB (cosyvoice) | 11.8 GB (cosyvoice) | -3.2 GB |
| NPM CACHE | 4.1 GB | 1 MB | -4.1 GB |
| JOURNAL (/var/log/journal) | 886 MB | 870 MB | -16 MB |
| DEVIN DB+WAL SIZE | 9.35 GB | 9.38 GB | +0.03 GB |
| D FREE | 6.42 GB (2026-09-29) | 14.7 GB | +8.3 GB UNEXPLAINED — verify, possible drive swap |
| PING BACKUP | RED (none) | GREEN, RESTORE PROVEN YES | pg_dump x7 DBs, 2 copies (C: + Oracle) |

Compaction: Optimize-VHD -Mode Full, WSL 1.4 min + Docker 0.9 min. +48.3 GiB C: recovered at compaction; restart churn accounts for the rest of the delta.
Recurrence guard: ~/workspace/pig-storage/storage-watch.sh + daily cron `pig-storage-watch` (~07:21 MDT), quiet unless WARN+.
