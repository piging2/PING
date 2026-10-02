# SEVENTH DELIVERABLE: THE INTEGRATED PROOF (2026-09-30)

Binding: CEO-ORDER-600H-MASTER-DIRECTIVE-2026-09-30.md. PLAN ONLY. No execution.

This is not a seventh 100-hour silo. Every sprint contributes to it. The program
is judged by this deliverable: six green dashboards with no lossless
TENANT OWNER -> MISSION CONTROL -> MISSION -> ROUTER -> ORCA -> FINDING SET ->
JEV -> PROPOSAL -> OWNER APPROVAL -> FYD OBJECT/SITE EFFECT -> VERIFICATION ->
OUTCOME -> MISSION CONTROL path is a failed program.

## The master scenario

Owner asks: "Research whether my site accurately represents my current
commercial services and propose improvements."

The single flow must touch all six sprints. Each step below names the owning
sprint, the shared contracts it touches (with their mutation owner from
00-master-sequence.md), its input contract, its output contract, and its
acceptance test. Every output statement is in good form: what the system does,
not how many modules it creates.

## Step 1: TENANT OWNER (01 TenantOS)

The tenant owner (CG-001) is authenticated and machine-observable as the
decision authority for their tenant scope. No other tenant's identity can act
here.

- Contracts touched: tenant contract (owner: 01), capability contract (owner: 01).
- Input contract: an authenticated owner session bound to exactly one tenant;
  the tenant's identity/object graph is reachable and no other tenant's is.
- Output contract: the owner's intent is admitted as a tenant-scoped mission
  request; Tenant B's private objects are unresolvable from Tenant A's context
  even through search, agent context, or projection.
- Acceptance test: Tenant A cannot resolve Tenant B's private object even
  through search, agent context, or projection; the owner's approval authority
  is observable in the tenant contract, not in prose.

## Step 2: MISSION CONTROL admits the mission (02 Mission Control)

The owner creates the mission in served Mission Control. The mission row is
created with tenant context at creation, carrying the typed research contract.

- Contracts touched: mission contract (owner: 02), tenant contract (reader: 02).
- Input contract: the tenant-scoped mission request from Step 1.
- Output contract: a MISSION_CREATED record exists with tenant context,
  correlation/causation identity, and the typed research contract; it is
  visible in Mission Control with its plan, without reading logs or tables.
- Acceptance test: a real user creates the mission in MC and sees it with its
  plan; the mission row carries the tenant that Step 1 admitted.

## Step 3: MISSION -> ROUTER (02 Mission Control)

The deterministic stateless route compiler selects an executor from real
capabilities and records the route decision (worker + reason) as assignment
metadata. The canonical dispatcher is untouched; there is no second routing
authority. Unroutable missions hit DO NOT ROUTE and fail closed.

- Contracts touched: route contract (owner: 02), brief contract (owner: 02),
  capability contract (reader: 02).
- Input contract: the typed mission contract from Step 2.
- Output contract: a recorded route decision exists stating the selected
  worker and why it was routed; Mission Control shows both.
- Acceptance test: Mission Control shows the selected worker and why routed;
  a mission with no eligible real-capability worker fails closed instead of
  routing on a name token.

## Step 4: ROUTER -> ORCA receives a typed brief (03 ORCA)

ORCA receives the executor brief as a machine-complete typed payload, never a
prose dump. A stale brief (wrong contract version) fails closed.

- Contracts touched: brief contract (reader: 03).
- Input contract: the route decision and typed brief from Step 3.
- Output contract: ORCA holds a validated, current-version typed brief binding
  it to a real-capability executor; stale briefs fail closed before any
  acquisition.
- Acceptance test: a stale brief fails closed; a valid brief binds to an
  executor with a real capability, not a name token.

## Step 5: ORCA -> FINDING SET (03 ORCA, via 02's seam)

ORCA acquires authorized sources (the owner's site, business listings),
observes, analyzes, and produces a finding set: observations, claims with
per-claim verdicts, uncertainty, and preserved contradictions. The finding set
is persisted by digest/reference through the canonical mission system, so the
scheduler seam no longer drops it.

- Contracts touched: result/finding contract (owner: 02; 03 writes content
  through the canonical mission system), event transition contract (owner: 02).
- Input contract: the typed brief from Step 4 plus authorized sources.
- Output contract: a persisted finding set digest exists; every claim carries
  acquisition evidence (source digest, observed_at); contradictions are
  preserved, not merged; unresolved questions are named as next-mission
  candidates.
- Acceptance test: real source acquisition produces persisted, traceable
  findings; no claim exists without acquisition evidence; "I searched" without
  acquisition evidence is a failed run.

## Step 6: FINDING SET -> JEV (05 JEV, shadow)

JEV judges the finding set and the candidate site changes in shadow: which
proposed changes are supported, which are unsupported, which are contradicted.
The deterministic baseline remains production authority; JEV's verdict is
recorded as a typed observation.

- Contracts touched: judgment contract (owner: 05), result/finding contract
  (reader: 05).
- Input contract: the finding set digest from Step 5 and the candidate
  SiteSpec changes.
- Output contract: a typed judgment exists (verdict, dimensions,
  evidence_refs, failures, uncertainty, recommended_disposition) that
  distinguishes supported from unsupported changes with evidence refs; it
  does not alter production routing.
- Acceptance test: JEV catches unsupported site-change claims in shadow while
  the baseline remains production authority; every judgment cites evidence.

## Step 7: JEV -> PROPOSAL (04 Website Building)

FYD produces a SiteSpec proposal from the supported findings only: which
commercial services the site misrepresents or omits, with each proposed change
bound to its evidence.

- Contracts touched: SiteSpec contract (owner: 04), judgment contract
  (reader: 04).
- Input contract: the finding set (Step 5) and the JEV shadow judgment
  (Step 6).
- Output contract: a SiteSpec proposal exists in which every proposed change
  cites supporting evidence and no unsupported change is present; the proposal
  is digest-bound to the exact finding set and judgment it was built from.
- Acceptance test: the proposal contains zero changes JEV marked unsupported;
  each change links to its evidence.

## Step 8: PROPOSAL -> OWNER APPROVAL (02 Mission Control)

Mission Control shows the proposal as one decision, one sentence, one evidence
link, with approve/deny at the correct consequence tier (this is a HIGH
consequence effect: explicit approval). The owner approves. The decision is
immutable historical truth once taken.

- Contracts touched: capability contract (reader: 02), event transition
  contract (owner: 02).
- Input contract: the digest-bound SiteSpec proposal from Step 7.
- Output contract: an APPROVED decision exists, bound to the exact proposal
  digest, recorded as a governed transition; a rejection would be terminal,
  never reinterpreted.
- Acceptance test: the owner approves from the MC surface without reading
  logs; the approval binds the exact proposal digest; the decision is
  immutable afterward.

## Step 9: OWNER APPROVAL -> FYD OBJECT/SITE EFFECT (04 Website Building)

PING records the governed transition. FYD regenerates the site from the
approved SiteSpec patch. Owner corrections and customizations survive
regeneration; a second observation confirms the source change did not destroy
them.

- Contracts touched: SiteSpec contract (owner: 04), event transition contract
  (reader: 04), tenant contract (reader: 04, tenant-scoped regeneration).
- Input contract: the approved proposal digest from Step 8.
- Output contract: the regenerated site exists; prior owner corrections and
  customizations survive regeneration; a second observation is consistent
  with the approved patch.
- Acceptance test: owner correction survives regeneration; the rendered
  result matches the approved proposal; no silent prose-as-fact filler.

## Step 10: EFFECT -> VERIFICATION (06 Tests)

Independent verification checks the rendered result against the approved
proposal: served bytes versus expected, evidence links resolving, no
unsupported claims in the rendered output.

- Contracts touched: verification/outcome contract (owner: 02; 06 defines
  gates against it).
- Input contract: the regenerated site and the approved proposal digest.
- Output contract: a verification verdict exists, replayable from a clean
  checkout, stating whether the effect matches the approval.
- Acceptance test: verification is independent of the sprint that built the
  effect; its green is replayed from a clean checkout on one SHA.

## Step 11: VERIFICATION -> OUTCOME -> MISSION CONTROL (02 Mission Control)

The outcome appears in Mission Control with the full epistemic chain behind
every state: identity, mission, plan, route, execution, findings, judgment,
proposed effect, approval, verification, outcome, evidence/history.

- Contracts touched: verification/outcome contract (owner: 02), mission
  contract (reader: 02).
- Input contract: the verification verdict from Step 10.
- Output contract: the outcome is visible in Mission Control with its chain;
  unresolved questions from Step 5 are offered as bounded next-mission
  candidates through the canonical mission system.
- Acceptance test: the owner sees the outcome and understands the full chain
  without reading logs or database tables; learning compounds into the next
  mission.

## Step 12: READABILITY PROOF (04 Website Building, inside the scenario)

From the same object graph that produced the regenerated site, FYD projects
HUMAN_HTML, AGENT_MARKDOWN, STRUCTURED_JSON, and AVAILABLE_CAPABILITIES.
No surface is scraped back into another; each is a projection from governed
semantic state, and readability never implies actuation.

- Contracts touched: SiteSpec contract (owner: 04).
- Input contract: the post-regeneration object graph.
- Output contract: four projections exist from the same semantic state with
  measured correctness, evidence correctness, tokens, latency, and zero
  unsupported claims.
- Acceptance test: all four projections derive from the same graph; none is
  scraped from another; an agent reading the Markdown projection gains no
  actuation capability it was not granted.

## How the six sprints map to the steps

- 01 TenantOS: Steps 1 (tenant boundary, isolation, decision authority).
- 02 Mission Control: Steps 2, 3, 8, 11 (mission lifecycle, routing seam,
  approval, outcome projection).
- 03 ORCA: Steps 4, 5 (typed brief, acquisition, persisted findings).
- 04 Website Building: Steps 7, 9, 12 (proposal, regeneration, projections).
- 05 JEV: Step 6 (shadow judgment).
- 06 Tests: Step 10 (independent verification) plus the hostile gate over
  every step and the clean-checkout replay of the whole scenario.

## Program acceptance

The program is accepted when this scenario runs end to end with every step's
acceptance test green, replayed from a clean checkout on one SHA, and every
broken seam found along the way is recorded as permanent regression knowledge
with its regression ID, invariant, seed/path, minimal counterexample, first
failing SHA, fixed SHA, test owner, and expected behavior.

Six green dashboards with no lossless path through these twelve steps is a
failed program.
