# HARVEST WAVE 1 — COORDINATOR SYNTHESIS
Date: 2026-09-21. All six read-only lanes completed. Lane reports:
- [visual-motion.md](sandbox://workspace/fyd-lane/harvest-wave1/visual-motion.md)
- [generative-ui.md](sandbox://workspace/fyd-lane/harvest-wave1/generative-ui.md)
- [web-acquisition.md](sandbox://workspace/fyd-lane/harvest-wave1/web-acquisition.md)
- [evidence-trust.md](sandbox://workspace/fyd-lane/harvest-wave1/evidence-trust.md)
- [safe-change.md](sandbox://workspace/fyd-lane/harvest-wave1/safe-change.md)
- [browser-evaluation.md](sandbox://workspace/fyd-lane/harvest-wave1/browser-evaluation.md)

Ordering rule applied: the binding verifier is the closest harvest to Ask FYD → WHY THIS → correction, so evidence/trust leads.

---

## TOP 3 CANDIDATES

### 1. JCS (RFC 8785) — canonical bytes for the binding verifier — ADAPT

PROJECT: JCS, JSON Canonicalization Scheme (RFC 8785); reference implementation cyberphone/json-canonicalization
PINNED SHA: 19d51d7fe467d4706a3ff08adf8a748f29fc21e0
LICENSE: NOASSERTION on the reference repo (diligence flag). RFC 8785 is an IETF RFC, freely implementable. The pin is for the TEST-VECTOR suite, not a dependency. Never depend on the repo.
RECENT ACTIVITY: reference impl last push 2024-12-13; the RFC is the living artifact, stable.

FYD PROBLEM: The binding verifier's VERIFY step is presence-based (provenance.ref non-empty), not recompute-based. Canonical bytes are homebrew (sortKeys + JSON.stringify), which mishandles number normalization (-0, exponents), Unicode escaping, and key-ordering edge cases. Without RFC-defined canonical bytes, "same content → same hash → same ID" is false, and that single defect breaks BOTH the binding verifier AND deterministic transition identity.

MECHANISM: Deterministic JSON serialization: fixed key ordering (UTF-16 code unit order), number normalization per ES6 ToString semantics, no insignificant whitespace, defined string escaping. Plus the RFC's interop test-vector suite.

EXACT IMPLEMENTATION: cyberphone/json-canonicalization at the pinned SHA: the canonicalizer source and its test-vector JSON files. ADAPT to TypeScript (~80-120 lines). Exact file/symbol verification happens at the integration pin step.

CLAIM EVIDENCE: Published IETF RFC 8785 with interop test vectors.
SOURCE EVIDENCE: Web reading of the reference source at pin; full symbol verification deferred to integration.
RUNTIME EVIDENCE: None executed (read-only lane). TEST EXISTS != TEST PASSES is flagged; the integration must run the pinned vectors.

DEPENDENCY COST: Zero. Reimplement per RFC or vendor the tiny canonicalizer. Never depend.

WHAT FYD ALREADY HAS: Homebrew canonicalizer; verifyPresentationBinding fail-closed at the projection seam.
WHAT THEY DO BETTER: RFC-defined canonical bytes with edge-case coverage and test vectors.
WHAT FYD DOES BETTER: Fail-closed projection seam, domain-aware claim model, rank/drop.

SMALLEST HARVESTABLE PRIMITIVE: `canonicalizeJSON(value): string` implementing RFC 8785, plus the pinned test-vector file as the regression suite.

REUSE / ADAPT / REPURPOSE / PATTERN_ONLY / REJECT: ADAPT.

CAN IT: remove code? Yes, replaces the homebrew. remove ambiguity? Yes, canonical bytes defined by RFC. improve beauty? No. improve expressiveness? No. improve trust? Yes, enables recompute-and-compare verification. improve mobile? No. improve accessibility? No. improve performance? Neutral. improve regeneration? Yes, stable IDs across regen. reduce AI improvisation? Yes, identity becomes deterministic, no judgment calls.

FALSIFICATION EXPERIMENT: Implement canonicalizeJSON, run the pinned RFC test vectors green. Then property-test 10,000 random JSON values: assert idempotence, key-order invariance, and that equal values always produce equal bytes. The harvest is falsified if the homebrew canonicalizer already passes the full vector suite (then there is no defect to fix).

---

### 2. formkit/auto-animate — declarative FLIP core — ADAPT (vendored)

PROJECT: formkit/auto-animate
PINNED SHA: 06882a8e69ba9bc8456d8f2ae6010f697fd7a37c
LICENSE: MIT
RECENT ACTIVITY: Active; last push 2026-07-10; 13.9k stars.

FYD PROBLEM: FYD has zero motion code (grep-verified across renderer.tsx, render-model.ts, graph.ts). Tab switches and editor reorder/hide snap instantly. The visual bar requires vibrant/alive, but motion must be semantic and deterministic, never arbitrary generated code.

MECHANISM: MutationObserver detects DOM add/remain/remove; FLIP (first/last/invert/play) via WAAPI over WeakMap-tracked state (coords, siblings, animations); configuration as data `{duration, easing, disrespectUserMotionPreference}`; reduced-motion respected BY DEFAULT.

EXACT IMPLEMENTATION: The core FLIP module only. Drop the framework adapters and scroll-compensation observers. The renderer emits `data-motion-layout` attributes; the vendored core reads them. Exact file/symbol line verification at integration.

CLAIM EVIDENCE: Docs plus code analysis; ~2-3.3KB, zero dependencies.
SOURCE EVIDENCE: Web reading of repo source; exact symbol verification deferred to the SHA-pin step (done at integration).
RUNTIME EVIDENCE: None executed (read-only lane). Flagged honestly.

DEPENDENCY COST: Zero if the core is vendored (sub-2KB of the 3.3KB). Depending is also cheap (MIT, zero deps), but vendoring keeps the renderer in full ownership of the runtime.

WHAT FYD ALREADY HAS: Nothing. Greenfield lane.
WHAT THEY DO BETTER: The only surveyed mechanism with motion-as-data plus reduced-motion-by-default plus tiny size.
WHAT FYD DOES BETTER: FYD owns the declarative MotionSpec contract (reveal kind/duration/easing/stagger, layout config, view-transition names from object ids) that the core plugs into. Motion stays data, not code.

SMALLEST HARVESTABLE PRIMITIVE: The vendored FLIP core wired once in the shared client shell.

REUSE / ADAPT / REPURPOSE / PATTERN_ONLY / REJECT: ADAPT.

CAN IT: remove code? n/a (greenfield). remove ambiguity? Yes, motion is declared in SiteSpec, never improvised. improve beauty? Yes. improve expressiveness? Yes. improve trust? Neutral. improve mobile? Yes if gated, WAAPI is compositor-friendly. improve accessibility? Yes via reduced-motion default (must verify in browser). improve performance? Neutral (small). improve regeneration? Neutral. reduce AI improvisation? Yes, the renderer cannot invent motion; only the declared spec animates.

FALSIFICATION EXPERIMENT: See the First Visual Experiment below. The harvest is falsified if any of the 20+20 operations per site misfires, ignores reduced-motion, behaves nondeterministically, janks, overflows, or logs console errors.

---

### 3. fast-json-patch — test-guarded RFC 6902 patches — ADAPT (vendored core)

PROJECT: Starcounter-Jack/JSON-Patch (fast-json-patch)
PINNED SHA: 9d313ac01916e525e9204074f06e5295edec491b
LICENSE: MIT
RECENT ACTIVITY: MAINTENANCE FLAG: last commit 2022-03-24. Widely used and stable, but no commits in 4 years. Mitigation: vendor the small core; alternative is immer's produceWithPatches (safe-change lane card C2).

FYD PROBLEM: Deterministic transition identity has the identity half (content-hash IDs + append dedup) but not the application-safety half. Applying an owner correction must fail closed when the base moved underneath it. This is required for owner correction + source refresh + regeneration to coexist without clobbering.

MECHANISM: RFC 6902 JSON Patch with `test` preconditions. `compare` emits test-guarded patches; clone-then-apply equals preview as a pure function; `validate` equals approval dry-run; replay fails closed with typed conflicts instead of silent clobber. Inverse patches are pre-image carriers, so `test` guards can be synthesized mechanically (~20-line guardedPatch).

EXACT IMPLEMENTATION: compare(), applyPatch(), validate() in the pinned source. Exact symbol verification at integration.

CLAIM EVIDENCE: RFC 6902 standard; long production use across the ecosystem.
SOURCE EVIDENCE: Web reading; exact symbol verification at integration.
RUNTIME EVIDENCE: None executed (read-only lane). Flagged honestly.

DEPENDENCY COST: Small. Prefer vendoring the core operations given the maintenance flag.

WHAT FYD ALREADY HAS: Content-hash transition IDs + append dedup (the identity half).
WHAT THEY DO BETTER: Test-guarded apply, invertibility, dry-run validation.
WHAT FYD DOES BETTER: Semantic, domain-aware identity plus the approval ladder; the externals are domain-blind mechanics that compose under it.

SMALLEST HARVESTABLE PRIMITIVE: Test-guarded patch apply plus inverse-patch pre-image guard (small vendored core).

REUSE / ADAPT / REPURPOSE / PATTERN_ONLY / REJECT: ADAPT.

CAN IT: remove code? Yes, no bespoke guard logic. remove ambiguity? Yes, typed conflicts. improve beauty? No. improve expressiveness? No. improve trust? Yes, fail-closed apply. improve mobile? No. improve accessibility? No. improve performance? Neutral. improve regeneration? Yes, replay safety. reduce AI improvisation? Yes, patch semantics are fixed.

FALSIFICATION EXPERIMENT: Apply a correction patch against a concurrently refreshed base; assert a typed conflict (never a silent clobber). Assert preview (clone-apply) never mutates. Assert idempotent re-apply of the same transition ID is a no-op. Falsified if any of the three fails.

---

## FIRST VISUAL EXPERIMENT (RECOMMENDED)

FYD currently has mechanism A: no motion code at all; tab switches and editor reorder/hide operations snap instantly.
Pinned project formkit/auto-animate@06882a8e69ba9bc8456d8f2ae6010f697fd7a37c demonstrates mechanism B: MutationObserver-triggered FLIP with add/remain/remove classification, configuration as data, reduced-motion respected by default.
B removes this exact deficiency.
The smallest delta is C: the vendored FLIP core wired once in the shared client shell, reading data-motion-layout attributes emitted by the renderer, zero customer-specific code.
This test proves whether C is better: in a real browser, 20 tab switches plus 20 reorder/hide operations on each of the two demo sites (happy-place, coppersmith-plumbing); the experiment FAILS on any single misfire, any unhonored reduced-motion preference, any nondeterministic motion, any jank, any overflow, or any console error.

Proof list for the experiment:
- Same graph renders to the same semantic composition (motion changes no DOM semantics).
- Different graph produces an explainable difference (motion follows object identity, not randomness).
- Motion does not author facts.
- Motion does not change evidence.
- Mobile safe at 375px.
- prefers-reduced-motion fully honored (zero surviving motion under emulation).
- No horizontal overflow.
- No console errors.

Runners-up for experiments 2 and 3 (zero dependency cost, platform patterns): CSS scroll-driven animations with the mandatory double gate (prefers-reduced-motion + @supports, default-finished authoring so content is never hidden), and the View Transitions API with view-transition-name derived from stable object ids wrapped around renderer-driven tab switches.

---

## KILL LIST (CONSOLIDATED, ONE LINE EACH)

Visual/motion: Motion/motion.dev (per-component code props, manual reduced-motion); React Spring (React-only rAF engine for a CSS-easings job); GSAP (imperative, generated-code risk); Motion One (imperative, no data schema); anime.js v4 (full engine for a 2KB FLIP job); react-flip-toolkit (stale, per-child wiring is code not data); AOS (unmaintained since 2018); Motion Primitives (React UI components, not a mechanism); @wix/motion (no declarative schema); rootnative/inertia (React Native, unverifiable); ScrollMagic (superseded); hand-rolled rAF scroll listeners (jank risk).
Generative UI: Vercel AI SDK (ships no selection mechanism, userland switch); CopilotKit (duplicates assistant-ui, drags the stack); openui (LLM owns selection); streamUI/@ai-sdk/rsc (deprecated); Uniform (trivial registry inside a commercial platform); Formily (dormant); react-json-view/ajrm (display only); JSF RenderKit (wrong stack); TanStack AI (userland mapping); jarenjs/forms (no distinct mechanism).
Web acquisition: ScrapeGraphAI, Firecrawl, browser-use, Stagehand (LLM-per-page cost and nondeterminism); newspaper3k, Mercury Parser, justext (unmaintained); MicroFrontier (GPL-3.0, unmaintained); Java crawl platforms (wrong stack); html-get/browserless (evasion conflicts with the platform-constraint principle); defuddle (author-flagged WIP, fails the evidence bar).
Evidence/trust: PROV-O, PROV-JSON/RO-Crate/FHIR/Dublin Core/PAV (provenance theater, records without verifying); ClaimReview, ClaimBuster (claim-shaped, no binding); VCs, C2PA library, in-toto/SLSA, TUF, Sigstore, SCITT, EAS/Hypercerts, CT, OpenTimestamps (supply-chain identity, not claim-to-evidence binding); Great Expectations (dataframe-shaped); OPA-as-dep (policy engine for a hash job); Hypothesis (wrong layer); Macaroons/Biscuit (auth tokens, not evidence); TLSNotary/DECO (proves TLS, not claim truth); IPLD stack as dep (dependency cost for a pattern).
Safe change: Automerge, Yjs, gun/OrbitDB (CRDT sledgehammer where a content hash suffices); XState/robot3 as deps (5-state ladder does not need a statechart library); recast (wrong layer, code not data); node-eventstore, immudb/Temporal/EventStoreDB (infrastructure for a mechanism job); jsdiff, deep-diff (diffs without identity or guards); RFC 7386 as canonical (merge-patch cannot carry test preconditions); Redux log, mobx-keystone (framework-coupled); fast-json-patch duplex observer API (reactive surface, not needed); in-place schema migration tools (rewrites history); theater approval UIs (no enforced state machine).
Browser evaluation: @playwright/test snapshots, jest-image-snapshot (snapshot machinery for a 6-check gate); Percy/Chromatic/Applitools (external screenshot services); BackstopJS (config-heavy); Cypress (second driver); Lighthouse CI (lab scores, not gates); pa11y (subset of axe); axe adapters (wrappers around the real axe); Resemble.js, odiff (diff libs without the tolerance story); jsx-a11y-as-substitute (lint is not proof); Puppeteer-as-new-driver (playwright-core over CDP already proven).

Notable near-misses kept warm: immer produceWithPatches (alternative pre-image carrier if fast-json-patch maintenance flag bites); jsondiffpatch (preview/dry-run formatters, delta format rejected as canonical); assistant-ui JSONGenerativeUI (registry-as-security-boundary pattern); rjsf getWidget (fallback resolution order); metascraper rule bundles; trafilatura simhash port; Wikidata rank model; SRI digest grammar; trusty-URI content-addressed IDs.

---

## GITHUB API BUDGET
Allowed: 10 total. Used: 7. Six coordinator pin calls (repo metadata + head commit for the 3 pinned repos) plus one rate_limit probe by the safe-change lane before the freeze notice arrived. All other lanes: 0. Remaining headroom: 3.

## LOCAL HARVESTS STATUS
1. Binding verifier: stays hot. Nothing external beats the whole ACCUMULATE → VERIFY → RECOMPUTE CANONICAL HASH → RANK/DROP pattern; JCS sharpens its canonical-bytes step, SRI its digest grammar, Wikidata its rank/drop model.
2. Deterministic transition identity: stays hot. Nothing beats the kernel; fast-json-patch test guards plus the git-style two-layer identity sharpen it.
3. Failure-honesty gate: stays hot. Reinforced by test-guarded apply (typed conflicts, never silent clobber) and the ETag/If-Match compare-and-swap pattern at the correction boundary.
