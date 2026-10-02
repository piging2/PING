#!/usr/bin/env python3
"""Regenerate the oracle matrix v2: synthetic-placeholder families replaced with
subjects grounded in the real Oracle inventory (lane-oracle/ORACLE-DEPLOYMENT-CLOSURE.md).

Read-only w.r.t. the live host: every mission is executable locally (sandbox docker
pulls of public images, scratch containers) or a design-spec mission with verifiable
pass criteria. Nothing may require touching the live Oracle host.

Writes:
  fleet/matrix-oracle-v2.tsv          (3750 rows)
  fleet/claims/oracle-v2/oracle-NNNN-NNNN.claim  (22 files, category-qualified names)
  fleet/claims/oracle-v2.txt          (range list)
"""
import os

BASE = os.path.expanduser("~/workspace/ping-build-program/fleet")
HOST_RULE = "Sandbox-local execution only; the live Oracle host (129.146.60.17) is never touched."

# ---- real inventory anchors (from ORACLE-DEPLOYMENT-CLOSURE.md) ----
GW_LIVE   = "ping-gateway:candidate-3c5d280dd @ sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2"
GW_PREV   = "ping-gateway:candidate-84486f056 @ sha256:467af2dabc081dd09a8f26560ab8320073320005030bd3767afa8b40eadd970e"
PG_IMG    = "postgres:17-alpine @ sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73"
QD_IMG    = "qdrant/qdrant:v1.7.0 @ sha256:ff1639878418c0572f50a7e1314874e399537eb97e6d2f42d6b987a07a2c4c4f"
N24       = "node:24-alpine @ sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81"
N20       = "node:20-alpine @ sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293"
N18       = "node:18-alpine @ sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e"
OLLAMA    = "ollama/ollama:latest @ sha256:da6e0dc5651df159e45686fd663c4dbe1624a52c44d7280eeac1551d8f865532"

REGEN = {}  # family -> (count, subjects, angles, title_t, obj_t, pc_t)

def reg(family, count, subjects, angles, title_t, obj_t, pc_t):
    assert len(subjects) * len(angles) == count, (family, len(subjects), len(angles), count)
    REGEN[family] = (count, subjects, angles, title_t, obj_t, pc_t)

# ---------------- reproducibility (200 = 20 x 10) ----------------
reg("reproducibility", 200,
    [GW_LIVE, GW_PREV, PG_IMG, QD_IMG, N24, N20, N18, OLLAMA,
     "gateway multi-stage rebuild on node:24-alpine base (design-spec; repo engines require 24.x, live image runs node 18.20.8)",
     "digest-pin lockfile for the 8-image host inventory (artifact creation mission)",
     "worker-digestion image on node:24-alpine (design-spec Dockerfile, mem 512m-1g, depends_on postgres+qdrant healthy)",
     "worker-newsletter image on node:24-alpine (design-spec Dockerfile)",
     "worker-projection image on node:24-alpine (design-spec Dockerfile)",
     "worker-witness image on node:24-alpine (design-spec Dockerfile)",
     "worker-replay image on node:24-alpine (design-spec Dockerfile)",
     "python-adapter image on python:3.12-alpine arm64 (design-spec; host python3 is 3.12.3, adapters belong in containers)",
     "ping-postgres-2026-09-19.dump artifact digest (368 KB, /opt/ping/backups)",
     "pgdata-backup-2026-09-16.sql.gz artifact digest (161 KB, releases/)",
     "qdrant 67MB snapshot artifact digest (09-17, releases/)",
     "ping-source-clean-2026-09-16.tar.gz artifact digest (26.6 MB, releases/)"],
    ["digest equality across two independent pulls",
     "pulled digest matches the pinned sha256 from the closure inventory",
     "arm64 manifest present (no x86-only layers)",
     "no :latest tag on the production pin (ollama is the documented exception)",
     "provenance attestation or buildinfo present",
     "two builds from pinned sources yield identical sha256 (design-spec for gateway/worker images)",
     "layer-by-layer diff empty between the two builds",
     "registry digest equals local image digest after pull",
     "lockfile entry is machine-checkable (repository:tag@sha256:...)",
     "digest stable across pull retries (registry caching never mutates the digest)"],
    "Reproducible build: {it} [{angle}] (case {k})",
    "For {it}: verify the artifact is reproducible from pinned sources. " + HOST_RULE,
    "Two independent resolutions of {it} produce identical sha256 ({angle}); any divergence is FAIL with diff evidence.")

# ---------------- schema-drift (200 = 20 x 10) ----------------
reg("schema-drift", 200,
    ["crx_runtime dump/restore round-trip (pg_dump -U ping -d crx_runtime --no-owner --no-acl piped to gzip, digest compare)",
     "pgdata-backup-2026-09-16.sql.gz restore into an isolated scratch postgres:17-alpine (RESTORE-2026-09-16.md procedure, never live volumes)",
     "ping-postgres-2026-09-19.dump restore compatibility against postgres:17-alpine 17.11 (same major)",
     "postgres 17 minor-version drift (17.x to 17.y patch compatibility on scratch)",
     "add-nullable-column expand pattern on scratch postgres:17-alpine (canonical event-table contract)",
     "backfill-then-set-not-null contract pattern on scratch postgres",
     "index add/drop under concurrent writes (pgbench -c 8 on scratch)",
     "enum value extension pattern on scratch postgres",
     "table rename with compatibility view on scratch postgres",
     "knowledge collection payload schema v1 to v2 (on-disk payload, qdrant v1.7.0 scratch)",
     "HNSW m=16 parameter change reindex contract on a scratch copy of the 144-point knowledge collection",
     "768-dim vector schema evolution: re-embed contract for the 144 knowledge points",
     "qdrant 67MB 09-17 snapshot restore into scratch qdrant v1.7.0 (same-version drift check)",
     "/opt/ping/.env variable-name schema evolution (names only; values never read)",
     "compose.proposed.yaml config schema evolution review (design artifact)",
     "gateway /health contract evolution (healthy JSON shape with 3/3 integrations)",
     "canonical event envelope versioning (design-spec; PING events are canonical truth)",
     "backup retention design schema (7 daily + 4 weekly lifecycle)",
     "worker env schema evolution across digestion/newsletter/projection/witness/replay (design-spec)",
     "WAL-vs-pgdump decision record revisit trigger (revisit at 10 GB or point-in-time-recovery requirement)"],
    ["up-then-down migration on scratch, data intact",
     "dump digest before and after migration matches",
     "migration leaves zero orphan schema objects",
     "concurrent-write safety during migration (pgbench)",
     "migration contract written as a RESTORE-2026-09-16.md style procedure",
     "qdrant payload change via snapshot restore into scratch v1.7.0",
     "HNSW parameter change reindex contract on the 144-point copy",
     "768-dim vector schema evolution via re-embed contract",
     ".env variable-name change stays backward compatible (names only)",
     "design artifact review with explicit compatibility verdict"],
    "Schema drift: {it} [{angle}] (case {k})",
    "For {it}: migration must be forward/backward compatible per the declared contract. " + HOST_RULE,
    "Migrate {it} up then down ({angle}): data intact, digests match; FAIL on silent field loss.")

# ---------------- rollback (200 = 20 x 10) ----------------
reg("rollback", 200,
    ["gateway rollback between the two real candidate digests 3c5d280dd and 84486f056",
     "postgres restore from ping-postgres-2026-09-19.dump into an isolated container",
     "postgres restore from pgdata-backup-2026-09-16.sql.gz into an isolated container",
     "qdrant restore from the 67MB 09-17 snapshot into an isolated container",
     "compose.proposed.yaml to hand-run docker topology rollback documentation (design)",
     "node 18 to node 24 base-image rebuild rollback plan for the gateway (design-spec)",
     "worker-digestion image rollback (design-spec)",
     "worker-newsletter image rollback (design-spec)",
     "worker-projection image rollback (design-spec)",
     "worker-witness image rollback (design-spec)",
     "worker-replay image rollback (design-spec)",
     "/opt/ping/.env change rollback (names only; values never read)",
     "memory-limit introduction rollback (1g postgres / 1g qdrant / 2g gateway)",
     "healthcheck addition rollback (gateway/pg/qdrant)",
     "log rotation 10m x 5 rollback",
     "loopback-only port binding change rollback",
     "depends_on healthy ordering addition rollback",
     "ollama latest-tag pin decision rollback (image present, no container)",
     "node:18/20-alpine image prune rollback record (4.088 GB reclaimable)",
     "RESTORE-2026-09-16.md isolated-restore drill rollback"],
    ["rollback restores the certified baseline byte-identically (digest compare)",
     "rollback procedure dry-run on scratch with no live-host contact",
     "rollback preserves evidence (crashed containers kept for forensics)",
     "rollback time measured against the RTO budget",
     "rollback between the two real gateway candidate digests",
     "postgres restore from the 09-19 dump into an isolated container",
     "qdrant restore from the 09-17 snapshot into an isolated container",
     "rollback does not resurrect containers an operator deliberately stopped",
     "rollback leaves an audit trail (who, when, which digest)",
     "config-only rollback with no data movement"],
    "Rollback: {it} [{angle}] (case {k})",
    "Rolling back {it} must restore the certified baseline byte-identically. " + HOST_RULE,
    "Rollback {it} ({angle}): post-rollback digest equals the certified baseline digest; FAIL otherwise.")

# ---------------- forward-recovery (200 = 20 x 10) ----------------
reg("forward-recovery", 200,
    ["gateway exit-137 death of ping-gateway-candidate (SIGKILL, forensics preserved)",
     "gateway exit-137 death of ping-gateway-prev-84486f056 (SIGKILL, forensics preserved)",
     "wedged gateway with no healthcheck (container Up, event loop wedged)",
     "OOM-kill risk under load (no memory limits anywhere, 0 swap)",
     "cold-boot ordering race (gateway starts before postgres is ready; no depends_on live)",
     "journald slow fill (432 MB, no SystemMaxUse cap)",
     "/var/log growth (454 MB)",
     "backup gap: one-shot on-host-only backups (09-16, 09-19), no automation",
     "config drift: hand-run docker containers vs checked-in compose artifacts",
     "secrets exist only on the host (/opt/ping/.env values not in any artifact)",
     "qdrant TCP-only healthcheck gap (no HTTP version check)",
     "node 18.20.8 in the live gateway vs repo engines 24.x drift",
     "qdrant 67MB snapshot staleness (09-17)",
     "postgres 09-19 dump staleness",
     "disk pressure trajectory (17G of 45G used, 4.088 GB reclaimable images)",
     "p18-scratch-pg leftover container (exit 0, 4 days old)",
     "ollama 6.99 GB image with no consumer container",
     "unattended-upgrades enabled with no operator coordination",
     "gateway 1.82 GB image bloat (full repo COPY plus npm install --no-save typescript layer)",
     "single-host fate sharing (all three containers on one 1-vCPU VM)"],
    ["evidence preserved (logs, journals, dead containers) while service is restored",
     "no rollback performed where rollback would destroy evidence",
     "recovery rehearsed on a scratch clone, never the live host",
     "forward fix written as a design artifact with owner and date",
     "the monitoring gap that hid the failure is named and closed in design",
     "degraded-mode operation defined for the recovery window",
     "recovery verified by /health, pg_isready, or collection status green",
     "post-recovery digest matches the expected baseline",
     "recovery runbook states explicit stop conditions",
     "repeat of the failure on scratch does not recur after the fix"],
    "Forward recovery: {it} [{angle}] (case {k})",
    "For {it}: recover forward where rollback would destroy evidence. " + HOST_RULE,
    "Forward-recover {it} ({angle}): evidence preserved, service restored; FAIL on evidence destruction.")

# ---------------- disk-pressure (100 = 10 x 10) ----------------
reg("disk-pressure", 100,
    ["named volume oracle_pgdata (69 MB live)",
     "named volume oracle_qdrant_storage (2.3 MB live)",
     "/var/lib/docker (2.0 GB unique on-disk)",
     "/opt/ping (2.7 GB deployment tree)",
     "/var/log (454 MB)",
     "journald (432 MB, uncapped)",
     "p18-oracle-staging (219 MB build scratch)",
     "host disk 45 GB (17 GB used, 28 GB free)",
     "reclaimable docker images 4.088 GB (old gateway candidate 1.77 GB, node:18/20-alpine)",
     "ollama/ollama:latest image (6.99 GB logical, no running container)"],
    ["behavior at 90% full",
     "behavior at 95% full",
     "behavior at 100% full: fail closed with a typed DISK_PRESSURE error",
     "no partial writes presented as success",
     "json-file log rotation 10m x 5 engages before exhaustion",
     "journald SystemMaxUse cap engages before exhaustion",
     "prune of reclaimable images documented with candidate list",
     "alert threshold defined with a runbook",
     "service resumes cleanly after space is freed",
     "design-spec review of pressure handling for that volume"],
    "Disk pressure: {it} [{angle}] (case {k})",
    "For {it}: fail closed with a typed error at disk exhaustion, never corrupt. " + HOST_RULE,
    "Fill {it} ({angle}): typed DISK_PRESSURE failure, no corruption; FAIL on partial writes presented as success.")

# ---------------- slow-queries (100 = 10 x 10) ----------------
reg("slow-queries", 100,
    ["crx_runtime event-table sequential scan on scratch postgres:17-alpine",
     "pg_dump -U ping -d crx_runtime --no-owner --no-acl under write load (pgbench)",
     "knowledge collection 144-point vector search with ef tuning (scratch qdrant v1.7.0)",
     "qdrant upsert storm against the knowledge collection (scratch)",
     "POST /collections/knowledge/snapshots during query load (scratch)",
     "gateway /health fan-out to 3 integrations under load (scratch gateway)",
     "pg_isready 10s healthcheck under connection pressure (scratch)",
     "restore of pgdata-backup-2026-09-16.sql.gz into scratch under a time budget",
     "restore of the 67MB qdrant snapshot into scratch under a time budget",
     "index build with concurrent writes (pgbench -c 8 on scratch postgres)"],
    ["statement_timeout enforced with a typed TIMEOUT",
     "cancellation leaves no orphan backend",
     "p99 budget defined and measured locally",
     "evidence (query plan plus timings) recorded",
     "concurrent load does not turn slow into unbounded (pgbench)",
     "client kill does not wedge the server",
     "slow path degrades to a bounded queue, not thread explosion",
     "timeout budget documented in the runbook",
     "regression: a query that was fast stays fast (plan stability)",
     "design-spec: deadline propagation end to end"],
    "Slow query: {it} [{angle}] (case {k})",
    "For {it}: slow queries must hit a deadline, cancel cleanly, and leave evidence. " + HOST_RULE,
    "{it} exceeding the p99 budget ({angle}): cancelled with typed TIMEOUT plus evidence; FAIL on unbounded run.")

# ---------------- txn-retry (100 = 10 x 10) ----------------
reg("txn-retry", 100,
    ["SERIALIZABLE contention on canonical event writes (scratch postgres:17-alpine)",
     "idempotency-key insert pattern for gateway event ingest (scratch)",
     "qdrant upsert idempotency by point ID (scratch knowledge copy)",
     "pg_dump consistency under concurrent writes (scratch)",
     "backup rotation rename atomicity (design for the nightly pg_dump pipeline)",
     "journald SystemMaxUse change atomicity (design)",
     ".env rotation atomicity (names only; design)",
     "qdrant snapshot file copy atomicity (design)",
     "worker digestion to projection handoff exactly-once (design-spec)",
     "witness journal append idempotency (design-spec)"],
    ["retry loop bounded (explicit max attempts)",
     "exactly-once effect under contention",
     "no duplicate side effects",
     "retry keyed on idempotency key, never blind re-execution",
     "contention measured locally with concurrent clients",
     "deadlock yields a typed error, never a hang",
     "retry budget exhausted gives a typed failure, never a silent drop",
     "design-spec: retry policy documented with numbers",
     "cross-service partial failure (gateway to postgres to qdrant) handled",
     "retry storm does not amplify load (backoff plus jitter)"],
    "Transaction retry: {it} [{angle}] (case {k})",
    "For {it}: serialization failures retry idempotently with bounded attempts. " + HOST_RULE,
    "Contend {it} ({angle}): retries bounded, exactly-once effect; FAIL on duplicate side effects.")

# ---------------- read-fallback (100 = 10 x 10) ----------------
reg("read-fallback", 100,
    ["gateway reads when qdrant is down (scratch)",
     "gateway reads when postgres is down (scratch)",
     "/health with 2 of 3 integrations healthy (scratch gateway)",
     "reads served from the 09-19 dump labeled STALE (design)",
     "reads served from the 09-17 qdrant snapshot labeled STALE (design)",
     "knowledge collection empty (0 points) fallback (scratch)",
     "pg_isready false makes the postgres healthcheck unhealthy (scratch)",
     "qdrant TCP-only check fallback to HTTP version check (design)",
     "cold-boot race: gateway reads before postgres is ready (scratch)",
     "worker projection reads with qdrant degraded (design-spec)"],
    ["degraded read labeled DERIVED, never canonical",
     "stale read labeled STALE with an as-of timestamp",
     "fallback never served silently as fresh",
     "/health reflects degraded integrations honestly",
     "fallback path has its own deadline",
     "fallback disabled by config flag when freshness is mandatory",
     "design-spec: fallback decision table reviewed",
     "client can distinguish fallback via a response header or field",
     "fallback cache TTL bounded and documented",
     "full outage gives typed UNAVAILABLE, not an empty 200"],
    "Canonical read fallback: {it} [{angle}] (case {k})",
    "For {it}: degraded reads must be labeled DERIVED/STALE, never presented as canonical. " + HOST_RULE,
    "Degrade {it} ({angle}): reads labeled, never silent; FAIL on stale-presented-as-fresh.")

# ---------------- retention (100 = 10 x 10) ----------------
reg("retention", 100,
    ["nightly pg_dump lifecycle: 7 daily plus 4 weekly (design)",
     "weekly qdrant snapshot lifecycle (design)",
     "json-file log rotation 10m x 5 (design, live logging is unbounded today)",
     "journald SystemMaxUse cap (design; 432 MB uncapped today)",
     "old gateway candidate image prune policy (1.77 GB reclaimable)",
     "node:18/20-alpine image prune policy",
     "ollama 6.99 GB image retention decision (veto-gate REJECT for production)",
     "p18-oracle-staging 219 MB archive policy",
     "exited container forensic retention vs prune (two exit-137 gateway deaths)",
     "/var/log 454 MB rotation policy"],
    ["policy executes as typed, auditable deletions",
     "bytes actually freed (df before and after)",
     "deletion event recorded with timestamp and scope",
     "retention schedule defined with numbers",
     "premature deletion impossible without an explicit override",
     "no phantom deletion and no phantom retention",
     "design-spec: retention matrix reviewed",
     "evidence hold overrides retention (design)",
     "prune dry-run lists candidates before deletion",
     "forensic artifact retention has an explicit window"],
    "Retention: {it} [{angle}] (case {k})",
    "For {it}: retention policy must execute as typed, auditable deletions. " + HOST_RULE,
    "Expire {it} ({angle}): deletion event recorded, bytes actually freed; FAIL on phantom deletion.")

# ---------------- poison-events (100 = 10 x 10) ----------------
reg("poison-events", 100,
    ["duplicate event at gateway ingest (scratch gateway)",
     "malformed event JSON at the gateway boundary (scratch)",
     "oversized event payload at the gateway boundary (scratch)",
     "event ID collision at ingest (scratch)",
     "reordered events at ingest (scratch)",
     "poison vector payload against knowledge (768-dim mismatch, scratch qdrant)",
     "poison .env value shape (names only; design)",
     "corrupt qdrant snapshot file refused on restore (scratch)",
     "corrupt pg_dump gz refused on restore (scratch)",
     "poison healthcheck response from a dependency (scratch)"],
    ["quarantined with evidence, never retried forever",
     "retry budget respected, then dead-letter",
     "poison never enters canonical state",
     "poison classified into the failure taxonomy",
     "quarantine store bounded (no unbounded growth)",
     "alert on poison with a redacted sample attached",
     "malformed input rejected at the boundary; parser never guesses into fact",
     "oversized input rejected by a size cap before parse",
     "duplicate detected by ID, not reprocessed",
     "design-spec: poison handling table reviewed"],
    "Poison event: {it} [{angle}] (case {k})",
    "For {it}: poison events quarantine with evidence, bounded retries, dead-letter. " + HOST_RULE,
    "Inject {it} ({angle}): quarantined with evidence, retry budget respected; FAIL on infinite retry or acceptance.")

# ---------------- backpressure (100 = 10 x 10) ----------------
reg("backpressure", 100,
    ["gateway to postgres write path saturation (scratch)",
     "gateway to qdrant upsert path saturation (scratch)",
     "worker digestion to projection handoff (design-spec)",
     "worker projection to witness handoff (design-spec)",
     "newsletter worker queue (design-spec)",
     "replay worker catch-up (design-spec)",
     "pgbench -c 8 connection saturation on scratch postgres",
     "qdrant concurrent query saturation (scratch)",
     "docker json-file log driver backpressure at 10m x 5 (design)",
     "backup pipeline pg_dump piped to gzip backpressure (scratch)"],
    ["producer throttled, zero silent drops",
     "bounded queue with an explicit overflow policy",
     "consumer lag measured and alerted",
     "backpressure propagates end to end (no hidden unbounded buffer)",
     "typed BACKPRESSURE error surfaced to the caller",
     "load test on scratch shows the throttle engaging",
     "queue drains after the load spike without loss",
     "design-spec: buffer sizes documented per stage",
     "no OOM from queue growth (memory-bounded)",
     "fairness across producers (one producer cannot starve others)"],
    "Backpressure: {it} [{angle}] (case {k})",
    "For {it}: backpressure must propagate end to end with no silent drops. " + HOST_RULE,
    "Overload {it} ({angle}): producer throttled, zero silent drops; FAIL on lost work.")

# ---------------- ordering (100 = 10 x 10) ----------------
reg("ordering", 100,
    ["unless-stopped restart order (no ordering guarantee live; scratch compose)",
     "compose.proposed.yaml depends_on healthy ordering (design review)",
     "gateway starts after postgres healthy (scratch compose)",
     "gateway starts after qdrant healthy (scratch compose)",
     "workers start after postgres and qdrant healthy (design-spec)",
     "shutdown order: gateway stops before the stores (scratch)",
     "backup runs before prune in the timer sequence (design)",
     "qdrant snapshot taken before any upgrade step (design)",
     "postgres dump taken before any restore drill (design)",
     "reboot sequence containerd to docker to containers (verified 2026-09-20 00:05, qdrant up in 59s)"],
    ["startup order verified in logs (scratch compose)",
     "depends_on healthy gates enforced",
     "no out-of-order start serving traffic",
     "shutdown order: gateway stops before the stores",
     "zero orphaned in-flight work after the cycle",
     "restart storm does not invert the order",
     "ordering documented in the compose.proposed.yaml review",
     "cold-boot race (gateway before postgres) handled by retry with backoff",
     "backup runs before prune in the timer sequence",
     "design-spec: dependency graph reviewed against the live topology"],
    "Shutdown/startup ordering: {it} [{angle}] (case {k})",
    "For {it}: dependency order must be respected both ways. " + HOST_RULE,
    "Cycle {it} ({angle}): order verified in logs, zero orphaned work; FAIL on out-of-order start serving traffic.")

# ---------------- crash-ack (100 = 10 x 10) ----------------
reg("crash-ack", 100,
    ["gateway ack then crash before the postgres write (exit-137 evidence pattern, scratch)",
     "postgres write then crash before the qdrant upsert (scratch)",
     "qdrant upsert then crash before the client ack (scratch)",
     "pg_dump mid-write crash leaving a partial gz (scratch)",
     "qdrant snapshot mid-write crash leaving a partial snapshot file (scratch)",
     "journald rotation crash (design)",
     ".env write crash (names only; design)",
     "worker digestion ack then crash before projection (design-spec)",
     "witness append then crash (design-spec)",
     "backup rotation crash between rename steps (design)"],
    ["crash before ack: effect never applied, client retries safely",
     "crash after ack: effect applied exactly once, no duplication",
     "ack journal diff on scratch shows zero loss and zero dup",
     "kill -9 mid-write leaves no torn state (atomicity)",
     "partial artifact (gz or snapshot) detected and refused on restart",
     "design-spec: ack boundary diagram reviewed",
     "exactly-once verified across 3 consecutive crash cycles",
     "duplicate delivery after recovery is idempotent",
     "evidence: client-side ack log vs server-side applied log diff",
     "crash during rotation or rename leaves either old or new, never half"],
    "Crash before/after acknowledgement: {it} [{angle}] (case {k})",
    "Crashing {it} around the ack boundary must preserve exactly-once effects. " + HOST_RULE,
    "Crash {it} pre/post ack ({angle}): effect applied exactly once; FAIL on duplication or loss.")

# ---- v1 family order (first-appearance) ----
def v1_rows():
    rows = []
    with open(f"{BASE}/matrix-oracle.tsv") as f:
        header = f.readline()
        for line in f:
            parts = line.rstrip("\n").split("\t")
            rows.append(parts)  # mission_id, category, family, title, objective, pass_criterion
    return header, rows

def build():
    header, v1 = v1_rows()
    fam_order = []
    for r in v1:
        if r[2] not in fam_order:
            fam_order.append(r[2])
    v1_by_fam = {}
    for r in v1:
        v1_by_fam.setdefault(r[2], []).append(r)

    out = []
    emitted_fams = []
    for fam in fam_order:
        if fam in REGEN:
            count, subjects, angles, tt, ot, pt = REGEN[fam]
            for i in range(count):
                it = subjects[i % len(subjects)]
                angle = angles[(i // len(subjects)) % len(angles)]
                k = i // len(subjects)
                out.append(("oracle", fam, tt.format(it=it, angle=angle, k=k),
                            ot.format(it=it, angle=angle, k=k),
                            pt.format(it=it, angle=angle, k=k)))
        else:
            for r in v1_by_fam[fam]:
                out.append((r[1], r[2], r[3], r[4], r[5]))
        emitted_fams.append(fam)
    # families trimmed out of v1 entirely: append with fresh IDs
    for fam in REGEN:
        if fam in fam_order:
            continue
        count, subjects, angles, tt, ot, pt = REGEN[fam]
        for i in range(count):
            it = subjects[i % len(subjects)]
            angle = angles[(i // len(subjects)) % len(angles)]
            k = i // len(subjects)
            out.append(("oracle", fam, tt.format(it=it, angle=angle, k=k),
                        ot.format(it=it, angle=angle, k=k),
                        pt.format(it=it, angle=angle, k=k)))
        emitted_fams.append(fam)

    with open(f"{BASE}/matrix-oracle-v2.tsv", "w") as f:
        f.write(header)
        for n, (c, fam, title, obj, pc) in enumerate(out, 1):
            mid = "ORA-%04d" % n
            f.write("\t".join([mid, c, fam, title, obj, pc]) + "\n")
    print("v2 rows:", len(out))

    # claims: 50-mission ranges, only for regenerated families not already ledgered
    import json
    ledgered = set()
    with open(f"{BASE}/ledger.jsonl") as f:
        for line in f:
            d = json.loads(line)
            if d.get("category") == "oracle":
                s, e = d["range"].split("-")
                ledgered.add((int(s), int(e)))
    claimed = set()  # only inprogress counts as claimed; unclaimed claim files
    for d in ("inprogress/fleet-ora-1", "inprogress/fleet-ora-2", "inprogress/fleet-po-1"):
        p = os.path.join(BASE, d)
        if os.path.isdir(p):
            for fn in os.listdir(p):
                if fn.endswith(".claim"):
                    rng = fn[:-6].split("-")[-2:]
                    claimed.add((int(rng[0]), int(rng[1])))

    # regenerated-family ranges in v2
    fam_ranges = {}
    n = 0
    for fam in emitted_fams:
        count = REGEN[fam][0] if fam in REGEN else len(v1_by_fam[fam])
        fam_ranges[fam] = (n + 1, n + count)
        n += count

    no_claim_fams = set()  # fully ledgered synthetic families: regen in matrix, no new claims
    v2dir = f"{BASE}/claims/oracle-v2"
    os.makedirs(v2dir, exist_ok=True)
    issued = []
    for fam in REGEN:
        s, e = fam_ranges[fam]
        fully_ledgered = all((a, b) in ledgered for a, b in
                             [(x, min(x + 49, e)) for x in range(s, e + 1, 50)])
        if fully_ledgered:
            no_claim_fams.add(fam)
            continue
        for x in range(s, e + 1, 50):
            rng = (x, min(x + 49, e))
            if rng in ledgered or rng in claimed:
                continue  # never touch ledgered or already-claimed ranges
            fn = f"{v2dir}/oracle-{rng[0]:04d}-{rng[1]:04d}.claim"
            open(fn, "w").close()
            issued.append(rng)
    with open(f"{BASE}/claims/oracle-v2.txt", "w") as f:
        for a, b in issued:
            f.write(f"{a:04d}-{b:04d}\n")
    print("issued v2 claims:", len(issued), "skipped families (fully ledgered):", sorted(no_claim_fams))
    return fam_ranges, issued, sorted(no_claim_fams)

if __name__ == "__main__":
    fam_ranges, issued, skipped = build()
