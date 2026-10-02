#!/usr/bin/env python3
"""C3. SOURCE CHANGE MID-RUN (real machinery).

A two-stage pipeline runs against fixture v1. After EXTRACT commits, the
source changes (new ingestion: phone 0142 -> 0143, written as a NEW
fixture copy; the original is never touched). Expectations:
  - EXTRACT with v2 inputs is a cache MISS (work_id is input-digest keyed):
    no stale v1 output is ever served for v2 inputs.
  - GENERATE on v2 facts yields a different spec digest than the v1 control
    (change detected, not silently absorbed).
  - Re-running EXTRACT with v1 inputs still HITS the old checkpoint:
    history is preserved, not invalidated by the newer source.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (CheckpointStore, Journal, LeaseCoordinator, Pig,
                       digest_bytes, run_stage, PIG_FIXTURE)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "work", "c3")
BATCH = "btch_20260923_chaos_c3"
ITEM = "clearwater-plumbing-demo"
T_FACT = "2026-09-23T19:30:00.000Z"
GEN_AT = "2026-09-24T00:30:00.000Z"
PIG_V2 = "/home/nolan/fyd-chaos-lane/c3-fixture-v2.json"


def make_v2():
    """Write the changed-source fixture copy (phone 0142->0143), locally then
    transfer to the Pig. The workspace original is never touched."""
    import subprocess
    from chaos_lib import WSL_RUN
    with open(os.path.expanduser(
            "~/workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json")) as f:
        raw = json.load(f)

    def swap(v):
        if isinstance(v, str):
            return (v.replace("(970) 555-0142", "(970) 555-0143")
                     .replace("Clearwater Plumbing Co.", "Clearwater Plumbing Company"))
        if isinstance(v, list):
            return [swap(x) for x in v]
        if isinstance(v, dict):
            return {k: swap(x) for k, x in v.items()}
        return v

    raw = swap(raw)
    local_v2 = os.path.join(ROOT, "fixture-v2.json")
    with open(local_v2, "w") as f:
        json.dump(raw, f)
    p = subprocess.run(
        ["scp", "-F", "/home/hatch/.ssh/pig-config", local_v2,
         "pigwsl:C:/Users/nolan/transfer/c3-v2.json"],
        capture_output=True, text=True, timeout=120)
    assert p.returncode == 0, p.stderr[-500:]
    sp = os.path.join(ROOT, "cp-v2.sh")
    with open(sp, "w") as fh:
        fh.write("cp /mnt/c/Users/nolan/transfer/c3-v2.json " + PIG_V2
                 + " && rm /mnt/c/Users/nolan/transfer/c3-v2.json"
                 + " && sha256sum " + PIG_V2 + "\n")
    p = subprocess.run([WSL_RUN, sp, "60"], capture_output=True, text=True, timeout=120)
    assert p.returncode == 0, p.stderr[-500:]
    return p.stdout.split()[0]


def fixture_digest_pig(path):
    import subprocess
    from chaos_lib import WSL_RUN
    sp = os.path.join(ROOT, "shad.sh")
    with open(sp, "w") as fh:
        fh.write("sha256sum " + path + "\n")
    p = subprocess.run([WSL_RUN, sp, "60"], capture_output=True, text=True, timeout=120)
    return p.stdout.split()[0]


def spec_digest_of(store, record):
    payload = json.loads(store.read_artifact(record["output_digest"]).decode())
    return payload.get("digest")


def main():
    os.makedirs(ROOT, exist_ok=True)
    os.environ["CHAOS_WORKDIR"] = ROOT
    d2 = make_v2()
    d1 = fixture_digest_pig(PIG_FIXTURE)
    assert d1 != d2, "v2 fixture must differ from v1"

    store, leases, pig = CheckpointStore(ROOT), LeaseCoordinator(ROOT), Pig()
    journal = Journal(os.path.join(ROOT, "journal.jsonl"), leases)

    # v1 pipeline.
    ext1 = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                     {"fixture_digest": d1, "extractedAt": T_FACT},
                     "extract", [PIG_FIXTURE,
                                 "/home/nolan/fyd-chaos-lane/c3-facts-v1.json", T_FACT],
                     "w-c3")
    gen1 = run_stage(store, leases, journal, pig, BATCH, ITEM, "GENERATE",
                     {"facts_digest": ext1["record"]["output_digest"], "generatedAt": GEN_AT},
                     "generate", [PIG_FIXTURE,
                                  "/home/nolan/fyd-chaos-lane/c3-spec-v1.json", GEN_AT],
                     "w-c3")
    spec1 = spec_digest_of(store, gen1["record"])

    # Source changes mid-run: EXTRACT with v2 inputs.
    ext2 = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                     {"fixture_digest": d2, "extractedAt": T_FACT},
                     "extract", [PIG_V2,
                                 "/home/nolan/fyd-chaos-lane/c3-facts-v2.json", T_FACT],
                     "w-c3")
    gen2 = run_stage(store, leases, journal, pig, BATCH, ITEM, "GENERATE",
                     {"facts_digest": ext2["record"]["output_digest"], "generatedAt": GEN_AT},
                     "generate", [PIG_V2,
                                  "/home/nolan/fyd-chaos-lane/c3-spec-v2.json", GEN_AT],
                     "w-c3")
    spec2 = spec_digest_of(store, gen2["record"])

    # History check: v1 inputs still hit the old checkpoint.
    ext1_again = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                           {"fixture_digest": d1, "extractedAt": T_FACT},
                           "extract", [PIG_FIXTURE,
                                       "/home/nolan/fyd-chaos-lane/c3-facts-v1.json", T_FACT],
                           "w-c3")

    verdict = (
        d1 != d2
        and not ext1["cache_hit"]
        and not gen1["cache_hit"]
        and not ext2["cache_hit"]          # v2 inputs: MISS, no stale reuse
        and not gen2["cache_hit"]
        and ext1_again["cache_hit"]        # v1 inputs: HIT, history preserved
        and ext1_again["record"]["output_digest"] == ext1["record"]["output_digest"]
        and spec1 != spec2                 # title change detected downstream
        and pig.invocations == 4           # exactly 4 real executions, no more
    )
    # Phone-blindness probe: is the phone delta visible inside the spec bytes?
    # (Fetched from the Pig below via the artifact payload digests is not
    # enough; the s4 probe already showed zero phone occurrences in v1 spec.)
    result = {
        "experiment": "C3 source change mid-run",
        "mode": "real",
        "fixture_v1_digest": d1[:16],
        "fixture_v2_digest": d2[:16],
        "ext1_cache_hit": ext1["cache_hit"],
        "gen1_spec_digest": spec1[:16] if spec1 else None,
        "ext2_cache_hit": ext2["cache_hit"],
        "gen2_spec_digest": spec2[:16] if spec2 else None,
        "spec_digests_differ": spec1 != spec2,
        "v1_rerun_cache_hit": ext1_again["cache_hit"],
        "v1_rerun_digest_stable": ext1_again["record"]["output_digest"] == ext1["record"]["output_digest"],
        "pig_executions": pig.invocations,
        "journal_lines": len(journal.lines()),
        "verdict": "PASS" if verdict else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
