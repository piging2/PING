#!/usr/bin/env python3
"""H5: Schema compatibility. Parse pg_dump.sql CREATE TABLE for authority_witness
and events; check whether the LEGACY worker's INSERT column lists would succeed
against the real schema (i.e., unsigned rows are writable, not blocked by NOT NULL).
Legacy INSERTs:
  authority_witness (id, witness_root, created_at)
  events (event_id, event_type, timestamp, aggregate_id, aggregate_type, event_data)"""
import re, sys

ddl = open("/home/nolan/worktrees/ping-harvest-12h/pg_dump.sql", encoding="utf-8").read()

def get_table(name):
    m = re.search(rf"CREATE TABLE public\.{name} \((.*?)\n\);", ddl, re.S)
    assert m, f"table {name} not found"
    cols = {}
    for line in m.group(1).splitlines():
        cm = re.match(r"\s*(\w+)\s+[\w() ]+", line)
        if cm:
            col = cm.group(1)
            cols[col] = "NOT NULL" in line.upper()
    return cols

aw = get_table("authority_witness")
ev = get_table("events")
print("authority_witness columns (name: not_null):", aw)
print("events columns (name: not_null):", {k: v for k, v in ev.items()})

ok = True
for col in ["id", "witness_root", "created_at"]:
    if col not in aw:
        print(f"ASSERT-FAIL: authority_witness missing col {col}"); ok = False
# legacy supplies id itself; the other two must be nullable or defaulted
if aw.get("witness_root"): print("NOTE: witness_root NOT NULL (legacy still supplies it)"); 
if aw.get("created_at"): print("NOTE: created_at NOT NULL but has DEFAULT now()")
for col in ["event_id", "event_type", "timestamp", "aggregate_id", "aggregate_type", "event_data"]:
    if col not in ev:
        print(f"ASSERT-FAIL: events missing col {col}"); ok = False

# The sovereignty-critical columns must be NULLABLE, else legacy unsigned rows are blocked
for col in ["artifact_id", "witness_signature", "witness_timestamp"]:
    if aw.get(col):
        print(f"BLOCKED: {col} is NOT NULL -> legacy unsigned insert would fail")
        ok = False
    else:
        print(f"WRITABLE-UNSIGNED: authority_witness.{col} is nullable -> legacy insert succeeds without it")

print("H5-RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
