# Self-audit 2026-09-26: future-dated newness claims excluded from evidence set

## Production evidence (run 20260926-030517, b-new-business-radar)

Kooler Garage Doors entry: "Ribbon cutting set for Nov 10 celebrating
opening, founder said 'opened the Grand Junction location in October'."
No year on the date. The deterministic classifier (`newness_evidence.py`,
run_date 2026-09-24) was probed with the explicit-year form:

- "Grand opening ribbon cutting set for November 10, 2026" -> OK,
  "dated newness evidence within 90 days of 2026-09-24".

A date AFTER the run date passed the gate as in-window newness. The gate
only rejected dates older than the 90-day floor; nothing rejected dates
in the future. A future celebration cannot show the business opened in
the last 60-90 days.

(The entry itself was already killed by the collision guard: Kooler
Garage Doors is tracked in pipeline.md. The gate defect is independent
of that outcome and would have produced a false radar hit on any
untracked business with a future-dated announcement.)

## Invariant promoted

**A newness date after the run date is not opening evidence.** In
`classify_newness`, dates > run_date are now excluded from the evidence
set before classification; the entry stands or falls on its past dates
alone. Exclusion (not WINDOW_FAIL): a future grand opening alongside a
genuine in-window SOS filing still passes on the filing; a future date
plus an aged formation date still WINDOW_FAILs on the aged date; a
future date alone -> INSUFFICIENT. The reason string now notes how many
future-dated claims were excluded, so the audit trail stays legible.

## Tests

3 new cases in `tandem/tests/test-newness-evidence.py` (cases 14-16:
future-only -> INSUFFICIENT; in-window + future -> OK; aged + future ->
WINDOW_FAIL). All 14 pre-existing cases still pass; full suite green.

## Action taken

- `tandem/newness_evidence.py`: future-date exclusion in
  `classify_newness` with a code comment citing this run.
- `tandem/tests/test-newness-evidence.py`: 3 new unit cases, suite green.
- No agent-side reasoning needed anymore: the machinery owns it.

## Not promoted this run (recorded for later)

d-segment-deep-dive picked septic as the "least covered" segment on two
consecutive passes (20260925-210442 and 20260926-030844), both returning
~100% already-tracked names (12/12 this run: 9 collisions + 3
name-variants; Rooter-Man franchise re-proposal excluded per the
2026-09-13 no-franchises rule). The brief has no memory of recent
segment picks. Candidate invariant: feed the d brief the last N covered
segments as negative signals so it rotates. Left as a note, not a
change: it alters brief assembly (contract-adjacent), and the discovery
lane already carries segment-pick cross-check notes for this. Revisit
after a third consecutive same-segment pick.
