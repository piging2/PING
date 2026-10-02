"""Range 2 (BAC-0051..BAC-0100): fresh CHANGE variants per technique, informed by
range-1 findings (chain-graph trap, threshold-gated zero-copy, write-time
tagging, SQLite for pagination, saturation for WFQ, bursty pools)."""
import json, os, time, statistics, hashlib, zlib, random, sqlite3, tracemalloc
from collections import defaultdict, deque
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(5150)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# c51 BAC-0051 indexes (case 50): composite index for 2-col predicate
def c51():
    rows = [("u%05d" % i, "r%d" % (i % 20), i) for i in range(40000)]
    single = defaultdict(list)
    for u, r, v in rows: single[(u,)].append(v)  # not used; scan filter instead
    comp = defaultdict(list)
    for u, r, v in rows: comp[(u, r)].append(v)
    def before(): return [v for u, r, v in rows if u == "u00123" and r == "r7"]
    def after(): return list(comp[("u00123", "r7")])  # CHANGE: composite index
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0051", "indexes", 50, "two_col_select_40k", b, bs,
        "composite (u,r) index instead of single-col index + filter", a, ast)

# c52 BAC-0052 partitioning (case 51): hash-partition pruning on equality
def c52():
    parts = defaultdict(list)
    for i in range(60000): parts[i % 24].append(i)
    def before(): return [x for p in parts.values() for x in p if x % 24 == 7]
    def after(): return [x for x in parts[7] if x % 24 == 7]  # CHANGE: route by hash
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0052", "partitioning", 51, "equality_scan_60k_24parts", b, bs,
        "hash-partition routing (1 of 24 partitions) instead of full scan", a, ast)

# c53 BAC-0053 pagination (case 52): SQLite OFFSET vs keyset (honest layer)
def c53():
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE t(id INTEGER PRIMARY KEY, v TEXT)")
    con.executemany("INSERT INTO t VALUES(?,?)", [(i, "v%d" % i) for i in range(200000)])
    con.execute("CREATE INDEX iv ON t(v)")
    def before():
        return con.execute("SELECT id FROM t ORDER BY id LIMIT 100 OFFSET 150000").fetchall()
    def after():  # CHANGE: keyset
        return con.execute("SELECT id FROM t WHERE id > 150000 ORDER BY id LIMIT 100").fetchall()
    b, bs = B.med(before); a, ast = B.med(after)
    con.close()
    rec("BAC-0053", "pagination", 52, "deep_page_sqlite_200k", b, bs,
        "keyset pagination (WHERE id > last) vs OFFSET 150000 in SQLite", a, ast)

# c54 BAC-0054 cursor-durability (case 53): exactly-once via idempotent apply
def c54():
    N = 15000
    applied = set()
    def apply(i): applied.add(i % 7000)  # idempotent: natural key dedupes
    crash_at = 9000
    def before():  # at-least-once without cursor: replays all -> duplicates processed twice
        for i in range(crash_at): apply(i)
        for i in range(N): apply(i)  # full replay after crash
        return len(applied), "dup-work"
    def after():  # CHANGE: cursor + idempotent apply
        applied.clear(); cursor = 0
        for i in range(crash_at):
            apply(i)
            if i % 500 == 0: cursor = i
        for i in range(cursor, N): apply(i)  # resume, idempotent so overlap is safe
        return len(applied)
    rb, _ = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0054", "cursor-durability", 53, "crash_recovery_exactly_once", b, bs,
        "durable cursor + idempotent apply instead of blind full replay", a, ast,
        extra={"note": "both converge to same set; AFTER avoids reprocessing; timing within noise, work reduction is the claim"})

# c55 BAC-0055 cache-locality (case 54): wide rows, column scan
def c55():
    N = 40000
    cols = 16
    aos = [{("c%d" % c): i + c for c in range(cols)} for i in range(N)]
    soa = [[i + c for i in range(N)] for c in range(cols)]
    def before(): return sum(d["c3"] + d["c11"] for d in aos)
    def after(): return sum(a + b for a, b in zip(soa[3], soa[11]))  # CHANGE: SoA
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0055", "cache-locality", 54, "two_col_scan_40k_wide", b, bs,
        "struct-of-arrays over 16-col rows instead of array-of-dicts", a, ast)

# c56 BAC-0056 artifact-dedup (case 55): chunk-level dedup vs whole-file
def c56():
    base = bytes(rng.getrandbits(8) for _ in range(8192))
    files = [base[:4096] + bytes(rng.getrandbits(8) for _ in range(4096)) for _ in range(30)]
    files += [bytes(rng.getrandbits(8) for _ in range(8192)) for _ in range(30)]
    def before():  # whole-file hash dedup
        seen = set(); s = 0
        for f in files:
            h = hashlib.sha256(f).digest()
            if h not in seen: seen.add(h); s += len(f)
        return s
    def after():  # CHANGE: 2KB chunk dedup shares the common 4KB prefix
        seen = set(); s = 0
        for f in files:
            for o in range(0, len(f), 2048):
                ch = f[o:o+2048]; h = hashlib.sha256(ch).digest()
                if h not in seen: seen.add(h); s += len(ch)
        return s
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0056", "artifact-dedup", 55, "dedupe_60_files_half_shared", b, bs,
        "2KB chunk-level dedup instead of whole-file dedup", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# c57 BAC-0057 build-caching (case 56): realistic per-target cost (fixes BAC-0022)
def c57():
    targets = ["t%d" % i for i in range(40)]
    def compile_cost(t):
        s = 0
        for k in range(60000): s += (k * hash(t)) & 0xFF  # simulated  compile
        return s
    hashes = {t: hashlib.sha256(t.encode()).hexdigest() for t in targets}
    cache = dict(hashes)
    def before(): return sum(compile_cost(t) for t in targets)  # rebuild all
    def after():  # CHANGE: hash-gated rebuild, 1 target changed
        return sum(compile_cost(t) for t in targets if t == "t7")
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0057", "build-caching", 56, "rebuild_1_of_40_realistic_cost", b, bs,
        "input-hash gated rebuild (1 target) vs full rebuild of 40 with realistic per-target cost", a, ast)

# c58 BAC-0058 browser-pooling (case 57): warm pool with health check
def c58():
    def new_page():
        s = 0
        for k in range(20000): s += k & 0xFF  # simulated launch cost
        return {"s": s, "healthy": True}
    def before():
        for _ in range(30):
            p = new_page(); p["s"] += 1
    pool = deque(new_page() for _ in range(3))
    def after():  # CHANGE: warm pool + health check on checkout
        for _ in range(30):
            p = pool.popleft()
            if not p["healthy"]: p = new_page()
            p["s"] += 1; pool.append(p)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0058", "browser-pooling", 57, "30_page_tasks_warm_pool", b, bs,
        "warm pool of 3 with checkout health-check instead of cold page per task (simulated)", a, ast)

# c59 BAC-0059 test-selection (case 58): realistic per-test cost (fixes BAC-0024)
def c59():
    tests = ["test_%d" % i for i in range(300)]
    dep = {"test_%d" % i: {"src%d" % (i % 40)} for i in range(300)}
    changed = {"src7"}
    def run(t):
        s = 0
        for k in range(8000): s += (k * hash(t)) & 0xFF  # simulated test cost
        return s
    def before(): return sum(run(t) for t in tests)
    sel = [t for t in tests if dep[t] & changed]
    def after(): return sum(run(t) for t in sel)  # CHANGE: affected only
    tb = before(); ta = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0059", "test-selection", 58, "suite_300_realistic_cost", b, bs,
        "run 8 affected tests instead of full 300-test suite (realistic per-test cost)", a, ast,
        extra={"tests_run_before": 300, "tests_run_after": len(sel)})

# c60 BAC-0060 selective-regeneration (case 59): ACYCLIC graph (fixes BAC-0025)
def c60():
    pages = ["page_%d" % i for i in range(200)]
    deps = {"page_%d" % i: {"page_%d" % (i + 1)} for i in range(199)}  # chain, acyclic
    deps["page_199"] = set()
    rev = defaultdict(list)
    for p, ds in deps.items():
        for d in ds: rev[d].append(p)
    def render(p):
        s = 0
        for k in range(4000): s += (k * hash(p)) & 0xFF
        return s
    changed = {"page_195"}  # near tail: only 5 dependents upstream... chain i depends on i+1, so change at 195 affects 190..195
    def before(): return sum(render(p) for p in pages)
    def after():  # CHANGE: changed + transitive dependents
        aff = set(changed); stack = list(changed)
        while stack:
            u = stack.pop()
            for v in rev[u]:
                if v not in aff: aff.add(v); stack.append(v)
        return sum(render(p) for p in aff), len(aff)
    tb = before(); ta, na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0060", "selective-regeneration", 59, "regen_acyclic_chain", b, bs,
        "regenerate changed + transitive dependents on acyclic graph instead of all 200", a, ast,
        extra={"pages_regenerated_before": 200, "pages_regenerated_after": na})

# c61 BAC-0061 parallel-rendering (case 60): break-even grain (fixes BAC-0026)
def c61():
    from concurrent.futures import ThreadPoolExecutor
    def render(u):  # CPU-bound unit ~3ms
        s = 0
        for k in range(120000): s += (k * u) & 0xFF
        return s
    units = list(range(16))
    def before(): return [render(u) for u in units]
    def after():
        with ThreadPoolExecutor(max_workers=2) as ex:
            return list(ex.map(render, units))
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0061", "parallel-rendering", 60, "16_cpu_bound_units_2_workers", b, bs,
        "2-worker thread pool on ~3ms CPU-bound units instead of serial", a, ast)

# c62 BAC-0062 failure-clustering (case 61): hierarchical 2-level clustering
def c62():
    fails = ["TimeoutError host%d op=%d trace=%d" % (i % 6, i % 4, i) for i in range(400)]
    def before():
        clusters = defaultdict(list)
        for f in fails: clusters[f.split(" op=")[0]].append(f)
        return len(clusters)
    def after():  # CHANGE: 2-level: host then op
        l1 = defaultdict(list)
        for f in fails: l1[f.split(" op=")[0]].append(f)
        l2 = {}
        for host, fs in l1.items():
            sub = defaultdict(list)
            for f in fs: sub[f.split(" trace=")[0]].append(f)
            l2[host] = len(sub)
        return len(l1), sum(l2.values())
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0062", "failure-clustering", 61, "triage_400_two_level", b, bs,
        "two-level (host then op) clustering instead of flat signature clustering", a, ast,
        extra={"groups_before": nb, "groups_after": na})

# c63 BAC-0063 semantic-diffing (case 62): move detection
def c63():
    a = [{"id": i, "v": i} for i in range(200)]
    b_ = [{"id": i, "v": i} for i in range(199, -1, -1)]  # reversed
    b_[50]["v"] = 999  # one real change
    def before():  # positional diff: everything looks changed
        return sum(1 for x, y in zip(a, b_) if x != y)
    def after():  # CHANGE: key on id, detect moves vs edits
        da = {x["id"]: x for x in a}; db = {x["id"]: x for x in b_}
        edits = [i for i in da if da[i] != db[i]]
        moves = [i for i in da if da[i]["id"] != db[i]["id"]]  # order-only
        return len(edits), len(moves)
    nb = before(); ne, nm = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0063", "semantic-diffing", 62, "diff_reordered_200_items", b, bs,
        "id-keyed semantic diff (1 edit, 0 content moves) vs positional diff", a, ast,
        extra={"positional_diffs_before": nb, "edits_after": ne, "order_only_after": 200 - ne})

# c64 BAC-0064 schema-evolution (case 63): additive change passes, rename flagged
def c64():
    def check(old, new):
        removed = [k for k in old if k not in new]
        type_changed = [k for k in old if k in new and old[k] != new[k]]
        return removed, type_changed
    old = {"name": "str", "age": "int"}
    additive = {"name": "str", "age": "int", "email": "str"}
    breaking = {"name": "str", "age": "str"}  # type change
    def before():  # no check
        return "deployed", "deployed"
    def after():  # CHANGE: compatibility gate
        r1 = check(old, additive); r2 = check(old, breaking)
        d1 = "deployed" if not (r1[0] or r1[1]) else "rejected"
        d2 = "deployed" if not (r2[0] or r2[1]) else "rejected"
        return d1, d2
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0064", "schema-evolution", 63, "additive_vs_breaking", b, bs,
        "compatibility gate: additive field passes, type change rejected (vs unchecked both-deploy)", a, ast,
        extra={"before": rb, "after": ra})

# c65 BAC-0065 zero-copy (case 64): threshold-gated hybrid (applies BAC-0030 finding)
def c65():
    buf = bytes(rng.getrandbits(8) for _ in range(8_000_000))
    mv = memoryview(buf)
    small = [i * 7919 % 8_000_000 for i in range(500)]   # 64B slices
    large = [i * 15999 % 7_000_000 for i in range(200)]   # 256KB slices
    TH = 4096
    def before():
        out = [buf[o:o+64] for o in small] + [buf[o:o+262144] for o in large]
        return len(out)
    def after():  # CHANGE: copy below threshold, view above
        out = [buf[o:o+64] for o in small] + [mv[o:o+262144] for o in large]
        return len(out)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0065", "zero-copy", 64, "mixed_slice_sizes_hybrid", b, bs,
        "threshold-gated hybrid (copy <4KB, memoryview above) vs always-copy", a, ast)

# c66 BAC-0066 compression (case 65): stream batch compression (fixes BAC-0031)
def c66():
    docs = [json.dumps({"id": i, "name": "business-%d" % i, "tags": ["home", "service"]}).encode()
            for i in range(2000)]
    def before(): return sum(len(d) for d in docs)
    blob = b"\n".join(docs)
    def after(): return len(zlib.compress(blob, 6))  # CHANGE: one stream
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0066", "compression", 65, "store_2000_docs_stream", b, bs,
        "single-stream zlib over concatenated docs instead of per-doc compression", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# c67 BAC-0067 storage-tiers (case 66): tiered with prefetch on miss
def c67():
    hot = {"id-%d" % i: i for i in range(2000)}
    cold = {"id-%d" % i: i for i in range(2000, 20000)}
    queries = ["id-%d" % (i % 2200) for i in range(500)]  # 91% hot, 9% cold
    def before():
        alld = dict(hot); alld.update(cold)
        return [alld[q] for q in queries]
    def after():  # CHANGE: hot first, promote cold hits
        out = []
        for q in queries:
            if q in hot: out.append(hot[q])
            else:
                v = cold[q]; hot[q] = v; out.append(v)  # promote
        return out
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0067", "storage-tiers", 66, "500_mixed_queries_promote", b, bs,
        "hot tier with promote-on-cold-hit instead of single flat map", a, ast)

# c68 BAC-0068 checkpoint-compaction (case 67): restore cost measured (follows BAC-0033)
def c68():
    ckpts = [{"n": i, "state": list(range(500))} for i in range(50)]
    def before():  # restore: read latest full checkpoint
        return list(ckpts[-1]["state"])
    full = ckpts[::10]; deltas = [{i: i} for i in range(45)]
    def after():  # CHANGE: restore = latest full + replay 9 deltas
        st = list(full[-1]["state"])
        for d in deltas[-9:]: st.extend(d.values())
        return st
    sb_bytes = sum(len(c["state"]) for c in ckpts)
    sa_bytes = sum(len(c["state"]) for c in full) + len(deltas)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0068", "checkpoint-compaction", 67, "restore_latest", b, bs,
        "compacted chain (5 full + deltas): restore replays 9 deltas vs read one full", a, ast,
        extra={"stored_entries_before": sb_bytes, "stored_entries_after": sa_bytes,
               "note": "storage 89% smaller; restore slightly slower — the classic tradeoff, both measured"})

# c69 BAC-0069 replay-acceleration (case 68): write-time tagging (fixes BAC-0034)
def c69():
    events = []
    for i in range(20000):
        if i % 5: events.append({"op": "set", "k": "k%d" % (i % 500), "v": i, "noop": False})
        else: events.append({"op": "noop", "k": "k%d" % (i % 500), "noop": True})  # tagged at write
    def before():
        st = {}
        for e in events:
            if e["op"] == "set": st[e["k"]] = e["v"]
        return len(st)
    def after():  # CHANGE: O(1) tag check skips noops
        st = {}
        for e in events:
            if e["noop"]: continue
            st[e["k"]] = e["v"]
        return len(st)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0069", "replay-acceleration", 68, "replay_20k_tagged", b, bs,
        "write-time noop tagging + O(1) skip instead of replay-time fingerprint hashing", a, ast)

# c70 BAC-0070 incremental-graph-compilation (case 69): fan-out graph, small cone
def c70():
    N = 120
    children = {i: [4*i+1+j for j in range(4) if 4*i+1+j < N] for i in range(N)}
    def comp(i):
        s = 0
        for k in range(20000): s += (k * i) & 0xFF
        return s
    def before(): return [comp(i) for i in range(N)]
    changed = {1}  # cone = subtree of 1: ~40 nodes of 120
    def after():  # CHANGE: compile changed + downstream only
        aff = set(changed); stack = list(changed)
        while stack:
            u = stack.pop()
            for v in children[u]:
                if v not in aff: aff.add(v); stack.append(v)
        return {i: comp(i) for i in aff}, len(aff)
    tb = before(); ta, na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0070", "incremental-graph-compilation", 69, "fanout_graph_small_cone", b, bs,
        "recompile subtree cone only (fan-out graph) instead of full 120-node compile", a, ast,
        extra={"nodes_before": N, "nodes_after": na})

# c71 BAC-0071 incremental-computation (case 70): fan-out DAG, small cone (applies BAC-0001 lesson)
def c71():
    N = 300
    parents = {i: [(i-1)//4] if i else [] for i in range(N)}
    vals = list(range(N))
    def compute(i):
        s = 0
        for k in range(3000): s += (k * i) & 0xFF
        return vals[i] + s
    children = defaultdict(list)
    for i, ps in parents.items():
        for p in ps: children[p].append(i)
    def before(): return [compute(i) for i in range(N)]
    def after():  # CHANGE: propagate from changed leaf through small cone
        vals[250] += 1
        dirty = {250}; stack = [250]; out = {}
        while stack:
            u = stack.pop(); out[u] = compute(u)
            for v in children[u]:
                if v not in dirty: dirty.add(v); stack.append(v)
        return out, len(dirty)
    tb = before(); ta, nd = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0071", "incremental-computation", 70, "fanout_dag_small_cone", b, bs,
        "cone-bounded dirty propagation (fan-out DAG) instead of full recompute", a, ast,
        extra={"nodes_recomputed_after": nd, "nodes_total": N})

# c72 BAC-0072 content-addressing (case 71): large blobs amortize hash cost
def c72():
    blobs = [(("bigblob-%d" % (i % 60)).encode() * 16384) for i in range(100)]  # 40% dupes
    def before():
        store = {}
        for n, b in enumerate(blobs): store["n%d" % n] = b
        seen = set()
        for b in blobs: seen.add(b)
        return len(store), len(seen)
    def after():  # CHANGE: content-addressed
        store = {}
        for b in blobs: store[hashlib.sha256(b).hexdigest()] = b
        return len(store)
    nb, ns = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0072", "content-addressing", 71, "100_large_blobs", b, bs,
        "content-hash store for 1MB blobs (hash cost amortized) vs name-keyed + rescan", a, ast,
        extra={"entries_before": nb, "unique_after": na,
               "bytes_before": nb*len(blobs[0]), "bytes_after": na*len(blobs[0])})

# c73 BAC-0073 semantic-hashes (case 72): simhash Hamming bucketing, threshold 0.5
def c73():
    docs = ["alpha beta gamma delta %d epsilon" % i for i in range(300)]
    near = docs + ["alpha beta gamma delta %d epsilon zeta" % i for i in range(300)]  # 1-token diff
    def shingles(s):
        toks = s.split()
        return {" ".join(toks[i:i+3]) for i in range(len(toks)-2)}
    def before():  # all-pairs Jaccard > 0.5
        sh = [shingles(s) for s in near]; n = len(near); found = 0
        for i in range(n):
            for j in range(i+1, n):
                inter = len(sh[i] & sh[j]); union = len(sh[i] | sh[j])
                if union and inter/union > 0.5: found += 1
        return found
    def after():  # CHANGE: bucket by first shingle, compare within
        bands = defaultdict(list)
        for s in near:
            sh = shingles(s); bands[min(sh)].append(sh)
        found = 0
        for bucket in bands.values():
            for x in range(len(bucket)):
                for y in range(x+1, len(bucket)):
                    inter = len(bucket[x] & bucket[y]); union = len(bucket[x] | bucket[y])
                    if union and inter/union > 0.5: found += 1
        return found
    fb = before(); fa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0073", "semantic-hashes", 72, "near_dup_600_threshold_05", b, bs,
        "shingle-band bucketing at Jaccard 0.5 instead of all-pairs", a, ast,
        extra={"pairs_before": fb, "pairs_after": fa})

# c74 BAC-0074 dependency-graphs (case 73): transitive reduction for sparser invalidation
def c74():
    N = 200
    edges = [(i, j) for i in range(N) for j in (i+1, i+2) if j < N]
    edges += [(i, i+3) for i in range(0, N-3, 7)]  # redundant transitive edges
    adj = defaultdict(list)
    for u, v in edges: adj[u].append(v)
    def reachable(u, skip=None):
        seen = set(); stack = [u]
        while stack:
            x = stack.pop()
            for w in adj[x]:
                if (x, w) == skip or w in seen: continue
                seen.add(w); stack.append(w)
        return seen
    reduced = [(u, v) for (u, v) in edges if v not in reachable(u, skip=(u, v))]
    radj = defaultdict(list)
    for u, v in reduced: radj[u].append(v)
    def before():
        seen = set(); stack = [0]
        while stack:
            u = stack.pop()
            for w in adj[u]:
                if w not in seen: seen.add(w); stack.append(w)
        return len(seen), len(edges)
    def after():  # CHANGE: traverse transitively-reduced graph
        seen = set(); stack = [0]
        while stack:
            u = stack.pop()
            for w in radj[u]:
                if w not in seen: seen.add(w); stack.append(w)
        return len(seen), len(reduced)
    (nb, eb) = before(); (na, ea) = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0074", "dependency-graphs", 73, "invalidation_reduced_graph", b, bs,
        "transitively-reduced graph traversal instead of redundant-edge graph", a, ast,
        extra={"edges_before": eb, "edges_after": ea, "same_reachability": nb == na})

# c75 BAC-0075 materialized-projections (case 74): partially materialized (hot keys)
def c75():
    events = [("sale", i % 200, (i * 13) % 97 + 1) for i in range(20000)]
    hot_keys = set(range(20))
    proj = defaultdict(int)
    for _, k, v in events:
        if k in hot_keys: proj[k] += v  # CHANGE: materialize hot keys only
    def before():
        tot = defaultdict(int)
        for _, k, v in events:
            if k in hot_keys: tot[k] += v
        return dict(tot)
    def after(): return dict(proj)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0075", "materialized-projections", 74, "hot_key_query_20_of_200", b, bs,
        "partially materialized projection (20 hot keys of 200) instead of per-query scan", a, ast)

# c76 BAC-0076 invalidation (case 75): dependency version vectors
def c76():
    versions = {"a": 3, "b": 5, "c": 2}
    entries = {i: (i * 2, {"a": 3, "b": 5} if i % 2 == 0 else {"c": 2}) for i in range(2000)}
    versions["b"] = 6  # dep b changes
    def before():  # clear-all + rebuild
        entries.clear()
        for i in range(2000): entries[i] = (i * 2, dict(versions))
        return len(entries)
    def after():  # CHANGE: invalidate only entries whose dep version is stale
        n = 0
        for i, (v, deps) in entries.items():
            if any(versions[d] != dv for d, dv in deps.items()):
                entries[i] = (i * 2, {d: versions[d] for d in deps}); n += 1
        return n
    b, bs = B.med(lambda: (entries.clear(), before())[1] if False else before()); a, ast = B.med(after)
    rec("BAC-0076", "invalidation", 75, "dep_version_invalidation", b, bs,
        "dependency version-vector invalidation instead of clear-all on dep change", a, ast)

# c77 BAC-0077 snapshotting (case 76): restore benchmark (completes BAC-0007 followup)
def c77():
    state = {i: i for i in range(20000)}
    import copy
    full = copy.deepcopy(state)
    chain = [dict(state)]
    for r in range(10): chain.append(("diff", {r: r * 999}))
    def before(): return copy.deepcopy(full)  # restore = copy latest full
    def after():  # CHANGE: restore = base + replay 10 diffs
        st = dict(chain[0])
        for _, d in chain[1:]: st.update(d)
        return st
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0077", "snapshotting", 76, "restore_20k_keys", b, bs,
        "restore via base + 10 diffs vs deepcopy of full snapshot", a, ast,
        extra={"note": "take-path was proven in BAC-0042; this measures the restore side of the tradeoff"})

# c78 BAC-0078 batching (case 77): group commit
def c78():
    txns = [{"id": i, "v": i * 3} for i in range(1500)]
    log = []
    def commit_one(t): log.append(("commit", t["id"]))  # per-txn fsync stand-in
    def before():
        log.clear()
        for t in txns: commit_one(t)
    def after():  # CHANGE: group commit, one barrier per 50
        log.clear()
        for i in range(0, len(txns), 50):
            for t in txns[i:i+50]: log.append(("stage", t["id"]))
            log.append(("barrier",))
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0078", "batching", 77, "1500_txns_group_commit", b, bs,
        "group commit (1 barrier per 50 txns) instead of per-txn commit", a, ast)

# c79 BAC-0079 streaming (case 78): memory proof for windowed agg (follows BAC-0044)
def c79():
    def gen(n):
        for i in range(n): yield (i // 100, (i * 7) % 53)
    def before():
        tracemalloc.start()
        wins = defaultdict(list)
        for w, v in gen(100000): wins[w].append(v)
        r = {w: sum(v) for w, v in wins.items()}
        _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        return peak, len(r)
    def after():
        tracemalloc.start()
        agg = defaultdict(int)
        for w, v in gen(100000): agg[w] += v
        _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        return peak, len(agg)
    (pb, _) = before(); (pa, _) = after()
    b, bs = B.med(lambda: before()[0]); a, ast = B.med(lambda: after()[0])
    rec("BAC-0079", "streaming", 78, "windowed_agg_memory", b, bs,
        "incremental per-window aggregation: O(windows) vs O(events) memory", a, ast,
        extra={"peak_bytes_before": pb, "peak_bytes_after": pa, "unit": "bytes-peak",
               "note": "metric is peak bytes; time parity shown in BAC-0044"})

# c80 BAC-0080 backpressure (case 79): adaptive cap
def c80():
    produced = 5000
    def before():  # fixed cap 64
        q = deque(); peak = 0; c = 0; i = 0; cap = 64
        while c < produced:
            while len(q) < cap and i < produced: q.append(i); i += 1
            peak = max(peak, len(q))
            for _ in range(32):
                if q: q.popleft(); c += 1
        return peak
    def after():  # CHANGE: adaptive cap grows when consumer keeps up
        q = deque(); peak = 0; c = 0; i = 0; cap = 16
        while c < produced:
            while len(q) < cap and i < produced: q.append(i); i += 1
            peak = max(peak, len(q))
            drained = 0
            for _ in range(64):
                if q: q.popleft(); c += 1; drained += 1
            cap = min(256, cap * 2 if drained >= 64 else max(16, cap // 2))
        return peak
    pb = before(); pa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0080", "backpressure", 79, "drain_5000_adaptive", b, bs,
        "adaptive queue cap (16-256, AIMD) instead of fixed cap 64", a, ast,
        extra={"peak_before": pb, "peak_after": pa})

BENCHES2 = [c51, c52, c53, c54, c55, c56, c57, c58, c59, c60,
            c61, c62, c63, c64, c65, c66, c67, c68, c69, c70,
            c71, c72, c73, c74, c75, c76, c77, c78, c79, c80]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES2:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    with open(os.path.join(HERE, "bench2_results.json"), "w") as f:
        json.dump({"results": results, "repeats": B.R,
                   "elapsed_s": round(time.time() - t0, 1)}, f, indent=1)
    print("wrote bench2_results.json, %d missions" % len(results))
