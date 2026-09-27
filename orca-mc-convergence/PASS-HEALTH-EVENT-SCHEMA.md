# PASS HEALTH EVENT SCHEMA

Lane: SPEC + SAFE-IMPLEMENTATION, engagement-pipeline convergence track.
Date: 2026-09-26. Status: SPEC (v1).

All events below are typed `MC_PASS_*` and ride the EXISTING PING journal
(`fyd-journal-gateway/events.jsonl`) through `mission-control/emit.py`.
No new store. The journal envelope is unchanged:

```
{event_id, timestamp, event_type, aggregate_id, aggregate_type, event_data}
```

- `event_id`: `mc-pass-` + first 12 hex of sha256 of
  `pass_id|event_type|canonical(event_data)`. Content-derived, so emission
  is idempotent: a retried stage re-emits the identical event and the
  journal keeps one copy (emit.py already refuses duplicate event_ids).
- `aggregate_id`: `mc:pass:<platform>:<pass_id>`, `aggregate_type`:
  `mc_pass`. All of one pass's events share the aggregate, so a pass is
  one journal query.
- `timestamp`: acceptance time (UTC ISO). Stage-local timings live inside
  `event_data`.

## Event catalog (one per stage transition)

| event_type | stage | key event_data fields |
|---|---|---|
| `MC_PASS_STARTED` | DISCOVERY | platform, pass_id, caps, ramp_week, schedule |
| `MC_PASS_DISCOVERY_TIMEOUT` | DISCOVERY | attempt, strategy, timeout_secs |
| `MC_PASS_DISCOVERY_RETRY` | DISCOVERY_RECOVERY | attempt, alternate_strategy |
| `MC_PASS_DISCOVERY_DONE` | DISCOVERY | candidates, suspect_enumeration, auth_failed, dependency |
| `MC_PASS_CANDIDATES` | POLICY ENGINE | decisions[] (see below), eligible, skipped |
| `MC_PASS_MANIFEST` | ACTION MANIFEST | manifest_path, actions[] (account, url, action), pre_pass_snapshot_ref, caps |
| `MC_PASS_INTENTS` | INTENT LEDGER | intent_ids[], count |
| `MC_PASS_EXECUTION_DONE` | EXECUTOR | legs[] ({leg, actions_planned, actions_reported}), restriction (none/restriction/checkpoint) |
| `MC_PASS_RESTRICTION` | EXECUTOR | kind, at_action, evidence_ref, surfaced_to |
| `MC_PASS_OBSERVATION` | OBSERVATION | per intent: intent_id, terminal (EXECUTED/FAILED/NOT_ATTEMPTED), ok, note |
| `MC_PASS_VERIFY` | VERIFICATION | checked, violations[] |
| `MC_PASS_RECOVERY` | RECOVERY | stage, attempt, strategy, outcome (recovered/leg_skipped/exhausted) |
| `MC_PASS_ABORTED` | terminal | reason_code (GUARD_FAIL_CLOSED/LEDGER_FAIL_CLOSED/INTENT_WRITE_FAILED), stay_on |
| `MC_PASS_CLOSED` | terminal | pass_class, actions_landed, caps, unknown_open, candidates, eligible, skipped |

`MC_PASS_CANDIDATES.decisions[]` entries:
`{account, url, action, decision: SELECTED|REJECTED, reason_code,
  evidence: {history_ref? | intent_id? | cap_remaining?}}`.
One batched event per pass (candidates are bounded at a few hundred;
per-candidate journal rows would drown the stream). The rejection question
is answered by scanning this array.

`MC_PASS_CLOSED` is the ONLY event the panel's "last pass" row reads.
Rollups read `MC_PASS_CLOSED` inside the window plus open-intent state.

## Answering Nolan's three questions (query logic, not prose)

### WHY DID IT STOP?

Query: the latest `MC_PASS_CLOSED` for the platform (max timestamp on
`aggregate_id = mc:pass:<platform>:*`). Read `pass_class`,
`stop_kind`, `stop_event_ref`.

Answer construction (deterministic):
- If `stop_kind = restriction`: "Stopped by <kind> at action N of M.
  Surfaced to Nolan at <ts>. Next pass resumes at ramped caps."
  Evidence: the linked `MC_PASS_RESTRICTION` event (kind, at_action,
  evidence_ref).
- If `stop_kind = fail_closed`: "Aborted fail-closed: <reason_code>
  (guard unreadable / ledger unreadable / intent write failed). Zero
  engagement. Schedule stays on; next pass retries." Evidence: the
  linked `MC_PASS_ABORTED` event.
- If `stop_kind = empty`: "Completed with zero actions: <pass_class>
  (SUCCESS_EMPTY / ELIGIBILITY_EMPTY / AUTH_FAILURE / DEPENDENCY_FAILURE
  / ENUMERATION_FAILURE). <candidates> candidates, <eligible> eligible."
  Evidence: `MC_PASS_DISCOVERY_DONE` + `MC_PASS_CANDIDATES`.
- If `pass_class = SUCCESS_ACTION`: "It did not stop early; it completed
  <landed>/<cap> actions." Evidence: `MC_PASS_EXECUTION_DONE`.

No prose log is read. If the linked stop event is missing, the answer is
"stop event missing from the journal for pass X", never a guess.

### WHY WAS THIS CANDIDATE REJECTED?

Input: platform, account handle or post URL (identity normalized the same
way the guard normalizes it), optional pass_id or time window (default
last 7 days).

Query: scan `MC_PASS_CANDIDATES` events for the platform, newest first,
for a decisions[] entry whose normalized account or post id matches.
Return the FIRST (newest) match: `{pass_id, decision, reason_code,
evidence}`.

Answer construction:
- `ALREADY_ENGAGED` -> "Rejected: already engaged. History ref:
  <history_ref> (pass N, <date>)."
- `BLOCKED_AMBIGUOUS` -> "Rejected: ambiguous identity, failed closed
  (resembles <known>)."
- `UNKNOWN_EXECUTION_OPEN` -> "Rejected: open intent <intent_id> from
  pass <pass_id> reached EXECUTION with no observation. Needs deliberate
  reconciliation; will not auto-retry."
- `CAP_EXHAUSTED` / `NO_EVIDENCE` / `PAIR_RULE_VIOLATION` /
  `INVALID_ACTION` -> the reason in plain words with the cap or rule.
- `GUARD_FAIL_CLOSED` / `LEDGER_FAIL_CLOSED` -> "Rejected because the
  pass aborted fail-closed (<reason>); nothing was eligible by design."
- No match in window -> "No rejection recorded for this identity in the
  last 7 days. It was either never a candidate or it was SELECTED."
  (Never "it was eligible".)

### WHAT DID THE BROWSER ACTUALLY DO?

Input: platform, pass_id (default: latest closed pass).

Query: `MC_PASS_MANIFEST` (planned: actions[]) JOIN
`MC_PASS_OBSERVATION` (observed: per-intent terminal + note) on intent
order, plus `MC_PASS_EXECUTION_DONE` legs and any `MC_PASS_RESTRICTION`.

Answer construction: a table, one row per planned action:
`planned action -> observed terminal (EXECUTED / FAILED /
NOT_ATTEMPTED / UNKNOWN_EXECUTION) + note`. Footer: "Executor reported
M of N manifest actions. Restriction: <none|kind>. Intents left open:
<intent_ids>." The browser did exactly what the observations say, no
more. An action with no observation is UNKNOWN_EXECUTION, shown as
"unknown, not assumed".

## Rollup derivations

### Last pass (per platform)

- Status: `pass_class` of the latest `MC_PASS_CLOSED`.
- Actions: `actions_landed / caps_total` from the same event.
- Unknown: count of intents for this pass_id with no observation and no
  finalize/reconciliation, derived by folding `MC_PASS_INTENTS` +
  `MC_PASS_OBSERVATION` (+ ledger reconcile records when the reconciler
  emits them). Until the ledger emits journal events, this count is read
  from the ledger fold; the schema reserves the journal as the future
  single reader.
- Candidates / Eligible / Skipped: from `MC_PASS_CANDIDATES`
  (candidates, eligible, skipped = candidates - eligible).

### 7-day rollup (per platform)

Window: `MC_PASS_CLOSED` events with timestamp >= now - 7d.

- passes: count.
- actions: sum(actions_landed).
- failures: count where pass_class in
  {ENUMERATION_FAILURE, DEPENDENCY_FAILURE, AUTH_FAILURE, RATE_LIMIT,
  TEMPORARY_FAILURE, TERMINAL_FAILURE}. ELIGIBILITY_EMPTY and
  SUCCESS_EMPTY are not failures; they are honest empty outcomes.
- unknown: intents currently UNKNOWN_EXECUTION (open, pass dead),
  folded from intent/observation events in the window.
- blocks: count where pass_class = RATE_LIMIT, plus
  `MC_PASS_RESTRICTION` events with kind=restriction in the window
  (a pass that hit a restriction mid-run and still closed counts once).

### Refresh semantics

The panel is a pure projection. It recomputes on every new
`MC_PASS_CLOSED` (or on demand); rollups scan at most 7 days of one
platform's pass events (bounded: ~84 passes/week at 2h cadence). No
caching layer, no materialized table. If the journal is unreachable, the
panel shows "event store unreachable", never stale numbers presented as
fresh.

## Compatibility notes

- `emit.py` gains the `MC_PASS_*` event types (additive; this lane's SAFE
  diff). Emission call sites in cron bodies are SEQUENCE work.
- Existing `MC_*` vocabulary (LANE_STARTED, CHECKPOINT, HOLD_RAISED,
  ...) is untouched.
- The per-pass prose sections in `*-engagement.md` remain the guard's
  parse source and the human audit trail; they are not a query input for
  the panel.
