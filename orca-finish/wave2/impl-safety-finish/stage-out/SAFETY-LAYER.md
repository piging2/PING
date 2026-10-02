# ORCA Safety Layer (`lib/orca/`)

Branch: `orca-finish/safety` (worktree `/home/nolan/ping-orca-safety`).
Status: additive only. No changes to `/home/nolan/ping`, no changes to the
`feature/orca-autonomy` branch worktree (read-only), no merges.

## What this is

Five guardrail modules that sit AROUND the execution authority, never as a
second one. The `feature/orca-autonomy` branch owns the WorkOrder boundary,
the policy, and the status ledger. Every module here is injected with the
branch's functions and calls them; nothing is copied, reimplemented, or
shadowed. Where the branch is silent (true gaps), the module is
self-contained and pure. Where the branch has a mechanism (adapt), the module
is a controller or lease wrapper composed over it.

Composition rules, binding:

1. Injection over duplication. The branch's `classifyDelegation`,
   `authorizeWorkOrder`, `stableWorkOrderId`, and envelope binding fields are
   called, never reimplemented.
2. Branch policy stays the outer authority. `guardedDelegation()` runs the
   branch's `classifyDelegation` first; the guardrail controller only narrows
   what policy already allowed.
3. No second event store, no second status ledger, no parallel dispatcher.
   Outcome records are pure constructors; durable writes belong to the
   journal (one-writer rule).
4. Branch-integration tests require the real branch modules by absolute path
   (`/home/nolan/worktrees/orca-autonomy/...`) and skip cleanly when the
   branch worktree is absent. Read-only requires; the A5 branch is never
   modified.

## The five modules

### 1. `orca_worktree.js` — per-run git worktree create/archive (TRUE_GAP)

O-3 port (Go to JS) with the ORCA-09 conditional-isolation policy on top.
Per-run branch `orca/<runID>` off the base; `ErrEmptyBase` guard; archive to
`_shipped` / `_killed` with data preserved BEFORE registry unregister, then
`git worktree prune`. `needsIsolation({accessMode, writerCount})`: read-only
and sole-writer lanes run direct; worktree only on writer collision.
Security: all git calls via `execFileSync` argv (no shell); runIDs validated
against a strict pattern (path traversal blocked). Additive only: owns only
directories it creates under `<repo>/.orca/runs/`.

### 2. `orca_fanout_guardrails.js` — delegation bounds controller (ADAPT)

Pure controller: max delegation depth, max concurrent children, per-run
child budget, allowed-agents list. Over-cap work REQUEUES with a stable
requeue key (never escalates-or-drops); membership violation DENIES.
`guardedDelegation()` composition: branch `classifyDelegation` runs first
(policy stays outer authority), then the controller; the branch's decision
record is preserved as evidence on the requeue/spawn record. Covers what the
branch lacks: delegation depth, concurrency cap, requeue-on-cap semantics
(the branch's `maxWorkOrders` is an escalation budget, not a requeueing
controller).

### 3. `orca_outcomes.js` — OUTCOME_UNKNOWN fail-closed vocabulary (TRUE_GAP)

OUTCOME_UNKNOWN as a unique terminal value. Boundary is the externally
observable ack, never local state position. UNKNOWN writes require
last-observed-evidence citation; blind retry of UNKNOWN throws
(`ErrBlindRetry`); reconciliation only via evidence (`reconcileUnknown`),
never re-submission. Timeout-after-dispatch with no verifiable completion
classifies UNKNOWN, not FAILED; provably-pre-dispatch failures stay
FAILED/retryable (the branch's honest-failed path). Consumes the branch's
`stableWorkOrderId` as the idempotency key carried on external effects.
`idempotencyKeyFor` is the seam where HS-1's stable identity plugs in.

### 4. `orca_approval.js` — digest-bound approval grants (TRUE_GAP)

Two-tier grants: scope tier for low-risk tools, argument tier binding the
sha256 of canonicalized args for sensitive tools (includes the branch's
`APPROVAL_GATED_CAPABILITIES`: `email.send`, `sms.send`). Grant =
`{ tenant, policyVersion, invocationType, toolLookupKey, role,
proposalDigest, expiresAt, approver, findings }`. Execution re-validates
digest + policy version + revocation + expiry + tenant; digest mismatch is
stale (throw); revocation checked at execution, not just grant time;
self-approval structurally refused at grant AND execution; interrupt resume
is single-writer CAS. The proposal digest covers the branch's envelope
binding fields (`work_order_id`, `context_pack_id`, `agent_id`,
`capability`, `deadline`) PLUS the authorized `input` and `constraints`,
closing the authorize-to-issue argument-smuggling seam. Red-team rank 2 + 7
hardening.

### 5. `orca_capability_gate.js` — ORCA-01 / MCP-M26 lease wrapper (ADAPT)

`authorizeCall` resolves the capability through the EXISTING authority
(called, never reimplemented): the branch's `authorizeWorkOrder` (injected)
for the delegation direction, the live `CapabilityAuthority` interface for
the agent-initiated direction. Validates the lease (sha256 hash, revocation,
expiry, principal, capability, scope), re-resolves immediately before
returning ALLOW, default-deny, ambiguous denial. Leases are sha256-hashed
Bearer <redacted> scoped to project/session/lane with role + allowed-tools
subset. Long-handler re-verification is a documented caller obligation, not
a silent assumption. (Test file uses a dummy `tk-*` credential, never a real
secret.)

## Tests

`lib/orca/test/` — five `node:test` suites, one per module. Run from the
worktree root:

```
node --test "lib/orca/test/*.test.js"
```

Result on 2026-09-23 (Pig, node v22.23.2): **66/66 pass, 0 fail.**

Fix applied during this lane (staged test code only, module was correct):
`test_orca_worktree.test.js` asserted `git branch --list` output equals the
branch name, but git prefixes branches checked out in linked worktrees with
`+ ` (standard marker since git 2.23), and `createForRun` had just checked
the branch out in a new worktree. The test now uses
`--format=%(refname:short)`, which strips the marker deterministically.

## What is intentionally NOT built

- **HS-4 SQL.** The fencing-epoch SQL is staged as a spec only
  (`lib/orca/specs/hs-4-fencing-epoch.md`), marked NEEDS REVIEW. Applying it
  touches `/home/nolan/ping` (lease DDL, `ping_missions` writes), which is
  out of scope for this lane.
- **HS-5.** Held on U2: Nolan's call on the wedged-coordinator-holder policy
  (advisory lock has no TTL/heartbeat; a wedged holder blocks forever).
  Nothing is finalized here.
- **`/home/nolan/ping` changes of any kind.** All PING-side wiring is a spec
  artifact for the PING lane: `ping_runs` table, `ping_attempts` DDL, the
  reaper hook, lease-column DDL, provenance column DDL.
- **A second execution authority, a second event store, MissionScheduler /
  WorkerRuntime changes, the A7 runner.** Explicitly out of scope.
- **C3-(2) reclaim retry cap, C3-(4) bridge reconciliation
  (`f4bf5304a`).** True gaps on mainline; out of lane (MissionRuntime and
  the bridge are off-limits). Flagged for the parent, not built.

## Harvest and hardening specs (`lib/orca/specs/`)

All specs are SPEC ONLY, clearly marked unbuilt. They define contracts,
invariants, and acceptance criteria; no production wiring exists.

- `hs-1-stable-identity.md` — canonical stableStringify for create()'s
  idempotency key (sorted keys, explicit types, reject non-finite).
- `hs-2-run-lifecycle.md` — durable run record + 7-state lifecycle (pure
  transition table; OUTCOME_UNKNOWN terminal-except-CANCEL).
- `hs-3-attempt-identity.md` — stable attempt derivation + per-attempt
  records.
- `hs-4-fencing-epoch.md` — fencing_epoch on leases, atomic SQL WHERE
  enforcement per method; CRITIC-SECURITY fold-ins: holder check on
  `renewLease` (lease pinning, F3/5b) and F2 latent-fence fix (epoch +
  writer identity on the `transitionRun`/`checkpointRun` write path, digest
  validated checkpoint refs, BEFORE any run-record wiring). NEEDS REVIEW.
- `hs-6-takeover-liveness.md` — liveness-checked stale-claim takeover
  (pure three-way decision: rendezvous / possibly-alive / dead).
- `hs-7-provenance-column.md` — provenance column distinguishing verified
  vs claimed vs synthetic result payloads (CRITIC-SECURITY 5d; worker JSON
  is currently unvalidated).
