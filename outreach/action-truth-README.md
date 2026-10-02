# action-truth.jsonl -- independent discovery/action truth

(2026-09-17, automation-resilience program, Nolan directive item 11.)

## Purpose

An independent, append-only, per-run record of what the automations
DISCOVERED, filtered, selected, attempted, and actually achieved. It is
separate from:

- `engagement-guard.py` history (per-account durable engagement record),
- `action-intent-ledger.jsonl` (per-ACTION lifecycle: intent -> execution ->
  observation -> terminal state).

Those stores answer "what did we decide per action/account". This store
answers "what did a whole run find and do", with discovery and action counts
kept as SEPARATE fields so that:

- an empty pass is never mistaken for a successful one,
- a discovery/enumeration failure is never mistaken for "nothing worth doing",
- a blocked run (zero attempted) is distinguishable from a run that tried
  and failed.

Every automation run appends exactly one record, even when it did nothing.
That is the point.

## Schema

One JSON object per line. Keys in this order:

| key            | type   | meaning |
|----------------|--------|---------|
| ts             | string | ISO-8601 with offset, when the run completed (or failed). |
| run_id         | string | Unique per run, e.g. `ig-20260917-pass44`, `fb-unfollow-20260917`. |
| platform       | string | `instagram` \| `facebook` \| `threads` \| `x` \| `tiktok` |
| operation      | string | `engage` \| `unfollow` \| `follow` \| `dm` \| `post` \| `enumerate` \| `recovery-test` \| `other` |
| source         | string | What started the run, e.g. `instagram-engagement-pass`, `manual`. |
| discovered     | int    | Candidates found by enumeration/discovery (read-only step). |
| eligible       | int    | Passed guard/eligibility filters. |
| selected       | int    | Chosen for this run's action set (intents written). |
| attempted      | int    | The worker actually tried. |
| succeeded      | int    | Worker reported ok (effect observed). |
| verified       | int    | Independently confirmed the effect took hold (button flip, Unlike state, re-query). Separate from `succeeded` so a future independent verifier can disagree with the worker. |
| failed         | int    | Attempted but did not take effect. |
| classification | string | Exactly one of the vocabulary below. |
| notes          | string | Free text: what happened and why. |

## Classification vocabulary

From the automation-resilience program's universal empty-pass classifier.
Exactly one per record:

- `SUCCESS_ACTION` -- ran, performed actions, all verified.
- `SUCCESS_EMPTY` -- ran cleanly, nothing to do, no failure (e.g. deliberate
  enumerate-only run, or a batch whose queue was legitimately empty).
- `ENUMERATION_FAILURE` -- discovery/enumeration broke (zero candidates is
  SUSPECT when the historical baseline is nonzero; see the program rule).
- `ELIGIBILITY_EMPTY` -- discovered candidates, none eligible after filters.
- `DEPENDENCY_FAILURE` -- a dependency the run needs was down (Pig CDP wedge,
  unreadable capability state, Pig unreachable). Not an account problem.
- `AUTH_FAILURE` -- session logged out / no usable session.
- `SURFACE_DRIFT` -- the UI surface changed under the automation.
- `RATE_LIMIT` -- throttled by the platform.
- `TEMPORARY_FAILURE` -- failed this run, retryable next run.
- `TERMINAL_FAILURE` -- will not succeed on retry without intervention.

## Rules

- Append-only. Records are never mutated. One line = one run.
- Appends go through `action-truth-append.py`, which validates fields,
  checks the file tail is not malformed (fail closed, exit 3), and fsyncs.
- Counts are expected to be monotone non-increasing down the funnel:
  discovered >= eligible >= selected >= attempted >= succeeded;
  verified <= succeeded; failed <= attempted. The helper warns on
  violations but does not reject them; reality is sometimes messy, and a
  warning is evidence, not a block.
- This file is operational truth for the outreach machinery. It is NOT PING
  canonical intelligence; only high-quality, generalizable, verified
  intelligence goes to PING (Nolan's PING intelligence boundary).

## Example

```json
{"ts":"2026-09-17T05:05:00-06:00","run_id":"ig-20260917-pass46","platform":"instagram","operation":"engage","source":"instagram-engagement-pass","discovered":0,"eligible":0,"selected":0,"attempted":0,"succeeded":0,"verified":0,"failed":0,"classification":"DEPENDENCY_FAILURE","notes":"Pig CDP websocket wedge: connectOverCDP timed out retrieving the websocket URL. Zero engagement."}
```
