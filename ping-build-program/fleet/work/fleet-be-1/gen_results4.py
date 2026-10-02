"""Generate fleet/results/backend/BAC-0151..0200.json (established schema)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE, "bench4_results.json")))["results"]
OUT = os.path.expanduser("~/workspace/ping-build-program/fleet/results/backend")
EF = ["fleet/work/fleet-be-1/bench4.py", "fleet/work/fleet-be-1/bench4b.py",
      "fleet/work/fleet-be-1/bench4_results.json"]
CONF = {"PROVEN": 0.85, "ADAPT": 0.6, "REJECTED": 0.85, "NEEDS-FOLLOWUP": 0.5}

def pct(b, a): return round((a - b) / b * 100, 1) if b else 0.0

# mid -> (verdict, summary sentence, followup or None)
V = {
 "BAC-0151": ("ADAPT", "DRR equalized byte ratios across flows (packet RR was 7.5:1 against the small-packet flow) at about 2x scheduling cost; byte-fairness is a fairness win, not a speed win.", None),
 "BAC-0152": ("REJECTED", "0.02ms vs 0.06ms, noise-level absolute times; bounded random-victim probes showed no measurable gain over scan-all and added RNG overhead.", None),
 "BAC-0153": ("REJECTED", "peak tick load 20 vs 20: the (i*7919)%10 mapping did not decorrelate renewals, so the jitter claim was unmeasured; both paths identical.", None),
 "BAC-0154": ("PROVEN", "9.58ms to 0.00ms (-100%): pre-warmed pool eliminates connect cost on first checkout.", None),
 "BAC-0155": ("PROVEN", "463.55ms to 1.45ms (-100%): smallest-first join order avoids the C×A intermediate explosion.", None),
 "BAC-0156": ("REJECTED", "0.02ms vs 0.02ms (-1%, noise): covering index showed no gain over index+heap fetch for dict-backed rows.", None),
 "BAC-0157": ("PROVEN", "3.04ms to 0.28ms (-91%): range partitioning prunes the range query to 1 of 10 partitions.", None),
 "BAC-0158": ("PROVEN", "1.31ms to 0.82ms (-37%): deferred join (ids first, then rows) beats wide-row OFFSET on 200-byte rows.", None),
 "BAC-0159": ("PROVEN", "29.29ms to 4.31ms (-85%): batching cursor commits with data in one transaction gives 10x fewer commits and closes the 500-row crash skew.", None),
 "BAC-0160": ("ADAPT", "3.44ms to 2.69ms (-22%): struct-of-arrays beats array-of-structs for column scans, but the gain is modest.", None),
 "BAC-0161": ("REJECTED", "fixed 1KB chunking found 720/720 unique chunks (zero sharing) under insertion shift, worse than whole-file dedup; fixed-size chunking fails under shift, motivating content-defined chunking.", None),
 "BAC-0162": ("PROVEN", "1860.77ms to 581.67ms (-69%): caching negative results avoids recomputing misses.", None),
 "BAC-0163": ("PROVEN", "55.20ms to 15.49ms (-72%): per-domain pools reuse connections where a generic pool reconnects (simulated).", None),
 "BAC-0164": ("REJECTED", "call-graph selection picked 8 tests vs 4 file-based and ran 463% slower; precision claim unproven, it selected more, not fewer.", None),
 "BAC-0165": ("ADAPT", "2180.60ms to 1597.61ms (-27%): 2-process pool helps 48 render units, but the gain is modest.", None),
 "BAC-0166": ("ADAPT", "484.30ms to 417.85ms (-14%): dynamic chunksize=4 slightly beats serial for uneven units; marginal.", None),
 "BAC-0167": ("ADAPT", "two-level template tree gives 3 top templates x 6 leaf groups vs 1 flat group at 35% more CPU; finer structure, small price.", None),
 "BAC-0168": ("PROVEN", "three-way merge resolved disjoint changes with 0 conflicts vs 2 for two-way diff; correctness proven at noise-level time.", None),
 "BAC-0169": ("REJECTED", "0.19ms to 1.46ms (+651%) with identical validation outcomes: central registry is slower than ad-hoc checks in Python with no measured benefit.", None),
 "BAC-0170": ("REJECTED", "11.73ms vs 24.54ms (+109%): os.sendfile was slower than the userspace read/write loop at 4MB; no zero-copy gain observed.", None),
 "BAC-0171": ("PROVEN", "bytes 10694 to 123 and time -99%: delta pre-transform before zlib dominates raw compression on numeric series.", None),
 "BAC-0172": ("REJECTED", "hits 642 vs 649 (+7) at 65x CPU cost: LFU showed no meaningful hit-rate gain over LRU on this workload.", None),
 "BAC-0173": ("PROVEN", "12.92ms to 0.00ms (-100%): copy-on-write snapshot vs lock+deepcopy.", None),
 "BAC-0174": ("PROVEN", "233.64ms to 0.00ms (-100%): cached incrementally-updated aggregate vs rebuild-per-query over 50 queries.", None),
 "BAC-0175": ("PROVEN", "224.71ms to 39.98ms (-82%): tree-shaking compiled 30 reachable of 150 nodes.", None),
 "BAC-0176": ("PROVEN", "49.99ms to 0.22ms (-100%): change-detected propagation skips the whole downstream chain on a no-op change.", None),
 "BAC-0177": ("ADAPT", "hash-chained log adds tamper evidence (any edit breaks the chain) at 9.8ms per 3000 entries; a security property with small absolute cost, not a speedup.", None),
 "BAC-0178": ("NEEDS-FOLLOWUP", "multi-probe found 21894 pairs vs 774 single-bucket; the counts diverge too far to trust without an all-pairs ground-truth recall check.", "verify multi-probe LSH recall against all-pairs hamming ground truth"),
 "BAC-0179": ("ADAPT", "edges 812 to 119 via transitive reduction at 22ms one-time cost; smaller invalidation graph, upfront price.", None),
 "BAC-0180": ("REJECTED", "1.15ms vs 1.17ms (+2%, noise): batch read-model updater identical to per-event updates in Python.", None),
 "BAC-0181": ("NEEDS-FOLLOWUP", "stale-serve counting logic was flawed (before measured 0 stale, after 184); the simulation does not measure what it claims.", "rewrite the stale-window simulation with correct serve/refresh accounting"),
 "BAC-0182": ("PROVEN", "peak bytes 1192588 to 240: copy-on-write snapshot vs deepcopy, memory proof included.", None),
 "BAC-0183": ("REJECTED", "adaptive batching produced 177 batches vs 30 fixed (over-shrank) at 49x overhead; mis-tuned adaptation is worse than fixed.", None),
 "BAC-0184": ("REJECTED", "260.76ms to 827.14ms (+217%): threaded pipeline slower than serial for these stages; GIL and queue overhead dominate, confirming the thread finding again.", None),
 "BAC-0185": ("ADAPT", "dropped 1872 to 0 unsent at 62% more control cost; credit-based flow control is a loss-avoidance win, not a speed win.", None),
 "BAC-0186": ("ADAPT", "byte ratio first-half 1.933 to 0.933 (closer to 1.0 = fairer) at 69% more scheduling cost; virtual-time FQ is fairer than deficit WFQ.", None),
 "BAC-0187": ("REJECTED", "0.40ms vs 0.40ms (+0%): neighbor-locality stealing indistinguishable from random-victim stealing here.", None),
 "BAC-0188": ("PROVEN", "stale write accepted before, rejected after lease expiry at zero time delta; time-bound leases close the stale-holder window counter fencing leaves open.", None),
 "BAC-0189": ("PROVEN", "20.26ms to 3.15ms (-84%): multiplexing 24 streams over 4 connections vs 1:1 (simulated).", None),
 "BAC-0190": ("PROVEN", "6.08ms to 0.00ms (-100%): cost-based index choice vs always-full-scan on a selective predicate.", None),
 "BAC-0191": ("PROVEN", "0.03ms to 0.01ms (-55%) with index entries 40000 to 4000: partial index dominates full index for 10%-active rows.", None),
 "BAC-0192": ("PROVEN", "3.10ms to 0.14ms (-95%): partition pruning to 1 of 12 vs scan-all-partitions.", None),
 "BAC-0193": ("PROVEN", "17.38ms to 5.65ms (-68%): keyset with (ts,id) tiebreaker vs OFFSET on non-unique ordering.", None),
 "BAC-0194": ("NEEDS-FOLLOWUP", "before() measured len() (O(1)) instead of real per-event work, so the comparison is unfair; rerun with real processing in before.", "rerun idempotent-consumer with real per-event work in the before path"),
 "BAC-0195": ("REJECTED", "3400.72ms vs 3529.56ms (+4%, noise): loop tiling showed no gain at 128^3 in CPython; interpreter overhead dominates cache effects.", None),
 "BAC-0196": ("REJECTED", "shared chunks 4 vs 3: the hand-rolled CDC showed no resilience gain over fixed-size under insertion shift; needs a proper gear-hash CDC.", None),
 "BAC-0197": ("PROVEN", "223.86ms to 0.02ms (-100%): two-level cache (local+remote) vs local-only with evictions.", None),
 "BAC-0198": ("PROVEN", "failures 4 to 0 (-55%): health-checked pool evicts the dead connection instead of failing over it (simulated).", None),
 "BAC-0199": ("ADAPT", "459.38ms to 341.02ms (-26%): quarantining 10 flaky tests speeds the suite, but 3 sometimes-passing tests leave the suite too; honest tradeoff.", None),
 "BAC-0200": ("PROVEN", "707.70ms to 333.03ms (-53%): regenerating the 107-node changed subtree vs all 300 nodes.", None),
}

counts = {}
for mid in sorted(data):
    x = data[mid]
    verdict, summ, fu = V[mid]
    assert x["family"] and x["case"] and x["metric"]
    rec = {
        "mission_id": mid,
        "verdict": verdict,
        "summary": "BEFORE %s: %.3fms; AFTER %s: %.3fms. Delta %+.1f%%. %s" % (
            x["metric"], x["before_ms"], x["change"], x["after_ms"],
            pct(x["before_ms"], x["after_ms"]), summ),
        "evidence_files": EF,
        "confidence": CONF[verdict],
        "followup": fu,
        "numbers": {"before_ms": round(x["before_ms"], 4), "after_ms": round(x["after_ms"], 4),
                    "metric": x["metric"], "change": x["change"], "case": x["case"]},
    }
    json.dump(rec, open(os.path.join(OUT, mid + ".json"), "w"), indent=1)
    counts[verdict] = counts.get(verdict, 0) + 1
print("wrote 50 results:", counts)
