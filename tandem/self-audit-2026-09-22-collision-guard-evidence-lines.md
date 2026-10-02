# Self-audit note: collision-guard pipeline.md match evidence (2026-09-22)

## The invariant promoted
When check-prospect-collision.py reports a pipeline.md collision, it must
show the agent WHAT matched (line numbers + line text), not just THAT
something matched. Blocking semantics are unchanged: any substring hit
still blocks the merge (exit 1), because real duplicates also live in
prose ("Duplicates re-served: ..." paragraphs). The agent still judges
real-row vs prose-only, but the judgment is now a 2-second read of the
printed lines instead of a manual grep investigation.

## Production evidence (this pass, meta-ai-intel-pass 2026-09-22 ~15:20 MDT)
The guard reported "COLLISION: Roofing Plus -> pipeline.md". The actual
match was the phrase "doing roofing plus repairs" inside the JV Roofing &
Home Repair row's description (pipeline.md L723), a substring false
positive: no "Roofing Plus" business row existed (confirmed: zero JSONL
hits, zero phone/owner hits for (970) 252-3540 / Ed Becker). The agent had
to run three manual greps to disambiguate. Roofing Plus (Montrose roofer,
Ed Becker) was genuinely clear and was staged.

## Reasoning the agent had to do, now removed from the agent
Grepping pipeline.md to find which line the guard's substring matched, to
tell a prose mention apart from a real prospect row.

## Test
3 unit cases, run live against the real 889KB pipeline.md:
1. "Roofing Plus" -> COLLISION, prints L723 (JV Roofing prose, visibly not a
   row for Roofing Plus) and L2642 (the real staged row). Agent clears the
   prose hit on sight.
2. "RER Plumbing and HVAC LLC" -> COLLISION, prints L2626 (real NEW row).
3. "Nonexistent Business XYZ" -> CLEAR.
Exit codes unchanged (1 on any collision, 0 on clear). All pass.

## Automation
`~/workspace/outreach/check-prospect-collision.py`:
- pipeline.md is now read as lines; the substring scan collects up to 3
  (line_number, first-170-chars) matches per name;
- COLLISION output prints the matched lines indented under the hit;
- docstring updated to document the evidence lines and the unchanged
  blocking semantics.
Post-change production check: the 3 unit cases above. Re-running this
pass's 13-name batch shows the only verdict changes vs pre-patch are the 6
names staged to pipeline.md in this same pass: their own new rows (L2640+
) now match, which is correct behavior, and the evidence lines make the
self-match instantly visible. All other verdicts identical; exit codes
unchanged.

## Not promoted (observed, follow-up)
A stricter structured-name match (pipe-delimited row name field) was
considered and rejected: real duplicates also appear only in prose
("Duplicates re-served" paragraphs), so narrowing to row fields would
trade false positives for false negatives. Fail-closed keeps the broad
scan; the evidence lines make the broad scan cheap to judge.
