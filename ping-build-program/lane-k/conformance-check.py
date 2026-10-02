#!/usr/bin/env python3
"""Lane K failure-taxonomy conformance checker.

A connector (or BCQ's test kit) runs this to prove its failure records emit the
canonical taxonomy correctly. Two jobs:

1. SPEC SELF-CHECK: FAILURE-TAXONOMY.md carries the closed set of 13 classes,
   the decision table lists all 13, and every class has the required subsections.
2. RECORD CHECK: each failure record in the fixture file (or records piped in)
   carries a closed-set class, required fields, and no secrets; red-team
   misclassification patterns are flagged.

Usage:
    python3 conformance-check.py                 # self-check + built-in fixtures
    python3 conformance-check.py records.jsonl   # self-check + your records

Exit 0 = all checks pass. Exit 1 = conformance failure.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = HERE / "FAILURE-TAXONOMY.md"
FIXTURES = HERE / "conformance-fixtures.jsonl"

CLASSES = [
    "AUTH_REQUIRED", "AUTH_EXPIRED", "PERMISSION_DENIED", "RATE_LIMITED",
    "SOURCE_UNAVAILABLE", "SOURCE_CHANGED", "SCHEMA_CHANGED",
    "INVALID_PAYLOAD", "UNSUPPORTED", "CONFLICT", "TIMEOUT",
    "TRANSIENT", "PERMANENT",
]
CLASS_SECTIONS = [f"2.{i}" for i in range(1, 14)]

REQUIRED_FIELDS = [
    "record_type", "class", "connector", "connector_version", "source_id",
    "operation", "attempt", "max_attempts", "started_at", "failed_at",
    "duration_ms", "provider_signal", "detail_redacted", "terminal",
    "dead_lettered",
]

# Red-team: provider signals that MUST NOT be classified as retryable weather.
_AUTH_SIGNALS = re.compile(r"invalid_grant|expired_token|invalid_token|revoked|unauthorized|401", re.I)
# Secret patterns that must never appear in redacted free text or handles.
_SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|token|secret|password|passwd|bearer|session|cookie)\s*[:=]\s*[A-Za-z0-9\-_.~+/=]{8,}"),
    re.compile(r"sk-[A-Za-z0-9]{8,}"),
    re.compile(r"ghp_[A-Za-z0-9]{8,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{8,}"),
]
# Retryable classes under the taxonomy. Everything else must be terminal.
RETRYABLE = {"RATE_LIMITED", "SOURCE_UNAVAILABLE", "TIMEOUT", "TRANSIENT", "CONFLICT", "AUTH_EXPIRED"}

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, note: str = "") -> None:
    results.append((name, ok, note))


# ---------------------------------------------------------------- spec self-check
def spec_self_check() -> None:
    text = SPEC.read_text(encoding="utf-8")
    check("spec: file exists and is nonempty", len(text) > 5000, f"{len(text)} bytes")
    m = re.search(r"v(\d+\.\d+\.\d+)", text)
    check("spec: explicit semver version", bool(m), m.group(0) if m else "no semver found")
    for sec, cls in zip(CLASS_SECTIONS, CLASSES):
        found = re.search(rf"^###\s+{re.escape(sec)}\s+{re.escape(cls)}\b", text, re.M)
        check(f"spec: section {sec} defines {cls}", bool(found))
        if found:
            body = text[found.end(): found.end() + 4000]
            for field in ("Exact meaning", "Retryable", "Policy", "Evidence required", "MUST NOT", "Agent reasoning", "Mappings"):
                check(f"spec: {cls} documents '{field}'", field in body)
    # decision table carries all 13
    table = text[text.find("## 3."): text.find("## 4.")]
    for cls in CLASSES:
        check(f"spec: decision table lists {cls}", f"| {cls} " in table)
    # record format + invariant + governance present
    check("spec: failure RECORD format defined", "record_type" in text and "ping.connector.failure.v1" in text)
    check("spec: never-silent-empty invariant stated", "NEVER" in text and "silent empty success" in text)
    check("spec: governance/drift-rejection stated", "taxonomy drift" in text.lower() or "GOVERNANCE" in text)
    check("spec: program-history proof scenarios present", "Appendix C" in text)


# ---------------------------------------------------------------- record check
def record_check(rec: dict, label: str) -> None:
    cls = rec.get("class")
    check(f"{label}: class is closed-set", cls in CLASSES, f"class={cls!r}")
    for f in REQUIRED_FIELDS:
        check(f"{label}: field '{f}' present", f in rec)
    if not isinstance(rec.get("record_type"), str) or not rec.get("record_type", "").startswith("ping.connector.failure."):
        check(f"{label}: record_type namespaced", False, rec.get("record_type"))
    ps = rec.get("provider_signal") or {}
    check(f"{label}: provider_signal has http_status|native_code|errno",
          any(k in ps for k in ("http_status", "native_code", "errno")),
          f"keys={sorted(ps.keys())}")
    for key in ("detail_redacted", "credential_handle"):
        val = str(rec.get(key, ""))
        hits = [p.pattern for p in _SECRET_PATTERNS if p.search(val)]
        check(f"{label}: no secrets in '{key}'", not hits, f"matched={hits}" if hits else "")
    # red-team: auth signals must not be classified as retryable weather
    native = str(ps.get("native_code", "")) + " " + str(rec.get("detail_redacted", ""))
    if cls in ("TRANSIENT", "TIMEOUT") and _AUTH_SIGNALS.search(native):
        check(f"{label}: RED-TEAM auth signal not misclassified as {cls}", False,
              "auth-looking signal under a retryable class")
    else:
        check(f"{label}: RED-TEAM auth signal not misclassified as retryable weather", True)
    # red-team: non-retryable classes must be terminal
    if cls not in RETRYABLE and cls in CLASSES:
        check(f"{label}: non-retryable class {cls} is terminal",
              rec.get("terminal") is True, f"terminal={rec.get('terminal')}")
    # red-team: TIMEOUT write without side_effect_unknown flag is a duplicate risk
    if cls == "TIMEOUT" and rec.get("operation", "").startswith(("create", "write", "send", "post")):
        check(f"{label}: non-idempotent TIMEOUT carries side_effect_unknown",
              "side_effect_unknown" in rec, "missing flag")


def load_fixture_records() -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            line = line.strip()
            if line:
                out.append((f"{path.name}#{i}", json.loads(line)))
        return out
    if FIXTURES.exists():
        for i, line in enumerate(FIXTURES.read_text(encoding="utf-8").splitlines(), 1):
            line = line.strip()
            if line and not line.startswith("#"):
                out.append((f"fixture#{i}", json.loads(line)))
    return out


def main() -> int:
    spec_self_check()
    recs = load_fixture_records()
    if recs:
        for label, rec in recs:
            record_check(rec, label)
    else:
        check("records: fixture file present", False, str(FIXTURES))
    fails = [r for r in results if not r[1]]
    for name, ok, note in results:
        print(("PASS " if ok else "FAIL ") + name + (f" -- {note}" if note and not ok else ""))
    print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
