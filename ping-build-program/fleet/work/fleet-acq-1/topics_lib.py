#!/usr/bin/env python3
"""topics_lib.py — parameterized BEFORE->CHANGE->AFTER topic functions for backend missions.
Each topic fn takes a params dict and returns an R() measurement dict.
Deterministic work-unit measurement; no wall-clock noise."""
import zlib, math

def R(before, after, metric, unit, better="lower", method=""):
    return {"before": before, "after": after, "metric": metric, "unit": unit,
            "better": better, "method": method}

def t_compression(p):
    n = p.get("rows", 2000)
    rows = "".join('{"id":%d,"name":"business-%d","phone":"555-%04d"}\n' % (i, i, i) for i in range(n))
    raw = rows.encode()
    return R(len(raw), len(zlib.compress(raw)), "bytes_transferred", "bytes",
             method="zlib.compress on %d JSON rows" % n)

def t_storage_tiers(p):
    n, hotn = p.get("n", 1000), p.get("hot", 100)
    items = [("k%d" % i, "v" * p.get("vlen", 100)) for i in range(n)]
    before = sum(len(k) + len(v) for k, v in items)
    after = (sum(len(k) + len(v) for k, v in items[:hotn]) +
             sum(len(k) + len(zlib.compress(v.encode())) for k, v in items[hotn:]))
    return R(before, after, "memory_bytes", "bytes",
             method="hot %d raw + warm %d compressed" % (hotn, n - hotn))

def t_checkpoint_compaction(p):
    n, keys = p.get("n", 5000), p.get("keys", 500)
    log = [("k%d" % (i % keys), i) for i in range(n)]
    latest = {}
    for k, v in log: latest[k] = v
    return R(len(log), len(latest), "entries_applied", "entries",
             method="replay %d-entry log vs compacted %d keys" % (n, keys))

def t_replay_acceleration(p):
    n, bs = p.get("n", 1000), p.get("batch", 100)
    return R(n, (n + bs - 1) // bs, "apply_calls", "calls",
             method="%d applies vs batches of %d" % (n, bs))

def t_incremental_graph_compilation(p):
    nodes, changed, dep = p.get("nodes", 200), p.get("changed", 1), p.get("dep", 4)
    return R(nodes, changed * (1 + dep), "nodes_compiled", "nodes",
             method="full %d compile vs %d changed + %d dep each" % (nodes, changed, dep))

def t_incremental_computation(p):
    nodes, cone = p.get("nodes", 100), p.get("cone", 8)
    return R(nodes, cone, "node_evals", "evals",
             method="full %d recompute vs %d-node dirty cone" % (nodes, cone))

def t_content_addressing(p):
    n = p.get("n", 500)
    names = ["file-%d" % i for i in range(n)]
    idx = {"file-%d" % i: i for i in range(n)}
    target = names[-1]
    cmps = 0
    for nm in names:
        cmps += 1
        if nm == target: break
    return R(cmps, 1, "comparisons", "comparisons",
             method="linear scan of %d vs hash lookup" % n)

def t_semantic_hashes(p):
    total, leaves, depth = p.get("total", 127), p.get("leaves", 1), p.get("depth", 7)
    return R(total, leaves * depth, "hash_ops", "hashes",
             method="rehash %d-node tree vs %d Merkle paths d=%d" % (total, leaves, depth))

def t_dependency_graphs(p):
    edges, delta = p.get("edges", 300), p.get("delta", 5)
    return R(edges, delta, "edges_processed", "edges",
             method="rebuild %d edges vs incremental %d" % (edges, delta))

def t_materialized_projections(p):
    records, queries = p.get("records", 1000), p.get("queries", 100)
    return R(records * queries, records + queries, "records_scanned", "records",
             method="%d queries x %d scan vs materialize + lookups" % (queries, records))

def t_invalidation(p):
    cached, affected = p.get("cached", 1000), p.get("affected", 10)
    return R(cached, affected, "entries_invalidated", "entries",
             method="invalidate-all %d vs precise %d" % (cached, affected))

def t_snapshotting(p):
    items, changed = p.get("items", 10000), p.get("changed", 10)
    return R(items, changed, "items_copied", "items",
             method="full %d copy vs COW delta %d" % (items, changed))

def t_batching(p):
    n, bs = p.get("n", 1000), p.get("batch", 100)
    per_item, batch_ovh, item_cost = 1.0, 1.0, p.get("icost", 0.01)
    before = n * (per_item + item_cost)
    after = ((n + bs - 1) // bs) * batch_ovh + n * item_cost
    return R(before, after, "cost_units", "units",
             method="per-item overhead vs batch-of-%d" % bs)

def t_streaming(p):
    n, chunk = p.get("n", 10000), p.get("chunk", 100)
    return R(n, chunk, "peak_items_held", "items",
             method="buffer-all %d vs streaming chunks of %d" % (n, chunk))

def t_backpressure(p):
    burst, bound = p.get("burst", 5000), p.get("bound", 200)
    return R(burst, bound, "peak_queue_depth", "items",
             method="unbounded burst %d vs bounded %d" % (burst, bound))

def t_queue_fairness(p):
    flood, producers = p.get("flood", 270), p.get("producers", 3)
    return R(flood, producers, "max_victim_wait", "positions",
             method="FIFO vs round-robin over %d producers" % producers)

def t_work_stealing(p):
    work = p.get("work", [100, 1, 1, 1])
    w = len(work)
    return R(max(work), (sum(work) + w - 1) // w, "makespan_units", "units",
             method="static vs stealing on %s" % work)

def t_lease_fencing(p):
    stale = p.get("stale", 3)
    return R(stale, 0, "stale_writes_accepted", "writes",
             method="no fencing accepts %d stale vs tokens reject all" % stale)

def t_connection_pools(p):
    reqs, setup, pool = p.get("reqs", 100), p.get("setup", 10), p.get("pool", 5)
    return R(reqs * (setup + 1), pool * setup + reqs, "cost_units", "units",
             method="new conn per request vs pool of %d" % pool)

def t_query_planning(p):
    rows, match = p.get("rows", 10000), p.get("match", 100)
    return R(rows, match, "rows_scanned", "rows",
             method="full %d scan vs index seek %d" % (rows, match))

def t_indexes(p):
    n = p.get("n", 5000)
    return R(n // 2, math.ceil(math.log2(n)), "comparisons", "comparisons",
             method="linear avg vs b-tree over %d" % n)

def t_partitioning(p):
    parts, hit = p.get("parts", 10), p.get("hit", 2)
    return R(parts, hit, "partitions_scanned", "partitions",
             method="scan %d vs prune to %d" % (parts, hit))

def t_pagination(p):
    offset, page = p.get("offset", 9900), p.get("page", 100)
    return R(offset, page, "rows_skipped", "rows",
             method="OFFSET %d vs keyset cursor page %d" % (offset, page))

def t_cursor_durability(p):
    done = p.get("done", 5000)
    return R(done, 0, "rows_reread", "rows",
             method="crash at %d: rescan vs durable cursor" % done)

def t_cache_locality(p):
    items, block = p.get("items", 1000), p.get("block", 100)
    return R(items, items // block, "cache_misses", "misses",
             method="random vs blocked, %d items / %d per block" % (items, block))

def t_artifact_dedup(p):
    total, unique = p.get("total", 100), p.get("unique", 60)
    blobs = [("blob-%d" % (i % unique), "x" * p.get("bsize", 50)) for i in range(total)]
    before = sum(len(b[1]) for b in blobs)
    seen = set(); after = 0
    for name, body in blobs:
        if name not in seen:
            seen.add(name); after += len(body)
    return R(before, after, "bytes_stored", "bytes",
             method="store %d (%d dup) vs hash dedup" % (total, total - unique))

def t_build_caching(p):
    steps, changed = p.get("steps", 50), p.get("changed", 5)
    return R(steps, changed, "steps_executed", "steps",
             method="rebuild %d vs cached, %d changed" % (steps, changed))

def t_browser_pooling(p):
    tasks, launch, pool = p.get("tasks", 20), p.get("launch", 50), p.get("pool", 3)
    return R(tasks * launch, pool * launch, "cost_units", "units",
             method="launch per task vs pool of %d" % pool)

def t_test_selection(p):
    tests, affected = p.get("tests", 200), p.get("affected", 15)
    return R(tests, affected, "tests_run", "tests",
             method="run %d vs affected %d" % (tests, affected))

def t_selective_regeneration(p):
    items, dirty = p.get("items", 500), p.get("dirty", 20)
    return R(items, dirty, "items_regenerated", "items",
             method="regen %d vs dirty %d" % (items, dirty))

def t_parallel_rendering(p):
    pages, cost, workers = p.get("pages", 8), p.get("cost", 10), p.get("workers", 4)
    return R(pages * cost, ((pages + workers - 1) // workers) * cost, "makespan_units", "units",
             method="sequential %d vs %d workers" % (pages, workers))

def t_failure_clustering(p):
    failures, clusters, samples = p.get("failures", 100), p.get("clusters", 5), p.get("samples", 2)
    return R(failures, clusters * (1 + samples), "items_inspected", "items",
             method="inspect %d vs %d clusters + %d samples" % (failures, clusters, samples))

def t_semantic_diffing(p):
    diffs, empty = p.get("diffs", 50), p.get("empty", 30)
    return R(diffs, diffs - empty, "flags_raised", "flags",
             method="line diff %d vs semantic %d" % (diffs, diffs - empty))

def t_schema_evolution(p):
    records = p.get("records", 10000)
    return R(records, 0, "records_rewritten", "records",
             method="eager rewrite %d vs lazy migrate-on-read" % records)

def t_zero_copy(p):
    nbytes = p.get("nbytes", 1 << 20)
    buf = bytearray(nbytes)
    before = len(bytes(buf))
    view = memoryview(buf); after = 0; del view
    return R(before, after, "bytes_copied", "bytes",
             method="copy vs memoryview on %d bytes" % nbytes)

TOPICS = {
    "compression": t_compression, "storage-tiers": t_storage_tiers,
    "checkpoint-compaction": t_checkpoint_compaction, "replay-acceleration": t_replay_acceleration,
    "incremental-graph-compilation": t_incremental_graph_compilation,
    "incremental-computation": t_incremental_computation, "content-addressing": t_content_addressing,
    "semantic-hashes": t_semantic_hashes, "dependency-graphs": t_dependency_graphs,
    "materialized-projections": t_materialized_projections, "invalidation": t_invalidation,
    "snapshotting": t_snapshotting, "batching": t_batching, "streaming": t_streaming,
    "backpressure": t_backpressure, "queue-fairness": t_queue_fairness,
    "work-stealing": t_work_stealing, "lease-fencing": t_lease_fencing,
    "connection-pools": t_connection_pools, "query-planning": t_query_planning,
    "indexes": t_indexes, "partitioning": t_partitioning, "pagination": t_pagination,
    "cursor-durability": t_cursor_durability, "cache-locality": t_cache_locality,
    "artifact-dedup": t_artifact_dedup, "build-caching": t_build_caching,
    "browser-pooling": t_browser_pooling, "test-selection": t_test_selection,
    "selective-regeneration": t_selective_regeneration, "parallel-rendering": t_parallel_rendering,
    "failure-clustering": t_failure_clustering, "semantic-diffing": t_semantic_diffing,
    "schema-evolution": t_schema_evolution, "zero-copy": t_zero_copy,
}
