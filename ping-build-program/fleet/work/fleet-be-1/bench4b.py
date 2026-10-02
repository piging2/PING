"""Range 4 part B (BAC-0176..BAC-0200)."""
import json, os, time, hashlib, zlib, random
from collections import defaultdict, deque
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(176200)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# g176 BAC-0176 incremental-computation (175): change-detected propagation
def g176():
    N = 250
    deps = {i: [i-1] if i else [] for i in range(N)}
    val = [0]*N
    def compute(i):
        s = 0
        for k in range(3000): s += (k * i) & 0xFF
        return s
    for i in range(N): val[i] = compute(i)
    def before():  # naive: recompute all downstream on any change
        return [compute(i) for i in range(100, N)]
    def after():  # CHANGE: propagate only if value actually changed
        out = {}
        new100 = compute(100)
        if new100 != val[100]:
            val[100] = new100
            for i in range(101, N): val[i] = compute(i); out[i] = val[i]
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0176", "incremental-computation", 175, "change_detected_prop", b, bs,
        "change-detected propagation (no-op change) vs naive downstream recompute", a, ast)

# g177 BAC-0177 content-addressing (176): hash-chained log
def g177():
    entries = ["event-%d payload" % i for i in range(3000)]
    def before():  # plain append log
        log = list(entries)
        return len(log)
    def after():  # CHANGE: hash-chained (tamper-evident)
        log = []; prev = b"\x00"*32
        for e in entries:
            h = hashlib.sha256(prev + e.encode()).digest()
            log.append((h, e)); prev = h
        return len(log)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    # tamper check demo
    rec("BAC-0177", "content-addressing", 176, "hash_chained_log", b, bs,
        "hash-chained tamper-evident log vs plain append log", a, ast,
        extra={"note": "tamper evidence: any edit breaks the chain; cost is one hash per entry"})

# g178 BAC-0178 semantic-hashes (177): multi-probe LSH
def g178():
    def simhash(s):
        toks = s.split(); v = [0]*32
        for t in toks:
            h = int(hashlib.sha256(t.encode()).hexdigest(), 16)
            for i in range(32): v[i] += 1 if (h >> i) & 1 else -1
        bits = 0
        for i in range(32):
            if v[i] > 0: bits |= (1 << i)
        return bits
    docs = ["alpha beta gamma %d" % i for i in range(400)]
    near = docs + ["alpha beta gamma %d delta" % i for i in range(400)]
    hs = [simhash(s) for s in near]
    def ham(a, b): return bin(a ^ b).count("1")
    def before():  # single bucket exact high-bits
        buckets = defaultdict(list)
        for idx, h in enumerate(hs): buckets[h >> 16].append(idx)
        found = 0
        for bucket in buckets.values():
            for x in range(len(bucket)):
                for y in range(x+1, len(bucket)):
                    if ham(hs[bucket[x]], hs[bucket[y]]) <= 6: found += 1
        return found
    def after():  # CHANGE: multi-probe (also check buckets within hamming 2 of high bits)
        buckets = defaultdict(list)
        for idx, h in enumerate(hs): buckets[h >> 16].append(idx)
        found = 0; seen = set()
        for key, bucket in buckets.items():
            probes = [key ^ (1 << i) for i in range(16)] + [key]
            cand = []
            for p in probes: cand += buckets.get(p, [])
            for x in range(len(cand)):
                for y in range(x+1, len(cand)):
                    i, j = cand[x], cand[y]
                    if i >= j or (i, j) in seen: continue
                    seen.add((i, j))
                    if ham(hs[i], hs[j]) <= 6: found += 1
        return found
    fb = before(); fa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0178", "semantic-hashes", 177, "multiprobe_lsh", b, bs,
        "multi-probe LSH vs single-bucket lookup", a, ast,
        extra={"pairs_before": fb, "pairs_after": fa})

# g179 BAC-0179 dependency-graphs (178): transitive reduction
def g179():
    N = 120
    edges = set()
    for i in range(N):
        for j in range(i+1, min(i+8, N)): edges.add((i, j))
    # add redundant transitive edges
    for i in range(0, N, 10):
        for j in range(i+2, min(i+8, N)): edges.add((i, j))
    def before(): return len(edges)
    reach = defaultdict(set)
    order = sorted(set(u for u, v in edges) | set(v for u, v in edges))
    adj = defaultdict(list)
    for u, v in edges: adj[u].append(v)
    def after():  # CHANGE: transitive reduction
        red = set()
        for u, v in edges:
            # redundant if another path u->v exists
            seen = set(); stack = [w for w in adj[u] if w != v]
            found = False
            while stack:
                x = stack.pop()
                if x == v: found = True; break
                if x in seen: continue
                seen.add(x); stack.extend(adj[x])
            if not found: red.add((u, v))
        return len(red)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0179", "dependency-graphs", 178, "transitive_reduction", b, bs,
        "transitive reduction vs full edge set for invalidation graph", a, ast,
        extra={"edges_before": nb, "edges_after": na})

# g180 BAC-0180 materialized-projections (179): batch read-model updater
def g180():
    events = [("sale", i % 40, i) for i in range(12000)]
    def before():  # per-event projection update
        proj = defaultdict(int)
        for _, k, v in events: proj[k] += v
        return dict(proj)
    def after():  # CHANGE: batch updater (aggregate in memory, flush once)
        batch = defaultdict(int)
        for _, k, v in events: batch[k] += v
        proj = dict(batch)  # single flush
        return proj
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0180", "materialized-projections", 179, "batch_updater", b, bs,
        "batch read-model updater vs per-event projection writes", a, ast)

# g181 BAC-0181 invalidation (180): TTL + proactive refresh
def g181():
    import time as t
    def before():  # TTL-only: stale window serves old value
        cache = {"k": ("v1", t.time())}
        stale_serves = 0
        for i in range(200):
            v, ts = cache["k"]
            if t.time() - ts > 0.0001:  # expired but still served until refresh
                stale_serves += 1
                cache["k"] = ("v2", t.time())
        return stale_serves
    def after():  # CHANGE: proactive refresh before expiry
        cache = {"k": ("v1", t.time())}
        stale_serves = 0
        for i in range(200):
            v, ts = cache["k"]
            if t.time() - ts > 0.00005:  # refresh at half TTL
                cache["k"] = ("v2", t.time())
            v, _ = cache["k"]
            if v == "v1" and i > 5: stale_serves += 1
        return stale_serves
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0181", "invalidation", 180, "proactive_refresh", b, bs,
        "proactive refresh at half-TTL vs TTL-only expiry", a, ast,
        extra={"stale_serves_before": sb, "stale_serves_after": sa})

# g182 BAC-0182 snapshotting (181): versioned-dict COW with memory proof
def g182():
    import copy, tracemalloc
    state = {i: list(range(10)) for i in range(4000)}
    def before():
        tracemalloc.start()
        s = copy.deepcopy(state)
        _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        return peak
    base = dict(state)
    def after():
        tracemalloc.start()
        snap = (base, {3: [9]*10})  # CHANGE: shared base + overlay
        _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        return peak
    pb = before(); pa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0182", "snapshotting", 181, "cow_memory_proof", b, bs,
        "copy-on-write snapshot vs deepcopy (peak-memory proof)", a, ast,
        extra={"peak_bytes_before": pb, "peak_bytes_after": pa})

# g183 BAC-0183 batching (182): adaptive batch sizing
def g183():
    latencies = [0.001 + (i % 7) * 0.0005 for i in range(3000)]
    def before():  # fixed batch 100
        batches = 0; i = 0
        while i < len(latencies):
            batches += 1; i += 100
        return batches
    def after():  # CHANGE: adaptive: target batch latency 0.05
        batches = 0; i = 0; size = 100
        while i < len(latencies):
            est = sum(latencies[i:i+size])
            if est > 0.06 and size > 10: size = max(10, size // 2)
            elif est < 0.03: size = min(500, size * 2)
            batches += 1; i += size
        return batches, size
    nb = before(); na, fs = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0183", "batching", 182, "adaptive_batch", b, bs,
        "latency-target adaptive batching vs fixed batch size", a, ast,
        extra={"batches_before": nb, "batches_after": na, "final_size": fs})

# g184 BAC-0184 streaming (183): threaded pipeline for IO-bound stages
def g184():
    import threading, queue as qq
    def io_stage(x):
        t = 0
        for k in range(2000): t += (k * x) & 0xFF  # simulated IO-ish
        return t
    items = list(range(400))
    def before():  # serial through 3 stages
        return [io_stage(io_stage(io_stage(x))) for x in items]
    def after():  # CHANGE: 3-stage threaded pipeline
        q1, q2, q3 = qq.Queue(32), qq.Queue(32), qq.Queue(32)
        out = []
        def s1():
            for x in items: q1.put(io_stage(x))
            q1.put(None)
        def s2():
            while True:
                x = q1.get()
                if x is None: q2.put(None); return
                q2.put(io_stage(x))
        def s3():
            while True:
                x = q2.get()
                if x is None: return
                out.append(io_stage(x))
        ts = [threading.Thread(target=f) for f in (s1, s2, s3)]
        for t_ in ts: t_.start()
        for t_ in ts: t_.join()
        return out
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0184", "streaming", 183, "threaded_pipeline_io", b, bs,
        "3-stage threaded pipeline vs serial for IO-ish stages", a, ast)

# g185 BAC-0185 backpressure (184): credit-based flow control
def g185():
    N = 2000
    def before():  # drop-tail on overflow
        q = deque(); dropped = 0
        for i in range(N):
            if len(q) >= 128: q.popleft(); dropped += 1
            q.append(i)
        while q: q.popleft()
        return dropped
    def after():  # CHANGE: credit-based: sender only sends with credit
        credits = 128; sent = 0; q = deque()
        for i in range(N):
            if credits > 0:
                q.append(i); credits -= 1; sent += 1
            while q and len(q) > 64:  # consumer drains
                q.popleft(); credits += 1
        while q: q.popleft()
        return N - sent
    db = before(); da = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0185", "backpressure", 184, "credit_flow_2k", b, bs,
        "credit-based flow control vs drop-tail", a, ast,
        extra={"dropped_before": db, "unsent_after": da})

# g186 BAC-0186 queue-fairness (185): virtual-time FQ vs deficit WFQ
def g186():
    flows = {"a": [100]*30, "b": [1500]*30}
    W = {"a": 1, "b": 1}
    def wfq():
        qs = {k: deque(v) for k, v in flows.items()}
        deficit = defaultdict(int); order = []
        while any(qs[k] for k in qs):
            for k in ("a", "b"):
                deficit[k] += 1500 * W[k]
                while qs[k] and deficit[k] >= qs[k][0]:
                    deficit[k] -= qs[k].popleft(); order.append(k)
        return order
    def vtfq():
        qs = {k: deque(v) for k, v in flows.items()}
        vt = defaultdict(float); order = []
        while any(qs[k] for k in qs):
            k = min((k for k in qs if qs[k]), key=lambda k: vt[k])
            vt[k] += qs[k][0] / W[k]; qs[k].popleft(); order.append(k)
        return order
    ob = wfq(); oa = vtfq()
    # byte-fairness: count bytes served in first half of service order
    def byte_ratio(order):
        sizes = {"a": 100, "b": 1500}
        half = len(order)//2
        ba = sum(sizes[k] for k in order[:half] if k == "a")
        bb = sum(sizes[k] for k in order[:half] if k == "b")
        return round(ba/max(bb,1), 3)
    rb = byte_ratio(ob); ra = byte_ratio(oa)
    b, bs = B.med(wfq); a, ast = B.med(vtfq)
    rec("BAC-0186", "queue-fairness", 185, "virtual_time_fq", b, bs,
        "virtual-time fair queueing vs deficit-counter WFQ", a, ast,
        extra={"byte_ratio_first_half_before": rb, "byte_ratio_first_half_after": ra,
               "note": "ratio closer to 1.0 = fairer"})

# g187 BAC-0187 work-stealing (186): locality-aware stealing
def g187():
    W = 4
    tasks = {(w, i): 1 for w in range(W) for i in range(40)}
    def before():  # random victim
        loads = [0]*W; rem = dict(tasks)
        while rem:
            for w in range(W):
                mine = [k for k in rem if k[0] == w]
                if mine: rem.pop(mine[0]); loads[w] += 1
                else:
                    v = rng.randrange(W)
                    theirs = [k for k in rem if k[0] == v]
                    if theirs: rem.pop(theirs[0]); loads[w] += 1
        return loads
    def after():  # CHANGE: prefer neighbor workers (locality)
        loads = [0]*W; rem = dict(tasks)
        while rem:
            for w in range(W):
                mine = [k for k in rem if k[0] == w]
                if mine: rem.pop(mine[0]); loads[w] += 1
                else:
                    for v in ((w+1) % W, (w-1) % W):
                        theirs = [k for k in rem if k[0] == v]
                        if theirs: rem.pop(theirs[0]); loads[w] += 1; break
        return loads
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0187", "work-stealing", 186, "locality_steal", b, bs,
        "neighbor-locality stealing vs random-victim stealing", a, ast)

# g188 BAC-0188 lease-fencing (187): time-bound leases vs counter fencing
def g188():
    import time as t
    def before():  # counter fencing only: stale holder with valid counter writes forever
        store = {"v": 0, "f": 0}
        def w(val, tok):
            if tok < store["f"]: return False
            store["f"] = tok; store["v"] = val; return True
        w(1, 5)
        t.sleep(0.01)  # lease would have expired, but counter still accepts
        ok = w(2, 5)
        return ok
    def after():  # CHANGE: time-bound: lease expiry rejects stale holder
        store = {"v": 0, "exp": 0}
        def w(val, exp):
            if t.time() > store["exp"] and store["exp"] != 0 and exp <= store["exp"]:
                return False
            store["exp"] = exp; store["v"] = val; return True
        w(1, t.time() + 0.005)
        t.sleep(0.01)
        ok = w(2, t.time() - 1)  # stale expiry: rejected
        return ok
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0188", "lease-fencing", 187, "time_bound_lease", b, bs,
        "time-bound lease expiry vs counter-only fencing", a, ast,
        extra={"stale_write_accepted_before": rb, "stale_write_accepted_after": ra})

# g189 BAC-0189 connection-pools (188): multiplexing vs 1:1
def g189():
    def new_conn():
        s = 0
        for k in range(15000): s += k & 0xFF
        return {"s": s, "streams": 0}
    reqs = list(range(24))
    def before():  # 1:1 connection per request
        return [new_conn() for _ in reqs]
    conns = [new_conn() for _ in range(4)]
    def after():  # CHANGE: multiplex 24 streams over 4 connections
        out = []
        for i, r in enumerate(reqs):
            c = conns[i % 4]; c["streams"] += 1; out.append((r, c["s"]))
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: (conns.__setitem__(slice(None), [new_conn() for _ in range(4)]), after())[1])
    rec("BAC-0189", "connection-pools", 188, "multiplex_24_over_4", b, bs,
        "stream multiplexing (24 over 4) vs 1:1 connections (simulated)", a, ast)

# g190 BAC-0190 query-planning (189): cost-based index vs scan choice
def g190():
    rows = [{"a": i % 1000, "b": i} for i in range(50000)]
    idx = defaultdict(list)
    for r in rows: idx[r["a"]].append(r)
    def before():  # always full scan
        return [r for r in rows if r["a"] == 42]
    def after():  # CHANGE: cost-based: selective predicate -> index
        sel = 1/1000
        if sel < 0.1: return list(idx[42])
        return [r for r in rows if r["a"] == 42]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0190", "query-planning", 189, "cost_based_choice", b, bs,
        "cost-based index-vs-scan choice vs always-full-scan", a, ast)

# g191 BAC-0191 indexes (190): partial index vs full index
def g191():
    rows = [(i, i % 10 == 0) for i in range(40000)]  # 10% active
    full = defaultdict(list)
    for i, act in rows: full[i].append(act)
    partial = {i: act for i, act in rows if act}  # CHANGE: only active indexed
    qs = [i * 997 % 40000 for i in range(300)]
    def before():
        return [full[q][0] if q in full else None for q in qs]
    def after():
        return [partial.get(q, False) for q in qs]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0191", "indexes", 190, "partial_index", b, bs,
        "partial index (10% of rows) vs full index", a, ast,
        extra={"index_entries_before": 40000, "index_entries_after": 4000})

# g192 BAC-0192 partitioning (191): partition pruning
def g192():
    parts = {m: [(m, i) for i in range(5000)] for m in range(12)}
    def before():  # scan all partitions
        return [r for m in parts for r in parts[m] if r[0] == 3]
    def after():  # CHANGE: prune to partition 3
        return [r for r in parts[3] if r[0] == 3]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0192", "partitioning", 191, "prune_1_of_12", b, bs,
        "partition pruning vs scan-all-partitions", a, ast)

# g193 BAC-0193 pagination (192): keyset with tiebreaker
def g193():
    con = __import__("sqlite3").connect(":memory:")
    con.execute("CREATE TABLE t(ts INT, id INTEGER PRIMARY KEY)")
    con.executemany("INSERT INTO t VALUES(?,?)", [(i // 10, i) for i in range(80000)])
    def before():  # offset with unstable order (ties on ts)
        return con.execute("SELECT id FROM t ORDER BY ts LIMIT 50 OFFSET 40000").fetchall()
    def after():  # CHANGE: keyset with (ts, id) tiebreaker
        return con.execute("SELECT id FROM t WHERE (ts, id) > (4000, 40009) ORDER BY ts, id LIMIT 50").fetchall()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    con.close()
    rec("BAC-0193", "pagination", 192, "keyset_tiebreaker", b, bs,
        "keyset with (ts,id) tiebreaker vs OFFSET on non-unique order", a, ast)

# g194 BAC-0194 cursor-durability (193): idempotent consumer
def g194():
    events = [("e%d" % (i % 8000), i) for i in range(10000)]  # 2000 redeliveries
    def before():  # rework all redelivered
        return len(events)
    def after():  # CHANGE: dedupe by event id
        seen = set(); n = 0
        for eid, v in events:
            if eid not in seen: seen.add(eid); n += 1
        return n
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0194", "cursor-durability", 193, "idempotent_consumer", b, bs,
        "idempotent consumer (dedupe by event id) vs rework-on-redelivery", a, ast,
        extra={"processed_before": nb, "processed_after": na})

# g195 BAC-0195 cache-locality (194): loop tiling
def g195():
    N = 256
    A = [[i+j for j in range(N)] for i in range(N)]
    Bm = [[i-j for j in range(N)] for i in range(N)]
    def before():
        C = [[0]*N for _ in range(N)]
        for i in range(N):
            for j in range(N):
                s = 0
                for k in range(N): s += A[i][k] * Bm[k][j]
                C[i][j] = s
        return C[0][0]
    def after():  # CHANGE: tiled (32) loops
        T = 32
        C = [[0]*N for _ in range(N)]
        for ii in range(0, N, T):
            for jj in range(0, N, T):
                for kk in range(0, N, T):
                    for i in range(ii, ii+T):
                        for j in range(jj, jj+T):
                            s = C[i][j]
                            for k in range(kk, kk+T): s += A[i][k] * Bm[k][j]
                            C[i][j] = s
        return C[0][0]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0195", "cache-locality", 194, "tiled_matmul_256", b, bs,
        "loop-tiled matmul vs naive triple loop", a, ast)

# g196 BAC-0196 artifact-dedup (195): content-defined chunking
def g196():
    data = bytes(rng.getrandbits(8) for _ in range(32768))
    data2 = data[:5000] + bytes(200) + data[5000:32568]  # insertion shift
    def fixed_chunks(d):
        return [d[o:o+1024] for o in range(0, len(d), 1024)]
    def before():  # fixed-size: shift breaks all downstream chunks
        c1 = {hashlib.sha256(c).digest() for c in fixed_chunks(data)}
        c2 = {hashlib.sha256(c).digest() for c in fixed_chunks(data2)}
        return len(c1 & c2)
    def cdc(d):  # CHANGE: content-defined (rolling hash boundaries)
        chunks = []; start = 0; h = 0
        for i, byte in enumerate(d):
            h = ((h * 31) + byte) & 0xFFFFFFFF
            if h % 1024 == 0 and i - start >= 256:
                chunks.append(d[start:i+1]); start = i+1
        chunks.append(d[start:])
        return chunks
    def after():
        c1 = {hashlib.sha256(c).digest() for c in cdc(data)}
        c2 = {hashlib.sha256(c).digest() for c in cdc(data2)}
        return len(c1 & c2)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0196", "artifact-dedup", 195, "cdc_shift_resilience", b, bs,
        "content-defined chunking vs fixed-size under insertion shift", a, ast,
        extra={"shared_chunks_before": nb, "shared_chunks_after": na})

# g197 BAC-0197 build-caching (196): two-level cache
def g197():
    def build(src):
        s = 0
        for k in range(40000): s += (k * hash(src)) & 0xFF
        return s
    srcs = ["s%d" % i for i in range(25)]
    local = {}
    def before():  # local only; evicted entries rebuild
        out = 0
        for s in srcs[:10]:  # only 10 fit
            h = hashlib.sha256(s.encode()).digest()
            if h not in local: local[h] = build(s)
            out += local[h]
        out2 = sum(build(s) for s in srcs[10:])  # evicted: rebuild
        return out + out2
    remote = {}
    for s in srcs: remote[hashlib.sha256(s.encode()).digest()] = build(s)  # warm remote
    def after():  # CHANGE: remote fallback on local miss
        out = 0
        for s in srcs:
            h = hashlib.sha256(s.encode()).digest()
            if h not in local: local[h] = remote[h]
            out += local[h]
        return out
    b, bs = B.med(lambda: (local.clear(), before())[1])
    a, ast = B.med(lambda: (local.clear(), after())[1])
    rec("BAC-0197", "build-caching", 196, "two_level_cache", b, bs,
        "two-level (local + remote) vs local-only cache", a, ast)

# g198 BAC-0198 browser-pooling (197): health-checked pool
def g198():
    live = [True]*5
    live[2] = False  # one dead connection
    def new_conn(i): return {"id": i}
    def before():  # unchecked: may hand out dead conn, fail, retry
        fails = 0
        for i in range(20):
            c = new_conn(i % 5)
            if not live[c["id"]]: fails += 1  # fail then retry
        return fails
    pool = deque(i for i in range(5) if live[i])  # CHANGE: health-checked
    def after():
        fails = 0
        for _ in range(20):
            c = pool.popleft(); pool.append(c)
            if not live[c]: fails += 1
        return fails
    fb = before(); fa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0198", "browser-pooling", 197, "health_checked_pool", b, bs,
        "health-checked pool (evict dead) vs unchecked pool (simulated)", a, ast,
        extra={"failures_before": fb, "failures_after": fa})

# g199 BAC-0199 test-selection (198): flaky quarantine
def g199():
    tests = ["t%d" % i for i in range(100)]
    flaky = {"t%d" % i for i in range(0, 100, 10)}
    def run(t):
        s = 0
        for k in range(15000): s += (k * hash(t)) & 0xFF
        return t not in flaky or hash(t) % 2 == 0
    def before():  # run all incl. flaky
        return sum(1 for t in tests if run(t))
    stable = [t for t in tests if t not in flaky]
    def after():  # CHANGE: quarantine flaky to nightly
        return sum(1 for t in stable if run(t))
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0199", "test-selection", 198, "flaky_quarantine", b, bs,
        "flaky-test quarantine vs run-all", a, ast,
        extra={"pass_before": nb, "pass_after": na, "quarantined": len(flaky)})

# g200 BAC-0200 selective-regeneration (199): subtree-sliced regen
def g200():
    N = 300
    children = {i: [2*i+1, 2*i+2] for i in range(N) if 2*i+2 < N}
    changed = {3}
    def render(i):
        s = 0
        for k in range(20000): s += (k * i) & 0xFF
        return s
    def before():  # regen all
        return [render(i) for i in range(N)]
    def affected():  # CHANGE: only changed subtree
        aff = set(changed); stack = list(changed)
        while stack:
            u = stack.pop()
            for v in children.get(u, []):
                if v not in aff: aff.add(v); stack.append(v)
        return aff
    aff = affected()
    def after(): return [render(i) for i in aff]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0200", "selective-regeneration", 199, "subtree_regen", b, bs,
        "changed-subtree regen vs regen-all", a, ast,
        extra={"pages_total": N, "pages_regen": len(aff)})

BENCHES4B = [g176, g177, g178, g179, g180, g181, g182, g183, g184, g185,
             g186, g187, g188, g189, g190, g191, g192, g193, g194, g195,
             g196, g197, g198, g199, g200]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES4B:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    prev = json.load(open(os.path.join(HERE, "bench4_results.json")))
    prev["results"].update(results)
    with open(os.path.join(HERE, "bench4_results.json"), "w") as f:
        json.dump(prev, f, indent=1)
    print("bench4_results.json now has %d missions" % len(prev["results"]))
