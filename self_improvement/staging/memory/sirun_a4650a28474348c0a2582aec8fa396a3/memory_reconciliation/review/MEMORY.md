MEMORY.md

<!-- Curated long-term memory. Keep durable business facts, preferences, and commitments here. Keep day-to-day execution details in daily notes. -->

Business

* User: Nolan Geske ("Nolan"); runs PING Social (currently without an LLC), an AI concierge and business automation consultancy for home service businesses.
* Primary market (2026-09-09, Nolan's call): Western Colorado first, expanding outward from there. Denver-area outreach is deprioritized.
* Uses Quo as the communications and phone platform.
* PING Social’s role is consultative: understand each business’s workflow and recommend AI services that solve its actual problems rather than selling a one-size-fits-all package.

Business Positioning

* PING Social helps home service businesses capture more opportunities, reduce administrative work, respond faster, and operate more consistently; less busywork and fewer missed opportunities with the owner and skilled worker in control.
* Technology should strengthen the worker and owner, not replace their judgment; AI handles repetitive communication, organization, follow-up, and admin work so people can focus on customers, jobs, and decisions that require human judgment.
* Position PING Social around practical business outcomes, not AI hype.
* Keep pitches brief, conversational, direct, and credible.
* Never oversell or make AI sound like a replacement for the trade professional.
* PING Social is new and eager to help local companies adopt AI; frame early engagements as a limited-time trial while the service is being developed and refined.
* Market PING Social itself more aggressively (2026-09-11, Nolan's call): he is setting up Google Workspace and will build a PING Social website soon. Blue collar businesses are the explicit target market.
* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).

Customer Focus

* Prioritize businesses where missed calls, slow follow-up, scheduling friction, repetitive customer communication, lead management, or administrative workload create measurable business pain.
* Favor solutions that realistically save time, capture revenue, improve customer experience, or make operations easier to manage, fitted to the customer's existing workflow; never add complexity unless the business benefit clearly justifies it.

Operating Principles

* Business first: start with the customer’s problem and desired business outcome, then determine whether AI is actually useful.
* Human in control: automation supports owners and workers rather than replacing their judgment; favor simple systems contractors can understand, maintain, and trust.
* Reliable capture: important customer requests, job information, and follow-up should not disappear because someone was busy; reduce unnecessary calls, messages, repetitive questions, and administrative distractions.
* Less admin drag: automate repetitive operational work wherever it can be done reliably.
* Measurable value: prefer improvements that connect to time saved, leads captured, response speed, customer experience, or revenue. Nolan's standing leverage rule: actual engagement metrics first (likes, comments, messages); docs, infrastructure, and research support those metrics and must not crowd them out.
* Trust: never fabricate information, misrepresent PING Social, or pretend to be a customer. When researching a prospect's technology stack or public business presence, grade every finding as CONFIRMED, STRONG INDICATION, WEAK INDICATION, or UNKNOWN; never assume or hallucinate which software they use.

Current Commitments

* Running an outreach campaign for PING Social targeting Western Colorado home service businesses.
* Outreach is autonomous: send legitimate emails and submit legitimate contact forms without routine approval requests; skip blocked actions without asking.
* Surface prospect replies, significant mistakes, or decisions that genuinely require Nolan’s input.
* Avoid routine check-ins and unnecessary approval requests.
* Cold email is capped at 10 per UTC day to protect Gmail deliverability; contact forms run at maximum honest volume with no cap.
* Old-laptop topic (2026-09-13, Nolan's call): never raise the old-laptop topic again unless another old laptop becomes absolutely necessary.
* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator. The CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on, kept in the back of the mind as everything moves forward.
* Facebook on the Pig (2026-09-13): cloud FB sessions die within minutes and fresh-profile logins don't persist (FB flags the profile, zero cookies written even with "remember me"). Working setup Nolan approved: always-on headed Chrome on the Pig (dedicated profile + remote-debugging-port 9223), logged in once by him, left running/minimized; Node 22 portable + playwright-core drive it via CDP (`~/workspace/pig-fb/`: engage.js, check_cdp.js, run_pass.sh). `facebook-engagement-pass` cron re-enabled every 8h (up to 40 likes + 10 comments). If the window closes or Pig reboots, he must log in again in that window.
* LinkedIn engagement automation (2026-09-13, Nolan's directive, approved in the advanced roadmap-grill session): second always-on headed Chrome on the Pig with an isolated profile and an auto-reopen watchdog, Nolan signing into LinkedIn himself there. Likes and thoughtful comments only, no connection requests or DMs. Human pacing with a 3-week warmup (likes only in week one, starting max 10/day, scaling toward 20 likes + 4 comments/day). Investigator-recommended: use his personal LinkedIn profile. Nolan's instruction: be careful, ramp up intelligently, follow best practices.
* pig-fb pass tooling (2026-09-13): `~/workspace/pig-fb/pig-ssh.sh` is the shared SSH helper all pass scripts use; run_pass.sh now streams the worker result in one SSH session (replacing the 60s x up-to-180 poll loop); `pig-retention.sh` (7-day rule, dry-run default) runs on the pass success paths. This came from the reliability steps verification report when the user asked for reliability steps 2-5, recorded 2026-09-13.
* prospect-digest.py rebuilds only when the JSONL sha256 hash changes, skipping unchanged runs, and writes a provenance sidecar (source ref, hash, timestamp, schema v1) with a 'derived, not source of truth' header. This came from the reliability steps verification report when the user asked for reliability steps 2-5, recorded 2026-09-13.
* Meta AI delegation architecture (2026-09-13, Nolan's directive): Muse retrieves context from source artifacts itself (never hand-fed briefs), builds a versioned context pack (`~/workspace/tandem/build-context-pack.py`), delegates research to Meta AI on the Pig, captures raw answers with provenance sidecars, verifies each business, and feeds verified evidence into PING via OBSERVATION_CREATED events (`~/workspace/tandem/emit-observation.py`). Delegation seam (2026-09-13, interop audit `~/workspace/tandem/interop-audit-2026-09-13.md`): structured job envelope (`~/workspace/pig-fb/new-job.sh` → `<run_id>.job.json`) consumed by `meta-pass.sh <slug> <job.json>`; machine capability contract `~/workspace/pig-fb/pig-capabilities.json` (v1: research.ask, research.context, artifact.write/read, browser.status, validation.run, retention.sweep, job.record); `runs.jsonl` joins to the job on run_id (job_ref, mission_id). MCP and A2A evaluated and rejected (ceremony for one orchestrator + one worker); no new server/scheduler/database/gateway changes. Key finding: the interface consumer is Muse, not Meta AI (Meta only sees prompt text). Prompt structure: TASK first, pack as labeled reference material (pack-first made Meta riff on the context in two live traces; task-first captured 32 numbered businesses on 2026-09-13). Meta AI output is UNVERIFIED external research until the verification gate; never promoted directly into canonical PING claims. PING intelligence boundary (2026-09-13, Nolan's call): PING is the common intelligence substrate, NOT a prospect/lead database. Only high-quality, generalizable, verified intelligence goes to PING (consumer needs, failure patterns, market signals, campaign insights, validated relationships, contradictions/uncertainty); operational prospect lists stay in the Muse/outreach machinery. Enforced in the outreach engine's step 4e; no new database, scheduler, queue, or parallel PING.
* Meta AI research ceiling (2026-09-13, Nolan's preference): use Meta AI for as much research as possible without getting flagged; maximize research throughput at the safe ceiling, with account safety as the binding constraint.
* Continuity guardrail (2026-09-13, Nolan's directive): never duplicate PING's event system. Before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
* Continuity architecture separation (2026-09-13, Nolan's definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority. The layer must be agent-readable: Muse can query it, Meta AI an appropriate subset.
* Pig desktop access (2026-09-12): SSH key auth WORKS as `muse-ssh@100.79.154.43` via proxy (fixed: authorized_keys had the wrong key). muse-ssh currently sits in BUILTIN\Administrators (troubleshooting leftover) and docker CLI works. The pig-side agent verified the gateway MVP fully operational over Tailscale (Level 1 and Level 2 Bearer auth, file and git operations, workspace persistence across a Windows restart). This cloud agent has now proven both gateway credential levels directly from its own runtime (discover + live fs.list call). Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
* Every outreach message opens with an explicit line stating Nolan is not a customer and this is not a service request, so no form submission can read as a quote request.
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Channel priority (2026-09-10, Nolan's call): Facebook interactions first (likes at the maximum safe level, expanding beyond small businesses to larger companies when small businesses run out; comments authorized, punchy and short, expert and techy but down to earth and funny, never selling, built to spark friendly interactions and earn profile views; DMs at maximum volume; engagement passes every 8h), then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last. Do not chase email volume numbers.
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
* When investigating or questioning, use PING and existing evidence as the evidence base first; do not make Nolan repeat what the system already knows (2026-09-13, Nolan's preference).
* Use other agents aggressively as investigators and reviewers (independent audits, evidence gathering, contradiction checking, roadmap review, PING capability discovery), but treat their output as evidence or hypothesis until verified; never blindly accept an agent's recommendation (2026-09-13, Nolan's preference).

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
* Event pipeline boundary secured: /events, /canonical-events, /ingest now require exterior-agent Bearer auth (L1/L2). Image lineage: phase3-auth → phase4-eventauth → eventauth2 → eventauth3 → eventauth4 (container ping-gateway, restart unless-stopped, port 8080). Rollback images retained.
* Emission provenance: POST /events stamps source as `api:<agentId>` (e.g. api:muse) from the verified credential; persisted in ping_events.
* Live vertical slice proven end to end: authenticated OBSERVATION_CREATED → EventToMissionBridge → CLAIM_GENERATE → ClaimWorker → CLAIM_CREATED → CLASSIFICATION_CREATE → RECOMMENDATION_CREATE → PROJECTION_CREATE → REPLAY_COMPLETED → WITNESS_CREATED → LINEAGE_CREATED; causal replay via GET /events/:id/descendants|ancestors and /events/correlation/:id.
* /ops, /governance, /constitution intentionally left public (all GET, read-only, no secrets).
* Credential note (2026-09-13): during the phase4-eventauth8 pre-deploy diagnostics a worker printed both gateway bearer keys into tool output. Values were not reproduced anywhere visible. Nolan first chose to hold (~14:59), then reversed and ordered rotation (~15:00). Rotation completed ~15:10: new 256-bit keys, both the Postgres `exterior_agent_credentials` rows (muse, muse-level-2) and container env updated, gateway recreated from same eventauth8 image, all 9 smoke checks green, old keys return 401 everywhere. Rollback: ping-gateway-prev2 (eventauth8), ping-gateway-prev (eventauth7, untouched).
* Gateway auth truth (2026-09-13, rotation recon): exteriorAuthMiddleware authenticates each request against Postgres `exterior_agent_credentials` (WHERE api_key AND is_active), NOT the container env. MUSE_LEVEL_1_KEY/MUSE_LEVEL_2_KEY env vars are only seed values for an empty table or degraded in-memory mode. So key rotation must update the DB rows; env alone is insufficient.
* Canonical goal (2026-09-12, Nolan's directive): ingest business marketing events ASAP. De-spaghetti the repo only as far as that requires, following best practices.
* Working preference for gateway and infra work (2026-09-12, Nolan's call): a few high-conviction surgical changes over spec-ing everything out, always kept pointed at the main canonical goal.
* Read-only continuity/observability audit (2026-09-13): about 70% of the proposed continuity envelope already exists on the PING spine (ping_events + ping_missions). 'Oracle' in the repo is Oracle Cloud server infrastructure, not a UI; no Oracle dashboard/prototype exists anywhere. The internal ORCA (ExecutionEngine) is live-but-disabled by standing decision and stays out of continuity work. This came from the read-only continuity audit report when the user asked for continuity observability audit, recorded 2026-09-13.



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
* PING roadmap discipline (2026-09-13, Nolan's CEO decision): no item goes on the PING roadmap merely because it is technically unfinished. Every proposed PING task must establish PROBLEM, EVIDENCE, BUSINESS EFFECT, PING EFFECT, MINIMUM SOLUTION, VERIFICATION, and CONTINUITY before it is built.
* Nolan's promotion-boundary question handed to Muse (investigation report 2026-09-13, not independently verified): the report found NO executable boundary in code preventing a Marketing-local statement from acquiring VERIFIED or ACCEPTED_BY_PING status. The engine writes the learn file with no content check, mark-verified.sh checks only file existence and valid JSON while the engine certifies itself, emit-observation.py hardcodes verification_status to verified, and the gateway fires the event chain on presence plus bearer alone, so the offending email claim would pass every gate and sit in PING as verified with witnessed lineage. The same report flagged a second unauthenticated write path: POST /knowledge/nodes and /edges are public and accept caller-supplied status and confidence, independent of the bearer-protected /events path. Still open: which of the nine candidate learnings should be the first positive promotion test. This came from the promotion-boundary investigation report when the user asked for the promotion boundary investigation, recorded 2026-09-13.
