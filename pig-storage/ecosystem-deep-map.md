# Ecosystem Deep Map — 2026-09-30

Read-only survey. No writes, no restarts, no config changes. Synthesized from three deep-dive crews (Pig plane, cloud VM plane, glue + flows) plus the 2026-09-29 Pigpen survey. Items not verifiable are marked UNKNOWN.

---

## 0. The organism in one paragraph

One human (Nolan), two machines, one tunnel. The **cloud VM** (/home/hatch) is mission control: ~60 crons, all the pipeline brains, memory, the marketing OS, and every external API call — it plans, guards, ledgers, and dispatches but never touches a browser. **The Pig** (100.79.154.43, Grand Junction) is the body: Windows host + WSL2 Ubuntu + 11 Docker containers, a headed Chrome that acts human on five social platforms, and 9 watchdog tasks that restart anything that dies. The **Tailscale tunnel** is the nervous system, and it only fires one direction: cloud → Pig. The Pig cannot reach back. **PING** is the canonical memory: an event/evidence store fronted by a gateway, with the cloud and Pig both writing into it and Mission Control reading it back as a projection. On top sit the agents in strict pecking order — Nolan > Muse/Pigi (cloud operator) > Hermes (Pig harness, currently down/idle) + Copilot identities (quota workers) — with Devin outside the chain as Nolan's personal tool. The whole organism is currently running on 26 GB of free space on the Pig's C: drive, one dead flash drive, and a 1 TB SSD arriving in about a week.

---

## 1. Per-plane inventory

### 1.1 Cloud VM plane (this machine) — the brain

**Cron layering (3 layers):**

- **Layer 1 — nervous system** (health/tunnel/SSH watches, alert-only, never self-heal): `pig-tunnel-watch` (5m, raw CONNECT probe), `pig-health-heartbeat` (15m, SSH/WSL/Docker/containers/CDP/disk), `pig-ssh-watch` (30m, classified failure states), `pig-route-watch` (10m), `ops-watch-gateway` (5m), `ops-watch-oom` (15m), `ops-watch-listener` (30m), `ops-watch-backups-am/pm` (daily), `ops-watch-daily` (06:21).
- **Layer 2 — workers** (the production machinery, 2h cadence): `facebook-engagement-pass`, `instagram-engagement-pass`, `threads-engagement-pass`, `x-engagement-pass`, `tiktok-engagement-pass`, `facebook-engagement-collect` (15m), `ping-social-outreach-engine` (2h, currently HELD — see §4b), `ping-social-outreach-discovery-research` (3h, append-only sibling), `ping-page-daily-post-side` (daily 08:21, draft-only). Plus `fyd-ping-daily-harvest`, `ping-perfecting-pass`, `ping-pipeline-reconcile`, `meta-ai-intel-pass`, unfollow batches.
- **Layer 3 — system:** `feed-pulse-00..23` (hourly Feed-tab generation), `deterministic-doctor` (1h), `heartbeat` (30m), `workspace-mirror-to-pig` (6h), `dormant-authority-tripwire` (2h), overnight one-shots (e.g. `overnight-morning-report`).

**Hooks:** none registered (`hooks.list` empty).

**Shared safety machinery** (every platform): `engagement-guard.py` (mechanical never-re-engage, fail-closed), `action-intent-ledger.py` (append-only JSONL state machine; UNKNOWN_EXECUTION terminals are never auto-retried), `authority-check.py` (fail-closed pre-action gate; "a schedule is NOT authorization").

**Engagement pipelines:** all brains on cloud, all hands on Pig. Per-platform drivers under `~/workspace/pig-fb/` (run_pass.sh, ig-pipeline.py, x-engage.sh, tk-engage.js, th_run_js.sh); CDP endpoints on Pig: fb :9223, x :9225, ig :9226, tt :9227. Caps: FB 75+20, IG 50+12, Threads 45+12, X 30 likes-only (API credits dead since 2026-09-22), TikTok 60+20. 60–120s pacing; browser-lock mutual exclusion (one driver per profile).

**Outreach engine:** canonical store `~/workspace/your_files/western-co-prospects.jsonl`; channel priority FB Page DMs → forms → cold email last (10/day Gmail cap, verified per-send); every message carries the not-a-customer disclosure + AI identity + blank-line sentences + "PING Social, (970) 589-3309" signoff. Currently HELD (STOP CUSTOMER PURSUIT 2026-09-28; fail-closed).

**Memory systems:** `~/MEMORY.md` (curated, worker read-only) + `~/memory/YYYY-MM-DD.md` daily logs + `people/` + `groups/`; cron bodies instruct workers to log observations to the daily note; `muse.memory_search/get/explain` is the retrieval path.

**Marketing OS:** `~/workspace/marketing-os/` (SYSTEMS, CONTENT-ENGINE, VIDEO-PLAYBOOK, EXPERIMENT-PLAN 30-post discovery, NICHE-ANALYSIS frozen baseline); `~/workspace/ping-content/` (queue.json, captions.md with CONTENT HUMOR CHECK gate, inbox/, packages/). Daily draft cron is approval-only.

**Mission Control:** backend PROVEN for read paths (`/api/mc/` — today, agents, graph, object, trace-forward, search) over the PING event/evidence plane, served on :3100 `/mission-control`; UI is a labeled read-only projection; mutation controls withheld. Open work: backend wiring from the 12 harvest picks (backend before UI).

**Glue outward:** cloud → Pig via `pigwsl-exec` (WSL) / `pigps.sh` (Windows); `workspace-mirror-to-pig` 6h one-way rsync cloud→Pig with dead-tunnel detection (~90s) and catch-up scheduling. Hermes dispatch is on-demand via `prompt-hermes.sh` (bridge at `C:/Users/nolan/hermes-bridge/`).

### 1.2 Pig Windows plane — the street

The physical host. Runs: the headed Chrome house browser (76 chrome.exe processes at probe; CDP :9223 verified 200, Chrome/153.0.8010.53), Docker Desktop, 9 enabled scheduled tasks + 1 disabled (`PigiGatewayWatch`, `PING-TunnelWatch`, `FYD-Tailscale-3100` portproxy, `PigiFydStackWatch`, login keepers FB/IG/LI/TT/X, `PigiPopBrowser` disabled), Devin agent app (9.4 GB: sessions.db ~6 GB + WAL), tailnet node 100.79.154.43. "Oracle" (`ubuntu@Oracle`) is reachable only *through* Pig WSL. This is the only plane that touches the real internet like a person.

### 1.3 Pig WSL plane — the workshop

Ubuntu (kernel 6.6.114.1), 31 GB RAM. Home of: agent harnesses, FYD served sites (:3100, demo-owner mode always on), journal gateways (:18199–18202), voice corpus (`/home/nolan/voice-factory-data/`, 1.4 GB), git checkouts, `~/.copilot-identities/` (identities 2–10 on disk; **identity_1 absent, unexplained**), `~/.hermes` (openrouter/gpt-4o-mini, own cron ticker, bot_relay with **empty roster** — no process running, last heartbeat Sep 28 16:04, ~36h: DOWN or idle). Its entire disk is one 118 GB `ext4.vhdx` sitting on C:.

### 1.4 Container plane — the engine room (18 containers: 11 running, 7 exited)

**Running:**

| Name | Image | Ports | Role | Data owned |
|---|---|---|---|---|
| ping-gateway | ping-gateway:repair-cert-20260924 | 8080 | PING API front door (26 route modules; stateless) | none locally |
| brain-postgres | postgres:15-alpine | host 5432 | **LIVE database** (gateway points here: `ping_runtime`) | source truth: ping_events, ping_missions, knowledge_nodes; crx_runtime (43 tables); h13_* experiment DBs |
| ping-postgres | postgres:15-alpine | host 5433 | legacy/standby CRX postgres — **no observed live consumer** | UNKNOWN consumer |
| ping-redis | redis:alpine | 6379 | cache/queue (BullMQ/outbox) | **empty** (dbsize 0) — derived, currently nil |
| ping-qdrant | qdrant/qdrant:latest | internal only | gateway's *configured* vector store | **zero collections**; gateway has no API key for it → vector path almost certainly broken |
| brain-qdrant | qdrant/qdrant:latest | host 6333–6334 | the populated RAG store | derived: `knowledge` (401 pts, 0 indexed vectors), `constitutional_documents` (26), `constitutional_memory` (0) |
| ping-vault | hashicorp/vault:2.0.3 | 8200 | secrets — "unhealthy" is a **healthcheck misconfig** (TLS probe vs plaintext HTTP); actually live, unsealed | no observed consumer (gateway has no VAULT_ env) |
| ollama | ollama/ollama | 11434 | local LLM inference | models: qwen2.5-coder 1.5b/7b/14b, llama3, nomic-embed-text |
| open-webui | open-webui:main | host 3001 | Nolan's local chat UI | source truth: chats/settings in its sqlite volume |
| qwen3-tts-service | qwen3-tts-qwen-qwen3-tts | 5000 | TTS voice synthesis, working | derived audio; source profiles on host bind mounts |
| cosyvoice-tts | qwen3-tts-docker-cosyvoice-tts | 5001 | podcast/voice-clone — **actually HEALTHY** (`model_loaded:true`, successful jobs 2026-09-30 00:13–00:17 UTC); corrects the earlier "broken" claim | models + data on host binds |

**Exited (stale, fail-safe to leave):** ping-gateway-prev, ping-gateway-precutover, ping-rc-gateway (+ rc-postgres), ping-test-pg, ping-gauntlet-pg, swarm02-pg — old RC/test artifacts. No compose manages the live stack (docker-run style launches).

**Key corrections vs the earlier survey:** the live DB is **brain-postgres :5432**, not :5433; vault's "unhealthy" is a misconfigured probe, not an outage; CosyVoice is healthy now; the gateway's configured vector path (ping-qdrant) is effectively dead while the populated one (brain-qdrant) is what Open WebUI/RAG actually uses.

---

## 2. The glue

**Exact route, every hop:** cloud VM → HTTP CONNECT proxy `hatch-egress-proxy:3130` (unauthenticated, TCP only; resolves to `fd8b:4f84:7d32:99::1`) → `nolan@100.79.154.43:22` (Windows OpenSSH, ed25519) → `wsl -- bash -c` (parsed through Windows CMD first) → optionally `powershell.exe -EncodedCommand <base64-UTF16LE>`. `pigwsl-exec` base64s bash payloads (never pass literal single-quoted substrings — proven mangling quirk); `pigps.sh` adds the PowerShell layer with zero quoting fights.

**Directionality:** the cloud VM is a tailnet **client only** — makes outgoing connections, accepts none. **All initiation is cloud → Pig. The Pig cannot reach back into the cloud VM.** Nodes: cloud VM, the Pig, "Oracle" (via Pig WSL only). `ping-core-01` appears in logs but is UNKNOWN as a node.

**Ports reachable from cloud through the proxy:** :22, :8080, :5432, :5433, :6379, :8200, :11434, :3001, :5000, :5001, :6333–6334, FYD :3100. **CDP ports 9223/9225/9226/9227 are Windows-localhost only** — probed from WSL via PowerShell `Invoke-WebRequest http://127.0.0.1:<port>/json/version`.

**The 2026-09-27 wedges:** two events (11:11–12:47 MDT ~96 min; ~13:50–14:03 ~13 min). Signature: proxy TCP OK, CONNECT tunnel fails, SSH never reached; cloud tailnet fine; Pig state unreachable. First hypothesis (flapping wired NIC) falsified by wedge 2 occurring after the disable. Lane-1 root cause, HIGH confidence: **Windows Modern Standby (S0 idle)** — event log shows standby entry ~30–37 min before each wedge onset and touchpad wake at recovery; 172 connectivity-disconnect events for WiFi + Tailscale in standby. Wedge-2 recovery was **Nolan's physical touchpad wake**, not any watchdog (PING-TunnelWatch can't run in standby). Nolan's binding order: no more networking state changes until the first failing boundary is localized; later power policy: **on AC, Pig sleep and display-off = Never**; battery untouched.

**Watch crons (detection only, never remediate):** tunnel-watch 5m (raw CONNECT, reports on transition), ssh-watch 30m (classified failures), route-watch 10m (layered diagnosis), health-heartbeat 15m (SSH/WSL/Docker/containers/CDP/disk). Pig-side `PING-TunnelWatch` (5m, SYSTEM) is the only remediator (ipconfig /renew, Tailscale restart) — and it cannot act during standby.

---

## 3. The agents

**Pecking order:** Nolan (owner; all authority, all holds/releases) > Muse/Pigi (cloud operator; autonomous within standing law; tasks Hermes and Copilot identities) > Hermes (Pig harness, own ticker, bot_relay) + Copilot identities 1–4 (quota-bounded CLI workers via copilot-broker). **Devin sits outside the chain** — Nolan's personal interactive tool; no evidence Pigi can task it. Engagement/outreach/content crons are execution workers, not agents with authority.

**Where each runs / what it can touch:**

- **Muse/Pigi:** cloud VM. Reads/writes cloud workspace, runs all crons, calls internet APIs directly (gmail, facebook-cli, x_api, Threads, Instagram skills — none via tunnel). Reaches the Pig only as `nolan` via pigwsl-exec/pigps.sh. Boundaries: no pushes, no main/master commits, no credential exposure/rotation, no destructive git/data actions, no production state changes on hypothesis, no new authorities, owner approval gates, no interference with running engagement/outreach crons or the ig/fb-profile browsers. Cannot operate a live browser directly (delegates).
- **Hermes:** Pig WSL `~/.hermes` (mode 700), openrouter/gpt-4o-mini, own cron ticker + bot_relay (roster empty). **Currently DOWN or idle** (no process; last heartbeat Sep 28 16:04). Boundaries: surgical writes only; same hard lines as Pigi.
- **Devin:** Pig Windows interactive app; 9.4 GB (sessions.db ~6 GB + WAL). Do-not-touch (active DB; relocation needs app-consistent backup or shutdown). Not taskable by Pigi.
- **Copilot identities:** Pig WSL `~/.copilot-identities/`; identities 2–10 exist, **identity_1 missing (UNKNOWN when/why)**. Rule: 1–4 for real bounded work, 5–10 DENIED, tokens burned freely. Tasked via copilot-broker (`copilot -p --output-format json --max-ai-credits N`, token scrubbing); OAuth is a human step.

---

## 4. The flows (every hop named)

### 4a. Facebook engagement pass
cron `facebook-engagement-pass` (2h, cloud) → fb-degraded-probe.py gate → build-fb-job.py builds `/tmp/fb-job-<ts>.json` from `~/workspace/outreach/facebook-engagement.md` → never_reengage.py prune → run_pass.sh: authority-check (fail-closed) → flock → fb-worker-probe → engagement-guard filter → intents to `action-intent-ledger.jsonl` → scp job+worker **through tunnel** to Pig inbox `C:/Users/nolan/.local/share/pigi/fb-engage/inbox/` → mark EXECUTION → WMI-detached PowerShell launches portable node → engage.js → `chromium.connectOverCDP('http://127.0.0.1:9223')` → house fb-profile Chrome executes (60–120s pacing) → fsync'd progress/result JSONL → `facebook-engagement-collect` (15m, cloud) downloads results → per-action OBSERVATION in ledger → pass log appended. **Most fragile hop:** the house Chrome session — if Nolan closes the window or the Pig sleeps/reboots, only Nolan can log back in. Runner-up: the tunnel.

### 4b. Outreach cold-email send — CURRENTLY HELD
`ping-social-outreach-engine` (2h) is **disabled**: AUTHORITY.json records STOP CUSTOMER PURSUIT (2026-09-28 ~15:44 MDT) vs an enabled schedule = authority contradiction, fail-closed. The 6h discovery-research sibling continues **append-only** (NEW candidates, never sends). As designed: engine pulls NEW rows → drafts per pitch.md (disclosure + AI identity + blank-line sentences + signoff) → pre-send-check.py reconciliation → Gmail accepted-count (cap 10/day UTC) → gmail skill (cloud → Gmail API, internet, **no Pig**) = SENT; forms via delegated live-browser tasks; FB DMs via Pig Chrome. **Most fragile hop:** crash between Gmail acceptance and local logging → duplicate sends (pre-send-check exists for this).

### 4c. Voice generation via Qwen :5000
Corpus `/home/nolan/voice-factory-data/` (1.4 GB) on Pig. Intended: `generate_with_profile.py` loads `VOICE_PROFILE_MY_VOICE.json` → POSTs multipart to `http://localhost:5000/clone` → wav to `/app/voice-output/`. **Two verified path failures:** (1) the script hardcodes `/app/...` container paths but `/app` doesn't exist on Pig WSL — it can only run *inside* the container via `docker exec`; (2) the profile's `primary_reference.audio_path` (`/app/voice-segments/SRC-VOICE-000002/seg_002_60-90.wav`) exists **neither on host nor in container** — FileNotFoundError even in-container. Reachability from cloud (:5000 via proxy) is fine; the failure is Pig-local. **Most fragile hop:** reference-audio path resolution.

### 4d. Daily PING Page content draft
cron `ping-page-daily-post-side` (daily 08:21, cloud; **approval-only, never publishes**). facebook-cli (cloud → Meta Graph API, internet, no Pig): `pages account-insights` + `pages posts list` for page 1262592440277855 → two-table report vs frozen baselines in NICHE-ANALYSIS.md → format rotation → CONTENT HUMOR CHECK gate → image from inbox/ via queue.json → full package delivered to side chat + observation line to daily memory note. **Most fragile hop:** facebook-cli auth — if it lapses, the draft degrades to no-data (metrics are never invented). Tunnel irrelevant here.

---

## 5. PING itself: source truth vs derived truth

**Source truth (writers append, nobody rewrites):** `ping_events` / `ping_missions` / `knowledge_nodes` in `ping_runtime` on brain-postgres :5432; `crx_runtime` (43 tables: hpp_projects, mission_executions, event_processing, citations, objects, deployment_registry); journal gateways :18199–18202; Open WebUI's sqlite (its own chats); the append-only intent ledgers (JSONL, cloud); h13_* experiment DBs.

**Derived truth (recomputable, losable):** brain-qdrant vectors (RAG over source content), redis (currently empty), Mission Control's `/api/mc/` read projection, memory summaries, feed units.

**"Canonical" in practice:** the gateway :8080 is the front door — `/ingest` for canonicalization intake, `/events` (auth-gated, with children/descendants/ancestors and correlation lookup), `/canonical-events`, `/missions`, `/knowledge`, `/mc/*`. It is stateless compute over postgres+qdrant+redis; if postgres is down at boot it serves 503-degraded (that's what PigiGatewayWatch guards). Projections never feed back into source tables.

---

## 6. Pressures and single points of failure

**Current pressures:** C: ~94% used (26 GB free); WSL ext4.vhdx 118 GB + Docker docker_data.vhdx 106 GB are immovable without export/import; E: flash drive **dead/retired** (37 disk errors); D: 6.42 GB free, healthy; NUSYN 1 TB SSD ETA ~1 week; Hermes down/idle; vault healthcheck misconfigured (no impact); gateway's configured vector path (ping-qdrant) effectively broken; `~/.copilot-identities/identity_1` missing.

**Top 5 single points of failure:**

1. **C: hitting 100%.** Docker can't write → postgres WAL failures → gateway 503-degraded → PING dark; WSL ext4 can't grow; Windows itself seizes. This is the live incident. The two VHDXs are the immovable furniture; only prune/relocation/NUSYN relieve it.
2. **Tailscale wedge / Modern Standby.** Cloud loses the Pig: all dispatch, collection, watches, mirror, TTS, Ollama, FYD serving go blind simultaneously. Mitigated by the AC-Never-sleep policy; still the most demonstrated failure mode (twice on 2026-09-27).
3. **House Chrome session death.** Only Nolan can re-login; all five engagement pipelines and Pig-side DMs stop. Login keepers can relaunch the browser but cannot re-authenticate.
4. **brain-postgres :5432.** The live event store (ping_runtime + crx_runtime + h13_*). **No verified replica or backup** — the ops-watch-backups crons exist but their coverage was not verified in this pass.
5. **Nolan himself.** Approvals (every post, every remediation needing his word), social logins, OAuth steps, physical wake-ups (wedge-2 recovery). The organism's ultimate single point of failure is its owner being asleep.

**What has no verified backup:** brain-postgres :5432 contents (the actual source truth of PING); Open WebUI sqlite; Devin sessions.db; the WSL distro (118 GB, no export found); Hermes `~/.hermes` state. The 6h workspace mirror is **one-way cloud→Pig** — it is distribution, not backup.

---

## 7. Open questions (UNKNOWNs)

1. **Is there any backup of brain-postgres :5432?** The live event store — ping_events, crx_runtime's 43 tables — has no verified replica, dump, or restore path. This is the most important UNKNOWN: it is the source truth of the whole system.
2. **What do the ops-watch-backups crons actually cover?** They exist and run twice daily, but their check targets were not verified. If they don't cover :5432, the answer to #1 is "no."
3. **Is Hermes down or idle, and does anything still need it?** No process, last heartbeat Sep 28 16:04, bot_relay roster empty. If something tasks it through bot_relay, those tasks are silently unexecuted.
4. What serves the second brain stack's API (no brain-gateway container found)?
5. Full tailnet node inventory beyond cloud VM / Pig / Oracle (`ping-core-01` unverified).
6. When/why `~/.copilot-identities/identity_1` disappeared.
7. Intended consumers of ping-postgres :5433 and ping-vault (both live, neither observably consumed).
8. Whether the gateway's broken qdrant path (empty key-protected ping-qdrant, no key in env) is a live outage for any AI/vector feature — strong inference, not a proven failure.

---

*Corrections to the 2026-09-29 Pigpen survey folded in: live DB is brain-postgres :5432 (not :5433); vault "unhealthy" is a misconfigured probe; CosyVoice :5001 is healthy (jobs ran 2026-09-30 00:13–00:17 UTC); 9 enabled watchdogs + 1 disabled (not 8); outreach engine currently HELD (STOP CUSTOMER PURSUIT); E: dead/retired; outreach TikTok launcher wrapper name unverified.*
