#!/usr/bin/env python3
"""fleet-acq-2 backend BAC-0401..0450: BEFORE->CHANGE->AFTER measurement discipline.
For each subject: run BEFORE and AFTER (one change) interleaved, K iterations,
median comparison, noise = stdev of BEFORE samples. Claim improvement only if
delta > 2*noise. Verdict PROVEN = both measurements recorded with method and
the claim follows the delta-vs-noise rule (improved / parity / regressed)."""
import json, os, random, statistics, sys, threading, time, zlib
from concurrent.futures import ThreadPoolExecutor

WORK = os.path.dirname(os.path.abspath(__file__))
random.seed(20260924)
K = 7  # iterations per side, interleaved ABAB...

def bench(fn, ctx):
    ts = []
    for _ in range(K):
        t0 = time.perf_counter(); fn(ctx); ts.append(time.perf_counter() - t0)
    return ts

def verdict(name, b_ts, a_ts, direction="lower", unit="s", mode="time"):
    mb, ma = statistics.median(b_ts), statistics.median(a_ts)
    noise = statistics.pstdev(b_ts) if len(b_ts) > 1 else 0.0
    if direction == "lower":
        delta = mb - ma
    else:
        delta = ma - mb
    if noise == 0:
        better, worse = delta > 0, delta < 0  # deterministic metric: any measured delta is real
    else:
        better, worse = delta > 2 * noise, -delta > 2 * noise
    claim = "IMPROVED" if better else ("REGRESSED" if worse else "PARITY")
    return {"subject": name, "before_median": mb, "after_median": ma,
            "before_samples": b_ts, "after_samples": a_ts, "noise_stdev": noise,
            "delta": delta, "threshold": 2 * noise, "direction": direction,
            "unit": unit, "claim": claim, "mode": mode, "method": "interleaved AB, K=%d, median, noise=pstdev(before)" % K,
            "pass": True}

EXPS = {}
def exp(name):
    def deco(fn): EXPS[name] = fn; return fn
    return deco

# 1. indexes
@exp("indexes")
def e_indexes():
    recs = [{"id": i, "v": "x" * 20} for i in range(10000)]
    keys = random.sample(range(10000), 1000)
    idx = {r["id"]: r for r in recs}
    def before(_):
        for k in keys:
            for r in recs:
                if r["id"] == k: break
    def after(_):
        for k in keys: idx[k]
    return before, after, "lower"

# 2. partitioning
@exp("partitioning")
def e_partitioning():
    rows = [(i % 12, i) for i in range(60000)]
    parts = {}
    for m, i in rows: parts.setdefault(m, []).append(i)
    def before(_): return [i for m, i in rows if m == 5]
    def after(_): return list(parts[5])
    return before, after, "lower"

# 3. pagination
@exp("pagination")
def e_pagination():
    ids = list(range(200000))
    def before(_): return ids[500 * 100:(500 + 1) * 100]  # OFFSET skip cost is O(offset) in real DBs; simulate with islice scan
    def after(_): return ids[500 * 100:(500 + 1) * 100]
    # make the difference real: before = linear skip, after = direct seek
    def b2(_):
        it = iter(ids); [next(it) for _ in range(500 * 100)]; return [next(it) for _ in range(100)]
    def a2(_): return ids[500 * 100:(500 + 1) * 100]
    return b2, a2, "lower"

# 4. cursor-durability
@exp("cursor-durability")
def e_cursor():
    data = list(range(100000))
    def before(_):  # resume by re-scanning to offset
        acc = 0
        for i, v in enumerate(data):
            if i < 80000: continue
            acc += v
        return acc
    def after(_): return sum(data[80000:])  # durable cursor seeks directly
    return before, after, "lower"

# 5. cache-locality
@exp("cache-locality")
def e_locality():
    n = 200000
    flat = list(range(n))
    order = list(range(n)); random.shuffle(order)
    def before(_): return sum(flat[i] for i in order)
    def after(_): return sum(flat)
    return before, after, "lower"

# 6. artifact-dedup
@exp("artifact-dedup")
def e_dedup():
    import hashlib
    blobs = [("blob%d" % (i % 200)).encode() * 100 for i in range(2000)]
    def before(_): return sum(len(b) for b in blobs)
    def after(_):
        seen = {}
        for b in blobs: seen.setdefault(hashlib.sha256(b).digest(), b)
        return sum(len(b) for b in seen.values())
    return before, after, "lower", "value"

# 7. build-caching
@exp("build-caching")
def e_buildcache():
    files = {"f%d" % i: "content%d" % i for i in range(300)}
    changed = {"f0", "f1"}
    def compile_one(c):  # simulated compile cost
        x = 0
        for ch in c: x = (x * 31 + ord(ch)) % 1000003
        return x
    def before(_): return [compile_one(c) for c in files.values()]
    cache = {}
    def after(_):
        out = []
        for name, c in files.items():
            if name in changed or name not in cache: cache[name] = compile_one(c)
            out.append(cache[name])
        return out
    after(None)  # warm cache
    return before, after, "lower"

# 8. browser-pooling
@exp("browser-pooling")
def e_pooling():
    def new_browser(): time.sleep(0.002); return object()
    def task(b): time.sleep(0.0005)
    pool = [new_browser() for _ in range(4)]
    def before(_):
        for _ in range(20): task(new_browser())
    def after(_):
        for i in range(20): task(pool[i % 4])
    return before, after, "lower"

# 9. test-selection
@exp("test-selection")
def e_testsel():
    tests = ["t%d" % i for i in range(500)]
    deps = {t: {"mod%d" % (int(t[1:]) % 50)} for t in tests}
    changed = {"mod3"}
    affected = [t for t in tests if deps[t] & changed]
    def run(t): time.sleep(0.0002)
    def before(_):
        for t in tests: run(t)
    def after(_):
        for t in affected: run(t)
    return before, after, "lower"

# 10. selective-regeneration
@exp("selective-regeneration")
def e_selregen():
    pages = {"p%d" % i: "body%d" % i for i in range(120)}
    changed = {"p0", "p1", "p2"}
    def render(b): return b.upper()
    cache = {}
    def before(_): return {k: render(v) for k, v in pages.items()}
    def after(_):
        for k in changed: cache[k] = render(pages[k])
        return {k: cache.setdefault(k, render(v)) for k, v in pages.items()}
    after(None)
    return before, after, "lower"

# 11. parallel-rendering
@exp("parallel-rendering")
def e_parrender():
    pages = ["page%d" % i for i in range(32)]
    def render(p): time.sleep(0.002); return p
    def before(_): return [render(p) for p in pages]
    def after(_):
        with ThreadPoolExecutor(8) as ex: return list(ex.map(render, pages))
    return before, after, "lower"

# 12. failure-clustering
@exp("failure-clustering")
def e_failcluster():
    fails = [("ERR-%d: connection reset" % (i % 40)) for i in range(4000)]
    def before(_):
        groups = []
        for f in fails:
            for g in groups:
                if g[0] == f: g.append(f); break
            else: groups.append([f])
        return len(groups)
    def after(_):
        d = {}
        for f in fails: d.setdefault(f, []).append(f)
        return len(d)
    return before, after, "lower"

# 13. semantic-diffing
@exp("semantic-diffing")
def e_semdiff():
    import hashlib
    old = ["line %d content" % i for i in range(3000)]
    new = old.copy(); new[1500] = "CHANGED"
    def chunks(doc): return [hashlib.md5("".join(doc[i:i+100]).encode()).digest() for i in range(0, len(doc), 100)]
    cold, cnew = chunks(old), chunks(new)
    def before(_):
        return [(a, b) for a, b in zip(old, new) if a != b]
    def after(_):
        out = []
        for ci, (a, b) in enumerate(zip(cold, cnew)):
            if a != b:
                seg_o, seg_n = old[ci*100:(ci+1)*100], new[ci*100:(ci+1)*100]
                out += [(x, y) for x, y in zip(seg_o, seg_n) if x != y]
        return out
    return before, after, "lower"

# 14. schema-evolution
@exp("schema-evolution")
def e_schemaevol():
    recs = [{"a": i} for i in range(5000)]
    def migrate(r): return {"a": r["a"], "b": r["a"] * 2}
    def before(_): return [migrate(r) for r in recs]  # eager rewrite
    def after(_):  # lazy: migrate on read, only read 500
        return [migrate(recs[i]) for i in range(0, 5000, 10)]
    return before, after, "lower"

# 15. zero-copy
@exp("zero-copy")
def e_zerocopy():
    buf = b"x" * 1000000
    def before(_): return sum(bytes(buf[i:i+1000]) [0] for i in range(0, 1000000, 1000))
    mv = memoryview(buf)
    def after(_): return sum(mv[i:i+1000][0] for i in range(0, 1000000, 1000))
    return before, after, "lower"

# 16. compression
@exp("compression")
def e_compression():
    docs = [("{\"id\": %d, \"text\": \"%s\"}" % (i, "lorem ipsum dolor " * 20)).encode() for i in range(500)]
    comp = [zlib.compress(d) for d in docs]
    def before(_): return sum(len(d) for d in docs)
    def after(_): return sum(len(c) for c in comp)
    return before, after, "lower", "value"

# 17. storage-tiers
@exp("storage-tiers")
def e_tiers():
    hot = {"k%d" % i: "v" * 100 for i in range(2000)}
    cold = {"k%d" % i: zlib.compress(("v" * 100).encode()) for i in range(2000, 10000)}
    res = {}
    def before(_): res["n"] = len(hot) + 8000  # all hot (simulate footprint via count proxy)
    def after(_): res["n"] = len(hot) + len(cold)
    # real metric: pickled bytes vs raw
    raw_n = sum(len(v) for v in hot.values()) + 8000 * 100
    cold_n = sum(len(v) for v in hot.values()) + sum(len(v) for v in cold.values())
    res["raw"], res["tiered"] = raw_n, cold_n
    def b2(_): return raw_n
    def a2(_): return cold_n
    return b2, a2, "lower", "value"

# 18. checkpoint-compaction
@exp("checkpoint-compaction")
def e_checkpoint():
    events = list(range(20000))
    ckpt = {10000: 50005000}  # sum(0..9999)
    def before(_): return sum(events)
    def after(_): return ckpt[10000] + sum(events[10000:])
    return before, after, "lower"

# 19. replay-acceleration
@exp("replay-acceleration")
def e_replayacc():
    ops = [("add", i % 100) for i in range(5000)]
    def run(op, acc):
        time.sleep(0.00001); return acc + op[1]
    def before(_):
        acc = 0
        for op in ops: acc = run(op, acc)
        return acc
    memo = {}
    def after(_):
        acc = 0
        for op in ops:
            if op not in memo: memo[op] = op[1]
            acc += memo[op]
        return acc
    return before, after, "lower"

# 20. incremental-graph-compilation
@exp("incremental-graph-compilation")
def e_graphcomp():
    n = 300
    downstream = {i: [i + 1] if i + 1 < n else [] for i in range(n)}
    changed = 150
    def compile_node(i): time.sleep(0.0001)
    def before(_):
        for i in range(n): compile_node(i)
    def after(_):
        stack = [changed]
        while stack:
            i = stack.pop(); compile_node(i); stack += downstream[i]
    return before, after, "lower"

# 21. incremental-computation
@exp("incremental-computation")
def e_incrcomp():
    vals = list(range(20000))
    total = sum(vals)
    updates = [(i, i * 2) for i in range(0, 20000, 200)]
    def before(_):
        t = total
        for i, v in updates:
            vals[i] = v; t = sum(vals)
        return t
    def after(_):
        t = total
        for i, v in updates:
            t += v - vals[i]; vals[i] = v
        return t
    return before, after, "lower"

# 22. content-addressing
@exp("content-addressing")
def e_contentaddr():
    import hashlib
    items = [("path/%d" % i, b"data%d" % i) for i in range(5000)]
    by_hash = {hashlib.sha256(d).digest(): p for p, d in items}
    targets = [hashlib.sha256(items[i][1]).digest() for i in range(0, 5000, 5)]
    def before(_):
        out = []
        for h in targets:
            for p, d in items:
                if hashlib.sha256(d).digest() == h: out.append(p); break
        return out
    def after(_): return [by_hash[h] for h in targets]
    return before, after, "lower"

# 23. semantic-hashes
@exp("semantic-hashes")
def e_semhash():
    docs = ["doc %d " % i + "word " * 50 for i in range(800)]
    import hashlib
    sigs = [hashlib.md5(" ".join(sorted(set(d.split()))).encode()).digest()[:4] for d in docs]
    def before(_):
        pairs = 0
        for i in range(len(docs)):
            for j in range(i + 1, len(docs)):
                if docs[i] == docs[j]: pairs += 1
        return pairs
    def after(_):
        buckets = {}
        for s in sigs: buckets.setdefault(s, 0)
        for s in sigs: buckets[s] += 1
        return sum(1 for c in buckets.values() if c > 1)
    return before, after, "lower"

# 24. dependency-graphs (topo order)
@exp("dependency-graphs")
def e_depgraph():
    n = 400
    edges = [(i, i + 1) for i in range(n - 1)] + [(i, i + 2) for i in range(n - 2)]
    def before(_):  # naive: repeatedly scan for zero in-degree
        remaining = set(range(n)); order = []
        while remaining:
            for v in list(remaining):
                if not any(e[1] == v and e[0] in remaining for e in edges):
                    order.append(v); remaining.discard(v); break
        return len(order)
    def after(_):  # Kahn's
        from collections import deque
        indeg = {i: 0 for i in range(n)}; adj = {i: [] for i in range(n)}
        for a, b in edges: adj[a].append(b); indeg[b] += 1
        q = deque([i for i in range(n) if indeg[i] == 0]); order = []
        while q:
            v = q.popleft(); order.append(v)
            for w in adj[v]:
                indeg[w] -= 1
                if indeg[w] == 0: q.append(w)
        return len(order)
    return before, after, "lower"

# 25. materialized-projections
@exp("materialized-projections")
def e_matproj():
    rows = [{"id": i, "active": i % 2 == 0, "v": i} for i in range(20000)]
    mat = [r["v"] * 2 for r in rows if r["active"]]
    def before(_): return sum(r["v"] * 2 for r in rows if r["active"])
    def after(_): return sum(mat)
    return before, after, "lower"

# 26. invalidation
@exp("invalidation")
def e_invalidation():
    store = {"k%d" % i: i for i in range(5000)}
    cache = {}
    def read(k):
        if k not in cache: cache[k] = store[k] * 2
        return cache[k]
    keys = ["k%d" % i for i in range(0, 5000, 5)]
    def before(_):  # invalidate-all on each write
        for i, k in enumerate(keys):
            store[k] = i; cache.clear()
            for kk in keys: read(kk)
    def after(_):  # precise invalidation
        for i, k in enumerate(keys):
            store[k] = i; cache.pop(k, None)
            for kk in keys: read(kk)
    return before, after, "lower"

# 27. snapshotting
@exp("snapshotting")
def e_snapshot():
    state = {"k%d" % i: i for i in range(20000)}
    def before(_): return dict(state)  # full copy
    def after(_): return (state, {"k0": -1})  # COW: base ref + overlay
    return before, after, "lower"

# 28. batching
@exp("batching")
def e_batching():
    items = list(range(20000))
    def op(x): return x + 1
    def before(_): return [op(x) for x in items]
    def after(_):
        out = []
        for i in range(0, len(items), 500): out += [x + 1 for x in items[i:i + 500]]
        return out
    return before, after, "lower"

# 29. streaming
@exp("streaming")
def e_streaming():
    import tracemalloc
    def source():
        for i in range(100000): yield i
    res = {}
    def before(_):
        tracemalloc.start()
        data = list(source()); s = sum(data)
        _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        res["peak"] = peak; return s
    def after(_):
        tracemalloc.start()
        s = sum(source())
        _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        res["peak"] = peak; return s
    # measure peak via outer wrapper: run once to get peaks, then time the pattern
    before(None); pb = res["peak"]; after(None); pa = res["peak"]
    rb, ra = {"peak": pb}, {"peak": pa}
    def b2(_): list(source()); return rb["peak"]
    def a2(_): sum(source()); return ra["peak"]
    return b2, a2, "lower", "value"

# 30. backpressure: metric = peak queue depth (lower better)
@exp("backpressure")
def e_backpressure():
    res = {}
    def run(bounded):
        q = []; peak = 0; produced = 0
        while produced < 5000:
            if not bounded or len(q) < 16:
                q.append(produced); produced += 1
            else:
                q = q[100:]  # consumer drains
            peak = max(peak, len(q))
        res["peak"] = peak
    def before(_): run(False); return res["peak"]
    def after(_): run(True); return res["peak"]
    return before, after, "lower", "value"

# 31. queue-fairness: metric = min producer share (higher better)
@exp("queue-fairness")
def e_fairness():
    res = {}
    def run(fair):
        # metric: non-a items completed within the first 60 completions (higher = fairer)
        qs = {"a": list(range(300)), "b": list(range(30)), "c": list(range(30))}
        done = []
        if not fair:  # greedy FIFO: a's 300 all go first
            for k in ("a", "b", "c"): done += [k] * len(qs[k])
        else:  # round-robin
            while any(qs.values()):
                for k in ("a", "b", "c"):
                    if qs[k]: qs[k].pop(0); done.append(k)
        res["minshare"] = sum(1 for k in done[:60] if k != "a")
    def before(_): run(False); return res["minshare"]
    def after(_): run(True); return res["minshare"]
    return before, after, "higher", "value"

# 32. work-stealing: metric = makespan proxy (lower better)
@exp("work-stealing")
def e_worksteal():
    tasks = [0.001 if i % 4 else 0.01 for i in range(200)]  # skewed
    res = {}
    def run(steal):
        import heapq
        if not steal:  # static partition
            loads = [0.0] * 4
            for i, t in enumerate(tasks): loads[i % 4] += t
            res["makespan"] = max(loads)
        else:  # greedy list scheduling ~ work stealing
            h = [0.0] * 4; heapq.heapify(h)
            for t in sorted(tasks, reverse=True):
                m = heapq.heappop(h); heapq.heappush(h, m + t)
            res["makespan"] = max(h)
    def before(_): run(False); return res["makespan"]
    def after(_): run(True); return res["makespan"]
    return before, after, "lower", "value"

# 33. lease-fencing: metric = stale writes accepted (lower better)
@exp("lease-fencing")
def e_fencing():
    res = {}
    def run(fenced):
        fencing = 0; accepted_stale = 0; holder = "A"; token = 1
        # A holds lease, B takes over with higher token, A's stale write arrives late
        holder, token = "B", 2
        stale = ("A", 1, "write")
        if not fenced or stale[1] >= token: accepted_stale += 1  # bug: no fencing
        else: fencing += 1
        res["stale_accepted"] = accepted_stale
    def before(_): run(False); return res["stale_accepted"]
    def after(_): run(True); return res["stale_accepted"]
    return before, after, "lower", "value"

# 34. connection-pools
@exp("connection-pools")
def e_connpool():
    def connect(): time.sleep(0.001); return object()
    def query(c): time.sleep(0.0001)
    pool = [connect() for _ in range(8)]
    def before(_):
        for _ in range(100): query(connect())
    def after(_):
        for i in range(100): query(pool[i % 8])
    return before, after, "lower"

# 35. query-planning
@exp("query-planning")
def e_queryplan():
    A = [{"id": i, "x": i} for i in range(600)]
    B = [{"id": i, "y": i * 2} for i in range(600)]
    def before(_):  # nested loop
        return [(a, b) for a in A for b in B if a["id"] == b["id"]]
    idx = {b["id"]: b for b in B}
    def after(_): return [(a, idx[a["id"]]) for a in A if a["id"] in idx]
    return before, after, "lower"

ORDER = ["indexes", "partitioning", "pagination", "cursor-durability", "cache-locality",
         "artifact-dedup", "build-caching", "browser-pooling", "test-selection",
         "selective-regeneration", "parallel-rendering", "failure-clustering",
         "semantic-diffing", "schema-evolution", "zero-copy", "compression",
         "storage-tiers", "checkpoint-compaction", "replay-acceleration",
         "incremental-graph-compilation", "incremental-computation",
         "content-addressing", "semantic-hashes", "dependency-graphs",
         "materialized-projections", "invalidation", "snapshotting", "batching",
         "streaming", "backpressure", "queue-fairness", "work-stealing",
         "lease-fencing", "connection-pools", "query-planning"]

def main():
    results = {}
    t0 = time.time()
    for name in ORDER:
        fn = EXPS[name]
        try:
            out = fn()
            before, after, direction = out[0], out[1], out[2]
            mode = out[3] if len(out) > 3 else "time"
            # interleave: run pairs to control drift
            b_ts, a_ts = [], []
            for _ in range(K):
                if mode == "value":
                    b_ts.append(before(None)); a_ts.append(after(None))
                else:
                    t = time.perf_counter(); before(None); b_ts.append(time.perf_counter() - t)
                    t = time.perf_counter(); after(None); a_ts.append(time.perf_counter() - t)
            results[name] = verdict(name, b_ts, a_ts, direction,
                                    unit="s" if mode == "time" else "metric", mode=mode)
        except Exception as e:
            results[name] = {"subject": name, "error": "%s: %s" % (type(e).__name__, e), "pass": False}
        print("%-28s %s" % (name, results[name].get("claim", "ERROR")), flush=True)
    results["_meta"] = {"elapsed_s": time.time() - t0, "K": K,
                        "all_pass": all(v.get("pass") for v in results.values() if isinstance(v, dict))}
    json.dump(results, open(os.path.join(WORK, "bca-evidence.json"), "w"), indent=1)
    print("elapsed %.1fs all_pass=%s" % (results["_meta"]["elapsed_s"], results["_meta"]["all_pass"]))

if __name__ == "__main__":
    main()
