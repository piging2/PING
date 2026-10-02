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
* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig. The canonical design (locked from Nolan's chosen front-desk image 2026-09-14): smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved stripe markings on the cheeks, gold hands, purple suit with gold trim. Cute but slightly scary. All trade variants (plumber, electrician, HVAC, front desk) keep this exact head/character and only change the outfit/scene. Canonical queue images: ~/workspace/ping-content/inbox/ping-pig-suit.png (Nolan's chosen front-desk image, 2026-09-14), ping-pig-president.png and ping-pig-beggar.png (Nolan's uploads, swapped in 2026-09-14 replacing rejected electrician/HVAC generations), ping-pig-plumber.png (posted).
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
* Facebook account lock (2026-09-14): FB locked the account as possibly hacked; Nolan unlocked it 2026-09-13 and the Pig's headed-Chrome session verified LOGIN ok. facebook-engagement-pass re-enabled (Pig-only, 6h). Likely trigger was the cloud login pattern (dying sessions + iPhone approvals from datacenter IPs), not any page action; Facebook stays Pig-only, cloud session watch stays off.
* Meta AI delegation architecture (2026-09-13, Nolan's directive): Muse retrieves context from source artifacts itself (never hand-fed briefs), builds a versioned context pack (`~/workspace/tandem/build-context-pack.py`), delegates research to Meta AI on the Pig, captures raw answers with provenance sidecars, verifies each business, and feeds verified evidence into PING via OBSERVATION_CREATED events (`~/workspace/tandem/emit-observation.py`). Delegation seam (2026-09-13, interop audit `~/workspace/tandem/interop-audit-2026-09-13.md`): structured job envelope (`~/workspace/pig-fb/new-job.sh` → `<run_id>.job.json`) consumed by `meta-pass.sh <slug> <job.json>`; machine capability contract `~/workspace/pig-fb/pig-capabilities.json` (v1: research.ask, research.context, artifact.write/read, browser.status, validation.run, retention.sweep, job.record); `runs.jsonl` joins to the job on run_id (job_ref, mission_id). MCP and A2A evaluated and rejected (ceremony for one orchestrator + one worker); no new server/scheduler/database/gateway changes. Key finding: the interface consumer is Muse, not Meta AI (Meta only sees prompt text). Prompt structure: TASK first, pack as labeled reference material (pack-first made Meta riff on the context in two live traces; task-first captured 32 numbered businesses on 2026-09-13). Meta AI output is UNVERIFIED external research until the verification gate; never promoted directly into canonical PING claims. PING intelligence boundary (2026-09-13, Nolan's call): PING is the common intelligence substrate, NOT a prospect/lead database. Only high-quality, generalizable, verified intelligence goes to PING (consumer needs, failure patterns, market signals, campaign insights, validated relationships, contradictions/uncertainty); operational prospect lists stay in the Muse/outreach machinery. Enforced in the outreach engine's step 4e; no new database, scheduler, queue, or parallel PING.
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
* Nolan's standing rule: automatically start the re-login flow whenever the cloud Facebook session is found logged out, never wait for him to ask; he approves on his iPhone. Messenger CLI remains contact-restricted.

## PING gateway pipeline (2026-09-12, PIPELINE COMPLETION MODE)
* Event pipeline boundary secured (2026-09-12): /events, /canonical-events, /ingest and /missions now require exterior-agent Bearer auth (L1/L2); POST /events stamps source as `api:<agentId>`; /ops, /governance, /constitution intentionally left public (all GET, read-only, no secrets). Image lineage: phase3-auth to eventauth4 (container ping-gateway, restart unless-stopped, port 8080); rollback images retained. Active worktree: curious-squid on constitutional-convergence-v2 (HEAD bce92787 after the 2026-09-12 ~19:00 MDT commit groups Nolan authorized, NOT pushed); canonical C:\Users\nolan\PING (main) never touched.
* Bearer keys rotated 2026-09-13 (~15:10, Nolan's order after a worker printed both keys): new 256-bit keys in the Postgres `exterior_agent_credentials` rows (muse, muse-level-2) and container env, all 9 smoke checks green, old keys return 401 everywhere. Gateway auth truth: exteriorAuthMiddleware authenticates each request against Postgres `exterior_agent_credentials` (WHERE api_key AND is_active), NOT the container env; env vars are only seed values for an empty table or degraded in-memory mode. Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
* Canonical goal (2026-09-12, Nolan's directive): ingest business marketing events ASAP; de-spaghetti only as far as that requires. Working preference: a few high-conviction surgical changes over spec-ing everything, always kept pointed at the canonical goal.
* Read-only continuity/observability audit (2026-09-13): about 70% of the proposed continuity envelope already exists on the PING spine (ping_events + ping_missions); 'Oracle' is Oracle Cloud server infrastructure, no Oracle dashboard/prototype exists anywhere; internal ORCA (ExecutionEngine) is live-but-disabled by standing decision and stays out of continuity work.

## Dirty worktree convergence pass (2026-09-12, PIPELINE COMPLETION MODE)
* Three authority files (gateway/commit_authority.js, filesystem_authority.js, patch_authority.js) carry INCOMPLETE degraded-mode edits (2026-09-11): _inMemoryCommits/_inMemoryPatches are write-only, methods still use _postgres unconditionally. HOLD, do not commit; needs completion or revert. runtime/kernel/replay/replay_types.ts carries a byte-identical 1-line edit (ArtifactId[] to string[]) across all four opencode worktrees (blob 930baeaa); excluded path, left untouched everywhere. Docker Desktop IS running on the Pig as of 2026-09-13 (29.5.3, ping-gateway up since 09:13 MDT); the earlier 'will not start' report is stale, and the Docker/PG blocker on the capability_requests audit-table read is gone. L1 profile seam confirmed at gateway/capability_authority.js:187-201 ('muse' level 1 "Muse Level 1 (Observe)" grants fs.write + fs.patch); minimal correction identified (drop those two from L1) but held for audit-table evidence. Remaining dirty (123 entries after the 2026-09-12 ~19:00 MDT commits Nolan authorized) is all HOLD (3 incomplete authority files, 4 analysis docs, BRANCH-CONVERGENCE-001) or LEAVE UNTOUCHED (generated, excluded paths, pre-existing docs, other junk); nothing load-bearing left dirty. Pig transfers: scp via the proxy works; PowerShell [Console]::In.ReadToEnd over non-interactive SSH stdin hangs.

## PING constitutional authority model (2026-09-13, Nolan's CEO decision, from ADVANCED ROADMAP-GRILL MODE)
Nolan locked the authority hierarchy after the "email is confirmed as the lowest-yield channel" incident (~10 sends, no cross-channel comparison, no deliverability measurement, promoted to operational fact). He classified it as a SOVEREIGNTY FAILURE: the engine promoted an epistemic hypothesis across an authority boundary without authorization.
* Engine proposes learning (OBSERVATION, HYPOTHESIS, CANDIDATE LEARNING, VERIFICATION REQUEST). It must NEVER be authorized to promote its own learning.
* Verification gate determines whether evidence satisfies the promotion contract. The gate must be deterministic/explicit, not "AI thinks it is true". An AI verifier may only apply an explicit verification contract; its judgment cannot redefine the contract.
* PING is the only place that accepts canonical knowledge.
* Nolan is constitutional authority for changing the rules of the gate, not the routine approver of individual facts. Human governance moves to rule-level: "the verification contract is insufficient for this new class of knowledge, here is the gap, what rule should govern it?"
* Lifecycle: MARKETING OBSERVATION -> CANDIDATE LEARNING -> VALIDATION -> VERIFICATION -> PING ACCEPTANCE -> CANONICAL KNOWLEDGE. No shortcut from candidate to PING. These are not synonyms.
* Hard invariant 1: no observation, hypothesis, learning, or recommendation originating in a downstream application may become PING canonical knowledge unless it has an explicit verification result satisfying the applicable promotion contract.
* Hard invariant 2: a downstream application's local persistence cannot increase the epistemic status of a claim. Persistence is not verification. Repetition is not verification. Agent confidence is not verification. Operational reuse is not verification. Time passing is not verification.
* Graded epistemic strength, not binary: OBSERVED -> VALIDATED -> VERIFIED -> ACCEPTED_BY_PING; hypotheses stay explicitly hypotheses; insufficient evidence stays classified as observation/hypothesis/candidate, neither discarded nor canonized.
* Scope rule: knowledge must not become more general than the evidence supporting it. The email incident's Claim A ("10 emails, zero replies") was supportable; Claim C ("email is the lowest-yield channel") was not. This is the canonical red-team example.
* The 9 "generalizable" learnings from the triage are ELIGIBLE for verification/promotion, not automatically canonical. The triage agent is a worker, not an authority.
* Marketing craft workspace (angle-performance.md etc.) stays: observations, campaign learnings, hypotheses, candidate reusable knowledge. Marketing remains free to learn aggressively; it is not allowed to declare itself sovereign. PING's role: determine which candidate learnings earned the right to influence future missions.
* Verification gate contract shape (inspectable, reproducible): claim, claim_type, scope, evidence_refs[], observation_refs[], source_refs[], sample_size, comparison_group, measurement_definition, time_window, confounders, verification_method, verification_result, verifier, verified_at, promotion_eligibility. Not all are constitutional fields yet; the point is the promotion decision must be inspectable and reproducible.
* Verification must be cheap enough that PING does not become a beautiful constitution with no intelligence. Graded strength, not true/false.
* Next test Nolan ordered: a live promotion red-team. Run the offending email claim through promotion processing and show PROMOTION DENIED with reason; then run one strong candidate (e.g. seasonal demand calendar) through candidate -> scope -> evidence -> corroboration -> criteria -> result -> acceptance -> projection -> fresh mission -> decision, and test whether a fresh agent changes behavior because PING knows it.
* Nolan's question handed to Muse (the investigation now running): show the exact executable boundary that currently prevents a Marketing-local statement from acquiring VERIFIED or ACCEPTED_BY_PING status merely by being written into the learning file; trace one real candidate through every state transition with the code/spec/gate authorizing each; demonstrate with the email incident that the mechanism would have rejected it; if the boundary does not exist, identify the smallest implementation seam that creates it (no second database, scheduler, truth store, or authority); then name which of the nine candidate learnings should be the first positive promotion test.
