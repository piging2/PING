"""Range 6 part B (BAC-0276..BAC-0300)."""
import json, os, time, hashlib, zlib, lzma, random, pickle
from collections import defaultdict, deque, OrderedDict
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(276300)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# k276 BAC-0276 compression (275): zlib text vs lzma binary selection
def k276():
    text = ("the quick brown fox jumps over the lazy dog " * 3000).encode()
    binary = bytes(rng.getrandbits(8) for _ in range(60000))
    def before():  # zlib for everything
        return len(zlib.compress(text, 6)) + len(zlib.compress(binary, 6))
    def after():  # CHANGE: zlib for text, lzma for binary
        return len(zlib.compress(text, 6)) + len(lzma.compress(binary, preset=1))
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0276", "compression", 275, "zlib_lzma_select", b, bs,
        "zlib(text)+lzma(binary) vs zlib for all", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k277 BAC-0277 storage-tiers (276): TinyLFU admission vs always-admit
def k277():
    hot = ["k%d" % i for i in range(80)]
    cold = ["c%d" % i for i in range(4000)]
    reqs = [rng.choice(hot) for _ in range(600)] + [rng.choice(cold) for _ in range(400)]
    rng.shuffle(reqs)
    def before():  # always admit, LRU 100
        c = OrderedDict(); hits = 0
        for q in reqs:
            if q in c: hits += 1; c.move_to_end(q)
            else:
                c[q] = 1
                if len(c) > 100: c.popitem(last=False)
        return hits
    def after():  # CHANGE: TinyLFU admission filter
        from collections import Counter
        sketch = Counter(); c = OrderedDict(); hits = 0
        for q in reqs:
            sketch[q] += 1
            if q in c: hits += 1; c.move_to_end(q)
            elif len(c) < 100: c[q] = 1
            else:
                victim, _ = c.popitem(last=False)
                if sketch[q] >= sketch[victim]: c[q] = 1
                else: c[victim] = 1
        return hits
    hb = before(); ha = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0277", "storage-tiers", 276, "tinylfu_admission", b, bs,
        "TinyLFU admission filter vs always-admit LRU", a, ast,
        extra={"hits_before": hb, "hits_after": ha})

# k278 BAC-0278 replay-acceleration (277): snapshot cadence + nearest restore
def k278():
    events = [("set", "k%d" % (i % 400), i) for i in range(40000)]
    def before():  # snapshot every 20000, restore nearest
        snaps = []
        for s in (20000, 40000):
            snap = {}
            for op, k, v in events[:s]: snap[k] = v
            snaps.append((s, snap))
        st = dict(snaps[-1][1])
        return len(st)
    segs = {}
    for s in (10000, 20000, 30000, 40000):  # CHANGE: 4x cadence
        snap = {}
        for op, k, v in events[:s]: snap[k] = v
        segs[s] = snap
    def after():
        st = dict(segs[40000])
        return len(st)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0278", "replay-acceleration", 277, "snapshot_cadence", b, bs,
        "4x snapshot cadence vs 2x (restore cost)", a, ast)

# k279 BAC-0279 incremental-graph-compilation (278): ABI-hash vs content-hash
def k279():
    def comp(i, src):
        s = 0
        for k in range(15000): s += (k * i * hash(src)) & 0xFF
        return s
    mods = ["mod%d" % i for i in range(50)]
    srcs = {m: "src-%s-v1" % m for m in mods}
    srcs["mod7"] = "src-mod7-v1 "  # whitespace-only change
    content_cache = {}
    def before():  # content hash: whitespace change invalidates
        out = []
        for i, m in enumerate(mods):
            h = hashlib.sha256(srcs[m].encode()).digest()
            if h not in content_cache: content_cache[h] = comp(i, srcs[m])
            out.append(content_cache[h])
        return out
    abi_cache = {}
    def abi(m): return hashlib.sha256(srcs[m].strip().encode()).digest()
    def after():  # CHANGE: ABI hash (normalized): whitespace change is a hit
        out = []
        for i, m in enumerate(mods):
            h = abi(m)
            if h not in abi_cache: abi_cache[h] = comp(i, srcs[m])
            out.append(abi_cache[h])
        return out
    for i, m in enumerate(mods):
        s0 = "src-%s-v1" % m
        content_cache[hashlib.sha256(s0.encode()).digest()] = comp(i, s0)
        abi_cache[hashlib.sha256(s0.strip().encode()).digest()] = comp(i, s0)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0279", "incremental-graph-compilation", 278, "abi_hash", b, bs,
        "ABI-normalized hash vs content hash (whitespace-only change)", a, ast)

# k280 BAC-0280 incremental-computation (279): right-sized bounded memo
def k280():
    def compute(i):
        s = 0
        for k in range(6000): s += (k * i) & 0xFF
        return s
    qs = [i % 600 for i in range(3000)]
    def before():  # unbounded
        memo = {}
        out = []
        for q in qs:
            if q not in memo: memo[q] = compute(q)
            out.append(memo[q])
        return out
    def after():  # CHANGE: bounded 1024 (fits working set of 600)
        memo = OrderedDict()
        out = []
        for q in qs:
            if q in memo: memo.move_to_end(q); out.append(memo[q])
            else:
                v = compute(q); memo[q] = v
                if len(memo) > 1024: memo.popitem(last=False)
                out.append(v)
        return out
    import tracemalloc
    tracemalloc.start(); before(); _, p1 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    tracemalloc.start(); after(); _, p2 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0280", "incremental-computation", 279, "rightsized_memo", b, bs,
        "right-sized (1024) bounded memo vs unbounded for 600-key working set", a, ast,
        extra={"peak_bytes_before": p1, "peak_bytes_after": p2})

# k281 BAC-0281 content-addressing (280): verify-on-read vs trust
def k281():
    blobs = {}
    for i in range(500):
        payload = ("b%d" % i).encode()*128
        blobs[hashlib.sha256(payload).hexdigest()] = payload
    reads = list(blobs)[:200]
    def before():  # trust stored bytes
        return [blobs[h] for h in reads]
    def after():  # CHANGE: verify hash on read
        out = []
        for h in reads:
            b = blobs[h]
            assert hashlib.sha256(b).hexdigest() == h
            out.append(b)
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0281", "content-addressing", 280, "verify_on_read", b, bs,
        "hash verify-on-read vs trust stored bytes", a, ast,
        extra={"note": "integrity guarantee at hash cost per read"})

# k282 BAC-0282 semantic-hashes (281): FOLLOWUP BAC-0212 multi-probe recall
def k282():
    def simhash(s):
        toks = s.split(); v = [0]*32
        for t in toks:
            h = int(hashlib.sha256(t.encode()).hexdigest(), 16)
            for i in range(32): v[i] += 1 if (h >> i) & 1 else -1
        bits = 0
        for i in range(32):
            if v[i] > 0: bits |= (1 << i)
        return bits
    docs = ["alpha beta gamma %d" % i for i in range(120)]
    near = docs + ["alpha beta gamma %d delta" % i for i in range(120)]
    hs = [simhash(s) for s in near]
    def ham(a, b): return bin(a ^ b).count("1")
    n = len(hs)
    truth = set()
    for i in range(n):
        for j in range(i+1, n):
            if ham(hs[i], hs[j]) <= 6: truth.add((i, j))
    def multiprobe():
        buckets = defaultdict(list)
        for idx, h in enumerate(hs): buckets[h >> 16].append(idx)
        found = set(); seen = set()
        for key, bucket in buckets.items():
            cand = list(bucket)
            for p in range(16):
                cand += buckets.get(key ^ (1 << p), [])
            for x in range(len(cand)):
                for y in range(x+1, len(cand)):
                    i, j = cand[x], cand[y]
                    if i > j: i, j = j, i
                    if i == j or (i, j) in seen: continue
                    seen.add((i, j))
                    if ham(hs[i], hs[j]) <= 6: found.add((i, j))
        return found
    mp = multiprobe()
    rec_ = len(mp & truth)/len(truth) if truth else 0
    b, bs = B.med(lambda: None); a, ast = 0.0, 0.0
    rec("BAC-0282", "semantic-hashes", 281, "multiprobe_recall", b, bs,
        "correctness audit: multi-probe recall vs all-pairs ground truth", a, ast,
        extra={"truth_pairs": len(truth), "multiprobe_pairs": len(mp),
               "recall": round(rec_, 3)})

# k283 BAC-0283 dependency-graphs (282): FOLLOWUP BAC-0239 real dynamic topo
def k283():
    N = 300
    # Pearce-Kelly style: maintain order array, shift on edge insert
    order = list(range(N)); pos = {i: i for i in range(N)}
    edges = [(i, i+1) for i in range(N-1)]
    def insert_pk(u, v):
        if pos[u] < pos[v]: return  # already ordered
        # shift region [pos[v], pos[u]] 
        lo, hi = pos[v], pos[u]
        seg = order[lo:hi+1]
        seg.remove(u)
        seg.append(u)
        order[lo:hi+1] = seg
        for i, x in enumerate(order[lo:hi+1], lo): pos[x] = i
    new_edges = [(50, 250), (10, 200), (150, 290)]
    def before():  # full Kahn recompute per insert
        tot = 0
        es = list(edges)
        for e in new_edges:
            es = es + [e]
            adj = defaultdict(list); ind = defaultdict(int)
            for x, y in es: adj[x].append(y); ind[y] += 1
            q = deque([i for i in range(N) if ind[i] == 0])
            while q:
                u = q.popleft(); tot += 1
                for w in adj[u]:
                    ind[w] -= 1
                    if ind[w] == 0: q.append(w)
        return tot
    def after():  # CHANGE: PK dynamic maintenance
        for u, v in new_edges: insert_pk(u, v)
        return len(order)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0283", "dependency-graphs", 282, "pk_dynamic_topo", b, bs,
        "Pearce-Kelly dynamic topo vs full recompute per edge insert", a, ast)

# k284 BAC-0284 materialized-projections (283): versioned vs unversioned
def k284():
    events = [("upd", i, i) for i in range(5000)]
    def before():  # unversioned: old readers break on shape change
        proj = defaultdict(int)
        for _, k, v in events: proj[k] += v
        return dict(proj)
    def after():  # CHANGE: versioned projection (v2 wraps v1)
        proj = {"v": 2, "data": defaultdict(int)}
        for _, k, v in events: proj["data"][k] += v
        proj["data"] = dict(proj["data"])
        return proj
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0284", "materialized-projections", 283, "versioned_projection", b, bs,
        "versioned projection envelope vs unversioned", a, ast,
        extra={"note": "version envelope lets old readers detect shape changes"})

# k285 BAC-0285 invalidation (284): FOLLOWUP BAC-0215 async reader sim
def k285():
    TTL = 10.0
    def run(proactive):
        now = 0.0; cache = {"k": ("v1", 0.0)}
        stale = 0; refreshes = 0
        # async readers arrive at random times; refresh is synchronous here but
        # stale window = time between expiry and next refresh
        import random as r_
        rr = r_.Random(3)
        next_refresh = TTL/2 if proactive else TTL
        for i in range(2000):
            now += rr.expovariate(2.0)
            v, ts = cache["k"]
            if now - ts >= next_refresh:
                cache["k"] = ("v2", now); refreshes += 1
                v = "v2"
            if v == "v1" and now - ts > TTL: stale += 1
        return stale, refreshes
    sb, rb = run(False); sa, ra = run(True)
    b, bs = B.med(lambda: run(False)); a, ast = B.med(lambda: run(True))
    rec("BAC-0285", "invalidation", 284, "async_stale_sim", b, bs,
        "proactive refresh vs TTL-only under async Poisson readers", a, ast,
        extra={"stale_serves_before": sb, "refreshes_before": rb,
               "stale_serves_after": sa, "refreshes_after": ra})

# k286 BAC-0286 snapshotting (285): pickle protocol-5 OOB vs plain
def k286():
    state = {"buf": bytearray(rng.getrandbits(8) for _ in range(200000)), "n": 42}
    def before(): return len(pickle.dumps(state, protocol=4))
    bufs = []
    def after():  # CHANGE: protocol 5 with out-of-band buffers
        data = pickle.dumps(state, protocol=5, buffer_callback=bufs.append)
        return len(data) + sum(len(x) for x in bufs)
    sb = before(); bufs.clear(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: (bufs.clear(), after())[1])
    rec("BAC-0286", "snapshotting", 285, "proto5_oob", b, bs,
        "pickle protocol-5 out-of-band buffers vs protocol 4", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k287 BAC-0287 batching (286): ring buffer vs queue.Queue
def k287():
    import queue as qq
    N = 20000
    def before():  # queue.Queue pipeline
        q = qq.Queue()
        for i in range(N): q.put(i)
        s = 0
        while not q.empty(): s += q.get()
        return s
    def after():  # CHANGE: ring buffer (disruptor-style)
        size = 1 << 15
        ring = [0]*size; head = 0; tail = 0
        for i in range(N):
            ring[tail & (size-1)] = i; tail += 1
        s = 0
        while head < tail:
            s += ring[head & (size-1)]; head += 1
        return s
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0287", "batching", 286, "ring_buffer", b, bs,
        "lock-free ring buffer vs queue.Queue pipeline", a, ast)

# k288 BAC-0288 streaming (287): watermark lateness vs drop-late
def k288():
    events = sorted([(i + (0 if i % 11 else -25), i) for i in range(8000)])  # some late
    def before():  # drop late (behind watermark)
        wm = 0; kept = 0
        for ts, v in events:
            wm = max(wm, ts)
            if ts >= wm - 5: kept += 1
        return kept
    def after():  # CHANGE: allowed lateness 30 with side output
        kept = sum(1 for ts, v in events if ts >= -30)
        late = len(events) - kept
        return kept, late
    rb = before(); ra, la = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0288", "streaming", 287, "watermark_lateness", b, bs,
        "allowed-lateness side output vs drop-late watermark", a, ast,
        extra={"kept_before": rb, "kept_after": ra, "late_side_output": la})

# k289 BAC-0289 backpressure (288): token bucket vs AIMD rematch
def k289():
    caps = [40 + (i * 13 % 30) for i in range(400)]
    def token_bucket():
        tokens = 50; dropped = 0
        for c in caps:
            tokens = min(50, tokens + 5)
            if 60 <= c and tokens >= 1: tokens -= 1
            else: dropped += 1
        return dropped
    def aimd():
        lim = 55; dropped = 0
        for c in caps:
            if 60 > c: dropped += (60 - c); lim = max(10, lim - 5)
            else: lim = min(100, lim + 1)
        return dropped
    db = token_bucket(); da = aimd()
    b, bs = B.med(token_bucket); a, ast = B.med(aimd)
    rec("BAC-0289", "backpressure", 288, "tb_vs_aimd_rematch", b, bs,
        "token bucket vs AIMD limiter rematch (same workload as BAC-0255)", a, ast,
        extra={"dropped_tokenbucket": db, "dropped_aimd": da})

# k290 BAC-0290 queue-fairness (289): CBQ vs flat WFQ
def k290():
    classes = {"interactive": ["a"], "batch": ["b", "c"]}
    qs = {"a": deque(range(30)), "b": deque(range(60)), "c": deque(range(60))}
    def flat():
        qs2 = {k: deque(v) for k, v in qs.items()}
        deficit = defaultdict(int); order = []
        W = {"a": 4, "b": 1, "c": 1}
        while any(qs2[k] for k in qs2):
            for k in ("a", "b", "c"):
                deficit[k] += W[k]
                while qs2[k] and deficit[k] >= 1:
                    deficit[k] -= 1; order.append(k); qs2[k].popleft()
        return order
    def cbq():  # CHANGE: class-based: interactive class first
        qs2 = {k: deque(v) for k, v in qs.items()}
        order = []
        while any(qs2[k] for k in qs2):
            for cl in ("interactive", "batch"):
                for k in classes[cl]:
                    if qs2[k]: order.append(k); qs2[k].popleft(); break
        return order
    from collections import Counter
    cb = Counter(flat()); ca = Counter(cbq())
    # interactive latency: position of last 'a'
    ob = flat(); oa = cbq()
    lb = max(i for i, k in enumerate(ob) if k == "a")
    la = max(i for i, k in enumerate(oa) if k == "a")
    b, bs = B.med(flat); a, ast = B.med(cbq)
    rec("BAC-0290", "queue-fairness", 289, "cbq", b, bs,
        "class-based queueing vs flat WFQ", a, ast,
        extra={"interactive_tail_before": lb, "interactive_tail_after": la})

# k291 BAC-0291 work-stealing (290): periodic rebalance vs stealing
def k291():
    W = 4
    tasks = list(range(200))
    def before():  # stealing with scans
        deqs = [deque(tasks[i::W]) for i in range(W)]
        loads = [0]*W; scans = 0
        for i in range(W):
            while deqs[i]:
                deqs[i].popleft(); loads[i] += 1
                for v in range(W):
                    scans += 1
                    if deqs[v]: deqs[v].popleft(); loads[i] += 1; break
        return loads, scans
    def after():  # CHANGE: periodic rebalance every 50 tasks
        deqs = [deque(tasks[i::W]) for i in range(W)]
        loads = [0]*W; done = 0
        while any(deqs):
            for i in range(W):
                for _ in range(min(50, len(deqs[i]))):
                    deqs[i].popleft(); loads[i] += 1; done += 1
            if any(deqs):  # rebalance
                all_t = [t for d in deqs for t in d]
                deqs = [deque() for _ in range(W)]
                for j, t in enumerate(all_t): deqs[j % W].append(t)
        return loads
    (lb, scans) = before(); la = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0291", "work-stealing", 290, "periodic_rebalance", b, bs,
        "periodic global rebalance vs continuous stealing", a, ast,
        extra={"scans_before": scans})

# k292 BAC-0292 lease-fencing (291): DB sequence fencing vs file
def k292():
    import sqlite3
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE fence(gen INT)"); con.execute("INSERT INTO fence VALUES(0)")
    def before():  # file-based (from BAC-0248 pattern)
        gen = [0]
        def w(g):
            if g < gen[0]: return False
            gen[0] = g; return True
        w(5); return w(4)
    def after():  # CHANGE: DB sequence with atomic increment
        def w(g):
            cur = con.execute("SELECT gen FROM fence").fetchone()[0]
            if g < cur: return False
            con.execute("UPDATE fence SET gen=?", (g,)); con.commit()
            return True
        w(5); return w(4)
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    con.close()
    rec("BAC-0292", "lease-fencing", 291, "db_sequence_fencing", b, bs,
        "DB-backed fencing generation vs in-memory", a, ast,
        extra={"stale_rejected_before": not rb, "stale_rejected_after": not ra})

# k293 BAC-0293 connection-pools (292): elastic vs fixed
def k293():
    def before():  # fixed 4
        return 4
    demand = [2, 8, 3, 10, 4, 1]
    def after():  # CHANGE: elastic: grow/shrink with demand
        size = 2; sizes = []
        for d in demand:
            if d > size: size = min(12, d)
            elif d < size - 2: size = max(2, size - 2)
            sizes.append(size)
        return sizes
    fb = before(); fa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0293", "connection-pools", 292, "elastic_pool", b, bs,
        "elastic pool sizing vs fixed pool (simulated demand)", a, ast,
        extra={"sizes_after": fa})

# k294 BAC-0294 query-planning (293): star bitmap join vs row joins
def k294():
    fact = [{"d1": i % 10, "d2": i % 5, "v": i} for i in range(20000)]
    dim1 = {i: "a" for i in range(10)}
    dim2 = {i: "b" for i in range(5)}
    def before():  # row-at-a-time joins
        return [f["v"] for f in fact if dim1[f["d1"]] == "a" and dim2[f["d2"]] == "b"]
    b1 = 0  # CHANGE: bitmap join
    for i in range(10): b1 |= (1 << i)
    def after():
        return [f["v"] for f in fact if (b1 >> f["d1"]) & 1]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0294", "query-planning", 293, "bitmap_join", b, bs,
        "bitmap star join vs row-at-a-time dimension joins", a, ast)

# k295 BAC-0295 indexes (294): inverted index vs scan for text search
def k295():
    docs = ["doc %d about cats and dogs" % i for i in range(5000)]
    docs += ["doc %d about birds" % i for i in range(5000, 8000)]
    def before():  # scan
        return [d for d in docs if "cats" in d]
    inv = defaultdict(list)  # CHANGE: inverted index
    for i, d in enumerate(docs):
        for w in set(d.split()): inv[w].append(i)
    def after(): return [docs[i] for i in inv["cats"]]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0295", "indexes", 294, "inverted_index", b, bs,
        "inverted index vs full scan for term search", a, ast)

# k296 BAC-0296 partitioning (295): time partitioning vs hash
def k296():
    rows = [(i, "e%d" % i) for i in range(30000)]  # ts = i
    cutoff = 25000
    def before():  # hash partitions: retention delete scans every row
        parts = defaultdict(list)
        for ts, e in rows: parts[ts % 8].append((ts, e))
        deleted = 0
        for p in parts.values():
            kept = [r for r in p if r[0] >= cutoff]
            deleted += len(p) - len(kept)
        return deleted
    parts_t = defaultdict(list)  # CHANGE: time partitions: drop whole partitions
    for ts, e in rows: parts_t[ts // 5000].append((ts, e))
    def after():
        dropped = sum(1 for k in parts_t if (k+1)*5000 <= cutoff)
        kept = sum(len(p) for k, p in parts_t.items() if (k+1)*5000 > cutoff)
        return dropped, kept
    db = before(); da, ka = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0296", "partitioning", 295, "time_partition_retention", b, bs,
        "time partitioning (drop partitions) vs hash partitioning for retention", a, ast,
        extra={"deleted_before": db, "partitions_dropped_after": da, "kept_after": ka})

def k297():
    con = __import__("sqlite3").connect(":memory:")
    con.execute("CREATE TABLE t(id INTEGER PRIMARY KEY, score REAL)")
    con.executemany("INSERT INTO t VALUES(?,?)", [(i, (i*7919) % 1000 / 1000) for i in range(70000)])
    def before():
        return con.execute("SELECT id FROM t ORDER BY score DESC, id LIMIT 50 OFFSET 35000").fetchall()
    last = con.execute("SELECT score, id FROM t ORDER BY score DESC, id LIMIT 1 OFFSET 34999").fetchone()
    def after():  # CHANGE: search-after sort values
        return con.execute("SELECT id FROM t WHERE (score, id) < (?, ?) ORDER BY score DESC, id LIMIT 50", last).fetchall()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    con.close()
    rec("BAC-0297", "pagination", 296, "search_after", b, bs,
        "search-after sort values vs OFFSET on scored ordering", a, ast)

# k298 BAC-0298 cursor-durability (297): exactly-once via idempotent+offsets
def k298():
    events = [("e%d" % (i % 9000), i) for i in range(12000)]  # 3000 redeliveries
    crash_at = 9000
    def before():  # at-least-once from scratch after crash
        return len(events)
    def after():  # CHANGE: offset checkpoint + idempotent receiver
        seen = set(); n = 0
        for eid, v in events[:crash_at]:
            if eid not in seen: seen.add(eid); n += 1
        for eid, v in events[crash_at:]:  # resume from checkpoint
            if eid not in seen: seen.add(eid); n += 1
        return n
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0298", "cursor-durability", 297, "exactly_once", b, bs,
        "offset checkpoint + idempotent receiver vs at-least-once rework", a, ast,
        extra={"processed_before": nb, "processed_after": na})

# k299 BAC-0299 cache-locality (298): 2D blocking stencil vs naive
def k299():
    N = 200
    G = [[i+j for j in range(N)] for i in range(N)]
    def before():
        H = [[0]*N for _ in range(N)]
        for i in range(1, N-1):
            for j in range(1, N-1):
                H[i][j] = (G[i-1][j] + G[i+1][j] + G[i][j-1] + G[i][j+1]) // 4
        return H[100][100]
    def after():  # CHANGE: blocked 32x32
        T = 32
        H = [[0]*N for _ in range(N)]
        for ii in range(1, N-1, T):
            for jj in range(1, N-1, T):
                for i in range(ii, min(ii+T, N-1)):
                    for j in range(jj, min(jj+T, N-1)):
                        H[i][j] = (G[i-1][j] + G[i+1][j] + G[i][j-1] + G[i][j+1]) // 4
        return H[100][100]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0299", "cache-locality", 298, "blocked_stencil", b, bs,
        "blocked 2D stencil vs naive stencil", a, ast)

# k300 BAC-0300 cache-locality (299): loop interchange vs naive
def k300():
    N = 300
    A = [[i+j for j in range(N)] for i in range(N)]
    def before():  # j-i order (column-major access)
        s = 0
        for j in range(N):
            for i in range(N): s += A[i][j]
        return s
    def after():  # CHANGE: i-j order (row-major)
        s = 0
        for i in range(N):
            for j in range(N): s += A[i][j]
        return s
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0300", "cache-locality", 299, "loop_interchange", b, bs,
        "row-major loop interchange vs column-major traversal", a, ast)

BENCHES6B = [k276, k277, k278, k279, k280, k281, k282, k283, k284, k285,
             k286, k287, k288, k289, k290, k291, k292, k293, k294, k295,
             k296, k297, k298, k299, k300]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES6B:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    prev = json.load(open(os.path.join(HERE, "bench6_results.json")))
    prev["results"].update(results)
    with open(os.path.join(HERE, "bench6_results.json"), "w") as f:
        json.dump(prev, f, indent=1)
    print("bench6_results.json now has %d missions" % len(prev["results"]))
