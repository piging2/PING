# Self-improvement note 2026-09-30 — meta-ai-intel pass (runs 20261001-030432 / 20261001-030650)

## Standing question answered
Did any defect in the pipeline machinery surface this run that should become
an invariant (SPECIFY/TEST/AUTOMATE/REMOVE)? Answer: no machinery defect.
The fail-closed chain held end to end: contract validator rejected the
fragment-only b-answer, the .CAPTURE_FAILED evidence was preserved and never
entered extraction, the distill sweep excluded it from eligibility, rotation
did not advance past b, and the collision guard blocked 8 of 11 re-served
names from re-entering the pipeline.

## Observation for brief maintainers (not a machinery gap)
The a-weak-website-hunt brief's novelty decay is worsening: 8 of 12 named
businesses were already tracked (re-serve rate ~67% this pass, vs the ~55-60%
noted in pipeline.md round-147 observations). One name (Precision
Landscaping) was re-served despite appearing in the brief's own
negative-signals list. The sweep plus collision guard absorbed this without
damage, but the signal belongs to brief quality, not pipeline machinery:
future brief revisions should strengthen novelty enforcement rather than
adding pipeline-side dedup.

## Verification note
Independent web-search verification of previously fail-closed names
CONFIRMED the prior exclusions rather than overturning them (C & C Services
Mack: zero Mack presence, 3rd strike; Affordable Plumbing & Heating Collbran:
entity ambiguity reconfirmed via the same Grand Junction GBP; Charlie's Pest
Control Montrose: still directory-only). This validates the standing rule:
do not re-stage a fail-closed exclusion without genuinely new material
evidence (e.g., a new contact route). No change proposed.
