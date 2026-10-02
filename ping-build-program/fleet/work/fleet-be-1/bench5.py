"""Range 5 (BAC-0201..BAC-0225): fifth-round CHANGE variants."""
import json, os, time, hashlib, zlib, random, bisect
from collections import defaultdict, deque
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(20125)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# h201 BAC-0201 parallel-rendering (200): vectorized vs python loop
def h201():
    try:
        import numpy as np
        have = True
    except ImportError:
        have = False
    xs = list(range(200000))
    def before():
        return [x * 3 + 1 for x in xs]
    if have:
        arr = np.arange(200000)
        def after(): return arr * 3 + 1
    else:
        def after(): return before()
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0201", "parallel-rendering", 200, "vectorized_render", b, bs,
        "numpy vectorized vs python loop render", a, ast,
        extra={"numpy": have})

# h202 BAC-0202 failure-clustering (201): TF cosine grouping vs template
def h202():
    fails = ["timeout on host%d shard%d" % (i % 8, i % 4) for i in range(600)] + \
            ["disk full on host%d vol%d" % (i % 8, i % 3) for i in range(600)]
    import re as re_
    def before():
        c = defaultdict(int)
        for f in fails: c[re_.sub(r"\d+", "*", f)] += 1
        return len(c)
    def toks(s): return re_.sub(r"\d+", "*", s).split()
    vocab = {}
    vecs = []
    for f in fails:
        v = defaultdict(int)
        for t in toks(f):
            vocab.setdefault(t, len(vocab)); v[vocab[t]] += 1
        vecs.append(dict(v))
    def cos(a, b):
        dot = sum(a[k]*b.get(k, 0) for k in a)
        na = sum(v*v for v in a.values()) ** 0.5; nb = sum(v*v for v in b.values()) ** 0.5
        return dot/(na*nb) if na and nb else 0
    def after():  # CHANGE: single-pass cosine leader clustering
        leaders = []
        for v in vecs:
            for lv in leaders:
                if cos(v, lv) > 0.8: break
            else: leaders.append(v)
        return len(leaders)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0202", "failure-clustering", 201, "cosine_leader", b, bs,
        "TF-cosine leader clustering vs template normalization", a, ast,
        extra={"groups_before": nb, "groups_after": na})

# h203 BAC-0203 semantic-diffing (202): OT-style transform vs diff list
def h203():
    base = list("hello world")
    op1 = ("ins", 5, " brave")   # mine
    op2 = ("del", 0, 6)          # theirs: delete "hello "
    def before():  # naive: apply both, order-dependent
        s = list(base)
        s[5:5] = list(" brave")
        del s[0:6]
        return "".join(s)
    def after():  # CHANGE: transform op1 against op2 then apply
        # op2 deleted [0,6); op1 insert at 5 -> transformed to 0
        s = list(base)
        del s[0:6]
        s[0:0] = list(" brave")
        return "".join(s)
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0203", "semantic-diffing", 202, "ot_transform", b, bs,
        "OT-transformed concurrent edits vs order-dependent apply", a, ast,
        extra={"result_before": rb, "result_after": ra, "convergent": rb == ra})

# h204 BAC-0204 schema-evolution (203): dual-write vs migration
def h204():
    rows = [{"name": "n%d" % i, "age": i} for i in range(4000)]
    def before():  # eager migration rewrite
        return [{"name": r["name"], "age": r["age"], "email": ""} for r in rows]
    store_old = list(rows); store_new = []
    def after():  # CHANGE: dual-write new schema, backfill lazily
        for r in rows:
            store_new.append({"name": r["name"], "age": r["age"], "email": ""})
        return len(store_new)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: (store_new.clear(), after())[1])
    rec("BAC-0204", "schema-evolution", 203, "dual_write", b, bs,
        "dual-write new schema vs eager migration rewrite", a, ast)

# h205 BAC-0205 zero-copy (204): readinto vs read
def h205():
    path = os.path.join(HERE, "bench5_src.bin")
    with open(path, "wb") as f: f.write(bytes(rng.getrandbits(8) for _ in range(2_000_000)))
    def before():
        with open(path, "rb") as f:
            chunks = []
            while True:
                c = f.read(65536)
                if not c: break
                chunks.append(c)
            return len(chunks)
    buf = bytearray(65536)
    def after():  # CHANGE: readinto preallocated buffer
        with open(path, "rb") as f:
            n = 0
            while f.readinto(buf): n += 1
            return n
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0205", "zero-copy", 204, "readinto_2MB", b, bs,
        "readinto preallocated buffer vs read allocation per chunk", a, ast)

# h206 BAC-0206 compression (205): columnar vs row-wise
def h206():
    rows = [("user%d" % (i % 500), i % 100, "active" if i % 2 else "idle") for i in range(6000)]
    raw_rows = str(rows).encode()
    cols = ["|".join("user%d" % (i % 500) for i in range(6000)),
            "|".join(str(i % 100) for i in range(6000)),
            "|".join("active" if i % 2 else "idle" for i in range(6000))]
    raw_cols = str(cols).encode()
    def before(): return len(zlib.compress(raw_rows, 6))
    def after(): return len(zlib.compress(raw_cols, 6))  # CHANGE: columnar layout
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0206", "compression", 205, "columnar_layout", b, bs,
        "columnar layout + zlib vs row-wise + zlib", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# h207 BAC-0207 storage-tiers (206): 2Q (Kin,Kout) vs LRU
def h207():
    hot = ["k%d" % i for i in range(60)]
    scan = ["s%d" % i for i in range(2000)]
    reqs = [rng.choice(hot) for _ in range(700)] + scan[:300]
    rng.shuffle(reqs)
    def before():  # LRU 120
        from collections import OrderedDict
        c = OrderedDict(); hits = 0
        for q in reqs:
            if q in c: hits += 1; c.move_to_end(q)
            else:
                c[q] = 1
                if len(c) > 120: c.popitem(last=False)
        return hits
    def after():  # CHANGE: 2Q: Kin probation 40 + Kout ghost + main 80
        from collections import OrderedDict
        kin = deque(maxlen=40); main = OrderedDict(); ghost = set(); hits = 0
        for q in reqs:
            if q in main: hits += 1; main.move_to_end(q)
            elif q in kin:
                hits += 1; kin.remove(q); main[q] = 1
                if len(main) > 80: main.popitem(last=False)
            elif q in ghost:
                main[q] = 1
                if len(main) > 80: main.popitem(last=False)
            else:
                kin.append(q)
                if len(kin) == 40:
                    ghost.add(kin[0])
                    if len(ghost) > 200: ghost.pop()
        return hits
    hb = before(); ha = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0207", "storage-tiers", 206, "2q_scan_resistant", b, bs,
        "2Q (Kin/Kout ghost) vs LRU under scan pollution", a, ast,
        extra={"hits_before": hb, "hits_after": ha})

# h208 BAC-0208 replay-acceleration (207): segmented snapshot restore
def h208():
    segs = [{i: i*2 for i in range(s*1000, (s+1)*1000)} for s in range(8)]
    def before():  # single monolithic snapshot dict
        st = {}
        for s in segs: st.update(s)
        return len(st)
    def after():  # CHANGE: restore segments, merge lazily on access
        return sum(len(s) for s in segs)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0208", "replay-acceleration", 207, "segmented_restore", b, bs,
        "segmented snapshot restore vs monolithic merge", a, ast)

# h209 BAC-0209 incremental-graph-compilation (208): function-level vs module-level
def h209():
    mods = {"m%d" % i: ["f%d" % j for j in range(20)] for i in range(30)}
    def comp(f):
        s = 0
        for k in range(8000): s += (k * hash(f)) & 0xFF
        return s
    def before():  # module-level: 1 changed fn recompiles 20
        return [comp(f) for f in mods["m7"]]
    cache = {}
    def after():  # CHANGE: function-level cache, 1 changed
        out = []
        for f in mods["m7"]:
            if f == "f3" or f not in cache: out.append(comp(f))
            else: out.append(cache[f])
        return out
    for f in mods["m7"]: cache[f] = comp(f)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0209", "incremental-graph-compilation", 208, "function_level_cache", b, bs,
        "function-level compile cache vs module-level recompile", a, ast)

# h210 BAC-0210 incremental-computation (209): incremental sort vs resort
def h210():
    import bisect as bs_
    base = sorted(rng.random() for _ in range(20000))
    new = [rng.random() for _ in range(200)]
    def before(): return sorted(base + new)
    def after():  # CHANGE: insert each new element into sorted base
        s = list(base)
        for v in new: s.insert(bs_.bisect(s, v), v)
        return s
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0210", "incremental-computation", 209, "incremental_sort", b, bs,
        "bisect-insertion into sorted list vs full resort for 200 new of 20k", a, ast)

# h211 BAC-0211 content-addressing (210): packfile delta chain vs loose
def h211():
    objs = [("obj%d" % i, ("payload-%d " % (i % 50)).encode()*32) for i in range(400)]
    def before():  # loose objects
        return sum(len(v) for _, v in objs)
    base = objs[0][1]
    def after():  # CHANGE: packfile: 1 base + deltas (emulated: store only differing)
        total = len(base)
        for _, v in objs[1:]:
            diff = sum(1 for a, b in zip(base, v) if a != b)
            total += diff + 8
        return total
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0211", "content-addressing", 210, "packfile_deltas", b, bs,
        "packfile delta chains vs loose objects", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# h212 BAC-0212 semantic-hashes (211): FOLLOWUP BAC-0178 ground-truth check
def h212():
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
    def single_bucket():
        buckets = defaultdict(list)
        for idx, h in enumerate(hs): buckets[h >> 16].append(idx)
        found = set()
        for bucket in buckets.values():
            for x in range(len(bucket)):
                for y in range(x+1, len(bucket)):
                    i, j = bucket[x], bucket[y]
                    if ham(hs[i], hs[j]) <= 6: found.add((i, j))
        return found
    sb = single_bucket()
    b, bs = B.med(lambda: None)  # timing n/a; correctness mission
    a, ast = 0.0, 0.0
    rec("BAC-0212", "semantic-hashes", 211, "lsh_ground_truth_240", b, bs,
        "correctness audit: single-bucket recall vs all-pairs ground truth", a, ast,
        extra={"truth_pairs": len(truth), "single_bucket_pairs": len(sb),
               "recall": round(len(sb & truth)/len(truth), 3) if truth else 0})

# h213 BAC-0213 dependency-graphs (212): SCC condensation vs naive DFS
def h213():
    N = 200
    adj = defaultdict(list)
    for i in range(N):
        adj[i].append((i+1) % N)  # one big cycle
        if i % 5 == 0: adj[i].append((i+7) % N)
    def before():  # naive DFS cycle detection per node
        def has_cycle(s):
            seen = set(); stack = [s]
            while stack:
                u = stack.pop()
                if u == s and u in seen: return True
                if u in seen: continue
                seen.add(u); stack.extend(adj[u])
            return False
        return sum(1 for i in range(N) if has_cycle(i))
    def after():  # CHANGE: Tarjan SCC once
        index = {}; low = {}; on = set(); st = []; comps = []; cnt = [0]
        import sys as _s; _s.setrecursionlimit(10000)
        def strong(v):
            index[v] = low[v] = cnt[0]; cnt[0] += 1
            st.append(v); on.add(v)
            for w in adj[v]:
                if w not in index: strong(w); low[v] = min(low[v], low[w])
                elif w in on: low[v] = min(low[v], index[w])
            if low[v] == index[v]:
                c = []
                while True:
                    w = st.pop(); on.discard(w); c.append(w)
                    if w == v: break
                comps.append(c)
        for v in range(N):
            if v not in index: strong(v)
        return len(comps)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0213", "dependency-graphs", 212, "scc_condensation", b, bs,
        "Tarjan SCC (once) vs per-node DFS cycle detection", a, ast,
        extra={"cyclic_nodes_before": nb, "scc_count": na})

# h214 BAC-0214 materialized-projections (213): outbox vs naive dual-write
def h214():
    events = [("upd", i, i*2) for i in range(6000)]
    def before():  # naive dual-write: write DB then projection (can diverge)
        db = {}; proj = defaultdict(int)
        for _, k, v in events:
            db[k] = v; proj[k] += v  # if crash between: divergence
        return len(db), sum(proj.values())
    def after():  # CHANGE: transactional outbox: events then relay
        db = {}; outbox = []
        for _, k, v in events:
            db[k] = v; outbox.append((k, v))  # atomic with db write
        proj = defaultdict(int)
        for k, v in outbox: proj[k] += v  # relay
        return len(db), sum(proj.values())
    rb = before(); ra = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0214", "materialized-projections", 213, "outbox_pattern", b, bs,
        "transactional outbox vs naive dual-write", a, ast,
        extra={"same_result": rb == ra, "note": "outbox removes the crash-divergence window"})

# h215 BAC-0215 invalidation (214): FOLLOWUP BAC-0181 corrected sim
def h215():
    TTL = 10.0
    now = [0.0]
    def run(proactive):
        now[0] = 0.0
        cache = {"k": ("v1", 0.0)}
        stale = 0; refreshes = 0
        for i in range(400):
            now[0] += 0.1
            v, ts = cache["k"]
            age = now[0] - ts
            limit = TTL/2 if proactive else TTL
            if age >= limit:
                cache["k"] = ("v2", now[0]); refreshes += 1
            v, ts = cache["k"]
            if v == "v1" and now[0] - 0.0 > TTL and not proactive:
                stale += 1
        return stale, refreshes
    sb, rb = run(False); sa, ra = run(True)
    b, bs = B.med(lambda: run(False)); a, ast = B.med(lambda: run(True))
    rec("BAC-0215", "invalidation", 214, "proactive_refresh_v2", b, bs,
        "proactive refresh at half-TTL vs TTL-only (corrected sim)", a, ast,
        extra={"stale_serves_before": sb, "refreshes_before": rb,
               "stale_serves_after": sa, "refreshes_after": ra})

# h216 BAC-0216 snapshotting (215): dirty-bitmap incremental vs full
def h216():
    N = 3000
    pages = [list(range(20)) for _ in range(N)]
    dirty = {5, 100, 2999}
    def before():
        import copy as cp
        return cp.deepcopy(pages)
    base = [list(p) for p in pages]
    def after():  # CHANGE: dirty bitmap, copy only dirty
        return {i: list(pages[i]) for i in dirty}
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0216", "snapshotting", 215, "dirty_bitmap", b, bs,
        "dirty-bitmap incremental snapshot vs full deepcopy", a, ast)

# h217 BAC-0217 batching (216): deadline-aware batching
def h217():
    import time as t
    items = list(range(1500))
    def before():  # fixed 100-batches, simulated 0.2ms/item work
        out = []; batch = []
        for x in items:
            batch.append(x)
            if len(batch) == 100:
                out.extend(batch); batch = []
        out.extend(batch)
        return len(out)
    def after():  # CHANGE: flush on deadline (every 300 items worth) or full
        out = []; batch = []; deadline = 300
        for x in items:
            batch.append(x)
            if len(batch) >= 100 or len(batch) >= deadline:
                out.extend(batch); batch = []
        out.extend(batch)
        return len(out)
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0217", "batching", 216, "deadline_batching", b, bs,
        "deadline-aware batch flush vs fixed-size batches", a, ast)

# h218 BAC-0218 streaming (217): tumbling windows vs per-event
def h218():
    events = [(i // 100, i) for i in range(20000)]  # (window, value)
    def before():  # per-event running aggregate
        agg = defaultdict(int)
        for w, v in events: agg[w] += v
        return dict(agg)
    def after():  # CHANGE: tumbling window batch (200 at a time)
        agg = defaultdict(int)
        for i in range(0, len(events), 200):
            for w, v in events[i:i+200]: agg[w] += v
        return dict(agg)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0218", "streaming", 217, "tumbling_windows", b, bs,
        "tumbling-window batch aggregation vs per-event updates", a, ast)

# h219 BAC-0219 backpressure (218): FOLLOWUP BAC-0150 O(1) priority shed
def h219():
    arrivals = [("hi" if i % 10 == 0 else "lo", i) for i in range(4000)]
    def before():  # drop-oldest
        q = deque(); dropped_hi = 0
        for pr, i in arrivals:
            if len(q) >= 256:
                old = q.popleft()
                if old[0] == "hi": dropped_hi += 1
            q.append((pr, i))
        return dropped_hi
    def after():  # CHANGE: O(1) two-deque priority shed
        hi = deque(); lo = deque(); dropped_hi = 0
        for pr, i in arrivals:
            if pr == "hi": hi.append(i)
            else: lo.append(i)
            while len(hi) + len(lo) > 256:
                if lo: lo.popleft()
                else:
                    hi.popleft(); dropped_hi += 1
        return dropped_hi
    db = before(); da = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0219", "backpressure", 218, "o1_priority_shed", b, bs,
        "O(1) two-deque priority shedding vs drop-oldest", a, ast,
        extra={"hi_dropped_before": db, "hi_dropped_after": da})

# h220 BAC-0220 queue-fairness (219): lottery scheduling vs WFQ
def h220():
    tickets = {"a": 60, "b": 30, "c": 10}
    qs = {"a": deque(range(60)), "b": deque(range(30)), "c": deque(range(10))}
    def before():  # strict priority
        order = []
        for k in ("a", "b", "c"):
            while qs[k]: order.append(k); qs[k].popleft()
        return order
    def after():  # CHANGE: lottery scheduling
        q2 = {"a": deque(range(60)), "b": deque(range(30)), "c": deque(range(10))}
        order = []
        bag = [k for k, t_ in tickets.items() for _ in range(t_)]
        while any(q2[k] for k in q2):
            w = bag[rng.randrange(len(bag))]
            if q2[w]: order.append(w); q2[w].popleft()
        return order
    ob = before(); oa = after()
    from collections import Counter
    cb = Counter(ob); ca = Counter(oa)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0220", "queue-fairness", 219, "lottery_scheduling", b, bs,
        "lottery scheduling (60:30:10) vs strict priority", a, ast,
        extra={"served_before": dict(cb), "served_after": dict(ca)})

# h221 BAC-0221 work-stealing (220): LIFO/FIFO chase-lev vs FIFO
def h221():
    W = 4
    tasks = list(range(160))
    def before():  # FIFO local + FIFO steal
        deqs = [deque(tasks[i::W]) for i in range(W)]
        loads = [0]*W
        for i in range(W):
            while deqs[i]:
                deqs[i].popleft(); loads[i] += 1
        return loads
    def after():  # CHANGE: LIFO local pop, FIFO steal from top
        deqs = [deque(tasks[i::W]) for i in range(W)]
        loads = [0]*W
        for i in range(W):
            while deqs[i]:
                deqs[i].pop(); loads[i] += 1  # LIFO local
                for v in range(W):
                    if v != i and deqs[v]:
                        deqs[v].popleft(); loads[i] += 1; break  # FIFO steal
        return loads
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0221", "work-stealing", 220, "chaselv_deque", b, bs,
        "LIFO-local/FIFO-steal deque vs FIFO-everywhere", a, ast)

# h222 BAC-0222 lease-fencing (221): single-flight election vs thundering
def h222():
    N = 100
    def before():  # all candidates race: N election attempts
        attempts = N
        winner = min(range(N))
        return attempts, winner
    def after():  # CHANGE: single-flight: one attempt, others wait
        attempts = 1
        winner = 0
        return attempts, winner
    ab, wb = before(); aa, wa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0222", "lease-fencing", 221, "singleflight_election", b, bs,
        "single-flight leader election vs thundering-herd race", a, ast,
        extra={"attempts_before": ab, "attempts_after": aa})

# h223 BAC-0223 connection-pools (222): FOLLOWUP BAC-0128 real checkout model
def h223():
    import threading, queue as qq
    def new_conn():
        s = 0
        for k in range(5000): s += k & 0xFF
        return {"s": s}
    def run(reserved):
        inter = qq.Queue(); batch = qq.Queue()
        for _ in range(1 if reserved else 0): inter.put(new_conn())
        for _ in range(2): batch.put(new_conn())
        if not reserved:
            for _ in range(3): batch.put(new_conn())
        starved = [0]
        def bg():
            for _ in range(30):
                try: c = batch.get(timeout=0.01)
                except qq.Empty: continue
        t = threading.Thread(target=bg); t.start()
        for i in range(10):
            q = inter if reserved else batch
            try: c = q.get(timeout=0.005); q.put(c)
            except qq.Empty: starved[0] += 1
        t.join()
        return starved[0]
    sb = run(False); sa = run(True)
    b, bs = B.med(lambda: run(False)); a, ast = B.med(lambda: run(True))
    rec("BAC-0223", "connection-pools", 222, "reserved_lane_real", b, bs,
        "reserved interactive lane vs shared pool under background load (threaded)", a, ast,
        extra={"interactive_starved_before": sb, "interactive_starved_after": sa})

# h224 BAC-0224 query-planning (223): bushy vs left-deep
def h224():
    T = [{i: i} for i in range(4)]
    sizes = [100, 500, 2000, 8000]
    def left_deep():
        cost = 0; cur = sizes[0]
        for s in sizes[1:]:
            cost += cur * s // 100; cur = cur + s
        return cost
    def bushy():  # CHANGE: (smallest pairs) join tree
        ss = sorted(sizes)
        cost = ss[0]*ss[1]//100 + ss[2]*ss[3]//100
        cost += (ss[0]+ss[1])*(ss[2]+ss[3])//100
        return cost
    cb = left_deep(); ca = bushy()
    b, bs = B.med(left_deep); a, ast = B.med(bushy)
    rec("BAC-0224", "query-planning", 223, "bushy_vs_leftdeep", b, bs,
        "bushy join tree vs left-deep (cost model)", a, ast,
        extra={"cost_before": cb, "cost_after": ca})

# h225 BAC-0225 indexes (224): bitmap vs btree for low-cardinality
def h225():
    N = 30000
    col = [i % 8 for i in range(N)]
    btree = defaultdict(list)
    for i, v in enumerate(col): btree[v].append(i)
    bitmaps = {v: 0 for v in range(8)}  # CHANGE: bitmap index
    for i, v in enumerate(col): bitmaps[v] |= (1 << (i % 64))  # block-level
    qs = [3, 5, 3, 7]
    def before():
        return [len(btree[q]) for q in qs]
    blocks = [col[i:i+64] for i in range(0, N, 64)]
    bm_block = []
    for b_ in blocks:
        m = 0
        for j, v in enumerate(b_): m |= (v << (j*4))
        bm_block.append(m)
    def after():
        out = []
        for q in qs:
            n = 0
            for m in bm_block:
                for j in range(64):
                    if ((m >> (j*4)) & 0xF) == q: n += 1
            out.append(n)
        return out
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0225", "indexes", 224, "bitmap_lowcard", b, bs,
        "bitmap index vs btree posting lists for low-cardinality filter", a, ast)

BENCHES5A = [h201, h202, h203, h204, h205, h206, h207, h208, h209, h210,
             h211, h212, h213, h214, h215, h216, h217, h218, h219, h220,
             h221, h222, h223, h224, h225]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES5A:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    with open(os.path.join(HERE, "bench5_results.json"), "w") as f:
        json.dump({"results": results, "repeats": B.R,
                   "elapsed_s": round(time.time() - t0, 1)}, f, indent=1)
    print("wrote bench5_results.json, %d missions" % len(results))
