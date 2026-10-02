# PING Template (`/`) Browser Proof Log — 2026-09-21

## Summary

Technical browser proof completed 2026-09-21 ~19:50 MDT via Pig headed Chrome.
All gates passed after two defect fixes.

**Note:** The original proof output (`/tmp/ping-template-proof3.log`) was lost
to tmp cleanup. This log reconstructs the results from the Wave 2 checkpoint
record. The screenshots survive in `evidence/ping-root@*.png`.

## Initial Defects Found

1. **375px overflow:** Root `/` overflowed by 10px at 375px test width.
   - Effective document client width: 360px
   - Status cards were 354px wide while grid track was 328px
   - Root cause: Framer Motion `ScrollReveal` wrapper retained intrinsic minimum width
   - Fix: Added `min-w-0` to motion wrapper (`src/components/scroll-reveal.tsx`)

2. **Undersized touch targets:** Several mobile links were 16-18px tall:
   - Footer navigation links
   - "Read the..." links
   - Fix: Added 44px tap areas (`src/app/page.tsx`, `src/components/site-footer.tsx`)
   - Status-card text columns: added `min-w-0 flex-1`

## Final Proof Results

**Viewports:** 1280x800, 375x667, 390x844
**Results:**
- HTTP 200 on all viewports
- No horizontal overflow
- No non-development console errors
- No page errors
- No undersized audited touch targets (all ≥44px on mobile)
- H1: "Systems that remember, agents you can trust"
- Title contains "PING" (exact title match not verified in this pass)

**Commit:** `0842872e` — "wave2 ping template: fix 375px status-strip overflow, 44px touch targets"

## Screenshots

- `evidence/ping-root@desktop-1280.png` (120KB, 2026-09-21 19:42 MDT)
- `evidence/ping-root@mobile-375.png` (49KB, 2026-09-21 19:42 MDT)
- `evidence/ping-root@mobile-390.png` (61KB, 2026-09-21 19:42 MDT)

## Follow-up (2026-09-22)

Motion 3.0 regression (120 gates) re-verified `/` at 320, 375, 768, 1280, 1440:
- Found and fixed 768px header overflow (CTA div `md:flex` → `lg:flex`)
- All gates pass. See `motion30-proof-2026-09-22.md`.

## Honest Limitations

- Technical gates passed, but subjective visual quality still needs Nolan's review.
  His "rough" assessment was about quality, not just overflow/touch targets.
- Exact document title ("PING: Continuity infrastructure for AI agents") not
  verified character-for-character in this pass.
