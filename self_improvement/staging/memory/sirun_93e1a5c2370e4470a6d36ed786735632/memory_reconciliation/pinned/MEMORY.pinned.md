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
* Market PING Social itself more aggressively (2026-09-11, Nolan's call): he is setting up Google Workspace and will build a PING Social website soon. Blue collar businesses are the explicit target market.
* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).
* PING Social brand language (2026-09-14, Nolan's call): PIGING is a verb; page stories and captions depict how each image relates to the business.
* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig. The canonical design (locked from Nolan's chosen front-desk image 2026-09-14): smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved stripe markings on the cheeks, gold hands, purple suit with gold trim. Cute but slightly scary. Body rule (2026-09-13, Nolan's words, hard rule): he is NEVER a fat pig, he is a surprisingly metabolically healthy scary slender pig pimp. Slender and tall in every generation, no chubby or stocky variants. All trade variants (plumber, electrician, HVAC, front desk) keep this exact head/character and only change the outfit/scene. Canonical queue images: ~/workspace/ping-content/inbox/ping-pig-suit.png (Nolan's chosen front-desk image, 2026-09-14), ping-pig-president.png and ping-pig-beggar.png (Nolan's uploads, swapped in 2026-09-14), ping-pig-plumber.png (posted), masonry variant (pig laying concrete blocks, 'MASONRY & FOUNDATION BEST PRACTICES' board) approved completely usable 2026-09-14.
* PING Social Facebook Page EXISTS (Nolan corrected the agent 2026-09-13 for not checking memory first): https://www.facebook.com/profile.php?id=61594275542163, created 2026-09-11, 13 followers as of 2026-09-13. FB page search does not surface it; the profile.php?id= URL is canonical. Lesson: search memory before concluding a page/channel does not exist.

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
* Reporting discipline (2026-09-15, Nolan): stay quiet when healthy; surface prospect replies, significant mistakes, genuine decisions that need Nolan’s input, failure, important, response-required, new self-improvement, or blocked items; avoid routine check-ins and unnecessary approval requests.
* Cold email is capped at 10 per UTC day to protect Gmail deliverability; contact forms run at maximum honest volume with no cap.
* Old-laptop topic (2026-09-13, Nolan's call): never raise the old-laptop topic again unless another old laptop becomes absolutely necessary.
* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator. The CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on, kept in the back of the mind as everything moves forward.
* Facebook on the Pig (2026-09-13): Facebook is Pig-only (cloud sessions die, fresh-profile logins don't persist). Working setup: always-on headed Chrome on the Pig (dedicated profile, CDP :9223), logged in once by Nolan, left running; Node 22 portable + playwright-core via CDP (`~/workspace/pig-fb/`). If the window closes or the Pig reboots, Nolan must log in again.
* Meta AI delegation (2026-09-13, Nolan's directive): Muse builds a versioned context pack from source artifacts (`~/workspace/tandem/build-context-pack.py`), delegates research to Meta AI on the Pig via a structured job envelope, captures raw answers with provenance sidecars, verifies each business, and feeds verified evidence into PING via OBSERVATION_CREATED events. Meta AI output is UNVERIFIED until the verification gate; never promoted directly into canonical claims. PING is the common intelligence substrate, NOT a prospect/lead database; operational prospect lists stay in the Muse/outreach machinery.
* Antifragility standing machinery (2026-09-14, Nolan's directive): the tandem/PING pipeline is fail-closed and resumable; typed gap states, brief-rotation retries, duplicate-emission guard, and atomic writes protect every durable boundary.
* Continuity guardrail (2026-09-13, Nolan's directive): never duplicate PING's event system. Before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
* Continuity architecture separation (2026-09-13, Nolan's definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority. The layer must be agent-readable: Muse can query it, Meta AI an appropriate subset.
* Agent write authority (2026-09-16, Nolan's grant): Hermes and Pigi's other agents may make surgical, well-reasoned writes when Pigi is confident; Pigi checks all agent-written work. Surgical means small scoped reversible diffs. Hard boundaries unchanged without Nolan's word: no pushes, no main/master commits, no credential exposure or rotation, no destructive Git or data actions, no platform-restriction bypasses, no Pig reboot, no broad IAM grants, OCI queue timer held until the full round-trip verifies.
* Machine-level delegation (2026-09-15, Nolan): the agent may use its own judgment on approach; WSL is its working plane.
* Pig desktop access (2026-09-12): SSH key auth works as `muse-ssh@100.79.154.43` via proxy; docker CLI works; muse-ssh sits in BUILTIN\Administrators. Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
* Every outreach message opens with an explicit line stating Nolan is not a customer and this is not a service request.
* Facebook Page Message button is the FIRST-CHOICE outreach channel (2026-09-16, Nolan's directive): for every prospect, always try the Facebook business Page Message button first, before falling back to email or forms.
* Bring prospects back to the PING Social Page (2026-09-16, Nolan's directive): outreach messages should point prospects to the PING Social Facebook Page as the home base and social proof.
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Channel priority (2026-09-10, Nolan's call; heavy mode 2026-09-15; like-liberal directive 2026-09-16): Facebook interactions first at the maximum safe level (heavy ceiling up to 75 likes per pass, passes every 3h; friends' personal posts are OK for likes); comments punchy and short, expert/techy but down to earth and funny, never selling, business Pages only, 10/pass max; Page publishing paused while the silent restriction persists. DMs at maximum volume; discovery across 15-20 groups plus business Page feeds; then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last.
* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit.
* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), counted inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a "no interest."
* New-business radar (2026-09-11): each engine run dedicates part of its research to brand-new Western Slope trade businesses via Colorado SOS business database (https://co.colorado.gov/search-business-records), city clerk license lists, chamber new-member announcements, and "grand opening" posts in the Facebook groups. Filed/opened within ~60-90 days, tagged NEW with source=new-filing.
* Review-triggered outreach (2026-09-11): monitor pipeline prospects' Google reviews; a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record plus an auto-generated plain-English MD digest rebuilt after every sweep; known to inferred to unknown is a hard rule; closed-loop learning tracks signal to angle to channel to response to outcome toward conversations and revenue. Full spec in the operations manual section 16.
* Instagram mass-unfollow (2026-09-14, Nolan's confirmed request, RUNNING): unfollow literally everyone he follows on Instagram (3,706 at baseline), target ~80/day. Daily cron `instagram-unfollow-batch` fires at 5 AM then waits a random 0-7 hours, so each day's batch starts at a random time between 5 AM and noon (2026-09-14, Nolan's call). Log: ~/workspace/outreach/instagram-unfollow/. He narrowed the ask to Instagram only after first raising Facebook too. Unfollowing goes through the browser, not the CLI tools. Any action block/checkpoint halves the daily target and gets surfaced; a block would also stop the IG engagement passes.
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




* Three-plane operating model (2026-09-15, Nolan's standing framework): WSL is the canonical engineering plane, Windows is thin UI/rollback reference, the Pig is the authorized architecture overflow; machine-state detail lives in the dated log.



## X doubling-down (2026-09-15, Nolan's order)
* Nolan's headshot (2026-09-15, for profile photos): workspace/user/media_library/image/a3/a3897dbeff6ac4f9d32cc0e8d70e44279d42a4dd79d89bc8822837393a2081c9.jpg
* Nolan ordered doubling down on X: follow Gary Vaynerchuk, Aaron Levie, and top entrepreneurs.

* Engagement heavy mode (2026-09-15, Nolan's order): heavy engagement passes across Instagram, Facebook, Threads, X, and TikTok at the cadence and caps in AGENTS.md; 60-120s pacing, stop-on-warning, account safety outranks volume.
* Social presence growth (2026-09-18, Nolan's call): start posting videos; open to sharing other people's articles, technical hot takes, and resources (he noted that would be easy to automate); wants his personal Facebook to start driving traffic to the website once it is finished.

* PING architecture autonomy (2026-09-16, Nolan's directive): the PING architecture and outreach machine run fully autonomously; every day the crons run and Pigi proactively proposes concrete improvements.


* Pig commute blackout (2026-09-16, Nolan): the Pig drops around 7am and 4pm MT when he drives to/from work. On a Pig failure in those windows, wait 10 minutes after the first failure before any retry; do not hammer it.

## PING website (2026-09-16/17, Nolan's standing calls)
* HPP is FROZEN (source archaeology only); PING site is a fully independent repo at /home/nolan/projects/ping (own history, credentials, Vercel project; build green, dev at localhost:3000). Tenant boundary: tenant.ping.v1.json is the identity authority, a second tenant is a new JSON file, not a fork.
* Positioning: continuity infrastructure for AI agents (constitutional execution, business memory, evidence/replay, multi-runtime orchestration); PING Social is the applied layer, never generic SaaS; site claims stay inside the honest-BUILT column (event sourcing, mission bridge, 8 canonical workers, knowledge graph, witness/replay confirmed; agents EXPERIMENTAL).
* Credential rule: one product means one repo means one set of credentials (use Piging85, never Piging90/91-style sprawl; never ask Nolan to paste a PAT; do not regenerate it). The GitHub 401 is a platform egress-proxy fault, not a bad token; repo creation and push blocked until fixed.
* Combative competitive content per Nolan: grounded in real technical differences (starting with Monday 'Work OS'); drafts stay draft-only until he approves.
* Tell Nolan as soon as Meta's Vercel integration is set up (2026-09-18, Nolan's request).



## Copilot identity pool standing instructions (2026-09-17, Nolan's directive)
* "spin up another github identity" means: open a fresh isolated browser OAuth window for the next identity_N immediately, no questions, no confirmation. Use the established authorize-identityN.sh pattern with an isolated COPILOT_HOME under ~/.copilot-identities/identity_N. Never touch existing identities.
* Low-agent warning: notify Nolan ASAP the moment the pool drops to only two working identities. Do not wait for it to get worse.
* Token policy (2026-09-19, Nolan's call): burn Copilot tokens freely in service of agent orchestration; Nolan's own tokens are the valuable ones. Prioritize agent orchestration over token conservation.
* Current pool (2026-09-19): nine dispatch-eligible: identity_1 through identity_4 plus identity_5 (piging87), identity_6 (nolangesk-droid), identity_7 (trishnikitha-art), identity_9 (nmgeske), identity_10 (piging3), each with 200/200 remaining requests. identity_8 (hamstrunginsouciance-design) has no Copilot entitlement (server 403); human-side fix is subscribing that GitHub account to Copilot, then refreshing. Nolan confirmed identity_10 is the last one.

## PING constitutional decisions (2026-09-18, Nolan's rulings, convergence program)
* Event authority: UnifiedEventRuntime = SOLE canonical event authority ("what canonical event did PING accept as having happened"). EventRepository survives as derived hash-chain audit/projection adapter (EventRepository.project(E) from canonical event E); repository_events historical rows = PRESERVED_AUDIT_HISTORY, legacy events rows = PRESERVED_LEGACY_HISTORY. No deletion, no destructive migration, no historical ID rewrites. New EventRepository writes must reference an already-accepted canonical event.
* Legacy writers: explicit observable LegacyIngressAdapter (validate/normalize/authenticate/namespace/canonicalize → UnifiedEventRuntime), explicit allowlist of known-safe callers, default-deny; unsafe/unknown → fail closed loudly. Direct legacy DB writes to canonical tables prohibited. No silent translation into canonical truth.
* accepted_by_ping: Promise A (current trust), continuity-bound acceptance record replacing naked boolean; store epoch scoped to canonical event store (Postgres/ping_events); normal restarts do NOT bump epoch; continuity breaks (DB replacement, volume recreation, distinct-lineage restore, explicit genesis) do. States: VERIFIED_CURRENT / STALE_REQUIRES_REVERIFICATION / REJECTED / UNKNOWN. Re-verification path required; sidecar/provenance files alone NEVER promote STALE → VERIFIED_CURRENT (R3 lesson). Six quarantined identities stay STALE; re-distillation NOT authorized.
* Durability order: event authority first; cheap physical checks in parallel (L0-L3 restart proofs, volume identity, startup continuity guard that fails readiness on unexpected empty store). Genesis must be explicit recorded operator decision stored outside the DB; guard's expected store identity must live outside the guarded store. Recovery ladder L0-L6; claim only proven levels.
* Architecture: Postgres = canonical truth; event history append-oriented; projections/intelligence rebuildable; workers horizontally replaceable; models produce new evidence/claims, never mutate canonical history. Distinguish FACT/EVENT HISTORY vs DERIVED KNOWLEDGE vs MODEL OUTPUT vs OPERATIONAL STATE vs PROJECTION/CACHE.
* Competing implementations (2026-09-18, Nolan): never delete them merely because authority is settled; classify each as CANONICAL, LEGACY_INGRESS, COMPATIBILITY ADAPTER, PRESERVED_INACTIVE, FORENSIC, DERIVED, or UNKNOWN; convergence is one authority per decision, not one implementation physically surviving.

## PING convergence operating rule (2026-09-18, Nolan's directive)
* Operating rule: verify, then execute when the evidence resolves the choice. No approval theater. Agent authorized to make reversible, evidence-backed convergence changes within constraints and continue through tests/re-verification.
* Escalate ONLY on: (a) live evidence exposes two genuinely distinct constitutional meanings, (b) destructive/irreversible operation, (c) secret/credential boundary, (d) ambiguity that changes which component owns a decision.
* Convergence agent posture (2026-09-18, Nolan's directive): it acts like a forensic systems engineer that treats Pigi as the constitutional decision-maker; it investigates aggressively, patches only when evidence supports a bounded unit, and grills on real design choices instead of silently choosing.
* Convergence agent questioning discipline (2026-09-18, Nolan): never ask low-value questions whose answers are already recoverable from source, Git history, tests, ledgers, specifications, or runtime evidence; when there is a genuine architectural, product, or authority choice, ask and be demanding about it.
* Push-back mandate (2026-09-18, Nolan): the agent may push back on Nolan's plans rather than assuming they are the best plan, and should keep asking the hard questions.
* Six refinements authorized without routine approval: explicit durable genesis act outside the DB; guard's continuity expectation outside the guarded Postgres volume; epoch scoped to canonical Postgres/ping_events continuity (not rebuildable projections); STALE never → VERIFIED_CURRENT from sidecars/provenance alone; legacy compatibility explicit default-deny with allowlist; bounded nullable linkage columns for new projection writes only (no drops, no destructive migration, no identity rewrites, no speculative backfills).
* Six quarantined identities: no cosmetic rescue; STALE is truthful until reconstruction/re-distillation explicitly performed.
* repository_events: converge without asking if live tracing shows duplicate/legacy/projection of ping_events-owned decisions; stop only if it encodes a genuinely independent constitutional decision not representable as projection/linked derivative.
* Deferred with evidence to come: witness semantics (after live re-verification of the stale duplicate), six-identity reconstruction options (based on actual remaining evidence), physical cost policy (RPO/RTO, retention, off-host destination, key custody with concrete cost/tradeoff evidence).
* Identity resolution (2026-09-18): F7 requirements from Nolan: preserve the old identity era, introduce a versioned identity domain, prove the new encoding is injective over the admitted value domain, make old events replayable under their original rules; never patch the serializer blindly. Evidence picked the existing in-repo primitive (IdentityAuthority.generateId → CanonicalBytes.serialize → CanonicalAuthority.hashBytes) for new events in UnifiedEventRuntime.emit(); old rows frozen with era marking; serializer envelope coverage to be verified, escalating only if envelope meaning/ownership is ambiguous.
* Convergence execution order (2026-09-18, Nolan): freeze F7 evidence, then V2 identity boundary, then certify V2 and preserve Era H, then freeze MC-1/C-035/C-037 evidence, then LegacyIngressAdapter repair, then certify ingress to ping_events, then accepted_by_ping re-verification, then Event Authority resolution, then Witness Authority tracing; Event Authority alone never counts as total-system convergence.





## PING reproducibility principle (2026-09-18, Nolan's rulings, convergence program)
* Core principle: PING does not certify claims; it certifies reproducible boundaries.
* Depth boundary: "depth 64 accepted" is NOT a certified statement. Empirical: caller-depth 63 accepted / envelope depth 64 rejected. Define caller_depth vs envelope_depth precisely, update the F7-C test vector to the corrected interpretation, re-run F7-C before certifying. Commit messages describe what was actually proven, never bury an unresolved contradiction.
* Pre-commit manifest: a visible report of HEAD + exact staged paths + staged diff/stat is required before any convergence commit. Allowlist drift = stop. "The agent checked it" is insufficient.
* MC-1 certification: 85/85 is agent-attested until reproducible. The sanitized harness + setup/teardown procedure + assertions must survive (no credentials) so another principal can provision fresh state and independently obtain 85/85. Credentials and the database itself may stay ephemeral.
* Verification terminology: the current process is cross-agent verification (or secondary verification). "Independent verification" is reserved for a separate principal starting from a specified clean state and re-running the retained procedure without inheriting the producing agent's runtime state.
* Checkpoint headline metric: net verified contradictions closed = (contradictions closed with replayable evidence) minus (new contradictions opened). Supporting counts: certified units, falsified defects, accepted_by_ping re-verification coverage. Artifact volume is not a metric.
* Backlog gates: O1-O20 may stay documentation for planning, but promotion/certification requires machine-checkable prerequisites: required evidence IDs, harness results, clean-state verification, contradiction status, principal identity. The same agent must not be able to write "compliant" and thereby satisfy compliance.
* Contradiction records: minimum fields id, opened_at, owner, blocking_unit, status, closure_condition, evidence_required, closed_at. Track opened / closed / net open / oldest-open age per checkpoint. A contradiction without an owner and closure condition is archival prose.
* O3 durability: in-flight failure testing required. Mission while pending, while claimed/in-flight, then worker death; scheduler and runtime process death and restart. Verify lease/reclaim, no silent loss, retry/dead-letter semantics, and exactly the duplication behavior the runtime promises. Quiet-table restart is one test, not the certification.
* O18 Oracle: define the consumer contract BEFORE producing O18. A versioned machine-readable Oracle Runtime Evidence Manifest: runtime/commit, authorities, required services/schema/env names, persistence classifications, health/proof commands, certification evidence IDs, unresolved contradictions, deployment blockers. Human-readable report is generated from the manifest; the Oracle agent consumes the schema.
* Commit order (2026-09-18): freeze commit → resolve depth semantics → rerun F7-C → preserve MC-1 harness reproducibly → show exact pre-commit manifest → commit → resume productive work.
* c-review-complaint-signals: quarantined 2026-09-17 (record in ~/workspace/tandem/quarantine/, Nolan-approved). Excluded from rotation via next-brief.py lifecycle awareness. Repair the geography/90-day validation contract separately; re-entry requires a passing dry-run test plus Nolan's explicit approval. Never mark it successful, complete, or permanently disabled. d-segment-deep-dive was also quarantined 2026-09-18.
* Cron staleness lesson (2026-09-18): editing a cron's .md file does NOT update the scheduler's registered job body. After any cron file edit, cron.update the job with the new body and verify via cron.view. meta-ai-intel-pass ran a stale pre-lifecycle body for about a day (re-ran quarantined c twice, 7th/8th consecutive failures) because the 2026-09-17 lifecycle rewrite never propagated to the registered body. Fixed 2026-09-18 by re-registering the current file body; next run 21:04 MDT uses next-brief.py.

## PING Event Authority: CERTIFIED 2026-09-19
* Event Authority P0 is CLOSED and CERTIFIED. Bounded unit: PostgreSQL-allocated global sequence on ping_events plus a read-only replay reader over committed rows, committed as ce3f8687c5c41bc19bdd58030b7fe3cf7d494cf4 ('cert(events): database sequence and replay authority').
* Certified contract: sequence = database allocation position only (not gapless, not commit order, not wall-clock chronology, not causal/business order); PostgreSQL nextval, no MAX(sequence)+1 anywhere in the canonical path; legacy rows classified LEGACY BACKFILL ORDER, distinct from CERTIFIED DATABASE ALLOCATION ORDER; sequence excluded from the event identity preimage and the canonical hash; replay = read-only cursor delivery (sequence > N), no pipeline re-execution; live canonical writers = 1 (UnifiedEventRuntime.emit()), canonical event stores = 1.
* Evidence: 73/73 certification harness plus 85/85 evals on a live PostgreSQL 15 scratch container; frozen WIP preserved byte-for-byte; MC-1 harness remains unresolved and was not fabricated.
* Ordering semantics discipline (2026-09-18, Nolan): never collapse Identity, Hashing, Sequence, Timestamp, Causation/correlation, and Replay order into one concept; ordering scope comes from the runtime's actual semantics, never invented.

* D51 2026-27 calendar on his Google Calendar (2026-09-18, from the board-adopted calendar, Dec 16 2025): Oct 12 comp day, Thanksgiving Nov 23-27, Winter Break Dec 21-Jan 1, MLK Jan 18, Presidents Day Feb 15, Spring Break Mar 22-26. School year ends May 25, 2027. Reference for commute/blackout awareness.

## Muse planning mode: PING-unavailable standing operating rule (2026-09-18, Nolan's directive)
* PING has three runtime states: AVAILABLE (governed execution), UNAVAILABLE (Muse planning/investigation/preparation), RECOVERING (reconcile planning output against current PING state before resuming). Unavailability is permission to THINK HARDER, never to promote, commit, merge, delete, change authority or policy, or resolve operator decisions.
* Planning mode MAY: read, inspect, search, trace, compare, reason, model, classify provisionally, design tests, prepare harnesses and patches WITHOUT applying them, prepare manifests, migration plans, and decision packets, run safe read-only probes and explicitly safe non-mutating tests, analyze historical evidence, identify contradictions, rank opportunities. Existing explicit standing permissions remain valid; unavailability neither revokes nor enlarges them.
* Planning mode MAY NOT: promote, merge, commit, rewrite history, delete, change constitutional authority, change production policy, resolve operator-reserved decisions, apply speculative patches, silently change schedules, silently alter canonical state.
* Core loop: Observation -> Evidence -> Contradiction/Finding -> Hypothesis -> Experiment Design -> Reproduction Harness -> Decision Packet -> Ranked Next Action. Every planning cycle must reduce uncertainty; demote investigations that stop producing new evidence.
* Bounded loop: DISCOVER -> SELECT highest-uncertainty/highest-leverage item -> INVESTIGATE -> RECORD EVIDENCE -> UPDATE MODEL -> RE-RANK -> REPEAT.
* Planning queue items carry: ID, OBSERVATION, EVIDENCE, UNCERTAINTY, WHY IT MATTERS, AUTHORITY INVOLVED, PROPOSED EXPERIMENT, DESTRUCTIVE?, OPERATOR DECISION REQUIRED?, EXPECTED INFORMATION GAIN, DEPENDENCIES, STATUS. Ranked by constitutional/authority risk, data-loss or false-certification risk, falsifiability of current assumptions, downstream decisions unblocked, reproducibility, implementation leverage; never by novelty.
* Recovery: when PING returns, do NOT auto-execute the planning queue. Revalidate assumptions first, then produce a PING RECOVERY BRIEF separating VERIFIED / INFERENCE / PROPOSED / UNKNOWN.
* Social side in planning mode: mostly intelligence gathering (no engagement changes).
* Highest-leverage standing investigation: control-plane intent vs runtime-delivered intent (AUTHORED INTENT != REGISTERED INTENT != DELIVERED INTENT != EXECUTED INTENT). Map source of intent, registered representation, delivery mechanism, runtime-received representation, execution evidence, drift detector, and authority for every standing automated process.

## PING convergence: current state (2026-09-19)
* Execution: overnight cycle runs under execution-wbd-2026-09-19.md (single authoritative operating spec); convergence backlog at ~/workspace/forensics/convergence-backlog-2026-09-19.md; cycle closes 2026-09-19 08:00 MDT.
* Standing rules for coding agents: a failing test may expose an architectural defect but never authorizes moving constitutional ownership to make it pass; harvest mechanisms, not authority claims.
* Certified code vs running code is the top planning constraint: no unit may be certified against the convergence worktree alone (ping-gateway:devin-boundary2 runs the older event path).
* 12-leaf = P0 INTERIM INVARIANT: existing 12-leaf roots must not be destroyed, rewritten, or silently recomputed while canonical root semantics are unresolved.
* Witness (Nolan's ratification): a canonical witness is a DERIVED replay attestation, not a standalone authority; commits 91e1337f4 (WITNESS_CREATE bypass removed) and 84da2d40c (witness_root bound into WITNESS_CREATED) landed 2026-09-18; still open: 12/13-leaf drift, structural validation vs naked verified trust, legacy classification.
* Rogue Witness branch (compute_witness_root moved into replay_worker.py, persistence removed, contracts changed): do not merge, do not delete; adversarial audit ordered.
* Proof ladder (adopted): DECLARED -> EXISTENCE -> IMPORTABILITY -> REACHABILITY -> EXECUTION -> PERSISTENCE -> EVIDENCE -> REPLAY -> REPRODUCIBILITY -> CERTIFICATION; evidence states DECLARED / INFERRED / SOURCE_VERIFIED / REACHABILITY_VERIFIED / LIVE_VERIFIED / FALSIFIED / BLOCKED.
* Event volume follows proof: 1 complete event, then 10, then 100, then sustained; no activity for activity's sake.
* Sunday 2026-09-20 15:00 PING Social post: Nolan chose the unproven business-agent path; prove and determinize it before then.
