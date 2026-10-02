# W2-IMPL-SAFETY Checkpoint — ORCA safety layer (worktree, fan-out, UNKNOWN outcomes, approval, capability gates)

**Lane:** W2-IMPL-SAFETY (ORCA FINISH Wave 2). **Status:** PIVOT 2026-09-23 ~19:50 MDT.
**Branch:** `orca-finish/safety` @ worktree `/home/nolan/ping-orca-safety` (base `cc6856c3`).
**Isolation:** Sole writer in `/home/nolan/ping-orca-safety`. Never touch `/home/nolan/projects/ping-constitutional`, `/home/nolan/ping`, `/home/nolan/ping-orca-state`, or the branch worktree `/home/nolan/worktrees/orca-autonomy` (READ-ONLY). Additive only; no live-path changes.

## STRATEGIC REDIRECT (parent orchestrator, ~19:42 MDT)

From-scratch plan CANCELLED. Wave-1 lane C1 proved branch
`feature/orca-autonomy` @ `ae55b77ff` (worktree `/home/nolan/worktrees/orca-autonomy`,
READ-ONLY) contains a substantially-proven A5/A6 implementation. Salvage rule
binding: reuse/adapt before implementing.

Read (read-only): `external_agent_adapter.js` (fail-closed authorizeWorkOrder,
12 profiles, verifyResultEnvelope, recordVerifiedResult), `orca/control-loop/policy/`
(classifyDelegation, 10-state ledger, recovery decisions),
`orca/control-loop/objective-runtime.js`, C1's `ORCA-INVENTORY.md` + `A5-VERDICT.md`.

## Gap verdicts (full analysis: GAP-ANALYSIS.md)

1. Worktree isolation — TRUE_GAP. Branch has no per-run worktree mechanism at
   all (grep-verified). O-3 port stands.
2. Fan-out guardrails — ADAPT. Branch has membership (AGENT_PROFILES) + run
   bounds (maxWorkOrders→escalate) but no depth cap, no concurrency cap, no
   requeue-on-cap. Pure controller + guardedDelegation() composition over the
   branch's classifyDelegation.
3. UNKNOWN outcomes — TRUE_GAP. Branch has honest-failed + stable
   work_order_id idempotency but no OUTCOME_UNKNOWN state, no ack-boundary
   classification, no evidence-cited records, no no-replay enforcement.
4. Approval binding — TRUE_GAP (load-bearing). Branch's REQUIRES_HUMAN_APPROVAL
   is a decision class, not a mechanism; authorizeWorkOrder authorizes without
   seeing input; issueWorkOrder attaches arbitrary input after authorization.
   Two-tier digest-bound grants + execution-time revalidation mandatory.
5. Capability gates — ADAPT. Branch's authorizeWorkOrder is a correct per-call
   gate for the delegation direction; the ORCA-01/MCP-M26 lease layer (hash,
   revocation, expiry, re-resolution at execution) is missing.

## Build list (all on `orca-finish/safety`, `lib/orca/`)

- `orca_worktree.js` (TRUE_GAP, O-3 port + ORCA-09 policy)
- `orca_fanout_guardrails.js` (ADAPT, + branch composition seam)
- `orca_outcomes.js` (TRUE_GAP, + stableWorkOrderId idempotency-key seam)
- `orca_approval.js` (TRUE_GAP, digest covers branch envelope binding fields)
- `orca_capability_gate.js` (ADAPT, calls branch authorizeWorkOrder / live
  CapabilityAuthority, never reimplements)
- `lib/orca/test/*.test.js` — node:test; `node --test lib/orca/test/`.
  Branch-integration tests require branch modules by absolute path, skip
  cleanly if the branch worktree is absent.

## Objective
Build the safety layer as 5 modules + tests, committed on `orca-finish/safety`:
1. `orca_worktree.js` — per-run worktree create/archive, DIRECT_REUSE of O-3 (~120 tested MIT lines): per-run branch `orca/<runID>`, archive to `_shipped`/`_killed`, `ErrEmptyBase` guard, data preserved before unregister. Unit tests: create/archive/collision.
2. `orca_fanout_guardrails.js` — controller-enforced max depth, max concurrency, per-run budget; over-cap work requeues (never drops). Pure functions + tests.
3. `orca_outcomes.js` — outcome vocabulary NOT_STARTED/STARTED/SUCCEEDED/FAILED/OUTCOME_UNKNOWN; UNKNOWN write path requires last-observed-evidence citation; blind retry of an UNKNOWN effect is a thrown error (reconciliation path only). Tests: timeout-after-effect -> UNKNOWN (not FAILED, not retried).
4. `orca_approval.js` — approval binds to EXACT proposal (principal, proposal digest sha256 of canonical args, operation, arguments, target, scope, expiration, preconditions). Changed proposal -> stale (digest mismatch = throw). Single-writer resume CAS. Red-team hardening: argument smuggling via cached grants impossible (test), self-approval impossible (test), revocation checked at execution not just grant time (test).
5. `orca_capability_gate.js` — per-call capability check interface against the existing CapabilityAuthority (call it, do not reimplement); default deny; ambiguous denial.

## Shared contract (from impl-state lane checkpoint + mechanism map)
- Record 8: OUTCOME_UNKNOWN is a unique durable terminal value, never empty/omitted; effect outcomes SUCCEEDED/FAILED/OUTCOME_UNKNOWN.
- tenant_id mandatory on durable records (O-1 hardening).
- Approval record shape per mechanism map record 11: scope fingerprint, tiered/argument-bound grants, policy-version-bound, revocable, single-writer resume CAS with responder provenance, answers are evidence events.

## Progress log
- 19:35 MDT: checkpoint created; mechanism map (records 4,8,10,11,16) + impl-state contract absorbed; plan set.
- ~20:45 MDT: C3 state-recovery fold-in complete (all 4 findings checked
  read-only against feature/orca-autonomy @ ae55b77ff): (1) fencing TRUE_GAP
  (zero fencing-token hits; verifyResultEnvelope has no attempt comparison;
  delegation path has attempt-scoped rendezvous + refuse-redispatch
  mitigations; mission layer inherits the hole); (2) reclaim cap CLOSED on
  delegation path (MAX_ATTEMPTS=2), TRUE_GAP on the mission layer (branch
  delegates reapExpiredLeases untouched); (3) OUTCOME_UNKNOWN TRUE_GAP on
  branch, closed-by-design in orca_outcomes.js; (4) 6a342dd27 present on
  branch, e02960f0f/f4bf5304a absent (fencing -> HS-4; bridge -> out of
  lane). Written to GAP-ANALYSIS.md.
- ~20:50 MDT: ORCA-A harvest specs HS-1..HS-6 recorded in implementation
  backlog (GAP-ANALYSIS.md) with binding caveats: fencing is
  detect-not-prevent (epoch checks must be on the write path); zero
  production callers on orca_run_record.js; never copy the file-CAS shape
  (H3b); HS-5 held on U2 (Nolan's wedged-holder policy call). Lane build
  shape: staged additive modules/specs in /home/nolan/ping-orca-safety only;
  /home/nolan/ping never touched; no merges without parent's call.
- PENDING (original build): transfer staged modules to Pig worktree,
  `node --test lib/orca/test/` on the Pig, write SAFETY-LAYER.md, commit on
  orca-finish/safety. Staged: 5 modules + 5 test suites under
  ~/workspace/orca-finish/wave2/impl-safety/staging/.
