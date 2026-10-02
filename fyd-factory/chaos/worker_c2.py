#!/usr/bin/env python3
"""C2 worker process: 3-stage checkpointed pipeline (EXTRACT -> GENERATE -> VERIFY).

Run as a subprocess so the supervisor can SIGKILL it mid-stage. Usage:
  worker_c2.py <workdir> <worker_id> <attempts_log>
Reads/writes the shared checkpoint store, lease coordinator, and journal.
Writes stage-start markers for the kill supervisor. Idempotent: resumes
from committed checkpoints.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (CheckpointStore, Journal, LeaseCoordinator, Pig,
                       run_stage, PIG_FIXTURE, work_id)

BATCH = "btch_20260923_chaos_c2"
ITEM = "clearwater-plumbing-demo"
T_FACT = "2026-09-23T19:30:00.000Z"
GEN_AT = "2026-09-24T00:30:00.000Z"
FIXTURE_DIGEST = "1bef189ee1376d2c45d1cb3de2b36fdb89961d09f42e30ae1231dbf775a978b6"


def next_attempt(attempts_log: str, wid: str) -> int:
    n = 0
    if os.path.exists(attempts_log):
        with open(attempts_log) as f:
            for ln in f:
                try:
                    e = json.loads(ln)
                except ValueError:
                    continue
                if e.get("wid") == wid and e.get("event") == "started":
                    n += 1
    return n + 1


def log_attempt(attempts_log: str, wid: str, stage: str, attempt: int,
                worker_id: str, event: str):
    with open(attempts_log, "a") as f:
        f.write(json.dumps({"wid": wid, "stage": stage, "attempt": attempt,
                            "worker_id": worker_id, "event": event}) + "\n")


def main():
    workdir, worker_id, attempts_log = sys.argv[1], sys.argv[2], sys.argv[3]
    os.environ["CHAOS_WORKDIR"] = os.path.join(workdir, worker_id)
    os.makedirs(os.environ["CHAOS_WORKDIR"], exist_ok=True)
    markers = os.path.join(workdir, "markers")
    os.makedirs(markers, exist_ok=True)
    store = CheckpointStore(os.path.join(workdir, "checkpoints"))
    leases = LeaseCoordinator(os.path.join(workdir, "leases"))
    journal = Journal(os.path.join(workdir, "journal.jsonl"), leases)
    pig = Pig()

    facts_path = "/home/nolan/fyd-chaos-lane/c2-%s-facts.json" % worker_id
    spec_path = "/home/nolan/fyd-chaos-lane/c2-%s-spec.json" % worker_id

    # Stage 1: EXTRACT
    ext_inputs = {"fixture_digest": FIXTURE_DIGEST, "extractedAt": T_FACT}
    ext_wid = work_id(BATCH, ITEM, "EXTRACT", ext_inputs)
    a = next_attempt(attempts_log, ext_wid)
    open(os.path.join(markers, "EXTRACT.started"), "w").close()
    log_attempt(attempts_log, ext_wid, "EXTRACT", a, worker_id, "started")
    ext = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                    ext_inputs, "extract", [PIG_FIXTURE, facts_path, T_FACT],
                    worker_id, attempt=a)
    log_attempt(attempts_log, ext_wid, "EXTRACT", a, worker_id,
                "cache_hit" if ext["cache_hit"] else "committed")

    # Stage 2: GENERATE (digest-chained on the EXTRACT output)
    gen_inputs = {"facts_digest": ext["record"]["output_digest"], "generatedAt": GEN_AT}
    gen_wid = work_id(BATCH, ITEM, "GENERATE", gen_inputs)
    a = next_attempt(attempts_log, gen_wid)
    open(os.path.join(markers, "GENERATE.started"), "w").close()
    log_attempt(attempts_log, gen_wid, "GENERATE", a, worker_id, "started")
    gen = run_stage(store, leases, journal, pig, BATCH, ITEM, "GENERATE",
                    gen_inputs, "generate", [PIG_FIXTURE, spec_path, GEN_AT],
                    worker_id, attempt=a)
    log_attempt(attempts_log, gen_wid, "GENERATE", a, worker_id,
                "cache_hit" if gen["cache_hit"] else "committed")

    # Stage 3: VERIFY
    ver_inputs = {"spec_digest": gen["record"]["output_digest"],
                  "fixture_digest": FIXTURE_DIGEST}
    ver_wid = work_id(BATCH, ITEM, "VERIFY", ver_inputs)
    a = next_attempt(attempts_log, ver_wid)
    open(os.path.join(markers, "VERIFY.started"), "w").close()
    log_attempt(attempts_log, ver_wid, "VERIFY", a, worker_id, "started")
    ver = run_stage(store, leases, journal, pig, BATCH, ITEM, "VERIFY",
                    ver_inputs, "verify", [spec_path, PIG_FIXTURE],
                    worker_id, attempt=a)
    log_attempt(attempts_log, ver_wid, "VERIFY", a, worker_id,
                "cache_hit" if ver["cache_hit"] else "committed")

    with open(os.path.join(workdir, "done-%s.json" % worker_id), "w") as f:
        json.dump({"worker_id": worker_id,
                   "pig_invocations": pig.invocations,
                   "extract": ext["record"]["output_digest"],
                   "generate": gen["record"]["output_digest"],
                   "verify": ver["record"]["output_digest"],
                   "cache_hits": [k for k, v in
                                  [("EXTRACT", ext), ("GENERATE", gen), ("VERIFY", ver)]
                                  if v["cache_hit"]]},
                  f, indent=1)
    print("WORKER_DONE " + worker_id, flush=True)


if __name__ == "__main__":
    main()
