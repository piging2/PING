#!/usr/bin/env python3
"""C1. DUPLICATED JOBS (real machinery).

The same job (identical batch_id/item_id/stage/input digests) is submitted
multiple times, sequentially and concurrently. Expectation: exactly one
execution of the real Pig stage, one journal line, all submissions return
the identical committed output (idempotency dedup, batch spec 3.1).
"""
import json
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (CheckpointStore, Journal, LeaseCoordinator, Pig,
                       digest_json, run_stage, PIG_FIXTURE)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "work", "c1")
BATCH = "btch_20260923_chaos_c1"
ITEM = "clearwater-plumbing-demo"
GEN_AT = "2026-09-24T00:30:00.000Z"
INPUTS = {"fixture_digest": "1bef189ee1376d2c45d1cb3de2b36fdb89961d09f42e30ae1231dbf775a978b6",
          "generatedAt": GEN_AT}


def submit(store, leases, journal, pig, worker_id):
    return run_stage(store, leases, journal, pig, BATCH, ITEM, "GENERATE",
                     INPUTS, "generate",
                     [PIG_FIXTURE,
                      "/home/nolan/fyd-chaos-lane/c1-spec-%s.json" % worker_id,
                      GEN_AT],
                     worker_id)


def scenario_seq():
    d = os.path.join(ROOT, "seq")
    os.environ["CHAOS_WORKDIR"] = d
    os.makedirs(d, exist_ok=True)
    store, leases, pig = CheckpointStore(d), LeaseCoordinator(d), Pig()
    journal = Journal(os.path.join(d, "journal.jsonl"), leases)
    outs = []
    spec_digests = []
    for i in range(3):
        r = submit(store, leases, journal, pig, "w-seq-%d" % i)
        outs.append(r["record"]["output_digest"])
        payload = json.loads(store.read_artifact(r["record"]["output_digest"]).decode())
        spec_digests.append(payload.get("digest"))
    return {
        "submissions": 3,
        "pig_executions": pig.invocations,
        "output_digests": outs,
        "spec_digests": spec_digests,
        "all_identical": len(set(outs)) == 1,
        "journal_lines": len(journal.lines()),
        "journal_rejected": journal.rejected,
    }


def scenario_race():
    d = os.path.join(ROOT, "race")
    os.environ["CHAOS_WORKDIR"] = d
    os.makedirs(d, exist_ok=True)
    store, leases, pig = CheckpointStore(d), LeaseCoordinator(d), Pig()
    journal = Journal(os.path.join(d, "journal.jsonl"), leases)
    barrier = threading.Barrier(10)
    results, errors = [], []

    def worker(i):
        try:
            barrier.wait(timeout=30)
            r = submit(store, leases, journal, pig, "w-race-%d" % i)
            results.append((i, r["record"]["output_digest"], r["cache_hit"]))
        except Exception as e:  # noqa: BLE001
            errors.append((i, repr(e)))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=300)
    digests = [r[1] for r in results]
    return {
        "submissions": 10,
        "completed": len(results),
        "errors": errors,
        "pig_executions": pig.invocations,
        "all_identical": len(set(digests)) == 1 and len(digests) == 10,
        "cache_hits": sum(1 for r in results if r[2]),
        "journal_lines": len(journal.lines()),
        "journal_rejected": journal.rejected,
    }


def main():
    seq = scenario_seq()
    race = scenario_race()
    # The real spec digest is the ground truth: must match LANE-REG digest1.
    expected = "bb2aed0356cd60b578e2f7148543bcba76266e424ac62b1f0e28d33a5d091866"
    digest_ok = all(d == expected for d in seq["spec_digests"])
    verdict = (
        seq["pig_executions"] == 1
        and seq["all_identical"]
        and seq["journal_lines"] == 1
        and digest_ok
        and race["pig_executions"] == 1
        and race["all_identical"]
        and race["journal_lines"] == 1
        and not race["errors"]
    )
    result = {
        "experiment": "C1 duplicated jobs",
        "mode": "real",
        "sequential": seq,
        "concurrent_race": race,
        "spec_digest_matches_lane_reg_digest1": all(
            d == expected for d in seq["spec_digests"]),
        "verdict": "PASS" if verdict else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
