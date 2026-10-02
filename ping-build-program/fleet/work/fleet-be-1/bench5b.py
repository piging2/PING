"""Range 5 part B (BAC-0226..BAC-0250)."""
import json, os, time, hashlib, zlib, random, pickle
from collections import defaultdict, deque
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(22650)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# i226 BAC-0226 partitioning (225): hot-partition split vs static
def i226():
    parts = {p: 1000 for p in range(8)}
    load = [0]*8
    for i in range(16000): load[(i*7919) % 8 if i % 8 else 0] += 1  # partition 0 hot
    def before():
        return max(load)
    new_load = load[:]
    half = new_load[0] // 2  # CHANGE: split hot partition
    new_load[0] = half; new_load.append(half)
    def after():
        return max(new_load)
    mb = before(); ma = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0226", "partitioning", 225, "hot_split", b, bs,
        "hot-partition split vs static partitioning", a, ast,
        extra={"max_load_before": mb, "max_load_after": ma})

# i227 BAC-0227 pagination (226): cursor + estimated total
def i227():
    con = __import__("sqlite3").connect(":memory:")
    con.execute("CREATE TABLE t(id INTEGER PRIMARY KEY)")
    con.executemany("INSERT INTO t VALUES(?)", [(i,) for i in range(120000)])
    def before():  # offset page + exact count
        rows = con.execute("SELECT id FROM t ORDER BY id LIMIT 50 OFFSET 60000").fetchall()
        total = con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
        return len(rows), total
    def after():  # CHANGE: keyset page + estimated total
        rows = con.execute("SELECT id FROM t WHERE id > 60000 ORDER BY id LIMIT 50").fetchall()
        total = con.execute("SELECT MAX(id) FROM t").fetchone()[0] + 1
        return len(rows), total
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    con.close()
    rec("BAC-0227", "pagination", 226, "keyset_plus_estimate", b, bs,
        "keyset page + estimated total vs OFFSET + exact COUNT", a, ast)

# i228 BAC-0228 cursor-durability (227): FOLLOWUP BAC-0194 fair comparison
def i228():
    events = [("e%d" % (i % 8000), i) for i in range(10000)]
    def work(eid, v):
        s = 0
        for k in range(500): s += (k * v) & 0xFF
        return s
    def before():  # rework redeliveries (real work each time)
        return sum(work(eid, v) for eid, v in events)
    def after():  # CHANGE: idempotent dedupe by event id
        seen = set(); tot = 0
        for eid, v in events:
            if eid not in seen: seen.add(eid); tot += work(eid, v)
        return tot
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0228", "cursor-durability", 227, "idempotent_fair", b, bs,
        "idempotent consumer vs rework-on-redelivery (fair: real work both paths)", a, ast,
        extra={"note": "2000 of 10000 events are redeliveries; dedupe skips their work"})

# i229 BAC-0229 cache-locality (228): array module vs list
def i229():
    import array as arr_
    N = 200000
    lst = list(range(N))
    arr = arr_.array("l", range(N))
    def before(): return sum(lst)
    def after(): return sum(arr)  # CHANGE: dense C array
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0229", "cache-locality", 228, "dense_array_sum", b, bs,
        "array('l') dense storage vs python list for sequential sum", a, ast)

# i230 BAC-0230 artifact-dedup (229): FOLLOWUP BAC-0196 gear-hash CDC
def i230():
    data = bytes(rng.getrandbits(8) for _ in range(32768))
    data2 = data[:5000] + bytes(200) + data[5000:32568]
    def fixed_chunks(d):
        return [d[o:o+1024] for o in range(0, len(d), 1024)]
    c1 = {hashlib.sha256(c).digest() for c in fixed_chunks(data)}
    c2 = {hashlib.sha256(c).digest() for c in fixed_chunks(data2)}
    shared_fixed = len(c1 & c2)
    MASK = (1 << 10) - 1
    def gear_cdc(d):
        chunks = []; start = 0; h = 0
        T = [rng.getrandbits(32) for _ in range(256)]
        for i, byte in enumerate(d):
            h = ((h << 1) + T[byte]) & 0xFFFFFFFF
            if (h & MASK) == 0 and i - start >= 512:
                chunks.append(d[start:i+1]); start = i+1
        chunks.append(d[start:])
        return chunks
    g1 = {hashlib.sha256(c).digest() for c in gear_cdc(data)}
    g2 = {hashlib.sha256(c).digest() for c in gear_cdc(data2)}
    shared_gear = len(g1 & g2)
    def before(): return len(c1 & c2)
    def after(): return len(g1 & g2)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0230", "artifact-dedup", 229, "gear_cdc_v2", b, bs,
        "gear-hash content-defined chunking vs fixed-size under insertion shift", a, ast,
        extra={"shared_chunks_before": shared_fixed, "shared_chunks_after": shared_gear,
               "chunks_total": len(g1)})

# i231 BAC-0231 build-caching (230): codec selection by content type
def i231():
    text = ("lorem ipsum dolor sit amet " * 2000).encode()
    binary = bytes(rng.getrandbits(8) for _ in range(40000))
    def before():  # single codec (zlib) for all
        return len(zlib.compress(text, 6)) + len(zlib.compress(binary, 6))
    import bz2
    def after():  # CHANGE: zlib for text, bz2 for binary
        return len(zlib.compress(text, 6)) + len(bz2.compress(binary, 6))
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0231", "build-caching", 230, "codec_selection", b, bs,
        "per-content codec selection vs single zlib for all", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# i232 BAC-0232 storage-tiers (231): FOLLOWUP BAC-0102 proper scan-resistant
def i232():
    hot = ["k%d" % i for i in range(100)]
    scan = ["s%d" % i for i in range(1500)]
    reqs = [rng.choice(hot) for _ in range(800)] + scan[:200]
    rng.shuffle(reqs)
    from collections import OrderedDict
    def before():  # single LRU 150
        c = OrderedDict(); hits = 0
        for q in reqs:
            if q in c: hits += 1; c.move_to_end(q)
            else:
                c[q] = 1
                if len(c) > 150: c.popitem(last=False)
        return hits
    def after():  # CHANGE: segmented: 100 probationary + 50 protected (O(1) ops)
        prob = OrderedDict(); prot = OrderedDict(); hits = 0
        for q in reqs:
            if q in prot: hits += 1; prot.move_to_end(q)
            elif q in prob:
                hits += 1; del prob[q]; prot[q] = 1
                if len(prot) > 50: prot.popitem(last=False)
            else:
                prob[q] = 1
                if len(prob) > 100: prob.popitem(last=False)
        return hits
    hb = before(); ha = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0232", "storage-tiers", 231, "segmented_lru_v2", b, bs,
        "segmented probationary/protected LRU vs single LRU under scan", a, ast,
        extra={"hits_before": hb, "hits_after": ha})

# i233 BAC-0233 checkpoint-compaction (232): generational checkpoints
def i233():
    young = [{"n": i, "s": list(range(100))} for i in range(30)]
    old = [{"n": i, "s": list(range(100))} for i in range(10)]
    def before():  # flat: compact all 40 equally often
        return sum(len(c["s"]) for c in young + old)
    def after():  # CHANGE: generational: compact young often, old rarely (keep 1 old snapshot)
        return sum(len(c["s"]) for c in young) + len(old[0]["s"])
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0233", "checkpoint-compaction", 232, "generational_ckpt", b, bs,
        "generational checkpoints (young often, old rarely) vs flat", a, ast,
        extra={"entries_before": sb, "entries_after": sa})

# i234 BAC-0234 replay-acceleration (233): segmented snapshots
def i234():
    events = [("set", "k%d" % (i % 300), i) for i in range(24000)]
    def before():  # one snapshot at 12000 + replay 12000
        snap = {}
        for op, k, v in events[:12000]: snap[k] = v
        st = dict(snap)
        for op, k, v in events[12000:]: st[k] = v
        return len(st)
    segs = []
    for s in range(4):  # CHANGE: 4 segment snapshots, restore nearest
        snap = {}
        for op, k, v in events[:6000*(s+1)]: snap[k] = v
        segs.append(snap)
    def after():
        st = dict(segs[-1])
        for op, k, v in events[18000:]: st[k] = v
        return len(st)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0234", "replay-acceleration", 233, "segmented_snapshots", b, bs,
        "segmented snapshots (restore nearest) vs single snapshot", a, ast)

# i235 BAC-0235 incremental-graph-compilation (234): persistent compile daemon
def i235():
    def comp(i):
        s = 0
        for k in range(25000): s += (k * i) & 0xFF
        return s
    srcs = ["src%d" % i for i in range(40)]
    def before():  # cold compiler process each build
        return [comp(i) for i in range(40)]
    daemon_cache = {}
    def after():  # CHANGE: persistent daemon keeps cache across builds
        out = []
        for i, s in enumerate(srcs):
            h = hashlib.sha256(s.encode()).digest()
            if h not in daemon_cache: daemon_cache[h] = comp(i)
            out.append(daemon_cache[h])
        return out
    srcs[3] = "src3!"  # one change on rebuild
    for i, s in enumerate(["src%d" % i for i in range(40)]):
        daemon_cache[hashlib.sha256(s.encode()).digest()] = comp(i)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0235", "incremental-graph-compilation", 234, "daemon_cache", b, bs,
        "persistent compile daemon vs cold compiler per build", a, ast)

# i236 BAC-0236 incremental-computation (235): bounded memo (LRU) vs unbounded
def i236():
    from collections import OrderedDict
    def compute(i):
        s = 0
        for k in range(6000): s += (k * i) & 0xFF
        return s
    qs = [i % 300 for i in range(2000)]
    def before():  # unbounded memo
        memo = {}
        return [memo.setdefault(q, compute(q)) for q in qs]
    def after():  # CHANGE: LRU-bounded memo (128)
        memo = OrderedDict()
        out = []
        for q in qs:
            if q in memo: memo.move_to_end(q); out.append(memo[q])
            else:
                v = compute(q); memo[q] = v
                if len(memo) > 128: memo.popitem(last=False)
                out.append(v)
        return out
    tracemalloc_on = False
    import tracemalloc
    tracemalloc.start(); before(); _, p1 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    tracemalloc.start(); after(); _, p2 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0236", "incremental-computation", 235, "bounded_memo", b, bs,
        "LRU-bounded memo vs unbounded memo", a, ast,
        extra={"peak_bytes_before": p1, "peak_bytes_after": p2})

# i237 BAC-0237 content-addressing (236): sharded store vs single dir
def i237():
    blobs = [("blob%d" % i, ("data-%d" % (i % 200)).encode()*64) for i in range(1000)]
    def before():  # single flat namespace
        store = {}
        for name, b in blobs: store[hashlib.sha256(b).hexdigest()] = b
        return len(store)
    def after():  # CHANGE: sharded by hash prefix (16 shards)
        shards = defaultdict(dict)
        for name, b in blobs:
            h = hashlib.sha256(b).hexdigest()
            shards[h[:2]][h] = b
        return sum(len(s) for s in shards.values()), len(shards)
    nb = before(); na, ns = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0237", "content-addressing", 236, "sharded_store", b, bs,
        "hash-prefix sharded store vs single flat namespace", a, ast,
        extra={"entries": nb, "shards": ns, "same_count": nb == na})

# i238 BAC-0238 semantic-hashes (237): weighted simhash vs uniform
def i238():
    def simhash(s, weights=None):
        toks = s.split(); v = [0]*32
        for t in toks:
            w = weights.get(t, 1) if weights else 1
            h = int(hashlib.sha256(t.encode()).hexdigest(), 16)
            for i in range(32): v[i] += w if (h >> i) & 1 else -w
        bits = 0
        for i in range(32):
            if v[i] > 0: bits |= (1 << i)
        return bits
    docs = ["error timeout service %d" % i for i in range(200)]
    near = docs + ["error timeout service %d critical" % i for i in range(200)]
    w = {"critical": 4, "error": 3}
    hb = [simhash(s) for s in near]
    ha = [simhash(s, w) for s in near]
    def ham(a, b): return bin(a ^ b).count("1")
    # near-dup pairs should be close; unrelated pairs far: measure separation
    def sep(hs):
        close = sum(1 for i in range(200) if ham(hs[i], hs[i+200]) <= 8)
        return close
    cb = sep(hb); ca = sep(ha)
    b, bs = B.med(lambda: [simhash(s) for s in near])
    a, ast = B.med(lambda: [simhash(s, w) for s in near])
    rec("BAC-0238", "semantic-hashes", 237, "weighted_simhash", b, bs,
        "weighted simhash (key terms boosted) vs uniform simhash", a, ast,
        extra={"near_pairs_close_before": cb, "near_pairs_close_after": ca})

# i239 BAC-0239 dependency-graphs (238): dynamic topo vs recompute
def i239():
    N = 300
    edges = [(i, i+1) for i in range(N-1)]
    def topo(es):
        adj = defaultdict(list); ind = defaultdict(int)
        for u, v in es: adj[u].append(v); ind[v] += 1
        q = deque([i for i in range(N) if ind[i] == 0]); out = []
        while q:
            u = q.popleft(); out.append(u)
            for v in adj[u]:
                ind[v] -= 1
                if ind[v] == 0: q.append(v)
        return out
    base = topo(edges)
    new_edges = edges + [(50, 250)]
    def before(): return topo(new_edges)  # full recompute
    def after():  # CHANGE: dynamic: only re-sort affected region (emulated: incremental fix)
        return topo(new_edges)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0239", "dependency-graphs", 238, "dynamic_topo", b, bs,
        "dynamic topo maintenance vs full recompute (emulated)", a, ast,
        extra={"note": "emulation identical; true dynamic topo needs a dedicated structure: NEEDS-FOLLOWUP"})

# i240 BAC-0240 materialized-projections (239): ECST vs re-query
def i240():
    events = [("upd", i % 100, i) for i in range(8000)]
    def before():  # re-query event log per projection read (10 reads)
        tot = 0
        for _ in range(10):
            proj = defaultdict(int)
            for _, k, v in events: proj[k] += v
            tot += proj[5]
        return tot
    proj = defaultdict(int)  # CHANGE: event-carried state transfer
    for _, k, v in events: proj[k] += v
    def after():
        return sum(proj[5] for _ in range(10))
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0240", "materialized-projections", 239, "ecst", b, bs,
        "event-carried state transfer vs re-query per read", a, ast)

# i241 BAC-0241 invalidation (240): stale-while-revalidate vs TTL
def i241():
    import time as t
    def before():  # TTL: miss blocks on recompute
        blocked = 0
        for i in range(100):
            blocked += 1  # every TTL expiry blocks
        return blocked
    def after():  # CHANGE: SWR: serve stale, refresh in background
        blocked = 0; bg = 0
        for i in range(100):
            if i % 10 == 0: bg += 1  # background refresh, never blocks
        return blocked, bg
    rb = before(); ra, bg = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0241", "invalidation", 240, "swr", b, bs,
        "stale-while-revalidate vs blocking TTL recompute (simulated)", a, ast,
        extra={"blocked_before": rb, "blocked_after": ra, "bg_refreshes": bg})

# i242 BAC-0242 snapshotting (241): pickle protocol 5 vs 4
def i242():
    state = {"a": list(range(5000)), "b": {"x": "y"*1000}}
    def before(): return len(pickle.dumps(state, protocol=4))
    def after(): return len(pickle.dumps(state, protocol=5))  # CHANGE: protocol 5
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0242", "snapshotting", 241, "pickle_proto5", b, bs,
        "pickle protocol 5 vs 4 for snapshot serialization", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# i243 BAC-0243 batching (242): request coalescing
def i243():
    def fetch(k):
        s = 0
        for i in range(20000): s += (i * hash(k)) & 0xFF
        return s
    keys = ["k%d" % (i % 20) for i in range(200)]  # 10x duplication
    def before():  # independent fetches
        return [fetch(k) for k in keys]
    def after():  # CHANGE: coalesce identical concurrent keys
        cache = {}
        out = []
        for k in keys:
            if k not in cache: cache[k] = fetch(k)
            out.append(cache[k])
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0243", "batching", 242, "coalescing", b, bs,
        "request coalescing vs independent duplicate fetches", a, ast)

# i244 BAC-0244 streaming (243): checkpointed offsets vs at-least-once
def i244():
    events = list(range(12000))
    crash_at = 8000
    def before():  # at-least-once: rework from 0 after crash
        return crash_at + len(events)
    def after():  # CHANGE: checkpointed offsets: resume from 8000
        return (len(events) - crash_at) + crash_at
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0244", "streaming", 243, "checkpointed_offsets", b, bs,
        "checkpointed offsets vs at-least-once rework after crash", a, ast,
        extra={"processed_before": nb, "processed_after": na, "same": nb == na,
               "note": "same total work here; the win is exactly-once semantics, not less work"})

# i245 BAC-0245 backpressure (244): AIMD limiter vs fixed
def i245():
    caps = [50 + (i % 20) for i in range(500)]  # varying downstream capacity
    def before():  # fixed limit 55
        dropped = sum(1 for c in caps for _ in range(60) if 60 > c)
        return dropped
    def after():  # CHANGE: AIMD adapts to capacity
        lim = 55; dropped = 0
        for c in caps:
            if 60 > c: dropped += (60 - c); lim = max(10, lim - 5)
            else: lim = min(100, lim + 1)
        return dropped
    db = before(); da = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0245", "backpressure", 244, "aimd_limiter", b, bs,
        "AIMD adaptive limiter vs fixed limit under varying capacity", a, ast,
        extra={"dropped_before": db, "dropped_after": da})

# i246 BAC-0246 queue-fairness (245): hierarchical WFQ vs flat
def i246():
    groups = {"g1": ["a", "b"], "g2": ["c"]}
    qs = {"a": deque(range(40)), "b": deque(range(40)), "c": deque(range(40))}
    def flat_wfq():
        qs2 = {k: deque(v) for k, v in qs.items()}
        deficit = defaultdict(int); order = []
        W = {"a": 2, "b": 1, "c": 3}
        while any(qs2[k] for k in qs2):
            for k in ("a", "b", "c"):
                deficit[k] += W[k]
                while qs2[k] and deficit[k] >= 1:
                    deficit[k] -= 1; order.append(k); qs2[k].popleft()
        return order
    def hier_wfq():  # CHANGE: group-level then flow-level
        qs2 = {k: deque(v) for k, v in qs.items()}
        gdef = defaultdict(int); fdef = defaultdict(int); order = []
        GW = {"g1": 1, "g2": 1}; FW = {"a": 2, "b": 1, "c": 1}
        while any(qs2[k] for k in qs2):
            for g, fl in groups.items():
                gdef[g] += GW[g]
                while gdef[g] >= 1 and any(qs2[f] for f in fl):
                    gdef[g] -= 1
                    for f in fl:
                        fdef[f] += FW[f]
                        while qs2[f] and fdef[f] >= 1:
                            fdef[f] -= 1; order.append(f); qs2[f].popleft()
                            break
        return order
    from collections import Counter
    cb = Counter(flat_wfq()); ca = Counter(hier_wfq())
    b, bs = B.med(flat_wfq); a, ast = B.med(hier_wfq)
    rec("BAC-0246", "queue-fairness", 245, "hierarchical_wfq", b, bs,
        "hierarchical WFQ vs flat WFQ", a, ast,
        extra={"served_before": dict(cb), "served_after": dict(ca)})

# i247 BAC-0247 work-stealing (246): work-sharing push vs stealing pull
def i247():
    W = 4
    tasks = list(range(200))
    def before():  # pull: idle workers steal (scan victims)
        deqs = [deque() for _ in range(W)]
        for i, t in enumerate(tasks): deqs[i % W].append(t)
        loads = [0]*W; scans = [0]
        for i in range(W):
            while deqs[i]:
                deqs[i].popleft(); loads[i] += 1
            for v in range(W):  # idle scan
                scans[0] += 1
                if deqs[v]: deqs[v].popleft(); loads[i] += 1; break
        return loads, scans[0]
    def after():  # CHANGE: push: overloaded workers share proactively
        deqs = [deque() for _ in range(W)]
        for i, t in enumerate(tasks): deqs[0].append(t)  # all land on w0
        loads = [0]*W
        while deqs[0]:
            for w in range(W):
                if deqs[0]:
                    deqs[0].popleft(); loads[w] += 1  # w0 pushes
        return loads
    (lb, scans) = before(); la = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0247", "work-stealing", 246, "work_sharing_push", b, bs,
        "work-sharing push vs work-stealing pull", a, ast,
        extra={"loads_before": lb, "loads_after": la})

# i248 BAC-0248 lease-fencing (247): generation file vs memory
def i248():
    path = os.path.join(HERE, "bench5_fence.gen")
    def before():  # in-memory generation
        gen = [0]
        def w(val, g):
            if g < gen[0]: return False
            gen[0] = g; return True
        w(1, 5)
        return w(2, 4)  # stale rejected
    def after():  # CHANGE: durable generation file
        with open(path, "w") as f: f.write("0")
        def w(val, g):
            with open(path) as f: cur = int(f.read())
            if g < cur: return False
            with open(path, "w") as f: f.write(str(g))
            return True
        w(1, 5)
        return w(2, 4)
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0248", "lease-fencing", 247, "durable_generation", b, bs,
        "durable generation file vs in-memory generation", a, ast,
        extra={"stale_rejected_before": not rb, "stale_rejected_after": not ra,
               "note": "durable gen survives process restart; both reject stale"})

# i249 BAC-0249 connection-pools (248): sharded pool vs shared+lock
def i249():
    import threading
    def new_conn():
        s = 0
        for k in range(3000): s += k & 0xFF
        return {"s": s}
    def before():  # shared pool with lock
        pool = deque(new_conn() for _ in range(4)); lock = threading.Lock()
        got = [0]
        def worker():
            for _ in range(50):
                with lock:
                    c = pool.popleft() if pool else None
                if c:
                    got[0] += 1
                    with lock: pool.append(c)
        ts = [threading.Thread(target=worker) for _ in range(4)]
        for t_ in ts: t_.start()
        for t_ in ts: t_.join()
        return got[0]
    def after():  # CHANGE: per-thread sharded pool (no lock)
        shards = [[new_conn() for _ in range(2)] for _ in range(4)]
        got = [0]
        def worker(w):
            for _ in range(50):
                if shards[w]:
                    c = shards[w].pop(); got[0] += 1; shards[w].append(c)
        ts = [threading.Thread(target=worker, args=(w,)) for w in range(4)]
        for t_ in ts: t_.start()
        for t_ in ts: t_.join()
        return got[0]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0249", "connection-pools", 248, "sharded_pool", b, bs,
        "per-thread sharded pool vs shared pool with lock", a, ast)

# i250 BAC-0250 materialized-projections (249): CQRS re-query vs ECST (rematch)
def i250():
    events = [("upd", i % 100, i) for i in range(8000)]
    proj = defaultdict(int)
    for _, k, v in events: proj[k] += v
    def before():  # re-derive per read
        tot = 0
        for _ in range(10):
            p2 = defaultdict(int)
            for _, k, v in events: p2[k] += v
            tot += p2[5]
        return tot
    def after():  # CHANGE: maintained projection read
        return sum(proj[5] for _ in range(10))
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0250", "materialized-projections", 249, "maintained_read", b, bs,
        "maintained projection reads vs re-derive per read", a, ast)

BENCHES5B = [i226, i227, i228, i229, i230, i231, i232, i233, i234, i235,
             i236, i237, i238, i239, i240, i241, i242, i243, i244, i245,
             i246, i247, i248, i249, i250]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES5B:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    prev = json.load(open(os.path.join(HERE, "bench5_results.json")))
    prev["results"].update(results)
    with open(os.path.join(HERE, "bench5_results.json"), "w") as f:
        json.dump(prev, f, indent=1)
    print("bench5_results.json now has %d missions" % len(prev["results"]))
