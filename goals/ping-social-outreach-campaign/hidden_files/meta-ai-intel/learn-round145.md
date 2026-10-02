# LEARN — outreach-engine round 145 (2026-09-25)

## Observation: phone-only discovery candidates stall without DM eligibility — the FB Message-button check is the real conversion bottleneck

VERIFIED this round: of the 7 discovery-2026-09-25-1321 candidates consumed, only 1 (Leland Plumbing Heating and Air Conditioning, WARM) had an own-site-verified email route and could convert to a draft (drafts/round145-leland-plumbing-email.md, queued 2026-10-01 slot 6). The other 6 are phone-only or form-only with no FB Page found and no DM-eligibility claim made: Tiger Plumbing, Ace's Snow Plowing, Wilber's Snow Removal Services, Binkley's Snow Removal Service (all phone-route, directory-published numbers, no own site), GT Ltd (form-route only, customer consultation flow, no B2B invitation), Long Haul Drilling (phone-route, license caveat). Same pattern round 143: 3 of 7 pulled NEW prospects converted to DMs; the 4 phone-only ones remain stalled with no lane. The 2026-09-25 FB PAGE CHECKs independently found no matching business Pages for Pine Mountain Electric, Kero HVAC, Garage Doors And More LLC, and Home Appliance Repair & Sales (all phone-route only).

PATTERN (generalizable, durable): in thin trades (snow removal, well/pump, phone-first plumbers/HVAC), discovery batches skew heavily phone-only (no published email, no own site). Those candidates have exactly one outreach lane: a Facebook Page with a verified Message button. Without that check, they accumulate as NEW indefinitely and never convert. The FB Message-button check backlog is therefore the binding constraint on phone-route candidates, not discovery volume — adding more phone-only candidates to the pool without Page checks grows the backlog, not the pipeline.

WHY IT MATTERS: discovery keeps producing phone-only WATCH rows at a higher rate than the engine converts them (this run 6 of 7 stalled). A dedicated Page-check pass on the Pig converts a share of the backlog to DM lanes (3 of 7 round-143 converts); the unchecked remainder is dead inventory. Under the product-sprint throttle, pulling more phone-only NEW prospects without Page-check capacity is volume without effect.

UNCERTAIN: what fraction of the accumulated phone-route backlog actually has a matching business Page (facebook-cli profile info returned server-side 403 for all Pages in the discovery-1321 session, so the 2026-09-25 Page checks were batch-helper based, not exhaustive); the true convertibility rate of the backlog is unknown until a Pig-side check pass runs.

SOURCE EVIDENCE: `~/workspace/goals/ping-social-outreach-campaign/hidden_files/discovery-2026-09-25-1321.md` (7 candidates, 1 WARM + 6 WATCH); pipeline.md Round 145 engine batch section (7 staged, 1 DRAFTED + 6 NEW); `~/workspace/outreach/drafts/round145-leland-plumbing-email.md`; `~/workspace/outreach/email-queue-2026-10-01.md` (slot 6); sweep-2026-09-25-round145.md (this round's counts).

## Provenance

- Raw artifact: this file (learn-round145.md), written by outreach-engine round 145.
- Verification: staged-row counts confirmed post-write (pipeline.md Round 145 section: 1 DRAFTED + 6 NEW; draft file exists; queue slot 6 present).
- Nothing here is a prospect row; no unverified claims; no contact info invented.
