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
* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig. The canonical design (locked from Nolan's chosen front-desk image 2026-09-14): smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved stripe markings on the cheeks, gold hands, purple suit with gold trim. Cute but slightly scary. Body rule (2026-09-13, Nolan's words, hard rule): he is NEVER a fat pig, he is a surprisingly metabolically healthy scary slender pig pimp. Slender and tall in every generation, no chubby or stocky variants. All trade variants (plumber, electrician, HVAC, front desk) keep this exact head/character and only change the outfit/scene. Canonical queue images (~/workspace/ping-content/inbox/): ping-pig-suit.png (Nolan's chosen front-desk image, 2026-09-14), ping-pig-president.png and ping-pig-beggar.png (his uploads, replacing the rejected electrician/HVAC generations), ping-pig-plumber.png (posted), masonry variant (pig laying concrete blocks, 'MASONRY & FOUNDATION BEST PRACTICES' board) approved completely usable 2026-09-14.
* PING Social Facebook Page EXISTS: https://www.facebook.com/profile.php?id=61594275542163 (created 2026-09-11; FB page search does not surface it, the profile.php?id= URL is canonical). Lesson from 2026-09-13: search memory before concluding a page/channel does not exist.

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
* Facebook on the Pig (2026-09-13): cloud FB sessions die within minutes and fresh-profile logins don't persist. Working setup Nolan approved: always-on headed Chrome on the Pig (dedicated profile, CDP :9223), logged in once by him, left running/minimized; playwright-core drives it via CDP (`~/workspace/pig-fb/`). If the window closes or Pig reboots, he must log in again in that window.
* Meta AI delegation (2026-09-13, Nolan's directive): Muse builds a versioned context pack from source artifacts (`~/workspace/tandem/build-context-pack.py`), delegates research to Meta AI on the Pig through a structured job envelope, captures raw answers with provenance sidecars, verifies each business, and feeds verified evidence into PING via OBSERVATION_CREATED events. Meta AI output is UNVERIFIED external research until the verification gate; only high-quality, generalizable, verified intelligence goes to PING, never the operational prospect lists.
* Antifragility standing machinery (2026-09-14, Nolan's directive): the tandem/PING pipeline is fail-closed and resumable (typed reconciliation gap reports, brief rotation retry, duplicate-emission guard, atomic writes).
* Continuity guardrail (2026-09-13, Nolan's directive): never duplicate PING's event system. Before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
* Continuity architecture separation (2026-09-13, Nolan's definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority. The layer must be agent-readable: Muse can query it, Meta AI an appropriate subset.
* Agent write authority (2026-09-16, Nolan's grant): Hermes and Pigi's other agents may make surgical, well-reasoned writes when Pigi is confident (small scoped diffs, reversible, no broad refactors); Pigi checks all agent-written work. Hard boundaries need Nolan's explicit word: no pushes, no main/master commits, no credential exposure or rotation, no destructive Git or data actions, no platform-restriction bypasses, no Pig reboot, no broad IAM grants, OCI queue timer held until the full round-trip verifies.
* Machine-level delegation (2026-09-15, Nolan): the agent may use its own judgment on approach; WSL is its working plane; writing architecture to the Pig is welcome when the cloud environment gets crowded.
* Reporting discipline (2026-09-15, Nolan): stay quiet when healthy; surface only failure, important, response-required, new self-improvement, or blocked items; never produce a status essay on a normal successful run.
* Pig desktop access (2026-09-12): SSH key auth WORKS as `muse-ssh@100.79.154.43` via proxy. muse-ssh currently sits in BUILTIN\Administrators (troubleshooting leftover) and docker CLI works. The pig-side agent verified the gateway MVP fully operational over Tailscale (Level 1 and Level 2 Bearer auth, file and git operations, workspace persistence across a Windows restart). Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
* Every outreach message opens with an explicit line stating Nolan is not a customer and this is not a service request, so no form submission can read as a quote request.
* Facebook Page Message button is the FIRST-CHOICE outreach channel (2026-09-16, Nolan's directive): for every prospect, always try the Facebook business Page Message button first, before falling back to email or forms.
* Bring prospects back to the PING Social Page (2026-09-16, Nolan's directive): outreach messages should point prospects to the PING Social Facebook Page as the home base and social proof.
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Channel priority (2026-09-10, Nolan's call; heavy mode 2026-09-15; like-liberal 2026-09-16): Facebook interactions first (up to 75 likes/pass, passes every 3h; comments punchy, short, funny, never selling, to spark interactions and earn profile views), expanding to larger companies when small businesses run out; DMs at maximum volume; discovery across 15-20 groups plus business Page feeds; then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last. Do not chase email volume numbers.
* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit. Efficiency first.
* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), counted inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a "no interest."
* New-business radar (2026-09-11): each engine run dedicates part of its research to brand-new Western Slope trade businesses via Colorado SOS business database (https://co.colorado.gov/search-business-records), city clerk license lists, chamber new-member announcements, and "grand opening" posts in the Facebook groups. Filed/opened within ~60-90 days, tagged NEW with source=new-filing.
* Review-triggered outreach (2026-09-11): monitor pipeline prospects' Google reviews; a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record (one prospect per line, 30 fields incl. opportunity primary/secondary/evidence/confidence, ai_discoverability, priority HOT/WARM/WATCH/SUPPRESS, last_signal, suppression_state, next_eligible_action) plus an auto-generated plain-English MD digest rebuilt after every sweep; the old CSV is abandoned. known → inferred → unknown is a hard rule. Same sweeps, schedules, caps; signal-aware follow-ups; review problems classified into business-problem categories; HOT/WARM prospects get SEO/AEO evaluation; social discovery labeled signal/unverified/confirmed; closed-loop learning tracks signal → angle → channel → response → outcome toward real conversations and revenue. Full spec in the operations manual section 16.
* Instagram mass-unfollow (2026-09-14, Nolan's confirmed request, RUNNING): unfollow literally everyone he follows on Instagram (3,706 at baseline), target ~80/day. Daily cron `instagram-unfollow-batch` fires at 5 AM then waits a random 0-7 hours (each day's batch starts between 5 AM and noon). Log: ~/workspace/outreach/instagram-unfollow/. Unfollowing goes through the browser, not the CLI tools. Any action block/checkpoint halves the daily target and gets surfaced; a block would also stop the IG engagement passes.
* Facebook page-unfollow cleanup (2026-09-14, Nolan's request): unfollow the ~140 Facebook pages his personal profile follows. Daily `facebook-unfollow-batch` cron: 30 pages/day at slow, account-safe pacing, first batch the morning of 2026-09-15 MDT.
* Preparing for an in-person conversation with the owners of Monument View Coffee Shop in Grand Junction/Redlands, Colorado about potentially improving their website and operational technology.
* Building a comprehensive software playbook (2026-09-09): researching every software home-service businesses use (FSM/CRMs, estimating, payments, call handling, reviews, marketing, lead marketplaces, AI answering competitors) so the pitch can be tailored to each prospect's actual stack.

Communication Preferences

* No em dashes, ever, in anything written for Nolan.
* Keep business communication brief, conversational, and natural.
* Avoid polished sales-script language.
* Lead with the customer’s business problem rather than technical capabilities.
* Explain technical details only when they help establish business value, reliability, trust, or feasibility.
## Connected tooling (2026-09-17)
* Google Docs, Instagram Messages, and Threads Messages connectors are connected and available for use. This came from the connector setup session when the user asked for connector setup, recorded 2026-09-17.

Long-Term Direction

PING Social should become a practical technology partner for home service businesses (not selling "more AI"): technology that captures opportunities, reduces interruptions and administrative drag, improves consistency, supports skilled workers, and gives owners more control over their operations.
* Messenger CLI remains contact-restricted. (Cloud Facebook session watch stays off; Facebook is Pig-only, per 2026-09-13/14.)

## PING gateway pipeline (2026-09-12, PIPELINE COMPLETION MODE)
* Event pipeline boundary secured (2026-09-12): /events, /canonical-events, /ingest and /missions require exterior-agent Bearer auth; POST /events stamps source as `api:<agentId>`; /ops, /governance, /constitution are public read-only GETs. Auth truth is the Postgres `exterior_agent_credentials` table (container env vars are only seed values for an empty table or degraded in-memory mode). Active worktree curious-squid holds Nolan-authorized commits, NOT pushed; canonical Windows PING mirror (main) never touched.
* Canonical goal (2026-09-12, Nolan's directive): ingest business marketing events ASAP; de-spaghetti only as far as that requires; a few high-conviction surgical changes over spec-ing everything.



## Three-plane operating model (2026-09-15, Nolan's standing operating framework)
* PING canonical: /home/nolan/ping (4.8GB, 1.8GB .git, main at 6e359a2). WSL repo is clean; Windows C:\Users\nolan\PING is ACTIVE (5 worktrees with changes, 6 stashes, GitHub remote) and cannot be deleted.
* TTS models canonical: /home/nolan/qwen3-tts-models (8.8GB, /dev/sdd ext4). Windows 8.8GB duplicate REMOVED after 114-file md5 verification. Docker images still bake models in (13G+14G).
* Artifact policy: /home/nolan/ping/docs/WSL_FIRST_ARTIFACT_POLICY.md (Windows=thin UI, WSL=engineering, Cloud/Oracle=artifacts).
* ENVIRONMENT_READY=NO. Codex: approval_policy=on-request verified, no WSL-path project precedent yet, fresh minimal task test pending Nolan (cannot launch Desktop tasks remotely). Blockers: Oracle bucket provisioning (Nolan), Docker TTS images bake models.
* Pig WSL execution boundary (2026-09-15): the canonical mechanism for agents running commands in WSL is to pass commands as script bytes on stdin, never embedded in PowerShell strings, so PowerShell cannot corrupt quoting before WSL receives them; 36/36 boundary tests pass, committed locally as 61b9d36f, not pushed. The runners move commands; they do not enforce permissions (capability gating is a separate later decision).


## Research contract enforcement (2026-09-15, Nolan's FIRST-SEVENTH directive)
* Machine-checkable research contract: ~/workspace/tandem/contracts/c-review-complaint-signals.json (v1.0.0); its prompt_block renders into the Meta AI prompt AND drives ~/workspace/tandem/validate-research-contract.py, one source of truth, wired into meta-pass.sh as gate 4b. Min 3 VALID; exit 0 PASS, exit 3 REJECTED, fail closed.

## X doubling-down (2026-09-15, Nolan's order)
* Nolan's headshot (2026-09-15, for profile photos): workspace/user/media_library/image/a3/a3897dbeff6ac4f9d32cc0e8d70e44279d42a4dd79d89bc8822837393a2081c9.jpg
* Nolan ordered doubling down on X: follow Gary Vaynerchuk, Aaron Levie, and top entrepreneurs (he corrected "lettie" to Levie).
* X API credential is app-only: follows via API are down (403). New follow path: Pig headed X Chrome (x-profile, CDP :9225) via ~/workspace/pig-fb/x-follow.js (login gate, idempotent, halts on restriction signals). API still used for read-only lookups.

## Engagement heavy mode (2026-09-15, Nolan's order)
* Heavy passes across all socials at maximum sustainable volume (Nolan ordered starting strong and spinning up more agents across all socials): Instagram every 2h (up to 50 likes + 12 comments), Facebook every 3h (caps per Channel priority), Threads every 2h (up to 45 likes + 12 comments, tech leaders/founders/builders only), X every 4h (likes-only, up to 30, tech leaders/entrepreneurs Nolan follows), TikTok every 4h (up to 60 likes + 20 comments, tech content only, @ngeske, discovery via web search). Pig drivers: ~/workspace/pig-fb/ig-engage.js (IG + Threads, CDP :9226), x-like.js + x-engage.sh (X, CDP :9225, 15-seed ID map x-seed-ids.json, one-driver lockfile with the follow batch), tk-engage.js + run_tk_pass.sh (TikTok, CDP :9227).
* Engagement voice: smart/specific/funny, react to something specific in the post, built to spark replies and profile views, never sell, no PING mention. Facebook comments: business Pages only.
* Safety rails: 60-120s pacing between actions; stop instantly on any block/checkpoint/verification warning; halve next pass's caps on any warning; never re-engage a handled handle (guard script enforces); fail closed with zero engagement when guard/ledger/history are uncheckable.
* Parallelize across platforms only (separate crons); never two browser tasks on the same account inside one pass.
* PING architecture autonomy (2026-09-16, Nolan's directive): the PING architecture and outreach machine run fully autonomously, he never reminds about it. Every day the crons run and Pigi proactively proposes concrete improvements (proposals are surfaced; routine healthy status stays quiet).
* Facebook like-liberal directive (2026-09-16, Nolan's order): scale back flag risks, double down on safe likes. Likes are the primary driver (up to 75/pass, liberal selection from home feed, anything local, and business discovery; friends' personal posts OK for likes). Comments cut to 10/pass, business Pages only. Page publishing paused while the silent restriction persists.
* Pig commute blackout (2026-09-16, Nolan): the Pig drops around 7am and 4pm MT when he drives to/from work. On a Pig failure in those windows, wait 10 minutes after the first failure before any retry; do not hammer it.

* HPP forensics (2026-09-16, read-only): repo C:/Users/nolan/CascadeProjects/happy-place-platform, remote github.com/trishnikitha-art/happy-place-platform, main at 61301d17. Vercel project prj_DAtFnvebjG7SvUMIe0dBjGEEGnqH, deployed at happy-place-platform.vercel.app. piging85@gmail.com is Nolan's operator/Google identity (Tailscale-confirmed); piging90 is the HPP-associated identity, reference only, never reused for new credentials.
