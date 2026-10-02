#!/usr/bin/env python3
"""Gauntlet suite runner. Runs each test module, grades from durable state,
writes results JSON. Verdicts are computed, never invented: a test only PASSes
when its evidence checks hold against the scratch database.
"""
import importlib
import json
import sys
import time
import traceback

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet/tests")

TESTS = [
    "t_worker_death",
    "t_coord_death",
    "t_timeout_after_effect",
    "t_double_claim",
    "t_lease_expiry",
    "t_stale_checkpoint",
    "t_result_lost",
    "t_ack_lost",
    "t_db_disappear",
]


def main():
    only = sys.argv[1:] or TESTS
    results = []
    for name in TESTS:
        if name not in only:
            continue
        t0 = time.time()
        try:
            mod = importlib.import_module(name)
            res = mod.main()
            res["duration_s"] = round(time.time() - t0, 1)
        except Exception:
            res = {"verdict": "FAIL",
                   "evidence": {"exception": traceback.format_exc()[-1500:]},
                   "duration_s": round(time.time() - t0, 1)}
        res["test"] = name
        results.append(res)
        print(f"{name}: {res['verdict']} ({res['duration_s']}s)", flush=True)
    summary = {
        "ran_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "results": results,
        "counts": {v: sum(1 for r in results if r["verdict"] == v)
                   for v in ("PASS", "FAIL", "NOT-RUN")},
    }
    out = "/home/nolan/ping-gauntlet/orca-gauntlet/suite-results.json"
    with open(out, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"wrote {out}")
    print(json.dumps(summary["counts"]))


if __name__ == "__main__":
    main()
