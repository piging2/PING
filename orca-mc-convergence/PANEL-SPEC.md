# PASS HEALTH PANEL SPEC

Lane: SPEC + SAFE-IMPLEMENTATION, engagement-pipeline convergence track.
Date: 2026-09-26. Status: SPEC (v1). Projection only; no new backend store.

Target surface: Mission Control. This panel is a projection over the
`MC_PASS_*` journal events defined in PASS-HEALTH-EVENT-SCHEMA.md. It
creates nothing, mutates nothing, and never presents a number it cannot
trace to an event.

## Layout (Nolan's mock, per platform tab)

```
[Instagram] [Facebook] [Threads] [TikTok] [X]        <- platform tabs

Last pass:  SUCCESS_ACTION                 <- pass_class of latest MC_PASS_CLOSED
Actions:    43 / 62                        <- actions_landed / caps_total
Unknown:    0                              <- open UNKNOWN_EXECUTION intents, this pass
Candidates: 200   Eligible: 71   Skipped: 129
                                               <- from MC_PASS_CANDIDATES

7-DAY: passes 84 | actions 2,913 | failures 19 | unknown 2 | blocks 1
                                               <- windowed MC_PASS_CLOSED rollup

[WHY DID IT STOP?] [WHY WAS THIS CANDIDATE REJECTED?] [WHAT DID THE BROWSER ACTUALLY DO?]
```

Below the fold per platform: the last 10 passes as rows
(pass_id, time, class, landed/cap, unknown), each row expandable to its
stage events in order (the pass's journal aggregate, newest last).

## Data source per field

| Field | Source event(s) | Derivation |
|---|---|---|
| Last pass class | latest `MC_PASS_CLOSED` | `pass_class` verbatim |
| Actions landed / caps | same | `actions_landed`, `caps_total` |
| Unknown | `MC_PASS_INTENTS` + `MC_PASS_OBSERVATION` folded for this pass_id | open intents, pass dead |
| Candidates / Eligible / Skipped | `MC_PASS_CANDIDATES` | `candidates`, `eligible`, `candidates - eligible` |
| 7-day passes | `MC_PASS_CLOSED` in window | count |
| 7-day actions | same | sum(actions_landed) |
| 7-day failures | same | count(pass_class in failure set) |
| 7-day unknown | intent/observation fold in window | open UNKNOWN_EXECUTION |
| 7-day blocks | same + `MC_PASS_RESTRICTION` | count(RATE_LIMIT) deduped |
| WHY DID IT STOP? | latest `MC_PASS_CLOSED` + linked stop event | query logic in schema doc |
| WHY REJECTED? | `MC_PASS_CANDIDATES` scan (7d, newest first) | identity match on decisions[] |
| WHAT DID BROWSER DO? | `MC_PASS_MANIFEST` + `MC_PASS_OBSERVATION` + `MC_PASS_EXECUTION_DONE` | planned-vs-observed table |

Failure set (for the 7-day "failures" count): ENUMERATION_FAILURE,
DEPENDENCY_FAILURE, AUTH_FAILURE, RATE_LIMIT, TEMPORARY_FAILURE,
TERMINAL_FAILURE. SUCCESS_EMPTY and ELIGIBILITY_EMPTY are honest empty
outcomes, not failures.

## Refresh semantics

- Recompute on every new `MC_PASS_CLOSED` for the platform, and on tab
  focus. No polling loop, no cache.
- The 7-day scan is bounded: at 2h cadence a platform closes ~84 passes
  per week; each pass carries a bounded event set. A full recompute is a
  small journal slice read, not a table scan.
- If the journal is unreachable or a platform has no `MC_PASS_CLOSED`
  yet, the tab shows "no pass data" or "event store unreachable". It
  never renders cached numbers as current and never invents a zero.
- WHY-questions open a drawer with the answer plus the linked event ids
  (clickable to the raw journal rows). Every number in an answer names
  its event.

## Honesty rules (inherited from the MC honest-projection pattern)

- Unknown outcomes render as "OUTCOME UNKNOWN, reconciliation pending",
  never as failed, never as zero.
- A pass with no `MC_PASS_CLOSED` yet (mid-run) shows its latest stage
  event ("in EXECUTION since <ts>") and no terminal class.
- Caps shown are the caps from the pass's own `MC_PASS_STARTED` event,
  not today's ramp numbers. A ramp change mid-week does not rewrite
  history.
- The panel never reads prose pass logs. If the prose and the events
  disagree, the events win and the disagreement is itself surfaced as an
  anomaly row (SEQUENCE: anomaly detector).

## What this panel does NOT do

- No controls (no retry, no reconcile, no cancel). Controls stay withheld
  until the witnessed-mutation contracts land; the panel is read-only.
- No editing of caps, schedules, or targeting. Those live in the cron
  bodies and Nolan's directives.
- No cross-platform aggregation beyond per-tab rollups. A future
  "fleet" rollup is out of scope for v1.

## Build order (for the sequencing lane)

1. Journal query helpers: latest-closed-per-platform, 7d-closed-window,
   candidate-decision scan, manifest-vs-observation join. Pure functions
   over journal rows; unit-testable without the UI.
2. Projection builders in the `ping-ui-contract` mission-control slice
   (honest builders; gaps labeled, e.g. unknown-count pending
   ledger-to-journal emission).
3. Panel UI on the existing MC surface, reusing the tab and drawer
   patterns. No new page, no new route family.
