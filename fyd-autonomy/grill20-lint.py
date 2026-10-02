#!/usr/bin/env python3
"""grill-20 escalation-record validator (SI-03).

Validates every record in escalation-log.jsonl against the schema in
escalation-record-template.md:

  - one JSON object per line; unparseable line = violation
  - required fields: ts (parseable ISO-8601), question (non-empty),
    verdict, failed_checks
  - checks schema variants:
      * CANONICAL: the 10 locked checks as bools + check_evidence with a
        non-empty evidence string per check. A bare `true` with no evidence
        is a process violation.
      * NESTED_LEGACY: checks as {check: {"pass": bool, "evidence": "..."}}
        (pre-lock batch records). Each evidence string must be non-empty.
      * EVIDENCE_ONLY: checks missing/empty with evidence carried in
        check_evidence (batch7 disposition record). Each evidence non-empty.
  - verdict/decide <-> failed_checks consistency:
      decide  -> failed_checks must be []
      escalate -> failed_checks must be non-empty
  - verdict=escalate -> cost_of_being_wrong must be a non-empty string
  - legacy verdicts (escalate_resolved_by_owner) and legacy field names
    (timestamp/question->decision) are WARNINGS, not violations, so history
    is never rewritten (read-only validator; it never modifies the log)

Exit 0: all records valid (warnings allowed, counted in summary).
Exit 1: one or more violations; each violation names record index + check.

Usage: python3 grill20-lint.py [path/to/escalation-log.jsonl]
"""

import json
import sys
from datetime import datetime

LOCKED_CHECKS = [
    "locked_invariant",
    "previous_decision",
    "code_evidence",
    "reversible_experiment",
    "safe_default_80",
    "reversible",
    "no_external_effects",
    "no_destructive_mutation",
    "no_new_credential_authority",
    "boundaries_preserved",
]
LOCKED_SET = frozenset(LOCKED_CHECKS)
VERDICTS_CANONICAL = {"decide", "escalate"}
VERDICTS_LEGACY = {"escalate_resolved_by_owner"}  # documented, warnings only


def parse_ts(ts):
    """Parse ISO-8601 (accepts trailing Z). Returns datetime or None."""
    if not isinstance(ts, str) or not ts.strip():
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def nonempty_str(v):
    return isinstance(v, str) and bool(v.strip())


def failed_check_names(failed):
    """Normalize failed_checks entries (str or {"check": str, ...}) to names."""
    names = []
    for f in failed:
        if isinstance(f, str):
            names.append(f)
        elif isinstance(f, dict) and isinstance(f.get("check"), str):
            names.append(f["check"])
        else:
            names.append(None)  # malformed entry
    return names


def validate_record(idx, rec):
    """Returns (violations, warnings): lists of (check_label, message)."""
    V, W = [], []

    def viol(check, msg):
        V.append((check, msg))

    def warn(check, msg):
        W.append((check, msg))

    if not isinstance(rec, dict):
        viol("record", "not a JSON object")
        return V, W

    # --- required fields (with legacy aliases, never rewritten) ---
    ts = rec.get("ts", rec.get("timestamp"))
    if "ts" not in rec and "timestamp" in rec:
        warn("ts", "uses legacy field 'timestamp' instead of 'ts'")
    if parse_ts(ts) is None:
        viol("ts", "missing or unparseable ISO-8601 timestamp: %r" % (ts,))

    question = rec.get("question", rec.get("decision"))
    if "question" not in rec and "decision" in rec:
        warn("question", "uses legacy field 'decision' instead of 'question'")
    if not nonempty_str(question):
        viol("question", "missing or empty")

    verdict = rec.get("verdict")
    if verdict not in VERDICTS_CANONICAL | VERDICTS_LEGACY:
        viol("verdict", "unknown verdict value: %r" % (verdict,))
        verdict_family = None
    elif verdict in VERDICTS_LEGACY:
        warn("verdict", "legacy verdict %r (escalate-family terminal)" % (verdict,))
        verdict_family = "escalate"
    else:
        verdict_family = verdict

    failed = rec.get("failed_checks")
    if not isinstance(failed, list):
        viol("failed_checks", "must be a list, got %s" % type(failed).__name__)
        failed = []
    fnames = failed_check_names(failed)
    if any(n is None for n in fnames):
        viol("failed_checks", "malformed entry (need str or {'check': str})")

    # --- verdict <-> failed_checks consistency ---
    if verdict_family == "decide" and failed:
        viol("failed_checks", "verdict=decide requires failed_checks=[], got %r" % (fnames,))
    if verdict_family == "escalate" and not failed:
        viol("failed_checks", "verdict=escalate requires failed_checks non-empty")

    # --- checks schema variants ---
    checks = rec.get("checks")
    evidence_map = rec.get("check_evidence") if isinstance(rec.get("check_evidence"), dict) else {}
    if not isinstance(checks, dict) or not checks:
        if evidence_map:
            # EVIDENCE_ONLY (batch7 disposition pattern: checks missing/empty,
            # evidence carried in check_evidence)
            warn("checks", "checks missing/empty with evidence in check_evidence; "
                 "validating evidence only")
            for name, ev in evidence_map.items():
                if not nonempty_str(ev):
                    viol(name, "empty evidence string in check_evidence")
            known_checks = set(evidence_map.keys())
        else:
            viol("checks", "missing/empty and no check_evidence: no evidence anywhere")
            known_checks = set()
    elif all(isinstance(v, bool) for v in checks.values()):
        # CANONICAL locked schema
        if set(checks.keys()) != LOCKED_SET:
            viol("checks", "must be exactly the 10 locked checks; got %d: %s"
                 % (len(checks), sorted(checks.keys())))
        for name in LOCKED_CHECKS:
            if name not in evidence_map:
                viol(name, "bare check with no evidence entry in check_evidence")
            elif not nonempty_str(evidence_map[name]):
                viol(name, "empty evidence string in check_evidence")
        known_checks = set(checks.keys())
    elif checks and all(isinstance(v, dict) for v in checks.values()):
        # NESTED_LEGACY: {check: {"pass": bool, "evidence": "..."}}
        warn("checks", "nested legacy schema {pass, evidence}; accepted as evidence-carrying")
        for name, entry in checks.items():
            if not isinstance(entry.get("pass"), bool):
                viol(name, "legacy entry missing bool 'pass'")
            if not nonempty_str(entry.get("evidence")):
                viol(name, "empty evidence string in nested legacy entry")
        known_checks = set(checks.keys())
    else:
        viol("checks", "unrecognized checks schema (mixed bool/dict values)")
        known_checks = set()

    # failed_checks must name checks that exist in this record
    for n in fnames:
        if n is not None and n not in known_checks:
            viol("failed_checks", "failed check %r not a check in this record" % (n,))

    # --- escalate requires cost_of_being_wrong ---
    cobw = rec.get("cost_of_being_wrong")
    if verdict == "escalate" and not nonempty_str(cobw):
        viol("cost_of_being_wrong", "verdict=escalate requires non-empty cost_of_being_wrong")
    if verdict in VERDICTS_LEGACY and not nonempty_str(cobw):
        warn("cost_of_being_wrong", "legacy resolved record lacks cost_of_being_wrong (owner answered)")

    return V, W


def main(argv):
    path = argv[1] if len(argv) > 1 else "escalation-log.jsonl"
    try:
        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines()
    except OSError as e:
        print("FATAL: cannot read %s: %s" % (path, e), file=sys.stderr)
        return 2

    total_viol = 0
    total_warn = 0
    n_records = 0
    for idx, line in enumerate(lines):
        if not line.strip():
            continue
        n_records += 1
        try:
            rec = json.loads(line)
        except json.JSONDecodeError as e:
            print("FAIL record %d: [json] unparseable line: %s" % (idx, e))
            total_viol += 1
            continue
        V, W = validate_record(idx, rec)
        for check, msg in V:
            print("FAIL record %d: [%s] %s" % (idx, check, msg))
        for check, msg in W:
            print("warn record %d: [%s] %s" % (idx, check, msg))
        total_viol += len(V)
        total_warn += len(W)

    print("grill20-lint: %d records, %d violation(s), %d warning(s)"
          % (n_records, total_viol, total_warn))
    return 1 if total_viol else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
