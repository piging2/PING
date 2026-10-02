# LANE-P (second pass): Event Authority 12-Assertion Proof

Date: 2026-09-18 19:24-19:35 MDT (evidence collected this pass; nothing trusted blindly from lane-p-artifact-parity.md).
Worker: LANE-P2. STRICTLY READ-ONLY: no source edits, no commits, no DB writes (SELECT-only against shared ping-postgres), no restarts of shared services, no secret reads. The only credentials read were config literals (POSTGRES_USER name = crx_user); no password values were read or used.
Access: Pig WSL via `~/workspace/pig/pigwsl-run.sh` (read-only commands only); `docker exec`/`docker inspect` read-only; `curl` GET only; `psql` SELECT-only via the container's local trust socket.

## Authority-layer anchors (every runtime claim below carries these)

- SOURCE AUTHORITY: worktree `/home/nolan/worktrees/constitutional-convergence`, branch `constitutional-convergence-v2`, certified commit `ce3f8687c5c41bc19bdd58030b7fe3cf7d494cf4` ("cert(events): database sequence and replay authority", 2026-09-18 18:19:58 MDT). Fresh check: `git merge-base --is-ancestor ce3f8687c5 HEAD` = YES (HEAD `84da2d40...` at probe time). Cert blob `ping-runtime/events/unified_event_runtime.js` sha256 = `0bc2cc32e1a635d05f91821b905370d2cb9e78cfc37867e0f6cd7119305e1f3e`.
- ARTIFACT AUTHORITY: image `ping-gateway:devin-boundary2`, image sha256 `5f018a301b3bce675f04641887005e838f957c9f6e57a1e8e91de5968f222d20`, created 2026-09-16T12:54:22Z. Image labels = null (no source SHA recorded in the artifact).
- RUNTIME AUTHORITY: container `ping-gateway` on the Pig, created 2026-09-16T18:02:47Z, started 2026-09-17T23:28:08Z, PID 1 = `node gateway/server.js` (verified live). Only mount: volume `muse-workspace` -> `/app/workspace/muse` (no source shadowing of `/app`).
- PERSISTENCE AUTHORITY: container `ping-postgres` (postgres:15-alpine), Up ~22h at probe time, db `crx_runtime`, table `ping_events`.

## Falsified premises: fresh re-verification (this pass)

| Premise | Fresh check (this pass) | Verdict |
|---|---|---|
| AcquisitionManager | `grep -rln "AcquisitionManager" --include="*.js" --include="*.ts" ping-runtime gateway lib src` at worktree HEAD: zero hits | FALSIFIED (PHANTOM) |
| ConstitutionalEventStore | same grep scope: zero hits | FALSIFIED (PHANTOM name) |
| EventRepository | `new EventRepository` appears only in `gateway/bootstrap/constitutional_runtime.js:16`. `gateway/server.js` requires ONLY `./bootstrap/gateway_runtime`; `gateway/bootstrap/gateway_runtime.js` has zero references to `constitutional_runtime`. The construction site is off the live boot path. | LEGACY_UNREACHABLE (evidence state: SOURCE_VERIFIED reachability analysis) |
| IEventAuthority | only declaration at `runtime/kernel/events/event-authority-interface.ts`; zero `implements`/`extends`, zero importers across `.ts`/`.js` outside the declaration itself | DORMANT (evidence state: SOURCE_VERIFIED) |

Reachability decides authority, not naming. The sole live candidate is UnifiedEventRuntime.

## The 12 assertions

### P1 SOURCE (exact source impl owning persistence)
- VERDICT: as-claimed
- EVIDENCE STATE: SOURCE_VERIFIED
- FILE: `ping-runtime/events/unified_event_runtime.js` @ ce3f8687c5, blob sha256 `0bc2cc32...` (recomputed this pass)
- SYMBOL: `class UnifiedEventRuntime`, method `emit()`, `initialize()` runs the DDL (cert lines 40-95: ping_events DDL with sequence BIGINT + `ping_events_sequence_seq` + deterministic backfill)
- CALLER: certification `cert(events): database sequence and replay authority` ce3f8687c5
- CALLEE: `identityAuthority.generateId('event', identityData)` (`../authorities/identity_authority.js`, cert line 201), `CanonicalJson.canonicalize` (RFC-8785)
- RUNTIME EVIDENCE: none; this is the source-layer claim only
- FALSIFIER: any other file at ce3f8687c5 with a competing production INSERT INTO ping_events on the live path (none found)

### P2 BUILD (build path including the certified revision)
- VERDICT: falsified
- EVIDENCE STATE: FALSIFIED
- FILE: image config of `ping-gateway:devin-boundary2`
- SYMBOL: n/a
- CALLER: n/a
- CALLEE: n/a
- RUNTIME EVIDENCE: image created 2026-09-16T12:54:22Z, ~54h BEFORE cert commit ce3f8687c5 (2026-09-18 18:19:58 MDT). A build cannot contain a commit that did not exist yet. Image labels = null (no source SHA, tree hash, or schema version recorded).
- FALSIFIER: the image predating the commit it would have to contain

### P3 ARTIFACT (built/runtime artifact contains the same impl)
- VERDICT: falsified
- EVIDENCE STATE: FALSIFIED
- FILE: `/app/ping-runtime/events/unified_event_runtime.js` inside container ping-gateway, sha256 `2f56ba17e694eff76d0a2384510415759937a6dd2c44a4a06ed26d8b7491807c` (recomputed this pass) vs cert blob `0bc2cc32...`: MISMATCH
- SYMBOL: `emit()` deployed revision
- CALLER: n/a
- CALLEE: n/a
- RUNTIME EVIDENCE: fresh byte-diff this pass: deployed file = commit `e839830868f07c85c799ceddaec6c872a71ca894` (2026-09-12, "TenantOS boundary"; present only on `remotes/windows-preserve/constitutional-convergence-v2`, not on local branch) PLUS a 15-line duplicate-suppression delta (diff reproduced exactly: 144a145, 157a159, 165c167,174). `grep -c "sequence"` on deployed file = 0.
- FALSIFIER: byte-level mismatch of the implementing file

### P4 BOOTSTRAP (entrypoint instantiating it)
- VERDICT: as-claimed for the deployed revision; falsified for the certified revision
- EVIDENCE STATE: LIVE_VERIFIED (deployed revision) / FALSIFIED (certified revision)
- FILE: `/app/gateway/server.js` (PID 1, verified live: `node gateway/server.js`), `/app/gateway/bootstrap/gateway_runtime.js`
- SYMBOL: `GatewayRuntime`
- CALLER: `server.js:1` requires `./bootstrap/gateway_runtime` (only require)
- CALLEE: `gateway_runtime.js:72` requires `../../ping-runtime/events/unified_event_runtime`; `:513` constructs `new UnifiedEventRuntime({pool, eventValidator, eventGovernance, integrationManager})`; `await unifiedEventRuntime.initialize()` runs the deployed DDL (deployed lines 44-62, no sequence column)
- RUNTIME EVIDENCE: entrypoint `[docker-entrypoint.sh]`, Cmd `[node gateway/server.js]`; PID 1 verified in the container. The constructed implementation is the deployed revision (`2f56ba17...`), not the certified revision.
- FALSIFIER: constructed file sha != cert blob sha

### P5 REACHABILITY (reachable path to emit())
- VERDICT: as-claimed structurally; in-process invocation live; zero live HTTP invocations observed
- EVIDENCE STATE: REACHABILITY_VERIFIED (structural) / LIVE_VERIFIED (in-process callers only)
- FILE: `/app/gateway/routes/events.js`, `/app/gateway/bootstrap/gateway_runtime.js`
- SYMBOL: `router.post('/')`, `createEventRoutes(services.unifiedEventRuntime, ...)`
- CALLER: HTTP POST /events (behind exteriorAuthMiddleware)
- CALLEE: `eventRuntime.emit(event_type, _source, event_data, {metadata, namespace})` at routes/events.js:131
- RUNTIME EVIDENCE: `:790` mounts `/events` with `createEventRoutes(services.eventReadAuthority, services.unifiedEventRuntime, services.pool)` (verified live). Host port 8080 mapped; `GET /health` responds (overall 503 unhealthy, gateway component healthy, uptime 88409s). All 739 live rows carry in-process sources (mission-runtime 576, projection/claim/classification/review-etc 18 each, worker-runtime 1, sms-connector 1, etc.), zero with `api:*` source. POST /events was NOT exercised (would be a prohibited DB write past auth). No emit activity in ~26h of container logs.
- FALSIFIER: no live emit ever observed through the HTTP path; reachability claim rests on code + mount, not on a live invocation

### P6 IDENTITY (exact code producing event identity)
- VERDICT: falsified for the certified scheme; the deployed scheme is verified and different
- EVIDENCE STATE: FALSIFIED (certified scheme on live data) / SOURCE_VERIFIED (deployed scheme in live code)
- FILE: deployed `/app/ping-runtime/events/unified_event_runtime.js:77-84`; cert blob lines 190-201
- SYMBOL: deployed: `crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex')`; cert: `identityAuthority.generateId('event', identityData)`
- CALLER: `emit(eventType, source, payload, options)`
- CALLEE: deployed: `identity = { eventType, source, [namespace], [logical_id | payload] }` (timestamp excluded; legacy callers keep existing IDs). Cert: IdentityAuthority over RFC-8785 canonical bytes -> `event_<16hex>`.
- RUNTIME EVIDENCE: live row IDs are 64-char lowercase hex (e.g. `e34007ddf7f7b95d8f81a3f14fb3af41ce4893b26c134e8314fe98bba5463c18`, `d936783e0e6a4aa2e0e96f03818a8e625cdb1ded98f01d0b7c58f983d40fbbb6`), matching the deployed scheme; zero rows carry `event_<16hex>` form.
- FALSIFIER: zero live rows in the certified identity form

### P7 CANONICALIZATION/HASH (exact bytes hashed)
- VERDICT: falsified for the certified bytes
- EVIDENCE STATE: FALSIFIED (parity of hash inputs)
- FILE: deployed `:84`; cert lines 190-201 plus `../authorities/identity_authority.js` / `CanonicalJson.canonicalize`
- SYMBOL: deployed: `JSON.stringify(identity)`; cert: RFC-8785 canonicalization
- CALLER: `emit()` identity block
- CALLEE: `crypto` sha256
- RUNTIME EVIDENCE: deployed code hashes `JSON.stringify(identity)` (key order = insertion order, not canonical). Cert hashes RFC-8785 canonical bytes. Different input bytes, different algorithm path, different output form. Observed 64-hex IDs are consistent with the deployed path only.
- FALSIFIER: two different canonicalization pipelines producing two different identity forms

### P8 PERSISTENCE (exact INSERT into ping_events)
- VERDICT: as-claimed for the deployed revision
- EVIDENCE STATE: LIVE_VERIFIED (code + live rows), SOURCE_VERIFIED (cert DDL never ran)
- FILE: deployed `/app/ping-runtime/events/unified_event_runtime.js:149-156`
- SYMBOL: `emit()` step 5
- CALLER: `this._pool.query(...)` auto-commit (no explicit transaction; same pattern as certified)
- CALLEE: `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (event_id) DO NOTHING`
- RUNTIME EVIDENCE: single-writer sweep of deployed `/app` (excl. node_modules, this pass): the ONLY production `INSERT INTO ping_events` is in `unified_event_runtime.js`; all other hits are `test_*` files, `docs/`, and `evals/`. Deployed DDL: `event_id VARCHAR(64) PRIMARY KEY`, NO `sequence` column (live information_schema: event_id, event_type, source, timestamp, payload, metadata, namespace, processed, created_at). The certified sequence DDL (ALTER TABLE ... ADD COLUMN sequence BIGINT) never ran against this database.
- FALSIFIER: none found; sole writer holds

### P9 COMMIT/READBACK
- VERDICT: as-claimed
- EVIDENCE STATE: LIVE_VERIFIED
- FILE: table `ping_events` in `crx_runtime`
- SYMBOL: n/a
- CALLER: n/a
- CALLEE: n/a
- RUNTIME EVIDENCE: `SELECT count(*), min(created_at), max(created_at)` = `739 | 2026-09-16 17:49:54 UTC | 2026-09-16 17:54:19 UTC`, all SELECT-readable today. `synchronous_commit=on`, `fsync=on`, `wal_level=replica` (SELECT-only from pg_settings).
- FALSIFIER: none

### P10 RESTART
- VERDICT: as-claimed retrospectively; no designed canary performed
- EVIDENCE STATE: LIVE_VERIFIED (retrospective durability)
- FILE: n/a
- SYMBOL: n/a
- CALLER: n/a
- CALLEE: n/a
- RUNTIME EVIDENCE: the 739 rows (written 2026-09-16 17:49-17:54 UTC) survived the ping-postgres container restart (~2026-09-18 03:18 UTC; container Up 22h) and the ping-gateway container restart (2026-09-17T23:28:08Z; Up 26h); all retrievable by SELECT today. A controlled canary (emit -> restart -> read back) was NOT performed: restarting the shared gateway container is prohibited in this lane, and emitting a canary would be a prohibited DB write.
- FALSIFIER: none for durability; the designed-experiment form remains unproven

### P11 CONSUMER (downstream effective consumer)
- VERDICT: mechanism present, never exercised live
- EVIDENCE STATE: INFERRED
- FILE: deployed `/app/ping-runtime/events/unified_event_runtime.js:175-192`; `/app/ping-runtime/events/event_bridge.js:127-258`
- SYMBOL: `this._handlers` in-process dispatch; `integrationManager.emit`
- CALLER: `emit()` steps 6-7
- CALLEE: registered `on(eventType, handler)` handlers; `IntegrationManager.emit(event_type, payload)`
- RUNTIME EVIDENCE: EventBridge polls `repository_events` and `canonical_events` and bridges INTO ping_events (deployed lines 127-258); it does NOT deliver ping_events rows downstream. Zero handler/integration activity in 26h of container logs; /health integrations healthy with no event counts. No consumer delivery of a ping_events row has been observed in the live runtime.
- FALSIFIER: any observed downstream delivery of a ping_events row would promote this to LIVE_VERIFIED; none exists

### P12 ARTIFACT PARITY (SOURCE == BUILT == BOOTED == OBSERVED)
- VERDICT: falsified
- EVIDENCE STATE: FALSIFIED
- FILE: `ping-runtime/events/unified_event_runtime.js`, `gateway/bootstrap/gateway_runtime.js`, `gateway/routes/events.js`
- SYMBOL: n/a
- CALLER: n/a
- CALLEE: n/a
- RUNTIME EVIDENCE: sha256 deployed vs `git show ce3f8687c5:<path>` (all recomputed this pass): uer `2f56ba17...` vs `0bc2cc32...` MISMATCH; gateway_runtime `e295417f...` (deployed) vs cert blob (mismatch, prior packet's `7300f129...`); routes/events `ad9b9c92...` vs cert (mismatch). BOOTED == OBSERVED holds for the DEPLOYED revision (PID 1 runs the image bytes; live IDs are 64-hex; no sequence column), but SOURCE != BUILT != BOOTED for the certified revision.
- FALSIFIER: three byte-level file mismatches against the certified commit

## Source authority vs runtime authority (kept separate per mandate)

| Claim | SOURCE AUTHORITY | RUNTIME AUTHORITY |
|---|---|---|
| Identity | ce3f8687c5: `identityAuthority.generateId('event', ...)` -> `event_<16hex>` over RFC-8785 bytes | container ping-gateway @ 2f56ba17...: sha256 of `JSON.stringify(identity)` -> 64-hex; zero `event_<16hex>` rows |
| Sequence | ce3f8687c5 DDL: `sequence BIGINT` + `ping_events_sequence_seq` + backfill | no sequence column in live DB; zero rows carry sequence |
| Replay | cert emit has sequence + replay() | deployed emit has duplicate-suppression early-return only (the 15-line delta) |
| Sole writer | `UnifiedEventRuntime.emit` (cert revision) | `UnifiedEventRuntime.emit` (deployed revision 2f56ba17...) — same class, same choke point, different bytes |
| Effective authority | NOT BUILT (no image contains ce3f8687c5) | the live container IS the effective writer to ping_events, running a 2026-09-16 pre-convergence revision |

## End-state line

EVENT AUTHORITY / UnifiedEventRuntime class (sole effective writer) but SPLIT: SOURCE = ce3f8687c5c41bc19bdd58030b7fe3cf7d494cf4 (`ping-runtime/events/unified_event_runtime.js`, blob `0bc2cc32...`, `event_<16hex>` IdentityAuthority/RFC-8785 identity, sequence column + replay) vs RUNTIME = container ping-gateway (image `ping-gateway:devin-boundary2`, sha256 `5f018a301b...`, created 2026-09-16T12:54:22Z, labels null, deployed file sha256 `2f56ba17...` = e8398308 on `remotes/windows-preserve/constitutional-convergence-v2` + 15-line uncommitted duplicate-suppression delta, PID 1 `node gateway/server.js` started 2026-09-17T23:28:08Z, 739 live rows all 64-hex IDs written 2026-09-16 17:49-17:54 UTC)
SOURCE / ce3f8687c5 (verified ancestor of HEAD; cert blob recomputed this pass)
ARTIFACT / ping-gateway:devin-boundary2, built 2026-09-16T12:54:22Z (~54h before certification), no source SHA in labels, contains the pre-convergence revision
RUNTIME / container ping-gateway, BOOTED == OBSERVED for the deployed revision; POST /events structurally reachable (never exercised live); all live writes came from in-process callers (mission-runtime etc.), zero api:* rows
PERSISTENCE / ping_events (crx_runtime, ping-postgres): single production writer = deployed emit, `ON CONFLICT (event_id) DO NOTHING`, 739 rows, durable (synchronous_commit=on, fsync=on, survived real restarts of both containers)
IDENTITY / MISMATCH: runtime 64-hex sha256(JSON.stringify) vs cert `event_<16hex>` IdentityAuthority
HASH / MISMATCH: different canonicalization inputs (JSON.stringify insertion order vs RFC-8785 canonical bytes)
SEQUENCE / ABSENT at runtime: no sequence column, no sequence values, cert DDL never ran
REPLAY / ABSENT at runtime: deployed emit only dedupes (the 15-line delta); cert replay()/sequence/backfill not present
BROKEN ARROW / the certified -> running promotion gate: nothing at ce3f8687c5 has been built into an image; the running image predates certification and records no source SHA; BOOTED != SOURCE
NEXT WRITER UNIT / build a reproducible image FROM ce3f8687c5 with the source SHA recorded in image labels plus a deploy manifest; redeploy ping-gateway (needs Pig-side deployment authority); verify BOOTED sha256 == cert blob and a live-emitted row mints `event_<16hex>`. Bounded, not implemented by this lane.

TERMINAL STATE: FALSIFIED (exact broken arrow: certified -> running promotion gate; the parity claim SOURCE == BUILT == BOOTED == OBSERVED does not hold)

## Method notes

- Every hash in this packet was recomputed this pass (cert blob, deployed files, branch attribution, deployed-vs-e8398308 diff); none were carried forward from the prior packet except where explicitly marked as prior-packet context.
- Read-only throughout: git show/diff/log, docker inspect/exec (cat/sed/sha256sum/grep/ps), curl GET, psql SELECT-only. No source edits, no commits, no DB writes, no restarts, no secret reads.
- Falsifiers are stated per assertion so the packet is machine-checkable.
