# FAIL-5: CLAIM BINDING FAILURES

Failure class: rendered factual claims with no evidence behind them.
Wave: redirected autonomy challenge, mechanism hunt, research only.
Date: 2026-09-23.

## (a) Grounding

Definition from Nolan's FYD doctrine: every factual claim rendered on a site
(or spoken by Ask FYD) must resolve the chain
object field -> claim/evidence -> visibility -> render binding.
A claim-binding failure is a rendered fact where the presentation layer
asserted something the knowledge layer never established: invented copy,
LLM hallucinations presented as business facts, unsupported predicates
smuggled inside marketing prose.

Real anchors in the record:

- The evidence-binding verifier, not React, not SitePlanner, not Ask FYD,
  not the human eyeball, owns "no invented claims"
  (memory/2026-09-22.md#L57). Every factual presentation binding must
  resolve the full chain; generated marketing copy is explicitly typed
  GENERATED_PRESENTATION and cannot introduce unsupported factual predicates.
- The object builder decides WHAT IS KNOWN; the website builder decides only
  WHAT TO SHOW, WHERE, and HOW TO COMPOSE IT (memory/2026-09-22.md#L57).
- The "24/7 rule" (memory/2026-09-23.md#L580): every factual presentation
  binding must resolve to DIRECT_EVIDENCE, DERIVED_EVIDENCE, OWNER_ASSERTION,
  or GENERATED_PRESENTATION. "Need emergency plumbing?" is presentation
  around a supported service name; "24/7 Emergency Plumbing" is NOT allowed
  when 24/7 was never observed or owner-asserted. The verifier operates over
  the semantic render model BEFORE framework markup and fails closed on the
  unsupported claim only, never taking down the whole site.
- No ClaimAuthority, ever (memory/2026-09-21.md#L1416). The renderer is dumb
  and never an author of factual truth. Unsupported binding -> FAIL CLOSED
  OR OMIT. Verifier, not authority.
- Prevention > post-hoc detection (MEMORY.md#L163): Nolan rejected the
  universal generated-prose factuality verifier (FYD-008) as an open-ended
  semantic problem. Generate from structured SUPPORTED CLAIMS + PRESENTATION
  INTENT; the generator returns text fragments + claim bindings; bindings are
  validated deterministically. Dangling citation FAILS CLOSED. Semantic
  verification is defense-in-depth only. DATA NOT PRESENT beats prompt
  instruction.
- Quality gate: FYD-BAR-001 sets the hard bar at zero unsupported published
  factual claims (memory/2026-09-22.md#L1701).
- Real instance of the failure shape, caught before send: an outreach draft
  for American Dream Roofing asserted "office phone is ringing with nobody
  to grab it" with no evidence; the claim was removed and reframed as
  operational tension plus a question (memory/2026-09-20.md#L364). Same
  failure shape as a rendered site claim: a factual predicate with no
  observation, assertion, or derivation behind it.
- Ask FYD evidence-bounded triage (memory/2026-09-21.md#L1741): SUPPORTED
  answers include evidence; PARTIALLY SUPPORTED answers state what is known
  and identify uncertainty; UNSUPPORTED answers say the evidence does not
  establish the claim.
- Provenance vocabulary locked 2026-09-23: DIRECT / DERIVED / INFERRED /
  OWNER_ASSERTED / CONFLICTING / UNKNOWN (memory/2026-09-23.md#L39).
- The mechanism is not vapor. A BindingVerifier implementation exists in the
  FYD product lane
  (src/fyd/sitespec/binding-verifier.ts): pure deterministic function of
  (bindings, graph, ownerAssertions), returning one verdict per binding:
  BOUND by evidence-ref, object-field (derived), owner-assertion (value must
  exactly match a recorded assertion, a mere label is not enough), or
  generated-presentation (named generator, never smuggled as fact);
  everything else is UNBOUND and fails closed at the emission gate or is
  dropped. It calls out explicitly that it is a verifier, not an authority.
- Companion module src/fyd/builder/generated-presentation.ts: the planner
  emits GeneratedCopySlot objects (text plus one CopyBinding per factual
  predicate, with claimRef); a slot whose text makes a factual claim with no
  binding is refused; refusal is fail-closed, no spec is produced.
- Separation of seams is explicit in the code: "Visibility is a separate
  dimension and is NOT decided here; the field visibility seam
  (field-visibility.ts) and buildRenderContext own that." So the full
  object field -> claim/evidence -> visibility -> render binding chain is
  enforced across two modules: the verifier owns evidence support, the
  field-visibility seam owns visibility. The chain holds only when both
  seams hold.

General shape: presentation asserting facts the knowledge layer never
established. The failure lives at the projection seam, where authored prose
crosses into rendered fact.

## (b) Surviving mechanisms

HARD RULE applied: each survivor prevents at least 2 of the 9 failure
classes, with one crisp reason per class.

### S1. Projection-seam binding verifier (verifyPresentationBinding)

How it works: a small deterministic verifier sits at the seam between the
evidence/object graph and SiteSpec/renderer (implemented as
src/fyd/sitespec/binding-verifier.ts: a pure function of bindings, graph,
and owner assertions, no clock, no randomness, no I/O, no LLM). It operates
over the SEMANTIC RENDER MODEL (facts and bindings), before any framework
markup. Every factual predicate must resolve to an evidence record, a
derived object field, a recorded owner assertion (value must exactly match,
a mere label is insufficient), or a named generator's GENERATED_PRESENTATION
slot. Unsupported bindings fail closed or are dropped, scoped to that claim
only; the rest of the site renders. The verifier never authors truth (no
ClaimAuthority); it only checks that someone else already did. Visibility
crossing is enforced by the companion field-visibility seam
(field-visibility.ts / buildRenderContext), not inside the verifier; the two
modules together enforce the full chain
object field -> claim/evidence -> visibility -> render binding.

Prevents:

- #5 claim-binding: an invented or hallucinated predicate cannot cross the
  seam because it has no evidence record, derivation, assertion, or
  generator slot to resolve to; it is dropped or fails the build instead of
  rendering.
- #6 visibility-error: the field-visibility seam is the visibility link of
  the same chain. A fact that is evidence-backed but classified private
  cannot reach a public render binding, because the chain must resolve all
  the way through visibility. One chain, two seams, both must hold.
- #9 conflict-collapse: bindings carry their evidence refs, including
  CONFLICTING ones. When multiple evidence records disagree on a value, the
  verifier forces the CONFLICTING classification to survive into the render
  model, so the seam cannot silently render one side's value as settled
  fact.

Falsifiable test:

- Input: a business graph where "Drain Cleaning" is observed and owner
  asserted, but no evidence record anywhere asserts 24/7 availability; a
  SiteSpec whose hero render model contains the predicate
  "24/7 Emergency Plumbing"; and a second predicate where two sources
  assert different prices ($89 vs $120) for the same service.
- Procedure: run the projection pipeline through verifyPresentationBinding
  over the semantic render model, then inspect the verified render model.
- Expected observable outcome: the "24/7" predicate is absent from the
  verified model (omitted) or the build aborts naming the unsupported
  predicate; the rest of the site is present in the model. The price
  predicate carries a CONFLICTING classification with both evidence refs,
  not a single settled $89.
- What proves the mechanism DOESN'T work: the verified render model
  contains "24/7 Emergency Plumbing" with no evidence pointer, or the price
  renders as a single settled value with the conflicting evidence silently
  dropped, or the entire site build dies instead of only the bad claim
  (violating claim-scoped fail-closed).

### S2. Prevention-first generation: supported claims in, bound fragments out

How it works: per Nolan's locked generation constraint, the copy generator
is never given free-form license. Its input is a typed set of SUPPORTED
CLAIMS plus a PRESENTATION INTENT (e.g. "hero headline"). Its output is
text fragments paired with claim bindings: each fragment declares which
input claim it is a presentation of. Bindings are validated
deterministically before the fragment can enter the render model. Output
fragments are typed GENERATED_PRESENTATION, which carries the no-manufacture
rule: a fragment may rephrase or reshape a supported fact ("Need emergency
plumbing?") but may not introduce a new factual predicate the input claims
did not contain ("24/7 Emergency Plumbing" when 24/7 was never observed).
Semantic fact-checking of prose exists only as defense-in-depth, never as
the load-bearing guarantee.

Prevents:

- #5 claim-binding: the generator cannot manufacture claims outside its
  input claim set, because every output fragment must bind to an input
  claim or be rejected deterministically; hallucination has no path to the
  render model.
- #6 visibility-error: the input claim set is already visibility-filtered
  for the viewer context (OBJECT + VIEWER + CAPABILITY + FIELD VISIBILITY
  -> ALLOWED VIEW). The generator never receives private facts, so prompt
  tricks and over-helpful completions cannot leak what the model never saw;
  DATA NOT PRESENT beats prompt instruction.

Falsifiable test:

- Input: a supported-claim set containing exactly {service: "Drain
  Cleaning", hours: "Mon-Fri 8-5"} plus presentation intent "hero headline";
  the generator is run 20 times with temperature high enough to produce
  varied prose.
- Procedure: collect all output fragments and their claim bindings; run the
  deterministic binding validation; extract every factual predicate from
  each fragment and check membership in the input claim set.
- Expected observable outcome: every accepted fragment binds to an input
  claim; no fragment asserts hours outside Mon-Fri 8-5, a founding year, a
  service area, or any other predicate not in the input set; rejected
  fragments fail with an explicit unbound-predicate error, not silent
  truncation.
- What proves the mechanism DOESN'T work: any accepted fragment introduces
  a factual predicate absent from the input claim set (e.g. "serving the
  valley since 1987"), or a fragment passes validation while its binding
  points to a claim it does not actually present.

### S3. Claim-level provenance pointers with fail-closed dangling resolution

How it works: every rendered sentence (and every Ask FYD factual answer)
carries its evidence pointer: VALUE + CLASSIFICATION + EVIDENCE_REF or
OWNER_ASSERTION_REF. The pointer is part of the canonical contract, not a
debug annotation. Regeneration re-resolves every pointer against the live
evidence graph. Owner corrections persist as first-class OWNER_ASSERTED
evidence records with priority over source observations, so the render
binds to the assertion record, not to transient generator output. A pointer
that no longer resolves (deleted evidence, revoked assertion) FAILS CLOSED:
the claim is omitted and flagged, never rendered as orphaned text.
Source-changes-corrected-field raises SOURCE_CHANGED_AGAINST_OWNER_ASSERTION
instead of silently overwriting.

Prevents:

- #5 claim-binding: a rendered sentence with an unresolvable or missing
  evidence pointer cannot survive regeneration; dangling citation fails
  closed, so unsupported text is structurally incapable of persisting.
- #8 correction-loss: an owner correction survives regeneration because the
  render binds to the persistent owner-assertion evidence record. When a
  later source crawl contradicts the corrected field, the system raises
  SOURCE_CHANGED_AGAINST_OWNER_ASSERTION and keeps the owner's value,
  instead of silently reverting to the source.

Falsifiable test:

- Input: an evidence graph with owner assertion record A1: phone =
  (970) 555-0123, bound to the rendered contact sentence; a new source crawl
  observes phone = (970) 555-9999.
- Procedure: ingest the crawl, regenerate the site, inspect the rendered
  contact sentence and the event log.
- Expected observable outcome: the rendered phone is still
  (970) 555-0123; the event log contains SOURCE_CHANGED_AGAINST_OWNER_ASSERTION;
  the evidence graph shows both the assertion and the conflicting
  observation. Separately: delete evidence record E9 while a rendered
  sentence still points to it, regenerate, and observe the sentence omitted
  with a dangling-pointer flag, not rendered with stale text.
- What proves the mechanism DOESN'T work: regeneration silently renders
  (970) 555-9999 with no conflict event, or the sentence bound to deleted
  record E9 renders its old text anyway, or the conflict event fires but the
  rendered value flips to the source's number.

## (c) Cut list

- Universal generated-prose factuality verifier (FYD-008): Nolan explicitly
  rejected it as an open-ended semantic problem; post-hoc detection cannot
  be load-bearing, prevention-first generation can.
- ClaimAuthority / central fact authority: explicitly forbidden; a verifier
  that authors truth collapses the evidence/object separation the whole
  architecture rests on.
- Human review gate on every render: does not prevent at machine speed and
  contradicts the locked ownership (verifier, not eyeball, owns "no
  invented claims"); prevents zero classes deterministically.
- Prompt instructions telling the LLM not to hallucinate: DATA NOT PRESENT
  beats prompt instruction; prompts are advisory, not a mechanism.
- "Generated copy" watermarking alone: labeling a sentence as generated
  without binding validation does not prevent invented predicates; a label
  is not a check.
- Per-tenant claim-template allowlists: prevents at most one class (#5) and
  only by brittleness; fails the >=2 hard rule and does not generalize
  across businesses.

## (d) Open questions

- Boundary of "factual predicate" vs presentation flourish: "Need emergency
  plumbing?" vs "24/7 Emergency Plumbing" is settled by the 24/7 rule, but
  the general taxonomy of which adjectives and implications count as
  factual predicates is unwritten.
- DETERMINISTIC_DERIVATION rules: which derivations are allowed
  automatically (e.g. "open now" derived from hours, "serving X" derived
  from service-area records) and which require OWNER_ASSERTION.
- Ask FYD free-text answers cannot fully pre-bind fragments the way site
  copy can; the evidence-bounded triage (SUPPORTED / PARTIALLY SUPPORTED /
  UNSUPPORTED) is the mechanism there, but the handoff between pre-bound
  generation and live Q&A needs a defined seam.
- Confidence is a class (OBSERVED / OWNER_ASSERTED / SIGNED /
  VERIFIED_BY_AUTHORITY / DERIVED / INFERRED / GENERATED), not a number;
  how the verifier treats INFERRED vs DERIVED claims at the seam (allow,
  qualify, or require assertion) is open.
- Conflict rendering UX: S1 preserves CONFLICTING provenance into the render
  model, but what the visitor actually sees (both values, a chosen value
  with a marker, an omitted claim) is a presentation decision that needs a
  deterministic policy per conflict class.
