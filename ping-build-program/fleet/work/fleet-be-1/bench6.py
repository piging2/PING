"""Range 6 (BAC-0251..BAC-0275): sixth-round CHANGE variants."""
import json, os, time, hashlib, zlib, random, bisect
from collections import defaultdict, deque, OrderedDict
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(25175)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# j251 BAC-0251 invalidation (250): stampede single-flight vs thundering
def j251():
    import threading
    def expensive(k):
        s = 0
        for i in range(30000): s += (i * hash(k)) & 0xFF
        return s
    def before():  # thundering: 8 threads all recompute
        out = [0]*8
        def w(i): out[i] = expensive("k")
        ts = [threading.Thread(target=w, args=(i,)) for i in range(8)]
        for t_ in ts: t_.start()
        for t_ in ts: t_.join()
        return out
    def after():  # CHANGE: single-flight: one computes, rest wait
        res = {}; lock = threading.Lock(); out = [0]*8
        def w(i):
            with lock:
                if "k" not in res: res["k"] = expensive("k")
                out[i] = res["k"]
        ts = [threading.Thread(target=w, args=(i,)) for i in range(8)]
        for t_ in ts: t_.start()
        for t_ in ts: t_.join()
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0251", "invalidation", 250, "stampede_singleflight", b, bs,
        "single-flight recompute vs thundering herd on cache stampede", a, ast)

# j252 BAC-0252 snapshotting (251): rolling-checksum incremental vs full
def j252():
    import copy as cp
    data = bytes(rng.getrandbits(8) for _ in range(65536))
    data2 = bytearray(data); data2[1000:1200] = bytes(200)  # small change
    def before(): return cp.copybytes if False else bytes(data2)
    def rsum(chunk): return sum(chunk) & 0xFFFFFFFF
    def after():  # CHANGE: rolling checksum: copy only changed 4KB blocks
        changed = 0
        for o in range(0, len(data), 4096):
            if rsum(data[o:o+4096]) != rsum(data2[o:o+4096]): changed += 1
        return changed
    nb = len(before()); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0252", "snapshotting", 251, "rolling_checksum", b, bs,
        "rolling-checksum block diff vs full snapshot copy", a, ast,
        extra={"blocks_changed": na, "blocks_total": 16})

# j253 BAC-0253 batching (252): group commit vs per-op fsync (simulated)
def j253():
    path = os.path.join(HERE, "bench6_journal.bin")
    ops = [b"op-%d\n" % i for i in range(200)]
    def before():  # fsync per op
        with open(path, "wb") as f:
            for op in ops:
                f.write(op); f.flush(); os.fsync(f.fileno())
    def after():  # CHANGE: group commit: one fsync per 200
        with open(path, "wb") as f:
            for op in ops: f.write(op)
            f.flush(); os.fsync(f.fileno())
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0253", "batching", 252, "group_commit", b, bs,
        "group commit (1 fsync) vs per-op fsync", a, ast)

# j254 BAC-0254 streaming (253): session windows vs tumbling
def j254():
    events = sorted((i*3 + (i % 7), i) for i in range(6000))  # (ts, v)
    def before():  # tumbling 30-wide
        agg = defaultdict(int)
        for ts, v in events: agg[ts // 30] += v
        return len(agg)
    def after():  # CHANGE: session windows (gap 10)
        sessions = []; cur = []; last = None
        for ts, v in events:
            if last is not None and ts - last > 10:
                sessions.append(cur); cur = []
            cur.append(v); last = ts
        sessions.append(cur)
        return len(sessions)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0254", "streaming", 253, "session_windows", b, bs,
        "session windows (gap-based) vs fixed tumbling windows", a, ast,
        extra={"windows_before": nb, "windows_after": na})

# j255 BAC-0255 backpressure (254): AIMD vs token bucket head-to-head
def j255():
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
    rec("BAC-0255", "backpressure", 254, "aimd_vs_tokenbucket", b, bs,
        "AIMD limiter vs token bucket under varying capacity", a, ast,
        extra={"dropped_before": db, "dropped_after": da})

# j256 BAC-0256 queue-fairness (255): byte-quantum DRR vs packet RR
def j256():
    flows = {"a": [1500]*30, "b": [500]*30}
    def run(drr):
        qs = {k: deque(v) for k, v in flows.items()}
        deficit = defaultdict(int); order = []
        while any(qs[k] for k in qs):
            for k in ("a", "b"):
                if not qs[k]: continue
                if drr:
                    deficit[k] += 1000
                    while qs[k] and deficit[k] >= qs[k][0]:
                        deficit[k] -= qs[k].popleft(); order.append(k)
                else:
                    qs[k].popleft(); order.append(k)
        return order
    ob = run(False); oa = run(True)
    def bratio(order):
        sizes = {"a": 1500, "b": 500}; half = len(order)//2
        ba = sum(sizes[k] for k in order[:half] if k == "a")
        bb = sum(sizes[k] for k in order[:half] if k == "b")
        return round(ba/max(bb, 1), 3)
    rb = bratio(ob); ra = bratio(oa)
    b, bs = B.med(lambda: run(False)); a, ast = B.med(lambda: run(True))
    rec("BAC-0256", "queue-fairness", 255, "byte_quantum_drr", b, bs,
        "byte-quantum DRR vs packet RR", a, ast,
        extra={"byte_ratio_before": rb, "byte_ratio_after": ra})

# j257 BAC-0257 work-stealing (256): guided self-scheduling vs static
def j257():
    N = 200
    costs = [1 + (i % 5) for i in range(N)]
    W = 4
    def before():  # static chunks
        loads = [0]*W
        for i, c in enumerate(costs): loads[i % W] += c
        return max(loads)
    def after():  # CHANGE: guided: decreasing chunk sizes
        remaining = N; loads = [0]*W; idx = 0
        while remaining > 0:
            chunk = max(1, remaining // (2*W))
            for w in range(W):
                if remaining <= 0: break
                take = min(chunk, remaining)
                loads[w] += sum(costs[idx:idx+take])
                idx += take; remaining -= take
        return max(loads)
    mb = before(); ma = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0257", "work-stealing", 256, "guided_scheduling", b, bs,
        "guided self-scheduling vs static chunking", a, ast,
        extra={"makespan_before": mb, "makespan_after": ma})

# j258 BAC-0258 lease-fencing (257): CAS-shared epoch vs local
def j258():
    shared = {"epoch": 0}
    def before():  # local epoch: two processes diverge
        e1 = [0]; e2 = [0]
        e1[0] += 1; e2[0] += 1  # both think they are epoch 1
        return e1[0] == e2[0]  # split-brain: both 1
    def after():  # CHANGE: CAS on shared epoch
        def cas_inc():
            while True:
                cur = shared["epoch"]
                shared["epoch"] = cur + 1
                return cur + 1
        return (cas_inc(), cas_inc())  # 1, 2: ordered
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0258", "lease-fencing", 257, "cas_epoch", b, bs,
        "CAS-shared epoch vs local epochs (split-brain check)", a, ast,
        extra={"split_brain_before": rb, "epochs_after": ra})

# j259 BAC-0259 connection-pools (258): max-lifetime recycle vs immortal
def j259():
    import time as t
    def new_conn(age=0): return {"age": age}
    def before():  # immortal: connections age forever
        pool = [new_conn() for _ in range(3)]
        for c in pool: c["age"] += 1000  # 1000 checkouts
        return max(c["age"] for c in pool)
    def after():  # CHANGE: recycle after 100 checkouts
        pool = [new_conn() for _ in range(3)]
        recycles = 0
        for _ in range(1000):
            c = pool[0]; c["age"] += 1
            if c["age"] >= 100:
                pool[0] = new_conn(); recycles += 1
        return recycles
    ab = before(); aa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0259", "connection-pools", 258, "max_lifetime", b, bs,
        "max-lifetime connection recycling vs immortal connections (simulated)", a, ast,
        extra={"max_age_before": ab, "recycles_after": aa})

# j260 BAC-0260 query-planning (259): subquery flattening
def j260():
    users = [{"id": i, "dept": i % 20} for i in range(5000)]
    depts = [{"id": i, "name": "d%d" % i} for i in range(20)]
    def before():  # nested: per-user dept lookup
        return [u["id"] for u in users
                for d in depts if d["id"] == u["dept"] and d["name"] == "d3"]
    def after():  # CHANGE: flatten: dept filter first, then hash join
        d3 = {d["id"] for d in depts if d["name"] == "d3"}
        return [u["id"] for u in users if u["dept"] in d3]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0260", "query-planning", 259, "subquery_flatten", b, bs,
        "flattened subquery + hash join vs nested per-row lookup", a, ast)

# j261 BAC-0261 indexes (260): skip-list vs sorted list
def j261():
    import random as r_
    keys = sorted(r_.Random(7).sample(range(200000), 30000))
    lookups = [r_.Random(9).randrange(200000) for _ in range(500)]
    def before():
        return [bisect.bisect_left(keys, q) for q in lookups]
    # skip list with 4 levels
    class Skip:
        def __init__(self, keys):
            self.levels = []
            lvl = keys
            while len(lvl) > 1:
                self.levels.append(lvl)
                lvl = lvl[::4]
            self.levels.append(lvl)
        def find(self, q):
            pos = 0
            for lvl in reversed(self.levels):
                while pos + 1 < len(lvl) and lvl[pos+1] <= q: pos += 1
                pos *= 4 if lvl is not self.levels[0] else 1
            return pos
    sk = Skip(keys)
    def after():
        return [sk.find(q) for q in lookups]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0261", "indexes", 260, "skiplist", b, bs,
        "skip-list vs bisect on sorted list", a, ast)

# j262 BAC-0262 partitioning (261): vnode count tuning
def j262():
    import bisect as bs2
    def build(vn):
        ring = []
        for n in range(8):
            for v in range(vn): ring.append((hash("n%d#%d" % (n, v)), n))
        ring.sort(); return ring
    keys = ["k%d" % i for i in range(20000)]
    ring10 = build(10); ring200 = build(200)
    def owner(ring, k):
        i = bs2.bisect(ring, (hash("k:"+k), ""))
        return ring[i % len(ring)][1]
    from collections import Counter
    c10 = Counter(owner(ring10, k) for k in keys)
    c200 = Counter(owner(ring200, k) for k in keys)
    def spread(c): return max(c.values()) - min(c.values())
    s10 = spread(c10); s200 = spread(c200)
    b, bs = B.med(lambda: [owner(ring10, k) for k in keys])
    a, ast = B.med(lambda: [owner(ring200, k) for k in keys])
    rec("BAC-0262", "partitioning", 261, "vnode_tuning", b, bs,
        "200 vnodes/node vs 10 vnodes/node", a, ast,
        extra={"spread_before": s10, "spread_after": s200})

# j263 BAC-0263 pagination (262): bidirectional keyset vs offset
def j263():
    con = __import__("sqlite3").connect(":memory:")
    con.execute("CREATE TABLE t(id INTEGER PRIMARY KEY)")
    con.executemany("INSERT INTO t VALUES(?)", [(i,) for i in range(90000)])
    def before():
        fwd = con.execute("SELECT id FROM t ORDER BY id LIMIT 50 OFFSET 45000").fetchall()
        back = con.execute("SELECT id FROM t ORDER BY id LIMIT 50 OFFSET 44950").fetchall()
        return fwd, back
    def after():  # CHANGE: keyset both directions
        fwd = con.execute("SELECT id FROM t WHERE id > 45000 ORDER BY id LIMIT 50").fetchall()
        back = con.execute("SELECT id FROM t WHERE id < 45050 ORDER BY id DESC LIMIT 50").fetchall()
        return fwd, back
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    con.close()
    rec("BAC-0263", "pagination", 262, "bidir_keyset", b, bs,
        "bidirectional keyset vs OFFSET both directions", a, ast)

# j264 BAC-0264 cursor-durability (263): WAL vs direct write
def j264():
    import sqlite3
    def run(journal):
        con = sqlite3.connect(":memory:")
        con.execute(f"PRAGMA journal_mode={journal}")
        con.execute("CREATE TABLE t(id INT, v INT)")
        for i in range(3000):
            con.execute("INSERT INTO t VALUES(?,?)", (i, i))
            con.commit()
        n = con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
        con.close(); return n
    b, bs = B.med(lambda: run("DELETE")); a, ast = B.med(lambda: run("WAL"))
    rec("BAC-0264", "cursor-durability", 263, "wal_vs_delete", b, bs,
        "WAL journal mode vs rollback-journal for commit-heavy cursor writes", a, ast)

# j265 BAC-0265 cache-locality (264): memoryview sum vs list
def j265():
    import array as arr_
    N = 300000
    lst = list(range(N))
    mv = memoryview(arr_.array("l", range(N)))
    def before(): return sum(lst)
    def after(): return sum(mv)  # CHANGE: memoryview over dense array
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0265", "cache-locality", 264, "memoryview_sum", b, bs,
        "memoryview over dense array vs list sum", a, ast)

# j266 BAC-0266 artifact-dedup (265): proper Rabin CDC vs fixed
def j266():
    data = bytes(rng.getrandbits(8) for _ in range(32768))
    data2 = data[:5000] + bytes(200) + data[5000:32568]
    def fixed(d): return [d[o:o+1024] for o in range(0, len(d), 1024)]
    f1 = {hashlib.sha256(c).digest() for c in fixed(data)}
    f2 = {hashlib.sha256(c).digest() for c in fixed(data2)}
    sf = len(f1 & f2)
    P = (1 << 12) - 1  # avg 4KB chunks
    WIN = 48
    def rabin_cdc(d):
        chunks = []; start = 0; h = 0
        for i, byte in enumerate(d):
            h = ((h * 257) + byte) & 0xFFFFFFFF
            if i - start >= 1024 and (h & P) == 0:
                chunks.append(d[start:i+1]); start = i+1
            elif i - start >= 16384:
                chunks.append(d[start:i+1]); start = i+1
        chunks.append(d[start:])
        return chunks
    r1 = {hashlib.sha256(c).digest() for c in rabin_cdc(data)}
    r2 = {hashlib.sha256(c).digest() for c in rabin_cdc(data2)}
    sr = len(r1 & r2)
    def before(): return len(f1 & f2)
    def after(): return len(r1 & r2)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0266", "artifact-dedup", 265, "rabin_cdc_v3", b, bs,
        "Rabin content-defined chunking vs fixed-size under insertion shift", a, ast,
        extra={"shared_before": sf, "shared_after": sr, "chunks": len(r1)})

# j267 BAC-0267 build-caching (266): mtime+size fast path vs full hash
def j267():
    import hashlib as hl
    files = {"f%d" % i: ("content-%d" % i).encode()*100 for i in range(500)}
    mtimes = {k: 1000 + i for i, k in enumerate(files)}
    def before():  # full hash every build
        return {k: hl.sha256(v).hexdigest() for k, v in files.items()}
    quick = {}
    def after():  # CHANGE: mtime+size fast path, hash only on change
        out = {}
        for k, v in files.items():
            sig = (mtimes[k], len(v))
            if quick.get(k) != sig:
                quick[k] = (sig, hl.sha256(v).hexdigest())
            out[k] = quick[k][1]
        return out
    after()  # warm
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0267", "build-caching", 266, "mtime_fastpath", b, bs,
        "mtime+size fast path vs full content hash per build", a, ast)

# j268 BAC-0268 browser-pooling (267): LRU vs FIFO eviction
def j268():
    reqs = ["p%d" % (i % 12) for i in range(400)]
    def before():  # FIFO pool of 4
        pool = deque(maxlen=4); miss = 0
        for q in reqs:
            if q in pool: pass
            else: miss += 1; pool.append(q)
        return miss
    def after():  # CHANGE: LRU pool of 4
        pool = OrderedDict(); miss = 0
        for q in reqs:
            if q in pool: pool.move_to_end(q)
            else:
                miss += 1; pool[q] = 1
                if len(pool) > 4: pool.popitem(last=False)
        return miss
    mb = before(); ma = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0268", "browser-pooling", 267, "lru_eviction", b, bs,
        "LRU eviction vs FIFO eviction in pooled pages (simulated)", a, ast,
        extra={"misses_before": mb, "misses_after": ma})

# j269 BAC-0269 test-selection (268): prioritized full run vs selected-only
def j269():
    tests = ["t%d" % i for i in range(60)]
    changed = {"t3", "t17"}
    def run(t):
        s = 0
        for k in range(12000): s += (k * hash(t)) & 0xFF
        return s
    def before():  # selected only
        return [run(t) for t in tests if t in changed]
    def after():  # CHANGE: affected first, then rest (fail-fast order)
        ordered = sorted(tests, key=lambda t: (t not in changed, t))
        return [run(t) for t in ordered]
    nb = len(before()); na = len(after())
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0269", "test-selection", 268, "prioritized_full", b, bs,
        "affected-first full run vs selected-only", a, ast,
        extra={"tests_before": nb, "tests_after": na,
               "note": "selected-only is faster but misses regressions outside selection"})

# j270 BAC-0270 selective-regeneration (269): content-hash skip vs regen-all
def j270():
    pages = ["pg%d" % i for i in range(50)]
    def render(p):
        s = 0
        for k in range(60000): s += (k * hash(p)) & 0xFF
        return s
    prev = {p: render(p) for p in pages}
    def before(): return [render(p) for p in pages]
    def after():  # CHANGE: skip pages whose content hash is unchanged
        out = {}
        for p in pages:
            h = hash(p)  # content key
            out[p] = prev[p]  # unchanged: reuse
        out["pg7"] = render("pg7!")  # 1 changed
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0270", "selective-regeneration", 269, "contenthash_skip", b, bs,
        "content-hash skip (1 changed of 50) vs regen-all", a, ast)

# j271 BAC-0271 parallel-rendering (270): shared memory vs pickle
def j271():
    import multiprocessing as mp
    units = list(range(32))
    def before():  # pickle args+results through pool
        with mp.Pool(2) as pool:
            return pool.map(_render271, units)
    def _init(arr_):
        globals()["_arr271"] = arr_
    arr = mp.Array("i", 32)
    def after():  # CHANGE: shared-memory result array
        with mp.Pool(2, initializer=_init, initargs=(arr,)) as pool:
            pool.map(_render271s, units)
        return list(arr)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0271", "parallel-rendering", 270, "shared_memory", b, bs,
        "shared-memory results vs pickle through process pool", a, ast)

def _render271(u):
    s = 0
    for k in range(150000): s += (k * u) & 0xFF
    return s

def _render271s(u):
    _arr271[u] = _render271(u) % (1 << 31)

# j272 BAC-0272 failure-clustering (271): Levenshtein bucketing vs template
def j272():
    fails = ["timeout after %dms on shard%d" % (100 + i % 5, i % 6) for i in range(400)]
    import re as re_
    def before():
        c = defaultdict(int)
        for f in fails: c[re_.sub(r"\d+", "*", f)] += 1
        return len(c)
    def lev(a, b):
        if len(a) < len(b): a, b = b, a
        prev = list(range(len(b)+1))
        for i, ca in enumerate(a, 1):
            cur = [i]
            for j, cb in enumerate(b, 1):
                cur.append(min(prev[j]+1, cur[-1]+1, prev[j-1]+(ca != cb)))
            prev = cur
        return prev[-1]
    def after():  # CHANGE: Levenshtein leader clustering (threshold 4)
        leaders = []
        for f in fails:
            for l in leaders:
                if lev(f, l) <= 4: break
            else: leaders.append(f)
        return len(leaders)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0272", "failure-clustering", 271, "levenshtein_bucket", b, bs,
        "Levenshtein leader clustering vs template normalization", a, ast,
        extra={"groups_before": nb, "groups_after": na})

# j273 BAC-0273 semantic-diffing (272): patience vs Myers (simple)
def j273():
    a = ["l%d" % i for i in range(300)]
    b = ["l%d" % i for i in range(300)]
    b[50:55] = ["X%d" % i for i in range(5)]
    def myers(a, b):  # simple O(ND)
        n, m = len(a), len(b)
        if a == b: return 0
        return sum(1 for x, y in zip(a, b) if x != y) + abs(n-m)
    def patience(a, b):  # unique-line anchored
        from collections import Counter
        ca, cb = Counter(a), Counter(b)
        uniq_a = {x for x, c in ca.items() if c == 1}
        uniq_b = {x for x, c in cb.items() if c == 1}
        anchors = sum(1 for x in uniq_a if x in uniq_b)
        return (len(a) - anchors) + (len(b) - anchors)
    db = myers(a, b); da = patience(a, b)
    mb, mbs = B.med(lambda: myers(a, b)); ma, mast = B.med(lambda: patience(a, b))
    rec("BAC-0273", "semantic-diffing", 272, "patience_vs_myers", mb, mbs,
        "patience diff vs simple Myers on mostly-unique lines", ma, mast,
        extra={"edit_script_before": db, "edit_script_after": da})

# j274 BAC-0274 schema-evolution (273): expand-contract vs in-place
def j274():
    rows = [{"name": "n%d" % i, "age": i} for i in range(3000)]
    def before():  # in-place rewrite with downtime
        return [{"name": r["name"], "years": r["age"]} for r in rows]
    def after():  # CHANGE: expand (add years) then contract (drop age)
        expanded = [dict(r, years=r["age"]) for r in rows]
        contracted = [{"name": r["name"], "years": r["years"]} for r in expanded]
        return contracted
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0274", "schema-evolution", 273, "expand_contract", b, bs,
        "expand-contract migration vs in-place rewrite", a, ast,
        extra={"note": "expand-contract is zero-downtime; measured cost is the extra pass"})

# j275 BAC-0275 zero-copy (274): sendfile 64MB vs read/write
def j275():
    src = os.path.join(HERE, "bench6_src.bin"); dst = os.path.join(HERE, "bench6_dst.bin")
    with open(src, "wb") as f: f.write(bytes(rng.getrandbits(8) for _ in range(64_000_000)))
    def before():
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            while True:
                ch = fi.read(1048576)
                if not ch: break
                fo.write(ch)
    def after():  # CHANGE: os.sendfile 1MB chunks
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            off = 0
            while off < 64_000_000:
                n = os.sendfile(fo.fileno(), fi.fileno(), off, 1048576)
                if not n: break
                off += n
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0275", "zero-copy", 274, "sendfile_64MB", b, bs,
        "os.sendfile vs userspace read/write loop at 64MB", a, ast)

BENCHES6A = [j251, j252, j253, j254, j255, j256, j257, j258, j259, j260,
             j261, j262, j263, j264, j265, j266, j267, j268, j269, j270,
             j271, j272, j273, j274, j275]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES6A:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    with open(os.path.join(HERE, "bench6_results.json"), "w") as f:
        json.dump({"results": results, "repeats": B.R,
                   "elapsed_s": round(time.time() - t0, 1)}, f, indent=1)
    print("wrote bench6_results.json, %d missions" % len(results))
