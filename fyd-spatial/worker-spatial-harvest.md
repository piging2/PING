# FYD Spatial-Object Lane: Recon Harvest

Read-only recon of existing circular/spatial primitives on the Pig, branch `fyd/builder-composition`, Tue 2026-09-22 ~11:20 MDT. No files modified on the Pig. Line refs below are to the Pig source files; local copies of the full contents are in `~/workspace/fyd-spatial/raw/` (disposable, keep or delete freely).

## 1. EXISTING SPATIAL CODE HARVESTED

### src/fyd/ui/circle-machine.ts (148 lines)
- **Primitive:** pure deterministic reducer for the circle interaction lifecycle.
- **States:** `collapsed | peek | expanded | ask`. Events: hover/unhover (250ms mouseleave grace owned by component), focus/blur/blurSettled (150ms grace), tap, tapOutside, key (Escape collapses; Enter/Space activate), askOpen/askClose, evidenceToggle.
- **Expansion model:** state only, no motion. Fail-closed: invalid events return the identical state object (reference equality = "no transition").
- **Placement:** none (state machine only).
- **Verdict: REUSE.** Shared by `fyd-circle.tsx` and `identity-object.tsx`. The spatial-node state model can build on it (e.g. add `satelliteFocus`/`orbit` events) rather than inventing a new machine.

### src/fyd/ui/portal-circle.tsx (705 lines) — THE LOST PRIMITIVE
- **Primitive:** portal-grade margin object, four phases: `rest` (64px circle) -> `aware` (hover/focus, spring to 112px, name hint) -> `engaged` (circle expands spatially from its exact origin, 200..480px, perimeter controls on the rim) -> `ask` (conversational interior, still inside the circle).
- **Expansion model:** tap/click calls `beginEngage()` (portal-circle.tsx:136): measures the button rect, computes engaged geometry via `engagedGeometryFor()` from slot-manager; on null it stays collapsed (never overlaps host content). Engaged view renders via `createPortal` to `document.body` (portal-circle.tsx:276): a `motion.div` animating `initial={{ scale: COLLAPSED_D/d, opacity: 0.55 }}` -> `animate={{ scale: 1, opacity: 1 }}` with framer-motion spring (`spring.gentle` harvested from `@/motion/motionTokens`, reduced-motion -> `duration: 0.01` instant). Aware state is a spring on `scale` (64->112). No teleport between phases; one physical object.
- **Placement:** explicit viewport px coordinates. Circle center + diameter from `engagedGeometryFor`. Perimeter controls are `PerimeterButton` components (portal-circle.tsx:378) placed by trigonometry: `x = cos(rad)*radius, y = sin(rad)*radius`, positioned `left: calc(50% + x - half)`, `top: calc(50% + y - half)`. Orbit angles are a fixed map per engaged side (`orbitAngles`, portal-circle.tsx:443): left = {follow:-90, ask:135, web:180, like:90, close:-135}, right = {follow:-90, ask:45, web:0, like:90, close:-45}, dock symmetric. Capability-gated: Follow/Like/Ask/Web render only when `hasCapability(portal, ...)` and `webHref` is https-validated.
- **Verdict: REUSE/ADAPT.** This IS the lost circular-expansion design primitive the lane hypothesized. The EngagedPortal + orbit-control ring is the direct ancestor of the center+satellites model. Harvest: createPortal-at-origin expansion, full-footprint geometry (orbit reserved beyond circle edge, portal-circle.tsx:142-159 comment), capability-gated orbit buttons, inward tooltips on side slots.

### src/fyd/ui/portal-host.tsx (224 lines)
- **Primitive:** host that mounts `PortalCircle`s into safe peripheral space. Wiring: SemanticTargetResolver -> SpatialSlotManager -> ContextObjectRanker -> AttentionController -> CircleProjection.
- **Expansion model:** none itself; owns engagement arbitration (primary vs secondary attention), awareness, and the reconcile effect that releases engagement when derived placement mode changes.
- **Placement:** explicit px `left`/`top` fixed divs (`data-ping-host`, `data-ping-slot`). Slotted portals from slot rects; docked/unslotted portals render `null` per the no-bottom-portal directive (2026-09-21).
- **Verdict: ADAPT.** The assignment + AttentionController + reconcile machinery is reusable as the host for a spatial node; but its peripheral-margin assumption (right/left bands beside a content column) does not fit a dedicated spatial-node area.

### src/fyd/ui/fyd-circle.tsx (720 lines)
- **Primitive:** the "true FYD circle": literal circle, concentric expansion, no rectangles ever. collapsed 48px button -> peek ~88px (name+category) -> expanded ~min(208px, 56vw) with facts, circular action row (`fydc-act` pills), provenance, ask.
- **Expansion model:** hover/focus -> peek (CSS `transform: scale` 240ms), tap/click/touch -> expanded. Motion is CSS-only transform+opacity (no framer-motion); interior authored on a 48px artboard (1em = circle diameter) so every state scales proportionally. Touch: first tap expands directly (700ms touch dedup for emulated mouse events). `prefers-reduced-motion: reduce` kills transitions entirely via the per-instance `<style>` block.
- **Placement:** DOM flow (relative 48px box), transform-origin center. No explicit coords.
- **Verdict: REUSE for patterns, SKIP the scale model.** Harvest: focus-return discipline, touch dedup, hover/blur grace timers, focus-visible rings, the 48px-artboard proportional scaling trick, the "never render rectangles" contract. Do NOT reuse its concentric model: the whole circle scales as one unit (interior scales with the circle), which is incompatible with independent satellites positioned around a center.

### src/fyd/ui/object-circle.tsx (308 lines) + object-circle.module.css (48 lines)
- **Primitive:** portable FYD doorway: inline compact reference (logo/initials) + hover card (desktop) + bottom-sheet dialog (touch/fully accessible path).
- **Expansion model:** hover/focus card or click -> dialog. CSS-only entrance (`oc-card-enter` 180ms / `oc-sheet-enter` 220ms, transform+opacity, `cubic-bezier(0.22,1,0.36,1)`); `prefers-reduced-motion` disables entirely.
- **Placement:** DOM absolute (card) / fixed (sheet).
- **Verdict: SKIP for the node UI (it is a rectangle-card UI, the killed pattern), REUSE the dialog a11y pattern:** focus into dialog, Escape closes, body scroll lock, focus return to trigger, 44px targets, `role="dialog" aria-modal`. This is the proven reduced-motion/mobile collapse target.

### src/fyd/placement/rail-rule.ts (44 lines)
- **Primitive:** pure deterministic `chooseRailSide(leftFree, rightFree, minSafe=88)`: greatest safe whitespace wins, right wins ties within 24px, `"none"` collapses the strategy.
- **Verdict: SKIP** for the node model (margin-rail policy, not node geometry). Tested thoroughly (rail-rule.test.ts).

### src/fyd/placement/engagement-reconcile.ts (56 lines)
- **Primitive:** pure `reconcileEngagementOnModeChange(prev, next)`: releases engagement only when same engaged id's placement mode changed; keeps on first derivation, id switch, or mode unchanged.
- **Verdict: REUSE the invariant.** "Engagement state must always be consistent with current geometry." A spatial node needs the same policy when focus-shift reorganization or resize changes the node geometry. Fully tested (engagement-reconcile.test.ts).

### src/fyd/spatial/slot-manager.ts (364 lines) + semantic-targets.ts (67 lines) — already exists
- **Primitive:** `SpatialSlotManager` answers WHERE things can live: `computeSlots()` finds safe peripheral bands (left/right) outside the host content column minus fixed chrome; `engagedGeometryFor(viewport, slot, anchor)` computes the full-footprint engaged geometry (circle + orbit): `ENGAGED_MIN=200/ENGAGED_MAX=480`, `ORBIT_PAD=26/ORBIT_BTN=44` (compact 16/38 below 640px), one-sided orbit reserves space on the outer half only; returns `null` when no safe geometry (caller stays collapsed). `largestFittingDiameter` clamps circle to rect. `semantic-targets.ts` binds objects to `data-ping-object` DOM targets with `proximityScore` 0..1.
- **Verdict: ADAPT.** This is the geometry engine the spatial node should build on; its units are px and its policy is "don't occlude host content." The node model needs a normalized object-space layer above it.

### src/motion/registry.ts (207 lines) + src/motion/motionTokens.ts
- **Primitive:** semantic registry (Motion 3.0, harvest-only): `resolveMotion(spec)` maps role/placement/intensity/trigger/reducedMotion to a vetted implementation. Hard constraints: CSS-first for trivial motion, transform+opacity only, reduced-motion -> instant state, no GSAP/Lottie, content visible without animation. Closed world: unmapped specs return `none` ("motion omitted rather than invented"). Vetting ledger documents every exclusion.
- Tokens: duration/delay/spring (gentle 300/25, snappy 500/30, bouncy, smooth, magnetic*)/easing (premium 0.22,1,0.36,1)/opacity/distance/scale/reducedMotion/etc.
- **Verdict: REUSE tokens, note the gap.** fyd ui code imports `spring` from `@/motion/motionTokens` directly (portal-circle.tsx:41, identity-object.tsx:32) but does NOT go through `resolveMotion`. The registry has no spec for spring expansion/orbit motion, so a spatial node would fall in the closed-world `none` bucket. Either extend the registry (harvest the portal-circle springs as a vetted orbit/expansion implementation) or keep direct token import; do not invent new springs.

### src/fyd/ui/identity-object.tsx (855 lines) — the rectangle implementation
- **Primitive:** 64px identity circle -> desktop animated popover (rectangular card: identity header, summary, key facts, RelationGroup rows grouped by predicate, capability actions, evidence) or mobile bottom sheet (ObjectCircle dialog pattern). Related objects open as live objects inside the expansion (fetch `/api/fyd/objects/[objectId]`, Back navigates stack).
- **Motion:** framer-motion `AnimatePresence` + `motion.div` popover (`initial {opacity 0, scale 0.94, x 14}` -> `spring.gentle`; exit fade), `useReducedMotion` -> `duration: 0`. `circleReducer` drives collapsed/peek/expanded/ask.
- **Verdict: SKIP as UI (it is the killed card/modal), HARVEST the data seams:** graph-derived `RelationGroup` (services/people/external-identities/location grouped by predicate), live-related-object navigation with fail-closed error, capability-gated `ActionRow`, `gradientFaceFor` deterministic client face. These are the satellite CANDIDATES, currently rendered as rows.

## 2. THE LOST PRIMITIVE: CONFIRMED

Yes. `src/fyd/ui/portal-circle.tsx`'s `EngagedPortal` is an existing circular-expansion design primitive:

1. Circle expands spatially from its exact origin (React `createPortal` at `document.body`, scale spring `COLLAPSED_D/d -> 1`, `spring.gentle`).
2. Capability-gated controls radiate around the circle on a computed orbit (`PerimeterButton`, angles per engaged side, tooltips, `aria-pressed` states).
3. Full-footprint geometry: `engagedGeometryFor` (slot-manager.ts) reserves orbit space beyond the circle edge, clamps to the largest circle fitting safe peripheral space, returns null (stay collapsed) when no safe geometry.
4. Ask FYD is an interior state of the circle, not a separate modal.

What the spatial-node model changes: orbit controls become graph-derived satellite OBJECTS (not fixed 5 buttons), and placement moves from px orbit angles to normalized object-space.

## 3. MOTION

- **framer-motion version:** `^12.42.2` (package.json).
- **Already used in fyd ui code:** `motion.button/motion.div/motion.span`; `AnimatePresence` (portal-circle hint label, identity-object popover); `useReducedMotion` (portal-circle.tsx:82, identity-object.tsx:593); springs `spring.snappy` (engage transitions) and `spring.gentle` (expansion) from `@/motion/motionTokens`; `whileHover`/`whileTap` scale (perimeter buttons); `initial/animate/exit` props. All motion is transform+opacity only.
- **Not used in fyd:** `layout`, `layoutId`, `drag` (grep over src/fyd + src/components found zero layoutId/drag in fyd; only comment hits like "hand-layout lives here" and HTML5 drag in unrelated visual-slot bridge code). `useMotionValue/animate` appear only in unrelated components (tape-measure-nav, parallax-image).
- **Shared token system:** yes, `src/motion/` (registry + 12 modules + motionTokens + tokens for reduced motion). fyd uses it via direct `spring` import only; it does not call `resolveMotion`. The registry's closed world means any satellite orbit/expansion motion must either be harvested as a new vetted registry entry or continue the direct-token pattern.

## 4. GAPS (what the spatial-node model needs that does not exist)

1. **Normalized object-space coordinates.** Everything existing is viewport px (`engagedGeometryFor`, orbit px math, slot rects). No 0..1 object-space layer mapping center + satellites; no separation of object-space layout from viewport px projection.
2. **Graph-derived satellite layout.** `orbitAngles` is a fixed 5-slot map (follow/ask/web/like/close); IdentityObject's relationships render as card rows (`RelationGroup`), never as orbit positions. No function mapping relationship predicates (services, location, contact, evidence, ask) to satellite angles/radii from graph data.
3. **Focus-shift reorganization.** The model is single-engagement (AttentionController primary/secondary; circle-machine collapsed/expanded). No layout that re-flows satellites when focus moves between them, and `engagement-reconcile` releases engagement on geometry change rather than re-flowing it.
4. **Keyboard arrow navigation between satellites.** A11y today is Tab-based: perimeter buttons are individual buttons in DOM order (portal-circle), FydCircle has Enter/Space/Escape only, ObjectCircle relies on the dialog Tab order. No roving-tabindex or arrow-key satellite navigation exists anywhere in fyd.
5. **Reduced-motion collapse.** `prefers-reduced-motion` currently reduces to instant transitions (portal-circle/identity-object) or disables CSS animation (object-circle). There is no "collapse spatial layout to a linear list" degraded mode; the ObjectCircle bottom sheet is the closest existing fully-accessible fallback.

## 5. A11Y: REUSE OR REPLACE

- **FydCircle: REUSE.** Focus moves to the dialog on open (`dialogRef.focus({preventScroll:true})`, fyd-circle.tsx:330); Escape returns focus to the trigger with focus-peek suppression; 250ms hover grace + 150ms blur grace; 700ms touch dedup; `aria-expanded`, `aria-label`, focus-visible rings; tap-outside collapse. Fully tested in circle-machine.test.ts (fail-closed semantics) and fyd-circle.test.tsx (collapsed markup is cheap, no card/modal strings, no em dashes).
- **PortalCircle engaged: ADAPT.** Good: `role="dialog"` + `aria-label` (portal-circle.tsx:468), Escape closes, deferred outside-pointerdown closes, `aria-pressed` on toggle buttons, inward tooltips so controls stay in safe space. Missing: no focus moved into the portal on open, no focus return to the launcher (launcher has `pointerEvents: none` while engaged, portal-circle.tsx:248), no tab-order guarantees for perimeter buttons. For satellite navigation this must be upgraded (focus into center/satellites, roving tabindex, arrow keys).
- **ObjectCircle: REUSE the dialog pattern.** Hover card is `role="note"` (decorative, never required); dialog path: `role="dialog" aria-modal`, focus into dialog, Escape, scroll lock, focus return to trigger, 44px targets, `aria-haspopup="dialog"`/`aria-expanded` on trigger. This is the proven reduced-motion/mobile collapse target for the spatial node.
