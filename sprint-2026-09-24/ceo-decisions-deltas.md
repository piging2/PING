# CEO DECISIONS DELTAS (2026-09-24 ~18:53 MDT, Nolan; binding, supersedes question backlog)

FULL TEXT: ~/AGENTS.md "CEO decisions, FYD 24h sprint". This file records how each
decision folded into sprint state. NO design question batches to Nolan during the
sprint. Defaults when uncertain: reversible, provenance-preserving, owner-controlled,
deterministic where possible, AI-assisted where valuable, provider-independent,
projection-based, easy to delete or replace.

## Where each decision landed

1. PRODUCT TARGET (PING first-interaction value): URL -> understanding -> generated
   presence -> Ask FYD -> change by talking. Folded into Q-P1-03 invariant. Not
   prettier architecture copy.
2. FRAMING: digital-presence compiler, NOT website builder. Website is one projection
   backend. Folded into proof doc VERIFIED CUSTOMER JOURNEY header block.
3. PING NOT SACRED: earns its place via evidence provenance, object identity,
   relationships, capabilities, transitions/history, proposal/approval, projections.
   If a simpler implementation wins, simplify PING. Recorded here; applies to all
   integration choices (one authority per concern).
4. PLUMBER UX: owner never sees SiteSpec/PING/events/projections/capabilities/JSON-LD/
   object graphs. Folded into proof doc header block. Design consequence: owner
   surfaces must hide internals; "FYD already understood my business" / "That's
   wrong, change it" / "Done" / proposed change / "Yes" / "Done" / sourced answers.
5. PRIORITY STACK (binding): discoverability > contact/primary action discoverability
   > mobile usability > trust/factual accuracy > performance > visual novelty.
   Folded into proof doc. UGLY-BUT-GREEN: ugliness alone does NOT invalidate; verdict
   separates functional loop / trust / usability / visual quality. Green loop ->
   owner test. Visual becomes first arrow only if it hurts comprehension/trust/
   conversion. Applies to Q-J-01/J-02/P1-02 mobile/composition work.
6. ASK FYD: evidence-bounded Q&A, never invent; answer broadly only if evidence
   supports, otherwise say info is not available. Folded into proof doc; aligns with
   Q-J-05/Q-J-06/Q-I-52. TRUST added to the priority stack per decision.
7. ATTRIBUTION: "Built with FYD" (+ optional "See sources" when provenance UX exists).
   Never "verified" when merely observed. Internal states OBSERVED / OWNER-CONFIRMED
   / VERIFIED / INFERRED / GENERATED stay distinct. Folded into Q-F-04 invariant and
   proof doc header block. Proof-doc audit: existing "verified" uses refer to
   test-verified claims (citation chains verified live), which is legitimate use.
8. MEDIA: observed/authorized first; never generate fake storefronts, employees, jobs,
   or products that could be mistaken for evidence; missing media never blocks product
   (deterministic graceful fallback); cached media keeps source URL, digest,
   observed_at, type, provenance, transformation metadata. Publicly reachable !=
   licensed for permanent copying. Folded into Q-P1-01 invariant.
9. OWNER CLAIM LADDER: A DNS TXT (strongest portable), B HTTPS well-known, C domain
   email, D Google Business Profile OAuth as OPTIONAL connector. Provider-independent;
   Google proves authorization relative to Google only. Recorded here; binds Q-I-53
   owner/projection integration (claim seam design).
10. FACTORY OPERATOR-ONLY until two-tenant + external-owner loop passes. Architect so
    self-service can enable without redesign; do not expose it now. Folded into
    Q-J-11 invariant.
11. MONUMENT VIEW: NO autonomous contact. Prepare exact outreach + owner-test flow;
    wait for green journey; do not spend relationship capital on an unproven product.
    Folded into Q-J-12 next_test.
12. COPILOT: 9 identities YES for LOW-RISK INTERNAL via the existing broker (tests,
    repo archaeology, fixture analysis, component comparisons, docs extraction,
    read-only ecosystem harvest, browser matrices, static analysis). NO: production
    mutations, outreach, social actions, credential handling, destructive cleanup,
    money, public publishing. Parallelize commodity work, not authority. Binds the
    successor-frontier Copilot wiring-gap item; no new broker.
13. OUTREACH/ENGAGEMENT: THROTTLE during sprint; product proof is P0. Already in
    AGENTS.md; duplicate-outreach incident on record; canonical structured eligibility
    mandatory. No new sends authorized.
14. POSTGRES ROTATION: already completed and proven (old credential rejected, five
    consumers agreed, journal intact, gateway healthy). Do NOT re-rotate on stale
    prose; close stale state. Queue checked: no rotation item exists (the 4 "rotation"
    mentions are Q-P0-05 incident-containment prose and Q-J-02 screen-rotation).
15. DOGFOOD: private preview first; public publishing is a distinct promotion, not a
    debugging mechanism. Folded into Q-P1-03 invariant.
16. VISITOR HISTORY: stateless/ephemeral default. Aggregate analytics OK. Persistent
    visitor-specific history needs explicit purpose + disclosed retention + controls.
    PING private context and business analytics stay separate. Binds any Ask/personal-
    ization work in the successor frontier.
17. DEMO AUTH: DEV/DEMO OWNER MODE acceptable ONLY if clearly labeled, non-production,
    cannot enable accidentally in production; real proposal/approval semantics still
    used; keep the real claim seam; no full identity product this sprint. Current
    :3100 demo-owner mode is the standing accepted instance (NEXT_PUBLIC_FYD_DEMO_
    OWNER_MODE=1, labeled, non-production).
18. POST-24H: bounded autonomous windows (plan -> run -> test -> evidence -> checkpoint
    -> continue within delegated authority). Research/test/refactor loops continuous;
    production/external consequential ops gated. Recorded here; governs the
    continuous-frontier transition after H24.
19. RESEARCH CLASSIFICATION: A commodity (use library), B semantic pattern (steal
    concept), C FYD differentiator (own), D distraction (record/defer). BUY/HARVEST:
    browser automation, JSON-LD, OAuth, domain verification, image transform,
    responsive primitives, protocol SDKs, crawling, MCP, search infra. OWN: evidence
    model, object semantics, claim reconciliation, owner corrections, SiteSpec
    semantics, capability binding, Ask context, proposal/approval UX, regen semantics,
    multi-source resolution, outcome learning. Binds successor-frontier research
    dispatch.
20. NO NEW LANES. Sprint focus: two sites manageable by an owner + Ask evidence Q&A +
    owner correction loops + regeneration without losing intent. Already enforced by
    convergence mode; reaffirmed here.

## ESCALATION GATES (CEO, exact; supersedes prior lists)

Escalate ONLY: external contact, public publishing, money, destructive unknown-data
deletion, credential exposure/rotation ambiguity, irreversible migration, material
privacy/security change. Everything else: decide at 80%, test, document, continue.
Old "your call" items: re-resolve against current evidence and these locked
decisions first; escalate only true human-authority items, one question.

## Operating consequence

Convergence mode already prohibits new lanes; these decisions remove the need for
any design-question batches. When uncertain: reversible, provenance-preserving,
owner-controlled, deterministic where possible, AI-assisted where valuable,
provider-independent, projection-based, easy to delete or replace.
