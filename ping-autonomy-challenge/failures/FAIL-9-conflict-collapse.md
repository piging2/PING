# FAIL-9: Conflict Collapse

**Failure class:** contradictory sources not preserved as conflict
**Date:** 2026-09-23
**Research only:** no implementation code. Test designs are the required output.

## (a) Grounding

### The concrete failure

A FYD business has its hours listed as 8-5 on its website and 9-5 on a provider listing. The acquisition pipeline ingests both, silently picks one (usually last-write-wins), and the conflict disappears. Ask FYD then answers "What are your hours?" with the winner stated as fact, with false confidence. The disagreement never happened, as far as the system is concerned.

Nolan's own framing of this exact scenario, from the 2026-09-22 master context handoff
(`~/workspace/fyd/handoff/2026-09-22-master-context-handoff.md`):

> do not silently pick.
> website hours = 8–5, provider listing = 9–5.
> FYD should know: CONFLICT.
> Ask FYD can eventually tell the owner: "Your website and provider listing disagree."
> That is high-value business maintenance.

### General shape

A merge that destroys information about disagreement, producing unwarranted certainty downstream.
The dangerous property is not that one source was chosen. The dangerous property is that the
*existence of disagreement* left no trace, so every downstream consumer (renderer, Ask FYD,
SiteSpec) treats the winner as uncontested fact. The pipeline has converted a two-source
disagreement into a zero-conflict lie.

### Existing doctrine (authoritative)

- **No-ClaimAuthority rule** (MEMORY.md, Nolan's directive 2026-09-22): conflict is a PROPERTY
  OF EVIDENCE, not a new authority. Preserve both observations with their evidence
  (CLAIM A / evidence A / CLAIM B / evidence B / CONFLICT); projection policy decides
  presentation (owner-confirmed > current direct evidence); owner correction creates stronger
  evidence, never deletes observations. "FYD becomes progressively more accurate than the web
  it ingested; that is the moat."
- **Data fabric discipline** (`~/workspace/fyd/product-lane/.../src/fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md`):
  L2 never collapses two sources' semantics into one; conflicts stay visible as competing
  projections with distinct evidence; suppression is not deletion; conflicting projections
  render side by side with their evidence; the UI never presents a merged "truth" from
  conflicting sources.
- **Provenance language** (memory 2026-09-23): provenance classes must distinguish
  `DIRECT`, `DERIVED`, `INFERRED`, `OWNER_ASSERTED`, `CONFLICTING`, and `UNKNOWN`; merely
  observed data must not be called "Verified."
- **Wave-1 corroboration**: LANE-14's six-state handoff contract treats "Conflicting"
  (two workers' claims incompatible) as a first-class state with the prescribed action
  "preserve both sources, route to resolver/human"; LANE-4 (Temporal dissection) documents
  the invariant "any divergence between what the code would do now and what history says
  it did is a hard failure, never a silent merge."

The failure class is therefore real and the ecosystem already has the vocabulary for it.
The mechanisms below are general versions of this discipline, tested against the >=2-classes
hard rule.

## (b) Surviving mechanisms

Hard rule applied: a candidate survives ONLY if it prevents 2 or more of the 9 failure
classes, with a crisp reason per class.

### M1. Conflict as first-class evidence state (CONFLICTING class)

**How it works:** Contradictory observations are stored side-by-side in the evidence graph
with their sources, snapshots, and observed-at timestamps. They are never merged into a
single record. A `CONFLICT` record is itself an entity: {claim A, evidence A, claim B,
evidence B, detected-at, resolution state}. Projection policy decides what is shown, but
the graph always knows both sides exist. Suppression is not deletion: even a resolved
conflict keeps both observations.

**Prevents >=2 classes:**
1. **#9 conflict-collapse:** Directly. The merge that destroys disagreement cannot happen
   because the merge has no place to write its output; the graph has no slot for a
   "resolved value" that lacks evidence records.
2. **#5 claim-binding:** A claim with a `CONFLICTING` evidence class cannot be bound as
   settled fact. Rendered claims and Ask FYD answers inherit the conflict record, so
   every downstream statement carries its evidence, including the fact that evidence
   disagrees.
3. **#8 correction-loss:** Owner corrections enter as stronger evidence (`OWNER_ASSERTED`
   outranking observation classes) rather than as in-place edits of the merged record.
   Regeneration replays the evidence graph, and the correction survives because it was
   never a mutation of a row that regeneration recreates.

**Falsifiable test:**
- Input: a fixture with two observations for one business's hours: {source: "website",
  hours: "8-5", observed: 2026-09-23T10:00Z} and {source: "google-listing",
  hours: "9-5", observed: 2026-09-23T11:00Z}.
- Procedure: run acquisition and SiteSpec generation twice; inspect the evidence graph
  after each run and the Ask FYD answer to "What are your hours?"
- Expected observable: the evidence graph contains both observations plus a CONFLICT
  record with resolution state UNRESOLVED; Ask FYD does not state one value as settled
  fact; both runs produce the same graph contents.
- **What proves the mechanism does not work:** the evidence graph contains a single
  hours record (e.g. "9-5") with no trace of the competing observation, or Ask FYD
  answers with one value unqualified. Either outcome means the merge destroyed the
  disagreement and M1 is not implemented.

### M2. Certainty attenuation at the answer seam

**How it works:** The provenance class of the evidence behind an answer gates the
language Ask FYD is allowed to use. A `CONFLICTING` evidence class forces the answer
into a hedge-or-disclose shape: either state both sides with sources, or state the
policy-chosen value with an explicit disclosure of the disagreement and the rule that
chose it. "Merely observed data must not be called Verified" is enforced as a checkable
property of the answer template, not as an LLM instruction.

**Prevents >=2 classes:**
1. **#9 conflict-collapse:** Blocks the downstream symptom. Even if an upstream merge
   occurred, the answer seam refuses to present the winner with false confidence;
   the failure's customer-visible harm (false certainty) cannot materialize.
2. **#5 claim-binding:** The same gate applies to all rendered factual claims, not just
   Ask FYD. A claim without evidence, or with conflicting evidence, cannot render in
   declarative-fact grammar.

**Falsifiable test:**
- Input: the same two-observation fixture as M1's test; additionally, a second fixture
  where the two observations agree ("8-5" and "8-5").
- Procedure: query Ask FYD for hours against both fixtures; record the answer text.
- Expected observable: on the conflicting fixture, the answer names both sources and
  values (or names the policy winner plus the disagreement); on the agreeing fixture,
  the answer states the value plainly.
- **What proves the mechanism does not work:** the conflicting fixture produces a
  plain declarative answer ("We are open 9-5.") identical in confidence grammar to the
  agreeing fixture. If answer grammar does not change when evidence conflicts, M2 is
  decoration.

### M3. Explicit, auditable source-priority policy (loser stays visible)

**How it works:** When projection policy picks a winner among conflicting sources, the
decision is recorded as a first-class audit event: which rule fired, the priority
ranking it used (e.g. owner-confirmed > current direct evidence > stale listing), the
winner, and the loser with its evidence. The losing observation is never deleted;
it remains queryable from the evidence graph. Policy changes are versioned, so an old
render can be explained from the policy version that produced it.

**Prevents >=2 classes:**
1. **#9 conflict-collapse:** Prevents the "silent" half of the failure. Choosing a
   winner is allowed; choosing one invisibly is not. The audit event preserves the
   disagreement even when presentation must show one value.
2. **#5 claim-binding:** The policy decision becomes part of the claim's evidence
   chain, so Ask FYD can cite the exact rule ("per owner-confirmed precedence, showing
   website hours") instead of presenting the winner as intrinsically true.
3. **#6 visibility-error:** Priority policies explicitly encode visibility tiers
   (public projection may draw only from public observations). A private fact that
   conflicts with a public one gets its conflict recorded, but the policy that selects
   for public render is checkable, so a private-fact leak shows up as a policy violation
   in the audit trail rather than as an unexplainable merge artifact.

**Falsifiable test:**
- Input: the conflicting-hours fixture plus a priority policy
  [owner-confirmed > website > google-listing]. Add an owner correction setting hours
  to "7-4" after the initial render.
- Procedure: regenerate the SiteSpec; then ask: what value rendered, and what audit
  events exist for the hours field?
- Expected observable: render shows "7-4" (owner correction wins); the audit log has
  one event per conflict decision (winner, loser, rule fired, policy version);
  the google-listing "9-5" observation is still retrievable from the evidence graph.
- **What proves the mechanism does not work:** the audit log is empty or mentions
  only the winner; or the losing observation cannot be retrieved after regeneration.
  Either means the "policy" is silent last-write-wins with a new name.

### M4. Conflict surfacing as owner correction tasks

**How it works:** An unresolved CONFLICT record automatically generates an owner-facing
task ("Your website says 8-5, Google says 9-5. Which is right?") with a one-action
resolution path. The conflict is not allowed to resolve itself by aging out or by
refetch noise. Until resolved, projections carry the attenuated form from M2. The
task queue is the only legitimate sink for a conflict record.

**Prevents >=2 classes:**
1. **#9 conflict-collapse:** Replaces silent resolution with explicit routing.
   A conflict can move to "resolved" only through the owner task; there is no
   code path by which it evaporates.
2. **#5 claim-binding:** Pending conflicts are visible tasks, so Ask FYD defers to
   the unresolved state ("the owner hasn't confirmed this yet") instead of binding
   a claim to contested evidence.
3. **#8 correction-loss:** The task loop is the correction lifecycle: owner
   resolutions enter as OWNER_ASSERTED evidence (per the No-ClaimAuthority rule),
   which outranks future conflicting observations, so a later conflicting refetch
   reopens the conflict as a new task instead of overwriting the owner's answer.

**Falsifiable test:**
- Input: the conflicting-hours fixture, with no owner correction, left running across
  two scheduled refetch cycles.
- Procedure: inspect the owner task queue after each cycle; inspect the evidence graph.
- Expected observable: exactly one open task exists for the hours conflict; no
  duplicate tasks accumulate; the conflict record remains UNRESOLVED; neither
  refetch changed the projected value silently.
- **What proves the mechanism does not work:** the task queue is empty after a
  cycle while the conflict record disappeared (it resolved itself silently), or the
  projected value flipped between cycles without any owner action. Either is the
  original failure wearing new clothes.

## (c) Cut list

- **"Confidence-scored auto-reconcile"** (pick the winner with a score). Cut: it still
  merges and still deletes the loser; a score on a silent decision is the same failure
  with instrumentation.
- **Freshness-weighted last-write-wins.** Cut: this is the failure mode named as a
  mechanism; newer does not mean truer (a stale Google listing is newer than nothing,
  and a website change made today may be wrong).
- **Majority-vote across sources.** Cut: three wrong aggregators outvote the owner's
  single true listing; replaces information destruction with a different wrong answer,
  and prevents nothing among the 9.
- **LLM semantic comparison for conflict detection.** Cut: nondeterministic and
  unverifiable; conflict detection must be evidence-grounded (distinct sources,
  non-identical values for the same field), not an opinion. Per the No-ClaimAuthority
  rule, conflict is a property of evidence, not a new authority, and an LLM verdict
  is exactly a new authority.
- **"Always ask the owner a clarifying question" as the sole mechanism.** Cut: blocks
  on human availability; when the owner does not respond, the system must still do
  something non-silent (M2/M3), and this alone provides no such behavior.
- **Deduplicate identical strings across sources.** Cut: identity hygiene, not
  conflict handling; identical strings are not conflicts, so this prevents none of
  the 9 classes.
- **"One canonical hours field, sources fill it in order."** Cut: that is just the
  merge restated as a schema choice; destroys disagreement by construction.

## (d) Open questions

1. **Conflict detection semantics for non-identical representations.** "Mon-Fri 8-5"
   vs "Mon 8-5, Tue 8-5, Wed 8-5..." are semantically identical but textually
   distinct. Exact-string comparison misses nothing but flags false conflicts on
   formatting; semantic normalization risks collapsing real disagreements. What is
   the canonical normalization, and who owns it?
2. **Conflict lifetime and decay.** If the Google listing is never corrected and the
   owner never answers the task, does the conflict stay open forever? Is there a
   principled staleness bound (e.g. the losing source is refetched and unchanged N
   times) that retires a conflict without deleting it?
3. **Conflict at the seam when one side is unsafe.** If one conflicting observation
   is an unsafe URL (javascript: href in business links) and the other is benign,
   the conflict record must preserve both, but the renderer must never emit the
   unsafe one. Which class should win in the audit trail: the M3 priority policy
   or the M2 attenuation gate? (Interaction with #2 unsafe-url is under-specified.)
4. **Who adjudicates owner-absent conflicts?** M4 assumes an owner who answers tasks.
   For harvested businesses with no engaged owner, conflicts may be unresolvable
   indefinitely. Is there a fallback adjudication policy, and does using it violate
   "do not silently pick"?
5. **Conflict granularity.** Is the conflict record per-field (hours), per-object
   (the business), or per-claim-pair? A wrong granularity either buries conflicts
   or floods the owner task queue.
6. **Precedence when owner corrections conflict with each other.** The
   No-ClaimAuthority rule says owner corrections outrank observations, but two
   corrections from two people claiming to be the owner are a conflict of
   OWNER_ASSERTED records. Identity of the owner is then load-bearing; that is a
   separate hard problem (identity resolution) the current doctrine does not solve.
