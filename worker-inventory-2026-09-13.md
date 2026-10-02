# Worker Inventory — Nolan's Agent Ecosystem (2026-09-13)

Read-only inventory. Every claim cites the file or live check it came from.
Columns: AGENT | CAPABILITIES | TRANSPORT | INPUT | OUTPUT | AUTHORITY | PERSISTENCE | SCHEDULER | RETRY | PROVENANCE | PING INTEGRATION | REUSABLE BY OTHER AGENTS?

## 1. Facebook engagement worker
| Col | Detail |
|---|---|
| AGENT | `fb-engagement-worker`: `~/workspace/pig-fb/engage.js` + `~/workspace/pig-fb/run_pass.sh` + `~/workspace/pig-fb/check_cdp.js` (diagnostic) + cron `facebook-engagement-pass` |
| CAPABILITIES | Likes and comments on Facebook posts from the Pig's logged-in Chrome. Per-action verification (like: button state flips to Unlike / "Like: N" count changes; comment: text visible after submit). Aborts the pass instantly if page text matches checkpoint/action-block/verification patterns. 60-120s randomized human pacing between actions. Never closes the browser. |
| TRANSPORT | SSH: `run_pass.sh` scp's the job JSON to the Pig and runs `node.exe .../fb-engage/engage.js <job>` over ssh; engage.js drives Chrome via CDP (`chromium.connectOverCDP('http://localhost:9223')`, playwright-core). Invoked by a cron-spawned agent running `~/workspace/pig-fb/run_pass.sh /tmp/fb-job-<ts>.json`. |
| INPUT | Job file `/tmp/fb-job-<ts>.json`: `{"actions":[{"type":"like"\|"comment","url":"<full post URL>","text":"..."}],"minDelaySec":60,"maxDelaySec":120}`. Job content is drafted by the cron agent after facebook-cli discovery; rules + never-re-engage list in `~/workspace/outreach/facebook-engagement.md`. |
| OUTPUT | `<job>.result.json` written next to the job on the Pig (`C:/Users/nolan/.local/share/pigi/fb-engage/inbox/`): `{ok, logged_in, results:[{type,url,ok,note}]}`. `run_pass.sh` polls up to 3h (60s interval) and prints the result JSON. Exit codes: 0 = pass completed (even with failed actions), 2 = infra (scp/CDP/result-timeout/logged_out), 3 = CDP attach failed, 4 = logged_out, 5/6 = worker exception. Cron appends a dated pass section to `~/workspace/outreach/facebook-engagement.md`. |
| AUTHORITY | Nolan's Facebook session inside the Pig's dedicated headed Chrome (`C:/Users/nolan/.local/share/pigi/fb-profile`), acting from Nolan's home IP. |
| PERSISTENCE | Result JSONs in the Pig inbox dir; full engagement history + never-re-engage Page/post list in `~/workspace/outreach/facebook-engagement.md`. |
| SCHEDULER | `facebook-engagement-pass` cron (`~/workspace/goals/ping-social-outreach-campaign/crons/hourly/facebook-engagement-pass__interval@8h.md`), every 8h America/Denver, timeout 5400s, enabled. Caps: 40 likes + 10 comments/pass. |
| RETRY | `run_pass.sh` pre-flights `ensure-cdp.sh` (fires the PigiFBLogin recovery task, waits ~90s). On infra exit 2 the run ends quietly; the next pass retries in 8h. No mid-pass retry of failed actions. On any checkpoint/action-block the worker halves next pass caps (logged). |
| PROVENANCE | Per-action `{type,url,ok,note}` results; `logged_in` flag; dated log sections with verbatim comment text and post URLs. |
| PING INTEGRATION | None. |
| REUSABLE? | **Yes.** Job-JSON-in / result-JSON-out service. Any agent can write a job file and run `run_pass.sh`. |

## 2. Meta AI research worker
| Col | Detail |
|---|---|
| AGENT | `meta-ai-research-worker`: `~/workspace/pig-fb/meta-ask.js` + `~/workspace/pig-fb/meta-pass.sh` + `~/workspace/tandem/build-context-pack.py` + 4 prompts (`~/workspace/tandem/prompts/a-weak-website-hunt.md`, `b-new-business-radar.md`, `c-review-complaint-signals.md`, `d-segment-deep-dive.md`) + cron `meta-ai-intel-pass` |
| CAPABILITIES | Builds a versioned research context pack from authoritative files (never from memory); appends one rotating research brief; sends it to Meta AI in a new tab of the Pig's logged-in Chrome; waits for the streamed answer (stable-text detection, up to ~9 min); pulls raw bytes back via scp; decodes by BOM with strict UTF-8 fallback; saves answer + provenance sidecar. |
| TRANSPORT | SSH/scp to the Pig; CDP to `127.0.0.1:9223` from `meta-ask.js` (playwright-core). Invoked by cron agent: `bash ~/workspace/pig-fb/meta-pass.sh <slug>`. |
| INPUT | `<slug>` (a/b/c/d). Pack sources (retrieved by `build-context-pack.py`): `~/workspace/outreach/pitch.md` (positioning), `~/AGENTS.md` (targeting line), `~/workspace/your_files/western-co-prospects.jsonl` (brief-aware negative signals: businesses already covered), `~/workspace/your_files/prospect-digest.md` (counts). Full prompt = pack + `~/workspace/tandem/prompts/<slug>.md` (includes verification contract + output schema + PING boundary notice). |
| OUTPUT | `~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/<TS>-<slug>.md` (raw answer) + `<TS>-<slug>.provenance.json` (`brief_id, timestamp, research_agent=meta-ai, context_pack_version, status=unverified, verification=pending, ping_ingestion=pending`). Advances `rotation.txt` (a→b→c→d). Pack cached at `~/workspace/tandem/.pack-cache/<slug>-<sha1:10>.md`. Stdout: `SAVED <path> pack=<ver>` or `INFRA <reason>`, exit 2 on infra. |
| AUTHORITY | Nolan's own logged-in Meta AI session (meta.ai) on his Pig, used at his direction. |
| PERSISTENCE | Answer files + sidecars + `ingested.log` watermark + `rotation.txt` in `hidden_files/meta-ai-intel/`; versioned pack cache in `~/workspace/tandem/.pack-cache/`. |
| SCHEDULER | `meta-ai-intel-pass` cron (`~/workspace/goals/ping-social-outreach-campaign/crons/hourly/meta-ai-intel-pass__interval@6h.md`), every 6h; runs up to ~15 min. |
| RETRY | INFRA failures (`pack_build_failed`, `cdp_down_after_relaunch`, `scp_failed`, `worker_failed`, `pull_failed`) exit 2 and are reported; the next rotation runs in 6h. No in-run retry. |
| PROVENANCE | `.provenance.json` sidecar per answer; pack version = sha1(content)[:10]; rotation position tracked. |
| PING INTEGRATION | Indirect. The outreach engine's step 4e verifies each named business via independent web search, dedupes, adds qualified ones to `pipeline.md` (operational, stays out of PING), and emits `OBSERVATION_CREATED` via `emit-observation.py` **only** for high-quality generalizable verified intel (consumer needs, failure patterns, market signals — never one event per business). Sidecar then updated to `verified/failed` + `ping_ingestion` status. |
| REUSABLE? | **Partially.** The scripts are generic, but Nolan's standing rule restricts the Meta AI route to these four prospect-research prompts only. |

## 3. PING event emitter
| Col | Detail |
|---|---|
| AGENT | `ping-event-emitter`: `~/workspace/tandem/emit-observation.py` |
| CAPABILITIES | POSTs a single `OBSERVATION_CREATED` event to the PING gateway. |
| TRANSPORT | SSH to the Pig → PowerShell `-EncodedCommand` → `docker exec ping-gateway printenv MUSE_LEVEL_1_KEY` (Bearer token resolved at runtime from container env, never stored) → `Net.WebClient` POST to `http://127.0.0.1:8080/events`. |
| INPUT | `emit-observation.py <brief_id> <observation_text> [aggregate_id]` (default aggregate `meta-ai-<brief_id>`). Body: `{event_type: OBSERVATION_CREATED, aggregate_id, aggregate_type: research_pass, event_data: {research_agent, brief_id, verification_status, observation}}`. |
| OUTPUT | Prints gateway response (first 500 chars). Exit 0 only if ssh/rc 0, no `POST-ERR`, and `event_id` in response. |
| AUTHORITY | PING gateway Level-1 Bearer credential (`MUSE_LEVEL_1_KEY`); gateway stamps `source=api:muse` on the persisted event. |
| PERSISTENCE | Event persisted in gateway Postgres (`ping_events`); nothing stored locally except caller logs. |
| SCHEDULER | None (on-demand; called by outreach engine step 4e). |
| RETRY | None built-in; exit 1 on failure, caller retries next sweep. If gateway 503s: check PG readiness, `docker restart ping-gateway` (per `~/AGENTS.md`). |
| PROVENANCE | Returned `event_id`; gateway causal lineage via `GET /events/:id/descendants\|ancestors`. |
| PING INTEGRATION | **Yes — this is the PING writer.** Emits `OBSERVATION_CREATED`. |
| REUSABLE? | **Yes.** Fully generic; any agent can emit an observation with a brief_id and text. |

## 4. Chrome/CDP watchdog + ensure-cdp.sh
| Col | Detail |
|---|---|
| AGENT | `chrome-cdp-watchdog`: Windows scheduled task `PigiFBLogin` → `C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog.ps1`; plus `~/workspace/pig-fb/ensure-cdp.sh` (caller-side pre-flight) |
| CAPABILITIES | Watchdog: probes `http://127.0.0.1:9223/json/version`; if down, stops ONLY chrome processes whose command line contains the fb-profile path (never Nolan's personal Chrome), then relaunches headed Chrome with `--user-data-dir=<fb-profile> --remote-debugging-port=9223 --start-maximized https://www.facebook.com/login`. `ensure-cdp.sh`: same probe from the VM; if down, fires `schtasks /run /tn PigiFBLogin` and waits ~90s. |
| TRANSPORT | Task Scheduler (watchdog); SSH (`schtasks /run`) + HTTPS probe (`ensure-cdp.sh`). |
| INPUT | None. |
| OUTPUT | Watchdog appends timestamped lines to `C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog.log` (trims to last 500 lines past 5000). `ensure-cdp.sh` exits 0 (CDP up) / 1 (still down). |
| AUTHORITY | Runs as `nolan`, interactive logon session (task: `PigiFBLogin`, verified `Ready`, next run ticking every 5 min as of 2026-09-13 10:14 MDT). Requires his desktop session alive; backup of original task XML at `C:/Users/nolan/.local/share/pigi/PigiFBLogin.backup-20260913.xml`. |
| PERSISTENCE | `chrome-cdp-watchdog.log` on the Pig. |
| SCHEDULER | `PigiFBLogin` at nolan logon AND every 5 min indefinitely; `ensure-cdp.sh` is called as pre-flight by `run_pass.sh` and `meta-pass.sh`. |
| RETRY | Self-healing 5-min loop. Hard limit: if the window was closed or the Pig rebooted, the FB/Meta AI sessions are gone and Nolan must log in again manually in that window. |
| PROVENANCE | Watchdog log timestamps every recovery action. |
| PING INTEGRATION | None. |
| REUSABLE? | **Yes.** `ensure-cdp.sh` is a generic CDP-readiness gate any agent can call before Pig-browser work. |

## 5. Facebook session watch
| Col | Detail |
|---|---|
| AGENT | `facebook-session-watch`: cron definition only, no dedicated script (`~/workspace/goals/ping-social-outreach-campaign/crons/hourly/facebook-session-watch__interval@2h.md`) |
| CAPABILITIES | Checks the cloud browser's Facebook login state; per Nolan's standing rule, automatically starts the re-login flow when logged out; checks `browser.list_tasks` first so it never stacks duplicate login attempts. Login-state check only — no likes/comments/messages. |
| TRANSPORT | Cron-spawned agent → browser task (parent-agent capability): open facebook.com, report signed-in vs login form; on logout, spawn re-login task (saved login / passkey restore, "Remember me" checked, iPhone approval handoff). |
| INPUT | None. |
| OUTPUT | Silent when signed in. On logout: re-login task spawned; one short user-facing line ("Facebook logged out again, re-login started, approve the prompt on the iPhone"), suppressed 22:00–07:00 America/Denver. |
| AUTHORITY | Browser's saved Facebook login / passkey restore; Nolan approves on his iPhone. |
| PERSISTENCE | `~/workspace/goals/ping-social-outreach-campaign/hidden_files/session-watch.log`. |
| SCHEDULER | `facebook-session-watch` cron, every 2h, timeout 600s, enabled. (Largely legacy since engagement moved to the Pig, but still enabled per standing rule.) |
| RETRY | Next check in 2h; the login task waits on Nolan's iPhone approval. |
| PROVENANCE | `session-watch.log`. |
| PING INTEGRATION | None. |
| REUSABLE? | Pattern only (the cron markdown). Requires parent-agent browser-task capability; not a callable script. |

## 6. Instagram engagement
| Col | Detail |
|---|---|
| AGENT | `instagram-engagement`: cron `instagram-engagement-pass` → browser task as `nolanpigi` |
| CAPABILITIES | Up to 35 likes + 8 comments per pass on Western Colorado home-service trade business accounts (business accounts only); 60–120s human pacing; view each post fully first; comment voice (<20 words, funny-first, never selling); discovery of new handles into `~/workspace/outreach/instagram-prospects.md`; instant stop on any action block/checkpoint/verification; never re-engage a handled handle. |
| TRANSPORT | Cron-spawned agent → browser task (parent-agent capability; headed/cloud browser holding the saved `nolanpigi` session — session holds reliably, 2FA completed once with "Trust this device"). NOTE: `instagram-cli` (skill) exposes NO like/comment write targets — engagement is browser-only; the CLI is reads. |
| INPUT | Pass number; rules + never-re-engage handle list from `~/workspace/outreach/instagram-engagement.md` (read first every pass). |
| OUTPUT | Dated pass section appended to `~/workspace/outreach/instagram-engagement.md` (likes with handles + post URLs, verbatim comments + post URL, skips + why, anomalies); new prospect handles in `~/workspace/outreach/instagram-prospects.md`. |
| AUTHORITY | Nolan's Instagram session (`nolanpigi`); login saved in secure storage. |
| PERSISTENCE | `~/workspace/outreach/instagram-engagement.md` (full pass history + never-re-engage list); `~/workspace/outreach/instagram-prospects.md`. |
| SCHEDULER | `instagram-engagement-pass` cron (`~/workspace/goals/ping-social-outreach-campaign/crons/hourly/instagram-engagement-pass__interval@3h.md`), every 3h America/Denver, timeout 3600s, enabled. |
| RETRY | If login can't be restored → zero engagement, report. On any warning → halve next pass caps, note in log. Next pass in 3h. |
| PROVENANCE | Per-pass dated sections with verbatim comments, handles, post URLs. |
| PING INTEGRATION | None (discovery feeds the JSONL pipeline, not PING). |
| REUSABLE? | **No as-is** — requires parent-agent browser-task capability; there is no script interface. The cron markdown is a reusable pattern. |

## 7. Gmail worker
| Col | Detail |
|---|---|
| AGENT | `gmail-worker`: gmail skill → `hatch_gws_cli gmail` (`/opt/hatch/skills/gmail/SKILL.md`) |
| CAPABILITIES | `+triage` search, `+read`/threads get, `+send`, `+reply`/`+forward`, `+draft` + drafts update, labels, attachments, `status`/connect flows. Engine uses it for reply checks (step 1) and cold sends (step 6): cap 10/UTC-day, follow-ups (F1/F2/review-triggered) sent first, FIFO after. |
| TRANSPORT | CLI via exec (`hatch_gws_cli gmail <cmd>`); OAuth connector. |
| INPUT | Skill commands, e.g. `+send --to <addr> --subject <s> --body <b>`; Gmail search syntax queries. |
| OUTPUT | JSON results. Gmail acceptance flips pipeline status: SENT / F1 SENT / F2 SENT (only after acceptance — drafting is DRAFTED/QUEUED, never CONTACTED). |
| AUTHORITY | Nolan's connected Google account (OAuth); sends as Nolan (from `nolangesk@gmail.com` for forms). |
| PERSISTENCE | Gmail itself; outcomes in `~/workspace/outreach/responses.md`, `follow-ups.md`, `angle-performance.md`, `email-queue-<UTC-date>.md`. |
| SCHEDULER | None of its own; driven by `ping-social-outreach-engine` every 3h. |
| RETRY | Per standing rule, the engine counts Gmail-accepted sends for the current UTC day before sending (never trusts an in-memory count); queued drafts roll to the next UTC day automatically. |
| PROVENANCE | Gmail-accepted = SENT; per-prospect rows in pipeline/leads/follow-ups logs. |
| PING INTEGRATION | None directly (campaign insights may be emitted by the engine via `emit-observation.py`). |
| REUSABLE? | **Yes.** Any agent with the skill can run `hatch_gws_cli gmail`. |

## 8. Messenger worker
| Col | Detail |
|---|---|
| AGENT | `messenger-worker`: `messenger_read` skill → `hatch_messenger_cli` (`/opt/hatch/skills/messenger/SKILL.md`) |
| CAPABILITIES | Read/search contacts, threads, messages, call history; `send`/`react`/`edit`/`unsend`; Marketplace threads. **Hard constraint:** refuses to send to anyone not in synced Messenger contacts (no override) — engine reroutes such prospects to published phone/email instead. |
| TRANSPORT | CLI via exec (`hatch_messenger_cli <subcommand>`); Messenger Companion connection. |
| INPUT | e.g. `hatch_messenger_cli send --cid '<ID>' --text-stdin` or `send --to '<FBID>' --text-stdin`; recipient must resolve via contacts/thread per skill rules. |
| OUTPUT | Send confirmations; every send/skip/reroute logged in `~/workspace/outreach/facebook-dms.md`. DM SENT status flips only after acceptance. |
| AUTHORITY | Nolan's Messenger account; sends as Nolan (never as Muse). |
| PERSISTENCE | Messenger threads; `~/workspace/outreach/facebook-dms.md`. |
| SCHEDULER | None; driven by outreach engine (max 10 DMs/day incl. follow-ups), step 2. |
| RETRY | Contact-restricted: unresolvable recipients are rerouted, not retried. |
| PROVENANCE | `facebook-dms.md` log; pipeline DM SENT statuses. |
| PING INTEGRATION | None. |
| REUSABLE? | **Yes.** Any agent can use the CLI per the skill's recipient-resolution rules. |

## 9. facebook-cli skill
| Col | Detail |
|---|---|
| AGENT | `facebook-cli` companion CLI (`/opt/hatch/skills/facebook-cli/SKILL.md`; `/opt/hatch/skills/facebook/SKILL.md` is the same skill under a duplicate directory) |
| CAPABILITIES | Read-mostly: `me`, friends search, `feed newsfeed|friends`, `timeline fetch`, `profile info`, `post comments|reactions read`, `groups search` + `groups posts`, `saved`, stories; Marketplace search + own-listing CRUD (writes need approval). **No like/comment/DM write paths** — engagement goes through the Pig worker. |
| TRANSPORT | CLI via exec; Meta Accounts Center connected account (API-based, works from the cloud — used for discovery while browser sessions die). |
| INPUT | Subcommands, e.g. `facebook-cli groups posts --group-id 5456977881034408` (Western Colorado Message Board & Classifieds; 6 group IDs listed in the engine cron). |
| OUTPUT | JSON, paginated (`data[]` + cursors). |
| AUTHORITY | Nolan's connected Facebook account (Nolan Geske). |
| PERSISTENCE | None local (reads); signals feed the JSONL via the engine. |
| SCHEDULER | None; used by `facebook-engagement-pass` (discovery) and outreach engine step 2. |
| RETRY | Re-run `facebook-cli me` on auth errors; connect-url flow if unlinked. |
| PROVENANCE | Caller logs (`facebook-scan-round*.md`, sweep summaries). |
| PING INTEGRATION | None directly. |
| REUSABLE? | **Yes.** General-purpose Facebook read API for any agent. |

## 10. Outreach engine
| Col | Detail |
|---|---|
| AGENT | `ping-social-outreach-engine`: the cron-spawned agent itself is the worker (no separate script). Definition: `~/workspace/goals/ping-social-outreach-campaign/crons/hourly/ping-social-outreach-engine__interval@3h.md` |
| CAPABILITIES | 8-step sweep: (1) Gmail reply check + follow-up ladder (F1 day 4-7, F2 day 10-14, ≤3 touches); (2) Facebook prospecting/intel via facebook-cli + social.search (new-business radar from group posts); (3) pipeline work — opportunity engine (9 opportunity types, pitch primary only) + personalization engine (WHY THIS BUSINESS packet) + draft writing; (4) marketing intel: 4a new-business radar (SOS/chamber), 4b review-triggered outreach, 4c SEO/AEO discoverability, 4d social discovery, **4e Meta AI tandem ingest + PING emission (verification gate)**; (5) contact forms only where B2B is unmistakable; (6) cold email ≤10/UTC-day; (7) learnings + content queue (never auto-publish); (8) sweep summary. |
| TRANSPORT | Cron-spawned LLM agent using: gmail/facebook-cli/messenger skills, `social.search`, `browser.search`, browser tasks, scripts (`~/workspace/outreach/prospect-digest.py`), `~/workspace/tandem/emit-observation.py`. |
| INPUT | `~/workspace/outreach/pitch.md`, `leads.md`, `pipeline.md`, `facebook-dms.md`, `learnings.md`, `follow-ups.md`, `angle-performance.md`; canonical `~/workspace/your_files/western-co-prospects.jsonl` validated by `~/workspace/outreach/prospect-schema.json` (30 fields; known→inferred→unknown hard rule; 300-active quality cap). |
| OUTPUT | Drafts `~/workspace/outreach/drafts/round<N>-<slug>.md`; JSONL updated atomically (build in memory → validate → `.tmp` → verify → `os.replace`); `~/workspace/your_files/prospect-digest.md` rebuilt via `prospect-digest.py`; sweep summary `~/workspace/goals/ping-social-outreach-campaign/hidden_files/sweep-<UTC-date>-round<N>.md`. |
| AUTHORITY | Nolan's standing perpetual authorization (runs until he says stop; only tool/rate limits stop it); acts as PING Social / Nolan Geske across Gmail, Messenger, Facebook (Pig), Instagram (browser task). |
| PERSISTENCE | JSONL + digest + pipeline/leads/follow-ups/responses/angle-performance/content-queue/learnings; per-round sweep summaries in `hidden_files/`. |
| SCHEDULER | `ping-social-outreach-engine` cron, every 3h America/Denver, timeout 5400s, enabled. Efficiency rule: every subsystem (follow-ups, radar, review triggers, intel) runs inside its sweeps — no new schedules. |
| RETRY | Next sweep in 3h; email drafts exceeding the UTC-day cap queue in `email-queue-<date>.md` and send when the cap reopens (never held for approval). Never raises volume on signal; caps/ladders absolute. |
| PROVENANCE | `sweep-*.md` per round (NEW SIGNALS / FOLLOW-UPS / OPPORTUNITIES / SOCIAL INTELLIGENCE / SEO-AEO / HOT / SUPPRESSED / LEARNING); outcome rows in `angle-performance.md`. |
| PING INTEGRATION | **Yes — step 4e.** Verifies Meta AI answers (independent web search per business), dedupes, stages operational prospects in `pipeline.md` (never in PING), and emits `OBSERVATION_CREATED` only for generalizable verified intel (hard boundary: PING is the intelligence substrate, never a prospect DB). |
| REUSABLE? | As a pattern (the cron markdown is the spec). The engine is goal-owned and stateful — not a callable service. |

## 11. SSH / machine access
| Col | Detail |
|---|---|
| AGENT | `pig-ssh`: `~/workspace/bin/pig` + `~/workspace/bin/pigread.py` |
| CAPABILITIES | Run arbitrary commands on the Pig (Windows) via Tailscale SSH. `pigread.py` runs PowerShell via base64 `-EncodedCommand` (avoids the stdin hang) and strips XML tags from output. |
| TRANSPORT | `ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes -o ConnectTimeout=20 -o UserKnownHostsFile=~/workspace/pig/known_hosts -o ProxyCommand='nc -X connect -x hatch-egress-proxy:3130 %h %p' muse-ssh@100.79.154.43`. Host key pinned (fails closed on change). |
| INPUT | `pig <command...>` or PowerShell script on stdin to `pigread.py`. |
| OUTPUT | Remote stdout/stderr. |
| AUTHORITY | `muse-ssh` Ed25519 key; account currently in BUILTIN\Administrators (troubleshooting leftover, per `~/MEMORY.md`); docker CLI works. |
| PERSISTENCE | None (transport only). |
| SCHEDULER | None; on-demand. Used by `run_pass.sh`, `meta-pass.sh`, `ensure-cdp.sh`, `emit-observation.py`, and all Pig forensics. |
| RETRY | None built-in; callers set timeouts and handle failures. |
| PROVENANCE | None built-in; callers log. |
| PING INTEGRATION | None (it is the transport the emitter and gateway mgmt ride on). |
| REUSABLE? | **Yes — the universal Pig transport. Most reusable primitive in the ecosystem.** |

## 12. Docker on the Pig (gateway hosting)
| Col | Detail |
|---|---|
| AGENT | `docker-gateway-mgmt`: docker CLI via `pig` SSH. No compose file and no manager script exist (checked `C:/Users/nolan/PING`, `C:/Users/nolan`, `~/.local/share/pigi`). |
| CAPABILITIES | `docker ps/exec/inspect/restart/logs` on: `ping-gateway` (image `curious-squid-gateway:phase4-eventauth6`, port 8080, restart `unless-stopped`, volume `muse-workspace`), `ping-postgres` (postgres:15-alpine), `ollama`, `qwen3-tts-service` (:5000, NVIDIA), `open-webui` (:3001), `crx-ui-next`, `brain-postgres`, `brain-qdrant`. Live-checked 2026-09-13. |
| TRANSPORT | `~/workspace/bin/pig docker ...` (SSH). |
| INPUT | docker CLI args. |
| OUTPUT | docker CLI output. |
| AUTHORITY | `muse-ssh` (docker CLI works for this account). |
| PERSISTENCE | Restart policy `unless-stopped` keeps the gateway alive across reboots; rollback images retained (phase3-auth → phase4-eventauth → eventauth2/3/4 chain, per `~/MEMORY.md`). |
| SCHEDULER | **None — no cron or watchdog manages Docker.** Liveness is restart-policy only. Known gap (red-team 2026-09-13, `~/workspace/tandem/REDTEAM-2026-09-13.md`): gateway startup/readiness is the highest-leverage gap; fixing needs Nolan's authorization. |
| RETRY | Manual: on gateway 503s, check PG readiness then `docker restart ping-gateway` (per `~/AGENTS.md`). |
| PROVENANCE | `docker logs`; image tags. |
| PING INTEGRATION | Hosts the PING gateway itself (port 8080, Bearer-auth `/events`) — the thing everything emits to. |
| REUSABLE? | **Yes.** Any agent with pig SSH can run docker commands. |

## 13. Git workers
| Col | Detail |
|---|---|
| AGENT | **None as code.** No commit/push scripts exist in `~/workspace` or `C:/Users/nolan/.local/share/pigi/` (verified by `find`). Git work is manual SSH commands run by agents. |
| CAPABILITIES | N/A. Last git work: 4 commit groups on `curious-squid` (`constitutional-convergence-v2`) committed 2026-09-12 ~19:00 MDT on Nolan's explicit authorization, unpushed. |
| TRANSPORT | `pig` SSH → `git` in `C:/Users/nolan/PING` (+ 5 linked worktrees: `calm-garden`, `curious-squid`, `eager-moon`, `kind-comet` under `C:/Users/nolan/.local/share/opencode/worktree/`, plus `C:/Users/nolan/PING-promotion`). |
| INPUT / OUTPUT | Ad-hoc. |
| AUTHORITY | `muse-ssh` on the Pig; commits as the agent. |
| PERSISTENCE | PING repo worktrees. Live state 2026-09-13: `main` ahead 1 of `origin/main`, dirty (`.dockerignore` M, `.tmp.driveupload/*` D); `curious-squid` at `bce92787`. |
| SCHEDULER | None. |
| RETRY | N/A. |
| PROVENANCE | `git log`. |
| PING INTEGRATION | None. |
| REUSABLE? | N/A — no script interface. The reusable part is the `pig` transport. |

## 14. OpenCode / other agent CLIs
| Col | Detail |
|---|---|
| AGENT | `opencode`: config present, **not currently scheduled or running**. `C:/Users/nolan/.config/opencode/opencode.jsonc` exists but is near-empty (only `$schema`). 4 PING worktrees under `C:/Users/nolan/.local/share/opencode/worktree/` (`calm-garden`, `curious-squid`, `eager-moon`, `kind-comet`) are residue of past opencode sessions. No devin/aider/cursor CLIs found in workspace or pigi dirs. |
| CAPABILITIES | Dormant. |
| TRANSPORT | N/A. |
| INPUT / OUTPUT | N/A. |
| AUTHORITY | N/A. |
| PERSISTENCE | Worktree checkouts (reusable as git checkouts). |
| SCHEDULER | None. |
| RETRY | N/A. |
| PROVENANCE | Worktree branch names. |
| PING INTEGRATION | None. |
| REUSABLE? | Worktrees reusable as checkouts; opencode itself is not wired to any schedule. |

## 15. Local AI workers (Pig)
| Col | Detail |
|---|---|
| AGENT | `ollama` container (image `ollama/ollama`, port 11434 published on the Pig → reachable at `http://100.79.154.43:11434` over Tailscale) + `qwen3-tts-service` (port 5000, NVIDIA runtime) + `open-webui` (port 3001) + `brain-qdrant`/`brain-postgres` |
| CAPABILITIES | Models present (live `docker exec ollama ollama list`, 2026-09-13): `qwen2.5-coder:14b` (9.0 GB), `qwen2.5-coder:7b` (4.7 GB), `llama3:latest` (4.7 GB), `nomic-embed-text:latest` (274 MB). **Zero callers found**: grep for `ollama|11434|open-webui` across `~/workspace` (*.md/*.py/*.sh/*.js/*.json) hits only unrelated docs/snapshots — no script, cron, or doc references them. |
| TRANSPORT | Would be HTTP (Ollama API). Currently unused. |
| INPUT / OUTPUT | N/A (dormant). |
| AUTHORITY | N/A. |
| PERSISTENCE | Models baked into the container volume. |
| SCHEDULER | None. |
| RETRY | N/A. |
| PROVENANCE | `docker exec ollama ollama list`. |
| PING INTEGRATION | None. |
| REUSABLE? | **Yes, trivially — dormant capacity.** Any agent on the tailnet could call the Ollama API today (`nomic-embed-text` + `brain-qdrant` suggest a RAG substrate that was never wired up). |

## 16. social.search discovery
| Col | Detail |
|---|---|
| AGENT | `social-search`: the `social.search` tool, invoked inside outreach engine steps 2 and 4d |
| CAPABILITIES | Free-text semantic search across Instagram, Threads, Facebook (filters: `semantic_queries`, `platform`, `location`, `since/until`, `group_names`, `authors`, `post_url` direct lookup). Used for: identifying group-post authors facebook-cli strips, new-business/opening signals, complaint/chatter signals. Labeled signal/unverified/confirmed; discovery + market intel only, never automated engagement. |
| TRANSPORT | Tool call (not CLI/SSH). |
| INPUT | `social.search` params (`semantic_queries[]`, `platform`, `location`, `since`, `post_url`, `top` ≤ 25). |
| OUTPUT | Ranked post summaries. |
| AUTHORITY | Nolan's connected social graph. |
| PERSISTENCE | None; findings feed the JSONL via the engine. |
| SCHEDULER | None; engine-driven. |
| RETRY | On infrastructure error → fall back to `browser.search` (per tool docs); never retry the tool itself. |
| PROVENANCE | Engine logs label each finding signal/unverified/confirmed. |
| PING INTEGRATION | None directly. |
| REUSABLE? | **Yes.** Any agent can call `social.search`. |

## 17. Browser-task mechanism
| Col | Detail |
|---|---|
| AGENT | `browser-task`: parent/root-agent capability used by `instagram-engagement-pass` and `facebook-session-watch` |
| CAPABILITIES | Headed/cloud browser automation: login-state checks, saved-session restores, passkey/device-approval handoffs (iPhone), Instagram likes/comments, form reads. Screenshots persist under `~/workspace/.hatch-browser/`. |
| TRANSPORT | Delegated by the parent agent. **Subagents cannot spawn browser tasks** — any browser-action need must be returned to the parent for delegation. |
| INPUT | Natural-language brief per cron (site, account, caps, voice rules). |
| OUTPUT | Agent report + appended log sections; screenshots in `~/workspace/.hatch-browser/snapshots/`. |
| AUTHORITY | Saved sessions (Instagram `nolanpigi` w/ trusted-device 2FA; Facebook saved login + iPhone approval). |
| PERSISTENCE | `~/workspace/.hatch-browser/` artifacts. |
| SCHEDULER | Via the two crons above. |
| RETRY | Per-cron rules (IG: halve caps on warning; session-watch: 2h re-check). |
| PROVENANCE | Browser snapshots + cron logs. |
| PING INTEGRATION | None. |
| REUSABLE? | Only via parent delegation; not a script. |

---

## Orphans / dormant / partial workers

- `~/workspace/pig-fb/check_cdp.js` — CDP login check (`LOGIN ok|logged_out`). Used manually for diagnosis (cited in `~/workspace/outreach/facebook-engagement.md` prose); not referenced by any cron. Semi-dormant diagnostic.
- `~/workspace/pig-fb/meta-check.js` — meta.ai login-state check. Manual diagnostic; not scheduled. Semi-dormant.
- `~/workspace/pig-fb/check_login.js` — legacy: launches its own headless persistent context for the fb-profile. Superseded by the CDP-attach approach (`connectOverCDP`, never launch/close). Dormant.
- `~/workspace/pig-fb/dbg.js` — one-off facebook.com debug + screenshot. Dormant.
- `~/workspace/pig-fb/probe-like.js`, `probe-like2.js`, `probe-like3.js`, `probe-like4.js`, `probe-like-click.js` (+ Pig-side `probe5.js`, `probe6.js` in `C:/Users/nolan/.local/share/pigi/fb-engage/`) — Like-button selector dev probes from the `engage.js` build. Dormant.
- `~/workspace/outreach/assemble-round40.py`, `~/workspace/outreach/jsonl-merge-round31.py` — one-off round scripts. Dormant (not referenced by any cron).
- `~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/*.QUARANTINED*` — corrupt outputs from the 2026-09-13 UTF-16 mojibake incident (fixed by the byte-exact scp path). Dead; safe to delete after review.
- Fired runonce crons (historical, not workers): `facebook-blackout-end`, `instagram-engagement-pass-2..5` (outreach campaign), `ping-gateway-morning-retry` (gateway integration goal).
- `~/workspace/tandem/.pack-cache/` — build artifacts, not a worker.

## Most reusable as-is — top 5

1. **`~/workspace/bin/pig` + `~/workspace/bin/pigread.py`** — the universal Pig transport (SSH + PowerShell). Every Pig-side worker builds on it; any agent can run anything on the Pig with it.
2. **`~/workspace/tandem/emit-observation.py`** — generic PING `OBSERVATION_CREATED` emitter. Bearer token resolved at runtime from the gateway container env (never stored); any agent can emit an observation with a brief_id and text.
3. **`~/workspace/pig-fb/ensure-cdp.sh`** — generic CDP-readiness gate: probes :9223, fires the existing `PigiFBLogin` recovery task on demand, waits ~90s. Any agent doing Pig-browser work can pre-flight with it.
4. **`~/workspace/pig-fb/run_pass.sh` + `engage.js`** — Facebook engagement as a service: job JSON in, result JSON out, typed exit codes. Any agent can drive likes/comments without touching CDP.
5. **The skill CLIs** — `facebook-cli` (read API), `hatch_gws_cli gmail`, `hatch_messenger_cli`, `instagram-cli`, `social.search`: documented, general-purpose, no custom interface needed.

Honorable mention: `~/workspace/tandem/build-context-pack.py` — versioned, content-hashed context retrieval from authoritative files; a reusable pattern for any future delegation (Muse retrieves, worker researches).
