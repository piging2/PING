# FAIL-9 Falsification: adversarial review of the four surviving mechanisms

**Date:** 2026-09-23
**Scope:** RESEARCH ONLY, no implementation code. This file attacks the four survivors
from `FAIL-9-conflict-collapse.md` (M1-M4). It does not confirm them.
**Method:** each survivor's own falsifiable test is run in the head against a concrete
adversarial case. The question in every section is the same: does the test *as written*
catch the attack? Where it does not, a strengthened test is specified.
**Verdict scale:** WITHSTANDS / WEAKENED / FALLS, with per-claim status for every
failure class the survivor claims to prevent.

No survivor WITHSTANDS unmodified. None FALLS outright. All four are WEAKENED, with
one claimed class (M3's #6) not surviving as a *prevention* claim.

---

## M1. Conflict as first-class evidence state (CONFLICTING class)

Claims to prevent: #9 (directly), #5, #8.

### Attack 1: conflict explosion via representation drift

The M1 test fixture is adversarially clean: two sources, two cleanly different values,
one field. Real harvesting input for one business looks like this: twelve sources for
`hours`, of which nine mean "8 to 5" but render it as "8-5", "8:00 AM - 5:00 PM",
"8a-5p", "08:00-17:00", "Mon-Fri 8-5", "Monday to Friday: 8am-5pm", "8 - 5" (trailing
space), and "8:00-17:00". If conflict detection is exact-string comparison over
(field, value) pairs across distinct sources, the graph fills with dozens of CONFLICT
records for semantically identical claims. Two consequences follow.

First, the genuine "8-5 vs 9-5" conflict is buried in formatting noise. M1 preserved
both sides of everything, which means it preserved the *signal* of nothing. The
No-ClaimAuthority rule needs downstream consumers to find the real disagreement;
preservation without discernment destroys information by noise rather than by merge.
The failure mode changes shape (false uncertainty everywhere) but the doctrine's
purpose is not served.

Second, avoiding the explosion forces a normalization step ("St." -> "Street",
"8a-5p" -> "08:00-17:00"), and normalization is a semantic authority. The cut list
rejected "LLM semantic comparison for conflict detection" on exactly the grounds that
it is a new authority, and open question 1 asks who owns the canonical
normalization. So M1 as specified is caught in a fork: without normalization it
explodes; with normalization it depends on an unowned authority that its own
grounding forbids. The cut list's detection criterion ("distinct sources,
non-identical values for the same field") is undefined until normalization exists,
because "non-identical" has no meaning across representations. The test never touches
this because its fixture has no representation drift.

### Attack 2: time-axis duplication

The fixture's observations carry `observed` timestamps. The test expects "both runs
produce the same graph contents." These two facts contradict each other: if claim
identity includes `observed-at`, the second run's refetch creates *new* observation
entities and *new* CONFLICT records, so the graph is never the same twice. If claim
identity excludes `observed-at` and dedups on (source, field, normalized value), the
test's determinism expectation can hold, but then the mechanism must state its
conflict-identity key, and it does not. Under the naive reading, every refetch cycle
duplicates every conflict. Over a year of weekly refetches, one genuine disagreement
becomes 52 CONFLICT records. The "resolution state" on the record becomes
meaningless: the owner resolves record #1 while records #2-52 sit UNRESOLVED for the
same disagreement, and M4's task queue (see below) refills from the duplicates.

### Attack 3: the projection is the merge's output slot

M1's #9 argument says "the merge has no place to write its output; the graph has no
slot for a 'resolved value' that lacks evidence records." But SiteSpec generation
must emit a single spec: one hours string in the page, one in the schema markup.
The projection *is* a place to write merge output. M1 relocates the merge from
storage to projection; it does not eliminate it. The storage-layer guarantee is real,
but the #9 claim is end-to-end ("prevents #9: Directly") while the mechanism is
storage-scoped. Notably, M1's own falsifiable test asserts Ask FYD answer behavior,
which is M2's mechanism, not M1's. The test cannot attribute a pass to M1 alone.

### Attack 4: retention TTL as slow-motion merge

M1 states "even a resolved conflict keeps both observations" and "never merged into
a single record," but it forbids only merging, not deletion. Any production system
adds evidence retention (storage cost, GDPR-style minimization, index hygiene). A
90-day TTL on observations deletes the losing observation; the CONFLICT record
survives pointing at a dead reference. The disagreement has no trace again: the
exact #9 failure, arrived at through an operational path the mechanism does not
forbid and the test does not exercise (the test runs acquisition twice with no
retention sweep between runs).

### Test-strength assessment: WEAK

The test as written catches none of the four attacks. Its fixture is clean, its
determinism expectation contradicts its own timestamped fixture, its answer-seam
assertion tests M2 rather than M1, it sets no bound on false-conflict rate, and it
never crosses a retention boundary.

### Strengthened test

- Fixture: the two-observation canonical conflict PLUS eight formatting-drift sources
  (list them explicitly: "8:00 AM - 5:00 PM", "8a-5p", trailing whitespace,
  "08:00-17:00", day-range expansions) and a third source agreeing with one side.
- Procedure: run acquisition and refetch (new observed-at); state the normalization
  rule and conflict-identity key under test before running.
- Expected: exactly one CONFLICT record for the genuine disagreement; zero CONFLICT
  records for formatting variants; graph stable across refetches (no time-axis
  duplicates); both observations and the CONFLICT record present.
- Add a retention-sweep step between runs: assert conflicted observations survive it.
- Drop the Ask FYD answer assertion from M1's test (it belongs to M2). M1's test
  asserts graph-level properties only: both observations present, CONFLICT record
  present with resolution state, no single merged hours record anywhere in the graph.
- What proves the mechanism does not work (additions): false-conflict count exceeds
  a stated bound; refetch duplicates conflicts; retention sweep deletes a
  conflicted observation.

### Verdict: WEAKENED

- #9: prevention holds at the *storage* scope only. The end-to-end "directly"
  claim overreaches; projection and answer seams are M2/M3's jurisdiction, and
  M1's test improperly claims their behavior.
- #5: storage-level only. A CONFLICTING class on the evidence does not by itself
  stop a downstream seam from binding the claim; that is M2's gate.
- #8: stands. Append-only owner corrections surviving regeneration is the
  strongest of M1's claims and none of the attacks touch it.
- New exposure the test must cover: conflict explosion (representation drift and
  time-axis duplication) and retention-boundary deletion.

---

## M2. Certainty attenuation at the answer seam

Claims to prevent: #9 (downstream symptom), #5 (all rendered factual claims).

### Attack 1: the footnote-burial loophole (prominence)

The gate "forces the answer into a hedge-or-disclose shape" and is "enforced as a
checkable property of the answer template." The test's expected observable: "the
answer names both sources and values (or names the policy winner plus the
disagreement)." Consider this answer, which satisfies the test verbatim:

"We are open 8-5. (Our Google listing says 9-5.)"

Both sources and values are named. The policy winner is stated. The checkable
property passes. And the pragmatic effect is false certainty: the declarative lead
sentence binds the claim, the parenthetical is skipped by most readers, and #5
claim-binding survives the gate wearing a disclosure fig leaf. The test has no
prominence or ordering requirement: it cannot distinguish "disclosure first, value
hedged throughout" from "confident declaration with a footnote." #9's
customer-visible harm (the winner stated as fact, with false confidence) is
reproduced inside a test-passing answer. Tone is unregulated too: "We are DEFINITELY
open 8-5 (Google disagrees)" names both sides and shouts the winner.

### Attack 2: agreement treated as truth (aggregator cascade)

The test's second fixture has two observations agreeing ("8-5", "8-5") and expects
the answer to "state the value plainly." But agreement is not truth. The most common
real-world shape of wrong hours is the aggregator cascade: six sources all scraped
the same stale feed and agree with each other. M2's gate keys on *disagreement*,
not on *evidence quality*. A claim with uniformly wrong but mutually consistent
evidence renders in full declarative grammar with M2's blessing. The mechanism's #5
claim ("a claim without evidence, or with conflicting evidence, cannot render in
declarative-fact grammar") is silent on the claim *with* consistent-but-worthless
evidence. The agreeing fixture assumes agreement equals truth and thereby tests
only the case where the gate is unnecessary.

### Attack 3: the machine-readable seam has no hedge grammar

The #5 claim says "the same gate applies to all rendered factual claims, not just
Ask FYD." A business page's most consequential factual claims are machine-readable:
schema.org `openingHours` JSON-LD, Open Graph tags, the knowledge-panel feed.
Schema.org has no hedge grammar. You must emit one value, emit nothing, or emit a
value with no provenance field the consumer reads. If the gate emits the policy
winner as `openingHours: "Mo-Fr 08:00-17:00"`, Google renders "9-5"-style certainty
in the knowledge panel while the visible page hedges politely. The #9 harm (false
certainty downstream) materializes at the seam the business cares about most, and
M2's test never looks there: it only queries Ask FYD. Omitting the field when
conflicted is itself a signal ("they hid their hours") and needs its own rule,
which the mechanism does not supply. The universal quantifier in "all rendered
factual claims" fails; what survives is "prose seams with hedge-expressive
grammar."

### Attack 4: the enforcer is unspecified, and the obvious enforcers are forbidden

"Enforced as a checkable property of the answer template, not as an LLM
instruction." If Ask FYD generates free text, enforcement is either pre-generation
(constrained decoding into template slots, which is real technology but unstated)
or post-hoc validation with rejection and regeneration. A post-hoc validator that
judges whether an answer "adequately discloses" the conflict is an LLM verdict on
semantics: the exact "new authority" the cut list rejected for conflict detection,
returning through the back door. A regex validator is gameable (Attack 1 passes
it). The mechanism does not say which enforcement technology it uses, and the test
supplies no adversarial answer suite, so there is no way to distinguish a real gate
from decoration. Note the tension: the stricter the checker, the more it resembles
the forbidden authority; the weaker the checker, the more Attack 1 walks through.

### Attack 5: boy who cried wolf (cross-mechanism with M1)

M2's signal quality is bounded by M1's precision. If the evidence graph carries
M1's false conflicts at scale (Attack 1 on M1), M2 forces hedge-or-disclose grammar
on nearly every answer. Users learn the hedge is noise and stop reading it; the
attenuation that was supposed to mark genuine disagreement becomes wallpaper. The
mechanism prevents #9's false certainty by spending a credibility budget it does
not measure. The test, with its single clean conflict, cannot see the depletion.

### Test-strength assessment: WEAK

The test catches only the gross failure (identical grammar across fixtures). It
accepts footnote burial, assumes agreement is truth, ignores machine-readable
seams, specifies no enforcer, and supplies no adversarial answer suite.

### Strengthened test

- Prominence requirement: the disagreement disclosure must precede any declarative
  value statement, or no declarative value statement may appear at all. Add an
  adversarial answer suite the checker must REJECT: declarative lead with buried
  parenthetical; confident tone plus hedge tokens appended; both values named but
  attribution swapped between sources; hedge tokens with a value neither source
  stated. The checker must also ACCEPT the canonical good shapes.
- Agreeing-but-wrong fixture: N sources agreeing on a value known to be wrong via
  a held-out ground truth (e.g., owner correction arrives later contradicting the
  unanimous sources). Expected: the mechanism's documented boundary is that M2
  does not catch this; the test records the boundary explicitly instead of
  implying agreement equals truth. If the doctrine wants more, it must say what
  evidence-quality signal gates plain statements, which is currently unspecified.
- Machine-readable seam: emit page-head structured data for the conflicting
  fixture. Expected: no single unqualified value emitted as fact. Either the field
  is omitted under a documented conflict-omission rule, or the conflict is
  expressed in a machine-readable way the mechanism defines. "We only gate prose"
  is an acceptable answer only if the #5 claim is narrowed to match.
- Enforcer declaration: the test names the enforcement technology (constrained
  decoding, template slots, post-hoc validator of a stated kind). If post-hoc and
  LLM-based, the design must answer the cut list's authority objection or drop
  the "not an LLM instruction" claim.
- False-conflict-rate bound: run M2's gate over a fixture with M1-style
  representation drift and assert the hedge rate stays below a stated bound, or
  document the boy-who-cried-wolf degradation as accepted.

### Verdict: WEAKENED

- #9: holds for *detected* conflicts at *prose* seams. The footnote-burial attack
  reproduces #9's customer-visible harm inside a test-passing answer, so the
  prevention claim needs the prominence requirement the test lacks.
- #5: narrowed. "All rendered factual claims" overreaches: machine-readable seams
  have no hedge grammar and are untested, and consistent-but-worthless evidence
  renders declaratively by design. What survives is "prose claims with detected
  conflicting evidence cannot render as unqualified fact," which is real but
  smaller than claimed.

---

## M3. Explicit, auditable source-priority policy (loser stays visible)

Claims to prevent: #9 (the "silent" half), #5 (rule-cited claims), #6
(visibility-error).

### Attack 1: the loser is visible to whom?

The mechanism's visibility guarantee is that "the losing observation is never
deleted; it remains queryable from the evidence graph." Queryable by whom? The
test checks retrievability from the graph, which is engineer queryability. The
visitor sees the rendered page: one value, no trace of the contest (unless M2's
prose gate adds it, which is M2's work). The owner sees the task queue (M4's
work). So M3's "loser stays visible" is satisfied by a log nobody outside
engineering reads, while every party harmed by a wrong pick experiences exactly
the silent pick M3 claims to prevent. "Silent" in the #9 failure means silent to
the people affected, not silent to the database administrator. The audit event
exists; the silence persists where it matters.

### Attack 2: policy authorship is the unaudited de-facto ClaimAuthority

The No-ClaimAuthority rule forbids a new authority that decides truth. M3 installs
a priority ranking, e.g. [owner-confirmed > website > google-listing], that decides
what the world sees for every conflict it touches. The ranking itself is a claim
about which sources are trustworthy. The audit event records *application*
("rule R3 fired, website outranked google-listing, policy v7") but never
*legitimacy*: who authored the ranking, on what evidence, for what scope. A
platform-wide default ranking is a single author silently winning thousands of
conflicts. Worse, the default encodes a factual bet that is wrong for whole
segments: for restaurants, an owner-verified Google Business Profile is often more
current than a brochure website untouched since 2019, yet a global
website-beats-listing default systematically shows the stale value, each render
"correct per policy." The audit trail is complete and the failure is invisible,
because the thing being audited (the pick) is downstream of the thing that is
wrong (the ranking). "We showed 9-5 because rule R3 fired" answers *which* rule;
nothing answers *why R3 ranks this way*.

### Attack 3: policy-version flip re-resolves at scale, silently

Bump the policy from v7 to v8, reordering website and listing priority, with no new
evidence. Thousands of pending conflicts flip winners. The audit log faithfully
records thousands of "rule fired" events. No owner task is generated (M4 fires on
conflict *detection*, and no new conflict was detected; the conflict already
existed). No owner notification is required by the mechanism. The system has
silently re-picked at scale with a perfect audit trail. This is #9's essential
harm (disagreements resolved without the affected parties knowing) wearing an
auditable costume. The M3 test never changes the policy version; it only adds an
owner correction, which is the one path where legitimacy is clear.

### Attack 4: the #6 claim is detection wearing prevention's name

Read M3's #6 argument carefully: "a private-fact leak shows up as a policy
violation in the audit trail rather than as an unexplainable merge artifact." The
leak *shows up*: after it rendered, in a log. That is detection, not prevention.
A mechanism that logs a privacy leak post-render does not prevent the leak; it
documents it. The test does not exercise any private/public conflict at all, so
even the detection half is untested. Additionally, nothing in M3 constrains policy
*validity*: a policy author could rank source-priority above safety policy, and
the audit log would faithfully record an unsafe render as "per policy" (this is
where open question 3 bites: M3 names no precedence between the priority ranking
and the safety gate, so the audit trail can certify the exact outcome #2 exists
to forbid).

### Attack 5: audit log integrity is assumed, not tested

"Decisions logged with rule+version" assumes the log is append-only, tamper-evident,
and readable by someone with standing to act. The test asserts events exist; it
does not assert they cannot be mutated, pruned by the same retention logic as
Attack 4 on M1, or silenced by a policy author editing history. A mutable audit
log reduces M3 to last-write-wins with a changelog.

### Test-strength assessment: WEAK

The test catches the gross failure (empty log, deleted loser). It does not test
policy authorship or legitimacy, policy-version flips, loser visibility beyond
engineers, the #6 case at all, safety-vs-priority precedence (Q3), or log
integrity.

### Strengthened test

- Legitimacy metadata: every audit event must record not only rule fired and
  policy version but the ranking's authorship (who wrote it, when, on what
  evidence, for what scope: global default vs per-business vs per-segment). A
  platform-wide default ranking applied to a business must be visible *to that
  business's owner* as an applied default, not just in an engineering log.
- Policy-version flip: bump the policy version reordering priorities with no new
  evidence. Expected: affected conflicts generate owner-visible notifications
  (or re-opened tasks); a flip that only writes log events FAILS the test.
  "Silent at scale" must be a named failure mode the test rejects.
- Loser visibility to non-engineers: assert the rendered page or the owner
  dashboard surfaces the existence of the disagreement (e.g., a "sources
  disagree" affordance), not just graph queryability. Engineer-only retrieval
  FAILS the strengthened test.
- #6 fixture (claimed, currently untested): a private-fact vs public-fact
  conflict. Expected: public render excludes the private fact AND the audit log
  records the tier decision AND the test distinguishes prevention (render gated)
  from detection (log entry after render). If the mechanism only detects, the #6
  claim must be restated as detection or cut.
- Safety precedence (Q3): a conflict where one side is an unsafe URL. Expected:
  the safety rule outranks the source-priority ranking by a stated precedence
  order, and the audit event shows the safety rule winning *over* the priority
  rule, not merely alongside it.
- Log integrity: assert append-only-ness across the retention sweep from M1's
  strengthened test.

### Verdict: WEAKENED, with the #6 prevention claim not surviving

- #9: prevents *untraceable* picks, not *illegitimate* picks. The "silent" half
  is only half addressed: silent to engineers is fixed; silent to owners and
  visitors is not, and policy authorship (the actual site of silent power) is
  unaudited.
- #5: stands. The rule-citation chain (claim carries the exact rule and version
  that selected it) is the strongest of M3's claims and none of the attacks
  touch it, provided the log-integrity gap is closed.
- #6: the *prevention* claim does not survive falsification. What M3 provides is
  post-render detection, by its own description, and even that is untested. Restate
  as detection or cut the claim.

---

## M4. Conflict surfacing as owner correction tasks

Claims to prevent: #9 (explicit routing), #5 (deferral to unresolved state), #8
(task loop as correction lifecycle).

### Attack 1: owner-absent paralysis, the steady state

M4 assumes an owner who answers tasks. For harvested businesses with no engaged
owner (the majority of any harvested corpus), conflicts never resolve. The site
then permanently renders hedged uncertainty ("sources disagree about our hours"),
which is worse for the business than a wrong-but-clean pick: it advertises
dysfunction to every visitor. Nolan's stated moat is "FYD becomes progressively
more accurate than the web it ingested"; a site permanently unsure of its own
hours is not progressively more accurate. The M4 test *blesses* this as expected
behavior: no owner correction, two refetch cycles, conflict UNRESOLVED, "exactly
one open task." The test has no staleness bound, no escalation, no fallback, so it
certifies permanent paralysis as success. Note the convergence: the cut list
rejected "always ask the owner" as the sole mechanism because it blocks on human
availability. M4's defense is that M2/M3 provide non-silent interim behavior. But
in the owner-absent steady state the interim behavior *is* the permanent behavior,
the task queue is a write-only log, and M4 has converged to the cut sibling's
failure mode. M4's marginal prevention over M2+M3 is zero for every business
whose owner never engages, which the mechanism never states as a precondition.

### Attack 2: task flooding and the granularity trap (Q5)

One field, one conflict, one task: the test fixture. A real harvested business has
dozens of conflicting fields across a dozen sources. Per-field tasks mean 40 tasks;
no real owner does 40 micro-adjudications, so the queue goes bankrupt and Attack 1
takes over. Per-business bundled tasks ("your listings disagree in 12 places")
cannot be resolved in "one action" the way the mechanism promises, so the task is
unresolvable as specified and gets abandoned, which is also Attack 1. Either
granularity breaks the "one-action resolution path" promise, and the test's
"exactly one open task" assertion does not generalize.

### Attack 3: the resolved-then-refetch nag loop (M4's #8 sentence backfires)

M4's #8 argument: "a later conflicting refetch reopens the conflict as a new task
instead of overwriting the owner's answer." Walk it forward. Owner asserts hours
are 8-5 (OWNER_ASSERTED). The Google listing still says 9-5 and will say 9-5
forever, because nobody corrects Google. Every refetch cycle detects owner/website
(8-5) vs Google (9-5) and, per the stated rule, reopens the conflict as a new
task. The owner, who already adjudicated this, gets nagged monthly forever about
a settled question. This trains the owner to ignore the queue, which feeds Attack
1. The correct behavior is adjudicated-suppression: an owner resolution suppresses
future tasks against the *same* losing source+value (the recurring disagreement is
expected staleness, not new information), while a *new* disagreeing value reopens.
M4 as written mandates the spam loop. The test never exercises the
resolved-then-refetched path at all: its fixture contains *no owner correction*,
so "conflicts only resolve via owner action" is asserted by a test that never
performs an owner action.

### Attack 4: contested ownership (Q6)

Two people claim to be the owner; both submit corrections; each enters as
OWNER_ASSERTED. M4's task queue is "the only legitimate sink for a conflict
record," but the sink is now contested and the mechanism has no adjudication rule
for OWNER_ASSERTED vs OWNER_ASSERTED. Identity of the owner is load-bearing, and
the doctrine explicitly does not solve identity resolution. The options are all
bad: pick one silently (violates "do not silently pick" and No-ClaimAuthority),
freeze (Attack 1 with extra steps), or escalate to a human process the mechanism
does not define. The test does not touch this.

### Attack 5: task identity instability (cross-mechanism with M1)

The test asserts "no duplicate tasks accumulate." But if conflict identity includes
`observed-at` (M1 Attack 2), each refetch is legitimately a *new* conflict, so new
tasks are "correct" per the rules and the queue floods anyway. The dedup
invariant must be defined on (field, normalized value pair, source pair),
excluding timestamps, or the "exactly one open task" assertion is unsatisfiable in
production.

### Test-strength assessment: WEAK

The test catches the gross failure (conflicts evaporating silently, projected
values flipping without owner action). It never exercises the owner-action path,
never crosses a resolved-then-refetch boundary, sets no owner-absent bound,
ignores granularity, and ignores contested ownership. Most damningly, its fixture
omits the very actor the mechanism is named for.

### Strengthened test

- Owner-action path (currently untested): owner resolves the task setting 7-4.
  Expected: conflict moves to RESOLVED, OWNER_ASSERTED evidence is appended (not
  an in-place edit), projection updates, and the task closes.
- Resolved-then-refetch: after the owner resolution, refetch with the same losing
  source+value (Google still 9-5). Expected: NO new task (adjudicated-suppression
  of the known-stale loser). Then refetch with a NEW disagreeing value (Google
  changes to 10-6). Expected: a new task opens, because this is new information.
  The current "reopens as a new task" rule must be refined to distinguish these,
  or the test fails it for nag-spam.
- Owner-absent bound: N refetch cycles with no owner action. Expected: the
  conflict remains UNRESOLVED (keep the no-silent-resolution assertion) AND a
  defined staleness behavior exists (task marked STALE/ESCALATED after K cycles,
  or projection falls back to a declared default *with disclosure*). Infinite
  UNRESOLVED with no bound FAILS the strengthened test.
- Flooding: fixture with K conflicting fields. Expected: bounded queue behavior
  is specified and observed (bundling, prioritization, or cap), and the
  "one-action resolution" promise is either kept per task or restated.
- Contested ownership: two OWNER_ASSERTED corrections from distinct claimant
  identities. Expected: the system does NOT pick one silently; it enters a
  stated identity-contest state (per Q6, which must then be answered).
- Task identity: refetch with new observed-at but identical values. Expected:
  still exactly one open task (dedup key excludes timestamps).

### Verdict: WEAKENED

- #9: the silent-self-resolution path is genuinely closed, and the test's core
  assertion (no evaporation, no silent flips) is real. This is M4's strongest
  contribution and it stands.
- #5: deferral to the unresolved state holds while tasks are live, but under
  owner absence it degrades to permanent public mush; the mechanism converts a
  binding failure into an availability-of-certainty failure without a bound.
- #8: the correction lifecycle holds, but the reopen rule as written creates the
  nag loop; it needs adjudicated-suppression to survive contact with a
  never-corrected losing source.
- Unstated precondition the mechanism must declare: an engaged, singular,
  responsive owner. Outside that precondition, M4's prevention claims are carried
  by M2+M3 alone, and M4 converges to the cut sibling's failure mode.

---

## Cross-mechanism findings

1. **Attribution leak in M1's test.** M1's falsifiable test asserts Ask FYD answer
   behavior, which is M2's mechanism. A test that passes only because another
   mechanism works cannot falsify the mechanism under test. Each survivor's test
   must assert only its own layer: M1 graph contents, M2 answer grammar, M3 audit
   events, M4 task queue transitions.

2. **The cut list's rationale contradicts Q1, and M1 inherits the contradiction.**
   The cut list demands evidence-grounded detection via "non-identical values"
   while rejecting semantic comparison as a new authority. But "non-identical"
   across representations *is* a semantic judgment, which requires the
   normalization owner Q1 asks for. Until that owner is named, M1's detection
   criterion is either undefined or smuggled.

3. **M2's signal is bounded by M1's precision.** Attenuation grammar spent on
   false conflicts (M1 Attack 1) teaches users to ignore it. The four mechanisms
   are usually discussed as independent layers; falsification shows M2 degrades
   in direct proportion to M1's false-conflict rate, which no test measures.

4. **The visibility chain terminates at engineers.** M3's "loser stays visible"
   means graph-queryable; M4's "visible tasks" means visible to an owner who may
   not exist. The harmed parties (visitor seeing a wrong pick, owner never told
   the policy flipped) are downstream of every visibility guarantee. "Visible"
   needs an audience in the spec, per mechanism.

5. **M4 converges to its cut sibling.** "Always ask the owner" was cut for
   blocking on human availability; M4 with M2/M3 as interim behavior reconverges
   to it in the owner-absent steady state, which is the majority regime for
   harvested businesses. The >=2-classes survival rule evaluated M4's best case,
   not its steady state.

6. **Q3 remains unattacked by any test.** No survivor's test puts an unsafe URL on
   one side of a conflict. M3's strengthened test above is the first to require a
   stated safety-vs-priority precedence. Until then, the audit trail can certify
   the outcome #2 exists to forbid.

---

## Summary

| Survivor | Verdict | #9 conflict-collapse | #5 claim-binding | #8 correction-loss | #6 visibility-error |
|---|---|---|---|---|---|
| M1 first-class CONFLICTING state | WEAKENED | Holds at storage scope; end-to-end claim overreaches | Storage-level only; downstream binding is M2's job | Stands (strongest claim) | Not claimed |
| M2 certainty attenuation | WEAKENED | Holds for detected conflicts at prose seams; footnote burial reproduces the harm | Narrowed: prose seams only; machine-readable seams and agreed-but-wrong evidence unhandled | Not claimed | Not claimed |
| M3 auditable priority policy | WEAKENED | Prevents untraceable picks, not illegitimate picks; authorship unaudited | Stands (rule-citation chain), pending log integrity | Not claimed | Prevention claim does not survive; detection only |
| M4 owner correction tasks | WEAKENED | Silent self-resolution genuinely closed | Deferral holds; degrades to permanent mush without owner | Holds, but reopen rule needs adjudicated-suppression | Not claimed |

**Bottom line for the parent orchestrator:**

- Every survivor's falsifiable test is WEAK as written: clean fixtures, missing
  adversarial cases, and in M1's case an assertion that belongs to M2. The
  strengthened tests above are the minimum for any claim that a mechanism
  "prevents" its classes.
- The single hardest falsification result: M3's #6 *prevention* claim does not
  survive. Its own description is detection-after-render. Restate or cut.
- The single most load-bearing unstated assumption: M4 requires an engaged,
  singular, responsive owner. Name it as a precondition or the owner-absent
  steady state (the majority regime) is certified failure.
- The single deepest structural crack: normalization ownership (Q1). It is
  required by M1, forbidden as an authority by the cut list's rationale, and
  unowned by the doctrine. Nothing downstream (M2's hedge budget, M4's task
  queue) is well-defined until it is answered.
