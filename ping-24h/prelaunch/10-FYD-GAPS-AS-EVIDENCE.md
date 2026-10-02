# FYD GAPS AS EVIDENCE - Prelaunch Planning Artifact

Date: 2026-09-28 MDT. PLANNING ONLY. FYD remains frozen as the proof workload.
FYD's gaps are evidence of missing generic machinery, not an implementation queue.
No FYD UI work happens in prelaunch; no FYD fixes are queued.

---

## Gap 1: approve-to-serve is a projection-invalidation/refresh gap

- WHAT WAS OBSERVED (TWO_SITE_VERIFICATION, 2026-09-29 00:50 UTC): approving or clearing a proposal did not change the served site until a manual projection re-dump ran.
- WHAT IT IS: a missing generic seam - AUTHORITATIVE STATE CHANGE → PROJECTION INVALIDATION → DETERMINISTIC REBUILD → ATOMIC PUBLISH → FRESHNESS PROOF. FYD approve is one consumer of that seam.
- WHAT IT IS NOT: a FYD bug to fix in the FYD tree. Do NOT special-case approve→re-dump.
- GENERIC SEMANTICS REQUIRED: AUTHORIZED TRANSITION → AFFECTED OBJECTS → AFFECTED PROJECTIONS → REBUILD → ATOMIC PUBLISH → FRESHNESS PROOF. Mid-rebuild failure must leave the last good version serving.
- CONSUMERS: FYD approve/clear; MC journal updates; decision-record projections; any future tenant surface.
- OWNER: projection authority (candidate writer 4, conditional on T-17).
- DO NOT: do not wire FYD approve to a re-dump script as the "fix".

## Gap 2: source/build/serve skew is a runtime-binding problem

- WHAT WAS OBSERVED: source HEAD f877c3919941978f07d5014909595df4751ec258; served build DqZQX-gQgkpciv6rpLgG3 built 2026-09-27 21:00 MDT (predates HEAD); served process started 2026-09-28 06:38. Track C SitePatch source-only, never imported by the served path.
- WHAT IT IS: the runtime has no binding between the three layers. A screenshot of the served site cannot be traced to a source commit.
- WHAT IT IS NOT: a deploy-script bug. It is a missing constitutional seam: every served FYD experience must expose or make mechanically verifiable SOURCE SHA + BUILD ID + SITESPEC VERSION/DIGEST + OBJECT GRAPH/PROJECTION VERSION.
- CONSEQUENCE: until the seam exists, no product claim based on a screenshot counts as final proof. Worker claims of "fixed" are irrelevant until the served bytes prove it (the v3-polish falsification).
- OWNER: build/serve binding (T-18 spec; no writer until the spec lands).
- DO NOT: do not restart :3100 to "fix" the skew (healthy, demo flag live); do not treat the held convergence attempt's regeneration claims as proven.

## Gap 3: the mobile one-liner is unattributed dirty work

- WHAT WAS OBSERVED: suppressHydrationWarning is live in the served tree but uncommitted, with no attributing test.
- WHAT IT IS: dirty work in the canonical tree that bypassed the 195-test floor. It is evidence that the floor is not enforced, not evidence that the one-liner is correct or needed.
- WHAT IT IS NOT: a fix to keep or revert on its own merits. It rides the floor: if the floor is reinstated and the one-liner is untested, it gets a test or it goes.
- OWNER: verification (T-19 floor reinstatement).
- DO NOT: do not commit it opportunistically; do not revert it cosmetically.

## Gap 4: no explicit reject is a contract question, not automatically a defect

- WHAT WAS OBSERVED: leaving a proposal unapproved is the implicit reject; no explicit reject action exists.
- WHAT IT IS: a question for the approval contract - does the owner need an explicit DENY with evidence, or is non-approval sufficient? The WAITING_APPROVAL triage primitive is genuinely missing from the forest (inventory), which makes this a real design question, not an oversight.
- WHAT IT IS NOT: automatically a defect. Adding a reject button without the contract is theater.
- OWNER: approval authority (phase1 door is the leading candidate; the contract question resolves under it).
- DO NOT: do not add a reject action until the approval contract names it.

---

## The generic frame (binding)

Every FYD gap above maps to generic machinery with FYD as consumer #1:

| FYD observation | Generic seam | Consumer #1 |
|-----------------|--------------|-------------|
| approve → manual re-dump | projection invalidation/refresh | FYD approve/clear |
| source ≠ build ≠ served | build/serve binding | FYD served experience |
| unattributed one-liner | test-floor enforcement | FYD renderer |
| no explicit reject | approval contract | FYD owner decision |

FYD owns: evidence, semantic objects, owner state, relationships, SiteSpec, concierge context, authorized changes, outcomes, regeneration.
FYD does not own: rendering machinery (commodity, harvest), editing machinery (commodity, harvest), new claim authority (never).

Evidence/source-derived state, owner-asserted state, and presentation state stay separate. Generated presentation never silently becomes factual state.
