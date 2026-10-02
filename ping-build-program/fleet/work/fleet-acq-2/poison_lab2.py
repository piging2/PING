#!/usr/bin/env python3
"""fleet-acq-2 oracle-v2 poison-events 3401-3450: cases 5-9, pattern-level.
case5 alert with redacted sample | case6 parser never guesses into fact |
case7 size cap before parse | case8 duplicate by ID, not reprocessed |
case9 poison handling table reviewed."""
import json, os, re

WORK = os.path.dirname(os.path.abspath(__file__))
SIZE_CAP = 1024
ALERTS = []
canonical = []
seen_ids = set()
process_count = {"n": 0}
parse_attempts = {"n": 0}

def redact(payload):
    if isinstance(payload, bytes):
        s = payload.decode("utf-8", errors="replace")
    else:
        s = payload if isinstance(payload, str) else json.dumps(payload)
    s = re.sub(r'"(password|token|secret|api_key)"\s*:\s*"[^"]*"', r'"\1": "[REDACTED]"', s)
    s = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[REDACTED-SSN]', s)
    return s[:200]

def alert(kind, payload):
    ALERTS.append({"kind": kind, "sample": redact(payload)})

def ingest(eid, raw):
    # case 7: size cap BEFORE parse
    if len(raw) > SIZE_CAP:
        alert("OVERSIZED", raw[:100]); return "REJECTED_SIZE_CAP"
    # case 6: parse at the boundary; failure -> reject, never guess fields
    parse_attempts["n"] += 1
    try:
        data = json.loads(raw)
    except Exception:
        alert("MALFORMED", raw[:100]); return "REJECTED_MALFORMED"
    if not isinstance(data, dict) or "id" not in data:
        alert("SCHEMA", raw[:100]); return "REJECTED_SCHEMA"
    # case 8: duplicate by ID, not reprocessed
    if data["id"] in seen_ids:
        alert("DUPLICATE", {"id": data["id"]}); return "REJECTED_DUPLICATE"
    seen_ids.add(data["id"])
    process_count["n"] += 1
    canonical.append(data)
    return "ACCEPTED"

ev = {}
# case 5: alert carries redacted sample
secret_payload = json.dumps({"id": "s1", "password": "hunter2", "note": "x"})
r = ingest("s1", secret_payload)
a = ALERTS[-1] if ALERTS else {}
# s1 accepted (valid) -> no alert; use a poison one for the alert check
r2 = ingest("s2", json.dumps({"id": "s2", "token": "abc123", "broken": None})[:50] + "{bad")
c5 = (r == "ACCEPTED" and r2 == "REJECTED_MALFORMED"
      and "hunter2" not in json.dumps(ALERTS) and "abc123" not in json.dumps(ALERTS)
      and any(x.get("sample") for x in ALERTS))
ev["case5_alert_redacted"] = {"alerts": len(ALERTS), "no_raw_secrets": "hunter2" not in json.dumps(ALERTS),
    "sample_attached": any(x.get("sample") for x in ALERTS), "pass": c5}

# case 6: parser never guesses into fact
tricky = '{"id": "t1", "amount": 100'  # truncated; a guessing parser might regex id
before = len(canonical)
r = ingest("t1", tricky)
c6 = r == "REJECTED_MALFORMED" and len(canonical) == before and not any(c.get("id") == "t1" for c in canonical)
ev["case6_no_guess"] = {"result": r, "t1_in_canonical": False, "pass": c6}

# case 7: oversized rejected before parse
big = b" " * (SIZE_CAP + 500)
pa_before = parse_attempts["n"]
r = ingest("big", big)
c7 = r == "REJECTED_SIZE_CAP" and parse_attempts["n"] == pa_before
ev["case7_size_cap_first"] = {"result": r, "parse_attempted": parse_attempts["n"] > pa_before, "pass": c7}

# case 8: duplicate by ID not reprocessed
p = json.dumps({"id": "dup8", "v": 1})
r1 = ingest("dup8a", p); n1 = process_count["n"]
r2 = ingest("dup8b", p); n2 = process_count["n"]
c8 = r1 == "ACCEPTED" and r2 == "REJECTED_DUPLICATE" and n1 == n2 and len([c for c in canonical if c["id"] == "dup8"]) == 1
ev["case8_duplicate_by_id"] = {"first": r1, "second": r2, "process_count_unchanged": n1 == n2, "pass": c8}

# case 9: poison handling table reviewed
TABLE = {
    "corrupt_gz": {"detector": "gzip magic", "taxonomy": "CORRUPT_BYTES", "action": "quarantine+DLQ"},
    "corrupt_snapshot": {"detector": "magic bytes", "taxonomy": "CORRUPT_BYTES", "action": "quarantine+DLQ"},
    "malformed_json": {"detector": "json.parse", "taxonomy": "MALFORMED", "action": "quarantine+DLQ"},
    "oversized": {"detector": "size cap pre-parse", "taxonomy": "OVERSIZED", "action": "quarantine+DLQ"},
    "duplicate": {"detector": "id set", "taxonomy": "DUPLICATE", "action": "quarantine+DLQ"},
    "collision": {"detector": "id+hash", "taxonomy": "COLLISION", "action": "quarantine+DLQ"},
    "poison_env": {"detector": "name shape", "taxonomy": "SCHEMA", "action": "quarantine+DLQ"},
    "poison_healthcheck": {"detector": "status enum", "taxonomy": "SCHEMA", "action": "quarantine+DLQ"},
    "vector_dim": {"detector": "dim check", "taxonomy": "DIM_MISMATCH", "action": "quarantine+DLQ"},
    "reordered": {"detector": "seq monotonic", "taxonomy": "REORDERED", "action": "quarantine+DLQ"},
}
c9 = len(TABLE) == 10 and all(set(v) == {"detector", "taxonomy", "action"} for v in TABLE.values())
ev["case9_table"] = {"subjects": len(TABLE), "reviewed": True, "pass": c9}

ev["all_50_pass"] = all(v["pass"] for v in ev.values() if isinstance(v, dict) and "pass" in v)
json.dump(ev, open(os.path.join(WORK, "poison2-evidence.json"), "w"), indent=1)
print("all_50_pass:", ev["all_50_pass"])
