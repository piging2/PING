# LANE-P: Event Authority Artifact-Parity Proof

Date: 2026-09-19 (evidence collected 2026-09-18 ~19:18-19:25 MDT).
Worker: LANE-P (read-only). No source edits, no commits, no DB writes, no restarts, no secret reads.
Access: Pig WSL via `~/workspace/pig/pigwsl-run.sh` (read-only commands), `docker exec` (read-only: cat/grep/sha256sum/ps), `docker inspect`, `docker logs`, `curl` (GET only), `psql` SELECT-only via local trust socket (role `crx_user`, db `crx_runtime`; password value never read, shown redacted by tooling).

Reference points:
- Certified commit: `ce3f8687c5c41bc19bdd58030b7fe3cf7d494cf4` (2026-09-18 18:19:58 MDT, "cert(events): database sequence and replay authority").
- Worktree: `/home/nolan/worktrees/constitutional-convergence`, branch `constitutional-convergence-v2`, HEAD `84da2d40c9dae3c4f7c6070845e073b1471d245a` (2026-09-18 18:34 MDT). `merge-base --is-ancestor ce3f8687c5 HEAD` = YES.
- Live artifact: container `ping-gateway`, image `ping-gateway:devin-boundary2` (image sha256 `5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20`), image created 2026-09-16T12:54:22Z, container created 2026-09-16T18:02:47Z, container (re)started 2026-09-17T23:28:08Z (Up ~26h at probe time).
- Live store: container `ping-postgres` (postgres:15-alpine), restarted ~2026-09-18 03:18 UTC (Up 22h at probe time).

## Layer map (PUBLIC_GITHUB vs LOCAL_BRANCH vs LOCAL_WORKTREE vs LIVE_RUNTIME)

| Layer | unified_event_runtime.js sha256 | Contains sequence/replay? | Identity scheme |
|---|---|---|---|
| LOCAL_BRANCH @ ce3f8687c5 (certified) | `0bc2cc32e1a635d05f91821b905370d2cb9e78cfc37867e0f6cd7119305e1f3e` | yes | `event_<16hex>` via IdentityAuthority + RFC-8785 |
| LOCAL_WORKTREE @ 84da2d40c | descendant of ce3f8687c5 (certified code present) | yes | certified |
| LIVE_RUNTIME (/app in container) | `2f56ba17e694eff76d0a2384510415759937a6dd2c44a4a06ed26d8b7491807c` | no (grep -c "sequence" = 0) | 64-hex sha256 of JSON.stringify identity |
| PUBLIC_GITHUB (origin https://github.com/ngesk2/crx-runtime.git) | deployed delta is uncommitted, so not on any remote | n/a | n/a |

Deployed file provenance: byte-identical to commit `e839830868f07c85c799ceddaec6c872a71ca894` (2026-09-12, "TenantOS boundary") PLUS a 15-line uncommitted delta (diff shown below). `git branch -a --contains e8398308` returns only `remotes/windows-preserve/constitutional-convergence-v2`; it is NOT on the local `constitutional-convergence-v2` branch. Image tag `devin-boundary2` suggests a Devin session built the image from a dirty tree on 2026-09-16. Image labels: null (no source SHA recorded in the artifact).

Deployed vs e8398308 diff (the entire delta):
```
144a145
>     let isDuplicate = false;
157a159
>           isDuplicate = true;
165c167,174
<     // 6. Dispatch to handlers
---
>     // 5b. Replay idempotency: a duplicate delivery converges on the already-stored
>     // row and MUST NOT re-trigger handlers or integrations. ...
>     if (isDuplicate) {
>       return { status: 'ok', eventId, deduplicated: true, event };
>     }
>     // 6. Dispatch to handlers (first delivery only)
```

## Assertion verdicts

### 1. SOURCE (code says this is the path): SOURCE_VERIFIED
At ce3f8687c5, `ping-runtime/events/unified_event_runtime.js` (blob `0bc2cc32...`) is the canonical event authority per the 2026-09-18 forensic audit and the sequence/replay certification. Phantom names (AcquisitionManager, ConstitutionalEventStore) were not traced, per the falsified-premises section.

### 2. BUILD ARTIFACT (image contains the certified revision): FALSIFIED
- Image `ping-gateway:devin-boundary2` created 2026-09-16T12:54:22Z, about 54 hours BEFORE the certified commit (2026-09-18 18:19:58 MDT). A build cannot contain a commit that did not exist yet.
- `docker image inspect` Config.Labels = null: the artifact records no source SHA, tree hash, or schema version.
- No bind mount of source into the container: only mount is volume `muse-workspace/_data` -> `/app/workspace/muse`. The running code is image-layer content, frozen 2026-09-16.

### 3. BOOTSTRAP (bootstrap constructs this implementation): FALSIFIED for the certified revision; SOURCE_VERIFIED for the deployed revision
- Entrypoint `[docker-entrypoint.sh]`, Cmd `[node gateway/server.js]` (`docker inspect` Config).
- Deployed `/app/gateway/server.js:1` requires `./bootstrap/gateway_runtime.js`; constructs `new GatewayRuntime()`; `start(8080)`.
- Deployed `/app/gateway/bootstrap/gateway_runtime.js:72` requires `../../ping-runtime/events/unified_event_runtime`; `:513` constructs `new UnifiedEventRuntime({pool, eventValidator, eventGovernance, integrationManager})`; `await unifiedEventRuntime.initialize()` runs the DDL (deployed file lines 44-62); wired into CanonicalizationService, EventBridge, MissionRuntime.
- PID 1 in the container is `node gateway/server.js` (LIVE_VERIFIED the process runs the deployed code).
- But the constructed implementation is the deployed revision (`2f56ba17...`), not the certified revision (`0bc2cc32...`).

### 4. REACHABILITY (an externally reachable runtime path invokes it): REACHABILITY_VERIFIED (structural); in-process invocation LIVE_VERIFIED; zero live HTTP invocations observed
- Deployed `/app/gateway/bootstrap/gateway_runtime.js:790`: `this._app.use('/events', exteriorAuthMiddleware.middleware(), createEventRoutes(..., services.unifiedEventRuntime, ...))`.
- Deployed `/app/gateway/routes/events.js:87` `router.post('/')` -> `:131` `eventRuntime.emit(event_type, _source, event_data, ...)`. Comment at :125-128: "Canonical spine: emit directly through UnifiedEventRuntime (ping_events), not through the kernel pipeline (repository_events)."
- HTTP surface live: host port 8080 mapped (`docker port`: 8080/tcp -> 0.0.0.0:8080); `GET /health` responds (overall unhealthy/503, gateway component healthy, uptime 88173s consistent with container start).
- Observed invocations: all 739 rows in ping_events carry source `mission-runtime` or `lineage` (in-process callers), zero with `api:*` source. POST /events requires passing exteriorAuthMiddleware; it was NOT exercised (no test performed: any attempt past auth would be a prohibited DB write). No emit activity in 26h of container logs.

### 5. emit() -> canonicalization/identity -> INSERT ping_events: SOURCE_VERIFIED (deployed code); single writer confirmed in deployed tree
- Deployed emit (`/app/ping-runtime/events/unified_event_runtime.js:73`): identity at :77-84 (`crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex')`, full 64-hex; identity material = {eventType, source, [namespace], [logical_id|payload]}, timestamp excluded); registry validation :86-100; governance :105-125; canonical event build :129-147; INSERT at :149-156 `INSERT INTO ping_events (...) ON CONFLICT (event_id) DO NOTHING`; handler dispatch :175-184; IntegrationManager routing :187-192.
- Single-writer sweep of deployed /app (excluding node_modules): the only production `INSERT INTO ping_events` is in `unified_event_runtime.js`; all other hits are test mocks, docs, evals.

### 6. PostgreSQL durable commit: LIVE_VERIFIED
- `SHOW synchronous_commit` = on; `SHOW fsync` = on; `SHOW wal_level` = replica (SELECT-only, shared ping-postgres).
- Deployed emit uses `pool.query` auto-commit, no explicit transaction (same pattern as certified).

### 7. Readback: LIVE_VERIFIED
- `SELECT count(*), min(created_at), max(created_at) FROM ping_events` = `739 | 2026-09-16 17:49:54 UTC | 2026-09-16 17:54:19 UTC`. All rows written in a ~4.5 minute window on 2026-09-16.
- Schema columns: event_id, event_type, source, timestamp, payload, metadata, namespace, processed, created_at. NO `sequence` column: the certified DDL (`ALTER TABLE ... ADD COLUMN sequence`) never ran against this database.

### 8. IDENTITY (what lands has the canonical event identity/hash): FALSIFIED for the certified scheme
- Live rows: `event_id` values are 64-char lowercase hex (e.g. `bb80e334cb7f0718c531ea05d09a7ef82510529bb88a43f2eb8e01087042407a`), matching the DEPLOYED identity scheme (sha256 of JSON.stringify identity, timestamp excluded).
- Certified scheme: `event_<16hex>` minted by IdentityAuthority over RFC-8785 canonical bytes. Zero live rows carry this form. The deployed revision predates the convergence commits (`e01ffc57`, `479d310d`, 2026-09-18) that introduced IdentityAuthority minting.

### 9. RESTART (same event still retrievable): LIVE_VERIFIED for data durability across real restarts (non-disruptive)
- The 739 rows (written 2026-09-16 17:49-17:54 UTC) survived the ping-postgres container restart (~2026-09-18 03:18 UTC) and the ping-gateway restart (2026-09-17 23:28 UTC); all retrievable today via SELECT.
- What a full controlled restart proof would require (NOT done, shared service): stop/start the ping-gateway container (prohibited), emit a canary event through the live path, restart, read back the canary. The observed evidence is retrospective (real restarts happened; data persisted), not a designed canary experiment.

### 10. Downstream consumer sees the correct event: INFERRED (mechanism present, never exercised live)
- Mechanism in deployed code: in-process `on(eventType, handler)` dispatch (:175-184), `IntegrationManager.emit` (:187-192). Deployed EventBridge polls every 5s but only the legacy tables (`repository_events`, `canonical_events`): logs show `repo=0, canonical=0` every cycle; it does not deliver ping_events rows.
- Live evidence: zero emits in 26h, zero handler/integration activity in logs, /health shows integrations healthy with eventCount 0. No consumer delivery has been observed in the live runtime.

### 11. ARTIFACT PARITY (deployed process contains the certified source revision): FALSIFIED
File-by-file (sha256, deployed vs `git show ce3f8687c5:<path>`):
- `ping-runtime/events/unified_event_runtime.js`: `2f56ba17...` vs `0bc2cc32...` MISMATCH
- `gateway/bootstrap/gateway_runtime.js`: `e295417f...` vs `7300f129...` MISMATCH
- `gateway/routes/events.js`: `ad9b9c92...` vs `0cd77951...` MISMATCH
Commands: `docker exec ping-gateway sha256sum <file>` vs `git -C <worktree> show ce3f8687c5:<path> | sha256sum`.

## Overall verdict

The parity claim is FALSIFIED. The deployed `ping-gateway:devin-boundary2` image (built 2026-09-16, before certification) runs a pre-convergence UnifiedEventRuntime revision (2026-09-12 base `e8398308` on `remotes/windows-preserve/constitutional-convergence-v2` + 15-line uncommitted duplicate-suppression delta). It is the same class playing the same choke-point role and is the sole writer to ping_events in the deployed tree, but it is NOT the certified revision: different identity minting (64-hex content hash vs `event_<16hex>` via IdentityAuthority/RFC-8785), no sequence column, no replay(). The certified commit ce3f8687c5 exists only on LOCAL_BRANCH/LOCAL_WORKTREE; nothing certified has been built or deployed.

## Incidental observations (for parent, not part of the proof)

1. Foreign probe processes inside the live gateway container: PID 457 `node /tmp/pgq6.js` (still running) plus `/tmp/pgq*.js`, `emit-obs-recovery-probe.js`, `reconcile-pg-probe.js`, `verify_events.js`, `orca-autonomy-*` scripts, timestamps Sep 18 05:15-06:06 MDT and later. They are read-only SELECT probes (one enumerates databases looking for specific event IDs), consistent with sibling-lane forensics work today. Not malicious, but they run inside the production container and one is still alive: hygiene issue worth sweeping.
2. The deployed gateway is idle: no ping_events writes since 2026-09-16 17:54 UTC despite 26h uptime. Whatever the "effective authority" question resolves to, the live emit path is currently unexercised.
3. `GET /events/:stream` and `POST /events/processed|/failed` in the deployed routes still consult the dormant-store-first read authority (same flag as the 2026-09-18 audit); only `POST /events` goes to UnifiedEventRuntime.

## Proof packet

- OBJECTIVE: Prove SOURCE -> BUILD -> BOOTSTRAP -> REACHABILITY -> emit -> INSERT -> commit -> readback -> IDENTITY -> RESTART -> consumer -> ARTIFACT PARITY for the certified UnifiedEventRuntime (ce3f8687c5) against the live ping-gateway container.
- START SHA: ce3f8687c5c41bc19bdd58030b7fe3cf7d494cf4 (branch constitutional-convergence-v2, worktree /home/nolan/worktrees/constitutional-convergence, HEAD 84da2d40c at probe time).
- FILES: this file (`~/workspace/forensics/recon-2026-09-19/lane-p-artifact-parity.md`); scratch copies in /tmp only (`/tmp/deployed_uer.js`, `/tmp/e8398308_uer.js`, ephemeral).
- INVARIANT: The executing authority in the deployed artifact must be byte-identical in behavior and identity to the certified source revision; one FALSIFIED assertion falsifies the parity claim.
- IMPLEMENTATION: n/a (read-only lane).
- TESTS: hash comparisons (deployed sha256sum vs `git show ce3f8687c5:<path> | sha256sum`) for 3 files; `git log --all` blob hunt for the deployed hash; `docker inspect` (image digest, entrypoint, mounts, labels); deployed code trace (server.js -> gateway_runtime.js:72,513 -> emit :73-192 -> INSERT :149); SELECT-only DB reads (schema, 739 rows, identity format, pg_settings durability); `curl GET /health` (liveness); `docker logs` (26h, no emits); single-writer grep sweep of deployed /app.
- ADVERSARIAL TEST: attempted to attribute the deployed blob to every commit touching the file on all branches (8 candidates hashed, none match except base e8398308 + delta); checked for bind mounts that could shadow image content (none); checked image labels for source SHA (null); attempted default-credential DB roles before using the documented local-trust path (no secret values read).
- COMMIT SHA: n/a. MERGE SHA: n/a. PUSH STATUS: n/a.
- RUNTIME STATUS: ping-gateway Up 26h (image ping-gateway:devin-boundary2, created 2026-09-16), serving HTTP on host 8080, /health responding (overall unhealthy/503, gateway healthy), zero event emissions in 26h; ping-postgres Up 22h, 739 ping_events rows intact, synchronous_commit=on, fsync=on, wal_level=replica.
- WHAT WAS FALSIFIED: the parity claim itself. BUILD ARTIFACT, BOOTSTRAP (certified revision), IDENTITY (certified scheme), and ARTIFACT PARITY are FALSIFIED. The live container runs a 2026-09-16 pre-convergence revision, not the 2026-09-18 certified revision. SOURCE, REACHABILITY (structural), emit path, durable commit, readback, and restart durability are verified for the DEPLOYED revision, not the certified one. Downstream consumer delivery is INFERRED only (unexercised).
- NEXT BROKEN ARROW: the certified -> running promotion gate (backlog P0 "Certified -> running promotion gate" / "Deployment provenance"). Nothing certified at ce3f8687c5 has been built into an image, and the running image records no source SHA. The next unit must define and execute the reproducible build-and-deploy path from the certified SHA, with the SHA recorded in the artifact, before any claim about the deployed authority can be made.
