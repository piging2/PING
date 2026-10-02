# Incident Zero — Phase 4: VHDX Compaction
Date: 2026-09-30. Worker: Phase 4 subagent (depth 2).
Goal: compact the two VHDXs so Phase 1–3 guest deletions become real C: bytes.
Phase 5 restarts everything afterward.

## BEFORE (recorded 2026-09-30T12:19:04Z)

| Item | Value |
|---|---|
| C: free | 25,526,083,584 bytes (~23.78 GiB) |
| C: total | 496,069,767,168 bytes (~462.0 GiB) |
| WSL ext4.vhdx | C:\Users\nolan\AppData\Local\wsl\{a112dee4-421d-4e51-81a9-46c985479613}\ext4.vhdx — 127,245,746,176 bytes (~118.5 GiB) |
| Docker docker_data.vhdx | C:\Users\nolan\AppData\Local\Docker\wsl\disk\docker_data.vhdx — 113,669,832,704 bytes (~105.9 GiB) |
| Note: docker-desktop distro vhdx | C:\Users\nolan\AppData\Local\Docker\wsl\main\ext4.vhdx — 125,829,120 bytes (~120 MiB) — NOT compacted (small, out of scope) |
| WSL guest df / | /dev/sdd 1007G total, 84G used, 872G avail (9%) |
| docker system df | Images 62.73GB / Containers 11.87GB / Local Volumes 24.02GB / Build Cache 0B |

### Running containers BEFORE shutdown (Phase 5: verify all return)
1. qwen3-tts-service (qwen3-tts-qwen-qwen3-tts) — Up 12h, :5000
2. ping-gateway (ping-gateway:repair-cert-20260924) — Up 17h, :8080
3. ping-postgres (postgres:15-alpine) — Up 2d, :5433
4. ping-qdrant (qdrant/qdrant:latest) — Up 2d healthy, 6333-6334 (internal)
5. cosyvoice-tts (qwen3-tts-docker-cosyvoice-tts) — Up 12h, :5001
6. ping-redis (redis:alpine) — Up 2d healthy, :6379
7. ping-vault (hashicorp/vault:latest) — Up 2d UNHEALTHY, :8200
8. ollama (ollama/ollama) — Up 2d, :11434
9. brain-postgres (postgres:15-alpine) — Up 2d, :5432 (SOURCE TRUTH — backup verified Phase 1)
10. brain-qdrant (qdrant/qdrant:latest) — Up 2d, :6333-6334
11. open-webui (ghcr.io/open-webui/open-webui:main) — Up 2d healthy, :3001

### :3100 (FYD served surface) BEFORE shutdown
- Served by HOST process, NOT docker: `npm start -p 3100` / next-server v15.5.24 in /home/nolan/projects/ping-fyd-converged (PID 50535 on 3100/tcp).
- Phase 5 restart path: /home/nolan/start-3100.sh ONLY (never by hand, per standing AGENTS.md rule).
- Will die with `wsl --shutdown` (host process in WSL Ubuntu).

## SHUTDOWN
- 2026-09-30T12:20Z: `docker stop` on all 11 containers — all stopped cleanly in ~4s (graceful SIGTERM; `docker ps` empty after).
- `wsl.exe --shutdown` issued; verified via direct-route PowerShell (see transport note below).
- :3100 (host next-server in WSL Ubuntu) died with the VM as expected; Phase 5 restarts via /home/nolan/start-3100.sh only.

### Transport note (for future phases)
`~/workspace/bin/pigps.sh` routes through `wsl --` on the Pig, which COLD-BOOTS the WSL VM on every call. For this phase I used /tmp/psd.sh (direct SSH to the Windows OpenSSH server running `powershell.exe -EncodedCommand <base64>`), which never touches WSL. Recommend Phase 5 use the same direct route for any pre-boot checks.

### WSL would not stay down (root-caused, no blocker)
- `wsl.exe --shutdown` / `--terminate Ubuntu` exited 0 but a zombie `vmmemWSL` (PID 39796) survived all distros showing Stopped, holding the Ubuntu ext4.vhdx open (Optimize-VHD failed 0x80070020 "being used by another process").
- Fix (supported lifecycle, no hard kill): `Restart-Service WSLService -Force` completed in ~12s; vmmemWSL gone; Optimize-VHD retry succeeded.
- Intermittent respawner observed: twice the Ubuntu distro spontaneously returned to Running minutes after terminate (vmmemWSL new PIDs 39796, then 9896). `wsl.exe -l -v` polling does NOT cause it (proven: Stopped across queries). Cause unidentified (suspects: Docker Desktop backend probe, scheduled task); left for the record — it does not affect compacted VHDXs.
- Final state re-secured: `wsl.exe --shutdown`, vmmemWSL GONE, docker-backend GONE.

## COMPACTION (mechanism: Optimize-VHD -Mode Full, Hyper-V module, PowerShell 5.1)
Order: WSL first, Docker second (as tasked).

1. WSL ext4.vhdx — Optimize-VHD completed in 1.4 min.
2. Docker docker_data.vhdx — Optimize-VHD completed in 0.9 min (no lock; docker-desktop distro already Stopped).

## AFTER (recorded 2026-09-30T12:31:38Z)

| Item | BEFORE | AFTER | Delta |
|---|---|---|---|
| C: free | 25,526,083,584 (~23.78 GiB) | 77,394,272,256 (~72.08 GiB) | **+51,868,188,672 (~48.31 GiB) recovered** |
| WSL ext4.vhdx | 127,245,746,176 (~118.51 GiB) | 95,504,302,080 (~88.95 GiB) | -31,741,444,096 (~29.56 GiB) |
| Docker docker_data.vhdx | 113,669,832,704 (~105.86 GiB) | 95,293,538,304 (~88.75 GiB) | -18,376,294,400 (~17.12 GiB) |

Success metric (Windows C: bytes actually recovered): **+51.87 GB (~48.3 GiB)**. C: free went from ~4.8-5% to ~15.6% of the 496 GB volume.

## END STATE FOR PHASE 5
- WSL: all distros Stopped, vmmemWSL GONE. Docker: all 11 containers stopped, docker-backend GONE.
- :3100 down (died with WSL). Restart path: /home/nolan/start-3100.sh ONLY.
- Container restart list: see the 11 containers in BEFORE section above (incl. brain-postgres :5432 source truth, ping-postgres :5433, ping-vault was UNHEALTHY before shutdown).
- No deletions performed in this phase. No restarts performed. E: untouched. Nothing written to D:.
- One anomaly for Phase 5 to know: an unidentified intermittent process restarts the Ubuntu distro on its own (observed twice); if WSL is unexpectedly Running at Phase 5 start, that is the likely cause, not a Phase 4 leftover.
