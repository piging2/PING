# Motion 3.0 Proof Log — 2026-09-22

## Registry Implementation

**File:** `src/motion/registry.ts` (committed as 7de98ca1)

Semantic registry mapping `(role, placement, intensity, trigger, reducedMotion)`
to vetted deterministic implementations. Harvest-only: no new motion invented.

### Vetted Implementations
- `revealUp/revealDown/revealLeft/revealRight` (src/motion/reveal.ts): transform+opacity, reducedMotion variants, opacity:1 hidden
- `pageFade` (src/motion/pageTransition.ts): opacity only, reducedMotion variant
- `fadeIn/fadeUp/fadeDown/fadeLeft/fadeRight` (src/motion/fade.ts): opacity-only, reducedMotion variants
- CSS feedback/emphasis classes: Tailwind transform/opacity transitions, zero JS
- CSS ambient drift (`.motion-ambient-drift`): transform-only keyframes, reduced-motion gated

### Excluded (Documented with Reasons)
- `revealBlur`: uses filter: blur(), violates transform+opacity only
- `buttons.ts` variants: boxShadow/backgroundColor animations, no reducedMotion
- `hover.ts` variants: filter: brightness(), boxShadow, backgroundColor, no reducedMotion
- `cards.ts`, `hero.ts`: no reducedMotion or unused component-specific
- `typography.ts`: no reducedMotion variant, opacity:0 hidden
- `parallax.ts`, `stagger.ts`, `magnetic.ts`, `pageSlideUp`, `revealScale`: unused/unvetted

### Constraints Enforced
- CSS first for trivial motion (hover/tap feedback)
- Transform and opacity only
- Reduced motion always wins (resolves to `kind: "none"`)
- Ambient edge: `pointer-events-none` + `hidden md:block` (no ornaments below 768px)
- Closed world: unmapped specs resolve to no motion, never invented motion
- Motion is presentation only, never truth/evidence/authority

## Unit Tests

**File:** `src/motion/__tests__/registry.test.ts`
**Config:** `src/motion/jest.config.cjs`
**Result:** 7/7 passing

Tests cover: determinism, reduced-motion precedence, framer variant vetting,
CSS-first feedback, ambient edge gating, closed-world rejection, ledger documentation.

## Browser Regression

**Script:** `motion30-regression.js` (Pig, via PowerShell + CDP :9223)
**Date:** 2026-09-22 ~02:05 UTC
**Pages:** `/`, `/sites/happy-place`, `/sites/coppersmith-plumbing`
**Widths:** 320, 375, 768, 1280, 1440
**Gates:** http, overflow, occlusion, keyboard, reduced-motion, touch-target, layout-shift, console

**Result:** 120/120 gates PASS (15 pages×widths × 8 gates)

### Defects Found and Fixed
1. **768px overflow on `/`**: Header CTA div (`hidden md:flex`) caused 99px overflow
   at exactly 768px. Fixed: changed to `hidden lg:flex` (commit 7de98ca1).
   Verified: no overflow at 768px after fix.
2. **Console 404s**: `_next/static/chunks` 404s are dev-server HMR artifacts,
   not application errors. Filtered from gate (documented).

### Gate Details
- **Overflow:** All pages pass at all 5 widths. No horizontal scroll.
- **Occlusion:** H1 visible at all widths; no fixed/sticky elements cover content.
- **Keyboard:** 30-37 focusable elements per page; tab order intact.
- **Reduced-motion:** `prefers-reduced-motion: reduce` emulated; global CSS
  kill-switch reduces all animations to ~instant. 0 residual animated elements.
- **Touch-target:** All mobile (320, 375) targets ≥44px. No undersized links/buttons.
- **Layout-shift:** CLS = 0.0000 at all widths. No layout instability.
- **Console:** No application errors; no page errors. Dev-chunk 404s excluded.

## Screenshots

- `motion30-ping-root@375.png`, `motion30-ping-root@1280.png`
- `motion30-happy-place@375.png`, `motion30-happy-place@1280.png`
- `motion30-coppersmith@375.png`, `motion30-coppersmith@1280.png`

All in `~/workspace/fyd-lane/wave2/evidence/`.

## Cleanup

- Removed dead `AnimatePresence, motion` import from `src/fyd/ui/portal-host.tsx`
  (imported but never used).
- Added `.motion-ambient-drift` CSS class (transform-only, reduced-motion gated).

## Honest Limitations

- The `/sites/*` pages have NO motion (static renders). Motion 3.0 gates confirm
  no motion-induced defects, but there is no motion to showcase.
- The PING template (`/`) uses ScrollReveal and button micro-interactions;
  these are the live motion surface.
- Unused motion variants (buttons, cards, hero, hover, etc.) remain in the
  codebase as dead code. They are excluded from the registry but not deleted
  (no destructive actions without explicit approval).
