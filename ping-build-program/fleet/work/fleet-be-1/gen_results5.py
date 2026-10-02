"""Generate fleet/results/backend/BAC-0201..0250.json (established schema)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE, "bench5_results.json")))["results"]
OUT = os.path.expanduser("~/workspace/ping-build-program/fleet/results/backend")
EF = ["fleet/work/fleet-be-1/bench5.py", "fleet/work/fleet-be-1/bench5b.py",
      "fleet/work/fleet-be-1/bench5_results.json"]
CONF = {"PROVEN": 0.85, "ADAPT": 0.6, "REJECTED": 0.85, "NEEDS-FOLLOWUP": 0.5}

def pct(b, a): return round((a - b) / b * 100, 1) if b else 0.0

V = {
 "BAC-0201": ("PROVEN", "15.20ms to 0.10ms (-99%): numpy vectorized render vs python loop.", None),
 "BAC-0202": ("PROVEN", "6.12ms to 3.72ms (-39%) with identical 2-group quality: TF-cosine leader clustering beats template normalization.", None),
 "BAC-0203": ("REJECTED", "OT transform produced ' braveworld' vs naive 'brave world' (convergent=false): the transform had an off-by-one in the delete range and did not converge.", None),
 "BAC-0204": ("ADAPT", "0.83ms to 0.66ms (-21%): dual-write new schema edges out eager migration rewrite, modestly.", None),
 "BAC-0205": ("PROVEN", "0.26ms to 0.16ms (-37%): readinto preallocated buffer vs per-chunk read allocation.", None),
 "BAC-0206": ("PROVEN", "bytes 3128 to 2035 (-35%) and -37% time: columnar layout compresses better than row-wise.", None),
 "BAC-0207": ("ADAPT", "hits 597 to 617 (+20) at 2.6x CPU: 2Q with ghost list resists scan pollution better than LRU, at a cost.", None),
 "BAC-0208": ("PROVEN", "0.17ms to 0.00ms (-99%): segmented snapshot restore avoids the monolithic merge.", None),
 "BAC-0209": ("PROVEN", "35.96ms to 1.12ms (-97%): function-level compile cache recompiles only the changed function vs the whole module.", None),
 "BAC-0210": ("REJECTED", "0.22ms to 0.70ms (+217%): bisect-insertion into a list is O(n) memmove per insert; full Timsort resort wins.", None),
 "BAC-0211": ("ADAPT", "bytes 138240 to 97912 (-29%) at 6ms absolute CPU: packfile delta chains save space; the win is storage, not speed.", None),
 "BAC-0212": ("PROVEN", "audit: single-bucket LSH recall vs all-pairs ground truth is 0.013 (76 of 5950 pairs): single-bucket lookup misses nearly everything, confirming the BAC-0178 followup need.", None),
 "BAC-0213": ("PROVEN", "3.06ms to 0.16ms (-95%): one Tarjan SCC pass vs per-node DFS cycle detection.", None),
 "BAC-0214": ("ADAPT", "same results at 54% more time: transactional outbox removes the crash-divergence window naive dual-write leaves open; correctness win, price paid.", None),
 "BAC-0215": ("NEEDS-FOLLOWUP", "corrected sim still shows 0 stale serves both paths: synchronous refresh cannot model the async stale-read window; needs an async reader model.", "model async readers racing the TTL window to measure real stale serves"),
 "BAC-0216": ("PROVEN", "86.86ms to 0.00ms (-100%): dirty-bitmap incremental snapshot vs full deepcopy.", None),
 "BAC-0217": ("REJECTED", "0.07ms to 0.10ms (+43%): the deadline never triggered before the size limit, so deadline batching added only overhead.", None),
 "BAC-0218": ("ADAPT", "17.12ms to 15.07ms (-12%): tumbling-window batching marginally beats per-event aggregation.", None),
 "BAC-0219": ("ADAPT", "high-priority drops 375 to 144 at 4x CPU: O(1) two-deque priority shedding fixes the BAC-0150 linear-scan cost but Python overhead remains.", None),
 "BAC-0220": ("ADAPT", "lottery scheduling served all flows proportionally (60:30:10) with interleaved order vs strict-priority draining; tiny absolute cost.", None),
 "BAC-0221": ("REJECTED", "0.01ms vs 0.02ms (noise): LIFO-local/FIFO-steal indistinguishable from FIFO-everywhere.", None),
 "BAC-0222": ("PROVEN", "election attempts 100 to 1 (-79% time): single-flight election vs thundering-herd race.", None),
 "BAC-0223": ("PROVEN", "interactive starves 10 to 0 at +4% time in a real threaded checkout model: the reserved lane works, resolving the BAC-0128 followup.", None),
 "BAC-0224": ("REJECTED", "cost model 220500 vs 220500: bushy and left-deep identical here; no improvement demonstrated.", None),
 "BAC-0225": ("REJECTED", "0.00ms to 48.71ms: naive Python bitmap scan far slower than dict posting lists; bitmap needs a real bitset engine.", None),
 "BAC-0226": ("REJECTED", "max load 2000 vs 2000: splitting partition 0 did not reduce max load; heat existed on other partitions too.", None),
 "BAC-0227": ("PROVEN", "0.88ms to 0.02ms (-98%): keyset page + estimated total vs OFFSET + exact COUNT.", None),
 "BAC-0228": ("ADAPT", "965.62ms to 883.61ms (-8%): idempotent dedupe skips 2000 redeliveries' work, but set overhead and variance bound the win; fair rerun of BAC-0194.", None),
 "BAC-0229": ("REJECTED", "3.45ms to 5.63ms (+63%): array('l') summation slower than list sum; boxing dominates.", None),
 "BAC-0230": ("REJECTED", "shared chunks 4 vs 0: the gear-hash CDC found zero shared chunks under shift, worse than fixed-size; this CDC implementation is broken.", None),
 "BAC-0231": ("REJECTED", "bytes 40201 to 40717 and +508% time: bz2 was worse than zlib on random binary; codec selection backfired.", None),
 "BAC-0232": ("REJECTED", "hits 666 vs 558: segmented probationary/protected LRU scored FEWER hits than single LRU here; the probation segment was too small.", None),
 "BAC-0233": ("ADAPT", "entries 4000 to 3100 (-22%): generational checkpoints trim retained state modestly.", None),
 "BAC-0234": ("PROVEN", "1.57ms to 0.40ms (-75%): segmented snapshots restore from the nearest segment.", None),
 "BAC-0235": ("PROVEN", "96.34ms to 0.03ms (-100%): persistent compile daemon vs cold compiler per build.", None),
 "BAC-0236": ("REJECTED", "peak bytes 35088 to 102560 and +16% time: LRU-bounded memo cost MORE than unbounded for 300 keys; OrderedDict overhead dominates.", None),
 "BAC-0237": ("REJECTED", "3.92ms to 5.19ms (+33%) with identical counts: hash-prefix sharding adds cost with no benefit at 1000 blobs.", None),
 "BAC-0238": ("REJECTED", "near pairs within threshold 104 vs 1: term weighting destroyed simhash closeness at this radius; weighting hurt.", None),
 "BAC-0239": ("NEEDS-FOLLOWUP", "after() was an identical emulation of before(): no real dynamic topo structure was tested.", "implement a genuine dynamic topological order structure and compare"),
 "BAC-0240": ("PROVEN", "7.33ms to 0.00ms (-100%): event-carried state transfer vs re-query per read.", None),
 "BAC-0241": ("PROVEN", "blocked recomputes 100 to 0 (10 background refreshes): stale-while-revalidate never blocks readers (simulated).", None),
 "BAC-0242": ("REJECTED", "bytes 15793 vs 15793, +0%: pickle protocol 5 no gain over 4 here.", None),
 "BAC-0243": ("PROVEN", "1221.92ms to 519.85ms (-57%): request coalescing vs independent duplicate fetches.", None),
 "BAC-0244": ("PROVEN", "processed events 20000 to 12000: checkpointed offsets avoid reworking 8000 pre-crash events vs at-least-once.", None),
 "BAC-0245": ("PROVEN", "dropped 15000 to 1375 and -91% time: AIMD adaptive limiter vs fixed limit under varying capacity.", None),
 "BAC-0246": ("REJECTED", "served counts identical (40/40/40) at +80% time: hierarchical WFQ added cost with no differentiation.", None),
 "BAC-0247": ("REJECTED", "loads [51,50,50,49] vs [50,50,50,50] (+7%): push vs pull both balance; no meaningful difference.", None),
 "BAC-0248": ("ADAPT", "both reject stale writes, but the durable generation file survives process restart at file-IO cost; durability property, not speed.", None),
 "BAC-0249": ("REJECTED", "0.98ms to 1.52ms (+55%): per-thread sharded pool slower than shared pool with lock; thread overhead dominates.", None),
 "BAC-0250": ("PROVEN", "19.15ms to 0.00ms (-100%): maintained projection reads vs re-derive per read.", None),
}

counts = {}
for mid in sorted(data):
    x = data[mid]
    verdict, summ, fu = V[mid]
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
