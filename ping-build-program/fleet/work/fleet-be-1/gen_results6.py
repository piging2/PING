"""Emit fleet/results/backend/BAC-0251..BAC-0300.json from bench6_results.json."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "../../results/backend"))
EF = ["fleet/work/fleet-be-1/bench6.py", "fleet/work/fleet-be-1/bench6b.py",
      "fleet/work/fleet-be-1/bench6_results.json"]
CONF = {"PROVEN": 0.85, "ADAPT": 0.6, "REJECTED": 0.85, "NEEDS-FOLLOWUP": 0.5}

data = json.load(open(os.path.join(HERE, "bench6_results.json")))["results"]

def pct(b, a):
    return 100.0 * (a - b) / b if b else 0.0

# verdict, one-line evidence, followup
V = {
 "BAC-0251": ("PROVEN", "230.82ms to 5.56ms (-98%): single-flight recompute vs thundering-herd stampede (8 threads).", None),
 "BAC-0252": ("ADAPT", "1 of 16 blocks changed; rolling-checksum scan costs 1.19ms vs 0.0018ms full copy at 64KB: pays off only at larger snapshot sizes.", None),
 "BAC-0253": ("PROVEN", "3726.38ms to 11.40ms (-100%): group commit (1 fsync) vs per-op fsync on 200 journal writes.", None),
 "BAC-0254": ("ADAPT", "2.00ms to 0.34ms (-83%): session windows vs tumbling windows; faster but changes window semantics.", None),
 "BAC-0255": ("REJECTED", "dropped 267 to 2810 (10x worse): AIMD limiter underperforms token bucket when capacity hovers near demand; decrease step too aggressive.", None),
 "BAC-0256": ("PROVEN", "byte ratio 3.0 to 1.09: byte-quantum DRR equalizes byte share vs packet RR (timing sub-ms noise).", None),
 "BAC-0257": ("REJECTED", "makespan 150 to 155 (worse): guided self-scheduling did not beat static chunking on this skewed workload.", None),
 "BAC-0258": ("PROVEN", "split-brain confirmed before (both epochs 1); CAS-shared epoch yields ordered 1, 2 after: correctness proof, not perf.", None),
 "BAC-0259": ("PROVEN", "10 recycles, max age capped: max-lifetime recycling bounds connection age vs immortal growth (simulated).", None),
 "BAC-0260": ("PROVEN", "6.51ms to 0.19ms (-97%): flattened subquery + hash join vs nested per-row department lookup.", None),
 "BAC-0261": ("REJECTED", "0.095ms to 1.033ms (11x slower): 4-level skip-list underperforms bisect on a 30k sorted list.", None),
 "BAC-0262": ("ADAPT", "spread 1991 to 638: 200 vnodes/node balance far better than 10 at 2.6x lookup cost.", None),
 "BAC-0263": ("PROVEN", "0.97ms to 0.05ms (-95%): bidirectional keyset pagination vs OFFSET both directions.", None),
 "BAC-0264": ("REJECTED", "16.95ms to 25.51ms (+51%): WAL journal slower than rollback journal on this commit-heavy in-memory workload.", None),
 "BAC-0265": ("REJECTED", "4.42ms to 10.34ms: memoryview sum over dense array slower than list sum; Python iterator overhead dominates.", None),
 "BAC-0266": ("PROVEN", "shared fraction 4/32 to 5/7 (12.5% to 71%): Rabin content-defined chunking survives insertion shift vs fixed-size.", None),
 "BAC-0267": ("REJECTED", "0.90ms to 1.36ms: mtime+size fast path slower than full content hash at 500 files; bookkeeping dominates.", None),
 "BAC-0268": ("REJECTED", "misses 400 to 400 (identical): LRU and FIFO both miss everything on the cyclic request pattern; no locality to exploit.", None),
 "BAC-0269": ("ADAPT", "2 to 60 tests at 60x cost: affected-first ordering verified, but full-suite cost dwarfs selection; fail-fast coverage tradeoff.", None),
 "BAC-0270": ("PROVEN", "1127.93ms to 11.32ms (-99%): content-hash skip (1 changed of 50) vs regen-all.", None),
 "BAC-0271": ("REJECTED", "720.35ms to 797.48ms: shared-memory results did not beat pickle through a 2-worker pool at this message size.", None),
 "BAC-0272": ("REJECTED", "0.71ms to 149.65ms (200x slower): Levenshtein leader clustering far slower than template normalization with no grouping gain.", None),
 "BAC-0273": ("REJECTED", "edit script 5 to 10 and slower: patience diff produced a larger script than simple Myers on mostly-unique lines.", None),
 "BAC-0274": ("ADAPT", "0.48ms to 1.14ms (extra pass): expand-contract buys zero-downtime migration at pass cost; safety property, not speed.", None),
 "BAC-0275": ("PROVEN", "458.68ms to 355.04ms (-23%): os.sendfile vs userspace read/write loop at 64MB.", None),
 "BAC-0276": ("REJECTED", "bytes 60477 to 60511 (worse) and 3.03ms to 26.49ms slower: lzma-on-binary selection lost to zlib on this mix.", None),
 "BAC-0277": ("PROVEN", "hits 353 to 473 (+34%): TinyLFU admission filter keeps hot keys vs always-admit LRU.", None),
 "BAC-0278": ("PROVEN", "5.29ms to 0.00ms (-100%): 4x snapshot cadence makes restore-from-nearest near-free vs 2x cadence.", None),
 "BAC-0279": ("PROVEN", "whitespace-only change hits ABI-normalized cache but misses content cache: ABI hash avoids the spurious recompile.", None),
 "BAC-0280": ("ADAPT", "speed parity (548 vs 518ms, noise) but peak 63.6K to 91.1K bytes: right-sized (1024) bounded memo only pays off when the working set exceeds the bound.", None),
 "BAC-0281": ("ADAPT", "0.0065ms to 0.277ms: hash verify-on-read is pure integrity cost; the guarantee is the product, not speed.", None),
 "BAC-0282": ("ADAPT", "recall 0.013 to 0.296 (23x): multi-probe (16 probes) beats single-bucket LSH vs ground truth but still misses 70% of pairs.", "increase probe count or use multi-table LSH for usable recall"),
 "BAC-0283": ("PROVEN", "0.55ms to 0.0006ms (-100%): Pearce-Kelly dynamic topological maintenance vs full Kahn recompute per edge insert.", None),
 "BAC-0284": ("PROVEN", "versioned projection envelope vs unversioned: old readers can detect shape changes; behavioral proof, not perf.", None),
 "BAC-0285": ("NEEDS-FOLLOWUP", "stale serves 0 in both arms: the async-reader simulation never produced staleness, so proactive refresh vs TTL-only is untested.", "redesign fixture so expiry actually lapses under Poisson readers"),
 "BAC-0286": ("PROVEN", "0.0112ms to 0.0052ms (-54%) at equal bytes: pickle protocol-5 out-of-band buffers vs protocol 4.", None),
 "BAC-0287": ("PROVEN", "75.24ms to 8.48ms (-89%): lock-free ring buffer vs queue.Queue pipeline for 20k items.", None),
 "BAC-0288": ("ADAPT", "2.20ms to 0.63ms, kept 7998 to 8000: allowed-lateness side output faster, but the fixture produced 0 truly-late events so the mechanism is unexercised.", None),
 "BAC-0289": ("REJECTED", "dropped 267 to 2810: AIMD vs token bucket rematch on the same workload confirms BAC-0255; AIMD too aggressive here.", None),
 "BAC-0290": ("REJECTED", "interactive tail 43 to 58 (worse): class-based queueing as implemented delayed the interactive class vs flat WFQ.", None),
 "BAC-0291": ("PROVEN", "0.030ms to 0.016ms (-48%): periodic global rebalance cheaper than continuous steal scans at this scale.", None),
 "BAC-0292": ("PROVEN", "both reject stale writes (parity): DB-backed fencing generation adds crash durability over in-memory; durability property.", None),
 "BAC-0293": ("PROVEN", "sizes [2,8,6,10,8,6] track demand [2,8,3,10,4,1]: elastic pool grows/shrinks vs fixed; behavioral proof.", None),
 "BAC-0294": ("PROVEN", "7.74ms to 5.32ms (-31%): bitmap star join vs row-at-a-time dimension joins.", None),
 "BAC-0295": ("PROVEN", "0.32ms to 0.11ms (-67%): inverted index vs full scan for term search.", None),
 "BAC-0296": ("PROVEN", "20.07ms to 0.002ms: time partitioning drops 5 whole partitions vs hash-partitioned row-by-row retention delete of 25000 rows.", None),
 "BAC-0297": ("PROVEN", "304.17ms to 24.48ms (-92%): search-after sort values vs OFFSET on scored ordering.", None),
 "BAC-0298": ("PROVEN", "processed 12000 to 9000: offset checkpoint + idempotent receiver achieves exactly-once vs at-least-once rework.", None),
 "BAC-0299": ("PROVEN", "16.92ms to 8.97ms (-47%): blocked 32x32 2D stencil vs naive stencil.", None),
 "BAC-0300": ("ADAPT", "5.04ms to 4.06ms (-20%): row-major loop interchange directionally better but inside this box's noise band; needs a larger fixture.", None),
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
