# B1 attack notes (laneB10)

## FALSIFIED (corrected after line-19 re-parse)
- V19 B-03 grill-20 record breakdown. Lane claims "25 records in escalation-log.jsonl (9 decide, 14 escalate, 1 escalate_resolved_by_owner, 1 unparseable line)". The file has 24 lines, but line 19 holds 2 concatenated JSON objects (confirmed by re-parse: one escalate with failed_checks [previous_decision, reversible_experiment, safe_default_80], one decide with failed_checks []). True record count: 25 JSON objects = 10 decide, 14 escalate, 1 escalate_resolved_by_owner. The lane's breakdown (9 decide) undercounts decide by 1 (it missed the decide object inside line 19) and treats the malformed line as a 25th "unparseable record" to force the total. Corrected: 25 records (10 decide, 14 escalate, 1 escalate_resolved_by_owner); line 19 is malformed JSONL containing 2 records, not a separate record. (My initial B1 attack note claiming 24 records was wrong; this correction supersedes it. B2 independently found the line-19 concatenation.)

## WEAKENED / imprecise
- Criticality scale is B1-imposed, not lane-11's. The lane transparently defines C4/C3/C2/C1 ("lane 11's bare C-labels kept, scale defined"), which fixes lane16's "C4 UNVERIFIABLE" complaint going forward, but it does not retroactively validate what lane 11 meant by C4. The labels are re-interpreted under a new scale. Honest because disclosed, but the C4 on D-01 is now B1's judgment, not an observed fact.
- V25 citation: verifyResultEnvelope at vendor/external_agent_adapter.js:307, not :306 (off by one). invalidResult at :303. Substance confirmed.
- V13 citation: the "for the FYD demo. No PING runtime import" phrase is at lines 12-13 of the header, not line 2 (line 2 says "H3 lane: failure-honesty gate for DEMO owner attestations"). Substance (demo-only) confirmed; citation imprecise.
- V2 citation: enforcement at adapter.js:1222, lane said "~:1225". Acceptable approximation.

## CONFIRMED (independent re-verification)
- D-09 rankDiscoveryItems declared-only: feed-rank.ts:71 exists; only non-test src/ reference is its own file; the sole Date.now hit is a doc comment (line 55, "not Date.now()").
- B-01 classifyReview declared-only: classifier.ts:273 exists; classifier-provider.ts has zero importers in src/ or tools/ (non-test).
- B-10 WAITING_APPROVAL: zero hits in canonical src/ and zero waiting_approval hits in /home/nolan/workspace js/ts/json. Negative confirmed.
- U-05 compileAskContext: exactly one non-test reference (its own file). Declared-only at HEAD confirmed.
- V5/V6/V7/V11/V12/V15/V16/V18/V23: all line numbers, importers, and callers recomputed exactly (digest.ts :56/:124/:136/:150/:159; outcomes.js 126 lines with vocabulary at :24-39; health-rules.ts :59/:103/:112 with both callers; approvals/route.ts 130 lines with DIGEST_RE, approve|deny enum, silence comment; interview-engine-v3.ts :70/:335/:349; grants.ts:47 pure with zero clock/random; mc-dispatch-identity only imported by dispatch/route.ts; mc-tenant-gate imported by the two missions routes; classificationFromProvenance at ask-composer.ts:140).
- B-08: runs/ contains exactly 57 entries. Confirmed.
- B-05 never-reengage guard: _fb_ledger_engaged_post_ids merge in load_index confirmed; ALREADY_ENGAGED at :72; ledger exactly 12,673 lines.
- D-01 zero dedicated tests: grep over orca-adapter test/ returns 0 hits for authorizeWorkOrder. Confirmed.
- 42-surface tally: 16+10+4+5+7=42. Arithmetic holds.
- Top-10 ranking volumes: B-05 ~3,900/day is precisely grounded, not hand-wavy. 324 checks/pass = (75+20)+(50+12)+(45+12)+(60+20)+30, the standing per-platform engagement ceilings; x12 passes/day at 2h cadence = 3,888. The lane labels volumes as rough estimates and the ranking is robust to 2x error. No threshold theater.

## STRONGEST SURVIVING
The four declared-only corrections (D-09, B-01, B-04, B-10). Each was independently re-verified by grep: zero production callers for rankDiscoveryItems, zero importers for the sentiment provider, zero WAITING_APPROVAL hits anywhere. These are solid negative results that change lane 11's picture.

## WEAKEST LINK
The grill-20 record count (V19). A concrete, checkable arithmetic error in a headline number (25 claimed, 24 actual; 14 escalate claimed, 13 actual). Does not invalidate the map, but it is the one place where the lane's counting failed.
