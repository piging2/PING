"""Targeted followups: re-run noisy benches with more repeats; break-even
experiments for incremental-computation (expensive nodes) and zero-copy
(large slices)."""
import sys, json, statistics, time
sys.path.insert(0, "/home/hatch/workspace/ping-build-program/fleet/work/fleet-be-1")
import bench_backend as B

B.R = 15
out = {}
for name in ["b17", "b20", "b28", "b37", "b40", "b41"]:
    B.results.clear()
    getattr(B, name)()
    d = B.results[{ "b17":"BAC-0017","b20":"BAC-0020","b28":"BAC-0028",
                    "b37":"BAC-0037","b40":"BAC-0040","b41":"BAC-0041"}[name]]
    b, a = d["before_ms"], d["after_ms"]
    delta = (b-a)/b*100 if b else 0
    noise = 2*max(d["before_std"], d["after_std"])/b*100 if b else 0
    out[name] = {"before": round(b,3), "after": round(a,3),
                 "delta_pct": round(delta,1), "noise_pct": round(noise,1)}
    print(name, out[name], flush=True)

# b01-break-even: expensive node compute
def med(fn, repeat=7):
    ts = []
    for _ in range(repeat):
        t0 = time.perf_counter(); fn(); ts.append((time.perf_counter()-t0)*1000)
    return statistics.median(ts), statistics.stdev(ts)
N = 300
vals = list(range(N))
def heavy(i):
    s = 0
    for k in range(1200): s += (k * i) & 0xFF
    return vals[i] + s
def b01_before(): return [heavy(i) for i in range(N)]
def b01_after():
    dirty = {0}; vals[0] += 1; outd = {}
    for i in range(N):
        if i in dirty or (i-1) in dirty or (i-2) in dirty:
            dirty.add(i); outd[i] = heavy(i)
    return outd
b, bs = med(b01_before); a, ast = med(b01_after)
out["b01_heavy"] = {"before": round(b,2), "after": round(a,2),
                    "delta_pct": round((b-a)/b*100,1)}
print("b01_heavy", out["b01_heavy"], flush=True)

# b30-large-slices: 1MB slices from 64MB buffer
import random
rng = random.Random(7)
buf = bytes(rng.getrandbits(8) for _ in range(16_000_000))
offs = [i*16_000 for i in range(1000)]
def z_before(): return [buf[o:o+250_000] for o in offs]
mv = memoryview(buf)
def z_after(): return [mv[o:o+250_000] for o in offs]
b, bs = med(z_before); a, ast = med(z_after)
out["b30_large"] = {"before": round(b,2), "after": round(a,2),
                    "delta_pct": round((b-a)/b*100,1)}
print("b30_large", out["b30_large"], flush=True)

json.dump(out, open("/home/hatch/workspace/ping-build-program/fleet/work/fleet-be-1/followup_results.json","w"), indent=1)
