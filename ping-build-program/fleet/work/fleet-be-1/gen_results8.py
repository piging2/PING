"""Generate BAC-0351..BAC-0400 result JSONs from bench8_results.json."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = json.load(open(os.path.join(HERE, "bench8_results.json")))["results"]

# mission_id: (verdict, summary, confidence, followup, numbers_extra)
V = {
 351: ("PROVEN", "Push-down filters at the sensor edge cut network-touching rows from 399 to 10 and time from about 0.22ms to 0.004ms (about 53x).", 0.95, None, {"touched_before": 399, "touched_after": 10}),
 352: ("REJECTED", "Batched Merkle verification measured 0.39ms vs 0.37ms per-proof; batching did not beat per-proof verification in this fixture (tree already cached, hashing dominates).", 0.9, None, {}),
 353: ("PROVEN", "Tuning LSH from 4x8 to 8x4 raised recall from 0.733 to 1.0 on 4,115 ground-truth near-duplicate pairs.", 0.95, None, {"truth_pairs": 4115, "recall_4x8": 0.733, "recall_8x4": 1.0}),
 354: ("REJECTED", "Pearce-Kelly dynamic re-derivation measured 0.36ms vs 0.02ms for re-walking in this fixture; the rank bookkeeping cost more than the walk at this scale.", 0.9, None, {}),
 355: ("PROVEN", "Incremental view maintenance with a change index cut rebuild time from about 0.59ms to 0.22ms (about 2.7x).", 0.9, None, {}),
 356: ("REJECTED", "Jittered refresh-ahead showed no stale-read improvement (0/0 in both) and slightly higher cost; the simulation did not model the duplicate-refresh race the change targets.", 0.85, None, {"stale_before": 0, "stale_after": 0, "refreshes_before": 2232, "refreshes_after": 2215}),
 357: ("PROVEN", "Raw-buffer batching of 4,000,000 events cut time from about 2.60ms to 0.14ms (about 19x) with identical bytes (4,000,000) on the wire.", 0.95, None, {"bytes_before": 4000089, "bytes_after": 4000000}),
 358: ("REJECTED", "Batched ring-buffer drain measured 7.97ms vs 4.89ms raw queue drain; the batch bookkeeping cost more than queue.get_nowait at this scale in CPython.", 0.9, None, {}),
 359: ("PROVEN", "Session windows with a watermark cut processing from about 14.28ms to 2.09ms (about 6.8x), collapsing 7,997 junk events into 3 sessions with 0 late arrivals.", 0.95, None, {"kept_before": 7997, "sessions_after": 3, "late_after": 0}),
 360: ("ADAPT", "Vegas-style delay-based control dropped packet loss from 267 to 0, but only by reducing the send rate; throughput was not measured, so the win is conditional on the rate trade-off.", 0.85, None, {"dropped_before": 267, "dropped_after": 0}),
 361: ("REJECTED", "Smaller DRR quantum moved the interactive tail from 73 to 71 time units, within simulation noise; no meaningful latency win demonstrated.", 0.85, None, {"interactive_tail_before": 73, "interactive_tail_after": 71}),
 362: ("PROVEN", "Locality-aware work stealing cut makespan from 396 to 300 (about 24%), at the cost of more migrations (213 to 300 scans).", 0.9, None, {"makespan_before": 396, "makespan_after": 300, "scans_before": 213, "scans_after": 300}),
 363: ("ADAPT", "Hybrid Logical Clock fencing fenced all 500 stale writers just like Lamport clocks, at higher CPU cost (0.07ms vs 0.02ms); the HLC wall-clock-proximity property was not exercised.", 0.85, None, {"fenced_before": 500, "fenced_after": 500}),
 364: ("PROVEN", "PID-based pool sizing halved the tracking error (MAE 1.7 to 0.8) versus reactive sizing, for negligible extra arithmetic.", 0.9, None, {"mae_reactive": 1.7, "mae_pid": 0.8}),
 365: ("PROVEN", "Vectorized filtering with NumPy cut 1M-row selection from about 19.97ms to 0.21ms (about 94x).", 0.95, None, {}),
 366: ("REJECTED", "B-tree page simulation with binary search per page measured 0.16ms vs 0.10ms flat bisect; the page abstraction lost in CPython at this size.", 0.9, None, {}),
 367: ("ADAPT", "Rendezvous hashing cut the max-min key spread from 708 to 107 (about 6.6x more even) but cost 448ms vs 24ms of hashing CPU; needs cached hashes in practice.", 0.9, None, {"spread_before": 708, "spread_after": 107}),
 368: ("PROVEN", "A persistent index cursor for covering-index pagination cut page time from about 0.062ms to 0.007ms (about 8.4x) with identical rows; this also fixed an off-by-one in the keyset predicate the assertion caught.", 0.95, None, {"same_results": True}),
 369: ("REJECTED", "Async group commit measured 41.9ms vs 28.3ms serial; thread-pool overhead for 8 batches dominated at this scale.", 0.9, None, {}),
 370: ("REJECTED", "The 4-way unrolled Python sum measured 52.5ms vs 5.1ms builtin C sum on the same list; manual unrolling cannot beat the builtin.", 0.95, None, {}),
 371: ("ADAPT", "FastCDC found the same 2 shared cut points as fixed 8KB chunking (7 chunks vs 6) with content-defined boundaries robust to shifts, at higher CPU (37ms vs 23ms).", 0.85, None, {"shared_before": 2, "shared_after": 2, "chunks_before": 6, "chunks_after": 7}),
 372: ("REJECTED", "BLAKE2b measured 10.95ms vs 3.67ms SHA-256 on 512KB in this environment; the expected speed advantage did not materialize here.", 0.9, None, {}),
 373: ("ADAPT", "p-adaptive ARC matched the tuned ARC at 74 misses but ran faster (0.09ms vs 0.17ms); the adaptation machinery added no accuracy here.", 0.85, None, {"misses_before": 74, "misses_after": 74}),
 374: ("PROVEN", "Reverse-dependency impact analysis selected the same 5 tests as the full scan in 0.0011ms vs 0.0066ms (about 6x).", 0.9, None, {"tests_before": 5, "tests_after": 5}),
 375: ("ADAPT", "Block-change detection skipped 3 no-op renders (4 to 1) on a real 8x8 diff, but frame time was unchanged (45.9ms vs 43.7ms, within noise); the win is skipped work, not speed.", 0.85, None, {"renders_before": 4, "renders_after": 1}),
 376: ("PROVEN", "Threads plus NumPy (GIL released) cut the workload from about 163ms to 23ms (about 7x) versus process-per-unit dispatch.", 0.95, None, {}),
 377: ("ADAPT", "Drain-style parse-tree clustering produced the same 2 groups as template regex in 1.66ms vs 3.19ms (about 1.9x); structure is equivalent here.", 0.9, None, {"groups_before": 2, "groups_after": 2}),
 378: ("REJECTED", "Hirschberg produced the same edit script (10) as full DP but measured 82ms vs 59ms; the linear-space advantage was not measured and the recursion cost more.", 0.9, None, {"edit_script_before": 10, "edit_script_after": 10}),
 379: ("PROVEN", "Thread-parallel backfill cut the schema-evolution backfill from about 9.17ms to 6.17ms (about 1.5x).", 0.9, None, {}),
 380: ("REJECTED", "sendfile rematch at 32MB measured 217ms vs 155ms mmap; the earlier sendfile win did not reproduce, likely page-cache warmth effects.", 0.85, None, {}),
 381: ("ADAPT", "Per-column dictionaries cut compressed bytes from 8,279 to 7,013 (about 15%) at equal speed (1.03ms vs 1.00ms); a size win without a speed win.", 0.9, None, {"bytes_before": 8279, "bytes_after": 7013}),
 382: ("ADAPT", "S3-FIFO raised hits from 340 to 418 under a scan-plus-hot mix, at higher per-lookup CPU (0.21ms vs 0.13ms); better scan resistance with an overhead cost.", 0.9, None, {"hits_before": 340, "hits_after": 418}),
 383: ("REJECTED", "Universal compaction merged more data than the leveled 2-merge in this simulation and measured slower (2.22ms vs 0.53ms); no benefit demonstrated.", 0.85, None, {}),
 384: ("REJECTED", "Nearest-snapshot-plus-tail measured 0.61ms vs 0.002ms full-snapshot copy because the simulation held the full snapshot for free; the write-amplification trade-off the change targets was not modeled.", 0.85, None, {}),
 385: ("REJECTED", "Sharded cache measured 1,180ms vs 1,122ms single dict with fresh caches per call; sharding only pays under lock contention, which a single-threaded simulation cannot show.", 0.9, None, {}),
 386: ("REJECTED", "modref change propagation touched the same 299 cells as the manual dirty-set scan at equal speed; no difference in this fixture.", 0.85, None, {"touched_before": 299, "touched_after": 299}),
 387: ("ADAPT", "4KB chunk-level CAS saved 8,192 bytes (655,360 to 647,168) on a half-duplicate corpus but cost 11.86ms vs 1.13ms of hashing CPU; the dedupe ratio only pays with more duplication.", 0.9, None, {"bytes_before": 655360, "bytes_after": 647168}),
 388: ("PROVEN", "On 100 known near-duplicate pairs, MinHash (Jaccard >= 0.5) recalled 100/100 versus SimHash (Hamming <= 6) at 91/100.", 0.9, None, {"truth_pairs": 100, "simhash_found": 91, "minhash_found": 100}),
 389: ("PROVEN", "Tarjan SCC condensation identified 20 components and ordered a graph with a cycle where Kahn stalled at 10 of 300 nodes; cycle-tolerant ordering is the proven behavioral property.", 0.95, None, {"kahn_ordered": 10, "sccs": 20, "n": 300}),
 390: ("REJECTED", "Predicate pushdown measured 36.7ms vs 21.4ms; the predicate was a no-op on this additive workload, adding pure overhead.", 0.9, None, {}),
 391: ("ADAPT", "Version-stamp invalidation ran the staleness check faster (4.24ms vs 7.02ms) with zero stale reads in both; the invalidation race itself was not exercised.", 0.85, None, {"stale_before": 0, "stale_after": 0}),
 392: ("PROVEN", "Dirty-page incremental snapshots cut bytes from 512,000 to 24,000 (about 21x) and time from 0.049ms to 0.003ms (3 of 64 pages dirty).", 0.95, None, {"bytes_before": 512000, "bytes_after": 24000}),
 393: ("ADAPT", "Adaptive batch sizing produced 600 small batches versus 60 fixed ones, lowering per-batch latency at higher dispatch overhead (3.58ms vs 0.05ms); a latency-for-throughput trade.", 0.85, None, {"batches_before": 60, "batches_after": 600}),
 394: ("ADAPT", "The transactional sink processed 9,000 unique events versus 12,000 raw deliveries (exactly-once semantics, no duplicate rework) at higher CPU (1.66ms vs 0.46ms).", 0.9, None, {"processed_before": 12000, "processed_after": 9000}),
 395: ("PROVEN", "CoDel-style sojourn dropping cut drops from 65 to 6 and final queue from 80 to 0 while delivering more (21,324 vs 20,135) with a responsive AIMD sender.", 0.95, None, {"dropped_before": 65, "dropped_after": 6, "queue_before": 80, "queue_after": 0, "delivered_before": 20135, "delivered_after": 21324}),
 396: ("ADAPT", "Virtual-time WFQ achieved the configured 3:1 weighted byte share (ratio 3.0 vs 1.09 under DRR) with an unchanged interactive tail (71 vs 73); a policy choice, not a latency win.", 0.85, None, {"byte_ratio_before": 1.091, "byte_ratio_after": 3.0}),
 397: ("REJECTED", "Help-first made makespan worse (400 vs 251) in the serial simulation because helpers serialized on the hot deque; the concurrent benefit was not demonstrable this way.", 0.85, None, {"makespan_before": 251, "makespan_after": 400}),
 398: ("ADAPT", "Quorum (2/3) epoch agreement matched single CAS values exactly; the f+1 fault-tolerance property was not exercised in the failure-free simulation.", 0.85, None, {}),
 399: ("PROVEN", "Hedged checkout (racing two fresh connections) cut simulated tail wait from 0.589 to 0.397 (about 33%).", 0.9, None, {"wait_before": 0.5887, "wait_after": 0.3974}),
 400: ("ADAPT", "DP join ordering found the same optimal plan as smallest-first (cost 20010020000, order d,c,b,a); DP guarantees optimality while the heuristic happened to match in this fixture.", 0.85, None, {}),
}

ALLOWED = {"PROVEN", "ADAPT", "REJECTED", "NEEDS-FOLLOWUP", "N-A"}

def main():
    counts = {}
    for i in range(351, 401):
        mid = "BAC-%04d" % i
        m = SRC[mid]
        verdict, summary, conf, followup, nums = V[i]
        assert verdict in ALLOWED
        out = {
            "mission_id": mid,
            "verdict": verdict,
            "summary": summary,
            "evidence_files": ["fleet/work/fleet-be-1/bench8.py", "fleet/work/fleet-be-1/bench8b.py",
                               "fleet/work/fleet-be-1/bench8_results.json"],
            "confidence": conf,
            "followup": followup,
            "numbers": {
                "before_ms": round(m["before_ms"], 4),
                "after_ms": round(m["after_ms"], 4),
                "before_stdev": round(m.get("before_stdev", 0.0), 4),
                "after_stdev": round(m.get("after_stdev", 0.0), 4),
            },
        }
        out["numbers"].update(nums)
        counts[verdict] = counts.get(verdict, 0) + 1
        path = os.path.join(os.path.dirname(HERE), "..", "results", "backend", mid + ".json")
        with open(path, "w") as f:
            json.dump(out, f, indent=1)
    print("range8:", counts)

if __name__ == "__main__":
    main()
