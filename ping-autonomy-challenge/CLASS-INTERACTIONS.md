# CLASS INTERACTION MATRIX: the 9 FYD failure classes are not independent

Date: 2026-09-23. Mode: research only. No implementation.

Sources: all 9 `failures/FAIL-[1-9]-*.md` mechanism reports, the 8 falsification files,
the 4 MERGED-*-falsification files, CUT-LOG.md, SURVIVOR-ROSTER.md.
No em dashes are used in this document.

Class key: #1 mobile-overflow | #2 unsafe-url | #3 graph-blindness |
#4 fixture-drift | #5 claim-binding | #6 visibility-error |
#7 clone-sitespecs | #8 correction-loss | #9 conflict-collapse

## How to read the matrix

Rows are the class being prevented (A). Columns are the class put at risk (B).
The question per ordered pair: does a NAIVE prevention of A risk causing B?
Cell codes:

- `S` : SYNERGISTIC. A surviving mechanism naturally covers both A and B
  (a merge family member; citation in the pair notes).
- `N` : NAIVE-RISK. Naive prevention of A risks causing B, with a specific
  mechanism or cut entry cited. A surviving mechanism usually exists that
  avoids the naive form; the pair notes name it.
- `A` : ANTAGONISTIC. Preventing A inherently fights preventing B. No naive
  fix works; the mechanism must BALANCE the two, not maximize either.
- `T` : SELF-TENSION. A class whose own prevention fights itself or fights a
  non-class requirement (availability, owner-preview usability, throughput).
- `-` : no interaction found in the reports.

Antagonistic pairs and self-tensions are adjudicated in section 3.
Pair notes in section 4 give the mechanism or cut citation for every non-`-`
cell. The unresolved-tensions list is section 5.

## The 9x9 matrix

```
      B:  #1  #2  #3  #4  #5  #6  #7  #8  #9
A:
#1         -   S   -  S/N  S   S   S   S   -
#2         -   T   -   -   S   S   -   -   -
#3         -   -   -   S   -   -   -  S/N  S
#4         -   S   -   T   S   S   A  S/N  S
#5         -   -   -   -   -   S   N   S   A
#6         -   S   -   S   S   T   -   S  S/N
#7         -   -   -  S/N  S   -   -   S   -
#8         -   -   -   S  S/N  S   -   T   A
#9         -   N   -   -   A   N   -  S/N  T
```

## Antagonistic pairs (balance, not maximize)

Five antagonistic pairs. Three are failure-class pairs; two are a class
against a non-class requirement (called out by name in the task).

### A1. #8 vs #9: owner authority vs conflict preservation

The sharpest cut in the set. FAIL-8 cut "owner-wins-always (unconditional
overwrite, no conflict state)" as CUT-LOG entry 26 because it fixes #8 by
guaranteeing #9 with flipped polarity: the source contradiction collapses
into the owner value with no record of the source's new claim. The naive
forms are mirror images: silent owner-wins causes #9; silent source-wins
causes #8. The balance candidate is FAIL-8 Survivor 2, the three-way merge
(base source, new source, owner overlay), which keeps owner-wins-ties ONLY
under three conditions named by CUT-LOG FLAG 1 and the FAIL-8 falsification:
(1) the tie is on an owner-asserted field, (2) the losing value survives as a
named visible record, (3) the conflict has a lifetime policy with a default
and a clock. As written, S2 satisfies (1) and (2) and is missing (3), and its
wording quietly widens (1) to include confirm-facts. Additional recorded
contradiction (MERGED-correction-falsification, tension section): S2
auto-resolves source-vs-owner disagreement at merge time (owner wins, event
emitted) while FAIL-9 M4 demands that conflicts resolve ONLY via owner action
and never resolve themselves. Both cannot be true for the same disagreement.
And the owner-vs-owner axis has no mechanism at all: two owners correct the
same field differently and the decision store silently last-write-wins
(MERGED-correction-falsification attack b), which is the cut candidate
returning through the back door. Status: BALANCE MECHANISM EXISTS,
CONDITIONALLY. See unresolved tensions U1 and U2.

### A2. #9 vs #5: preserving conflict vs not rendering falsehoods

Naive #9 prevention (show both sides, always) renders one side's false claim
as site content, which is #5. Naive #5 prevention (omit anything not cleanly
bound) collapses CONFLICTING classifications to silence, which is #9. The
balance candidate is the pipeline: CONFLICTING as a first-class evidence
class preserved into the render model (FAIL-9 M1, FAIL-5 S1), certainty
attenuation at the answer seam (FAIL-9 M2: hedge-or-disclose grammar gated
on provenance), explicit audited source-priority policy with the loser
visible (FAIL-9 M3), and owner correction tasks as the resolution sink
(FAIL-9 M4). Status: BALANCE MECHANISM EXISTS, CONDITIONALLY. Three recorded
unresolved sub-tensions. (a) The hedge budget: M2's per-answer guarantee is
real, but at scale the product becomes universal uncertainty, and the family
states no maximum hedge rate, no per-field attenuation budget, no feedback
arc from attenuation rate back to detection policy (MERGED-conflict
attack c; FAIL-9 falsification M2 attack 5, "boy who cried wolf"). (b)
False-conflict explosion: M1 needs semantic normalization ("St." vs
"Street") that the cut list forbids as a new semantic authority
(CUT-LOG FLAG 2), so the detection criterion is undefined and the hedge
budget is spent on noise. (c) The unsafe-side conflict: when one conflicting
observation is an unsafe URL, the conflict record must preserve both but the
renderer must never emit the unsafe one, and it is unspecified whether the
M3 priority policy or the M2 attenuation gate wins in the audit trail
(FAIL-9 open question 3). See unresolved tensions U3, U4, U5.

### A3. #4 vs #7: determinism vs differentiation

This is the pair the task asked to examine for whether the tension is real.
The tension IS real, but it lives in the naive forms, and the variance
coupling mechanism is a genuine unified claim on both. Naive #7 prevention
(demand arbitrary difference, random per-tenant layout jitter, bigger
template menu) destroys #4: CUT-LOG entries 42 and 43 say jitter "makes #4
fixture-drift strictly worse" and variance maximization violates the
good-similarity rule. Naive #4 prevention (rigid byte-compare, fixtures
pinning output) entrenches #7: fixtures pin authoring-time output including
near-clone output (FAIL-3 S1 falsification, carried by analogy), and the
drift tripwire misreports owner-layer differentiation (an owner reorder)
as drift (FAIL-7 open question 4; F7 falsification 1D; MERGED-typed-seam
attack C item 3). FAIL-7 Survivor 1, input-output variance coupling, is one
checker with two verdicts: d_in large with d_out near zero is the collapse
direction (#7); d_in near zero with d_out above threshold is the drift
direction (#4). The anti-gaming half (coupling, not a floor on d_out;
deterministic similarity is GOOD when evidence is similar) is what keeps it
from being variance maximization in disguise. Status: BALANCE MECHANISM
EXISTS, CONDITIONALLY RESOLVED. Two residual sub-tensions remain. (a)
Generated-copy variance: differentiation wants varied LLM copy, but seeded
decoding is not byte-stable across model versions or hardware, so the
byte-compare surface cannot hold it (FAIL-4 open question 1: the honest
contract options are named, not chosen). (b) Layer attribution: the drift
direction must attribute output change to SOURCE-DERIVED vs USER-OWNED vs
GENERATED PRESENTATION layers before flagging (FAIL-7 open question 4), or
operators learn to ignore the flags and the drift guard dies. See unresolved
tensions U8, U9.

### A4. #2 vs availability / legitimate use

Fail-closed URL defaults (FAIL-2 S3) against the honest functioning of the
site. MERGED-typed-seam-falsification Attack C, "the fail-closed availability
trap": the merged abstraction stacks fail-closed gates in series with no
availability bound or false-positive budget anywhere. Documented casualties:
tel: with ;ext=, IDN/punycode domains, mailto: with query params silently
over-blocked (FAIL-2 falsification C1); silent breakage creates business
pressure to add broad exceptions ("skip validation for owner-entered
values"), and that exception reopens #2. A safety mechanism that
predictably generates the incentive to disable it is not a stable mechanism.
FAIL-2 open question 1 names the sharpest case: data: URLs have legitimate
uses (inline images); blanket rejection vs a SafeDataUrl type with MIME
restrictions is undecided, and the SURVIVOR-ROSTER warns the #2 claim
upgrades toward FALLS if the data: exception ships without per-sink scoping.
Balance candidate: the availability twin, every fail-closed assertion paired
with a legitimate-variety corpus that must render in full functional form,
plus neutralization/denial telemetry to a readable log, plus typed
retirement/supersede paths. Status: UNRESOLVED. No version implements the
twin. See U6.

### A5. #6 vs owner-preview usability

Deny-by-default visibility against the owner's need to see private objects in
the /build preview. FAIL-6 open question 1 asks whether preview is a separate
license (owner context) on the same gate or a separate pipeline. The
falsification (FAIL-6 S1 attack 5) shows the failure shape: preview tokens
travel in the URL, and the capability then moves through channels the gate
does not govern (browser history, shared links, referer headers, crawlers);
an owner shares a preview link and the recipient's anonymous request binds
private objects. The gate is correct per request and the leak still happens.
Cache-key confusion is the second shape: owner-preview then anonymous through
the same cache key serves private bytes to the anonymous viewer unless the
key includes the visibility context (FAIL-6 S3 strengthened test 3). And the
denial log itself is a channel: denied object IDs and field paths leak
existence (attack 6). Balance candidate: preview as an owner-context license
on the same single gate, with non-transferable session binding (never a
bearer URL token), cache keys that include the visibility context, and
existence-silent denial logging. Status: UNRESOLVED as specified. See U7.

## Per-pair mechanism citations

Only non-`-` cells. Citations are to the surviving mechanism or the cut
entry where the naive form was observed.

- (1,2) S: FAIL-1 S2, typed projection seam with capability contracts, covers
  #2 as the URL capability type (converges with FAIL-2 S1).
- (1,4) S+N: S via FAIL-1 S1 determinism assertion (regenerate and
  byte-compare; drift blocks promotion). N via the auto-repair branch of the
  same survivor: environment-dependent silent repair IS unlogged drift;
  the roster's cross-cutting verdict keeps block-and-escalate as the only
  branch consistent with purity (FAIL-1 open question 1).
- (1,5) S: FAIL-1 S2, factual render slots accept only evidence-bound fact
  types; unbound claims go only to the labeled generated-copy slot.
- (1,6) S: FAIL-1 S2, visibility classification rides on the type; private
  values cannot be assigned to public slots without explicit auditable
  declassification.
- (1,7) S(weak): FAIL-1 S1 structural-divergence assertion claims #7, but the
  falsification struck it: no structural-signature definition exists, so the
  claim is vacuous until the signature is defined and calibrated.
- (1,8) S: FAIL-1 S1 correction-preservation assertion: owner corrections as
  expected-output invariants; a regen that drops one fails before promotion.
- (2,2) T: blanket data: rejection vs legitimate inline images (FAIL-2 open
  question 1); strict scheme allowlists vs legitimate contact paths with
  parameters (tel: ;ext=, IDN domains, mailto: query params). See A4.
- (2,5) S: FAIL-2 S1/S2/S3 all claim #5 via the same typed-slot pattern:
  evidence-bound fact types vs generated-copy types.
- (2,6) S: FAIL-2 S1/S2/S3 all claim #6 via visibility classification on the
  type (S1), render-time visibility gate (S2), fail-closed coarse-or-omit
  default (S3).
- (3,4) S: FAIL-3 S1 (shape fixtures pin extraction output, drift becomes a
  fixture mismatch), S2 (receipt diffs across regens expose count drift),
  S4 (pinned reference parser: ruler-vs-measurement divergence).
- (3,8) S(weak)+N: S via FAIL-3 S2 reconciling corrections-in against
  corrections-surviving (falsification struck the claim as tested: no
  correction case in the test, IDs not reconciled with the owner loop).
  N: naive extractor reshaping churns object identity, so anchored
  corrections dangle; FAIL-8 S1's falsifiable test probes exactly this
  (the anchored object vanishes from source).
- (3,9) S(weak): FAIL-3 S3 quarantines contradictory blocks as explicit
  UNRESOLVED_CONFLICT objects instead of first-block-wins merge.
- (4,2) S: FAIL-4 S3 typed semantic render model, URL-safety axis; unsafe
  URLs fail the type before markup.
- (4,4) T: intentional time-varying content ("open now" badges) is
  non-deterministic across time by design; FAIL-4 open question 8 asks
  whether it is a fourth node type with freshness semantics or banned from
  the deterministic surface.
- (4,5) S: FAIL-4 S3 evidence-binding axis; unevidenced claims fail closed
  node-wise.
- (4,6) S: FAIL-4 S3 visibility axis; the gate emits only public nodes.
- (4,7) A: see A3. S direction via FAIL-7 S1 drift direction and FAIL-4 S1
  inputHash/outputHash collapse-suspect flagging; N directions via rigid
  byte-pinning and variance-maximization (CUT-LOG entries 42, 43).
- (4,8) S+N: S via FAIL-4 S1 (ownerOverrides as declared inputs; a regen
  dropping a correction is drift by definition), S2 (tripwire fires on the
  divergence), S4 (content-derived IDs keep owner-store bindings alive
  across re-dumps). N: "deterministic full re-render with no owner layer"
  (CUT-LOG entry 17, FLAG 3) loses corrections deterministically and on
  schedule; correct as a cut standalone, but it is the base layer the
  survivors depend on, with the owner layer added on top.
- (4,9) S: FAIL-4 S2 preserves conflict markers in recorded output; a regen
  that silently collapses a conflict is an undeclared state change and the
  tripwire fires. Caveat: the conflict node type itself is not yet defined
  (FAIL-4 open question 5), and naive never-differ purity would resist
  legitimate conflict-resolution progress.
- (5,6) S: FAIL-5 S1 (the binding chain resolves through the companion
  field-visibility seam; evidence-backed but private facts cannot cross),
  S2 (the input claim set is visibility-filtered per viewer context; the
  generator never receives private facts).
- (5,7) N(conditional): aggressive fail-closed omission plus evidence-gated
  section selection (FAIL-7 S2) can thin sparse-evidence businesses toward
  identical skeletons. The good-similarity rule absorbs this when the
  evidence is genuinely similar; it becomes #7 only when distinct evidence
  is starved of differentiation. No case was observed; watch the
  boilerplate-fraction signal from FAIL-7 S3.
- (5,8) S: FAIL-5 S3: owner corrections persist as first-class OWNER_ASSERTED
  evidence records; the render binds to the assertion record, and
  SOURCE_CHANGED_AGAINST_OWNER_ASSERTION fires instead of silent overwrite.
- (5,9) A: see A2. S direction via FAIL-5 S1 forcing CONFLICTING
  classification into the render model; N direction via naive omission of
  anything not cleanly bound.
- (6,2) S: FAIL-6 S1 positive-license gate (URL bindings need a scheme/origin
  license); S4 adversarial boundary suite (code-seam attacks cover
  javascript:/data: URLs).
- (6,4) S: FAIL-6 S2: visibility is a canonical schema attribute, so a
  regen that flips a visibility flag is a canonical diff caught by drift
  detection like any truth change.
- (6,5) S: FAIL-6 S1 generalizes the license to evidence: a claim with no
  evidence has no license and is refused like a private field.
- (6,6) T: see A5. Additional shape: FAIL-8 S1's hide-fact machinery and
  FAIL-5's owner-asserted corrections both need the owner to see what the
  public must not; the marking authority itself is unguarded (FAIL-6 open
  question 2: an unguarded "make public" button reintroduces the leak one
  click at a time).
- (6,8) S: FAIL-6 S3 trusted-context tenant enforcement: corrections are
  tenant-private state read through the same tenant filter, so regen cannot
  drop or cross-wire them via an unscoped read.
- (6,9) S+N: S via FAIL-9 M3 priority policies encoding visibility tiers
  (public projection draws only from public observations; the private side
  stays queryable but unrendered). N: naive preserve-both-sides-in-all-
  channels leaks the private conflicting observation into a public channel
  (the Pergola payload shape). The roster struck M3's #6 prevention claim:
  as specified it is post-render detection ("a leak shows up as a policy
  violation in the audit trail"), not prevention.
- (7,4) S+N: S via FAIL-7 S1 drift direction (same metric, time axis).
  N via naive differentiation: random per-tenant layout jitter, output
  variance maximization, bigger template menu (CUT-LOG entries 42, 43, 31).
- (7,5) S: FAIL-7 S2 (a section exists only with backing evidence, so there
  is no rendering surface for unbound claims) and S3 (unbound factual copy
  refused fail-closed at the slot constructor).
- (7,8) S: FAIL-7 S3 OWNER_CORRECTION-typed bindings: a regen whose spec
  drops a surviving correction binding is rejected at composition.
- (8,4) S: FAIL-8 S2 (base-vs-new diff is the merge's first step, every
  change a named event) and S4 (the base-to-new diff is itself the drift
  record; no code path rewrites a value the diff did not mark changed).
- (8,5) S+N: S via FAIL-8 S1 typed patches carrying actor, timestamp, and
  digest-bound approval as render-visible provenance. N: spoofed owner
  identity turns corrections into injected false claims (FAIL-8 open
  question 2, "correction injection is #8's evil twin"); OWNER_ASSERTED
  outranking observation is by design, which is exactly why the identity
  behind it is load-bearing and currently unproven (demo-grade actor
  identity in Step 6).
- (8,6) S: FAIL-8 S1 hide-fact patches use the identical decision-store and
  re-apply-on-read machinery; Step 7 proves hide survives re-dump the same
  way corrections do.
- (8,8) T: owner-vs-owner correction conflicts have no typed conflict state
  (MERGED-correction attack b); stale or superseded corrections wedge
  regeneration and invite operator overrides that become a new silent-loss
  channel (F7 falsification 3D, via MERGED-typed-seam attack C item 2); no
  object-lifecycle states for corrections on vanished objects (FAIL-8 open
  question 4).
- (8,9) A: see A1. CUT-LOG entry 26 (owner-wins-always) is the canonical
  #8-causes-#9 citation; CUT-LOG FLAG 1 records the three survival
  conditions for the three-way merge.
- (9,2) N: FAIL-9 open question 3: conflict at the seam when one side is an
  unsafe URL. The conflict record must preserve both sides (the #9
  requirement), but the renderer must never emit the unsafe side (the #2
  requirement); which authority wins in the audit trail is unspecified.
- (9,5) A: see A2.
- (9,6) N: naive preserve-both-sides in public render leaks the private
  conflicting side; the Pergola channel shape (script payload, search index,
  Ask FYD context) applies to conflict records too. Balance: M3's
  visibility-tiered priority policy, audited, loser queryable but
  unrendered.
- (9,8) S+N: S via FAIL-9 M4 (the conflict task loop IS the correction
  lifecycle: owner resolutions enter as OWNER_ASSERTED and outrank future
  conflicting refetches) and M1 (corrections as stronger evidence, never
  in-place edits). N: naive preserve-everything-forever fights the owner
  correction ever settling a conflicted field; and S2's automatic
  owner-wins-ties contradicts M4's only-via-owner-action rule for the same
  disagreement (MERGED-correction tension section).
- (9,9) T: conflict half-life. M4 forbids self-resolution by aging out, but
  the web rots constantly: sources 404, listings lapse, retractions have no
  evidence class (MERGED-conflict attack d, options enumerated: museum of
  ghosts vs silent resolution by attrition vs retraction semantics that do
  not exist). Production retention TTLs delete losing observations, which is
  #9 through the operational door: the family forbids silent merging but
  permits silent deletion by TTL (MERGED-correction retention tension;
  FAIL-9 M1 attack 4). FAIL-9 open question 2 (conflict lifetime and decay)
  and open question 4 (owner-absent fallback adjudication) are both open.

## Unresolved tensions for the final report

U1. (#8 vs #9) The three-way merge is missing its clock. CUT-LOG FLAG 1:
S2 survives the owner-wins-always cut only with a conflict lifetime policy
carrying a default and a clock, which does not exist (FAIL-8 open question
3: who resolves SOURCE_CHANGED_AGAINST_OWNER_ASSERTION, on what schedule,
what is the default). Until the clock exists, S2 is "the cut version with
better documentation." S2's wording also needs narrowing from "fields with
an owner decision" to owner-asserted fields only.

U2. (#8 vs #9) Auto-resolve vs owner-action contradiction. FAIL-8 S2
auto-resolves source-vs-owner disagreement at merge time (owner wins, event
emitted); FAIL-9 M4 says a conflict may move to resolved ONLY through the
owner task and never resolve itself. For source-vs-owner disagreements both
cannot hold. Also the owner-vs-owner axis has no conflict story at all:
the decision store silently last-write-wins (MERGED-correction attack b),
so "#9 handled" must be pruned to the two covered axes (source-vs-source
storage discipline, source-vs-owner events) until a correction-conflict
type exists.

U3. (#9 vs #5) No hedge budget. The conflict family has no stated maximum
hedge rate, no per-field attenuation budget, and no feedback arc from M2's
attenuation rate back to M1's detection criterion (MERGED-conflict attack c).
Without it, per-answer attenuation is real but the product-level claim
("blocks #9's customer-visible harm") fails: the replacement symptom is
universal uncertainty, unmeasured and unbounded.

U4. (#9 vs #5) Undefined detection criterion. M1 needs semantic
normalization to avoid the false-conflict explosion ("St." vs "Street"),
but the cut list forbids semantic comparison as a new authority
(CUT-LOG FLAG 2; FAIL-9 open question 1). Either name a normalization
authority (contradicting the cut) or accept the explosion (contradicting
M1). The strictness tension is also enforcement-shaped: the stricter the
M2 checker, the more it resembles the forbidden authority; the weaker, the
more attacks walk through (FAIL-9 falsification M2 attack note).

U5. (#9 vs #5/#2) Unsafe-side conflict precedence unspecified. FAIL-9 open
question 3: when one conflicting observation is an unsafe URL (or a private
fact), which wins in the audit trail, the M3 priority policy or the M2
attenuation gate? The conflict record must preserve both; the renderer must
never emit the unsafe one; no rule names the winner.

U6. (#2 vs availability) The availability twin does not exist. Every
fail-closed assertion needs its legitimate-variety corpus, neutralization
telemetry, and typed retirement paths; no version implements them
(MERGED-typed-seam attack C verdict: WEAKENED and unstable). The predictable
second-order effect is exception pressure that reopens #2 ("skip validation
for owner-entered values"). Until the twin exists, fail-closed URL policy is
stable only for the crude shapes (literal javascript: strings).

U7. (#6 vs preview) Preview distribution is outside the gate's jurisdiction.
Open: separate owner-context license on the same gate vs separate pipeline
(FAIL-6 open question 1); preview tokens must not be bearer URL tokens
(FAIL-6 S1 attack 5); cache keys must include the visibility context
(FAIL-6 S3 strengthened test 3); denial logs must not leak existence
(attack 6); the marking authority ("make public") is itself unguarded
(FAIL-6 open question 2).

U8. (#4 vs #7) Generated-copy variance contract unchosen. Seeded decoding is
not byte-stable across model versions or hardware, so GENERATED_PRESENTATION
regions cannot sit on the byte-compare surface as specified (FAIL-4 open
question 1). The named options (seed-pinned plus model-id as declared input
with byte-compare scoped to one model version, vs semantic comparison of
GENERATED regions) decide how much differentiation the drift guard can
tolerate. Until chosen, the #4 survivors' byte claims and the #7
differentiation pressure are in quiet conflict.

U9. (#4 vs #7) Drift reporting needs layer attribution. Output change must be
attributed to SOURCE-DERIVED vs USER-OWNED vs GENERATED PRESENTATION layers
before the tripwire fires (FAIL-7 open question 4), or owner intent is
misreported as drift and operators learn to ignore the flags (F7
falsification 1D; MERGED-typed-seam attack C item 3). An ignored drift guard
is no guard.

U10. (#3 vs throughput) Quarantine has no drain SLA. FAIL-3 open question 2:
who resolves quarantined shapes, on what cadence, and does an unresolved
item block onboarding or trail it? The MERGED-conflict attack e finding:
in the owner-absent regime nobody drains the quarantine, so it becomes
/dev/null with better labeling. The sampling-rate/cost tradeoff for the
dual-parser cross-check is likewise uncalibrated (FAIL-3 open question 4).
Quarantine is a throughput tax with no stated budget and no stated owner.

## Merge-family summary (the synergistic clusters)

1. Typed projection seam family (#2, #5, #6 core; extends to #1 geometry,
   #4 GENERATED quarantine, #7 boilerplate typing). Members: FAIL-1 S2,
   FAIL-2 S1/S2/S3, FAIL-4 S3, FAIL-5 S1/S3, FAIL-6 S1/S2, FAIL-7 S3.
   The reports converged independently on "trust metadata rides on the
   type, not on string conventions." Falsification status: all WEAKENED,
   none fallen; the availability twin (U6) is the missing half.
2. Empirical oracle / verification family (#1, #3, #4, #7, #8). Members:
   FAIL-1 S1, FAIL-3 S2, FAIL-4 S1/S2, FAIL-8 S3, FAIL-6 S4. The discipline
   is measure-don't-trust with a blocking gate. Caveats: cost pressure
   selects for the cheapest, most rot-prone members (MERGED-oracle); the
   repair branch is struck, block-and-escalate only; FAIL-1 S1's #7 claim
   is struck pending a structural signature.
3. Owner-decision plus conflict family (#8, #9, #5). Members: FAIL-8 S1/S2,
   FAIL-9 M1/M3/M4, FAIL-5 S3. The abstraction: owner judgment is a typed,
   identity-anchored, durable record in a decision store the pipeline reads
   but never writes; disagreement is a durable typed state, never a silent
   pick. Caveats: U1, U2, U3, U4, U5; retention TTLs are an operational
   back door (U9-family, (9,9) cell).
4. Quarantine family (#3, #9). Member: FAIL-3 S3 (plus FAIL-9's
   UNRESOLVED_CONFLICT object shape). WEAKENED; the drain SLA (U10) is the
   load-bearing missing piece.
5. Evidence-gated composition (#7, #5). Member: FAIL-7 S2: sections exist
   only with backing evidence, so differentiation and claim-binding are one
   gate. Conditional N noted at (5,7).

Resolved or settled interactions (not carried to the unresolved list):
(1,4) repair authority resolved to block-and-escalate; (4,8) naive
determinism-without-owner-layer kept as infrastructure, not discarded
(CUT-LOG FLAG 3); (9,6) M3's #6 claim restated as detection, not prevention
(roster partial kill 7); the human-gate cluster is uniformly cut and is not
a cross-class interaction.
