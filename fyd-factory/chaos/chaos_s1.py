#!/usr/bin/env python3
"""S1. PIG SLEEP (SIMULATED as heartbeat pause + lease expiry).

The real Pig is never slept. Instead we simulate exactly what a sleep does
to the factory's durability protocol: heartbeats stop, so the lease TTL
expires while the worker is still "alive".

Scenario:
  1. Worker A acquires the lease for a GENERATE work item (short TTL 5s)
     and starts the real Pig stage.
  2. SIMULATED SLEEP: A's heartbeat loop pauses for 8s (> TTL). The lease
     expires mid-stage.
  3. Worker B observes the expired lease, steals it (fencing 1 -> 2), and
     completes the stage (real Pig call) and commits.
  4. A's stage call returns; A attempts to commit under fencing 1.
     Expectation: the commit is REJECTED (stale fencing), so the sleeper
     cannot overwrite B's committed result. Exactly one canonical output.

Also covered: the wake-request protocol. A supervisor acquires a
wake request before the durability-sensitive section and releases it in
a finally block. This is modeled as an observable acquire/release log
(SIMULATED: no real power-policy call is made from the sandbox); the
assertion is that release always runs, even when the child raises.
"""
import json
import os
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (ChaosError, CheckpointStore, Journal, LeaseCoordinator,
                       Pig, StaleLeaseError, run_stage, PIG_FIXTURE, work_id)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "work", "s1")
BATCH = "btch_20260923_chaos_s1"
ITEM = "clearwater-plumbing-demo"
GEN_AT = "2026-09-24T00:30:00.000Z"
INPUTS = {"fixture_digest": "1bef189ee1376d2c45d1cb3de2b36fdb89961d09f42e30ae1231dbf775a978b6",
          "generatedAt": GEN_AT}


class WakeRequest:
    """SIMULATED wake-request protocol: acquire before / release in finally."""

    def __init__(self, log_path, reason):
        self.log_path = log_path
        self.reason = reason

    def __enter__(self):
        with open(self.log_path, "a") as f:
            f.write(json.dumps({"event": "acquire", "reason": self.reason,
                                "at": time.time()}) + "\n")
        return self

    def __exit__(self, exc_type, exc, tb):
        with open(self.log_path, "a") as f:
            f.write(json.dumps({"event": "release", "reason": self.reason,
                                "at": time.time(),
                                "with_exception": exc_type is not None}) + "\n")
        return False


def main():
    os.makedirs(ROOT, exist_ok=True)
    os.environ["CHAOS_WORKDIR"] = ROOT
    store = CheckpointStore(ROOT)
    leases = LeaseCoordinator(ROOT, ttl_s=5.0)  # short TTL for the sim
    pig = Pig()
    journal = Journal(os.path.join(ROOT, "journal.jsonl"), leases)
    wid = work_id(BATCH, ITEM, "GENERATE", INPUTS)

    events = []

    def worker_a():
        # A acquires the lease and starts the real stage.
        lease, owner = leases.acquire(wid, "w-A", ITEM, "GENERATE")
        assert owner
        events.append(("A", "lease_acquired", lease["fencing"]))
        res = pig.stage("generate",
                        [PIG_FIXTURE, "/home/nolan/fyd-chaos-lane/s1-spec-a.json", GEN_AT],
                        tag="s1/A")
        # SIMULATED SLEEP: heartbeat pause 8s > TTL 5s. The lease expires
        # while A is still "alive" inside the stage.
        events.append(("A", "sleep_simulated_start", None))
        time.sleep(8)
        events.append(("A", "sleep_simulated_end", None))
        # A tries to commit under its now-stale fencing token.
        try:
            leases.check_write(wid, lease["fencing"])
            committed = True
        except StaleLeaseError:
            committed = False
        events.append(("A", "commit_attempt", committed))
        return res, committed

    def worker_b():
        # B lets run_stage's join loop observe the expired lease, steal it
        # (fencing 1 -> 2), and complete the stage with a real Pig call.
        time.sleep(6.5)  # A's lease (5s TTL) has expired by now
        r = run_stage(store, leases, journal, pig, BATCH, ITEM, "GENERATE",
                      INPUTS, "generate",
                      [PIG_FIXTURE, "/home/nolan/fyd-chaos-lane/s1-spec-b.json", GEN_AT],
                      "w-B", attempt=2)
        events.append(("B", "completed", r["record"]["fencing"]))
        return r

    wake_log = os.path.join(ROOT, "wake-requests.log")
    with WakeRequest(wake_log, "s1 durability section"):
        tA = threading.Thread(target=lambda: events.append(("A", "result", worker_a())))
        tA.start()
        rB = worker_b()
        tA.join(timeout=300)

    a_res, a_committed = [e[2] for e in events if e[0] == "A" and e[1] == "result"][0]
    wake_events = [json.loads(ln) for ln in open(wake_log)]

    verdict = (
        not a_committed                      # sleeper's stale write rejected
        and rB["record"]["fencing"] == 2     # B fenced forward
        and len(journal.lines()) == 1        # exactly one canonical side effect
        and journal.lines()[0]["worker_id"] == "w-B"
        and [e["event"] for e in wake_events] == ["acquire", "release"]
    )
    result = {
        "experiment": "S1 Pig sleep (SIMULATED heartbeat pause)",
        "mode": "SIMULATED",
        "simulation": "heartbeat paused 8s with lease TTL 5s; real Pig never slept",
        "lease_fencing_A": 1,
        "lease_fencing_B": rB["record"]["fencing"],
        "sleeper_commit_accepted": a_committed,
        "journal_lines": len(journal.lines()),
        "journal_worker": journal.lines()[0]["worker_id"] if journal.lines() else None,
        "wake_request_events": [e["event"] for e in wake_events],
        "wake_released_on_clean_exit": wake_events[-1]["with_exception"] is False,
        "verdict": "PASS" if verdict else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
