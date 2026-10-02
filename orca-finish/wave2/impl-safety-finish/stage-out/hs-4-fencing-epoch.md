# SPEC (UNBUILT, NEEDS REVIEW) — HS-4: fencing_epoch on leases, SQL-WHERE enforced

**Status: SPEC ONLY. Not built, not applied. The SQL below NEEDS REVIEW
before any staging against a real schema.**
Source: ORCA-A harvest backlog + CRITIC-SECURITY hardening (F3/5b holder
check on `renewLease`; F2 write-path epoch for `transitionRun` /
`checkpointRun`), 2026-09-24 02:56 UTC.
Target surface: `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`) — this lane must never touch it.
Lane build shape when authorized: `lib/orca/orca_fencing_epoch.js` (pure
epoch-bump / stale-decision rules) + tests. This file is the SQL contract.

## Problem

Mainline `complete()` is a status-only WHERE: a zombie worker's late
`complete()` after lease reclaim is accepted and overwrites the result
(C3-(1), CRITIC-SECURITY F3, LIVE). `renewLease()` has no holder check: any
DB-connected process can pin any mission's lease forever, defeating the
reaper (F3/5b). `fail()` has no holder check. The reaper resets without an
epoch bump. ORCA-A's `transitionRun`/`checkpointRun` take no holderId/epoch
at all: a stale holder's late writes succeed silently (CRITIC-SECURITY F2,
LATENT; becomes live the moment `orca_run_record.js` is wired).

## Binding caveats (from GAP-ANALYSIS, non-negotiable)

- (a) Epoch checks go on the WRITE path, not just the claim path. ORCA-A
  fencing today is detect-not-prevent: `claimRun` checks epochs, but
  `transitionRun`/`checkpointRun` skip them (probes H4a-H4b). Any harvest
  that only fences the claim path reproduces the hole.
- (c) NEVER copy the file-CAS shape. Probe H3b proves `claimRun`'s
  read-check-write loses updates under true concurrency. Enforcement must
  be atomic SQL `WHERE` clauses (single statement, rowCount as the
  decision). Copy only the token SHAPE (holder + epoch), never the
  read-check-write mechanism.
- The fencing epoch here is complementary to `orca_approval.js`: the
  proposal digest binds WHAT was authorized; the epoch binds WHEN the
  writer was still the holder (execution-time freshness). And to
  `orca_capability_gate.js`: the lease it validates can carry the epoch.

## Schema additions (proposed, NEEDS REVIEW)

- `ping_missions.lease_epoch INTEGER NOT NULL DEFAULT 0` — fencing token
  on the lease. Bumped by claim and by the reaper on reset.
- `ping_missions.assigned_to TEXT` — current holder identity. (If the
  column already exists under another name, bind to the existing one; do
  not add a duplicate.)
- Provenance of results: see `hs-7-provenance-column.md` (CRITIC-SECURITY
  5d). The `complete()` SQL below cites it.
- Run-record writes (when HS-2 is wired): every write carries
  `writer_id` + `lease_epoch` columns for attribution (F2 forensic path).

## Method contracts (atomic single-statement SQL; rowCount 0 = stale, refuse)

Conventions: `$holder` = presenting holder id, `$epoch` = presented epoch.
All statements are one round trip. On `rowCount == 0` the caller MUST treat
the operation as refused (stale holder / stale epoch / wrong state) and
must NOT retry blindly; the correct next step is re-claim or reconcile,
never re-submit (see `orca_outcomes.js` no-blind-retry).

### assign (claim)

```sql
-- NEEDS REVIEW
UPDATE ping_missions
SET status = 'running',
    assigned_to = $holder,
    lease_epoch = lease_epoch + 1,
    lease_expires_at = NOW() + $ttl,
    claimed_at = NOW()
WHERE mission_id = $id
  AND status IN ('created', 'retry_pending')
RETURNING lease_epoch;
```

Claim bumps the epoch. The returned epoch is the fencing token the holder
presents on every subsequent write.

### renewLease — WITH HOLDER CHECK (CRITIC-SECURITY hardening 1 / F3 5b)

```sql
-- NEEDS REVIEW
UPDATE ping_missions
SET lease_expires_at = NOW() + $ttl
WHERE mission_id = $id
  AND assigned_to = $holder        -- holder check: without this, any
  AND lease_epoch = $epoch        -- DB-connected process pins any mission
  AND status = 'running';         -- forever, defeating the reaper
```

Today `renewLease()` has no holder check, so any process with pool access
can extend any mission's lease indefinitely (lease pinning, availability
DoS on mission progress). The `assigned_to = $holder` predicate closes it.
Stale holder renewing after reclaim gets rowCount 0: refused, never
extended.

### complete

```sql
-- NEEDS REVIEW
UPDATE ping_missions
SET status = 'completed',
    result = $result,
    result_provenance = $provenance,   -- see hs-7; CLAIMED unless verified
    completed_by = $holder,
    completed_at = NOW()
WHERE mission_id = $id
  AND assigned_to = $holder
  AND lease_epoch = $epoch
  AND status = 'running';
```

A zombie's late `complete()` after reclaim presents a stale epoch:
rowCount 0, result NOT overwritten, no `MISSION_COMPLETED` emitted for the
stale write. This is the C3-(1) / F3 result-overwrite fix. The
`result_provenance` column (hs-7) records verified-vs-claimed at write
time.

### fail — WITH HOLDER CHECK

```sql
-- NEEDS REVIEW
UPDATE ping_missions
SET status = 'failed',
    error = $error,
    failed_at = NOW()
WHERE mission_id = $id
  AND assigned_to = $holder        -- without this, a stale worker fails
  AND lease_epoch = $epoch        -- someone else's mission (F3 finding 3)
  AND status IN ('running', 'assigned', 'retry_pending');
```

### failWithRetry

Same predicates as `fail()`, setting `status = 'retry_pending'` and
incrementing the retry counter. Retry budget consumption stays
PING-lane-owned; this spec only fences WHO may consume it.

### reapExpiredLeases — reaper bumps epoch on reset

```sql
-- NEEDS REVIEW
UPDATE ping_missions
SET status = 'created',
    assigned_to = NULL,
    lease_epoch = lease_epoch + 1,   -- epoch bump: invalidates the dead
    lease_expires_at = NULL          -- holder's token in one statement
WHERE status = 'running'
  AND lease_expires_at < NOW();
```

The reaper's reset MUST bump the epoch atomically in the same statement.
Without the bump, a dead holder's in-flight `complete()` (dispatched just
before expiry) still matches after reset: the ABA window stays open.

Ordering note: the HS-6 liveness check runs BEFORE this reset (possibly
alive: leave + alarm, never steal). This spec defines the fence; hs-6
defines the takeover decision.

## F2 latent-fence fix (CRITIC-SECURITY hardening 3) — BEFORE any wiring

`transitionRun` / `checkpointRun` (ORCA-A `orca_run_record.js`, and any
PG-backed successor) MUST carry `holderId` + `expectedEpoch` on the WRITE
path, or the stale-holder scenario in F2 becomes live the moment the run
record is wired: coordinator loses the advisory lock but keeps its JS loop
running, and its late `transitionRun`/`checkpointRun` calls are never
refused.

Binding rules:

1. `transitionRun(..., holderId, expectedEpoch, event)`: refuse (fail
   closed) when `holderId` is not the current holder or `expectedEpoch`
   does not match the stored epoch. The check runs BEFORE the HS-2
   transition table is consulted.
2. `checkpointRun(..., holderId, expectedEpoch, stateSnapshotRef)`: same
   refusal rule. ADDITIONALLY, `state_snapshot_ref` must be a digest of
   content: validate at the recovery read path that the ref resolves to
   content whose digest matches, or require the epoch on the write path.
   Today the "content-addressed" property is conventional, never validated:
   a stale holder can point the resume ref at an arbitrary string and
   poison the recovery path.
3. Every write records `writer_id` + `lease_epoch` (attribution; the F2
   "detectable" claim survives only forensically today because writes
   carry neither).
4. F2 repro shape (acceptance): claim as holder B at epoch n+1, then call
   `transitionRun` as holder A with epoch n: MUST be refused. Before the
   fix it succeeds silently.
5. Do NOT wire `orca_run_record.js` (or any PG run-record equivalent)
   until 1-3 hold. Wiring first reproduces F2 as a live defect.

## Pure rules module (when built)

`orca_fencing_epoch.js` carries the substrate-independent half:
`bumpEpoch(current)`, `isStale(presented, stored)`,
`decideWrite({presentedHolder, presentedEpoch, storedHolder, storedEpoch,
expectedState, actualState}) -> {ok} | {refused, reason}` with reasons
`stale-epoch`, `holder-mismatch`, `wrong-state`. The SQL above is the
atomic enforcement of these decisions; the module must never be used as a
read-check-write substitute (caveat c).

## Acceptance criteria (when built)

1. Each method's SQL is a single statement; stale (holder, epoch) yields
   rowCount 0 and the caller refuses without blind retry.
2. `renewLease` by a non-holder is refused (lease-pinning closed).
3. `complete` by a stale holder after reaper reset is refused; the
   reclaimed holder's result is never overwritten.
4. Reaper reset bumps the epoch in the same statement.
5. F2 repro refused; `writer_id` + `lease_epoch` present on every write;
   checkpoint refs digest-validated.

## Explicitly out of scope

- Applying any of this SQL. `/home/nolan/ping` is off-limits; the PING
  lane owns DDL, migration, and the reaper hookup.
- The C3-(2) reclaim retry cap (mission-layer `retries` budget on reclaim).
  True gap on mainline, out of lane; flagged for the parent.
