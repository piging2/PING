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
* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites; Nolan builds professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).
* PING Social brand language (2026-09-14, Nolan's call): PIGING is a verb; page stories and captions depict how each image relates to the business.
* Content humor principle (2026-09-19, Nolan's standing rule): every PING Social post must contain something funny, native to the brand, never bolted on; the post still works if the reader ignores the joke. Enforced by the CONTENT HUMOR CHECK gate in ~/workspace/ping-content/captions.md (no caption enters the queue until it passes). Post-publish learning loop: OBSERVE -> PUBLISH -> VERIFY -> REVIEW -> IDENTIFY ONE IMPROVEMENT -> PATCH -> TEST -> RE-CERTIFY.
* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig. Canonical design (locked from Nolan's chosen front-desk image): smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved stripe markings on the cheeks, gold hands, purple suit with gold trim; cute but slightly scary. Body rule (2026-09-13, Nolan's words, hard rule): NEVER a fat pig; he is a surprisingly metabolically healthy, scary, slender tall pig pimp; no chubby or stocky variants. Trade variants (plumber, electrician, HVAC, front desk) keep this exact head and only change the outfit/scene. Queue images: ~/workspace/ping-content/inbox/ping-pig-suit.png (Nolan's chosen front-desk image), ping-pig-president.png, ping-pig-beggar.png (Nolan's uploads), ping-pig-plumber.png (posted), masonry variant ('MASONRY & FOUNDATION BEST PRACTICES' board, approved usable).
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
* Nolan prefers work built as systemized, deterministic systems that do not depend on Pigi personally (2026-09-19).
* Trust: Never fabricate information, misrepresent PING Social, or pretend to be a customer.
* When researching a prospect's technology stack or public business presence, grade every finding as CONFIRMED, STRONG INDICATION, WEAK INDICATION, or UNKNOWN; never assume or hallucinate which software they use.

Current Commitments

* Running an outreach campaign for PING Social targeting Western Colorado home service businesses; outreach is autonomous: send legitimate emails and submit legitimate contact forms without routine approval requests; skip blocked actions without asking.
* Reporting discipline (2026-09-15, Nolan): stay quiet when healthy; surface prospect replies, significant mistakes, failures, blocked items, genuine decisions needing Nolan's input, or new self-improvement; avoid routine check-ins and unnecessary approval requests.
* Cold email capped at 10 per UTC day (Gmail deliverability); contact forms at maximum honest volume, no cap.
* Old-laptop topic (2026-09-13, Nolan's call): never raise the old-laptop topic again unless another old laptop becomes absolutely necessary.
* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator; the CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on.
* Pig access and Facebook (2026-09-12/13): SSH key auth as `muse-ssh@100.79.154.43` via proxy; docker CLI works; muse-ssh is BUILTIN\Administrators; bearer tokens live in the ping-gateway container env, re-resolvable via SSH, never written to files, memory, or chat. Facebook is Pig-only (cloud sessions die, fresh-profile logins don't persist): always-on headed Chrome (dedicated profile, CDP :9223), logged in once by Nolan, left running; Node 22 portable + playwright-core via CDP (`~/workspace/pig-fb/`); if the window closes or the Pig reboots, Nolan must log in again.
* Meta AI delegation (2026-09-13, Nolan's directive): Muse builds a versioned context pack from source artifacts (`~/workspace/tandem/build-context-pack.py`) plus a structured job envelope on the Pig; raw answers with provenance sidecars; per-business verification; OBSERVATION_CREATED events into PING. Meta AI output is UNVERIFIED until the verification gate, never promoted directly into canonical claims. PING is the intelligence substrate, NOT a prospect/lead database; operational prospect lists stay in the Muse/outreach machinery.
* Antifragility standing machinery (2026-09-14, Nolan's directive): the tandem/PING pipeline is fail-closed and resumable; typed gap states, brief-rotation retries, duplicate-emission guard, and atomic writes protect every durable boundary.
* Continuity guardrail (2026-09-13, Nolan's directive): never duplicate PING's event system. Before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
* Continuity architecture separation (2026-09-13, Nolan's definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority. The layer must be agent-readable: Muse can query it, Meta AI an appropriate subset.
* Agent write authority (2026-09-16, Nolan's grant): Hermes and Pigi's other agents may make surgical, well-reasoned writes when Pigi is confident; Pigi checks all agent-written work. Surgical means small scoped reversible diffs. Hard boundaries unchanged without Nolan's word: no pushes, no main/master commits, no credential exposure or rotation, no destructive Git or data actions, no platform-restriction bypasses, no Pig reboot, no broad IAM grants, OCI queue timer held until the full round-trip verifies.
* Machine-level delegation (2026-09-15, Nolan): the agent may use its own judgment on approach; WSL is its working plane.
* Every outreach message opens with the explicit not-a-customer disclosure line (stating Nolan is not a customer and this is not a service request). The Facebook Page Message button is the first-choice channel (2026-09-16, Nolan's directive); messages point prospects back to the PING Social Page as home base and social proof (2026-09-16, Nolan's directive).
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Channel priority (2026-09-10, Nolan's call; heavy mode 2026-09-15; like-liberal directive 2026-09-16): Facebook interactions first at maximum safe level (up to 75 likes per pass, passes every 3h; friends' personal posts OK for likes); comments punchy and short, expert/techy but down to earth and funny, never selling, business Pages only, 10/pass max; Page publishing paused while the silent restriction persists. DMs at maximum volume; discovery across 15-20 groups plus business Page feeds; then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last.
* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit.
* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a no-interest.
* New-business radar (2026-09-11): each engine run reserves research for brand-new Western Slope trade businesses (Colorado SOS business database https://co.colorado.gov/search-business-records, city clerk license lists, chamber new-member announcements, 'grand opening' group posts); filed/opened within ~60-90 days, tagged NEW with source=new-filing.
* Review-triggered outreach (2026-09-11): a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record plus an auto-generated plain-English MD digest rebuilt after every sweep; known to inferred to unknown is a hard rule; closed-loop learning tracks signal to angle to channel to response to outcome toward conversations and revenue. Full spec in the operations manual section 16.
* Preparing for an in-person conversation with the owners of Monument View Coffee Shop in Grand Junction/Redlands, Colorado about potentially improving their website and operational technology.
* Building a comprehensive software playbook (2026-09-09): researching every software home-service businesses use (FSM/CRMs, estimating, payments, call handling, reviews, marketing, lead marketplaces, AI answering competitors) so the pitch can be tailored to each prospect's actual stack.
* Voice cloning PAUSED (2026-09-19, Nolan's call): held to a perfection bar (full readiness audit before any voice notes over text or an AI podcast mimicking him). The 2026-09-19 audit found no CozyVoice setup and zero usable speech on the WSL machine (media library empty, phone gallery offline, workspace only still photos), so his own voice is not ready; a stand-in voice could start now. When resumed, use the existing Pig setup (Dockerfile.cosyvoice / qwen3-tts-docker), never a parallel system; Nolan gives more direction.

Communication Preferences

* No em dashes, ever, in anything written for Nolan.
* Keep business communication brief, conversational, and natural.
* Avoid polished sales-script language.
* Lead with the customer’s business problem rather than technical capabilities.
* Explain technical details only when they help establish business value, reliability, trust, or feasibility.

Long-Term Direction

PING Social's long-term direction matches Business Positioning above: a practical technology partner for home service businesses; the goal is not to sell businesses 'more AI.'




* Three-plane operating model (2026-09-15, Nolan's standing framework): WSL is the canonical engineering plane, Windows is thin UI/rollback reference, the Pig is the authorized architecture overflow; machine-state detail lives in the dated log.



## X doubling-down (2026-09-15, Nolan's order)
* Nolan's headshot (2026-09-15, for profile photos): workspace/user/media_library/image/a3/a3897dbeff6ac4f9d32cc0e8d70e44279d42a4dd79d89bc8822837393a2081c9.jpg

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
* "spin up another github identity" = open a fresh isolated browser OAuth window for the next identity_N immediately, no questions, no confirmation; use the established authorize-identityN.sh pattern with an isolated COPILOT_HOME under ~/.copilot-identities/identity_N. Never touch existing identities.
* Low-agent warning: notify Nolan ASAP when the pool drops to only two working identities.
* Token policy (2026-09-19, Nolan's call): burn Copilot tokens freely in service of agent orchestration; Nolan's own tokens are the valuable ones.

## PING convergence (Nolan's standing program)

* Event authority: UnifiedEventRuntime is the SOLE canonical event authority ("what canonical event did PING accept as having happened"); ordering + replay certified 2026-09-19. EventRepository survives only as derived hash-chain audit/projection adapter; repository_events rows = PRESERVED_AUDIT_HISTORY, legacy events rows = PRESERVED_LEGACY_HISTORY; no deletion, no destructive migration, no historical ID rewrites; new EventRepository writes must reference an already-accepted canonical event.
* Legacy writers: explicit observable LegacyIngressAdapter with explicit allowlist of known-safe callers, default-deny (unsafe/unknown fails closed loudly); direct legacy DB writes to canonical tables prohibited; no silent translation into canonical truth.
* accepted_by_ping: continuity-bound acceptance record (Promise A) replacing the naked boolean, scoped to the Postgres/ping_events store epoch (normal restarts do NOT bump it; continuity breaks do). States VERIFIED_CURRENT / STALE_REQUIRES_REVERIFICATION / REJECTED / UNKNOWN; re-verification path required; sidecar/provenance files alone NEVER promote STALE to VERIFIED_CURRENT; the six quarantined identities stay STALE (re-distillation NOT authorized).
* Durability order: event authority first, cheap physical checks in parallel (L0-L3 restart proofs, volume identity, startup continuity guard failing readiness on unexpected empty store); genesis must be an explicit recorded operator decision stored outside the DB; guard's expected store identity lives outside the guarded store; recovery ladder L0-L6, claim only proven levels.
* Architecture: Postgres = canonical truth; event history append-oriented; projections/intelligence rebuildable; workers horizontally replaceable; models produce new evidence/claims, never mutate canonical history. Keep FACT/EVENT HISTORY, DERIVED KNOWLEDGE, MODEL OUTPUT, OPERATIONAL STATE, and PROJECTION/CACHE distinct.
* Competing implementations: never delete merely because authority is settled; classify each as CANONICAL, LEGACY_INGRESS, COMPATIBILITY ADAPTER, PRESERVED_INACTIVE, FORENSIC, DERIVED, or UNKNOWN; convergence is one authority per decision, not one surviving implementation.
* Ordering semantics discipline (2026-09-18, Nolan): never collapse Identity, Hashing, Sequence, Timestamp, Causation/correlation, and Replay order into one concept; ordering scope comes from the runtime's actual semantics, never invented.
* Execution (2026-09-19, Nolan's orders): converge the two proven effective event authorities (UnifiedEventRuntime -> ping_events and CanonicalEventEnvelope -> canonical_events) WITHOUT deleting either implementation. Run each autonomous cycle for as long as productive work remains; do not stop after producing an audit report; do not repeatedly return operator questions when a safe evidence-producing action is available; use subagents or parallel lanes where supported.
* Convergence law (2026-09-19, Nolan): ONE AUTHORITY PER DECISION, not one implementation for everything; multiple components are acceptable when they own different decisions.
* P0B (2026-09-19, Nolan's call): the important invariant going forward. Durable event-to-mission reconciliation proven: 48/48 assertions, 10 concurrent reconciles each yield exactly one mission, and the live/reconcile race yields exactly one durable mission.
* Standing authority law (2026-09-19, Nolan): UnifiedEventRuntime = canonical event acceptance authority; ping_events = authoritative constitutional journal; IdentityAuthority = event identity owner; CanonicalAuthority / constitutional canonicalization path = canonical hash owner; PostgreSQL sequence / UER acceptance = authoritative event ordering; EventToMissionBridge = accepted-event -> mission trigger authority; MissionRuntime = mission authority; MissionScheduler / WorkerRuntime = execution-routing authority.
* Standing distinctions (2026-09-19, Nolan): envelope_id != canonical event_id; receipt_order != canonical event sequence; receipt timestamp != constitutional acceptance timestamp. canonical_events preferred role: SECONDARY CERTIFIED EVENT REPRESENTATION (responsibilities to be proven, not assigned). The defect is overlapping truth decisions and identity reminting, not the existence of two implementations; one decision one owner, one logical event one canonical identity, one authoritative runtime commit, many preserved representations.
* Authority forensic rule (2026-09-19, Nolan): multiple APIs != multiple authorities; multiple stores != automatically multiple authorities; multiple representations != multiple truths; multiple executors != multiple schedulers; delegation != duplication. A shim that merely delegates is not a competing authority.
* Multi-runtime rule (2026-09-19, Nolan): MANY EXECUTORS, ONE CONSTITUTIONAL AUTHORITY. No executor gets an independent canonical event journal, mission authority, or self-certification.
* Implementation rule (2026-09-19, Nolan): FORENSICS -> DECISION -> MINIMAL PATCH -> TARGETED TEST -> REGRESSION -> EVIDENCE -> NEXT PHASE. Read-only forensics precedes each authority mutation; then implement the smallest convergence patch.
* Response cadence (2026-09-19, Nolan): no interim reports for routine phase completions; surface only NEW CONSTITUTIONAL CONTRADICTION, DESTRUCTIVE/IRREVERSIBLE ACTION REQUIRED, ORACLE CUTOVER AUTHORIZATION REQUIRED, SECRET/CREDENTIAL REQUIRED, SCHEMA MIGRATION WITH NONTRIVIAL DATA RISK, or UNRESOLVED TWO-WRITER CONDITION. Gate report format: PHASES COMPLETED / CURRENT PHASE / AUTHORITY DECISIONS PROVEN / MECHANISMS PRESERVED / PATCHES IMPLEMENTED / TESTS / BLOCKED TESTS / ORACLE STATE / NEW RISKS / NEXT.
* Permanent PING law (2026-09-19, Nolan): "Refactor authority, preserve mechanism" (replaces any deletion-oriented framing; delete nothing, prove before promotion). Preserve aggressively, refactor authorities, delete only proven redundant reachability; prefer delegate, adapt, project, wrap, version, archive, disconnect, mark legacy over destructive deletion. Standing mutation boundaries: never git add -A, git reset --hard, git clean, git restore ., force push, history rewrite; preserve unrelated WIP; no deletion of historical implementations or legacy tables; no destructive migration; additive/reversible convergence only. No dual-write hack: if both stores persist, one is canonical and commits once, the other is derived/rebuildable.
* A failing test may expose an architectural defect but never authorizes moving constitutional ownership to make it pass; harvest mechanisms, not authority claims.
* Certified code vs running code is the top planning constraint: no unit may be certified against the convergence worktree alone (ping-gateway:devin-boundary2 runs the older event path).
* 12-leaf = P0 INTERIM INVARIANT: existing 12-leaf roots must not be destroyed, rewritten, or silently recomputed while canonical root semantics are unresolved.
* Witness (Nolan's ratification): a canonical witness is a DERIVED replay attestation, not a standalone authority; WitnessWorker carries a failure-honesty gate that refuses to attest unverified replays, so the replay-fidelity gap stays a known gap rather than silently becoming false certification (matters for the Oracle cutover gate). Still open: 12/13-leaf drift, structural validation vs naked verified trust, legacy classification. This came from the convergence status message in chat when the user asked for convergence status update, recorded 2026-09-19.
* Rogue Witness branch (compute_witness_root moved into replay_worker.py, persistence removed, contracts changed): do not merge, do not delete; adversarial audit ordered.
* Replay is PING's major constitutional weakness, not event authority (2026-09-19, Nolan's judgment): the live replay path does not reconstruct from ping_events and re-mints identities, so journal-faithful deterministic replay is unproven. Missing Dockerfile.replay is a deployment defect, not an architecture crisis; do not resurrect the legacy Python replay architecture for the obsolete compose service. The live path is JS ReplayWorker to KernelReplayExecutionProvider to DeterministicReplayEngine.
* Proof ladder (adopted): DECLARED -> EXISTENCE -> IMPORTABILITY -> REACHABILITY -> EXECUTION -> PERSISTENCE -> EVIDENCE -> REPLAY -> REPRODUCIBILITY -> CERTIFICATION; evidence states DECLARED / INFERRED / SOURCE_VERIFIED / REACHABILITY_VERIFIED / LIVE_VERIFIED / FALSIFIED / BLOCKED.
* Event volume follows proof: 1 complete event, then 10, then 100, then sustained; no activity for activity's sake.
* Sunday 2026-09-20 15:00 PING Social post: Nolan chose the unproven business-agent path; prove and determinize it before then.
* Standing 24/7 directive (2026-09-19 ~13:51 MDT): keep the machine improving around the clock; full standing detail in AGENTS.md (ping-perfecting-pass every 6h on BACKLOG.md; surgical convergence lane EXECUTE/TEST/FALSIFY/COMMIT with commit/merge/push per discipline, superseding the commit freeze for that lane only; new-mechanism rent rule).
* ONE GRILL (2026-09-19, Nolan's governing directive): exactly one canonical operator-decision deliverable at ~/workspace/GRILLING-BRIEF.md; every lane routes consequential operator questions through it; never create parallel decision inboxes. Full retention rules in AGENTS.md.
* CG-001 (decided 2026-09-19): tenant owner is the default human decision authority; Nolan stays constitutional operator/owner for system governance only.
* Locked backlog answers (2026-09-19): 300-row JSONL freeze dropped (snapshot/verify first, no record deletion); the operation creating the state change owns its same-run projection; canonical prospect JSONL is the status authority (queue = execution intent only); Fenix/Cooley's parked OUTCOME_UNKNOWN; Threads worker re-dispatched idempotently; continuous engine owns observe→review after Sunday's post; worker-deliverable validator = smallest gate with a real caller, no shelfware.
* Failure memory + self-healing (2026-09-19, Nolan's standing rule): every failure gets a ledger entry at ~/workspace/FAILURE_LEDGER.md BEFORE any narration; bounded recovery within lane budgets, never hammer; quarantine surfaces, never disable schedules; never auto-retry UNKNOWN_EXECUTION, destructive, credential, or parked items; everything replayable; ping-perfecting-pass sweeps the ledger each run. Full rule in AGENTS.md.
* PING Runtime Distribution v1 (2026-09-19, Nolan's directive, next migration milestone): separate source/history/audit artifacts from runtime state; Oracle receives only a deliberately built runtime distribution. Option 3 (runtime allowlist bundle) now, evolving into option 4 (build images elsewhere). `runtime-manifest.json` allowlist plus dependency-closure validation; build fails on out-of-distribution imports. Three deliverables: SOURCE / RUNTIME / EVIDENCE. 'Get rid of artifacts' means exclude from distribution, never delete from Git. Hard gate: finish Event Authority forensics first (authority proven -> reachability -> persistence -> closure -> allowlist -> exclude -> ARM64 image -> Oracle); do not strip yet. Oracle host: ping-core-01, Ubuntu 24.04 ARM64, ~5.8 GB RAM, ~45 GB disk; SSH auth with Nolan's existing local key proven; Docker and Git missing (pending prerequisites). Detail: ~/workspace/goals/ping-agent-execution-stack/files/PING-RUNTIME-DISTRIBUTION-V1-MILESTONE.md.
