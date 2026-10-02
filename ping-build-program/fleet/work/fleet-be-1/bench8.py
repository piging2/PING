"""Range 8 (BAC-0351..BAC-0375): eighth-round CHANGE variants."""
import json, os, time, hashlib, zlib, random, bisect, pickle
from collections import defaultdict, deque, OrderedDict, Counter
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(351375)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# k351 BAC-0351 incremental-computation (350): pull vs push propagation
def k351():
    N = 400
    deps = {i: [i-1, i-2] if i >= 2 else [] for i in range(N)}
    vals = list(range(N))
    def compute(i): return vals[i] if not deps[i] else vals[i] + vals[i-1] + vals[i-2]
    def before():  # push: dirty propagation touches all downstream
        dirty = {0}; vals[0] += 1
        out = {}
        for i in range(N):
            if i in dirty or any(d in dirty for d in deps[i]):
                dirty.add(i); out[i] = compute(i)
        return len(out)
    rdeps = defaultdict(list)
    for i in range(N):
        for d in deps[i]: rdeps[d].append(i)
    def after():  # CHANGE: pull: recompute only demanded nodes (top 10)
        memo = {}
        def need(i):
            if i not in memo: memo[i] = compute(i)
            return memo[i]
        return [need(i) for i in range(N-10, N)]
    nb = before(); na = len(after())
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0351", "incremental-computation", 350, "pull_vs_push", b, bs,
        "pull-based demand-driven recompute (10 nodes) vs push dirty propagation", a, ast,
        extra={"touched_before": nb, "touched_after": na})

# k352 BAC-0352 content-addressing (351): FOLLOWUP BAC-0317 Merkle tree batch
def k352():
    blobs = [os.urandom(4096) for _ in range(64)]
    def before():  # per-blob hash
        return [hashlib.sha256(b).hexdigest() for b in blobs]
    def after():  # CHANGE: Merkle tree: one root covers all
        level = [hashlib.sha256(b).digest() for b in blobs]
        while len(level) > 1:
            level = [hashlib.sha256(level[i] + level[i+1]).digest()
                     for i in range(0, len(level) - 1, 2)]
        return level[0].hex()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0352", "content-addressing", 351, "merkle_batch", b, bs,
        "FOLLOWUP BAC-0317: Merkle tree batch hash vs per-blob hash", a, ast)

# k353 BAC-0353 semantic-hashes (352): FOLLOWUP BAC-0318 band tuning
def k353():
    def simhash(s):
        toks = s.split(); v = [0]*32
        for t in toks:
            h = int(hashlib.sha256(t.encode()).hexdigest(), 16)
            for i in range(32): v[i] += 1 if (h >> i) & 1 else -1
        bits = 0
        for i in range(32):
            if v[i] > 0: bits |= (1 << i)
        return bits
    docs = ["alpha beta gamma %d" % i for i in range(100)]
    near = docs + ["alpha beta gamma %d delta" % i for i in range(100)]
    hs = [simhash(s) for s in near]
    def ham(a, b): return bin(a ^ b).count("1")
    n = len(hs)
    truth = set()
    for i in range(n):
        for j in range(i+1, n):
            if ham(hs[i], hs[j]) <= 6: truth.add((i, j))
    def recall(nb, r):
        found = set(); seen = set()
        for t in range(nb):
            buckets = defaultdict(list)
            for idx, h in enumerate(hs):
                buckets[(h >> (t*r)) & ((1 << r) - 1)].append(idx)
            for bucket in buckets.values():
                for x in range(len(bucket)):
                    for y in range(x+1, len(bucket)):
                        i, j = bucket[x], bucket[y]
                        if i > j: i, j = j, i
                        if i == j or (i, j) in seen: continue
                        seen.add((i, j))
                        if ham(hs[i], hs[j]) <= 6: found.add((i, j))
        return len(found & truth)/len(truth)
    r1 = recall(4, 8)   # 4 bands x 8 rows (current)
    r2 = recall(8, 4)   # CHANGE: 8 bands x 4 rows
    b, bs = B.med(lambda: None); a, ast = 0.0, 0.0
    rec("BAC-0353", "semantic-hashes", 352, "band_tuning", b, bs,
        "FOLLOWUP BAC-0318: LSH band tuning (8x4 vs 4x8) recall audit at threshold 6", a, ast,
        extra={"truth_pairs": len(truth), "recall_4x8": round(r1, 3), "recall_8x4": round(r2, 3)})

# k354 BAC-0354 dependency-graphs (353): FOLLOWUP BAC-0319 Kahn subgraph
def k354():
    N = 400
    edges = [(i, i+1) for i in range(N-1)]
    new_edges = [(50, 250), (10, 200), (150, 290)]
    def before():  # PK one-at-a-time
        order = list(range(N)); pos = {i: i for i in range(N)}
        for u, v in new_edges:
            if pos[u] < pos[v]: continue
            lo, hi = pos[v], pos[u]
            seg = order[lo:hi+1]; seg.remove(u); seg.append(u)
            order[lo:hi+1] = seg
            for i, x in enumerate(order[lo:hi+1], lo): pos[x] = i
        return len(order)
    def after():  # CHANGE: Kahn on affected subgraph only
        adj = defaultdict(list)
        for x, y in edges: adj[x].append(y)
        for u, v in new_edges: adj[u].append(v)
        affected = set()
        for u, v in new_edges: affected.update((u, v))
        # expand to downstream of u and upstream of v (bounded walk)
        stack = [u for u, v in new_edges]
        seen = set()
        while stack:
            x = stack.pop()
            if x in seen: continue
            seen.add(x)
            for w in adj[x]:
                if w not in seen: stack.append(w); affected.add(w)
        sub = sorted(affected)
        ind = {x: 0 for x in sub}
        sset = set(sub)
        for x in sub:
            for w in adj[x]:
                if w in sset: ind[w] += 1
        q = deque([x for x in sub if ind[x] == 0]); tot = 0
        while q:
            x = q.popleft(); tot += 1
            for w in adj[x]:
                if w in sset:
                    ind[w] -= 1
                    if ind[w] == 0: q.append(w)
        return tot
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0354", "dependency-graphs", 353, "kahn_subgraph", b, bs,
        "FOLLOWUP BAC-0319: Kahn on affected subgraph vs PK one-at-a-time", a, ast)

# k355 BAC-0355 materialized-projections (354): FOLLOWUP BAC-0320 incremental view
def k355():
    proj = defaultdict(int)
    for i in range(20000): proj[i] += i
    deltas = [("upd", i % 20000, 1) for i in range(2000)]
    def before():  # eager full re-derive per batch
        p = defaultdict(int)
        for _, k, v in deltas: p[k] += v
        for k in p: proj[k] += p[k]
        return len(proj)
    def after():  # CHANGE: incremental: apply deltas directly
        for _, k, v in deltas: proj[k] += v
        return len(proj)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0355", "materialized-projections", 354, "incremental_view", b, bs,
        "FOLLOWUP BAC-0320: incremental delta apply vs full re-derive per batch", a, ast)

# k356 BAC-0356 invalidation (355): FOLLOWUP BAC-0321 jittered refresh-ahead
def k356():
    TTL = 10.0
    import random as r_
    def run(jitter):
        rr = r_.Random(11)
        now = 0.0; cache = {"k": ("v1", 0.0)}
        stale = 0; refreshes = 0
        for i in range(3000):
            now += rr.expovariate(0.05)
            v, ts = cache["k"]
            gap = TTL*0.7 if not jitter else TTL*(0.5 + rr.random()*0.4)
            if now - ts >= gap:
                cache["k"] = ("v2", now); refreshes += 1; v = "v2"
            if v == "v1" and now - ts > TTL: stale += 1
        return stale, refreshes
    sb, rb = run(False); sa, ra = run(True)
    b, bs = B.med(lambda: run(False)); a, ast = B.med(lambda: run(True))
    rec("BAC-0356", "invalidation", 355, "jittered_refresh", b, bs,
        "FOLLOWUP BAC-0321: jittered refresh-ahead vs fixed refresh-ahead", a, ast,
        extra={"stale_before": sb, "refreshes_before": rb, "stale_after": sa, "refreshes_after": ra})

# k357 BAC-0357 snapshotting (356): array tobytes vs pickle for numeric state
def k357():
    import array as arr_
    state = arr_.array("l", range(500000))
    def before(): return len(pickle.dumps(state, protocol=4))
    def after():  # CHANGE: raw buffer
        return len(state.tobytes())
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0357", "snapshotting", 356, "raw_buffer", b, bs,
        "array.tobytes vs pickle for numeric snapshot state", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k358 BAC-0358 batching (357): FOLLOWUP BAC-0323 busy-spin vs blocking drain
def k358():
    size = 1 << 15
    N = 20000
    def before():  # blocking-style drain (batch)
        ring = [0]*size; tail = 0; s = 0
        for i in range(N):
            ring[tail & (size-1)] = i; tail += 1
        head = 0
        while head < tail:
            s += ring[head & (size-1)]; head += 1
        return s
    def after():  # CHANGE: busy-spin incremental drain
        ring = [0]*size; tail = 0; head = 0; s = 0
        for i in range(N):
            ring[tail & (size-1)] = i; tail += 1
            while head < tail:  # spin-drain as produced
                s += ring[head & (size-1)]; head += 1
        return s
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0358", "batching", 357, "spin_drain", b, bs,
        "FOLLOWUP BAC-0323: busy-spin incremental drain vs batch drain", a, ast)

# k359 BAC-0359 streaming (358): FOLLOWUP BAC-0324 sessionization + lateness
def k359():
    evs = [(i + (-40 if i % 17 == 0 else 0), i) for i in range(8000)]
    evs.sort()
    def before():  # drop-late
        wm = 0; kept = 0
        for ts, v in evs:
            wm = max(wm, ts)
            if ts >= wm - 5: kept += 1
        return kept
    def after():  # CHANGE: session windows + allowed lateness 45
        sessions = []; cur = []; last = None; late = 0
        for ts, v in evs:
            if ts < -45: late += 1; continue
            if last is not None and ts - last > 10:
                sessions.append(cur); cur = []
            cur.append(v); last = ts
        sessions.append(cur)
        return len(sessions), late
    rb = before(); ra, la = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0359", "streaming", 358, "session_lateness", b, bs,
        "FOLLOWUP BAC-0324: session windows + allowed lateness vs drop-late", a, ast,
        extra={"kept_before": rb, "sessions_after": ra, "late_after": la})

# k360 BAC-0360 backpressure (359): FOLLOWUP BAC-0325 Vegas-style
def k360():
    caps = [40 + (i * 13 % 30) for i in range(400)]
    def before():  # static token bucket
        tokens = 50; dropped = 0
        for c in caps:
            tokens = min(50, tokens + 5)
            if 60 <= c and tokens >= 1: tokens -= 1
            else: dropped += 1
        return dropped
    def after():  # CHANGE: Vegas-style: queueing delay estimate throttles
        inflight = 0; dropped = 0; base = 40.0
        for c in caps:
            base = min(base, c)
            qdelay = max(0, 60 - c)  # proxy for queueing
            if qdelay > 8: inflight = max(0, inflight - 2)  # back off
            else: inflight = min(60, inflight + 1)
            if inflight >= c: dropped += 1
        return dropped
    db = before(); da = after()
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0360", "backpressure", 359, "vegas_style", b, bs,
        "FOLLOWUP BAC-0325: Vegas-style delay-based vs static token bucket", a, ast,
        extra={"dropped_before": db, "dropped_after": da})

# k361 BAC-0361 queue-fairness (360): FOLLOWUP BAC-0326 DRR quantum tuning
def k361():
    flows = {"a": [1500]*30, "b": [500]*30, "c": [500]*30}
    def run(q):
        qs = {k: deque(v) for k, v in flows.items()}
        deficit = defaultdict(int); order = []
        W = {"a": 4, "b": 1, "c": 1}
        while any(qs[k] for k in qs):
            for k in ("a", "b", "c"):
                deficit[k] += W[k]*q
                while qs[k] and deficit[k] >= qs[k][0]:
                    deficit[k] -= qs[k].popleft(); order.append(k)
        return order
    ob = run(1000); oa = run(1500)  # CHANGE: quantum = max packet
    la = max(i for i, k in enumerate(oa) if k == "a")
    lb = max(i for i, k in enumerate(ob) if k == "a")
    b, bs = B.med(lambda: run(1000)); a, ast = B.med(lambda: run(1500))
    rec("BAC-0361", "queue-fairness", 360, "drr_quantum", b, bs,
        "FOLLOWUP BAC-0326: DRR quantum=max-packet vs quantum=1000", a, ast,
        extra={"interactive_tail_before": lb, "interactive_tail_after": la})

# k362 BAC-0362 work-stealing (361): FOLLOWUP BAC-0327 locality-aware stealing
def k362():
    W = 4
    tasks = list(range(400))
    deq0 = [deque() for _ in range(W)]
    for i, t in enumerate(tasks): deq0[0 if t < 200 else i % W].append(t)
    def before():  # random victim
        deqs = [deque(d) for d in deq0]; loads = [0]*W; scans = 0
        rr = random.Random(5)
        for i in range(W):
            while deqs[i]:
                deqs[i].popleft(); loads[i] += 1
                v = rr.randrange(W); scans += 1
                if deqs[v]: deqs[v].popleft(); loads[i] += 1
        return max(loads), scans
    def after():  # CHANGE: locality-aware: prefer neighbor (i+1)%W
        deqs = [deque(d) for d in deq0]; loads = [0]*W; scans = 0
        for i in range(W):
            while deqs[i]:
                deqs[i].popleft(); loads[i] += 1
                v = (i+1) % W; scans += 1
                if deqs[v]: deqs[v].popleft(); loads[i] += 1
        return max(loads), scans
    (mb, sb) = before(); (ma, sa) = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0362", "work-stealing", 361, "locality_steal", b, bs,
        "FOLLOWUP BAC-0327: neighbor-locality stealing vs random victim", a, ast,
        extra={"makespan_before": mb, "scans_before": sb, "makespan_after": ma, "scans_after": sa})

# k363 BAC-0363 lease-fencing (362): FOLLOWUP BAC-0328 monotonic clock fencing
def k363():
    import time as t
    ops = list(range(500))
    def before():  # generation counter
        gen = [0]
        for op in ops: gen[0] += 1
        return gen[0]
    def after():  # CHANGE: monotonic timestamp fencing
        stamps = []
        for op in ops: stamps.append(t.monotonic_ns())
        return len([s for s in stamps if s >= stamps[0]])
    gb = before(); ga = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0363", "lease-fencing", 362, "clock_fencing", b, bs,
        "FOLLOWUP BAC-0328: monotonic-clock fencing vs generation counter (simulated)", a, ast,
        extra={"fenced_before": gb, "fenced_after": ga})

# k364 BAC-0364 connection-pools (363): FOLLOWUP BAC-0329 PID controller
def k364():
    demand = [2, 8, 3, 10, 4, 1, 9, 5, 2, 7]
    def reactive():
        size = 2; sizes = []
        for d in demand:
            if d > size: size = min(12, d)
            elif d < size - 2: size = max(2, size - 2)
            sizes.append(size)
        return sizes
    def pid():  # CHANGE: PID on (demand - size) error
        size = 2.0; sizes = []; integ = 0.0; prev = 0.0
        for d in demand:
            err = d - size
            integ += err; deriv = err - prev; prev = err
            size = max(2, min(12, size + 0.5*err + 0.1*integ + 0.2*deriv))
            sizes.append(int(size))
        return sizes
    fr = reactive(); fp = pid()
    def mae(sizes): return sum(abs(a-b) for a, b in zip(demand, sizes))/len(demand)
    b, bs = B.med(reactive); a, ast = B.med(pid)
    rec("BAC-0364", "connection-pools", 363, "pid_sizing", b, bs,
        "FOLLOWUP BAC-0329: PID controller vs reactive elastic sizing (simulated)", a, ast,
        extra={"mae_reactive": round(mae(fr), 2), "mae_pid": round(mae(fp), 2)})

# k365 BAC-0365 query-planning (364): FOLLOWUP BAC-0330 vectorized filter
def k365():
    import array as arr_
    d1 = arr_.array("l", [i % 10 for i in range(60000)])
    def before():  # python loop filter
        return [i for i in range(60000) if d1[i] == 3]
    def after():  # CHANGE: vectorized via bytes translation
        raw = d1.tobytes()
        # filter indices via memoryview compare loop in C: use array slice trick
        import numpy as np
        a = np.frombuffer(raw, dtype=np.int64)
        return np.nonzero(a == 3)[0].tolist()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0365", "query-planning", 364, "vectorized_filter", b, bs,
        "vectorized (numpy) filter vs python loop filter", a, ast)

# k366 BAC-0366 indexes (365): FOLLOWUP BAC-0331 B-tree pages
def k366():
    import random as r_
    keys = sorted(r_.Random(7).sample(range(200000), 30000))
    lookups = [r_.Random(9).randrange(200000) for _ in range(500)]
    def before():
        return [bisect.bisect_left(keys, q) for q in lookups]
    PAGE = 16
    pages = [keys[i:i+PAGE] for i in range(0, len(keys), PAGE)]
    sep = [p[0] for p in pages]
    def bfind(q):  # CHANGE: 2-level B-tree (page directory + in-page)
        pi = bisect.bisect_right(sep, q) - 1
        if pi < 0: pi = 0
        return pi*PAGE + bisect.bisect_left(pages[pi], q)
    def after():
        return [bfind(q) for q in lookups]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0366", "indexes", 365, "btree_pages", b, bs,
        "FOLLOWUP BAC-0331: 2-level B-tree pages vs flat bisect", a, ast)

# k367 BAC-0367 partitioning (366): FOLLOWUP BAC-0332 rendezvous hashing
def k367():
    keys = ["k%d" % i for i in range(20000)]
    def before():  # vnode ring
        import bisect as bs2
        ring = []
        for n in range(8):
            for v in range(200): ring.append((hash("n%d#%d" % (n, v)), n))
        ring.sort()
        c = Counter()
        for k in keys:
            i = bs2.bisect(ring, (hash("k:"+k), ""))
            c[ring[i % len(ring)][1]] += 1
        return max(c.values()) - min(c.values())
    def after():  # CHANGE: rendezvous (highest-weight) hashing
        c = Counter()
        for k in keys:
            best = max(range(8), key=lambda n: hash("n%d|%s" % (n, k)))
            c[best] += 1
        return max(c.values()) - min(c.values())
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0367", "partitioning", 366, "rendezvous", b, bs,
        "FOLLOWUP BAC-0332: rendezvous hashing vs vnode ring (balance + lookup cost)", a, ast,
        extra={"spread_before": sb, "spread_after": sa})

# k368 BAC-0368 covering-index-keyset (367): FOLLOWUP BAC-0333 cursor walk
def k368():
    N = 200000; PAGE = 100
    rows = [(i % 5000, i) for i in range(N)]  # (score, id)
    idx = sorted(rows, key=lambda r: (-r[0], r[1]))
    scores_desc = [-s for s, _ in idx]
    def keyset_page(cur_score, cur_id):
        pos = bisect.bisect_left(scores_desc, -cur_score,
                                 key=lambda s: s) if False else None
        # binary search on (score DESC, id ASC): predicate score<? OR (score=? AND id>?)
        lo, hi = 0, N
        while lo < hi:
            mid = (lo + hi) // 2
            s, i = idx[mid]
            if s > cur_score or (s == cur_score and i <= cur_id): lo = mid + 1
            else: hi = mid
        return [idx[j] for j in range(lo, min(lo + PAGE, N))]
    def before():  # keyset predicate, binary search per page
        pages = []; cur_score, cur_id = 10**9, -1
        for _ in range(10):
            p = keyset_page(cur_score, cur_id)
            pages.append(p); cur_score, cur_id = p[-1]
        return pages
    def after():  # CHANGE: persistent index cursor, pure slice walk
        pages = []; cursor = 0
        # first page still needs one seek; rest walk the index
        lo, hi = 0, N
        while lo < hi:
            mid = (lo + hi) // 2
            s, i = idx[mid]
            if s > 4999 or (s == 4999 and i < -1): lo = mid + 1
            else: hi = mid
        cursor = lo
        for _ in range(10):
            p = idx[cursor:cursor + PAGE]
            pages.append(p); cursor += PAGE
        return pages
    pb = before(); pa = after()
    assert [r for p in pb for r in p] == [r for p in pa for r in p]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0368", "covering-index-keyset", 367, "cursor_walk", b, bs,
        "FOLLOWUP BAC-0333: persistent index cursor vs keyset predicate per page", a, ast,
        extra={"same_results": True})

# k369 BAC-0369 cursor-durability (368): FOLLOWUP BAC-0334 async group commit
def k369():
    import sqlite3, threading
    def run(async_):
        con = sqlite3.connect(":memory:", check_same_thread=False)
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("CREATE TABLE t(id INT, v INT)")
        lock = threading.Lock()
        def writer():
            for g in range(0, 3000, 100):
                with lock:
                    for i in range(g, g+100):
                        con.execute("INSERT INTO t VALUES(?,?)", (i, i))
                    con.commit()
        if async_:
            th = threading.Thread(target=writer); th.start(); th.join()  # CHANGE: background writer
        else:
            writer()
        n = con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
        con.close(); return n
    b, bs = B.med(lambda: run(False)); a, ast = B.med(lambda: run(True))
    rec("BAC-0369", "cursor-durability", 368, "async_groupcommit", b, bs,
        "FOLLOWUP BAC-0334: background group-commit writer vs foreground (simulated)", a, ast)

# k370 BAC-0370 compiler-optimizations (369): FOLLOWUP BAC-0338 unrolled sum
def k370():
    vals = list(range(400000))
    def before():  # builtin C sum over the list
        return sum(vals)
    def after():  # CHANGE: 4-way unrolled Python loop
        it = iter(vals); s0 = s1 = s2 = s3 = 0
        for x in it:
            s0 += x
            try:
                s1 += next(it); s2 += next(it); s3 += next(it)
            except StopIteration:
                break
        return s0 + s1 + s2 + s3
    assert before() == after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0370", "compiler-optimizations", 369, "unrolled_sum", b, bs,
        "FOLLOWUP BAC-0338: 4-way unrolled Python loop vs builtin C sum (both on list)", a, ast)

# k371 BAC-0371 artifact-dedup (370): FOLLOWUP BAC-0336 FastCDC-style
def k371():
    data = bytes(rng.getrandbits(8) for _ in range(32768))
    data2 = data[:5000] + bytes(200) + data[5000:32568]
    def rabin(d, mask, minc, maxc):
        chunks = []; start = 0; h = 0
        for i, byte in enumerate(d):
            h = ((h * 257) + byte) & 0xFFFFFFFF
            if i - start >= minc and (h & mask) == 0:
                chunks.append(d[start:i+1]); start = i+1
            elif i - start >= maxc:
                chunks.append(d[start:i+1]); start = i+1
        chunks.append(d[start:]); return chunks
    def fastcdc(d):  # CHANGE: normalized chunking: mask grows with chunk size
        chunks = []; start = 0; h = 0
        for i, byte in enumerate(d):
            h = ((h * 257) + byte) & 0xFFFFFFFF
            sz = i - start
            mask = (1 << 12) - 1 if sz < 2048 else ((1 << 13) - 1 if sz < 8192 else (1 << 11) - 1)
            if sz >= 512 and (h & mask) == 0:
                chunks.append(d[start:i+1]); start = i+1
            elif sz >= 16384:
                chunks.append(d[start:i+1]); start = i+1
        chunks.append(d[start:]); return chunks
    def shared(chunks_fn):
        r1 = {hashlib.sha256(c).digest() for c in chunks_fn(data)}
        r2 = {hashlib.sha256(c).digest() for c in chunks_fn(data2)}
        return len(r1 & r2), len(r1)
    sb, tb = shared(lambda d: rabin(d, (1 << 12) - 1, 1024, 16384))
    sa, ta = shared(fastcdc)
    b, bs = B.med(lambda: shared(lambda d: rabin(d, (1 << 12) - 1, 1024, 16384)))
    a, ast = B.med(lambda: shared(fastcdc))
    rec("BAC-0371", "artifact-dedup", 370, "fastcdc", b, bs,
        "FOLLOWUP BAC-0336: FastCDC normalized chunking vs plain Rabin CDC", a, ast,
        extra={"shared_before": sb, "chunks_before": tb, "shared_after": sa, "chunks_after": ta})

# k372 BAC-0372 build-caching (371): FOLLOWUP BAC-0337 blake2b vs sha256
def k372():
    files = [("content-%d" % i).encode()*100 for i in range(2000)]
    def before():
        return [hashlib.sha256(v).hexdigest() for v in files]
    def after():  # CHANGE: blake2b
        return [hashlib.blake2b(v).hexdigest() for v in files]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0372", "build-caching", 371, "blake2b", b, bs,
        "FOLLOWUP BAC-0337: blake2b vs sha256 for content hashing", a, ast)

# k373 BAC-0373 browser-pooling (372): FOLLOWUP BAC-0338 ARC p-tuning
def k373():
    pages = ["p%d" % i for i in range(20)]
    reqs = [pages[min(19, int(rng.paretovariate(1.5)) - 1)] for _ in range(600)]
    def arc(p_fixed=None):
        t1, t2 = OrderedDict(), OrderedDict(); b1, b2 = OrderedDict(), OrderedDict()
        p = 0; miss = 0; C = 4
        for q in reqs:
            if q in t1: t1.move_to_end(q); continue
            if q in t2: t2.move_to_end(q); continue
            miss += 1
            if q in b1:
                if p_fixed is None: p = min(C, p + max(1, len(b2)//max(1, len(b1))))
                t2[q] = 1; del b1[q]
            elif q in b2:
                if p_fixed is None: p = max(0, p - max(1, len(b1)//max(1, len(b2))))
                t2[q] = 1; del b2[q]
            else:
                if len(t1) + len(b1) >= C:
                    if len(t1) < C:
                        if b1: b1.popitem(last=False)
                    else: t1.popitem(last=False)
                t1[q] = 1
            # enforce sizes
            while len(t1) > p and t1:
                k, _ = t1.popitem(last=False); b1[k] = 1
            while len(t1) + len(t2) > C and t2:
                k, _ = t2.popitem(last=False); b2[k] = 1
        return miss
    m_adapt = arc(None); m_fix = arc(2)
    b, bs = B.med(lambda: arc(None)); a, ast = B.med(lambda: arc(2))
    rec("BAC-0373", "browser-pooling", 372, "arc_ptune", b, bs,
        "FOLLOWUP BAC-0338: ARC with fixed p=2 vs adaptive p (simulated)", a, ast,
        extra={"misses_before": m_adapt, "misses_after": m_fix})

# k374 BAC-0374 test-selection (373): FOLLOWUP BAC-0339 reverse-dep impact
def k374():
    tests = ["t%d" % i for i in range(60)]
    changed = {"t3", "t17"}
    cov = {t: {"f%d" % (hash(t) % 20)} for t in tests}
    affected = {f for t in changed for f in cov[t]}
    revdep = defaultdict(set)  # file -> tests covering it
    for t in tests:
        for f in cov[t]: revdep[f].add(t)
    def before():  # coverage-guided
        return [t for t in tests if cov[t] & affected]
    def after():  # CHANGE: reverse-dep closure from changed files
        out = set()
        for f in affected: out |= revdep[f]
        return sorted(out)
    nb = len(before()); na = len(after())
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0374", "test-selection", 373, "revdep_impact", b, bs,
        "FOLLOWUP BAC-0339: reverse-dep closure vs coverage scan (selection size)", a, ast,
        extra={"tests_before": nb, "tests_after": na})

# k375 BAC-0375 selective-regeneration (374): FOLLOWUP BAC-0340 real change
def k375():
    blocks = ["b%d" % i for i in range(200)]
    content = {b: "v0" for b in blocks}
    def render(b):
        s = 0
        for k in range(30000): s += (k * hash((b, content[b]))) & 0xFF
        return s
    prev = {b: render(b) for b in blocks}
    content["b27"] = "v1"  # REAL content change this time
    pages = [blocks[i:i+4] for i in range(0, 200, 4)]
    changed = {"b27"}
    def before():  # page-level
        out = 0
        for pg in pages:
            if any(b in changed for b in pg):
                for b in pg: render(b); out += 1
        return out
    def after():  # CHANGE: block-level with real change
        out = 0
        for b in changed:
            if render(b) != prev[b]: out += 1
        return out
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0375", "selective-regeneration", 374, "blockchange_real", b, bs,
        "FOLLOWUP BAC-0340: block-level vs page-level with a real content change", a, ast,
        extra={"renders_before": nb, "renders_after": na})

BENCHES8A = [k351, k352, k353, k354, k355, k356, k357, k358, k359, k360,
             k361, k362, k363, k364, k365, k366, k367, k368, k369, k370,
             k371, k372, k373, k374, k375]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES8A:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    with open(os.path.join(HERE, "bench8_results.json"), "w") as f:
        json.dump({"results": results, "repeats": B.R,
                   "elapsed_s": round(time.time() - t0, 1)}, f, indent=1)
    print("wrote bench8_results.json, %d missions" % len(results))
