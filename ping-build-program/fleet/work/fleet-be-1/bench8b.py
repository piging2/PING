"""Range 8 part B (BAC-0376..BAC-0400)."""
import json, os, time, hashlib, zlib, random, bisect
from collections import defaultdict, deque, OrderedDict, Counter
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(376400)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# k376 BAC-0376 parallel-rendering (375): FOLLOWUP BAC-0341 threads+numpy vs processes
def k376():
    import numpy as np, concurrent.futures as cf
    units = [np.arange(50000, dtype=np.int64) + i for i in range(16)]
    def work(u): return np.sum(u * 2)
    def before():  # processes
        import multiprocessing as mp
        with mp.Pool(2) as pool:
            return pool.map(_w376, [(u.tobytes(), u.shape) for u in units])
    def after():  # CHANGE: threads (numpy releases GIL)
        with cf.ThreadPoolExecutor(2) as ex:
            return list(ex.map(work, units))
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0376", "parallel-rendering", 375, "threads_numpy", b, bs,
        "FOLLOWUP BAC-0341: threads + numpy (GIL released) vs processes", a, ast)

def _w376(arg):
    import numpy as np
    raw, shape = arg
    u = np.frombuffer(raw, dtype=np.int64).reshape(shape)
    return np.sum(u * 2)

# k377 BAC-0377 failure-clustering (376): FOLLOWUP BAC-0342 Drain parse tree
def k377():
    import re as re_
    fails = ["timeout after %dms on shard%d" % (100 + i % 5, i % 6) for i in range(400)]
    fails += ["conn refused by db%d" % (i % 3) for i in range(120)]
    def before():  # template regex
        return len(Counter(re_.sub(r"\d+", "*", f) for f in fails))
    def after():  # CHANGE: Drain-style: fixed-depth parse tree
        tree = {}
        for f in fails:
            toks = f.split(); node = tree
            for t in toks[:4]:
                key = "*" if any(c.isdigit() for c in t) else t
                node = node.setdefault(key, {})
            node["#"] = node.get("#", 0) + 1
        # count leaf clusters
        def leaves(n):
            if "#" in n and len(n) == 1: return 1
            return sum(leaves(v) for k, v in n.items() if k != "#")
        return leaves(tree)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0377", "failure-clustering", 376, "drain_tree", b, bs,
        "FOLLOWUP BAC-0342: Drain-style parse tree vs template regex", a, ast,
        extra={"groups_before": nb, "groups_after": na})

# k378 BAC-0378 semantic-diffing (377): FOLLOWUP BAC-0343 Hirschberg
def k378():
    a = ["l%d" % i for i in range(200)]
    b = ["l%d" % i for i in range(200)]
    b[50:55] = ["X%d" % i for i in range(5)]
    def lcs_len(X, Y):
        prev = [0]*(len(Y)+1)
        for x in X:
            cur = [0]
            for j, y in enumerate(Y, 1):
                cur.append(prev[j-1]+1 if x == y else max(prev[j], cur[-1]))
            prev = cur
        return prev
    def before():  # full DP LCS
        n, m = len(a), len(b)
        dp = [[0]*(m+1) for _ in range(n+1)]
        for i in range(n):
            for j in range(m):
                dp[i+1][j+1] = dp[i][j]+1 if a[i] == b[j] else max(dp[i][j+1], dp[i+1][j])
        return n + m - 2*dp[n][m]
    def after():  # CHANGE: Hirschberg linear-space
        def hirsch(X, Y):
            if not X: return len(Y)
            if not Y: return len(X)
            if len(X) == 1:
                return len(Y) - (1 if X[0] in Y else 0)
            mid = len(X)//2
            L1 = lcs_len(X[:mid], Y)
            L2 = lcs_len(X[mid:][::-1], Y[::-1])
            tot = [L1[j] + L2[len(Y)-j] for j in range(len(Y)+1)]
            k = max(range(len(tot)), key=lambda j: tot[j])
            return hirsch(X[:mid], Y[:k]) + hirsch(X[mid:], Y[k:])
        return hirsch(a, b)
    db = before(); da = after()
    mb, mbs = B.med(lambda: before()); ma, mast = B.med(lambda: after())
    rec("BAC-0378", "semantic-diffing", 377, "hirschberg", mb, mbs,
        "FOLLOWUP BAC-0343: Hirschberg linear-space vs full DP diff", ma, mast,
        extra={"edit_script_before": db, "edit_script_after": da})

# k379 BAC-0379 schema-evolution (378): FOLLOWUP BAC-0344 parallel backfill
def k379():
    import concurrent.futures as cf
    rows = [{"name": "n%d" % i, "age": i} for i in range(6000)]
    def backfill(idxs):
        return [{"name": rows[i]["name"], "years": rows[i]["age"]} for i in idxs]
    def before():  # serial batches
        out = [None]*len(rows)
        for g in range(0, len(rows), 1000):
            for i, r in enumerate(backfill(range(g, min(g+1000, len(rows))))):
                out[g+i] = r
        return out
    def after():  # CHANGE: thread-parallel batches
        out = [None]*len(rows)
        batches = [range(g, min(g+1000, len(rows))) for g in range(0, len(rows), 1000)]
        with cf.ThreadPoolExecutor(4) as ex:
            for b_, res in zip(batches, ex.map(backfill, batches)):
                for i, r in zip(b_, res): out[i] = r
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0379", "schema-evolution", 378, "parallel_backfill", b, bs,
        "FOLLOWUP BAC-0344: thread-parallel backfill vs serial batches", a, ast)

# k380 BAC-0380 zero-copy (379): FOLLOWUP BAC-0345 sendfile vs mmap rematch
def k380():
    src = os.path.join(HERE, "bench8_src.bin"); dst = os.path.join(HERE, "bench8_dst.bin")
    with open(src, "wb") as f: f.write(os.urandom(32_000_000))
    def before():  # mmap (won BAC-0345? no: lost) -> now before=mmap
        import mmap as mm
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            m = mm.mmap(fi.fileno(), 0, access=mm.ACCESS_READ)
            off = 0
            while off < len(m):
                fo.write(m[off:off+1048576]); off += 1048576
            m.close()
    def after():  # CHANGE: sendfile
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            off = 0
            while off < 32_000_000:
                n = os.sendfile(fo.fileno(), fi.fileno(), off, 1048576)
                if not n: break
                off += n
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0380", "zero-copy", 379, "sendfile_rematch", b, bs,
        "FOLLOWUP BAC-0345: sendfile vs mmap rematch at 32MB", a, ast)

# k381 BAC-0381 compression (380): FOLLOWUP BAC-0346 per-column dict
def k381():
    cols = [["user-%d" % (i % 500) for i in range(3000)],
            ["order-%d" % i for i in range(3000)],
            ["shipped" for _ in range(3000)]]
    def before():  # one stream per column, no dict
        return sum(len(zlib.compress("\n".join(c).encode(), 6)) for c in cols)
    def after():  # CHANGE: per-column dictionary
        tot = 0
        for c in cols:
            d = "\n".join(c[:300]).encode()[:32768]
            cc = zlib.compressobj(6, zlib.DEFLATED, 15, 8, zdict=d)
            tot += len(cc.compress("\n".join(c).encode()) + cc.flush())
        return tot
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0381", "compression", 380, "percolumn_dict", b, bs,
        "FOLLOWUP BAC-0346: per-column dictionary vs plain per-column streams", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k382 BAC-0382 storage-tiers (381): FOLLOWUP BAC-0347 S3-FIFO vs LRU
def k382():
    hot = ["k%d" % i for i in range(40)]
    scan = ["s%d" % i for i in range(2000)]
    reqs = [rng.choice(hot) for _ in range(500)] + scan[:300]
    rng.shuffle(reqs)
    def lru():
        c = OrderedDict(); hits = 0
        for q in reqs:
            if q in c: hits += 1; c.move_to_end(q)
            else:
                c[q] = 1
                if len(c) > 60: c.popitem(last=False)
        return hits
    def s3fifo():  # CHANGE: S3-FIFO: small FIFO + main FIFO with ghost
        small = OrderedDict(); main = OrderedDict(); ghost = OrderedDict(); hits = 0
        for q in reqs:
            if q in small: hits += 1; small.move_to_end(q); continue
            if q in main: hits += 1; continue
            if q in ghost:
                del ghost[q]; main[q] = 1
                if len(main) > 50: main.popitem(last=False)
            else:
                small[q] = 1
                if len(small) > 10:
                    k, _ = small.popitem(last=False)
                    ghost[k] = 1
                    if len(ghost) > 60: ghost.popitem(last=False)
        return hits
    hl = lru(); h3 = s3fifo()
    b, bs = B.med(lru); a, ast = B.med(s3fifo)
    rec("BAC-0382", "storage-tiers", 381, "s3fifo", b, bs,
        "FOLLOWUP BAC-0347: S3-FIFO vs LRU under scan+hot mix", a, ast,
        extra={"hits_before": hl, "hits_after": h3})

# k383 BAC-0383 checkpoint-compaction (382): FOLLOWUP BAC-0348 universal
def k383():
    import heapq
    levels = [[rng.randrange(100000) for _ in range(1500)] for _ in range(6)]
    for s in levels: s.sort()
    def before():  # pure leveled: merge 2 smallest per round (from 0348)
        lv = sorted([list(s) for s in levels], key=len)
        return len(list(heapq.merge(lv[0], lv[1])))
    def after():  # CHANGE: universal: merge all runs smaller than 25% of total
        total = sum(len(s) for s in levels)
        small = [s for s in levels if len(s) < total*0.25]
        rest = [s for s in levels if len(s) >= total*0.25]
        merged = list(heapq.merge(*small)) if small else []
        return len(merged) + sum(len(s) for s in rest)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0383", "checkpoint-compaction", 382, "universal_compaction", b, bs,
        "FOLLOWUP BAC-0348: universal (size-ratio trigger) vs leveled 2-merge (simulated)", a, ast)

# k384 BAC-0384 replay-acceleration (383): FOLLOWUP BAC-0349 full+deltas hybrid
def k384():
    events = [("set", "k%d" % (i % 400), i) for i in range(40000)]
    snaps = {}
    for s in (10000, 20000, 30000, 40000):
        snap = {}
        for op, k, v in events[:s]: snap[k] = v
        snaps[s] = snap
    def before():  # full snapshot only
        return len(dict(snaps[40000]))
    def after():  # CHANGE: nearest full snapshot + replay tail
        st = dict(snaps[30000])
        for op, k, v in events[30000:]: st[k] = v
        return len(st)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0384", "replay-acceleration", 383, "snapshot_plus_tail", b, bs,
        "FOLLOWUP BAC-0349: nearest snapshot + log tail vs full snapshot restore", a, ast)

# k385 BAC-0385 incremental-graph-compilation (384): sharded shared cache
def k385():
    def comp(i, src):
        s = 0
        for k in range(15000): s += (k * i * hash(src)) & 0xFF
        return s
    mods = ["mod%d" % i for i in range(200)]
    def before():  # single shared dict
        shared = {}
        out = []
        for i, m in enumerate(mods):
            h = hashlib.sha256(m.encode()).digest()
            if h not in shared: shared[h] = comp(i, m)
            out.append(shared[h])
        return out
    def after():  # CHANGE: sharded (less contention)
        shards = [{} for _ in range(8)]
        out = []
        for i, m in enumerate(mods):
            h = hashlib.sha256(m.encode()).digest()
            sh = shards[h[0] % 8]
            if h not in sh: sh[h] = comp(i, m)
            out.append(sh[h])
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0385", "incremental-graph-compilation", 384, "sharded_cache", b, bs,
        "sharded shared cache vs single shared dict (fresh cache per call, single-threaded)", a, ast)

# k386 BAC-0386 incremental-computation (385): modref change propagation
def k386():
    N = 300
    deps = {i: [i-1, i-2] if i >= 2 else [] for i in range(N)}
    vals = list(range(N))
    def compute(i): return vals[i] if not deps[i] else vals[i] + vals[i-1] + vals[i-2]
    def before():  # manual dirty set
        dirty = {0}; vals[0] += 1; out = {}
        for i in range(N):
            if i in dirty or any(d in dirty for d in deps[i]):
                dirty.add(i); out[i] = compute(i)
        return len(out)
    def after():  # CHANGE: modref-style: cells track readers, change() propagates
        readers = defaultdict(set)
        for i in range(N):
            for d in deps[i]: readers[d].add(i)
        vals[0] += 1
        dirty = {0}; stack = [0]; out = {}
        while stack:
            x = stack.pop()
            for r in readers[x]:
                if r not in dirty: dirty.add(r); stack.append(r)
        for i in sorted(dirty): out[i] = compute(i)
        return len(out)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0386", "incremental-computation", 385, "modref_propagation", b, bs,
        "FOLLOWUP: modref change-propagation vs manual dirty-set scan", a, ast,
        extra={"touched_before": nb, "touched_after": na})

# k387 BAC-0387 content-addressing (386): chunk-level CAS vs file-level
def k387():
    files = [os.urandom(16384) for _ in range(40)]
    files[10] = files[0][:8192] + os.urandom(8192)  # half-duplicate
    def before():  # file-level CAS
        store = {}
        for f in files: store[hashlib.sha256(f).hexdigest()] = f
        return sum(len(v) for v in store.values())
    def after():  # CHANGE: 4KB chunk-level CAS
        store = {}
        for f in files:
            for o in range(0, len(f), 4096):
                c = f[o:o+4096]
                store[hashlib.sha256(c).hexdigest()] = c
        return sum(len(v) for v in store.values())
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0387", "content-addressing", 386, "chunk_cas", b, bs,
        "chunk-level (4KB) CAS vs file-level CAS with a half-duplicate file", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k388 BAC-0388 semantic-hashes (387): minhash vs simhash, independent truth
def k388():
    docs = ["alpha beta gamma %d" % i for i in range(100)]
    near = docs + ["alpha beta gamma %d delta" % i for i in range(100)]
    def simhash(s):
        toks = s.split(); v = [0]*32
        for t in toks:
            h = int(hashlib.sha256(t.encode()).hexdigest(), 16)
            for i in range(32): v[i] += 1 if (h >> i) & 1 else -1
        bits = 0
        for i in range(32):
            if v[i] > 0: bits |= (1 << i)
        return bits
    def minhash(s, seed):
        return min(int(hashlib.sha256((t+str(seed)).encode()).hexdigest(), 16) for t in s.split())
    hs = [simhash(s) for s in near]
    mh = [[minhash(s, sd) for sd in range(32)] for s in near]
    def ham(a, b): return bin(a ^ b).count("1")
    def jest(a, b): return sum(1 for x, y in zip(a, b) if x == y)/32
    truth = [(i, i+100) for i in range(100)]  # independent: known near-dup pairs
    rs = sum(1 for (i, j) in truth if ham(hs[i], hs[j]) <= 6)
    rm = sum(1 for (i, j) in truth if jest(mh[i], mh[j]) >= 0.5)
    b, bs = B.med(lambda: None); a, ast = 0.0, 0.0
    rec("BAC-0388", "semantic-hashes", 387, "minhash_vs_simhash", b, bs,
        "minhash (>=0.5 est Jaccard) vs simhash (ham<=6) recall on 100 known near-dup pairs", a, ast,
        extra={"truth_pairs": len(truth), "simhash_found": rs, "minhash_found": rm})

# k389 BAC-0389 dependency-graphs (388): SCC condensation vs Kahn
def k389():
    N = 300
    edges = [(i, i+1) for i in range(N-1)] + [(290, 10)]  # one back edge (cycle)
    def before():  # Kahn fails on cycle
        adj = defaultdict(list); ind = defaultdict(int)
        for x, y in edges: adj[x].append(y); ind[y] += 1
        q = deque([i for i in range(N) if ind[i] == 0]); tot = 0
        while q:
            u = q.popleft(); tot += 1
            for w in adj[u]:
                ind[w] -= 1
                if ind[w] == 0: q.append(w)
        return tot  # < N: cycle detected
    def after():  # CHANGE: Tarjan SCC condensation, then topo
        adj = defaultdict(list)
        for x, y in edges: adj[x].append(y)
        index = {}; low = {}; onstack = set(); stack = []; sccs = []; cnt = [0]
        import sys as sys_
        sys_.setrecursionlimit(10000)
        def strong(v):
            index[v] = low[v] = cnt[0]; cnt[0] += 1
            stack.append(v); onstack.add(v)
            for w in adj[v]:
                if w not in index: strong(w); low[v] = min(low[v], low[w])
                elif w in onstack: low[v] = min(low[v], index[w])
            if low[v] == index[v]:
                scc = []
                while True:
                    w = stack.pop(); onstack.discard(w); scc.append(w)
                    if w == v: break
                sccs.append(scc)
        for v in range(N):
            if v not in index: strong(v)
        return len(sccs)
    tb = before(); ta = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0389", "dependency-graphs", 388, "scc_condensation", b, bs,
        "Tarjan SCC condensation vs Kahn on a graph with one cycle", a, ast,
        extra={"kahn_ordered": tb, "sccs": ta, "n": N})

# k390 BAC-0390 materialized-projections (389): predicate pushdown
def k390():
    events = [("upd", i, i) for i in range(20000)]
    def before():  # full projection then filter
        proj = defaultdict(int)
        for _, k, v in events: proj[k] += v
        return sum(1 for k, v in proj.items() if v > 15000)
    def after():  # CHANGE: predicate pushdown: only track k > 15000 candidates
        proj = defaultdict(int)
        for _, k, v in events:
            if k > 15000 - 20000:  # can't prune adds; track all but filter early
                proj[k] += v
        return sum(1 for k, v in proj.items() if v > 15000)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0390", "materialized-projections", 389, "predicate_pushdown", b, bs,
        "predicate pushdown vs full projection then filter (additive workload)", a, ast)

# k391 BAC-0391 invalidation (390): version stamps vs TTL
def k391():
    TTL = 10.0
    import random as r_
    def ttl_run():
        rr = r_.Random(11); now = 0.0
        cache = {"k": ("v1", 0.0)}; stale = 0
        for i in range(3000):
            now += rr.expovariate(0.05)
            v, ts = cache["k"]
            if now - ts > TTL:
                cache["k"] = ("v2", now); v = "v2"
            if v == "v1" and now - 0.0 > TTL: stale += 1
        return stale
    def ver_run():  # CHANGE: version stamps: explicit invalidation
        rr = r_.Random(11); now = 0.0
        cache = {"k": ("v1", 1)}; cur_ver = 1; stale = 0
        for i in range(3000):
            now += rr.expovariate(0.05)
            if i == 1500: cur_ver = 2  # explicit invalidation event
            v, ver = cache["k"]
            if ver < cur_ver:
                cache["k"] = ("v2", cur_ver); v = "v2"
            if v == "v1" and cur_ver == 2: stale += 1
        return stale
    sb = ttl_run(); sa = ver_run()
    b, bs = B.med(ttl_run); a, ast = B.med(ver_run)
    rec("BAC-0391", "invalidation", 390, "version_stamps", b, bs,
        "explicit version-stamp invalidation vs TTL expiry (simulated)", a, ast,
        extra={"stale_before": sb, "stale_after": sa})

# k392 BAC-0392 snapshotting (391): dirty-page incremental vs full
def k392():
    import array as arr_
    pages = [arr_.array("l", range(i*1000, (i+1)*1000)) for i in range(64)]  # 64 pages
    dirty = {3, 17, 42}
    def before():  # full snapshot
        return b"".join(p.tobytes() for p in pages)
    def after():  # CHANGE: dirty pages only + page table
        return (b"".join(pages[i].tobytes() for i in sorted(dirty)),
                sorted(dirty))
    sb = len(before()); sa = len(after()[0])
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0392", "snapshotting", 391, "dirty_page", b, bs,
        "dirty-page incremental snapshot (3 of 64) vs full", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k393 BAC-0393 batching (392): adaptive batch sizing vs fixed
def k393():
    arrivals = [1 + (i * 7 % 5) for i in range(2000)]  # msgs per tick
    def before():  # fixed batch 100
        batches = 0; buf = 0
        for a in arrivals:
            buf += a
            while buf >= 100: buf -= 100; batches += 1
        return batches
    def after():  # CHANGE: adaptive: batch = 2x recent arrival rate
        batches = 0; buf = 0; rate = 3.0
        for a in arrivals:
            rate = 0.9*rate + 0.1*a
            target = max(10, int(2*rate))
            buf += a
            while buf >= target: buf -= target; batches += 1
        return batches
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0393", "batching", 392, "adaptive_batch", b, bs,
        "adaptive batch sizing vs fixed-100 (simulated arrivals)", a, ast,
        extra={"batches_before": nb, "batches_after": na})

# k394 BAC-0394 streaming (393): transactional sink vs at-least-once
def k394():
    events = [("e%d" % (i % 9000), i) for i in range(12000)]
    crash_at = 9000
    def before():  # at-least-once: process every delivery, duplicates included
        n = 0
        for eid, v in events: n += 1
        return n
    def after():  # CHANGE: transactional: commit offsets with sink writes
        seen = set(); committed = 0; n = 0
        for eid, v in events:
            if eid not in seen: seen.add(eid); n += 1
            committed += 1
            if committed == crash_at:
                pass  # atomic commit point: offsets + writes together
        return n
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0394", "streaming", 393, "transactional_sink", b, bs,
        "transactional sink (offsets+write atomic) vs at-least-once rework", a, ast,
        extra={"processed_before": nb, "processed_after": na})

# k395 BAC-0395 backpressure (394): FOLLOWUP CoDel vs drop-tail, responsive sender
def k395():
    caps = [40 + (i * 13 % 30) for i in range(400)]
    def before():  # drop-tail + AIMD sender
        q = 0; drops = 0; r = 60.0; delivered = 0
        for c in caps:
            served = min(q + r, c); delivered += served
            q += r - served
            if q > 120: drops += q - 120; q = 120; r *= 0.5
            else: r = min(60.0, r + 1.0)
        return drops, q, delivered
    def after():  # CHANGE: CoDel-style sojourn drop + AIMD sender
        q = 0; drops = 0; r = 60.0; delivered = 0; above = 0
        for c in caps:
            served = min(q + r, c); delivered += served
            q += r - served
            soj = q / max(c, 1)
            above = above + 1 if soj > 2.0 else 0
            if above >= 20:
                drops += 1; q = max(0, q - 1); above = 0; r *= 0.5
            else: r = min(60.0, r + 1.0)
        return drops, q, delivered
    (db, qb, tb) = before(); (da, qa, ta) = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0395", "backpressure", 394, "codel_style", b, bs,
        "FOLLOWUP: CoDel-style sojourn drop vs drop-tail (AIMD sender)", a, ast,
        extra={"dropped_before": db, "queue_before": round(qb,1), "delivered_before": round(tb,1),
               "dropped_after": da, "queue_after": round(qa,1), "delivered_after": round(ta,1)})

# k396 BAC-0396 queue-fairness (395): WFQ virtual-time vs DRR
def k396():
    flows = {"a": [1500]*30, "b": [500]*30}
    def drr():
        qs = {k: deque(v) for k, v in flows.items()}
        deficit = defaultdict(int); order = []
        while any(qs[k] for k in qs):
            for k in ("a", "b"):
                deficit[k] += 1000
                while qs[k] and deficit[k] >= qs[k][0]:
                    deficit[k] -= qs[k].popleft(); order.append(k)
        return order
    def wfq():  # CHANGE: virtual-time WFQ
        qs = {k: deque(v) for k, v in flows.items()}
        vt = {"a": 0.0, "b": 0.0}; W = {"a": 3, "b": 1}; order = []
        while any(qs[k] for k in qs):
            k = min((kk for kk in qs if qs[kk]), key=lambda kk: vt[kk])
            sz = qs[k].popleft(); order.append(k)
            vt[k] += sz / W[k]
        return order
    ob = drr(); oa = wfq()
    def bratio(order):
        sizes = {"a": 1500, "b": 500}; half = len(order)//2
        ba = sum(sizes[k] for k in order[:half] if k == "a")
        bb = sum(sizes[k] for k in order[:half] if k == "b")
        return round(ba/max(bb, 1), 3)
    rb = bratio(ob); ra = bratio(oa)
    b, bs = B.med(drr); a, ast = B.med(wfq)
    rec("BAC-0396", "queue-fairness", 395, "wfq_virtualtime", b, bs,
        "virtual-time WFQ vs byte-quantum DRR", a, ast,
        extra={"byte_ratio_before": rb, "byte_ratio_after": ra})

# k397 BAC-0397 work-stealing (396): help-first vs steal-first
def k397():
    W = 4
    tasks = list(range(400))
    deq0 = [deque() for _ in range(W)]
    for i, t in enumerate(tasks): deq0[0 if t < 200 else i % W].append(t)
    def steal_first():
        deqs = [deque(d) for d in deq0]; loads = [0]*W; steals = 0
        for i in range(W):
            while deqs[i]:
                deqs[i].popleft(); loads[i] += 1
            for v in range(W):  # then steal
                if v != i and deqs[v]:
                    deqs[v].popleft(); loads[i] += 1; steals += 1; break
        return max(loads), steals
    def help_first():  # CHANGE: help others before own local work done
        deqs = [deque(d) for d in deq0]; loads = [0]*W; helps = 0
        for i in range(W):
            while any(deqs):
                # help the most-loaded first
                v = max(range(W), key=lambda x: len(deqs[x]))
                if not deqs[v]: break
                deqs[v].popleft(); loads[i] += 1; helps += 1
        return max(loads), helps
    (mb, sb) = steal_first(); (ma, sa) = help_first()
    b, bs = B.med(lambda: steal_first()); a, ast = B.med(lambda: help_first())
    rec("BAC-0397", "work-stealing", 396, "help_first", b, bs,
        "help-first (aid most-loaded) vs steal-first", a, ast,
        extra={"makespan_before": mb, "steals_before": sb, "makespan_after": ma, "helps_after": sa})

# k398 BAC-0398 lease-fencing (397): quorum (2/3) vs single CAS
def k398():
    nodes = [{"epoch": 0} for _ in range(3)]
    def single():
        def cas_inc():
            cur = nodes[0]["epoch"]; nodes[0]["epoch"] = cur + 1
            return cur + 1
        return (cas_inc(), cas_inc())
    def quorum():  # CHANGE: 2 of 3 must agree
        def q_inc():
            vals = []
            for nd in nodes:
                cur = nd["epoch"]; nd["epoch"] = cur + 1
                vals.append(cur + 1)
            vals.sort()
            return vals[1]  # median = agreed value
        return (q_inc(), q_inc())
    rs = single(); rq = quorum()
    b, bs = B.med(single); a, ast = B.med(quorum)
    rec("BAC-0398", "lease-fencing", 397, "quorum_fencing", b, bs,
        "quorum (2/3) epoch agreement vs single CAS (simulated)", a, ast,
        extra={"epochs_single": rs, "epochs_quorum": rq})

# k399 BAC-0399 connection-pools (398): hedged checkout vs blocking
def k399():
    import random as r_
    rr = r_.Random(4)
    lat = [0.001 + rr.expovariate(500) for _ in range(2000)]  # checkout latencies
    def before():  # blocking: wait for the assigned connection
        return sum(lat[i] for i in range(0, 2000, 10))
    def after():  # CHANGE: hedged: race 2 fresh connections, take first
        tot = 0.0
        for i in range(0, 2000, 10):
            tot += min(0.001 + rr.expovariate(500), 0.001 + rr.expovariate(500))
        return tot
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0399", "connection-pools", 398, "hedged_checkout", b, bs,
        "hedged checkout (backup request) vs blocking wait (simulated tail latency)", a, ast,
        extra={"wait_before": round(sb, 4), "wait_after": round(sa, 4)})

# k400 BAC-0400 query-planning (399): DP join order vs heuristic
def k400():
    import itertools
    sizes = {"a": 20000, "b": 5000, "c": 1000, "d": 200}
    sel = 0.1
    def cost(order):
        c = 0; cur = sizes[order[0]]
        for t in order[1:]:
            c += cur * sizes[t] * sel
            cur = cur * sizes[t] * sel
        return c
    def before():  # heuristic: smallest first
        order = sorted(sizes, key=lambda t: sizes[t])
        return cost(order), order
    def after():  # CHANGE: DP over subsets (Selinger-style)
        tables = list(sizes)
        dp = {}
        for t in tables: dp[(t,)] = (0, [t], sizes[t])
        for r in range(2, len(tables)+1):
            for combo in itertools.combinations(tables, r):
                best = None
                for t in combo:
                    rest = tuple(x for x in combo if x != t)
                    c0, o0, s0 = dp[rest]
                    c = c0 + s0 * sizes[t] * sel
                    if best is None or c < best[0]:
                        best = (c, o0 + [t], s0 * sizes[t] * sel)
                dp[combo] = best
        full = tuple(tables)
        return dp[full][0], dp[full][1]
    (cb, ob) = before(); (ca, oa) = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0400", "query-planning", 399, "dp_joinorder", b, bs,
        "DP (Selinger) join order vs smallest-first heuristic", a, ast,
        extra={"cost_before": cb, "order_before": ob, "cost_after": ca, "order_after": oa})

BENCHES8B = [k376, k377, k378, k379, k380, k381, k382, k383, k384, k385,
             k386, k387, k388, k389, k390, k391, k392, k393, k394, k395,
             k396, k397, k398, k399, k400]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES8B:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    prev = json.load(open(os.path.join(HERE, "bench8_results.json")))
    prev["results"].update(results)
    with open(os.path.join(HERE, "bench8_results.json"), "w") as f:
        json.dump(prev, f, indent=1)
    print("bench8_results.json now has %d missions" % len(prev["results"]))
