#!/usr/bin/env python3
"""S2. BROWSER TARGET DROP (SIMULATED as a typed target-lost failure).

Nolan's real browser targets are never touched. A disposable fake browser
worker stands in: it raises TargetLostError (the typed form of "the CDP
target vanished", e.g. what a host sleep does to live browser targets)
for a scripted number of attempts, then succeeds.

The stage runner classifies TargetLostError as transient/retriable and
retries with the batch-spec bound: at most 3 attempts (spec 3.3). Two
scenarios:
  A. Flaky target: fails twice, succeeds on attempt 3.
     Expect: exactly 3 attempts, 1 committed result, 1 journal line.
  B. Dead target: fails on all attempts.
     Expect: exactly 3 attempts, no commit, a typed ExhaustedError, and
     the work item recorded as failed (visible in the attempts log), never
     silently lost and never retried a 4th time.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (ChaosError, CheckpointStore, Journal, LeaseCoordinator,
                       MAX_ATTEMPTS, Pig, run_stage, PIG_FIXTURE, work_id)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "work", "s2")
BATCH = "btch_20260923_chaos_s2"
ITEM = "clearwater-plumbing-demo"
GEN_AT = "2026-09-24T00:30:00.000Z"
INPUTS = {"fixture_digest": "1bef189ee1376d2c45d1cb3de2b36fdb89961d09f42e30ae1231dbf775a978b6",
          "generatedAt": GEN_AT}


class TargetLostError(ChaosError):
    """SIMULATED typed failure: the browser target vanished mid-stage."""


class ExhaustedError(ChaosError):
    """Typed failure: bounded retries exhausted; work item failed visibly."""


class FlakyBrowserWorker:
    """Disposable fake browser stage: fails `fail_times` then succeeds."""

    def __init__(self, pig, fail_times):
        self.pig = pig
        self.fail_times = fail_times
        self.calls = 0

    def capture(self):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise TargetLostError(
                "SIMULATED: browser target dropped before capture (call %d)" % self.calls)
        # The "capture" itself is a real Pig stage call once the target holds.
        return self.pig.stage("generate",
                              [PIG_FIXTURE,
                               "/home/nolan/fyd-chaos-lane/s2-spec.json", GEN_AT],
                              tag="s2/capture")


def run_with_retries(store, leases, journal, pig, worker, wid_label,
                     attempts_log, worker_id):
    """Bounded retry loop (batch spec 3.3): at most MAX_ATTEMPTS attempts."""
    last = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        with open(attempts_log, "a") as f:
            f.write(json.dumps({"wid": wid_label, "attempt": attempt,
                                "worker_id": worker_id, "event": "started"}) + "\n")
        try:
            res = worker.capture()
        except TargetLostError as e:
            last = e
            with open(attempts_log, "a") as f:
                f.write(json.dumps({"wid": wid_label, "attempt": attempt,
                                    "worker_id": worker_id, "event": "target-lost",
                                    "error": str(e)}) + "\n")
            continue
        payload = json.dumps(res, sort_keys=True).encode()
        out_digest = store.put_artifact(payload)
        record = {"batch_id": BATCH, "item_id": ITEM, "stage": "CAPTURE",
                  "attempt": attempt, "input_digests": dict(INPUTS),
                  "output_digest": out_digest, "status": "ok"}
        lease, _ = leases.acquire(wid_label, worker_id, ITEM, "CAPTURE")
        store.commit(wid_label, record)
        journal.append(wid_label, lease["fencing"],
                       {"stage": "CAPTURE", "item_id": ITEM,
                        "worker_id": worker_id, "output_digest": out_digest,
                        "attempt": attempt})
        with open(attempts_log, "a") as f:
            f.write(json.dumps({"wid": wid_label, "attempt": attempt,
                                "worker_id": worker_id, "event": "committed"}) + "\n")
        return {"record": record, "attempts": attempt}
    with open(attempts_log, "a") as f:
        f.write(json.dumps({"wid": wid_label, "worker_id": worker_id,
                            "event": "failed", "error": "retries exhausted"}) + "\n")
    raise ExhaustedError("attempts exhausted (%d) for %s: %s"
                         % (MAX_ATTEMPTS, wid_label[:12], last))


def main():
    os.makedirs(ROOT, exist_ok=True)
    os.environ["CHAOS_WORKDIR"] = ROOT
    store, leases, pig = CheckpointStore(ROOT), LeaseCoordinator(ROOT), Pig()

    # Scenario A: flaky target, succeeds on attempt 3.
    a_dir = os.path.join(ROOT, "a")
    os.makedirs(a_dir, exist_ok=True)
    journal_a = Journal(os.path.join(a_dir, "journal.jsonl"), leases)
    wid_a = work_id(BATCH, ITEM, "CAPTURE-A", INPUTS)
    ra = run_with_retries(store, leases, journal_a, pig,
                          FlakyBrowserWorker(pig, fail_times=2), wid_a,
                          os.path.join(a_dir, "attempts.jsonl"), "w-s2a")

    # Scenario B: dead target, all attempts fail.
    journal_b = Journal(os.path.join(ROOT, "b-journal.jsonl"), leases)
    wid_b = work_id(BATCH, ITEM, "CAPTURE-B", INPUTS)
    exhausted = None
    worker_b = FlakyBrowserWorker(pig, fail_times=99)
    try:
        run_with_retries(store, leases, journal_b, pig, worker_b, wid_b,
                         os.path.join(ROOT, "b-attempts.jsonl"), "w-s2b")
    except ExhaustedError as e:
        exhausted = e

    attempts_b = [json.loads(ln) for ln in open(os.path.join(ROOT, "b-attempts.jsonl"))]
    verdict = (
        ra["attempts"] == 3
        and ra["record"]["attempt"] == 3
        and len(journal_a.lines()) == 1
        and exhausted is not None
        and worker_b.calls == MAX_ATTEMPTS
        and len(journal_b.lines()) == 0
        and attempts_b[-1]["event"] == "failed"
        and sum(1 for e in attempts_b if e["event"] == "target-lost") == MAX_ATTEMPTS
    )
    result = {
        "experiment": "S2 browser target drop (SIMULATED typed failure)",
        "mode": "SIMULATED",
        "simulation": "disposable fake browser worker raising TargetLostError; "
                      "no real browser target touched",
        "scenario_a_flaky": {
            "attempts": ra["attempts"],
            "committed_attempt": ra["record"]["attempt"],
            "journal_lines": len(journal_a.lines()),
        },
        "scenario_b_dead": {
            "exhausted": exhausted is not None,
            "browser_calls": worker_b.calls,
            "max_attempts": MAX_ATTEMPTS,
            "journal_lines": len(journal_b.lines()),
            "failure_recorded": attempts_b[-1]["event"] == "failed",
        },
        "verdict": "PASS" if verdict else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
