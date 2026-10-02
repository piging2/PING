# SOURCE REGISTRY — DESIGN

**Lane M | Status: design (BUILDABLE, not yet implemented) | 2026-09-23**

The source registry is OPERATIONAL METADATA around acquisition. It answers
"how is each source doing, where did it leave off, and who may touch it." It
answers none of: "what is true about the business," "what did the provider
say," or "what happened when." Those belong to the canonical event authority
(phase0), the object graph, and lane L custody respectively.

The single invariant this design must protect:

**It must be possible to LOSE the entire registry and rebuild it from
(a) source-side durable artifacts and (b) canonical events, without losing
truth.** If the registry starts holding anything whose loss is a loss of
truth, it has become a second truth store and the design has failed.

## 1. What the registry is and is not

IS:
- One record per connected SOURCE INSTANCE (e.g. "GitHub repo nolan/projects/ping",
  "Square POS for Coppersmith's Books", "website crawl of acmeplumbing.com").
- Health, liveness, last accepted observation, per-stream checkpoints,
  normalizer version, owner, visibility, connection handle reference, budgets.
- The scheduler's and the connector worker's operational view.

IS NOT:
- An event store. Registry mutations are REPORTED as canonical events
  (SOURCE_REGISTERED, SOURCE_CHECKPOINT_ADVANCED, ...); the registry never
  stores event payloads, only references (run ids, sequence floors).
- A secret store. Connection is a capability-handle reference from lane L's
  secret broker. A raw token anywhere in a registry record is a design
  violation and a failing test case.
- A canonical identity authority. Provider ids (repo ids, account ids) travel
  as graded link records (per BCQ contract §1); they may live in the registry
  record as addressing hints, never as object identity.
- A duplicate of the connector MANIFEST (BCQ-owned document). Manifest = what
  the connector type IS (contract, capabilities, credential type). Registry
  record = how this INSTANCE is doing.

## 2. Record schema

`SourceRecord` — one per (tenantId, sourceType, providerInstanceId).

### 2.1 Identity and tenancy
| Field | Type | Notes |
|---|---|---|
| `sourceId` | string, stable | Deterministic: `sha256(tenantId + "|" + sourceType + "|" + providerInstanceId)` hex, prefixed by sourceType slug, e.g. `gh-9f2a…`. Never reassigned. |
| `tenantId` | string | Partition key. Every registry call carries tenant context; there is no unscoped query (see §7). |
| `sourceType` | string | References a BCQ-validated connectorId, e.g. `github`, `google-business-profile`, `web-acquire`, `git-repo`. |
| `providerInstanceId` | string | Provider-side address: `nolan/projects/ping`, `merch_8F3K`, `https://acme.example`. Graded as ADDRESSING, not identity. |
| `displayName` | string | Human label. Mutable; never used as a key. |
| `owner` | string | Named accountable party (principal), e.g. `nolan`, `lane-conn-oncall`. The human who answers "is this source still wanted." |
| `visibility` | enum | `private` (owner + tenant admins), `org` (all tenant members), `public-metadata` (record metadata visible outside the tenant, e.g. for the public-social fabric; connection and checkpoint details stay hidden). Defaults `private`. |

### 2.2 Connection and capability
| Field | Type | Notes |
|---|---|---|
| `connectionHandle` | string (opaque) | Lane-L capability handle. OPAQUE to the registry: it is stored, never read, never logged. Empty for `none`-credential sources (public web). |
| `connectionState` | enum | `unconfigured` `configured` `expiring` `invalid` `revoked`. Mirrors broker status; the broker is authoritative, the registry caches. |
| `declaredCapabilities` | string[] | From the manifest: closed verbs (`read`, `search`, `subscribe`, `webhook-receive`) + object + scope. |
| `grantedCapabilities` | string[] | Subset actually granted for this instance. `write` never appears without an elevated grant on file (BCQ contract). |
| `cadence` | object | Expected poll interval + jitter window, e.g. `{intervalMs: 3600000, jitterMs: 600000}`. Drives staleness detection (§6). `null` for event-driven sources. |

### 2.3 Acquisition progress (operational)
| Field | Type | Notes |
|---|---|---|
| `lastRunId` | string | Id of the most recent acquisition run (joins to lane-J run records). |
| `lastObservationAt` | timestamp | Last time an observation batch was ACCEPTED (not merely fetched). "Stale" is measured from here. |
| `checkpoints` | map stream → Checkpoint | One per logical stream (e.g. `issues`, `prs`, `workflow-runs`). See §5. |
| `normalizerVersion` | string (semver) | Version of the observation normalizer that produced the last accepted batch. A bump here is the signal for "re-normalize from checkpoints" jobs. |
| `budgets` | object | `{maxBytesPerRun, maxRunsPerDay, maxAiTokensPerRun}`. Advisory limits; the worker enforces, the registry records. |

### 2.4 Health
| Field | Type | Notes |
|---|---|---|
| `health.status` | enum | `healthy` `degraded` `down` `unknown` (see §6). Computed, not asserted. |
| `health.since` | timestamp | When the current status began. |
| `health.reason` | enum + detail | Lane-K failure taxonomy code (`RATE_LIMITED`, `AUTH_EXPIRED`, ...) + short machine detail. Human prose lives in lane-J run records. |
| `health.consecutiveFailures` | int | Reset to 0 on any accepted observation batch. |
| `health.lastHeartbeatAt` | timestamp | Last liveness signal from the worker. |

### 2.5 Lifecycle state
`lifecycleState`: `registered` → `active` | `paused` → `active` | `decommissioning` → `decommissioned` (terminal).

Decommissioned records are TOMBSTONES: the record stays readable (history,
provenance of past observations) but is excluded from scheduling, listing by
default, and health evaluation. Nothing is hard-deleted; the registry has no
delete operation.

## 3. Lifecycle

- **register(tenantId, manifestRef, providerInstanceId, owner, connectionHandle)**
  Validates the manifest via the BCQ validator (pure function; a connector
  without a complete valid manifest cannot register). Emits SOURCE_REGISTERED.
  Initial `health.status = unknown`, no checkpoints, `lifecycleState =
  registered` → `active` on first successful run.
- **heartbeat(sourceId, runReport)** — the worker's facts: run started/finished,
  outcome, taxonomy code, bytes/tokens, observations accepted count. Updates
  `lastHeartbeatAt`, `lastRunId`, `consecutiveFailures`, and (on acceptance)
  `lastObservationAt`. Then the deterministic health evaluator recomputes
  `health.status` (see §6). Emits SOURCE_HEALTH_TRANSITIONED only on status
  change (no event spam on every heartbeat).
- **checkpoint advance** — see §5. Only from an in-progress run lease, only
  after journal commit. Emits SOURCE_CHECKPOINT_ADVANCED (carries stream,
  new checkpoint digest, eventSeqFloor, normalizerVersion).
- **pause(sourceId, reason, by)** / **resume(sourceId, by)** — operator or
  owner only. Emits SOURCE_PAUSED / SOURCE_RESUMED. Paused sources are not
  scheduled and health evaluation freezes (status stays, `since` stays).
- **decommission(sourceId, reason, by)** — two-phase: `decommissioning`
  (drains in-flight runs, checkpoints frozen read-only) then `decommissioned`
  tombstone. Emits SOURCE_DECOMMISSIONED. The connection handle is RELEASED
  back to lane L (revoke, not delete); the registry keeps the handle REFERENCE
  for audit but the handle no longer resolves.
- **quarantineCursor(sourceId, stream, reason)** — see §5.3. Emits
  SOURCE_CURSOR_QUARANTINED.

## 4. The durability boundary (the hard line)

The registry is DERIVABLE. Every field falls into one of three classes:

**Class A — rebuildable from source-side artifacts.** `sourceType`,
`providerInstanceId`, `owner`, `visibility`, `connectionHandle`, `capabilities`,
`cadence`, `budgets`: all re-derivable from (manifest doc + lane-L broker
state + operator config). Losing them costs a re-registration walk, not truth.

**Class B — rebuildable from canonical events.** `lifecycleState`, `health.*`,
`lastRunId`, `lastObservationAt`, `checkpoints`: every mutation is ALSO a
canonical event through the event authority (phase0 names reserved in
STATE.md). Registry loss → replay the event journal → rehydrate to the last
committed state. The journal is the source of durability; the registry is a
projection for the scheduler and workers. (This mirrors PING's
projection-vs-source-truth layering: registry = DERIVED truth, §S9.)

**Class C — re-derivable from the source by doing the work again.**
`checkpoints` are a PERFORMANCE OPTIMIZATION, not truth. A checkpoint is a
hint that says "the provider had already given us everything before X, so
asking from X is cheaper." The provider's data is the authority on the
provider's data. Losing a checkpoint costs a bounded re-fetch, never truth.

Forbidden contents (any one is a design violation and a failing red-team test):
secrets or raw tokens; event/observation payloads; canonical business facts;
anything whose loss would silently change what FYD believes.

**Rebuild procedure (registry gone, journal intact):** replay
SOURCE_* events in sequence order, apply to empty records, verify checksum of
each checkpoint blob on load. **Registry gone AND journal intact is the only
supported full rebuild.** If both are gone, the system re-registers sources
from Class-A artifacts and starts every stream at `checkpoint = none` (full
re-derive from the provider). Duplicate delivery is safe because canonical
event ids are content-derived (phase0) — re-fetched data resolves to already-
known events and is deduplicated, at the cost of bytes, not truth.

## 5. Checkpoints: semantics and corruption handling

### 5.1 Checkpoint model
A checkpoint is an OPAQUE provider-shaped blob plus registry-owned framing:

```
Checkpoint {
  kind: "opaque-delta" | "cursor" | "etag" | "timestamp" | "none",
  value: <opaque string, e.g. delta token, ETag, RFC3339 ts>,   // provider-shaped
  valueSha256: hex,                                              // corruption detector
  normalizerVersion: semver,                                     // which normalizer wrote it
  eventSeqFloor: int,                                            // journal seq of the last event this checkpoint covers
  committedAt: timestamp,
  quarantined: bool,
}
```

Mechanism (from Airbyte M9, adapted): the connector worker owns the opaque
`value`; the registry owns the framing and only advances it. The registry
NEVER interprets `value` (no parsing provider tokens; they stay opaque).

### 5.2 Commit-first advance (the invariant)
`eventSeqFloor` ties a checkpoint to the journal: a checkpoint may only be
advanced to cover events that have been COMMITTED. The worker flow per run:

1. `beginRun` → receives a read-only snapshot of the current checkpoint + a run lease.
2. Fetch from provider starting at the checkpoint.
3. Normalize, emit observations, wait for journal commit (phase0 returns seqs).
4. `commitCheckpoint(runId, newCheckpoint)` — registry verifies: lease valid,
   `valueSha256` matches, `eventSeqFloor` >= previous floor (monotonic),
   and the floor is within the run's committed range. THEN it advances.
5. On any failure before step 4: the checkpoint does not move. The next run
   re-reads the old checkpoint. Overlap is safe (idempotent event ids).

A crash between 3 and 4 means re-fetching already-committed data. Bounded
waste, zero truth loss. This is the Airbyte "roll back to last committed
state" property, kept without importing the CDK.

### 5.3 Cursor corruption: fail closed, re-derive, never invent
Detection: `valueSha256` mismatch on read, schema-invalid framing, or a
`delta-token-invalid` provider rejection (manifest failureMode). Response,
in order, all automatic:

1. **Quarantine.** Set `checkpoints[stream].quarantined = true`. Refuse to
   hand it to any worker. Emit SOURCE_CURSOR_QUARANTINED with the old digest
   and the detection evidence. The stream's health moves to `degraded`
   (reason: `INVALID_PAYLOAD`, detail: cursor-quarantine).
2. **Fail closed on incremental.** No sync may use a quarantined checkpoint.
   The scheduler may run a FULL re-derive for the stream (bounded by budgets);
   it may NOT guess a "close enough" checkpoint.
3. **Re-derive and re-anchor.** Full fetch from the provider, commit events,
   then `commitCheckpoint` with `kind` as before and a FRESH provider-issued
   value. The new checkpoint's `eventSeqFloor` is the new commit range —
   there is deliberately NO continuity claim with the corrupted one.
4. **Unquarantine** only via a successful `commitCheckpoint` after a clean
   full re-derive. The quarantine event and the corruption evidence stay in
   the journal permanently (lane N lineage can show the gap window).
5. **Never invent.** The registry has no "repair checkpoint" operation. There
   is no API that sets a checkpoint value except `commitCheckpoint` from a
   live run lease with committed events. A human cannot hand-type a cursor.

Gap semantics: between the last good `eventSeqFloor` and the re-derive commit,
data may have been double-fetched (safe) or, if the provider cannot replay
history, permanently missed for that window. That miss is RECORDED (the
quarantine event carries the gap bounds) and surfaced to the owner — never
papered over. The registry reports what it knows: "we do not know what the
provider did in [t1, t2]."

### 5.4 Normalizer version skew
If `normalizerVersion` in the registry differs from the deployed normalizer:
the worker may still fetch (data acquisition is version-independent), but
emitted observations are tagged with the producing version, and the scheduler
flags the source for a re-normalization pass from existing checkpoints.
Checkpoints are NOT invalidated by a normalizer bump; they address provider
state, not normalized state.

## 6. Health semantics

Statuses:

- **unknown** — no heartbeat yet, or the evaluator has insufficient data
  (e.g. event-driven source that has never fired). `unknown` is not healthy;
  schedulers treat it as "do not assume, probe once."
- **healthy** — heartbeat fresh (within cadence + grace), consecutiveFailures
  == 0, last observation within expected cadence, connectionState ==
  configured.
- **degraded** — still producing but something is wrong: 1..N-1 consecutive
  failures, or cadence slipped but heartbeats continue, or connectionState ==
  expiring, or a cursor is quarantined. Degraded is a WARNING, not an alarm:
  the source is expected to recover on its own.
- **down** — consecutiveFailures >= threshold (default 5, per-source
  overridable), or heartbeat lost beyond grace period (default 3x cadence),
  or connectionState in (invalid, revoked), or last failure taxonomy in
  (AUTH_REQUIRED, AUTH_EXPIRED, PERMISSION_DENIED). Down pages the owner.

Who may write health:
1. **The connector worker writes FACTS** (heartbeats, run outcomes, taxonomy
   codes). It does NOT write health.status.
2. **A deterministic health evaluator** (pure function of facts + thresholds)
   computes health.status. Same facts → same status, always. It runs on every
   heartbeat and on a periodic sweep for staleness (missed cadence with no
   heartbeat is itself a fact).
3. **The owner/operator may FORCE a health override** (`forceHealthOverride`
   with a reason string), which is recorded as an audited event and expires
   after a TTL (default 24h), after which the evaluator resumes. Overrides
   exist for "provider status page says it is them, not us," not for hiding
   failures.

Nobody else: one source's worker cannot write another source's health; the
scheduler cannot set health directly; health never asserts "the data is
correct" (correctness is evidence grading, not liveness).

## 7. Multi-tenancy

- The registry is partitioned by `tenantId` at the storage layer (namespace
  prefix; no shared tables scanned without the prefix).
- The API port REQUIRES tenant context. There is no `listAllSources()`.
  A read for tenant A physically cannot name tenant B's namespace; the tenant
  id comes from the caller's authenticated context, not from request
  parameters (prevents parameter tampering).
- `sourceId` embeds a hash of the tenantId, so cross-tenant id guessing gains
  nothing (ids are unguessable without the tenant namespace anyway).
- `visibility` controls operational-metadata reads WITHIN the tenant:
  `private` = owner + tenant admins; `org` = all tenant members;
  `public-metadata` = record metadata (not connection/checkpoints) may be
  projected for public surfaces like the social fabric (lane SOC).
- Connection handles are tenant-bound at the lane-L broker; a handle minted
  for tenant A does not resolve in tenant B's context even if leaked.
- Decommissioned tombstones remain tenant-partitioned; no cross-tenant
  history reads.

## 8. Worked example

Two sources in tenant `acme` (a home-services business). Owner: `nolan`.

### 8a. GitHub source — repo `nolan/projects/ping`
- `register`: sourceType `github` (manifest validated), providerInstanceId
  `nolan/projects/ping`, connectionHandle from lane L (GitHub App installation
  token handle), grantedCapabilities `read(repo,issues,prs,actions)`,
  cadence 1h, health `unknown`.
- First run: worker `beginRun` → checkpoint snapshot `none` → full fetch of
  issues/PRs/workflow runs → normalize → emit observations → journal commits
  seqs 1001..1187 → `commitCheckpoint` per stream:
  `issues: {kind: etag, value: "W/\"abc…\"", eventSeqFloor: 1104}`,
  `prs: {… floor 1140}`, `workflow-runs: {… floor 1187}`. Health → `healthy`.
- Steady state: hourly heartbeats, checkpoints advance monotonically, lane J
  records bytes/tokens per run.
- Goes stale: GitHub API starts returning 403 rate-limit at 14:00. Heartbeats
  report `RATE_LIMITED`; consecutiveFailures climbs 1..4 → health `degraded`
  (reason RATE_LIMITED, since 14:00). At 5 → `down`, owner notified. Checkpoints
  DO NOT MOVE (no commits, no advance). At 16:30 the window resets; the next
  run succeeds from the OLD checkpoint (nothing lost, 2.5h of provider data
  caught up in one run), consecutiveFailures → 0, health → `healthy`.
- Cursor corruption: at 03:12 a disk error flips a byte in the `issues`
  checkpoint blob. Next `beginRun` reads it, `valueSha256` mismatches →
  automatic quarantine (steps §5.3): SOURCE_CURSOR_QUARANTINED emitted with
  digest of the corrupted value and `eventSeqFloor` 1104 of the last GOOD
  state; health → `degraded` (INVALID_PAYLOAD / cursor-quarantine). No worker
  is handed the bad cursor. Scheduler runs a bounded full re-derive of the
  `issues` stream (budget-capped); events commit (duplicates resolve to known
  ids); `commitCheckpoint` anchors a fresh ETag with the new floor; quarantine
  cleared. The journal permanently records: last good floor 1104 at 02:00,
  gap window [02:00, 03:40], re-anchored at seq 1210. The owner sees exactly
  what is known and what is not.

### 8b. Business SaaS source — Square POS for the business
- `register`: sourceType `square` (manifest: credentialType `oauth2`,
  declaredCapabilities `read(orders,inventory)`, `webhook-receive`),
  providerInstanceId `merch_8F3K`, connectionHandle = lane-L OAuth handle,
  grantedCapabilities `read(orders,inventory)` + `webhook-receive`, cadence
  null (event-driven), health `unknown`.
- Steady state: webhooks arrive, worker heartbeats with `OUTCOME` per batch,
  checkpoints per stream `orders: {kind: opaque-delta, value: sq_delta_…}`,
  health `healthy`. `lastObservationAt` tracks the last accepted webhook batch.
- Goes stale / down: the merchant revokes OAuth in the Square dashboard.
  Webhooks stop; the next worker-initiated reconciliation gets 401.
  Heartbeat reports `AUTH_EXPIRED`; connectionState → `invalid` (broker-
  confirmed); consecutiveFailures climbs; health → `down`; owner notified
  with the exact remediation ("reconnect Square in settings; no data action
  needed"). Checkpoints frozen. No invented data, no guessing.
- Recovery: owner re-authorizes; lane L mints a new handle; operator calls
  `reconnect(sourceId, newHandle)` (emits event); connectionState →
  `configured`; worker `beginRun` from the FROZEN checkpoint; Square's delta
  API replays the missed window from the old delta token (provider supports
  it); if the token expired (`delta-token-invalid` failureMode), the worker
  reports it and the registry treats it as §5.3 corruption-equivalent:
  quarantine, full re-derive, re-anchor. Health → `healthy` on first accepted
  batch. The gap, if any, is recorded and visible, not hidden.

Both examples show the same guarantees: the registry never holds truth, never
invents position, fails closed on corruption, and every state change is a
canonical event the journal can replay.

## 9. Kill criteria and optionality (per charter)

- Reject if the registry would need to hold canonical state: rejected by
  construction (§4 forbids it; red-team test asserts rebuild-from-journal).
- Reject if it needs raw secrets: rejected; lane L handles only.
- Optionality test: can we replace the registry's storage backend? Yes —
  it is a projection over the event journal (§4 Class B); any store that can
  replay events and hold opaque blobs works. Can we add a new source type?
  Yes — register with any BCQ-validated manifest. Can we rebuild the
  projection? Yes — replay. Can we trace a checkpoint to evidence? Yes —
  `eventSeqFloor` + lane N lineage. The registry passes: it is replaceable
  infrastructure, never canonical.

## 10. Open questions for other lanes
- Phase0: confirm canonical event names (SOURCE_REGISTERED,
  SOURCE_CHECKPOINT_ADVANCED, SOURCE_HEALTH_TRANSITIONED, SOURCE_PAUSED,
  SOURCE_RESUMED, SOURCE_DECOMMISSIONED, SOURCE_CURSOR_QUARANTINED,
  SOURCE_RECONNECTED). Who assigns their sequence positions — the registry's
  emitter or a central dispatcher?
- Lane L: handle lifecycle API (mint/refresh/revoke/probe) the registry's
  `reconnect` and `connectionState` cache will call.
- Lane K: confirm the failure-taxonomy codes the health evaluator keys on,
  especially the exact spelling of auth-expiry vs permission-denied.
- Lane J: run-record schema the heartbeat's runReport joins to (runId,
  bytes, tokens, accepted/rejected counts).
- Lane CONN: review REGISTRY-API-DRAFT.md; the `beginRun` lease shape must
  match what adapters can actually implement.
