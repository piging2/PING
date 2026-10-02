# APPROVAL-GAP — exact missing pieces for exact-proposal approval binding

Lane C4, 2026-09-23. Repo `/home/nolan/ping` @ `cc6856c3bc78e0535e66f168c66dc31abee2c073`.
Finish-criteria requirement: approval binds to the EXACT proposed consequential effect
(principal, proposal digest, operation, arguments, target, scope, expiration, preconditions;
changed proposal -> stale approval). ORCA never authorizes itself (AGENT DECIDED != ACTION AUTHORIZED).

## Status: the requirement is unmet at every layer

There is no approval concept on the live path at all, and the two dormant approval schemes
both fail the requirement structurally. The gap is not "wire up the existing tables"; the
existing code cannot satisfy the requirement even if wired, because the binding fields do
not exist in it.

## Missing piece 1: canonical proposal schema

No code defines a proposal as (principal, operation, arguments, target, scope, expiration,
preconditions). The closest artifacts:
- `BusinessActionAuthority.proposeAction` records (missionId, capability, targetIdentity,
  preview, reason, evidence, risk, expirationSeconds). Missing: operation arguments entirely
  (there is no `args`/`params` field), principal, scope, preconditions.
- `gateway.approvals` table records (patch_id, policy, status, conditions JSONB, witness_hash,
  approved_by, approved_at). Missing: everything except patch identity and a free-form
  conditions blob; `approved_by` is free text.
Required: a canonical, hashable proposal envelope with all eight fields, owned by one
authority, versioned.

## Missing piece 2: proposal digest and stale-on-change

- `BusinessActionAuthority`: `action_id = hash(mission_id, capability, target_identity)`.
  Arguments are not part of the identity, so a changed proposal produces the SAME id.
  Changed proposal -> invisible, not stale. There is no digest field at all.
- `EffectAuthority`: `effect_id = hash(capability, targetIdentity, actionType)`. Two different
  proposed actions against the same capability+target collide to one effect id, breaking
  idempotency (the idempotency key does not identify the effect).
- `gateway.approvals`: no digest column; approval rows reference `patch_id`, and nothing
  re-hashes the patch at use time, so a mutated patch keeps its approval.
Required: digest = hash(canonical proposal); approval row stores the digest; any execution
attempt recomputes the digest from the actual arguments about to run and rejects on mismatch.

## Missing piece 3: verification of approval at execution time

`EffectAuthority.createEffect({proposedActionId, approvalId, ...})` accepts both ids as opaque
strings and marks the effect `AUTHORIZED` without any lookup. There is no code anywhere that:
(a) loads the approval by id, (b) checks status == APPROVED, (c) checks expiry against the
execution timestamp, (d) checks the stored digest equals the digest of the effect about to run,
(e) checks the approving principal was entitled to approve that scope.
`CommitAuthority.commitPatch` performs git add/commit/push with no approval check in code.
`MissionScheduler._dispatch` and `WorkerRuntime.dispatch` have no approval hook at all.
Required: a single enforcement choke point on every consequential execution path that performs
(a)-(e) and fails closed (deny on any lookup/parse failure).

## Missing piece 4: principal identity

No principal field exists in any proposal or approval record. `approved_by` is free text;
the automatic policy sets `approved_by: 'system'`. There is no "who may approve scope S"
mapping, and the dormant `approval_policies` table (policy_rules JSONB) is never consulted
by any code path (`_determineApprovalPolicy` hardcodes `policy_automatic`).
Required: authenticated principal on proposal and on approval decision; policy table actually
evaluated; ORCA's own principal must be ineligible to approve its own proposals
(AGENT DECIDED != ACTION AUTHORIZED needs a principal-separation rule, currently absent).

## Missing piece 5: scope and preconditions

Neither dormant scheme has scope or precondition fields, let alone evaluation. The gateway
scheme's `approval_conditions` are four booleans, three of which cannot fail
(`testResults.passed || true`, `replayResult.matches_original || true`, `witness_verified: true`
hardcoded). Required: explicit scope (what targets/side effects are covered) and preconditions
(e.g. replay-verified, tests-green, witness-attested) evaluated from live evidence at approval
time AND re-checked at execution time (TOCTOU: approval-time truth is not execution-time truth).

## Missing piece 6: expiration enforcement at execution

`BusinessActionAuthority.approveAction` checks expiry at decision time, but nothing checks
expiry at execution time, and the gateway `approvals` table has no expiration column at all.
Required: `expires_at` on the approval; the execution-time verifier rejects expired approvals.

## Missing piece 7: the execution path the approval would gate

Even a perfect approval record has nothing to gate through:
- The live path (MissionScheduler -> WorkerRuntime -> worker.handle) has no authorization
  hook; adding one means touching the single choke point (`WorkerRuntime.dispatch` or
  `MissionScheduler._dispatch`) and defining which missions are "consequential".
- There is no capability grant step: no code maps a mission to a capability requiring
  approval, and no MCP/tool adapter layer exists to bound (see AUTHORITY-BOUNDARY-MAP.md:
  MCP transport is absent; `MCPReference` is a type with no consumer).
- `WorkerRuntime.dispatch` has no timeout on `handle()`, so a "consequential" worker cannot
  be bounded or revoked mid-flight today.
Required: decide the gated set (which operations are consequential), add the verifier at the
choke point, and give the executor timeout/revocation semantics before approval means anything.

## Missing piece 8: policy engine (dormant table, hardcoded code)

`approval_policies` DDL exists; zero code reads it for a decision. `_determineApprovalPolicy`
returns a hardcoded automatic-approve policy. Required: policy evaluation (manual /
constitutional / protected-branch / production per the file's own docstring) actually wired
to the approval decision, with the automatic path either removed or explicitly scoped and
logged.

## What is NOT missing

- Event emission gating: `EventGovernance.validateEvent` via `UnifiedEventRuntime.emit` is
  live and is a real choke point (rejects unregistered types / owner mismatch / bad namespace).
  It is an event-validity gate, not an execution-authorization gate; do not confuse the two.
- Replay verification machinery: `KernelReplayExecutionProvider` -> ReplayWorker ->
  WitnessWorker honesty gate is live. It verifies past execution; it does not authorize
  future execution.
- Identity hashing primitives: `CanonicalAuthority.hash` exists and is used; the gap is
  WHAT is hashed (proposal fields), not the hash function.

## Minimal shape of the fix (for the implementing lane; not implemented here)

1. Define canonical proposal envelope (principal, operation, arguments, target, scope,
   expiration, preconditions) + digest, owned by one authority.
2. Approval row stores digest + principal + expires_at; decision path evaluates the real
   policy table.
3. Single verifier at the execution choke point recomputes digest from actual arguments,
   checks status/expiry/principal-entitlement/preconditions, fails closed.
4. Changed proposal -> different digest -> old approval does not match -> stale by construction.
5. ORCA's own principal is never an eligible approver for its own proposals.
