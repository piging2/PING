# FAIL-1: MOBILE OVERFLOW - mechanism hunt

**Failure class:** generated layout exceeding a fixed viewport constraint; content wider than the viewport, 320px bugs, horizontal scrolling on phones.
**Date:** 2026-09-23. **Mode:** research only. No implementation.

## (a) Grounding: the real instances

The general shape: a generator emits a layout whose intrinsic width exceeds a fixed viewport, and the excess is discovered only by a human looking at a phone. The generator never knew the constraint; nothing in the pipeline measured the actual rendered result.

**Real instance 1 - FL-20260921-033 (memory/2026-09-21.md L714).** Mobile browser result: desktop clean for both FYD demo sites, but both clipped hero text/content at the right edge at 375px. More than 20 read-only/static bisection variants isolated the trigger: renderer section HTML was valid and clean in isolation; overflow appeared only when non-empty content preceded the hero in the composed page, pushing intrinsic width to roughly 500-580px. The exact CSS mechanism was never fully isolated. No repo source was changed. Status stayed OPEN as the earliest open boundary, with required next proof stated as: identify the actual overflowing owner on both sites, fix only that owner, re-run desktop plus 375px checks. A 375px ancestor-tracing script exists in the tooling.

**Real instance 2 - the standing assertion (FYD-MOBILE-OBJECT-EXPERIENCE-REBUILD-2026-09-23.md, lines 493-499).** The rebuild directive's test matrix (320/360/375/390/430 + desktop; object counts 1/3/8/20; long names, missing media, hidden objects, capability edge cases) carries an explicit assertion list: NO horizontal overflow, NO tiny touch targets, NO object hidden solely because the viewport is small, NO capability disappearing merely because the viewport changed. The assertion exists as prose in a directive; nothing in the pipeline runs it.

**Real instance 3 - the static-scroll directive (FYD-MOBILE-STATIC-SCROLL-DIRECTIVE-2026-09-23.md, line 418).** Nolan's binding revision: ZERO HORIZONTAL OVERFLOW during ordinary scrolling, tested across load, scroll both directions, tap, open/close All Objects, open/close Ask FYD, contact, nav, back, orientation. Floating/dock chrome removed; objects render in normal document flow. The constraint is stated as absolute; the enforcement mechanism is still human eyes on a phone.

**Real instance 4 - the fixed-artboard near miss (memory/2026-09-22.md L1080).** A 216px fixed artboard risked overflowing its grid cell on very narrow viewports; the resting 64px circle sat centered in a 216px footprint with a wide empty margin column. Fixed pixel dimensions authored without knowledge of the container are the recurring root shape.

**Real instance 5 - the Circle hard invariant (memory/2026-09-22.md L1501).** The default Circle carries no vertical scrolling and absolutely no horizontal scrolling; failure to fit means the composition is wrong, not that overflow should be added. The product rule is "compose correctly," but the generator has no way to know when its composition fails the rule except after a human reports it.

General shape confirmed: unconstrained generation plus no measurement of the actual rendered result equals a class that can only be caught by human viewport QA. Everything below is judged against that shape.

## (b) Surviving mechanisms

Hard rule applied: a candidate survives only if it prevents at least 2 of the 9 failure classes, with a crisp reason per class. Each survivor gets a falsifiable test.

---

### Survivor 1: Post-generation empirical oracle (render, measure, assert, repair-or-block)

**How it works.** The pipeline never trusts the generator's intent; it measures the actual rendered output against a standing assertion suite, and a failed assertion either triggers an automatic repair (trace to the overflowing owner, constrain it) or blocks promotion of the build. The harness is one mechanism with pluggable assertions, each a concrete oracle over measured output:

- **Viewport assertion:** render at every matrix width (320/360/375/390/430 + desktop); assert `document.scrollWidth <= clientWidth` everywhere. On violation, walk the ancestor chain from the overflowing node (the FL-20260921-033 ancestor-tracing script is the seed of this) to name the owner, then repair by constraining that owner and re-measure. This is the direct descendant of the real incident: the oracle does what the 20 bisection variants did, automatically.
- **Determinism assertion:** regenerate from identical inputs and byte-compare SiteSpec output. Mismatch blocks promotion and is logged as drift, never silently shipped.
- **Correction-preservation assertion:** owner corrections are registered as expected-output invariants; every regen output is checked to contain them; absence blocks promotion.
- **Structural-divergence assertion:** given two input graphs that differ beyond a threshold, assert the generated sites' structural signatures differ proportionally; structurally identical output from distinct graphs blocks promotion.

Wave-1 cross-check: the same measure-don't-trust discipline appears in LANE-18's adversarial coordinator (verify claims against artifacts, not assertions) and LANE-12's event-comparison primitive (compare ordered histories, return first difference). The oracle is the PING-shaped instance of that family.

**Prevents 4 classes:**

- **#1 mobile-overflow:** overflow is a measured property of rendered output, not a code-review hope; a build that scrolls horizontally at 320px cannot be promoted, and the ancestor trace names the owner instead of leaving a 500-580px mystery.
- **#4 fixture-drift:** same inputs producing different output is exactly what the determinism assertion measures; silent drift becomes a blocked build with a diff, because the oracle compares instead of assuming stability.
- **#7 clone-sitespecs:** structurally identical sites from distinct graphs fail the divergence assertion, so the undifferentiated output cannot ship; the generator is forced to reflect graph differences in structure.
- **#8 correction-loss:** a regen that drops an owner correction fails the preservation assertion before it reaches anyone's phone; the correction is an expected-output invariant, not a wish.

**Falsifiable test.**

- Input: three poisoned fixtures. (i) A graph whose hero section overflows at 375px (recreate the FL-20260921-033 shape: non-empty content before the hero). (ii) A fixture regenerated twice with a nondeterministic ordering bug injected between runs. (iii) A regen run with a registered owner correction deleted from the correction store mid-pipeline. Plus a control: a clean fixture known to pass.
- Procedure: run the oracle harness on each fixture end to end, with promotion gated on all assertions passing.
- Expected observable outcome: fixture (i) fails the viewport assertion, names the overflowing owner via the ancestor trace, and either repairs (re-measure passes) or blocks promotion; fixture (ii) fails the determinism assertion with a byte diff shown; fixture (iii) fails the preservation assertion naming the lost correction; the control passes and promotes.
- Proves the mechanism DOESN'T work: if any poisoned fixture promotes anyway, or if the harness reports pass on fixture (i) while a real 320px render still scrolls horizontally, the oracle is decorative. The strongest falsifier is the last clause: the oracle's verdict must agree with an independent manual 320px browser check on every fixture.

---

### Survivor 2: Typed projection seam with capability contracts

**How it works.** The projection seam (graph fields becoming rendered output) accepts only typed values whose constructors enforce the contract, and raw untyped material cannot enter the render tree. Trust metadata rides on the type, not on string conventions. The contract set includes geometry: layout slots in SiteSpec are typed with explicit inline-extent bounds (fractions of the viewport, never bare pixels), so an unbounded box cannot be constructed; a fixed 216px artboard is unrepresentable in the type unless its container contract explicitly permits it. This generalizes FAIL-2's Survivor 1 (URL capability types) from trust contracts to geometry contracts; the geometry type is the new coverage.

**Prevents 4 classes:**

- **#1 mobile-overflow:** a layout type with a max-inline-extent bound makes the overflowing composition inconstructible; the generator cannot emit what the type cannot express, so the 216px-artboard and 500-580px-hero shapes fail at construction, not on a phone.
- **#2 unsafe-url:** URL slots accept only capability-typed URLs (navigation claims http/https, calling claims normalized tel:, email claims validated mailto:); a javascript: string has no claiming capability and can never become a URL-typed value. Convergence with FAIL-2 Survivor 1; counted here because the seam is one mechanism.
- **#5 claim-binding:** factual render slots accept only evidence-bound fact types; generated copy is a distinct type; an unbound claim cannot flow into a factual slot, only into the labeled generated-copy slot.
- **#6 visibility-error:** fields carry visibility classification on the type; a private-typed fact cannot be assigned to a public-render slot without an explicit, auditable declassification call.

**Falsifiable test.**

- Input: a source graph containing a layout node demanding a fixed 216px width inside a 320px container contract, a `javascript:alert(1)` website string, an unbound factual claim, and a private-typed home address in a public slot.
- Procedure: attempt to construct each typed value through the seam constructors; render whatever constructs successfully; inspect the output.
- Expected observable outcome: the 216px node fails construction against the container contract (or is coerced to the bound with the coercion logged); the javascript: string cannot become a URL-typed value; the unbound claim appears only in a generated-copy slot or not at all; the private address appears nowhere in public render.
- Proves the mechanism DOESN'T work: if any untyped raw value (a bare pixel width exceeding its container, a raw string in a URL slot, an unclassified address in a public slot) reaches the render tree, the type boundary is advisory and the mechanism is falsified. The critical probe is the escape hatch: if the codebase contains a single `as any` / raw-HTML injection path into the render tree that bypasses the constructors, the seam is decorative.

---

### Survivor 3: Canonical pure projection (output = pure function of declared inputs + pinned pipeline version)

**How it works.** The generated site is a pure function of a declared input set (object graph, owner corrections, owner presentation policy, evidence bindings) plus a pinned pipeline version. Any output change requires either an input change (auditable, attributed) or a version bump (a declared migration, never silent). Regeneration is re-evaluation of the same function, not a fresh creative act. This is determinism by construction, where Survivor 1's determinism assertion is determinism by measurement; the two compose (construct, then verify).

Wave-1 cross-check: LANE-12's canonical-key mechanism (sha256 over canonically serialized args, field separators making boundary collisions impossible) is the keying discipline this needs; LANE-5's deterministic replay (same journal, same output) is the execution discipline.

**Prevents 2 classes:**

- **#4 fixture-drift:** same inputs plus same pipeline version mathematically cannot produce different output; drift is only possible through an input change or version bump, both of which are declared events with provenance, so the "same inputs, different site" shape cannot occur silently.
- **#8 correction-loss:** owner corrections are first-class declared inputs, not side-channel edits; a pure function of its inputs cannot silently drop one, because dropping it would require removing it from the input set, which is an auditable event, or a function change, which is a version bump.

**Falsifiable test.**

- Input: a fixed input set (graph + one owner correction + pinned pipeline version vN). Run projection twice. Then run with the correction removed from the input set, and once more with pipeline version bumped to vN+1 (simulating a renderer change).
- Procedure: byte-compare all four outputs; inspect the provenance log for the runs that differ.
- Expected observable outcome: runs 1 and 2 are byte-identical; run 3 differs and the provenance log names the removed correction as the input change; run 4 differs and the log names the version bump. No run differs without a logged cause.
- Proves the mechanism DOESN'T work: if runs 1 and 2 differ (hidden nondeterminism: timestamps, map iteration order, random IDs leaking into output), or if any output difference lacks a logged input/version cause, the projection is not a pure function of its declared inputs and the mechanism is falsified. The hidden-nondeterminism probe is the load-bearing half: clock reads, RNG, and iteration order must be injected or excluded, per LANE-4's injected-clock discipline.

## (c) Cut list

Each candidate below was judged against the hard rule (must prevent at least 2 of the 9 classes). All fail it, each for one stated reason.

- **Layout constraint solver with overflow as a hard error.** CUT: prevents only #1; a solver that rejects unsatisfiable layouts says nothing about drift, claims, visibility, differentiation, corrections, or conflicts. Subsumed in practice by Survivor 1's viewport assertion, which measures reality instead of modeling it.
- **Horizontal-extent token budget propagated top-down.** CUT: prevents only #1; a budget on intrinsic width is a single-class guard with no coverage of any other class.
- **Fail-closed CSS defaults (min-width:0, max-width:100%, overflow-wrap everywhere).** CUT: prevents only #1, and only the accidental cases; it is a good default but a single-class tactic, not a mechanism.
- **Container-queries-only rule / device-name branch ban.** CUT: a rendering tactic from Nolan's directive, not a prevention mechanism; covers only #1 and only partially (container queries can still overflow a too-small container).
- **Human viewport QA on a real phone.** CUT: not a mechanism at all; it is the current state, which is precisely the failure (FL-20260921-033 stayed OPEN awaiting human proof).
- **Global overflow-x:hidden.** CUT: masks only #1 while destroying the evidence (the ancestor trace can no longer find the owner), and masks nothing else; it converts a visible failure into an invisible one.
- **Content-Security-Policy as a backstop.** CUT: prevents only #2; carried over from FAIL-2's cut list, unaffected by the viewport class.
- **Per-component intrinsic-width precomputation without an oracle.** CUT: computing min/max content widths at generation time is useful data, but without the render-then-measure step it is a prediction about layout, and FL-20260921-033 proved predictions wrong (valid in isolation, overflowing in composition); it collapses into Survivor 1 once the measurement is added.

## (d) Open questions

1. **Repair authority.** When Survivor 1's oracle finds the overflowing owner, who is allowed to repair it: automatic constraint with a logged coercion, or block-and-escalate to the owner? Nolan's standing rule decides at 80 percent with evidence; does an automatic layout repair meet that bar, or does silent repair recreate the "silent change" shape of #4?
2. **Viewport matrix cost.** Rendering at 320/360/375/390/430 + desktop per regen, per business, is a real compute cost at scale. Is the oracle run on every regen or sampled? Sampling reopens the class on unsampled widths; every-regen is the honest answer but needs a cost model.
3. **Structural-signature definition.** Survivor 1's divergence assertion needs a structural signature of a generated site that is sensitive to real differentiation (business type, object mix, density) and insensitive to cosmetic churn (class-name hashes, ordering noise). What is the signature, and who decides the divergence threshold? A bad threshold makes the assertion either vacuous or a permanent build blocker.
4. **Type-system escape hatches.** Survivor 2 is only as strong as its weakest bypass. Is there an inventory of every path by which untyped material can reach the render tree (raw HTML slots, owner custom CSS, third-party embeds, Ask FYD dynamic content)? An unlisted bypass is an unguarded seam; see FAIL-2's open question 3 on sink inventory.
5. **Version-bump migration semantics.** Survivor 3 makes pipeline version bumps declared events, but a renderer upgrade that changes all sites at once is still a fleet-wide visual change. Does a version bump require re-running Survivor 1's oracle across the fleet before promotion, or is the bump itself the approval?
6. **Correction identity across source change.** Survivor 3 treats corrections as declared inputs, but #8's harder half is "source change": the underlying business data changes and the correction must re-anchor to the new source. What is the correction's identity when its anchor moved? A correction keyed to a stale node ID silently stops applying, which is #8 wearing a different hat.
7. **Oracle vs. Ask FYD.** Both survivors gate the static site projection. Ask FYD answers questions from the graph at query time, a second projection seam with generated layout (answer cards, carousels). Does the viewport oracle run on conversational output too, or does the class reopen through the chat surface?
