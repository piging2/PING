# POST-100 Metrics — Pending Requirement (recorded 2026-09-27 ~20:17 MDT)

## Source
POST-100-AUTONOMOUS-BUSINESS-ERA.md (Nolan, binding, GATED). Does NOT supersede
convergence program. Activates only on 9-gate pass.

## The one actionable change (effective immediately)
Begin emitting post-convergence product metrics NOW during Happy Place and
Coppersmith work. Record in 24h scorecard evidence, not as a separate system.
No new authority, no new event types; reuse reached primitives.

## Metrics to emit per onboarded business
1. TIME-TO-USEFUL-PRESENCE: wall time from mission start to genuinely useful site
2. UNSUPPORTED-CLAIM RATE: claims in Ask FYD / site copy without evidence
3. OWNER CORRECTIONS: count + semantic class (factual, stylistic, structural, etc.)
4. CORRECTION SURVIVAL: do corrections persist through regeneration/restart?
5. GROUNDED ASK RATE: Ask FYD responses supported vs refused vs invented
6. CUSTOMER-ACTION COMPLETION: can owner complete real actions from the site?
7. ENGINEERING INTERVENTIONS PER BUSINESS: any hand-rescue is a defect signal

## Status
PENDING. Happy Place and Coppersmith come after Q-P0-04 -> Q-P0-05 -> Q-P0-06 ->
Q-J-01..03 -> FYD owner journey -> restart -> replay in the locked order.
Metrics emission begins when Happy Place work starts.

## Note
The FYD GO (2026-09-27) already provides a baseline data point:
- Time-to-useful-presence: ~11 minutes (20:04 approval to 20:15 served)
- Engineering interventions: 2 (dump.py tenant-param patch, malformed event correction)
- Owner corrections: 0 (Nolan did not correct; the mission was his own words)
These are retrospective; prospective emission starts with Happy Place.
