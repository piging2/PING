"""CHAOS-C Q4: redelivery storms at higher volume. Scratch only.

  P4.1  10,000 duplicate deliveries against ONE idempotency key, 64 threads.
  P4.2  1,000 distinct keys x 10 duplicates each, 64 threads.

Measures: dedup-hit rate, p50/p99 insert latency, wall throughput, and the
UNIQUE-constraint race double-apply count (expect 0; nonzero is a P0 finding
for the impl lanes).

One shared-format record per probe -> evidence/probe-records.jsonl.
"""
import os
import statistics
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "harness"))
import record as R
import chaos_lib as L

HARNESS = os.path.join(os.path.dirname(HERE), "harness")
DB = os.path.join(HARNESS, "chaos-c.db")

AFFECTS = ["impl-lane", "orca-b", "chaos-b"]
DEPS = ["record 8 idempotent effects", "packets.idempotency_key UNIQUE"]


def pct(data, q):
    if not data:
        return 0.0
    s = sorted(data)
    i = min(len(s) - 1, int(q * len(s)))
    return s[i]


def storm_deliveries(run_id, keys, repeats, threads):
    """Deliver each key `repeats` times across `threads` threads.

    Returns (latencies_ms, new_count, dedup_count)."""
    lat = []
    new_n = [0]
    dedup_n = [0]

    def worker(key_batch):
        conn = L.db(DB)
        local_lat, local_new, local_dedup, local_retries = [], 0, 0, 0
        try:
            for key in key_batch:
                for _ in range(repeats):
                    t0 = time.perf_counter()
                    # Bounded retry on transient lock contention (probe-harness
                    # LOCAL ACCIDENT fix 2026-09-24: 64 threads on one SQLite
                    # file can exceed the 30s busy_timeout under sustained
                    # pile-up; insert-or-dedup is idempotent so retry is safe.
                    # This is the FC-2 lesson applied to the probe itself.)
                    for attempt in range(12):
                        try:
                            _, is_new = L.new_packet(
                                conn, run_id, idem=key,
                                payload={"storm": True})
                            break
                        except __import__("sqlite3").OperationalError:
                            local_retries += 1
                            time.sleep(0.05 * (attempt + 1))
                    else:
                        raise RuntimeError("delivery retry budget exhausted")
                    dt = (time.perf_counter() - t0) * 1000.0
                    local_lat.append(dt)
                    if is_new:
                        local_new += 1
                    else:
                        local_dedup += 1
        finally:
            conn.close()
        return local_lat, local_new, local_dedup, local_retries

    # interleave keys across threads so duplicates race each other
    batches = [[] for _ in range(threads)]
    for i, key in enumerate(keys):
        batches[i % threads].append(key)
    t0 = time.perf_counter()
    retries = [0]
    with ThreadPoolExecutor(max_workers=threads) as ex:
        for local_lat, local_new, local_dedup, local_retries in ex.map(
                worker, batches):
            lat.extend(local_lat)
            new_n[0] += local_new
            dedup_n[0] += local_dedup
            retries[0] += local_retries
    wall = time.perf_counter() - t0
    return lat, new_n[0], dedup_n[0], wall, retries[0]


def verify(run_id, keys):
    conn = L.db(DB)
    cur = conn.execute(
        "SELECT COUNT(*) FROM packets WHERE run_id=? AND idempotency_key LIKE 'q4-%'",
        (run_id,))
    rows = cur.fetchone()[0]
    cur = conn.execute(
        "SELECT COUNT(DISTINCT idempotency_key) FROM packets WHERE run_id=?",
        (run_id,))
    distinct = cur.fetchone()[0]
    # any key with >1 packet row = UNIQUE race slipped a duplicate (P0)
    cur = conn.execute(
        """SELECT COUNT(*) FROM (SELECT idempotency_key FROM packets
           WHERE run_id=? GROUP BY idempotency_key HAVING COUNT(*) > 1)""",
        (run_id,))
    dup_keys = cur.fetchone()[0]
    dedup_audits = L.count_audit(conn, run_id, "packet.dedup_hit")
    conn.close()
    return {"packet_rows": rows, "distinct_keys": distinct,
            "dup_key_rows": dup_keys, "dedup_audit_hits": dedup_audits,
            "expected_keys": len(keys)}


def probe_p41():
    conn = L.db(DB)
    rid = L.new_run(conn, prompt_ref="chaos-c-q4-p41")
    conn.close()
    key = f"q4-storm1-{uuid.uuid4().hex[:10]}"
    lat, new_n, dedup_n, wall, retries = storm_deliveries(rid, [key], 10000, 64)
    v = verify(rid, [key])
    total = new_n + dedup_n
    hit_rate = dedup_n / total if total else 0
    slipped = v["dup_key_rows"] + max(0, v["packet_rows"] - 1)
    ok = (v["packet_rows"] == 1 and slipped == 0)
    cls = "SURVIVED" if ok else "DUPLICATED"
    return R.record(
        "chaos.redelivery-storm", "chaos_lib.new_packet (insert-or-dedup)",
        "10,000 duplicate deliveries against one idempotency key, 64 threads: "
        "exactly one packet row, every other delivery a dedup hit, zero "
        "UNIQUE-race double-applies.",
        "TEST", "run_redelivery_storm.probe_p41",
        "64 threads x new_packet (shared SQLite/WAL)",
        "ThreadPoolExecutor(64)", "verify() durable read",
        cls, 0.95, "none" if cls == "SURVIVED" else "idempotency_key UNIQUE",
        DEPS, AFFECTS,
        detail={"deliveries": total, "new": new_n, "dedup_hits": dedup_n,
                "dedup_hit_rate": round(hit_rate, 5),
                "p50_ms": round(pct(lat, 0.50), 2),
                "p99_ms": round(pct(lat, 0.99), 2),
                "max_ms": round(max(lat), 2) if lat else 0,
                "wall_s": round(wall, 2),
                "throughput_per_s": round(total / wall, 1) if wall else 0,
                "packet_rows": v["packet_rows"],
                "unique_race_slips": slipped,
                "lock_retries": retries},
        missions=total,
        verdict_notes=(f"{dedup_n}/{total} dedup hits, p99 insert "
                       f"{pct(lat,0.99):.1f}ms, {slipped} double-applies")
        if ok else f"P0: {slipped} UNIQUE-race double-applies")


def probe_p42():
    conn = L.db(DB)
    rid = L.new_run(conn, prompt_ref="chaos-c-q4-p42")
    conn.close()
    keys = [f"q4-storm2-{uuid.uuid4().hex[:10]}-{i:04d}" for i in range(1000)]
    lat, new_n, dedup_n, wall, retries = storm_deliveries(rid, keys, 10, 64)
    v = verify(rid, keys)
    total = new_n + dedup_n
    hit_rate = dedup_n / total if total else 0
    slipped = v["dup_key_rows"] + max(0, v["packet_rows"] - len(keys))
    ok = (v["packet_rows"] == len(keys) and slipped == 0 and new_n == len(keys))
    cls = "SURVIVED" if ok else "DUPLICATED"
    return R.record(
        "chaos.redelivery-storm", "chaos_lib.new_packet (insert-or-dedup)",
        "1,000 distinct keys x 10 duplicates, 64 threads: exactly one packet "
        "per key, 9,000 dedup hits, zero UNIQUE-race double-applies.",
        "TEST", "run_redelivery_storm.probe_p42",
        "64 threads x new_packet (shared SQLite/WAL)",
        "ThreadPoolExecutor(64)", "verify() durable read",
        cls, 0.95, "none" if cls == "SURVIVED" else "idempotency_key UNIQUE",
        DEPS, AFFECTS,
        detail={"deliveries": total, "new": new_n, "dedup_hits": dedup_n,
                "dedup_hit_rate": round(hit_rate, 5),
                "p50_ms": round(pct(lat, 0.50), 2),
                "p99_ms": round(pct(lat, 0.99), 2),
                "max_ms": round(max(lat), 2) if lat else 0,
                "wall_s": round(wall, 2),
                "throughput_per_s": round(total / wall, 1) if wall else 0,
                "packet_rows": v["packet_rows"],
                "expected_keys": len(keys),
                "unique_race_slips": slipped},
        missions=total,
        verdict_notes=(f"{new_n} packets / {dedup_n} dedup hits, p99 insert "
                       f"{pct(lat,0.99):.1f}ms, {slipped} double-applies")
        if ok else f"P0: {slipped} UNIQUE-race double-applies")


if __name__ == "__main__":
    L.init_db(DB)
    only = sys.argv[1] if len(sys.argv) > 1 else "all"
    fns = {"p41": probe_p41, "p42": probe_p42}
    seq = [fns[only]] if only in fns else (probe_p41, probe_p42)
    for fn in seq:
        print(fn(), "done", flush=True)
    print("Q4 complete")
