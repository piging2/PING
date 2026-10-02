MEMORY.md

<!-- Curated long-term memory. Keep durable business facts, preferences, and commitments here. Keep day-to-day execution details in daily notes. -->

Business

* User’s name: Nolan Geske, goes by Nolan.
* Runs PING Social, currently without an LLC.
* PING Social is an AI concierge and business automation consultancy for home service businesses.
* Primary market (2026-09-09, Nolan's call): Western Colorado first, expanding outward from there. Denver-area outreach is deprioritized.
* Uses Quo as the communications and phone platform.
* PING Social’s role is consultative: understand each business’s workflow and recommend AI services that solve its actual problems rather than selling a one-size-fits-all package.

Business Positioning

* PING Social helps home service businesses capture more opportunities, reduce administrative work, respond faster, and operate more consistently.
* The core value proposition is less busywork and fewer missed opportunities while keeping the business owner and skilled worker in control.
* Technology should strengthen the worker and owner, not replace their judgment.
* AI should handle repetitive communication, organization, follow-up, and administrative work so people can focus on customers, jobs, and decisions that require human judgment.
* Position PING Social around practical business outcomes, not AI hype.
* Keep pitches brief, conversational, direct, and credible.
* Never oversell or make AI sound like a replacement for the trade professional.
* PING Social is new and eager to help local companies adopt AI; frame early engagements as a limited-time trial while the service is being developed and refined.
* Market PING Social itself more aggressively (2026-09-11, Nolan's call): he is setting up Google Workspace and will build a PING Social website soon. Blue collar businesses are the explicit target market.
* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).
* PING Social brand language (2026-09-14, Nolan's call): PIGING is a verb; page stories and captions depict how each image relates to the business.
* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig. The canonical design (locked from Nolan's chosen front-desk image 2026-09-14): smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved stripe markings on the cheeks, gold hands, purple suit with gold trim. Cute but slightly scary. Body rule (2026-09-13, Nolan's words, hard rule): he is NEVER a fat pig, he is a surprisingly metabolically healthy scary slender pig pimp. Slender and tall in every generation, no chubby or stocky variants. All trade variants (plumber, electrician, HVAC, front desk) keep this exact head/character and only change the outfit/scene. Canonical queue images: ~/workspace/ping-content/inbox/ping-pig-suit.png (Nolan's chosen front-desk image, 2026-09-14), ping-pig-president.png and ping-pig-beggar.png (Nolan's uploads, swapped in 2026-09-14 replacing rejected electrician/HVAC generations), ping-pig-plumber.png (posted), masonry variant (pig laying concrete blocks, 'MASONRY & FOUNDATION BEST PRACTICES' board) approved completely usable 2026-09-14.
* PING Social Facebook Page EXISTS (Nolan corrected the agent 2026-09-13 for not checking memory first): https://www.facebook.com/profile.php?id=61594275542163, created 2026-09-11, 13 followers as of 2026-09-13. FB page search does not surface it; the profile.php?id= URL is canonical. Lesson: search memory before concluding a page/channel does not exist.
* PING Social Page profile picture set to the gold pig logo 2026-09-13 (Nolan's pick, third uploaded image), verified visually. Working automation: ~/workspace/pig-fb/page-profile-pic.js (switch to acting-as-Page via profile switcher, hover photo to reveal the "Profile picture actions" button, Choose profile picture, Upload photo caught via Playwright filechooser event, Save). Key gotchas: CDP window is 786x506 CSS at DPR 1.25 (screenshot px = CSS x 1.25); the profile switch is per-tab so every script must switch and verify ("What's on your mind, PING Social?"); the welcome modal needs a "Use Page" dismiss.

Customer Focus

* Prioritize businesses where missed calls, slow follow-up, scheduling friction, repetitive customer communication, lead management, or administrative workload create measurable business pain.
* Favor solutions that can realistically save time, capture revenue, improve customer experience, or make operations easier to manage.
* Recommend automation based on the customer’s existing workflow and needs.
* Avoid introducing complexity unless the business benefit clearly justifies it.

Operating Principles

* Business first: Start with the customer’s problem and desired business outcome, then determine whether AI is actually useful.
* Human in control: Automation supports owners and workers rather than replacing their judgment.
* Reliable capture: Important customer requests, job information, and follow-up should not disappear because someone was busy.
* Less interruption: Reduce unnecessary calls, messages, repetitive questions, and administrative distractions.
* Less admin drag: Automate repetitive operational work wherever it can be done reliably.
* Practical automation: Favor simple systems that contractors can understand, maintain, and trust.
* Measurable value: Prefer improvements that can be connected to time saved, leads captured, response speed, customer experience, or revenue.
* Nolan's standing leverage rule: actual engagement metrics first (likes, comments, messages); docs, infrastructure, and research support those metrics and must not crowd them out.
* Trust: Never fabricate information, misrepresent PING Social, or pretend to be a customer.
* When researching a prospect's technology stack or public business presence, grade every finding as CONFIRMED, STRONG INDICATION, WEAK INDICATION, or UNKNOWN; never assume or hallucinate which software they use.

Current Commitments

* Running an outreach campaign for PING Social targeting Western Colorado home service businesses.
* Outreach is autonomous: send legitimate emails and submit legitimate contact forms without routine approval requests; skip blocked actions without asking.
* Surface prospect replies, significant mistakes, or decisions that genuinely require Nolan’s input.
* Avoid routine check-ins and unnecessary approval requests.
* Cold email is capped at 10 per UTC day to protect Gmail deliverability; contact forms run at maximum honest volume with no cap.
* Old-laptop topic (2026-09-13, Nolan's call): never raise the old-laptop topic again unless another old laptop becomes absolutely necessary.
* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator. The CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on, kept in the back of the mind as everything moves forward.
* Facebook on the Pig (2026-09-13): cloud FB sessions die within minutes and fresh-profile logins don't persist (FB flags the profile, zero cookies written even with "remember me"). Working setup Nolan approved: always-on headed Chrome on the Pig (dedicated profile + remote-debugging-port 9223), logged in once by him, left running/minimized; Node 22 portable + playwright-core drive it via CDP (`~/workspace/pig-fb/`: engage.js, check_cdp.js, run_pass.sh). Pass cadence and caps are set under Channel priority. If the window closes or Pig reboots, he must log in again in that window.
* Meta AI delegation (2026-09-13, Nolan's directive): Muse builds a versioned context pack from source artifacts (`~/workspace/tandem/build-context-pack.py`), delegates research to Meta AI on the Pig through a structured job envelope, captures raw answers with provenance sidecars, verifies each business, and feeds verified evidence into PING via OBSERVATION_CREATED events (`~/workspace/tandem/emit-observation.py`). Meta AI output is UNVERIFIED external research until the verification gate; never promoted directly into canonical PING claims. PING intelligence boundary (Nolan's call): PING is the common intelligence substrate, NOT a prospect/lead database; only high-quality, generalizable, verified intelligence goes to PING; operational prospect lists stay in the Muse/outreach machinery.
* Antifragility standing machinery (2026-09-14, Nolan's directive; the same day's pipeline audit/grill session verified it live): the tandem/PING pipeline is fail-closed and resumable. The reconciliation watchdog reports capture/emit/distill gaps in typed states; brief rotation retries failed briefs before advancing (b-new-business-radar orphan recovery proven live); a duplicate-emission guard and atomic report/sidecar writes protect every durable boundary. A crash-consistency pass found no silent-success paths, verified fresh-agent reconstruction from artifacts alone, and left reconciliation at gap_count 0.
* Continuity guardrail (2026-09-13, Nolan's directive): never duplicate PING's event system. Before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
* Continuity architecture separation (2026-09-13, Nolan's definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority. The layer must be agent-readable: Muse can query it, Meta AI an appropriate subset.
* Pig desktop access (2026-09-12): SSH key auth WORKS as `muse-ssh@100.79.154.43` via proxy (fixed: authorized_keys had the wrong key). muse-ssh currently sits in BUILTIN\Administrators (troubleshooting leftover) and docker CLI works. The pig-side agent verified the gateway MVP fully operational over Tailscale (Level 1 and Level 2 Bearer auth, file and git operations, workspace persistence across a Windows restart). This cloud agent has now proven both gateway credential levels directly from its own runtime (discover + live fs.list call). Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
* Every outreach message opens with an explicit line stating Nolan is not a customer and this is not a service request, so no form submission can read as a quote request.
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Channel priority (2026-09-10, Nolan's call; Facebook cadence doubled down 2026-09-13): Facebook interactions first (likes at the maximum safe level, expanding beyond small businesses to larger companies when small businesses run out; comments authorized, punchy and short, expert and techy but down to earth and funny, never selling, built to spark friendly interactions and earn profile views; DMs at maximum volume; engagement passes every 6h at max safe caps (50 likes + 15 comments per pass, discovery across 15-20 groups plus business Page feeds)), then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last. Do not chase email volume numbers.
* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit. Efficiency first.
* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), counted inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a "no interest."
* New-business radar (2026-09-11): each engine run dedicates part of its research to brand-new Western Slope trade businesses via Colorado SOS business database (https://co.colorado.gov/search-business-records), city clerk license lists, chamber new-member announcements, and "grand opening" posts in the Facebook groups. Filed/opened within ~60-90 days, tagged NEW with source=new-filing.
* Review-triggered outreach (2026-09-11): monitor pipeline prospects' Google reviews; a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is now a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record (one prospect per line, 30 fields: opportunity primary/secondary/evidence/confidence, ai_discoverability, priority HOT/WARM/WATCH/SUPPRESS, last_signal, suppression_state, next_eligible_action, and the remaining intel fields) plus an auto-generated plain-English MD digest rebuilt after every sweep; the old CSV is abandoned (moved to trash for 30 days, backup kept). known → inferred → unknown is a hard rule. Same sweeps, same schedules, same caps; email follow-ups are signal-aware; review problems get classified into business-problem categories; HOT/WARM prospects get SEO/AEO evaluation; social discovery is labeled signal/unverified/confirmed; closed-loop learning tracks signal → angle → channel → response → outcome toward real conversations and revenue. Full spec in the operations manual section 16.
* Instagram (2026-09-10): the browser session holds reliably even though the same browser killed Facebook sessions within a minute; Nolan's login is saved in secure storage with the 2FA code entered once, so the agent's device should not need to re-authenticate. Both findings came from the assistant's Instagram test reports when the user asked for the Instagram outreach pivot, recorded 2026-09-11.
* Live competitive clowning (2026-09-14, Nolan's directive, phased plan at ~/workspace/marketing-intel/live-clowning-plan.md): the meme layer is a presentation/distribution surface over the intel system, not the product. MVP built: PATTERN_OBJECT schema + validator + three-mode renderer (educate/clown/live) + ranked live queue with freshness windows + receipt-cam format + evidence-only scoreboard. Four patterns from the real GJ map seed; Q10 (booking-path composition) added to the arbitrage queue. Hard rules: joke never evidence, pattern > person, no auto-publish, no auto-tagging, quiet queue beats fabricated queue.
* competitive_signal_pass deterministic skill (2026-09-14, Meta AI's architecture, Nolan's execution order): ~/workspace/skills/competitive-signal-pass/. LLM generates candidates, deterministic gates decide what survives. Four terminal states (PASS/NO_VALUE/BLOCKED/FAILURE), pattern compiler, hard eligibility gates, arbitrage detection, per-run audit artifacts, capability-gap ledger. Acceptance test 28/28 green, including the proof that the agent can be wrong inside the skill without corrupting PING (no write path). Platform automation principle corrected same day (Nolan): respect platform constraints, bounded authorized automation, fail closed on restriction; a detected restriction is BLOCKED, never an optimization problem.
* Competitive technology rollout (2026-09-14, Nolan's directive): build a living Western Colorado competitive technology map (strongest operators, their machinery, reproducible mechanisms, arbitrage queue), reproduce highest-value mechanisms at near-zero marginal cost, and turn proven capabilities into funny truthful marketing (light-hearted competitive clowning: the Marketing Circus, SaaS Stack Graveyard, Agency Magic Trick, PING Receipt). No joke ships without a proven capability. Plan: ~/workspace/marketing-intel/competitive-tech-plan.md. Nolan holds the git side; Pigi does the intelligence/plan side. Expand integration-spec completion beyond Orca frameworks.
* Instagram mass-unfollow (2026-09-14, Nolan's confirmed request, RUNNING): unfollow literally everyone he follows on Instagram (3,706 at baseline). Target ~80/day to finish in about a month and a half; browser-task batch 1 started 2026-09-14 evening, daily cron `instagram-unfollow-batch` fires at 5 AM then waits a random 0-7 hours, so each day's batch starts at a random time between 5 AM and noon (2026-09-14, Nolan's call). Log: ~/workspace/outreach/instagram-unfollow/. He narrowed the ask to Instagram only after first raising Facebook too. Unfollowing goes through the browser, not the CLI tools. Any action block/checkpoint halves the daily target and gets surfaced; a block would also stop the IG engagement passes.
* Facebook page-unfollow cleanup (2026-09-14, Nolan's request): unfollow the ~140 Facebook pages his personal profile follows. Daily `facebook-unfollow-batch` cron: 30 pages/day at slow, account-safe pacing, first batch the morning of 2026-09-15 MDT.
* Preparing for an in-person conversation with the owners of Monument View Coffee Shop in Grand Junction/Redlands, Colorado about potentially improving their website and operational technology.
* Building a comprehensive software playbook (2026-09-09): researching every software home-service businesses use (FSM/CRMs, estimating, payments, call handling, reviews, marketing, lead marketplaces, AI answering competitors) so the pitch can be tailored to each prospect's actual stack.

Communication Preferences

* No em dashes, ever, in anything written for Nolan.
* Keep business communication brief, conversational, and natural.
* Avoid polished sales-script language.
* Lead with the customer’s business problem rather than technical capabilities.
* Explain technical details only when they help establish business value, reliability, trust, or feasibility.

Long-Term Direction

PING Social should become a practical technology partner for home service businesses.

The goal is not to sell businesses “more AI.”

The goal is to help owners run better businesses with technology that:

* captures opportunities,
* reduces interruptions,
* removes administrative drag,
* improves consistency,
* supports skilled workers,
* and gives owners more control over their operations.
* Messenger CLI remains contact-restricted. (Cloud Facebook session watch stays off; Facebook is Pig-only, per 2026-09-13/14.)

## PING gateway pipeline (2026-09-12, PIPELINE COMPLETION MODE)
* Event pipeline boundary secured (2026-09-12): /events, /canonical-events, /ingest and /missions require exterior-agent Bearer auth (L1/L2); POST /events stamps source as `api:<agentId>`; /ops, /governance, /constitution are public read-only GETs. Active worktree curious-squid on constitutional-convergence-v2 holds Nolan-authorized commits, NOT pushed; canonical C:\Users\nolan\PING (main) never touched.
* Bearer keys rotated 2026-09-13 (Nolan's order after a worker printed both keys): new 256-bit keys in the Postgres `exterior_agent_credentials` table and the container env. Gateway auth truth: each request authenticates against the Postgres table (WHERE api_key AND is_active), NOT the container env; env vars are only seed values for an empty table or degraded in-memory mode.
* Canonical goal (2026-09-12, Nolan's directive): ingest business marketing events ASAP; de-spaghetti only as far as that requires. Working preference: a few high-conviction surgical changes over spec-ing everything, always kept pointed at the canonical goal.


## Codex WSL SSH execution boundary (2026-09-15, Nolan's request)
* Codex sandbox root cause found 2026-09-15: the Codex Desktop sandbox runs in a user namespace where root-owned files appear as nobody:nogroup, so /etc/ssh/ssh_config.d/20-systemd-ssh-proxy.conf shows nobody:nogroup 777 and OpenSSH's config security check fails before auth. The real WSL filesystem is correct and was NOT changed. Fix: Codex must bypass the system config with an explicit user-owned config. Persistent config created 2026-09-15: /home/nolan/.ssh/codex_config (600, Host codex-local -> 127.0.0.1, IdentityFile /home/nolan/.ssh/codex_wsl, known hosts at /home/nolan/.ssh/codex_known_hosts). Wrapper: /home/nolan/.local/bin/codex-ssh (exec ssh -F <config>). Validated from normal WSL: ssh -G exit 0, remote SSH_OK/nolan/Pig/PING_WRITABLE/GIT_WRITABLE, harmless touch+rm in /home/nolan/ping OK. Codex must invoke `ssh -F /home/nolan/.ssh/codex_config codex-local '...'`; plain `ssh nolan@127.0.0.1` keeps failing by design. Codex-side confirmation of the persistent config still pending.
* Codex permission-profile limit (2026-09-15, Codex task's own report, Nolan's verdict "Codex kind of sucks"): the task's sandbox permission profile blocks writes to /home/nolan/ping (approval policy never) REGARDLESS of SSH technical access; using localhost SSH to bypass that would violate the task's own authority, and the agent correctly refused. Technical READY != authorized. Environmental issues to revisit eventually: Docker daemon restart, Codex sandbox writability. Nolan's words: "YOU CAN MOSTLY MARK IT COMPLETE BUT WE'LL EVENTUALLY NEED TO REVISIT THESE KIND OF ENVIRONMENTAL ISSUES."

## Three-plane operating model (2026-09-15, Nolan's standing operating framework)
* PING canonical: /home/nolan/ping (4.8GB, 1.8GB .git, main at 6e359a2). WSL repo is clean; Windows C:\Users\nolan\PING is ACTIVE (5 worktrees with changes, 6 stashes, GitHub remote) and cannot be deleted.
* TTS models canonical: /home/nolan/qwen3-tts-models (8.8GB, /dev/sdd ext4). Windows 8.8GB duplicate REMOVED after 114-file md5 verification. Docker images still bake models in (13G+14G).
* Artifact policy: /home/nolan/ping/docs/WSL_FIRST_ARTIFACT_POLICY.md (Windows=thin UI, WSL=engineering, Cloud/Oracle=artifacts).
* Research migration COMPLETE 2026-09-15: /home/nolan/research is now the canonical copy (101,637 files, 3.1GB, VERIFY=PASS). Windows original left untouched per the preserve rule.
* CascadeProjects migration COMPLETE 2026-09-15: all four git repos now live in /home/nolan/projects/ with history and working state intact (CRX_REMOTE, constitutional-runtime, happy-place-platform-forensic, happy-place-platform).
* ENVIRONMENT_READY=NO. Codex: approval_policy=on-request verified, no WSL-path project precedent yet, fresh minimal task test pending Nolan (cannot launch Desktop tasks remotely). Blockers: Oracle bucket provisioning (Nolan), Docker TTS images bake models.
