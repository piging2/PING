# REGISTRY API SURFACE — DRAFT (for the connector contract)

**Lane M | Status: draft for lane CONN / lane J review | 2026-09-23**

This is the API the connector worker, the scheduler, and operators use to talk
to the source registry. Design follows SOURCE-REGISTRY-DESIGN.md. This is a
design surface, not implemented code: no repo writes have been made.

Conventions across all calls:
- Every call takes an explicit `TenantContext { tenantId, caller, callerRole }`.
  `tenantId` comes from the authenticated context, never from caller-supplied
  parameters. There is no unscoped call.
- Connection handles are opaque strings passed through, never inspected or
  logged by the registry.
- All mutating calls return the resulting record version; the registry is
  versioned per record (optimistic concurrency on `recordVersion`).
- Every mutating call emits its canonical event (phase0) BEFORE returning.
  If event emission fails, the mutation is rolled back: no silent divergence
  between registry state and the journal.

## Types (shape reference)

```
TenantContext { tenantId: string, caller: string, callerRole: "owner"|"operator"|"worker"|"admin" }
Checkpoint { kind: "opaque-delta"|"cursor"|"etag"|"timestamp"|"none",
             value: string, valueSha256: string,
             normalizerVersion: string, eventSeqFloor: number,
             committedAt: string, quarantined: boolean }
RunLease { runId: string, sourceId: string, leaseExpiresAt: string,
           checkpoints: Record<string, Checkpoint> }   // read-only snapshot
RunReport { runId: string, outcome: "succeeded"|"failed"|"partial",
            failureCode?: <lane-K taxonomy>, detail?: string,
            bytesRead?: number, aiTokensUsed?: number,
            observationsAccepted?: number, observationsRejected?: number }
HealthView { status: "healthy"|"degraded"|"down"|"unknown", since: string,
             reason?: string, consecutiveFailures: number, lastHeartbeatAt?: string }
```

## Calls

### registerSource
`registerSource(ctx, { sourceType, providerInstanceId, displayName, owner, visibility?, connectionHandle?, grantedCapabilities?, cadence?, budgets? }) → SourceRecord`
- Validates the connector manifest via the BCQ validator (pure function).
  Invalid manifest → rejection, no record, no event.
- `sourceId` derived deterministically; re-registering the same
  (tenantId, sourceType, providerInstanceId) returns the existing record
  (idempotent), unless it is a decommissioned tombstone (then: rejection with
  guidance to register under a new instance id).
- Emits SOURCE_REGISTERED.

### getSource / listSources
`getSource(ctx, sourceId) → SourceRecord` — connection handle redacted unless
callerRole is owner/operator/admin AND visibility allows.
`listSources(ctx, { lifecycleState?, healthStatus?, sourceType? }) → SourceRecord[]`
— tenant-scoped; decommissioned excluded by default; redacted list view.
Neither call can name another tenant's namespace. No exceptions.

### beginRun
`beginRun(ctx, sourceId) → RunLease`
- Caller must be the scheduler or the source's assigned worker.
- Returns a read-only snapshot of current (non-quarantined) checkpoints plus
  a run lease. Quarantined streams are marked `quarantined: true` and the
  worker MUST NOT fetch incrementally from them (contract test kit asserts
  this: a worker that uses a quarantined checkpoint fails).
- If any stream is quarantined, the lease carries
  `recoveryMode: "full-rederive-required"` for those streams.
- Lease expiry: if `commitCheckpoint` is not called before expiry, the lease
  dies silently; checkpoints unchanged. No rollback needed because nothing
  moved (commit-first invariant).

### heartbeat
`heartbeat(ctx, sourceId, RunReport) → HealthView`
- Records facts: lastHeartbeatAt, lastRunId, consecutiveFailures (+1 on
  failed, reset on any accepted observations), lastObservationAt (on
  acceptance), run counters.
- Runs the deterministic health evaluator; on status change emits
  SOURCE_HEALTH_TRANSITIONED and returns the new view.
- A worker may only heartbeat sources it holds a live lease for, plus a
  final close-heartbeat after the lease ends. Stale heartbeats (unknown runId)
  are rejected.

### commitCheckpoint
`commitCheckpoint(ctx, sourceId, runId, stream, Checkpoint) → void`
- Validates: lease live, `valueSha256` matches `value`, `eventSeqFloor` >=
  previous floor for the stream (monotonic), floor within the run's committed
  range (the caller attests; the journal is the verifier — a floor beyond
  committed seqs is rejected on replay audit).
- If the stream was quarantined: this call IS the unquarantine path, allowed
  only after a full re-derive (the RunReport for the run must show
  `recoveryMode` was honored; otherwise rejection).
- Emits SOURCE_CHECKPOINT_ADVANCED (stream, new digest, floor,
  normalizerVersion). No other write path sets checkpoints. There is no
  `setCheckpoint`.

### quarantineCursor
`quarantineCursor(ctx, sourceId, stream, reason, evidence) → void`
- Called by the worker on sha mismatch / provider delta-token-invalid, or by
  the registry itself on read-time corruption detection.
- Sets `quarantined: true`; health evaluator moves the source to `degraded`.
- Emits SOURCE_CURSOR_QUARANTINED with the old digest and evidence.
- Unquarantine happens ONLY through `commitCheckpoint` after clean re-derive
  (§5.3 of the design). No direct unquarantine call exists.

### pause / resume
`pause(ctx, sourceId, reason) → void` / `resume(ctx, sourceId) → void`
- Owner or operator only. Paused: scheduler skips, health evaluation frozen,
  heartbeats rejected (worker should not be running).
- Emits SOURCE_PAUSED / SOURCE_RESUMED.

### reconnect
`reconnect(ctx, sourceId, newConnectionHandle) → void`
- Owner or operator only. Swaps the lane-L handle reference (old handle
  released via the broker by the caller flow, not by the registry).
- connectionState → `configured` (then re-probed by the broker).
- Emits SOURCE_RECONNECTED. Checkpoints are NOT touched: the new credential
  resumes from the frozen checkpoint (or quarantines per §5.3 if the
  provider rejects the old cursor under the new credential).

### decommission
`decommission(ctx, sourceId, reason) → void`
- Owner or operator only. Two-phase: `decommissioning` (in-flight leases drain,
  no new leases, checkpoints frozen read-only) → `decommissioned` tombstone.
- The connection handle reference is marked released; it will no longer
  resolve via the broker.
- Emits SOURCE_DECOMMISSIONED. Record stays readable for history. No delete.

### forceHealthOverride
`forceHealthOverride(ctx, sourceId, status, reason, ttlMs?) → void`
- Owner or operator only. Audited; expires after TTL (default 24h), then the
  evaluator resumes from facts. Cannot set `healthy` while consecutiveFailures
  > 0 unless reason explicitly acknowledges it (the audit trail shows the lie
  if there is one).
- Emits SOURCE_HEALTH_OVERRIDDEN.

### updateBudgets / updateCadence / updateVisibility
Owner or operator only. Pure operational tuning; each emits its event
(SOURCE_BUDGETS_UPDATED, etc.). Kept separate from `registerSource` so tuning
does not require re-registration.

## What the connector contract test kit asserts (BCQ kit additions proposed)

1. A worker that advances a checkpoint without a committed journal range fails.
2. A worker that uses a quarantined checkpoint for incremental fetch fails.
3. A worker that writes raw secret material through any registry call fails.
4. A worker that heartbeats another source's id fails.
5. Health status is never asserted by the worker; only facts are sent.
6. Checkpoint `value` is never parsed by the registry (opaqueness test: feed
   garbage bytes as value; registry must store and return them untouched,
   advancing only framing).

## Non-goals for this surface

- No event payload storage or retrieval (phase0 owns the journal).
- No secret minting/refresh (lane L owns custody; the registry only swaps
  handle references).
- No cross-tenant operations of any kind.
- No direct checkpoint writes, no unquarantine, no delete.
