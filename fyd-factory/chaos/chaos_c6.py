#!/usr/bin/env python3
"""C6. TWO WORKERS ON THE SAME ENTITY (real machinery).

Two workers legitimately generate for the same item_id from DIFFERENT
source inputs (A = original, B = reobserved) at the same time. Both stage
jobs are valid distinct work. The question is publication: the harness
commits each stage result under its own work id, but is there an
entity-level fence (compare-and-set on input generation) so that an older
result cannot silently overwrite a newer one at the canonical publication
point?

Probe:
  1. Run both GENERATEs concurrently (both commit under their own wids).
  2. Attempt canonical publication of each result for the entity through
     the harness's publish() API, in both orders (A-then-B and B-then-A).
  3. Check whether publish() enforces any generation/ordering condition.

The publish() API implemented here models the minimal canonical
publication point the batch spec implies but does not define: an
entity-level pointer (entity -> current output digest + input digest).
Two variants are tested:
  - naive: last-writer-wins (no fence) -- demonstrates the hazard.
  - fenced: compare-and-set requiring the new input to be newer than the
    current one -- demonstrates the fix shape.

Verdict PASS requires the hazard to be demonstrated on naive and the
fence to hold on fenced. If the real factory already defines an
entity-level publication rule, this experiment would target it instead;
it does not (batch spec covers stage-level work ids only), so the harness
API stands in and the gap is reported against the spec.
"""
import json
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (CheckpointStore, Journal, LeaseCoordinator, Pig,
                       run_stage, PIG_FIXTURE)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "work", "c6")
BATCH = "btch_20260923_chaos_c6"
ITEM = "clearwater-plumbing-demo"
T_FACT = "2026-09-23T19:30:00.000Z"
GEN_AT = "2026-09-24T00:30:00.000Z"
PIG_V2 = "/home/nolan/fyd-chaos-lane/c3-fixture-v2.json"


class Publisher:
    """Entity-level canonical publication pointer.

    naive: last writer wins (no generation check).
    fenced: compare-and-set -- a publish is accepted only when its input
    digest differs from and is ordered after the current one. Ordering uses
    the source sequence number carried in the input digests ("seq").
    """

    def __init__(self, path):
        self.path = path
        self.state = {}
        if os.path.exists(path):
            with open(path) as f:
                self.state = json.load(f)

    def _save(self):
        tmp = self.path + ".tmp"
        with open(tmp, "w") as f:
            json.dump(self.state, f, sort_keys=True)
        os.replace(tmp, self.path)

    def publish_naive(self, item_id, output_digest, inputs):
        self.state[item_id] = {"output_digest": output_digest,
                               "seq": inputs["seq"]}
        self._save()
        return True

    def publish_fenced(self, item_id, output_digest, inputs):
        cur = self.state.get(item_id)
        if cur is not None and inputs["seq"] <= cur["seq"]:
            return False  # stale or duplicate generation: rejected
        self.state[item_id] = {"output_digest": output_digest,
                               "seq": inputs["seq"]}
        self._save()
        return True

    def current(self, item_id):
        return self.state.get(item_id)


def main():
    os.makedirs(ROOT, exist_ok=True)
    os.environ["CHAOS_WORKDIR"] = ROOT
    store, leases, pig = CheckpointStore(ROOT), LeaseCoordinator(ROOT), Pig()
    journal = Journal(os.path.join(ROOT, "journal.jsonl"), leases)

    # Two sources: A (seq 1, original) and B (seq 2, reobserved).
    extA = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                     {"seq": 1, "extractedAt": T_FACT}, "extract",
                     [PIG_FIXTURE, "/home/nolan/fyd-chaos-lane/c6-facts-a.json", T_FACT],
                     "w-c6")
    extB = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                     {"seq": 2, "extractedAt": T_FACT}, "extract",
                     [PIG_V2, "/home/nolan/fyd-chaos-lane/c6-facts-b.json", T_FACT],
                     "w-c6")
    genA_inputs = {"seq": 1, "facts_digest": extA["record"]["output_digest"],
                   "generatedAt": GEN_AT}
    genB_inputs = {"seq": 2, "facts_digest": extB["record"]["output_digest"],
                   "generatedAt": GEN_AT}

    results = {}

    def gen(name, inputs, fixture, spec):
        results[name] = run_stage(store, leases, journal, pig, BATCH, ITEM,
                                  "GENERATE", inputs, "generate",
                                  [fixture, "/home/nolan/fyd-chaos-lane/" + spec,
                                   GEN_AT], "w-c6-" + name)

    tA = threading.Thread(target=gen, args=("A", genA_inputs, PIG_FIXTURE, "c6-spec-a.json"))
    tB = threading.Thread(target=gen, args=("B", genB_inputs, PIG_V2, "c6-spec-b.json"))
    tA.start()
    tB.start()
    tA.join(timeout=300)
    tB.join(timeout=300)
    assert not tA.is_alive() and not tB.is_alive()

    outA = results["A"]["record"]["output_digest"]
    outB = results["B"]["record"]["output_digest"]
    assert outA != outB, "A and B must produce different outputs"

    # Order 1: B (newer) publishes first, then A (older) tries.
    p1 = Publisher(os.path.join(ROOT, "publish-order1.json"))
    p1.publish_naive(ITEM, outB, genB_inputs)
    naive_stale_accepted = p1.publish_naive(ITEM, outA, genA_inputs)
    naive_final_seq = p1.current(ITEM)["seq"]

    p2 = Publisher(os.path.join(ROOT, "publish-order2.json"))
    p2.publish_fenced(ITEM, outB, genB_inputs)
    fenced_stale_accepted = p2.publish_fenced(ITEM, outA, genA_inputs)
    fenced_final_seq = p2.current(ITEM)["seq"]
    # And the reverse order on the fence: A then B must both succeed in order.
    p3 = Publisher(os.path.join(ROOT, "publish-order3.json"))
    fenced_a_first = p3.publish_fenced(ITEM, outA, genA_inputs)
    fenced_b_second = p3.publish_fenced(ITEM, outB, genB_inputs)

    verdict = (
        naive_stale_accepted and naive_final_seq == 1
        and not fenced_stale_accepted and fenced_final_seq == 2
        and fenced_a_first and fenced_b_second
    )
    result = {
        "experiment": "C6 two workers on the same entity",
        "mode": "real",
        "note": "Stage-level machinery is real; the publication point is a "
                "harness API because the batch spec defines no entity-level "
                "publication rule.",
        "both_stage_jobs_committed": True,
        "outputs_differ": outA != outB,
        "naive_last_writer_wins": {
            "stale_publish_accepted": naive_stale_accepted,
            "final_seq": naive_final_seq,
            "hazard": "older result silently overwrote newer canonical pointer",
        },
        "fenced_compare_and_set": {
            "stale_publish_accepted": fenced_stale_accepted,
            "final_seq": fenced_final_seq,
            "in_order_a_then_b_accepted": fenced_a_first and fenced_b_second,
        },
        "journal_lines": len(journal.lines()),
        "verdict": "PASS" if verdict else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
