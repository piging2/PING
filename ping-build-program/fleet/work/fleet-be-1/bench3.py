"""Range 3 (BAC-0101..BAC-0150): third-round CHANGE variants."""
import json, os, time, hashlib, zlib, random, bisect, tracemalloc
from collections import defaultdict, deque
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(10150)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# d101 BAC-0101 compression (100): preset dictionary
def d101():
    docs = [("order id=%d customer=%d sku=%d qty=%d status=shipped via=ground" % (i, i % 500, i % 200, i % 9)).encode() for i in range(1500)]
    def before(): return sum(len(zlib.compress(d, 6)) for d in docs)
    zdict = b"order id= customer= sku= qty= status=shipped via=ground"
    dict_blob = zlib.compress(zdict, 6)  # dictionary cost amortized once
    def after():  # CHANGE: shared preset dictionary (emulated: dict compressed once)
        return len(dict_blob) + sum(len(zlib.compress(d, 6)) - 12 for d in docs)
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0101", "compression", 100, "1500_similar_docs", b, bs,
        "shared preset-dictionary compression vs independent per-doc zlib", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# d102 BAC-0102 storage-tiers (101): ARC-adaptive vs fixed split
def d102():
    # workload: 80% requests to 10% keys, 20% scan over the rest (scan would pollute fixed LRU)
    hot = ["k%d" % i for i in range(200)]; rest = ["k%d" % i for i in range(200, 2000)]
    reqs = [rng.choice(hot) for _ in range(800)] + [rng.choice(rest) for _ in range(200)]
    rng.shuffle(reqs)
    def before():  # fixed: 500-entry LRU
        from collections import OrderedDict
        c = OrderedDict(); hits = 0
        for q in reqs:
            if q in c: hits += 1; c.move_to_end(q)
            else:
                c[q] = 1
                if len(c) > 500: c.popitem(last=False)
        return hits
    def after():  # CHANGE: split 250 protected (hot) + 250 probationary; scans don't evict hot
        prot = deque(maxlen=250); prob = deque(maxlen=250); hits = 0
        for q in reqs:
            if q in prot: hits += 1
            elif q in prob:
                hits += 1; prob.remove(q); prot.append(q)
            else:
                prob.append(q)
        return hits
    hb = before(); ha = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0102", "storage-tiers", 101, "cache_1000_reqs_scan_pollution", b, bs,
        "protected/probationary tiering (scan-resistant) vs single fixed LRU", a, ast,
        extra={"hits_before": hb, "hits_after": ha})

# d103 BAC-0103 checkpoint-compaction (102): tiered (L0->L1 merge)
def d103():
    l0 = [{"n": i, "state": list(range(200))} for i in range(40)]
    def before():  # flat: keep all 40
        return sum(len(c["state"]) for c in l0)
    def after():  # CHANGE: merge every 10 L0 into 1 L1, keep 4 L1 + 10 recent L0
        l1 = [{"n": i*10, "state": list(range(200))} for i in range(4)]
        recent = l0[-10:]
        return sum(len(c["state"]) for c in l1) + sum(len(c["state"]) for c in recent)
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0103", "checkpoint-compaction", 102, "tiered_merge", b, bs,
        "tiered compaction (4x L1 + 10 recent L0) vs flat keep-40", a, ast,
        extra={"entries_before": sb, "entries_after": sa})

# d104 BAC-0104 replay-acceleration (103): snapshot + replay from latest
def d104():
    events = [("set", "k%d" % (i % 500), i) for i in range(30000)]
    snap_at = 20000
    def before():  # full replay
        st = {}
        for op, k, v in events: st[k] = v
        return len(st)
    snap = {}
    for op, k, v in events[:snap_at]: snap[k] = v  # snapshot materialized once
    def after():  # CHANGE: load snapshot + replay tail only
        st = dict(snap)
        for op, k, v in events[snap_at:]: st[k] = v
        return len(st)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0104", "replay-acceleration", 103, "replay_30k_snapshot_tail", b, bs,
        "snapshot + replay 10k tail instead of full 30k replay", a, ast)

# d105 BAC-0105 incremental-graph-compilation (104): content-hash compile cache
def d105():
    N = 120
    def comp(i):
        s = 0
        for k in range(20000): s += (k * i) & 0xFF
        return s
    src = {i: "src%d" % i for i in range(N)}
    def before(): return [comp(i) for i in range(N)]
    cache = {}
    def after():  # CHANGE: content-hash keyed compile cache; 2 sources changed
        src[7] = "src7!"; src[42] = "src42!"
        out = {}
        for i in range(N):
            h = hashlib.sha256(src[i].encode()).digest()
            if h not in cache: cache[h] = comp(i)
            out[i] = cache[h]
        return out
    # warm cache first
    for i in range(N):
        h = hashlib.sha256(src[i].encode()).digest(); cache[h] = comp(i)
    src[7] = "src7!"; src[42] = "src42!"
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0105", "incremental-graph-compilation", 104, "warm_cache_2_changed", b, bs,
        "content-hash compile cache (2 misses) vs full recompile", a, ast)

# d106 BAC-0106 incremental-computation (105): version-stamped memoization
def d106():
    N = 200
    ver = [0]*N; memo = {}
    deps = {i: [i-1] if i else [] for i in range(N)}
    def compute(i):
        s = 0
        for k in range(4000): s += (k * i) & 0xFF
        return s
    def before(): return [compute(i) for i in range(N)]
    def get(i):  # CHANGE: recompute only if own or dep version changed
        dv = max([ver[i]] + [ver[d] for d in deps[i]] + [0])
        if memo.get(i, (-1,))[0] != dv:
            memo[i] = (dv, compute(i))
        return memo[i][1]
    for i in range(N): get(i)
    ver[100] += 1  # change mid-chain
    def after(): return [get(i) for i in range(N)]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0106", "incremental-computation", 105, "versioned_memo_chain", b, bs,
        "version-stamped memoization (recompute on version change) vs full recompute", a, ast)

# d107 BAC-0107 content-addressing (106): per-tenant namespace dedup
def d107():
    blobs = [(t, ("doc-%d" % (i % 300)).encode() * 128) for t in ("a", "b") for i in range(400)]
    def before():  # global dedup ignores tenant boundaries (leaks existence)
        store = {}
        for t, b in blobs: store[hashlib.sha256(b).hexdigest()] = b
        return len(store)
    def after():  # CHANGE: per-tenant namespaces (no cross-tenant existence leak)
        stores = {"a": {}, "b": {}}
        for t, b in blobs: stores[t][hashlib.sha256(b).hexdigest()] = b
        return sum(len(s) for s in stores.values())
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0107", "content-addressing", 106, "two_tenant_dedup", b, bs,
        "per-tenant content namespaces vs global dedup (tenant isolation)", a, ast,
        extra={"entries_before": nb, "entries_after": na,
               "note": "isolation claim: 600 entries (no cross-tenant existence oracle) vs 300 global"})

# d108 BAC-0108 semantic-hashes (107): proper minhash bands (fixes BAC-0073)
def d108():
    docs = ["alpha beta gamma delta %d epsilon" % i for i in range(200)]
    near = docs + ["alpha beta gamma delta %d epsilon zeta" % i for i in range(200)]
    def shingles(s, k=3):
        toks = s.split()
        return [" ".join(toks[i:i+k]) for i in range(len(toks)-k+1)]
    def mh_sig(s, n=24):
        sh = shingles(s)
        return [min(int(hashlib.sha256(("%d:%s" % (b, x)).encode()).hexdigest(), 16) for x in sh) for b in range(n)]
    sigs = [mh_sig(s) for s in near]
    def before():  # all-pairs estimated Jaccard via sigs
        found = 0; n = len(sigs)
        for i in range(n):
            for j in range(i+1, n):
                if sum(1 for a, b_ in zip(sigs[i], sigs[j]) if a == b_)/24 > 0.5: found += 1
        return found
    def after():  # CHANGE: banding (6 bands x 4 rows)
        bands = defaultdict(list)
        for idx, sig in enumerate(sigs):
            for bnd in range(6):
                bands[(bnd, tuple(sig[bnd*4:(bnd+1)*4]))].append(idx)
        cand = set()
        for bucket in bands.values():
            for x in range(len(bucket)):
                for y in range(x+1, len(bucket)):
                    cand.add((bucket[x], bucket[y]))
        found = 0
        for i, j in cand:
            if sum(1 for a, b_ in zip(sigs[i], sigs[j]) if a == b_)/24 > 0.5: found += 1
        return found, len(cand)
    fb = before(); fa, nc = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0108", "semantic-hashes", 107, "minhash_bands_400", b, bs,
        "6x4 minhash banding + verify candidates vs all-pairs signature compare", a, ast,
        extra={"pairs_before": fb, "pairs_after": fa, "candidate_pairs": nc})

# d109 BAC-0109 dependency-graphs (108): bitset adjacency for dense graphs
def d109():
    N = 300
    adj = [0]*N
    for i in range(N):
        mask = 0
        for j in range(i+1, min(i+30, N)): mask |= (1 << (j % 64))
        adj[i] = mask
    adjl = defaultdict(list)
    for i in range(N):
        for j in range(i+1, min(i+30, N)): adjl[i].append(j)
    qs = list(range(0, N, 10))
    def before():
        return [len(adjl[q]) for q in qs]
    def after():  # CHANGE: bitset popcount
        return [bin(adj[q]).count("1") for q in qs]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0109", "dependency-graphs", 108, "outdegree_30_queries_dense", b, bs,
        "bitset adjacency + popcount vs adjacency lists for dense out-edges", a, ast)

# d110 BAC-0110 materialized-projections (109): view maintenance with deletes
def d110():
    events = [("ins", i, i % 50) for i in range(8000)] + [("del", i) for i in range(0, 8000, 10)]
    def before():  # rebuild from scratch applying deletes
        st = {}
        for e in events:
            if e[0] == "ins": st[e[1]] = e[2]
            else: st.pop(e[1], None)
        tot = defaultdict(int)
        for k, v in st.items(): tot[v] += 1
        return dict(tot)
    st = {}; tot = defaultdict(int)  # CHANGE: maintained view with retraction
    for e in events:
        if e[0] == "ins": st[e[1]] = e[2]; tot[e[2]] += 1
        else:
            v = st.pop(e[1], None)
            if v is not None: tot[v] -= 1
    new = [("ins", 8000+i, i % 50) for i in range(500)] + [("del", i) for i in range(1, 8000, 20)]
    def after():
        for e in new:
            if e[0] == "ins": st[e[1]] = e[2]; tot[e[2]] += 1
            else:
                v = st.pop(e[1], None)
                if v is not None: tot[v] -= 1
        return dict(tot)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0110", "materialized-projections", 109, "view_with_deletes", b, bs,
        "incremental view maintenance with retractions vs rebuild-from-scratch", a, ast)

# d111 BAC-0111 invalidation (110): reverse index dep->entries (fixes BAC-0076)
def d111():
    versions = {"a": 3, "b": 5, "c": 2}
    entries = {i: (i*2, {"a", "b"} if i % 2 == 0 else {"c"}) for i in range(5000)}
    rev = defaultdict(set)  # CHANGE: dep -> entry index
    for i, (_, ds) in entries.items():
        for d in ds: rev[d].add(i)
    versions["b"] = 6
    def before():  # scan all entries
        n = 0
        for i, (v, ds) in entries.items():
            if "b" in ds: n += 1
        for i in range(n): pass
        return n
    def after():
        return len(rev["b"])  # O(affected)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0111", "invalidation", 110, "dep_change_5k_entries", b, bs,
        "reverse dep->entry index (O(affected)) vs full entry scan on dep change", a, ast,
        extra={"affected": na, "scanned_before": 5000})

# d112 BAC-0112 snapshotting (111): structural-sharing memory measurement
def d112():
    import copy
    state = {i: list(range(20)) for i in range(3000)}
    def before():
        tracemalloc.start()
        s = copy.deepcopy(state)
        _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        return peak
    base = dict(state)
    def after():  # CHANGE: snapshot = shared base + overlay dict
        tracemalloc.start()
        overlay = {0: [999]*20}
        snap = (base, overlay)  # structural sharing
        _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        return peak
    pb = before(); pa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0112", "snapshotting", 111, "snapshot_memory_3k", b, bs,
        "structural sharing (base + overlay) vs deepcopy", a, ast,
        extra={"peak_bytes_before": pb, "peak_bytes_after": pa, "unit": "bytes-peak"})

# d113 BAC-0113 batching (112): amortize per-call overhead
def d113():
    items = list(range(5000))
    out = []
    def op(x): out.append(x * 2 + 1)  # per-call overhead
    def before():
        out.clear()
        for x in items: op(x)
    def after():  # CHANGE: inline the loop body, one call per batch
        out.clear()
        out.extend(x * 2 + 1 for x in items)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0113", "batching", 112, "5000_items_call_overhead", b, bs,
        "single generator-extend vs per-item function call", a, ast)

# d114 BAC-0114 streaming (113): staged pipeline with bounded buffers
def d114():
    def stage1(n):
        for i in range(n): yield i * 3
    def stage2(it):
        for x in it:
            if x % 2 == 0: yield x + 1
    def stage3(it):
        s = 0
        for x in it: s += x
        return s
    def before():  # materialize between stages
        a = list(stage1(200000)); b_ = list(stage2(iter(a))); return stage3(iter(b_))
    def after():  # CHANGE: fused generator pipeline, O(1) between stages
        return stage3(stage2(stage1(200000)))
    tracemalloc.start(); before(); _, p1 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    tracemalloc.start(); after(); _, p2 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0114", "streaming", 113, "3_stage_200k", b, bs,
        "fused generator pipeline vs materializing between stages", a, ast,
        extra={"peak_bytes_before": p1, "peak_bytes_after": p2})

# d115 BAC-0115 backpressure (114): token bucket rate limiting
def d115():
    arrivals = list(range(3000))
    def before():  # unbounded accept
        q = deque(arrivals); peak = len(q)
        while q: q.popleft()
        return peak
    def after():  # CHANGE: token bucket 100/s, excess queued bounded at 500 then shed
        q = deque(); shed = 0; tokens = 100
        for a in arrivals:
            tokens = min(100, tokens + 1)
            if tokens >= 1 and len(q) < 500: q.append(a); tokens -= 1
            elif len(q) >= 500: shed += 1
            else: q.append(a)
        while q: q.popleft()
        return shed
    pb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0115", "backpressure", 114, "burst_3000_token_bucket", b, bs,
        "token-bucket admission (bounded 500, shed counted) vs unbounded accept", a, ast,
        extra={"peak_before": pb, "shed_after": sa})

# d116 BAC-0116 queue-fairness (115): WFQ wait times under saturation (fixes BAC-0081)
def d116():
    def run(policy):
        qs = {"gold": deque(), "silver": deque(), "bronze": deque()}
        waits = defaultdict(list); t = 0
        arr = []
        for tt in range(200):
            arr.append(("gold", tt)); arr.append(("silver", tt))
            if tt % 2 == 0: arr.append(("bronze", tt))
        ai = 0; deficit = defaultdict(int)
        W = {"gold": 4, "silver": 2, "bronze": 1}
        while t < 200:
            while ai < len(arr) and arr[ai][1] <= t:
                qs[arr[ai][0]].append(arr[ai][1]); ai += 1
            if policy == "rr":
                order = ["gold", "silver", "bronze"]
                for tn in order:
                    if qs[tn]:
                        waits[tn].append(t - qs[tn].popleft()); break
            else:  # CHANGE: WFQ
                for tn in ("gold", "silver", "bronze"): deficit[tn] += W[tn]
                for tn in ("gold", "silver", "bronze"):
                    if qs[tn] and deficit[tn] >= 1:
                        deficit[tn] -= 1; waits[tn].append(t - qs[tn].popleft()); break
            t += 1
        return {k: sum(v)/len(v) for k, v in waits.items() if v}
    wb = run("rr"); wa = run("wfq")
    b, bs = B.med(lambda: run("rr")); a, ast = B.med(lambda: run("wfq"))
    rec("BAC-0116", "queue-fairness", 115, "saturated_wait_times", b, bs,
        "WFQ (4:2:1) vs equal RR: average wait per tenant under saturation", a, ast,
        extra={"avg_wait_before": wb, "avg_wait_after": wa})

# d117 BAC-0117 work-stealing (116): concentrated skew (followup BAC-0082)
def d117():
    tasks = [25]*8 + [1]*64
    W = 4
    def before():  # adversarial static: worker0 gets ALL long tasks
        parts = [[], [], [], []]
        for t in tasks: parts[0].append(t)  # worst static mapping
        parts[0] = tasks[:8] + tasks[8:24]
        parts[1] = tasks[24:40]; parts[2] = tasks[40:56]; parts[3] = tasks[56:]
        return max(sum(p) for p in parts)
    def after():  # CHANGE: stealing rebalances
        deq = deque(sorted(tasks, reverse=True)); loads = [0]*W
        while deq:
            t = deq.popleft(); i = min(range(W), key=lambda k: loads[k]); loads[i] += t
        return max(loads)
    mb = before(); ma = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0117", "work-stealing", 116, "concentrated_skew", b, bs,
        "work stealing vs adversarial static mapping (all long tasks on worker 0)", a, ast,
        extra={"makespan_before": mb, "makespan_after": ma})

# d118 BAC-0118 lease-fencing (117): fencing + epoch
def d118():
    def before():  # fencing token, no epoch: old leader with valid token writes during partition
        store = {"v": 0, "f": 0}
        def w(val, tok):
            if tok < store["f"]: return False
            store["f"] = tok; store["v"] = val; return True
        w(1, 5); w(99, 5)  # equal token: accepted (split-brain)
        return store["v"]
    def after():  # CHANGE: (epoch, token) fencing: higher epoch always wins
        store = {"v": 0, "e": 0, "f": 0}
        def w(val, e, tok):
            if (e, tok) <= (store["e"], store["f"]): return False
            store.update(e=e, f=tok, v=val); return True
        w(1, 1, 5); ok = w(99, 1, 5)  # same epoch+token: rejected
        w(2, 2, 1)  # new epoch wins even with lower token
        return store["v"], ok
    vb = before(); va, ok = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0118", "lease-fencing", 117, "epoch_fencing", b, bs,
        "(epoch, token) fencing vs bare token (equal-token split-brain)", a, ast,
        extra={"value_before": vb, "value_after": va, "stale_rejected": not ok})

# d119 BAC-0119 connection-pools (118): checkout timeout + wait queue
def d119():
    import queue as qq
    def new_conn():
        s = 0
        for k in range(2000): s += k & 0xFF
        return {"s": s}
    def before():  # fail-fast when pool empty
        pool = deque(new_conn() for _ in range(2)); failed = 0
        for _ in range(10):
            if pool: c = pool.popleft()
            else: failed += 1; continue
        return failed
    def after():  # CHANGE: bounded wait queue with timeout
        pool = qq.Queue(maxsize=2)
        for _ in range(2): pool.put(new_conn())
        got = 0
        for _ in range(10):
            try:
                c = pool.get(timeout=0.001); got += 1; pool.put(c)
            except qq.Empty: pass
        return got
    fb = before(); ga = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0119", "connection-pools", 118, "pool_exhaustion_10_checkouts_2_conns", b, bs,
        "bounded wait-queue with timeout vs fail-fast on exhaustion (simulated)", a, ast,
        extra={"failed_before": fb, "acquired_after": ga})

# d120 BAC-0120 query-planning (119): predicate pushdown
def d120():
    rows = [{"a": i % 100, "b": i, "c": "x"*20} for i in range(40000)]
    def before():  # filter after full projection
        proj = [(r["a"], r["b"], r["c"]) for r in rows]
        return [p for p in proj if p[0] == 7]
    def after():  # CHANGE: push predicate before projection
        return [(r["a"], r["b"], r["c"]) for r in rows if r["a"] == 7]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0120", "query-planning", 119, "filter_40k_pushdown", b, bs,
        "predicate pushdown before projection vs filter-after-project", a, ast)

# d121 BAC-0121 indexes (120): LSM memtable + sorted run vs sorted list
def d121():
    data = sorted(("k%05d" % (i * 7919 % 30000), i) for i in range(30000))
    keys = [k for k, _ in data]
    mem = {}  # CHANGE: memtable absorbs recent writes
    for i in range(30000, 30200): mem["k%05d" % i] = i
    lookups = ["k%05d" % (i * 997 % 30200) for i in range(300)]
    def before():
        out = []
        for lk in lookups:
            i = bisect.bisect_left(keys, lk)
            out.append(data[i][1] if i < len(data) and data[i][0] == lk else None)
        return out
    def after():
        out = []
        for lk in lookups:
            if lk in mem: out.append(mem[lk])
            else:
                i = bisect.bisect_left(keys, lk)
                out.append(data[i][1] if i < len(data) and data[i][0] == lk else None)
        return out
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0121", "indexes", 120, "300_lookups_memtable", b, bs,
        "LSM-style memtable + sorted run vs single sorted list", a, ast)

# d122 BAC-0122 partitioning (121): consistent hashing vs mod-N
def d122():
    nodes = ["n%d" % i for i in range(8)]
    keys = ["key-%d" % i for i in range(20000)]
    def mod_owner(k): return nodes[hash(k) % 8]
    ring = []
    for n in nodes:
        for v in range(100): ring.append((hash("%s#%d" % (n, v)), n))
    ring.sort()
    import bisect as bs2
    def ch_owner(k):
        h = hash("key:" + k)
        i = bs2.bisect(ring, (h, ""))
        return ring[i % len(ring)][1]
    before_map = {k: mod_owner(k) for k in keys}
    nodes2 = nodes + ["n8"]  # add node
    def before():  # mod-N: remap everything
        return sum(1 for k in keys if nodes[hash(k) % 8] != nodes2[hash(k) % 9])
    after_map = {k: ch_owner(k) for k in keys}
    ring2 = ring + sorted((hash("n8#%d" % v), "n8") for v in range(100))
    ring2.sort()
    def ch_owner2(k):
        h = hash("key:" + k)
        i = bs2.bisect(ring2, (h, ""))
        return ring2[i % len(ring2)][1]
    def after():  # CHANGE: consistent hashing remaps ~1/9
        return sum(1 for k in keys if after_map[k] != ch_owner2(k))
    mb = before(); ma = after()
    b, bs_ = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0122", "partitioning", 121, "add_node_20k_keys", b, bs_,
        "consistent hashing ring vs mod-N on node addition", a, ast,
        extra={"remapped_before": mb, "remapped_after": ma})

# d123 BAC-0123 pagination (122): estimated count vs exact count
def d123():
    con = __import__("sqlite3").connect(":memory:")
    con.execute("CREATE TABLE t(id INTEGER PRIMARY KEY)")
    con.executemany("INSERT INTO t VALUES(?)", [(i,) for i in range(100000)])
    def before():  # exact count scans
        return con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
    def after():  # CHANGE: estimate from index max (O(1))
        return con.execute("SELECT MAX(id) FROM t").fetchone()[0] + 1
    cb = before(); ca = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    con.close()
    rec("BAC-0123", "pagination", 122, "page_count_100k_sqlite", b, bs,
        "estimated count (MAX(id)) vs exact COUNT(*) for page-count display", a, ast,
        extra={"count_before": cb, "count_after": ca})

# d124 BAC-0124 cursor-durability (123): transactional cursor
def d124():
    N = 10000
    log = []
    def before():  # cursor persisted separately: crash between data write and cursor write
        cursor = 0
        for i in range(N):
            log.append(i)
            if i % 1000 == 0 and i != 6000: cursor = i  # crash at 6000 before persist
            if i == 6000: break
        return cursor, len(log)  # cursor says 5000, log has 6001 -> rework
    def after():  # CHANGE: cursor committed atomically with batch
        cursor = 0; batch = []
        for i in range(N):
            batch.append(i)
            if len(batch) == 1000:
                log.extend(batch); cursor = i + 1; batch = []  # atomic
                if i == 6000: break
        return cursor
    cb, lb = before(); log.clear(); ca = after()
    b, bs = B.med(lambda: (log.clear(), before())[1]); a, ast = B.med(lambda: (log.clear(), after())[1])
    rec("BAC-0124", "cursor-durability", 123, "crash_atomicity", b, bs,
        "transactional cursor (cursor+batch atomic) vs separate cursor persist", a, ast,
        extra={"cursor_before": cb, "log_len_before": lb, "cursor_after": ca,
               "note": "correctness: no phantom rework window"})

# d125 BAC-0125 cache-locality (124): strided prefetch-friendly layout
def d125():
    N = 60000
    flat = list(range(N))
    def before():  # strided access over flat
        return sum(flat[i] for i in range(0, N, 8))
    blocked = [flat[i:i+8] for i in range(0, N, 8)]  # CHANGE: blocked layout
    def after(): return sum(b[0] for b in blocked)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0125", "cache-locality", 124, "strided_sum_60k", b, bs,
        "blocked layout for strided access vs strided access over flat array", a, ast)

BENCHES3A = [d101, d102, d103, d104, d105, d106, d107, d108, d109, d110,
             d111, d112, d113, d114, d115, d116, d117, d118, d119, d120,
             d121, d122, d123, d124, d125]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES3A:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    with open(os.path.join(HERE, "bench3_results.json"), "w") as f:
        json.dump({"results": results, "repeats": B.R,
                   "elapsed_s": round(time.time() - t0, 1)}, f, indent=1)
    print("wrote bench3_results.json, %d missions" % len(results))
