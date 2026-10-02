# PING Circle: Portal-Grade Margin Experience — Architecture Spec

Authoritative directive: Nolan, 2026-09-21 ("PING Circle — Portal-Grade Margin Experience").
Status: SPEC (build starts after harvest reports land).

## 1. Pipeline

```
SemanticTargetResolver → SpatialSlotManager → ContextObjectRanker
    → AttentionController → CircleProjection → CapabilityRuntime
```

Separation law: geometry never decides relevance; relevance never decides
authority; authority never decides animation.

## 2. Components

### 2.1 SemanticTargetResolver
Binds a PING object to semantic DOM targets on the host page.
Input: object id, host document. Output: [{ objectId, anchorEl, anchorName }].
Mechanism: explicit `data-ping-object` attributes first; heuristic text/URL
matching second (deterministic, logged). Assigns `anchor-name: --ping-<id>`.

### 2.2 SpatialSlotManager (novel PING code)
Answers WHERE something can live. Never what deserves to.
Inputs: viewport, visualViewport, DOM geometry, primary content rectangles,
native fixed/sticky UI, interactive controls, PING semantic anchors, scroll
position, safe-area insets, existing PING occupancy.
Output: SAFE PERIPHERAL RECTANGLES:
`[{ rect, side, capacity, stability, nearestSemanticTargets, collisionRisk }]`.
V1 is deterministic page geometry only (no CV pixel hunting):
- viewport bounds, visualViewport
- main content bounds: union of `main, [role=main], article`
- fixed/sticky occupied rects
- safe-area insets via env()
- derived bands: left peripheral, right peripheral, gutters, stable holes
Observers: ResizeObserver + IntersectionObserver + selective MutationObserver
+ RAF-scheduled scroll + cached geometry. Recompute only on invalidation.
Positioning: CSS Anchor Positioning as progressive enhancement
(position-anchor: --ping-target; anchor(); position-area; position-try),
Floating UI as the commodity collision/placement fallback INSIDE the slot
manager. Never reimplement collision math. Browser zoom is explicitly tested
(Floating UI CSS-zoom + absolute-strategy edge case).

### 2.3 ContextObjectRanker (novel PING code, separate from layout)
Answers WHAT deserves a slot. Features: viewport relevance, semantic
proximity, user relationship, object importance, available capability,
recent interaction, slot stability, already-completed action (demotes),
visual collision cost. Pure function: (candidates, slots, context) → ranked.

### 2.4 AttentionController (novel PING code)
At most 1 PRIMARY ACTIVE + 1 SECONDARY AWARE object; everything else quiet.
Hysteresis (mandatory): entry threshold, exit threshold, minimum residency
time, interaction lock, cooldown. Scrolling yields stable contextual
evolution, never musical chairs.

### 2.5 CircleProjection (novel PING code: state machine + portal component)
States: REST → NEAR → AWARE → ENGAGED (→ IMMERSIVE where geometry permits),
ASK overlays ENGAGED. One physical object across states (View Transitions
where they genuinely help; progressive enhancement only).

Sizing: SIZE = FUNCTION OF AVAILABLE SAFE RECTANGLE. Never hardcode 480px.
- COLLAPSED: 56–72px
- AWARE: 96–128px
- ENGAGED: ~360–480px diameter, clamped to the safe rect
- IMMERSIVE: largest circle fitting entirely inside available peripheral
  space without obscuring primary host content

The entire circle IS the website: object-fit cover of the preview with
intelligent focal position. PING chrome almost absent until interaction.
No rectangular preview, no modal, no center takeover, no host shrink.

### 2.6 CapabilityRuntime
Follow / Like / Ask FYD / Web, capability-gated only. Follow and Like are
real and durable; after completion they recede (FOLLOWING / LIKED, less
prominence). Completed actions demand less attention. Ask feels like
talking TO the object: question → short answer from object graph + evidence
→ citation behind the answer. Ask expands into available peripheral space;
compact anchored popover when insufficient; never seizes page center unless
the user explicitly opens a full FYD experience.

## 3. Preview strategy (progressive modes)

- MODE A — Snapshot (safest default): capture/render authorized public
  website → optimized derivative → object-fit: cover + focal position.
- MODE B — Interactive: ONLY when embedding policy/security allows.
  Sandboxed, explicit allowlist, no ambient PING authority, no provider
  tokens, no private context, no credential inheritance, no privileged
  PING API access. The website inside a Circle is CONTENT, never authority.
  Contract: LIVE WHEN SAFE + PERMITTED, HIGH-FIDELITY SNAPSHOT/NATIVE
  PROJECTION OTHERWISE.
- MODE C — FYD native projection (the moat): render from the SAME object
  graph/SiteSpec. Full node / circle / feed / embed / agent-context
  projections from one graph. Do not depend on screenshots forever.

Deterministic focal-region system (never scale a whole desktop screenshot
into the circle). Resolution order: owner-selected region → SiteSpec hero →
hero image → OpenGraph image → logo → business title → dominant image.
Every preview record carries: preview source, focal x, focal y, scale,
crop strategy, provenance (capturedAt, captureMethod, digest).

Derivatives: AVIF/WebP where appropriate, srcset/sizes, lazy decoding.
Prewarm sequence: REST → NEAR → PREWARM MEDIA → HOVER → EXPAND. Snapshot
is the transition poster; interactive preview replaces it seamlessly if it
loads. Collapsed and engaged share the same visual source where possible.

## 4. Motion system

Harvested: Motion (active project, ~13.4.0) for springs, gestures, layout
transitions; its ecosystem perf-audit tooling evaluated rather than
invented. NOT the archived Motion One.

Tokens (tuned empirically):
- spring.responsive: stiff/fast (proximity, aware)
- spring.gentle: default spatial (engage, exit)
- spring.slow: immersive transitions
Feel: massive, precise, expensive. No bounce circus.

Rules: prefer transform / opacity / clip-path; never animate width,
height, top, left per frame when transforms suffice; batch geometry reads;
no read-write-read-write loops. Target frame-budget discipline for
high-refresh displays; measure long animation frames, layout/recalc,
paint, composite, dropped frames via Chrome perf tooling.

Interaction choreography:
- REST: quiet, almost static.
- PROXIMITY/HOVER: rim wakes, scale ~1.03, slight luminance lift,
  metadata hint.
- ENGAGE: expands spatially from its exact origin, no teleport.
- EXPANDED: preview legible, minimal controls in safe perimeter
  (restrained orbit model: small glyphs at rest, explicit on
  hover/focus/touch).
- EXIT: same physical path reversed.
- prefers-reduced-motion: fully functional, appears/expands quickly with
  opacity only. Motion is enhancement; capability remains.

## 5. Security (non-negotiable)

- javascript: HREF injection was found once before. Validate every URL
  rendered into href/src. Do not regress.
- Snapshot mode preferred precisely because previews are hostile external
  content.
- Interactive embedding: sandbox + explicit allowlist + no PING authority
  leakage (listed in 2.6/Mode B).

## 6. Visual restraint

Subtle luminous rim, very soft external bloom, small depth shadow, slight
saturation/brightness lift on engagement, possibly an extremely subtle
animated edge highlight. The content inside the circle is the hero, not
the glow. Constellation image = inspiration for depth/edge/negative
space; its center-dominant layout is rejected. Host website owns the
center; PING constellation inhabits the edges.

## 7. Mobile

Do not pretend margins exist. Edge affordance / compact circle. Ask may
use an OS-native style sheet/popover, never a generated replacement
website.

## 8. Test matrix

Playwright screenshots for BOTH businesses: collapsed, aware, engaged,
Ask, Following, Liked, narrow fallback. Viewports: 1920, 1440, 1280,
tablet, mobile. Measure: rest→engaged, engaged→rest, scroll while
engaged, target leaving viewport, viewport resize, browser zoom, reduced
motion. HOST CONTENT OCCLUDED must be ZERO.

## 9. Code map (planned, src/fyd/)

- spatial/slot-manager.ts — SpatialSlotManager
- spatial/semantic-targets.ts — SemanticTargetResolver
- rank/object-ranker.ts — ContextObjectRanker
- attention/controller.ts — AttentionController
- ui/portal-circle.tsx — CircleProjection (portal component)
- ui/portal-motion.ts — motion tokens (Motion-backed)
- preview/pipeline.ts — Mode A/B/C selection + prewarm
- preview/focal.ts — deterministic focal-region resolution
- capabilities/runtime.ts — CapabilityRuntime (follow/like/ask/web)

Harvested, not written: Motion (springs/gestures), Floating UI
(collision/placement fallback), screenshot browser, image codecs,
CSS Anchor Positioning (progressive enhancement), View Transitions
(progressive enhancement).

## 10. Harvest findings (2026-09-21, dependency/platform evaluation)

- Motion: framer-motion 12.43.0 installed and already used in 16 places
  (src/motion/ modules: fade, reveal, parallax, stagger, hero, buttons,
  cards, hover, magnetic, pageTransition, typography). Same library/API as
  the renamed Motion project; standalone `motion` 13.x migration optional,
  not required. MotionScore audit tooling is ecosystem-level, not installed;
  run audits as agent-driven passes. Do NOT touch the archived Motion One.
- Floating UI: NOT installed. Add @floating-ui/dom only if JS tethering
  fallback is needed behind CSS anchor positioning. Documented 2026 edge
  case confirmed: CSS zoom on the floating element with strategy absolute
  is broken (Chrome offsetParent across zoom boundary); also broken:
  transform scale() on body with strategy fixed, Safari 26.3 and below.
  If added: pin a version containing the zoom fix, default strategy fixed
  for overlays, and test browser zoom explicitly.
- Playwright: NOT installed. Genuine gap; required for the screenshot test
  matrix. No browser-based test runner exists (jest unit tests only).
- sharp 0.35.3 installed with linux-x64 optional deps. Image processing
  covered.
- CSS Anchor Positioning: progressive enhancement only. Baseline newly
  available Jan 2026 (Firefox 147 joined Chrome/Edge 125+, Safari 26+);
  NOT widely available (2.5y out). Caution: broken fixed-position anchors
  in Safari, position-try edge cases. Pattern: @supports wrapper with
  plain fallback; test real placements incl. Safari.
- View Transitions: same-document startViewTransition broadly available
  (Chrome 111+, Safari 18+, Firefox 144+); element-scoped pieces uneven
  (view-transition-class not in Firefox; match-element Chromium only).
  Fallback is inherently safe (instant DOM update). Feature-detect,
  unique view-transition-name per circle, explicit reduced-motion guard
  (::view-transition-group(*) near-zero duration) since transitions do
  not inherit prefers-reduced-motion.

## 11. Harvest findings (2026-09-21, repo machinery sweep)

REUSE AS-IS:
- src/motion/motionTokens.ts + 12 sibling modules + MotionProvider
  (prefers-reduced-motion detection, reduced-motion class toggle).
  Centralized deterministic token system. No FLIP code anywhere.
- src/fyd/media/derivatives.ts: sharp-based deterministic derivatives
  (480w webp thumb, 768w card, 1600w hero/webp+avif, blur placeholder),
  content-addressed public/fyd-media/<sha256>/. Proof-carrying variants.
  No focal-point implementation (only unused types in legacy editor).
- src/fyd/media/discover.ts: og:image, img/srcset best-candidate,
  JSON-LD image at any depth, link rel=image_src. Pure function.
- src/fyd/refresh/website-observe.ts: og:title/description/meta reads.
- Logo policy in discover.ts/ingest.ts/attach.ts: filename-pattern logo
  detection, own-logo vs external_reference classification, has_logo edge.
  Favicon/apple-touch-icon extraction does not exist (net-new, small).

ADAPT (spec only, no code):
- src/fyd/proceduralize/ACQUISITION-STACK.md: Playwright 1.63.0 HARVEST
  verdict as L2 render fallback, pin version+browser, bounded wall-clock,
  visible-only locators, never an always-on rendering farm.

NOTHING EXISTS (net-new):
- Screenshot/browser-capture code, CDP/browser sessions, spatial or
  collision geometry, iframe/sandboxed preview machinery,
  snapshot-as-poster pattern. safe-link.ts/safe-fetch.ts are URL-safety
  allowlists, a different concern from sandboxed rendering.

GAPS TO CLOSE IN BUILD: Playwright install + chromium (snapshot capture
Mode A + screenshot test matrix), focal-region cropping on top of
derivatives.ts, SpatialSlotManager/ContextObjectRanker/AttentionController
(novel PING code), sandboxed embed behind explicit allowlist.
