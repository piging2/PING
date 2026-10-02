# REF - Guard Integration

The eligibility authority is `eligibility_check()` in
`~/workspace/outreach/engagement-guard.py`. This skill consumes it; it
never re-derives, overrides, or caches it across passes.

## Contract

`eligibility_check(candidate, action, campaign, engagement_history,
suppression_state, corridor_policy, action_capability)` ->
`ELIGIBLE | INELIGIBLE(reason) | UNKNOWN(reason)`.
UNKNOWN = do not dispatch. Precedence:
CAPABILITY_MISSING / PROVIDER_UNSUPPORTED -> BLOCKED -> SUPPRESSED ->
ALREADY_ENGAGED -> OUTSIDE_CORRIDOR -> class rules -> DUPLICATE ->
UNKNOWN -> ELIGIBLE.

## Threads-specific bindings

- Guard post IDs are `"post:<id>"`-prefixed (from
  `_fb_ledger_engaged_post_ids()`); bare-ID comparisons always miss.
  The harness uses the prefixed form everywhere.
- `THREADS_POST_RE = threads.(com|net)/@handle/post/<code>`.
- `check_threads` consumes handles + shortcodes.
- Threads capability: like + comment only (from
  `action-capability.json`).

## Probed behavior (real guard, 2026-10-01)

Fixture candidates: ELIGIBLE, ELIGIBLE, DUPLICATE, ALREADY_ENGAGED
(@garyvee). Identity probe `garyveee` -> BLOCKED (fail closed).
The harness records the decision record per candidate per pass;
`decision_replay` recomputes from the stored inputs to prove integrity.

## After a VERIFIED_SUCCESS

The deployment records the engagement via
`engagement-guard.py record --platform threads` so the next pass's
guard sees it as ALREADY_ENGAGED. The harness never relies on its own
ledger alone for never-reengage; the guard's durable history is the
authority.

## TASTE IS NOT ELIGIBILITY

Subjective ranking/curation lives in a layer ABOVE eligibility, never
in the guard's data files. Comment copy comes from the curated layer;
the harness never invents it.
