#!/usr/bin/env python3
"""Regenerate the oracle matrix v3: the image-provenance family plus the eight
ORA_SVCS-based v1 families, rewritten against the real Oracle inventory.

Defect class (same as v2's image-provenance finding): mission subjects that do
not exist in the real host inventory, so pass criteria could never be evaluated
(systematic N-A verdicts in the fleet ledger). Evidence standard per family:
generator source (gen_matrices.py ORA_IMGS / ORA_SVCS) + read-only inventory
cross-check (lane-oracle/ORACLE-DEPLOYMENT-CLOSURE.md, EVIDENCE-LOG.md, and the
fleet-ora-1/fleet-ora-2 investigation files + ledger notes).

Families regenerated (10, 1450 missions, IDs kept):
  image-provenance, dependency-completeness, arch-compat, cold-boot,
  restart-semantics, network-interruption, partial-dep-loss, health-semantics,
  secret-leakage, resource-exhaustion

Families audited and left VERBATIM (subjects are real or are test-input labels,
not inventory assertions):
  store-loss (subjects qdrant/postgres: live containers),
  event-ingress-chaos (subjects are event-type labels; the gateway is real)

All other v2 families carried over verbatim with identical IDs.

Read-only w.r.t. the live host: every mission is executable locally (sandbox
docker pulls of public images, scratch containers) or a design-spec mission
with verifiable pass criteria. Nothing may require touching the live host.

Writes:
  fleet/matrix-oracle-v3.tsv          (3750 rows)
  fleet/claims/oracle-v3/oracle-NNNN-NNNN.claim  (category-qualified; only for
      regenerated-family ranges that are NOT ledgered and NOT in inprogress)
  fleet/claims/oracle-v3.txt          (range list)
"""
import os
import json
import re

BASE = os.path.expanduser("~/workspace/ping-build-program/fleet")
HOST_RULE = "Sandbox-local execution only; the live Oracle host (129.146.60.17) is never touched."

# ---- real inventory anchors ----
# Image digests: fleet/work/fleet-ora-2/range-0201-0250-investigation.md
# (docker images --format digest, read-only probe 2026-09-24T02:33Z),
# cross-checked against the 8-image list in EVIDENCE-LOG.md batch 2 and
# ORACLE-DEPLOYMENT-CLOSURE.md sections 1/6.
GW_LIVE = "ping-gateway:candidate-3c5d280dd @ sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2"
GW_PREV = "ping-gateway:candidate-84486f056 @ sha256:467af2dabc081dd09a8f26560ab8320073320005030bd3767afa8b40eadd970e"
PG_IMG  = "postgres:17-alpine @ sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73"
QD_IMG  = "qdrant/qdrant:v1.7.0 @ sha256:ff1639878418c0572f50a7e1314874e399537eb97e6d2f42d6b987a07a2c4c4f"
N24     = "node:24-alpine @ sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81"
N20     = "node:20-alpine @ sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293"
N18     = "node:18-alpine @ sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e"
OLLAMA  = "ollama/ollama:latest @ sha256:da6e0dc5651df159e45686fd663c4dbe1624a52c44d7280eeac1551d8f865532"

REGEN = {}  # family -> (count, subjects, angles, title_t, obj_t, pc_t)

def reg(family, count, subjects, angles, title_t, obj_t, pc_t):
    assert len(subjects) * len(angles) == count, (family, len(subjects), len(angles), count)
    REGEN[family] = (count, subjects, angles, title_t, obj_t, pc_t)

# ---------------- image-provenance (150 = 15 x 10) ----------------
reg("image-provenance", 150,
    [GW_LIVE + " (live gateway image; private candidate, evidence-only pin from the fleet-ora-2 investigation)",
     GW_PREV + " (prior gateway image present on host; evidence-only pin)",
     PG_IMG,
     QD_IMG,
     N24,
     N20,
     N18,
     OLLAMA + " (documented :latest exception)",
     "digest-pin lockfile for the 8-image host inventory (artifact creation mission: repository:tag@sha256 entries; recommended by the fleet-ora-2 investigation)",
     "compose.proposed.yaml image pins vs the verified digests (design review; pins postgres:17-alpine, qdrant/qdrant:v1.7.0)",
     "live container linkage: ping-gateway resolves to ping-gateway:candidate-3c5d280dd (read-only inspect procedure, sandbox-executed)",
     "live container linkage: ping-postgres resolves to postgres:17-alpine @ the pinned digest",
     "live container linkage: ping-qdrant resolves to qdrant/qdrant:v1.7.0 @ the pinned digest",
     "reclaimable image attribution: the 4.088 GB reclaimable set (old gateway candidate 1.77 GB, node:18/20-alpine) attributed to pins; zero untracked images",
     "gateway multi-stage rebuild on node:24-alpine base (design-spec Dockerfile; base-image digest pinned)"],
    ["pulled digest matches the pinned sha256 from the closure inventory",
     "arm64 manifest present for the pinned digest (no x86-only layers)",
     "no unpinned :latest tag on production pins (ollama is the documented exception)",
     "lockfile entry is machine-checkable (repository:tag@sha256:...)",
     "digest stable across pull retries (registry caching never mutates the digest)",
     "provenance attestation or buildinfo present where available",
     "image origin traceable to its registry publisher (no unknown-mirror substitution)",
     "zero untracked images: every host image attributed to a pin or the documented reclaimable set",
     "the pin's evidence source is named (closure doc section or fleet-ora-2 investigation)",
     "provenance review documented with an explicit ADOPT/REJECT verdict"],
    "Image provenance: {it} [{angle}] (case {k})",
    "For {it}: verify the image's provenance against the pinned inventory. " + HOST_RULE,
    "{it}: {angle} holds; FAIL on digest mismatch, untracked image, or missing evidence source.")

# ---------------- dependency-completeness (150 = 15 x 10) ----------------
reg("dependency-completeness", 150,
    ["ping-gateway start with declared deps only (postgres+qdrant endpoints, env names from /opt/ping/.env) in an isolated scratch container",
     "ping-postgres start with declared deps only (volume oracle_pgdata, pg_isready healthcheck config)",
     "ping-qdrant start with declared deps only (volume oracle_qdrant_storage)",
     "ollama/ollama:latest start in isolation (arm64; veto-gated: REJECTED for production on this host per closure section 11)",
     "worker-digestion on node:24-alpine (design-spec; depends_on postgres+qdrant healthy, mem 512m-1g)",
     "worker-newsletter on node:24-alpine (design-spec)",
     "worker-projection on node:24-alpine (design-spec)",
     "worker-witness on node:24-alpine (design-spec)",
     "worker-replay on node:24-alpine (design-spec)",
     "python-adapter on python:3.12-alpine arm64 (design-spec; host python3 is 3.12.3, adapters belong in containers)",
     "gateway /health integration set (posthog, email, +1): declared vs the 3/3 healthy observed",
     "postgres trust-auth path (passwordless psql inside the container network): declared behavior, not an accident",
     "qdrant journald log-driver dependency (log path declared in the live inspect)",
     "backup systemd-timer design (depends on docker exec pg_dump path + off-host scp target; declared, never run)",
     "compose.proposed.yaml service-dependency graph review (depends_on healthy ordering, env_file intake)"],
    ["starts in an isolated scratch container with only declared deps",
     "missing-declared-dep failure is a typed FAIL, never a silent skip",
     "an undeclared dep pulled in at start is FAIL (record it)",
     "declared deps extracted from the real artifact (compose/Dockerfile/env names), never invented",
     "zero undeclared runtime deps on the live path",
     "env intake is names-only (no secret values in the dependency declaration)",
     "design-spec: dependency diagram reviewed against the live topology",
     "dependency failure surfaces before serving traffic",
     "remove deps one at a time; each removal maps to exactly one typed failure",
     "every declared image dep resolves to a pinned digest"],
    "Dependency completeness: {it} [{angle}] (case {k})",
    "For {it}: the service must start with zero undeclared or missing runtime dependencies on ARM64. " + HOST_RULE,
    "{it}: {angle} verified; missing-dep failure is FAIL, not a skip.")

# ---------------- arch-compat (150 = 15 x 10) ----------------
reg("arch-compat", 150,
    [PG_IMG + " (musl/aarch64, PostgreSQL 17.11)",
     QD_IMG + " (arm64, 47 MB RSS live)",
     GW_LIVE + " (arm64 verified via inspect; node 18.20.8 inside)",
     N24 + " (arm64; repo engines require 24.x)",
     N20 + " (arm64)",
     N18 + " (arm64; matches the live gateway's node 18.20.8)",
     OLLAMA + " (arm64, 6.99 GB)",
     "sharp ^0.35.3 prebuilt arm64 binaries (Pig package.json; no build toolchain at runtime)",
     "repo engines 24.x vs live node 18.20.8 drift (closure section 3)",
     "python:3.12-alpine arm64 (adapter base; host python3 is 3.12.3)",
     "gateway multi-stage rebuild on node:24-alpine (design-spec; closes the engines drift)",
     "worker images on node:24-alpine (design-spec digestion/newsletter/projection/witness/replay)",
     "binfmt_misc scan: no qemu entries on the host (read-only evidence)",
     "docker top: container processes are the arm64 binaries (no host-level duplicates)",
     "multi-arch manifest check: arm64 entry present for each pinned image"],
    ["image inspect shows arm64 (no x86-only layers)",
     "no qemu in the process tree on the aarch64 host",
     "the container process runs the arm64 binary (docker top / exec arch check)",
     "node --version inside the image matches the declared base",
     "musl vs glibc compatibility documented (postgres alpine = musl)",
     "sharp prebuilt arm64 binaries present (no build toolchain needed)",
     "engines-field drift flagged: repo requires 24.x, live runs 18.20.8",
     "multi-arch manifest carries an arm64 entry",
     "scratch run on arm64: process starts, zero exec-format errors",
     "arch review documented with an explicit per-image verdict"],
    "ARM64 compatibility: {it} [{angle}] (case {k})",
    "For {it}: must execute natively on ARM64 with no emulation in the hot path. " + HOST_RULE,
    "{it}: {angle} verified; FAIL on qemu in the process tree or x86-only layers.")

# ---------------- cold-boot (150 = 15 x 10) ----------------
reg("cold-boot", 150,
    ["ping-gateway cold start (unless-stopped, no healthcheck, may race postgres)",
     "ping-postgres cold start (unless-stopped, pg_isready 10s gate)",
     "ping-qdrant cold start (unless-stopped, TCP 6333 gate; proven 59 s recovery on 2026-09-20 00:05)",
     "docker.service enabled (daemon autostart verified)",
     "containerd.service enabled",
     "volume oracle_pgdata durability across the cycle (69 MB, named volume)",
     "volume oracle_qdrant_storage durability across the cycle (2.3 MB, named volume)",
     "the 2026-09-20 00:05 reboot: qdrant up in 59 s with no human action (replay as procedure)",
     "depends_on ordering gap: gateway has no startup ordering vs postgres today (design fix in compose.proposed.yaml)",
     "gateway no-healthcheck risk at boot: a wedged event loop still shows Up",
     "journald log continuity across the cycle (qdrant log driver)",
     "/opt/ping/.env presence at boot (env_file intake; values never read)",
     "no cron daemon on host: backup timer must be systemd, not crontab (design)",
     "ollama: no container exists, nothing to boot (documented, not a gap)",
     "restart-policy semantics: unless-stopped does not resurrect deliberately-stopped containers"],
    ["cold boot completes with zero manual steps (scratch)",
     "restart policy + daemon enablement verified read-only (proxy evidence)",
     "named volumes survive the cycle (no host-path coupling)",
     "stores healthy before the gateway (design-spec ordering)",
     "per-service cold-boot time budget recorded",
     "deliberately-stopped containers stay stopped",
     "missing .env fails closed with a typed error at boot",
     "the 2026-09-20 reboot evidence reproduced as a runbook",
     "container logs persist across the cycle",
     "boot-order diagram reviewed against the live topology"],
    "Cold boot: {it} [{angle}] (case {k})",
    "For {it}: must reach serving state after a full cold boot with no manual intervention. " + HOST_RULE,
    "{it}: {angle} verified; FAIL on any manual step or lost durable state.")

# ---------------- restart-semantics (200 = 20 x 10) ----------------
reg("restart-semantics", 200,
    ["ping-gateway mid-load restart (no healthcheck; wedged-loop detection gap)",
     "ping-postgres mid-load restart (pgbench -c 8 on scratch)",
     "ping-qdrant mid-load restart (in-flight upserts)",
     "ollama image: no container exists; restart semantics N/A-by-design (documented)",
     "worker-digestion restart (design-spec)",
     "worker-newsletter restart (design-spec)",
     "worker-projection restart (design-spec)",
     "worker-witness restart (design-spec)",
     "worker-replay restart (design-spec)",
     "python-adapter restart (design-spec)",
     "gateway warm restart: in-flight HTTP requests",
     "postgres warm restart: in-flight transactions",
     "qdrant warm restart: in-flight vector upserts",
     "exit-137 replay on scratch (SIGKILL; matches the two dead gateway containers)",
     "OOM-kill suspicion: no memory limits + zero swap (risk, not verdict)",
     "journal/log diff evidence procedure for restart verification",
     "restart storm: all three live containers restart at once",
     "healthcheck gates readiness before serving (pg_isready, qdrant TCP)",
     "backup pg_dump mid-write restart (partial gz refused on restart)",
     "qdrant snapshot mid-write restart (partial snapshot refused on restart)"],
    ["restart mid-load: zero acknowledged-work loss",
     "state consistent after restart (journal/log diff)",
     "in-flight requests get typed errors, never silent drops",
     "restart under memory pressure degrades loudly (no silent OOM)",
     "SIGKILL replay leaves no torn state on the named volumes",
     "warm restart preserves named-volume data",
     "restart storm: order verified in logs, zero orphaned work",
     "healthcheck gates readiness before serving traffic",
     "partial artifacts (gz/snapshot) detected and refused on restart",
     "restart contract reviewed with an explicit verdict"],
    "Restart semantics: {it} [{angle}] (case {k})",
    "For {it}: warm restart must not lose acknowledged work or corrupt state. " + HOST_RULE,
    "{it}: {angle} verified; FAIL on acknowledged-work loss or torn state.")

# ---------------- network-interruption (150 = 15 x 10) ----------------
reg("network-interruption", 150,
    ["gateway to postgres partition (127.0.0.1:5432)",
     "gateway to qdrant partition (127.0.0.1:6333/6334)",
     "postgres loopback-only binding (127.0.0.1:5432, ss -tlnp evidence)",
     "qdrant loopback-only bindings (127.0.0.1:6333,6334)",
     "gateway loopback-only binding (127.0.0.1:8080)",
     "sshd on 0.0.0.0:22 (the only external listener)",
     "containerd on 127.0.0.1:46699",
     "oracle_ping_internal bridge network (live)",
     "p18-net bridge (leftover; no live members)",
     "hand-started docker run topology (no compose network; config drift vs artifacts)",
     "cold-boot race: gateway retries postgres with backoff (design)",
     "qdrant TCP healthcheck behavior during a partition",
     "postgres trust-auth network path (passwordless inside the container network)",
     "/opt/ping/.env never traverses the network (env-only intake)",
     "partition during pg_dump/snapshot: typed failure, no torn artifact"],
    ["partition for 60s: no split-brain, heal converges",
     "loopback-only bindings verified (ss -tlnp evidence)",
     "partition degrades loudly with a typed failure",
     "heal: state converges, zero silent divergence",
     "cold-boot race handled by retry with backoff",
     "healthcheck reflects the partition",
     "no external listener beyond sshd",
     "leftover networks documented (no live members)",
     "partition mid-backup: typed failure, no torn artifact",
     "network map reviewed against the ss evidence"],
    "Network interruption: {it} [{angle}] (case {k})",
    "For {it}: must survive network partition and heal without split-brain or silent divergence. " + HOST_RULE,
    "{it}: {angle} verified; FAIL on split-brain or silent divergence.")

# ---------------- partial-dep-loss (150 = 15 x 10) ----------------
reg("partial-dep-loss", 150,
    ["gateway loses postgres (critical dep down)",
     "gateway loses qdrant",
     "gateway loses one /health integration (posthog/email)",
     "postgres loses its volume (disk full on oracle_pgdata)",
     "qdrant loses its volume (disk full on oracle_qdrant_storage)",
     "worker-digestion loses postgres (design-spec)",
     "worker-projection loses qdrant (design-spec)",
     "backup design loses the off-host scp target",
     "gateway loses .env (missing variable at startup)",
     "qdrant loses journald (log driver unavailable)",
     "postgres healthcheck failing (pg_isready nonzero)",
     "gateway OOM under load (no memory limit; first OOM candidate)",
     "containerd loss (daemon down)",
     "docker daemon loss",
     "DNS loss inside the bridge network"],
    ["one dep down: typed FAILURE_CLASS surfaces, never silent empty success",
     "no hang without a deadline",
     "/health flips to unhealthy when a critical dep is down",
     "dep restored: service heals without a restart",
     "dep-loss during a write: no torn state",
     "cascading failure bounded (gateway never takes down the stores)",
     "missing env var fails closed at startup",
     "disk-full on a volume: typed DISK_PRESSURE, no corruption",
     "dep-loss matrix reviewed (service x dep) with explicit verdicts",
     "evidence: client-side vs server-side log diff on dep loss"],
    "Partial dependency loss: {it} [{angle}] (case {k})",
    "For {it}: must degrade loudly (typed failure, never silent empty success) when one dependency is lost. " + HOST_RULE,
    "{it}: {angle} verified; FAIL on empty success or hang without deadline.")

# ---------------- health-semantics (150 = 15 x 10) ----------------
reg("health-semantics", 150,
    ["gateway /health (healthy JSON, 3/3 integrations; no container healthcheck: process-liveness only)",
     "postgres pg_isready 10s healthcheck (interval 10s, timeout 5s, retries 5, start_period 30s)",
     "qdrant TCP 6333 healthcheck (interval 15s; TCP-only, no HTTP version check)",
     "qdrant / returns version JSON (design: add the HTTP check at rebuild)",
     "gateway /health integration shape (posthog, email, +1; 3/3 healthy observed)",
     "postgres healthy via trust auth (pg_isready needs no password inside the container net)",
     "dead containers exit-137 history (health signal: two SIGKILL deaths)",
     "ollama: no container, health N/A-by-design (documented)",
     "docker.service active (host health)",
     "memory pressure zero at probe time (/proc/pressure/memory avg10 0.00)",
     "disk 39% used (17G of 45G; under the 80% budget)",
     "unattended-upgrades enabled (host health posture)",
     "worker healthcheck design (depends_on postgres+qdrant healthy)",
     "backup timer health design (systemd timer, no cron daemon)",
     "journald 432 MB disk usage (health signal; cap via SystemMaxUse design)"],
    ["health reflects serving capability, not process aliveness",
     "reports unhealthy when a critical dep is down",
     "FAIL on 200-OK-while-broken",
     "healthcheck interval/timeout/retries/start_period documented per service",
     "gateway healthcheck gap: wedged event loop undetected (design fix in compose.proposed.yaml)",
     "qdrant TCP-only gap: add the HTTP version check (design)",
     "health evidence is read-only (inspect + /health + pg_isready)",
     "host health: RAM available > 1 GB, disk use < 80%",
     "health flapping bounded (no flap-storm)",
     "health contract reviewed per service with an explicit verdict"],
    "Health semantics: {it} [{angle}] (case {k})",
    "For {it}: the health signal must reflect actual serving capability, not process aliveness. " + HOST_RULE,
    "{it}: {angle} verified; FAIL on 200-OK-while-broken.")

# ---------------- secret-leakage (150 = 15 x 10) ----------------
reg("secret-leakage", 150,
    ["/opt/ping/.env (0600; values never read, names only via cut -d= -f1)",
     "POSTGRES_PASSWORD redacted at source (runtime redaction precedent)",
     "gateway env-only secret intake (no secrets in the image)",
     "json-file log driver canary scan (gateway, postgres logs)",
     "journald canary scan (qdrant logs)",
     "docker inspect env: no secret values in image metadata",
     "compose artifacts: no secret values in checked-in files",
     "build logs in ~/p18-oracle-staging (.pgpass 0600)",
     "backup dump artifacts (contain data; access-scoped, never quoted in evidence)",
     ".env.bak-20260917 and .env.bak-20260921-p0rotate (secret-bearing; perms reviewed)",
     "postgres trust auth (no password on the wire inside the container network)",
     "gateway /health payload (no secret material in the healthy JSON)",
     "gateway error payloads (404 Cannot GET / carries no secrets)",
     "design: off-host backup copy via scp (transport security reviewed)",
     "design: secret rotation procedure (names-only handling)"],
    ["canary scan of logs/errors/dumps: zero hits",
     "FAIL on any leak of secret material",
     "secret values never in images, compose files, logs, or chat",
     "0600 permissions on secret-bearing files",
     "env names readable, values never read",
     "redaction at source (POSTGRES_PASSWORD precedent)",
     "backup artifacts access-scoped, never quoted",
     "loopback-only bindings bound the exposure surface",
     "rotation procedure reviewed (design)",
     "evidence: exact scan command plus zero-hit output recorded"],
    "Secret/log leakage: {it} [{angle}] (case {k})",
    "For {it}: must never emit secret material to logs, error payloads, or diagnostics. " + HOST_RULE,
    "{it}: {angle} verified; FAIL on any leak.")

# ---------------- resource-exhaustion (200 = 20 x 10) ----------------
reg("resource-exhaustion", 200,
    ["ping-gateway: no memory limit (MemoryLimit 0; first OOM candidate)",
     "ping-postgres: no memory limit",
     "ping-qdrant: no memory limit",
     "host: zero swap (the OOM killer decides under pressure)",
     "host RAM: 5903 MB total, ~5127 MB available at idle",
     "host CPU: 1 vCPU (bursty workers OK, sustained inference not)",
     "disk: 45 GB total, 17 GB used, 28 GB free",
     "/var/log 454 MB (slow fill)",
     "journald 432 MB (cap via SystemMaxUse design)",
     "/var/lib/docker 2.0 GB unique on-disk",
     "reclaimable images 4.088 GB (old gateway candidate 1.77 GB, node:18/20-alpine; morning prune)",
     "ollama image 6.99 GB (RAM math: local 8B LLM does not fit; veto-gated)",
     "postgres connection pool (trust auth; pool exhaustion behavior)",
     "fd-table exhaustion",
     "mem-arena exhaustion",
     "cpu-quota exhaustion",
     "disk-io saturation",
     "proposed limits: 1g/1g/2g on the three services, 512m-1g per worker (compose.proposed.yaml)",
     "degradation order under pressure: gateway > workers > qdrant > postgres",
     "two exit-137 gateway deaths: SIGKILL consistent with stop OR OOM (risk, not verdict)"],
    ["exhaust the resource: backpressure engages, typed errors surface",
     "FAIL on silent death or unbounded queue",
     "no-limit containers: OOM victim order documented",
     "zero swap: the OOM killer decides under pressure",
     "disk exhaustion: typed DISK_PRESSURE, fail closed",
     "journald cap (SystemMaxUse) design reviewed",
     "log rotation 10m x 5 (proposed compose) bounds log growth",
     "reclaimable-image prune as a morning operator action",
     "capacity table re-verified (proposed stack ~2.2 GB of 5.9 GB)",
     "limits in compose.proposed.yaml reviewed per service"],
    "Resource exhaustion: {it} [{angle}] (case {k})",
    "For {it}: must degrade with backpressure and typed errors, never OOM-kill silently. " + HOST_RULE,
    "{it}: {angle} verified; FAIL on silent death or unbounded queue.")


# ---- build: v2 rows, regenerate the 10 families in place, keep IDs ----
def v2_rows():
    rows = []
    with open(f"{BASE}/matrix-oracle-v2.tsv") as f:
        header = f.readline()
        for line in f:
            parts = line.rstrip("\n").split("\t")
            rows.append(parts)  # mission_id, category, family, title, objective, pass_criterion
    return header, rows

def build():
    header, v2 = v2_rows()
    fam_order = []
    for r in v2:
        if r[2] not in fam_order:
            fam_order.append(r[2])

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
            for r in [x for x in v2 if x[2] == fam]:
                out.append((r[1], r[2], r[3], r[4], r[5]))
        emitted_fams.append(fam)

    with open(f"{BASE}/matrix-oracle-v3.tsv", "w") as f:
        f.write(header)
        for n, (c, fam, title, obj, pc) in enumerate(out, 1):
            mid = "ORA-%04d" % n
            f.write("\t".join([mid, c, fam, title, obj, pc]) + "\n")
    print("v3 rows:", len(out))

    # integrity checks
    assert len(out) == 3750, len(out)
    ids = ["ORA-%04d" % n for n in range(1, 3751)]
    assert [r[0] for r in v2] == ids, "v2 IDs not continuous"
    with open(f"{BASE}/matrix-oracle-v3.tsv") as f:
        lines = f.read().splitlines()
    assert len(lines) == 3751, len(lines)
    for ln in lines[1:]:
        assert len(ln.split("\t")) == 6, ln[:60]
    body = "\n".join(lines[1:])
    for pat in ["component-", "schema-v", "release-", "failure-", "volume-",
                "query-", "txn-", "reader-", "dataset-", "poison-",
                "pipe-", "sequence-", "ack-"]:
        assert not re.search(pat + r"\d", body), pat
    # v1/v2 synthetic names must be gone from the 10 regen families:
    # (a) the 15 ORA_IMGS names appear nowhere in regen text;
    # (b) no regen row title is identical to an old v2 row title.
    ORA_IMGS = ["postgres:16-arm64", "qdrant-arm64", "ollama-arm64",
                "node:22-slim-arm64", "python:3.12-slim-arm64", "gateway-custom",
                "worker-custom", "adapter-custom", "proxy-nginx-arm64",
                "backup-cron-arm64", "certbot-arm64", "otel-collector-arm64",
                "migrate-runner-arm64", "seed-loader-arm64", "watchdog-arm64"]
    old_titles = {}
    for r in v2:
        if r[2] in REGEN:
            old_titles.setdefault(r[2], set()).add(r[3])
    v3fams = {}
    for ln in lines[1:]:
        p = ln.split("\t")
        v3fams.setdefault(p[2], []).append(p)
    for fam in REGEN:
        text = "\n".join("\t".join(r) for r in v3fams[fam])
        for bad in ORA_IMGS:
            assert bad not in text, (fam, bad)
        for ln in [x for x in lines[1:] if x.split("\t")[2] == fam]:
            t = ln.split("\t")[3]
            assert t not in old_titles[fam], (fam, t[:60])
    print("synthetic-subject checks passed")

    # claims: 50-mission ranges, only for regen families not already ledgered/inprogress
    ledgered = set()
    with open(f"{BASE}/ledger.jsonl") as f:
        for line in f:
            d = json.loads(line)
            if d.get("category") == "oracle":
                s, e = d["range"].split("-")
                ledgered.add((int(s), int(e)))
    claimed = set()
    for d in ("inprogress/fleet-ora-1", "inprogress/fleet-ora-2", "inprogress/fleet-po-1"):
        p = os.path.join(BASE, d)
        if os.path.isdir(p):
            for fn in os.listdir(p):
                if fn.endswith(".claim"):
                    rng = fn[:-6].split("-")[-2:]
                    claimed.add((int(rng[0]), int(rng[1])))

    fam_ranges = {}
    n = 0
    for fam in emitted_fams:
        count = REGEN[fam][0] if fam in REGEN else len(v3fams[fam])
        fam_ranges[fam] = (n + 1, n + count)
        n += count

    v3dir = f"{BASE}/claims/oracle-v3"
    os.makedirs(v3dir, exist_ok=True)
    issued, skipped = [], []
    for fam in REGEN:
        s, e = fam_ranges[fam]
        for x in range(s, e + 1, 50):
            rng = (x, min(x + 49, e))
            if rng in ledgered or rng in claimed:
                skipped.append(rng)
                continue  # never touch ledgered or already-claimed ranges
            fn = f"{v3dir}/oracle-{rng[0]:04d}-{rng[1]:04d}.claim"
            open(fn, "w").close()
            issued.append(rng)
    with open(f"{BASE}/claims/oracle-v3.txt", "w") as f:
        for a, b in issued:
            f.write(f"{a:04d}-{b:04d}\n")
    print("issued v3 claims:", len(issued), [f"{a:04d}-{b:04d}" for a, b in issued])
    print("skipped (ledgered or inprogress):", len(skipped))
    return fam_ranges, issued, skipped

if __name__ == "__main__":
    fam_ranges, issued, skipped = build()
