# DECISION Shard 1 Summary

Worker: DECISION-SHARD-0 (depth 2, no child agents), claimed shard 1 unclaimed at 2026-09-24 03:13 UTC.
Scope: within-shard indices 0-249, backlog ids D-251 through D-500. Definitions reused from
`../shard-0/gen.py` (authored during shard 0). Synthetic mission output: `synthetic:true`, `testing_only:true`.
Backlog D-251..D-500 already appended by shard 0 (500 unique ids verified); no re-append.

## Verdict distribution (250 units)

| Verdict | Count | Share |
|---|---|---|
| AUTO_EXECUTE | 192 | 76.8% |
| DEEP_REVIEW | 36 | 14.4% |
| GATHER_MORE_EVIDENCE | 7 | 2.8% |
| HUMAN_DECISION | 6 | 2.4% |
| REQUEST_CONFIRMATION | 5 | 2.0% |
| EXECUTE_REVERSIBLY | 3 | 1.2% |
| DEFER | 1 | 0.4% |

## Top three HUMAN_DECISION / REFUSE items (ranked by criticality, then backlog order)

1. **D-474** (HUMAN_DECISION, P0): Falsification seed: challenge D-251's absolute boundary (any legitimate owner-contact case?) Rationale: Falsification fails: the boundary is Nolan's standing rule, and the exception path is Nolan himself. Absolute stands.
2. **D-483** (HUMAN_DECISION, P0): Falsification seed: challenge D-015's HUMAN_DECISION (could a worker gate publishing with a checklist?) Rationale: Falsification fails: the launch boundary is absolute and checklists do not absorb business risk. The verdict stands.
3. **D-423** (HUMAN_DECISION, P1): DEHPP: Chrome split first (build ordering). Decision needed now? Rationale: Chrome split is a canonical renderer mutation; D-015's rule gates it. Nolan must explicitly approve the build ordering start.

## Key evidence

Same seven lane documents as shard 0 (D-439 re-check: no deltas since shard 0's read).
This shard's content: mission-class operations (WORLD/OBJECT/PROJECTION/SYNTH/DECISION),
integration/operations, absolute boundary restatements (D-251..D-253), and falsification
seeds challenging shard 0's own verdicts (D-471..D-500).

## Open questions

- D-361/D-440: compare this shard's distribution against the shard-0 baseline for skew.
- D-429/D-469: parent confirms reporting cadence and retrospective ownership.
- D-475: template provisional adoption; parent reviews after this shard.

## Next steps

Per the never-idle rule: check for shard 2 ownership. If unclaimed, the 500-definition
corpus is exhausted (D-001..D-500 complete); next work is falsification of other shards'
verdicts (D-449) or gap discovery (D-450), per the parent.

## Throughput

250 units in 0.3s (49275 units/min). Peak traced memory: 287 KB.
