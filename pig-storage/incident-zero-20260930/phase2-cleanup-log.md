# Incident Zero Phase 2 — Regenerable-bytes cleanup log
Worker session 602c7cf5 | 2026-09-30 ~06:10 MDT (12:10 UTC)
Phase 1 status: GREEN (pg_dump of all 7 brain-postgres DBs verified at /mnt/c/PIG-BACKUPS/incident-zero-20260930/, RESTORE PROVEN YES)

Rule: per class -> BEFORE BYTES -> OWNER/CONSUMER CHECK -> DELETE -> AFTER BYTES -> REBUILD TEST.
Skips are correct outcomes when safety cannot be positively verified.
NOTE: VHDX files are dynamically expanding and do not shrink on guest-side deletion.
All byte figures below are LOGICAL (guest-side). Actual C: recovery requires later compaction.

## Class 0 — Pre-run baseline (12:10 UTC)
- C: FREE = (to read via pigps.sh)
- docker build cache: 22.15 GB total (Shared 18.78 GB, Private 3.367 GB, 123 records, Active 0)
- docker images: 19 total, 75.69 GB unique; volumes: 46, 24.02 GB; containers: 18, 11 running
- Running containers (11): qwen3-tts-service, ping-gateway (repair-cert-20260924), ping-postgres,
  ping-qdrant (healthy), cosyvoice-tts, ping-redis (healthy), ping-vault (unhealthy, pre-existing),
  ollama, brain-postgres, brain-qdrant, open-webui (healthy)
- npm cacache: (to measure)
- .next dirs: (to enumerate)
- copilot/other caches: (to enumerate)

## Class 1 — Docker build cache — DONE
- BEFORE: 22.15 GB (Shared 18.78 GB, Private 3.367 GB, 123 records, Active 0), 12:11 UTC
- CONSUMER CHECK: `docker buildx du` Active=0; `docker ps` showed no build containers; builder
  default running, no buildx activity. No build in flight.
- DELETE: `docker builder prune -af` -> Total reclaimed 22.15 GB
- AFTER: 0 B (12:14 UTC)
- REBUILD TEST: PASS. `docker build --pull=false -t p2rebuildtest:tmp .` (FROM node:24-alpine,
  local base) completed end-to-end (#6 DONE 0.4s, image unpacked). Test image removed; test cache
  re-pruned to 0 B. Two earlier attempts failed only on the pre-existing Windows credential-store
  flake (registry pull auth), unrelated to the prune; local-base build proves the builder is healthy.
- LOGICAL BYTES RECLAIMED: 22.15 GB

## Class 2 — Superseded ping-gateway images
- BEFORE (images, `docker images`): 6 ping-gateway variants total
  - ping-gateway:jev-ns-pure-20260928   e893b7ca6482  1.83 GB  (no container refs)
  - ping-gateway:jev-gate-d9a950a       5f10ca701bea  1.97 GB  (no container refs)
  - ping-gateway:repair-cert-20260924   4472c543484e  1.83 GB  ACTIVE (running container ping-gateway, Up 17h) — DO NOT TOUCH
  - ping-gateway:candidate-fffe99f7a    aa1f085a0673  1.83 GB  ref by STOPPED ping-gateway-prev (Exited 137, 5d ago)
  - ping-gateway:rc-4d522a6b            fb6f3069d642  1.87 GB  ref by STOPPED ping-rc-gateway (Exited 255, 3d ago)
  - ping-gateway:devin-boundary2        5f018a301b3b  1.96 GB  ref by STOPPED ping-gateway-precutover (Exited 137, 5d ago)
- DELETE: `docker rmi e893b7ca6482` -> DELETED (untagged jev-ns-pure-20260928);
  `docker rmi 5f10ca701bea` -> DELETED (untagged jev-gate-d9a950a);
  `docker rmi aa1f085a0673` -> BLOCKED (stopped container 35d047d4241e, ping-gateway-prev);
  `docker rmi fb6f3069d642` -> BLOCKED (stopped container f70f0e10125a, ping-rc-gateway);
  `docker rmi 5f018a301b3b` -> BLOCKED (stopped container f63b48fc8c44, ping-gateway-precutover).
- AFTER: 17 images, unique size 67.61 GB -> 65.88 GB = 1.73 GB logical reclaimed
  (listed virtual size of the 2 removed was 3.80 GB; remainder shared layers with active image)
- REBUILD/HEALTH TEST: PASS. Active image 4472c543484e inspects OK; ping-gateway container
  still running repair-cert-20260924 (Up 17h). No containers removed.
- SKIPS (correct outcome): candidate-fffe99f7a, rc-4d522a6b, devin-boundary2 — each pinned by a
  STOPPED container; removing the image would require --force or container removal, both NOT
  authorized. Recorded for parent/parent review.
- LOGICAL BYTES RECLAIMED: 1.73 GB (unique-size basis; 3.80 GB virtual-size basis)

## Class 3 — Orphaned docker volumes — DONE (partial, fail-closed)
- BEFORE: 46 volumes total, 14 active, 24.02 GB; 32 dangling (0-link); reclaimable 1.032 GB (12:16 UTC)
- CONSUMER CHECK: every dangling volume mount-read via read-only one-shot container
  (node:24-alpine, `ls -la` + `du -sh` + `find -type f`). Classification:
  - PROVEN EMPTY (4.0K, no files): 02a2220afb46, 08b574e9ce7a, curious-squid_ping_ollama,
    curious-squid_ping_postgres, curious-squid_ping_qdrant,
    ca2f2aa4e2213ef87ba686c5a85b8b534182d8d36c12756aeccc53b3763581f8,
    constitutional-runtime_ping_vault, ping_ping_ollama, ping_ping_postgres
  - PROVEN-EMPTY QDRANT SKELETON (raft_state.json + empty collections/aliases only):
    constitutional-runtime_ping_qdrant, qdrant_storage
  - SKIPPED (real Postgres data dirs, 38-73 MB each, provenance unknown): 4e93c4a5d7a4b...,
    19c5cf6219fa..., 78bac22f8f04..., 425a9c09bca4..., 1600f39fac71..., 4326fdecc212...,
    463953c199da..., 565869d62fb3..., 84977110dda5..., ae3e1e52e0ab..., b154c1bc635d...,
    cc660f1eddce..., d042e00788c05..., dfa4fb8d1f87..., e4fc8e41574a..., fee65c500bf79...,
    constitutional-runtime_ping_postgres, pgdata. Reason: full PG_VERSION/base/pg_wal layouts
    = real databases; cannot prove no canonical/user data without DB-level inspection; the task
    authorizes removing only proven-empty/proven-regenerable volumes. Fail-closed.
  - SKIPPED (contains SSH key material): constitutional-runtime_ping_ollama
    (id_ed25519 + .pub + models dir). Reason: secrets handling; provenance uncertain. FLAGGED
    to parent for a human decision.
- DELETE: `docker volume rm` on the 11 proven-empty ones — all succeeded.
- AFTER: 35 volumes total, 21 dangling; 24.02 GB total (removed volumes were KB-scale, below
  df granularity). All 11 running containers unaffected (docker ps count unchanged at 11).
- REBUILD TEST: PASS. Volume create+rm round-trip (p2testvol) OK.
- LOGICAL BYTES RECLAIMED: ~0.0001 GB (negligible; honest figure). The ~1.0 GB of dangling PG
  data remains for a future human-authorized disposition.
- SKIPS: 20 volumes (18 PG data dirs + 1 SSH-key volume + ... ) recorded above with reasons.

## Class 4 — npm cache — DONE
- BEFORE: 3.9 GB at /home/nolan/.npm/_cacache (12:25 UTC)
- CONSUMER CHECK: no npm install in flight (pgrep found only two `npm start` servers on :3100
  etc., which read node_modules, not the cache). npm 10.9.8 functional before clean.
- DELETE: `npm cache clean --force` -> _cacache dir removed entirely
- AFTER: 0 B (dir gone; npm cache verify: "Content verified: 0 (0 bytes), Index entries: 0")
- REBUILD TEST: PASS. `npm --version` -> 10.9.8; `npm cache verify` OK. Cache repopulates on
  next install by design.
- LOGICAL BYTES RECLAIMED: 3.9 GB

## Class 5 — .next build caches — DONE (31 deleted, 3 skipped)
- BEFORE: 33 .next dirs, 5,674,362,378 bytes total (~5.29 GiB) at 12:30 UTC
- OWNER/CONSUMER CHECK: for each dir verified package.json + next.config.* present and git status
  clean of hand-built output (git repos: archives/codex_documentation, projects/ping,
  happy-place-platform all clean). Running-server check: PID 50519 `npm start -p 3100` serves
  /home/nolan/projects/ping-fyd-converged; PID 50637 `npm run start` serves
  .../apps/editorial-preview. Those .next dirs are live server state -> SKIPPED.
- SKIPS (correct outcomes):
  1. /home/nolan/projects/ping-fyd-converged/.next (375 MB) — backing live :3100 server (HTTP 200 verified after)
  2. .../apps/editorial-preview/.next (107 MB) — backing live `npm run start` server
  3. /home/nolan/worktrees/copper-v2/.next (44K) — no package.json/next.config at parent; source-intact check impossible
- DELETE: rm -rf on the other 31 .next dirs (incl. ping-website/website 1.7G,
  happy-place-platform/website 1.5G, ping 461M, lane7-3104 354M, copper-v2/fyd-product-lane 271M,
  20x ui-next 2.0M stubs, etc.)
- AFTER: 2 .next dirs remain (the 2 in-scan skips); editorial-preview .next untouched (depth>5, never listed)
- REBUILD TEST: PASS. `npm run build` in /home/nolan/projects/ping-editorial-template (node_modules
  present, source intact) -> RC=0, "Generating static pages (4/4)", .next regenerated at 48M.
  All other deleted dirs are same-class (package.json + next.config + node_modules/source intact).
  Live :3100 still HTTP 200 after the class.
- LOGICAL BYTES RECLAIMED: 5,192,313,953 bytes (~4.84 GiB / 5.19 GB), net of the 48M test rebuild

## Class 6 — copilot cache + other LOW-MED caches — DONE
- BEFORE (12:35 UTC): copilot 1.5G (tgrep-index 805M + pkg 657M + state 620K), ms-playwright 658M,
  puppeteer 653M, uv 404M, pip 133M, node-gyp 132M, electron 110M, node 23M, next-swc 7.2M,
  opencode 5M; ~/.cache total ~3.6G
- CONSUMER CHECK: pgrep for copilot/playwright/puppeteer/chrome/chromium/pip-install -> no active
  processes. Pig browser automation runs on Windows portable node + CDP (AGENTS.md), not these WSL
  browser binaries; no lane was running an install.
- DELETE: rm -rf of copilot/tgrep-index + copilot/pkg (kept copilot-user-cache.json,
  exp-cache.json, managed-settings/, mcp-tools/ = 620K state, provenance state-like),
  ms-playwright, puppeteer, electron, pip, uv, node-gyp, node, next-swc, opencode
- AFTER: ~/.cache = 3.5M total; copilot dir = 620K (state preserved)
- REBUILD TEST: PASS. pip 25.1.1 functional; `pip download --no-deps six` succeeded and the pip
  cache regenerated (104K) proving the cache path works. No `copilot` binary on PATH (driven via
  copilot-broker); tgrep-index and pkg are copilot-managed on-demand artifacts that re-extract/
  rebuild on next copilot use — documented as credibly regenerable, same-class as proven pip case.
- LOGICAL BYTES RECLAIMED: ~3.59 GB

## Close-out verification — 12:40 UTC
- docker ps: all 11 containers running, same set as pre-run (qwen3-tts-service, ping-gateway
  [repair-cert-20260924], ping-postgres, ping-qdrant healthy, cosyvoice-tts, ping-redis healthy,
  ping-vault [unhealthy, PRE-EXISTING since baseline], ollama, brain-postgres, brain-qdrant,
  open-webui healthy). Zero containers removed, zero restarted.
- brain-postgres: `docker exec brain-postgres psql -U postgres -tAc 'SELECT 1'` -> 1 (healthy).
  Gateway image 4472c543484e inspects OK.
- :3100 (ping-fyd-converged, .next preserved) -> HTTP 200.
- NOT TOUCHED per authorization: active images, Ollama models (compose_ollama_data),
  qdrant/open-webui/postgres active volumes, cosyvoice 15GB writable layer, git repos/worktrees/
  stashes, TTS models, voice corpus, Devin DB/WAL, /mnt/c/PIG-BACKUPS backup dir.
- docker system df final: Images 17 / 65.88GB; Volumes 35 / 24.02GB; Build Cache 0B.

## C: free tracking (VHDX does not shrink on guest deletion — expected)
- Baseline (11:27 UTC): C: FREE = 25.39 GB
- Close (12:40 UTC): C: FREE = 24.01 GB
- Delta -1.38 GB is from INTERVENING WRITES, not deletions: Phase 1 pg_dump landing in
  /mnt/c/PIG-BACKUPS (C:), rebuild-test artifacts (61MB docker test, 48M .next rebuild),
  journal/WAL churn. None of the Phase 2 deletions wrote to C: directly. Actual C: recovery
  requires the later compaction phase (wsl --shutdown + Optimize-VHD).

## TOTALS — LOGICAL BYTES RECLAIMED (guest-side)
| Class | Before -> After | Reclaimed |
|---|---|---|
| 1. Docker build cache | 22.15 GB -> 0 B | 22.15 GB |
| 2. Superseded gateway images (2 of 5 removed) | unique 67.61 -> 65.88 GB | 1.73 GB |
| 3. Orphaned volumes (11 of 32 removed) | 32 -> 21 dangling | ~0.0001 GB |
| 4. npm cache | 3.9 GB -> 0 B | 3.90 GB |
| 5. .next build caches (31 of 33 removed) | 5.67 -> ~0.48 GB (net of 48M rebuild) | 5.19 GB |
| 6. copilot/pkg caches + browser/pip caches | ~3.6 -> ~0.004 GB | 3.59 GB |
| **TOTAL** | | **~36.56 GB logical** |

## SKIPS (all correct outcomes, recorded with reason)
- 3 gateway images (candidate-fffe99f7a, rc-4d522a6b, devin-boundary2): pinned by STOPPED
  containers; rmi requires --force or container removal, neither authorized.
- 18 dangling volumes: real Postgres data dirs (38-73 MB each, PG_VERSION/base/pg_wal layouts,
  Sep 18-24 + CRX Jul 28); cannot prove no canonical data without DB-level inspection.
- 1 volume (constitutional-runtime_ping_ollama): contains id_ed25519 private key + pubkey;
  secrets handling, provenance uncertain. FLAGGED FOR HUMAN DECISION.
- 3 .next dirs: 2 backing live servers (:3100 ping-fyd-converged 375MB; editorial-preview 107MB),
  1 unverifiable (copper-v2/.next 44K, no package.json/next.config).
- copilot user-cache/state files (620K): state-like, kept.
- Remaining ~1.0 GB dangling PG data awaits human-authorized disposition.
Status: PHASE 2 COMPLETE, all rebuild tests PASS, runtime healthy.
