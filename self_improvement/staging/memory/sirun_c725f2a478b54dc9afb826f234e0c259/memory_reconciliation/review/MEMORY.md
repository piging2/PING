MEMORY.md

<!-- Curated long-term memory. Keep durable business facts, preferences, and commitments here. Keep day-to-day execution details in daily notes. -->

Business

* User’s name: Nolan Geske, goes by Nolan.
* Runs PING Social, currently without an LLC.
* PING Social is an AI concierge and business automation consultancy for home service businesses.
* Primary market (2026-09-09, Nolan's call; scaled back 2026-09-20, Nolan's call): Mesa County corridor (Grand Junction, Fruita, Palisade, Clifton, Collbran, Loma, Mack, De Beque) plus Delta, Montrose, Rifle, Carbondale only. Denver-area outreach is deprioritized. Further-out Western Colorado towns are out unless core pools thin out.
* Uses Quo as the communications and phone platform.
* PING Social’s role is consultative: understand each business’s workflow and recommend AI services that solve its actual problems rather than selling a one-size-fits-all package.

Business Positioning

* PING Social helps home service businesses capture more opportunities, reduce administrative work, respond faster, and operate more consistently, while keeping the business owner and skilled worker in control; AI should handle repetitive communication, organization, follow-up, and administrative work so people can focus on customers, jobs, and decisions that require human judgment.
* Position PING Social around practical business outcomes, not AI hype: keep pitches brief, conversational, direct, and credible; never oversell or make AI sound like a replacement for the trade professional.
* PING Social is new and eager to help local companies adopt AI; frame early engagements as a limited-time trial while the service is being developed and refined.
* Market PING Social itself more aggressively (2026-09-11, Nolan's call): he is setting up Google Workspace and will build a PING Social website soon. Blue collar businesses are the explicit target market.
* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).
* Agency stance (2026-09-22, Nolan): PING Social treats other small marketing agencies as collaborators, not competitors; outreach to agency owners frames PING's AI automation as complementing their gaps without saying so literally.
* PING Social brand language (2026-09-14, Nolan's call): PIGING is a verb; page stories and captions depict how each image relates to the business.
* Content humor principle (2026-09-19, Nolan's standing rule): every PING Social post must contain something funny, native to the brand, never bolted on; the post still works if the reader ignores the joke. Enforced by the CONTENT HUMOR CHECK gate in ~/workspace/ping-content/captions.md (no caption enters the queue until it passes). Post-publish learning loop after every successful post: OBSERVE -> PUBLISH -> VERIFY -> REVIEW -> IDENTIFY ONE IMPROVEMENT -> PATCH -> TEST -> RE-CERTIFY.
* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig: smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved cheek stripes, gold hands, purple suit with gold trim; slender and tall always, never fat ("surprisingly metabolically healthy scary slender pig pimp"). Trade variants keep the exact head/character, only change outfit/scene. Canonical queue images: ~/workspace/ping-content/inbox/ping-pig-suit.png (chosen front-desk image), ping-pig-president.png and ping-pig-beggar.png (Nolan's uploads), ping-pig-plumber.png (posted), masonry variant approved 2026-09-14.
* PING Social Facebook Page EXISTS (Nolan corrected the agent 2026-09-13 for not checking memory first): https://www.facebook.com/profile.php?id=61594275542163, created 2026-09-11, 13 followers as of 2026-09-13. FB page search does not surface it; the profile.php?id= URL is canonical. Lesson: search memory before concluding a page/channel does not exist.

Customer Focus

* Prioritize businesses where missed calls, slow follow-up, scheduling friction, repetitive customer communication, lead management, or administrative workload create measurable business pain; favor solutions that realistically save time, capture revenue, improve customer experience, or ease operations.
* Recommend automation based on the customer's existing workflow and needs; avoid introducing complexity unless the business benefit clearly justifies it.

Operating Principles

* Business first, human in control: start with the customer's problem and desired business outcome, then decide whether AI is actually useful; automation supports owners and workers rather than replacing their judgment.
* Reliable capture and less drag: important customer requests, job information, and follow-up should not disappear because someone was busy; reduce unnecessary calls, messages, repetitive questions, and administrative distractions; prefer simple systems contractors can understand, maintain, and trust.
* Measurable value: prefer improvements that connect to time saved, leads captured, response speed, customer experience, or revenue.
* Nolan's standing leverage rule: actual engagement metrics first (likes, comments, messages); docs, infrastructure, and research support those metrics and must not crowd them out.
* Nolan prefers work built as systemized, deterministic systems that do not depend on Pigi personally (2026-09-19).
* Trust: never fabricate information, misrepresent PING Social, or pretend to be a customer.
* When researching a prospect's technology stack or public business presence, grade every finding as CONFIRMED, STRONG INDICATION, WEAK INDICATION, or UNKNOWN; never assume or hallucinate which software they use.

Current Commitments

* Running an autonomous outreach campaign for PING Social targeting Western Colorado home service businesses: send legitimate emails and submit legitimate contact forms without routine approval; skip blocked actions without asking.
* Reporting discipline (2026-09-15, Nolan): stay quiet when healthy; surface only prospect replies, real mistakes, genuine decisions that need Nolan's input, failures, or blocked items; no routine check-ins or approval requests.
* Cold email is capped at 10 per UTC day to protect Gmail deliverability; contact forms run at maximum honest volume with no cap.
* Old-laptop topic (2026-09-13, Nolan's call): never raise the old-laptop topic again unless another old laptop becomes absolutely necessary.
* Nolan's role assignment (2026-09-11): Pigi is the business marketing onboarding orchestrator. The CRX/PING principles (determinism, replay, evidence, authority boundaries, reuse-before-create) are the foundation the business is built on, kept in the back of the mind as everything moves forward.
* Facebook on the Pig (2026-09-13): Facebook is Pig-only (cloud sessions die, fresh-profile logins don't persist). Working setup: always-on headed Chrome on the Pig (dedicated profile, CDP :9223), logged in once by Nolan, left running; Node 22 portable + playwright-core via CDP (`~/workspace/pig-fb/`). If the window closes or the Pig reboots, Nolan must log in again.
* Meta AI delegation (2026-09-13, Nolan's directive): Muse builds a versioned context pack (`~/workspace/tandem/build-context-pack.py`) plus a structured job envelope on the Pig; raw answers with provenance sidecars; per-business verification; OBSERVATION_CREATED events into PING. Meta AI output is UNVERIFIED until the verification gate, never promoted directly into canonical claims. PING is the common intelligence substrate, NOT a prospect/lead database; operational prospect lists stay in the Muse/outreach machinery.
* Antifragility standing machinery (2026-09-14, Nolan's directive): the tandem/PING pipeline is fail-closed and resumable; typed gap states, brief-rotation retries, duplicate-emission guard, and atomic writes protect every durable boundary.
* Continuity guardrail (2026-09-13, Nolan's directive): never duplicate PING's event system. Before creating any new continuity, event, or agent store, audit what PING already has; the missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
* Continuity architecture separation (2026-09-13, Nolan's definition): Oracle is the window, the event/evidence plane is the recorder, PING is the canonical knowledge authority. The layer must be agent-readable: Muse can query it, Meta AI an appropriate subset.
* Agent write authority (2026-09-16, Nolan's grant): Hermes and Pigi's other agents may make surgical, well-reasoned writes when Pigi is confident; Pigi checks all agent-written work. Surgical means small scoped reversible diffs. Hard boundaries unchanged without Nolan's word: no pushes, no main/master commits, no credential exposure or rotation, no destructive Git or data actions, no platform-restriction bypasses, no Pig reboot, no broad IAM grants, OCI queue timer held until the full round-trip verifies.
* Machine-level delegation (2026-09-15, Nolan): the agent may use its own judgment on approach; WSL is its working plane.
* Pig desktop access (2026-09-12): SSH key auth works as `muse-ssh@100.79.154.43` via proxy; docker CLI works; muse-ssh sits in BUILTIN\Administrators. Bearer tokens live in the ping-gateway container env, re-resolvable via SSH; never write them to files, memory, or chat.
* Every outreach message opens with the explicit not-a-customer line (stating Nolan is not a customer and this is not a service request). The Facebook Page Message button is the first-choice channel (2026-09-16, Nolan's directive): try it before falling back to email or forms. Outreach messages also point prospects back to the PING Social Page as the home base and social proof (2026-09-16, Nolan's directive).
* Send-eligibility precedence (2026-09-21, Nolan's boundary): never decide send eligibility from free-form notes when structured pipeline state exists. Precedence: canonical structured state > explicit suppression > verified communication history > derived projection > notes/free text; notes never resurrect a completed sequence. On disagreement, fail closed: do not send, emit the discrepancy and evidence, require reconciliation.
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Outreach engine sweeps (2026-09-11, Nolan's call): follow-up, new-business radar, and review-triggered outreach run in the SAME engine sweeps; no new schedules are added unless a cap is hit. Follow-up ladder: up to 2 follow-ups per SENT email/DM (day 4-7 bump, day 10-14 final angle with an easy out) inside the daily email cap; never more than 3 total touches, never chase a no. New-business radar: dedicate part of each run to brand-new Western Slope trade businesses via CO SOS filings (filed/opened ~60-90 days), city license lists, chamber announcements, and "grand opening" posts; tag NEW with source=new-filing. Review-triggered: a new review of 2 stars or fewer (or a 3-star mentioning phone/response/wait) triggers one tailored same-week message per business per 90 days, referencing the pain category never the reviewer; suppressed while a follow-up ladder is active.
* Intelligence engine (2026-09-11, Nolan's directive): canonical store is a validated JSONL record plus an auto-generated plain-English MD digest rebuilt after every sweep; known-to-inferred-to-unknown is a hard rule; closed-loop learning tracks signal to angle to channel to response to outcome toward conversations and revenue (full spec: operations manual section 16).
* Preparing for an in-person conversation with the owners of Monument View Coffee Shop in Grand Junction/Redlands, Colorado about potentially improving their website and operational technology.
* Doug Rudd / The Campaign Lab (2026-09-22, Nolan): outreach ON HOLD. Earlier that day Nolan was pursuing a two-way connection (shadow-learn his agency industry-tailoring playbook, teach him AI automation), but ~12:51 MDT he paused it entirely, rejecting the drafted angle as far from what he wanted; he wants only something simple ('we're in the same space, I'm sure we can teach each other some stuff'), at most a couple-sentence draft, focus elsewhere. Send or resume nothing without a new instruction from Nolan.
* Building a comprehensive software playbook (2026-09-09): researching every software home-service businesses use (FSM/CRMs, estimating, payments, call handling, reviews, marketing, lead marketplaces, AI answering competitors) so the pitch can be tailored to each prospect's actual stack.
* Voice cloning PAUSED (2026-09-19, Nolan's call): when resumed, use the existing Pig setup (Dockerfile.cosyvoice / qwen3-tts-docker) rather than building a parallel cloning system. Nolan will give more direction.

Communication Preferences

* No em dashes, ever, in anything written for Nolan.
* Outreach message format (2026-09-20, Nolan's call): every sentence in the message body stands alone with a blank line between sentences. Messages never introduce a human name; right after the disclosure line they say "I'm an AI reaching out on behalf of PING Social." Sign-off is "PING Social, (970) 589-3309" with no name.
* Keep business communication brief, conversational, and natural.
* Avoid polished sales-script language.
* Lead with the customer’s business problem rather than technical capabilities.
* Explain technical details only when they help establish business value, reliability, trust, or feasibility.
* Outreach copy should imitate Nolan's own hot-take voice without coming off disrespectful; keep improving the Meta AI outreach prompt toward that (2026-09-22, Nolan's call).





* Three-plane operating model (2026-09-15, Nolan's standing framework): WSL is the canonical engineering plane, Windows is thin UI/rollback reference, the Pig is the authorized architecture overflow; machine-state detail lives in the dated log.




## PING website (2026-09-16/17, Nolan's standing calls)
* HPP is FROZEN (source archaeology only); the PING site is an independent repo at /home/nolan/projects/ping (own history, credentials, Vercel project). Tenant boundary: tenant.ping.v1.json is the identity authority; a second tenant is a new JSON file, not a fork.
* Positioning: continuity infrastructure for AI agents (constitutional execution, business memory, evidence/replay, multi-runtime orchestration); PING Social is the applied layer, never generic SaaS; site claims stay in the honest-BUILT column (event sourcing, mission bridge, 8 canonical workers, knowledge graph, witness/replay confirmed; agents EXPERIMENTAL). Combative competitive content stays draft-only until Nolan approves.
* Credential rule: one product, one repo, one credential set (use Piging85, no 90/91-style sprawl; never ask Nolan to paste a PAT; do not regenerate). The GitHub 401 is a platform egress-proxy fault, not a bad token; repo creation and push blocked until fixed. Tell Nolan as soon as Meta's Vercel integration is set up (2026-09-18).



## Copilot identity pool standing instructions (2026-09-17, Nolan's directive)
* "spin up another github identity" = fresh isolated browser OAuth window for the next identity_N immediately, no questions; use the authorize-identityN.sh pattern with isolated COPILOT_HOME under ~/.copilot-identities/identity_N; never touch existing identities.
* Low-agent warning: notify Nolan ASAP when the pool drops to only two working identities. Token policy (2026-09-19, Nolan's call): burn Copilot tokens freely for agent orchestration; Nolan's own tokens are the valuable ones. Pool 2026-09-19: nine dispatch-eligible (identity_1-4, identity_5/piging87, identity_6/nolangesk-droid, identity_7/trishnikitha-art, identity_9/nmgeske, identity_10/piging3), each 200/200 requests; identity_8 has no Copilot entitlement (server 403), human-side fix; identity_10 is the last one.

## PING convergence (Nolan's standing program)
* Standing program (2026-09-19; full text demoted to the dated log): UnifiedEventRuntime is the SOLE canonical event authority; EventRepository survives only as derived hash-chain audit/projection adapter; no deletion, no destructive migration, no historical ID rewrites. Authority law: UnifiedEventRuntime = event acceptance; ping_events = constitutional journal; IdentityAuthority = event identity owner; CanonicalAuthority = canonical hash owner; PG sequence / UER acceptance = event ordering; EventToMissionBridge = accepted-event to mission trigger; MissionRuntime = mission authority; MissionScheduler / WorkerRuntime = execution routing. Permanent law: "Refactor authority, preserve mechanism." Delete only proven redundant reachability, never valuable implementation history; no dual-write hack; additive/reversible convergence only. Mutation boundaries: never git add -A, git reset --hard, git clean, git restore ., force push, or history rewrite; no destructive Git or data actions.
* ONE GRILL: exactly one canonical operator-decision deliverable at ~/workspace/GRILLING-BRIEF.md; never create parallel decision inboxes. Failure memory: every failure gets a ledger entry at ~/workspace/FAILURE_LEDGER.md BEFORE any narration; bounded recovery within lane budgets, never hammer; quarantine surfaces, never disable schedules; never auto-retry UNKNOWN_EXECUTION, destructive, credential, or parked items; everything replayable.
* 24/7 directive: keep the machine improving around the clock; ping-perfecting-pass every 6h works BACKLOG_PING.md and BACKLOG_NOLAN.md quietly (local commits, never push); surgical convergence lane: EXECUTE/TEST/FALSIFY/COMMIT; each new mechanism closes a reproduced invariant. PING Runtime Distribution v1: Oracle receives only a deliberately built runtime distribution (SOURCE / RUNTIME / EVIDENCE); "get rid of artifacts" excludes from distribution, never deletes from Git.
* Three lanes stay distinct: convergence/runtime owns the durability boundary (RECEIVED, ACCEPTED, DURABLY_PERSISTED distinguishable); business pipeline runs forward with no R2/R3 recovery loop; Pig infra treats C: disk pressure as the immediate operational risk. Oracle is reserved for PING backup, recovery, release, provenance, and operations artifacts only. CG-001: tenant owner is the default human decision authority; Nolan stays constitutional operator/owner for system governance only.
* Autonomy stance (2026-09-22, Nolan's standing directive): YOLO mode. Execute fully on his word; no extra approval layer for routine work. Ask questions more often as genuine questions (curiosity, real decisions, missing facts), not as gating approvals.
* CAPTCHA handling (2026-09-22, Nolan's choice, saved all_tasks): when a browser task hits a challenge he can't expect Pigi to solve, pause and ask and he will help; covers CAPTCHA only, YOLO posture unchanged for everything else.

## Release doctrine (2026-09-19, Nolan's words)
* Standing doctrine (2026-09-19; full text demoted to the dated log): a release is a complete, certified closure of the runtime for a specific source revision (snapshot -> closure certification -> fill missing closure -> executable smoke -> build -> swap -> runtime proof); cert artifact carries source SHA, manifest/digest, smoke result, migration compatibility, runtime-path proof, and rollback image/digest.
* Postgres: absent at boot -> bounded retry -> READY only after canonical storage exists; lost after READY -> fail closed / readiness 503. Post-redeploy: closure certifier -> release certification gate before promotion.

## Communication Preferences (appended)
* Backlog tracking (2026-09-19, Nolan; split 2026-09-21 into BACKLOG_PING.md and BACKLOG_NOLAN.md, BACKLOG.md as the split index): every change to either file gets committed immediately in the ~/workspace repo (local commits, never push); the ping-perfecting-pass cron carries this rule and those two files are the only files it may commit; Nolan reviews them in VS Code from git history.
* Deliverables live in PING (2026-09-19, Nolan): the PING Social operations manual and the unified prospect knowledge store (western-co-prospects.jsonl + prospect-digest.md) must ALWAYS exist at least locally in PING at ~/ping/deliverables/ on the Pig; re-sync from the cloud copies after any material update.


## FYD Social product directive (2026-09-21..23, Nolan's calls)


* Media doctrine (2026-09-22, Nolan): prefer controlled FYD derivatives with SOURCE + DIGEST + PROVENANCE + LICENSE/AUTHORIZATION BASIS + DERIVATIVE METADATA for authorized/public demo media; avoid permanent dependence on fragile hotlinks. Public URL does not grant unlimited reuse.
* Demo owner mode (2026-09-22, Nolan): keep clearly labeled for testing, never pretend it is production authentication; wire genuine authenticated ownership before real customer exposure or consequential owner actions.

* FYD object identity (2026-09-22, Nolan): every FYD object must be immediately recognizable, always. Rest state stays the small quiet circle; on expand (hover/tap/interact) the royal light purple + shiny gold ornate border fades in around the expanded card (the ring is the border treatment, not the whole object). Enforce in the generic object component, zero customer-specific code.
* FYD object-plane scroll model (2026-09-22, Nolan): objects are document/section-anchored, never viewport-sticky (screenY = documentAnchorY - scrollY); never recompute placement on scroll; layer ON vs OFF keeps center geometry identical. Interaction: CLOSED / HOVER_PREVIEW / PINNED_OPEN; relationship click on an off-viewport object: scrollIntoView then open.
* Brand (2026-09-22, Nolan): PING and FYD are gold/purple themed; FYD-powered surfaces embedded in a customer experience sit in a small royal purple/gold themed border. Customer sites are never redesigned to match.
* HPP website work stays PLAN MODE ONLY (2026-09-22, Nolan); FYD enhances existing sites, never rebuilds them.
* Nolan's standing decision rule (2026-09-22): at 80%+ confidence decide, test, document the evidence, and continue; below 80% ask one concise question naming what is uncertain, the recommended default, and the cost of being wrong. Ask first for destructive/irreversible operations, production/public side effects outside existing authorization, ambiguous ownership/privacy decisions, licensing uncertainty, migrations affecting canonical truth, or genuinely competing interpretations. Do not reopen closed findings unless new evidence reopens them.
* Jev reframed (2026-09-22, Nolan): "deep convergence" is a supporting lane, not the project; the main project is a surgical operational patch program over the proven PING runtime, and Jev earns authority only through evidence (DECISION OBSERVER + TYPED REASONING PROVIDER + EVALUATION SYSTEM + CONNECTION/CORRECTION LAYER). Priority: P0 gate the fabricated-confidence startAutonomousLoop -> P1 causal replay -> P2/P3 typed decision contract + shadow evaluation -> P4 provider seam convergence -> P5 human approval API -> P6 approval -> KnowledgePromoter -> P7 proposal -> decision artifact -> P8 MergeGate -> PatchAuthority dry-run. Identity convergence is PLAN-ONLY, forward-only, never rewrite historical IDs. UnifiedEventRuntime.emit() -> ping_events is the single runtime writer.
* No-ClaimAuthority rule (2026-09-22, Nolan): conflict is a PROPERTY OF EVIDENCE, not a new authority; preserve both observations with their evidence; projection policy decides presentation; owner correction creates stronger evidence, never deletes observations.
* Onboarding flow (2026-09-22, Nolan): dead simple: authenticate with Facebook, then create a website. Work on the object (graph), not builder plumbing.
* FYD builder decisions locked (2026-09-22, Nolan): (1) Demo = Nolan stress-testing COLD real URLs first; one real owner (Monument View if authorized) runs the correction loop as the next gate. (2) Editing: Ask FYD -> typed patch -> proposal -> confirm -> regenerate FIRST, end to end; Puck secondary as optional visual editor OVER FYD's IR; never two representations. (3) Correction loop end-to-end: OBSERVED FACT -> owner confirm/correct/hide -> owner decision recorded -> projection changes -> regeneration -> decision survives; source observations are never rewritten by owner corrections (separate SOURCE VISIBILITY / DEFAULT POLICY / OWNER OVERRIDE / EFFECTIVE VISIBILITY). (4) Deployment: single multi-tenant renderer (hostname -> TenantResolver -> published SiteSpec version -> projection -> renderer); preserve seam customer.fyd.social then customer.com. (5) Tenants: Happy Place + Coppersmith stay the controlled pair until the correction loop works. Metrics: time-to-credible-presence + mobile UX + contact/service discoverability + performance; if the original site wins a comparison, RECORD LOSS and fix the generic generator, never hand-patch the tenant. NO list: full visual editor architecture, per-tenant React apps, theme marketplace, general CMS, new graph DB, new authorities, new workflow engine, protocol adapters, campaign engine, social harvesting implementation.
