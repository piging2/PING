#!/usr/bin/env python3
"""H3: Legacy behavior capture. Stub psycopg2 + runtime.configuration, import the
LEGACY root witness_worker, run its write paths against a fake connection, and
capture the exact SQL + parameters. No database touched.
Asserts: writes go to `authority_witness` and `events`; ids are uuid4 (identity
authority bypass); NO signature / verified / algorithm fields anywhere."""
import re, sys, types, uuid

ROOT = "/home/nolan/worktrees/ping-harvest-12h"
sys.path.insert(0, ROOT)

CAPTURED = []

class FakeCursor:
    def execute(self, sql, params=None):
        CAPTURED.append({"sql": " ".join(sql.split()), "params": params})
    def close(self): pass

class FakeConn:
    def cursor(self): return FakeCursor()
    def commit(self): CAPTURED.append({"commit": True})
    def close(self): pass

fake_psycopg2 = types.ModuleType("psycopg2")
fake_psycopg2.connect = lambda **kw: FakeConn()
sys.modules["psycopg2"] = fake_psycopg2

# Stub runtime.configuration so no real config/DB code executes.
fake_runtime = types.ModuleType("runtime"); fake_runtime.__path__ = []
fake_cfg = types.ModuleType("runtime.configuration")
fake_cfg.get_postgres_config = lambda: {"host": "stubbed", "dbname": "stubbed"}
fake_runtime.configuration = fake_cfg
sys.modules["runtime"] = fake_runtime
sys.modules["runtime.configuration"] = fake_cfg

import witness_worker as legacy  # the LEGACY root module

UUID4_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)

w = legacy.WitnessWorker({"host": "stubbed"})

# 1. store_witness
CAPTURED.clear()
w.store_witness({"witness_root": "abc123", "replay_fingerprint": "fp", "aggregate_id": "agg-1"})
# 2. emit_witness_created_event
w.emit_witness_created_event("src-evt-1", "agg-1", "doc-1",
                             {"witness_root": "abc123", "replay_fingerprint": "fp", "aggregate_id": "agg-1"})
# 3. full handler path
w.handle_replay_executed({
    "event_id": "evt-1", "aggregate_id": "agg-2",
    "event_data": {"document_id": "doc-2", "replay_fingerprint": "fp2"},
})

ok = True
stmts = [c for c in CAPTURED if "sql" in c]
for s in stmts:
    print("SQL:", s["sql"][:100], "| params:", str(s["params"])[:160])

tables = {"authority_witness": 0, "events": 0}
for s in stmts:
    if "INSERT INTO authority_witness" in s["sql"]: tables["authority_witness"] += 1
    if "INSERT INTO events" in s["sql"]: tables["events"] += 1
print("table hits:", tables)
if tables["authority_witness"] == 0 or tables["events"] == 0:
    print("ASSERT-FAIL: legacy worker did not write to expected tables"); ok = False

blob = str(CAPTURED)
for forbidden in ["signature", "verified", "ed25519", "public_key"]:
    if forbidden in blob.lower():
        print(f"ASSERT-FAIL: legacy write path mentions '{forbidden}'"); ok = False

ids = re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", blob, re.I)
print(f"uuid4-formatted ids emitted in captured writes: {len(ids)}")
if len(ids) == 0:
    print("ASSERT-FAIL: expected uuid4 ids (identity-authority bypass evidence)"); ok = False

evt_inserts = [s for s in stmts if "INSERT INTO events" in s["sql"]]
for s in evt_inserts:
    p = s["params"]
    if p[1] != "WITNESS_CREATED":
        print("ASSERT-FAIL: events insert is not WITNESS_CREATED"); ok = False
print("WITNESS_CREATED events-table inserts:", len(evt_inserts))

print("H3-RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
