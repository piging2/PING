# Self-audit: meta-ai-intel-pass 2026-09-30 15:04 MDT

## Run context
- Runs: 20260930-150439-d-segment-deep-dive (ok, 12 items, 17,688 bytes, pack e0e4e4a9d5), 20260930-150717-a-weak-website-hunt (ok, 12 items, 15,081 bytes, pack 0012ff1cd1)
- Both reconciled via reconcile-run-report.sh (exit 0, claims match filesystem+ledger)
- Distill sweep: both files marked distilled; 4 staged NEW/WATCH to pipeline.md; 0 canonical JSONL merges (300-active cap full)

## Production evidence (this run, collision-CLEAR businesses only, n=8)
Three of eight collision-guard CLEAR businesses had materially wrong address/URL claims in the captured answer:
1. Pumps West Ltd: answer claimed Grand Junction / 707 Arrowest Rd. Independent check (browser.open pumpswestltd.com, live site): actual address 20520 H50 Rd, Delta CO 81416; phone 970-778-9205. Wrong town, wrong street.
2. Ruano Landscaping LLC: answer claimed "no website found". Independent check: own site ruanolandscapingllc.com EXISTS (GBP + live domain), 70 Coyote Cir Carbondale. Wrong presence claim (staged anyway with correction, since trade fit is good).
3. Stone Ridge Roofing & Siding LLC: answer claimed stoneridgeroofingandsiding.com. Pipeline L1199 records "no own site found" for the same business (phone (970) 249-7663 match). Conflict unresolved this pass; no merge either way. (Resolved as same-business via contact evidence, already tracked; the URL claim itself is unverified.)

Mechanism: businesses the pack has no data on (CLEAR = untracked) are exactly the ones where the model extrapolates addresses/URLs. The negative-signals list suppresses re-serves of known businesses, but it cannot suppress confabulation about unknown ones.

## Proposed rule (CANDIDATE, not yet approved policy)
**CLEAR-claim address/URL re-verification:** when the distill audit stages a collision-guard CLEAR business, the pipeline row MUST cite the address and website/URL observed in the independent verification search, never the answer's. A staging row may not carry an answer-sourced address or URL without an "unverified:" prefix. A CLEAR business whose address/URL cannot be independently corroborated fails closed as WEAK INDICATION (stage as near-miss with reason, or discard), not CONFIRMED.

## Unit cases
- Case 1: answer claims "Pumps West Ltd, Grand Junction, 707 Arrowest Rd, pumpswestltd.com". Independent search returns live site with "20520 H50 Rd, Delta CO". Expected: pipeline row cites Delta address; note records the answer's town claim as wrong.
- Case 2: answer claims "no website found" for a business. Independent search finds live own domain. Expected: pipeline row cites the real domain; note records the correction.
- Case 3: answer claims a domain that cannot be resolved or conflicts with an existing pipeline record's "no own site" finding. Expected: no merge on the URL claim; identity decided by contact evidence; URL marked unverified.
- Case 4: answer claims an address; independent search shows only a PO Box or town-level listing. Expected: address cited at corroborated precision (PO Box/town), grade STRONG INDICATION, no invented street address.

## Automation sketch (deferred to a dev lane)
- Distill-sweep audit helper: for each CLEAR candidate, accept `verified_address`, `verified_url` fields (each with source note) before emitting the pipeline row. Emit a warning when either field is copied from the answer text rather than the verification source.
- Deterministic string check: pipeline staging row must not contain the answer's raw URL/address strings unless they also appear in the verification evidence block. Fuzzy: normalize case/whitespace; flag verbatim URL matches from answer text as suspect.
- Status: PROPOSAL. Per doctrine (OUTCOMES -> CANDIDATE PROPOSAL -> EVIDENCE/SAMPLE GATE -> APPROVAL -> VERSIONED POLICY CHANGE): this note is the candidate proposal. Approval requires Nolan or the owning lane. Not yet applied to versioned policy.

## Not promoted this run (logged for next pass)
- Well-and-pump segment industrial drift: 4/12 d-pass claims were CONFIRMED-exist but industrial/commercial-primary (DA Smith mining drilling, EmTech industrial pump/motor distributor, Pumps West ag irrigation supply, Heli-Port seismic shot-hole drilling). n=1 pass; if the pattern repeats, promote a trade-fit pre-screen rule. No action now.
