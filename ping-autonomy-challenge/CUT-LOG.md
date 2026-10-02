# PING Autonomy Grand Challenge: CUT-LOG

Consolidated cut list from the 9 failure-class reports in `failures/FAIL-[1-9]-*.md`
(falsification files excluded from scope). Every cut candidate below failed the
hard rule: prevent at least 2 of the 9 failure classes as a standalone mechanism.

No em dashes are used in this document.

## Counts

- Raw cut entries across all 9 lanes: 70
- Unique entries after dedupe: 55
- Dedupe merges (70 to 55, 15 removed):
  - CSP-as-backstop cut by FAIL-1 and FAIL-2 under the same name: 2 to 1
  - Human review/approval gates cut by all 9 lanes under 9 names: 9 to 1
  - Logs/labels without enforced checks (FAIL-3, FAIL-5, FAIL-6, FAIL-8): 4 to 1
  - Failure-named-as-mechanism variants (FAIL-7, FAIL-8, FAIL-9): 4 to 1
- Per-category counts:
  - (a) Single-class / zero-class mechanisms: 32
  - (b) Non-mechanisms: 6
  - (c) Doctrine-forbidden: 5
  - (d) Wrong-layer: 6
  - (e) Subsumed by a survivor: 6
  - Total: 55

---

## (a) Single-class / zero-class mechanisms

Prevent at most one of the 9 classes (several prevent none). Good tactics or
legitimate tests, but not multi-class mechanisms.

1. Layout constraint solver with overflow as a hard error. FAIL-1. Prevents
   only #1; a solver that rejects unsatisfiable layouts says nothing about
   drift, claims, visibility, differentiation, corrections, or conflicts.
   Subsumed in practice by the lane's Survivor 1 viewport assertion, which
   measures reality instead of modeling it.
2. Horizontal-extent token budget propagated top-down. FAIL-1. A budget on
   intrinsic width is a single-class guard with no coverage of any other class.
3. Fail-closed CSS defaults (min-width:0, max-width:100%, overflow-wrap
   everywhere). FAIL-1. Prevents only #1 and only the accidental cases; a good
   default but a single-class tactic, not a mechanism.
4. Container-queries-only rule / device-name branch ban. FAIL-1. A rendering
   tactic from Nolan's directive, not a prevention mechanism; covers only #1
   and only partially (container queries can still overflow a too-small
   container).
5. Per-component intrinsic-width precomputation without an oracle. FAIL-1.
   Without the render-then-measure step it is a prediction about layout, and
   FL-20260921-033 proved predictions wrong (valid in isolation, overflowing in
   composition). Collapses into Survivor 1 once measurement is added.
6. Content-Security-Policy as a backstop. FAIL-1, FAIL-2. Prevents only #2
   (browser-enforced script policy blocks javascript: navigation as a last
   resort); none of the other 8 classes is affected. Good defense in depth, not
   a multi-class mechanism. FAIL-1 explicitly carried this over from FAIL-2's
   cut list.
7. URL reputation or external safety-check API at acquisition. FAIL-2.
   Prevents only #2, depends on a third party, at the wrong layer, and says
   nothing about visibility, claims, or any other class.
8. Sandboxed iframe rendering of third-party content. FAIL-6. Contains script
   execution (one class, #2) but does nothing for visibility or any other
   class; fails the two-class rule.
9. Rank-Math-specific @graph patch (fix the one site's shape). FAIL-3. Repairs
   the Coppersmith instance but prevents no other class; it is the site-local
   patch the CEO rule explicitly forbids, and it teaches the extractor nothing
   about the next unknown shape.
10. Pinning jsonld@9.0.0 and deleting the custom processor. FAIL-3. The actual
    historical repair, but a one-class fix; pinning a library says nothing about
    drift detection, conflict preservation, correction survival, or any other
    class.
11. Browser-rendered acquisition fallback (Level 2 of the acquisition stack).
    FAIL-3. Fetches JS-rendered content the static path cannot see, but it is a
    different blindness (rendering vs parsing) and prevents no second failure
    class.
12. Sandbox nondeterminism interdiction alone. FAIL-4 (LANE-4 M-3). Single
    class: it only hardens #4. Cut as standalone; folded into S1 as the
    enforcement layer (lint/gate the render path for wall-clock/RNG/ambient
    I-O).
13. Record-once SideEffect for legitimate nondeterminism. FAIL-4 (LANE-4 M-13).
    Single class: quarantines only #4's edge cases (build timestamps, nonces).
    Cut as standalone; folded into S1 (a recorded value is just a declared
    input) and S4 (record under a derived name).
14. URL allowlist at the seam alone (without the typed model). FAIL-4. Single
    class (#2). Cut as standalone; folded into S3 where URL safety is one axis
    of the same gate that also covers #5 and #6.
15. Mobile-overflow viewport fixture test (render at 320px, assert no
    horizontal overflow). FAIL-4. Single class (#1). Legitimate test, not a
    multi-class mechanism.
16. Graph-blindness extraction completeness check (reconcile @graph entity
    count against extracted objects). FAIL-4. Single class (#3). Legitimate
    check, not a multi-class mechanism.
17. Deterministic full re-render with no owner layer. FAIL-8. Determinism
    reproduces whatever the inputs say; a deterministic re-acquire-and-overwrite
    pipeline loses corrections deterministically and on schedule. It prevents
    #4 (same inputs, same outputs) but says nothing about #8. See FLAG 3: this
    is the base layer FAIL-4's survivors depend on.
18. Post-render snapshot diffing (compare rendered pages before and after
    regen). FAIL-8. A detector, not a preventer; it reports loss after it
    happened and alarms on #4 only. It stops nothing, creates no anchor, emits
    no conflict state, and offers no policy for #8 or #9.
19. Freezing the source (never re-acquire after first observation). FAIL-8.
    Prevents #8 by abolishing regeneration, but the product requirement is
    source-refresh merge ("source re-observation without destroying owner
    intent"). Freezing guarantees stale data and lets stale claims persist
    unchallenged (#5). Fails the hard rule honestly and kills the feature it
    claims to protect.
20. Per-tenant claim-template allowlists. FAIL-5. Prevents at most one class
    (#5) and only by brittleness; fails the >=2 hard rule and does not
    generalize across businesses.
21. Per-viewer ACLs evaluated at render. FAIL-6. Public FYD sites have
    anonymous viewers, so there is no per-viewer identity to check against; this
    collapses to the public-visible flag anyway and prevents only #6. See FLAG 5
    for the resemblance to FAIL-6 S3.
22. Separate per-tenant databases with no shared identity. FAIL-6. Contradicts
    the taxonomy (two tenants may share one canonical public observation with
    different private state); it prevents #6 by duplication but breaks the
    shared-observation model and helps no second class.
23. Cache memoization of deterministic steps. FAIL-4 (LANE-7 M15). Prevents
    none of the 9; it is a performance optimization, and a wrongly keyed cache
    is itself a drift SOURCE (stale reuse).
24. Idempotency keys for effects. FAIL-4 (LANE-12 M1/M2). Prevents duplicate
    side-effect application, which is not one of the 9; correction double-apply
    is a different failure than correction loss.
25. Saga / compensation patterns. FAIL-4 (LANE-12 M8/M9). Govern multi-step
    effect rollback; none of the 9 is a partial-effect problem.
26. Owner-wins-always (unconditional overwrite, no conflict state). FAIL-8.
    Prevents #8 only; it collapses the source contradiction into the owner
    value with no record of the source's new claim, which is #9's failure
    shape (conflict-collapse) with the polarity flipped. A mechanism that fixes
    #8 by guaranteeing #9 cannot pass the >=2 rule. See FLAG 1.
27. "Confidence-scored auto-reconcile" (pick the winner with a score). FAIL-9.
    It still merges and still deletes the loser; a score on a silent decision
    is the same failure with instrumentation.
28. Majority-vote across sources. FAIL-9. Three wrong aggregators outvote the
    owner's single true listing; replaces information destruction with a
    different wrong answer, and prevents nothing among the 9.
29. Deduplicate identical strings across sources. FAIL-9. Identity hygiene, not
    conflict handling; identical strings are not conflicts, so this prevents
    none of the 9 classes.
30. Copy-level similarity checks across sites (text overlap, cosine
    similarity). FAIL-7. Fails the #7 shape itself, which is structural
    identity; two structurally identical sites with paraphrased copy pass, and
    no other class is affected.
31. More template variants (a bigger fixed template menu). FAIL-7. Variance
    without evidence coupling; the planner can still select the same template
    twice, so clone-sitespecs recurs, and no second class is touched.
32. "Just run it twice" as the whole strategy. FAIL-4. This is STEP-01's
    current guard and it detects drift without preventing it; the lane's S1+S2
    are what make run-twice a verification instead of a hope. Cut as a
    mechanism (kept as a test inside S1).

## (b) Non-mechanisms

Human gates, prompt wishes, labels, logs, concealment, and failures named as
mechanisms. These prevent nothing systematically across regenerations.

33. Human review / owner approval gates in every form. Lanes cut by, with names
    as written:
    - FAIL-1: human viewport QA on a real phone. Not a mechanism at all; it is
      the current state, which is precisely the failure (FL-20260921-033 stayed
      OPEN awaiting human proof).
    - FAIL-2: human review or owner approval of URLs before render.
      Non-deterministic, non-scalable, and not a mechanism; prevents nothing
      systematically across regenerations.
    - FAIL-3: human review of extraction output before proceduralize.
      Non-deterministic, non-scalable, not a mechanism; prevents nothing
      systematically across the perpetual onboarding loop.
    - FAIL-5: human review gate on every render. Does not prevent at machine
      speed and contradicts the locked ownership (verifier, not eyeball, owns
      "no invented claims"); prevents zero classes deterministically.
    - FAIL-6: human review of rendered output before publish. Prevents only #6,
      does not scale, and is a process patch, not a mechanism.
    - FAIL-7: human review of every generated site before publish. A
      non-scalable gate, not a build property; it prevents nothing across
      regenerations and cannot run inside the autonomous pipeline.
    - FAIL-4: interrupt / human-in-the-loop resume machinery (LANE-7 M7/M8).
      Irrelevant to the 9; governs pausing, not determinism.
    - FAIL-8: re-asking the owner about every field after every regen.
      Non-scalable and non-deterministic; owner attention is finite, so in
      practice it degrades to re-asking about nothing or to rubber-stamping.
      Prevents #8 only when the owner answers; covers no other class.
    - FAIL-9: "always ask the owner a clarifying question" as the sole
      mechanism. Blocks on human availability; when the owner does not respond,
      the system must still do something non-silent. See FLAG 4 for the
      boundary with FAIL-9 M4.
34. Prompt instructions telling the LLM not to hallucinate. FAIL-5. DATA NOT
    PRESENT beats prompt instruction; prompts are advisory, not a mechanism.
    The lane's Survivor 2 (prevention-first generation) is the positive form of
    this cut: the guarantee comes from withholding unsupported inputs and
    deterministically validating bindings, not from instructions.
35. LLM-as-judge uniqueness scoring. FAIL-7. Non-deterministic, unexplainable,
    and the planner grading its own homework through a larger model (the
    LANE-18 self-trust flaw); prevents nothing verifiably across
    regenerations.
36. Logs and labels without enforced checks:
    - FAIL-3: unstructured extraction logging ("log everything and grep
      later"). A log line nobody asserts on is the same silence with more
      bytes; Survivor 2 differs precisely because the receipt carries an
      enforced accounting invariant, not volume.
    - FAIL-5: "generated copy" watermarking alone. Labeling a sentence as
      generated without binding validation does not prevent invented
      predicates; a label is not a check.
    - FAIL-6: audit logging of every render bind. Detective, not preventive;
      a log written after a leak prevents nothing.
    - FAIL-8: append-only correction history with no re-application. A log is
      a museum, not a guard; history records what was lost but no read path
      re-applies it, so it prevents nothing, including #8. Memory's "without
      erasing history" only helps when paired with a re-applying overlay
      (Survivor 1).
37. Global overflow-x:hidden. FAIL-1. Masks only #1 while destroying the
    evidence (the ancestor trace can no longer find the owner), and masks
    nothing else; it converts a visible failure into an invisible one. An
    anti-mechanism: concealment, not prevention.
38. The failure itself, named as a mechanism:
    - FAIL-8: last-writer-wins on the merged record. This is the failure, not a
      mechanism; whoever writes last wins silently, which guarantees #8
      whenever the write order is source-last. It prevents nothing.
    - FAIL-9: freshness-weighted last-write-wins. The failure mode named as a
      mechanism; newer does not mean truer (a stale Google listing is newer
      than nothing, and a website change made today may be wrong).
    - FAIL-9: "one canonical hours field, sources fill it in order." That is
      just the merge restated as a schema choice; destroys disagreement by
      construction.
    - FAIL-7: reusing or caching one spec across tenants. That is the failure
      itself, not a prevention; it guarantees clones by construction.

## (c) Doctrine-forbidden

Mechanisms explicitly ruled out by Nolan's doctrine or the architecture's
locked constraints.

39. Universal generated-prose factuality verifier (FYD-008). FAIL-5. Nolan
    explicitly rejected it as an open-ended semantic problem; post-hoc
    detection cannot be load-bearing, prevention-first generation can.
40. ClaimAuthority / central fact authority. FAIL-5. Explicitly forbidden; a
    verifier that authors truth collapses the evidence/object separation the
    whole architecture rests on.
41. LLM semantic comparison for conflict detection. FAIL-9. Nondeterministic
    and unverifiable; conflict detection must be evidence-grounded (distinct
    sources, non-identical values for the same field), not an opinion. Per the
    No-ClaimAuthority rule, conflict is a property of evidence, not a new
    authority, and an LLM verdict is exactly a new authority. See FLAG 2: the
    lane's own M1 needs semantic normalization that this cut forbids.
42. Output variance maximization (demand arbitrary difference to pass). FAIL-7.
    Violates the good-similarity rule (memory/2026-09-21.md L657,
    "deterministic similarity is GOOD when the underlying evidence is
    similar"); it prevents #7 only by gaming the metric and manufactures the
    arbitrary-layout failure the ruling explicitly forbids.
43. Random per-tenant layout jitter. FAIL-7. Destroys deterministic replay
    (dogfood fail condition, "must survive replay"); prevents nothing
    systematically and makes #4 fixture-drift strictly worse.

## (d) Wrong-layer

Correct idea, wrong enforcement point. The mechanism as cut either guards the
wrong boundary or applies the right tool at the wrong seam.

44. Source-side filtering only (acquisition L0 gate alone). FAIL-2. A single
    filtering layer is exactly what FL-20260921-031 proved insufficient;
    escaping passed upstream while the sink stayed unguarded, so one upstream
    layer is not a mechanism against a seam-crossing class. The enforcement
    belongs at the sink (Survivor 2), not at acquisition.
45. HTML escaping at render. FAIL-2. Prevents markup injection only;
    href="javascript:..." survives escaping fully functional, which is
    literally the observed failure shape (escaping passed, URL sink remained).
    Right tool, wrong sink: it guards the markup seam, not the URL seam.
46. Render-time field stripping per template. FAIL-6. It patches one output
    channel; the Pergola leak traveled in the script payload channel the
    template never saw. The enforcement belongs at a single projection
    chokepoint (Survivor 1), not per template.
47. Encrypting private fields at rest. FAIL-6. The renderer needs plaintext to
    decide what to show, so encryption prevents neither the projection error
    nor any second class. A storage-layer answer to a projection-layer
    problem.
48. Client-side filtering of private objects after fetch. FAIL-6. The private
    data already crossed the boundary into the browser; filtering after
    arrival is the Pergola failure restated. The enforcement belongs before
    the boundary, not after it.
49. Schema.org type allowlist at extraction (only emit known business types).
    FAIL-3. Actively anti-coverage; it converts unknown-type blindness from a
    bug into policy and trades one silent drop for another, preventing
    nothing. The enforcement belongs at the unknown-shape quarantine with an
    accounting invariant (Survivor 3), not as an extraction gate.

## (e) Subsumed

A strictly weaker version of a survivor; adds no coverage beyond the survivor
it duplicates.

50. Regex or blocklist scheme matching on raw strings. FAIL-2. Defeated by the
    smuggling the real 17-case suite covers (control characters, leading
    whitespace, case tricks); a strictly weaker duplicate of Survivor 1
    (schema-typed trust with capability-specific allowlists) that adds no
    class coverage.
51. Trusted Types (browser API enforcement). FAIL-2. A platform-specific
    instance of Survivors 1+2 (typed values at sinks); subsumed, adds no new
    class coverage.
52. Approval digest binding alone (baseStateDigest/baseViewDigest on the
    patch, without the decision store). FAIL-8. Subsumed by Survivor 1; digest
    binding is a field of the typed patch, and without the dedicated store
    plus re-apply-on-read it is a signature on a correction that no read path
    consults.
53. Total-entity-count vanity metric (dashboard shows entities extracted).
    FAIL-3. The Coppersmith run's count was zero and nobody noticed; a count
    without the in-vs-out reconciliation invariant is exactly the silence this
    class needs, and it is subsumed by Survivor 2 (extraction receipts with
    enforced accounting).
54. Outright ban on duplicate structures (reject any two identical specs).
    FAIL-7. Subsumed by Survivor 1's coupling invariant (input-output variance
    coupling), and without the d_in half it rejects legitimately similar
    businesses, violating the good-similarity rule.
55. Version/patch markers for code evolution (LANE-4 M-14) as standalone.
    FAIL-4. Governs deploy-time semantics for in-flight runs, not render
    determinism; its portable value (rendererVersion as a declared input) is
    folded into S1.

---

## Merge notes (dedupe decisions)

- Human gates merged into one entry because the lanes' one-line reasons are
  substantively identical: non-deterministic, non-scalable, prevents nothing
  systematically across regenerations. The nine names differ only in the stage
  gated (viewport QA, URL approval, extraction review, render gate, pre-publish
  review, site pre-publish review, resume machinery, re-asking every field,
  ask-owner as sole mechanism). Kept as sub-bullets so Nolan sees every lane's
  verdict.
- "Always ask the owner as the sole mechanism" (FAIL-9) stays inside the human
  cluster with a pointer to FLAG 4, because the lane's M4 survivor also asks
  the owner; the cut's rationale ("as the sole mechanism") is what
  distinguishes them.
- The logging/labels cluster merged because each lane's reason makes the same
  structural point: a record or label that no enforced check consults changes
  nothing. The FAIL-3 entry adds the positive contrast (receipts carry an
  enforced accounting invariant).
- Failure-as-mechanism merged across FAIL-7, FAIL-8, FAIL-9 because each is the
  same anti-pattern: the failure mode restated in mechanism clothing.
- CSP merged from FAIL-1 and FAIL-2 (same mechanism, same reason; FAIL-1
  explicitly carried it over).
- FAIL-4's cut list already documented its own folds into S1/S2/S3/S4; those
  entries live in (a) with the fold noted, not in (e), because the lanes cut
  them as standalone single-class mechanisms rather than as weaker versions
  of a named survivor.
- FAIL-4 cut the mobile-overflow viewport fixture test and the extraction
  completeness check as single-class checks; these are the empirical bones of
  FAIL-1 Survivor 1 and FAIL-3 Survivor 2, but the lanes cut them as
  standalone mechanisms while keeping the spirit inside the survivors. No
  contradiction, just a category boundary between test and mechanism.
- FAIL-7's "reusing or caching one spec across tenants" and FAIL-9's "one
  canonical hours field" are both the failure restated as schema/cache choice;
  merged into the failure-as-mechanism entry.

## Contradiction flags (mapper decision points, not settled cuts)

FLAG 1. Cut vs survivor inside the same lane: FAIL-8 cut "owner-wins-always"
(entry 26) for fixing #8 by guaranteeing #9, while FAIL-8 Survivor 2
(three-way merge, owner wins ties) depends on an owner-wins rule at merge
time. The lane's own falsification report states the boundary: S2 survives the
cut only under three conditions (tie on an owner-asserted field; the losing
value survives as a named visible record; the conflict has a lifetime policy
with a default and a clock). As written, S2 satisfies the first two and is
missing the third, and its wording ("fields with an owner decision") quietly
widens the first to include confirm-facts. The falsification verdict: S2 is
"one missing clock and one wording fix away from being the cut version with
better documentation." Mapper decision: either add the clock and narrow the
wording, or the survivor collapses into the cut.

FLAG 2. Cut forbids what a survivor needs: FAIL-9 cut "LLM semantic comparison
for conflict detection" (entry 41) on the grounds that semantic judgment is a
new authority forbidden by the No-ClaimAuthority rule, while FAIL-9 M1
(conflict as first-class evidence state) needs semantic normalization to
avoid a false-conflict explosion ("St." vs "Street", "8a-5p" vs
"08:00-17:00"): without normalization it preserves noise, not signal. The
lane's falsification report states normalization IS a semantic authority that
M1's own grounding forbids, and open question 1 asks who owns the canonical
normalization. So the cut list's detection criterion ("distinct sources,
non-identical values for the same field") is undefined until normalization
exists. Mapper decision: either name a normalization authority (which
contradicts the cut), or accept the false-conflict explosion (which
contradicts M1). This is the sharpest contradiction in the set.

FLAG 3. Cut is another lane's foundation: FAIL-8 cut "deterministic full
re-render with no owner layer" (entry 17) as a single-class mechanism
(prevents #4 only), while FAIL-4 S1 (declared-input purity) and S2
(replay-mismatch tripwire) DEPEND on deterministic re-derivation as their base
layer; byte-comparing a re-render is literally what they do. The cut is
correct as a standalone multi-class claim, but the mechanism must be retained
as the base layer, not discarded from the system. Mapper decision: keep
deterministic re-render as infrastructure beneath the survivors, with the
owner layer added on top (which is exactly FAIL-8 S1's design).

FLAG 4. Boundary case between cut and survivor: FAIL-9 cut "always ask the
owner as the sole mechanism" (entry 33 sub-bullet) because it blocks on human
availability with no non-silent fallback, while FAIL-9 M4 (conflict surfacing
as owner correction tasks) IS owner-asking. The reconciliation is "sole" vs
"layered": M4 is meant to sit on M2 (certainty attenuation at the answer seam)
and M3 (explicit source-priority policy, loser stays visible) so the system
does something non-silent while waiting. Mapper decision: define the fallback
contract precisely (what renders while the owner task is open, and for how
long) or M4 is the cut version with a task queue.

FLAG 5. Resemblance to watch: FAIL-6 cut "per-viewer ACLs evaluated at render"
(entry 21) because public FYD sites have anonymous viewers (no identity to
check, collapses to the public-visible flag), while FAIL-6 S3 (trusted-context
tenant enforcement at every read) also enforces context at read time. The
contexts differ (tenant/owner license vs viewer identity) and the cut's reason
does not touch S3, but both are "check context at the read boundary"
mechanisms. Mapper decision: keep the two enforcement contexts explicitly
distinct (owner/tenant context vs anonymous viewer) so S3 does not drift back
into the cut pattern.

## Sources

All entries verbatim-sourced from the "Cut list" sections of:
- failures/FAIL-1-mobile-overflow.md (8 entries)
- failures/FAIL-2-unsafe-url.md (7 entries)
- failures/FAIL-3-graph-blindness.md (7 entries)
- failures/FAIL-4-fixture-drift.md (11 entries)
- failures/FAIL-5-claim-binding.md (6 entries)
- failures/FAIL-6-visibility-error.md (8 entries)
- failures/FAIL-7-clone-sitespecs.md (8 entries)
- failures/FAIL-8-correction-loss.md (8 entries)
- failures/FAIL-9-conflict-collapse.md (7 entries)

Falsification files were consulted only to name the contradiction flags
(FLAG 1 draws on FAIL-8-falsification; FLAG 2 draws on FAIL-9-falsification);
no cut entries were taken from them.
