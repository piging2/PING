# FAIL-1 FALSIFICATION: adversarial attacks on the three survivors

**Date:** 2026-09-23. **Mode:** research only. No implementation code.
**Method:** analytical dry-run. Each survivor's own falsifiable test was executed as a
trace against adversarial fixtures: for each attack I ask whether the test *as written*
would catch it, and where it would not, I write the strengthened test. No code was built;
the "runs" below are careful simulations grounded in documented platform behavior
(spec facts verified where load-bearing, e.g. fixed-position elements provably cannot
contribute to `documentElement.scrollWidth`).

**Standing rule for verdicts:** WITHSTANDS (claim holds against the attacks),
WEAKENED (claim holds for a sub-shape but fails for a real, in-scope shape),
FALLS (the claimed class is no longer prevented; the class name is given).

---

## Survivor 1: Post-generation empirical oracle

Claimed: #1 mobile-overflow, #4 fixture-drift, #7 clone-sitespecs, #8 correction-loss.

### Attack A1: the measurement lies at measure time (fonts)

The viewport assertion renders headless and asserts `document.scrollWidth <= clientWidth`.
Web fonts load asynchronously. If measurement runs before `document.fonts.ready` resolves
(or if the headless environment lacks the fonts entirely and substitutes metrics-different
fallbacks), the measured `scrollWidth` is computed with fallback glyph metrics while the
real phone renders with the webfont after swap. A heading that fits in the fallback can
overflow in the real font. Concrete fixture: hero heading set in a display webfont whose
advance widths exceed the fallback's by 8-12%; oracle measures pre-swap, passes; iPhone
post-swap scrolls horizontally at 375px.

**Does the test as written catch it?** No. The poison fixture (i) is a hero that
overflows *at render time in the oracle's own environment* (a cooperating poison). The
test never specifies font-settling discipline, and its "independent manual 320px browser
check" is a single check with no stated timing relative to font load. The oracle and the
manual check can agree with each other (both pre-swap or both with fallbacks) while both
disagree with the phone.

### Attack A2: the measurement lies about later content (lazy loading)

Images without intrinsic dimensions, IntersectionObserver-revealed sections, accordions,
and carousels change layout after load. The assertion is a load-time measurement;
`scrollWidth` at `load` says nothing about `scrollWidth` after the third lazy image
resolves or after the user scrolls (the static-scroll directive explicitly requires zero
overflow *during* scroll both directions, which the survivor's assertion does not test).

**Does the test catch it?** No. No lazy-content fixture exists, and the procedure has no
scroll-to-bottom / interaction step.

### Attack A3: the measurement is blind to fixed-position off-canvas panels

Verified spec fact: a `position: fixed` element cannot contribute to
`documentElement.scrollWidth`; it is positioned relative to the viewport and removed from
the document's scrollable overflow region. Off-canvas nav drawers, slide-in panels, and
the Ask FYD sheet are exactly this shape: parked off-canvas at load (invisible to the
oracle), overflowing when opened (never measured, because the oracle performs no
interactions). The FYD rebuild centers on exactly these components (All Objects sheet,
Ask FYD panel, nav).

**Does the test catch it?** No. The assertion measures document scroll at load; the
failure mode exists only post-interaction. This is a false-negative by construction, not
by bad luck.

### Attack A4: the measurement uses the wrong viewport quantity (100vw vs scrollbar)

`100vw` includes scrollbar width; on platforms with classic scrollbars a `width: 100vw`
element overflows horizontally by the scrollbar width whenever a vertical scrollbar is
present. The oracle's headless environment (overlay scrollbars or none) will not
reproduce it. Related: `dvh`/`svh`/`lvh` units resolve against real browser chrome (URL
bar show/hide); container queries keyed off block-axis or viewport-dependent containers
can resolve differently under real chrome than headless. The matrix (320/360/375/390/430)
varies width but not chrome, engine, or scrollbar policy.

**Does the test catch it?** No. The matrix varies one variable; the attack varies the
others.

### Attack A5: the measurement uses the wrong engine (WebKit-only overflow)

The oracle renders in headless Chromium (the only engine the harness can drive at scale).
iPhones run WebKit. Engine-divergent layout behaviors (flex/grid intrinsic-size
resolution, `100dvw` support timelines, rounding) mean a page can pass the Chromium
oracle and scroll on Safari. The test's "independent manual 320px browser check" does not
name the engine; one manual check cannot cover the matrix anyway.

**Does the test catch it?** No.

### Attack A6: sub-pixel rounding (DPR)

`scrollWidth` returns integers. True layout width 375.4px on a 375px viewport rounds to
375 and passes; on-device fractional rendering at DPR 2-3 can still show a hairline
overflow or trigger a scrollbar. Headless runs at DPR 1; phones do not.

**Does the test catch it?** No; the assertion's epsilon is unspecified (implicitly zero,
measured in integers).

### Attack A7: auto-repair falsifies the survivor's own #4 claim (self-attack)

This is the load-bearing one. The oracle offers "repair-or-block." Trace the auto-repair
branch against the survivor's *own* determinism assertion:

1. The ancestor trace names "the overflowing owner" from *measured* layout.
2. Measured layout depends on the environment (A1-A6: font timing, DPR, engine).
3. Therefore the repair decision (which node, which constraint) is a function of
   (declared inputs, environment), not of declared inputs alone.
4. If the repair mutates the SiteSpec (or the shipped DOM) without a provenance entry
   naming it as an input change, then two runs of the same pipeline version on the same
   declared inputs produce different output with no logged cause. That is exactly what
   the determinism assertion defines as drift, and exactly what the preservation logic
   defines as a silent change.

Worse, the repair has no correctness check beyond "re-measure passes": constraining the
wrong node (and the ancestor trace *can* name the wrong node, because FL-20260921-033
proved the overflow was compositional and emergent, not owned by any single section)
produces a passing-but-visually-broken site. The oracle asserts no-overflow, not
no-regression.

**Does the test as written catch it?** No. The test never runs the harness twice with
repair enabled and byte-compares, never varies the environment between runs, and never
checks that a repair appears in the provenance log as a declared input change. The
repair branch and the determinism assertion are mutually inconsistent as specified;
only block-and-escalate keeps them consistent. This resolves open question 1 against
auto-repair: silent repair does recreate the #4 drift shape, and it additionally breaks
Survivor 3's purity (see cross-survivor finding C1).

### Attack A8: the determinism assertion measures the wrong artifact

The assertion byte-compares *SiteSpec output*. The shipped artifact is rendered DOM. If
repair (A7) or any post-SiteSpec stage mutates the DOM, the byte-compare passes while
shipped output varies. The assertion guards the spec, not the site.

**Does the test catch it?** Fixture (ii) injects "a nondeterministic ordering bug between
runs" at the SiteSpec layer, a cooperating poison. A post-SiteSpec nondeterminism source
passes the test and still drifts the shipped site.

### Attack A9: correction-preservation checks the easy shape only

The test's poison (iii) deletes a correction from the correction store mid-pipeline.
Real #8 has harder shapes, all in scope of open question 6:

- **Anchor rot:** the correction stays in the store, but its anchor node ID no longer
  exists after a source change. The pure function looks up the anchor, finds nothing,
  applies nothing. Correction present in inputs, absent from output, and the only logged
  cause is "source changed," which does not name the lost correction.
- **Wrong-node re-anchor:** fuzzy re-anchoring attaches the correction to a
  similar-but-wrong node. A substring "contains" check for the correction text passes;
  the correction is in the wrong place. The assertion as specified ("checked to contain
  them") is a contains-check, not a placement-check.
- **Registration coverage:** only *registered* corrections are invariants. Any correction
  path that bypasses registration (manual hotfix, support-desk edit) is unprotected, and
  the mechanism's claim reads as universal.

**Does the test catch it?** Only the store-deletion shape. Anchor rot, wrong-node
re-anchor, and unregistered corrections all pass the test as written.

### Attack A10: the #7 claim is untestable as specified

The falsifiable test contains fixtures for the viewport, determinism, and preservation
assertions. There is **no fixture at all** for the structural-divergence assertion, and
the structural signature it depends on is open question 3 (undefined). An assertion with
no definition and no test provides no prevention. Additionally, the obvious gaming shape:
a generator that emits structurally identical sites with cosmetically varied class hashes
passes any signature that is (correctly) insensitive to cosmetic churn, while still
being clone-sitespecs in the human sense; conversely an oversensitive signature blocks
legitimate regeneration forever.

**Does the test catch it?** The test does not attempt it.

### Test-strength assessment (Survivor 1)

Genuine strength: the final clause ("the oracle's verdict must agree with an independent
manual 320px browser check on every fixture") is a real differential-oracle discipline;
if honored adversarially it is the strongest part of the whole FAIL-1 package.
Weaknesses: every poison fixture is *cooperating* (fails at measure time, in the
oracle's own environment, at the SiteSpec layer); the manual check is a single
engine-unnamed 320px check with no font-settling, scroll, or interaction protocol; the
#7 claim has no fixture; repair-enabled determinism is never tested; the determinism
assertion guards the wrong artifact; preservation is contains-not-placement.

### Strengthened test (Survivor 1)

Keep fixtures (i)-(iii) and the control, and add:
- (iv) **Font-swap fixture:** webfont with wider metrics than the fallback; oracle must
  wait for `document.fonts.ready`, and the manual check must be post-swap on a real
  device. Oracle verdict and device verdict must agree.
- (v) **Lazy-load fixture:** images without dimensions + IntersectionObserver sections;
  procedure includes scroll-to-bottom and idle-network wait before measuring.
- (vi) **Interaction fixture:** fixed off-canvas drawer + All Objects/Ask FYD sheets;
  procedure drives the static-scroll directive's interaction matrix (open/close every
  panel, both scroll directions, orientation); assert zero horizontal overflow *during*
  the matrix, measured per-panel (fixed panels are invisible to document scrollWidth,
  so each panel's own scrollWidth must be asserted when open).
- (vii) **Engine-parity fixture:** run the width matrix in Chromium *and* WebKit;
  verdicts must agree; disagreement blocks promotion.
- (viii) **Scrollbar fixture:** `width: 100vw` element on a classic-scrollbar profile;
  must fail or be rewritten to `%`-based sizing.
- (ix) **Repair determinism fixture:** run the harness twice with repair enabled across
  differing font-timing environments; byte-compare final outputs *and* require every
  repair to appear in the provenance log as a declared, attributed input change. Any
  unlogged repair, or any environment-dependent repair decision, falsifies the repair
  branch (leaving block-and-escalate).
- (x) **Divergence fixtures (requires defining the signature first):** near-duplicate
  input graphs must fail the divergence assertion; the *same* graph with cosmetic churn
  (class-hash rotation, section reorder that preserves semantics) must pass. Both
  directions, or the threshold is uncalibrated.
- (xi) **Correction placement fixture:** correction whose anchor rotted, and correction
  re-anchored to the wrong node; preservation assertion must be placement-aware (bound
  to the anchored node), not a substring contains-check.
- Change the determinism assertion to byte-compare the **shipped DOM**, not the
  SiteSpec, or run it at both layers and require agreement.

### Verdict: Survivor 1 WEAKENED

- **#1 mobile-overflow: WEAKENED.** The load-time `scrollWidth` assertion genuinely
  catches the FL-20260921-033 static shape (reproducible in a browser at measure time).
  It does not catch font-swap overflow, lazy-load overflow, interaction-triggered
  overflow (fixed off-canvas panels are spec-invisible to the measurement), 100vw
  scrollbar overflow, WebKit-only overflow, or sub-pixel DPR overflow. The claim "a
  build that scrolls horizontally at 320px cannot be promoted" is false as stated; it
  holds only for overflows detectable at load in the oracle's own engine and
  environment.
- **#4 fixture-drift: WEAKENED (branch-dependent).** Under block-and-escalate, the
  determinism assertion holds. Under auto-repair, the mechanism falsifies its own
  claim: repair decisions are environment-dependent and, unlogged, are silent drift
  (A7); the assertion also guards the SiteSpec while the shipped DOM can vary (A8).
- **#7 clone-sitespecs: FALLS as specified.** No signature definition, no test fixture;
  the prevention claim is vacuous until the signature exists and fixtures (x) pass.
- **#8 correction-loss: WEAKENED.** Store-deletion is caught; anchor rot, wrong-node
  re-anchor, and unregistered corrections are not (A9).

---

## Survivor 2: Typed projection seam with capability contracts

Claimed: #1 mobile-overflow, #2 unsafe-url, #5 claim-binding, #6 visibility-error.

### Attack B1: the flagship incident passes every constructor (emergent overflow)

The claim: "the 216px-artboard and 500-580px-hero shapes fail at construction."
The 216px artboard (authored fixed pixels) would indeed fail a container contract.
The 500-580px hero would not. FL-20260921-033's grounding is explicit: sections were
valid and clean *in isolation*; overflow appeared only in composition when non-empty
content preceded the hero, pushing intrinsic width to ~500-580px. No per-slot
constructor sees compositional intrinsic width; computing it requires a layout engine,
at which point the "type system" is a constraint solver wearing a type costume (and the
solver was cut from this file as single-class). Geometry types bound the *slot*; overflow
is a property of *content-vs-slot* (min-content propagation through flex/grid
`minmax(auto)` defaults, margin collapsing, intrinsic sizing). A slot typed "at most 1.0
of the viewport" containing content with a larger min-content width is well-typed and
overflowing. The type boundary is blind to the exact failure shape the class is
grounded in.

**Does the test as written catch it?** No. Its layout poison is the 216px fixed width,
the authored easy case. There is no emergent-composition fixture (sections valid in
isolation, overflowing in composition), which is the real incident.

### Attack B2: unbreakable strings from LLM copy

The seam types text slots but specifies no text contract. An LLM emitting a 60-character
URL, a tracking token, a hash, or a long compound with no break opportunities into a
hero heading satisfies every stated type (string in, fraction-of-viewport slot) and
overflows any container: min-content width exceeds the slot. `overflow-wrap` discipline
is CSS-default territory (cut from this file as a single-class tactic), not a type
guarantee, and the contract set does not include "maximum unbreakable run."

**Does the test catch it?** No text-content poison exists at all.

### Attack B3: the bound is expressed against the wrong quantity (100vw)

A slot typed "1.0 of the viewport" implemented as `width: 100vw` is well-typed and
overflows by the scrollbar width on classic-scrollbar platforms (see A4). The type
blesses the exact value that breaks. The contract confuses viewport units with
available inline space.

**Does the test catch it?** No.

### Attack B4: third-party embeds inject untyped layout at runtime

Real product need, explicitly in FYD's market: Google Maps embeds, review-carousel
widgets, booking widgets. Script-injected widgets insert DOM with their own inline
styles and fixed pixel widths *after* projection; the seam's constructors never see
them because they arrive at runtime, post-projection, outside the typed tree. An iframe
can be width-bounded by the seam, but script widgets are not iframes. Owner custom CSS
(`width: 600px !important` in a style block) is a string the type system cannot bound
without a CSS parser plus allowlist, which is not in the contract set.

**Does the test catch it?** No embed, widget, or custom-CSS poison exists.

### Attack B5: the required raw-HTML slot defeats the seam by the test's own criterion

The falsifiable test states the critical probe itself: "if the codebase contains a
single `as any` / raw-HTML injection path into the render tree that bypasses the
constructors, the seam is decorative." The product *requires* such a path: owners paste
embed codes (maps, reviews, booking). So either the seam is decorative by its own test,
or embeds travel a separate sanitized path, in which case #2 prevention for that region
of the render tree rests on the sanitizer, not the type system, and the typed claim is
true-but-insufficient: a `javascript:` string never needs to become URL-typed; it rides
in raw HTML. Consequences per class:

- **#2:** first-party typed slots hold (this is FAIL-2's verified core: the 17-case
  resolver suite, capability allowlists). The embed/raw-HTML region is untyped; its
  safety is a sanitizer property, untested here. Also `srcdoc` iframes and CSS `url()`
  in owner CSS are executable sinks outside the URL-typed slots.
- **#5:** the seam checks the *type* `EvidenceBoundFact`, not the validity of the
  binding. The evidence-linking stage (claim to evidence reference) sits upstream of the
  seam and is heuristic. Attack: a claim carrying a syntactically valid reference to
  real-but-non-entailing evidence. The constructor sees a well-formed reference and
  passes; an unbound-in-substance claim renders in a factual slot. The test's poison
  ("an unbound factual claim") is the cooperating case: presumably no reference at
  all. Type-level binding is a label, not entailment; entailment needs an NLI check,
  which is not a type check.
- **#6:** the silent-crossing shape is genuinely prevented for first-party paths (the
  claim is precisely scoped: "without an explicit, auditable declassification call").
  Weakening, not falsification: the *declassification call itself* is the new
  trust point. If the generator/projection code can invoke `declassify()` whenever a
  public slot needs filling (no governance on who may call it, no owner confirmation),
  the audit log records a leak that still ships; "auditable" is not "prevented."
  Second weakening: derivation leakage. A public slot rendering "serving the greater
  Grand Junction area" derived from a private home address never contains the address
  string; types track the value, not its derivatives.

**Does the test catch any of B5?** No. No embed-code fixture, no spurious-evidence
fixture, no generator-invoked-declassification fixture, and no procedure for verifying
the completeness of the render-tree entry-point inventory (open question 4: "an
unlisted bypass is an unguarded seam," but the test has no step that would fail on an
incomplete inventory).

### Test-strength assessment (Survivor 2)

Genuine strength: the escape-hatch probe is correctly identified as the load-bearing
criterion, and the #6 claim is precisely scoped (silent crossing), which is why #6 is
the one claim that survives this section. Weaknesses: every poison is first-party and
cooperating (authored fixed pixels, bare `javascript:` string, reference-less claim,
direct private-address assignment); the flagship *emergent* overflow shape is absent;
no text-content, embed, widget, custom-CSS, spurious-binding, or declassification
fixtures; no inventory-completeness procedure.

### Strengthened test (Survivor 2)

Keep the four existing poisons and add:
- (v) **Emergent-composition fixture:** sections individually valid against their
  container contracts, overflowing only in composition (the FL-20260921-033 shape).
  Expected: the seam *cannot* reject it at construction (documenting B1 as a known
  limitation), so this fixture must route to Survivor 1's oracle instead. The honest
  test asserts the seam's boundary, not its omnipotence.
- (vi) **Unbreakable-token fixture:** 80-character spaceless token in a hero text slot;
  must either fail a new text contract (max unbreakable run) or be flagged to the
  oracle. Absent a text contract, the seam passes it: record the gap.
- (vii) **100vw-scrollbar fixture:** `100vw` sizing under a classic-scrollbar profile;
  the contract must be re-expressed against available inline space, not viewport units.
- (viii) **Embed-code fixture:** Maps iframe + review-widget script + owner custom CSS
  with a fixed width. Assert: every byte reaches the render tree through either a
  constructor or an *inventoried* bypass, each bypass carrying its own mitigation test
  (sanitizer suite for HTML, allowlist for CSS properties). Uninventoried path:
  falsified.
- (ix) **Spurious-evidence fixture:** factual claim with a well-formed reference to
  non-entailing evidence; must not reach a factual slot without an entailment check.
  Documents that binding validity lives upstream of the seam.
- (x) **Declassification-governance fixture:** projection code invoking `declassify()`
  without owner authorization; assert the call is denied or escalated, not merely
  logged. Log-only declassification is a leak with a receipt.
- Add a static-analysis gate: enumerate all render-tree write paths; CI fails on any
  path that is neither constructor-mediated nor on the inventoried bypass list. This
  is the procedure that makes open question 4 testable.

### Verdict: Survivor 2 WEAKENED

- **#1 mobile-overflow: FALLS as claimed.** The typed seam prevents the authored
  fixed-pixel sub-shape (216px artboard) but not the emergent compositional sub-shape,
  which is the grounded flagship incident: sections valid in isolation pass every
  constructor and overflow in composition. Types bound slots; the incident lives in
  content-vs-slot. Unbreakable LLM tokens (B2), the 100vw quantity error (B3), runtime
  third-party widgets (B4), and owner custom CSS (B4) are further well-typed overflow
  paths. The sentence "the 500-580px-hero shapes fail at construction" is false.
- **#2 unsafe-url: WEAKENED.** First-party typed slots hold (FAIL-2's verified core
  stands). The product-required raw-HTML/embed region bypasses the constructors; its
  safety would be a sanitizer property, which this survivor neither specifies nor
  tests. `srcdoc` and CSS `url()` sinks included.
- **#5 claim-binding: WEAKENED.** The seam enforces binding *presence and shape*,
  not binding *validity*. A well-typed spurious binding (valid reference,
  non-entailing evidence) passes; binding validity is decided upstream of the seam by
  heuristic evidence-linking, which the test never probes.
- **#6 visibility-error: WITHSTANDS** for the claimed shape. Silent crossing of a
  private-typed fact into a public slot is prevented by construction; the test's direct
  poison would fail loudly. Caveats (not falsifications of the stated claim):
  declassification governance is unspecified, and derivation leakage (public text
  derived from private facts) is outside the type's view.

---

## Survivor 3: Canonical pure projection

Claimed: #4 fixture-drift, #8 correction-loss.

### Attack C1: the declared input set is incomplete, and completeness is never tested

Purity is a claim about the *completeness* of the declared input set, and the
falsifiable test never checks completeness. Concrete undeclared inputs, each capable
of changing output with no logged cause:

- **Wall clock:** "generated on" stamps, cache-busters, `new Date()` "current year"
  footers, relative times ("3 days ago"). The declared inputs (graph, corrections,
  presentation policy, evidence bindings, pipeline version) contain no clock. Either
  the renderer never reads time (product limitation: no dates anywhere) or purity is
  already broken. LANE-4's injected-clock discipline is cited as the fix, but injection
  means the clock value *is* an input; it is not in the declared set.
- **Iteration/merge order:** parallel shard merging in completion order; Python-stage
  `set` iteration under unpinned `PYTHONHASHSEED`; any stage whose output order
  depends on scheduling. Same machine, back-to-back runs may still pass (the test's
  runs 1 and 2), while the fleet drifts.
- **Filesystem order:** asset ingestion via directory glob in `readdir` encounter
  order, which varies across machines and checkouts. The test's two runs share a
  machine and miss cross-machine drift entirely.
- **Environment:** `TZ` (date formatting), locale (collation, number formatting),
  installed system fonts (fallback metrics feed layout-adjacent content like line
  breaks, which change pagination-like artifacts and image `srcset` selection).
- **Dependencies:** a semver-range install pulling a new minor of a renderer
  dependency changes output under an unchanged version label.

Each of these is a "same declared inputs, same version label, different output" case
with no logged cause, which is exactly the shape the test defines as falsifying
("if any output difference lacks a logged input/version cause"). The test as written
never mutates an undeclared input, so it never runs the falsifying case.

### Attack C2: the version pin itself drifts

"Pinned pipeline version" is unspecified as a mechanism. Under the natural
implementation (version string, tag, branch):

- A tag or branch named `vN` can be force-pushed; a container image `:vN` can be
  repointed. The label stays `vN`; the code changes; the provenance log records the
  label, which now lies.
- A dependency bump under a semver range changes executed code with no label change
  at all (C1's dependency case, restated at the version layer).
- The test's run 4 "bumps vN to vN+1 (simulating a renderer change)" cooperatively:
  the test performs the bump. Real drift is a change *without* a bump.

The claim holds only if the pin is a cryptographic digest of the full execution
closure (code, lockfile, templates, fonts, config) and the provenance log records the
digest. As specified ("pinned pipeline version"), that digest semantics is assumed,
not required.

### Attack C3: correction anchor rot (the harder half of #8)

Open question 6, unaddressed by the survivor. The correction remains a declared input;
its anchor node ID is deleted by a source change. The pure function looks up the
anchor, finds nothing, applies nothing. The output no longer reflects the correction;
the logged cause is "source changed," which is true and names nothing about the lost
correction. Purity is preserved (deterministic mapping of the new inputs) and the
correction is still lost. The survivor's reasoning ("a pure function of its inputs
cannot silently drop one, because dropping it would require removing it from the input
set") is wrong about the failure shape: the drop happens in the *lookup*, not in the
input set. The test's fixture (removing the correction from the input set) tests the
easy, cooperating shape.

Survivor 1's preservation assertion *would* catch anchor rot, but only if
placement-aware (see A9): a contains-check passes when the correction text survives
elsewhere.

### Attack C4: composition with Survivor 1's repair breaks purity

The file states Survivor 1 and Survivor 3 "compose (construct, then verify)." They do
not, under the repair branch. Survivor 1's auto-repair makes output a function of
(declared inputs, measurement environment) per A7. Composing an environment-dependent
repair stage after a pure projection yields an impure pipeline; Survivor 3's #4 claim
("same inputs plus same pipeline version mathematically cannot produce different
output") is then false of the composed system. The composition is sound only under
block-and-escalate, where the oracle never mutates output. This is the same evidence
as A7, read at the composition layer: the file's composition claim is inconsistent
with its repair-or-block disjunction.

### Attack C5: version-bump fleet change without fleet re-verification

Open question 5. Survivor 3 makes a renderer upgrade a declared event, but a declared
fleet-wide visual change can still ship overflow (or any regression) if the new
renderer introduces one. "Declared" is not "safe." Nothing in the specified machinery
requires re-running Survivor 1's oracle across the fleet on a version bump before
promotion. The bump is approved by being declared.

### Test-strength assessment (Survivor 3)

Genuine strength: the hidden-nondeterminism probe is the correct load-bearing test for
same-machine regen, and the provenance-cause requirement ("no output difference without
a logged cause") is the right falsification criterion, sharper than byte-compare alone.
Weaknesses: runs 1 and 2 share a machine and environment (miss cross-machine drift);
no undeclared-input mutation fixture (completeness assumed); the version bump is
performed cooperatively by the test (never tests label-without-change); the correction
fixture is store-deletion only (misses anchor rot); no composition test with Survivor
1's repair; no digest-pinning requirement on the version label.

### Strengthened test (Survivor 3)

Keep runs 1-4 and add:
- (v) **Cross-machine fixture:** runs 1 and 2 execute on different machines/checkouts
  (or with `PYTHONHASHSEED`, `TZ`, locale, and font availability varied). Byte-compare.
  Catches readdir order, hash-seed, locale, and font-availability leaks.
- (vi) **Undeclared-input mutation fixture:** with the version label fixed, mutate each
  suspected undeclared input in turn (shared template partial, served font file,
  dependency minor under the semver range, `TZ` env var, system clock if read).
  Assert: either output is unchanged (input truly not in the closure: hermetic) or the
  difference carries a logged cause naming the mutation. A silent difference
  falsifies, by the test's own criterion.
- (vii) **Label-without-change fixture:** modify renderer code (or repoint the
  version tag) without bumping the label; assert the system refuses to promote
  (digest mismatch) or the provenance log records the true code digest, exposing the
  label as stale. If the label alone is trusted, falsified.
- (viii) **Anchor-rot fixture:** correction whose anchor node was deleted by a source
  change; assert the pipeline emits a per-correction applied/unapplied report naming
  the orphaned correction, rather than silently rendering without it.
- (ix) **Composition fixture:** run Survivor 1's auto-repair on a failing fixture,
  then run the purity check; assert the repair is recorded as a declared, attributed
  input change or the build blocks. Unlogged repair falsifies the composed claim.
- (x) **Bump-gates-oracle fixture:** bump the pipeline version, then require a
  fleet-wide (or sampled-with-justification) Survivor 1 oracle pass before the bumped
  version may promote. A declared-but-unverified bump must block.

### Verdict: Survivor 3 WEAKENED

- **#4 fixture-drift: WEAKENED.** Same-machine determinism with injected clock/RNG and
  deterministic ordering is genuinely achievable and the test's fixture (ii) would
  catch a same-machine ordering bug. But the claim as stated ("same inputs plus same
  pipeline version mathematically cannot produce different output") rests on two
  unverified premises: (a) the declared input set is complete (C1: clock, order,
  readdir, env, dependencies are undeclared and untested), and (b) the version pin is
  a digest of the full closure rather than a mutable label (C2). Under mutable labels
  and undeclared inputs, same-label/same-declared-inputs/different-output is
  concretely achievable. With digest-pinned hermetic closure plus fixtures
  (v)-(vii), the claim would WITHSTAND; as specified, it does not.
- **#8 correction-loss: WEAKENED.** The store-deletion shape is prevented (a correction
  cannot vanish from the input set silently). The anchor-rot shape is not: the
  correction survives as an input and dies in the lookup, deterministically and
  silently (C3). Purity is the wrong tool for re-anchoring; that half of #8 needs
  Survivor 1's (placement-aware) preservation assertion.

---

## Cross-survivor findings

**C-A. Repair authority is decided by the falsification, not by taste (open question
1).** Auto-repair is not merely risky; it is self-falsifying. It makes Survivor 1's
output environment-dependent (falsifying Survivor 1's own determinism assertion across
environments), it unlogs a pipeline mutation (recreating the #4 silent-change shape the
file asks about, answer: yes), and it breaks the stated Survivor 1 + Survivor 3
composition (C4). Block-and-escalate is the only branch consistent with every other
claim in the file. The 80-percent-decide rule does not rescue auto-repair: the repair
is not a decision under uncertainty but an unlogged input mutation.

**C-B. The Ask FYD surface is unguarded by all three survivors (open question 7).**
Survivor 1 gates static projection; its oracle never runs on conversational output.
Survivor 2 gates static slots; answer cards render LLM-generated layout (unbreakable
tokens, wide tables) through a second seam the typed contracts do not cover. Survivor 3
covers static projection purity; per-query answers are not regenerations of declared
inputs. #1, #5, and #6 all reopen through the chat surface, untested by every
falsifiable test in the file. The prevention verdicts above apply to the static site
projection only.

**C-C. The determinism/drift story is split across two survivors measuring different
artifacts.** Survivor 1 byte-compares SiteSpec; Survivor 3 reasons about final output
purity. A post-SiteSpec mutation (repair, renderer-stage nondeterminism) passes one's
check and fails the other's premise. The composition needs a single artifact definition
(the shipped DOM) and both assertions run against it.

**C-D. Open question 3 (structural signature) is the precondition for Survivor 1's #7
claim, not a refinement of it.** Until the signature exists with calibrated fixtures
(x), the claim should be struck from the survivor's prevention list rather than
carried as weakened.

**C-E. Open question 5 (version-bump fleet change) needs the composition answer:**
a version bump must re-run Survivor 1's oracle fleet-wide (or with a recorded
sampling justification that names the residual risk) before promotion. Declared is not
verified.

---

## Summary of verdicts

| Survivor | Claimed classes | Verdict | Classes no longer prevented / weakened |
|---|---|---|---|
| 1. Empirical oracle | #1, #4, #7, #8 | WEAKENED | #7 FALLS as specified (no signature, no fixture); #1 weakened (load-time, same-engine, post-font-settling only; blind to lazy, interaction, fixed off-canvas, 100vw, WebKit-only, sub-pixel); #4 weakened under auto-repair (self-falsifying; holds under block-and-escalate), wrong-artifact byte-compare; #8 weakened (store-deletion only; not anchor rot, wrong-node re-anchor, unregistered corrections) |
| 2. Typed seam | #1, #2, #5, #6 | WEAKENED | #1 FALLS as claimed (emergent compositional overflow, the grounded incident, passes every constructor; plus unbreakable tokens, 100vw quantity error, runtime widgets, owner CSS); #2 weakened (first-party slots hold; product-required raw-HTML/embed region bypasses constructors); #5 weakened (binding shape, not validity; spurious well-typed bindings pass); #6 WITHSTANDS (silent crossing prevented; declassification governance and derivation leakage noted as caveats) |
| 3. Pure projection | #4, #8 | WEAKENED | #4 weakened (same-machine determinism achievable; cross-machine drift via undeclared inputs and mutable version labels untested; needs digest-pinned hermetic closure); #8 weakened (store-deletion prevented; anchor rot not) |

**Strongest single falsifiers, one per survivor:**
1. Oracle: a font-swap fixture where the oracle passes pre-swap and a real phone
   scrolls post-swap; and the repair branch, which falsifies the survivor's own
   determinism claim.
2. Typed seam: the FL-20260921-033 emergent shape itself, sections valid in isolation,
   overflowing in composition, which no stated constructor can reject.
3. Pure projection: a dependency-minor bump (or `TZ` change, or second machine) that
   changes output under an unchanged version label with no logged cause, passing the
   test as written.

**What would promote each survivor:** Survivor 1 needs the strengthened interaction
and environment fixtures plus block-and-escalate (then #1/#4/#8 approach WITHSTANDS
for static projection; #7 needs the signature). Survivor 2 needs its #1 claim
restruck to the authored-fixed-pixel sub-shape with emergent overflow explicitly
routed to the oracle, plus the bypass inventory gate (then #2-first-party/#6
WITHSTAND, #5 still WEAKENED pending entailment checking upstream). Survivor 3 needs
digest-pinned hermetic closure with undeclared-input mutation fixtures and a
per-correction applied/unapplied report (then #4 WITHSTANDS; #8's anchor-rot half
still belongs to Survivor 1's placement-aware preservation assertion).
