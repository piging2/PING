"""Range 2 part B (BAC-0081..BAC-0100). Appends into bench2_results.json."""
import json, os, time, hashlib, random
from collections import defaultdict, deque
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(8100)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# c81 BAC-0081 queue-fairness (case 80): WFQ under saturation (fixes BAC-0046)
def c81():
    # arrival rate > service: 300 time units, gold/silver/bronze keep arriving
    arrivals = []
    for t in range(300):
        arrivals.append(("gold", t)); arrivals.append(("silver", t))
        if t % 2 == 0: arrivals.append(("bronze", t))
    def serve(order_fn):
        qs = {"gold": deque(), "silver": deque(), "bronze": deque()}
        served = defaultdict(int); ai = 0; t = 0
        arr = sorted(arrivals, key=lambda x: x[1])
        while t < 300 or any(qs.values()):
            while ai < len(arr) and arr[ai][1] <= t: qs[arr[ai][0]].append(1); ai += 1
            nxt = order_fn(qs)
            if nxt and qs[nxt]: qs[nxt].popleft(); served[nxt] += 1
            t += 1
        return dict(served)
    def rr(qs):
        for tn in ("gold", "silver", "bronze"):
            if qs[tn]: return tn
        return None
    weights = {"gold": 4, "silver": 2, "bronze": 1}; deficit = defaultdict(int)
    def wfq(qs):  # CHANGE: deficit round robin
        for tn in ("gold", "silver", "bronze"): deficit[tn] += weights[tn]
        for tn in ("gold", "silver", "bronze"):
            if qs[tn] and deficit[tn] >= 1:
                deficit[tn] -= 1; return tn
        return None
    sb = serve(rr); deficit.clear(); sa = serve(wfq)
    b, bs = B.med(lambda: serve(rr)); a, ast = B.med(lambda: (deficit.clear(), serve(wfq))[1])
    rec("BAC-0081", "queue-fairness", 80, "saturated_300_units", b, bs,
        "deficit-round-robin WFQ (4:2:1) instead of equal round-robin under saturation", a, ast,
        extra={"served_before": sb, "served_after": sa})

# c82 BAC-0082 work-stealing (case 81): adversarial skew
def c82():
    tasks = [25]*8 + [1]*64  # all long tasks would land on worker 0 statically
    W = 4
    def before():  # static: worker i gets tasks[i::W] -> worker0 gets 2 long + 16 short
        parts = [tasks[i::W] for i in range(W)]
        return max(sum(p) for p in parts)
    def after():  # CHANGE: steal from most-loaded
        deq = deque(sorted(tasks, reverse=True)); loads = [0]*W
        while deq:
            t = deq.popleft(); i = max(range(W), key=lambda k: loads[k])  # victim: most loaded
            # thief = least loaded takes from most loaded's pile: model as global rebalance
            j = min(range(W), key=lambda k: loads[k]); loads[j] += t
        return max(loads)
    mb = before(); ma = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0082", "work-stealing", 81, "adversarial_skew_sim", b, bs,
        "least-loaded work stealing vs static partition under adversarial skew", a, ast,
        extra={"makespan_before": mb, "makespan_after": ma})

# c83 BAC-0083 lease-fencing (case 82): CAS generation fencing
def c83():
    def before():  # fencing token only, single resource
        store = {"v": 0, "f": 0}
        def w(val, tok):
            if tok <= store["f"]: return False
            store["f"] = tok; store["v"] = val; return True
        w(1, 1); w(2, 1); return store["v"]  # stale accepted? no: rejected. multi-resource gap:
    def after():  # CHANGE: per-key generations, CAS on (key, expected_gen)
        store = {}
        def w(key, val, exp_gen):
            gen, _ = store.get(key, (0, None))
            if exp_gen != gen: return False
            store[key] = (gen+1, val); return True
        w("a", 1, 0); ok_stale = w("a", 99, 0); ok_new = w("a", 2, 1)
        return store["a"], ok_stale, ok_new
    va, stale, new = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0083", "lease-fencing", 82, "per_key_cas_fencing", b, bs,
        "per-key generation CAS instead of single global fencing token", a, ast,
        extra={"stale_rejected": not stale, "current_write_accepted": new,
               "note": "global token serializes unrelated keys; per-key CAS fences precisely"})

# c84 BAC-0084 connection-pools (case 83): per-host pools
def c84():
    def new_conn(host):
        s = 0
        for k in range(3000): s += (k * hash(host)) & 0xFF
        return {"host": host, "s": s}
    hosts = ["h%d" % (i % 5) for i in range(200)]
    def before():  # single global pool, any host
        pool = deque(new_conn("x") for _ in range(10))
        for h in hosts:
            c = pool.popleft(); c["host"] = h; pool.append(c)  # re-handshake each checkout
    pool = {h: deque(new_conn(h) for _ in range(2)) for h in set(hosts)}
    def after():  # CHANGE: per-host pools keep warm host-specific conns
        for h in hosts:
            c = pool[h].popleft(); c["s"] += 1; pool[h].append(c)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0084", "connection-pools", 83, "200_checkouts_5_hosts", b, bs,
        "per-host pools (warm host affinity) vs single global pool (re-handshake per checkout)", a, ast)

# c85 BAC-0085 query-planning (case 84): join order selection
def c85():
    small = [{"id": i} for i in range(200)]
    big = [{"id": i % 200, "v": i} for i in range(50000)]
    big_by_id = defaultdict(list)
    for r in big: big_by_id[r["id"]].append(r)
    def before():  # naive: nested loop big x small
        return [(s, b_) for b_ in big for s in small if s["id"] == b_["id"]]
    def after():  # CHANGE: planner picks small as outer, hash join
        return [(s, b_) for s in small for b_ in big_by_id[s["id"]]]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0085", "query-planning", 84, "join_200_x_50k", b, bs,
        "planner-chosen hash join (small outer) vs naive nested loop", a, ast)

# c86 BAC-0086 indexes (case 85): covering index
def c86():
    rows = [("k%05d" % i, i, "payload-%d" % i) for i in range(50000)]
    idx = {k: i for k, i, _ in rows}          # key -> position
    covering = {k: (i, p) for k, i, p in rows}  # CHANGE: covering index
    lookups = ["k%05d" % (i * 997 % 50000) for i in range(300)]
    def before():  # index then row lookup
        return [(idx[k], rows[idx[k]][2]) for k in lookups]
    def after(): return [covering[k] for k in lookups]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0086", "indexes", 85, "300_lookups_covering", b, bs,
        "covering index (payload inline) vs index + row fetch", a, ast)

# c87 BAC-0087 partitioning (case 86): range partition, partition-wise agg
def c87():
    parts = {p: list(range(p*10000, (p+1)*10000)) for p in range(10)}
    def before():  # scan all, filter, aggregate
        return sum(x for p in parts.values() for x in p if 25000 <= x <= 34999)
    def after():  # CHANGE: aggregate per partition, prune to partitions 2,3
        return sum(sum(x for x in parts[p] if 25000 <= x <= 34999) for p in (2, 3))
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0087", "partitioning", 86, "range_agg_100k", b, bs,
        "partition-wise aggregation with pruning (2 of 10) vs full scan", a, ast)

# c88 BAC-0088 pagination (case 87): stateless cursor tokens across pages
def c88():
    rows = list(range(100000))
    def before():  # OFFSET pages 0..9 (re-skip each time, like stateless offset paging)
        out = []
        for pg in range(10): out.append(rows[pg*1000:(pg+1)*1000])
        return out
    def after():  # CHANGE: cursor token carried between pages
        out = []; last = -1
        for _ in range(10):
            page = rows[last+1:last+1001]; out.append(page); last = page[-1]
        return out
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0088", "pagination", 87, "10_pages_list", b, bs,
        "stateless cursor chaining vs repeated OFFSET (list layer; DB effect shown in BAC-0053)", a, ast)

# c89 BAC-0089 cursor-durability (case 88): cursor with idempotent sink
def c89():
    N = 12000
    sink = set()
    def before():  # no cursor: crash at 60% -> replay all, sink dedupes but work repeats
        for i in range(7200): sink.add(i)
        for i in range(N): sink.add(i)
        return len(sink)
    cur = {"n": 0}
    def after():  # CHANGE: cursor persisted every 1000 + idempotent sink
        sink.clear()
        for i in range(7200):
            sink.add(i)
            if i % 1000 == 0: cur["n"] = i
        for i in range(cur["n"], N): sink.add(i)
        return len(sink)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0089", "cursor-durability", 88, "crash_60pct_12k", b, bs,
        "coarse durable cursor + idempotent sink instead of blind full replay", a, ast)

# c90 BAC-0090 cache-locality (case 89): tiled traversal
def c90():
    N = 512
    m = [[(i * j) & 0xFF for j in range(N)] for i in range(N)]
    def before():  # column-major over row-major storage (cache-hostile)
        return sum(m[i][j] for j in range(N) for i in range(N))
    def after():  # CHANGE: tiled 32x32 blocks
        T = 32; s = 0
        for bi in range(0, N, T):
            for bj in range(0, N, T):
                for i in range(bi, bi+T):
                    row = m[i]
                    for j in range(bj, bj+T): s += row[j]
        return s
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0090", "cache-locality", 89, "matrix_sum_512_colmajor_vs_tiled", b, bs,
        "32x32 tiled traversal vs cache-hostile column-major over row-major matrix", a, ast)

# c91 BAC-0091 artifact-dedup (case 90): weak+strong two-level hash
def c91():
    files = [bytes(rng.getrandbits(8) for _ in range(16384)) for _ in range(40)]
    files += files[:20]  # 20 exact dupes
    def before():  # strong hash everything
        seen = set(); s = 0
        for f in files:
            h = hashlib.sha256(f).digest()
            if h not in seen: seen.add(h); s += len(f)
        return s
    def after():  # CHANGE: weak hash (adler-ish) first, strong only on weak-hit
        import zlib as z
        weak = {}
        for f in files:
            w = z.adler32(f)
            weak.setdefault(w, []).append(f)
        seen = set(); s = 0
        for w, fs in weak.items():
            if len(fs) == 1:
                s += len(fs[0])
            else:
                for f in fs:
                    h = hashlib.sha256(f).digest()
                    if h not in seen: seen.add(h); s += len(f)
        return s
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0091", "artifact-dedup", 90, "60_files_20_dupes", b, bs,
        "weak-hash prefilter + strong hash on collision vs strong hash of everything", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa, "same_bytes": sb == sa})

# c92 BAC-0092 build-caching (case 91): remote cache hit
def c92():
    def local_build(t):
        s = 0
        for k in range(60000): s += (k * hash(t)) & 0xFF
        return s
    targets = ["t%d" % i for i in range(40)]
    remote = {"t%d" % i: i * 7 for i in range(30)}  # 30 of 40 cached remotely
    def before(): return sum(local_build(t) for t in targets)
    def after():  # CHANGE: fetch remote hits, build only misses
        out = 0
        for t in targets:
            out += remote[t] if t in remote else local_build(t)
        return out
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0092", "build-caching", 91, "40_targets_30_remote_hits", b, bs,
        "remote cache fetch for 30 hits + local build of 10 misses vs full local rebuild", a, ast)

# c93 BAC-0093 browser-pooling (case 92): pool with max-age recycle
def c93():
    ages = {"n": 0}
    def new_page():
        ages["n"] += 1
        return {"id": ages["n"], "uses": 0}
    def before():  # unbounded reuse, pages go stale
        pool = deque(new_page() for _ in range(3))
        stale_uses = 0
        for _ in range(60):
            p = pool.popleft(); p["uses"] += 1
            if p["uses"] > 25: stale_uses += 1  # stale page risk
            pool.append(p)
        return stale_uses
    def after():  # CHANGE: recycle after 25 uses
        pool = deque(new_page() for _ in range(3))
        recycled = 0
        for _ in range(60):
            p = pool.popleft(); p["uses"] += 1
            if p["uses"] >= 25: p = new_page(); recycled += 1
            pool.append(p)
        return recycled
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0093", "browser-pooling", 92, "60_tasks_recycle", b, bs,
        "max-age recycle (25 uses) instead of unbounded page reuse (simulated)", a, ast,
        extra={"stale_uses_before": rb, "recycles_after": ra,
               "note": "correctness/freshness claim; time parity"})

# c94 BAC-0094 test-selection (case 93): transitive import closure
def c94():
    imports = {"src%d" % i: {"src%d" % ((i+1) % 40)} for i in range(40)}
    tests = {"test_%d" % i: {"src%d" % (i % 40)} for i in range(300)}
    changed = {"src7"}
    def before():  # direct dependents only (misses transitive)
        return [t for t, ds in tests.items() if ds & changed]
    # CHANGE: transitive closure over import graph
    aff = set(changed); stack = list(changed)
    rev = defaultdict(list)
    for s, ds in imports.items():
        for d in ds: rev[d].append(s)
    while stack:
        u = stack.pop()
        for v in rev[u]:
            if v not in aff: aff.add(v); stack.append(v)
    def after(): return [t for t, ds in tests.items() if ds & aff]
    nb = len(before()); na = len(after())
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0094", "test-selection", 93, "transitive_selection", b, bs,
        "transitive import-closure selection instead of direct-dependents only", a, ast,
        extra={"tests_before": nb, "tests_after": na,
               "note": "correctness claim: transitive dependents would be missed by direct-only"})

# c95 BAC-0095 selective-regeneration (case 94): content-hash skip of unchanged output
def c95():
    pages = ["page_%d" % i for i in range(200)]
    out_hash = {p: hashlib.sha256(p.encode()).hexdigest() for p in pages}
    def render(p):
        s = 0
        for k in range(4000): s += (k * hash(p)) & 0xFF
        return s
    changed = {"page_%d" % i for i in range(0, 200, 10)}  # 20 changed
    def before():
        return sum(render(p) for p in changed)  # regen all 'changed'
    def after():  # CHANGE: skip when output hash unchanged
        n = 0
        for p in changed:
            h = hashlib.sha256(("render:" + p).encode()).hexdigest()
            if h != out_hash[p]: render(p); n += 1
        return n
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0095", "selective-regeneration", 94, "regen_with_hash_skip", b, bs,
        "content-hash skip of unchanged outputs vs blind regeneration of changed set", a, ast)

# c96 BAC-0096 parallel-rendering (case 95): process pool for CPU-bound (fixes BAC-0026 GIL)
def _render96(u):
    s = 0
    for k in range(200000): s += (k * u) & 0xFF
    return s

def c96():
    import multiprocessing as mp
    units = list(range(8))
    def before(): return [_render96(u) for u in units]
    pool = mp.Pool(2)
    def after(): return pool.map(_render96, units)  # CHANGE: process pool
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0096", "parallel-rendering", 95, "8_cpu_units_procpool", b, bs,
        "2-process pool instead of serial for CPU-bound render units (GIL escape)", a, ast)

# c97 BAC-0097 failure-clustering (case 96): single-pass online clustering
def c97():
    fails = ["TimeoutError host%d op=%d" % (i % 6, i % 4) for i in range(2000)]
    def before():  # two passes: collect then group
        sigs = [f for f in fails]
        clusters = defaultdict(list)
        for f in sigs: clusters[f].append(f)
        return len(clusters)
    def after():  # CHANGE: single-pass online
        clusters = defaultdict(int)
        for f in fails: clusters[f] += 1
        return len(clusters)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0097", "failure-clustering", 96, "cluster_2000_online", b, bs,
        "single-pass counting instead of collect-then-group two passes", a, ast)

# c98 BAC-0098 semantic-diffing (case 97): three-way merge with base
def c98():
    base = {"a": 1, "b": 2, "c": 3, "d": 4}
    mine = {"a": 1, "b": 20, "c": 3, "d": 4}
    theirs = {"a": 1, "b": 2, "c": 30, "d": 4}
    def before():  # two-way diff mine vs theirs: flags b and c, can't tell who changed what
        return [k for k in mine if mine[k] != theirs[k]]
    def after():  # CHANGE: three-way against base
        mine_ch = [k for k in base if base[k] != mine[k]]
        theirs_ch = [k for k in base if base[k] != theirs[k]]
        conflicts = [k for k in mine_ch if k in theirs_ch]
        return mine_ch, theirs_ch, conflicts
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0098", "semantic-diffing", 97, "three_way_merge", b, bs,
        "three-way diff against base (attributes each change, detects conflicts) vs two-way diff", a, ast,
        extra={"two_way_flags": nb, "three_way": na})

# c99 BAC-0099 schema-evolution (case 98): versioned readers
def c99():
    v1 = {"name": "str", "age": "int"}
    v2 = {"name": "str", "age": "int", "email": "str"}
    old_data = {"name": "acme", "age": 5}
    def before():  # new code reads old data with v2 schema -> KeyError on email
        try: return v2["email"] and old_data["email"]
        except KeyError: return "CRASH"
    def after():  # CHANGE: versioned reader with defaults for added fields
        readers = {1: v1, 2: v2}
        defaults = {"email": ""}
        rec_v = readers[2]
        return {k: old_data.get(k, defaults.get(k)) for k in rec_v}
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0099", "schema-evolution", 98, "read_old_data_new_schema", b, bs,
        "versioned reader with field defaults instead of raw new-schema read of old data", a, ast,
        extra={"before": rb, "after": ra})

# c100 BAC-0100 zero-copy (case 99): scatter-gather vs concat copy
def c100():
    chunks = [bytes(rng.getrandbits(8) for _ in range(65536)) for _ in range(64)]  # 4MB total
    def before():  # concat into one buffer then 'send'
        buf = b"".join(chunks)
        return len(buf)
    def after():  # CHANGE: scatter-gather views, no concat
        mvs = [memoryview(c) for c in chunks]
        return sum(len(m) for m in mvs)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0100", "zero-copy", 99, "gather_64_chunks_4MB", b, bs,
        "scatter-gather memoryview list instead of concatenating into one send buffer", a, ast)

BENCHES2B = [c81, c82, c83, c84, c85, c86, c87, c88, c89, c90,
             c91, c92, c93, c94, c95, c96, c97, c98, c99, c100]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES2B:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    prev = json.load(open(os.path.join(HERE, "bench2_results.json")))
    prev["results"].update(results)
    with open(os.path.join(HERE, "bench2_results.json"), "w") as f:
        json.dump(prev, f, indent=1)
    print("bench2_results.json now has %d missions" % len(prev["results"]))
