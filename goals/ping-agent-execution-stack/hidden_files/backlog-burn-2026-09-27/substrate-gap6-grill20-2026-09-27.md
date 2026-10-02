# Substrate Gap 6 ledger — grill-20 record validator + 2026-10-04 audit tooling

Date: 2026-09-27. Worker: backlog-burn subagent (Gap 6).
Source: substrate-recon-2026-09-27.md Gap 6; escalation-record-template.md (grill-20, locked 2026-09-24).

## Deliverables (both standalone, stdlib only, untracked operator tools)

1. `~/workspace/fyd-autonomy/grill20-lint.py`
   Validates every record in `escalation-log.jsonl` against the template schema:
   JSON-parseable line; ts parseable ISO-8601; question non-empty; verdict in
   {decide, escalate} (+ legacy `escalate_resolved_by_owner` as documented
   escalate-family terminal); checks schema variants:
   - CANONICAL: exactly the 10 locked checks as bools, non-empty evidence string
     per check in check_evidence (a bare true with no evidence = violation)
   - NESTED_LEGACY: {check: {pass, evidence}} with non-empty evidence each
   - EVIDENCE_ONLY: checks missing/empty but check_evidence present (batch7 pattern)
   verdict/decide requires failed_checks=[]; verdict/escalate requires
   failed_checks non-empty; verdict=escalate requires non-empty
   cost_of_being_wrong. Legacy field names (timestamp, decision) and legacy
   schema are WARNINGS, never violations: the validator is read-only and never
   rewrites history. Exit 0 on clean (warnings counted), exit 1 naming
   `record <index>: [<check>] <reason>` per violation.

2. `~/workspace/fyd-autonomy/weekly-audit.py`
   SI-03 weekly audit skeleton for the 2026-10-04 audit. Takes --log, --messages,
   --start/--end (user tz), --out. Deterministic matching contract (no LLM):
   EXPLICIT (record_ref index in window) or EXACT (normalized question equality)
   -> clean MATCH; CONTAINMENT (normalized substring, shorter side >= 30 chars)
   -> WEAK_MATCH for human review, not counted clean; else UNMATCHED.
   Report: clean matches, weak matches, PROCESS VIOLATIONS (Nolan-directed
   questions with no record), log records with no message (decide = expected;
   escalate = WARNING the question extract is incomplete). Markdown + JSON output.

## Evidence

- `python3 -m py_compile` on both: OK.
- Lint on current log: `grill20-lint.py escalation-log.jsonl` -> exit 0,
  "17 records, 0 violation(s), 6 warning(s)". Warnings are the two known legacy
  records: #1 (batch5, timestamp/decision field names, nested {pass,evidence}
  schema — evidence present for all 10 nested checks, failed_checks names all
  resolve to checks keys) and #5 (batch7, escalate_resolved_by_owner verdict,
  checks absent with check_evidence carrying all 10 locked checks non-empty,
  no cost_of_being_wrong because Nolan answered). No bare-true or empty-evidence
  violations in the live log.
- Falsification: 4-record synthetic bad log -> exit 1 with exactly the intended
  faults, each naming record index + check:
  record 0 [reversible] bare check with no evidence entry;
  record 1 [safe_default_80] empty evidence string;
  record 2 [failed_checks] verdict=decide requires failed_checks=[];
  record 3 [cost_of_being_wrong] verdict=escalate requires non-empty.
- Audit demo: `weekly-audit.py --demo` on fully synthetic input -> 1 clean match
  (explicit), 1 VIOLATION (tagline question, no record), 2 log-only decide records,
  exit 0. Weak-match path verified separately (substring -> WEAK_MATCH, not clean).
  --out writes both .md and .json. Ran against the real log for the 2026-09-27
  window with an empty corpus: 8 records in window, no violations, escalate
  records correctly flagged as warnings pending the message corpus.

## What the 2026-10-04 run needs (documented in weekly-audit.py docstring)

1. Read-only `escalation-log.jsonl`.
2. A message-extract JSONL compiled by the INDEPENDENT auditor (not the engine
   that filed the records) from daily notes ~/memory/2026-09-28..2026-10-04.md
   plus main-chat excerpts — every Nolan-directed question as
   {"source","ts","kind":"nolan_directed_question","question","record_ref"}.
3. Window 2026-09-28T00:00:00 .. 2026-10-05T00:00:00 (user tz).

## Conventions

No owner/convention doc exists in fyd-autonomy/ (only benchmark/README.md, not
applicable), so no local convention to follow beyond the template schema itself.
Tools are untracked, no commits made per task. Log never written (read-only).
No pushes, no HPP original contact, no credentials, no broad process kills.

## Verdict

GAP6-IMPL VERIFIED
