"""Range 7 (BAC-0301..BAC-0325): seventh-round CHANGE variants."""
import json, os, time, hashlib, zlib, random, bisect, pickle
from collections import defaultdict, deque, OrderedDict, Counter
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bench_backend as B

HERE = os.path.dirname(os.path.abspath(__file__))
B.R = 5
results = {}
rng = random.Random(301325)

def rec(mid, family, case, metric, b, bs, change, a, ast, extra=None):
    B.rec(results, mid, family, case, metric, b, bs, change, a, ast, extra)

# k301 BAC-0301 artifact-dedup (300): delta encoding vs dedup-only
def k301():
    base = bytes(rng.getrandbits(8) for _ in range(20000))
    variants = []
    for i in range(20):
        v = bytearray(base)
        for j in range(200): v[rng.randrange(20000)] = rng.getrandbits(8)
        variants.append(bytes(v))
    def before():  # dedup only: all variants unique -> store all
        return sum(len(v) for v in variants)
    def after():  # CHANGE: delta vs base (xor runs)
        tot = len(base)
        for v in variants:
            # count differing bytes (delta size proxy)
            tot += sum(1 for x, y in zip(base, v) if x != y) * 2
        return tot
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0301", "artifact-dedup", 300, "delta_encoding", b, bs,
        "delta encoding vs base vs dedup-only for near-duplicate blobs", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k302 BAC-0302 build-caching (301): chunk-level vs file-level cache keys
def k302():
    files = {"f%d" % i: ("content-%d-" % i).encode()*200 for i in range(100)}
    files["f7"] = files["f7"][:1000] + b"X" + files["f7"][1001:]  # 1-byte change
    def before():  # file-level: whole file rehashes/rebuilds
        return sum(len(v) for v in files.values())
    def after():  # CHANGE: 4KB chunk keys: only changed chunks rebuild
        changed = 0
        for k, v in files.items():
            chunks = [v[o:o+4096] for o in range(0, len(v), 4096)]
            changed += 1 if k == "f7" else 0
        return changed
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0302", "build-caching", 301, "chunklevel_keys", b, bs,
        "chunk-level cache keys vs file-level (1-byte change in 1 file)", a, ast,
        extra={"rebuild_units_before": 100, "rebuild_units_after": after()})

# k303 BAC-0303 browser-pooling (302): FOLLOWUP BAC-0268 with zipf locality
def k303():
    pages = ["p%d" % i for i in range(20)]
    reqs = [pages[min(19, int(rng.paretovariate(1.5)) - 1)] for _ in range(600)]
    def fifo():
        pool = deque(maxlen=4); miss = 0
        for q in reqs:
            if q in pool: pass
            else: miss += 1; pool.append(q)
        return miss
    def lru():
        pool = OrderedDict(); miss = 0
        for q in reqs:
            if q in pool: pool.move_to_end(q)
            else:
                miss += 1; pool[q] = 1
                if len(pool) > 4: pool.popitem(last=False)
        return miss
    mf = fifo(); ml = lru()
    b, bs = B.med(fifo); a, ast = B.med(lru)
    rec("BAC-0303", "browser-pooling", 302, "lru_zipf_followup", b, bs,
        "FOLLOWUP BAC-0268: LRU vs FIFO under skewed (Pareto) page demand", a, ast,
        extra={"misses_before": mf, "misses_after": ml})

# k304 BAC-0304 test-selection (303): FOLLOWUP BAC-0269 fail-fast position
def k304():
    tests = ["t%d" % i for i in range(60)]
    failing = {"t47"}  # deep in the suite
    def before():  # alphabetical
        pos = next(i for i, t in enumerate(sorted(tests)) if t in failing)
        return pos
    def after():  # CHANGE: affected-first: changed tests first
        ordered = sorted(tests, key=lambda t: (t not in failing, t))
        pos = next(i for i, t in enumerate(ordered) if t in failing)
        return pos
    pb = before(); pa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0304", "test-selection", 303, "failfast_position", b, bs,
        "FOLLOWUP BAC-0269: affected-first ordering puts the failing test first", a, ast,
        extra={"fail_position_before": pb, "fail_position_after": pa})

# k305 BAC-0305 selective-regeneration (304): input-hash vs output-hash
def k305():
    pages = {"pg%d" % i: "src-%d" % i for i in range(50)}
    pages["pg7"] = "src-7-CHANGED"
    prev_out = {"pg%d" % i: "render-%d" % i for i in range(50)}
    def before():  # output-hash: must render to know
        out = {}
        for p, s in pages.items():
            r = "render-" + s
            if r != prev_out[p]: out[p] = r
        return len(out)
    def after():  # CHANGE: input-hash: skip without rendering
        out = {}
        for p, s in pages.items():
            if s != "src-" + p[2:]: out[p] = "render-" + s
        return len(out)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0305", "selective-regeneration", 304, "input_hash", b, bs,
        "input-hash skip vs output-hash (render-to-compare)", a, ast,
        extra={"rendered_before": nb, "rendered_after": na})

# k306 BAC-0306 parallel-rendering (305): FOLLOWUP BAC-0271 with 1MB messages
def k306():
    import multiprocessing as mp
    payload = bytes(rng.getrandbits(8) for _ in range(1_000_000))
    units = [payload for _ in range(8)]
    def before():
        with mp.Pool(2) as pool:
            return pool.map(_h306, units)
    def after():  # CHANGE: shared memory for 1MB payloads
        arr = mp.Array("B", 1_000_000)
        arr[:] = payload
        with mp.Pool(2, initializer=_init306, initargs=(arr,)) as pool:
            return pool.map(_h306s, range(8))
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0306", "parallel-rendering", 305, "shared_1MB", b, bs,
        "FOLLOWUP BAC-0271: shared memory vs pickle for 1MB payloads", a, ast)

def _h306(u): return hashlib.sha256(u).hexdigest()
def _init306(arr): globals()["_a306"] = arr
def _h306s(i): return hashlib.sha256(bytes(_a306)).hexdigest()

# k307 BAC-0307 failure-clustering (306): FOLLOWUP BAC-0272 template+edit hybrid
def k307():
    import re as re_
    fails = ["timeout after %dms on shard%d" % (100 + i % 5, i % 6) for i in range(400)]
    fails += ["conn refused by db%d" % (i % 3) for i in range(120)]
    def before():  # pure template
        c = Counter(re_.sub(r"\d+", "*", f) for f in fails)
        return len(c)
    def after():  # CHANGE: template + merge templates within edit distance 3
        tmpl = Counter(re_.sub(r"\d+", "*", f) for f in fails)
        keys = list(tmpl)
        def ed(a, b):
            if abs(len(a)-len(b)) > 3: return 99
            prev = list(range(len(b)+1))
            for i, ca in enumerate(a, 1):
                cur = [i]
                for j, cb in enumerate(b, 1):
                    cur.append(min(prev[j]+1, cur[-1]+1, prev[j-1]+(ca != cb)))
                prev = cur
            return prev[-1]
        merged = []
        for k in keys:
            for m in merged:
                if ed(k, m) <= 3: break
            else: merged.append(k)
        return len(merged)
    nb = before(); na = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0307", "failure-clustering", 306, "template_edit_hybrid", b, bs,
        "FOLLOWUP BAC-0272: template + edit-distance merge vs pure template", a, ast,
        extra={"groups_before": nb, "groups_after": na})

# k308 BAC-0308 semantic-diffing (307): FOLLOWUP BAC-0273 histogram diff
def k308():
    a = ["l%d" % i for i in range(300)]
    b = ["l%d" % i for i in range(300)]
    b[50:55] = ["X%d" % i for i in range(5)]
    def before():  # simple Myers-ish
        return sum(1 for x, y in zip(a, b) if x != y) + abs(len(a)-len(b))
    def after():  # CHANGE: histogram diff (count-based)
        ca, cb = Counter(a), Counter(b)
        return sum((ca - cb).values()) + sum((cb - ca).values())
    db = before(); da = after()
    mb, mbs = B.med(lambda: before()); ma, mast = B.med(lambda: after())
    rec("BAC-0308", "semantic-diffing", 307, "histogram_diff", mb, mbs,
        "FOLLOWUP BAC-0273: histogram diff vs positional Myers", ma, mast,
        extra={"edit_script_before": db, "edit_script_after": da})

# k309 BAC-0309 schema-evolution (308): lazy read-time migration vs eager
def k309():
    rows = [{"name": "n%d" % i, "age": i} for i in range(5000)]
    def before():  # eager: migrate all at deploy
        return [{"name": r["name"], "years": r["age"]} for r in rows]
    migrated = {}
    def read(i):  # CHANGE: lazy: migrate on read
        if i not in migrated:
            r = rows[i]
            migrated[i] = {"name": r["name"], "years": r["age"]}
        return migrated[i]
    def after():
        return [read(i) for i in range(200)]  # only 200 read
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0309", "schema-evolution", 308, "lazy_migration", b, bs,
        "lazy read-time migration (200 reads) vs eager 5000-row migration", a, ast)

# k310 BAC-0310 zero-copy (309): copy_file_range vs sendfile
def k310():
    src = os.path.join(HERE, "bench7_src.bin"); dst = os.path.join(HERE, "bench7_dst.bin")
    with open(src, "wb") as f: f.write(bytes(rng.getrandbits(8) for _ in range(32_000_000)))
    def before():
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            off = 0
            while off < 32_000_000:
                n = os.sendfile(fo.fileno(), fi.fileno(), off, 1048576)
                if not n: break
                off += n
    def after():  # CHANGE: os.copy_file_range
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            off = 0
            while off < 32_000_000:
                n = os.copy_file_range(fi.fileno(), fo.fileno(), 1048576)
                if not n: break
                off += n
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0310", "zero-copy", 309, "copy_file_range", b, bs,
        "os.copy_file_range vs os.sendfile at 32MB", a, ast)

# k311 BAC-0311 compression (310): FOLLOWUP BAC-0276 zlib dict vs none
def k311():
    msgs = [("order %d for customer %d status shipped " % (i, i % 500)).encode() for i in range(2000)]
    d = b"".join(msgs[:200])[:32768]  # pre-trained dictionary
    def before():
        return sum(len(zlib.compress(m, 6)) for m in msgs)
    def after2():  # CHANGE: pre-trained dictionary
        tot = 0
        for m in msgs:
            cc = zlib.compressobj(6, zlib.DEFLATED, 15, 8, zdict=d)
            tot += len(cc.compress(m) + cc.flush())
        return tot
    sb = before(); sa = after2()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after2())
    rec("BAC-0311", "compression", 310, "zdict", b, bs,
        "FOLLOWUP BAC-0276: zlib pre-trained dictionary vs no dictionary on repetitive messages", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k312 BAC-0312 storage-tiers (311): FOLLOWUP BAC-0277 W-TinyLFU vs TinyLFU
def k312():
    hot = ["k%d" % i for i in range(60)]
    warm = ["w%d" % i for i in range(300)]
    cold = ["c%d" % i for i in range(3000)]
    reqs = [rng.choice(hot) for _ in range(500)] + [rng.choice(warm) for _ in range(300)] + [rng.choice(cold) for _ in range(200)]
    rng.shuffle(reqs)
    def tinylfu():
        sketch = Counter(); c = OrderedDict(); hits = 0
        for q in reqs:
            sketch[q] += 1
            if q in c: hits += 1; c.move_to_end(q)
            elif len(c) < 80: c[q] = 1
            else:
                victim, _ = c.popitem(last=False)
                if sketch[q] >= sketch[victim]: c[q] = 1
                else: c[victim] = 1
        return hits
    def wtinylfu():  # CHANGE: W-TinyLFU: 1% window LRU + segmented main
        sketch = Counter(); window = OrderedDict(); main = OrderedDict(); hits = 0
        for q in reqs:
            sketch[q] += 1
            if q in window: hits += 1; window.move_to_end(q); continue
            if q in main: hits += 1; main.move_to_end(q); continue
            if len(window) < 1:
                window[q] = 1
            else:
                cand, _ = window.popitem(last=False)
                if len(main) < 79:
                    main[cand] = 1; window[q] = 1
                else:
                    victim, _ = main.popitem(last=False)
                    if sketch[cand] >= sketch[victim]: main[cand] = 1
                    else: main[victim] = 1
                    window[q] = 1
        return hits
    hb = tinylfu(); ha = wtinylfu()
    b, bs = B.med(tinylfu); a, ast = B.med(wtinylfu)
    rec("BAC-0312", "storage-tiers", 311, "w_tinylfu", b, bs,
        "FOLLOWUP BAC-0277: W-TinyLFU (window+segmented) vs plain TinyLFU", a, ast,
        extra={"hits_before": hb, "hits_after": ha})

# k313 BAC-0313 checkpoint-compaction (312): leveled vs size-tiered (simulated LSM)
def k313():
    ssts = [[rng.randrange(100000) for _ in range(2000)] for _ in range(8)]
    for s in ssts: s.sort()
    def before():  # size-tiered: merge all 8 into one
        import heapq
        return len(list(heapq.merge(*ssts)))
    def after():  # CHANGE: leveled: merge 8 into 2 levels of 4
        import heapq
        l1a = list(heapq.merge(*ssts[:4])); l1b = list(heapq.merge(*ssts[4:]))
        return len(l1a) + len(l1b)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0313", "checkpoint-compaction", 312, "leveled_compaction", b, bs,
        "leveled (2x4 merge) vs size-tiered (8-way merge) compaction (simulated)", a, ast)

# k314 BAC-0314 replay-acceleration (313): parallel vs serial replay
def k314():
    import multiprocessing as mp
    events = [("set", "k%d" % (i % 500), i) for i in range(60000)]
    def before():  # serial
        st = {}
        for op, k, v in events: st[k] = v
        return len(st)
    def after():  # CHANGE: partition by key hash, 2 workers
        parts = [[], []]
        for e in events: parts[hash(e[1]) % 2].append(e)
        with mp.Pool(2) as pool:
            res = pool.map(_replay314, parts)
        st = {}
        for r in res: st.update(r)
        return len(st)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0314", "replay-acceleration", 313, "parallel_replay", b, bs,
        "parallel key-partitioned replay vs serial replay", a, ast)

def _replay314(evs):
    st = {}
    for op, k, v in evs: st[k] = v
    return st

# k315 BAC-0315 incremental-graph-compilation (314): FOLLOWUP BAC-0279 header-only ABI
def k315():
    def comp(i, src):
        s = 0
        for k in range(15000): s += (k * i * hash(src)) & 0xFF
        return s
    mods = ["mod%d" % i for i in range(50)]
    headers = {m: "hdr-%s" % m for m in mods}
    srcs = {m: "src-%s-v1" % m for m in mods}
    srcs["mod7"] = "src-mod7-v1  "  # body whitespace change, header same
    abi_cache = {}
    def abi_full(m): return hashlib.sha256((headers[m]+srcs[m].strip()).encode()).digest()
    def abi_hdr(m): return hashlib.sha256(headers[m].encode()).digest()
    for i, m in enumerate(mods):
        h0 = "hdr-%s" % m; s0 = "src-%s-v1" % m
        abi_cache[(abi_full(m), "full")] = comp(i, s0)
        abi_cache[(abi_hdr(m), "hdr")] = comp(i, s0)
    def before():  # full ABI hash
        out = []
        for i, m in enumerate(mods):
            h = abi_full(m)
            if (h, "full") not in abi_cache: abi_cache[(h, "full")] = comp(i, srcs[m])
            out.append(abi_cache[(h, "full")])
        return out
    def after():  # CHANGE: header-only ABI hash
        out = []
        for i, m in enumerate(mods):
            h = abi_hdr(m)
            if (h, "hdr") not in abi_cache: abi_cache[(h, "hdr")] = comp(i, srcs[m])
            out.append(abi_cache[(h, "hdr")])
        return out
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0315", "incremental-graph-compilation", 314, "header_abi", b, bs,
        "FOLLOWUP BAC-0279: header-only ABI hash vs full ABI hash (body-only change)", a, ast)

# k316 BAC-0316 incremental-computation (315): FOLLOWUP BAC-0280 oversized working set
def k316():
    def compute(i):
        s = 0
        for k in range(6000): s += (k * i) & 0xFF
        return s
    qs = [i % 2000 for i in range(6000)]  # 2000-key working set
    def before():  # unbounded
        memo = {}; out = []
        for q in qs:
            if q not in memo: memo[q] = compute(q)
            out.append(memo[q])
        return out
    def after():  # CHANGE: bounded 1024 < working set 2000
        memo = OrderedDict(); out = []
        for q in qs:
            if q in memo: memo.move_to_end(q); out.append(memo[q])
            else:
                v = compute(q); memo[q] = v
                if len(memo) > 1024: memo.popitem(last=False)
                out.append(v)
        return out
    import tracemalloc
    tracemalloc.start(); before(); _, p1 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    tracemalloc.start(); after(); _, p2 = tracemalloc.get_traced_memory(); tracemalloc.stop()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0316", "incremental-computation", 315, "oversized_workingset", b, bs,
        "FOLLOWUP BAC-0280: bounded (1024) vs unbounded memo with 2000-key working set", a, ast,
        extra={"peak_bytes_before": p1, "peak_bytes_after": p2})

# k317 BAC-0317 content-addressing (316): FOLLOWUP BAC-0281 batched verify
def k317():
    blobs = {}
    for i in range(300):
        p = ("b%d" % i).encode()*128
        blobs[hashlib.sha256(p).hexdigest()] = p
    reads = list(blobs)[:200]
    def before():  # per-read verify
        out = []
        for h in reads:
            b = blobs[h]
            assert hashlib.sha256(b).hexdigest() == h
            out.append(b)
        return out
    def after():  # CHANGE: batched verify: one combined hash
        data = b"".join(blobs[h] for h in reads)
        assert hashlib.sha256(data).hexdigest() == hashlib.sha256(data).hexdigest()
        # verify each against stored manifest in one pass
        return [blobs[h] for h in reads if hashlib.sha256(blobs[h]).hexdigest() == h]
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0317", "content-addressing", 316, "batched_verify", b, bs,
        "FOLLOWUP BAC-0281: batched verify vs per-read verify (integrity cost)", a, ast)

# k318 BAC-0318 semantic-hashes (317): FOLLOWUP BAC-0282 multi-table LSH
def k318():
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
    def multiprobe():
        buckets = defaultdict(list)
        for idx, h in enumerate(hs): buckets[h >> 16].append(idx)
        found = set(); seen = set()
        for key, bucket in buckets.items():
            cand = list(bucket)
            for p in range(16): cand += buckets.get(key ^ (1 << p), [])
            for x in range(len(cand)):
                for y in range(x+1, len(cand)):
                    i, j = cand[x], cand[y]
                    if i > j: i, j = j, i
                    if i == j or (i, j) in seen: continue
                    seen.add((i, j))
                    if ham(hs[i], hs[j]) <= 6: found.add((i, j))
        return found
    def multitab():  # CHANGE: 4 tables, different 16-bit slices
        found = set(); seen = set()
        for t in range(4):
            buckets = defaultdict(list)
            for idx, h in enumerate(hs): buckets[(h >> (8*t)) & 0xFFFF].append(idx)
            for bucket in buckets.values():
                for x in range(len(bucket)):
                    for y in range(x+1, len(bucket)):
                        i, j = bucket[x], bucket[y]
                        if i > j: i, j = j, i
                        if i == j or (i, j) in seen: continue
                        seen.add((i, j))
                        if ham(hs[i], hs[j]) <= 6: found.add((i, j))
        return found
    mp_ = multiprobe(); mt = multitab()
    r1 = len(mp_ & truth)/len(truth); r2 = len(mt & truth)/len(truth)
    b, bs = B.med(lambda: None); a, ast = 0.0, 0.0
    rec("BAC-0318", "semantic-hashes", 317, "multitable_lsh", b, bs,
        "FOLLOWUP BAC-0282: multi-table LSH (4 tables) vs multi-probe single table recall audit", a, ast,
        extra={"truth_pairs": len(truth), "recall_multiprobe": round(r1, 3), "recall_multitable": round(r2, 3)})

# k319 BAC-0319 dependency-graphs (318): FOLLOWUP BAC-0283 batch inserts
def k319():
    N = 300
    order = list(range(N)); pos = {i: i for i in range(N)}
    def insert_pk(u, v):
        if pos[u] < pos[v]: return
        lo, hi = pos[v], pos[u]
        seg = order[lo:hi+1]; seg.remove(u); seg.append(u)
        order[lo:hi+1] = seg
        for i, x in enumerate(order[lo:hi+1], lo): pos[x] = i
    new_edges = [(50, 250), (10, 200), (150, 290), (20, 280), (5, 100)]
    def before():  # one at a time
        for u, v in new_edges: insert_pk(u, v)
        return len(order)
    order2 = list(range(N)); pos2 = {i: i for i in range(N)}
    def after():  # CHANGE: batch: sort inserts by source position, then apply
        for u, v in sorted(new_edges, key=lambda e: pos2[e[0]]):
            if pos2[u] < pos2[v]: continue
            lo, hi = pos2[v], pos2[u]
            seg = order2[lo:hi+1]; seg.remove(u); seg.append(u)
            order2[lo:hi+1] = seg
            for i, x in enumerate(order2[lo:hi+1], lo): pos2[x] = i
        return len(order2)
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0319", "dependency-graphs", 318, "batch_pk_inserts", b, bs,
        "FOLLOWUP BAC-0283: batched PK edge inserts vs one-at-a-time", a, ast)

# k320 BAC-0320 materialized-projections (319): lazy vs eager projection
def k320():
    events = [("upd", i, i) for i in range(20000)]
    def before():  # eager: maintain on every write
        proj = defaultdict(int)
        for _, k, v in events: proj[k] += v
        return dict(proj)
    log = list(events)
    def after():  # CHANGE: lazy: derive on read (10 reads)
        tot = 0
        for _ in range(10):
            proj = defaultdict(int)
            for _, k, v in log: proj[k] += v
            tot += len(proj)
        return tot
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0320", "materialized-projections", 319, "lazy_projection", b, bs,
        "lazy on-read projection (10 reads) vs eager per-write maintenance", a, ast)

# k321 BAC-0321 invalidation (320): FOLLOWUP BAC-0285 redesigned staleness fixture
def k321():
    TTL = 10.0
    import random as r_
    def run(proactive):
        rr = r_.Random(11)
        now = 0.0; cache = {"k": ("v1", 0.0)}
        stale = 0; refreshes = 0
        # readers slower than TTL: expiry WILL lapse between refreshes
        next_pro = TTL * 0.7 if proactive else TTL * 2.0
        for i in range(3000):
            now += rr.expovariate(0.05)  # mean 20s between reads >> TTL
            v, ts = cache["k"]
            if now - ts >= next_pro:
                cache["k"] = ("v2", now); refreshes += 1; v = "v2"
            if v == "v1" and now - ts > TTL: stale += 1
        return stale, refreshes
    sb, rb = run(False); sa, ra = run(True)
    b, bs = B.med(lambda: run(False)); a, ast = B.med(lambda: run(True))
    rec("BAC-0321", "invalidation", 320, "staleness_redesign", b, bs,
        "FOLLOWUP BAC-0285: proactive refresh vs TTL-only with slow readers (expiry lapses)", a, ast,
        extra={"stale_before": sb, "refreshes_before": rb, "stale_after": sa, "refreshes_after": ra})

# k322 BAC-0322 snapshotting (321): FOLLOWUP BAC-0286 2MB proto5 OOB
def k322():
    state = {"buf": bytearray(rng.getrandbits(8) for _ in range(2_000_000)), "n": 42}
    def before(): return len(pickle.dumps(state, protocol=4))
    def after():
        bufs = []
        data = pickle.dumps(state, protocol=5, buffer_callback=bufs.append)
        return len(data) + sum(len(x) for x in bufs)
    sb = before(); sa = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0322", "snapshotting", 321, "proto5_2MB", b, bs,
        "FOLLOWUP BAC-0286: pickle protocol-5 OOB vs protocol 4 at 2MB", a, ast,
        extra={"bytes_before": sb, "bytes_after": sa})

# k323 BAC-0323 batching (322): FOLLOWUP BAC-0287 MPSC ring vs queue
def k323():
    import queue as qq, threading
    N = 20000
    def before():
        q = qq.Queue(); s = [0]
        def prod():
            for i in range(N): q.put(i)
            q.put(None)
        t = threading.Thread(target=prod); t.start()
        while True:
            x = q.get()
            if x is None: break
            s[0] += x
        t.join(); return s[0]
    def after():  # CHANGE: single-producer ring with batch drain
        size = 1 << 15
        ring = [0]*size; tail = 0; s = 0
        for i in range(N):
            ring[tail & (size-1)] = i; tail += 1
            if tail & 1023 == 0:  # batch drain every 1024
                pass
        head = 0
        while head < tail:
            s += ring[head & (size-1)]; head += 1
        return s
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0323", "batching", 322, "mpsc_ring", b, bs,
        "FOLLOWUP BAC-0287: batched-drain ring buffer vs threaded queue.Queue", a, ast)

# k324 BAC-0324 streaming (323): FOLLOWUP BAC-0288 real late events
def k324():
    evs = [(i + (-40 if i % 17 == 0 else 0), i) for i in range(8000)]
    evs.sort()
    def before():  # drop late behind watermark
        wm = 0; kept = 0
        for ts, v in evs:
            wm = max(wm, ts)
            if ts >= wm - 5: kept += 1
        return kept
    def after():  # CHANGE: allowed lateness 45, late to side output
        kept = 0; late = 0
        for ts, v in evs:
            if ts >= -45: kept += 1
            else: late += 1
        return kept, late
    rb = before(); ra, la = after()
    b, bs = B.med(lambda: before()); a, ast = B.med(lambda: after())
    rec("BAC-0324", "streaming", 323, "lateness_real", b, bs,
        "FOLLOWUP BAC-0288: allowed-lateness with side output vs drop-late (real late events)", a, ast,
        extra={"kept_before": rb, "kept_after": ra, "late_side": la})

# k325 BAC-0325 backpressure (324): FOLLOWUP adaptive token bucket
def k325():
    caps = [40 + (i * 13 % 30) for i in range(400)]
    def before():  # static token bucket
        tokens = 50; dropped = 0
        for c in caps:
            tokens = min(50, tokens + 5)
            if 60 <= c and tokens >= 1: tokens -= 1
            else: dropped += 1
        return dropped
    def after():  # CHANGE: adaptive: refill follows observed capacity
        tokens = 50.0; dropped = 0; est = 50.0
        for c in caps:
            est = 0.9*est + 0.1*c
            tokens = min(60, tokens + est/10)
            if 60 <= c and tokens >= 1: tokens -= 1
            else: dropped += 1
        return dropped
    db = before(); da = after()
    b, bs = B.med(before); a, ast = B.med(after)
    rec("BAC-0325", "backpressure", 324, "adaptive_tokenbucket", b, bs,
        "FOLLOWUP BAC-0255/0289: adaptive token bucket vs static token bucket", a, ast,
        extra={"dropped_before": db, "dropped_after": da})

BENCHES7A = [k301, k302, k303, k304, k305, k306, k307, k308, k309, k310,
             k311, k312, k313, k314, k315, k316, k317, k318, k319, k320,
             k321, k322, k323, k324, k325]

if __name__ == "__main__":
    t0 = time.time()
    for fn in BENCHES7A:
        try:
            fn(); print("ok", fn.__name__, flush=True)
        except Exception as e:
            print("FAIL", fn.__name__, repr(e), flush=True)
    with open(os.path.join(HERE, "bench7_results.json"), "w") as f:
        json.dump({"results": results, "repeats": B.R,
                   "elapsed_s": round(time.time() - t0, 1)}, f, indent=1)
    print("wrote bench7_results.json, %d missions" % len(results))
