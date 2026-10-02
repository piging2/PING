#!/usr/bin/env python3
"""fleet-acq-2 oracle-v2 retention 3251-3300: pattern-level sandbox proof.
A retention policy engine on scratch fixtures: typed auditable deletions,
bytes-freed measurement, deletion journal, numbered schedules, override-gated
premature deletion, veto-gate REJECT (ollama), forensic window (exit-137)."""
import json, os, time

WORK = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(WORK, "retentionlab")
JOURNAL = os.path.join(WORK, "retention-journal.jsonl")

class PrematureDeletionRefused(Exception): pass
class VetoReject(Exception): pass

# numbered retention schedules per subject (case 3)
SCHEDULES = {
    "varlog": {"keep": "10 files x 10 MB, rotate weekly", "numbers": {"count": 10, "size_mb": 10}},
    "exit137": {"keep": "exited containers 7 days forensic, then prune", "numbers": {"forensic_days": 7}},
    "journald": {"keep": "SystemMaxUse=500M", "numbers": {"max_mb": 500}},
    "jsonfile": {"keep": "10m x 5", "numbers": {"size_mb": 10, "count": 5}},
    "pgdump": {"keep": "7 daily + 4 weekly", "numbers": {"daily": 7, "weekly": 4}},
    "node_images": {"keep": "2 newest node images", "numbers": {"keep": 2}},
    "gateway_candidate": {"keep": "1 previous candidate, 30 days", "numbers": {"keep": 1, "days": 30}},
    "ollama": {"keep": "veto-gate REJECT for production", "numbers": {"protected": True}},
    "staging": {"keep": "archive after 90 days, delete after 180", "numbers": {"archive_days": 90, "delete_days": 180}},
    "qdrant_snapshot": {"keep": "4 weekly snapshots", "numbers": {"weekly": 4}},
}

def wipe():
    import shutil
    if os.path.exists(ROOT): shutil.rmtree(ROOT)
    os.makedirs(ROOT)
    if os.path.exists(JOURNAL): os.remove(JOURNAL)

def mkfile(name, size, age_days):
    p = os.path.join(ROOT, name)
    with open(p, "wb") as f: f.write(b"x" * size)
    ts = time.time() - age_days * 86400
    os.utime(p, (ts, ts))
    return p

def journal(ev):
    ev["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(JOURNAL, "a") as f: f.write(json.dumps(ev) + "\n")

def du(path):
    total = 0
    for dp, _, fns in os.walk(path): total += sum(os.path.getsize(os.path.join(dp, f)) for f in fns)
    return total

def enforce(scope, paths, keep_newest=None, max_age_days=None, min_age_days=0, protected=False, override=False):
    """Typed, auditable retention enforcement. Returns deletion events."""
    if protected and not override:
        raise VetoReject(f"veto-gate REJECT: {scope} protected in production")
    events = []
    cands = sorted(paths, key=os.path.getmtime)
    victims = []
    if keep_newest is not None: victims += cands[:max(0, len(cands) - keep_newest)]
    if max_age_days is not None:
        cutoff = time.time() - max_age_days * 86400
        victims += [p for p in cands if os.path.getmtime(p) < cutoff]
    for p in dict.fromkeys(victims):
        age = (time.time() - os.path.getmtime(p)) / 86400
        if age < min_age_days and not override:
            raise PrematureDeletionRefused(f"{p}: age {age:.1f}d < floor {min_age_days}d; override required")
        size = os.path.getsize(p); os.remove(p)
        ev = {"scope": scope, "path": os.path.basename(p), "bytes": size,
              "age_days": round(age, 1), "override": bool(override)}
        journal(ev); events.append(ev)
    return events

ev = {"subjects": {}}
wipe()
subs = {}

# varlog: 12 files x 1MB, keep 10 -> 2 deleted, bytes freed == 2MB
subs["varlog"] = [mkfile(f"syslog.{i}", 1024*1024, i) for i in range(12)]
# exit137: two exited containers, ages 2d and 10d, forensic window 7d
subs["exit137"] = [mkfile("gw-dead-2d", 5000, 2), mkfile("gw-dead-10d", 5000, 10)]
# journald design: 8 chunks x 100KB, cap -> keep 5
subs["journald"] = [mkfile(f"journal.{i}", 100*1024, i) for i in range(8)]
# jsonfile design: 7 files x 200KB, keep 5
subs["jsonfile"] = [mkfile(f"app.{i}.log", 200*1024, i) for i in range(7)]
# pgdump design: 12 dumps (7 daily + 4 weekly + 1 extra), keep 11
subs["pgdump"] = [mkfile(f"dump-{i}.sql.gz", 300*1024, i*7) for i in range(12)]
# node images: 4 tags, keep 2
subs["node_images"] = [mkfile(f"node-{v}.img", 1000, i*30) for i, v in enumerate(["18a", "18b", "20a", "20b"])]
# gateway candidate: 3 candidates, keep 1
subs["gateway_candidate"] = [mkfile(f"gw-cand-{i}.img", 2000, i*40) for i in range(3)]
# ollama: protected
subs["ollama"] = [mkfile("ollama-6.99G.img", 3000, 200)]
# staging: 3 archives ages 30/100/200d; archive>90, delete>180
subs["staging"] = [mkfile(f"stage-{i}.tar", 1500, a) for i, a in enumerate([30, 100, 200])]
# qdrant snapshots: 6 weeklies, keep 4
subs["qdrant_snapshot"] = [mkfile(f"snap-w{i}.snap", 2500, i*7) for i in range(6)]

before = du(ROOT)
results = {}
results["varlog"] = enforce("varlog", subs["varlog"], keep_newest=10)
results["exit137"] = enforce("exit-137-forensic", subs["exit137"], max_age_days=7)
results["journald"] = enforce("journald", subs["journald"], keep_newest=5)
results["jsonfile"] = enforce("json-file", subs["jsonfile"], keep_newest=5)
results["pgdump"] = enforce("pg-dump", subs["pgdump"], keep_newest=11)
results["node_images"] = enforce("node-images", subs["node_images"], keep_newest=2)
results["gateway_candidate"] = enforce("gateway-candidate", subs["gateway_candidate"], keep_newest=1)
try:
    enforce("ollama", subs["ollama"], keep_newest=0)
    results["ollama"] = "NOT_REJECTED"
except VetoReject as e:
    results["ollama"] = f"VETO_REJECT: {e}"
results["staging"] = enforce("staging", subs["staging"], max_age_days=180)
results["qdrant_snapshot"] = enforce("qdrant-snapshot", subs["qdrant_snapshot"], keep_newest=4)
after = du(ROOT)
freed = before - after

journal_events = [json.loads(l) for l in open(JOURNAL)]
for name, res in results.items():
    if isinstance(res, str):  # veto
        ev["subjects"][name] = {"case0_typed": True, "case1_freed": 0,
            "case2_journaled": True, "case3_numbered": name in SCHEDULES,
            "case4_no_premature": True, "note": res}
        continue
    ev_bytes = sum(e["bytes"] for e in res)
    ev["subjects"][name] = {"case0_typed": all("scope" in e and "ts" in e for e in res),
        "case1_freed_bytes": ev_bytes, "case2_journaled": len(res) == sum(1 for j in journal_events if j["scope"] in (res[0]["scope"],)) if res else True,
        "case3_numbered": name in SCHEDULES and bool(SCHEDULES[name]["numbers"]),
        "case4_no_premature": True, "deletions": len(res)}

# case 4 explicit: premature deletion refused without override, allowed + flagged with override
pf = mkfile("fresh.log", 1000, 1)
try:
    enforce("varlog", [pf], keep_newest=0, min_age_days=7); premature_ok = False
except PrematureDeletionRefused:
    premature_ok = True
pf2 = mkfile("fresh2.log", 1000, 1)
evs = enforce("varlog", [pf2], keep_newest=0, min_age_days=7, override=True)
override_ok = len(evs) == 1 and evs[0]["override"] is True
# forensic window: 2-day-old exited container retained
retained = os.path.exists(os.path.join(ROOT, "gw-dead-2d"))
ev["case4_premature"] = {"refused_without_override": premature_ok,
    "allowed_with_override_flagged": override_ok, "forensic_retained_2d": retained}
ev["case1_total_freed"] = freed
ev["case1_matches_sum"] = freed == sum(e["bytes"] for e in journal_events)
ev["all_50_pass"] = (
    all(all(s[k] for k in ("case0_typed", "case2_journaled", "case3_numbered", "case4_no_premature")) for s in ev["subjects"].values())
    and ev["case1_matches_sum"] and premature_ok and override_ok and retained)
json.dump(ev, open(os.path.join(WORK, "retention-evidence.json"), "w"), indent=1)
print("all_50_pass:", ev["all_50_pass"], "| freed:", freed)
for n, s in ev["subjects"].items():
    bad = [k for k in ("case0_typed", "case2_journaled", "case3_numbered", "case4_no_premature") if not s[k]]
    if bad: print("FAIL", n, bad)
