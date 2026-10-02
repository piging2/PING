# SHADOW SPIKE / E1 HOLD STATUS — 2026-09-28

## Status: HELD per 2026-09-28 hold notice
All control-vs-treatment measurement waves are HELD until the convergence
coordinator signals the Ask retrieval path and result-verification path seams
are stable. No shadow-spike decision calls and no E1/E2 calls have been made
(the only live Jev calls this session: 1 smoke test + 10 API baseline probes,
all neutral content, none touching PING decision paths).

## Prepared and validated (read-only work, complete)

### 1. Corpora validated
- `~/workspace/jev-eval/completion-corpus` — 16 items, labels ACCEPT_PROOF 8 /
  REJECT_PROOF 5 / VERIFY_MORE 3. D-08 eval set. Parses clean.
- `~/workspace/jev-eval/backlog-dataset` — 53 items, MISSING_TEST 22 /
  ALREADY_IMPLEMENTED 13 / PROVEN_DEFECT 8 / FUTURE 7 / SUPERSEDED 2 /
  DUPLICATE 1. D-45 eval set. Parses clean. Caveat stands: no priority
  labels; Jev-vs-_prioritize head-to-head not measurable locally
  (_prioritize not found in local trees; Pig-side only).
- `~/workspace/jev-eval/replay-dataset` — 51 items: routing 11,
  classification 5, triage 14, other 21 (grill-20 locked answers).
  47 outcome_known=true, 4 false (excluded from verified-label scoring).
- `~/workspace/fyd-autonomy/escalation-log.jsonl` — 30 records, verdicts
  escalate 20 / decide 9 / escalate_resolved_by_owner 1. D-28 eval set.
  Note: lines carry trailing data after the JSON object; parse with
  json.JSONDecoder().raw_decode.
- `e1-corpus.json` (this dir) — 25 repository questions over openhands-sdk
  v1.49.5 (72 indexed files), every answer_files entry verified by reading
  the repo BEFORE any retrieval run. Questions frozen pre-measurement.

### 2. Deterministic lexical baseline (control arm) — implemented, self-checked
- `lexical_baseline.py`: path tokens 3x, content-head tokens 1x, binary
  per-token presence. No Jev, no network.
- Self-check on the frozen E1 corpus: top1 19/25 (0.760), top3 23/25 (0.920),
  top10 24/25 (0.960). This is a STRONG control; Jev must beat it to win.

### 3. Jev courier — implemented, smoke-tested
- `courier.py`: direct TypeSafe API, model pinned jev-1.13.0, cost computed
  locally at $0.042/MTok input (output free), 429/529 fail closed with run
  stop, module spend stop at $4.50, per-call timeout 10s, attestation via
  jev_contract before consuming.
- Smoke test 2026-09-28: 200, model field jev-1.13.0, correct typed answer.

### 4. Jev API cost/latency baseline — measured (neutral probes, allowed)
- `api-baseline-2026-09-28.jsonl`: 10/10 ok. Latency min 297 / p50 418 /
  max 565 / mean 410 ms (inside vendor 70-500ms band; above the 1s budget
  is not a concern, below it is).
- Mean input tokens 316, mean cost $0.0000133/call — cheaper than the
  $0.00003 planning estimate. Output tokens free. All served by jev-1.13.0.

### 5. Per-record schema — finalized
decision_id, decision_type (D-01..D-72), contract_version
(systemone-v1/jev-1.13.0), input_digest (sha256 state+question),
evidence_digest (sha256 corpus item), current_result, current_reason,
jev_result, jev_distribution (full probabilities), jev_latency_ms,
jev_cost_usd, model (response model field), verified_label, label_source,
eventual_outcome, outcome_source. Implemented in courier.ask return shape;
record assembly happens in the (held) runners.

## Held measurement waves (ready to run on release)
- Spike: D-08 (16 Choice), D-29 (21 Noul, labels experimenter-derived from
  locked answers), D-28 (30 Choice), D-45 (53 Score, distribution only),
  D-51 (51 Choice distractor-relevance), D-02 (5 Choice behavioral),
  D-58 (2 Choice smoke). D-26b/D-09b/D-57: no usable local corpus, no calls
  planned; reported as gaps.
- E1: control = lexical_baseline top-10; treatment = lexical top-25 shortlist
  -> one batched Jev Choice -> reranked top-10 (plus top-5 cut for the
  reduced-context metric). Downstream agent proxied as: known-good file in
  top-3 of delivered context (stated plainly in the report). Pre-registered
  stop: treatment task-success-per-token strictly better than control, else
  Jev LOSES for this lane and we pivot to E2 with no threshold tuning.
- Estimated total: ~203 Jev calls, ~$0.003. Well within budget.

## Gaps found during preparation (for the record)
- D-57 (task tier): no broker task descriptions with coordinator tier labels
  found locally. D-58 (failure classification): only 2-line stub fixtures.
- D-26b (chain completeness): 20-assess.json files are 4-key dicts, not
  auditable chains; no verified-label corpus. D-09b (brief gate): no
  historical taskBriefs with outcomes found locally.
- replay-dataset: 4 items outcome_known=false, excluded from scoring.
