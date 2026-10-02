# DECISION-SHARD-2 SUMMARY (D-503..D-752)

## Verdict distribution (250 units)

- AUTO_EXECUTE: 44
- AUTO_EXECUTE_AND_NOTIFY: 8
- DEEP_REVIEW: 125
- DEFER: 17
- EXECUTE_REVERSIBLY: 8
- GATHER_MORE_EVIDENCE: 19
- HUMAN_DECISION: 12
- REQUEST_CONFIRMATION: 17

## Method
- 250 NEW decision definitions (the D-001..D-500 corpus is exhausted; D-501/D-502 pre-exist in the backlog from the projection worker, so this shard uses fresh ids).
- Full 18-field decomposition per unit: QUESTION / POSSIBLE OUTPUTS / EVIDENCE REQUIREMENTS / CONFIDENCE / CRITICALITY / REVERSIBILITY / BLAST RADIUS / NOVELTY / AUTHORITY REQUIRED / COST / TIME SENSITIVITY / VERIFICATION + verdict + rationale.
- Verdict set: AUTO_EXECUTE / AUTO_EXECUTE_AND_NOTIFY / EXECUTE_REVERSIBLY / GATHER_MORE_EVIDENCE / DEEP_REVIEW / REQUEST_CONFIRMATION / HUMAN_DECISION / REFUSE / DEFER.
- High confidence never overrides authority: owner-contact, public-launch, credential, and canonical-mutation items are HUMAN_DECISION/REFUSE by law regardless of confidence.
- Repo writes belong to the parent-gated integration writer; this shard recommends, never applies.

## Throughput
- 250 units in 0.0s. Peak traced memory: 12972 KB.
- Backlog: 250 appended, 0 skipped (already present).

## Artifacts
- results.jsonl (250 lines, unit_index + backlog_id per line)
- definitions.jsonl (250 lines, explicit 18-field decision definitions, D-503..D-752)
- SHARD-LOG.md, CLAIM.md, theme definition files (this shard's definitions/)
