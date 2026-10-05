# Content Review Queue - 2026-10-05

One-by-one review of all 61 NEEDS-APPROVAL briefs. PUBLISHING IS FROZEN: review only, nothing posted, nothing promoted to canonical/public.

Queue order: A-series -> B-series -> D-episodes -> F-hooks, numeric within series.

## A-SERIES (13 briefs)

### 1. A1 — Jev/Typesafe, "a type instead of vibes"
- Summary: TypeSafe's SystemOne answered a live smoke question with a typed number, noul 0.97, instead of prose. That typed contract is what an agent routing call should look like: state in, typed answer out, threshold decides. PING uses Jev only as a shadow sensor for fast triage, never as an authority, because no model output decides whether its own side effect is authorized.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: agent and runtime engineers | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 2. A2 — An AI agent should never be allowed to approve its own side effect
- Summary: The model suggests, the machine decides. No model output ever flips its own effect to authorized. This is the authorization boundary at the heart of TenantOS: fast typed judgment from a model feeds triage, while the deterministic kernel holds the sole authority to approve effects.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: agent engineers | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 3. A3 — We accidentally built three event authorities
- Summary: We accidentally built three event authorities. The forensic found the real one by asking who owns create, canonicalize, id, hash, append, sequence, commit, stream, and replay, and converging the three partial owners into one enforced owner. One authority must be enforced, not declared: comments do not establish sovereignty. NOTE: the forensic must be re-verified against current code before the script ships, per the plan.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: systems engineers | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 4. A4 — Timeout does not mean failure. It means we don't know.
- Summary: A timed-out call is an UNKNOWN effect, not a failure. Blind retry double-charges the customer; giving up silently loses the work. Orca's law: UNKNOWN goes to HOLD, then reconcile, never blind redispatch. The piece must label honestly that HOLD and recovery behavior is specified but not yet reached behavior.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: backend engineers | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 5. A5 — The $400 missed call, part 2
- Summary: Dave's missed-call math returns: 3 missed calls a week at $400 each is $62,400 a year walking to whoever picks up first. This keeps the commercial pillar alive while the technical program runs. It is one pillar, not the identity.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: home-service owners | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 6. A6 — We studied 16 agent frameworks and imported zero
- Summary: Sixteen agent frameworks were studied as a parts bin, and zero were imported. The harvest discipline maps mechanisms onto existing authorities instead: leases, checkpoints, retries, circuit breakers are harvested as testable invariants, not rebuilt. The script must name one real harvested mechanism and the authority boundary it respects, or it does not ship.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: agent engineers | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 7. A7 — SHOW THE RECEIPTS
- Summary: SHOW THE RECEIPTS is a recurring franchise: one claim, then the evidence on screen. Every installment makes exactly one falsifiable claim, shows the primary evidence (terminal output, code, traces, event rows, tests), names what was verified and what was not, and never asserts without the receipt visible.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: agent and runtime engineers | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 8. A8 — ONE AUTHORITY
- Summary: ONE AUTHORITY is a recurring franchise: one owner per truth, enforced not declared. Each installment takes one contested concern, shows the competing claims, and demonstrates the single enforced owner. The rule comes from PING's constitutional layer: declared authority must match actual capability ownership, and comments do not establish sovereignty.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: systems engineers | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 9. A9 — WE WERE WRONG
- Summary: WE WERE WRONG is a recurring franchise: the falsification format. Structure: 0-3s falsified assumption, 3-10s assumed architecture, 10-20s contradicting evidence, 20-30s actual architecture, 30-35s resulting engineering principle. Never manufacture mistakes or drama. Each installment is drawn from a real falsification, like the L6 directive's documented list.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: systems engineers | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 10. A10 — FAILURE IS A STATE
- Summary: FAILURE IS A STATE is a recurring franchise: UNKNOWN effects, HOLD, reconcile, never blind retry. Each installment takes one failure mode where systems silently drop, double-execute, or mislabel what happened, shows the typed semantics Orca assigns it, and names the reconcile path. Failure must have typed, deterministic semantics; an empty answer never hides an infrastructure failure.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: backend engineers | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 11. A11 — BUILDING PING
- Summary: BUILDING PING is a recurring franchise: honest build-in-public status. Each installment reports the true state of the work with the L6 grammar: PROVEN, MEASURED, EXPERIMENTAL, PARTIAL, PLANNED, UNKNOWN, FALSIFIED. Aspirational architecture is labeled TARGET; current state is labeled CURRENT. The goal is that a senior engineer finishes thinking these people have actually run this system and can show the evidence.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: agent and runtime engineers | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 12. A12 — MECHANISMS NOT FRAMEWORKS
- Summary: MECHANISMS, NOT FRAMEWORKS is a recurring franchise: what we harvested, what we rejected, and the boundary. Each installment names one concrete mechanism harvested from an external system, the authority boundary it respects inside PING, and what was rejected and why. The rule is fixed: the installment names a real mechanism or it does not ship.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: agent engineers | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 13. A13 — ONE BRAIN MANY HANDS
- Summary: ONE BRAIN, MANY HANDS is a recurring franchise: runtime optionality with authority staying put. Each installment demonstrates a hand being swapped while the brain's authority, identity, and evidence semantics remain untouched. The standing seam doctrine: every seam must buy replaceability, and external execution state is evidence, never PING truth.
- Study item: ~/workspace/marketing-os/EXPERIMENT-PLAN.md
- Audience: agent and runtime engineers | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

## B-SERIES (29 briefs)

### 1. B1 — Your AI has no memory of why it did that. Ours does.
- Summary: Most AI tools give you confident answers with no paper trail, so when they are wrong nobody can find out why. PING is built the other way: every claim carries its source, every action carries its authorization, and important behavior can be replayed and explained after the fact. The demo version of this post is simple: ask a question, then show the evidence underneath the answer.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 2. B2 — We found 71 forgotten versions of our own system.
- Summary: During the MVP audit we counted 71 stranded worktrees, parallel versions of PING work that nobody had converged. Instead of hiding it, it became a standing law: search the whole repo before you build, because a narrow search produces false confidence that your new thing is new. It is an honest, funny, human story that teaches convergence over invention.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 3. B3 — An empty answer is not the same as no answer.
- Summary: A core PING principle: failure is information. When a retrieval call degrades, the system must say so; it may never return an empty result that quietly means the infrastructure broke. Concretely, vector retrieval that degraded is a different state from a query that genuinely matched nothing, and the two must never look identical to the caller. This post teaches the idea with that one concrete example.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 4. B4 — One owner per truth.
- Summary: PING's authority model says every important concern has exactly one owner, and the rule that makes it real is that declared authority must match actual capability ownership. Comments do not establish authority, interfaces do not, enforcement does. The teachable version is a household analogy: one person owns the checkbook, and saying so out loud, with the power to back it up, is what makes it true.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 5. B5 — Done means a stranger can see it working.
- Summary: In PING, DONE means converged plus integrated plus reached plus verified plus observable. The reached vertex is the test most teams skip: real external evidence that the work actually functions, not activity theater in a status report. This post contrasts that bar with how most teams report progress, and invites the audience to apply it to their own backlog.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 6. B6 — Your website should be a printout of what your business knows.
- Summary: FYD represents a business as an object graph: one tenant truth that compiles into a website, a concierge, a campaign, a social presence. The site is one projection of that truth, so it never drifts out of sync with what the business actually knows. This post teaches the object-graph-as-compiler idea in under a minute.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 7. B7 — The customer is always right, even when the internet disagrees.
- Summary: Every small business owner has lived this: you fix your hours somewhere and a fresh data pull resets them to the old wrong value. FYD gives owner corrections precedence over re-crawls, always. Correct X to Y, the system re-crawls, it stays Y. This was the P0 proof the directive demanded, and it is a pitch every owner instantly understands.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 8. B8 — My marketer has to show its work.
- Summary: Agencies sell hype and vanity metrics, and AI copywriters sell confident prose nobody can verify. FYD's marketer must answer six questions from evidence: what did you do, why, what evidence did you use, who authorized it, what happened, what did you learn. This post is the anti-agency pitch in plain language, aimed at owners who have been burned by marketing reports full of vibes.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 9. B9 — ALLOW, NEEDS YOU, DENY.
- Summary: FYD's action policy returns ALLOW, NEEDS_OWNER, or DENY, bound to tenant, actor, capability, argument digest, expiry, and budget. The system earns autonomy by consequence: routine work flows, and anything that spends your money or carries real risk comes to you first. This post teaches the autonomy gradient in one compact explanation.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 10. B10 — One truth, many shapes.
- Summary: The FYD object graph is one tenant truth, and from it the system compiles a website section, a concierge answer, and a social post, each faithful to the same underlying facts. That optionality is the moat: new channels arrive without changing the canonical model. This post shows the same fact wearing three shapes in about 30 seconds.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 11. B11 — We studied 16 AI frameworks and imported zero.
- Summary: TenantOS started with a forensic pass over sixteen agent frameworks, treating each as a parts bin. The harvest order forbids importing any of them: mechanisms get mapped onto existing authorities first, frameworks never become new sources of truth. It is a genuinely unusual engineering value, and funny enough to travel: mechanisms over frameworks.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 12. B12 — The AI suggests. The machine decides.
- Summary: TenantOS separates proposing from authorizing: the model proposes, and a separate kernel layer decides whether the effect is authorized. The concrete example: the model can never approve its own spending or its own side effect, because authorization belongs to the authority layer, not the runtime. This is the post that names the exact boundary where model output stops and permission starts.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 13. B13 — Your to-do list should only contain decisions.
- Summary: TenantOS uses an owner inbox pattern: the human sees only what genuinely needs a decision, and each item says what happened, why the owner is needed, and what happens if they do nothing. Nothing in the inbox is a task the machine could have handled. This post teaches the pattern as a design idea any builder can steal.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 14. B14 — Swap the brain, keep the conscience.
- Summary: TenantOS is the operating layer above interchangeable runtimes: Codex, Claude, local models, remote workers, MCP tools. The model is a hand; authority is the skeleton. Change models without changing authority, add local inference without changing evidence, add runtimes without moving owner decisions. This post explains runtime optionality without inventing any new model claims.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 15. B15 — A skill is a recipe, not a law.
- Summary: In TenantOS, skills are procedural knowledge: how to do a task. They are explicitly not truth, not preference, and not authorization, and no skill gets to rewrite the constitution it was given. Short, punchy, and quotable: a boundary every agent builder should draw.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 16. B16 — Timeout does not mean failure. It means we don't know.
- Summary: When a dispatched call times out, nobody knows whether the effect happened, so most systems either retry blindly or give up silently. Orca's core law: UNKNOWN EFFECT goes to HOLD, then reconcile, never blind redispatch. The example every business owner feels: being double-charged by software that retried a payment it could not see.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 17. B17 — We have two engines and only one of them works, and we admit it.
- Summary: The idealized ORCA ExecutionEngine (fourteen modules) is initialized at gateway boot but orphaned by explicit decision: its only worker port has a null executor, dispatch never calls execute, and it emits events on a private queue nothing consumes. The live business path is the PING event spine. Admitting this publicly is trust-building content: building in public means naming the parts that are not finished yet. This post walks the difference between the two, in the falsifiable format.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 18. B18 — A lease expiring is not proof.
- Summary: A lease is a coordination mechanism, not an observation of reality. When a lease expires mid-work, Orca treats the effect as UNKNOWN and sends it through the reconcile path: kill the worker after output, lose the receipt after the effect, expire the lease mid-work, each with a defined recovery. This post teaches the reconciliation mindset in 30 seconds: the difference between guessing and knowing.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 19. B19 — The most boring code is the most important code.
- Summary: The live Orca path is unglamorous on purpose: an event arrives on the Postgres-backed spine, crosses the event-to-mission bridge, lands in the MissionRuntime, the scheduler polls, and the WorkerRuntime dispatches to the registered worker by exact event-type match. Workers emit the next event and the chain continues to a terminal state. This post shows the boring path on screen and argues that reliability is the feature.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 20. B20 — Cancel has to be real.
- Summary: In Orca, cancellation is a real, typed behavior: TIMEOUT_REQUESTED, WORKER_TERMINATED, EFFECT_STATUS_UNKNOWN. Not a flag that says cancel and hopes for the best, but named states the system tracks and reconciles. A short, technical, satisfying post for engineers who have fought fake cancellation in other frameworks.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 21. B21 — We took a real carpentry business and turned it into evidence.
- Summary: Happy Place Carpentry LLC of Adair Village, Oregon was archaeologically inventoried into an object graph: one identity object, live services, projects with estimate ranges and warranties, each entry carrying its source. This is the canonical worked example of the FYD pipeline on a real business, and the post teaches what evidence-backed actually means by walking the graph. Happy Place is the human face of the operation: a carpenter, a fence, Oregon rain.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 22. B22 — Retired services don't get deleted. They get archived.
- Summary: When Happy Place retired seven offerings, the graph archived them as retired evidence instead of deleting them. Business history stays honest and queryable: what you used to offer, and when, is part of the record. A surprising, principled little story about treating a business as evidence with provenance.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 23. B23 — Self-claimed is a label, not an insult.
- Summary: HPP's proof claims carry their verification status explicitly. When the business says 125-plus projects, the graph labels it self-claimed: claimed by the business, not independently verified. The label is not an insult; it is the mechanism that lets a visitor know exactly what is vouched for and by whom. This post teaches proof-claim labeling as a content practice any business can adopt.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 24. B24 — A fence should stay straight.
- Summary: Happy Place's own service copy is already great trade writing: a fence should stay straight, the gate should close without dragging, and it should still look good after a few Oregon winters. The content here is curation, not invention: read their words over footage of the work. This post is the human pillar of the brand, the proof that the system describes real work done by real hands.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 25. B25 — We never touch the original.
- Summary: The HPP discipline: all design-sprint defect work happens only in the parallel clone, while the original repo and the live site stay sacred and untouched. Experiments run in the sandbox; the working business presence is never risked for an experiment. A craft story about respecting a live business while still iterating.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 26. B26 — What if an AI API had to return a type instead of vibes?
- Summary: PING uses Jev as a shadow sensor for fast typed classification and routing decisions. The live contract: POST /v1/systemone takes a model, a state object, and keyed questions, and returns typed answers. The smoke test question scored noul: 0.97. This post shows the actual call, then the point: gate an action on a number, not a paragraph.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 27. B27 — A sensor is not an authority.
- Summary: Jev is a shadow sensor, never an authority. Its typed answers feed triage, routing, and escalation, but nothing Jev returns decides whether an effect is authorized. The kernel decides, and tenant identity never goes to the provider. The strongest version of this post names the exact point where Jev's output stops and the kernel's decision starts.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 28. B28 — Show the type contract.
- Summary: This post is a screen-capture sprint through the Jev contract: the POST /v1/systemone request shape, the typed answers that come back, and what a failure looks like. Thirty seconds, no marketing prose, just the mechanism. An excellent systems-conference idea compressed into a short video.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 29. B29 — VERIFIED: typed answers return. NOT VERIFIED: everything else.
- Summary: The public falsifiability format: the live call proved typed answers return, and the same post names the unknowns out loud, cost per call, latency guarantees, rate limits, what attestation proves. Trust through bounded claims. This one doubles as the house style guide for every technical post: say what you proved, name what you did not.
- Study item: ~/workspace/marketing-os/SYSTEMS.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

## D-EPISODES (12 briefs)

### 1. D1 — An Agent Said 'Success.' Nothing Happened.
- Summary: Agent output is a proposal, not truth. PING's position is that an LLM saying 'success' is not evidence that anything happened; only the canonical journal, written by the one authorized writer and verified by independent observation, counts as evidence. The episode walks the separation between a model claim and a canonical recording, and why that separation is the product's real trust story.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 2. D2 — Why Replay Must Not Repeat Side Effects
- Summary: PING's autonomous runtime specification distinguishes decision replay from mutation replay: restart must reconstruct what was decided, never blindly repeat external mutations. Uncertain effects reconcile instead of being retried. The episode shows the kill-point list, the journal, and the reconciliation read that replaces the retry reflex.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 3. D3 — We Accidentally Let Prose Override State
- Summary: Per the directive's own falsification stories, duplicate outreach exposed prose overriding canonical structured state. The episode uses the directive's correction format: WE BELIEVED, then TEST, then FALSIFICATION, then ROOT CAUSE, then MINIMAL FIX, then REGRESSION TEST, then NEW INVARIANT. The new invariant is the asset; the failure is the receipt that makes it believable.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 4. D4 — What Actually Replaces Human Approval
- Summary: Per the directive's own correction: the missing durable human-approval record must not be framed as a public embarrassment, because the autonomy direction intentionally removes per-action approval from ordinary authorized execution. The more interesting story is that approval and autonomy are both policies over the same consequential-action substrate: a tightly bounded autonomous envelope can execute without an approval stop, while a higher-consequence envelope can still require one. The episode shows what replaces per-action approval: constitutional invariants, policy, identity, capabilities, budgets, stable intent identity, idempotency, leases, verification, evidence, replay, watchdogs, circuit breakers, bounded adaptation, rollback. And the governing invariant: uncertainty does not become permission; if critical authority or verification disappears, new external mutations stop.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 5. D5 — Why We Refuse to Let the LLM Authorize Its Own Tools
- Summary: When the model says 'I should follow this account,' PING treats it as a proposal. Deterministic machinery then asks: is this the correct principal, is the target resolved, does the account control exist, is the capability granted, is it inside policy and budget, is it a duplicate, already pending, is state known, does the provider support it. Only then does execution happen. The episode makes this the signature separation: intelligence proposes, deterministic authority decides, evidence proves what happened.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 6. D6 — One Writer, Many Workers
- Summary: The episode walks the chain Intent, then Policy, then Capability, then Durable Intent, then Execution, then Verification, then Evidence, and contrasts it with the failure: Worker goes straight to database INSERT. One sovereign mechanism per consequential decision: one canonical event writer, one identity rule per identity domain, one canonicalization contract, one capability decision path, one evidence verification contract. And the opposite lesson: a god-object EventAuthority that owned construction, persistence, sequencing, transport, query, and replay would violate the same principle.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 7. D7 — Observation, Evidence and Truth
- Summary: The episode separates three layers engineers blur: observation (a signal arrived), evidence (a verified, attributable record), truth (what the canonical state says happened). It shows why the convergence work's key finding matters publicly: signals are observations, opportunity scores are recommendations, audience clusters are projections, experiments update confidence, and none may authorize publication, spending, or external effects merely because a score is high. The growth engine must never become an authority.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 8. D8 — The Timeout-After-Success Problem
- Summary: Distributed systems do not always know whether an external mutation occurred. Timeout-after-success is dangerous because blindly retrying a non-idempotent external mutation is incorrect. The episode publishes the lifecycle PING uses instead of the SUCCESS/FAILURE binary: PROPOSED, AUTHORIZED, CLAIMED, DISPATCHED, UNKNOWN, VERIFIED, RECONCILED, FAILED. Then it shows the reconciliation read: the concrete observation that resolves UNKNOWN into VERIFIED or RECONCILED without repeating the mutation.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 9. D9 — Why Owner Corrections Survive Regeneration
- Summary: FYD's deeper experiment is not an AI website builder; it is MESSY WEBSITE to OBSERVATIONS to EVIDENCE to OBJECT GRAPH to OWNER INTENT to PROJECTION. Because owner intent is stored as a first-class, authoritative input separate from the render, regeneration recompiles the same object graph with the same intent and the correction survives. The episode demonstrates it live: source changes, owner corrects, regenerate, correction persists. Same object graph to website, to Ask FYD, to search result, to future social and protocol projections.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 10. D10 — Seven JSON-LD Nodes, Zero Facts
- Summary: Structured markup present is not the same as facts extracted. The directive's own falsification stories include the @graph case: @graph existed but the flattener ignored it, so extraction silently produced nothing. The episode generalizes the lesson: extraction pipelines must verify what they captured against what the source contained, and 'found markup' is an observation, not evidence of facts. It ends with the regression: the fixture that failed before recursive processing and passes after.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 11. D11 — How We Test an Autonomous Agent by Killing It
- Summary: The autonomous runtime specification already calls for killing execution at precise points: after decision, after durable-intent persistence, after claim, during external request, after external success before response, after response before verification, after verification before canonical recording, then restart. The episode shows one kill point end to end and asks the only question that matters: can an autonomous system recover without lying about what happened. Recovery that rewrites history is a failure; recovery that reports UNKNOWN and reconciles is the pass.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 12. D12 — Why 'Unknown' Is a Production State
- Summary: Reducing every outcome to SUCCESS or FAILURE is how systems lie to themselves. PING treats UNKNOWN as a production state with defined semantics: the mutation may or may not have occurred, no retry is authorized until reconciliation reads the real outcome, and uncertainty never becomes permission. The episode makes this the signature concept: PROPOSED, AUTHORIZED, CLAIMED, DISPATCHED, UNKNOWN, VERIFIED, RECONCILED, FAILED. It closes on the invariant: uncertainty does not become permission; read may continue where safe, new external mutations stop.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

## F-HOOKS (7 briefs)

### 1. F1 — Your AI agent should not have permission to do what it recommends.
- Summary: The technical position: recommendation and authorization are different capabilities owned by different machinery. The model recommends; a deterministic capability path (principal, target, account control, capability grant, policy, budget, duplicate, pending, state, provider support) decides whether execution is allowed; the adapter executes; independent observation verifies. The hook is earned by showing that exact decision path and naming the boundary where a recommendation can never become a permission on its own.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 2. F2 — Exactly-once is the wrong mental model for most agent side effects.
- Summary: The technical position: for agent side effects against external systems, exactly-once is usually unachievable and the wrong goal; the right model is durable intent plus idempotent reconciliation. UNKNOWN is a real state, and uncertain effects reconcile through a concrete read instead of being blindly retried or blindly repeated. The hook is earned by showing the reconciliation read, the UNKNOWN state semantics, and failure-injection evidence that recovery does not duplicate the mutation.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 3. F3 — An LLM saying 'success' is not evidence that anything happened.
- Summary: The technical position: a model claim is a proposal, and only the canonical journal, written by the one authorized writer and verified by independent observation, counts as evidence of an effect. AGENT OUTPUT != CANONICAL TRUTH is the memorable form. The hook is earned by showing the claim-to-canonical recording path and one concrete case where the claim and the journal disagreed.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL

### 4. F4 — Replay should never repeat an external mutation.
- Summary: The technical position: replay reconstructs decisions from the journal; it must never re-execute external mutations as a side effect of replaying. Decision replay and mutation replay are different operations, and uncertain effects reconcile instead of repeating. The hook is earned by failure-injection evidence: kill at the listed points, restart, and show the journal proving the mutation was not repeated while the decision was faithfully reconstructed.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 5. F5 — Your website is a projection, not your business data.
- Summary: The technical position: the business is the object graph built from observations and evidence plus owner intent; the website is one projection of it. PROJECTION != TRUTH. The hook is earned by the regeneration demo (owner correction survives regeneration) and by rendering the same object graph into a second surface, like Ask FYD, proving the projection is downstream of the data rather than the data itself.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 6. F6 — We stopped letting prose override state after it sent the same outreach twice.
- Summary: The technical position: canonical structured state is the authority; prose is an observation that may describe intent but may never mutate state on its own. The hook is earned by publishing the full correction the directive prescribes: WE BELIEVED, then TEST, then FALSIFICATION, then ROOT CAUSE, then MINIMAL FIX, then REGRESSION TEST, then NEW INVARIANT. The incident is the receipt; the new invariant is the claim.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: MIXED | Status: DRAFT_NEEDS_APPROVAL

### 7. F7 — Deterministic AI is mostly deterministic software around probabilistic reasoning.
- Summary: The technical position: never casually claim determinism; specify the layer. Semantic, byte, decision, and projection determinism are precise claims with named boundaries, while execution determinism is usually impossible once external systems participate. The content pattern is DETERMINISTIC, then INTELLIGENCE, then DETERMINISTIC: deterministic retrieval, then LLM synthesis, then binding verification. The hook is earned by naming the exact deterministic boundary for the feature being discussed and showing where probabilistic behavior ends.
- Study item: ~/workspace/directives/2026-10-03-ping-technical-marketing-l6-credibility.md
- Audience:  | Claim class: VERIFIED | Status: DRAFT_NEEDS_APPROVAL
