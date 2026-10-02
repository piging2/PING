# Lane B10 falsifier attack notes: Lane B2 (processor tournament)

## Scope
Report: ~/workspace/ping-24h/lanes/laneB2-processor-tournament/report.md (127 lines).
Raw: tournament-records-2026-09-28.json (80 cases, 81 jev_samples + 6 fair = 87 total), raw/ intermediates, 8 tool scripts.

## Recomputation results (independent, from the JSON)

### Counts: CONFIRMED
- n_cases: 80 claimed, 80 actual.
- Cases by contract: authorize 13, grantsForViewer 6, planActions 8, classifyReview 10, reconcileGate 8, engagementGuard 10, grill20 25. All match report.
- Jev samples: 41 main + 35 stability + 5 evidence_sensitivity + 6 fair (evidence_sensitivity) = 87 total. Report's "41 + 35 + 11" is correct when fair re-run samples are included in the 11.

### Agreement/Brier at 0.5: CONFIRMED (all match to 4 decimals except trivial rounding)
- authorize: 7/8, Brier 0.1162, FP 0 FN 1. EXACT.
- grantsForViewer: 4/4, Brier 0.0948. EXACT.
- planActions: 4/5, Brier 0.1173 (recomputed 0.11726), FP 1 (PA-01 p=0.60). EXACT.
- classifyReview: 6/6, Brier 0.0423. EXACT.
- reconcileGate: 4/6, Brier 0.2477, FP 1 FN 1. EXACT.
- engagementGuard main: 1/6, Brier 0.4313 (report 0.4312, 0.0001 rounding). FP 5.
- engagementGuard fair: 6/6, Brier 0.00055 (report 0.0006). CONFIRMED.
- grill20: 6/6, Brier 0.0045. EXACT.

### Stability: CONFIRMED
- AW-01: n=10, mean 0.366, range 0.03. EXACT.
- CR-01: range 0.01. RG-03: range 0.07. GV-01: range 0.02. EG-06: range 0.02. All match.

### Framing finding (AW-01 0.36 vs lane-11 S1 0.95): numbers CONFIRMED, interpretation WEAKENED
- AW-01 main p=0.36 confirmed in JSON. Stability mean 0.366 confirmed.
- The lane-11 S1 p=0.95 is cited from lane-11's report, not re-verified here. The 0.59 gap is real between the two reported numbers, but the causal attribution to "framing" (question wording) is an inference: the two runs also differ in evidence envelope construction, Jev version (unpinned), and time. Framing sensitivity is plausible but not isolated by a controlled A/B. The lane admits this ("would be reframed as noise if a wording-controlled A/B shows no systematic shift").

## FALSIFIED / material problems

### F1. Baseline provenance: mirrors DIFFER from canonical tree (lane's own falsifier bait confirmed)
- The lane stated "Mirror-vs-HEAD equivalence was NOT verified" and named it the load-bearing claim.
- Verified: ~/workspace/orca-adapter/vendor/external_agent_adapter.js differs from /home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js.
- The difference is MATERIAL: the codex agent profile's blockedExternal. Mirror (stale): blockedUntil '2026-09-17T06:01:00Z' (expired). Canonical (2026-09-28 per owner): RE-BLOCKED, no timestamp, "expiry is ELIGIBLE FOR RE-EVALUATION, not AUTHORIZED FOR WORK. Re-enable only by deliberate decision, never by timestamp."
- Impact: B2's AW-07 case ("codex, expired block", Jev p=0.58) and the evidence-sensitivity claim "blocked->expired flip moves Jev 0.06 -> 0.54 and baseline DENY -> GRANT" were computed against the STALE mirror. Against the current canonical tree, codex is blocked with no expiry, so the baseline for AW-07 would be DENY, not GRANT. The reported DENY->GRANT flip does not reflect current canonical behavior.
- The function also moved from line 185 (mirror) to 186 (canonical), confirming the files diverged.

### F2. B1 cross-contamination (corrected)
- B2's grill20 section says "the 25 logged escalation records". This is correct as JSON-object count (line 19 holds 2 objects). B2 correctly notes the line-19 concatenation. No error here; B2's 25 is right.

## WEAKENED

### W1. Threshold theater (lane acknowledges, but the numbers still invite misreading)
- The lane states the 0.5 threshold "does decisive work" and that agreement claims without it are meaningless. Good. But the headline "agreement 7/8" etc. will be quoted without the threshold. GV-03 (0.34), GV-04 (0.41), CR-04 (0.42), RG-04 (0.39) all sit near 0.5. The lane is honest here; the weakness is in how the numbers will travel, not the report itself.

### W2. "Calibration NOT established" is stated but the Brier scores invite calibration readings
- Brier scores computed against deterministic baselines (not ground truth) are reported as "Brier 0.1162" etc. The lane explicitly says "calibration is NOT established anywhere". This is honest, but the Brier numbers are still presented prominently and will be misread as calibration. The lane could have omitted them or labeled them "baseline-deviation" scores.

### W3. Jev version unpinned
- "model_version not published; any provider-side change silently invalidates them." Correctly flagged as UNKNOWN. The numbers are snapshots, not reproducible.

### W4. muse-shadow is not independent
- Correctly labeled "NOT independent evidence". The 13/13, 6/6, 7/8, 9/10, 8/8, 10/10, 25/25 agreements are the operator agreeing with their own baselines. Honest but adds no information.

### W5. Evidence-sensitivity n is tiny
- AW-08 (0.06) vs AW-07 (0.54) is a single-pair comparison. The "moves correctly" claim rests on n=1 per direction. Specimen, not rate. (Compounds with F1: the AW-07 baseline is stale.)

### W6. Cost models are pre-registered judgments, not measured
- FP HIGH / FN LOW etc. are the lane's own cost assignments. Reasonable but not empirical.

## STRONGEST SURVIVING
- The arithmetic: all agreement percentages, Brier scores, stability ranges, and sample counts recompute exactly from the JSON. The lane's computation pipeline is sound.
- The engagementGuard evidence-asymmetry finding (1/6 -> 6/6 with the decisive fact added) is the most substantive result and it recomputes cleanly. It demonstrates that shadow-judge quality is envelope-dominated, which is a real methodological contribution.
- The lane's honesty about its own weakest link (mirror equivalence) and the explicit falsification criteria.

## WEAKEST LINK
- Baseline provenance. The mirrors differ materially from the canonical tree (codex re-block), invalidating at least the AW-07 evidence-sensitivity baseline. The lane flagged this as the load-bearing claim; it does not hold.

## Verdict lines
- STRONGEST SURVIVING: All 80 cases, 87 Jev samples, agreement/Brier/stability arithmetic recompute exactly; the engagementGuard 1/6 -> 6/6 evidence-asymmetry finding is methodologically substantive.
- WEAKEST LINK: Baseline provenance. The local orca-adapter mirror is stale; the canonical tree re-blocked codex on 2026-09-28, so the AW-07 "expired block" baseline (DENY->GRANT flip) does not reflect current canonical behavior.
- FALSIFIED: The AW-07/AW-08 evidence-sensitivity baseline claim as a statement about current canonical behavior. The mirror's expired blockedUntil ('2026-09-17T06:01:00Z') was superseded by the owner's 2026-09-28 re-block with no expiry.
- WEAKENED: The AW-01 framing-gap causal attribution (0.36 vs 0.95) is not isolated by a controlled A/B; Jev version, envelope, and time also differ. Threshold-adjacent probabilities (GV-03 0.34, GV-04 0.41, CR-04 0.42, RG-04 0.39) make agreement percentages fragile to the lane-imposed 0.5 line.
