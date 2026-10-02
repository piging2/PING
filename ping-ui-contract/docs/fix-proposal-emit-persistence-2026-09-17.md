# Reviewed fix proposal: emit() false persistence success

**Status:** PROPOSAL, reviewed. Not applied. Requires an authorized host with backend worktree access. No commit without Nolan's explicit word (Phase D commit allowlist).

## Evidence of the defect

- `UnifiedEventRuntime.emit()` returns `{status:'ok'}` even when the INSERT into ping_events was skipped because the pool was null. The guard `if (this._pool)` (unified_event_runtime.js step 5) skips persistence, and execution falls through to `return { status: 'ok', eventId, event }`. "PROVEN in code" (thread-handoffs.md:290; forensics B1).
- This is constitutionally dangerous: transport acceptance is being reported as persistence. A runtime saying success when persistence never happened can manufacture false evidence of completion, violating the proof ladder (docs/proof-ladder.md): PERSISTED is claimed on an EXECUTED-or-less operation.
- Latent on the HTTP path today: the runtime is constructed only inside `if (pgAvailable)` (forensics B1, gateway_runtime.js:378) and degraded mode 503s before emit is reached (:692-700). But it is reachable for in-process callers and is a structural lie in the API contract regardless. Handlers still run in the pool-null case, so subscribers (e.g. EventToMissionBridge) can create missions for an event that was never persisted.
- Classification: P0 proof defect. No required write may report successful completion when the persistence operation was skipped.

## Exact file

`ping-runtime/events/unified_event_runtime.js`, `emit()`. Line references from the 2026-09-16 forensics/thread-handoff code reads (:86-91 identity construction, :141 the pool guard, :147-162 persistence, :165-184 dispatch); the file was not re-captured, so line drift is possible. The sketch below is a RECONSTRUCTION, not byte-copied source.

## Precise diff

```diff
-  if (this._pool) {
+  if (!this._pool) {
+    return { status: 'error', error: 'STORAGE_ERROR: persistence unavailable (null pool)', eventId, persisted: false };
+  }
+  {
     const result = await this._pool.query(
       `INSERT INTO ping_events (...) VALUES (...) ON CONFLICT (event_id) DO NOTHING`, [...]);
```

and on the success path:

```diff
-  return { status: 'ok', eventId, event };
+  return { status: 'ok', eventId, event, persisted: true };
```

## Why this shape

- `STORAGE_ERROR` comes from the proven deterministic failure vocabulary (gateway/deterministic_failure_envelope.js: UNKNOWN, AUTHORITY_ERROR, COMPILATION_ERROR, VALIDATION_ERROR, REPLAY_ERROR, WITNESS_ERROR, STORAGE_ERROR, NETWORK_ERROR, PARSING_ERROR, HASH_ERROR; thread-handoffs.md FailureCodes row).
- `{status:'error', error: ...}` matches the existing persist-failure return shape (:159-162) and feeds the existing route contract: POST /events throws on non-ok -> asyncHandler -> HTTP 500 (thread-handoffs.md:274), so the caller gets an honest 500 instead of a lying 200. No route changes needed.
- `eventId` is included because it is computed before the guard (:86-91); the caller can correlate the failure with a retry.
- `persisted` is an orthogonal persistence-status dimension, not a rename: the three coexisting success shapes ({status:'ok'}, {success:true}, {status:'completed'}) are deliberately left untouched per Nolan's no-normalization directive. `persisted:true` on ok, `persisted:false` only on the new error shape, so existing callers parsing `status` see no behavior change except the one being fixed.
- Fail closed BEFORE handler dispatch (step 6): an event with identity but no persistence must not fan out to subscribers.
- Matches the forensics' own recommendation: "The fail-closed fix is one guard clause." (forensics B1)

## Verification

Emit-null-pool probe (must run on a host with backend access): instantiate UnifiedEventRuntime with a null pool, call emit(), and assert: result is {status:'error', error matching STORAGE_ERROR, persisted:false} with eventId present; no handler invoked; via the route, the caller receives HTTP 500, not 200. Second assertion: with a live pool, the ok shape carries persisted:true.

## Application route

Cannot be applied from the cloud host. Apply in the backend worktree (/home/nolan/ping, branch constitutional-convergence-v2) on an authorized host with backend access, as a surgical hunk in ping-runtime/events/unified_event_runtime.js. No commit without Nolan's explicit word. Redeploy via the release-tree mechanism, then run the emit-null-pool probe. This changes a return contract on a hot path, so the probe plus a standard gateway health check and one normal /events round-trip should gate the deploy.
