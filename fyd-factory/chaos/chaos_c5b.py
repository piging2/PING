#!/usr/bin/env python3
"""C5b. STALE-CODE CACHE PROOF (follows from the live C5 observation).

Between C1 (20:33 MDT) and C3 (02:51 MDT) another lane's edit to
src/fyd/sitespec/schemas.ts changed the generator's canonical output for
IDENTICAL source inputs (generator version stayed 1.0.0). This script
proves the digest chain does not bind the transform code version:

1. Re-submit C1's exact GENERATE work (same batch/item/stage/inputs).
2. The cache returns a HIT with the OLD digest (pre-edit code output).
3. A fresh generation right now yields the NEW digest.
=> The cache serves a stale-code artifact as current. Work identity binds
   source inputs but not the code that transformed them.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (CheckpointStore, Journal, LeaseCoordinator, Pig,
                       run_stage, PIG_FIXTURE)

HERE = os.path.dirname(os.path.abspath(__file__))
C1 = os.path.join(HERE, "work", "c1", "seq")
ROOT = os.path.join(HERE, "work", "c5b")
BATCH = "btch_20260923_chaos_c1"
ITEM = "clearwater-plumbing-demo"
GEN_AT = "2026-09-24T00:30:00.000Z"
INPUTS = {"fixture_digest": "1bef189ee1376d2c45d1cb3de2b36fdb89961d09f42e30ae1231dbf775a978b6",
          "generatedAt": GEN_AT}
OLD_DIGEST = "bb2aed0356cd60b578e2f7148543bcba76266e424ac62b1f0e28d33a5d091866"


def main():
    os.makedirs(ROOT, exist_ok=True)
    os.environ["CHAOS_WORKDIR"] = ROOT
    # Reuse C1's store so the old checkpoint is visible.
    store, leases, pig = CheckpointStore(C1), LeaseCoordinator(C1), Pig()
    journal = Journal(os.path.join(C1, "journal.jsonl"), leases)

    r = run_stage(store, leases, journal, pig, BATCH, ITEM, "GENERATE",
                  INPUTS, "generate",
                  [PIG_FIXTURE, "/home/nolan/fyd-chaos-lane/c5b-spec.json", GEN_AT],
                  "w-c5b")
    cached_spec = json.loads(store.read_artifact(r["record"]["output_digest"]).decode())["digest"]

    fresh = pig.stage("generate",
                      [PIG_FIXTURE, "/home/nolan/fyd-chaos-lane/c5b-spec-fresh.json", GEN_AT],
                      tag="c5b/fresh")
    fresh_spec = fresh["digest"]

    stale_served = (r["cache_hit"] and cached_spec == OLD_DIGEST and fresh_spec != OLD_DIGEST)
    verdict = "GAP-CONFIRMED" if stale_served else "UNEXPECTED"
    result = {
        "experiment": "C5b stale-code cache proof",
        "mode": "real",
        "resubmission_cache_hit": r["cache_hit"],
        "cached_spec_digest_prefix": cached_spec[:16],
        "cached_matches_pre_edit_code": cached_spec == OLD_DIGEST,
        "fresh_spec_digest_prefix": fresh_spec[:16],
        "fresh_matches_pre_edit_code": fresh_spec == OLD_DIGEST,
        "pig_executions_for_resubmission": pig.invocations - 1,  # minus the fresh probe
        "stale_code_artifact_served_as_current": stale_served,
        "code_change": "src/fyd/sitespec/schemas.ts refactored 2026-09-23 20:54 MDT "
                       "(lane E: SCHEMA_COMPONENTS table deleted, eligibility now "
                       "derived from component registry); generator version stayed 1.0.0",
        "verdict": verdict,
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
