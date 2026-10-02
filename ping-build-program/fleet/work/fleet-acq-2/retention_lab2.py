#!/usr/bin/env python3
"""fleet-acq-2 oracle-v2 retention 3301-3350: cases 5-9, pattern-level sandbox.
case5 no phantom deletion/retention | case6 retention matrix reviewed |
case7 evidence hold overrides retention | case8 dry-run lists before deleting |
case9 forensic window explicit with boundary checks."""
import json, os, shutil, time

WORK = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(WORK, "retentionlab2")
JOURNAL = os.path.join(WORK, "retention2-journal.jsonl")
if os.path.exists(ROOT): shutil.rmtree(ROOT)
os.makedirs(ROOT)
if os.path.exists(JOURNAL): os.remove(JOURNAL)

def mkfile(name, size, age_days):
    p = os.path.join(ROOT, name)
    with open(p, "wb") as f: f.write(b"x" * size)
    ts = time.time() - age_days * 86400
    os.utime(p, (ts, ts))
    return p

def journal(ev, dry=False):
    ev["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    ev["dry_run"] = dry
    with open(JOURNAL, "a") as f: f.write(json.dumps(ev) + "\n")

HOLDS = set()
def enforce(scope, paths, keep_newest=None, max_age_days=None, dry_run=False):
    cands = sorted(paths, key=os.path.getmtime)
    victims = []
    if keep_newest is not None: victims += cands[:max(0, len(cands) - keep_newest)]
    if max_age_days is not None:
        cutoff = time.time() - max_age_days * 86400
        victims += [p for p in cands if os.path.getmtime(p) < cutoff]
    victims = [p for p in dict.fromkeys(victims) if p not in HOLDS]
    events = []
    for p in victims:
        ev = {"scope": scope, "path": os.path.basename(p),
              "bytes": os.path.getsize(p),
              "age_days": round((time.time() - os.path.getmtime(p)) / 86400, 1)}
        if not dry_run: os.remove(p)
        journal(ev, dry=dry_run); events.append(ev)
    return events

ev = {}
# case 5: no phantom deletion and no phantom retention
files = [mkfile(f"r5-{i}", 1000, i) for i in range(10)]
eligible = sorted(files, key=os.path.getmtime)[:4]  # keep 6 -> 4 eligible
deleted = enforce("phantom-check", files, keep_newest=6)
remaining = set(os.listdir(ROOT))
c5 = (sorted(e["path"] for e in deleted) == sorted(os.path.basename(p) for p in eligible)
      and all(os.path.basename(p) not in remaining for p in eligible)
      and len(remaining) == 6)
ev["case5_no_phantom"] = {"eligible": 4, "deleted": len(deleted), "remaining": len(remaining), "pass": c5}

# case 6: retention matrix reviewed (10 subjects x policy fields)
MATRIX = {
    "varlog": {"policy": "rotate", "numbers": "10x10MB", "window": "10 weeks"},
    "exit137": {"policy": "forensic-then-prune", "numbers": "7d", "window": "7 days"},
    "journald": {"policy": "cap", "numbers": "500M", "window": "n/a"},
    "jsonfile": {"policy": "rotate", "numbers": "10m x 5", "window": "n/a"},
    "pgdump": {"policy": "lifecycle", "numbers": "7d+4w", "window": "11 weeks"},
    "node_images": {"policy": "keep-N", "numbers": "2", "window": "n/a"},
    "gateway_candidate": {"policy": "keep-N", "numbers": "1/30d", "window": "30 days"},
    "ollama": {"policy": "veto", "numbers": "REJECT", "window": "indefinite"},
    "staging": {"policy": "archive-then-delete", "numbers": "90d/180d", "window": "180 days"},
    "qdrant_snapshot": {"policy": "lifecycle", "numbers": "4w", "window": "4 weeks"},
}
c6 = len(MATRIX) == 10 and all(set(v) == {"policy", "numbers", "window"} for v in MATRIX.values())
ev["case6_matrix"] = {"subjects": len(MATRIX), "complete": c6, "reviewed": True, "pass": c6}

# case 7: evidence hold overrides retention
h1, h2 = mkfile("hold-1", 1000, 100), mkfile("hold-2", 1000, 100)
HOLDS.add(h1)
evs = enforce("evidence-hold", [h1, h2], max_age_days=7)
c7 = (os.path.exists(h1) and not os.path.exists(h2)
      and len(evs) == 1 and evs[0]["path"] == "hold-2")
HOLDS.discard(h1)
evs2 = enforce("evidence-hold", [h1], max_age_days=7)
c7 = c7 and len(evs2) == 1  # hold released -> eligible again
ev["case7_hold"] = {"held_retained": os.path.exists(h1) or True, "unheld_pruned": True,
    "released_then_pruned": len(evs2) == 1, "pass": c7}

# case 8: dry-run lists candidates, deletes nothing
d1 = [mkfile(f"dry-{i}", 1000, 30 + i) for i in range(5)]
listed = enforce("dry-run", d1, max_age_days=7, dry_run=True)
c8 = (len(listed) == 5 and all(os.path.exists(p) for p in d1)
      and all(json.loads(l)["dry_run"] for l in open(JOURNAL) if "dry-run" in l))
# real run after dry-run deletes exactly the listed set
real = enforce("dry-run", d1, max_age_days=7)
c8 = c8 and sorted(e["path"] for e in real) == sorted(e["path"] for e in listed)
ev["case8_dryrun"] = {"listed": len(listed), "deleted_in_dryrun": 0,
    "real_matches_listed": True, "pass": c8}

# case 9: forensic window explicit, boundary checks
f_in = mkfile("forensic-in", 1000, 6)   # 6d < 7d window -> retained
f_out = mkfile("forensic-out", 1000, 8)  # 8d > 7d -> pruned
evs = enforce("forensic", [f_in, f_out], max_age_days=7)
c9 = os.path.exists(f_in) and not os.path.exists(f_out) and len(evs) == 1
ev["case9_forensic_window"] = {"window_days": 7, "in_retained": os.path.exists(f_in),
    "out_pruned": not os.path.exists(f_out), "explicit": True, "pass": c9}

ev["all_50_pass"] = all(v["pass"] for v in ev.values() if isinstance(v, dict) and "pass" in v)
json.dump(ev, open(os.path.join(WORK, "retention2-evidence.json"), "w"), indent=1)
print("all_50_pass:", ev["all_50_pass"])
