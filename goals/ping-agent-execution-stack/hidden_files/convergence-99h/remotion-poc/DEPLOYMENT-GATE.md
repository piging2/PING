# Remotion POC — Deployment Gate Record

Date: 2026-09-30. POC scope: read-only deterministic composition pipeline
(CLAIM LEDGER -> SCRIPT GATE -> VERBATIM TTS -> TIMESTAMPS -> REMOTION COMPOSITION
-> EVIDENCE FRAMES -> PROVENANCE OVERLAY -> MP4 -> FINAL CLAIM VALIDATOR).
No generative video model anywhere in the proof.

## REMOTION VERSION
PENDING — not yet installed. The Pig (render host) was unreachable at gate-writing
time (commute-window network blackout, 2026-09-30 ~16:15-16:30 MDT); the version
string will be recorded from `npx remotion --version` / installed package.json at
install time, before any render. Target: Remotion 4.x (`remotion@^4.0.0`,
`@remotion/cli@^4.0.0` per the POC package.json).

## LICENSE TEXT + SHA256
- Source URL: https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md
- Accessed: 2026-09-30 (22:16 UTC), via direct fetch; text cross-checked against the
  rendered view of the same URL.
- Local copy: `REMOTION-LICENSE.txt` (same directory as this file).
- SHA256 of the verified text: `bd65083b940f61904f6ef298aade918a7cad72a3e35bc406e36fab365844b673`
- License name: "Remotion License". Copyright (c) 2026 Remotion.
- NOTE in the license text itself: "In Remotion 5.0, the license will slightly
  change. [View the changes here](https://github.com/remotion-dev/remotion/pull/3750)."
  Gate must be re-verified if Remotion 5.x is ever adopted.

## ENTITY ELIGIBILITY (verbatim from the verified license text)
Free License eligibility — "You are eligible to use Remotion for free if you are:
- an individual
- a for-profit organization with up to 3 employees
- a non-profit or not-for-profit organization
- evaluating whether Remotion is a good fit, and are not yet using it in a commercial way"
Allowed (free, commercial OK): "to use the software non-commercially or
commercially for the purpose of creating videos and images and to modify the
software to their own liking, for the purpose of fulfilling their custom use
case or to contribute bug fixes or improvements back to Remotion."
Disallowed: "to copy or modify Remotion code for the purpose of selling,
renting, licensing, relicensing, or sublicensing your own derivate of Remotion."
Company License required for for-profit organizations above 3 employees
(purchased at https://www.remotion.pro/license).

## COMMERCIAL USE STATUS for PING Social
ELIGIBLE — FREE LICENSE, no Company License required (evidence grade: STRONG
INDICATION from standing records). PING Social is Nolan Geske's one-person
consultancy (no LLC, solo founder). That satisfies both "an individual" and
"a for-profit organization with up to 3 employees", and the allowed use covers
commercial video creation. Boundary condition (recorded as a deployment gate):
if PING Social ever exceeds 3 employees, a Company License must be purchased
before any further commercial rendering.

## EMBEDDING STATUS
NOT EMBEDDED. This POC renders locally via the Remotion CLI under /tmp on the
Pig; no Remotion code is shipped inside FYD, PING, Mission Control, or any
customer-facing artifact. If Remotion is ever embedded in a shipped product,
this gate must be re-opened (embedding vs. render-service changes the licensing
surface).

## RENDER SERVICE STATUS
LOCAL CLI RENDER ONLY. Remotion Lambda (the hosted render service) is NOT used
in this POC. If Lambda or any third-party render service is adopted later,
record its own terms here; the Remotion License above still governs the
underlying software.

## Measured render numbers
PENDING — blocked on Pig reachability (see REMOTION VERSION). Will record:
wall-clock render time, CPU user+sys time, output file size, resolution,
duration. No cost characterization ("cheap"/"free") is made without these.

## Re-verification triggers
Re-open this gate if ANY of: Remotion 5.x adoption (license text changes);
headcount > 3; embedding Remotion in a shipped product; adopting Remotion
Lambda or another render service; 12 months elapsed (re-fetch license text and
recompute SHA256).
