#!/usr/bin/env python3
"""C4. CACHE-ENTRY CORRUPTION (real machinery + real corruption).

1. Run EXTRACT once and commit (real Pig).
2. Corrupt the committed artifact bytes in place (bit flip), keeping the
   digest-keyed filename.
3. Read through the cache API (CheckpointStore.lookup + read_artifact).
   Expectation: a typed CorruptCacheError is raised; the corrupt bytes are
   preserved in quarantine for forensics; no false cache hit is served.
4. The pipeline must then be able to recover: quarantine the torn entry,
   invalidate it, and do a bounded single recompute (real Pig) that yields
   a clean artifact whose digest matches the pre-corruption digest, proving
   the recompute is faithful and the corruption did not propagate.

The corruption targets only this experiment's own artifact files.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chaos_lib import (CheckpointStore, CorruptCacheError, Journal,
                       LeaseCoordinator, Pig, run_stage, PIG_FIXTURE, work_id)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "work", "c4")
BATCH = "btch_20260923_chaos_c4"
ITEM = "clearwater-plumbing-demo"
T_FACT = "2026-09-23T19:30:00.000Z"
INPUTS = {"fixture_digest": "1bef189ee1376d2c45d1cb3de2b36fdb89961d09f42e30ae1231dbf775a978b6",
          "extractedAt": T_FACT}


def main():
    os.makedirs(ROOT, exist_ok=True)
    os.environ["CHAOS_WORKDIR"] = ROOT
    store, leases, pig = CheckpointStore(ROOT), LeaseCoordinator(ROOT), Pig()
    journal = Journal(os.path.join(ROOT, "journal.jsonl"), leases)
    wid = work_id(BATCH, ITEM, "EXTRACT", INPUTS)

    # 1. Clean run and commit.
    r1 = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                   INPUTS, "extract",
                   [PIG_FIXTURE, "/home/nolan/fyd-chaos-lane/c4-facts.json", T_FACT],
                   "w-c4")
    assert not r1["cache_hit"]
    clean_digest = r1["record"]["output_digest"]
    art_path = os.path.join(store.art_dir, clean_digest)
    clean_bytes = open(art_path, "rb").read()

    # 2. Corrupt the artifact in place (single bit flip).
    corrupt = bytearray(clean_bytes)
    corrupt[len(corrupt) // 2] ^= 0x01
    with open(art_path, "wb") as f:
        f.write(bytes(corrupt))

    # 3. Read through the cache API: typed failure, quarantine, no false hit.
    hit = store.lookup(wid)
    assert hit is not None and hit["output_digest"] == clean_digest
    raised = None
    try:
        store.read_artifact(hit["output_digest"])
    except CorruptCacheError as e:
        raised = e
    assert raised is not None, "corrupt artifact was served as a hit"
    store.quarantine_artifact(clean_digest, "c4 injected bit-flip")
    qfiles = sorted(os.listdir(store.quarantine_dir))
    assert any(f.startswith(clean_digest) for f in qfiles), "nothing quarantined"
    assert not os.path.exists(art_path), "corrupt bytes still live"

    # 4. Bounded recovery: invalidate the torn entry, exactly one recompute.
    store.invalidate(wid, "digest-mismatch-recovery")
    pig_before = pig.invocations
    r2 = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                   INPUTS, "extract",
                   [PIG_FIXTURE, "/home/nolan/fyd-chaos-lane/c4-facts.json", T_FACT],
                   "w-c4")
    recovery_runs = pig.invocations - pig_before
    r3 = run_stage(store, leases, journal, pig, BATCH, ITEM, "EXTRACT",
                   INPUTS, "extract",
                   [PIG_FIXTURE, "/home/nolan/fyd-chaos-lane/c4-facts.json", T_FACT],
                   "w-c4")

    verdict = (
        raised is not None
        and qfiles
        and recovery_runs == 1
        and not r2["cache_hit"]
        and r2["record"]["output_digest"] == clean_digest
        and r3["cache_hit"]
        and r3["record"]["output_digest"] == clean_digest
        and store.read_artifact(clean_digest) == clean_bytes
    )
    result = {
        "experiment": "C4 cache-entry corruption",
        "mode": "real",
        "clean_digest_prefix": clean_digest[:16],
        "corruption": "single bit flip at byte %d of artifact" % (len(clean_bytes) // 2,),
        "typed_failure": type(raised).__name__ if raised else None,
        "quarantined_files": qfiles,
        "recovery_pig_runs": recovery_runs,
        "recovery_digest_matches_precorruption": r2["record"]["output_digest"] == clean_digest,
        "post_recovery_hit_clean": r3["cache_hit"],
        "verdict": "PASS" if verdict else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
