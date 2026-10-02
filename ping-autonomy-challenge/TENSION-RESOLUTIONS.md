# TENSION RESOLUTIONS: the 5 assigned class-interaction tensions

Date: 2026-09-23. Mode: research only. No implementation code.
Purpose: propose resolutions for the two unresolved antagonistic pairs
(A4, A5) and the assigned unresolved tensions (U2, U4, U7, U10) from
CLASS-INTERACTIONS.md. Each resolution states the recommended design, why
it balances both sides, and a falsifiable test (input, procedure, expected,
falsifier). Anything not resolvable from the reports is marked RESIDUAL
with the reason.

Sources: CLASS-INTERACTIONS.md, CONTRADICTION-RESOLUTIONS.md (FLAG 1-5),
MERGED-typed-seam-falsification.md (Attack C), FAIL-6-falsification.md,
FAIL-8-falsification.md, FAIL-9-falsification.md.

Note: no em dashes are used in this document.

---

## R1. A4: the availability twin for fail-closed URL policy

### The problem, restated

MERGED-typed-seam-falsification Attack C: the merged abstraction stacks
fail-closed gates in series with no availability bound and no false-positive
budget anywhere. Documented casualties: tel: with ;ext=, IDN/punycode
domains, mailto: with query params silently over-blocked (FAIL-2
falsification C1). Silent breakage creates business pressure to add broad
exceptions ("skip validation for owner-entered values"), and that exception
reopens #2. A safety mechanism that predictably generates the incentive to
disable it is not a stable mechanism.

### Recommended design: the availability twin

Every fail-closed assertion is paired with its twin, and the twin has three
clauses.

**Clause 1: the corpus SLA (the bound).** A canonical legitimate-variety
corpus is a versioned pipeline input: tel: with ;ext=, IDN/punycode domains,
mailto: with query params, new gTLDs, and SafeDataUrl inline images scoped
per sink (the data: case from FAIL-2 open question 1, with the
SURVIVOR-ROSTER condition: a data: exception ships only per-sink-scoped to
img/srcset, never as a general URL allowance). The bound is: 100 percent of
the corpus renders in full functional form, enforced in CI on every pipeline
change and on a production sample. This is the availability SLA, stated as a
test, not a wish.

**Clause 2: telemetry completeness (measured how).** Every neutralization,
denial, and coercion emits a structured event to a readable observation log.
A silent degradation (a render degraded with no log event) falsifies the
stability half. Denial rate per gate is a measured metric with an alert
threshold: a rising denial rate pages the registry owner before business
pressure accumulates. The owner's own broken links surface to the owner
("your tel: link was neutralized, case id 4821"), which converts pressure
into a report.

**Clause 3: exception discipline (who owns exceptions).** The pressure vector
is the business owner asking to skip validation. The answer: the exception
registry is owned by the seam module maintainer (the platform side), never
by the business owner and never by the generation pipeline (the party most
tempted to bypass). Exceptions are versioned data, never code branches; each
record names the validation rule it refines, the corpus case that justified
it, the reviewer, and an expiry. The structural ban, enforced at registry
load: an exception may only refine classification (move an input from
"indeterminate" to a known-safe class carrying its own validation rule); it
may never route around validation, and no exception may widen a sink's
allowlist to admit an unvalidated value. "Skip validation for owner-entered
values" is a rejected shape, not a reviewable one. Blocked items get typed
retirement/supersede paths (F7 xviii) so pressure has a forward path that
is not an exception.

### Why it balances both sides

Availability gets its own testable guarantee (the corpus SLA) and a feedback
loop that converts exception pressure into corpus growth: when the gate is
too coarse, the pressure is legitimate signal, and the twin absorbs it by
widening precision, not by removing checks. Security keeps the fail-closed
invariant because exceptions add precision, never bypass; the #2 prevention
claim is unchanged in strength, and the mechanism becomes stable because the
incentive to disable it now has a cheaper legitimate outlet (file a corpus
case) than the dangerous one (skip validation).

### Falsifiable test

- **Input.** A fixture with three parts: (a) a hostile battery: literal
  `javascript:`, entity-encoded and tab-smuggled variants, `data:text/html`
  aimed at non-img sinks, an SVG data URL aimed at an iframe-src sink;
  (b) the full legitimate corpus (tel: with ;ext=, IDN/punycode, mailto:
  with query params, new gTLDs, per-sink SafeDataUrl images); (c) a poisoned
  exception registry entry shaped as "skip validation for owner-entered
  values," plus a hostile URL carrying an owner-entered provenance flag.
- **Procedure.** Load the exception registry and assert the load result.
  Run the full pipeline over the fixture. Inspect all rendered channels
  under the strengthened oracle (entity-decode, WHATWG-parse every
  URL-valued attribute, per-sink scheme/origin allowlist). Inspect the
  observation log for every denial, neutralization, and coercion.
- **Expected.** The registry load rejects the bypass-shaped entry (schema
  constraint: every exception must name a validation rule it refines).
  The legitimate corpus renders in full functional form. Every hostile URL
  is refused or neutralized, including the owner-entered one: owner
  provenance changes nothing about validation. Every action appears in the
  observation log.
- **Falsifier.** Any executable hostile URL in any rendered channel; any
  legitimate-corpus value degraded; any silent (unlogged) neutralization;
  any accepted bypass-shaped exception; any exception path that emits a
  URL-typed value without that value passing the sink's scheme/origin
  allowlist.

### Residual

The numeric alert threshold for denial rate and the default exception
expiry are policy calibrations, not derivable from the reports. The design
above is resolved; the numbers are inputs for Nolan's doctrine.

---

## R2. A5: preview as a session-bound license (no bearer URL tokens)

### The problem, restated

FAIL-6 S1 attack 5: preview tokens travel in the URL, and the capability
then moves through channels the gate does not govern (browser history,
shared links, referer headers, crawlers). An owner shares a preview link;
the recipient's anonymous request presents the token; the gate sees "owner
context" and binds private objects. The gate is correct per request and the
leak still happens. Companion shapes: preview/public cache-key confusion
(S3 attack 3), the denial log as an existence channel (attack 6), and the
unguarded marking authority (open question 2).

### Recommended design

Preview is an owner-context license **on the same single gate** (answering
FAIL-6 open question 1: same gate, owner context; a separate pipeline would
need its own full gate and duplicate the already-incomplete trust root from
MERGED-typed-seam Attack A).

- **No bearer tokens, ever.** The preview license binds to the
  authenticated owner session. The /build preview path requires the owner
  session; the gate reads visibility context from trusted session context
  (CONTRADICTION-RESOLUTIONS FLAG 5 knowability rule: check what the system
  knows, whose session this is, never a token from the request).
- **Shareable preview grants.** For non-owner reviewers, a grant is a
  record: grant id, tenant, scope, named recipient identity, expiry
  (default 24h, maximum 7 days, no permanent grants), revocation flag. The
  URL carries the grant id as a **claim check only**: presenting the URL
  without an authenticated session bound to the named recipient yields the
  public view (private objects withheld) plus a sign-in prompt. The gate
  honors the grant only when grant id plus bound recipient session plus
  unexpired plus unrevoked all hold. Forwarding the link transfers nothing
  usable. Owner usability is preserved: sharing is one link, the recipient
  signs in once, the grant is time-boxed and revocable from the owner
  surface.
- **Explicitly cut: anonymous bearer preview links.** A token in the URL
  sufficient for private access is the vulnerability shape; no gate-side
  fix can govern browser history, referer headers, and crawlers, so the
  capability must not be completable from the URL alone. The product cost
  (no frictionless anonymous share of private previews) is stated, not
  hidden.
- **Cache.** The cache key function includes the visibility context
  (tenant id plus session class or grant id); the assertion is on the key
  function, not just on output (S3 strengthened test 3). Preview responses
  carry private, no-store. A preview-keyed entry is never served to a
  non-matching context.
- **Denials.** Uniform not-found to the requester: a denied private object
  is indistinguishable from an unknown id (same status, same body shape).
  The internal denial log records the event class with opaque,
  non-enumerable object references and never plaintext values; the log is
  access-controlled and itself behind the gate (answers attack 6).
- **Marking authority (open question 2).** "Make public" is a capability,
  not a button: owner-authorized, reason-coded, logged, reversible.
  Exposure-increasing or bulk markings require step-up (second approver or
  explicit confirmation); a mass marking trips a circuit breaker that holds
  publish pending approval (FAIL-6 S2 strengthened tests 2 and 5).

### Why it balances both sides

Owner usability: zero friction inside the owner's own signed-in session
(the dominant workflow); shareable grants with one sign-in step,
time-boxed, revocable, listed with countdowns on the owner surface. #6:
there is no bearer capability in the URL to leak, the cache cannot confuse
contexts by key construction, denials leak no existence, and the marking
authority is guarded. The jurisdiction problem is solved structurally: the
URL is made insufficient by design instead of attempting to govern the
channels the URL travels through.

### Falsifiable test

- **Input.** A site with private-typed objects; an owner session; a
  preview grant URL naming a recipient; the production cache layer in
  front.
- **Procedure.** (1) Owner session requests preview: expect private
  objects bound, response headers private/no-store. (2) An anonymous
  client replays the grant URL with no session: expect the public-only
  view, zero private bytes, plus a sign-in prompt. (3) Owner-preview then
  anonymous through the cache: assert the cache key function's output
  includes the visibility context; the anonymous response contains zero
  private bytes. (4) Anonymous probes a known-private object id and an
  unknown id: expect indistinguishable uniform not-found responses.
  (5) Attempt a public marking from a non-owner actor class, and a bulk
  marking from the owner: expect refusal and a step-up hold respectively.
  (6) Sweep the denial log for plaintext private values.
- **Expected.** The grant URL alone is inert; keys diverge by visibility
  context; denials are uniform; the log carries no plaintext values;
  markings follow the capability path.
- **Falsifier.** Any private byte served to an unauthenticated or
  wrong-context session; any cache key collision across visibility
  contexts; any distinguishable denial (status, body shape, or timing
  beyond tolerance); any plaintext private value in logs; any public
  marking without owner authorization, log entry, and reversibility; any
  bulk or exposure-increasing marking without step-up.

### Residual

None on the architecture. The grant expiry defaults (24h/7d) are proposed
policy values; the mechanism is resolved.

---

## R3. U2: the two-layer rule (interim selection vs conflict resolution)

### The problem, restated

FAIL-8 S2 auto-resolves source-vs-owner disagreement at merge time (owner
wins the tie, event emitted) while FAIL-9 M4 demands that a conflict move
to resolved ONLY via owner action and never resolve itself. Both cannot be
true for the same disagreement. And the owner-vs-owner axis has no rule at
all: the decision store silently last-write-wins (MERGED-correction attack
b; FAIL-8 falsification Attack B), which is the cut last-writer-wins
candidate returning through the back door.

### Recommended design: separate what renders from what is resolved

The contradiction dissolves once S2 and M4 are seen to govern different
transitions. S2's merge-time behavior is **interim effective-value
selection** (what renders while the conflict is open); M4 governs the
**conflict record lifecycle** (when OPEN becomes RESOLVED). The unified
rule:

**Layer 1: interim selection (the merge/projection policy).** For a
corrected-fact field where the owner asserted an explicit value, the
interim effective value is the owner value (S2's behavior, narrowed per
CONTRADICTION-RESOLUTIONS FLAG 1: corrected-facts only, never
confirm-facts; the losing source value survives as a named visible record;
the conflict carries the lifetime policy with default and clock). The
interim is always labeled provisional on the owner-facing surface ("held
by owner assertion, source disputes"), never presented as settled; the
render cites the interim priority rule and the open conflict (M2
attenuation plus M3 rule citation, exactly FLAG 4's fallback-contract
clause (a)). Confirm-facts get no interim auto-win: a confirmation does
not extend to a value the owner never saw, so the conflict is emitted and
the interim follows the stated confirm-fact policy. **Owner-vs-owner:**
two owner assertions on the same field create a typed OWNER_DISPUTE
record, never a silent pick. Interim effective value is the **earliest
assertion** (deterministic, race-free; recency would reward overwrite
races). Both assertions are preserved, named, and visible. Last-write-wins
on this axis is banned by name: it is the cut entry arriving through the
back door.

**Layer 2: resolution (the record lifecycle).** A conflict moves OPEN to
RESOLVED only through (a) an owner task action naming the resolution
(M4), with supersession accounting per FAIL-8 strengthened test 2
(accept-source marks the patch superseded with actor, timestamp, reason,
retained not deleted; keep-mine re-binds the approval to the new base
digests or flags stale binding); or (b) the pre-declared fallback
contract from FLAG 4 (staleness bound, declared default, named event,
disclosed). Merge-time code never writes RESOLVED. Interim picks never
become resolutions by aging. The task the merge opens (M4) carries the
interim selection (S2) as its labeled provisional starting state, so the
two mechanisms compose instead of contradicting.

Required wording repair: S2 must stop saying it "resolves" the tie; it
selects the interim value and opens the conflict. M4 must stop implying
the render waits for the owner; the render uses the interim policy while
the conflict is open.

### Why it balances both sides

S2's merge-time owner preference is preserved where #8 needs it (a new
source must not silently overwrite an owner assertion), but it is
demoted from "resolution" to "provisional interim," which is what #9
needs (the disagreement stays a live, visible, clocked conflict until
adjudicated). M4's only-via-owner-action rule is preserved for the
record lifecycle, which is what "never resolve itself" means. The
owner-vs-owner gap gets a typed state, a deterministic interim, and a
resolution path instead of silent last-write-wins.

### Falsifiable test

- **Input.** A fixture with: (i) an owner-corrected phone C with a new
  source saying B; (ii) a confirm-fact email E with a new source saying
  E2; (iii) two distinct owner identities asserting conflicting values D1
  then D2 on the same field.
- **Procedure.** Run the merge; assert the conflict record state and the
  effective value. Run N further regens with the source still saying B
  and no owner action. Resolve the phone conflict via owner task as
  "accept source" and inspect the decision store. On the owner-vs-owner
  axis, serve twice after D2 is recorded.
- **Expected.** (i) Effective C, conflict OPEN, B named and visible on
  the owner-facing surface, no RESOLVED written; after N regens still
  OPEN, still surfaced, the FLAG-1 clock policy discoverable. (ii)
  Confirm-fact: conflict emitted, no auto-win, interim follows the
  stated confirm-fact policy. (iii) OWNER_DISPUTE record created;
  effective value deterministic across serves (earliest assertion D1);
  both assertions preserved and named. Task resolution writes RESOLVED
  with supersession accounting: the losing assertion retained, marked
  superseded, actor and timestamp recorded.
- **Falsifier.** Any RESOLVED written by merge-time code; any effective
  value computed as last-write-wins on the owner axis; any dispute not
  surfaced on the owner-facing surface; any confirm-fact auto-winning a
  tie; any resolution that deletes the losing assertion instead of
  superseding it; any self-resolution without the named fallback event.

### Residual

**Contested ownership is out of scope.** This rule requires
distinguishable, authenticated owner identities as a precondition. When
the actor set itself is disputed (two parties each claiming to *be* the
owner, FAIL-9 M4 Attack 4), the mechanism must enter a stated
identity-contest state and freeze the dispute; the adjudication process
is unspecified. Reason: no mechanism in the set authenticates owner
identity beyond demo-grade (FAIL-8 open question 2); building an
identity court here would be a new authority beyond what the reports
support.

---

## R4. U4: the conflict-detection criterion (verify and extend FLAG 2)

### Verification of CONTRADICTION-RESOLUTIONS.md FLAG 2

FLAG 2 resolved the core fork: bless **deterministic, versioned, declared
canonicalization rules** as data, with the owner-supervised alias table as
the per-tenant extension mechanism, and forbid any model verdict on the
detection path. This answer is verified against U4's two horns:

- Horn 1 (the explosion): normalization exists, so "St." vs "Street" and
  "8a-5p" vs "08:00-17:00" do not generate false conflicts. M1's detection
  criterion ("distinct sources, non-identical values for the same field")
  becomes well-defined: "non-identical" means non-identical after
  canonicalization under the declared rule version.
- Horn 2 (the forbidden authority): the cut forbade *model verdicts* as a
  ClaimAuthority. The rule table is not a verdict: it manufactures no
  facts, changes no claim, and reassigns no evidence class; it is
  deterministic, replayable, reviewable, and byte-verifiable across
  processes and time, with its version participating in the input hash
  exactly like rendererVersion in FAIL-4 S1. The cut's rationale does not
  touch data the pipeline reads; it touches judgments the pipeline makes.

The resolution stands. What follows extends it in three places the FLAG 2
text leaves open.

### Extension 1: the admissibility boundary (what counts as normalization)

A rule is admissible iff it is **information-preserving**: the canonical
form must assert nothing the source variant did not assert and drop
nothing it did assert. The admission test is decidable: a held-out judge
reading the source variant must agree the canonical form says the same
thing. Each rule carries the variant pairs that justified it as review
evidence. Rules that add content (inferring "closed Sundays" from
absence), drop content, or interpret ambiguity ("open late" to "22:00")
are semantic verdicts and are cut, even if deterministic. Declared
assumptions ride with the rule as data (e.g., "Mon-Fri expands per ISO
week starting Monday" is reviewable; a silent locale assumption is not).

### Extension 2: dissolving the enforcement-strictness tension

U4 notes the enforcement-shaped tension: the stricter the M2 checker, the
more it resembles the forbidden authority; the weaker, the more attacks
walk through (FAIL-9 M2 Attack 4). The dissolution is layer separation:
the checker gets stricter through a **deterministic adversarial answer
suite**, which is data like the rule table, never through model
judgment. Humans author adversarial answers (footnote burial, tone
shouting, swapped attribution, hedge tokens on unstated values); the
checker runs deterministic assertions (disclosure precedes any
declarative value statement; prominence ordering; the canonical good
shapes accepted). Strictness and the forbidden authority are different
axes: the forbidden shape is a model verdict at runtime; a large,
versioned, reviewable adversarial suite with deterministic assertions is
strict without being an authority. The suite is versioned and
reviewable, and where possible generated from the channel registry (the
FAIL-6 S4 structural answer) so it does not rot like a hand-maintained
list.

### Extension 3: the U3 link (making the hedge budget meaningful)

The false-conflict rate is measured **against the table**: each false
conflict names the missing rule as a table-gap filing to the table owner.
The U3 hedge budget is then spent only on genuine conflicts, which is
what makes the budget a product-level guarantee instead of a noise
meter. M1's strengthened test gains a clause: false-conflict count
exceeding the stated bound with no table-gap filing is a mechanism
failure, not a data problem.

### Falsifiable test

- **Input.** The twelve-variant hours fixture (FAIL-9 M1 Attack 1) plus
  one genuine 9-5 disagreement; a proposed table rule that is actually
  interpretive (maps "open late" to "open until 22:00"); a review queue
  containing it.
- **Procedure.** Run acquisition in two separate processes with different
  wall clocks. Inspect the rule table version and the input hash. Attempt
  to land the interpretive rule through review. Rerun detection with
  model egress blocked. Bump the table version with no other change and
  re-inspect the input hash and the conflict record.
- **Expected.** Byte-identical canonical forms and identical verdicts
  across processes: exactly one CONFLICT for the genuine disagreement,
  zero for formatting variants. The interpretive rule is rejected at
  review (fails the information-preservation admission test). The input
  hash changes on the version bump and the new version is named in the
  conflict record. Detection completes with model egress blocked (no
  model invocation on the path).
- **Falsifier.** Any model invocation on the detection path; any
  content-adding or content-dropping rule surviving review; cross-process
  verdict divergence; a table bump that does not change the input hash;
  a false-conflict rate exceeding the stated bound with no table-gap
  filing to the table owner.

### Residual

The review process that keeps the base rule set honest (who approves a
new mapping, what evidence justifies it) is a governance decision for
Nolan, already deferred to the grilling brief by CONTRADICTION-RESOLUTIONS.md;
it is not derivable from the reports. The numeric false-conflict bound is
likewise a calibration input.

---

## R5. Operational contracts: U7 (preview distribution) and U10 (quarantine drain SLA)

### U7: preview distribution contract

Every preview grant is an operational object with an owner, an expiry, and
a revocation path: each grant names the granting owner identity, the
recipient identity, the tenant and scope, an expiry (default 24 hours,
maximum 7 days, no permanent grants), and a revocation flag the owner can
flip at any time; grants are listed on the owner-facing surface with their
expiry countdowns, expired or revoked grants fail closed to the public
view, and any preview access attempt against an expired or revoked grant
emits a denied-preview event to the observation log; the support path for
"the preview link does not work" is re-issue, never token elevation; and
no process may mint a grant with a scope wider than the granter's own
visibility license. (Falsifier: a grant with no named owner, no expiry,
or a scope exceeding the granter's license; an expired grant that still
binds private objects; a support flow that restores access by weakening
the grant check.)

### U10: quarantine drain SLA

Every quarantined item carries an owning party (the acquiring pipeline
operator by default), a shape class (critical vs non-critical, declared
per shape), a drain SLA (triage within 5 business days for critical, 20
for non-critical; proposed defaults), and exactly one disposition:
REPAIRED (shape fixed and re-ingested), DECLINED (permanently declined
with a recorded reason, reviewable), or ESCALATED (unresolved at SLA,
moved to a named human queue with the item still withheld from
onboarding); quarantined critical shapes block that tenant's onboarding
until dispositioned, non-critical shapes trail onboarding behind a
visible "data quality" badge on the owner surface; a quarantine-age
metric is reported per tenant, and any item exceeding its SLA without
disposition is a named contract violation, never silent attrition; the
dual-parser cross-check sampling rate is set from the quarantine inflow
rate so the detection tax stays budgeted, and if inflow exceeds drain for
two consecutive periods, sampling is held and the operator is paged
rather than the quarantine silently becoming /dev/null. (Falsifier: a
quarantined item with no owner or no SLA; a critical shape onboarding
while quarantined; an item aging past SLA with no ESCALATED event; a
sampling-rate change with no inflow-rate justification.)

---

## Cross-links and what this document does not claim

- **U1 (the S2 clock):** adopted as a precondition inside R3 via
  CONTRADICTION-RESOLUTIONS FLAG 1 (conflict lifetime policy with default
  and clock); the clock's numeric defaults remain open policy inputs.
- **U3 (hedge budget):** R4 Extension 3 makes the budget measurable by
  spending it only on genuine conflicts; the budget numbers themselves
  are not designed here.
- **U5 (unsafe-side conflict precedence):** assumed as a standing rule
  in the R1 and R2 tests (the safety rule outranks the source-priority
  ranking; the conflict record preserves both sides while the renderer
  never emits the unsafe one, per FAIL-9 M3's strengthened test). Not
  re-derived here.
- **U6:** resolved by R1 (this is the A4 twin under its U-number).
- **U8, U9:** untouched; they belong to the #4/#7 pair and are outside
  this task's scope.

## Residuals consolidated

1. Numeric calibrations are policy inputs, not derivable from the
   reports: the A4 denial-rate alert threshold, exception expiry
   defaults, grant expiry defaults (24h/7d proposed), the U4
   false-conflict bound, and the U10 drain SLA defaults (5/20 business
   days proposed).
2. Base canonicalization rule governance (who approves new mappings,
   what evidence justifies them): deferred to the grilling brief.
3. Contested ownership adjudication (disputed actor sets): the doctrine
   does not solve identity resolution; R3 freezes such disputes in a
   stated identity-contest state.
4. Anonymous bearer preview links are cut, not postponed: the product
   cost (no frictionless anonymous sharing of private previews) is a
   stated tradeoff of R2.
