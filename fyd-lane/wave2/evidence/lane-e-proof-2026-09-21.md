# Lane E Proof Log — 2026-09-21/22

## Status: PARTIAL (not complete)

Lane E is **partially** complete. The technical browser gates pass, but
owner customization persistence was **not** verified.

## Passing Gates (2026-09-22 ~01:40-01:44 UTC)

Six demo-site browser configurations passed:
- Happy Place and Coppersmith
- Viewports: 1280x800, 375x667, 390x844
- HTTP 200 on all
- No horizontal overflow
- No application page errors or console errors
- Ask FYD and customization UI present
- Mobile interactive targets ≥44px

**Commit:** `99d076ec` — "wave2 lane E: chromeless /sites/* routes; 44px contact touch targets"

## Ask FYD Verification

- Ask FYD refused unsupported services claims (honest refusal)
- Returned a cited phone answer (evidence-bounded)

## Customization Verification (FAILED)

**What was tested:**
- Happy Place customization proposed "Wave 2 Proof Heading"
- Preview showed the proposed change correctly

**What failed:**
- Reload restored "Happy Place Carpentry LLC" (original title)
- Persistence did **not** work — the change was lost on reload
- `POST /api/fyd/customize` returned `demo_owner_mode_required`
- The running server did **not** have `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`

**Result:** Persistence failed honestly. The system correctly refused to
persist without owner mode enabled, rather than silently dropping the change
or falsely claiming success.

## Owner Fact-Correction Convergence

**Not run.** The full loop (propose → preview → typed journal apply →
reload persistence → revert → reload → exact restoration) was not completed.

## Background Failure Evidence

A delayed background completion notification reported that an earlier
`lane-e-proof.js` run exited with `EXIT=1`. This is preserved as failure
evidence, not success. The specific failure was not captured in the
notification, but the persistence failure above is the known blocker.

## Screenshots

- `evidence/happy-place@desktop-1280.png`, `happy-place@mobile-375.png`, `happy-place@mobile-390.png`
- `evidence/coppersmith-plumbing@desktop-1280.png`, `coppersmith-plumbing@mobile-375.png`, `coppersmith-plumbing@mobile-390.png`
- `evidence/ask-fyd-happy-place.png`
- `evidence/customize-proposal.png`, `evidence/customize-applied.png`, `evidence/customize-reloaded.png`

## What Remains for Lane E Completion

1. Enable `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` on the server
2. Run full customization loop: propose → preview → apply → reload (verify persistence)
3. Run revert: revert → reload (verify exact restoration)
4. Verify owner fact-correction convergence

Until these are done, Lane E remains **partial**.
