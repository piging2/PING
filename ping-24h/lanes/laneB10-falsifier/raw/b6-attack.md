# Lane B10 falsifier attack notes: Lane B6 (business intelligence)

## Scope
Report: ~/workspace/ping-24h/lanes/laneB6-business-intel/report.md (174 lines).
Method: Synthesis of lanes 2-16 + LEDGER. NO new canonical-tree reads (Pig transport failed twice; PROBE_TRANSPORT_FAILED).

## Nature of the lane
B6 is a synthesis/aggregation lane, not a measurement lane. It compiles findings from other lanes into 14 business questions. Its verdicts are only as good as the cited lanes. B6 is explicit about this: "All of those are themselves hypotheses until clean-checkout replay; this report inherits that status."

## Verified

### CONFIRMED (accurate representation of cited work)
1. **Jev falsification reported accurately**: Section 8 cites "6/6 agreement, Brier 0.0076 (LEDGER)" then notes "Falsified as a measurement: lane 16 recomputed the arithmetic (one mean was wrong: 422ms reported vs 429.8ms true), found n=6 hand-picked with 3 of 8 deny checks unexercised, and showed the 0.5 threshold is lane-imposed." This matches the lane-16 findings in the program summary. B6 does not misrepresent the Jev numbers or their falsification.

2. **UNKNOWNs honestly labeled**: Section 1 (business named identity UNKNOWN), Section 6 (customer questions ABSENT/UNKNOWN), Section 10 (named unknowns with missing evidence). B6 does not invent answers where evidence is absent.

3. **No business score computed**: "No business score is computed. The task forbids it, and the evidence does not support one." Correctly refrains from scoring.

## FALSIFIED / material problems

### F1. Cites lane-12 409 HOLD without B3/B4 correction
- Section 7: "Journaled: ... 409 HOLD records on duplicate intent (lane 12 S3/S4)"
- Section 10: "`MC_RUN_UNKNOWN` is a first-class state with 409 HOLD on duplicates (lane 12)."
- Section 13: "409 HOLD on duplicate non-terminal intents" listed under "Safe-by-code."
- **Problem**: B3 and B4 independently verified that 409 HOLD does NOT exist at HEAD 0264d517 (zero occurrences of "409", "findPriorMission", "MISSION_TERMINAL_STATUSES" in the committed tree). Lane 12's S3/S4 described a dirty worktree.
- B6 ran ~14:39-15:00 MDT, concurrent with B3/B4. B6 may not have seen their reports. But as a synthesis lane, B6's failure to reconcile means three sections assert a mechanism that does not exist in the committed tree.
- **Impact**: Sections 7, 10, and 13 overstate the safety of the duplicate-intent path. At HEAD, duplicate POSTs mint new missions (no HOLD).

### F2. Codex "intended-temporary" resolution is stale
- Section 3: "`codex blockedUntil 2026-09-17` expired, a stale config (lane 11, resolved as intended-temporary by lane 16)."
- **Problem**: B5 (running 14:47-14:55 MDT) found the expiry caused GRANT (a security-relevant state change). The owner then RE-BLOCKED codex on 2026-09-28 with no expiry, explicitly stating "expiry is ELIGIBLE FOR RE-EVALUATION, not AUTHORIZED FOR WORK."
- Lane 16's "intended-temporary" resolution is now contradicted by the owner's action. The owner did not intend the block to lapse into GRANT; they re-imposed it.
- B6 accurately cites lane 16, but the synthesis is now stale. The "resolved" label is wrong.

## WEAKENED

### W1. Entirely derivative, no independent verification
- "This lane performed no new canonical-tree reads. Everything below is as-last-observed from the cited lane reports."
- B6 adds synthesis and gap-identification value, but zero new evidence. Every verdict inherits the replay-pending status of 10+ other lanes. A falsification of any cited lane cascades into B6.
- The lane is honest about this, but it means B6 cannot serve as independent confirmation of anything.

### W2. The 14-question structure forces verdicts where evidence is thin
- Questions like "What is PING currently doing and why?" (section 14) are answered with program narrative, not canonical state. The verdict format ("Verdict: ...") implies a measurement where none exists.
- Section 14 describes the program itself (Wave A/B lanes, T+0/T+24). This is useful context but not "business intelligence" from canonical state.

### W3. Vocabulary hazards noted but not resolved
- Section 4 notes "three epistemic vocabularies have no canonical mapping" and Section 10 lists unknowns. B6 identifies the gaps but, as a synthesis lane, cannot close them. The report is a catalog of gaps, not a step toward closing them.

## STRONGEST SURVIVING
- The honest UNKNOWNs: B6 does not manufacture business answers where canonical state is empty. Sections 1, 6, 8 correctly identify that business identity, customer questions, and business outcomes are absent from canonical state.
- The Jev falsification is accurately reported with both the original claim and lane 16's correction.
- The "four kept-distinct dimensions" (executor success, action verified, effect observed, business outcome observed) is a useful analytical framework that prevents conflation.

## WEAKEST LINK
- Derivative synthesis without reconciliation. B6 cites lane 12's 409 HOLD in three sections without noting B3/B4's falsification. It cites lane 16's "intended-temporary" for codex without noting the owner's re-block. As a synthesis lane, B6's value depends on reconciling conflicting lane findings; it does not do this.

## Verdict lines
- STRONGEST SURVIVING: Honest UNKNOWNs for business identity, customer questions, and business outcomes; accurate reporting of the Jev measurement falsification; the four-dimensions framework prevents conflation of executor success with business outcomes.
- WEAKEST LINK: Synthesis without reconciliation. Three sections assert 409 HOLD (lane 12) without B3/B4's correction that it does not exist at HEAD; the codex "intended-temporary" (lane 16) is contradicted by the owner's 2026-09-28 re-block.
- FALSIFIED: The 409 HOLD claims in sections 7, 10, 13 as descriptions of HEAD behavior. B3 and B4 verified zero occurrences in the committed tree. The "resolved as intended-temporary" for codex (section 3) is contradicted by the owner's re-block.
- WEAKENED: Entirely derivative (no new reads); the 14-question format forces verdicts on thin evidence; identifies vocabulary gaps without closing them.
