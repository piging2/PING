# OUTREACH-CLASSIFIER-VIOLATIONS — 2026-09-27 ~13:25 MDT

Subagent: backlog-burn (parent: main agent). Read-only falsification of
`outreach/pass_policy_engine.py`; no files modified.

## Finding (REAL, minor, compensated)

`classify_pass_terminal()` never reads the `violations` context flag.
Demonstrated live:

```
actions_landed=5, violations=2 -> SUCCESS_ACTION
actions_landed=5, violations=0 -> SUCCESS_ACTION   (identical)
```

A "violation" here is safety-relevant: `engagement-guard.py:1043-1055`
re-checks each landed action against the durable history index, and a
violation means the action now judges ALREADY_ENGAGED / BLOCKED /
UNCHECKABLE — i.e. under current knowledge it should not have been taken
(the never-reengage rule is a hard Nolan rule). A pass that breached it
is terminally classified identically to a clean pass.

## Why it is not silently lost today (compensating controls)

1. `spine_observe.py:455` emits `violations` as a structured field on the
   `MC_PASS_CLOSED` journal event — the journal reader sees it.
2. `automation-health-report.sh:192-197` already special-cases it at the
   report layer: a SUCCESS_ACTION block whose prose mentions violations
   renders as `⛔ post-pass verify VIOLATION` instead of `✓`.

## Why it is still a gap

Control (2) greps PROSE (`[1-9][0-9]* violations?`) instead of reading the
structured `violations` count from the `MC_PASS_CLOSED` event — fragile
by construction. And the machine-readable terminal class (the thing the
panel, action-truth, and any automation key on) carries no trace of it.

## Fix options (for the outreach owner — coordinated, not unilateral)

- Option A: new terminal class `SUCCESS_VIOLATIONS`, checked in
  `classify_pass_terminal` right after the `actions_landed > 0` branch
  (violations > 0 → SUCCESS_VIOLATIONS, else SUCCESS_ACTION). Requires
  touching 3 closed vocabularies: `PASS_CLASSES` in pass_policy_engine.py,
  `CLASSIFICATIONS` (argparse choices) in action-truth-append.py, and a
  new case branch in automation-health-report.sh. NOT in FAILURE_CLASSES
  (actions landed; it is not a failure).
- Option B: keep the class; rewire the health report to read the
  structured `violations` from the `MC_PASS_CLOSED` journal event instead
  of grepping prose. Smaller vocabulary footprint, bigger report change.
- Falsification for either: the demo above must yield the qualified
  class (A) or the ⛔ report line from the structured field (B); the
  clean case must stay SUCCESS_ACTION / ✓.

## Status

QUEUED for the outreach owner. Not applied here: live outreach machinery
with closed vocabularies in 3 files; the current compensation means no
silent loss today.
