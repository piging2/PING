# VERDICT: GO — v3-polish re-land adjudication re-run (2026-09-27 ~09:30 MDT)

## Verdict

GO. The re-land is real this time: the served bytes are byte-identical to the bound digests, all twelve fixes are present in the served HTML and visible in the fresh frames, all falsifier gates pass, and the runbook section 5 GO criteria all hold. Present the comparison page.

## Evidence bound

Pinned HEAD (served worktree, clean): `9c8c21939eff073a5b87817e4ef1674d9aabebc5`
Build: `.next/BUILD_ID` = `6QmE00XdDC5Sa_Lrobgt0` (21 bytes, xxd-verified; the 64-char string in rework/digests.md is a transcription error, recorded honestly in INDEX.md; the build is unchanged because served HTML is byte-identical)
Served HTML sha256 at capture time:
- happy-place: `aacaa7e5c97bf89ce553ff8fe84031989d94bab40e97cd30e47fbe955a65bef0` (98,980 bytes) MATCHES
- coppersmith-plumbing: `3651a10f7d8a6479e0f3fcba8d88b99556e4655abf5f4f95dc431282b9dcda3f` (100,171 bytes) MATCHES
Serving: :3200 PID 26533, `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` confirmed in process env, both routes HTTP 200, zero page errors across all 15 frames.
Chain: `pig-wake-resume.status` = VERDICT: DONE, lane commit `cd280d39`, merge `9c8c2193`.

## Twelve-fix visual table (spot check 390 and 1440 per site)

| # | Fix | HPP 390 | HPP 1440 | Copper 390 | Copper 1440 |
|---|-----|---------|----------|------------|-------------|
| 1 | MarginObjectLayer gated on viewerKind | PASS, no margin artifacts | PASS | PASS | PASS |
| 2 | FydMark not on visitor cards | PASS, none visible | PASS | PASS | PASS |
| 3 | Business wordmark in visitor header | PASS, "Happy Place Carpentry LLC" | PASS | PASS, wordmark with ellipsis truncation at 390, full at 1440 | PASS |
| 4 | Provenance narration blocked from public copy | PASS, no "Featured object" / "kindLabel" / "Business:" | PASS | PASS | PASS |
| 5 | No generic "Business: ..." object pill in hero | PASS | PASS | PASS | PASS |
| 6 | No empty "Featured object" label | PASS | PASS | PASS | PASS |
| 7 | Real tel:/mailto: anchors as primary contact actions | PASS, "Call +15412865190" gold button | PASS | PASS, "Call 970-245-3869" | PASS |
| 8 | Hero overflow fixed at 390px | PASS, no overflow | n/a | PASS (see note) | n/a |
| 9 | Hero media ranked by aspect/luminance fitness | PASS, ranked hero image present | PASS, gallery of real assets | PASS, hero image present | PASS, gallery of real assets |
| 10 | Empty sections omitted | PASS, all sections have content | PASS | PASS | PASS |
| 11 | Contact composed as a section | PASS, labeled PHONE / EMAIL / WEBSITE rows | PASS | PASS, labeled PHONE / WEBSITE rows | PASS |
| 12 | No "Visit website" CTA; CTA order Call then Ask FYD; headline | PASS, "Call" then "Ask FYD", lead is locality-only | PASS | PASS | PASS |

Fix 8 note: the batch fullPage frame for copper at 390 shows hero text clipped at the viewport edge (reproduced 2/2 under the batch harness). Two independent CDP layout measurements (fresh page and batch-like shared page, fonts loaded) show zero horizontal overflow, and viewport re-shoots at true 390px show both heroes wrapping cleanly. The clipping is a fullPage screenshot-path artifact, not page layout. The clean re-shoots are staged next to the canonical frames and the artifact is documented in INDEX.md. Fix 8 stands as visually confirmed.

Bytes cross-check (served HTML identical to bound digests, so the rework bytes table carries): "FYD SOCIAL" 0, "Featured object" 0, "Visit website" 0, "Business:" 0, "FydMark" 0 in both pages.

## Falsifier gates

- No invented claims, reviews, or media: PASS. Service copy and taxonomy trace to the graph; no testimonials or star ratings on generated pages; all photos are real assets.
- No debug/governance copy in the visitor projection: PASS.
- No raw internal semantics as public copy: PASS. The single `viewerKind` occurrence is inside serialized React flight data, not rendered copy. The "Why this number?" / "Source" / "Observed on" disclosures are deliberate citation UX, accepted by the lane's public-copy tests.
- No PII leakage: PASS. Only the businesses' own public contact info is rendered.

## Original-site baseline (not v3 failures)

The live original still has its two defects, confirmed in the fresh frames:
1. Reviews section renders literal `&apos;` entities ("We&apos;re building our public review portfolio...").
2. Restoration/Drywall service cards show large empty gray boxes above the copy where media should be.

Fixes exist uncommitted in /tmp/hpp-src with no authorized deploy path. These are baseline facts about the original for the side-by-side, and they do not fail or pass the v3 verdict.

## Observations (not verdict items)

- Coppersmith still lists "Heating & Cooling" and "HVAC" as separate near-duplicate service cards (carried over from the falsification record; not one of the twelve fixes).
- Generated footers carry a "FYD Social" platform credit line (attribution, not debug copy).
- The locality lead line renders twice under the hero CTAs on both sites (minor duplication).
- The "Call +15412865190" label sits tight against the gold button edge at 390 on HPP.

## What could still be checked

Widths 320/375/768 were captured (all HTTP 200, zero page errors) but the runbook spot check covers 390 and 1440 per site, which is what was judged. The 15/15 canonical frames plus the 2 re-shoots are staged for Nolan's own review.
