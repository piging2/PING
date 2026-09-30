# LearningRecord schema (MarketingOS 100h, block 80–100)

A LearningRecord is the canonical unit of "what MarketingOS learned." It is a
plain data record, not a new store, not an authority. Records live in
`learning-records.json` (machine-readable) and are mirrored into
knowledge_nodes (`node_type = 'learning'`, namespace `marketingos::learnings`)
plus a ping_events LEARNING_RECORDED event for the trail.

## The boundary law

A learning NEVER silently becomes policy. A LearningRecord describes what
happened. A playbook rule (PLAYBOOK.md) is a candidate behavior. Promotion
from candidate to ACTIVE happens only by explicit human decision (Nolan or
the lane owner), recorded with the decision, the decider, and the date.
Expired rules are re-verified or dropped, never silently kept.

## Fields

| field | meaning |
|---|---|
| id | `LR-YYYYMMDD-NNN`, stable |
| title | one line |
| learned_in_block | sprint block that demonstrated it, e.g. `20-40` |
| statement | the learning, one paragraph, no more |
| support_set | evidence refs: report sections, driver files, commit SHAs, journal event/mission ids |
| scope | where it applies, and where it explicitly does not |
| confidence | 0..1, honest; n=1 observations cap at 0.9 unless the mechanism is deterministic (then 1.0 with the determinism stated) |
| sample_count | what n actually is, e.g. `n=1 mission`, `n=12 shots` |
| counterexamples | observed counterexamples, or `none observed` — never omitted |
| freshness | date learned |
| expiration | date after which the record must be re-verified or dropped |
| status | ACTIVE / EXPIRED / SUPERSEDED |
| policy_boundary | always true: this record is not policy |

## Expiration rule

On expiration the record is either re-verified (freshness and expiration
updated, evidence cited) or dropped to EXPIRED. There is no third option.
