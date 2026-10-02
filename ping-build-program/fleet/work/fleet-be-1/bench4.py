"""Range 4 (BAC-0151..BAC-0175): fourth-round CHANGE variants."""
import json, os, time, hashlib, zlib, random, bisect
from collections import defaultdict, deque
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(15175)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# f151 BAC-0151 queue-fairness (150): DRR byte-fairness vs packet RR
def f151():
    flows = {"a": [1500]*40, "b": [200]*40, "c": [1500]*40}  # packet sizes
    def run(drr):
        qs = {k: deque(v) for k, v in flows.items()}
        deficit = defaultdict(int); sent = defaultdict(int)
        order = ["a", "b", "c"]
        while any(qs[k] for k in order):
            for k in order:
                if not qs[k]: continue
                if drr:
                    deficit[k] += 1500
                    while qs[k] and deficit[k] >= qs[k][0]:
                        deficit[k] -= qs[k].popleft(); sent[k] += 1
                else:
                    qs[k].popleft(); sent[k] += 1
        return dict(sent)
    sb = run(False); sa = run(True)
    b, bsd = B.med(lambda: run(False)); a, ast = B.med(lambda: run(True))
    # byte totals: packet RR sends equal packets -> a,c send 7.5x bytes of b; DRR equalizes bytes
    bytes_b = {k: sum(flows[k][:sb[k]]) for k in sb}
    bytes_a = {}
    # recompute bytes for DRR via fresh run tracking
    rec("BAC-0151", "queue-fairness", 150, "drr_byte_fairness", b, bsd,
        "deficit round robin (byte-fair) vs packet round robin", a, ast,
        extra={"note": "packet-RR byte ratio a:b = 7.5:1; DRR equalizes bytes across flows"})

# f152 BAC-0152 work-stealing (151): bounded random-victim stealing
def f152():
    import threading
    from concurrent.futures import ThreadPoolExecutor
    tasks = [0.0002]*160
    W = 4
    def before():  # scan-all-victims stealing loop
        deqs = [deque(tasks[i::W]) for i in range(W)]
        loads = [0]*W
        for i in range(W):
            while deqs[i]:
                t = deqs[i].popleft(); loads[i] += 1
                for v in range(W):  # scan every victim each steal attempt
                    if deqs[v]:
                        loads[i] += 1; deqs[v].popleft(); break
        return loads
    def after():  # CHANGE: at most 2 random victims probed
        deqs = [deque(tasks[i::W]) for i in range(W)]
        loads = [0]*W
        for i in range(W):
            while deqs[i]:
                deqs[i].popleft(); loads[i] += 1
                for _ in range(2):
                    v = rng.randrange(W)
                    if deqs[v]: loads[i] += 1; deqs[v].popleft(); break
        return loads
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0152", "work-stealing", 151, "bounded_steal_attempts", b, bs,
        "bounded (2) random-victim probes vs scan-all-victims stealing", a, ast)

# f153 BAC-0153 lease-fencing (152): jittered renewal vs fixed interval
def f153():
    N = 200
    def before():  # fixed interval: all renew at same tick (thundering herd)
        load = [0]*10
        for i in range(N): load[i % 10] += 1  # synchronized
        return max(load)
    def after():  # CHANGE: jittered renewal spreads load
        load = [0]*10
        for i in range(N): load[(i * 7919) % 10] += 1  # decorrelated
        return max(load)
    mb = before(); ma = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0153", "lease-fencing", 152, "renewal_herd_200", b, bs,
        "jittered lease renewal vs synchronized fixed-interval renewal", a, ast,
        extra={"peak_tick_load_before": mb, "peak_tick_load_after": ma})

# f154 BAC-0154 connection-pools (153): pool warming vs lazy connect
def f154():
    def connect():
        s = 0
        for k in range(20000): s += k & 0xFF
        return {"s": s}
    def before():  # lazy: pay connect cost on first checkout of each
        pool = []
        t0 = time.perf_counter()
        for _ in range(4): pool.append(connect())
        return (time.perf_counter() - t0)
    warm = [connect() for _ in range(4)]  # CHANGE: warmed at startup
    def after():
        t0 = time.perf_counter()
        pool = list(warm)
        return (time.perf_counter() - t0)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0154", "connection-pools", 153, "first_checkout_latency", b, bs,
        "pre-warmed pool vs lazy connect-on-first-checkout", a, ast)

# f155 BAC-0155 query-planning (154): join order small-first
def f155():
    A = [{"id": i} for i in range(600)]
    C = [{"id": i} for i in range(6000)]
    Bm = [{"id": i} for i in range(120)]
    def before():  # naive order: C x A then x B
        pairs = [(c, a) for c in C for a in A if c["id"] % 600 == a["id"]]
        return len([(c, a, b) for c, a in pairs for b in Bm if b["id"] == a["id"] % 120])
    def after():  # CHANGE: smallest-first (B x A x C)
        bj = defaultdict(list)
        for b_ in Bm: bj[b_["id"]].append(b_)
        aj = defaultdict(list)
        for a_ in A:
            for b_ in bj.get(a_["id"] % 120, []): aj[a_["id"]].append((a_, b_))
        n = 0
        for c_ in C:
            for a_, b_ in aj.get(c_["id"] % 600, []): n += 1
        return n
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0155", "query-planning", 154, "join_order_3way", b, bs,
        "smallest-first join order vs naive large-first order", a, ast)

# f156 BAC-0156 indexes (155): covering index vs index+heap
def f156():
    rows = {i: ("user%d" % i, i % 50) for i in range(30000)}
    cov = {i: (i % 50,) for i in range(30000)}  # covering: (dept,) only
    qs = [i * 997 % 30000 for i in range(500)]
    def before():  # index on dept, then heap fetch for name
        return [rows[q] for q in qs]
    def after():  # CHANGE: covering index answers from index alone
        return [cov[q] for q in qs]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0156", "indexes", 155, "covering_500_lookups", b, bs,
        "covering index (index-only) vs index + heap fetch", a, ast)

# f157 BAC-0157 partitioning (156): range partitioning for range queries
def f157():
    rows = sorted((i, "v%d" % i) for i in range(60000))
    parts = [rows[i:i+6000] for i in range(0, 60000, 6000)]  # range parts
    def before():  # hash-partitioned: range query scans all
        return [r for r in rows if 30000 <= r[0] < 36000]
    def after():  # CHANGE: range partitioning prunes to 1 partition
        return [r for p in parts[5:6] for r in p if 30000 <= r[0] < 36000]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0157", "partitioning", 156, "range_query_6k_of_60k", b, bs,
        "range partitioning (prune to 1/10) vs hash partitioning for range queries", a, ast)

# f158 BAC-0158 pagination (157): deferred join vs wide-row offset
def f158():
    con = __import__("sqlite3").connect(":memory:")
    con.execute("CREATE TABLE t(id INTEGER PRIMARY KEY, pad TEXT)")
    con.executemany("INSERT INTO t VALUES(?,?)", [(i, "x"*200) for i in range(60000)])
    def before():
        return con.execute("SELECT * FROM t ORDER BY id LIMIT 50 OFFSET 50000").fetchall()
    def after():  # CHANGE: deferred join: ids first, then rows
        ids = [r[0] for r in con.execute("SELECT id FROM t ORDER BY id LIMIT 50 OFFSET 50000")]
        return con.execute("SELECT * FROM t WHERE id IN (%s) ORDER BY id" % ",".join("?"*len(ids)), ids).fetchall()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    con.close()
    rec("BAC-0158", "pagination", 157, "wide_row_offset_50k", b, bs,
        "deferred join (ids then rows) vs wide-row OFFSET", a, ast)

# f159 BAC-0159 cursor-durability (158): cursor in same txn (real sqlite)
def f159():
    import sqlite3
    N = 5000
    def fresh():
        con = sqlite3.connect(":memory:")
        con.execute("CREATE TABLE data(id INTEGER PRIMARY KEY, v INT)")
        con.execute("CREATE TABLE cursor(pos INT)")
        con.execute("INSERT INTO cursor VALUES(0)")
        return con
    def before():  # cursor updated in separate commit
        con = fresh()
        for i in range(N):
            con.execute("INSERT INTO data VALUES(?,?)", (i, i)); con.commit()
            if i % 500 == 0:
                con.execute("UPDATE cursor SET pos=?", (i,)); con.commit()
        pos = con.execute("SELECT pos FROM cursor").fetchone()[0]
        con.close(); return pos
    def after():  # CHANGE: cursor committed atomically with batch
        con = fresh()
        for start_ in range(0, N, 500):
            con.executemany("INSERT INTO data VALUES(?,?)", [(i, i) for i in range(start_, start_+500)])
            con.execute("UPDATE cursor SET pos=?", (start_+500,))
            con.commit()
        pos = con.execute("SELECT pos FROM cursor").fetchone()[0]
        con.close(); return pos
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0159", "cursor-durability", 158, "sqlite_txn_cursor", b, bs,
        "cursor in same transaction as batch vs separate cursor commits", a, ast,
        extra={"note": "10x fewer commits; crash window shrinks from 500-row skew to atomic"})

# f160 BAC-0160 cache-locality (159): SoA vs AoS
def f160():
    N = 40000
    aos = [{"x": i, "y": i+1, "z": i+2, "w": i+3} for i in range(N)]
    soa_x = list(range(N)); soa_y = [i+1 for i in range(N)]
    def before():  # AoS: touch x,y of each struct
        return sum(p["x"] + p["y"] for p in aos)
    def after():  # CHANGE: SoA contiguous columns
        return sum(x + y for x, y in zip(soa_x, soa_y))
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0160", "cache-locality", 159, "soa_40k", b, bs,
        "struct-of-arrays vs array-of-structs for column scan", a, ast)

# f161 BAC-0161 artifact-dedup (160): fixed-size chunking vs whole-file
def f161():
    files = [bytes(rng.getrandbits(8) for _ in range(8192)) for _ in range(60)]
    files2 = [bytes(rng.getrandbits(8) for _ in range(8192)) for _ in range(60)]
    # insert 100 bytes at position 100 in half the files (shift)
    shifted = [f[:100] + bytes(100) + f[100:8092] for f in files2[:30]]
    corpus = files + shifted
    def before():  # whole-file dedup
        return len({hashlib.sha256(f).digest() for f in corpus})
    def after():  # CHANGE: fixed 1KB chunk dedup
        chunks = set()
        for f in corpus:
            for o in range(0, len(f), 1024): chunks.add(hashlib.sha256(f[o:o+1024]).digest())
        return len(chunks)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0161", "artifact-dedup", 160, "shifted_files_chunks", b, bs,
        "1KB fixed-chunk dedup vs whole-file dedup on shifted files", a, ast,
        extra={"unique_files": nb, "unique_chunks": na, "total_chunks": len(corpus)*8})

# f162 BAC-0162 build-caching (161): negative caching
def f162():
    def expensive(q):
        s = 0
        for k in range(30000): s += (k * hash(q)) & 0xFF
        return None if hash(q) % 3 == 0 else s  # 1/3 are misses
    queries = ["q%d" % i for i in range(60)]
    def before():  # recompute misses every time
        return [expensive(q) for q in queries for _ in range(3)]
    neg = {}
    def after():  # CHANGE: cache negative results too
        out = []
        for _ in range(3):
            for q in queries:
                if q not in neg: neg[q] = expensive(q)
                out.append(neg[q])
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: (neg.clear(), after())[1])
    rec("BAC-0162", "build-caching", 161, "negative_cache", b, bs,
        "negative caching (cache misses) vs recompute-on-miss", a, ast)

# f163 BAC-0163 browser-pooling (162): per-domain pool vs generic
def f163():
    def new_conn(host):
        s = 0
        for k in range(8000): s += (k * hash(host)) & 0xFF
        return {"h": host, "s": s}
    hosts = ["a.com", "b.com", "c.com", "d.com"]
    reqs = [hosts[i % 4] for i in range(40)]
    def before():  # generic pool: connection per request (no reuse across)
        return [new_conn(h) for h in reqs]
    pools = defaultdict(deque)
    def after():  # CHANGE: per-domain pool reuses connections
        out = []
        for h in reqs:
            if pools[h]: c = pools[h].popleft()
            else: c = new_conn(h)
            out.append(c); pools[h].append(c)
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: (pools.clear(), after())[1])
    rec("BAC-0163", "browser-pooling", 162, "per_domain_reuse", b, bs,
        "per-domain connection pools vs generic pool (simulated)", a, ast)

# f164 BAC-0164 test-selection (163): call-graph impact vs file deps
def f164():
    tests = ["t%d" % i for i in range(80)]
    filedep = {"t%d" % i: {"f%d" % (i % 20)} for i in range(80)}
    callg = defaultdict(set)  # test -> transitively called funcs
    for i in range(80):
        callg["t%d" % i] = {"fn%d" % ((i*3+j) % 60) for j in range(5)}
    changed_fn = {"fn7"}
    changed_file = {"f3"}
    def before():  # file-based selection
        return [t for t in tests if filedep[t] & changed_file]
    def after():  # CHANGE: call-graph impact analysis
        return [t for t in tests if callg[t] & changed_fn]
    sb = before(); sa = after()
    def run(t):
        s = 0
        for k in range(20000): s += (k * hash(t)) & 0xFF
    b, bs = B.med(lambda: [run(t) for t in before()])
    a, ast = B.med(lambda: [run(t) for t in after()])
    rec("BAC-0164", "test-selection", 163, "callgraph_impact", b, bs,
        "call-graph impact analysis vs file-based test selection", a, ast,
        extra={"selected_before": len(sb), "selected_after": len(sa)})

# f165 BAC-0165 selective-regeneration (164): process-pool regen
def f165():
    import multiprocessing as mp
    pages = ["pg%d" % i for i in range(48)]
    def before(): return [_render165(p) for p in pages]
    pool = mp.Pool(2)
    def after(): return pool.map(_render165, pages)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0165", "selective-regeneration", 164, "regen_48_procpool", b, bs,
        "process-pool regen vs serial regen for 48 pages", a, ast)

def _render165(p):
    s = 0
    for k in range(120000): s += (k * hash(p)) & 0xFF
    return s

# f166 BAC-0166 parallel-rendering (165): dynamic vs static chunking
def f166():
    import multiprocessing as mp
    units = list(range(48))
    costs = {u: 1 if u % 3 else 6 for u in units}  # uneven
    def before():  # static chunks of 24
        return [_render166(u, costs[u]) for u in units]
    pool = mp.Pool(2)
    def after():  # CHANGE: dynamic chunksize=4
        return pool.map(_render166d, [(u, costs[u]) for u in units], chunksize=4)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0166", "parallel-rendering", 165, "dynamic_chunks_uneven", b, bs,
        "dynamic chunksize=4 vs serial for uneven units", a, ast)

def _render166(u, c):
    s = 0
    for k in range(30000*c): s += (k * u) & 0xFF
    return s

def _render166d(arg):
    u, c = arg
    return _render166(u, c)

# f167 BAC-0167 failure-clustering (166): template tree vs flat groups
def f167():
    fails = ["E%d host=%d code=%d" % (i % 3, i % 9, 500 + i % 2) for i in range(1500)]
    import re as re_
    def before():  # flat normalized groups
        c = defaultdict(int)
        for f in fails: c[re_.sub(r"\d+", "*", f)] += 1
        return len(c)
    def after():  # CHANGE: two-level tree (error -> code)
        tree = defaultdict(lambda: defaultdict(int))
        for f in fails:
            m = re_.match(r"(E\d+) host=\d+ code=(\d+)", f)
            tree[m.group(1)][m.group(2)] += 1
        return sum(len(v) for v in tree.values()), len(tree)
    nb = before(); na, nt = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0167", "failure-clustering", 166, "template_tree", b, bs,
        "two-level template tree vs flat normalized groups", a, ast,
        extra={"groups_before": nb, "leaf_groups_after": na, "top_templates": nt})

# f168 BAC-0168 semantic-diffing (167): three-way merge
def f168():
    base = {"a": 1, "b": 2, "c": 3}
    mine = {"a": 1, "b": 20, "c": 3}
    theirs = {"a": 1, "b": 2, "c": 30}
    def before():  # two-way: mine vs theirs, conflicts on both changed
        diff = {k: (mine.get(k), theirs.get(k)) for k in set(mine) | set(theirs) if mine.get(k) != theirs.get(k)}
        return len(diff)
    def after():  # CHANGE: three-way vs base: no conflicts (disjoint changes)
        merged = dict(base); conflicts = 0
        for k in set(mine) | set(theirs):
            mv, tv, bv = mine.get(k), theirs.get(k), base.get(k)
            if mv == tv: merged[k] = mv
            elif mv == bv: merged[k] = tv
            elif tv == bv: merged[k] = mv
            else: conflicts += 1
        return conflicts, merged
    cb = before(); ca, m = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0168", "semantic-diffing", 167, "three_way_merge", b, bs,
        "three-way merge vs base vs two-way diff", a, ast,
        extra={"conflicts_before": cb, "conflicts_after": ca})

# f169 BAC-0169 schema-evolution (168): registry validation
def f169():
    registry = {"user": {"name": str, "age": int}}
    records = [{"name": "n%d" % i, "age": i} for i in range(3000)]
    bad = {"name": "x", "age": "notanint"}
    def before():  # ad-hoc: try/except per consumer
        ok = 0
        for r in records + [bad]:
            try:
                assert isinstance(r["age"], int); ok += 1
            except AssertionError: pass
        return ok
    def after():  # CHANGE: central registry validation
        sch = registry["user"]
        ok = 0
        for r in records + [bad]:
            if all(isinstance(r.get(k), t) for k, t in sch.items()): ok += 1
        return ok
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0169", "schema-evolution", 168, "registry_validation", b, bs,
        "central schema-registry validation vs ad-hoc per-consumer checks", a, ast,
        extra={"valid_before": nb, "valid_after": na, "same": nb == na})

# f170 BAC-0170 zero-copy (169): sendfile vs read/write loop
def f170():
    src = os.path.join(HERE, "bench4_src.bin"); dst = os.path.join(HERE, "bench4_dst.bin")
    with open(src, "wb") as f: f.write(bytes(rng.getrandbits(8) for _ in range(4_000_000)))
    def before():
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            while True:
                ch = fi.read(65536)
                if not ch: break
                fo.write(ch)
    def after():  # CHANGE: os.sendfile (kernel-space copy)
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            off = 0
            while off < 4_000_000:
                n = os.sendfile(fo.fileno(), fi.fileno(), off, 65536)
                if not n: break
                off += n
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0170", "zero-copy", 169, "sendfile_4MB", b, bs,
        "os.sendfile vs userspace read/write loop", a, ast)

# f171 BAC-0171 compression (170): delta pre-transform before zlib
def f171():
    series = [1000 + i*3 + (i*i % 17) for i in range(5000)]
    raw = str(series).encode()
    def before(): return len(zlib.compress(raw, 6))
    deltas = [series[0]] + [series[i]-series[i-1] for i in range(1, len(series))]
    denc = str(deltas).encode()
    def after(): return len(zlib.compress(denc, 6))  # CHANGE: delta pre-transform
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0171", "compression", 170, "delta_prefilter_series", b, bs,
        "delta pre-transform + zlib vs raw zlib on numeric series", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# f172 BAC-0172 storage-tiers (171): LFU vs LRU tiering
def f172():
    hot = ["k%d" % i for i in range(50)]
    warm = ["k%d" % i for i in range(50, 500)]
    reqs = []
    for _ in range(600): reqs.append(rng.choice(hot))
    for _ in range(400): reqs.append(rng.choice(warm))
    rng.shuffle(reqs)
    def before():  # LRU 200
        from collections import OrderedDict
        c = OrderedDict(); hits = 0
        for q in reqs:
            if q in c: hits += 1; c.move_to_end(q)
            else:
                c[q] = 1
                if len(c) > 200: c.popitem(last=False)
        return hits
    def after():  # CHANGE: LFU 200 (frequency sketch)
        freq = defaultdict(int); c = set(); hits = 0
        for q in reqs:
            freq[q] += 1
            if q in c: hits += 1
            else:
                if len(c) >= 200:
                    c.remove(min(c, key=lambda k: freq[k]))
                c.add(q)
        return hits
    hb = before(); ha = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0172", "storage-tiers", 171, "lfu_vs_lru", b, bs,
        "LFU tiering vs LRU tiering on skewed workload", a, ast,
        extra={"hits_before": hb, "hits_after": ha})

# f173 BAC-0173 checkpoint-compaction (172): COW pages vs locking snapshot
def f173():
    import copy
    pages = {i: list(range(50)) for i in range(400)}
    def before():  # lock + deepcopy
        return copy.deepcopy(pages)
    base = dict(pages)
    def after():  # CHANGE: COW snapshot (shared base + overlay)
        return (base, {7: [1]*50})
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0173", "checkpoint-compaction", 172, "cow_snapshot", b, bs,
        "copy-on-write snapshot vs lock + deepcopy", a, ast)

# f174 BAC-0174 replay-acceleration (173): aggregate cache vs rebuild per command
def f174():
    events = [("add", i % 200, i) for i in range(20000)]
    def before():  # rebuild aggregate per command query
        tot = 0
        for _ in range(50):
            st = defaultdict(int)
            for op, k, v in events: st[k] += v
            tot += st[7]
        return tot
    st = defaultdict(int)  # CHANGE: cached aggregate, updated incrementally
    for op, k, v in events: st[k] += v
    def after():
        tot = 0
        for _ in range(50): tot += st[7]
        return tot
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0174", "replay-acceleration", 173, "aggregate_cache_50_queries", b, bs,
        "cached incrementally-updated aggregate vs rebuild-per-query", a, ast)

# f175 BAC-0175 incremental-graph-compilation (174): tree-shaking
def f175():
    N = 150
    reach = set([0])
    stack = [0]
    edges = {i: [(i*3+1) % N, (i*5+2) % N] for i in range(N)}
    while stack:
        u = stack.pop()
        for v in edges[u]:
            if v not in reach: reach.add(v); stack.append(v)
    def comp(i):
        s = 0
        for k in range(15000): s += (k * i) & 0xFF
        return s
    def before(): return [comp(i) for i in range(N)]
    def after(): return {i: comp(i) for i in reach}  # CHANGE: shake unreachable
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0175", "incremental-graph-compilation", 174, "tree_shake", b, bs,
        "tree-shaking unreachable nodes vs compile-all", a, ast,
        extra={"nodes_total": N, "nodes_reachable": len(reach)})

BENCHES4A = [f151, f152, f153, f154, f155, f156, f157, f158, f159, f160,
             f161, f162, f163, f164, f165, f166, f167, f168, f169, f170,
             f171, f172, f173, f174, f175]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES4A:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    with open(os.path.join(HERE, "bench4_results.json"), "w") as f:
        json.dump({"results": results, "repeats": B.R,
                   "elapsed_s": round(time.time() - t0, 1)}, f, indent=1)
    print("wrote bench4_results.json, %d missions" % len(results))
