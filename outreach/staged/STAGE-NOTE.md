# Staged: per-action eligibility envelope verification for engage.js

STAGED 2026-10-01. NOT DEPLOYED to the Pig. No Pig files were touched.

## What is staged

`staged/engage.js` = `~/workspace/pig-fb/engage.js` plus:

1. `verifyEligibilityEnvelope(a)` — per-action check before the click:
   missing envelope, evidence_hash mismatch, non-ELIGIBLE decision, or
   stale checked_at (TTL 6h) each refuse the action with a logged note.
2. A call in the action loop: a refused action is recorded as
   `ok:false, note:'eligibility refused: ...'` and skipped; the pass
   continues with the next action.
3. `canonicalStringify` — byte-matches Python's
   `json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=True)`
   (differential-tested, including astral characters), so the worker
   recomputes the exact evidence_hash the plan-time gate stamped.

## Enforcement chain when deployed

1. Plan time: `engagement-guard.py curate` stamps the envelope.
2. Dispatch: `engagement-guard.py filter` re-evaluates the full reason set
   live (never trusts the envelope) + `evidence-check` verifies envelope
   freshness and data-file digests. Both run inside run_pass.sh.
3. Worker: this staged verification, per action, before the click.

## Residual gap (documented, not hidden)

The worker cannot re-evaluate the full reason set: the eligibility data
files do not live on the Pig. A block added between dispatch and the click
is not visible to the worker. The control for that window is the
dispatch-side evidence-check (data_sha256 comparison) plus the 6h TTL.
Closing it fully would mean shipping the registries to the Pig and porting
eligibility_check to JS; that is future work, not this stage.

## What deployment requires

Owner decision. Deployment = pig-put the staged file to the Pig worker
path + one bounded pass to prove the worker still runs. The staged file
is otherwise identical to the current worker; the only behavior change is
that actions without a valid envelope are refused instead of executed.
