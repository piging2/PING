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

* PING Social helps home service businesses capture more opportunities, reduce administrative work, respond faster, and operate more consistently, while keeping the business owner and skilled worker in control.
* Technology should strengthen the worker and owner, not replace their judgment.
* AI should handle repetitive communication, organization, follow-up, and administrative work so people can focus on customers, jobs, and decisions that require human judgment.
* Position PING Social around practical business outcomes, not AI hype.
* Keep pitches brief, conversational, direct, and credible.
* Never oversell or make AI sound like a replacement for the trade professional.
* PING Social is new and eager to help local companies adopt AI; frame early engagements as a limited-time trial while the service is being developed and refined.
* Market PING Social itself more aggressively (2026-09-11, Nolan's call): he is setting up Google Workspace and will build a PING Social website soon. Blue collar businesses are the explicit target market.
* Website revamp angle (2026-09-11, Nolan's call): propose a website revamp ONLY for very non-technical owners with weak websites. Nolan can build professional custom websites (TenantOS pipeline) and specializes in backend microservices infrastructure. Portfolio proof asset: https://happy-place-platform.vercel.app/ (may be cited in revamp pitches).
* Agency stance (2026-09-22, Nolan): PING Social treats other small marketing agencies as collaborators, not competitors; outreach to agency owners frames PING's AI automation as complementing their gaps without saying so literally.
* PING Social brand language (2026-09-14, Nolan's call): PIGING is a verb; page stories and captions depict how each image relates to the business.
* Content humor principle (2026-09-19, Nolan's standing rule): every PING Social post must contain something funny, native to the brand, never bolted on; the post still works if the reader ignores the joke. Enforced by the CONTENT HUMOR CHECK gate in ~/workspace/ping-content/captions.md (no caption enters the queue until it passes). Post-publish learning loop after every successful post: OBSERVE -> PUBLISH -> VERIFY -> REVIEW -> IDENTIFY ONE IMPROVEMENT -> PATCH -> TEST -> RE-CERTIFY.
* PING pig mascot rule (2026-09-14, Nolan's call, hard rule): every mascot image must be the exact PING pig character, never a generic pig: smooth metallic gold pig head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple curved cheek stripes, gold hands, purple suit with gold trim; slender and tall always, never fat ("surprisingly metabolically healthy scary slender pig pimp"). Trade variants keep the exact head/character, only change outfit/scene. Canonical queue images: ~/workspace/ping-content/inbox/ping-pig-suit.png (chosen front-desk image), ping-pig-president.png and ping-pig-beggar.png (Nolan's uploads), ping-pig-plumber.png (posted), masonry variant approved 2026-09-14.
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
* Reporting discipline (2026-09-15, Nolan): stay quiet when healthy; surface prospect replies, significant mistakes, genuine decisions that need Nolan’s input, failure, important, response-required, new self-improvement, or blocked items; avoid routine check-ins and unnecessary approval requests.
* CEO feed vs engineering ledger (2026-09-26, Nolan's binding rule): housekeeping failures belong in the engineering ledger, never the CEO feed. CEO feed contains ONLY: user-visible progress, security/canonical incidents, external-effect risks, first broken product step, decisions requiring owner authority. Per the 2026-09-26 WorkerRuntime/Mission Control authorization, the ONLY escalation triggers are: user-visible FYD progress, Mission Control can now dispatch a real headless agent, WorkerRuntime repair failed, security/canonical incident, decision requiring human authority. No worker chatter.
* Copilot identity authorization (2026-09-26, Nolan): use identities 1-4 only for real bounded work; identity_5..10 remain DENIED regardless of OAuth ownership. Token policy (2026-09-26, Nolan's reversal): burn Copilot tokens as much as can be comfortably used on real work, and tell Nolan when more tokens are needed. Parallelize separable ownership surfaces (TenantOS, Orca, Mission Control, FYD, WorkerRuntime repair) under a single integration authority; never run parallel agents that edit the same ownership surface.
* Lane self-reports are hypotheses until replayed from a CLEAN CHECKOUT (2026-09-26, ask-lane case): the FYD ask lane reported "62 passing across 5 suites" and committed f1738c4, but a falsifier replay showed the suites import modules that were never committed in any repo history (src/fyd/ask/answer, types, context-builder, src/lib/ping/types, src/fyd/object/view, etc.) — 0 tests execute from clean checkout, identically before and after integration cherry-picks. Same failure class as the 2026-09-25 privacy lane (claimed code never merged). Rule: a lane's green claim counts only after an independent replay from a clean checkout/worktree; never trust a lane's test count without it. Also from that replay: render 4977f31 was already an ancestor of fyd/builder-rebuild-v1 (was never missing); coordinator's "missing render" diagnosis was wrong.
* Ask-lane case RESOLVED (2026-09-26): the missing modules were real, not invented — found as genuine multi-session implementations in the lane's uncommitted working tree (1470 untracked entries). Recovered the computed transitive import closure (59 files across 4 commits: 30 ask-suite deps, 26 site-bundle/tenant-graph substrate + 14 config JSONs, 2 archetypes, 1 components registry) and rejected the recovery agent's 919-file sweep. Clean-checkout replay: 7/7 suites, 92/92 tests pass (lane's "62" was real; +30 route tests unblocked by site-bundle). Same "committed file imports uncommitted module" failure recurred at 3 deeper layers (site-bundle→fyd-tenant-graph, generator→archetypes, validator→components/registry) — the media lane never caught it because its tests don't import site-bundle. fyd/builder-rebuild-v1 now at 8cc8291, fully integrated and green. Standing lesson stands: commit the module tree with the tests, and replay from clean checkout.
* Broker fail-closed containment is committed: fix/broker-failclosed-containment at da64baa (src/broker.js + test/broker.test.js), 62/62 pass. Live Pig broker deployment of the containment still unverified.
* Broker quota bugs fixed and synced to the canonical Pig broker copy (2026-09-26): pickQuotaNumbers now parses the current API quota shape (entitlementRequests/usedRequests, no 'remaining' field) instead of returning null and blocking all dispatches; isQuotaStale checks observation time against reset_at instead of wall-clock. This came from the 2026-09-26 worker stream report, recorded 2026-09-26.
* DISTILL closer age semantics (2026-09-26, Nolan's tightening): a 36-hour threshold is evaluated at the qualifying observation/report timestamp (latest consecutive report's checked_at), not at wall-clock decision time, unless the rule explicitly says otherwise. Patched into ~/workspace/tandem/chronic-distill-close.py: gap_age_h now takes obs_time, reason-age phrasing used as-is with no elapsed-since added, fail-closed when observation time is undeterminable.
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
* Outreach authority ordering (2026-09-25, Nolan's binding rule; supersedes the 2026-09-21 precedence): explicit current operator directive > explicit campaign policy > canonical structured campaign state > authorized human reconciliation > derived eligibility > notes/narrative/inference. MACHINE_PROPOSED_RECONCILIATION is not AUTHORIZED_RECONCILIATION: the engine's self-made eligibility reconciliations are potential process violations requiring human review (flag dependent sends as POLICY REVIEW REQUIRED); automation may never grant itself human-reserved reconciliation authority. When directives conflict or scope is genuinely ambiguous: no external side effect, create HOLD.
* Prospect research and pipeline refilling run perpetually until Nolan says stop; the only stopping conditions are tool rate limits.
* Channel priority (2026-09-10, Nolan's call): Facebook interactions first, then marketing intelligence, then website forms only where the B2B nature is obvious, then cold email last. Engagement cadence (CEO MODE 2026-09-23, Nolan's binding order, accelerated same day): 20 likes + 10 comments per pass, 3h cadence, +5 likes/week up to the standing 75/pass ceiling and +3 comments/week up to the standing 20/pass comment ceiling. Any checkpoint, warning, or restriction drops volume to 5 likes + 0 comments with a 14-day hold before the weekly ramp restarts. Friends' personal posts are OK for likes; comments punchy and short, expert/techy but down to earth and funny, never selling, business Pages only; Page publishing paused while the silent restriction persists. DMs at maximum volume; discovery across 15-20 groups plus business Page feeds.
* Follow-up, new-business radar, and review-triggered outreach are wired into the SAME engine sweeps (2026-09-11, Nolan's call); no new schedules are added unless a cap is hit.
* Follow-up ladder (2026-09-11): every SENT email or DM SENT gets up to 2 follow-up touches (day 4-7 bump, day 10-14 final angle with an easy out), counted inside the 10-per-UTC-day email cap with priority over new cold sends. Never more than 3 total touches, never chase a "no interest."
* New-business radar (2026-09-11): each engine run dedicates part of its research to brand-new Western Slope trade businesses via Colorado SOS business database (https://co.colorado.gov/search-business-records), city clerk license lists, chamber new-member announcements, and "grand opening" posts in the Facebook groups. Filed/opened within ~60-90 days, tagged NEW with source=new-filing.
* Review-triggered outreach (2026-09-11): monitor pipeline prospects' Google reviews; a new review of 2 stars or fewer (or a new 3-star mentioning phone/response/wait issues) triggers a tailored same-week message referencing the pain category, never the reviewer. Max one review-triggered message per business per 90 days; suppressed while a follow-up ladder is active.
* Intelligence engine upgrade (2026-09-11, Nolan's directive): the outreach system is a cross-channel business-intelligence + demand-generation engine. Canonical store is a validated JSONL record plus an auto-generated plain-English MD digest rebuilt after every sweep; known to inferred to unknown is a hard rule; closed-loop learning tracks signal to angle to channel to response to outcome toward conversations and revenue. Full spec in the operations manual section 16.
* Monument View Coffee Shop owners (Grand Junction/Redlands): package prepared for an in-person conversation about website/operational technology improvements; no autonomous contact and no client-outreach questions until the product gate is green (2026-09-25, Nolan's client-contact rule).
* Doug Rudd / The Campaign Lab (2026-09-22, Nolan): outreach ON HOLD. Earlier that day Nolan was pursuing a two-way connection (shadow-learn his agency industry-tailoring playbook, teach him AI automation), but ~12:51 MDT he paused it entirely, rejecting the drafted angle as far from what he wanted; he wants only something simple ('we're in the same space, I'm sure we can teach each other some stuff'), at most a couple-sentence draft, focus elsewhere. Send or resume nothing without a new instruction from Nolan.
* Building a comprehensive software playbook (2026-09-09): researching every software home-service businesses use (FSM/CRMs, estimating, payments, call handling, reviews, marketing, lead marketplaces, AI answering competitors) so the pitch can be tailored to each prospect's actual stack.
* Voice cloning PAUSED (2026-09-19, Nolan's call): when resumed, use the existing Pig setup (Dockerfile.cosyvoice / qwen3-tts-docker) rather than building a parallel cloning system. Nolan will give more direction.
* Client-contact rule (2026-09-25, Nolan, locked): Nolan owns external relationship/contact decisions; agents prepare, never decide that architecture work should become client engagement. Do not ask about client relationships, outreach strategy, Monument View, or who to contact until the product gate is green; do not contact clients on his behalf; outreach state must not drive FYD architecture.

Communication Preferences

* No em dashes, ever, in anything written for Nolan.
* Outreach message format (2026-09-20, Nolan's call): every sentence in the message body stands alone with a blank line between sentences. Messages never introduce a human name; right after the disclosure line they say "I'm an AI reaching out on behalf of PING Social." Sign-off is "PING Social, (970) 589-3309" with no name.
* Keep business communication brief, conversational, and natural.
* Avoid polished sales-script language.
* Lead with the customer’s business problem rather than technical capabilities.
* Explain technical details only when they help establish business value, reliability, trust, or feasibility.
* Outreach copy should imitate Nolan's own hot-take voice without coming off disrespectful; keep improving the Meta AI outreach prompt toward that (2026-09-22, Nolan's call).

Long-Term Direction

PING Social's long-term direction matches Business Positioning above: a practical technology partner for home service businesses; the goal is not to sell businesses 'more AI.'




* Three-plane operating model (2026-09-15, Nolan's standing framework): WSL is the canonical engineering plane, Windows is thin UI/rollback reference, the Pig is the authorized architecture overflow; machine-state detail lives in the dated log.



## X doubling-down (2026-09-15, Nolan's order)

* Nolan's headshot (2026-09-15, for profile photos): workspace/user/media_library/image/a3/a3897dbeff6ac4f9d32cc0e8d70e44279d42a4dd79d89bc8822837393a2081c9.jpg
* Social presence growth (2026-09-18): start posting videos; open to sharing others' articles, technical hot takes, resources; drive personal Facebook traffic to the website once finished.
* PING architecture autonomy (2026-09-16): PING architecture and outreach machine run fully autonomously; crons run daily and Pigi proactively proposes concrete improvements.
* Pig commute blackout (2026-09-16): the Pig drops around 7am and 4pm MT when Nolan drives to/from work; on failure in those windows wait 10 minutes before retrying, do not hammer.
* X API (2026-09-25, Nolan's order): X interactions ramped up, conservatively; Nolan is funding X now. Supersedes the 2026-09-22 browser-only stance.

## PING website (2026-09-16/17, Nolan's standing calls)

* HPP is FROZEN (source archaeology only); PING site is an independent repo at /home/nolan/projects/ping (own history, credentials, Vercel project). Tenant boundary: tenant.ping.v1.json is the identity authority; a second tenant is a new JSON file, not a fork.
* Positioning: continuity infrastructure for AI agents (constitutional execution, business memory, evidence/replay, multi-runtime orchestration); PING Social is the applied layer, never generic SaaS; site claims stay in the honest-BUILT column (event sourcing, mission bridge, 8 canonical workers, knowledge graph, witness/replay confirmed; agents EXPERIMENTAL).
* Credential rule: one product, one repo, one credential set (use Piging85, no 90/91-style sprawl; never ask Nolan to paste a PAT; do not regenerate). The GitHub 401 is a platform egress-proxy fault, not a bad token; repo creation and push blocked until fixed.
* Combative competitive content per Nolan: grounded in real technical differences (starting with Monday 'Work OS'); drafts stay draft-only until he approves.
* Tell Nolan as soon as Meta's Vercel integration is set up (2026-09-18).



## Copilot identity pool standing instructions (2026-09-17, Nolan's directive)
* "spin up another github identity" = fresh isolated browser OAuth window for the next identity_N immediately, no questions; authorize-identityN.sh pattern, isolated COPILOT_HOME under ~/.copilot-identities/identity_N. Never touch existing identities.
* Low-agent warning: notify Nolan ASAP when the pool drops to only two working identities. Token policy (2026-09-26, Nolan's reversal, supersedes 2026-09-25): burn Copilot tokens as much as can be comfortably used on real work; tell Nolan when more tokens are needed.
* Pool (2026-09-19): identity_1-4, identity_5/piging87, identity_6/nolangesk-droid, identity_7/trishnikitha-art, identity_9/nmgeske, identity_10/piging3 dispatch-eligible (200/200 each); identity_8 has no Copilot entitlement (server 403, human-side fix); Nolan confirmed identity_10 is the last one.

## PING convergence (Nolan's standing program)
* Standing program in the 2026-09-25 dated log. Kept: UnifiedEventRuntime is the SOLE canonical event authority; EventRepository survives only as derived hash-chain audit/projection adapter; 'refactor authority, preserve mechanism' (additive/reversible convergence only, no dual-write); ONE GRILL at ~/workspace/GRILLING-BRIEF.md; every failure gets a ledger entry BEFORE narration; ping-perfecting-pass every 6h works the backlogs quietly; Oracle reserved for backup, recovery, release, provenance, and operations; CG-001: tenant owner is the default human decision authority.

## Release doctrine (2026-09-19, Nolan's words)
* Full doctrine in the 2026-09-25 dated log. Kept: a release is a certified closure of the runtime for a source revision (snapshot -> closure certification -> fill missing closure -> executable smoke -> build -> swap -> runtime proof); Postgres absent at boot -> bounded retry -> READY only after canonical storage; lost after READY -> fail closed / readiness 503; post-redeploy closure certifier gates promotion.

## Operational Standing Rules
* Backlog tracking (2026-09-19, Nolan; split 2026-09-21 per Nolan into BACKLOG_PING.md and BACKLOG_NOLAN.md, with BACKLOG.md as the split index): every change to either file gets committed immediately in the ~/workspace repo (local commits, never push); Nolan reviews them in VS Code from git history. The ping-perfecting-pass cron carries this rule and those two files are the only files it may commit. No chat mirroring.
* Deliverables live in PING (2026-09-19, Nolan): the PING Social operations manual and the unified prospect knowledge store (western-co-prospects.jsonl + prospect-digest.md) must ALWAYS exist at least locally in PING, at ~/ping/deliverables/ on the Pig. Re-sync from the cloud copies after any material update.


## FYD Social product directive (2026-09-21, Nolan's calls)


* FYD Product Invariant, frozen (2026-09-21, Nolan's law): ONE canonical read model feeds Page, Circle, ObjectView, Ask FYD, search, agents, and future protocol projections. Fixtures are test inputs only; no production fixture fallback; if read-model data is unavailable, FAIL HONESTLY / SHOW UNKNOWN. The builder does NOT own business truth; it composes projections (SOURCE MATERIAL -> EVIDENCE -> OBJECT GRAPH -> OWNER OVERLAYS -> SITE SPEC -> READ MODEL -> RENDERER). Center plane = canonical owner/business content, untouched; margins = contextual intelligence when safe space exists, collapsing to center on narrow viewports. Ask FYD is evidence-bounded Q&A and must never fill missing business facts from model priors. Device testing stays on the private Tailscale forwarding route, never a public bind.





* Autonomy stance (2026-09-22, Nolan's standing directive): YOLO mode. Execute fully on his word; no extra approval layer for routine work. Ask questions more often as genuine questions (curiosity, real decisions, missing facts), not as gating approvals. CAPTCHA handling: choice "ask", saved all_tasks (revision 1, 2026-09-22): when a browser task hits a challenge he can't expect me to solve, pause and ask and he will help; this covers CAPTCHA only and does not change the YOLO posture for everything else.
* Nolan's standing decision rule (2026-09-22): if confidence >= 80%, decide, test, document the evidence, and continue; below 80%, ask one concise question naming what is uncertain, the recommended default, and the consequence of choosing wrong. Ask him first for destructive/irreversible operations, production/public side effects outside existing authorization, ambiguous ownership/privacy decisions, licensing uncertainty, migrations affecting canonical truth, or genuinely competing interpretations.
* Nolan's standing operations rule (2026-09-22): do not reopen closed findings unless new evidence reopens them.
















* Jev Typesafe axioms (2026-09-25, Nolan, standing): typed, calibrated decisions are a core PING primitive with constitutional authority preserved. Jev stays a typed probabilistic decision engine behind a narrow provider adapter, never an authority; a probability is evidence for a decision, never authorization. A C5 action must never become automatically executable merely because a provider reports high probability. Design A committed 2026-09-25 (per-call explicit opt-in throwing AUTONOMOUS_LOOP_CLOSED, de-fabrication at root). Promotion needs Nolan's word after proof the running image enforces the gate.
* FYD object presence direction (2026-09-25 ~14:45 MDT, Nolan, standing product law): PING objects must feel like they belong to the website, not a chat widget, ad, or debug overlay. Desktop default is PAGE-ANCHORED/COMPOSITION-ANCHORED, never persistent viewport-fixed; objects scroll away with their region. Three formal modes: EMBEDDED (best default), EDGE/SPATIAL (layered near composition edge, anchored to a page region, scrolls away), PERSISTENT (rare, needs a real persistent use case). Mobile: small contextual presence that scrolls away; tap OBJECT to PEEK, tap/open again to NODE. Interaction model: OBJECT to PEEK to EXPAND to CAPABILITY to ACTION to RECEIPT to RELATIONSHIP; resting state quiet. Declarative placement in SiteSpec/presentation (harvest first, do not invent schema if a primitive exists); the PING object never knows pixels. Floating UI for peek/popover/collision only, never to justify fixed resting. Runtime handles bounds, collisions, gutters, mobile, zoom, text scaling. CLS at or below 0.1, measured. Motion subtle, respect reduced-motion. Established-website strategy: FYD runtime plus declarative placements on existing sites, no rebuild required; the customer's website is the hero. Open: PortalHost renders no mount marker on homepage in any build (likely empty portalProjections/data issue); final live :3100 acceptance (scroll-away, peek containment, CLS) pending worktree triage.








## Convergence standing order (2026-09-24, Nolan)
* FYD order: G1 (ObjectFeed eligibility) -> G2 (stable entity identity + evolving observations) -> G3 (relationship drop reasons) -> capability propagation -> Ask FYD -> owner corrections -> conversational customization -> source regeneration, then a second independent business, then one external owner. Gateway promotion GO after preflight. Non-product PING cleanup frozen; UNKNOWN is PARK/HOLD constitutional. F-01 state machine for PING; harvest commodity mechanisms, own semantic truth.


## FYD 24h sprint (2026-09-24, Nolan) — closed
* Lasting locks: escalation gates only; postgres rotation already proven, do NOT re-rotate.

## FYD contracts directive (2026-09-25 ~05:50 MDT, Nolan, standing product law)
* Full text at ~/workspace/sprint-2026-09-24/FYD-CONTRACTS-DIRECTIVE-2026-09-25.md. Standing product law kept: editors/interfaces replaceable, contracts stable (OBJECTS, EVIDENCE, OWNER DECISIONS, VISIBILITY/POLICY, CAPABILITIES, TRANSITIONS, DEPENDENCIES); ONE verified public projection boundary (P0); NO PUBLIC FACTUAL ATOM WITHOUT SUPPORT; tracked Q-C-01 through Q-C-12, with Q-C-01, Q-C-09, Q-C-12 P0.

## Storage tiering (2026-09-24, Nolan)
* C: hot execution, D: warm rebuildable, E: cold evidence/archive. Classify -> move -> verify -> record -> reclaim. Standing auth for disposable regenerable caches only. Manifest at docs/STORAGE_TIER_MANIFEST.md. Never break active FYD for disk cleanliness.

## Grill-20 resolved, locked (2026-09-24 ~19:05 MDT, Nolan, CRITICAL OVERRIDE)
* Full text in the 2026-09-25 dated log. Locked rule kept: the 20-question batch was an orchestration defect; the coordinator now decides at >=80% confidence with a safe reversible default and executes. Escalate ONLY: external contact/authorization, publication/spend, irreversible or uncertain destruction, credential/account-owner action, legal/business commitment, unresolved product intent, subjective final visual judgment, P0 with no safe default.

## Instagram pipeline directive (2026-09-24 ~19:01 MDT, Nolan)
* Full directive in the 2026-09-25 dated log. Standing rule kept: AGGRESSIVE PIPELINE, CONTROLLED EFFECTS. Maximize qualification, enrichment, personalization, comment generation, evidence gathering, and unfollows between passes; actual sends stay inside the authorized cadence. Auto-scale-back triggers: auth degradation, rising UNKNOWN outcomes, duplicate-effect risk, account/provider warnings.

## TenantOS + ORCA completion order (2026-09-24 ~19:04 MDT, Nolan)
* Full order in the 2026-09-25 dated log. Kept: Nolan ordered both to COMPLETE in bounded parallel with 52-56 after the :3100 provenance fix. TenantOS complete = semantic patch map (no mass merge) -> integration branch (not main, no push) -> REVIEW-REQUIRED main-merge proposal; ORCA complete = independent audit, terminal verdict PASS/FAIL with evidence. Never delete ORCA; never create a second execution authority.

## Copilot identity pool: write-denial root cause (2026-09-25, Nolan)
* `copilot -p` on the Pig is DENIED file writes, patch/apply_patch, and shell execution by CLI permission mode (no --allow-all-tools grant; non-interactive mode auto-denies everything). Demonstrate READ/WRITE/PATCH/TEST/COMMIT before dispatching coding agents again; until then parallel review/analysis only.
* Arrow 6 exact-match fix (2026-09-25, Nolan's call): findObject exact case-insensitive title match wins, fuzzy fallback. This is the RESOLVE TARGET(query, candidates) primitive: exact, normalized exact, deterministic fallback, ambiguity. Never let AI resolve exact matches.
* Security finding (open): claims route src/app/api/fyd/claims/[resourceId]/route.ts resolveClaimViewerKind trusts the caller-controlled Host header via isPrivateHost for the owner projection; impact limited while demo-owner mode runs only on Tailscale-private :3100; fix before any public deployment with demo mode on.

## Primitive Convergence Directive (2026-09-25 ~16:43 MDT, Nolan, standing architectural law)
* Think in small orthogonal composable primitives, never agents/authorities/frameworks; migrate to none of the harvested ideas. Current product flows justify Object, Relationship, Evidence, Capability, Proposal, Approval, Effect, Receipt, Projection; anything else must earn its weight. Harvest from real work; build products from primitives, never primitives from imagination.
* #418 root cause PROVEN (configuration nondeterminism, 2026-09-25): ONE config source producing identical server/client semantics; never independently read env on both sides; regression-test server initial render state vs client hydration initial state.
* Invariants: tenant isolation is primitive (tenanos-int-tree UNSAFE/DO-NOT-MERGE, extract only isolation-preserving changes); ONE HOLD semantic (requested transition -> consequence classification -> policy -> optional human decision -> execute/deny); no WIP contradicting F-01 without an explicit semantic proposal; gateway tenant scoping through ONE Request -> Principal -> Tenant -> Capability -> Handler primitive before a second tenant.
* Approval friction derives from consequence class (READ / LOCAL_DERIVED_WRITE / OWNER_REVERSIBLE_WRITE / EXTERNAL_REVERSIBLE_EFFECT / EXTERNAL_CONSEQUENTIAL_EFFECT / SECURITY_ADMIN_EFFECT). INTENT -> AUTHORIZATION -> EXECUTION -> OUTCOME never collapse; agents are replaceable intelligence providers (AgentTask -> AgentResult), never the architecture. PRODUCT and KERNEL HARVEST lanes run separately.


## FYD compiler sprint (2026-09-25, Nolan's GO)
* FYD PRODUCT ONLY; outreach/social operations excluded. Standing law: tests green + product broken = never again. Screenshots falsify presentation claims (375/390/1440 for Coppersmith + Happy Place on every renderer change; keep before screenshots as regression evidence). Only PROVEN IN BROWSER earns product-green. Do not block on Nolan for ordinary engineering verdicts; queue only genuine human gates. Charter: ~/workspace/sprint-2026-09-24/SPRINT-CHARTER-2026-09-25.md.

## FYD framing locked (2026-09-25 ~20:01 MDT, Nolan)
* FYD is NOT a website builder. It is a compiler from messy evidence into an owner-controlled, executable digital object. Website is one renderer. Chain: EVIDENCE -> OBJECT GRAPH -> OWNER INTENT -> DECLARATIVE SPECS -> DETERMINISTIC EXECUTION -> OUTCOMES -> NEW EVIDENCE. Objects preserve optionality; intelligence makes choices, software owns mechanical truth; SiteSpec is an IR. Harvest broadly, implement narrowly.
* Third proof business = RESTAURANT (after the two-site loop closes).




## Power policy (2026-09-25 ~20:23 MDT, Nolan, binding)
* Nolan wants the Pig ALWAYS awake and ALWAYS reachable, on AC or battery; he accepts the battery cost ("IDC if it's always awake"). keep-awake.ps1 rewritten: ES_SYSTEM_REQUIRED is now held unconditionally (battery-release logic removed). This SUPERSEDES the Q4 battery policy (release on battery, allow safe sleep). Old rule no longer applies.
* Honest limit: if the battery physically dies, the machine dies anyway. Manual sleep/lid-close still work (user-initiated transitions aren't blocked by the power request).

## ORCA continuous-execution directive (2026-09-25 ~20:36 MDT, Nolan, standing)
* "Never stop" = when one useful lane closes, advance to the next highest-confidence proven work. Correct PASS/UNKNOWN/SUPERSEDED are progress. Never manufacture patches.
* ORCA = coordination (dispatch/lease/checkpoint/retry/cancel/resume), NOT truth (tenant authority, identity, capability auth, canonical events, evidence, publication policy, owner intent stay with existing authorities). Cancellation must be real (TIMEOUT_REQUESTED/WORKER_TERMINATED/EFFECT_STATUS_UNKNOWN).
* Work-stealing queue: P0 security/privacy -> live product failure -> P1 correctness -> integration/reachability -> failing invariant -> backlog defect -> doc drift -> research/harvest -> nice-to-have. One writer per semantic unit, many falsifiers. Leases on every task. Checkpoint, don't restart. Semantic retries.
* Product order: Ask FYD evidence path -> unified public projection/visibility seam -> owner correction -> conversational SiteSpec patch -> regen survival -> second observation -> one external owner.
* No scope creep: HARVEST EVERYTHING, PROMOTE ALMOST NOTHING. Stop-and-ask only: irreversible prod migration, destructive data ops, secret custody, money/spend, unauthorized public external comms, new provider perms, legally ambiguous acquisition, unclear-rollback auth changes, constitutional conflict, unknown dirty-state ownership.
* Nolan's framing: he has no live Pig shell in chat; he is the convergence/review layer from returned evidence. Coordinator + headless agents execute.


## Identity/quota containment (2026-09-25 ~20:45 MDT, Nolan's decision)
* Verdict: NO live unauthorized spend anywhere. identity_5-10 (piging87, nolangesk-droid, etc., Nolan's own OAuth logins) are UNAUTHORIZED-SPENDABLE but task_count: 0, never spent. Proven gap: broker dispatch() never consults AGENT_PROFILES (authorizes 1-4 only); broker.js:40 accepts any identity_id. Crush bypass mechanism proven but DORMANT (credential expired 2026-09-19, no runs since ~09-18).
* Nolan's decision: CONTAIN, do not promote identities 5-10 merely because the OAuth accounts belong to him. OWNERSHIP is not EXECUTION AUTHORIZATION. broker.dispatch() must fail closed unless the execution identity is explicitly registered/authorized through the canonical registry or capability seam; smallest patch, no new authority, no registry redesign; denial logged without secrets. Report: ~/workspace/sprint-2026-09-24/support/IDENTITY-QUOTA-INVESTIGATION.md. Reclassification triggers: task_count>0 on 5-10 -> incident; Crush run on refreshed cred -> BYPASS-ACTIVE.

## Privacy projection lane: HOLD (2026-09-25, Nolan)
* On HOLD until the current product proof closes; do not merge a consequential projection change into the middle of the proof. HOLD / FAIL CLOSED is acceptable for the public visibility seam; never fake public visibility.
* The Sep-25 privacy lane's claimed code (fyd/privacy-projection-p0) was never merged and its git objects are gone; integration branch must not be described as carrying privacy guarantees. Standing lesson: lane self-reports are hypotheses until a falsifier replays them. Evidence: ~/workspace/sprint-2026-09-24/orca/H1-VERIFY.md.
* Known unfixed (flagged 2026-09-25, handle after the HOLD lifts): cross-consumer visibility inconsistency — publicGraphOf() hardcodes [] decisions, composeObjectView() bypasses applyFieldVisibility; threading decisions into Ask needs a decisions store + route changes.

## Observability Mission Control (2026-09-25 ~21:00 MDT, Nolan, standing)
* Mission control is a PROJECTION over PING's existing event plane (never a new store); every claim links evidence; every number carries as-of+source; lanes without heartbeat render STALE/UNKNOWN, never green; GREEN requires a gate output or falsifier sign-off; paging follows Nolan's 7 reporting categories only. Two customers: Nolan the operator, eventually the business owner. MVP: typed event schema + emit helper, one deterministic projector to JSON, one private phone-first page, heartbeat/staleness. Design doc: ~/workspace/mission-control/OBSERVABILITY-MISSION-CONTROL.md.




## Jev/OpenRouter FYD intelligence lane (2026-09-26, Nolan's order)
* Nolan ordered: run one safe OpenRouter auth check on the existing Hermes OPENROUTER_API_KEY, then enable typesafe/jev-router for delegated FYD reasoning. This explicitly supersedes the earlier "pin typesafe/jev-1.13, never use Jev Router" constraint for this lane.
* AUTH PASS: 234 ms via GET /api/v1/auth/key. Key never printed, logged, or passed as an argument; read from C:\Users\nolan\AppData\Local\hermes\.env by the Pig-side worker only (same .env-preferred-over-env precedence as hermes_cli). Key shows ~$10.10 historical usage and no provider-side limit; lane enforces its own ceiling.
* First live call PASS: 1195 ms, router delegated to openai/gpt-6-luna, 19 tokens, reply exactly as instructed.
* Lane home: ~/workspace/fyd-intel/. LANE.md (contract), budgets.json ($5/day ceiling, 2000 default max tokens hard-max 8000, 60s timeout, max 2 attempts, retry transient 429/5xx only), jev-ask.sh (local launcher: kind blocklist + daily ceiling + spend-ledger.jsonl), jev-reason.ps1 (Pig-side worker at C:\Users\nolan\.local\share\pigi\, persistent path not Temp).
* Deterministic blocklist enforced in the launcher (hashing/schema/exact-match/URL-sanitize/authorize/project/replay/dedupe/render/batch-exec refused with zero provider call; proven with kind=hashing). All output marked proposal_only; Jev never authorizes or mutates state. FYD/PING keeps context/evidence/capabilities/tools/authority/approvals; Jev only picks the reasoning path.
* PowerShell quirk found and fixed: Get-Content -Raw result serialized by ConvertTo-Json as {"value": ...} object (OpenRouter 400 "messages.0.content: Invalid input"); forcing "$((...))" string interpolation fixes it.
* End-to-end proof 2026-09-26 16:39 MDT: kind=summarization PASS, 45 tokens, ledger line written (metadata only, prompt sha256, no key).

## Jev lane STOPPED: no live TYPESAFE_JEV mapping (2026-09-26 ~17:30 MDT, Nolan's order)
* Routing proof invalid: requested typesafe/jev-router, provider returned openai/gpt-6-luna. Nolan stopped all Jev intelligence dispatch.
* Trace: jev-ask.sh had no model/profile concept; jev-reason.ps1 hardcoded model='typesafe/jev-router' in the POST body (slug taken from Nolan's message, overriding the standing "never use Jev Router" contract without verification); no logical profile, no explicit mapping, no response.model check anywhere. The router delegated to Luna, exactly what a routing product does. Fault is our configuration, not the provider.
* Mapping hunt: Hermes model catalogs contain zero typesafe entries. Hermes cached OpenRouter catalog and the LIVE OpenRouter /v1/models catalog both list exactly one jev model: typesafe/jev-router ("TypeSafe: Jev Router"). typesafe/jev-1.13 (recorded pre-compaction from the Jev API-archaeology lane) does NOT resolve in the live catalog. No TYPESAFE_JEV logical profile exists in any config.
* Per Nolan's fail-closed order: lane STOPPED (~/workspace/fyd-intel/DISABLED, launcher refuses). No contract tests written (no authoritative expected model to test against), no further live calls, $5/day limit untouched, no router built, Luna not called again.
* Re-enable requires one of: direct TypeSafe access provisioned (credential still BLOCKED_ON_CREDENTIAL) with pin jev-1.13.0; a live pinned Typesafe model appearing on OpenRouter; or Nolan explicitly redefining the lane's model contract.

## Jev RE-ENABLED: authoritative TYPESAFE_JEV contract (2026-09-26 ~17:45 MDT, Nolan's order)
* Nolan independently verified live: typesafe/jev-1.13 EXISTS on OpenRouter (pinned Jev 1.13); typesafe/jev-router is a different routing product; ~typesafe/jev-latest is a floating alias. Official OpenAPI (openrouter.ai/docs/api/api-reference/alphadecisions) documents POST /api/alpha/decisions with {model, state, questions}; typed choice/noul/score answers; response model echoes with build suffix (typesafe/jev-1.13-20260917); provider TypeSafe; $0.042/M input, output free.
* Contract rebuilt: WORKLOAD -> LOGICAL PROFILE -> MODEL CONTRACT -> PROVIDER ADAPTER -> EXACT REQUEST -> RESPONSE ATTESTATION -> RESULT. model_contract.json is the single mapping (TYPESAFE_JEV -> typesafe/jev-1.13, openrouter, decisions mode); jev_contract.py owns resolve/build/attest; jev_ask.py launcher (profile-only CLI, no --model flag, purpose gating, budget gate); jev-decide.ps1 Pig courier (dumb POST adapter, no model strings). Callers choosing models was the real defect; that is over.
* 25/25 tests green: 17 contract (exact mapping, != router, != latest, missing/unknown/override/unexpected-model/router-fallback -> FAIL, build-suffix echo accepted) + 8 launcher (every refusal path makes zero provider calls).
* Old router worker deleted: jev-reason.ps1 removed from Pig (C:\Users\nolan\.local\share\pigi\) and locally; jev-ask.sh replaced by jev_ask.py. LANE.md rewritten.
* CANARY 2026-09-26 17:42 MDT: one live Decisions API call, harmless classification ("Is the state a fruit?", state "apple"). Requested typesafe/jev-1.13; response model typesafe/jev-1.13-20260917, provider TypeSafe, request gen-dec-1790466159-nCC5lzzurWsStZoHx5pi; typed choice {no: 0.62, yes: 0.38}, confidence 0.24; 301 ms, $0.0000133. NO Luna, NO router, NO fallback. Attestation PASS. Lane re-enabled (DISABLED removed).
* Standing product law now: Jev owns FAST BOUNDED SEMANTIC DECISIONS only (classification, policy judgment, explicit-option routing, claim/evidence verification, ambiguity triage, tool/action gating, confidence escalation). Deterministic software keeps hashing/schema/exact-match/permissions/arithmetic/state-transitions/execution/dedupe/replay. Generative intelligence keeps writing/open-ended reasoning/research/site composition/conversation. No batch Jev use until the bounded FYD decision points are defined at the product frontier.

## Pig power policy REVERSED to scoped wake locks (2026-09-26 ~18:30 MDT, Nolan's explicit reversal)
* SUPERSEDES the 2026-09-26 18:05 "never sleep on AC" order. Nolan: "DO NOT globally disable sleep as the first solution. Use scoped wake inhibition while automation that requires the machine awake is actively running." Worker lifecycle: START WORK -> acquire wake lock -> execute -> release wake lock. Retain browser lock, dead-page recovery, resume/checkpoint behavior. If the Pig is later explicitly converted into an always-on worker host, configure AC policy intentionally then; for now, SCOPED WAKE LOCK.
* Reverted 2026-09-26 ~18:31 MDT: `powercfg /change standby-timeout-ac` back to 30 min (0x708; the pre-change AC value was not recorded, Windows default restored). Note: this box's powercfg /change takes the value in MINUTES despite docs saying seconds (1800 -> 0x1a5e0 = 108000s = 30h; corrected with 30 -> 0x708). AC hibernate left at never (0x0): DC hibernate was already never (0x7fffffff) before the change, so never matches the machine's prior hibernate posture. DC sleep untouched (20 min), display untouched.

## Jev policy REVERSED to serious use (2026-09-26 ~18:05 MDT, Nolan's explicit order: "GET JEV GOING SERIOUSLY")
* SUPERSEDES the 2026-09-26 "BE VERY CONSERVATIVE WITH JEV / shadow-eval-only / Jev primarily as shadow/eval/second-opinion" policy.
* New posture: TYPESAFE_JEV (typesafe/jev-1.13 via OpenRouter Decisions API, contract 25/25 green, lane ~/workspace/fyd-intel/) moves from shadow/eval to SERIOUS primary use for its bounded remit: FAST BOUNDED SEMANTIC DECISIONS (classification, policy judgment, explicit-option routing, claim/evidence verification, ambiguity triage, tool/action gating, confidence escalation).
* Standing constraints that REMAIN: Jev never authorizes effects or mutates state (proposal/evidence only); deterministic software keeps hashing/schema/exact-match/permissions/arithmetic/state-transitions/execution/dedupe/replay; generative work (writing, open-ended reasoning, site composition, conversation) is NOT Jev's; every call goes through jev_ask.py (profile-only, purpose gating, budget gate); all output logged to the spend ledger with prompt sha256.
* Spend: $5/day lane ceiling stands until Nolan raises it. If serious use hits the ceiling, report to Nolan and ask — do not raise unilaterally.
* Next: define the bounded FYD decision points at the product frontier (RENDERED EXPERIENCE -> ASK FYD -> EVIDENCE) and route them to TYPESAFE_JEV as primary.

## Jev-serious reframed as autonomy program (2026-09-26 ~18:16 MDT, Nolan's "Jev Serious Autonomy Directive")
* "JEV" in this directive = the agent system (me + workers), not just the TYPESAFE_JEV model. The job: grill FYD/PING against the axioms and make it increasingly independent of Nolan without making it more dangerous.
* Program: (1) axioms review from actual constitutional material (7 questions per axiom), (2) 100-point improvement plan with 12 fields per item ranked by leverage*frequency*autonomy_gain*reusability/risk/complexity, (3) L0-L4 action matrix derived from actual capabilities, (4) human-bottleneck hunt ("want me to", "blocked on Nolan", etc.), (5) failure archaeology (9 gold examples -> invariants -> TEST/TRIPWIRE/TYPE/SCHEMA/POLICY/RECIPE), (6) Ask FYD product loop opened (RENDERED EXPERIENCE -> ASK FYD -> EVIDENCE) with the hard services question, (7) implement top safe/reversible items autonomously, one at a time, until genuine human judgment is required.
* The TYPESAFE_JEV model routing (previous entry) stands as an enabler: serious primary use for bounded semantic decisions (evidence support classification SUPPORTED/PARTIALLY_SUPPORTED/UNKNOWN, intent triage, action gating), which is exactly what Ask FYD needs. $5/day ceiling stands.
* Autonomy principle: MORE autonomous in thinking, MORE deterministic in execution, MORE conservative in consequential side effects. Desired-state loop: DESIRED STATE -> OBSERVATION -> DIFF -> CLASSIFICATION -> PLAN -> CAPABILITY CHECK -> RISK CLASSIFICATION -> EXECUTION OR PROPOSAL -> VERIFICATION -> EVIDENCE -> LEARNING.
* Monitor semantic invariants, not incidental implementation details (gateway argv lesson generalizes: hunt PID checks, filename checks, fixed image tags, stale pins, hardcoded digests, fixture assumptions throughout PING).
* Harvest discipline: DOES THIS REMOVE COMMODITY WORK? IMPROVE THE PRODUCT LOOP? IMPROVE AUTONOMY? PRESERVE OPTIONALITY? If no: CATALOG, do not integrate. Prefer interfaces around source acquisition, model execution, search, storage, browser automation, social providers, federation, media processing. Reward negative LOC.
* Do NOT re-litigate the WSL restart initiator unless it recurs; it is now a bounded auto-recovered fault.

## 24-hour design sprint launched (2026-09-26 ~19:00 MDT, Nolan's directive, supersedes the pipeline sprint)
* Nolan's verdict on the served surface: the problem is not ugly capability cards, it is THE WRONG PROJECTION VISIBLE. Three experiences from one state: VISITOR WEBSITE (only the business, zero debug/governance leakage), OWNER EXPERIENCE ("Customize with FYD" conversational, preview before/after then Apply/Cancel), ENGINEERING/TRUST LAB (all the digests/events/attestation/provenance behind Advanced/Trust/Developer). Separate, do not delete; no data-model fork, no second owner system, no new authority.
* Five root causes: (1) FYD renders data, it does not design (composition must follow from objects+relationships+cardinality+media richness+business type+owner intent; absent data means omit or recompose, never empty ugly components); (2) internal semantics leak into copy ("Website statement", "Why this?", E.164 dup, "Generated by FYD Social", etc.); (3) owner mode is an engineering console; (4) media does not drive composition (HPP project photography should dominate); (5) typography has no drama (real display/body/meta/button system, clamp() with valid units, tested computed styles).
* Method: HPP source archaeology (original vs FYD per design-grammar dimension), broad read-only harvest (sites + GitHub) into a design-pattern corpus with KEEP/ADAPT/REJECT, composable composition rules (not a template library), continuous generate-judge-improve loop on BOTH HPP and Coppersmith at 320/375/390/768/1440 with factual/privacy/security/determinism gates.
* Nolan's product call: Coppersmith black/gold aesthetic is NOT the failure and keeps its identity; the failure is the debug projection consuming the viewport. Do not burn hours on the gold.
* Acceptance: PING premium; HPP compositionally competitive with original; Coppersmith same intelligence but plumbing/HVAC; deterministic regeneration; no customer conditionals, no invented claims/reviews/random media. The test: "If the owner clicked Generate once and saw this, would we be proud?" Deliverable is the three URLs + screenshots + five biggest improvements, not a report.
* Sprint state: ~/workspace/design-sprint-2026-09-26/BRIEF.md + SCOREBOARD.md. SIDE-01 and ASK-LOOP closed (worktrees persist). Earlier 10-step phone journey superseded; Nolan judges at the end via URLs.

## ORCA + Mission Control convergence track launched (2026-09-26 ~19:10 MDT, parallel to design sprint)
* Purpose: make existing agents/pipelines/harvesters/falsifiers/build lanes operable through one PING control plane. Mission Control = control plane, Orca = intelligence/coordination, Mission Runtime = durable work, Execution Authority = execution, Capability Authority = what may happen, Event Runtime = history, Object graph = knowledge, FYD = product. No god service; Orca reduced to the missing coordination layer.
* Order: read-only inventory first (KEEP/WIRE/MERGE/RETIRE/DEAD/UNKNOWN), harvest patterns (LangGraph/OpenHands/Temporal as patterns not replacements), wire don't rewrite, dogfood real FYD missions (HPP then Coppersmith, mixed deterministic/agent executors, typed outcomes incl. UNKNOWN, idempotency, safe resume), bounded parallelism, minimum MC UI last.
* Forbidden: new authorities (OrcaAuthority etc.), new truth store; prove insufficiency with a failing dogfood mission first. Agent profiles + deterministic context compiler are the highest-leverage Orca features. MCP is an adapter, not core.
* Track state: ~/workspace/orca-mc-convergence/BRIEF.md + SCOREBOARD.md. Must not interrupt the design sprint; succeeds by helping it.
