# PHASE 18: Oracle Side-by-Side Staging (2026-09-19)

**Role:** staging worker. Staged the convergence candidate on Oracle. Did NOT cut over.
**Source branch:** constitutional-convergence-authority-law (Pig WSL: /home/nolan/worktrees/constitutional-convergence-authority-law)
**Governing law:** "REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE PROMOTION."
**Git safety:** one bounded commit (gateway/package.json + gateway/package-lock.json only, explicit staging). No add -A, no reset, no clean, no history rewrite. **No push anywhere.** Dirty worktrees untouched.

## 0. Pre-staging verifications (all before any Oracle mutation)

- Backup verified present and non-zero BEFORE staging: /opt/ping/backups/ping-postgres-2026-09-19.dump, 368,338 bytes, sha256 64154ae2bb361bf5d1d1c410068f3d5c04ae0609878902796c9d6140771cc7f4, mtime 2026-09-19 12:10. Re-verified after staging: same size, same mtime, NOT overwritten.
- Live stack verified healthy before and after: ping-gateway, ping-postgres, ping-qdrant all Up ~2 days (healthy); ports 127.0.0.1:8080/5432/6333 unchanged.
- Live (pre-convergence) image digest confirmed still live after staging: sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5.
- Pig worktree HEAD at start: 76bd8f4f801191923f4dda5c62550d586c4c795f (matched expectation), clean.

## 1. ARM64 build provenance (native on Oracle)

Per the Phase 19 recommendation (stay on Alpine; full ARM64 npm install was the unexecuted gate), the build ran NATIVELY on ping-core-01 (129.146.60.17, aarch64, Docker 29.1.3). Notes:
- Oracle's Docker is the Ubuntu apt package: the buildx plugin is ABSENT, so `docker build --progress` fails; the classic builder was used. No QEMU involved, no emulation caveats.
- Source transfer: `git archive` of the pinned SHA on the Pig, gzip -9, scp Pig -> Oracle, sha256 verified byte-exact on both sides. Staging dir /home/ubuntu/p18-oracle-staging/ (clearly marked; never inside /opt/ping or the live stack's paths).
- Direct SSH from the agent VM to Oracle is blocked by the egress proxy; all Oracle work went through the Pig SSH hop. This is transport, not a build input.

### Build 1 (intermediate, @temporalio still present)
- Source SHA: 76bd8f4f801191923f4dda5c62550d586c4c795f
- Tarball sha256: c260d312f6458af321103b86c346eae3424d2384fdd5b791d0d58333e24ef99c (3221 entries)
- Tag: ping-gateway-converged:phase18-arm64-76bd8f4f8
- IMAGE_DIGEST (image config digest; local build, no registry manifest): sha256:b7d31c6cc3f59a60266226d8687f64d3021f8006112f13f60b38ba6ec84d10e0
- BUILD_ID: phase18-20260919-76bd8f4f8 | BUILD_TIMESTAMP: 2026-09-19T07:13:15-0600 | arch: arm64 | size: 1.21GB
- Labels verified via docker inspect: revision=76bd8f4f8..., schema=UNKNOWN, event_identity=2.0.0.
- Status: SUPERSEDED by Build 2 (kept on host for provenance only; never staged).

### Build 2 (final candidate, @temporalio removed, commit a2c2626ce)
- Source SHA: a2c2626cef0ebbcc90acb594e9cb6fa5be8b2c9c ("chore(gateway): remove @temporalio/* deps (W1/Phase 18)")
- Tarball sha256: 375569b945b58a2d856b160e5b58a241f6d5e97a2fa554b09198c73cf659e16f (byte-exact Pig/Oracle)
- Tag: ping-gateway-converged:phase18-arm64-a2c2626ce
- IMAGE_DIGEST: sha256:76fb25598a14b8b7cf1ea5a1628d976f4173416fe01552869885cda00c55228a
- BUILD_ID: phase18-20260919-a2c2626ce | BUILD_TIMESTAMP: 2026-09-19T07:22:04-0600 | arch: arm64, linux | size: 815MB (118,944,159 bytes)
- Labels verified: org.opencontainers.image.revision=a2c2626cef0ebbcc90acb594e9cb6fa5be8b2c9c, ping.build.id=phase18-20260919-a2c2626ce, org.opencontainers.image.created=2026-09-19T07:22:04-0600, ping.schema.version=UNKNOWN, ping.event_identity.version=2.0.0, ping.source.tree=constitutional-convergence-authority-law.
- Honest caveat: IMAGE_DIGEST is the local image config digest (docker inspect .Id). A registry push would mint a manifest digest; no push was performed.

## 2. @temporalio/* decision: REMOVED

**Decision: removal, executed as the one bounded commit a2c2626ce (package.json/package-lock only).**

### Is the crash real on this recipe? YES, primary evidence from the built ARM64 image.
- `docker run --rm <phase18-arm64-76bd8f4f8> node -e "require('@temporalio/worker')"` throws at require time:
  `Error: Error relocating /app/node_modules/@temporalio/core-bridge/releases/aarch64-unknown-linux-gnu/index.node: __register_atfork: symbol not found`
- `require('@temporalio/client')` alone succeeds on musl/arm64 (no eager dlopen); the WORKER package is the eager dlopen.
- gateway/temporal_runtime.js requires BOTH at module top (lines 14-15), so ANY load of temporal_runtime.js on this recipe crashes. The latent musl crash is confirmed, not hypothetical. (Phase 19 Trial C showed the same for core-bridge directly; this extends it to the worker package the recipe actually installs.)

### Is removal clean? YES.
- Only temporal_runtime.js requires @temporalio/* (repo-wide grep; the only @temporalio require site).
- temporal_runtime.js is required only by gateway/bootstrap/wiring.js:29. wiring.js is NOT in the boot chain: server.js requires bootstrap/gateway_runtime directly; bootstrap/index.js (the eager wiring consumer) is never loaded at boot; constitution.js and runtime_hash.js lazy-require wiring.js only inside getBuildDependencyGraph, reached solely on constitution-endpoint/hash paths.
- Phase 17's amd64 boot proof ran clean with temporal installed, consistent with temporal being unreachable at boot.
- No test requires @temporalio or temporal_runtime (grep over tests/ and gateway/test_*.js: zero hits). test_temporal_audit.js requires only fs/path.
- Lockfile regeneration (npm install --package-lock-only on the Pig): every remaining top-level pin identical before/after (bullmq 5.81.2, dockerode 4.0.12, express 4.22.2, googleapis 173.0.0, ioredis 5.11.1, pg 8.22.0, simple-git 3.36.0, tree-sitter 0.21.1, tree-sitter-javascript 0.21.0, tree-sitter-python 0.21.0, tree-sitter-typescript 0.23.2, yaml 2.9.0). Diff is purely the temporal subtree (82 insertions, 1899 deletions).
- Post-removal ARM64 image verified: @temporalio absent from /app/node_modules, tree-sitter native module loads, container boots clean, in-image probe 18/18.

### Commit record
- a2c2626cef0ebbcc90acb594e9cb6fa5be8b2c9c on constitutional-convergence-authority-law, parent 76bd8f4f8. Explicit staging of the two files only. Worktree clean after commit. NOT pushed.
- Residual (documented, not expanded scope): gateway/temporal_runtime.js, temporal_scheduler_provider.js, and the wiring.js registrations remain as dormant code (preserve-mechanism law). With the dep removed, the lazy wiring load path would now throw MODULE_NOT_FOUND instead of the musl dlopen crash; that path is unexercised in the minimum stack (no Temporal server exists). If Temporal is ever genuinely needed in the gateway process, revisit the glibc/sidecar choice per Phase 19 section 6 fallback.

## 3. Staging topology (side-by-side, live stack untouched)

| Layer | Staging (NEW) | Live (UNTOUCHED) |
|---|---|---|
| Network | p18-net (bridge, new) | oracle_ping_internal |
| Postgres | p18-scratch-pg (postgres:17-alpine, local image) | ping-postgres |
| PG port | 127.0.0.1:15439->5432 | 127.0.0.1:5432->5432 |
| PG volume | p18_pgdata (named, new) | oracle_pgdata |
| Database/user | p18_staging / p18 (scratch credential in /home/ubuntu/p18-oracle-staging/.pgpass, 0600) | production DB (never connected) |
| Gateway | p18-gateway = ping-gateway-converged:phase18-arm64-a2c2626ce | ping-gateway = oracle-gateway @ sha256:8400deec... |
| Gateway port | 127.0.0.1:18080->8080 | 127.0.0.1:8080->8080 |
| Gateway env | POSTGRES_HOST=p18-scratch-pg, POSTGRES_PORT=5432, POSTGRES_DB=p18_staging, POSTGRES_USER=p18, POSTGRES_PASSWORD=<scratch> | unchanged |

Never-two-writers: exactly one gateway (p18-gateway) writes to p18_staging.ping_events. The live stack writes only to its own database in oracle_pgdata; no staging component connects to the production DB. The live stack was never stopped, restarted, or reconfigured (uptime ~2 days continuous, RestartCount 0 on all live containers).

## 4. Probe results against the candidate (post-deployment probes from the Phase 17 artifact)

- Boot log markers: `[GatewayRuntime] PostgreSQL: CONNECTED`; `[MigrationEngine] Applied migration 1..11`; `[CanonicalEventEnvelope] Convergence migration applied (additive, idempotent)`; `[GatewayRuntime] Legacy Ingress Adapter started`. All present.
- GET /health (127.0.0.1:18080): overall "unhealthy" ONLY because qdrant (error) and embedding (not_initialized) are absent in the minimal stack, exactly the Phase 17 expectation. Event components healthy: gateway, generated_artifacts, integrations, event_governance, event_runtime, canonicalization.
- GET /system/state: responds; postgres "available".
- In-image probe (byte-exact copy of ~/workspace/forensics/phase17-probe.js, sha256 df3798986cc594945ea8c7147c1dfc1d5e8bfe247dc244782e57dbb6b79bc00a, run inside p18-gateway): **18 pass, 0 fail** (A1-A9 producer seam/identity/cross-reference, B1-B4 sequence/replay cursor, C1-C4 witness completeness/determinism/12-leaf invariant).
- Event counts: ping_events=96 (includes the gateway's own background mission/observation traffic, same phenomenon as Phase 17), canonical_events=2, converged (source_event_id set)=2.
- Replay cursor: max(sequence)=138; window 136-138 delivered in ascending order with event_<16hex> identities, resumable.
- Cross-reference audit: 0 orphan derived representations (all canonical_events.source_event_id resolve to ping_events.event_id).
- Witness: covered by probe C1-C4 (completeness COMPLETE, algorithm merkle_sha256_v1, version v1, deterministic across runs, 12-leaf interim invariant holds).

## 5. Backup verification

/opt/ping/backups/ping-postgres-2026-09-19.dump: present, 368,338 bytes, sha256 64154ae2bb361bf5d1d1c410068f3d5c04ae0609878902796c9d6140771cc7f4, mtime 2026-09-19 12:10. Verified before staging began and re-verified after staging completed. NOT overwritten, NOT touched.

## 6. Rollback readiness (tear down the candidate without touching the live stack)

Run on Oracle (129.146.60.17) via the Pig SSH hop. These commands reference ONLY p18-* names; the live `oracle` compose project, its containers, volumes, and ports are never named.

```
# Stop and remove the candidate stack
docker stop p18-gateway p18-scratch-pg
docker rm p18-gateway p18-scratch-pg

# Remove candidate network and scratch volume (destroys ONLY scratch staging data)
docker network rm p18-net
docker volume rm p18_pgdata

# Optional: remove candidate images (provenance record above survives in this doc)
docker rmi ping-gateway-converged:phase18-arm64-a2c2626ce ping-gateway-converged:phase18-arm64-76bd8f4f8

# Optional: remove staging source dir
rm -rf /home/ubuntu/p18-oracle-staging

# Verify live stack intact
docker ps --format "{{.Names}} {{.Status}}" | grep '^ping-'
docker inspect ping-gateway --format '{{.Image}}'
# expected: sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5
```

Data rules from the Phase 17 artifact still govern any FUTURE rollback after cutover (should cutover ever be authorized): stop the converged deployment before starting the old image; never two writers to canonical ping_events; never run the migration down on a populated converged store (event_id UUID->TEXT widening is a one-way door); never delete converged-era rows to make a down-migration work.

## 7. CUTOVER NOT PERFORMED

**No cutover was performed.** No traffic was redirected. No published port or DNS was changed. No production database was written. The live stack (oracle-gateway @ sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5) continues serving on 127.0.0.1:8080 exactly as before. The candidate sits side-by-side on 127.0.0.1:18080 against its own scratch database, and is left running for inspection.

**Authorization required for cutover:** Nolan's explicit word naming cutover (per the standing response cadence, ORACLE CUTOVER AUTHORIZATION REQUIRED is a surface lane). Cutover planning must additionally satisfy: the Phase 17 rollback data rules (never-two-writers sequencing: stop live gateway before any converged writer touches the production DB; migration-down prohibition on populated stores); a fresh pre-cutover backup; and the never-two-writers deployment inventory check from the artifact's probe 7. This staging unit authorizes none of that.

---
*Phase 18 worker: subagent. Staging only. No em dashes.*
