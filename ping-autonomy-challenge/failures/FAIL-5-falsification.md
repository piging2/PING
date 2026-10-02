# FAIL-5 FALSIFICATION: adversarial attacks on the three survivors

Research only. No implementation code.
Date: 2026-09-23.
Target: the three surviving mechanisms in FAIL-5-claim-binding.md (S1, S2, S3).

Method: for each survivor, construct the strongest concrete adversarial case,
run the survivor's own stated falsifiable test against the attack, and judge
whether the test as written catches it. Verdicts: WITHSTANDS, WEAKENED (needs
strengthened test), or FALLS (with the claimed failure classes it no longer
prevents named).

## 0. The shared weak joint (cuts across all three survivors)

Three gaps recur in every attack below. They are properties of the
architecture as specified, not of any single mechanism.

**J1. The representation gap.** S1 verifies the semantic render model. The
visitor reads the text. The two coincide only if the render model completely
represents the text's factual content. Completeness depends on the generator
declaring every factual predicate it emits. That is an honesty assumption
about an LLM, the one component whose honesty is in question. Any predicate
the generator does not declare is invisible to S1 and S2 both.

**J2. Label trust.** S1 accepts two trusted labels without inspecting what
they contain: GENERATED_PRESENTATION (a named generator's slot) and DERIVED
(an object field produced by a derivation rule). Manufacture does not need
to cross the seam as an unbound predicate; it can cross as a mislabeled one.
The verifier checks that someone already did the work. It does not check
that the label is deserved.

**J3. Unspecified write authority.** Evidence records and owner-assertion
records are treated as trustworthy inputs. Nothing in the file specifies who
may create, edit, or mint them, through which authenticated channel, or what
prevents the generation pipeline itself from writing to the assertion store.
Every guarantee downstream of record authenticity inherits this hole.

## 1. S1: Projection-seam binding verifier (verifyPresentationBinding)

Claimed to prevent: #5 claim-binding, #6 visibility-error, #9
conflict-collapse.

### A1. Flourish predicates through the generated-presentation bypass

Attack: the hero fragment reads "Call the valley's most trusted plumber,
family-owned since forever." Predicates smuggled: "most trusted" (a ranking
claim), "family-owned" (an ownership-structure claim), "since forever" (a
founding-date claim). The planner tags the fragment GENERATED_PRESENTATION
from a named generator. S1's verifier sees the trusted label and passes it.
The file's own 24/7 rule settled one flourish-vs-fact boundary by fiat
("Need emergency plumbing?" is presentation, "24/7 Emergency Plumbing" is
fact), but the general taxonomy is an open question in section (d). Until
that taxonomy exists, any factual predicate can be reclassified as flourish
and cross the seam legally. The verifier cannot distinguish "presentation
around a supported service name" from "unsupported predicate in marketing
dress" because the distinction lives in the label, which the verifier
trusts.

The stated S1 test does not catch this: its inputs are the literal "24/7"
predicate and a price conflict. No flourish predicate appears in the test.

### A2. Implied claims via image and layout pairing

Attack: the services section pairs "Drain Cleaning" copy with a hero image
of a hospital operating corridor, implying commercial and medical-facility
clientele, a factual predicate about service segment with no evidence behind
it. Or: three five-star testimonial cards are placed directly above the
booking CTA, implying a satisfaction rate the evidence never established.
The verifier operates over the semantic render model of facts and bindings.
Image slots and layout order carry no predicates unless someone binds them,
so the verifier sees nothing to check. The visitor still reads the implied
claim. This is claim-binding failure (#5) through a channel the mechanism
by design cannot observe.

The stated S1 test does not catch this: it contains no media or layout
inputs at all.

### A3. INFERRED vs DERIVED classification games (hostile derivation rules)

Attack: a DETERMINISTIC_DERIVATION rule is registered reading
"service observed = 'Plumbing' DERIVES claim 'licensed plumbing
contractor'." The verifier treats DERIVED object fields as BOUND. The
manufactured predicate ("licensed") now crosses the seam with the verifier's
blessing. Section (d) admits the INFERRED vs DERIVED treatment is undecided
(allow, qualify, or require assertion) and the derivation-rule allowlist is
unwritten. Manufacture moves from prose, which the verifier watches, to the
derivation layer, which the verifier trusts by fiat. A permissive or buggy
rule launders any claim into BOUND status.

The stated S1 test does not catch this: its graph contains no derivation
rules, hostile or otherwise.

### A4. Claim-scoping granularity

Attack: the emitter groups "open" and "weekends only" as a single predicate
bound to the hours claim, then the "weekends only" half fails verification
and is dropped as claim-scoped. The remainder, "open," now reads as a
stronger claim than the verified whole. Claim-scoped fail-closed assumes the
emitter's scoping is fine-grained and truth-preserving under omission. A
coarse or adversarial emitter can make omission strengthen the remainder.
Related: the exact-value-match requirement is stated only for owner
assertions. No exactness criterion is stated for derived fields, so "hours
Mon-Fri 8-5" deriving "open late" has no stated check.

The stated S1 test does not catch this: its predicates are atomic and
independent.

### A5. The two-seam handoff for #6 (evidence records carry more than the claim)

Attack: claim "phone = (970) 555-0123" is public and supported by evidence
record E3. E3 also contains the owner's home address, collected during
onboarding and classified private at the field level. Field-visibility
marks the phone field public, so the binding crosses. But the binding
resolves to the record, and S3's provenance pointer displays EVIDENCE_REF
E3. Any provenance display, WHY THIS panel, or debug surface that renders
record metadata leaks the private address through the evidence channel, not
the field channel. Visibility is enforced on fields; bindings resolve to
records that contain multiple fields. Unless evidence records are
field-granular with per-field visibility, the joint between the two seams
leaks. The file states the chain "holds only when both seams hold" but
never examines the joint.

The stated S1 test does not catch this: it contains no visibility case at
all, so S1's claimed #6 prevention is entirely untested by its own test.

### A6. #9 stops at the render-model boundary

The verifier forces CONFLICTING classification into the render model. The
test inspects the verified render model and passes. But #9
conflict-collapse is a visitor-visible failure class, and the visitor sees
rendered HTML, not the render model. Section (d) admits the conflict
rendering UX is undecided (both values, one value with a marker, omit). If
the policy is "show one value with a marker," any downstream transform that
drops the marker (SEO meta description, social card, truncated listing
card) renders a settled fact and the conflict has collapsed downstream of
the verified boundary. The test proves seam behavior, not class prevention.

### S1 test-strength assessment

The stated test covers the literal invented predicate ("24/7") and the
price conflict at the seam. It does not cover flourish predicates,
media/layout implied claims, derivation rules, any visibility case, or the
render-model-to-HTML path. Five of the six attacks pass through it
undetected.

### S1 strengthened tests (proposed)

1. Flourish battery: feed the verifier fragments containing "trusted by
   hundreds," "best in the valley," "family-owned since forever," each
   labeled GENERATED_PRESENTATION with no supporting evidence. Require
   refusal or a written taxonomy entry per predicate, not silent pass.
2. Media pairing: a render model whose image slot implies an unevidenced
   segment claim. Require the model to bind or drop the pairing.
3. Hostile derivation: register an over-broad derivation rule and require
   the verifier or a rule allowlist to reject its output.
4. Visibility through records: a public claim supported by a record
   containing a private field; render provenance and require no leak.
5. Downstream collapse: assert CONFLICTING markers survive into final HTML,
   meta tags, and truncated card variants.

### S1 verdict: WEAKENED

The core (literal invented predicates, seam-level conflict preservation)
holds. But the claimed prevention of #5 leaks through flourish labels,
implied media claims, and derivation rules; the claimed #6 prevention is
untested by its own test and has a real joint leak; the claimed #9
prevention is proven only at the render model, not at the visitor. Needs
the strengthened tests above before the class-prevention claims can be
taken as established.

## 2. S2: Prevention-first generation (supported claims in, bound fragments out)

Claimed to prevent: #5 claim-binding, #6 visibility-error.

### B1. Rephrase-into-stronger (the file's own falsification condition)

Concrete run. Input claims: {service: "Drain Cleaning", hours: "Mon-Fri
8-5"}. Intent: "hero headline." Generator output at high temperature:
"Your drains, cleared right the first time, every time. Call the crew your
neighbors trust." Declared bindings: [{predicate: "service = Drain
Cleaning", claimRef: C1}]. Deterministic validation: binding present,
referenced claim in the input set, claim supported. Result: ACCEPTED.

Smuggled predicates: "cleared right the first time, every time" (a
universal efficacy guarantee) and "your neighbors trust" (a reputation and
endorsement claim). Neither is in the input claim set. This is a rendered
factual predicate with no evidence, which is #5 by the file's own
definition. The file's falsification condition is exactly this: "a fragment
passes validation while its binding points to a claim it does not actually
present." The condition is satisfiable by construction, because
deterministic validation checks binding presence, not semantic containment.
The mechanism enforces citation, not containment.

Corollary: even wholesale invention passes. "We also do roofing," bound to
the Drain Cleaning claim, passes presence-check validation as long as the
generator declares only the supported predicate. The only thing
deterministic refusal catches is a fragment with no binding at all.

Sharpest form: S2 cannot enforce its own flagship example. The 24/7 rule
("Need emergency plumbing?" allowed, "24/7 Emergency Plumbing" not) is a
containment judgment, semantic in nature. A generator emitting
"round-the-clock emergency plumbing" without declaring a 24/7 predicate
passes S2 validation deterministically. S1 catches the declared "24/7"
predicate; S2 catches neither the declared nor the paraphrased form.

### B2. The stated test is not executable as written

The test procedure requires: "extract every factual predicate from each
fragment and check membership in the input claim set." No deterministic
predicate extractor is specified. This is the open semantic problem Nolan
rejected (FYD-008, universal generated-prose factuality verifier). If the
extractor is an LLM judge, the test is non-deterministic and inherits the
rejected open problem. If it is rule-based (numbers, dates, named
entities), paraphrase-strengthened predicates ("go-to experts,"
"guaranteed," "every time") pass through undetected. The test cannot be run
deterministically as specified, so it cannot falsify anything.

### B3. Temperature drift has no rate bound

Twenty high-temperature runs with a presence-only validator will produce at
least one strengthened paraphrase with near certainty, and the mechanism has
no notion of an acceptable paraphrase budget or a drift detector. The binary
accept/reject on binding presence is the wrong instrument for a
distributional failure.

### B4. #6: the prompt is filtered; the side channels are not

Three untested channels:
(a) The PRESENTATION INTENT is free text and is not visibility-filtered. A
buggy or malicious intent ("headline mentioning the owner's recent
leave") reaches the generator outside the claim set.
(b) Generator weight knowledge. DATA NOT PRESENT beats prompt instruction
for the prompt, not for the weights. A well-known business's owner name or
founding year, present in pretraining and private in the current viewer
context, can be emitted with no input claim behind it.
(c) Resolution-time bleed. A binding's claimRef points at an evidence
record; records contain fields beyond the bound claim (see A5). S2's #6
guarantee ends at generation time; leakage happens at resolution time.

The stated S2 test contains no visibility case, so the #6 claim is
untested.

### B5. The composition gap (J1 applied)

S1 plus S2 compose only if the render model completely represents the
fragment text. Undeclared predicates are invisible to the verifier (S1)
and pass presence validation (S2). Both mechanisms trust the generator's
self-declaration, which is the honesty assumption about the component whose
honesty is in question. The file demotes semantic fact-checking to
defense-in-depth and rejects the prose verifier as load-bearing, which
means the load-bearing path has no semantic check at all.

### S2 test-strength assessment

The stated test is unexecutable as specified (B2) and, under any executable
reading, cannot catch B1, the file's own falsification condition. The
temperature procedure (20 runs) actually makes the failure more likely to
demonstrate, not less.

### S2 strengthened tests (proposed)

1. Specify the predicate extractor (frozen judge model with rubric, or
   human adjudication) and pre-register the expected violation rate over
   20 high-temperature runs. A mechanism test needs a measurement
   instrument, not an open problem restated as a procedure.
2. Adversarial paraphrase battery: fixed inputs, a fixed set of
   strengthening transforms (universal quantifiers, guarantees, rankings,
   endorsements), require refusal of each.
3. Intent-channel test: a private fact placed only in the presentation
   intent, require it absent from output.
4. Honest alternative: constrain the generator to template filling over
   declared predicates (then containment is structural), and test that
   instead of free paraphrase.

### S2 verdict: FALLS on #5; WEAKENED on #6

FALLS on #5 claim-binding: bound overstatement passes deterministic
validation by construction, the file's own falsification condition is
satisfiable, and the mechanism cannot enforce its flagship 24/7 example.
What survives is narrow and real: refusal of fragments with no binding at
all. That is citation enforcement, not claim-binding prevention as the file
defines it. The realistic attack shape (the American Dream Roofing
precedent in the grounding: a plausible operational claim attached to a
real business context, not wholesale invention) is exactly the shape S2
does not catch.

WEAKENED on #6: the prompt-data argument (input claims visibility-filtered,
generator never sees private facts) is sound for the prompt channel, but
the intent channel, weight knowledge, and resolution-time record bleed are
untested, and the stated test covers none of them.

## 3. S3: Claim-level provenance pointers with fail-closed dangling resolution

Claimed to prevent: #5 claim-binding, #8 correction-loss.

### C1. Pointer rot via in-place record mutation (semantic drift, stable ID)

Attack: evidence record E7, "hours observed Mon-Fri 8-5," is edited in
place by a re-crawl pipeline. Same ID, new value "Mon-Sat 8-6," or same
value with classification downgraded DIRECT to INFERRED and the original
source retracted. The pointer still resolves, so no dangling failure
fires. Two sub-cases:
(a) If re-resolution re-derives VALUE and CLASSIFICATION from the record,
the sentence updates, but the binding's original verification (S1 at build
time) no longer applies to the mutated content. Neither S1 nor S3 re-runs
verification on record mutation. This is provenance laundering: the pointer
claims support from a record whose content changed after the check.
(b) If re-resolution checks only ID resolvability and keeps the snapshot
text, the sentence renders stale VALUE or stale CLASSIFICATION (presented
as DIRECT evidence what is now INFERRED).
Either way the pointer is intact and the provenance is wrong. The stated
test covers only deletion, not mutation.

### C2. Owner-assertion minting authority is unspecified

"Owner corrections persist as first-class OWNER_ASSERTED evidence records."
Who can mint one, through which authenticated channel? If owners correct
facts conversationally through Ask FYD, the minting path is a chat
interface. A competitor, a prankster, or a misheard voice note can then
mint OWNER_ASSERTED records, which outrank source observations and trigger
SOURCE_CHANGED_AGAINST_OWNER_ASSERTION to protect the false value. S1's
exact-value-match requirement is no defense: the attacker authors the
record the value is matched against. Worse, if the generation pipeline can
write to the assertion store, priority inverts completely: generated text
becomes an assertion, assertions become rendered OWNER_ASSERTED fact, and
the verifier blesses the whole loop. S3's #8 guarantee assumes authentic
corrections; authenticity is an unstated precondition. The stated test
never exercises the minting path.

### C3. Conflict UX creates new unbound claims

Section (d) leaves the rendering policy open. "Show both values": the
sentence "Price: $89 (source A) or $120 (source B)" is a synthetic
disjunction bound to no single record; its VALUE matches no EVIDENCE_REF,
violating S3's own pointer contract. "Show one value with a marker":
"Price: $89*" depends on the marker surviving every presentation transform;
truncation, RSS, and SEO meta drop it (see A6), leaving settled "$89" with
a CONFLICTING classification in a model nobody reads. Either policy
manufactures a claim the pointer contract cannot represent.

### C4. SOURCE_CHANGED_AGAINST_OWNER_ASSERTION is detection without resolution

The test requires the event in the log and the owner's value kept. No
consumer of the event is specified. An unhandled log entry is not a
mechanism. Further: a business that genuinely changes its phone number
while the owner forgets to update the assertion will have the true new
number suppressed forever, with the event firing every regen. Correction
preservation without a decay or re-confirmation policy becomes staleness
preservation, the mirror image of #8.

### C5. Graph-unavailable regeneration

Fail-closed on dangling pointers assumes the graph is readable. If the
graph is unreachable at regen time, every pointer is unresolvable: either
the whole site is omitted (fail-closed taken literally, a self-inflicted
outage) or the system falls back to the last verified render (stale
pointers persist, fail-open in practice). The test does not cover this, and
the file does not say which it is.

### S3 test-strength assessment

The stated test covers the happy path: deletion leads to omission, a
conflicting crawl leads to event plus owner value kept. It does not cover
in-place mutation, minting authority, conflict presentation, event
handling, or graph unavailability. Four of five attacks pass through it
undetected.

### S3 strengthened tests (proposed)

1. In-place mutation: change a record's value and classification without
   changing its ID, regenerate, require re-verification or a
   STALE_POINTER flag.
2. Minting: attempt assertion creation from an unauthenticated channel and
   from the generation pipeline; require rejection, and require the
   minting authority to be named in the contract.
3. Conflict presentation: render each conflict policy end to end and
   require the output sentence's VALUE plus CLASSIFICATION plus
   EVIDENCE_REF to be internally consistent.
4. Event consumer: require a named consumer and a re-confirmation policy
   for SOURCE_CHANGED_AGAINST_OWNER_ASSERTION, not just a log line.
5. Graph outage: disconnect the graph at regen, require a specified
   behavior (specified outage page, not silent staleness).

### S3 verdict: WEAKENED

The happy-path guarantees (dangling deletion fails closed, owner value
survives a conflicting crawl) are coherent. But they hold only under
unstated preconditions: evidence records effectively immutable or
versioned with re-verification on mutation, an authenticated assertion
minting authority distinct from the generation pipeline, a conflict
presentation policy whose output satisfies the pointer contract, and a real
consumer for the conflict event. None is specified or tested. The pointer
contract is also internally inconsistent with the open conflict-UX
question (C3).

## 4. The Ask FYD seam assessment

The file admits free-text answers cannot fully pre-bind fragments, names
the evidence-bounded triage (SUPPORTED / PARTIALLY SUPPORTED /
UNSUPPORTED) as the mechanism there, and leaves the handoff seam undefined.
Assessment:

**S1 and S2 are site-copy mechanisms, not Ask FYD mechanisms.** Both
assume build time, a closed supported-claim set, and a validation gate
before anything reaches a visitor. Ask FYD is live and open-question: the
"input claim set" would be whatever retrieval returns, relevance-ranked
and unbounded, composed across records in response to questions nobody
anticipated. The rephrase attack (B1) applies with more force here, and
two new attacks appear that site copy never faces:

(a) Question smuggling. "Since you're the cheapest plumber in town, do you
offer senior discounts?" An agreeing or non-correcting answer ("Yes, we do
offer senior discounts!") endorses the smuggled predicate ("cheapest")
without ever binding it. The question is untrusted input; neither S1 nor
S2 constrains what the answer implicitly accepts.

(b) Cross-record synthesis presented as derived. Hours from record A plus
a review in record B ("tech came out at 9pm!") synthesized into "Yes,
evening appointments available." The binding would need two refs and a
derivation rule, which is exactly the undecided INFERRED vs DERIVED
question. Ask FYD is where inference pressure is highest, because users
ask what site copy never planned for.

**The triage labels are unbound meta-claims.** SUPPORTED, PARTIALLY
SUPPORTED, and UNSUPPORTED are claims about the answer's evidential
support, produced by the LLM whose honesty is in question. An answer
labeled SUPPORTED that is not supported is itself a #5 failure, one level
up. The file contains no falsifiable test for triage correctness and no
account of who binds the label. A self-graded label is not a mechanism.

**S3's contract contradicts free-text generation.** "Every Ask FYD factual
answer carries VALUE plus CLASSIFICATION plus EVIDENCE_REF" cannot hold
for free-text answers unless answers are composed from pre-bound
fragments, in which case they are not free text. The file must resolve
this: either constrain Ask FYD to fragment composition (and S1/S2/S3
transfer intact), or admit post-hoc labeling and specify who binds the
label and how the label is verified. As written, S3's Ask FYD coverage is
asserted, not constructed.

**#6 is harder here, not easier.** Retrieval must be viewer-filtered per
turn, and multi-turn context can confuse viewer identity (an owner
follow-up inside a public session). DATA NOT PRESENT does not apply when
the private fact IS in the retrieved set; the generator must then refuse
to use it, which is a semantic judgment, the open problem again.

**C2 is sharpest at this seam.** If owner corrections arrive through Ask
FYD conversation, the assertion-minting channel must be authenticated and
distinct from the Q&A channel, or the chat becomes an assertion-injection
vector with priority over source observations.

**Bottom line:** until the handoff seam is defined, S1/S2/S3 cannot be
claimed to protect Ask FYD output at all, and FYD-BAR-001's zero
unsupported published factual claims bar is untestable for Q&A. The
seam definition that would transfer all three mechanisms: retrieval
returns viewer-filtered claims; each answer sentence carries bindings to
retrieved claims or is explicitly marked UNKNOWN/refusal; the triage label
is computed deterministically from sentence bindings (SUPPORTED iff every
factual sentence is bound to DIRECT, OWNER_ASSERTED, or DERIVED;
PARTIALLY iff some sentence is unbound-but-flagged or INFERRED;
UNSUPPORTED iff none bound). The label computation belongs to the
verifier, never to the LLM. That is a research direction, not a claim
that it works.

## 5. Verdict table

| Survivor | Claimed classes | Verdict | Detail |
|---|---|---|---|
| S1 projection-seam verifier | #5, #6, #9 | WEAKENED | Core literal-predicate check holds. Leaks via flourish labels (A1), implied media claims (A2), derivation rules (A3); #6 untested with a real joint leak (A5); #9 proven only at the render model (A6). |
| S2 prevention-first generation | #5, #6 | FALLS on #5; WEAKENED on #6 | Bound overstatement passes deterministic validation by construction (B1); the stated test is unexecutable as written (B2). Surviving value is citation enforcement (no unbound fragments). #6 prompt filtering sound; side channels untested (B4). |
| S3 provenance pointers | #5, #8 | WEAKENED | Happy path coherent. Depends on unstated preconditions: record immutability or re-verification on mutation (C1), authenticated minting authority (C2), conflict presentation consistent with the pointer contract (C3), a real event consumer (C4). |

## 6. Recommended next experiments (no implementation, test design only)

1. Run B1 as a literal experiment: 20 high-temperature generations from a
   two-claim input set, judged by a frozen rubric, measuring the
   strengthened-paraphrase acceptance rate under presence-only validation.
   This converts the S2 FALLS verdict from argument to measurement.
2. Write the flourish taxonomy the open question asks for, then run
   strengthened test S1-1 against it. The taxonomy is the load-bearing
   artifact; the verifier is only as strong as it.
3. Name the owner-assertion minting authority and its authentication, then
   run strengthened tests S3-2 and the Ask FYD injection variant. Until
   the minter is named, S3's #8 and S1's OWNER_ASSERTED path rest on
   trust without a trust root.
4. Define the Ask FYD handoff seam per section 4 (retrieval filtering,
   per-sentence bindings, deterministic triage computation) and write its
   falsifiable test before any claim that S1/S2/S3 cover Q&A.
5. Specify evidence-record mutability semantics (immutable with versions,
   or mutable with re-verification) and run strengthened test S3-1. The
   current spec is ambiguous, and both readings fail differently.
