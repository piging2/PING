#!/usr/bin/env python3
"""C5. REOBSERVATION DURING GENERATION (real machinery).

Pin a GENERATE to source digest A. While it is running, the source is
reobserved (fixture v2: changed title + phone). Expectations:
  - The in-flight GENERATE still commits, labeled with input digest A;
    its spec digest equals the A control digest (no cross-contamination).
  - A GENERATE submitted after the reobservation with input digest B is a
    distinct work id: it does NOT join or reuse A's checkpoint, and its
    spec digest differs (B's changes are real).
  - The owner journal recorded before generation replays cleanly over the
    B facts (owner intent preserved across reobservation).

The reobservation is simulated by swapping which fixture path the B-side
work submits; the A-side work keeps running against A. No wall-clock race
is needed for the labeling claim: the work id binds the input digest, so
any commit is provably labeled. A concurrent variant (B submitted while A
is in flight) is included to prove no join/collision.
"""
import json
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (CheckpointStore, Journal, LeaseCoordinator, Pig,
                       run_stage, PIG_FIXTURE, work_id)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "work", "c5")
BATCH = "btch_20260923_chaos_c5"
ITEM = "clearwater-plumbing-demo"
T_FACT = "2026-09-23T19:30:00.000Z"
GEN_AT = "2026-09-24T00:30:00.000Z"
PIG_V2 = "/home/nolan/fyd-chaos-lane/c3-fixture-v2.json"  # from C3
ASSERTED_AT = "2026-09-24T01:00:00.000Z"


def spec_digest_of(store, record):
    return json.loads(store.read_artifact(record["output_digest"]).decode())["digest"]


def main():
    os.makedirs(ROOT, exist_ok=True)
    os.environ["CHAOS_WORKDIR"] = ROOT
    assert os.path.exists(os.path.join(ROOT, "..", ".."))  # sanity
    store, leases, pig = CheckpointStore(ROOT), LeaseCoordinator(ROOT), Pig()
    journal = Journal(os.path.join(ROOT, "journal.jsonl"), leases)

    # EXTRACT both sources (A = original fixture, B = reobserved fixture).
    extA = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                     {"source": "A", "extractedAt": T_FACT},
                     "extract", [PIG_FIXTURE,
                                 "/home/nolan/fyd-chaos-lane/c5-facts-a.json", T_FACT],
                     "w-c5")
    extB = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                     {"source": "B", "extractedAt": T_FACT},
                     "extract", [PIG_V2,
                                 "/home/nolan/fyd-chaos-lane/c5-facts-b.json", T_FACT],
                     "w-c5")

    genA_inputs = {"facts_digest": extA["record"]["output_digest"], "generatedAt": GEN_AT}
    genB_inputs = {"facts_digest": extB["record"]["output_digest"], "generatedAt": GEN_AT}
    widA = work_id(BATCH, ITEM, "GENERATE", genA_inputs)
    widB = work_id(BATCH, ITEM, "GENERATE", genB_inputs)
    assert widA != widB, "A and B work ids must differ"

    # Owner correction drafted against A facts, journaled before generation.
    draft = pig.stage("draft-journal",
                      ["/home/nolan/fyd-chaos-lane/c5-facts-a.json",
                       "/home/nolan/fyd-chaos-lane/c5-journal.json",
                       ASSERTED_AT, "(970) 555-0199"],
                      tag="c5/draft-journal")
    journal_assertion = {"assertion_id": draft["headId"], "phone": "(970) 555-0199"}

    # Concurrent variant: A starts; B is submitted while A is in flight.
    # B must not join A's lease and must not reuse A's checkpoint.
    results = {}

    def run_gen(name, inputs, fixture, spec_name):
        results[name] = run_stage(
            store, leases, journal, pig, BATCH, ITEM, "GENERATE", inputs,
            "generate", [fixture,
                         "/home/nolan/fyd-chaos-lane/%s" % spec_name, GEN_AT],
            "w-c5-" + name)

    tA = threading.Thread(target=run_gen, args=("A", genA_inputs, PIG_FIXTURE, "c5-spec-a.json"))
    tA.start()
    # B submitted while A is in flight (A holds the GENERATE lease only for
    # its own wid; B's wid differs so it must proceed independently).
    tB = threading.Thread(target=run_gen, args=("B", genB_inputs, PIG_V2, "c5-spec-b.json"))
    tB.start()
    tA.join(timeout=300)
    tB.join(timeout=300)
    assert not tA.is_alive() and not tB.is_alive(), "generate threads hung"

    genA, genB = results["A"], results["B"]
    specA = spec_digest_of(store, genA["record"])
    specB = spec_digest_of(store, genB["record"])

    # Replay: owner journal over B facts. The source phone moved (0142->0143)
    # under the correction, so the honest outcome is: owner's 0199 applied
    # AND the source-value divergence explicitly surfaced as a conflict,
    # never silently dropped (orphaned == 0).
    replay = pig.stage("replay",
                       ["/home/nolan/fyd-chaos-lane/c5-facts-b.json",
                        "/home/nolan/fyd-chaos-lane/c5-journal.json"],
                       tag="c5/replay")

    verdict = (
        genA["record"]["input_digests"] == {k: genA_inputs[k] for k in sorted(genA_inputs)}
        and genB["record"]["input_digests"] == {k: genB_inputs[k] for k in sorted(genB_inputs)}
        and genA["record"]["input_digests"]["facts_digest"] == extA["record"]["output_digest"]
        and genB["record"]["input_digests"]["facts_digest"] == extB["record"]["output_digest"]
        and not genB.get("joined", False)
        and not genB["cache_hit"]
        and not genA["cache_hit"]
        and genA["record"]["output_digest"] != genB["record"]["output_digest"]
        and specA != specB
        and replay["applied"] == 1
        and replay["orphaned"] == 0
        and replay["conflicts"] >= 1
        and replay["phone"] == "(970) 555-0199"
        and len(journal.lines()) == 4  # EXTRACT A, EXTRACT B, GENERATE A, GENERATE B
    )
    result = {
        "experiment": "C5 reobservation during generation",
        "mode": "real",
        "work_id_A_prefix": widA[:16],
        "work_id_B_prefix": widB[:16],
        "work_ids_differ": widA != widB,
        "genA_input_facts_prefix": genA["record"]["input_digests"]["facts_digest"][:16],
        "genB_input_facts_prefix": genB["record"]["input_digests"]["facts_digest"][:16],
        "genA_cache_hit": genA["cache_hit"],
        "genB_cache_hit": genB["cache_hit"],
        "genB_joined_A": bool(genB.get("joined", False)),
        "spec_digests_differ": specA != specB,
        "specA_prefix": specA[:16],
        "specB_prefix": specB[:16],
        "journal_assertion": journal_assertion,
        "replay_over_B": {"applied": replay["applied"], "conflicts": replay["conflicts"],
                          "orphaned": replay["orphaned"], "phone": replay["phone"]},
        "journal_lines": len(journal.lines()),
        "verdict": "PASS" if verdict else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
