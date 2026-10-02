# DECISION-SHARD-3 SUMMARY (D-753..D-1002)

## Verdict distribution (250 units)

- AUTO_EXECUTE: 41
- AUTO_EXECUTE_AND_NOTIFY: 5
- DEEP_REVIEW: 187
- DEFER: 4
- GATHER_MORE_EVIDENCE: 4
- HUMAN_DECISION: 9

## Method
- 250 NEW decision definitions (the D-001..D-500 corpus is exhausted; D-501/D-502 pre-exist in the backlog from the projection worker, so this shard uses fresh ids).
- Full 18-field decomposition per unit: QUESTION / POSSIBLE OUTPUTS / EVIDENCE REQUIREMENTS / CONFIDENCE / CRITICALITY / REVERSIBILITY / BLAST RADIUS / NOVELTY / AUTHORITY REQUIRED / COST / TIME SENSITIVITY / VERIFICATION + verdict + rationale.
- Verdict set: AUTO_EXECUTE / AUTO_EXECUTE_AND_NOTIFY / EXECUTE_REVERSIBLY / GATHER_MORE_EVIDENCE / DEEP_REVIEW / REQUEST_CONFIRMATION / HUMAN_DECISION / REFUSE / DEFER.
- High confidence never overrides authority: owner-contact, public-launch, credential, and canonical-mutation items are HUMAN_DECISION/REFUSE by law regardless of confidence.
- Repo writes belong to the parent-gated integration writer; this shard recommends, never applies.

## Throughput
- 250 units in 0.0s. Peak traced memory: 15244 KB.
- Backlog: 250 appended, 0 skipped (already present).

## Artifacts
- results.jsonl (250 lines, unit_index + backlog_id per line)
- definitions.jsonl (250 lines, explicit 18-field decision definitions, D-753..D-1002)
- SHARD-LOG.md, CLAIM.md, theme definition files (this shard's definitions/)
