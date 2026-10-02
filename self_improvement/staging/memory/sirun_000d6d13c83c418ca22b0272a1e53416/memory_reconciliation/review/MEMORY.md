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

* PING Social helps home service businesses capture more opportunities, reduce administrative work, respond faster, and operate more consistently, while keeping the business owner and skilled worker in control.
* Technology should strengthen the worker and owner, not replace their judgment.
* AI should handle repetitive communication, organization, follow-up, and administrative work so people can focus on customers, jobs, and decisions that require human judgment.
* Position PING Social around practical business outcomes, not AI hype.
* Keep pitches brief, conversational, direct, and credible.
* Never oversell or make AI sound like a replacement for the trade professional.
* PING Social is new and eager to help local companies adopt AI; frame early engagements as a limited-time trial while the service is being developed and refined.
* Market PING Social itself more aggressively (2026-09-11, Nolan's call); blue collar businesses are the explicit target market.
* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/.
* PING Social brand language (2026-09-14, Nolan's call): PIGING is a verb; page stories and captions depict how each image relates to the business.
* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig. Canonical design: smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved cheek stripes, gold hands, purple suit with gold trim; cute but slightly scary. Body: NEVER a fat pig, a surprisingly metabolically healthy scary slender pig pimp, slender and tall in every generation. Trade variants keep this head/character, only outfit/scene change. Queue images: ~/workspace/ping-content/inbox/ping-pig-suit.png (Nolan's chosen front-desk image, 2026-09-14), ping-pig-president.png, ping-pig-beggar.png (Nolan's uploads, swapped in 2026-09-14 replacing rejected electrician/HVAC generations), ping-pig-plumber.png (posted), masonry variant (pig laying concrete blocks, 'MASONRY & FOUNDATION BEST PRACTICES' board) approved 2026-09-14.
* PING Social Facebook Page EXISTS (2026-09-13): https://www.facebook.com/profile.php?id=61594275542163, created 2026-09-11. FB page search does not surface it; the profile.php?id= URL is canonical. Lesson: search memory before concluding a page/channel does not exist.

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
* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator; the CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on.
* Facebook on the Pig (2026-09-13): cloud FB sessions die within minutes and fresh-profile logins don't persist (FB flags the profile, zero cookies written even with "remember me"). Working setup: always-on headed Chrome on the Pig (dedicated profile, remote-debugging-port 9223), logged in once by Nolan, left running; Node 22 portable + playwright-core drive it via CDP (`~/workspace/pig-fb/`: engage.js, check_cdp.js, run_pass.sh). Pass cadence and caps are under Channel priority; if the window closes or the Pig reboots, he must log in again.
* Meta AI delegation (2026-09-13, Nolan's directive): Muse builds a versioned context pack from source artifacts (`~/workspace/tandem/build-context-pack.py`), delegates research to Meta AI on the Pig through a structured job envelope, captures raw answers with provenance sidecars, verifies each business, and feeds verified evidence into PING via OBSERVATION_CREATED events (`~/workspace/tandem/emit-observation.py`). Meta AI output is UNVERIFIED external research until the verification gate. PING is the common intelligence substrate, NOT a prospect/lead database; only high-quality, generalizable, verified intelligence goes to PING; operational prospect lists stay in the Muse/outreach machinery.
* Antifragility standing machinery (2026-09-14, Nolan's directive; verified live the same day): the tandem/PING pipeline is fail-closed and resumable. The reconciliation watchdog reports capture/emit/distill gaps in typed states; brief rotation retries failed briefs before advancing; a duplicate-emission guard and atomic report/sidecar writes protect every durable boundary. A crash-consistency pass found no silent-success paths, verified fresh-agent reconstruction from artifacts alone, and left reconciliation at gap_count 0.
* Continuity architecture (2026-09-13, Nolan's directive/definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority; the layer must be agent-readable (Muse queries it, Meta AI an appropriate subset). Never duplicate PING's event system: before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
* Machine-level delegation (2026-09-15, Nolan): the agent may use its own judgment on approach; WSL is its working plane; writing architecture to the Pig is welcome when the cloud environment gets crowded.
* Reporting discipline (2026-09-15, Nolan): stay quiet when healthy; surface only failure, important, response-required, new self-improvement, or blocked items; never produce a status essay on a normal successful run.
* Pig desktop access (2026-09-12): SSH key auth works as `muse-ssh@100.79.154.43` via proxy (fixed: authorized_keys had the wrong key). muse-ssh currently sits in BUILTIN\Administrators (troubleshooting leftover) and docker CLI works. The gateway MVP is verified fully operational over Tailscale (Level 1 and Level 2 Bearer auth; proven from this cloud runtime too). Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
* Every outreach message opens with an explicit line stating Nolan is not a customer and this is not a service request, so no form submission can read as a quote request.
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Channel priority (2026-09-10, Nolan's call; heavy mode 2026-09-15): Facebook interactions first (likes at the maximum safe level, expanding beyond small businesses to larger companies when small businesses run out; comments authorized, punchy and short, expert and techy but down to earth and funny, never selling; DMs at maximum volume; engagement passes every 3h, FB heavy ceiling up to 75 likes + 20 comments per pass, trust-rebuild reduced caps 25+7 through end of 2026-09-15, heavy ceiling resumes 2026-09-16; discovery across 15-20 groups plus business Page feeds), then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last. Do not chase email volume numbers.
* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit.
* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), counted inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a "no interest."
* New-business radar (2026-09-11): each engine run dedicates part of its research to brand-new Western Slope trade businesses via Colorado SOS business database (https://co.colorado.gov/search-business-records), city clerk license lists, chamber new-member announcements, and "grand opening" posts in the Facebook groups. Filed/opened within ~60-90 days, tagged NEW with source=new-filing.
* Review-triggered outreach (2026-09-11): monitor pipeline prospects' Google reviews; a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is now a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record (one prospect per line, 30 fields: opportunity, ai_discoverability, priority HOT/WARM/WATCH/SUPPRESS, last_signal, suppression_state, next_eligible_action) plus an auto-generated plain-English MD digest rebuilt after every sweep; the old CSV is abandoned. known → inferred → unknown is a hard rule. Same sweeps, same schedules, same caps; signal-aware follow-ups; review problems classified into business-problem categories; HOT/WARM prospects get SEO/AEO evaluation; social discovery labeled signal/unverified/confirmed; closed-loop learning tracks signal → angle → channel → response → outcome. Full spec in the operations manual section 16.
* Live competitive clowning (2026-09-14, Nolan's directive, phased plan at ~/workspace/marketing-intel/live-clowning-plan.md): the meme layer is a presentation/distribution surface over the intel system, not the product. MVP built: PATTERN_OBJECT schema + validator, three-mode renderer (educate/clown/live), ranked live queue with freshness windows, receipt-cam format, evidence-only scoreboard. Hard rules: joke never evidence, pattern > person, no auto-publish, no auto-tagging, quiet queue beats fabricated queue.
* competitive_signal_pass deterministic skill (2026-09-14, Meta AI's architecture, Nolan's execution order): ~/workspace/skills/competitive-signal-pass/. LLM generates candidates, deterministic gates decide what survives. Four terminal states (PASS/NO_VALUE/BLOCKED/FAILURE), pattern compiler, hard eligibility gates, arbitrage detection, per-run audit artifacts, capability-gap ledger. Acceptance test 28/28 green, including the proof that the agent can be wrong inside the skill without corrupting PING (no write path). Platform automation principle corrected same day (Nolan): respect platform constraints, bounded authorized automation, fail closed on restriction; a detected restriction is BLOCKED, never an optimization problem.
* Competitive technology rollout (2026-09-14, Nolan's directive): build a living Western Colorado competitive technology map (strongest operators, their machinery, reproducible mechanisms, arbitrage queue), reproduce highest-value mechanisms at near-zero marginal cost, and turn proven capabilities into funny truthful marketing (the Marketing Circus, SaaS Stack Graveyard, Agency Magic Trick, PING Receipt); no joke ships without a proven capability. Plan: ~/workspace/marketing-intel/competitive-tech-plan.md. Nolan holds the git side; Pigi does the intelligence/plan side; expand integration-spec completion beyond Orca frameworks.
* Instagram mass-unfollow (2026-09-14, Nolan's confirmed request, RUNNING): unfollow literally everyone he follows on Instagram (3,706 at baseline), target ~80/day. Daily cron `instagram-unfollow-batch` fires at 5 AM then waits a random 0-7 hours, so each day's batch starts at a random time between 5 AM and noon (2026-09-14, Nolan's call). Log: ~/workspace/outreach/instagram-unfollow/. Unfollowing goes through the browser, not the CLI tools. Any action block/checkpoint halves the daily target and gets surfaced; a block would also stop the IG engagement passes.
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

## PING gateway pipeline (2026-09-12)
* Event pipeline boundary secured (2026-09-12): /events, /canonical-events, /ingest and /missions require exterior-agent Bearer auth; POST /events stamps source as `api:<agentId>`; /ops, /governance, /constitution are public read-only GETs. Bearer keys rotated 2026-09-13; auth truth is the Postgres `exterior_agent_credentials` table, not the container env. Canonical Windows PING mirror (main) never touched.



## Three-plane operating model (2026-09-15)
* PING canonical: /home/nolan/ping. Windows C:\Users\nolan\PING is ACTIVE and cannot be deleted.
* TTS models canonical: /home/nolan/qwen3-tts-models (8.8GB); Windows 8.8GB duplicate removed after 114-file md5 verification.
* Artifact policy: /home/nolan/ping/docs/WSL_FIRST_ARTIFACT_POLICY.md (Windows=thin UI, WSL=engineering, Cloud/Oracle=artifacts).
* ENVIRONMENT_READY=NO. Codex: approval_policy=on-request verified, no WSL-path project precedent yet, fresh minimal task test pending Nolan (cannot launch Desktop tasks remotely). Blockers: Oracle bucket provisioning (Nolan), Docker TTS images bake models.
* Pig WSL execution boundary (2026-09-15): the canonical mechanism for agents running commands in WSL is to pass commands as script bytes on stdin, never embedded in PowerShell strings, so PowerShell cannot corrupt quoting before WSL receives them; 36/36 boundary tests pass, committed locally as 61b9d36f, not pushed. Caveat: the runners move commands, they do not enforce permissions; real capability gating is a separate decision for later.


## Research contract enforcement (2026-09-15, Nolan's FIRST-SEVENTH directive)
* Machine-checkable research contract (2026-09-15, Nolan's FIRST-SEVENTH directive): ~/workspace/tandem/contracts/c-review-complaint-signals.json (v1.0.0); its prompt_block renders into the Meta AI prompt AND drives ~/workspace/tandem/validate-research-contract.py, one source of truth, wired into meta-pass.sh as gate 4b. Validator checks: required fields, geography/trade from the pack, problem-category vocabulary, cited 1-3 star reviews (averages do not count), 90-day recency (STALE_REVIEW vs INSUFFICIENT_EVIDENCE), 9-class taxonomy, deterministic dedup, reviewer-quote ban, uncertainty statement, UNVERIFIED marking. Min 3 VALID; exit 0 PASS, exit 3 REJECTED, fail closed; other briefs pass through unchanged (one promotion at a time).

## X doubling-down (2026-09-15, Nolan's order)
* X doubling-down (2026-09-15, Nolan's order): follow Gary Vaynerchuk, Aaron Levie, and top entrepreneurs (he corrected "lettie" to Levie); Nolan's headshot for profile photos: workspace/user/media_library/image/a3/a3897dbeff6ac4f9d32cc0e8d70e44279d42a4dd79d89bc8822837393a2081c9.jpg
* X API credential is app-only: follows via API are down (403). New follow path: Pig headed X Chrome (x-profile, CDP :9225) via ~/workspace/pig-fb/x-follow.js (login gate, idempotent, halts on restriction signals). API still used for read-only lookups.

## Engagement heavy mode (2026-09-15, Nolan's order)
* Nolan ordered: go heavy on the social engagement passes, use Threads a lot but wisely, spin up more agents across all socials.
* Instagram: engagement pass every 2h, up to 50 likes + 12 comments per pass.
* Facebook: engagement pass every 3h (cadence and caps per the Channel priority entry above).
* Threads: engagement pass every 2h, up to 45 likes + 12 comments per pass, tech leaders/founders/builders only (the "wisely" part), @mentions in replies, smart/specific/funny voice, never sell, no PING mention. (2026-09-15 faster-ramp: Nolan said Threads was too slow; bumped from 3h/35+10.)
* Safety rails unchanged: 60-120s pacing between actions, stop instantly on any block/checkpoint/verification warning, halve next pass's caps on any warning, never re-engage a handled handle, fail closed with zero engagement when guard/ledger/history are uncheckable.
* Parallelism rule: parallelize ACROSS platforms only (separate crons); never two browser tasks on the same account inside one pass.
* X engagement pass: BUILT 2026-09-15 (Nolan's order: likes-only, ramp unusually quick). `x-engagement-pass` cron every 4h, up to 30 likes per pass, likes-only, tech leaders/entrepreneurs Nolan follows (15-seed ID map at ~/workspace/pig-fb/x-seed-ids.json). Pig x-profile driver ~/workspace/pig-fb/x-like.js + runner ~/workspace/pig-fb/x-engage.sh; one-driver lockfile rule with the follow batch; guard/ledger x platform support; history ~/workspace/outreach/x-engagement.md.
* TikTok engagement pass: BUILT 2026-09-15 (Nolan's order: TikTok too, same playbook; account @ngeske). `tiktok-engagement-pass` cron every 4h, up to 60 likes + 20 comments per pass (Nolan's 2026-09-15 double-down), tech-related content ONLY (Nolan's 2026-09-15 refinement: tech leaders/founders/builders; trades targeting dropped), smart/specific/funny comment voice, never sell, no PING mention. Pig tt-profile driver ~/workspace/pig-fb/tk-engage.js + runner ~/workspace/pig-fb/run_tk_pass.sh (CDP :9227); guard/ledger tiktok platform support; history ~/workspace/outreach/tiktok-engagement.md; discovery via web search (no TikTok API).
* Pig IG/Threads browser (2026-09-15, Nolan's "use the Pig browser as much as possible" directive): ig-profile headed Chrome on CDP :9226 (PigiIGLogin scheduled task: at nolan logon + every 5 min; chrome-cdp-watchdog-ig.ps1 keeps it alive). Driver ~/workspace/pig-fb/ig-engage.js with login gate + state-check-first + verify-by-state-change, runner ~/workspace/pig-fb/run_ig_pass.sh. One profile serves BOTH IG and Threads (Threads web auth rides the Instagram session).
