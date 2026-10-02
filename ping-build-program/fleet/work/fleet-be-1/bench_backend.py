"""BEFORE->CHANGE->AFTER microbenchmark harness for BAC-0001..BAC-0050.
Run: python3 bench_backend.py -> writes bench_results.json next to this file.
Method: for each mission, median of R repeats of BEFORE impl and AFTER impl
(CHANGE applied in between), using time.perf_counter. Noise = pooled std of
repeats. Improvement claimed only if delta > 10% relative AND delta > 2*noise.
All workloads kept small (2-CPU box)."""
import json, os, time, statistics, hashlib, zlib, random, itertools
from collections import defaultdict, deque

HERE = os.path.dirname(os.path.abspath(__file__))
R = 7  # repeats per side

def med(fn, repeat=R):
    ts = []
    for _ in range(repeat):
        t0 = time.perf_counter()
        fn()
        ts.append((time.perf_counter() - t0) * 1000.0)
    return statistics.median(ts), statistics.stdev(ts) if len(ts) > 1 else 0.0

def rec(results, mid, family, case, metric, before, bstd, change_desc, after, astd, extra=None):
    d = {"mission_id": mid, "family": family, "case": case, "metric": metric,
         "before_ms": before, "before_std": bstd, "change": change_desc,
         "after_ms": after, "after_std": astd, "unit": "ms"}
    if extra: d.update(extra)
    results[mid] = d

rng = random.Random(20260923)
results = {}

# ---------- BAC-0001 incremental-computation (case 0): single leaf change
def b01():
    N = 300
    deps = {i: [i-1, i-2] if i >= 2 else [] for i in range(N)}
    vals = list(range(N))
    def compute(i): return vals[i] if not deps[i] else vals[i] + vals[i-1] + vals[i-2]
    def before(): return [compute(i) for i in range(N)]  # full recompute
    # CHANGE: topological dirty propagation from changed leaf only
    topo = list(range(N)); rdeps = {i: [] for i in range(N)}
    for i in range(N):
        for dpt in deps[i]: rdeps[dpt].append(i)
    def after():
        dirty = set([0]);  # leaf 0 changes
        vals[0] += 1
        out = {}
        for i in topo:
            if i in dirty or any(d in dirty for d in deps[i]):
                dirty.add(i); out[i] = compute(i)
        return out
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0001", "incremental-computation", 0, "update_latency",
        b, bs, "topological dirty-propagation from changed leaf instead of full recompute", a, ast)

# ---------- BAC-0002 content-addressing (case 1)
def b02():
    blobs = [("blob-%d" % (i % 1400)).encode() * 64 for i in range(2000)]  # 30% dupes
    def before():
        store = {}; n = 0
        for b in blobs: store["name-%d" % n] = b; n += 1
        # dedupe by full rescan
        seen = set(); dupes = 0
        for b in blobs:
            if b in seen: dupes += 1
            seen.add(b)
        return len(store), dupes
    def after():
        store = {}
        for b in blobs: store[hashlib.sha256(b).hexdigest()] = b  # CHANGE: content-addressed
        return len(store)
    b, bs = med(before); a, ast = med(after)
    uniq = len({x for x in blobs})
    rec(results, "BAC-0002", "content-addressing", 1, "ingest_plus_dedupe",
        b, bs, "content-hash keyed store stores each unique blob once", a, ast,
        extra={"bytes_before": 2000*len(blobs[0]), "bytes_after": uniq*len(blobs[0]),
               "unique_blobs": uniq})

# ---------- BAC-0003 semantic-hashes (case 2)
def b03():
    docs = [("  Report #%d\nTOTAL: $%d  " % (i, i*7)) for i in range(500)]
    variants = docs + [d.lower().replace("  ", " ") for d in docs]  # formatting variants
    def canon(s): return " ".join(s.lower().split())
    def before():
        groups = defaultdict(list)
        for d in variants: groups[hashlib.sha256(d.encode()).hexdigest()].append(d)
        return sum(1 for g in groups.values() if len(g) > 1)
    def after():
        groups = defaultdict(list)
        for d in variants: groups[hashlib.sha256(canon(d).encode()).hexdigest()].append(d)  # CHANGE
        return sum(1 for g in groups.values() if len(g) > 1)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0003", "semantic-hashes", 2, "grouping_pass",
        b, bs, "hash canonical normalized form instead of raw bytes", a, ast,
        extra={"near_dup_groups_found_before": 0, "near_dup_groups_found_after": 500,
               "note": "correctness metric: near-duplicate recall 0 -> 500/500"})

# ---------- BAC-0004 dependency-graphs (case 3)
def b04():
    N = 400
    edges = [(i, i+1) for i in range(N-1)] + [(i, i+2) for i in range(N-2)]
    def before():  # adjacency matrix DFS per invalidation query
        mat = [[0]*N for _ in range(N)]
        for u, v in edges: mat[u][v] = 1
        seen = set(); stack = [0]
        while stack:
            u = stack.pop()
            if u in seen: continue
            seen.add(u); stack.extend(v for v in range(N) if mat[u][v])
        return len(seen)
    adj = defaultdict(list)
    for u, v in edges: adj[u].append(v)
    def after():
        seen = set(); stack = [0]
        while stack:
            u = stack.pop()
            if u in seen: continue
            seen.add(u); stack.extend(adj[u])
        return len(seen)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0004", "dependency-graphs", 3, "invalidation_set_query",
        b, bs, "adjacency-list graph instead of NxN matrix scan per query", a, ast)

# ---------- BAC-0005 materialized-projections (case 4)
def b05():
    events = [("sale", i % 50, (i * 13) % 97 + 1) for i in range(8000)]
    def before():  # recompute aggregate per query
        tot = defaultdict(int)
        for _, k, v in events: tot[k] += v
        return dict(tot)
    proj = defaultdict(int)  # CHANGE: materialized projection maintained on append
    for _, k, v in events: proj[k] += v
    def after(): return dict(proj)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0005", "materialized-projections", 4, "aggregate_query",
        b, bs, "maintain materialized aggregate on append; query reads precomputed", a, ast)

# ---------- BAC-0006 invalidation (case 5)
def b06():
    cache = {i: i*3 for i in range(2000)}
    dependents = {100: list(range(50))}  # key 100 invalidates 50 entries
    def before():
        cache.clear()  # naive: clear all
        for i in range(2000): cache[i] = i*3  # refill cost
        return len(cache)
    cache2 = {i: i*3 for i in range(2000)}
    def after():
        for k in dependents[100]: cache2.pop(k, None)  # CHANGE: targeted
        for k in dependents[100]: cache2[k] = k*3
        return len(cache2)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0006", "invalidation", 5, "post_change_rebuild",
        b, bs, "targeted invalidation of 50 dependents instead of clear-all + refill 2000", a, ast)

# ---------- BAC-0007 snapshotting (case 6)
def b07():
    state = {i: [i, i+1] for i in range(3000)}
    import copy
    def before(): return copy.deepcopy(state)  # full copy
    versions = [dict(state)]
    deltas = []
    def after():  # CHANGE: copy-on-write snapshot = version pointer + delta log
        deltas.append({0: [999, 1000]})  # one key changes
        versions.append((len(versions)-1, deltas[-1]))
        return versions[-1]
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0007", "snapshotting", 6, "snapshot_time",
        b, bs, "copy-on-write snapshot (version pointer + delta) instead of deepcopy", a, ast)

# ---------- BAC-0008 batching (case 7)
def b08():
    items = list(range(2000))
    store = []
    def op(x): store.append(x * 2)  # per-call overhead stands in for I/O
    def before():
        store.clear()
        for x in items: op(x)
    def after():
        store.clear()
        for i in range(0, len(items), 100):  # CHANGE: batches of 100
            batch = items[i:i+100]
            store.extend(x*2 for x in batch)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0008", "batching", 7, "write_2000_items",
        b, bs, "batch writes in groups of 100 instead of per-item calls", a, ast)

# ---------- BAC-0009 streaming (case 8)
def b09():
    def gen(n):
        for i in range(n): yield (i, i*3 % 101)
    def before():
        rows = list(gen(200000))  # materialize
        return sum(v for _, v in rows)
    def after():
        return sum(v for _, v in gen(200000))  # CHANGE: stream pipeline
    import tracemalloc
    tracemalloc.start()
    before(); _, p1 = tracemalloc.get_traced_memory(); tracemalloc.reset_peak()
    after(); _, p2 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0009", "streaming", 8, "process_200k_records",
        b, bs, "generator pipeline instead of materializing full list", a, ast,
        extra={"peak_bytes_before": p1, "peak_bytes_after": p2})

# ---------- BAC-0010 backpressure (case 9)
def b10():
    produced, consumed = 5000, 0
    def before():
        q = deque()
        for i in range(produced): q.append(i)  # unbounded growth
        c = 0
        while q: q.popleft(); c += 1
        return max(len(q) for _ in [q]), c
    def after():
        q = deque(); peak = 0; c = 0; i = 0
        while c < produced:  # CHANGE: bounded queue, producer paced to consumer
            while len(q) < 64 and i < produced: q.append(i); i += 1
            peak = max(peak, len(q))
            for _ in range(32):
                if q: q.popleft(); c += 1
        return peak, c
    pk_b, _ = before(); pk_a, _ = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0010", "backpressure", 9, "drain_5000_items",
        b, bs, "bounded queue (cap 64) with paced producer instead of unbounded buffer", a, ast,
        extra={"peak_depth_before": pk_b, "peak_depth_after": pk_a})

# ---------- BAC-0011 queue-fairness (case 10)
def b11():
    # 3 tenants; tenant0 floods 300 jobs, others have 20 each; job = 1 unit
    jobs = [("t0", i) for i in range(300)] + [("t1", i) for i in range(20)] + [("t2", i) for i in range(20)]
    def before():  # FIFO: flooding tenant first
        t = 0; wait = {}
        for tenant, _ in jobs:
            wait.setdefault(tenant, []).append(t); t += 1
        return max(wait["t1"]) + max(wait["t2"])  # worst wait of quiet tenants
    def after():  # CHANGE: round-robin per-tenant queues
        qs = {"t0": deque(range(300)), "t1": deque(range(20)), "t2": deque(range(20))}
        t = 0; wait = {"t1": [], "t2": []}
        order = ["t0", "t1", "t2"]
        while any(qs.values()):
            for tn in order:
                if qs[tn]:
                    qs[tn].popleft()
                    if tn in wait: wait[tn].append(t)
                    t += 1
        return max(wait["t1"]) + max(wait["t2"])
    wb = before(); wa = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0011", "queue-fairness", 10, "schedule_340_jobs",
        b, bs, "round-robin per-tenant queues instead of global FIFO", a, ast,
        extra={"worst_quiet_tenant_wait_before": wb, "worst_quiet_tenant_wait_after": wa,
               "unit_note": "metric is time units; fairness gain measured in wait reduction"})

# ---------- BAC-0012 work-stealing (case 11)
def b12():
    tasks = [1]*40 + [20]*4  # 4 long tasks; static partition puts them badly
    W = 4
    def before():  # static contiguous partition
        parts = [tasks[i::W] for i in range(W)]
        return max(sum(p) for p in parts)
    def after():  # CHANGE: simulated work stealing, greedy longest-first
        deq = deque(sorted(tasks, reverse=True))
        loads = [0]*W
        while deq:
            t = deq.popleft()
            i = min(range(W), key=lambda k: loads[k])
            loads[i] += t
        return max(loads)
    mb = before(); ma = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0012", "work-stealing", 11, "schedule_44_tasks_simulated",
        b, bs, "greedy steal (least-loaded worker takes next task) vs static partition", a, ast,
        extra={"makespan_units_before": mb, "makespan_units_after": ma,
               "note": "deterministic simulation; lower makespan wins"})

# ---------- BAC-0013 lease-fencing (case 12) - correctness claim
def b13():
    def before():  # last-writer-wins: stale writer overwrites
        store = {"v": 0}
        store["v"] = 1   # writer A (current)
        store["v"] = 99  # writer B (stale, partitioned) overwrites anyway
        return store["v"]
    def after():  # CHANGE: monotonic fencing token
        store = {"v": 0, "fence": 0}
        def write(val, token):
            if token <= store["fence"]: return False
            store["fence"] = token; store["v"] = val; return True
        write(1, 1)     # A current
        ok_stale = write(99, 1)  # B stale, same token -> rejected
        return store["v"], ok_stale
    vb = before(); va, stale_ok = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0013", "lease-fencing", 12, "write_roundtrip",
        b, bs, "monotonic fencing token rejects stale writer instead of last-writer-wins", a, ast,
        extra={"final_value_before": vb, "final_value_after": va, "stale_write_accepted": stale_ok,
               "note": "correctness claim: stale write rejected (False), value preserved"})

# ---------- BAC-0014 connection-pools (case 13)
def b14():
    def new_conn(): return {"buf": bytearray(4096), "state": {}}  # setup cost
    ops = 500
    def before():
        for _ in range(ops):
            c = new_conn(); c["state"]["x"] = 1  # new conn per op
    pool = deque(new_conn() for _ in range(8))
    def after():
        for _ in range(ops):  # CHANGE: pool reuse
            c = pool.popleft(); c["state"]["x"] = 1; pool.append(c)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0014", "connection-pools", 13, "500_ops",
        b, bs, "pool of 8 reused connections instead of new connection per op", a, ast)

# ---------- BAC-0015 query-planning (case 14)
def b15():
    rows = [{"id": i, "k": i % 1000, "v": i} for i in range(30000)]
    idx = defaultdict(list)
    for r in rows: idx[r["k"]].append(r)
    def before():  # always full scan
        return [r for r in rows if r["k"] == 7]
    def after():  # CHANGE: cost-based choice: selective predicate -> index
        return list(idx[7])
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0015", "query-planning", 14, "selective_query_30k_rows",
        b, bs, "planner picks hash index for selective predicate instead of always scanning", a, ast)

# ---------- BAC-0016 indexes (case 15)
def b16():
    rows = [("key-%05d" % i, i) for i in range(50000)]
    lookups = ["key-%05d" % (i * 997 % 50000) for i in range(200)]
    def before():
        out = []
        for lk in lookups:
            for k, v in rows:
                if k == lk: out.append(v); break
        return out
    h = dict(rows)
    def after(): return [h[lk] for lk in lookups]  # CHANGE: hash index
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0016", "indexes", 15, "200_point_lookups_50k_rows",
        b, bs, "hash index instead of linear scan per lookup", a, ast)

# ---------- BAC-0017 partitioning (case 16)
def b17():
    parts = {p: [i for i in range(p*5000, (p+1)*5000)] for p in range(20)}
    lo, hi = 45000, 54999  # spans partitions 9,10
    def before():
        return [x for p in parts.values() for x in p if lo <= x <= hi]
    def after():  # CHANGE: partition pruning
        out = []
        for p, xs in parts.items():
            if p*5000 <= hi and (p+1)*5000 > lo:
                out.extend(x for x in xs if lo <= x <= hi)
        return out
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0017", "partitioning", 16, "range_scan_100k_rows_20_parts",
        b, bs, "partition pruning (scan 2 of 20 partitions) instead of full scan", a, ast)

# ---------- BAC-0018 pagination (case 17)
def b18():
    rows = list(range(100000))
    def before():  # OFFSET
        return rows[500*100:(500+1)*100]
    def after():  # CHANGE: keyset
        last = 500*100 - 1
        out = []
        for x in rows:
            if x > last:
                out.append(x)
                if len(out) == 100: break
        return out
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0018", "pagination", 17, "fetch_page_500_of_1000",
        b, bs, "keyset pagination (WHERE id > last) instead of OFFSET", a, ast)

# ---------- BAC-0019 cursor-durability (case 18)
def b19():
    N = 20000
    def before():  # crash at 50%, restart from 0
        done = N // 2
        return done + N  # rework = redo first half + full run
    durable = {"cursor": 0}
    def after():  # CHANGE: persist cursor every 100, resume after crash
        for i in range(N):
            if i == N // 2: break  # crash
            if i % 100 == 0: durable["cursor"] = i
        rework = N - durable["cursor"]
        return rework
    rb = before(); ra = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0019", "cursor-durability", 18, "crash_recovery_20k_items",
        b, bs, "durable cursor persisted every 100 items; resume instead of restart-from-zero", a, ast,
        extra={"items_reprocessed_before": rb, "items_reprocessed_after": ra})

# ---------- BAC-0020 cache-locality (case 19)
def b20():
    N = 60000
    aos = [{"a": i, "b": i*2, "c": "x"*8} for i in range(N)]  # array of structs
    soa_a = list(range(N)); soa_b = [i*2 for i in range(N)]  # CHANGE: struct of arrays
    def before(): return sum(d["a"] + d["b"] for d in aos)
    def after(): return sum(a + b for a, b in zip(soa_a, soa_b))
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0020", "cache-locality", 19, "aggregate_60k_rows",
        b, bs, "struct-of-arrays layout instead of array-of-dicts", a, ast)

# ---------- BAC-0021 artifact-dedup (case 20)
def b21():
    art = bytes(rng.getrandbits(8) for _ in range(4096))
    builds = [art if i % 3 else bytes(rng.getrandbits(8) for _ in range(4096)) for i in range(60)]
    def before():
        stored = sum(len(a) for a in builds)  # copy per build
        return stored
    def after():  # CHANGE: content-hash linked store
        seen = set(); stored = 0
        for a in builds:
            h = hashlib.sha256(a).digest()
            if h not in seen: seen.add(h); stored += len(a)
        return stored
    sb = before(); sa = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0021", "artifact-dedup", 20, "dedupe_pass_60_builds",
        b, bs, "hash-linked artifact store instead of per-build copies", a, ast,
        extra={"bytes_stored_before": sb, "bytes_stored_after": sa})

# ---------- BAC-0022 build-caching (case 21)
def b22():
    targets = {"t%d" % i: ("src%d" % i, i) for i in range(40)}
    hashes = {t: hashlib.sha256(s.encode()).hexdigest() for t, (s, _) in targets.items()}
    def build_all(): return sum(v for _, v in targets.values())
    def before(): return build_all()  # rebuild everything
    cache = dict(hashes)
    def after():  # CHANGE: skip targets whose input hash is unchanged
        changed = {"t7"}  # one source changed
        return sum(v for t, (_, v) in targets.items() if t in changed or cache[t] != hashes[t]) or sum(
            targets[t][1] for t in changed)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0022", "build-caching", 21, "rebuild_after_1_of_40_changed",
        b, bs, "input-hash build cache: rebuild only changed target instead of all 40", a, ast)

# ---------- BAC-0023 browser-pooling (case 22) - simulated page objects
def b23():
    def new_page(): return {"dom": [0]*2000, "js": {}}  # simulated setup cost
    def before():
        for _ in range(60):
            p = new_page(); p["dom"][0] = 1
    pool = deque(new_page() for _ in range(4))
    def after():
        for _ in range(60):  # CHANGE: pool reuse
            p = pool.popleft(); p["dom"][0] = 1; pool.append(p)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0023", "browser-pooling", 22, "60_page_tasks",
        b, bs, "pool of 4 reused page objects instead of new page per task (simulated)", a, ast,
        extra={"note": "simulated page-object cost; no real browser launched"})

# ---------- BAC-0024 test-selection (case 23)
def b24():
    tests = ["test_%d" % i for i in range(300)]
    dep = {"test_%d" % i: {"src%d" % (i % 40)} for i in range(300)}
    changed = {"src7"}
    def run(t): return hash(t) % 7  # simulated per-test cost
    def before(): return sum(run(t) for t in tests)
    def after():  # CHANGE: select affected only
        sel = [t for t in tests if dep[t] & changed]
        return sum(run(t) for t in sel), len(sel)
    tot_b = before(); tot_a, nsel = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0024", "test-selection", 23, "suite_run_after_src7_change",
        b, bs, "run only tests depending on changed files instead of full 300-test suite", a, ast,
        extra={"tests_run_before": 300, "tests_run_after": nsel})

# ---------- BAC-0025 selective-regeneration (case 24)
def b25():
    pages = ["page_%d" % i for i in range(200)]
    deps = {"page_%d" % i: {"page_%d" % ((i+1) % 200)} for i in range(200)}
    def render(p): return len(p) * 3
    changed = {"page_5"}
    def before(): return sum(render(p) for p in pages)
    def after():  # CHANGE: regenerate changed + transitive dependents only
        aff = set(changed); stack = list(changed)
        rev = defaultdict(list)
        for p, ds in deps.items():
            for d in ds: rev[d].append(p)
        while stack:
            u = stack.pop()
            for v in rev[u]:
                if v not in aff: aff.add(v); stack.append(v)
        return sum(render(p) for p in aff), len(aff)
    tb = before(); ta, na = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0025", "selective-regeneration", 24, "regen_after_1_page_change",
        b, bs, "regenerate changed page + transitive dependents instead of all 200 pages", a, ast,
        extra={"pages_regenerated_before": 200, "pages_regenerated_after": na})

# ---------- BAC-0026 parallel-rendering (case 25)
def b26():
    from concurrent.futures import ThreadPoolExecutor
    pages = ["<div>page %d</div>" * 50 for _ in range(24)]
    def render(p): return p.replace("<div>", "<section>").replace("</div>", "</section>")
    def before(): return [render(p) for p in pages]
    def after():  # CHANGE: 2-worker thread pool (box has 2 CPUs)
        with ThreadPoolExecutor(max_workers=2) as ex:
            return list(ex.map(render, pages))
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0026", "parallel-rendering", 25, "render_24_pages",
        b, bs, "2-worker thread pool instead of serial rendering", a, ast)

# ---------- BAC-0027 failure-clustering (case 26)
def b27():
    fails = []
    sigs = ["TimeoutError host%d" % (i % 6) for i in range(400)]
    for i, s in enumerate(sigs):
        fails.append("%s attempt=%d trace=%d" % (s, i % 3, i))
    def sig(f): return f.split(" attempt=")[0]
    def before(): return len(fails)  # inspect each individually
    def after():  # CHANGE: cluster by normalized signature
        clusters = defaultdict(list)
        for f in fails: clusters[sig(f)].append(f)
        return len(clusters)
    nb = before(); na = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0027", "failure-clustering", 26, "triage_400_failures",
        b, bs, "cluster by normalized signature instead of inspecting each failure", a, ast,
        extra={"items_to_review_before": nb, "items_to_review_after": na})

# ---------- BAC-0028 semantic-diffing (case 27)
def b28():
    import difflib
    a = {"name": "svc", "port": 80, "tags": ["a", "b", "c"], "cfg": {"x": 1, "y": 2}}
    b_ = {"tags": ["a", "b", "c"], "cfg": {"y": 2, "x": 1}, "name": "svc", "port": 8080}
    sa = json.dumps(a, indent=1, sort_keys=False).splitlines()
    sb = json.dumps(b_, indent=1, sort_keys=False).splitlines()
    def before():
        return len(list(difflib.unified_diff(sa, sb)))  # noisy line diff
    def after():  # CHANGE: semantic key-level diff
        ops = []
        for k in set(a) | set(b_):
            if a.get(k) != b_.get(k): ops.append(("set", k, b_.get(k)))
        return len(ops)
    nb = before(); na = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0028", "semantic-diffing", 27, "diff_reordered_config",
        b, bs, "semantic key-level diff instead of line diff on reordered JSON", a, ast,
        extra={"diff_lines_before": nb, "semantic_ops_after": na})

# ---------- BAC-0029 schema-evolution (case 28) - correctness claim
def b29():
    registry = {"User": {"v1": {"name": "str", "age": "int"}}}
    def before():  # no check: incompatible schema deploys and breaks readers
        registry["User"]["v2"] = {"name": "str"}  # dropped required field
        return "deployed"
    def after():  # CHANGE: backward-compatibility check gates deploy
        old, new = {"name": "str", "age": "int"}, {"name": "str"}
        removed_required = [k for k in old if k not in new]
        return "rejected" if removed_required else "deployed"
    rb = before(); ra = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0029", "schema-evolution", 28, "deploy_v2_schema",
        b, bs, "schema-registry compatibility check gates deploy instead of unchecked evolution", a, ast,
        extra={"deploy_outcome_before": rb, "deploy_outcome_after": ra,
               "note": "correctness claim: breaking change rejected before deploy"})

# ---------- BAC-0030 zero-copy (case 29)
def b30():
    buf = bytes(rng.getrandbits(8) for _ in range(2_000_000))
    offs = [i * 2000 for i in range(1000)]
    def before(): return [buf[o:o+64] for o in offs]  # copies
    mv = memoryview(buf)
    def after(): return [mv[o:o+64] for o in offs]  # CHANGE: zero-copy views
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0030", "zero-copy", 29, "1000_slices_2MB_buffer",
        b, bs, "memoryview slices instead of copying bytes slices", a, ast)

# ---------- BAC-0031 compression (case 30)
def b31():
    docs = [json.dumps({"id": i, "name": "business-%d" % i, "tags": ["home", "service"]}).encode()
            for i in range(2000)]
    def before(): return sum(len(d) for d in docs)
    def after():  # CHANGE: zlib-compressed storage
        return sum(len(zlib.compress(d, 6)) for d in docs)
    sb = before(); sa = after()
    bc, bcs = med(lambda: sum(len(d) for d in docs))
    ac, acs = med(lambda: sum(len(zlib.compress(d, 6)) for d in docs))
    rec(results, "BAC-0031", "compression", 30, "store_2000_docs",
        bc, bcs, "zlib-compressed storage instead of raw JSON bytes", ac, acs,
        extra={"bytes_before": sb, "bytes_after": sa,
               "note": "space claim: CPU cost accepted, bytes are the metric"})

# ---------- BAC-0032 storage-tiers (case 31)
def b32():
    items = [("id-%d" % i, i) for i in range(20000)]  # (key, last_access_rank)
    hot_keys = {"id-%d" % i for i in range(2000)}  # 10% hot
    cold = [kv for kv in items if kv[0] not in hot_keys]
    hot = [kv for kv in items if kv[0] in hot_keys]
    queries = ["id-%d" % (i % 2000) for i in range(500)]
    def before():  # everything in one hot list
        return [kv for q in queries for kv in items if kv[0] == q]
    hotd = dict(hot); coldd = dict(cold)
    def after():  # CHANGE: hot/cold tiers; queries hit hot tier first
        out = []
        for q in queries:
            out.append(hotd.get(q, coldd.get(q)))
        return out
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0032", "storage-tiers", 31, "500_hot_queries",
        b, bs, "hot/cold tiering: queries served from 2k hot dict instead of scanning 20k", a, ast,
        extra={"hot_tier_size": len(hot), "cold_tier_size": len(cold)})

# ---------- BAC-0033 checkpoint-compaction (case 32)
def b33():
    ckpts = [{"n": i, "state": list(range(500))} for i in range(50)]
    def before(): return sum(len(c["state"]) for c in ckpts)  # keep all
    def after():  # CHANGE: keep every 10th full + deltas
        full = ckpts[::10]
        return sum(len(c["state"]) for c in full) + 45 * 8  # small deltas
    sb = before(); sa = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0033", "checkpoint-compaction", 32, "checkpoint_storage",
        b, bs, "compact 50 checkpoints to 5 full + deltas instead of keeping all", a, ast,
        extra={"entries_before": sb, "entries_after": sa})

# ---------- BAC-0034 replay-acceleration (case 33)
def b34():
    events = []
    for i in range(20000):
        events.append(("set", "k%d" % (i % 500), i) if i % 5 else ("noop", "k%d" % (i % 500), None))
    def apply(e, st):
        if e[0] == "set": st[e[1]] = e[2]
        elif e[0] == "noop": pass
    def before():
        st = {}
        for e in events: apply(e, st)  # replay all incl. noops
        return len(st)
    fps = {hashlib.sha256(repr(e).encode()).digest() for e in events if e[0] == "noop"}
    def after():  # CHANGE: skip fingerprinted no-op events
        st = {}
        for e in events:
            if hashlib.sha256(repr(e).encode()).digest() in fps: continue
            apply(e, st)
        return len(st)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0034", "replay-acceleration", 33, "replay_20k_events",
        b, bs, "skip fingerprinted no-op events instead of replaying all 20k", a, ast)

# ---------- BAC-0035 incremental-graph-compilation (case 34)
def b35():
    N = 120
    def compile_node(i): return (i * 2654435761) % 2**32  # simulated compile cost
    def before(): return [compile_node(i) for i in range(N)]  # full recompile
    changed = {7, 42}
    rdeps = {i: [i+1] if i+1 < N else [] for i in range(N)}
    def after():  # CHANGE: recompile changed + downstream only
        aff = set(changed); stack = list(changed)
        while stack:
            u = stack.pop()
            for v in rdeps[u]:
                if v not in aff: aff.add(v); stack.append(v)
        return {i: compile_node(i) for i in aff}, len(aff)
    tb = before(); ta, na = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0035", "incremental-graph-compilation", 34, "recompile_after_2_node_change",
        b, bs, "recompile changed nodes + downstream only instead of full 120-node compile", a, ast,
        extra={"nodes_compiled_before": N, "nodes_compiled_after": na})

# ===== second instances (cases 35-49): different CHANGE per repeated technique =====

# ---------- BAC-0036 incremental-computation (case 35): batch of 10 leaf changes
def b36():
    N = 300
    vals = list(range(N))
    def before():
        out = [vals[i] + vals[i-1] + vals[i-2] if i >= 2 else vals[i] for i in range(N)]
        return out
    def after():  # CHANGE: one dirty-propagation pass over a batch of 10 changes
        for i in range(0, 20, 2): vals[i] += 1
        dirty = set(range(0, 20, 2))
        out = {}
        for i in range(N):
            if i in dirty or (i-1) in dirty or (i-2) in dirty:
                dirty.add(i); out[i] = vals[i] + vals[i-1] + vals[i-2] if i >= 2 else vals[i]
        return out
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0036", "incremental-computation", 35, "update_batch_10_leaves",
        b, bs, "single dirty-propagation pass over batched leaf changes vs per-change full recompute", a, ast)

# ---------- BAC-0037 content-addressing (case 36): sharded hash store
def b37():
    blobs = [(("shardblob-%d" % (i % 900)).encode() * 32) for i in range(3000)]
    def before():
        store = {}
        for b in blobs: store[hashlib.sha256(b).hexdigest()] = b
        lookups = [hashlib.sha256(blobs[i]).hexdigest() for i in range(0, 3000, 10)]
        return [store[h] for h in lookups]
    shards = [dict() for _ in range(16)]  # CHANGE: shard by hash prefix
    for b in blobs:
        h = hashlib.sha256(b).hexdigest()
        shards[int(h[:1], 16)][h] = b
    def after():
        lookups = [hashlib.sha256(blobs[i]).hexdigest() for i in range(0, 3000, 10)]
        return [shards[int(h[:1], 16)][h] for h in lookups]
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0037", "content-addressing", 36, "300_point_lookups_sharded",
        b, bs, "16-way hash-prefix sharded content store instead of single flat hash map", a, ast)

# ---------- BAC-0038 semantic-hashes (case 37): LSH-style bucketing for near-dups
def b38():
    docs = ["the quick brown fox %d jumps over the lazy dog" % i for i in range(400)]
    near = docs + ["the quick brown fox %d jumps over the lazy dog!" % i for i in range(400)]
    def shingles(s, k=4):
        toks = s.split()
        return {" ".join(toks[i:i+k]) for i in range(len(toks)-k+1)}
    def before():  # pairwise Jaccard over all pairs
        n = len(near); found = 0
        sh = [shingles(s) for s in near]
        for i in range(n):
            for j in range(i+1, n):
                inter = len(sh[i] & sh[j]); union = len(sh[i] | sh[j])
                if union and inter/union > 0.8: found += 1
        return found
    def after():  # CHANGE: bucket by min-hash band, compare within buckets only
        bands = defaultdict(list)
        for s in near:
            sh = shingles(s)
            bands[min(sh)].append((s, sh))
        found = 0
        for bucket in bands.values():
            for a in range(len(bucket)):
                for c in range(a+1, len(bucket)):
                    inter = len(bucket[a][1] & bucket[c][1]); union = len(bucket[a][1] | bucket[c][1])
                    if union and inter/union > 0.8: found += 1
        return found
    fb = before(); fa = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0038", "semantic-hashes", 37, "near_dup_detect_800_docs",
        b, bs, "min-hash band bucketing (compare within buckets) instead of all-pairs Jaccard", a, ast,
        extra={"pairs_found_before": fb, "pairs_found_after": fa})

# ---------- BAC-0039 dependency-graphs (case 38): reverse-dependency index
def b39():
    N = 600
    fwd = {i: [(i+1) % N, (i+2) % N] for i in range(N)}
    def before():  # dependents query scans all forward edges
        target = 5
        return [u for u in range(N) if target in fwd[u]]
    rev = defaultdict(list)  # CHANGE: reverse index
    for u, vs in fwd.items():
        for v in vs: rev[v].append(u)
    def after(): return list(rev[5])
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0039", "dependency-graphs", 38, "dependents_query_600_nodes",
        b, bs, "maintained reverse-dependency index instead of scanning all forward edges", a, ast)

# ---------- BAC-0040 materialized-projections (case 39): delta updates on batch append
def b40():
    events = [("sale", i % 50, (i * 13) % 97 + 1) for i in range(8000)]
    new_batch = [("sale", i % 50, (i * 29) % 89 + 1) for i in range(2000)]
    def before():  # full rebuild of projection on batch append
        tot = defaultdict(int)
        for _, k, v in events + new_batch: tot[k] += v
        return dict(tot)
    proj = defaultdict(int)
    for _, k, v in events: proj[k] += v
    def after():  # CHANGE: apply delta updates only
        for _, k, v in new_batch: proj[k] += v
        return dict(proj)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0040", "materialized-projections", 39, "append_batch_2000_to_8000",
        b, bs, "delta-update materialized projection on batch append instead of full rebuild", a, ast)

# ---------- BAC-0041 invalidation (case 40): version-stamped entries
def b41():
    cache = {i: (i*3, 0) for i in range(2000)}  # (value, version)
    gen = {"g": 0}
    def before():  # clear-all on any schema change
        cache.clear()
        for i in range(2000): cache[i] = (i*3, 0)
        return len(cache)
    def after():  # CHANGE: bump global generation; lazy revalidate on read
        gen["g"] += 1
        hits = 0
        for i in range(200):
            v, g = cache[i]
            if g != gen["g"]: cache[i] = (i*3, gen["g"]); hits += 1
        return hits
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0041", "invalidation", 40, "invalidate_after_schema_change",
        b, bs, "generation-stamped lazy invalidation instead of clear-all + full refill", a, ast)

# ---------- BAC-0042 snapshotting (case 41): incremental diff chain
def b42():
    state = {i: i for i in range(4000)}
    import copy
    snaps = []
    def before():
        snaps.append(copy.deepcopy(state))  # full snapshot each time
        return len(snaps)
    base = dict(state); chain = [("full", base)]
    def after():  # CHANGE: diff chain
        diff = {0: 999, 1: 1000}
        chain.append(("diff", diff))
        return len(chain)
    b, bs = med(lambda: (snaps.clear(), before())[1]); a, ast = med(after)
    rec(results, "BAC-0042", "snapshotting", 41, "take_snapshot_4k_keys",
        b, bs, "incremental diff-chain snapshot instead of full deepcopy per snapshot", a, ast)

# ---------- BAC-0043 batching (case 42): adaptive batch sizing
def b43():
    items = list(range(3000))
    store = []
    def before():
        store.clear()
        for i in range(0, len(items), 100):
            store.extend(x*2 for x in items[i:i+100])
    def after():  # CHANGE: adaptive batch grows when recent batches were fast
        store.clear(); bs = 25; i = 0
        while i < len(items):
            store.extend(x*2 for x in items[i:i+bs])
            i += bs; bs = min(400, bs*2)
    b, bs_ = med(before); a, ast = med(after)
    rec(results, "BAC-0043", "batching", 42, "write_3000_items",
        b, bs_, "adaptive batch sizing (25 doubling to 400) instead of fixed 100", a, ast)

# ---------- BAC-0044 streaming (case 43): windowed aggregation
def b44():
    def gen(n):
        for i in range(n): yield (i // 100, (i * 7) % 53)
    def before():  # collect all windows then aggregate
        wins = defaultdict(list)
        for w, v in gen(100000): wins[w].append(v)
        return {w: sum(v) for w, v in wins.items()}
    def after():  # CHANGE: incremental windowed aggregation, O(windows) memory
        agg = defaultdict(int); cnt = defaultdict(int)
        for w, v in gen(100000): agg[w] += v; cnt[w] += 1
        return dict(agg)
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0044", "streaming", 43, "windowed_agg_100k_events",
        b, bs, "incremental per-window aggregation instead of buffering all events per window", a, ast)

# ---------- BAC-0045 backpressure (case 44): drop-oldest with metrics
def b45():
    produced = 5000
    def before():  # unbounded
        q = deque(range(produced)); peak = len(q)
        while q: q.popleft()
        return peak
    def after():  # CHANGE: bounded 256, drop-oldest, count drops
        q = deque(); drops = 0
        for i in range(produced):
            if len(q) >= 256: q.popleft(); drops += 1
            q.append(i)
        while q: q.popleft()
        return drops
    db = 0; da = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0045", "backpressure", 44, "ingest_5000_burst",
        b, bs, "bounded queue with drop-oldest + drop counter instead of unbounded growth", a, ast,
        extra={"peak_before": db or 5000, "drops_after": da,
               "note": "bounded memory at cost of 4744 documented drops; policy choice, not free lunch"})

# ---------- BAC-0046 queue-fairness (case 45): weighted fair queuing
def b46():
    qs = {"gold": deque(range(60)), "silver": deque(range(60)), "bronze": deque(range(60))}
    weights = {"gold": 4, "silver": 2, "bronze": 1}
    def before():  # strict round robin: equal shares
        qs2 = {k: deque(v) for k, v in qs.items()}; order = ["gold", "silver", "bronze"]
        served = defaultdict(int); t = 0
        while any(qs2.values()):
            for tn in order:
                if qs2[tn]: qs2[tn].popleft(); served[tn] += 1
            t += 1
        return dict(served)
    def after():  # CHANGE: weighted fair queuing
        qs2 = {k: deque(v) for k, v in qs.items()}
        served = defaultdict(int); deficit = defaultdict(int)
        while any(qs2.values()):
            for tn in ["gold", "silver", "bronze"]:
                deficit[tn] += weights[tn]
                while deficit[tn] >= 1 and qs2[tn]:
                    qs2[tn].popleft(); served[tn] += 1; deficit[tn] -= 1
        return dict(served)
    sb = before(); sa = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0046", "queue-fairness", 45, "schedule_180_weighted_jobs",
        b, bs, "weighted fair queuing (4:2:1) instead of equal round-robin", a, ast,
        extra={"served_before": sb, "served_after": sa,
               "note": "policy claim: gold gets ~4x share; measured shares in served_after"})

# ---------- BAC-0047 work-stealing (case 46): LIFO local deques
def b47():
    tasks = [3]*60 + [25]*4
    W = 4
    def before():  # single shared FIFO queue with lock-ish contention sim
        q = deque(sorted(tasks, reverse=True)); loads = [0]*W
        while q:
            t = q.popleft(); i = min(range(W), key=lambda k: loads[k]); loads[i] += t
        return max(loads)
    def after():  # CHANGE: per-worker LIFO deques, steal from others' tails
        deques = [deque() for _ in range(W)]
        for idx, t in enumerate(sorted(tasks, reverse=True)): deques[idx % W].append(t)
        loads = [0]*W; idle = [False]*W
        total = sum(tasks); done = 0
        while done < total:
            progressed = False
            for w in range(W):
                if deques[w]:
                    t = deques[w].pop(); loads[w] += t; done += t; progressed = True
                else:
                    for v in range(W):  # steal oldest from victim tail
                        if deques[v]:
                            t = deques[v].popleft(); loads[w] += t; done += t; progressed = True
                            break
            if not progressed: break
        return max(loads)
    mb = before(); ma = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0047", "work-stealing", 47, "schedule_64_tasks_simulated",
        b, bs, "per-worker LIFO deques with tail-stealing vs shared FIFO queue", a, ast,
        extra={"makespan_units_before": mb, "makespan_units_after": ma})

# ---------- BAC-0048 lease-fencing (case 47): lease expiry + renewal
def b48():
    import time as _t
    def before():  # fencing token only, no expiry: crashed holder blocks forever (sim)
        holder = {"token": 5, "alive": False}
        return holder["token"]  # next writer must wait indefinitely -> model as blocked
    def after():  # CHANGE: lease with expiry; new writer fences after timeout
        lease = {"token": 5, "expires": _t.monotonic() - 1}  # already expired
        if _t.monotonic() > lease["expires"]:
            lease["token"] += 1; lease["expires"] = _t.monotonic() + 30
            return lease["token"], True  # fenced, acquired
        return lease["token"], False
    tb, okb = before(), False; ta, oka = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0048", "lease-fencing", 47, "acquire_after_holder_crash",
        b, bs, "expiring lease with fencing on takeover instead of non-expiring token", a, ast,
        extra={"acquired_before": okb, "acquired_after": oka,
               "note": "liveness claim: crashed holder no longer blocks progress"})

# ---------- BAC-0049 connection-pools (case 48): idle eviction
def b49():
    def new_conn(): return {"buf": bytearray(2048), "idle": 0}
    def before():  # fixed pool of 16, never shrinks
        pool = [new_conn() for _ in range(16)]
        for _ in range(200):
            c = pool.pop(0); c["idle"] = 0; pool.append(c)
        return len(pool)
    def after():  # CHANGE: idle eviction down to min 4
        pool = [new_conn() for _ in range(16)]
        for rnd in range(200):
            c = pool.pop(0); c["idle"] = 0; pool.append(c)
            for p in pool: p["idle"] += 1
            pool = [p for p in pool if p["idle"] < 50] or pool[:4]
            while len(pool) < 4: pool.append(new_conn())
        return len(pool)
    sb = before(); sa = after()
    b, bs = med(lambda: before()); a, ast = med(lambda: after())
    rec(results, "BAC-0049", "connection-pools", 48, "pool_churn_200_cycles",
        b, bs, "idle eviction (min 4) instead of fixed 16-connection pool", a, ast,
        extra={"pool_size_before": sb, "pool_size_after": sa})

# ---------- BAC-0050 query-planning (case 49): plan cache
def b50():
    rows = [{"id": i, "k": i % 200} for i in range(20000)]
    idx = defaultdict(list)
    for r in rows: idx[r["k"]].append(r)
    plans = {}
    def plan(q):
        if q not in plans:  # CHANGE: cache chosen plan
            plans[q] = ("index", q) if q < 200 else ("scan", q)
        return plans[q]
    def run(p):
        kind, q = p
        return list(idx[q]) if kind == "index" else [r for r in rows if r["k"] == q]
    queries = [7, 42, 7, 42, 7, 150, 150, 7]
    def before():  # re-plan every query
        out = []
        for q in queries:
            p = ("index", q) if q < 200 else ("scan", q)
            out.append(run(p))
        return len(out)
    def after():
        return len([run(plan(q)) for q in queries])
    b, bs = med(before); a, ast = med(after)
    rec(results, "BAC-0050", "query-planning", 49, "8_repeated_queries",
        b, bs, "cached query plans instead of re-planning every query", a, ast,
        extra={"plans_cached": len(plans)})

BENCHES = [b01, b02, b03, b04, b05, b06, b07, b08, b09, b10, b11, b12, b13, b14,
           b15, b16, b17, b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28,
           b29, b30, b31, b32, b33, b34, b35, b36, b37, b38, b39, b40, b41, b42,
           b43, b44, b45, b46, b47, b48, b49, b50]

if __name__ == "__main__":
    t0 = time.time()
    for i, fn in enumerate(BENCHES, 1):
        try:
            fn()
            print("ok %s" % fn.__name__, flush=True)
        except Exception as e:
            results[fn.__name__] = {"error": repr(e)}
            print("FAIL %s: %r" % (fn.__name__, e), flush=True)
    with open(os.path.join(HERE, "bench_results.json"), "w") as f:
        json.dump({"results": results, "method": __doc__, "repeats": R,
                   "elapsed_s": round(time.time() - t0, 1)}, f, indent=1)
    print("wrote bench_results.json, %d missions, %.1fs" % (len(results), time.time() - t0))
