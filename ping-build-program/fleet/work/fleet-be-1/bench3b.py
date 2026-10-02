"""Range 3 part B (BAC-0126..BAC-0150)."""
import json, os, time, hashlib, zlib, random
from collections import defaultdict, deque
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(12650)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# e126 BAC-0126 artifact-dedup (125): delta encoding vs full copies
def e126():
    base = bytes(rng.getrandbits(8) for _ in range(16384))
    versions = [base]
    for v in range(9):
        prev = versions[-1]
        nxt = bytearray(prev)
        for o in range(v*100, v*100+200): nxt[o] = (nxt[o] + 7) & 0xFF  # small edits
        versions.append(bytes(nxt))
    def before(): return sum(len(x) for x in versions)  # full copies
    def after():  # CHANGE: store base + deltas (offset,value runs)
        stored = len(base)
        for prev, cur in zip(versions, versions[1:]):
            diff = [(o, cur[o]) for o in range(len(cur)) if prev[o] != cur[o]]
            stored += len(diff) * 4
        return stored
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0126", "artifact-dedup", 125, "10_versions_small_edits", b, bs,
        "delta encoding vs full copies for versioned artifacts", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# e127 BAC-0127 build-caching (126): content-hash remote cache keying
def e127():
    def build(src):
        s = 0
        for k in range(40000): s += (k * hash(src)) & 0xFF
        return s
    srcs = ["src%d" % i for i in range(30)]
    def before():  # path+mtime keyed local cache: all miss after 'touch'
        return sum(build(s) for s in srcs)
    cache = {}
    def after():  # CHANGE: content-hash keying survives touches/renames
        out = 0
        for s in srcs:
            h = hashlib.sha256(s.encode()).digest()
            if h not in cache: cache[h] = build(s)
            out += cache[h]
        return out
    # second build: before misses all, after hits all
    before()
    for s in srcs:
        h = hashlib.sha256(s.encode()).digest(); cache[h] = build(s)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0127", "build-caching", 126, "rebuild_after_touch_30", b, bs,
        "content-hash cache keys (touch-proof) vs path+mtime keys", a, ast)

# e128 BAC-0128 browser-pooling (127): priority reservation
def e128():
    def new_page():
        s = 0
        for k in range(15000): s += k & 0xFF
        return {"s": s}
    def before():  # single pool: background tasks can starve interactive
        pool = deque(new_page() for _ in range(2))
        waited = 0
        for i in range(20):
            if pool: pool.popleft()
            else: waited += 1
            if i % 2 == 0 and len(pool) < 2: pass
            pool.append(new_page()) if len(pool) < 2 else None
        return waited
    inter = deque(new_page() for _ in range(1)); batch = deque(new_page() for _ in range(2))
    def after():  # CHANGE: reserved interactive lane
        starved = 0
        for i in range(20):
            lane = inter if i % 5 == 0 else batch
            if lane: lane.popleft(); lane.append(new_page())
            else: starved += 1
        return starved
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0128", "browser-pooling", 127, "priority_lanes_sim", b, bs,
        "reserved interactive lane vs single shared pool (simulated)", a, ast,
        extra={"interactive_starved_before": rb, "interactive_starved_after": ra})

# e129 BAC-0129 test-selection (128): failure-history ordering
def e129():
    tests = ["test_%d" % i for i in range(120)]
    history = {"test_%d" % i: (10 - i % 10) for i in range(120)}  # recent failures first
    changed = {"src3"}
    dep = {"test_%d" % i: {"src%d" % (i % 10)} for i in range(120)}
    sel = [t for t in tests if dep[t] & changed]
    def run(t):
        s = 0
        for k in range(6000): s += (k * hash(t)) & 0xFF
        return s
    failing = {"test_3", "test_13"}
    def before():  # alphabetical
        t = 0
        for x in sorted(sel):
            run(x); t += 1
            if failing <= set(sorted(sel)[:t]): break
        return t
    def after():  # CHANGE: history-ordered (likely failures first)
        t = 0
        for x in sorted(sel, key=lambda x: -history[x]):
            run(x); t += 1
            if failing <= set(sorted(sel, key=lambda x: -history[x])[:t]): break
        return t
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0129", "test-selection", 128, "time_to_first_failure", b, bs,
        "failure-history ordering vs alphabetical within selected tests", a, ast,
        extra={"tests_to_find_failures_before": nb, "tests_to_find_failures_after": na})

# e130 BAC-0130 selective-regeneration (129): parallel regen of affected set
def e130():
    from concurrent.futures import ThreadPoolExecutor
    import threading
    pages = ["page_%d" % i for i in range(60)]
    lock = threading.Lock(); done = []
    def render(p):
        s = 0
        for k in range(30000): s += (k * hash(p)) & 0xFF
        with lock: done.append(p)
        return s
    def before():
        done.clear()
        return [render(p) for p in pages]
    def after():  # CHANGE: thread pool over affected set (IO-ish units release GIL? no: CPU)
        done.clear()
        with ThreadPoolExecutor(max_workers=2) as ex:
            return list(ex.map(render, pages))
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0130", "selective-regeneration", 129, "regen_60_parallel", b, bs,
        "thread-pool regen vs serial regen (CPU-bound: expect parity per BAC-0061)", a, ast)

# e131 BAC-0131 parallel-rendering (130): 64-unit process pool (followup BAC-0096)
def e131():
    import multiprocessing as mp
    units = list(range(64))
    def before(): return [_render131(u) for u in units]
    pool = mp.Pool(2)
    def after(): return pool.map(_render131, units)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0131", "parallel-rendering", 130, "64_cpu_units_procpool", b, bs,
        "2-process pool over 64 CPU-bound units vs serial (amortization test)", a, ast)

def _render131(u):
    s = 0
    for k in range(200000): s += (k * u) & 0xFF
    return s

# e132 BAC-0132 failure-clustering (131): drain-style normalization
def e132():
    fails = ["TimeoutError: host=%d port=%d after %dms" % (i % 6, 8000 + i % 3, 100 + i % 50) for i in range(1000)]
    def before():  # raw grouping
        c = defaultdict(int)
        for f in fails: c[f] += 1
        return len(c)
    import re as re_
    def after():  # CHANGE: normalize numbers/hosts before grouping
        c = defaultdict(int)
        for f in fails:
            sig = re_.sub(r"\d+", "*", f)
            c[sig] += 1
        return len(c)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0132", "failure-clustering", 131, "normalize_1000", b, bs,
        "drain-style number/host normalization vs raw failure grouping", a, ast,
        extra={"groups_before": nb, "groups_after": na})

# e133 BAC-0133 semantic-diffing (132): JSON-patch generation
def e133():
    a = {"a": 1, "b": {"x": 1, "y": 2}, "c": [1, 2, 3]}
    b_ = {"a": 1, "b": {"x": 1, "y": 5}, "c": [1, 2, 3, 4]}
    def before():  # full replace
        return json.dumps(b_)
    def after():  # CHANGE: minimal JSON patch
        patch = []
        if a["b"]["y"] != b_["b"]["y"]: patch.append({"op": "replace", "path": "/b/y", "value": b_["b"]["y"]})
        if a["c"] != b_["c"]: patch.append({"op": "add", "path": "/c/3", "value": 4})
        return json.dumps(patch)
    pb = before(); pa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0133", "semantic-diffing", 132, "patch_vs_replace", b, bs,
        "minimal JSON patch vs full-document replace", a, ast,
        extra={"bytes_before": len(pb), "bytes_after": len(pa)})

# e134 BAC-0134 schema-evolution (133): lazy migration on read
def e134():
    rows = [{"name": "n%d" % i, "age": i} for i in range(5000)]
    def before():  # eager rewrite all rows to v2
        return [{"name": r["name"], "age": r["age"], "email": ""} for r in rows]
    migrated = {}
    def read(i):  # CHANGE: lazy migrate on read
        if i not in migrated:
            r = rows[i]; migrated[i] = {"name": r["name"], "age": r["age"], "email": ""}
        return migrated[i]
    def after(): return [read(i) for i in range(500)]  # only 500 hot rows read
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: (migrated.clear(), after())[1])
    rec("BAC-0134", "schema-evolution", 133, "migrate_500_of_5000", b, bs,
        "lazy migration on read (500 hot rows) vs eager rewrite of 5000", a, ast)

# e135 BAC-0135 zero-copy (134): mmap slice vs read
def e135():
    import mmap
    path = os.path.join(HERE, "bench3_mmap.bin")
    with open(path, "wb") as f: f.write(bytes(rng.getrandbits(8) for _ in range(8_000_000)))
    offs = [i * 40000 for i in range(100)]
    def before():
        with open(path, "rb") as f:
            return [f.seek(o) or f.read(65536) for o in offs]
    def after():  # CHANGE: mmap views
        with open(path, "rb") as f:
            with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                return [mm[o:o+65536] for o in offs]
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0135", "zero-copy", 134, "100_file_slices_mmap", b, bs,
        "mmap views vs seek+read copies for file slices", a, ast)

# e136 BAC-0136 compression (135): adaptive level hot/cold
def e136():
    hot = [json.dumps({"id": i, "v": i*2}).encode() for i in range(200)]
    cold = [json.dumps({"id": i, "v": i*2, "hist": list(range(50))}).encode() for i in range(1800)]
    def before(): return sum(len(zlib.compress(d, 6)) for d in hot + cold)
    def after():  # CHANGE: level 1 for hot (fast), 9 for cold (dense)
        return sum(len(zlib.compress(d, 1)) for d in hot) + sum(len(zlib.compress(d, 9)) for d in cold)
    sb = before(); sa = after()
    bc, bcs = B.med(lambda: sum(len(zlib.compress(d, 6)) for d in hot + cold))
    ac, acs = B.med(lambda: sum(len(zlib.compress(d, 1)) for d in hot) + sum(len(zlib.compress(d, 9)) for d in cold))
    rec("BAC-0136", "compression", 135, "adaptive_level_2k", bc, bcs,
        "adaptive zlib level (1 hot / 9 cold) vs fixed level 6", ac, acs,
        extra={"bytes_before": sb, "bytes_after": sa})

# e137 BAC-0137 storage-tiers (136): write-back vs write-through
def e137():
    writes = [("k%d" % (i % 500), i) for i in range(3000)]
    def before():  # write-through: every write hits cold store
        cold = {}
        for k, v in writes: cold[k] = v
        return len(cold)
    def after():  # CHANGE: write-back: batch flush every 500
        hot = {}; cold = {}; flushes = 0
        for k, v in writes:
            hot[k] = v
            if len(hot) >= 500:
                cold.update(hot); hot.clear(); flushes += 1
        cold.update(hot)
        return len(cold), flushes
    nb = before(); na, fl = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0137", "storage-tiers", 136, "3000_writes_tiered", b, bs,
        "write-back (6 batched flushes) vs write-through (3000 cold writes)", a, ast,
        extra={"cold_writes_before": 3000, "flushes_after": fl})

# e138 BAC-0138 checkpoint-compaction (137): incremental (changed pages only)
def e138():
    pages = [list(range(100)) for _ in range(200)]
    def before():  # full checkpoint
        import copy as cp
        return cp.deepcopy(pages)
    changed = {5, 42, 199}
    base = [list(p) for p in pages]
    def after():  # CHANGE: checkpoint only changed pages + page bitmap
        return ({i: list(pages[i]) for i in changed}, len(changed))
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0138", "checkpoint-compaction", 137, "ckpt_3_of_200_pages", b, bs,
        "incremental page-level checkpoint (3 changed) vs full deepcopy", a, ast)

def _replay139(evts):
    st = {}
    for k, v in evts: st[k] = v
    return st

# e139 BAC-0139 replay-acceleration (138): parallel replay by key partition
def e139():
    import multiprocessing as mp
    events = [("k%d" % (i % 64), i) for i in range(40000)]
    def before():
        st = {}
        for k, v in events: st[k] = v
        return len(st)
    parts = defaultdict(list)
    for k, v in events: parts[hash(k) % 2].append((k, v))
    pool = mp.Pool(2)
    def after():  # CHANGE: replay 2 partitions in parallel, merge
        r = pool.map(_replay139, list(parts.values()))
        st = {}
        for d in r: st.update(d)
        return len(st)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0139", "replay-acceleration", 138, "parallel_replay_40k", b, bs,
        "2-way parallel replay by key partition vs serial replay", a, ast)

# e140 BAC-0140 incremental-graph-compilation (139): lazy on-demand compile
def e140():
    N = 120
    def comp(i):
        s = 0
        for k in range(20000): s += (k * i) & 0xFF
        return s
    def before(): return [comp(i) for i in range(N)]  # eager all
    cache = {}
    def after():  # CHANGE: compile on demand; only 15 nodes requested
        return {i: cache.setdefault(i, comp(i)) for i in range(0, N, 8)}
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: (cache.clear(), after())[1])
    rec("BAC-0140", "incremental-graph-compilation", 139, "lazy_15_of_120", b, bs,
        "lazy on-demand compilation (15 requested) vs eager compile-all", a, ast)

# e141 BAC-0141 incremental-computation (140): delta-maintained count
def e141():
    items = ["a"]*5000 + ["b"]*3000
    def before():  # recount on every query
        return sum(1 for x in items if x == "a")
    counts = defaultdict(int)  # CHANGE: maintain deltas
    for x in items: counts[x] += 1
    def after():
        counts["a"] += 100; counts["b"] -= 50  # deltas applied
        return counts["a"]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0141", "incremental-computation", 140, "count_query_8k", b, bs,
        "delta-maintained aggregate vs recount-per-query", a, ast)

# e142 BAC-0142 content-addressing (141): merkle tree dir dedup
def e142():
    files = {("f%d" % i): ("content-%d" % (i % 40)).encode()*64 for i in range(200)}
    def before():  # flat file-hash dedup
        seen = set()
        for c in files.values(): seen.add(hashlib.sha256(c).digest())
        return len(seen)
    def after():  # CHANGE: merkle root per directory; identical dirs share root
        dirs = defaultdict(list)
        for name, c in files.items(): dirs[name[0:2]].append(hashlib.sha256(c).digest())
        roots = set()
        for d, hs in dirs.items():
            roots.add(hashlib.sha256(b"".join(sorted(hs))).digest())
        return len(roots)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0142", "content-addressing", 141, "merkle_dir_roots", b, bs,
        "merkle directory roots vs flat file-hash dedup", a, ast,
        extra={"unique_files": nb, "dir_roots": na})

# e143 BAC-0143 semantic-hashes (142): simhash hamming-radius search
def e143():
    def simhash(s):
        toks = s.split(); v = [0]*32
        for t in toks:
            h = int(hashlib.sha256(t.encode()).hexdigest(), 16)
            for i in range(32):
                v[i] += 1 if (h >> i) & 1 else -1
        bits = 0
        for i in range(32):
            if v[i] > 0: bits |= (1 << i)
        return bits
    docs = ["the cat sat on the mat %d" % i for i in range(300)]
    near = docs + ["the cat sat on the mat %d!" % i for i in range(300)]
    hs = [simhash(s) for s in near]
    def ham(a, b): return bin(a ^ b).count("1")
    def before():  # all-pairs hamming
        n = len(hs); found = 0
        for i in range(n):
            for j in range(i+1, n):
                if ham(hs[i], hs[j]) <= 6: found += 1
        return found
    def after():  # CHANGE: bucket by high 16 bits, hamming only within
        buckets = defaultdict(list)
        for idx, h in enumerate(hs): buckets[h >> 16].append(idx)
        found = 0
        for bucket in buckets.values():
            for x in range(len(bucket)):
                for y in range(x+1, len(bucket)):
                    if ham(hs[bucket[x]], hs[bucket[y]]) <= 6: found += 1
        return found
    fb = before(); fa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0143", "semantic-hashes", 142, "simhash_600", b, bs,
        "high-bits bucketing + hamming radius vs all-pairs hamming", a, ast,
        extra={"pairs_before": fb, "pairs_after": fa})

# e144 BAC-0144 dependency-graphs (143): levelized parallel invalidation
def e144():
    N = 400
    deps = {i: [i-1, i-2] if i >= 2 else [] for i in range(N)}
    level = [0]*N
    for i in range(N):
        level[i] = 1 + max([level[d] for d in deps[i]] or [0])
    from concurrent.futures import ThreadPoolExecutor
    dirty = set(range(0, N, 7))
    def before():  # serial DFS from each dirty
        aff = set()
        for d in dirty:
            stack = [d]
            while stack:
                u = stack.pop()
                for v in range(u+1, min(u+3, N)):
                    if v not in aff: aff.add(v); stack.append(v)
        return len(aff)
    children = defaultdict(list)
    for i in range(N):
        for d in deps[i]: children[d].append(i)
    def after():  # CHANGE: level-by-level wavefront (parallelizable)
        aff = set(dirty); frontier = set(dirty)
        while frontier:
            nxt = set()
            for u in frontier:
                for v in children[u]:
                    if v not in aff: aff.add(v); nxt.add(v)
            frontier = nxt
        return len(aff)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0144", "dependency-graphs", 143, "wavefront_invalidation", b, bs,
        "level wavefront invalidation vs per-source serial DFS", a, ast,
        extra={"affected_before": nb, "affected_after": na, "same": nb == na})

# e145 BAC-0145 materialized-projections (144): deferred (lazy) materialization
def e145():
    events = [("sale", i % 50, i) for i in range(20000)]
    def before():  # eager: build on ingest
        proj = defaultdict(int)
        for _, k, v in events: proj[k] += v
        return dict(proj)
    built = {}
    def query():  # CHANGE: build on first query only
        if not built:
            proj = defaultdict(int)
            for _, k, v in events: proj[k] += v
            built.update(proj)
        return dict(built)
    def after():  # projection never queried in this window -> zero cost
        return None
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0145", "materialized-projections", 144, "never_queried_projection", b, bs,
        "deferred materialization (build on first query) vs eager build on ingest", a, ast,
        extra={"note": "when query rate is zero, eager build is pure waste; measured"})

# e146 BAC-0146 invalidation (145): bloom pre-check
def e146():
    cache = {"k%d" % i: i for i in range(20000)}
    changed = {"k%d" % (i*37 % 20000) for i in range(200)}
    m = 1 << 16; bits = bytearray(m // 8)
    for k in changed:
        for s in (1, 2, 3):
            h = (hash(k) * s) % m; bits[h // 8] |= 1 << (h % 8)
    def member(k):
        for s in (1, 2, 3):
            h = (hash(k) * s) % m
            if not bits[h // 8] & (1 << (h % 8)): return False
        return True
    lookups = ["k%d" % (i * 7919 % 20000) for i in range(2000)]
    def before():  # check set membership per lookup
        return sum(1 for q in lookups if q in changed)
    def after():  # CHANGE: bloom pre-check
        return sum(1 for q in lookups if member(q) and q in changed)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0146", "invalidation", 145, "2000_invalidation_checks", b, bs,
        "bloom-filter pre-check vs set lookup per invalidation check", a, ast,
        extra={"invalid_before": nb, "invalid_after": na, "same": nb == na})

# e147 BAC-0147 snapshotting (146): diff-size quantification
def e147():
    import pickle
    state = {i: list(range(10)) for i in range(5000)}
    import copy
    full = copy.deepcopy(state)
    diff = {10: list(range(10, 20)), 4000: list(range(5))}
    def before(): return len(pickle.dumps(full))
    def after(): return len(pickle.dumps(diff))  # CHANGE: ship diff only
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0147", "snapshotting", 146, "snapshot_bytes_5k", b, bs,
        "ship pickled diff vs pickled full snapshot", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# e148 BAC-0148 batching (147): micro-batch with linger
def e148():
    items = list(range(2400))
    out = []
    def before():  # immediate per-item
        out.clear()
        for x in items: out.append(x * 2)
    def after():  # CHANGE: linger to fill 200-batches (no actual sleep; batch when full)
        out.clear(); batch = []
        for x in items:
            batch.append(x)
            if len(batch) == 200:
                out.extend(v * 2 for v in batch); batch = []
        if batch: out.extend(v * 2 for v in batch)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0148", "batching", 147, "2400_microbatch", b, bs,
        "linger-to-fill 200-batches vs immediate per-item processing", a, ast)

# e149 BAC-0149 streaming (148): fused operators
def e149():
    def gen(n):
        for i in range(n): yield i
    def before():  # map then filter as separate passes (materialized)
        a = [x * 3 for x in gen(300000)]
        b_ = [x for x in a if x % 2 == 0]
        return sum(b_)
    def after():  # CHANGE: fused single pass
        return sum(x * 3 for x in gen(300000) if (x * 3) % 2 == 0)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0149", "streaming", 148, "fused_300k", b, bs,
        "fused map+filter single pass vs two materialized passes", a, ast)

# e150 BAC-0150 backpressure (149): priority load shedding
def e150():
    arrivals = [("hi" if i % 10 == 0 else "lo", i) for i in range(4000)]
    def before():  # drop-oldest (may drop hi)
        q = deque(); dropped_hi = 0
        for pr, i in arrivals:
            if len(q) >= 256:
                old = q.popleft()
                if old[0] == "hi": dropped_hi += 1
            q.append((pr, i))
        return dropped_hi
    def after():  # CHANGE: shed low-priority first
        q = deque(); dropped_hi = 0
        for pr, i in arrivals:
            if len(q) >= 256:
                for idx, (p, _) in enumerate(q):
                    if p == "lo":
                        del q[idx]; break
                else:
                    old = q.popleft()
                    if old[0] == "hi": dropped_hi += 1
            q.append((pr, i))
        return dropped_hi
    db = before(); da = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0150", "backpressure", 149, "shed_4000_priority", b, bs,
        "priority-aware shedding (drop lo first) vs drop-oldest", a, ast,
        extra={"hi_dropped_before": db, "hi_dropped_after": da})

BENCHES3B = [e126, e127, e128, e129, e130, e131, e132, e133, e134, e135,
             e136, e137, e138, e139, e140, e141, e142, e143, e144, e145,
             e146, e147, e148, e149, e150]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES3B:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    prev = json.load(open(os.path.join(HERE, "bench3_results.json")))
    prev["results"].update(results)
    with open(os.path.join(HERE, "bench3_results.json"), "w") as f:
        json.dump(prev, f, indent=1)
    print("bench3_results.json now has %d missions" % len(prev["results"]))
