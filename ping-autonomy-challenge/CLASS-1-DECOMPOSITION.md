# CLASS-1 DECOMPOSITION: mobile-overflow sub-cases and honest coverage

**Date:** 2026-09-23. **Mode:** research only. No implementation code.

**Source material:** `failures/FAIL-1-mobile-overflow.md` (gate review, three survivors) and
`failures/FAIL-1-falsification.md` (adversarial dry-run; verdicts S1 WEAKENED, S2 WEAKENED with
#1 falling as claimed, S3 WEAKENED). This file decomposes failure class #1 into sub-cases so the
library is honest about what is and is not prevented.

## 1. Sub-case taxonomy

The gate review treated #1 as one class ("content wider than the viewport"). The falsification
showed the survivors cover different sub-shapes and that the hardest real-world shape,
compositional overflow, is covered by nothing typed. The class decomposes into five
sub-cases:

- **(a) Static intrinsic-width overflow.** A single component is wider than the viewport by its
  own content or authored dimensions. Real instance: the 216px fixed artboard in a narrow grid
  cell (memory/2026-09-21, L1080), fixed pixel dimensions authored without knowledge of the
  container. The generator knew the dimensions; the type could have rejected them.
- **(b) Compositional overflow.** Sections valid and clean in isolation overflow only when
  composed together: FL-20260921-033, where non-empty content preceding the hero pushed
  intrinsic width to roughly 500-580px at a 375px viewport. The exact CSS mechanism was never
  isolated. No per-slot constructor sees this; computing it requires a layout engine.
- **(c) Runtime overflow.** The page passes at load and overflows later, or overflows only in a
  different environment. Documented forms: font swap (webfont advances wider than fallback,
  measured pre-swap passes while the phone post-swap scrolls); lazy-load (images without
  dimensions, IntersectionObserver sections change layout after load); interaction-triggered
  (off-canvas nav drawers, All Objects / Ask FYD sheets, parked off-canvas at load,
  `position: fixed` provably invisible to `documentElement.scrollWidth`); `100vw` scrollbar
  (viewport units include scrollbar width on classic-scrollbar platforms); WebKit-only
  (headless Chromium oracle vs iPhone WebKit, flex/grid intrinsic-size and unit differences);
  sub-pixel DPR (integer `scrollWidth` hides fractional overflow visible at DPR 2-3).
- **(d) Unbreakable-token overflow.** Long spaceless tokens: URLs, hashes, tracking tokens,
  LLM-generated long compounds with no break opportunities. min-content width exceeds any
  slot; well-typed in every stated contract because the contract set has no text contract.
- **(e) Third-party widget / owner-custom-CSS overflow.** Script-injected widgets (maps,
  review carousels, booking) arrive post-projection with their own fixed pixel widths; owner
  custom CSS (`width: 600px !important`) is a string the type system cannot bound without a
  CSS parser plus allowlist, which is not in any contract set.

## 2. Coverage table: sub-case x survivor

Cells: **prevents** / **partially** / **not covered**. S1 = post-generation empirical oracle
(viewport assertion: render at matrix widths, assert `document.scrollWidth <= clientWidth`,
trace-to-owner, repair-or-block). S2 = typed projection seam (geometry contracts on slots).
S3 = canonical pure projection (no viewport mechanism; included for completeness).

| Sub-case | S1 oracle | S2 typed seam | S3 pure projection |
|---|---|---|---|
| (a) Static intrinsic-width | **partially.** The load-time `scrollWidth` assertion catches this when the overflow is reproducible at load in the oracle's engine and environment. Blind spots: font-swap timing, WebKit-only behavior, sub-pixel DPR. The strengthened test (fixtures iv-viii) narrows this; as specified it is load-time only. | **partially.** Prevents only the authored-fixed-pixel form (the 216px artboard: a fixed pixel width exceeding its container contract fails construction or is coerced). Does not prevent intrinsic content width overflow: a slot typed "at most 1.0 of the viewport" containing content with larger min-content width is well-typed and overflowing. Geometry types bind slots, not content. | not covered |
| (b) Compositional | **partially.** Genuinely catches the FL-20260921-033 static shape, because that shape was reproducible at load in a browser. But only when the compositional overflow manifests under the oracle's engine, fonts, and timing. If the compositional push depends on font swap, lazy content, or WebKit, it passes through silently. Repair is the wrong branch here: the ancestor trace can name the wrong node for emergent overflow, producing a passing-but-visually-broken site (block-and-escalate is the only consistent branch). | **not covered.** F1-S2's geometry types bind slots, not content, so (b) passes through every constructor. FL-20260921-033's sections were valid in isolation; the 500-580px shape emerges in composition, which no stated constructor can reject. The falsification verdict: #1 FALLS as claimed for S2. | not covered |
| (c) Runtime | **not covered.** The viewport assertion is a load-time measurement in one engine: blind to font-swap overflow (no font-settling discipline in the test as written), blind to lazy-load overflow (no scroll-to-bottom step), blind to interaction-triggered overflow (fixed off-canvas panels are spec-invisible to document `scrollWidth`, never measured because the oracle performs no interactions), blind to `100vw` scrollbar overflow (matrix varies width but not chrome or scrollbar policy), blind to WebKit-only overflow (headless Chromium only), blind to sub-pixel DPR overflow (integer `scrollWidth`, DPR 1). The static-scroll directive's required interaction matrix (open/close every panel, both scroll directions, orientation) is untested. | **not covered.** Types constrain construction; runtime injection is post-construction. Fixed off-canvas panels and font/lazy/WebKit/100vw/DPR behaviors are invisible to slot types. | not covered |
| (d) Unbreakable-token | **partially.** If the token is present at load, the load-time `scrollWidth` measurement flags it, so the static LLM-copy case is caught in the oracle's environment. Not covered: tokens emitted at runtime (Ask FYD answer cards, second projection seam), and the oracle names no cause specific to unbreakable runs (the repair trace has no text-contract guidance). | **not covered.** No text contract exists in the stated contract set: no maximum unbreakable run, no break-opportunity requirement. A 60-character URL in a hero heading satisfies every stated type and overflows any container. | not covered |
| (e) Third-party / owner CSS | **not covered.** Widgets inject DOM after projection; owner CSS is an unparsed string. The oracle measures static projected output; runtime-injected overflow arrives after measurement. No embed, widget, or custom-CSS fixture exists. | **not covered.** The constructors never see runtime-injected DOM. Owner custom CSS bypasses geometry types unless a CSS parser plus property allowlist is added, which is not in the contract set. The product *requires* a raw-HTML/embed path (owners paste embed codes), so the seam is decorative against this sub-case by its own critical probe. | not covered |

## 3. Zero-coverage gaps (documented library gaps)

These sub-cases have **no coverage from any survivor**, even partially, under the mechanisms
as specified:

1. **(c) Runtime overflow, all six documented forms.** Font swap, lazy-load,
   interaction-triggered (fixed off-canvas), 100vw scrollbar, WebKit-only, sub-pixel DPR.
   S1's oracle is structurally a load-time, single-engine measurement; S2's seam constrains
   construction, not runtime behavior. The class's hardest operational requirement (the
   static-scroll directive: zero horizontal overflow during ordinary scrolling, across load,
   scroll both directions, tap, open/close every sheet, contact, nav, back, orientation) is
   asserted by no mechanism.
2. **(e) Third-party widget / owner-custom-CSS overflow.** Nothing prevents a
   script-injected widget or an owner style block from pushing intrinsic width past the
   viewport. S2's seam is bypassed by construction (embed path is product-required); S1's
   oracle measures before injection.

Two more cells deserve explicit honesty even though they are not full zeros:

- **(b) Compositional overflow** is covered only by S1's oracle at load time in the
  oracle's own environment. It is the grounded flagship incident (FL-20260921-033), and
  nothing in the library's constructive machinery (types) sees it. If the oracle
  environment diverges from the phone (fonts, engine, timing), coverage collapses to zero
  silently.
- **(d) Unbreakable-token overflow** is covered only incidentally by S1's load-time
  measurement, with no contract, no cause attribution, and no runtime (conversational)
  coverage. S2 is structurally blind to it.

## 4. Mechanism sketches for the zero-coverage sub-cases

One to two sentences each. No full design.

- **(c) Runtime overflow.** A post-hydration resize observer with a violation budget: the
  oracle runs a second pass after `document.fonts.ready`, after scroll-to-bottom and
  network idle (lazy content), and asserts per-panel `scrollWidth` (not document
  `scrollWidth`) while driving the static-scroll directive's full interaction matrix
  (every drawer/sheet open and closed, both scroll directions, orientation); each panel
  and each width in the matrix gets a violation budget, and any violation blocks
  promotion the way load-time violations do.
- **(c) WebKit-only / engine-divergent overflow.** An engine-parity fixture: run the
  width matrix in Chromium *and* WebKit and require verdict agreement; disagreement is a
  blocking divergence, not a note, because the iPhone audience is WebKit.
- **(c) 100vw / scrollbar overflow.** A quantity-correctness gate: ban `100vw` for
  full-bleed sizing in favor of percentage-of-containing-block (or `100%`), enforced by
  static analysis on the shipped CSS plus a classic-scrollbar-profile fixture that must
  fail on any `100vw` element.
- **(c) Sub-pixel DPR overflow.** An epsilon-aware assertion: compare fractional
  `getBoundingClientRect()` widths against the viewport with a nonzero tolerance
  (e.g. 0.5 CSS px) at simulated DPR 2 and 3, instead of integer `scrollWidth`.
- **(e) Third-party widget / owner-custom-CSS overflow.** An inventoried-bypass gate:
  every render-tree entry path is either constructor-mediated or on an inventoried
  bypass list, each bypass carrying its own mitigation test (sanitizer suite for raw HTML
  embeds, property allowlist for owner CSS); CI fails on any unlisted path, and
  third-party script widgets render inside a containment wrapper that cannot widen the
  document.
- **(b) Compositional overflow, constructive half.** A whole-page intrinsic-width
  measurement at the composed-SiteSpec level, not per-component: per-component
  intrinsic-width precomputation was cut precisely because FL-20260921-033 proved
  isolation predictions wrong; the honest constructive mechanism is an emergent
  intrinsic-width property computed over the composed page and asserted against the
  viewport *before* render, with the repair trace identifying the composition owner
  rather than a single section.

## 5. The 320px requirement: what was actually tested at 320px

- **S1's viewport assertion as specified** includes 320px in its width matrix
  (320/360/375/390/430 + desktop), but the falsification showed the test as written
  measures headless Chromium at DPR 1 with no stated font-settling, scroll, or
  interaction protocol. 320px is *named* in the matrix; it is not *verified* against
  any of the sub-cases that need it: no font-swap fixture, no lazy fixture, no
  interaction fixture, no WebKit fixture. The test's final clause ("the oracle's verdict
  must agree with an independent manual 320px browser check on every fixture") is the
  only 320px discipline with teeth, and it is engine-unnamed and single-check.
- **FL-20260921-033 (the grounded incident)** was observed and bisected at **375px**,
  not 320px. The 500-580px intrinsic width claim comes from a 375px viewport; no 320px
  measurement of that incident exists in the record.
- **The FYD rebuild test matrix** (320/360/375/390/430) exists as prose in a directive;
  nothing in the pipeline runs it. The static-scroll directive's absolute zero-overflow
  requirement likewise has no mechanical enforcement at any width.
- **Honest bottom line:** no sub-case has verified 320px coverage on a real device or
  in a real engine. (a) and (b) have *nominal* 320px coverage via the oracle's matrix
  under the engine/environment blind spots; (c), (d), and (e) have no 320px coverage at
  all, nominal or real. The library cannot claim the 320px requirement is met for any
  sub-case until the strengthened fixtures (font-swap, lazy, interaction, engine
  parity, scrollbar, DPR) run at 320 and agree with a real-device check.

## 6. Summary verdicts carried forward

- S1 (empirical oracle) remains the only mechanism with any #1 coverage, and its
  coverage is: (a) partially, (b) partially at load time only, (c) none, (d) incidental,
  (e) none.
- S2 (typed seam) prevents the authored-fixed-pixel form of (a) only; its #1 claim
  otherwise falls, including the grounded compositional incident.
- Zero-coverage documented gaps: (c) runtime overflow and (e) third-party/owner-CSS
  overflow. (b) compositional and (d) unbreakable-token are thin-coverage: oracle-only,
  load-time-only, environment-fragile.
- Ask FYD (conversational output) reopens #1 through (c) interaction-triggered and
  (d) unbreakable-token shapes; no survivor's test runs on that surface
  (falsification cross-finding C-B).
