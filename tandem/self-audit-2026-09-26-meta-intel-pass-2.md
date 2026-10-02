# Self-audit: meta-ai-intel-pass 2026-09-26 15:11 MDT

## Standing question
WHAT DID THE AGENT HAVE TO REASON ABOUT THAT IT HAS NOW SEEN ENOUGH TIMES TO TURN INTO A RULE?

## This run's artifacts
- 20260926-210417-d-segment-deep-dive.md (17,375 bytes, 12 numbered items, pack 6aac8871b2, outcome ok, reconciler match; distilled 2026-09-26T21:10:22Z)
- 20260926-210611-a-weak-website-hunt.md (14,274 bytes, 12 numbered items, pack c3005daedb, outcome ok, reconciler match; distilled 2026-09-26T21:14:10Z)
- distill-sweep --select --cap 5: 0 eligible (102 queued, 66 engine-ingested/excluded)
- brief-lifecycle --check: no new terminal failures; c-review-complaint-signals QUARANTINED, retry-eligible (lift requires Nolan's explicit approval + fixed prompt passing dry-run)
- Yield: 2 VERIFIED-NEW staged to pipeline.md at-cap procedure (Elliott Plumbing & Heating LLC, CONFIRMED; Dave Clark Plumbing And Heating, STRONG INDICATION); 7 already tracked; 3 fail-closed excluded

## Observations
1. Distill of the a-file independently web-searched all 12 businesses: 7 were already pipeline-tracked (collision guard: 6 direct + 1 variant resolved to pipeline.md L2883). Meta AI re-serve rate remains the dominant inefficiency; the pack's negative-signal list (113 names) does not stop Meta from re-serving them.
2. NEW demonstrated identity check: M&R Roofing LLC (Montrose) lists (719) 419-2129, a 719 area code (Colorado Springs/Pueblo) against 970-market geography. Combined with a prior round-15 near-miss flag, this single mismatch was decisive for fail-closed exclusion without further investigation.
3. New town-ambiguity case: All Mountain Plumbing & Heating Inc listed Collbran on homeyou but Aspen on namesandnumbers with the same phone. Both towns conflict across sources; geography could not be verified; fail-closed excluded.
4. At-cap pipeline staging worked as the pressure valve: JSONL untouched at 305, mirror/digest unchanged, staging rows carry full verification citations in pipeline.md.

## Decision
Promote ONE invariant: **Area-code/geography identity gate.** When a candidate's published phone area code does not match the expected area codes for its claimed geography (e.g. 719 number for a Montrose claim, where 970 is expected), treat the identity/address claim as UNVERIFIED and fail closed unless a second independent source corroborates the local address. A local business with an out-of-area phone is not automatically dead, but the burden of proof shifts: the local address must be corroborated independently. Add this as a verification-gate check in the distill path: cheapest to run on the first independent search, fastest falsifier seen this run (one mismatch decided M&R without further reasoning).
