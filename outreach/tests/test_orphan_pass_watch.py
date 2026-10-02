#!/usr/bin/env python3
"""Deterministic test for orphan-pass-watch.py (plain-script style, exit 0/1).

Builds synthetic ledgers in temp dirs and runs the real watcher against
them via ENGAGEMENT_INTENT_LEDGER. Asserts typed states, exit codes, and
read-only behavior.
"""
import json
import os
import subprocess
import sys
import tempfile

WATCH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "..", "orphan-pass-watch.py")
WATCH = os.path.normpath(WATCH)
NOW = "2026-09-16T09:00:00+00:00"  # fixed clock for determinism

passed = 0
failed = 0


def check(name, cond):
    global passed, failed
    if cond:
        passed += 1
        print("ok: %s" % name)
    else:
        failed += 1
        print("FAIL: %s" % name)


def run_watcher(ledger_path, *args):
    env = dict(os.environ, ENGAGEMENT_INTENT_LEDGER=ledger_path)
    return subprocess.run(
        [sys.executable, WATCH, "--now", NOW] + list(args),
        capture_output=True, text=True, env=env)


def write_ledger(records):
    tmp = tempfile.mkdtemp(prefix="orphanwatch-test-")
    path = os.path.join(tmp, "ledger.jsonl")
    with open(path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    return path


def intent(iid, pid, ts, platform="x"):
    return {"record_type": "intent", "intent_id": iid, "pass_id": pid,
            "platform": platform, "account": "@a", "url": "https://x.com/u",
            "action": "like", "stage": "INTENT_RECORDED", "ts": ts}


def outcome(iid, ts, oc="EXECUTED", kind="observation"):
    r = {"record_type": kind, "intent_id": iid, "ts": ts, "evidence": "test",
         "note": "test", "stage": "OBSERVATION"}
    if kind == "observation":
        r["terminal"] = oc
    elif kind == "reconciliation":
        r["outcome"] = oc
    return r


STALE = "2026-09-16T06:00:00+00:00"    # 180 min old > 90 grace
YOUNG = "2026-09-16T08:30:00+00:00"   # 30 min old < 90 grace

# 1. empty ledger -> exit 0, no passes
p = run_watcher(write_ledger([]))
check("empty ledger exit 0", p.returncode == 0)
check("empty ledger no passes", json.loads(p.stdout)["passes"] == [])

# 2. all intents closed -> exit 0
led = write_ledger([intent("i1", "x-1", STALE), outcome("i1", YOUNG)])
p = run_watcher(led)
check("closed intents exit 0", p.returncode == 0)
check("closed intents zero open", json.loads(p.stdout)["open_intents"] == 0)

# 3. stale open intent -> exit 1, ORPHAN_STALE
led = write_ledger([intent("i2", "tt-9", STALE, platform="tiktok")])
p = run_watcher(led)
rep = json.loads(p.stdout)
check("stale open exit 1", p.returncode == 1)
check("stale state typed",
      rep["passes"][0]["state"] == "ORPHAN_STALE"
      and rep["passes"][0]["platform"] == "tiktok"
      and rep["passes"][0]["pass_id"] == "tt-9")
check("stale oldest age ~180", abs(rep["passes"][0]["oldest_age_min"] - 180.0) < 0.2)

# 4. young open intent -> exit 0, ORPHAN_RUNNING (pass in flight, not an alert)
led = write_ledger([intent("i3", "x-2", YOUNG)])
p = run_watcher(led)
rep = json.loads(p.stdout)
check("young open exit 0", p.returncode == 0)
check("young state RUNNING", rep["passes"][0]["state"] == "ORPHAN_RUNNING")

# 5. mixed: one stale one closed -> exit 1, stale only listed
led = write_ledger([intent("i4", "fb-5", STALE, platform="facebook"),
                    intent("i5", "fb-5", YOUNG, platform="facebook"),
                    outcome("i5", YOUNG)])
p = run_watcher(led)
rep = json.loads(p.stdout)
check("mixed exit 1", p.returncode == 1)
check("mixed groups open count", rep["open_intents"] == 1)
check("mixed stale state", rep["passes"][0]["state"] == "ORPHAN_STALE")

# 6. platform filter drops the stale tiktok pass
led = write_ledger([intent("i6", "tt-10", STALE, platform="tiktok")])
p = run_watcher(led, "--platform", "x")
check("platform filter exit 0", p.returncode == 0)

# 7. missing ledger -> fail closed, exit 2
p = run_watcher("/nonexistent/dir/ledger.jsonl")
check("missing ledger exit 2", p.returncode == 2)
check("missing ledger says unreadable", "unreadable" in p.stderr)

# 8. read-only: watcher never writes to the ledger
led = write_ledger([intent("i7", "x-3", STALE)])
before = open(led, "rb").read()
run_watcher(led)
check("ledger byte-identical after run", open(led, "rb").read() == before)

# 9. UNKNOWN_EXECUTION outcome closes an intent (not an orphan)
led = write_ledger([intent("i8", "x-4", STALE),
                    outcome("i8", YOUNG, oc="UNKNOWN_EXECUTION")])
p = run_watcher(led)
check("UNKNOWN_EXECUTION closes intent", p.returncode == 0)

# 10. zero grace -> usage error, exit 2
led = write_ledger([])
p = run_watcher(led, "--grace-minutes", "0")
check("zero grace exit 2", p.returncode == 2)

# 11. reconciliation closes an intent (real-schema semantics)
led = write_ledger([intent("i9", "x-5", STALE),
                    outcome("i9", YOUNG, oc="NOT_ATTEMPTED",
                            kind="reconciliation")])
p = run_watcher(led)
check("reconciliation closes intent", p.returncode == 0)

# 12. finalize closes an intent (real-schema semantics)
led = write_ledger([intent("i10", "fb-6", STALE, platform="facebook"),
                    outcome("i10", YOUNG, kind="finalize")])
p = run_watcher(led)
check("finalize closes intent", p.returncode == 0)

# 13. execution alone does NOT close (action may still be unknown)
led = write_ledger([intent("i11", "x-6", STALE),
                    {"record_type": "execution", "intent_id": "i11",
                     "ts": YOUNG}])
p = run_watcher(led)
check("execution-only stays open-stale", p.returncode == 1)

# 14. parity with the real ledger: list-unknown says 0 open, watcher agrees
real = os.path.join(os.path.dirname(WATCH), "action-intent-ledger.jsonl")
if os.path.isfile(real):
    p = run_watcher(real)
    check("real ledger parity: exit 0", p.returncode == 0)
    check("real ledger parity: zero open",
          json.loads(p.stdout)["open_intents"] == 0)
else:
    print("skip: real ledger not present")

print("%d passed, %d failed" % (passed, failed))
sys.exit(1 if failed else 0)
