"""Emit fleet/results/backend/BAC-0301..BAC-0350.json from bench7_results.json."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "../../results/backend"))
EF = ["fleet/work/fleet-be-1/bench7.py", "fleet/work/fleet-be-1/bench7b.py",
      "fleet/work/fleet-be-1/bench7_results.json"]
CONF = {"PROVEN": 0.85, "ADAPT": 0.6, "REJECTED": 0.85, "NEEDS-FOLLOWUP": 0.5}

data = json.load(open(os.path.join(HERE, "bench7_results.json")))["results"]

def pct(b, a):
    return 100.0 * (a - b) / b if b else 0.0

# verdict, one-line evidence, followup
V = {
 "BAC-0301": ("PROVEN", "bytes 400000 to 27928 (-93%): delta encoding vs base vs dedup-only for 20 near-duplicate 20KB blobs.", None),
 "BAC-0302": ("PROVEN", "rebuild units 100 to 1: chunk-level cache keys vs file-level on a 1-byte change.", None),
 "BAC-0303": ("PROVEN", "misses 104 to 77 (-26%): FOLLOWUP BAC-0268: with skewed (Pareto) demand, LRU beats FIFO; the earlier tie was a no-locality artifact.", None),
 "BAC-0304": ("PROVEN", "fail position 42 to 0: FOLLOWUP BAC-0269: affected-first ordering puts the failing test first.", None),
 "BAC-0305": ("PROVEN", "renders 50 to 1: input-hash skip avoids rendering vs output-hash render-to-compare.", None),
 "BAC-0306": ("REJECTED", "58.03ms to 13245.72ms (228x worse): FOLLOWUP BAC-0271: shared-memory transfer catastrophically worse than pickle for 1MB payloads.", None),
 "BAC-0307": ("REJECTED", "groups 2 to 2, timing noise: FOLLOWUP BAC-0272: template + edit-distance merge adds nothing over pure template.", None),
 "BAC-0308": ("REJECTED", "edit script 5 to 10 and slower: FOLLOWUP BAC-0273: histogram diff worse than positional Myers here.", None),
 "BAC-0309": ("PROVEN", "0.74ms to 0.02ms (-97%): lazy read-time migration (200 reads) vs eager 5000-row migration.", None),
 "BAC-0310": ("PROVEN", "162.29ms to 0.54ms (-100%): os.copy_file_range vs os.sendfile at 32MB.", None),
 "BAC-0311": ("ADAPT", "bytes 93060 to 37971 (-59%) at 8.6x CPU: FOLLOWUP BAC-0276: zlib pre-trained dictionary compresses far better on repetitive messages at CPU cost.", None),
 "BAC-0312": ("REJECTED", "hits 404 to 399: FOLLOWUP BAC-0277: W-TinyLFU did not beat plain TinyLFU on this mix.", None),
 "BAC-0313": ("PROVEN", "26.39ms to 4.41ms (-83%): leveled (2x4) vs size-tiered 8-way compaction merge (simulated).", None),
 "BAC-0314": ("REJECTED", "4.21ms to 266.91ms (63x worse): parallel key-partitioned replay loses to serial; pool overhead dominates 60k events.", None),
 "BAC-0315": ("ADAPT", "0.061ms to 0.048ms (-20%): FOLLOWUP BAC-0279: header-only ABI hash avoids the body-only-change recompile, but the gain is one recompile in 50.", None),
 "BAC-0316": ("REJECTED", "2315ms to 6474ms (2.8x worse), peak 190K to 407K bytes: FOLLOWUP BAC-0280: bounded (1024) memo thrashes when the 2000-key working set exceeds the bound.", None),
 "BAC-0317": ("REJECTED", "0.217ms to 0.499ms: FOLLOWUP BAC-0281: 'batched' verify still hashes per blob; no amortization achieved.", None),
 "BAC-0318": ("ADAPT", "recall 0.296 to 0.35: FOLLOWUP BAC-0282: 4-table LSH beats multi-probe single table, but still misses 65% of pairs.", "more tables or wider bands needed for usable recall"),
 "BAC-0319": ("REJECTED", "sub-microsecond noise both arms: FOLLOWUP BAC-0283: batched PK edge inserts show no gain at 5 edges.", None),
 "BAC-0320": ("REJECTED", "3.89ms to 70.05ms (18x worse): lazy on-read projection loses when 10 reads each re-derive 20k events.", None),
 "BAC-0321": ("ADAPT", "stale 1 to 0 at +50% refreshes: FOLLOWUP BAC-0285: redesigned fixture (slow readers) finally lapses expiry; proactive refresh kills the rare stale serve at refresh cost.", None),
 "BAC-0322": ("PROVEN", "0.176ms to 0.088ms (-50%) at equal bytes: FOLLOWUP BAC-0286: pickle protocol-5 OOB vs protocol 4 at 2MB.", None),
 "BAC-0323": ("PROVEN", "77.02ms to 10.45ms (-86%): FOLLOWUP BAC-0287: batched-drain ring buffer vs threaded queue.Queue.", None),
 "BAC-0324": ("ADAPT", "1.86ms to 0.49ms, kept 7997 to 8000: FOLLOWUP BAC-0288: allowed-lateness keeps the 3 late events, but side-output routing still unexercised (threshold leniency).", None),
 "BAC-0325": ("REJECTED", "dropped 267 to 267 (identical): FOLLOWUP BAC-0255/0289: adaptive token bucket matches static; no gain.", None),
 "BAC-0326": ("REJECTED", "interactive tail 43 to 43 (identical): FOLLOWUP BAC-0290: deficit CBQ still does not beat flat WFQ here.", None),
 "BAC-0327": ("PROVEN", "makespan 250 to 100 (-60%): FOLLOWUP BAC-0291: periodic rebalance beats stealing under heavy skew.", None),
 "BAC-0328": ("PROVEN", "generations 500 to 10 (-98%): FOLLOWUP BAC-0292: batch fencing generation vs per-op (simulated).", None),
 "BAC-0329": ("REJECTED", "MAE 17 to 21 (worse): FOLLOWUP BAC-0293: EWMA-predictive sizing lags reactive elastic on this demand trace.", None),
 "BAC-0330": ("PROVEN", "6.37ms to 0.50ms (-92%): late materialization vs early materialization before the filter.", None),
 "BAC-0331": ("REJECTED", "0.098ms to 2.533ms (26x worse): FOLLOWUP BAC-0261: proper randomized skip list still far slower than bisect.", None),
 "BAC-0332": ("PROVEN", "spread 731 to 268 (-63%): FOLLOWUP BAC-0262: bounded-load spillover vs plain vnodes.", None),
 "BAC-0333": ("PROVEN", "127.02ms to 9.12ms (-93%) with identical rows: search-after with (score,id) tiebreaker vs OFFSET on duplicate scores (ordering bug fixed).", None),
 "BAC-0334": ("PROVEN", "19.98ms to 12.14ms (-39%): FOLLOWUP BAC-0264: group commit (100/batch) vs per-commit WAL.", None),
 "BAC-0335": ("PROVEN", "153.50ms to 9.58ms (-94%): numpy vectorized stencil vs blocked python stencil.", None),
 "BAC-0336": ("ADAPT", "shared 1 to 23 at 4.9x CPU: FOLLOWUP BAC-0266: multi-level CDC finds far more shared content under insertion shift at chunking cost.", None),
 "BAC-0337": ("PROVEN", "3.71ms to 0.54ms (-85%): FOLLOWUP BAC-0267: corrected stat fast path vs always-hash on 2000 files.", None),
 "BAC-0338": ("PROVEN", "misses 99 to 17 (-83%): simplified ARC vs LRU under skewed demand.", None),
 "BAC-0339": ("ADAPT", "tests 2 to 8 at 7x time: coverage-guided selection catches more than changed-files-only at runtime cost.", None),
 "BAC-0340": ("ADAPT", "page renders 4 to 0 avoided: FOLLOWUP BAC-0270: block-level invalidation skips whole pages, but the fixture modeled no real content change (vacuous 0).", None),
 "BAC-0341": ("REJECTED", "1269.60ms to 1559.56ms: chunked (8x8) tasks slower than per-unit tasks through the pool.", None),
 "BAC-0342": ("REJECTED", "groups 2 to 33 (over-segmented) and slower: top-k rare-token signature worse than template normalization.", None),
 "BAC-0343": ("REJECTED", "edit script 200 to 200, slower: move-aware diff found no smaller script than positional on the 100-line block move.", None),
 "BAC-0344": ("PROVEN", "1.99ms to 1.18ms (-41%): FOLLOWUP BAC-0274: online batched backfill vs expand-contract double copy.", None),
 "BAC-0345": ("REJECTED", "108.07ms to 146.66ms: mmap source slower than read/write loop at 32MB.", None),
 "BAC-0346": ("PROVEN", "bytes 9718 to 8279 (-15%), -16% time: per-column compression streams vs interleaved rows.", None),
 "BAC-0347": ("ADAPT", "hits 351 to 377 (+7%): 2Q directionally beats LRU under scan+hot mix, inside the noise band.", None),
 "BAC-0348": ("PROVEN", "2.28ms to 0.82ms (-64%): incremental 2-level vs full 6-way compaction merge (simulated).", None),
 "BAC-0349": ("REJECTED", "delta entries 1600 vs full 400, slower: FOLLOWUP BAC-0278: delta chain loses when every key changes between snapshots.", None),
 "BAC-0350": ("PROVEN", "256.48ms to 0.03ms (-100%): warm shared compile cache vs cold local cache (simulated).", None),
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
