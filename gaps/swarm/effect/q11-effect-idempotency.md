# Q11 — Effect succeeded, response lost (EFFECT SWARM, 2026-10-01, code forensics)

Scope: outreach dispatch boundary — `~/workspace/pig-fb/run_pass.sh` (dispatcher),
`~/workspace/pig-fb/engage.js` (DEPLOYED worker, 174 lines; what actually runs on the Pig),
`~/workspace/outreach/staged/engage.js` (259 lines, eligibility envelope; NOT deployed),
`~/workspace/outreach/action-intent-ledger.py` (intent/observation/finalization),
`~/workspace/pig-fb/collect_pass.sh` (collector). IG/Threads/X/TikTok workers spot-checked.

## Boundary inventory
- Idempotency key at the effect boundary: NONE. No action carries a provider-side
  idempotency key; Facebook/IG/Threads/X UI automation returns no operation ID.
- Provider receipt: NONE. The only "receipt" is the worker's self-observation
  (button-state change for likes; comment text visible in DOM for comments),
  written to `<job>.progress.jsonl` (fsync per action) and `<job>.result.json`.
- Reconciliation: YES, and it is the real control —
  ACTION_INTENT_DURABLE → EXECUTION → OBSERVATION → FINALIZATION;
  `refuse` blocks any candidate with an unresolved (UNKNOWN_EXECUTION) or open
  intent; `record-outcomes` derives terminal from worker `ok` boolean;
  `sweep-stale-dispatches` never infers FAILED/retryable; manual `reconcile`
  requires --reason/--evidence/--resolved-by and refuses to overwrite observed history;
  `verify-effect` exists for independent (non-worker) effect confirmation.
- Automatic retry: NONE in the designed path. run_pass.sh launches once;
  collect_pass.sh is first-record-wins and idempotent, never re-dispatches;
  engage.js iterates each action exactly once, no per-action retry.

## Per-effect-type analysis
- LIKES (fb/ig/th/x/tk): PASS. Every worker re-reads provider state before acting
  (`[aria-label="Unlike"]`, `data-testid="unlike"`, `aria-pressed=true`, etc.)
  and returns ok:true 'already liked' without clicking. A retry after a lost
  response is safe by construction.
- COMMENTS (fb deployed worker): NO pre-submit duplicate check. `doComment`
  types text, presses Enter, then verifies by DOM text. Kill/crash in the
  ~4-8s window between Enter and progressLog() → effect may have posted with
  zero observation → intent stays EXECUTION → next pass `refuse` blocks it as
  UNKNOWN_EXECUTION (fail-closed; verified in engagement-guard.py
  `_fb_ledger_engaged_post_ids`: EXECUTED/FAILED/UNKNOWN_EXECUTION/open block,
  only NOT_ATTEMPTED stays eligible).

## The FAIL: mis-reconciliation re-arms a posted comment (P0-class latent)
`action-intent-ledger.py reconcile --outcome NOT_ATTEMPTED` does NOT require
`--history-recorded` (only EXECUTED does). NOT_ATTEMPTED = "proven non-execution"
and the guard keeps such intents ELIGIBLE. So:
effect succeeded (comment posted) → response lost (kill in post-submit window,
no observation) → human/agent reconciles as NOT_ATTEMPTED with wrong/weak evidence
("no observation found" ≠ "proven not posted") → next pass re-curates the same
URL → DUPLICATE public comment.
The reconcile command demands --reason/--evidence/--resolved-by, so this needs
a wrong human/agent act, not an automatic one — but the boundary itself cannot
make the retry safe, and the one re-arming path is asymmetric (EXECUTED needs
proof of history; NOT_ATTEMPTED needs no proof of absence).
Out-of-band execution (hand-run `node engage.js job.json`) bypasses every guard;
that is operator action, noted for completeness.

## UNKNOWN exists and is honored
UNKNOWN_EXECUTION is a first-class terminal: refuse filter, list-unknown inbox,
sweep-stale-dispatches, and the collector all treat it as fail-closed, never
as retryable. Verified in code, not just prose.

## Verdict: FAIL (P0-class latent)
No idempotency key / provider op ID / receipt at the effect boundary; likes are
safe by state-read, comments are safe ONLY via ledger refuse semantics, and the
manual reconcile-to-NOT_ATTEMPTED path can re-arm a comment that actually posted.

## Smallest fix
Require proof-of-absence for reconcile --outcome NOT_ATTEMPTED on comment-type
intents (same rigor as EXECUTED's --history-recorded): e.g. an independent
`verify-effect` EFFECT_ABSENT observation, or refuse NOT_ATTEMPTED reconcile
for actions whose worker evidence window includes a post-submit kill. Longer
term: pre-submit duplicate check in doComment (scan visible comments for our
account's identical text before typing).
