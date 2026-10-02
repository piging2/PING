# E1 BASELINE FREEZE - Immutable Benchmark Artifact

Date frozen: 2026-09-28 MDT (prelaunch). Status: FROZEN. Do not tune the corpus, prompts, candidate generation, or thresholds while waiting; otherwise the experiment is contaminated before the tournament starts.

## The frozen benchmark

- Experiment: E1 - D-51 Ask evidence reranking (shadow mode).
- Deterministic control: lexical_baseline.py (path tokens 3x, content-head tokens 1x, binary per-token presence; no Jev, no network).
- Frozen corpus: e1-corpus.json - 25 repository questions over openhands-sdk v1.49.5 (72 indexed files); every answer_files entry verified by reading the repo BEFORE any retrieval run; questions frozen pre-measurement.
- Baseline value: top-1 19/25 = **0.760**; top-3 23/25 = 0.920; top-10 24/25 = 0.960.
- Corpus SHA256: f59eaf79078041b869a1825a18631a3a0900ce64c6e4e1dde64dc7039d2765ec
- Baseline script SHA256: dadf1d818f7f81806fcd4fa1c8765e5bf09fe5164825b9b7f9cb0190d5e290e3 (lexical_baseline.py)
- Courier SHA256: 972ccd8c1280f65833dab7a5790079763259290a28739cb7a1c83076ba5b95fe (courier.py, held, not run for E1)
- Source directory: ~/workspace/ping-24h/jev-refactor/shadow-spike/
- Hold status record: ~/workspace/ping-24h/jev-refactor/shadow-spike/HOLD_STATUS_2026-09-28.md

## Measurement protocol (frozen)

- Control arm: lexical_baseline top-10 over the frozen corpus.
- Treatment arm (HELD): lexical top-25 shortlist → one batched Jev Choice → reranked top-10 (plus top-5 cut for the reduced-context metric). Downstream agent proxied as: known-good file in top-3 of delivered context (stated plainly in the hold record).
- Metrics: task success (against known-good outcome), files read, input tokens, output tokens, end-to-end latency, cost per question, top-1/top-10 retrieval lift.
- Contract: model pinned jev-1.13.0; response model field logged per result; cost computed locally from input tokens at $0.042/MTok (output free); 429/529 fail closed with run stop (no retry); per-call timeout 10s; module spend stop $4.50.
- Pre-registered stop condition: if treatment task-success-per-token is not strictly better than control on the corpus, Jev LOSES for this lane; report the loss with the numbers, name where it lost, pivot to E2 with no threshold tuning.

## Commands (frozen, for rerun at release)

```
cd ~/workspace/ping-24h/jev-refactor/shadow-spike
python3 lexical_baseline.py            # control self-check: expect top1 19/25 (0.760)
sha256sum e1-corpus.json               # expect f59eaf79...2765ec
```

Rerun criterion: the deterministic baseline must reproduce 19/25 top-1 exactly before any treatment wave is trusted.

## Jev API baseline (measured 2026-09-28, neutral probes, allowed under hold)

- api-baseline-2026-09-28.jsonl SHA256: 20ba8a7822fc1c4949605c7708078d8e366f70cfb7012a7d69d52f9e2b634095
- 10/10 ok. Latency min 297 / p50 418 / max 565 / mean 410 ms (inside vendor 70-500ms band).
- Mean input tokens 316, mean cost $0.0000133/call. All served by jev-1.13.0.

## Mechanical release condition for E1/E2 (unchanged)

retrieval seam frozen + verification seam frozen + input/output contracts versioned + corpus unchanged + deterministic baseline rerunnable = RELEASE E1/E2.

Not "the coordinator thinks things look stable." All five conditions are checkable mechanically at GO.

## CORPUS ABSENT candidates (do not manufacture labels)

Four Jev candidates lack usable corpora. Marked CORPUS ABSENT; no labels manufactured to complete a matrix.

1. D-26b evidence-chain completeness: 20-assess.json files are 4-key dicts, not auditable chains; no verified-label corpus.
   Natural label plan: future orca runs that hit the D-26b judge produce (chain, judge verdict, manual audit) triples; accumulate until the corpus supports measurement.
2. D-09b brief quality gate: no historical taskBriefs with outcomes found locally.
   Natural label plan: future dispatches record (taskBrief, downstream deny/failure rate); flagged vs unflagged briefs become labels over operating time.
3. D-57 task tier classification: no broker task descriptions with coordinator tier labels found locally.
   Natural label plan: future broker tasks carry the coordinator's actual tier assignment; accumulate task-description → tier pairs.
4. D-58 failure classification: only 2-line stub fixtures; UNKNOWN bucket too small.
   Natural label plan: future broker JSONL logs accumulate UNKNOWN-bucket items with operator reclassification as labels.

For each: the label source is real operating traces, collected with the per-record shadow schema (decision_id, input_digest, evidence_digest, verified_label, label_source, eventual_outcome, outcome_source). No synthetic labels, no experimenter-derived labels presented as verified.

## Other frozen corpora (held, not E1)

- completion-corpus: 16 items (ACCEPT_PROOF 8 / REJECT_PROOF 5 / VERIFY_MORE 3). D-08 eval set. (~/workspace/jev-eval/completion-corpus)
- backlog-dataset: 53 items (MISSING_TEST 22 / ALREADY_IMPLEMENTED 13 / PROVEN_DEFECT 8 / FUTURE 7 / SUPERSEDED 2 / DUPLICATE 1). D-45 eval set; caveat: no priority labels.
- replay-dataset: 51 items (routing 11, classification 5, triage 14, other 21); 47 outcome_known=true, 4 false (excluded from verified-label scoring).
- escalation-log.jsonl: 30 records (escalate 20 / decide 9 / escalate_resolved_by_owner 1). D-28 eval set; parse with json.JSONDecoder().raw_decode (trailing data per line).

All held. No E1/E2 calls until the mechanical release condition is met.
