# NEVER-DONE PRODUCT COMPILER DIRECTIVE DELTAS (2026-09-24 ~18:43 MDT, Nolan's continuation order)

CONTINUATION, NOT REPLACEMENT. The 24-hour execution graph stands; do not replan it.
Law added: hour 24 is a checkpoint, not the product. Ingested 2026-09-24 ~19:15 MDT.

## DELTA 1 — Integration debt convergence (Nolan's integration debt law)

A FEATURE COUNTS ONLY WHEN: INTEGRATED -> MERGED -> FULL GATE GREEN ->
RUNNING PRODUCT -> REPLAY COMMAND RECORDED. Uncommitted green tests are not
product; staged work is not product; lane-local proof is not product. Do not
create branches faster than integration can absorb.

Known debt ledger (converge, do not add to):
1. Uncommitted Ask FYD lane work (179 tests green, lane-local).
2. 8 staged projection/owner-loop commits in lane-d-impl (staged, not mine to steal).
3. SSRF-hardened acquireUrl (58/58 hostile tests green, UNINTEGRATED).
4. Write-boundary idempotency work at deployed tip d6c1b05d (lane-owned; coordinator tracks).
5. Edge work on fyd/edge-port (unmerged; isolation until edge journey green +
   :3100 regression risk disproven — unchanged).
6. Unmerged TenantOS wave branches (harvest lane only; no product writer touches).

Coordinator rule change: every verification report now records INTEGRATION STATE
(lane-local / staged / committed-unmerged / merged / running-in-product) next to
the test result. Test-green != product until the full chain holds. No new feature
branch this sprint without a convergence slot.

## DELTA 2 — Bounded git sensor (Nolan's architectural correction 18:44)

"Ingest git repos every day" = a BOUNDED SENSOR/HARVEST LANE feeding TESTED
RECOMMENDATIONS into the queue. It is NOT the product lane chasing GitHub daily.
Novelty must not preempt convergence.

Q-H-01 updated: sensor categories = schema UI, generative UI, website builders,
headless CMS, structured extraction, crawlers, browser runtimes, agent runtimes,
durable workflows, local-first, identity, capabilities, provenance, MCP, social
protocols, search, incremental computation, media pipelines. Harvest manifest per
item: source / SHA-version / license / primitive / FYD failure addressed /
adopt-adapt-reject / wrapper / test / dependency cost / removal plan. Every item
answers: what FYD failure does this remove? what code does this let us not write?
what future option does it preserve? what dependency cost does it add? Research
itself becomes OBJECTS in the same knowledge architecture (repo -> object, commit
-> object, technique -> object/concept; implements/supersedes/depends_on/
inspired_by/alternative_to) so Ask can eventually answer harvest questions.

Ecosystem signals to harvest as PATTERNS, NOT COPIES (already validated):
OpenPage (typed JSON common editing substrate for human/AI/render), Object UI
(schema-driven UI generation), Tambo (registered typed components bound to
agent-driven generative UI), VoxelSite (transactional site-wide AI changes,
structural impact analysis, snapshots, MCP exposure). FYD differentiation stays:
evidence-backed object world, durable owner intent, relationships, capabilities,
many projections. Harvest commodity; own differentiation.

## DELTA 3 — Business-world compiler framing

FYD IS A BUSINESS-WORLD COMPILER, not a website builder. Website, Ask, edge
objects, Circle, search, social, agent context, MCP are PROJECTIONS of one
object world: observations -> evidence -> identities/objects/relationships/
capabilities/owner intent/history -> projections. The customer never re-explains
the business; every legitimate input (website, social, repos, documents, owner
statements, interactions, outcomes) improves the same world. Never build
website-data / social-data / Ask-data / campaign-data / agent-data as separate
silos: that is losing.

Three layers NEVER COLLAPSE: observed world / owner intent / generated
presentation (source diff + owner priority must reconcile without silently
erasing corrections — same as the regeneration invariant).

One presentation IR mutated by human, agent, generator, visual editor. ONE
PRESENTATION IR — no AI-edit-React while human edits another state while
generator writes another config. If SiteSpec cannot support this without
becoming a programming language: SIMPLIFY IT. Deterministic structured changes
underneath owner talk ("Make the hero less corporate." beats form mazes;
visual controls are escape hatches, not the primary experience).

Every AI site change: INTENT -> PATCH -> VALIDATE -> IMPACT -> PREVIEW ->
APPLY -> RECEIPT. NOT: LLM rewrites site. Owner undo: R17 -> patch -> R18;
undo = inverse/new revision -> R19; never mutate history; experimentation must
be cheap. Harvest the structural impact-analysis pattern (dependency index from
changed object S4 -> facts/relationships/sections/pages/Ask contexts/search
docs/Circles/public projections; invalidate only those).

Deterministic packer for the mobile overlay: input = eligible objects, viewport
geometry, safe areas, header/footer, preferred anchors, min separation, max
visible, priority. Output = stable edge slots. Invariants: no overlap, no content
obstruction, no safe-area violation, no scroll jitter, stable id -> stable slot
where possible, accessible touch targets, deterministic tie breaks. AI does not
belong in the packer. Desktop: objects at extreme page margins, attached to the
experience, not inserted content cards. Mobile: compact pack of individual
contextual objects in the existing overlay concept; individually openable;
semantically contextual; NO "all objects" default.

POSITIONING CORRECTION (Nolan 2026-09-24 ~18:47 MDT, binding; supersedes the
compact-pack framing above where it conflicts): objects LESS compact, LESS
clustered; very far apart is fine, anchored near their contextual page sections
at the extreme margins, FIXED. Overlay technique with page-anchored feel:
scrolling moves them completely out of view like page-anchored elements, NOT
viewport-glued chips that follow you. Overall prettier. Center stays a beautiful
normal website. Section-contextual placement stays. Sent to the Q-J-01 trace
writer ~19:30 MDT and recorded in the proof doc + work queue.

Edge object selection: DETERMINISTIC FIRST. Input: current section, viewport,
available objects, relationship graph, object importance, viewer context,
capabilities, presentation constraints. Output: edge object set. Explicit
semantic rules before intelligence (service count > 0 -> Services eligible;
etc.). AI only when semantic selection is ambiguous. DO NOT MAKE AI DECIDE
PIXEL POSITIONS.

One canonical object, many representations: tiny edge glyph, compact edge card,
mobile packed object, Circle, expanded object, search result, Ask context, agent
context, social projection. DO NOT FORK IDENTITY FOR PRESENTATION.

Actions: render ONLY actions backed by real capabilities (Service: ASK,
REFERENCE, REQUEST QUOTE; Person: ASK, FOLLOW, OPEN RELATED BUSINESS; Project:
ASK, REFERENCE, OPEN SERVICE; Business: FOLLOW, ASK, CONTACT, REQUEST QUOTE).

No LLM on the hot render path: normal site load = object projection + SiteSpec +
renderer, fast; cache deterministic projections; precompute dependency indexes.
If AI is unavailable: SITE STILL WORKS, objects open, facts render, contact
works. Non-AI capabilities never degrade. FYD is not an LLM wrapper.

CRDT: do not install yet; preserve stable IDs, structured patches, append-only
history, deterministic projections, portable SiteSpec (optionality from clean
semantics, not from installing the future).

One connector contract (not 40 adapters): DISCOVER / AUTHORIZE / OBSERVE /
CHECKPOINT / NORMALIZE / REFRESH / REVOKE; actions separate: PLAN ACTION /
AUTHORIZE / EXECUTE / RECEIPT / RECONCILE. Observe and act stay separate.

Viral unit = the object: functional, not advertising. Embeddable objects with
same identity/provenance/capability policy = network distribution without
duplicating content. Search eventually searches objects, not pages. Preserve the
architectural seam now; NOT NOW for the network effects.

## DELTA 4 — Primary metric

TIME-TO-"FYD ALREADY UNDERSTANDS MY BUSINESS." Measure T0 URL submitted -> T1
identity recognized -> T2 first facts -> T3 object graph useful -> T4 first
SiteSpec -> T5 first render -> T6 first Ask answer -> T7 owner can interact.
Two-click onboarding: paste URL / connect source -> build; everything else
inferred or deferred; generate first, let owner correct after. Do not optimize
internal stages without measuring their effect on this metric.

Must-wins unchanged: time to useful presence, mobile experience, service/product
discovery, contact/action discovery. Integrity gates: evidence correctness,
privacy, owner correction, regeneration safety. "Why this?" = trust
infrastructure, not the hero feature; default experience simple, inspectable
when needed.

## DELTA 5 — Post-checkpoint frontier (after H24)

Green checkpoints -> advance ONE frontier, in order: real external owner ->
owner auth -> acquisition coverage -> media quality -> search/discovery ->
social observation -> cross-network projections -> campaign intent ->
outcome learning. At each stage: HARVEST FIRST, build minimum generic delta,
prove with real user. Never-done operating loop stays: reobserve product daily,
ingest high-value ecosystem changes, harvest, run hostile business worlds, run
real businesses, run mobile matrix, run safety critics, run owner loop, run
regeneration, measure time-to-understanding, find first broken arrow, fix,
integrate, repeat.

## DELTA 6 — Swarm operating model (actualize, no swarm product)

Logical roles: ARCHAEOLOGIST, HARVESTER, IMPLEMENTER, FALSIFIER, SECURITY CRITIC,
MOBILE CRITIC, ACCESSIBILITY CRITIC, PERFORMANCE CRITIC, INTEGRATION CRITIC.
Readers scale aggressively; WRITERS BOUND. Each task carries: INVARIANT, INPUTS,
EXPECTED OUTPUT, TEST, DEPENDENCIES, WRITE SCOPE. Priority score
machine-calculable: severity x journey-impact x confidence x generality /
(cost x blast-radius x dependency-uncertainty). Agents pull READY work, not
interesting work. Every solved failure produces: test, fixture, rule, recipe,
critic, library decision, runbook, or known-permanent disposition. The swarm
gets cheaper over time.

Effect on current orders: existing 26-item queue + bounded writer discipline
already match this; capacity split 70/20/10 stands; falsification feeds queue;
no writer without an invariant + write scope.
