# Marketing OS: Systems Knowledge Base

Built 2026-09-29. Purpose: Nolan's marketing OS must know PING, FYD, TenantOS, Orca, and HPP cold, so content can communicate, teach, and entertain humans.

Reading rule: every factual claim carries an evidence tag.
- VERIFIED: seen in docs or code on this machine (source named).
- INFERRED: reasonable reading of the material, not directly stated.
- UNKNOWN: the material does not settle it.

Standing brand laws apply to everything derived from this file: no em dashes, humor native to PING (never bolted on), practical business outcomes over AI hype, the exact PING pig mascot only, Nolan approves every post before it publishes.

## 2026-09-30 technical audience strategy (Nolan, standing)

The previous "narrowest niche" reading of the analytics is withdrawn. This file now serves a chosen technical audience, not a historically observed one. See EXPERIMENT-PLAN.md for the discovery program and NICHE-ANALYSIS.md for the frozen baseline.

- **Intended audience:** senior/staff/principal engineers, AI infrastructure engineers, agent and runtime engineers, founders building AI systems, technical operators, systems engineers, developers interested in reliability, distributed systems, event sourcing, orchestration, deterministic systems, local AI, evidence-backed AI.
- **Technical position:** "BUILDING AI SYSTEMS THAT CAN PROVE WHAT THEY DID." Never empty branding: every technical post needs a demonstrable engineering consequence, accurate terminology, visible evidence, and bounded claims.
- **The trust law:** "PING does not win technical trust by sounding advanced. It wins by making advanced claims falsifiable." Assume a senior engineer is watching.
- **Claim discipline:** VERIFIED / INFERRED / UNKNOWN stays internal on every post and is occasionally exposed publicly (e.g. VERIFIED: events survive restart. NOT VERIFIED: worker recovery after a mid-effect crash). Never use deterministic, distributed, constitutional, event-sourced, fault-tolerant, exactly-once, autonomous, self-improving, or production-ready unless implementation evidence supports the term.
- **Three-depth ladder:** L1 engineering intuition (15-30s), L2 architecture (30-60s), L3 deep technical (60s+, carousel, article, GitHub-linked).
- **External systems lens:** Jev, Typesafe, and any future external system are covered only through PING's engineering lens: what mechanism is interesting, what invariant it affects, what PING would harvest, what PING would reject, where authority lives, what failure mode appears, can the claim be reproduced. Never AI news.
- **The commercial pillar survives:** the FYD and home-services story ("The $400 missed call") is one content pillar, not the identity.

## 0. Reading rule for external systems

External systems get the same evidence tags (VERIFIED / INFERRED / UNKNOWN), with one extra rule: primary sources first. Official docs, source repo, papers, maintainer statements outrank all marketing prose. A live API call beats documentation. Both beat assertion.

---

## 1. PING (the platform)

**What it is.** PING is an evolving intelligence system. Its stated purpose: turn information into reliable understanding, understanding into useful action, and action into evidence that can be trusted and replayed. (VERIFIED: SOUL.md) It is the substrate everything else runs on: the canonical knowledge authority, the event spine, the mission and worker machinery, and the observability layer.

**What painful problem it solves.** AI tools and agents lose track of truth. They hallucinate, they silently drop failures, they cannot explain why they did something, and every new framework becomes a new competing source of truth. Businesses that depend on AI end up with confident-sounding systems nobody can audit. PING's answer: a system where every claim carries its evidence, every action carries its authorization, and every important behavior can be replayed and explained after the fact. (VERIFIED: SOUL.md principles 9-13; INFERRED: the business framing)

**Who it serves.** Today: Nolan, as the single exploratory tenant proving the loop. (VERIFIED: FYD-TEN-DAY-PRODUCT-DIRECTIVE.md amendment 2026-09-29) Eventually: home service businesses, through FYD, as tenants with their own evidence-grounded marketers.

**How it works (high level).** Sources (GitHub, web, internal) produce observations, which become evidence, which build business and product knowledge, which gets packaged into a context pack. That knowledge drives missions: a mission gets decided, authorized, assigned to an eligible worker, executed, independently verified, and the outcome feeds learning. Mission Control is the operating surface that truthfully shows the state of that chain. (VERIFIED: PING-MVP-FINISH.md, the MVP chain)

**What is genuinely novel vs commodity.**
- Novel: the constitutional authority model. Every important concern has exactly one owner; declared authority must match actual capability ownership (comments do not establish sovereignty, enforcement does). Truth has layers (source truth, derived truth, presented truth, evidence) that must never silently collapse into each other. Determinism is treated as a product feature, not an implementation detail. Failures have typed semantics; an empty answer is never allowed to hide an infrastructure failure. (VERIFIED: SOUL.md principles 6, 8, 9, 10, 11)
- Commodity: Postgres-backed event storage, vector retrieval, worker processes, dashboards. The docs explicitly say to harvest commodities, not invent them. (VERIFIED: FYD-TEN-DAY-PRODUCT-DIRECTIVE.md ecosystem notes)

**What is still unproven or in progress.** The MVP loop is not closed. The 2026-09-29 directive lists days of unfinished backlog (Mission Control, TenantOS, Orca, Jev, GitHub ingestion, knowledge pipelines, workers, reconciliation, learning) as pieces of one unfinished backend, with a standing hypothesis that the work is convergence plus wiring plus falsification, not invention. 71 stranded worktrees were counted as convergence debt. DONE is defined as converged plus integrated plus reached plus verified plus observable, and most work is not there yet. (VERIFIED: PING-MVP-FINISH.md)

**Content angles (true things a video or post could teach):**
1. "Your AI has no memory of why it did that. Ours does." Teach the evidence layer: every claim carries its source. Demo: ask a question, show the receipts.
2. "We found 71 forgotten versions of our own system." The stranded-worktree story is honest, funny, and human. It teaches convergence: search before you build.
3. "An empty answer is not the same as no answer." Teach the failure-is-information principle with a concrete example (vector retrieval degraded vs nothing exists).
4. "One owner per truth." Explain constitutional authority with a household analogy: one person owns the checkbook, and saying so out loud is what makes it true.
5. "Done means a stranger can see it working." Teach the reached-vertex definition of done vs the activity theater most teams report.

---

## 2. FYD

**What it is.** FYD is the product. The ten-day directive states it plainly: FYD is not building AI that does marketing. FYD is building a business object system that can safely market itself. Every tenant gets an evidence-grounded autonomous marketer that understands the business, maintains its presence, proposes and executes bounded marketing work, learns from verified outcomes, and can expand onto new channels without changing FYD's canonical model. (VERIFIED: FYD-TEN-DAY-PRODUCT-DIRECTIVE.md)

**What painful problem it solves.** Small home service businesses cannot afford real marketing help. Agencies sell hype and vanity metrics. AI copywriters produce confident prose nobody can verify. The owner can never answer: what did you do, why, what evidence did you use, who authorized it, what happened, what did you learn. FYD's marketer must answer all six, from evidence, every time. (VERIFIED: directive, two-tenant proof questions)

**Who it serves.** Home service businesses in Nolan's corridor (Mesa County plus Delta, Montrose, Rifle, Carbondale). PING Social itself is the first exploratory tenant, the business proving the loop before any customer touches it. (VERIFIED: directive amendment; MEMORY.md market definition)

**How it works (high level).** Public and authorized sources become observations, then evidence, then an object graph of the business, then owner corrections on top of that graph (owner intent beats a fresh crawl, always). That tenant truth compiles into products: today a website (SiteSpec) and Ask FYD; next a campaign spec. The pipeline: SOURCE, ACQUIRE, OBSERVE, EVIDENCE, OBJECT GRAPH, SITE SPEC, RENDER, ASK FYD, PROPOSAL, APPROVAL, REGENERATION. The marketer is durable product state (objectives, policy, budget, capabilities, campaigns, learning), not a model session; interchangeable workers execute bounded tasks when triggers fire. (VERIFIED: directive, architecture section)

**What is genuinely novel vs commodity.**
- Novel: the object graph as the intermediate representation of a business. One tenant truth compiles into a website, a concierge, a campaign, a social presence. Owner correction surviving regeneration is the P0 proof: correct X to Y, re-crawl, still Y. Action policy returns ALLOW, NEEDS_OWNER, or DENY bound to tenant, actor, capability, argument digest, expiry, and budget. UNKNOWN is a first-class effect state: a timed-out call is never blindly retried. (VERIFIED: directive)
- Commodity: crawling, rendering, scheduling, channel adapters. The directive explicitly says to harvest Crawl4AI-style machinery and OpenTelemetry conventions rather than invent them. (VERIFIED: directive ecosystem notes)

**What is still unproven or in progress.** As of 2026-09-29 the correction-survival arrow was the P0 proof in progress (two arrows green per the Ledger 04 correction). The two-tenant proof was cut to a single exploratory tenant (PING). The autonomous marketer is a directive, not a running system. Ask FYD must refuse unsupported claims. Long-form continuity at 60,000 characters is unproven (the voice work is separate). (VERIFIED: CEO-ORDER-LEDGER04-CORRECTION.md per MEMORY.md; directive amendment)

**Content angles:**
1. "Your website should be a printout of what your business knows." Teach the object-graph-compiler idea: the site is one projection of one truth, not a separate thing to maintain.
2. "The customer is always right, even when the internet disagrees." Teach owner-correction precedence: you correct a fact once, and no re-crawl ever overwrites you. Every small business owner has lived the opposite.
3. "My marketer has to show its work." Teach the six questions (what, why, evidence, who authorized, what happened, what learned) as the anti-agency pitch.
4. "ALLOW, NEEDS YOU, DENY." Teach the autonomy gradient: the system earns autonomy by consequence, and spending your money always asks first.
5. "One truth, many shapes." Show the same business truth becoming a website section, an answer, and a post. Optionality as the moat, explained in 30 seconds.

---

## 3. TenantOS

**What it is.** TenantOS is the constitutional operating layer above interchangeable intelligence and execution runtimes. The order's one-liner: the runtime is a hand; TenantOS owns authority. It is not an agent framework. It is an operating contract for many runtimes: Codex, Claude, Hermes, native code, Python workers, local models, remote workers, MCP tools, future runtimes, with none of them becoming canonical truth. (VERIFIED: TENANTOS-HARVEST-ORDER.md)

**What painful problem it solves.** Every new model, agent framework, or runtime becomes a new place where truth, authorization, and memory secretly live. Agents quietly rewrite their own constitution, inherit schemas they never agreed to, and bypass the authorities they were given. TenantOS exists so Nolan can swap the hand without transplanting the brain: change models without changing authority, add local inference without changing evidence, add runtimes without moving owner decisions. (VERIFIED: harvest order, optionality section)

**Who it serves.** The PING/FYD engineering substrate first: it is how PING stays coherent while execution moves across machines (the Pig, Oracle, Cloudflare, local). Eventually, any tenant workload that needs many hands and one authority.

**How it works (high level).** Existing authorities own their concerns: Identity, Tenant/Namespace, Event, Mission, Capability, Approval, Execution, Evidence, Outcome, Projection. An execution router maps work onto a registry of runtimes through adapters. Every effect returns a receipt; receipts become evidence; evidence becomes outcomes; outcomes become learning candidates that can never silently become policy. External runtimes may own their process and session; they must never own tenant identity, authorization truth, or outcome truth. (VERIFIED: harvest order, harvests 1-3)

**What is genuinely novel vs commodity.**
- Novel: the harvest discipline itself. Sixteen agent frameworks were studied as a parts bin; the order forbids importing any of them and demands mechanisms be mapped onto existing authorities first. The model-proposes/deterministic-kernel-authorizes rule (an LLM never decides whether its own effect is authorized). Skills as procedural knowledge that is explicitly not truth, not preference, not authorization. The owner inbox pattern: show the human only what needs a decision, with what happens if they do nothing. (VERIFIED: harvest order)
- Commodity: leases, checkpoints, retries, dead-letter queues, circuit breakers, preflight checks. Harvest their testable invariants; do not rebuild them. (VERIFIED: harvests 4, 12)

**What is still unproven or in progress.** The order explicitly says do not start coding yet: the first step is a forensic matrix of what TenantOS already has (mechanism, existing implementation, callers, tests, gap, action). The event-authority question (who owns create, canonicalize, id, hash, append, sequence, commit, stream, replay) is open; if three partial owners exist they must converge, not become four. TenantOS is a binding program with strong laws, not a shipped layer. (VERIFIED: harvest order)

**Content angles:**
1. "We studied 16 AI frameworks and imported zero." The harvest-not-import story is a genuinely unusual engineering value, and it is funny. It teaches: mechanisms over frameworks.
2. "The AI suggests. The machine decides." Teach model-proposes/kernel-authorizes with a concrete example: the model can never approve its own spending.
3. "Your to-do list should only contain decisions." Teach the owner-inbox pattern: every item says what happened, why you are needed, and what happens if you ignore it.
4. "Swap the brain, keep the conscience." Explain runtime optionality: the model is a hand, authority is the skeleton. One changes, the other does not.
5. "A skill is a recipe, not a law." Teach the boundary between procedural knowledge and truth. Short, punchy, quotable.

---

## 4. Orca

**What it is.** Orca is the execution and coordination fabric: the machinery that takes a mission and walks it to a verified outcome. The reached chain: MISSION, QUESTIONS, DECISION UNITS, EVIDENCE, PROCESSOR, AUTHORITY, CAPABILITY, WORKER, ATTEMPT, ARTIFACT, VERIFICATION, OUTCOME. Its standing definition: ORCA is coordination (dispatch, lease, checkpoint, retry, cancel, resume), NOT truth. (VERIFIED: PING-MVP-FINISH.md; MEMORY.md 2026-09-25 directive)

**What painful problem it solves.** Dispatched work disappears into the void. A call times out and nobody knows whether the effect happened, so systems either retry blindly (double-charging the customer, double-posting) or give up silently. Orca's core law: UNKNOWN EFFECT goes to HOLD, then reconcile, never blind redispatch. A lease expiring does not prove an effect did not happen. (VERIFIED: PING-MVP-FINISH.md finish order 8)

**Who it serves.** PING's backend: every mission, every worker attempt, every external effect flows through it. For content purposes, it is the reason PING can promise "we will never double-post, double-charge, or lose your work."

**How it works (high level).** The live path (verified in the running gateway, 2026-09-13 audit): the Postgres-backed event spine feeds an event-to-mission bridge (28 event types), the MissionRuntime holds missions, the scheduler polls, and the WorkerRuntime dispatches each event to the registered canonical worker by exact event-type match. Workers emit the next event; the chain continues to a terminal state. Every attempt carries identity, tenant binding, capability binding, and a receipt. (VERIFIED: orca-omniroute-audit-2026-09-13.md sections 2, 5, 6)

**What is genuinely novel vs commodity.**
- Novel: UNKNOWN as a first-class state with a real recovery protocol (kill the worker after output, lose the receipt after the effect, expire the lease mid-work: each has a defined reconcile path). Deterministic worker selection. Cancellation that is real (TIMEOUT_REQUESTED, WORKER_TERMINATED, EFFECT_STATUS_UNKNOWN), not decorative. (VERIFIED: audit; MEMORY.md continuous-execution directive)
- Commodity: queues, schedulers, registries. The audit shows the live spine is deliberately boring machinery.

**What is still unproven or in progress.** There are two Orcas and only one runs. The idealized ORCA ExecutionEngine (14 modules: engine, scheduler, consensus, worker ports, capability registry) is initialized at gateway boot but orphaned by explicit decision: its only worker port has a null executor, dispatch never calls execute, and it emits events on a private queue nothing consumes. The live business path is the PING spine described above. The first broken reached edge was EVIDENCE to PROCESSOR: the worker received a lossy context-pack assembly and truthfully reported an incomplete chain. The HOLD/UNKNOWN/recovery behavior is specified but not yet reached behavior. (VERIFIED: audit sections 2, 7, 8; PING-MVP-FINISH.md)

**Content angles:**
1. "Timeout does not mean failure. It means we don't know." Teach UNKNOWN as a first-class state with the double-charge example. Every business owner who has been double-billed by software feels this.
2. "We have two engines and only one of them works, and we admit it." Radical honesty about the orphaned engine vs the live spine. Trust-building content.
3. "A lease expiring is not proof." Teach the reconciliation mindset in 30 seconds: the difference between guessing and knowing.
4. "The most boring code is the most important code." Show the live dispatch path: event in, exact match, worker, next event. Reliability as a feature.
5. "Cancel has to be real." The story of fake cancellation vs TIMEOUT_REQUESTED/WORKER_TERMINATED. Short, technical, satisfying.

---

## 5. HPP (Happy Place)

**What it is.** Happy Place Carpentry LLC, a real carpentry business in Adair Village, Oregon, serving Benton, Linn, Marion, and Polk counties. Tagline: "Building your happy place, one project at a time." Services: decks, fences, painting, repairs, restoration, drywall. License CCB# 254240. Phone 541-286-5190. (VERIFIED: ~/workspace/fyd-build/work/hpp-happy-place-graph-data.md, sourced from the repo at /mnt/c/Users/nolan/CascadeProjects/happy-place-platform)

**What painful problem it solves (as a business).** Homeowners need a carpenter who builds it right, explains it clearly, and stands behind the work. Its site copy is specific and trade-credible: "A fence should stay straight, the gate should close without dragging, and it should still look good after a few Oregon winters." (VERIFIED: graph data doc, services section)

**Who it serves.** Homeowners in Oregon's Mid-Willamette Valley. In Nolan's world it serves a second audience: it is his portfolio proof asset for website-revamp pitches (https://happy-place-platform.vercel.app/), and it is FYD's regression and adversarial fixture. (VERIFIED: MEMORY.md website revamp angle; PING-MVP-FINISH.md)

**How it works (as FYD material).** HPP is the canonical worked example of the FYD pipeline on a real business. Its repo was archaeologically inventoried into an object graph: one identity object, 6 live services (7 archived as retired evidence), projects with estimate ranges and warranties, proof claims explicitly labeled as self-claimed rather than independently verified, and a conflict/unknown ledger (C1-C12, U1-U10) recording every ambiguity instead of smoothing it over. Defect work happens only in the parallel design-sprint clone; the original repo and live site are never touched. (VERIFIED: graph data doc; MEMORY.md HPP boundary)

**What is genuinely novel vs commodity.** The novelty is not the business; it is what was extracted from it. The graph preserves retired offerings as evidence instead of deleting them. Proof claims carry their verification status. Conflicts between sources are recorded with precedence decisions, not silently resolved. It is a demonstration that a business can be represented as evidence with provenance, not as marketing copy. (VERIFIED: graph data doc; INFERRED: the content framing)

**What is still unproven or in progress.** Whether the project history is full real history or seed data is UNKNOWN (U2). The live website URL is unverified (U9). The brand name has a real conflict: the repo canonically says "Happy Place Carpentry" while "Happy Place Productions" appears nowhere in the repo; the owner must confirm before public surfaces mint it. The :3200 design-sprint clone is where visual-credibility work happens; Nolan's standing verdict is that the rendered page still reads as an engineering harness, not a customer website. (VERIFIED: graph data doc; MEMORY.md)

**Content angles:**
1. "We took a real carpentry business and turned it into evidence." Show the object graph: services, projects, warranties, each with a source. Teach what evidence-backed means.
2. "Retired services don't get deleted. They get archived." The 7 archived offerings as a story about honest business history. Surprising and principled.
3. "Self-claimed is a label, not an insult." Teach proof-claim labeling: 125+ projects, claimed by the business, not independently verified, and saying so is the trust move.
4. "A fence should stay straight." Just read their service copy over B-roll. It is already great writing; the content is curation, not invention.
5. "We never touch the original." The parallel-clone discipline as a craft story: the live site is sacred, experiments happen in the sandbox.

---

## 6. Jev / TypeSafe (external system, PING's lens)

**What it is.** TypeSafe is an AI API provider (api.typesafe.ai). Jev is its fast typed decision-plane model. PING uses Jev as a shadow sensor for fast typed classification, policy judgment, explicit-option routing, claim/evidence verification, ambiguity triage, tool/action gating, and confidence escalation. Standing posture: Jev is a shadow sensor, NEVER an authority. (VERIFIED: MEMORY.md Jev posture entries; VERIFIED live 2026-09-30: POST /v1/systemone returns HTTP 200 with typed answers)

**The live contract (verified 2026-09-30 via ~/workspace/skills/typesafe/bin/ts-smoke.py).** `POST /v1/systemone` takes a model (e.g. `jev-latest`), a `state` object (arbitrary JSON context), and `questions` keyed by name, each with a `type` and `instructions`. It returns HTTP 200 with typed answers under `answers`. The `noul` question type returns a numeric 0-1 score: a live smoke question ("Is this a smoke test?") returned `{"noul": 0.97, "confidence": null}`. `GET /v1/models` returns HTTP 200 with an empty model list under current parsing. UNKNOWN: cost per call, latency guarantees, rate limits, what attestation cryptographically proves.

**What painful problem it solves.** LLM outputs are prose you have to parse. A routing or triage decision buried in a paragraph cannot be gated, thresholded, or audited without a second model to interpret the first. A typed answer is a contract: state in, typed answer out, threshold decides. The engineering question is not "look at this cool model." It is: where do you put fast typed judgment in an agent system without letting the model approve its own side effect.

**PING's harvest/reject line.** Harvest: typed decision outputs as triage input, the attested-answer pattern (typed answer plus attestation rather than raw model text). Reject: any authority claim. Nothing Jev returns decides whether an effect is authorized; the kernel decides. Tenant identity never goes to the provider. Jev stays a sensor, never an authority, and responses carry hashes in canonical records.

**What is still unproven.** The public eval framework (decomposing evaluation into yes/no, choice, score questions) and the agent-trace eval pattern are reported in memory but not reverified against primary sources; treat as INFERRED until checked. Performance claims are hypotheses.

**Content angles (true things a video or post could teach):**
1. "What if an AI API had to return a type instead of vibes?" The hook that started the experiment. Show the actual call: state in, `noul: 0.97` out. Then the threshold: gate an action on a number, not a paragraph.
2. "A sensor is not an authority." Teach the boundary: fast typed judgment feeds triage, and nothing about it authorizes an effect. The strongest version of this post names the exact point where Jev's output stops and the kernel's decision starts.
3. "Show the type contract." 30 seconds of screen: the request shape, the typed response, the failure case. An excellent systems conference talk compressed into 30 seconds.
4. "VERIFIED: typed answers return. NOT VERIFIED: everything else." The public falsifiability format: say what the live call proved and name the unknowns out loud. Trust through bounded claims.

## Cross-system content principles

- Every system has the same moral: truth you can check beats confidence you cannot. That is the PING brand position in one sentence.
- The honest-unfinished status of PING, TenantOS, and Orca is a feature for content, not a liability. "Building in public" is the highest-trust format in 2026.
- HPP is the only system with a human face (a carpenter, a fence, Oregon rain). When an abstract idea needs a body, put it in HPP.
- Never claim a capability the docs mark unproven. The evidence tags above are the guardrail: VERIFIED can be asserted, INFERRED must be framed as reading, UNKNOWN must be said out loud.
- The audience is chosen, not inherited. Everything above now serves the technical audience in the 2026-09-30 strategy block: content is tagged TOPIC, DEPTH, FORMAT, HOOK TYPE, SYSTEM, AUDIENCE, CLAIM TYPE, and the next 30 technical posts are a discovery period. See EXPERIMENT-PLAN.md.
- The commercial FYD/home-services story is a pillar, not the identity. HPP keeps its human face for that pillar; the technical pillars speak to engineers.
