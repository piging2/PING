#!/usr/bin/env python3
"""Worker-deliverable validator (BACKLOG_NOLAN item 3).

The SMALLEST scripted gate around the actual worker failure classes seen in
production rounds:
  - counts: worker claims N rows, delivers M != N
    (2026-09-13 false-success boundary: a 32-business capture claimed for a
    SIGTERMed run that captured no file)
  - required deliverable missing: claimed artifact path absent or empty
  - duplicate: duplicate business_name keys inside the delivered rows
    (round-112: 8 rows merged claiming "zero pipeline collisions"; 3 were
    already archived)
  - exclusion violation: a delivered row matches the worker's own stated
    exclusion patterns (franchise / out-of-scope), i.e. the exclusion check
    was claimed but not honored
  - claimed completion without evidence: a claimed action (deduped,
    collision_checked, exclusion_checked, eligibility_verified) names no
    evidence file, or the evidence file is absent/empty
  - schema violation: rows missing required prospect-schema.json fields or
    carrying out-of-enum values (grounded on the jsonl-merge-round53.py
    FIELDS/ENUMS acceptance list, which is the standing merge contract)

Input: a claim MANIFEST (JSON) written by the worker next to its deliverables:
  {
    "worker": "discovery-research",
    "claimed_rows": 5,
    "rows_file": "jsonl-additions-round54.jsonl",
    "required_files": ["round54-summary.md"],
    "claimed_actions": [
      {"action": "deduped", "evidence": "round54-dedup.log"},
      {"action": "collision_checked", "evidence": "round54-collision.out"}
    ],
    "excluded_patterns": ["franchise:", "Carbondale, IL"]
  }
Relative paths resolve against the manifest's directory.

Exit 0 = every check PASS. Exit 1 = at least one check FAIL (lines printed).
WARN lines never fail the gate. Read-only: writes nothing, opens no network.

Real caller (same unit): tandem/distill-sweep.py --mark --require-validation
<manifest> refuses a "distilled" mark when this validator fails. A validator
with no caller is not completion (Nolan's call 2026-09-19).
"""
import json
import os
import re
import sys

HOME = os.path.expanduser("~")
SCHEMA_PATH = os.path.join(HOME, "workspace/outreach/prospect-schema.json")

# The standing merge contract (jsonl-merge-round53.py FIELDS): addition rows
# are validated against these 30 fields, not the full canonical required
# list (conversion_* fields do not exist on additions).
MERGE_FIELDS = ["email", "business_name", "owner_name", "phone", "website",
                "trade", "city", "state", "region", "source",
                "revamp_candidate", "notes", "intel_updated", "website_quality",
                "booking_mechanism", "missed_call_risk", "social_presence",
                "review_velocity", "notable_reviews", "new_filing_signal",
                "stack_signals", "opportunity_primary", "opportunity_secondary",
                "opportunity_evidence", "opportunity_confidence",
                "ai_discoverability", "priority_state", "last_signal",
                "suppression_state", "next_eligible_action"]
ENUMS = {
    "ai_discoverability": {"strong", "moderate", "weak", "unknown", ""},
    "missed_call_risk": {"high", "medium", "low", "unknown", ""},
    "website_quality": {"strong", "moderate", "weak", "unknown", ""},
    "opportunity_primary": {"NEW_BUSINESS_SETUP", "MISSED_CALL_LEAD_CAPTURE",
                            "WEBSITE_REVAMP", "SEO", "AEO_AI_DISCOVERABILITY",
                            "SOCIAL_PRESENCE", "AUTOMATION", "INTEGRATION",
                            "UNKNOWN", ""},
    "opportunity_secondary": {"NEW_BUSINESS_SETUP", "MISSED_CALL_LEAD_CAPTURE",
                              "WEBSITE_REVAMP", "SEO", "AEO_AI_DISCOVERABILITY",
                              "SOCIAL_PRESENCE", "AUTOMATION", "INTEGRATION",
                              "UNKNOWN", ""},
    "opportunity_confidence": {"high", "medium", "low", ""},
    "priority_state": {"HOT", "WARM", "WATCH", "SUPPRESS", ""},
    "revamp_candidate": {"yes", "no", ""},
}


def norm(name):
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def resolve(base_dir, path):
    return path if os.path.isabs(path) else os.path.join(base_dir, path)


def non_empty_file(path):
    return os.path.isfile(path) and os.path.getsize(path) > 0


def main():
    if len(sys.argv) != 2:
        print("usage: validate-worker-deliverable.py MANIFEST.json",
              file=sys.stderr)
        return 2
    manifest_path = sys.argv[1]
    try:
        with open(manifest_path, encoding="utf-8") as f:
            m = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print("FAIL manifest: unreadable: %s" % e)
        return 1

    base = os.path.dirname(os.path.abspath(manifest_path))
    results = []

    def check(name, ok, detail=""):
        results.append((name, ok, detail))
        print("%s %s%s" % ("PASS" if ok else "FAIL", name,
                           (": " + detail) if detail else ""))

    # --- 1. counts: claimed rows vs delivered rows ---
    rows_file = resolve(base, m.get("rows_file", ""))
    rows = []
    rows_err = None
    if not non_empty_file(rows_file):
        rows_err = "rows_file missing or empty: %s" % m.get("rows_file")
    else:
        try:
            with open(rows_file, encoding="utf-8") as f:
                for i, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rows.append(json.loads(line))
                    except json.JSONDecodeError:
                        rows_err = "line %d is not JSON" % i
                        break
        except OSError as e:
            rows_err = "rows_file unreadable: %s" % e
    claimed = m.get("claimed_rows")
    if rows_err:
        check("count", False, rows_err)
    elif not isinstance(claimed, int):
        check("count", False, "manifest has no integer claimed_rows")
    else:
        check("count", len(rows) == claimed,
              "claimed=%d delivered=%d" % (claimed, len(rows)))

    # --- 2. required deliverables present ---
    missing = [p for p in m.get("required_files", [])
               if not non_empty_file(resolve(base, p))]
    check("required_files", not missing,
          "all %d present" % len(m.get("required_files", [])) if not missing
          else "missing/empty: %s" % ", ".join(missing))

    # --- 3. duplicates within the delivered rows ---
    seen = {}
    dups = set()
    for r in rows:
        n = norm(r.get("business_name") if isinstance(r, dict) else None)
        if n in seen:
            dups.add(n)
        seen[n] = True
    check("duplicates", not dups and not any(
        not norm(r.get("business_name")) for r in rows
        if isinstance(r, dict)),
        "no duplicate business_name" if not dups
        else "duplicate: %s" % ", ".join(sorted(dups)))

    # --- 4. exclusion violations against the worker's own stated patterns ---
    patterns = m.get("excluded_patterns", [])
    violations = []
    if patterns:
        for r in rows:
            if not isinstance(r, dict):
                continue
            hay = " ".join(str(r.get(k, "")) for k in
                           ("business_name", "city", "notes", "trade"))
            for p in patterns:
                if p.lower() in hay.lower():
                    violations.append("%s matches %r" %
                                      (r.get("business_name"), p))
                    break
        check("exclusions", not violations,
              "%d patterns, 0 violations" % len(patterns) if not violations
              else "; ".join(violations))
    else:
        print("WARN exclusions: manifest states no excluded_patterns; "
              "skipped (a claimed exclusion_checked action without patterns "
              "fails the evidence check below)")

    # --- 5. claimed actions carry existing, non-empty evidence ---
    bad = []
    actions = m.get("claimed_actions", [])
    for a in actions:
        name = a.get("action", "?") if isinstance(a, dict) else "?"
        ev = a.get("evidence") if isinstance(a, dict) else None
        if not ev:
            bad.append("%s: no evidence path stated" % name)
        elif not non_empty_file(resolve(base, ev)):
            bad.append("%s: evidence missing/empty: %s" % (name, ev))
    if isinstance(actions, list) and any(
            isinstance(a, dict) and a.get("action") == "exclusion_checked"
            for a in actions) and not patterns:
        bad.append("exclusion_checked claimed but excluded_patterns empty")
    check("action_evidence", not bad,
          "all %d actions evidenced" % len(actions) if not bad
          else "; ".join(bad))

    # --- 6. schema: required fields present, enums in range ---
    schema_errs = []
    if not rows_err:
        for i, r in enumerate(rows, 1):
            if not isinstance(r, dict):
                schema_errs.append("row %d: not an object" % i)
                continue
            for f in MERGE_FIELDS:
                if f not in r:
                    schema_errs.append("row %d: missing %s" % (i, f))
            for f, allowed in ENUMS.items():
                if f in r and r[f] not in allowed:
                    schema_errs.append("row %d: bad enum %s=%r" %
                                       (i, f, r[f]))
            if not (r.get("business_name") or "").strip():
                schema_errs.append("row %d: empty business_name" % i)
            if r.get("intel_updated") and not re.match(
                    r"^\d{4}-\d{2}-\d{2}$", r["intel_updated"]):
                schema_errs.append("row %d: bad intel_updated" % i)
    check("schema", not schema_errs,
          "all %d rows valid" % len(rows) if not schema_errs
          else "; ".join(schema_errs[:5]) +
          (" (+%d more)" % (len(schema_errs) - 5) if len(schema_errs) > 5
           else ""))

    failed = [n for n, ok, _ in results if not ok]
    print("VALIDATOR %s (%d/%d checks passed)" %
          ("PASS" if not failed else "FAIL",
           sum(1 for _, ok, _ in results if ok), len(results)))
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
