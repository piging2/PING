# PING Marketing: Technical Audience Experiment Plan

Standing law (Nolan, 2026-09-30): "Past analytics describe the audience we had. Experiments create the audience we want. Optimize for qualified attention, not historical conformity."

Second law: "PING does not win technical trust by sounding advanced. It wins by making advanced claims falsifiable."

This file owns the discovery program. The next 30 technical posts are an explicit discovery period. No winner is declared early.

## 1. The 30-post discovery protocol

- 30 technical posts, tagged internally, measured on two independent dimensions.
- Do not declare a winner after 3 posts. Do not declare a winner after 10. Read the tags after 30.
- Every post gets a hypothesis before it ships: which audience, which system, what we expect, what would falsify it.

### Internal tags (every technical post)

- TOPIC: the engineering subject (e.g. typed decision planes, event authority, replay)
- DEPTH: L1 (15-30s intuition), L2 (30-60s architecture), L3 (60s+ / carousel / article / GitHub-linked)
- FORMAT: text, image, video, carousel, article
- HOOK TYPE: contrarian claim, specific number, direct address, curiosity gap, falsified assumption
- SYSTEM: which system is the lens (PING, FYD, TenantOS, Orca, HPP, or external: Jev, Typesafe, etc.)
- AUDIENCE: intended audience segment (see section 2)
- CLAIM TYPE: VERIFIED, INFERRED, UNKNOWN per the claim-status convention

### Analytics contract

Report every period in two separate tables:

**Historical audience performance.** The audience and posts that existed before this strategy. Frozen baselines: NICHE-ANALYSIS.md Part 1 (Page) and Part 2 (personal profile).

**Target-audience experiment performance.** New technical content deliberately designed to attract the intended audience. Never mix the two tables.

Track two independent dimensions per experiment:

**Distribution performance:** views, three-second hold, average watch time, completion, rewatches, shares, saves.

**Audience quality:** qualified technical followers, technical comments, senior-developer engagement, GitHub or profile clicks, repeat technical viewers, inbound engineering conversations, implementation questions, references to previous episodes.

Views alone are weak evidence. Eighty relevant engineers and five technical discussions may be more valuable than 500 random views.

For each technical piece retain: claim, evidence, system, topic, hook, intended audience, publish time, platform, metrics, comments, corrections, follow-up questions, source material. Serious comments become research input. Correct public mistakes when evidence supports the commenter.

## 2. Intended audience

Senior software engineers, staff and principal engineers, AI infrastructure engineers, agent and runtime engineers, founders building AI systems, technical operators, systems engineers, developers interested in reliability, distributed systems, event sourcing, orchestration, deterministic systems, local AI, and evidence-backed AI.

Approximate technical position: "BUILDING AI SYSTEMS THAT CAN PROVE WHAT THEY DID." This is never empty branding. Every technical post needs a demonstrable engineering consequence, accurate terminology, visible evidence, and bounded claims.

Candidate emerging intersections (do not pre-decide): distributed AI reliability, agent infrastructure, evidence-backed AI, deterministic agent systems, AI runtime architecture.

## 3. Technical content laws

- Assume a senior engineer is watching.
- Never use terms such as deterministic, distributed, constitutional, event-sourced, fault-tolerant, exactly-once, autonomous, self-improving, or production-ready unless implementation evidence supports them. Use "we are designing toward" for aspirational properties, "the current implementation does X, but Y is missing" for partial support, and correct directly when falsified.
- Preserve internal claim labels VERIFIED / INFERRED / UNKNOWN. Occasionally expose verification publicly, e.g. VERIFIED: events survive restart. NOT VERIFIED: worker recovery after a mid-effect crash.
- Public diagrams are labeled CURRENT, TARGET, or EXPERIMENT. Never mix current and aspirational architecture without clear labels.
- Evidence order for external systems: official docs, source repo, papers, maintainer statements. For PING: code, tests, runtime evidence, ledgers, then marketing prose.
- No talking-head assertions without supporting code, terminal output, traces, event rows, tests, failures, diagrams, commits, or before-and-after behavior.
- Technical screenshots and recordings are scanned for secrets before use: credentials, tokens, private keys, IP addresses, usernames, private paths, private Git remotes, internal hostnames, customer data, private infrastructure.
- Professional visual style: clean terminal captures, syntax-highlighted code, animated architecture diagrams, precise callouts, minimal lower thirds, source labels, motion used to explain transitions not decorate. The feel: an excellent systems conference talk compressed into 30 seconds. No fake lo-fi. No deliberately amateur editing.
- No em dashes. Ever.

## 4. Series

- SHOW THE RECEIPTS: a claim, then the evidence on screen.
- ONE AUTHORITY: one owner per truth, enforced not declared.
- WE WERE WRONG: the falsification format. Structure: 0-3s falsified assumption, 3-10s assumed architecture, 10-20s contradicting evidence, 20-30s actual architecture, 30-35s resulting engineering principle. Never manufacture mistakes or drama.
- FAILURE IS A STATE: UNKNOWN effects, HOLD, reconcile never blind retry.
- BUILDING PING: honest build-in-public status.
- MECHANISMS, NOT FRAMEWORKS: what we harvested, what we rejected, and the boundary.
- ONE BRAIN, MANY HANDS: runtime optionality, authority stays put.

## 5. Exploratory pillars (no fixed percentages yet)

- Technical systems and building PING.
- Technical external-system analysis (through PING's engineering lens only, never as AI news).
- Business and application translation (FYD, home services, the $400 missed call).
- Proof and build-in-public.
- Occasional home-services and $400 missed-call content.

External systems are covered only through the lens: what mechanism is interesting, what invariant it affects, what PING would harvest, what PING would reject, where authority lives, what failure mode appears, can the claim be reproduced.

## 6. First experiments

### Experiment T1: Jev/Typesafe, "a type instead of vibes" (PROPOSED, NOT APPROVED, NOT POSTED)

- TOPIC: typed decision planes. DEPTH: L1. FORMAT: text post plus clean terminal screenshot. HOOK TYPE: contrarian claim. SYSTEM: Jev/Typesafe (external). AUDIENCE: agent and runtime engineers. CLAIM TYPE: VERIFIED core, UNKNOWN edges.
- Hypothesis: a falsifiable typed-output claim earns technical comments from agent engineers; the public VERIFIED/NOT VERIFIED split builds trust rather than costing it.
- Engineering question (not "look at this cool model"): where do you put fast typed judgment in an agent system without letting the model approve its own side effect. PING's lens: Jev is a shadow sensor for fast typed triage, never an authority. The interesting invariant is typed answers plus attestation, not the model.

Claim bounds (live-verified 2026-09-30 via the Typesafe skill, api.typesafe.ai):
- VERIFIED: POST /v1/systemone accepts a model, a state object, and questions; returns HTTP 200 with typed answers under `answers`. The `noul` question type returns a numeric 0-1 score (live call today: smoke question returned noul 0.97). GET /v1/models returns HTTP 200 with an empty model list under current parsing.
- INFERRED: typed output lets you gate actions on thresholds instead of parsing free text.
- UNKNOWN: cost per call, latency guarantees, rate limits, what attestation cryptographically proves.

Draft caption (exact text requires Nolan's approval; nothing here is approved):

"What if an AI API had to return a type instead of vibes?

We asked TypeSafe's SystemOne one question: is this a smoke test? It answered: noul 0.97. Not a paragraph. A number. A typed number we can gate on.

That is the whole pitch. When your agent needs a fast routing call, you do not want prose you have to parse. You want a contract: state in, typed answer out, threshold decides.

What we verified today: POST /v1/systemone takes a model, a state object, and questions, and returns typed answers. What we have not verified: cost per call, latency guarantees, rate limits. We will say so when we know.

PING uses Jev as a shadow sensor, never an authority. Fast typed judgment feeds triage. Nothing about it decides whether an effect is authorized. An AI agent should never be allowed to approve its own side effect.

VERIFIED: typed answers return. NOT VERIFIED: everything else."

- Screenshot: clean terminal capture of the verified call, scanned for secrets before use. No credentials in frame.
- Mirror: Page post first (approval-gated). Personal-profile mirroring is not supported by the connector (personal writes are read-only); the only route is a manual share in the Facebook UI, which is Nolan's call after approval.

### Experiment T2: "An AI agent should never be allowed to approve its own side effect"

- TOPIC: authorization boundaries. DEPTH: L1. FORMAT: video (We Were Wrong optional). HOOK TYPE: contrarian claim. SYSTEM: TenantOS. AUDIENCE: agent engineers. CLAIM TYPE: VERIFIED (model-proposes/kernel-authorizes is in the harvest order).
- The law: the model suggests, the machine decides. Concrete: no model output ever flips its own effect to authorized.

### Experiment T3: "We accidentally built three event authorities"

- TOPIC: event authority convergence. DEPTH: L2. FORMAT: video (We Were Wrong structure). HOOK TYPE: falsified assumption. SYSTEM: TenantOS/PING. AUDIENCE: systems engineers. CLAIM TYPE: VERIFIED core (the forensic happened), INFERRED on current state, requires re-verification of code before shipping.
- Strong beats weak: "We accidentally built three event authorities. Here is how we found the real one." Re-verify the forensic against current code before drafting the script.

### Experiment T4: "Timeout does not mean failure. It means we don't know."

- TOPIC: UNKNOWN effects. DEPTH: L1. FORMAT: text or video. HOOK TYPE: curiosity gap. SYSTEM: Orca. AUDIENCE: backend engineers. CLAIM TYPE: VERIFIED (UNKNOWN/HOLD is specified), with explicit label that HOLD/recovery behavior is specified but not yet reached behavior.

### Experiment T5: "The $400 missed call, part 2" (commercial pillar)

- TOPIC: missed-call revenue math. DEPTH: L1. FORMAT: pig image post. HOOK TYPE: specific number. SYSTEM: FYD/PING Social. AUDIENCE: home-service owners. CLAIM TYPE: INFERRED math on the Dave post.
- Dave's math: 3 missed calls a week times $400 equals $62,400 a year walking to whoever picks up first. Keeps the commercial pillar alive while the technical program runs. Not the identity, one pillar.

### Experiment T6: "We studied 16 agent frameworks and imported zero"

- TOPIC: mechanisms over frameworks. DEPTH: L1. FORMAT: video. HOOK TYPE: specific number. SYSTEM: TenantOS. AUDIENCE: agent engineers. CLAIM TYPE: VERIFIED (harvest order), needs one concrete harvested mechanism named in the script before shipping.
- Rule: the post must name one real mechanism PING harvested and the authority boundary it respects, or it does not ship.

## 7. Publication and mirroring law (unchanged, restated)

- Nolan approves every exact post. Silence is not approval.
- Never create a native Facebook draft, schedule, or publication without approval.
- The connector supports managed-Page writes (approval-gated) and personal-profile reads only. Personal-profile publishing is not technically supported by the connector; mirroring to the personal profile would be a manual share in the Facebook UI, decided by Nolan after approval. Do not promise automated mirroring.
- The Marketing OS proposes. Nolan disposes.
