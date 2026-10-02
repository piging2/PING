# Lane B2 report: processor tournament execution (Phase 4)

Session: c372886e-b34c-4054-a2b6-988a9278ed9d. T+0 2026-09-28 14:26 MDT; run window ~14:40 to 15:10 MDT (about T+0.25 to T+0.75).

This report is a HYPOTHESIS until replayed from a clean checkout. What would falsify it is listed at the end. No em dashes used.

## Absolute rules honored

ZERO authority, ZERO execution effect, ZERO policy effect throughout. Jev never granted, authorized, or decided anything canonical and stays SHADOW. No gateway, scheduler mission, :3100, Hermes, FYD, or Happy Place contact. Read-only against production: the only writes were fresh os.tmpdir() dirs for reconcile-gate replay and files under this lane directory. No pushes, no new credentials (reused the existing connected custom.typesafe credential via the skill's documented api_call flow), no new truth stores, no canonical writes. The 3 jev-shadow scheduler missions were not touched.

## What was executed

The lane-11 tournament design (10 contracts, replay methodology) was executed on 7 of the 10 contracts, 80 replay cases total, each case = the SAME semantic inputs and evidence the baseline uses, with sha256 input/evidence digests recorded per sample.

Processors:
- (a) deterministic baseline: the incumbent function per contract, executed read-only. ALWAYS present.
- (b) Jev shadow: typesafe/jev-latest via POST /v1/systemone, noul-type probability questions, 87 bounded calls total (41 main + 35 stability + 11 evidence-sensitivity). Zero side effects; outputs never entered any canonical record.
- (c) local model: NOT AVAILABLE (no ollama binary in this sandbox). Recorded UNKNOWN, not collapsed.
- (d) muse-shadow: my own per-case judgments, pre-registered BEFORE baseline execution. Same model family as the tournament operator, so NOT independent evidence; reported separately and labeled as such.
- codex-shadow: NOT USED (invocation would cross an external-effect surface). UNKNOWN.

Baseline provenance caveat (material): the Pig WSL route hung silently this run (two attempts, killed per the standing hang-recovery rule; transport state UNKNOWN). The canonical-tree functions were therefore executed on local mirrors: ~/workspace/orca-adapter (vendor/external_agent_adapter.js, adapter.js), ~/workspace/outreach/engagement-guard.py (live index + ledger, read-only), ~/workspace/fyd-autonomy/escalation-log.jsonl, and the fyd product-lane TS mirror for grants.ts / action-planner.ts / classifier.ts. Mirror-vs-HEAD equivalence was NOT verified this run. Every per-contract table below inherits this caveat.

Contracts executed (7 of the lane-11 pool of 10). Not executed this run, with reasons: callerScope and mc-dispatch-identity (implementation files absent locally; Pig unreachable); EstimatorFlags (implementation located at src/lib/interview-engine-v3.ts but final-label source is expert review, unavailable; deferred, not faked).

Task candidate-name mapping: executor routing -> mc.authorize_work_order/v1 + reconcileGate/v1; retry vs investigate + reconciliation triage -> reconcileGate/v1; component classification -> classifyReview/v1 + grantsForViewer/v1 + planActions/v1; duplicate/legacy/dormant -> engagementGuard/v1; escalation recommendation -> grill20Composition/v1; completion review, evidence sufficiency, retrieval sufficiency, effect classification -> not in the executed set (no executable baseline with a final-label source this run).

Raw records: [tournament-records-2026-09-28.json](tournament-records-2026-09-28.json) (80 cases, 87 Jev samples, digests, metrics, cost models, unknowns).

## Per-contract measurements

Form per the task: provider/model/version X on decision-contract Y/version Z under evidence envelope E produced these measured results. Agreement percentages are computed at a lane-imposed 0.5 threshold on Jev's point probability; the threshold does decisive work on near-boundary cases and is NOT a contract property (lane-16's warning stands). Brier scores use baseline-as-label; baselines are deterministic incumbents, not independent ground truth, so "calibration" is NOT established anywhere below. Never read these as "Jev is N% reliable".

### 1. typesafe/jev-latest on mc.authorize_work_order/v1 under E={AGENT_PROFILES facts + request fields, 8 ordered fail-closed checks}

- Baseline: 13/13 judged, 0 abstentions. Latency p50 0.012 ms, p95 0.233 ms. Cost ~0.
- Jev main (n=8): agreement 7/8 at 0.5; Brier 0.1162; FP 0, FN 1 (AW-01, p_grant=0.36 on the plain GRANT case). Latency p50 488 ms, p95 804 ms. Cost UNKNOWN.
- Deny-case probabilities were not sharp: AW-02 0.27, AW-05 0.35, AW-06 0.36 (opencode string-block again the least-certain deny, matching lane-16's S6 observation). AW-07 (codex, expired block) 0.58 vs AW-08 (synthetic active block) 0.06.
- FRAMING FINDING: AW-01 is semantically identical to lane-11's S1 (hermes+text.summarize GRANT), which scored p=0.95. This run's question wording ("under the fail-closed authorization checks") scored p=0.36, stable across 10 reps (mean 0.366, range 0.03). Same evidence, different framing, 0.59 apart. Shadow outputs are framing-sensitive, not just evidence-sensitive.
- Evidence sensitivity (moves correctly): blocked->expired flip moves Jev 0.06 -> 0.54 and baseline DENY -> GRANT.
- Stability: AW-01 10x, range 0.03 (tight; variance is across cases, not reps).
- muse-shadow: 13/13 agreement (not independent evidence).
- Cost model (pre-registered): FP (false GRANT) HIGH, FN (false DENY) LOW-MODERATE. The single FN sits in the cheap direction.

### 2. typesafe/jev-latest on grantsForViewer/v1 under E={viewerId, controllerId, isSite; pure grant rule}

- Baseline: 6/6 judged. Latency p50 0.003 ms, p95 0.085 ms.
- Jev main (n=4): agreement 4/4; Brier 0.0948; FP 0, FN 0. Latency p50 471 ms, p95 503 ms.
- Near-boundary negatives: GV-03 (anonymous) 0.34, GV-04 (owner, non-site) 0.41. A 0.4 threshold would flip both to false positives; the 0.5 line is doing work.
- Evidence sensitivity: isSite true->false moves Jev 0.87 -> 0.34; baseline drops the bundle.
- Stability: GV-01 5x, range 0.02. muse-shadow 6/6.
- Cost model: FP LOW, FN LOW.

### 3. typesafe/jev-latest on planActions/v1 under E={PlannerInput; capability-aware planning rules}

- Baseline: 8/8 judged. Latency p50 0.018 ms, p95 0.309 ms.
- Jev main (n=5, one discriminative action per case): agreement 4/5; Brier 0.1173; FP 1 (PA-01, p=0.60 that 'like' is available to an anonymous viewer; baseline: no like/reply for anonymous), FN 0. Latency p50 460 ms, p95 550 ms.
- muse-shadow: 7/8. The miss was mine, pre-registered: PA-06, I omitted propose_update for a viewer who is also the controller of an identity target; the baseline correctly includes it. Honest self-disagreement, kept on record.
- Cost model: FP LOW, FN LOW.

### 4. typesafe/jev-latest on classifyReview/v1 under E={review text + rating; VADER lexicon + profanity/spam/caps/question heuristics}

- Baseline: 10/10 judged. Latency p50 0.053 ms, p95 2.648 ms.
- Jev main (n=6): agreement 6/6; Brier 0.0423; FP 0, FN 0. Latency p50 399 ms, p95 525 ms.
- CR-04 (all-caps "GREAT WORK!!!") scored p=0.42, near the threshold on a review-bucket case.
- Baseline/human disagreement of note: CR-08 (sarcasm "Oh wonderful, another leak. Just fantastic.") baseline says positive at confidence 1.00; my pre-registered judgment said review. The lexicon cannot see sarcasm. Final-label source (human moderation decisions) NOT FOUND locally, so accuracy vs human = UNKNOWN; this disagreement is flagged, not resolved.
- Stability: CR-01 10x, range 0.01. muse-shadow 9/10.
- Cost model: FP (false positive bucket) MODERATE-HIGH, FN LOW.

### 5. typesafe/jev-latest on reconcileGate/v1 under E={fresh tmp evidence dirs; seeded idempotency-index records; typed refusal vocabulary}

- Baseline: 8/8 judged, covering fresh-intent ALLOW, duplicate_attempt REFUSE, reconciliation_required REFUSE, valid-reconciliation ALLOW, reconciliation_invalid REFUSE, corrupt-index REFUSE, completed-latest ALLOW, same-attempt-with-reconciliation REFUSE. Latency p50 1.731 ms, p95 4.98 ms.
- Jev main (n=6): agreement 4/6; Brier 0.2477; FP 1, FN 1. Latency p50 395 ms, p95 579 ms.
- The FP is the expensive direction: RG-02 (duplicate attempt) p_allow=0.79, a HIGH-cost-class error (duplicate dispatch of a possibly-effectful intent). The FN: RG-04 (valid reconciliation) p_allow=0.39. Jev is simultaneously too permissive on duplicates and too strict on valid reconciliations at n=6.
- Evidence sensitivity: uncertain->completed latest moves Jev 0.41 -> 0.79; baseline REFUSE -> ALLOW.
- Stability: RG-03 5x, range 0.07 (widest observed, still tight). muse-shadow 8/8.
- Cost model: FP (false ALLOW) HIGH, FN LOW-MODERATE.

### 6. typesafe/jev-latest on engagementGuard/v1 under E={durable history index (188 fb names, 2308 fb post ids, 151 ig handles, 88 x handles) + terminal-aware intent-ledger merge}

- Baseline: 9 judged, 1 typed abstention (EG-09, UNKNOWN-UNCHECKABLE: empty identity; honest, kept). Latency p50 0.074 ms, p95 4.615 ms.
- Jev main (n=6): agreement 1/6; Brier 0.4312; FP 5 (p_eligible 0.65-0.75 on ALREADY_ENGAGED cases), FN 0.
- ROOT CAUSE, not a judgment failure: the main-run envelope carried index counts and digests but NOT per-case ledger membership. The deterministic guard's decision IS the membership fact. Evidence asymmetry, measured honestly.
- Fair re-run with the decisive per-case fact disclosed ("this handle/post appears in the durable history" vs "no record"): 6/6 agreement, Brier 0.0006 (p 0.01-0.02 on engaged, 0.96 on fresh). Jev follows the rule exactly once it can see the evidence.
- Baseline evidence sensitivity: removing the single ledger post-id fact from the in-memory index flips EG-05 ALREADY_ENGAGED -> ELIGIBLE (on-disk index untouched). The guard moves when evidence moves, as designed (this is the pass-118 fix working).
- Stability: EG-06 5x, range 0.02. muse-shadow 10/10 (eligible|drop|abstain framing).
- Cost model: FP (false ELIGIBLE) MODERATE, FN LOW. The 5 main-run FPs sit in the costlier direction, entirely explained by the envelope gap.

### 7. typesafe/jev-latest on grill20Composition/v1 under E={the 25 logged escalation records; SI-03 template composition rule}

- Baseline (composition replay): 25/25 records recomposed. 24/25 exact-match the recorded verdict; GR-06 direction-matches (escalate family) but the record uses an extended vocabulary verdict 'escalate_resolved_by_owner' outside decide|escalate, with checks=null.
- Schema anomalies found in the log (read-only observation, not a repair): GR-02 failed_checks items are objects not strings; GR-06 checks=null + extended verdict vocabulary; line 19 holds 2 concatenated JSON objects (malformed JSONL).
- Jev main (n=6): agreement 6/6 vs the composed baseline; Brier 0.0045; FP 0, FN 0. Latency p50 396 ms, p95 516 ms.
- Note GR-06: Jev p_decide=0.08. At 0.5 the threshold says escalate-family, matching the log's escalate direction; the exact-label mismatch is a vocabulary extension, not a composition failure.
- muse-shadow 25/25 (composition re-derivation, not independent).
- Cost model: FP (false decide) HIGH, FN LOW-MODERATE.

## Cross-contract findings

1. Evidence envelopes decide shadow quality more than the model does. EG: 1/6 -> 6/6 with only the decisive fact added. A shadow judge without the decisive evidence element is not a judge of the contract; it is a judge of the envelope.
2. Framing sensitivity is real and measured: AW-01/S1, same semantic case and evidence, scored 0.95 under lane-11's wording and 0.36 under this run's wording, stable within each framing (range 0.03). Any future shadow protocol must pin the question wording per contract, or framing variance will swamp evidence variance.
3. Threshold dependence is load-bearing: GV-03 0.34, GV-04 0.41, CR-04 0.42, RG-04 0.39 all sit near 0.5. Agreement claims without the threshold stated are meaningless; this report states it everywhere.
4. The highest-cost error observed was a Jev false ALLOW on a duplicate reconcile-gate attempt (RG-02, p=0.79). At n=6 this is a specimen, not a rate, but it is exactly the error class the gate exists to prevent.
5. Stability within framing is tight everywhere (ranges 0.01-0.07 across 35 repeat calls). Instability lives between cases and framings, not between reps.
6. Latency: deterministic baselines 0.003-5 ms; Jev 307-804 ms per call (p50 ~400-490 ms). Cost: baseline ~0; Jev UNKNOWN (API does not report).
7. Abstention: only the engagement guard abstained (1 typed, honest). Jev never abstained; the API returns a point probability on every 200, no abstention channel observed.
8. The escalation log has live schema drift (object-form failed_checks, null checks, extended verdict vocabulary, one malformed JSONL line). The composition rule still recomposes 24/25 exactly.

## What would falsify this report

- Baseline provenance: if the local mirrors differ semantically from the Pig canonical tree at pinned HEAD 0264d517 (or the orca-adapter HEAD lane-11 read), the baseline tables change. A replay from a clean checkout of the canonical tree and orca-adapter, re-running baselines.cjs against the recorded case inputs, is the falsification run.
- Jev numbers are version-unpinned (model_version not published); any provider-side change silently invalidates them.
- If the escalation-log line-19 concatenation is repaired (2 records instead of 1 line), GR n becomes 26.
- The AW-01 framing gap (0.36 vs 0.95) would be reframed as noise if a wording-controlled A/B shows no systematic shift; as it stands the 10x stability runs say otherwise.
- Any agreement percentage above is void if quoted without its 0.5 threshold.

## UNKNOWNs and unexecuted work (not collapsed)

Local model column UNKNOWN (no ollama). Codex shadow UNKNOWN (not attempted). Jev cost, version, and confidence-field population UNKNOWN (API does not report). Pig WSL transport UNKNOWN this run. classifyReview accuracy vs human labels UNKNOWN (labels not found). callerScope, mc-dispatch-identity, EstimatorFlags not executed (baseline unreachable or label source absent). Calibration NOT established for any processor on any contract; Jev stays SHADOW; no advisory promotion is supported by these numbers, and none is proposed.

## Artifacts

- [tournament-records-2026-09-28.json](tournament-records-2026-09-28.json): 80 cases with baselines, digests, muse-shadow; 87 Jev samples; metrics; pre-registered cost models; unknowns.
- raw/cases.json, raw/cases-eg-gr.json, raw/cases-with-baselines.json, raw/jev-samples.json, raw/jev-eg-fair.json, raw/metrics.json: staged inputs and intermediates.
- build_cases.py, build_cases2.py, baselines.cjs, run_baselines.py, jev_shadow.py, jev_eg_fair.py, metrics.py, assemble_records.py: the replay tooling, deterministic and re-runnable.

Falsifier bait: the single most load-bearing claim is that the local mirrors match the canonical tree. Everything else is arithmetic on recorded outputs.
