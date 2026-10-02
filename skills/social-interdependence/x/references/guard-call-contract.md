# Guard Call Contract (reference)

Source of truth: `~/workspace/outreach/engagement-guard.py`, verified 2026-10-01.

## The one eligibility authority

`eligibility_check(index, candidate, data=None, batch_seen=None, surface_status="__auto__")`

The single deterministic eligibility function. Candidate + action +
campaign + engagement history + suppression/block state + corridor policy +
provider capability -> verdict + reason codes. UNKNOWN = do not dispatch.

## Inputs

- `index`: from `load_index()` (merges `x-engagement.md` history,
  the intent ledger via `_fb_ledger_engaged_post_ids()`, and the data files).
- `candidate` keys: `platform`, `type` (or `action`), `url`, `page`,
  `text`, `group_id`, `group_name`, `feed`.
- `data`: the eligibility data bundle from `load_eligibility_data()`
  (single copies under `~/workspace/outreach/eligibility-data/`; builders
  must not keep local copies).
- `batch_seen`: optional set for within-batch duplicate detection across
  sequential calls.
- `surface_status`: `"ACTIVE"` for live dispatch.

## Outputs

A dict: `decision` (ELIGIBLE / INELIGIBLE / UNKNOWN), `primary_reason`,
`reasons` (all firing codes, in precedence order), `evidence`
(human-readable refs to the data that fired). Deterministic for the same
inputs; no wall-clock use.

## Reason precedence (binding)

CAPABILITY_MISSING / PROVIDER_UNSUPPORTED -> BLOCKED -> SUPPRESSED ->
ALREADY_ENGAGED -> OUTSIDE_CORRIDOR -> class rules -> DUPLICATE ->
UNKNOWN -> ELIGIBLE.

## X-specific notes

- `check_x(index, account, url=None)`: BLOCKED on exact or fuzzy
  (SequenceMatcher >= 0.9) match against engaged handles of length >= 7;
  OUTSIDE_CORRIDOR for the `x.com|twitter.com/<handle>/status/<id>` URL
  shape when the handle is out of corridor.
- X is the only platform whose capability set includes follow
  (like + follow + comment).
- TASTE IS NOT ELIGIBILITY (2026-10-01, Nolan, binding): subjective
  curation lives in a layer above eligibility, never in the data files.

## This skill's usage

`PassHarness.evaluate()` calls `eligibility_check()` with the live index
and the candidate `{platform: "x", type: <action>, url, page: <handle>,
text}` plus the in-batch `batch_seen` set. The verdict is recorded in
`decision-records.jsonl`. No pass ever dispatches on a non-ELIGIBLE
verdict.
