---
id: facebook-engagement-collect
title: Facebook engagement collection (15m)
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T12:05:42
  every: 15m
timeout_secs: 300
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Facebook engagement collection for PING Social outreach (2026-09-24, orphan model). Run `~/workspace/pig-fb/collect_pass.sh`, then the stale-dispatch lifecycle sweep below. Nothing else.

The script is SHORT and IDEMPOTENT, safe to kill and re-run at any moment: it lists job-*.result.json and job-*.progress.jsonl in the Pig inbox, downloads each file not yet recorded in ~/workspace/pig-fb/.collected-results, records every action's OBSERVATION into the intent ledger via `action-intent-ledger.py record-outcomes` (per-action EXECUTED/FAILED, NOT_ATTEMPTED where the worker proves it never acted), and marks the file collected ONLY after the ledger write succeeds. Progress files are consumed incrementally (complete lines only) via the .collected-progress sidecar. Killing this schedule mid-run can never create duplicate observations: record-outcomes targets only OPEN intents and the ledger fold is first-record-wins, so a retry is always a no-op for already-closed intents. Every intent closes within one 15-minute interval.

Stale-dispatch sweep (GO item 2, 2026-09-25): after collect_pass.sh, run `python3 ~/workspace/outreach/action-intent-ledger.py sweep-stale-dispatches --platform facebook --max-age-hours 8` (the python3 prefix is required: action-intent-ledger.py is a Python script and invoking it via bash fails). Local only, never touches the Pig. Appends exactly one dispatch_lifecycle RECONCILIATION_REQUIRED record per dispatch that is older than 8h with zero observation records, zero recorded progress lines, no collected result, and no existing lifecycle record. Idempotent: re-running never duplicates records. This moves the DISPATCH lifecycle only: every intent's execution outcome stays UNKNOWN, FAILED is never inferred, nothing becomes retryable, and no intent or evidence record is altered or discarded. Stale intents stay refused by the guard until deliberate reconciliation via the ledger's `reconcile` subcommand. The sweep prints marked/skipped JSON; include it in the worker report.

Stay silent on success: no user-facing message. Log failures only in the daily memory note under the dated FB Collect heading when the summary shows results_failed or progress_failed (possible ledger or Pig problem), or a STALE dispatch warning (a worker that died before writing anything; its intents stay open and the next pass's refuse filter keeps them fail-closed, so no action is needed unless this repeats).

NEVER launch a worker, NEVER retry an unknown effect, NEVER infer FAILED for a stale dispatch, NEVER touch the Pig's headed Chrome. This schedule only collects. The 2-hour facebook-engagement-pass schedule owns dispatching.
