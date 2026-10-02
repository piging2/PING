# Jev Replay Dataset (Lane J8)

Staged historical PING decisions with known final dispositions for future Jev
replay evaluation. **Dataset staging only.** No live Jev calls were made; no
replay was executed.

`items.jsonl`: one JSON object per line with the evaluation field list:
`item_id, decision_family, decision_schema_version, question, state_summary,
state_digest, requested_model, actual_served_model, typed_answer, probabilities,
confidence, latency_ms, token_count, cost_usd, existing_decision, final_decision,
eventual_outcome, outcome_known, correlation_id, causation_id, verified_by,
verified_at, source_ref` (+ `notes` where needed).

Privacy: every item carries only a `state_summary` (sanitized structural
description) and a `state_digest` (sha256 of that summary). No raw private
context, no PII, no secrets, no full payloads. Rebuilding the state package for
replay must re-derive inputs from the cited `source_ref` under the
`~/workspace/jev-eval/privacy-envelope.md` data-class rules.

## Counts per family

| Family | Count | Source |
|---|---|---|
| routing | 11 | Lane-F WorkerRuntime dispatch harness (9, final all-green run 2026-09-26T13:45:08Z) + ORCA A5 audit runs (2, 2026-09-18) |
| classification | 5 | RuleClaimDecisionProvider golden-rule cases R0-R4 (rule-claim-v0, policy rule-claim-v0/2026-09-22) |
| completion | 0 (sibling) | J6 `~/workspace/jev-eval/completion-corpus/` (16 items) |
| triage | 14 | ORCA HOLD/UNKNOWN register H1-H8 (8) + identity_3 quarantine (1) + A5 honest-failure (1) + wave-1 lost-result-text triage (4) |
| other | 21 | Grill-20 locked escalation answers (20) + identity_5-10 CONTAIN decision (1) |
| **Total (this lane)** | **51** | |
| **With siblings** | **120** | 51 (J8) + 53 J5 backlog-classification + 16 J6 completion-review |

Backlog-classification is already covered by the J5 sibling
`~/workspace/jev-eval/backlog-dataset/` (53 labeled items, PROVEN_DEFECT /
MISSING_TEST / ALREADY_IMPLEMENTED / DUPLICATE / SUPERSEDED / FUTURE /
UNKNOWN). Completion-review is covered by the J6 sibling
`~/workspace/jev-eval/completion-corpus/` (16 items, ACCEPT_PROOF /
VERIFY_MORE / REJECT_PROOF). **Neither is duplicated here; treat all three
datasets as one evaluation pool** (51 + 53 + 16 = 120 labeled decisions).

## How final dispositions were verified

- **routing (lane-F):** each item is a real WorkerRuntime dispatch execution
  against the fail-closed patch. The existing decision is the observed
  dispatch receipt (`matched`, `worker`, `routeExists`, result). The final
  disposition is the harness check outcome, and the eventual outcome is the
  final all-green run verdict (every case PASS with 0 failed checks in run
  `run-2026-09-26T1344-0309`).
- **routing (ORCA A5):** independently audited by a separate auditor identity
  (direct audit of commit 992e12725, 2026-09-18): causation chain verified,
  live production state re-queried and matched exactly. Verdict:
  A5 SUBSTANTIALLY PROVEN.
- **classification (rule goldens):** the rule provider is deterministic code;
  each item's final disposition is its specified output, verified by
  `test_jev_shadow.js`. Replay must reproduce the rule output exactly; these
  check determinism and Jev-vs-rule agreement, not human calibration.
- **triage (H1-H8):** coordinator triage dispositions recorded in the
  ORCA HOLD/UNKNOWN register, each with evidence, disposition, reason, and
  reopen trigger. Eventual outcomes are the recorded later states (e.g., H7
  UNKNOWN -> RESOLVED/CONTAINED by the 2026-09-25 identity/quota decision;
  H8 UNKNOWN -> RESOLVED by the Q-E lane inventory).
- **triage (wave-1):** coordinator triage of broker-recorded completions with
  lost result text (2026-09-26): NEEDS_FALSIFIER. Items where the outcome is
  still unknown carry `outcome_known: false` explicitly (j8-triage-11/13/14,
  j8-triage-02) rather than being padded.
- **other (grill-20):** Nolan's locked escalation answers (2026-09-24 ~19:05
  MDT), installed as the standing escalation classifier.
- **other (CONTAIN):** Nolan's identity/quota decision (2026-09-25), verified
  by the broker fail-closed commit (da64baa, 62/62 tests) and task_count=0 on
  identities 5-10.

No label is invented: every disposition traces to a harness verdict, an
independent audit, a falsifier/coordinator replay, or a Nolan decision.
Every row carries `verified_by`, `verified_at`, and `source_ref`.

## Known biases and caveats

1. **No live-model fields populated.** `requested_model`, `actual_served_model`,
   `latency_ms`, `token_count`, `cost_usd` are null everywhere: these decisions
   were made by rules, harnesses, coordinators, or Nolan, not by Jev. Do not
   compute cost/latency calibration from this set.
2. **"Other" dominates (21/51).** The grill-20 items are human escalation
   decisions, not Jev-shape typed decisions. They calibrate autonomy
   thresholds, not Noul/Choice/Score accuracy. Weight by family, not by raw
   count, or drop "other" for type-accuracy calibration.
3. **Classification is rule-golden only (5 items).** These check determinism,
   not judgment. Real human-labeled classification lives in the J5 sibling
   (53 items); use that pool for the classification family.
4. **Triage has no CLEAN_PASS-majority.** The triage family skews toward
   HOLD/UNKNOWN/NEEDS_FALSIFIER because it was mined from incident registers.
   J6's completion corpus adds ACCEPT_PROOF coverage; future shadow triage
   data must supply ordinary CLEAN_PASS examples.
5. **Routing executor selection was uniform.** All real broker dispatches went
   to HEADLESS_AGENT, so executor *selection* (DETERMINISTIC_WORKER vs
   HEADLESS_AGENT vs DEEP_REASONER vs HUMAN_REVIEW) has no multi-class
   historical labels. The routing items here cover dispatch *receipt
   classification* (MATCHED_SUCCESS / MATCHED_FAILURE / NO_MATCH / UNKNOWN),
   the closest available labeled data.
6. **Four items have unknown eventual outcomes** (flagged `outcome_known:
   false`). They are kept for the abstain/UNKNOWN calibration path, not for
   accuracy scoring.
7. **ping_events was not reachable from this lane** (Pig SSH unavailable from
   the cloud VM; JEV_DECISION_EVALUATED records exist only in the jev-stage
   prototype, never emitted live). Items that would live in the event plane
   will need correlation/causation backfill once the event store is reachable.

## What a future replay run needs

- **Provider seam:** the `JevDecisionAdapter` (typed questions, no authority)
  from the Jev program; for the rule-golden items, run the rule provider
  itself to check replay determinism.
- **Key:** none for this dataset (no provider fields populated); a Jev API
  credential is required only when running live Jev against the staged
  questions, under the privacy-envelope data-class rules (secrets never in
  evidence, content budgets enforced).
- **Calibration method:** bucket predictions by confidence per decision family;
  measure accuracy, coverage, UNKNOWN/abstain rate, calibration error,
  false-positive/false-negative cost, and disagreement vs the labeled
  `final_decision`. Report per family, never pooled across families. Use the
  J5/J6 siblings for classification and completion; this lane's triage and
  routing items for those families; exclude "other" from type-accuracy
  calibration (use it for autonomy-threshold analysis only).
- **Replay inputs:** rebuild each state package from `state_summary` +
  `source_ref` under the privacy envelope; `state_digest` is the equality
  check that the rebuilt package matches what was staged.

## Gap vs the 50-100 target

This lane stages **51** qualifying decisions (within the 50-100 band) with
zero padding. The binding constraint was not count but label integrity: only
decisions whose final disposition traces to a harness verdict, independent
audit, coordinator replay, or Nolan decision were admitted. The pool reaches
**120 labeled decisions** together with the J5 (53) and J6 (16) siblings.
