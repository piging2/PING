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
* Current pool (2026-09-19): ten authorized, nine dispatch-eligible: identity_1 through identity_4 plus identity_5 (piging87), identity_6 (nolangesk-droid), identity_7 (trishnikitha-art), identity_9 (nmgeske), identity_10 (piging3), each with 200/200 requests remaining and valid reset timestamps. Root cause was a post-authorize.js quota parser bug (a regex hunting a 'remaining' key the Copilot SDK never emits); fixed 2026-09-19 with parseQuotaSnapshot in src/quota-model.js deriving remaining = entitlementRequests - usedRequests, plus regression tests (suite 69/69). The broker's fail-closed-on-unknown behavior was not touched. identity_8 (hamstrunginsouciance-design) stays ineligible: no Copilot entitlement (server 403), human-side subscription required before refresh. Nolan confirmed identity_10 is the last one.

## PING constitutional decisions (2026-09-18, Nolan's rulings, convergence program)
* Event authority: UnifiedEventRuntime = SOLE canonical event authority ("what canonical event did PING accept as having happened"). EventRepository survives as derived hash-chain audit/projection adapter (EventRepository.project(E) from canonical event E); repository_events historical rows = PRESERVED_AUDIT_HISTORY, legacy events rows = PRESERVED_LEGACY_HISTORY. No deletion, no destructive migration, no historical ID rewrites. New EventRepository writes must reference an already-accepted canonical event.
* Legacy writers: explicit observable LegacyIngressAdapter (validate/normalize/authenticate/namespace/canonicalize → UnifiedEventRuntime), explicit allowlist of known-safe callers, default-deny; unsafe/unknown → fail closed loudly. Direct legacy DB writes to canonical tables prohibited. No silent translation into canonical truth.
* accepted_by_ping: Promise A (current trust), continuity-bound acceptance record replacing naked boolean; store epoch scoped to canonical event store (Postgres/ping_events); normal restarts do NOT bump epoch; continuity breaks (DB replacement, volume recreation, distinct-lineage restore, explicit genesis) do. States: VERIFIED_CURRENT / STALE_REQUIRES_REVERIFICATION / REJECTED / UNKNOWN. Re-verification path required; sidecar/provenance files alone NEVER promote STALE → VERIFIED_CURRENT (R3 lesson). Six quarantined identities stay STALE; re-distillation NOT authorized.
* Durability order: event authority first; cheap physical checks in parallel (L0-L3 restart proofs, volume identity, startup continuity guard that fails readiness on unexpected empty store). Genesis must be explicit recorded operator decision stored outside the DB; guard's expected store identity must live outside the guarded store. Recovery ladder L0-L6; claim only proven levels.
* Architecture: Postgres = canonical truth; event history append-oriented; projections/intelligence rebuildable; workers horizontally replaceable; models produce new evidence/claims, never mutate canonical history. Distinguish FACT/EVENT HISTORY vs DERIVED KNOWLEDGE vs MODEL OUTPUT vs OPERATIONAL STATE vs PROJECTION/CACHE.
* Competing implementations (2026-09-18, Nolan): never delete them merely because authority is settled; classify each as CANONICAL, LEGACY_INGRESS, COMPATIBILITY ADAPTER, PRESERVED_INACTIVE, FORENSIC, DERIVED, or UNKNOWN; convergence is one authority per decision, not one implementation physically surviving.

## PING convergence operating rule (2026-09-18, Nolan's directive)
* Verify, then execute when the evidence resolves the choice. No approval theater. Reversible, evidence-backed convergence changes are authorized within constraints; continue through tests and re-verification.
* Escalate ONLY on: (a) live evidence exposing two genuinely distinct constitutional meanings, (b) destructive/irreversible operation, (c) secret/credential boundary, (d) ambiguity that changes which component owns a decision.
* Convergence agent posture: forensic systems engineer treating Pigi as the constitutional decision-maker; investigates aggressively, patches only when evidence supports a bounded unit, grills on real design choices instead of silently choosing. Never asks low-value questions whose answers are recoverable from source, Git history, tests, ledgers, specifications, or runtime evidence; on genuine architectural, product, or authority choices, asks and is demanding. May push back on Nolan's plans rather than assuming they are the best plan.
* Six refinements authorized without routine approval: explicit durable genesis act outside the DB; guard's continuity expectation outside the guarded Postgres volume; epoch scoped to canonical Postgres/ping_events continuity (not rebuildable projections); STALE never -> VERIFIED_CURRENT from sidecars/provenance alone; legacy compatibility explicit default-deny with allowlist; bounded nullable linkage columns for new projection writes only (no drops, no destructive migration, no identity rewrites, no speculative backfills).
* Six quarantined identities: no cosmetic rescue; STALE is truthful until reconstruction/re-distillation is explicitly performed.
* repository_events: converge without asking if live tracing shows duplicate/legacy/projection of ping_events-owned decisions; stop only if it encodes a genuinely independent constitutional decision not representable as projection or linked derivative.
* Deferred with evidence to come: witness semantics (after live re-verification of the stale duplicate), six-identity reconstruction options (based on actual remaining evidence), physical cost policy (RPO/RTO, retention, off-host destination, key custody with concrete cost/tradeoff evidence).
* Identity resolution (2026-09-18): F7 requirements: preserve the old identity era, introduce a versioned identity domain, prove the new encoding is injective over the admitted value domain, make old events replayable under their original rules; never patch the serializer blindly. Evidence picked the existing in-repo primitive (IdentityAuthority.generateId -> CanonicalBytes.serialize -> CanonicalAuthority.hashBytes) for new events in UnifiedEventRuntime.emit(); old rows frozen with era marking; serializer envelope coverage to be verified, escalating only if envelope meaning/ownership is ambiguous.
* Convergence execution order (2026-09-18, Nolan): freeze F7 evidence, then V2 identity boundary, then certify V2 and preserve Era H, then freeze MC-1/C-035/C-037 evidence, then LegacyIngressAdapter repair, then certify ingress to ping_events, then accepted_by_ping re-verification, then Event Authority resolution, then Witness Authority tracing; Event Authority alone never counts as total-system convergence.





## PING reproducibility principle (2026-09-18, Nolan's rulings, convergence program)
* Core principle: PING does not certify claims; it certifies reproducible boundaries.
* Depth boundary: "depth 64 accepted" is NOT a certified statement. Empirical: caller-depth 63 accepted / envelope depth 64 rejected. Define caller_depth vs envelope_depth precisely, update the F7-C test vector to the corrected interpretation, re-run F7-C before certifying. Commit messages describe what was actually proven, never bury an unresolved contradiction.
* Pre-commit manifest required before any convergence commit: a visible report of HEAD + exact staged paths + staged diff/stat; allowlist drift = stop; "the agent checked it" is insufficient.
* MC-1 certification: 85/85 is agent-attested until reproducible; the sanitized harness + setup/teardown procedure + assertions must survive (no credentials) so another principal can provision fresh state and independently obtain 85/85. "Independent verification" is reserved for a separate principal starting from a specified clean state and re-running the retained procedure without inheriting the producing agent's runtime state.
* Checkpoint headline metric: net verified contradictions closed = (contradictions closed with replayable evidence) minus (new contradictions opened); supporting counts: certified units, falsified defects, accepted_by_ping re-verification coverage. Artifact volume is not a metric.
* Contradiction records carry at minimum id, opened_at, owner, blocking_unit, status, closure_condition, evidence_required, closed_at; a contradiction without an owner and closure condition is archival prose.
* O1-O20 may stay documentation for planning, but promotion/certification requires machine-checkable prerequisites: required evidence IDs, harness results, clean-state verification, contradiction status, principal identity. The same agent must not be able to write "compliant" and thereby satisfy compliance.
* O3 durability requires in-flight failure testing: mission while pending, while claimed/in-flight, then worker death; scheduler and runtime process death and restart. O18: define the versioned machine-readable Oracle Runtime Evidence Manifest consumer contract BEFORE producing O18; the human-readable report is generated from it and the Oracle agent consumes the schema.
* c-review-complaint-signals and d-segment-deep-dive are quarantined (record in ~/workspace/tandem/quarantine/, Nolan-approved), excluded from rotation; re-entry requires a passing dry-run test plus Nolan's explicit approval; never marked successful, complete, or permanently disabled.
* Cron staleness lesson (2026-09-18): editing a cron's .md file does NOT update the scheduler's registered job body; after any cron file edit, cron.update the job with the new body and verify via cron.view; fixed 2026-09-18 by re-registering the registered job body.

## Event Authority P0: CERTIFIED 2026-09-19 (Nolan's rulings; committed ce3f8687c)
* Certified contract: sequence = PostgreSQL nextval allocation position only (not gapless, not commit order, not wall-clock chronology, not causal/business order); no MAX(sequence)+1 anywhere in the canonical path; live canonical writers = 1 (UnifiedEventRuntime.emit()), canonical event stores = 1.
* Legacy rows = LEGACY BACKFILL ORDER, distinct from CERTIFIED DATABASE ALLOCATION ORDER; sequence excluded from the event identity preimage and the canonical hash; replay = read-only cursor delivery (sequence > N), no pipeline re-execution.
* Proof: 73/73 certification harness plus 85/85 evals on a live PostgreSQL 15 scratch container; frozen WIP preserved byte-for-byte. MC-1 harness remains unresolved and was not fabricated.
* Nolan's ordering-semantics discipline stands: never collapse identity, hashing, sequence, timestamp, causation/correlation, replay order into one concept; ordering scope comes from the runtime's actual semantics, never convenience.
* D51 2026-27 calendar on his Google Calendar (2026-09-18, from the board-adopted calendar, Dec 16 2025): Oct 12 comp day, Thanksgiving Nov 23-27, Winter Break Dec 21-Jan 1, MLK Jan 18, Presidents Day Feb 15, Spring Break Mar 22-26. School year ends May 25, 2027. Reference for commute/blackout awareness.

## Muse planning mode: PING-unavailable standing operating rule (2026-09-18, Nolan's directive)
* Three runtime states: PING_AVAILABLE (governed execution), PING_UNAVAILABLE (planning/investigation/preparation), PING_RECOVERING (reconcile planning output against current PING state before resuming).
* When PING is unavailable, unreachable, degraded, or unable to adjudicate: Muse ENTERS PLANNING MODE. This is permission to THINK HARDER only, never autonomous promotion, destructive changes, constitutional decisions, speculative commits, or authority expansion.
* Planning mode MAY: read, inspect, search, trace, compare, reason, model, classify provisionally, design tests, prepare harnesses, prepare patches WITHOUT applying them, prepare manifests/migration plans/decision packets, run safe read-only probes and explicitly safe non-mutating tests, analyze historical evidence, identify contradictions, rank opportunities. MAY NOT: promote, merge, commit, rewrite history, delete, change constitutional authority or production policy, resolve operator decisions, apply speculative patches, silently change schedules, silently alter canonical state.
* Existing explicit standing permissions stay valid; PING unavailability neither revokes nor enlarges them.
* Core loop: Observation -> Evidence -> Contradiction/Finding -> Hypothesis -> Experiment Design -> Reproduction Harness -> Decision Packet -> Ranked Next Action; every planning cycle must reduce uncertainty, no busywork prose. Bounded loop: DISCOVER -> SELECT highest-uncertainty/highest-leverage item -> INVESTIGATE -> RECORD EVIDENCE -> UPDATE MODEL -> RE-RANK -> REPEAT; demote investigations that stop producing new evidence.
* Recovery: when PING returns, do NOT auto-execute the planning queue. Revalidate assumptions first (things may have changed) and produce a PING RECOVERY BRIEF separating VERIFIED / INFERENCE / PROPOSED / UNKNOWN.
* Planning queue items carry ID, OBSERVATION, EVIDENCE, UNCERTAINTY, WHY IT MATTERS, AUTHORITY INVOLVED, PROPOSED EXPERIMENT, DESTRUCTIVE?, OPERATOR DECISION REQUIRED?, EXPECTED INFORMATION GAIN, DEPENDENCIES, STATUS; ranked by constitutional/authority risk, data-loss or false-certification risk, falsifiability, decisions unblocked, reproducibility, leverage; never novelty.
* Social side in planning mode: mostly intelligence gathering, no engagement changes.
* Highest-leverage standing investigation: control-plane intent vs runtime-delivered intent (AUTHORED INTENT != REGISTERED INTENT != DELIVERED INTENT != EXECUTED INTENT); map the full intent chain for every standing automated process.

## Witness semantics (2026-09-18, Nolan's rulings) and recon state
* Nolan ratified the canonical witness composition: a canonical witness is a DERIVED replay attestation, not a standalone authority and not a mutable business object. Replay authority computes the deterministic, version-bound witness root (the proof content); the event system records the attestation as a canonical WITNESS_CREATED event; the persisted attestation itself keeps canonical event identity over the bound attestation payload (subject, replay boundary, algorithm/version, namespace/provenance). The legacy agent-memory witness_id minting authority is preserved-inactive/legacy and must never become the canonical path.
* Mutation sprint stopped 2026-09-18 (Nolan approved) after commits 91e1337f4 (WITNESS_CREATE bypass removed) and 84da2d40c (witness_root bound into WITNESS_CREATED). 24h read-only recon (audit/trace/compare/falsify/research/propose only; no implementation, no repo mutation, no Oracle deployment): open items are the 12-leaf vs 13-leaf source/compiled witness drift, restart certification, legacy witness disposition, and the wider authority graph.

## 2026-09-18 — 12-hour read-only planning sprint launched
* Nolan ordered an all-night read-only planning pass: adversarial planning for a 12-hour constitutional convergence implementation sprint (extensible to 24h), planning mode only.
* Scope: re-verify witness forensics, historical constitutional witness definition, 12/13-leaf drift, minimum witness certification unit, witness_id/hash/verification/fallback decisions, downstream effect matrices, Oracle static compatibility (no deploy), Mission Control projection planning, ORCA contract. HPP untouched.
* Deliverable: ~/workspace/forensics/witness-12h-sprint-plan-2026-09-19.md plus supporting evidence files. No patches, commits, merges, installs, or Oracle changes permitted in this pass.

## 2026-09-18 — Convergence backlog frozen (Nolan)
* Backlog frozen at ~/workspace/forensics/convergence-backlog-2026-09-19.md: P0 (deployment provenance, certified-to-running promotion gate, single-writer coordination, Event Authority runtime parity, Witness contract freeze, replay completeness, approval/effect identity), P1 (context convergence, targeted recompilation, authority inventory, result truth, durable orchestration, Mission Control truthfulness), P2 (multi-runtime boundary, projection discipline, source-universe reduction, five-year replay proof), P3 (knowledge/entity/freshness).
* Standing process rule for every future coding agent: a failing test may expose an architectural defect, but it does not authorize moving constitutional ownership to make the test pass.
* Certified code vs running code is the top planning constraint: ping-gateway:devin-boundary2 (2026-09-16, unversioned source) runs the older event path; no unit may be certified against the convergence worktree alone.
* Rogue Witness branch (compute_witness_root moved into replay_worker.py, persistence removed, contracts changed): do not merge, do not delete; adversarial audit ordered, harvest only the deterministic-root test idea.
* Harvest principle: harvest mechanisms, not authority claims (even CRX "PASSED" certifications were falsified by shipped artifacts).
* Next mutation sprint starts only when each objective has: owner, strongest SHA, runtime status, falsification test, allowed files, forbidden files, predecessor objective, promotion gate. Coordinator stays strictly read-only deepening the backlog into dependency edges and acceptance tests.

## 2026-09-18 — Threads probe false-negative fixed
* Nolan was right: the Threads/IG session in the Pig's ig-profile Chrome was alive. Passes 35-36 "logged out" readings were a probe bug, not a session loss.
* Root cause: Threads DOM drift. Profile hrefs no longer carry a trailing slash (/@nolanpigi), but th-discover.js's login gate required one, so a logged-in home page scored profileLinks=0 and failed the gate.
* Fix: relaxed the profile-href regex to optional trailing slash in the login gate and signed_in_as detector in ~/workspace/pig-fb/th-discover.js. Verified: ok=true, logged_in=true, signed_in_as=@nolanpigi.
* Correction note appended to ~/workspace/outreach/threads-engagement.md; the "Nolan must log into Instagram" manual step is withdrawn. th-capability-state.json still reads BLOCKED (stale); only ig-recovery-test.sh may flip it and it was not run (it does an IG canary like, unrequested).
* Lesson: login-gate heuristics must be validated against live DOM, not trusted across passes; a "logged out" reading with live session cookies deserves a DOM-level check before asking Nolan to act.

## 2026-09-18 — Execution-mode governance rulings (Nolan, grill answers)
* Execution mode governs. Write access authorized for evidence-backed execution of the approved convergence plan. Replacement requires evidence: same responsibility, superior authority alignment, proven callers/dependencies, migration path understood, preservation of anything whose removal is not authorized.
* Backlog freeze is PROVISIONAL. Two dimensions: SEVERITY (P0-P3, how bad if true) x EVIDENCE STATE (PROPOSED / OBSERVED / REPRODUCED / FALSIFIED / VERIFIED / CERTIFIED, how sure). Never mutate severity as a proxy for confidence.
* 12-leaf: revised from design conclusion to P0 INTERIM INVARIANT. Existing 12-leaf roots must not be destroyed, rewritten, or silently recomputed while canonical root semantics are unresolved. Does not certify 12-leaf as canonical.
* Oracle deployment authorized after pre-deployment gates pass; destructive deployment ops remain prohibited. Certification target on ping-core-01: request -> authenticated identity -> canonical event -> durable PostgreSQL -> mission -> scheduler -> worker -> result/evidence -> canonical event -> RESTART -> same event/mission/evidence recoverable -> processing resumes. Until that runs, Oracle is not finished.
* Event volume follows event-authority proof: prove 1 complete event, then 10, then 100, then sustained. No activity for activity's sake. Self-improvement telemetry chain: Observation -> Evidence -> Canonical Event -> Claim -> Classification -> Recommendation -> Action/Decision -> Result -> Replay -> Witness -> Lineage -> new Observation.
* Write aperture stays narrow: many parallel auditors, one writer, write queue, verify, commit. Excess compute goes to scrutiny, not simultaneous mutation. Multi-writer only after isolated workspaces, proposal artifacts, merge authority, replayable patches, deterministic promotion are certified.
* DECLARED STATE != OBSERVED STATE != EFFECTIVE STATE. Operational withdrawal on live evidence is correct; mutating canonical policy without owning authority is not. (This principle already ran in production tonight: the Threads/IG capability handling.)
* Ask when unresolved ambiguity changes what would be done. Zero questions can be correct; never silently choose policy.
* Falsification delivered same night: Nolan's "AcquisitionManager creates events but persistence unproven" premise was FALSIFIED by his own forensic report (event-authority-ordering-forensics-2026-09-18.md): AcquisitionManager is PHANTOM (zero code hits, only CERTIFICATION.md mentions); ConstitutionalEventStore is a PHANTOM name; proven persistence authority is UnifiedEventRuntime + PostgreSQL ping_events (certified ce3f8687c5); EventRepository is VERIFIED LEGACY_UNREACHABLE; IEventAuthority is VERIFIED DORMANT with zero implementations. Backlog updated with falsified-premises section.
