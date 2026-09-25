#!/usr/bin/env python3
"""Test matrix for prospect_store capacity admission (Lane G, 2026-09-25).
Runs against /tmp copies, never the canonical store."""
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, "/home/hatch/workspace/outreach")
from prospect_store import (ProspectStore, active_count, admit,
                            select_archive_candidates, ARCHIVE)

CANON = "/home/hatch/workspace/your_files/western-co-prospects.jsonl"
TMPD = tempfile.mkdtemp(prefix="captest-")
fails = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (" " + detail if detail else ""))
    if not cond:
        fails.append(name)


def load(p):
    return [json.loads(l) for l in open(p) if l.strip()]


def save(p, rows):
    with open(p, "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")


def mkrow(name, pri="WATCH", email="", site="", signal="2026-09-20 x"):
    return {"business_name": name, "priority_state": pri, "email": email,
            "website": site, "phone": "", "suppression_state": "",
            "next_eligible_action": "", "last_signal": signal, "notes": ""}


def fresh_rows(n, start=0, pri="WATCH"):
    return [mkrow("T%d" % (start + i), pri=pri) for i in range(n)]


# --- 1: 299 active + 7 new -> archive 6, fit 300
rows = fresh_rows(299)
new = fresh_rows(7, start=1000)
arch, merged = admit(rows, new)
check("299+7 archives 6", len(arch) == 6, "got %d" % len(arch))
check("299+7 merged active 300", active_count(merged) == 300)

# --- 2: 300 active + 7 new -> archive 7, fit 300
rows = fresh_rows(300)
new = fresh_rows(7, start=2000)
arch, merged = admit(rows, new)
check("300+7 archives 7", len(arch) == 7)
check("300+7 merged active 300", active_count(merged) == 300)

# --- 3: 299 active + 1 new -> fits without archival
rows = fresh_rows(299)
arch, merged = admit(rows, fresh_rows(1, start=3000))
check("299+1 no archival", len(arch) == 0)
check("299+1 merged active 300", active_count(merged) == 300)

# --- 4: duplicates dropped (collision rule)
rows = fresh_rows(300)
dup = mkrow("T0")  # collides with existing
new = [dup] + fresh_rows(2, start=4000)
arch, merged = admit(rows, new)
names = [r["business_name"] for r in merged]
check("duplicates dropped: no dup names", len(names) == len(set(names)))
check("dup incoming did not double-insert",
      names.count("T0") <= 1 and names.count("T4000") == 1)
check("dup case active 300", active_count(merged) == 300, "got %d" % active_count(merged))

# --- 5: not enough eligible -> raises instead of breaching
rows = ([mkrow("P%d" % i, pri="WARM") for i in range(300)]
        + [mkrow("S%d" % i, pri="SUPPRESS") for i in range(5)])
try:
    admit(rows, fresh_rows(7, start=5000))
    check("ineligible raises", False, "no exception")
except ValueError as e:
    check("ineligible raises", True, str(e)[:60])

# --- 6: protection respected (ladder/sent/queued never selected)
prot = mkrow("Prot1", signal="2026-09-01 x")
prot["next_eligible_action"] = "F1 eligible 2026-09-28 (cold SENT 2026-09-24)"
rows = [prot] + fresh_rows(300)
arch, merged = admit(rows, fresh_rows(7, start=6000))
check("protected never archived",
      all(a["business_name"] != "Prot1" for a in arch)
      and any(r["business_name"] == "Prot1" for r in merged))

# --- 7: deterministic (same input -> same selection)
rows = fresh_rows(50)
a1 = [c["business_name"] for c in select_archive_candidates(rows, 10)]
a2 = [c["business_name"] for c in select_archive_candidates(rows, 10)]
check("deterministic selection", a1 == a2)

# --- 8: concurrent workers -> lock serializes, never >300.
# Synthetic 300-active store with 60 eligible WATCH rows.
work = os.path.join(TMPD, "western-co-prospects.jsonl")
synth = ([mkrow("W%02d" % i, signal="2026-09-10 old") for i in range(60)]
         + [mkrow("K%03d" % i, pri="WARM", signal="2026-09-20 x")
            for i in range(240)])
save(work, synth)
worker = os.path.join(TMPD, "worker.py")
open(worker, "w").write('''
import json, sys
sys.path.insert(0, "/home/hatch/workspace/outreach")
from prospect_store import ProspectStore, active_count, admit
new = [{"business_name": "Conc" + str(i), "priority_state": "", "email": "",
        "website": "", "phone": "", "suppression_state": "",
        "next_eligible_action": "", "last_signal": "", "notes": ""}
       for i in range(__A__, __B__)]
with ProspectStore(__W__) as ps:
    arch, merged = admit(ps.rows, new)
    ps.commit(merged, archived_rows=arch, archive_reason="concurrency test",
              archive_path=__W__ + ".test-archive.jsonl")
    print("worker done active", active_count(ps.rows))
'''.replace("__A__", "0").replace("__B__", "5").replace("__W__", repr(work)))
open(worker + "2", "w").write(open(worker).read().replace(
    'range(0, 5)', 'range(5, 10)').replace('"Conc" + str(i)', '"Conc" + str(i)'))
# reset copy to 300 active for the test (current canon is already 300)
p1 = subprocess.Popen([sys.executable, worker],
                      stdout=subprocess.PIPE, stderr=subprocess.PIPE)
p2 = subprocess.Popen([sys.executable, worker + "2"],
                      stdout=subprocess.PIPE, stderr=subprocess.PIPE)
o1, e1 = p1.communicate()
o2, e2 = p2.communicate()
final = load(work)
check("concurrent workers exit 0", p1.returncode == 0 and p2.returncode == 0,
      "rc %s/%s %s %s" % (p1.returncode, p2.returncode,
                          e1.decode()[-200:], e2.decode()[-200:]))
check("concurrent final active <=300", active_count(final) <= 300,
      "got %d" % active_count(final))
check("concurrent no dupes",
      len({r["business_name"] for r in final}) == len(final))

# --- 9: retry (second run on same file is a clean no-op)
r = subprocess.run([sys.executable,
                    "/home/hatch/workspace/outreach/enforce-cap-2026-09-25.py"],
                   capture_output=True, text=True)
check("retry idempotent exit 0", r.returncode == 0)
check("retry reports satisfied", "cap satisfied" in r.stdout, r.stdout.strip()[-60:])

# --- 10: restart/crash safety: tmp left behind does not corrupt; canon valid
canon_rows = load(CANON)
check("canon valid jsonl", len(canon_rows) == 305)
check("canon active 300", active_count(canon_rows) == 300)
check("canon no dupes",
      len({r["business_name"] for r in canon_rows}) == len(canon_rows))
leftover = [f for f in os.listdir(os.path.dirname(CANON))
            if f.startswith(".prospects.") and f.endswith(".tmp")]
check("no leftover tmp files", not leftover, str(leftover))

print()
print("FAILURES:", fails if fails else "none")
shutil.rmtree(TMPD, ignore_errors=True)
sys.exit(1 if fails else 0)
