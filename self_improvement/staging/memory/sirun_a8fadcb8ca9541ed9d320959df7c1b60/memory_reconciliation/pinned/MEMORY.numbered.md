    1│MEMORY.md
    2│
    3│<!-- Curated long-term memory. Keep durable business facts, preferences, and commitments here. Keep day-to-day execution details in daily notes. -->
    4│
    5│Business
    6│
    7│* User’s name: Nolan Geske, goes by Nolan.
    8│* Runs PING Social, currently without an LLC.
    9│* PING Social is an AI concierge and business automation consultancy for home service businesses.
   10│* Primary market (2026-09-09, Nolan's call): Western Colorado first, expanding outward from there. Denver-area outreach is deprioritized.
   11│* Uses Quo as the communications and phone platform.
   12│* PING Social’s role is consultative: understand each business’s workflow and recommend AI services that solve its actual problems rather than selling a one-size-fits-all package.
   13│
   14│Business Positioning
   15│
   16│* PING Social helps home service businesses capture more opportunities, reduce administrative work, respond faster, and operate more consistently.
   17│* The core value proposition is less busywork and fewer missed opportunities while keeping the business owner and skilled worker in control.
   18│* Technology should strengthen the worker and owner, not replace their judgment.
   19│* AI should handle repetitive communication, organization, follow-up, and administrative work so people can focus on customers, jobs, and decisions that require human judgment.
   20│* Position PING Social around practical business outcomes, not AI hype.
   21│* Keep pitches brief, conversational, direct, and credible.
   22│* Never oversell or make AI sound like a replacement for the trade professional.
   23│* PING Social is new and eager to help local companies adopt AI; frame early engagements as a limited-time trial while the service is being developed and refined.
   24│* Market PING Social itself more aggressively (2026-09-11, Nolan's call): he is setting up Google Workspace and will build a PING Social website soon. Blue collar businesses are the explicit target market.
   25│* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).
   26│* PING Social brand language (2026-09-14, Nolan's call): PIGING is a verb; page stories and captions depict how each image relates to the business.
   27│* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig. The canonical design (locked from Nolan's chosen front-desk image 2026-09-14): smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved stripe markings on the cheeks, gold hands, purple suit with gold trim. Cute but slightly scary. Body rule (2026-09-13, Nolan's words, hard rule): he is NEVER a fat pig, he is a surprisingly metabolically healthy scary slender pig pimp. Slender and tall in every generation, no chubby or stocky variants. All trade variants (plumber, electrician, HVAC, front desk) keep this exact head/character and only change the outfit/scene. Canonical queue images: ~/workspace/ping-content/inbox/ping-pig-suit.png (Nolan's chosen front-desk image, 2026-09-14), ping-pig-president.png and ping-pig-beggar.png (Nolan's uploads, swapped in 2026-09-14 replacing rejected electrician/HVAC generations), ping-pig-plumber.png (posted), masonry variant (pig laying concrete blocks, 'MASONRY & FOUNDATION BEST PRACTICES' board) approved completely usable 2026-09-14.
   28│* PING Social Facebook Page EXISTS (Nolan corrected the agent 2026-09-13 for not checking memory first): https://www.facebook.com/profile.php?id=61594275542163, created 2026-09-11, 13 followers as of 2026-09-13. FB page search does not surface it; the profile.php?id= URL is canonical. Lesson: search memory before concluding a page/channel does not exist.
   29│* PING Social Page profile picture set to the gold pig logo 2026-09-13 (Nolan's pick, third uploaded image), verified visually. Working automation: ~/workspace/pig-fb/page-profile-pic.js (switch to acting-as-Page via profile switcher, hover photo to reveal the "Profile picture actions" button, Choose profile picture, Upload photo caught via Playwright filechooser event, Save). Key gotchas: CDP window is 786x506 CSS at DPR 1.25 (screenshot px = CSS x 1.25); the profile switch is per-tab so every script must switch and verify ("What's on your mind, PING Social?"); the welcome modal needs a "Use Page" dismiss.
   30│
   31│Customer Focus
   32│
   33│* Prioritize businesses where missed calls, slow follow-up, scheduling friction, repetitive customer communication, lead management, or administrative workload create measurable business pain.
   34│* Favor solutions that can realistically save time, capture revenue, improve customer experience, or make operations easier to manage.
   35│* Recommend automation based on the customer’s existing workflow and needs.
   36│* Avoid introducing complexity unless the business benefit clearly justifies it.
   37│
   38│Operating Principles
   39│
   40│* Business first: Start with the customer’s problem and desired business outcome, then determine whether AI is actually useful.
   41│* Human in control: Automation supports owners and workers rather than replacing their judgment.
   42│* Reliable capture: Important customer requests, job information, and follow-up should not disappear because someone was busy.
   43│* Less interruption: Reduce unnecessary calls, messages, repetitive questions, and administrative distractions.
   44│* Less admin drag: Automate repetitive operational work wherever it can be done reliably.
   45│* Practical automation: Favor simple systems that contractors can understand, maintain, and trust.
   46│* Measurable value: Prefer improvements that can be connected to time saved, leads captured, response speed, customer experience, or revenue.
   47│* Nolan's standing leverage rule: actual engagement metrics first (likes, comments, messages); docs, infrastructure, and research support those metrics and must not crowd them out.
   48│* Trust: Never fabricate information, misrepresent PING Social, or pretend to be a customer.
   49│* When researching a prospect's technology stack or public business presence, grade every finding as CONFIRMED, STRONG INDICATION, WEAK INDICATION, or UNKNOWN; never assume or hallucinate which software they use.
   50│
   51│Current Commitments
   52│
   53│* Running an outreach campaign for PING Social targeting Western Colorado home service businesses.
   54│* Outreach is autonomous: send legitimate emails and submit legitimate contact forms without routine approval requests; skip blocked actions without asking.
   55│* Surface prospect replies, significant mistakes, or decisions that genuinely require Nolan’s input.
   56│* Avoid routine check-ins and unnecessary approval requests.
   57│* Cold email is capped at 10 per UTC day to protect Gmail deliverability; contact forms run at maximum honest volume with no cap.
   58│* Old-laptop topic (2026-09-13, Nolan's call): never raise the old-laptop topic again unless another old laptop becomes absolutely necessary.
   59│* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator. The CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on, kept in the back of the mind as everything moves forward.
   60│* Facebook on the Pig (2026-09-13): cloud FB sessions die within minutes and fresh-profile logins don't persist (FB flags the profile, zero cookies written even with "remember me"). Working setup Nolan approved: always-on headed Chrome on the Pig (dedicated profile + remote-debugging-port 9223), logged in once by him, left running/minimized; Node 22 portable + playwright-core drive it via CDP (`~/workspace/pig-fb/`: engage.js, check_cdp.js, run_pass.sh). Pass cadence and caps are set under Channel priority. If the window closes or Pig reboots, he must log in again in that window.
   61│* Meta AI delegation (2026-09-13, Nolan's directive): Muse builds a versioned context pack from source artifacts (`~/workspace/tandem/build-context-pack.py`), delegates research to Meta AI on the Pig through a structured job envelope, captures raw answers with provenance sidecars, verifies each business, and feeds verified evidence into PING via OBSERVATION_CREATED events (`~/workspace/tandem/emit-observation.py`). Meta AI output is UNVERIFIED external research until the verification gate; never promoted directly into canonical PING claims. PING intelligence boundary (Nolan's call): PING is the common intelligence substrate, NOT a prospect/lead database; only high-quality, generalizable, verified intelligence goes to PING; operational prospect lists stay in the Muse/outreach machinery.
   62│* Antifragility standing machinery (2026-09-14, Nolan's directive; the same day's pipeline audit/grill session verified it live): the tandem/PING pipeline is fail-closed and resumable. The reconciliation watchdog reports capture/emit/distill gaps in typed states; brief rotation retries failed briefs before advancing (b-new-business-radar orphan recovery proven live); a duplicate-emission guard and atomic report/sidecar writes protect every durable boundary. A crash-consistency pass found no silent-success paths, verified fresh-agent reconstruction from artifacts alone, and left reconciliation at gap_count 0.
   63│* Continuity guardrail (2026-09-13, Nolan's directive): never duplicate PING's event system. Before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
   64│* Continuity architecture separation (2026-09-13, Nolan's definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority. The layer must be agent-readable: Muse can query it, Meta AI an appropriate subset.
   65│* Machine-level delegation (2026-09-15, Nolan): the agent may use its own judgment on approach; WSL is its working plane; writing architecture to the Pig is welcome when the cloud environment gets crowded.
   66│* Reporting discipline (2026-09-15, Nolan): stay quiet when healthy; surface only failure, important, response-required, new self-improvement, or blocked items; never produce a status essay on a normal successful run.
   67│* Pig desktop access (2026-09-12): SSH key auth WORKS as `muse-ssh@100.79.154.43` via proxy (fixed: authorized_keys had the wrong key). muse-ssh currently sits in BUILTIN\Administrators (troubleshooting leftover) and docker CLI works. The pig-side agent verified the gateway MVP fully operational over Tailscale (Level 1 and Level 2 Bearer auth, file and git operations, workspace persistence across a Windows restart). This cloud agent has now proven both gateway credential levels directly from its own runtime (discover + live fs.list call). Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
   68│* Every outreach message opens with an explicit line stating Nolan is not a customer and this is not a service request, so no form submission can read as a quote request.
   69│* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
   70│* Channel priority (2026-09-10, Nolan's call; heavy mode 2026-09-15): Facebook interactions first (likes at the maximum safe level, expanding beyond small businesses to larger companies when small businesses run out; comments authorized, punchy and short, expert and techy but down to earth and funny, never selling, built to spark friendly interactions and earn profile views; DMs at maximum volume; engagement passes every 3h, FB heavy ceiling up to 75 likes + 20 comments per pass, trust-rebuild reduced caps 25+7 through end of 2026-09-15, heavy ceiling resumes 2026-09-16; discovery across 15-20 groups plus business Page feeds), then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last. Do not chase email volume numbers.
   71│* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit. Efficiency first.
   72│* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), counted inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a "no interest."
   73│* New-business radar (2026-09-11): each engine run dedicates part of its research to brand-new Western Slope trade businesses via Colorado SOS business database (https://co.colorado.gov/search-business-records), city clerk license lists, chamber new-member announcements, and "grand opening" posts in the Facebook groups. Filed/opened within ~60-90 days, tagged NEW with source=new-filing.
   74│* Review-triggered outreach (2026-09-11): monitor pipeline prospects' Google reviews; a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
   75│* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is now a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record (one prospect per line, 30 fields: opportunity primary/secondary/evidence/confidence, ai_discoverability, priority HOT/WARM/WATCH/SUPPRESS, last_signal, suppression_state, next_eligible_action, and the remaining intel fields) plus an auto-generated plain-English MD digest rebuilt after every sweep; the old CSV is abandoned (moved to trash for 30 days, backup kept). known → inferred → unknown is a hard rule. Same sweeps, same schedules, same caps; email follow-ups are signal-aware; review problems get classified into business-problem categories; HOT/WARM prospects get SEO/AEO evaluation; social discovery is labeled signal/unverified/confirmed; closed-loop learning tracks signal → angle → channel → response → outcome toward real conversations and revenue. Full spec in the operations manual section 16.
   76│* Instagram (2026-09-10): the browser session holds reliably even though the same browser killed Facebook sessions within a minute; Nolan's login is saved in secure storage with the 2FA code entered once, so the agent's device should not need to re-authenticate. Both findings came from the assistant's Instagram test reports when the user asked for the Instagram outreach pivot, recorded 2026-09-11.
   77│* Live competitive clowning (2026-09-14, Nolan's directive, phased plan at ~/workspace/marketing-intel/live-clowning-plan.md): the meme layer is a presentation/distribution surface over the intel system, not the product. MVP built: PATTERN_OBJECT schema + validator + three-mode renderer (educate/clown/live) + ranked live queue with freshness windows + receipt-cam format + evidence-only scoreboard. Four patterns from the real GJ map seed; Q10 (booking-path composition) added to the arbitrage queue. Hard rules: joke never evidence, pattern > person, no auto-publish, no auto-tagging, quiet queue beats fabricated queue.
   78│* competitive_signal_pass deterministic skill (2026-09-14, Meta AI's architecture, Nolan's execution order): ~/workspace/skills/competitive-signal-pass/. LLM generates candidates, deterministic gates decide what survives. Four terminal states (PASS/NO_VALUE/BLOCKED/FAILURE), pattern compiler, hard eligibility gates, arbitrage detection, per-run audit artifacts, capability-gap ledger. Acceptance test 28/28 green, including the proof that the agent can be wrong inside the skill without corrupting PING (no write path). Platform automation principle corrected same day (Nolan): respect platform constraints, bounded authorized automation, fail closed on restriction; a detected restriction is BLOCKED, never an optimization problem.
   79│* Competitive technology rollout (2026-09-14, Nolan's directive): build a living Western Colorado competitive technology map (strongest operators, their machinery, reproducible mechanisms, arbitrage queue), reproduce highest-value mechanisms at near-zero marginal cost, and turn proven capabilities into funny truthful marketing (light-hearted competitive clowning: the Marketing Circus, SaaS Stack Graveyard, Agency Magic Trick, PING Receipt). No joke ships without a proven capability. Plan: ~/workspace/marketing-intel/competitive-tech-plan.md. Nolan holds the git side; Pigi does the intelligence/plan side. Expand integration-spec completion beyond Orca frameworks.
   80│* Instagram mass-unfollow (2026-09-14, Nolan's confirmed request, RUNNING): unfollow literally everyone he follows on Instagram (3,706 at baseline). Target ~80/day to finish in about a month and a half; browser-task batch 1 started 2026-09-14 evening, daily cron `instagram-unfollow-batch` fires at 5 AM then waits a random 0-7 hours, so each day's batch starts at a random time between 5 AM and noon (2026-09-14, Nolan's call). Log: ~/workspace/outreach/instagram-unfollow/. He narrowed the ask to Instagram only after first raising Facebook too. Unfollowing goes through the browser, not the CLI tools. Any action block/checkpoint halves the daily target and gets surfaced; a block would also stop the IG engagement passes.
   81│* Facebook page-unfollow cleanup (2026-09-14, Nolan's request): unfollow the ~140 Facebook pages his personal profile follows. Daily `facebook-unfollow-batch` cron: 30 pages/day at slow, account-safe pacing, first batch the morning of 2026-09-15 MDT.
   82│* Preparing for an in-person conversation with the owners of Monument View Coffee Shop in Grand Junction/Redlands, Colorado about potentially improving their website and operational technology.
   83│* Building a comprehensive software playbook (2026-09-09): researching every software home-service businesses use (FSM/CRMs, estimating, payments, call handling, reviews, marketing, lead marketplaces, AI answering competitors) so the pitch can be tailored to each prospect's actual stack.
   84│
   85│Communication Preferences
   86│
   87│* No em dashes, ever, in anything written for Nolan.
   88│* Keep business communication brief, conversational, and natural.
   89│* Avoid polished sales-script language.
   90│* Lead with the customer’s business problem rather than technical capabilities.
   91│* Explain technical details only when they help establish business value, reliability, trust, or feasibility.
   92│
   93│Long-Term Direction
   94│
   95│PING Social should become a practical technology partner for home service businesses.
   96│
   97│The goal is not to sell businesses “more AI.”
   98│
   99│The goal is to help owners run better businesses with technology that:
  100│
  101│* captures opportunities,
  102│* reduces interruptions,
  103│* removes administrative drag,
  104│* improves consistency,
  105│* supports skilled workers,
  106│* and gives owners more control over their operations.
  107│* Messenger CLI remains contact-restricted. (Cloud Facebook session watch stays off; Facebook is Pig-only, per 2026-09-13/14.)
  108│
  109│## PING gateway pipeline (2026-09-12, PIPELINE COMPLETION MODE)
  110│* Event pipeline boundary secured (2026-09-12): /events, /canonical-events, /ingest and /missions require exterior-agent Bearer auth; POST /events stamps source as `api:<agentId>`; /ops, /governance, /constitution are public read-only GETs. Bearer keys rotated 2026-09-13; auth truth is the Postgres `exterior_agent_credentials` table, not the container env (env vars are only seed values for an empty table or degraded in-memory mode). Active worktree curious-squid holds Nolan-authorized commits, NOT pushed; canonical Windows PING mirror (main) never touched.
  111│* Canonical goal (2026-09-12, Nolan's directive): ingest business marketing events ASAP; de-spaghetti only as far as that requires; a few high-conviction surgical changes over spec-ing everything.
  112│
  113│
  114│
  115│## Three-plane operating model (2026-09-15, Nolan's standing operating framework)
  116│* PING canonical: /home/nolan/ping (4.8GB, 1.8GB .git, main at 6e359a2). WSL repo is clean; Windows C:\Users\nolan\PING is ACTIVE (5 worktrees with changes, 6 stashes, GitHub remote) and cannot be deleted.
  117│* TTS models canonical: /home/nolan/qwen3-tts-models (8.8GB, /dev/sdd ext4). Windows 8.8GB duplicate REMOVED after 114-file md5 verification. Docker images still bake models in (13G+14G).
  118│* Artifact policy: /home/nolan/ping/docs/WSL_FIRST_ARTIFACT_POLICY.md (Windows=thin UI, WSL=engineering, Cloud/Oracle=artifacts).
  119│* ENVIRONMENT_READY=NO. Codex: approval_policy=on-request verified, no WSL-path project precedent yet, fresh minimal task test pending Nolan (cannot launch Desktop tasks remotely). Blockers: Oracle bucket provisioning (Nolan), Docker TTS images bake models.
  120│
  121│
  122│## Research contract enforcement (2026-09-15, Nolan's FIRST-SEVENTH directive)
  123│* Machine-checkable research contract: ~/workspace/tandem/contracts/c-review-complaint-signals.json (v1.0.0); its prompt_block renders into the Meta AI prompt AND drives ~/workspace/tandem/validate-research-contract.py, one source of truth, wired into meta-pass.sh as gate 4b. Validator checks: required fields, geography/trade from the pack, problem-category vocabulary, cited 1-3 star reviews (averages do not count), 90-day recency (STALE_REVIEW vs INSUFFICIENT_EVIDENCE), 9-class taxonomy, deterministic dedup, reviewer-quote ban, uncertainty statement, UNVERIFIED marking. Min 3 VALID; exit 0 PASS, exit 3 REJECTED, fail closed; other briefs pass through unchanged (one promotion at a time).
  124│* First real validation REJECTED run 20260915-210425 (0/10 VALID: 1 stale, 1 duplicate Keenan's, 6 wrong-signal, 2 insufficient); reviewer-quote leak caught; old presence validator was counting prompt-echo items as answer items.
  125│* Self-audit: ~/workspace/tandem/self-audit-2026-09-15-research-contract.md; eight judgment dimensions measured, ONE promotion: the 90-day recency invariant (specified, tested, automated).
  126│* Lightpanda: NOT implemented, no experiment spec; no measured read-only discovery bottleneck; revisit only if per-business verification wall-time becomes the binding constraint.
  127│* Standing cron additions (meta-ai-intel-pass): post-run self-improvement question (SPECIFY/TEST/AUTOMATE/REMOVE, one promotion at a time) and a no-backgrounding warning (backgrounded passes die when the worker turn ends).
  128│* Boundary: validator owns the contract, the outreach engine's step-4e web-search gate owns truth (business exists, review is real).
  129│
  130│## X doubling-down (2026-09-15, Nolan's order)
  131│* Nolan's headshot (2026-09-15, for profile photos): workspace/user/media_library/image/a3/a3897dbeff6ac4f9d32cc0e8d70e44279d42a4dd79d89bc8822837393a2081c9.jpg
  132│* Nolan ordered doubling down on X: follow Gary Vaynerchuk, Aaron Levie, and top entrepreneurs (he corrected "lettie" to Levie).
  133│* X API credential is app-only: follows via API are down (403). New follow path: Pig headed X Chrome (x-profile, CDP :9225) via ~/workspace/pig-fb/x-follow.js (login gate, idempotent, halts on restriction signals). API still used for read-only lookups.
  134│* Sampling Aaron Levie's followers showed mostly noise/bots; follow @levie + curated entrepreneurs. @levie already followed; entrepreneur batch (13, paced 8-15 min: elonmusk, naval, paulg, sama, patrickbetdavid, dharmesh, Jason, tferriss, mcuban, reidhoffman, bhorowitz, Codie_Sanchez, SahilBloom) completed 2026-09-15. Log: goals/ping-social-brand-launch/hidden_files/x-follow-batch-2026-09-15.log.
  135│
  136│## Engagement heavy mode (2026-09-15, Nolan's order)
  137│* Nolan ordered: go heavy on the social engagement passes, start strong right now, use Threads a lot but wisely, spin up more agents across all socials.
  138│* Instagram: engagement pass every 2h, up to 50 likes + 12 comments per pass.
  139│* Facebook: engagement pass every 3h, up to 75 likes + 20 comments per pass. Trust-rebuild reduced caps (25+7) stay in force through end of 2026-09-15 after the 2026-09-13/14 lock; heavy ceiling resumes on 2026-09-16.
  140│* Threads: engagement pass every 2h, up to 45 likes + 12 comments per pass, tech leaders/founders/builders only (the "wisely" part), @mentions in replies, smart/specific/funny voice, never sell, no PING mention. (2026-09-15 faster-ramp: Nolan said Threads was too slow; bumped from 3h/35+10.)
  141│* Safety rails unchanged: 60-120s pacing between actions, stop instantly on any block/checkpoint/verification warning, halve next pass's caps on any warning, never re-engage a handled handle (guard script is the enforcement), fail closed with zero engagement when guard/ledger/history are uncheckable.
  142│* Parallelism rule: parallelize ACROSS platforms only (separate crons); never two browser tasks on the same account inside one pass.
  143│* X engagement pass: BUILT 2026-09-15 (Nolan's order: likes-only, ramp unusually quick). `x-engagement-pass` cron every 4h, up to 30 likes per pass, likes-only, tech leaders/entrepreneurs Nolan follows (15-seed ID map at ~/workspace/pig-fb/x-seed-ids.json). Pig x-profile driver ~/workspace/pig-fb/x-like.js + runner ~/workspace/pig-fb/x-engage.sh; one-driver lockfile rule with the follow batch; guard/ledger x platform support; history ~/workspace/outreach/x-engagement.md. Smoke-tested (guard ELIGIBLE->ALREADY_ENGAGED, ledger refuse/reconcile cycle).
  144│* TikTok engagement pass: BUILT 2026-09-15 (Nolan's order: TikTok too, same playbook; account @ngeske). `tiktok-engagement-pass` cron every 4h, up to 60 likes + 20 comments per pass (Nolan's 2026-09-15 double-down), tech-related content ONLY (Nolan's 2026-09-15 refinement: tech leaders/founders/builders; trades targeting dropped), smart/specific/funny comment voice, never sell, no PING mention. Pig tt-profile driver ~/workspace/pig-fb/tk-engage.js + runner ~/workspace/pig-fb/run_tk_pass.sh (CDP :9227); guard/ledger tiktok platform support; history ~/workspace/outreach/tiktok-engagement.md; discovery via web search (no TikTok API). Smoke-tested (guard ELIGIBLE->ALREADY_ENGAGED, ledger refuse/reconcile cycle, driver login gate). Session LIVE as of 2026-09-15 19:32 MDT (gate bug fixed: TikTok changed the upload href, breaking the exact-match login selector; substring/icon selector deployed and verified logged_in:true).
  145│* Pig IG/Threads browser (2026-09-15, Nolan's "use the Pig browser as much as possible" directive): ig-profile headed Chrome on CDP :9226 BUILT and running (PigiIGLogin scheduled task: at nolan logon + every 5 min; chrome-cdp-watchdog-ig.ps1 keeps it alive; driver ~/workspace/pig-fb/ig-engage.js with login gate + state-check-first + verify-by-state-change, runner ~/workspace/pig-fb/run_ig_pass.sh). One profile serves BOTH IG and Threads (Threads web auth rides the Instagram session). SESSION LIVE as of 2026-09-15 19:23 MDT (Nolan's manual login verified via driver login gate). Phase 3 cron migration (IG + Threads bodies to Pig drivers) executed 2026-09-15.
  146│