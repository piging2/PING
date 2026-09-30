# Outcome intake seam (MarketingOS 100h, block 80–100)

The canonical seam through which post-distribution observations will arrive.
Built now; no outcomes exist yet because zero distributions have happened —
distribution decisions stop at Nolan's boundary.

## The contract

An outcome observation is a JSON file conforming to `outcome-intake-schema.json`.
Once a distribution is authorized and observed, the intake driver validates
the file and emits it into ping_events as OBSERVATION_CREATED with
`outcome_class` in metadata, correlated to the distribution mission id.
Canonical admission uses the existing event runtime — this spec defines the
contract, not a new service.

## The five outcome classes

No magic score. No manufactured causality. Each observation carries exactly
one class plus an honest causality claim.

| class | what counts |
|---|---|
| ATTENTION | views, impressions, watch time — counts only, no depth implied |
| INTELLECTUAL ENGAGEMENT | comments, replies, quote-posts, code forks, citations — depth signals, not reach |
| INTENT | follows, subscribes, demo requests, contact attempts |
| AUTHORITY | inbound citations, speaking invites, expert attribution, corrections from peers |
| BUSINESS | leads, conversations, revenue-adjacent outcomes |

## Causality honesty

Every observation must state its causality claim explicitly:

- `none` — observed, no causal claim (the default; correlation is not causation)
- `correlated` — covariation observed, confounders listed, no causal claim
- `causally-tested` — a bounded experiment with a control was run (SUPPORTED / FALSIFIED / INCONCLUSIVE / UNOBSERVABLE / PENDING_WINDOW)

An observation window is OPEN until the window closes or the observation
period is abandoned with a recorded reason. Honestly open windows are never
converted into success metrics.

## Validation

`validate-intake.cjs` validates a file against the schema. The fixtures in
`fixtures/` are synthetic and marked as such — they exist to prove the
validator, never to be journaled as real outcomes.
