#!/usr/bin/env python3
"""Generate mission matrices for the MAXIMUM PARALLEL PROGRAM MODE fleet.
Each row: mission_id, category, family, title, objective, pass_criterion.
Workers claim 50-mission ranges from fleet/claims/<category>.txt and drain.
"""
import os, itertools

BASE = os.path.expanduser("~/workspace/ping-build-program/fleet")
os.makedirs(BASE + "/claims", exist_ok=True)

def emit(cat, families, total):
    rows = []
    for fam, count, mk in families:
        for i in range(count):
            rows.append((cat, fam, mk(i)))
    # pad or trim to exact total
    while len(rows) < total:
        rows.append((cat, "overflow", ("Overflow mission %d: verify no unexamined behavior remains in this category; record as N/A with justification if the grid is already covered." % (len(rows)+1), "Coverage completeness", "Every grid cell has a verdict or a justified N/A.")))
    rows = rows[:total]
    out = []
    for n, (c, fam, (title, obj, pc)) in enumerate(rows, 1):
        mid = "%s-%04d" % (c[:3].upper(), n)
        out.append("\t".join([mid, c, fam, title, obj, pc]))
    with open(f"{BASE}/matrix-{cat}.tsv", "w") as f:
        f.write("mission_id\tcategory\tfamily\ttitle\tobjective\tpass_criterion\n")
        f.write("\n".join(out) + "\n")
    # claims: 50-mission ranges
    with open(f"{BASE}/claims/{cat}.txt", "w") as f:
        for s in range(1, total + 1, 50):
            e = min(s + 49, total)
            f.write(f"{s:04d}-{e:04d}\n")
    print(cat, len(out))

# ---------------- ORACLE 2900 ----------------
ORA_SVCS = ["postgres", "qdrant", "ollama", "gateway", "js-worker-a", "js-worker-b",
            "python-adapter", "event-ingest", "witness", "scheduler", "backup-agent",
            "health-monitor", "log-shipper", "reverse-proxy", "cert-renewer"]
ORA_IMGS = ["postgres:16-arm64", "qdrant-arm64", "ollama-arm64", "node:22-slim-arm64",
            "python:3.12-slim-arm64", "gateway-custom", "worker-custom", "adapter-custom",
            "proxy-nginx-arm64", "backup-cron-arm64", "certbot-arm64", "otel-collector-arm64",
            "migrate-runner-arm64", "seed-loader-arm64", "watchdog-arm64"]

def ofam(name, items, tmpl):
    def mk(i):
        item = items[i % len(items)]
        k = i // len(items)
        return tmpl(item, k)
    return (name, len(items) * (2900 // 26 // len(items) or 1), mk)

oracle_fams = []
def add_ora(name, count, items, title, obj, pc):
    def mk(i):
        it = items[i % len(items)]
        return (title.format(it=it, n=i), obj.format(it=it), pc.format(it=it))
    oracle_fams.append((name, count, mk))

add_ora("reproducibility", 200, [f"component-{i}" for i in range(20)],
    "Reproducible build: {it} — digest-stable artifact from pinned sources",
    "Rebuilding {it} from pinned sources must yield a byte-identical digest.",
    "Two independent builds of {it} produce identical sha256; any divergence is FAIL with diff evidence.")
add_ora("image-provenance", 150, ORA_IMGS,
    "Image provenance: {it} — digest pinned, signature verified, arch manifest ARM64",
    "Every image {it} must have a pinned digest, a verified signature or provenance attestation, and an ARM64 manifest entry.",
    "{it} runs --print-architecture / inspect shows arm64; digest matches the pinned value in the lockfile; no latest tags.")
add_ora("dependency-completeness", 150, ORA_SVCS,
    "Dependency completeness: {it} — all runtime deps declared and present",
    "{it} must start with zero undeclared or missing runtime dependencies on ARM64.",
    "{it} starts in an isolated container with only declared deps; missing-dep failure is FAIL, not a skip.")
add_ora("arch-compat", 150, ORA_SVCS,
    "ARM64 compatibility: {it} — no x86-only binary, no QEMU fallback in hot path",
    "{it} must execute natively on ARM64 with no emulation in the hot path.",
    "Native execution confirmed for {it} (no qemu in process tree); perf within 2x of x86 reference or documented.")
add_ora("cold-boot", 150, ORA_SVCS,
    "Cold boot: {it} — full host power-cycle to serving",
    "{it} must reach serving state after a full cold boot with no manual intervention.",
    "Cold boot of {it} completes within its budget; order dependencies respected; FAIL on any manual step.")
add_ora("restart-semantics", 200, ORA_SVCS + ["db-warm", "gateway-warm", "worker-warm", "adapter-warm", "proxy-warm"],
    "Restart semantics: {it} — warm restart preserves in-flight guarantees",
    "{it} warm restart must not lose acknowledged work or corrupt state.",
    "Restart {it} mid-load: zero acknowledged-work loss, state consistent; evidence from journal diff.")
add_ora("network-interruption", 150, ORA_SVCS,
    "Network interruption: {it} — partition and heal without split-brain",
    "{it} must survive network partition and heal without split-brain or silent divergence.",
    "Partition {it} for 60s: no split-brain, heal converges; FAIL on silent divergence.")
add_ora("partial-dep-loss", 150, ORA_SVCS,
    "Partial dependency loss: {it} — one dependency down, service degrades loudly",
    "{it} must degrade loudly (typed failure, never silent empty success) when one dependency is lost.",
    "Kill one dep of {it}: typed FAILURE_CLASS surfaces; FAIL if empty success or hang without deadline.")
add_ora("store-loss", 200, ["qdrant", "postgres"] * 10,
    "Store loss: {it} — total data loss, rebuild from canonical sources",
    "{it} total loss must be recoverable from canonical sources within RTO.",
    "Wipe {it}: rebuild completes within RTO budget; data verified against canonical digest; FAIL on unrecoverable loss.")
add_ora("event-ingress-chaos", 250, ["duplicate", "malformed", "oversized", "collision", "reordered"] * 5,
    "Event ingress chaos [{it}]: gateway behavior under adversarial ingress",
    "The gateway must classify {it} events into the failure taxonomy, never crash, never accept poison as truth.",
    "Inject {it} events: 100% classified, zero crashes, zero poisoned canonical state; evidence in harness log.")
add_ora("schema-drift", 200, [f"schema-v{i}" for i in range(20)],
    "Schema drift: {it} — migration compatibility both directions",
    "{it} migration must be forward/backward compatible per the declared contract.",
    "Migrate {it} up then down: data intact, digests match; FAIL on silent field loss.")
add_ora("rollback", 200, [f"release-{i}" for i in range(20)],
    "Rollback: {it} — certified rollback path actually works",
    "Rolling back {it} must restore the certified baseline byte-identically.",
    "Rollback {it}: post-rollback digest equals certified baseline digest; FAIL otherwise.")
add_ora("forward-recovery", 200, [f"failure-{i}" for i in range(20)],
    "Forward recovery: {it} — resume without rollback where rollback is unsafe",
    "{it} must support forward recovery when rollback would destroy evidence.",
    "Forward-recover {it}: evidence preserved, service restored; FAIL on evidence destruction.")
add_ora("health-semantics", 150, ORA_SVCS,
    "Health semantics: {it} — /health means what it claims",
    "{it} health endpoint must reflect actual serving capability, not process aliveness.",
    "{it} reports unhealthy when its critical dep is down; FAIL on 200-OK-while-broken.")
add_ora("secret-leakage", 150, ORA_SVCS,
    "Secret/log leakage: {it} — no secret material in logs, errors, or dumps",
    "{it} must never emit secret material to logs, error payloads, or diagnostics.",
    "Canary scan of {it} logs/errors/dumps: zero hits; FAIL on any leak.")
add_ora("resource-exhaustion", 200, ORA_SVCS + ["conn-pool", "fd-table", "mem-arena", "cpu-quota", "disk-io"],
    "Resource exhaustion: {it} — bounded degradation under pressure",
    "{it} must degrade with backpressure and typed errors, never OOM-kill silently.",
    "Exhaust {it}: backpressure engages, typed errors surface; FAIL on silent death or unbounded queue.")
add_ora("disk-pressure", 100, [f"volume-{i}" for i in range(10)],
    "Disk pressure: {it} — behavior at 90%/95%/100% full",
    "{it} must fail closed with a typed error at disk exhaustion, never corrupt.",
    "Fill {it}: typed DISK_PRESSURE failure, no corruption; FAIL on partial writes presented as success.")
add_ora("slow-queries", 100, [f"query-{i}" for i in range(10)],
    "Slow query: {it} — deadline, cancellation, and evidence",
    "{it} slow queries must hit a deadline, cancel cleanly, and leave evidence.",
    "{it} exceeding p99 budget: cancelled with typed TIMEOUT + evidence; FAIL on unbounded run.")
add_ora("txn-retry", 100, [f"txn-{i}" for i in range(10)],
    "Transaction retry: {it} — SERIALIZABLE contention handled idempotently",
    "{it} must retry serialization failures idempotently with bounded attempts.",
    "Contend {it}: retries bounded, exactly-once effect; FAIL on duplicate side effects.")
add_ora("read-fallback", 100, [f"reader-{i}" for i in range(10)],
    "Canonical read fallback: {it} — degraded reads stay labeled",
    "{it} degraded reads must be labeled DERIVED/STALE, never presented as canonical.",
    "Degrade {it}: reads labeled, never silent; FAIL on stale-presented-as-fresh.")
add_ora("retention", 100, [f"dataset-{i}" for i in range(10)],
    "Retention: {it} — policy enforced, deletion is typed and auditable",
    "{it} retention policy must execute as typed, auditable deletions.",
    "Expire {it}: deletion event recorded, bytes actually freed; FAIL on phantom deletion.")
add_ora("poison-events", 100, [f"poison-{i}" for i in range(10)],
    "Poison event: {it} — quarantined, never retried forever, never canonical",
    "{it} poison events must quarantine with evidence, bounded retries, dead-letter.",
    "Inject {it}: quarantined with evidence, retry budget respected; FAIL on infinite retry or acceptance.")
add_ora("backpressure", 100, [f"pipe-{i}" for i in range(10)],
    "Backpressure: {it} — producer slows, consumer never drops silently",
    "{it} must propagate backpressure end to end with no silent drops.",
    "Overload {it}: producer throttled, zero silent drops; FAIL on lost work.")
add_ora("ordering", 100, [f"sequence-{i}" for i in range(10)],
    "Shutdown/startup ordering: {it} — dependency order respected both ways",
    "{it} must stop and start in dependency order with no orphaned in-flight work.",
    "Cycle {it}: order verified in logs, zero orphaned work; FAIL on out-of-order start serving traffic.")
add_ora("crash-ack", 100, [f"ack-{i}" for i in range(10)],
    "Crash before/after acknowledgement: {it} — exactly-once effect boundary",
    "Crashing {it} around the ack boundary must preserve exactly-once effects.",
    "Crash {it} pre/post ack: effect applied exactly once; FAIL on duplication or loss.")
add_ora("stale-artifact", 100, ["stale-container", "stale-image", "stale-source", "wrong-sha", "wrong-arch", "missing-dist-dep"] * 2,
    "Stale/wrong artifact: {it} — detected before serving",
    "{it} must be detected and refused before serving traffic.",
    "Present {it}: refused with typed error pre-serve; FAIL if it serves.")
emit("oracle", oracle_fams, 2900)

# ---------------- BACKEND 1800 ----------------
BE_TOPICS = ["incremental-computation", "content-addressing", "semantic-hashes",
    "dependency-graphs", "materialized-projections", "invalidation", "snapshotting",
    "batching", "streaming", "backpressure", "queue-fairness", "work-stealing",
    "lease-fencing", "connection-pools", "query-planning", "indexes", "partitioning",
    "pagination", "cursor-durability", "cache-locality", "artifact-dedup", "build-caching",
    "browser-pooling", "test-selection", "selective-regeneration", "parallel-rendering",
    "failure-clustering", "semantic-diffing", "schema-evolution", "zero-copy",
    "compression", "storage-tiers", "checkpoint-compaction", "replay-acceleration",
    "incremental-graph-compilation"]
be_fams = []
def add_be(name, count, topics, title, obj, pc):
    def mk(i):
        it = topics[i % len(topics)]
        return (title.format(it=it, n=i), obj.format(it=it), pc.format(it=it))
    be_fams.append((name, count, mk))
add_be("bca", 1800, BE_TOPICS,
    "BEFORE->CHANGE->AFTER: {it} (case {n}) — measured improvement or parity proof",
    "For {it}: record BEFORE baseline, apply one CHANGE, record AFTER; claim only what the delta proves.",
    "BEFORE and AFTER numbers for {it} recorded with method; improvement claimed only if delta exceeds noise; FAIL on claim without both measurements.")
emit("backend", be_fams, 1800)

# ---------------- ACQUISITION 2500 ----------------
ACQ = {
 "html-hardening": 250, "json-ld": 150, "structured-metadata": 150, "sitemaps": 100,
 "feeds": 100, "public-apis": 200, "documents-pdf": 200, "image-metadata": 100,
 "permitted-social": 150, "owner-uploads": 150, "owner-corrections": 100,
 "software-connectors": 150, "conflict-sources": 150, "renames-redirects": 100,
 "partial-pages": 100, "js-heavy": 100, "malformed-markup": 100, "rate-limits": 100,
 "provider-outage": 100, "changed-schema": 100, "wrong-encoding": 50,
 "multilingual-rtl": 100, "hostile-content": 150, "huge-documents": 100,
 "missing-provenance": 100}
acq_fams = []
for fam, count in ACQ.items():
    def mk(i, fam=fam):
        return (
            f"Acquisition [{fam}] case {i}: harden the boundary, never guess into fact",
            f"For {fam}: feed adversarial input through the fixture lab; the parser must classify, bound, or quarantine — never convert a guess into a canonical fact.",
            f"Fixture case {i} of {fam}: typed failure or bounded success with provenance; FAIL on any parser guess presented as fact.")
    acq_fams.append((fam, count, mk))
emit("acquisition", acq_fams, 2500)

# ---------------- CONNECTOR INTEL 1200 ----------------
CONN_DOMAINS = ["crm", "erp", "accounting", "payments", "banking", "payroll", "hr",
    "email", "calendar", "phone", "sms", "chat", "social", "advertising", "analytics",
    "pos", "ecommerce", "inventory", "field-service", "project-mgmt", "ticketing",
    "support", "forms", "documents", "storage", "spreadsheets"]
CONN_DIMS = ["objects", "events", "capabilities", "authorization", "webhooks",
    "polling", "rate-limits", "idempotency", "effects", "reversibility", "provenance"]
con_fams = []
def add_con(name, count, items, title, obj, pc):
    def mk(i):
        it = items[i % len(items)]
        return (title.format(it=it, n=i), obj.format(it=it), pc.format(it=it))
    con_fams.append((name, count, mk))
add_con("domain-intel", 1200, [f"{d}/{x}" for d, x in itertools.product(CONN_DOMAINS, CONN_DIMS)],
    "Connector intel [{it}] (case {n}): map the shape, do not build the connector",
    "For {it}: document the canonical shape from public API docs — objects, events, auth, limits — implementation stays data-driven by priority.",
    "Shape of {it} recorded with doc citations; FAIL on invented endpoints or guessed rate limits.")
emit("connector", con_fams, 1200)

# ---------------- RELEASE 100 ----------------
rel_fams = []
def add_rel(name, count, items, title, obj, pc):
    def mk(i):
        it = items[i % len(items)]
        return (title.format(it=it, n=i), obj.format(it=it), pc.format(it=it))
    rel_fams.append((name, count, mk))
add_rel("release", 100, ["versioning", "changelog", "artifact-signing", "dist-channels",
    "rollback-plan", "canary", "migrations", "compat-matrix", "sbom", "provenance-attestation"],
    "Release [{it}] (case {n}): the boring path that always works",
    "For {it}: define the exact boring procedure; promote only through the certification law.",
    "Procedure for {it} documented and dry-run; FAIL on any manual undocumented step.")
emit("release", rel_fams, 100)

# ---------------- PERF/REL/OPS 850 ----------------
PO = ["slo-definition", "error-budgets", "oncall-runbook", "incident-review",
      "capacity-planning", "chaos-drills", "backup-restore", "disaster-recovery",
      "observability", "tracing", "profiling", "load-testing", "soak-testing",
      "deploy-safety", "config-management", "secret-rotation", "audit-trails"]
po_fams = []
def add_po(name, count, items, title, obj, pc):
    def mk(i):
        it = items[i % len(items)]
        return (title.format(it=it, n=i), obj.format(it=it), pc.format(it=it))
    po_fams.append((name, count, mk))
add_po("perfrelops", 850, PO,
    "Perf/Rel/Ops [{it}] (case {n}): measured, budgeted, recoverable",
    "For {it}: define the metric, the budget, and the recovery path; measure, do not assert.",
    "{it} has a number, a budget, and a tested recovery; FAIL on unmeasured claims.")
emit("perfops", po_fams, 850)
print("done")
