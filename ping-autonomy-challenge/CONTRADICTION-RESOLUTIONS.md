# Contradiction Resolutions: proposals for the mapper

**Date:** 2026-09-23. **Mode:** research only. No implementation code.
**Purpose:** resolve the 5 contradiction flags in `CUT-LOG.md` with reasoned
proposals and exact library wording. These are RECOMMENDATIONS, not decisions;
the mapper decides and Nolan's doctrine is the final authority.

No em dashes are used in this document.

For each flag: the recommended resolution, the exact 1-3 sentence library
text, and the falsifiable test that distinguishes the kept version from the
cut version.

---

## FLAG 1: FAIL-8 cut "owner-wins-always" vs Survivor 2 "owner wins ties"

**The contradiction.** FAIL-8 cut owner-wins-always (entry 26) for fixing #8
by guaranteeing #9: it collapses the source contradiction into the owner
value with no record of the source's new claim. FAIL-8 Survivor 2 (three-way
merge, owner wins ties) depends on an owner-wins rule at merge time. The
FAIL-8 falsification report names the boundary exactly: S2 survives the cut
only under three conditions: (1) the tie is on an owner-asserted field, (2)
the losing value survives as a named visible record, (3) the conflict has a
lifetime policy with a default and a clock. As written S2 satisfies (1) and
(2) and is missing (3), and its wording ("fields with an owner decision")
quietly widens (1) to include confirm-facts. Verdict there: "S2 is one
missing clock and one wording fix away from being the cut version with better
documentation."

**Recommendation.** Keep the cut AND narrow S2 to the three conditions,
making the conditions the library boundary. The repair is additive: add the
clock (a declared conflict-lifetime policy with a default and a clock that
keeps the contradiction surfaced on the owner-facing surface until resolved
by a named resolution, never decaying silently into an archived log line),
and narrow the wording from "fields with an owner decision" to "fields where
the owner asserted an explicit value (corrected-fact)". Confirm-facts get a
separate stated policy: a confirmation does not extend to a value the owner
never saw, so a confirm-fact disagreement emits the conflict but does not
auto-win the tie. If the contradiction ever becomes invisible to the owner
without a recorded resolution, the merge is owner-wins-always under a new
name, and that is a named falsification of the survivor.

**Library text (3 sentences):**

"Owner-wins-always is forbidden: resolving a contradiction by overwriting the
losing value with no surviving record is conflict-collapse with the polarity
flipped. Owner-wins-ties is permitted only for fields where the owner
asserted an explicit value (a corrected-fact, never a confirm-fact), only
while the losing value remains a named visible record, and only under a
declared conflict-lifetime policy with a default and a clock. A conflict that
becomes invisible to the owner without a recorded resolution is
owner-wins-always regardless of the label on the merge."

**Distinguishing test.** Two probes, both from the FAIL-8 falsification's
strengthened tests. Probe A (the clock): run the A/B/C merge fixture, emit
`SOURCE_CHANGED_AGAINST_OWNER_ASSERTION` naming A and B with effective C,
then run N further regens with the source still saying B and no owner
resolution. The kept version shows the conflict still surfaced on the
owner-facing surface with its named default and clock policy discoverable;
the cut version shows only C with the contest no longer discoverable without
knowing where to look. Probe B (the wording): confirm email E against base,
then merge a new source saying E2. The kept version emits the conflict
without auto-owner-win (or cites an explicit separate policy for
confirm-facts); the cut version auto-wins the tie for a value the owner
never asserted.

---

## FLAG 2: FAIL-9 cut "LLM semantic comparison" vs M1's need for normalization

**The contradiction (sharpest).** FAIL-9 cut "LLM semantic comparison for
conflict detection" (entry 41): nondeterministic, unverifiable, and a new
authority forbidden by the No-ClaimAuthority rule. FAIL-9 M1 (conflict as
first-class evidence state) needs semantic normalization to avoid a
false-conflict explosion: exact-string detection flags "8a-5p" vs
"08:00-17:00" as a conflict, burying the genuine 8-5 vs 9-5 disagreement in
formatting noise. The FAIL-9 falsification shows normalization IS a semantic
authority that M1's own grounding forbids, and open question 1 asks who owns
the canonical normalization. The cut list's detection criterion ("distinct
sources, non-identical values for the same field") is undefined until
normalization exists, because "non-identical" has no meaning across
representations.

**Recommendation.** Bless **deterministic, versioned, declared
canonicalization rules**, with the owner-supervised alias table as the
per-tenant extension mechanism. Forbid any model verdict on the detection
path. The move that dissolves the contradiction: normalization is DATA, not
judgment. A versioned rule table (field-specific mappings from
representation variants to a canonical form) is replayable, reviewable, and
byte-verifiable across processes and time; an LLM verdict at detection time
is none of those, and that is what makes the verdict an authority. The
blessed form does not violate No-ClaimAuthority because it manufactures no
facts: it maps representations to a canonical form without changing what was
claimed, who claimed it, or its evidence class. Ownership: the platform owns
the base rule set (versioned, human-reviewed, changed only as a declared
input change, exactly like rendererVersion in FAIL-4 S1, so its version
participates in the input hash). Owners extend it per business through the
supervised alias table. LLM assistance may PROPOSE rules for human adoption
offline; no model ever runs on the conflict-detection path at runtime.

Why not the other two candidates: an owner-supervised alias table alone
covers per-business variants but cannot ship the base normalization every
tenant needs (hours, addresses, phone formats), so it is the extension
mechanism, not the core. Per-field comparators (custom equality functions)
are an implementation shape of the same idea and should be expressed as
versioned rule data, not as code, so they stay reviewable and hashable.

**Library text (3 sentences):**

"Conflict detection may use deterministic per-field canonicalization rules
only: a versioned, human-reviewable mapping from representation variants to a
canonical form (such as '8a-5p' to '08:00-17:00'), shipped as a declared
pipeline input whose version participates in the input hash; owners may
extend the mapping for their business through a supervised alias table. Any
semantic judgment performed by a model at detection time, LLM or otherwise,
is forbidden as a ClaimAuthority. Normalization must be data the pipeline
reads, never a verdict the pipeline produces."

**Distinguishing test.** Three probes, from the FAIL-9 falsification's
strengthened M1 test. Probe A: feed the twelve-variant hours fixture ("8-5",
"8:00 AM - 5:00 PM", "8a-5p", "08:00-17:00", trailing-whitespace variants,
day-range expansions, plus the genuine 9-5 listing) through acquisition in
two separate processes with different wall clocks; assert byte-identical
canonical forms and identical verdicts (exactly one CONFLICT record for the
genuine disagreement, zero for formatting variants). Probe B: assert the
conflict-detection path contains no model invocation (static check plus a
run with model egress blocked). Probe C: bump the canonicalization rules
version with no other change; assert the inputHash changed and the new
version is named in the conflict record. The kept version passes all three;
the cut version (LLM comparison) fails A or B; a hard-coded unversioned
normalizer fails C.

---

## FLAG 3: FAIL-8 cut "deterministic full re-render with no owner layer" vs FAIL-4's foundation

**The contradiction.** FAIL-8 cut "deterministic full re-render with no owner
layer" (entry 17) as a single-class mechanism: determinism reproduces
whatever the inputs say, so a deterministic re-acquire-and-overwrite
pipeline loses corrections deterministically and on schedule. FAIL-4 S1
(declared-input purity) and S2 (replay-mismatch tripwire) DEPEND on
deterministic re-derivation as their base layer; byte-comparing a re-render
is literally what they do. The cut is correct as a standalone multi-class
claim, but the layer must be retained, not discarded.

**Recommendation.** Adopt the infrastructure-vs-mechanism framing. A cut
entry disqualifies a standalone claim ("this alone prevents two failure
classes"); it never deletes a layer that survivors compose on. Deterministic
re-derivation is infrastructure: the ground every survivor stands on, claimed
by none of them as their own prevention. FAIL-8's owner layer (S1's decision
store with re-apply-on-read) composes ON TOP of that base, which is exactly
FAIL-8 S1's design. The mapper should keep entry 17's cut of the claim and
record the layer as retained infrastructure referenced by FAIL-4 S1/S2 and
FAIL-8 S1.

**Library text (3 sentences):**

"Deterministic re-derivation is infrastructure, not a mechanism: it is the
ground every survivor stands on and is claimed by none of them as their own
prevention. A cut entry disqualifies a standalone claim ('this alone prevents
two failure classes'); it never deletes a layer that survivors compose on.
The owner layer composes on top of deterministic re-render; remove the base
and the survivors built on it fall with it."

**Distinguishing test.** Probe A: record an owner correction, then run regen
five times with adversarial environment variation (shuffled key order, varied
wall clock, varied RNG seed, different timezones) and assert byte-identical
output; the infrastructure holds. Probe B: remove the owner overlay from the
read path while changing nothing else, re-serve, and assert the effective
value changes to the source value; the correction protection lives in the
owner layer, not in the determinism. The kept composition passes both; a
system where determinism and correction protection are the same thing
(equivalently, where the owner layer was silently part of the "deterministic
render") fails B by showing the correction surviving a read path that no
longer consults it.

---

## FLAG 4: FAIL-9 cut "always ask the owner as sole mechanism" vs M4 owner tasks

**The contradiction.** FAIL-9 cut "always ask the owner a clarifying question
as the sole mechanism" (entry 33 sub-bullet): it blocks on human
availability, and when the owner does not respond the system must still do
something non-silent. FAIL-9 M4 (conflict surfacing as owner correction
tasks) IS owner-asking. The reconciliation offered is "sole" vs "layered":
M4 sits on M2 (certainty attenuation at the answer seam) and M3 (explicit
source-priority policy, loser stays visible), so the system does something
non-silent while waiting. The FAIL-9 falsification sharpens it: in the
owner-absent steady state (the majority regime for harvested businesses) M4
converges to the cut sibling's failure mode, and its test certifies permanent
paralysis as success; plus the reopen rule as written creates a nag loop
(the never-corrected losing source re-opens the task every refetch).

**Recommendation.** Define the fallback contract precisely, and make it a
precondition of the task's existence. M4 is permitted only with a declared
fallback contract written before any owner task is created: (a) what renders
while the task is open (the M2 attenuated form plus the M3 priority policy,
cited), and (b) what happens if the owner never answers: a staleness bound
after which the task moves to a declared STALE/ESCALATED state and a declared
default applies, as a named event, with disclosure, never silently. Add the
falsification's adjudicated-suppression repair: a refetch showing the same
losing source and value the owner already adjudicated opens no new task (that
is expected staleness, not new information); a NEW disagreeing value reopens
the task. And state M4's precondition honestly: M4 assumes an engaged,
singular owner; outside that precondition, M2+M3 carry the prevention alone.

**Library text (3 sentences):**

"The owner is never the sole mechanism. An owner task is permitted only with
a declared fallback contract written before the task is created: what renders
while the task is open, and, if the owner never answers, the staleness bound,
the declared default, and the named event that records its application. A
queue with no fallback contract and no staleness bound is the cut version
with a task queue; a question already answered, re-asked against the same
losing value, is nag rather than diligence, while a new disagreeing value
must reopen it."

**Distinguishing test.** From the FAIL-9 falsification's strengthened M4
test. Probe A (the contract): open a conflict task on the hours fixture with
no owner correction; run K owner-absent refetch cycles; assert every cycle
rendered the declared interim form (attenuated, policy-cited) with no silent
flips, and after K cycles the task reached its declared STALE/ESCALATED
state with the named default applied and disclosed. Probe B
(anti-nag/suppression): resolve to 8-5, refetch with the loser unchanged
(Google still 9-5) and assert NO new task; then refetch with the loser
changed (Google now 10-6) and assert a new task opens. The kept version
passes both; the cut version leaves behavior undefined while waiting, flips
the projection silently, nags on the same stale value, or certifies infinite
UNRESOLVED as success.

---

## FLAG 5: FAIL-6 cut "per-viewer ACLs at render" vs FAIL-6 S3 "trusted-context tenant enforcement"

**The contradiction.** FAIL-6 cut "per-viewer ACLs evaluated at render"
(entry 21): public FYD sites have anonymous viewers, so there is no
per-viewer identity to check against; the check collapses to the
public-visible flag anyway, and it prevents only #6. FAIL-6 S3
(trusted-context tenant enforcement at every read) also enforces context at
the read boundary. The contexts differ (tenant/owner license vs viewer
identity) and the cut's reason does not touch S3, but both are "check context
at the read boundary" mechanisms, so S3 can drift back into the cut pattern
if the distinction is not written down.

**Recommendation.** Keep both the cut and S3, and fix the distinction in
library wording by knowability. Enforcement keys on the PRODUCER's context
(tenant/owner identity, known and trusted, from session or deployment
config, never from the request), never on the CONSUMER's identity (the
public viewer, anonymous and unknowable). The cut pattern fails because it
checks something the system cannot know; S3 survives because it checks
something the system does know: whose data is being read. S3's test already
encodes this (request-body tenant substitution is ignored in favor of
trusted context); the library sentence should make the rule explicit so a
future reader does not re-add viewer-keyed checks thinking they are
strengthening S3.

**Library text (3 sentences):**

"Enforcement keys on the trusted context of the data's owner, never on the
identity of the viewer. Per-viewer ACLs evaluated at render are forbidden:
the public viewer is anonymous, so there is no identity to check and the
check collapses to the public-visible flag. Tenant enforcement at every read
is required: tenant identity comes from trusted context (session, deployment
config), never from the request, and every read filters on it. The rule is
knowability: check what the system knows (whose data this is), not what it
cannot know (who is watching)."

(Note: four sentences; the fourth is the mnemonic. If the library wants
exactly three, drop the mnemonic sentence.)

**Distinguishing test.** Probe A: run the public pipeline under trusted HP
context twice, once with viewer attributes present (headers, cookies, query
params claiming an identity) and once with none; assert the public output
bytes and all enforcement decisions are identical, and that a
distinctive-string search for the other tenant's canary returns empty in
both runs. Probe B: run the tenant-contract attack set (guessed CS object ID
via URL substitution, request body with tenant_id=CS, Ask FYD seeded with CS
context) and assert trusted context wins in every case. The kept version
passes; the cut pattern fails the moment any viewer-supplied attribute
changes an enforcement decision, and S3 drifts into the cut pattern the
moment any check reads identity from the request instead of trusted context.

---

## Summary table

| Flag | Kept | Cut stays | Library boundary |
|---|---|---|---|
| 1. owner-wins | S2 narrowed: owner-wins-ties with clock + corrected-fact wording | owner-wins-always | Tie on owner-asserted field + named visible loser + conflict lifetime with default and clock; invisibility without resolution = the cut |
| 2. normalization | Deterministic, versioned, declared canonicalization rules (+ owner alias table as extension) | Any model verdict on the detection path | Normalization is data the pipeline reads, never a verdict the pipeline produces |
| 3. determinism | Deterministic re-derivation as infrastructure | The standalone claim "re-render alone prevents 2 classes" | Cuts disqualify claims, never layers; survivors compose on the base |
| 4. owner tasks | M4 with declared fallback contract + staleness bound + adjudicated-suppression | Owner-asking with no non-silent fallback and no bound | Fallback contract before the task exists; same stale loser never re-nags; new value reopens |
| 5. context at read | S3: trusted tenant/owner context at every read | Per-viewer ACLs at render | Knowability: check what the system knows (whose data), not what it cannot know (who watches) |

**What the mapper still owes Nolan's doctrine.** FLAG 2's ownership question
is only half answered here: the platform owns the base rule set and owners
own their alias extensions, but the review process that keeps the base set
honest (who approves a new mapping, what evidence justifies it) is
unspecified. FLAG 4's staleness bound K and the declared default for the
owner-absent regime are policy choices Nolan should see explicitly, because
the default is a silent-ish pick wearing a disclosure. Both belong in the
grilling brief, not in this file.
