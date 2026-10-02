# FYD Wave 2 Report

**Date:** 2026-09-22
**Branch:** `fyd/sitespec-generator`
**Repo:** `/home/nolan/projects/ping`

## Executive Summary

Wave 2 focused on browser proof, performance validation, and Motion 3.0 for
the FYD customer loop and PING template. Three lanes completed; one remains partial.

| Lane | Status | Evidence |
|------|--------|----------|
| E: Demo-site browser proof | **PARTIAL** | `evidence/lane-e-proof-2026-09-21.md` |
| F: Performance proof | Complete | `evidence/lane-f-perf-2026-09-21.md` |
| PING template browser proof | Complete | `evidence/ping-template-proof-2026-09-21.md` |
| Motion 3.0 | Complete | `evidence/motion30-proof-2026-09-22.md` |

## Lane E: Demo-Site Browser Proof (PARTIAL)

**Status:** Partial. Technical gates pass; customization persistence not verified.

### Passing
- 6 configurations (2 sites × 3 viewports): HTTP 200, no overflow, no errors
- Ask FYD: honest refusal of unsupported claims, cited phone answers
- Customization: proposal and preview work correctly
- 44px touch targets on mobile

### Failing / Not Done
- **Persistence FAILED:** Reload restored original title. `POST /api/fyd/customize`
  returned `demo_owner_mode_required`. Server lacked `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`.
- **Owner convergence NOT RUN:** Full propose→preview→apply→reload→revert→reload loop incomplete.
- **Background failure:** Earlier `lane-e-proof.js` exited with `EXIT=1` (preserved as evidence).

### To Complete Lane E
1. Enable `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`
2. Verify persistence across reload
3. Verify exact restoration after revert

## Lane F: Performance Proof (COMPLETE)

**Verdict:** No generic performance defect.

- LCP-equivalents: 176-632ms (all <3s threshold)
- Production JS: ~1.38MB uncompressed (~400KB gzip)
- Per-page: ~200-250KB gzip (estimated)
- Images: 0-87KB
- 15MB dev-server weight is a development artifact (unminified bundles), not a product defect

## PING Template Browser Proof (COMPLETE)

**Surface:** Root `/` ("PING: Continuity infrastructure for AI agents")

### Defects Fixed
1. **375px overflow:** ScrollReveal wrapper retained intrinsic width. Fixed with `min-w-0`.
2. **Touch targets:** Footer and read-more links were 16-18px. Fixed to 44px.
3. **768px overflow (found in Motion 3.0):** Header CTA overflowed at exactly 768px.
   Fixed: `md:flex` → `lg:flex`.

### Results
- 1280, 375, 390 viewports: HTTP 200, no overflow, no errors, 44px targets
- H1: "Systems that remember, agents you can trust"

## Motion 3.0 (COMPLETE)

### Deliverable
**`src/motion/registry.ts`**: Semantic registry mapping
`(role, placement, intensity, trigger, reducedMotion)` → vetted implementation.

**Principles:**
- Harvest-only: no new motion invented
- CSS first for trivial motion
- Transform and opacity only
- Reduced motion always wins
- No edge ornaments below 768px
- Closed world: unmapped specs → no motion (never invented)
- Motion is presentation only

### Vetting
Full inventory audited. Excluded with documented reasons:
- `revealBlur` (filter: blur)
- `buttons.ts`/`hover.ts` (boxShadow, backgroundColor, filter animations)
- Unused variants (typography, parallax, stagger, magnetic, etc.)

### Verification
- **Unit:** 7/7 tests pass (`src/motion/__tests__/registry.test.ts`)
- **Browser:** 120/120 gates pass (5 widths × 3 pages × 8 gates)
  - Widths: 320, 375, 768, 1280, 1440
  - Pages: `/`, `/sites/happy-place`, `/sites/coppersmith-plumbing`
  - Gates: http, overflow, occlusion, keyboard, reduced-motion, touch-target, layout-shift, console
- **TypeScript:** Clean

### Cleanup
- Removed dead `AnimatePresence, motion` import from `portal-host.tsx`
- Added `.motion-ambient-drift` CSS (transform-only, reduced-motion gated)

## Commits (Local, Not Pushed)

- `99d076ec`: Lane E chromeless routes, 44px targets
- `0842872e`: PING template 375px overflow fix, 44px targets
- `7de98ca1`: Motion 3.0 registry, 768px header fix

## Honest Limitations

1. **Lane E persistence** is the open boundary. The customization loop is not closed.
2. **Visual quality** of the PING template needs Nolan's subjective review. Technical
   gates pass, but "rough" was about quality, not just mechanics.
3. **Unused motion code** remains (buttons, cards, hero, hover, etc.). Excluded from
   registry but not deleted.
4. **Dev-server 404s** (`_next/static/chunks`) are infrastructure noise, filtered
   from gates but indicate dev-server chunk loading issues.
5. **Exact title** "PING: Continuity infrastructure for AI agents" not verified
   character-for-character.

## Next Steps

1. **Nolan review:** Visual quality pass on PING `/` template
2. **Lane E closure:** Enable owner mode, verify persistence + revert
3. **Motion 3.0 adoption:** Migrate live components (ScrollReveal, buttons) to
   resolve through the registry
4. **Dead code:** Decide whether to remove unused motion variants
