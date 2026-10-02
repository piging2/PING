#!/usr/bin/env python3
"""DECISION shard-3 generator: 250 definitions, D-753..D-1002."""
import sys, os, ast, json, subprocess, shutil

SHARD = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SHARD)

# 1. AST-validate every add() call carries 18 fields
files = ["dec_common.py", "theme6_addr.py", "theme7_claim.py", "theme8_golden.py",
         "theme9_bodytext.py", "theme10_td002.py"]
bad = []
for f in files:
    tree = ast.parse(open(os.path.join(SHARD, f)).read())
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            fn = node.func
            if isinstance(fn, ast.Name) and fn.id == "add" and len(node.args) + len(node.keywords) != 18:
                bad.append((f, node.lineno))
if bad:
    print("MALFORMED add() CALLS:", bad)
    sys.exit(1)
print(f"AST OK: all add() calls carry 18 fields across {len(files)} files.")

# 2. Import themes (populates dec_common.items)
import dec_common
import theme6_addr, theme7_claim, theme8_golden, theme9_bodytext, theme10_td002

ids = sorted(d["id"] for d in dec_common.items)
expect = [f"D-{i}" for i in range(753, 1003)]
missing = [i for i in expect if i not in ids]
extra = [i for i in ids if i not in expect]
dups = sorted({i for i in ids if ids.count(i) > 1})
assert not missing and not extra and not dups, {"missing": missing[:10], "extra": extra[:10], "dups": dups[:10]}
assert len(dec_common.items) == 250
print("ID range OK: 250 records, D-753..D-1002, no gaps, no dups, no collisions.")

# 3. Re-list claim immediately before writing (scan .claim/owner markers)
import glob
foreign = []
for owner in glob.glob(os.path.expanduser("~/workspace/fyd-factory/missions/decision/*/.claim/owner")):
    txt = open(owner).read()
    if "wave2-gen-9b2f35ec" not in txt:
        foreign.append(owner)
assert not foreign, f"foreign claims appeared: {foreign}"
mine = open(os.path.expanduser("~/workspace/fyd-factory/missions/decision/shard-3/.claim/owner")).read()
assert "wave2-gen-9b2f35ec" in mine, "shard-3 claim lost before generation"
print("Re-list OK: decision/shard-3 owned by wave2-gen-9b2f35ec, no foreign claims.")

# 4. Emit: validates, appends backlog, writes results.jsonl + SUMMARY.md + SHARD-LOG.md
dec_common.emit(3, 753, 1002, "wave2-gen-9b2f35ec", SHARD)

# 5. definitions.jsonl: explicit definitions artifact (same 250 records as results.jsonl)
shutil.copy(os.path.join(SHARD, "results.jsonl"), os.path.join(SHARD, "definitions.jsonl"))
n = sum(1 for _ in open(os.path.join(SHARD, "definitions.jsonl")))
assert n == 250, f"definitions.jsonl has {n} lines"
print("definitions.jsonl written (250 records).")
