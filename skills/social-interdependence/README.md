# Social Interdependence Skill

Autonomous social engagement for PING Social: observe, decide, schedule, execute, verify, recover, learn, and continue operating without per-action human approval. One self-contained deliverable per platform operation.

## Platform deliverables

| Platform | Deliverable | Status |
|---|---|---|
| Facebook | [facebook/](facebook/) | Built, 121/121 tests green |
| Instagram | [instagram/](instagram/) | Built, 33/33 tests green (3 consecutive runs) |
| Threads | [threads/](threads/) | Built, 28/28 tests green |
| X | [x/](x/) | Built, 134/134 checks green (8 suites) |
| TikTok | [tiktok-HELD.md](tiktok-HELD.md) | HELD by tripwire; no active loop |

Each platform directory is self-contained: SKILL.md (executable operating procedure), ARCHITECTURE.md, AUTONOMY_ENVELOPE.md, STATE_MACHINE.md, CAPABILITY_MATRIX.md, RECOVERY_PROTOCOL.md, WATCHDOG_SPEC.md, EVAL_PLAN.md, plus schemas/, tests/, fixtures/ (adapter-boundary fakes only), references/.

## What replaces the human

Per-action human approval is replaced by machine-enforced machinery, identical in shape on every platform:

constitutional invariants + PolicyAuthority + CapabilityAuthority + IdentityAuthority + stable intent identity + idempotency + budgets + leases + read-after-write verification + evidence + replay + circuit breakers + watchdogs + bounded self-improvement + automatic rollback.

The human keeps: envelope issuance/revocation, ceiling changes, hold clearing, first-contact decisions. Nothing else in the ordinary path.

## Cross-platform contract (all four builders held this)

- `intent_id`: `<platform>:<action>:<target_ref>:<batch_id>`
- States: DISCOVERED, NORMALIZED, EVALUATED, ELIGIBLE, REJECTED, INTENT_CREATED, QUEUED, SCHEDULED, DISPATCHED, ATTEMPTING, UNKNOWN, VERIFYING, VERIFIED_SUCCESS, VERIFIED_NOOP, SAFE_RETRY, DEFERRED, FAILED_RETRYABLE, FAILED_TERMINAL, CANCELLED
- AutonomyEnvelope fields: tenant, actor, authorized_accounts, allowed_platforms, allowed_capabilities, allowed_action_types, prohibited_targets, namespace_scope, execution_budget, concurrency_budget, relationship_budget, platform_budget, temporal_constraints, confidence_requirements, verification_requirements, retry_policy, maximum_failure_rate, maximum_unknown_rate, circuit_breaker_policy
- Decision record: candidate_id, actor, target, relationship, content, platform, action_candidates, identity_confidence, relationship_context, evidence, capabilities, policy_result, budget_result, materiality, uncertainty, saturation, outcome_history, decision, reason. No opaque single score as authority.
- Replay is decision replay, never mutation replay.

## Shared authorities (reused, none created)

- Eligibility: the real `~/workspace/outreach/engagement-guard.py` `eligibility_check()` (single copy, never forked). UNKNOWN never dispatches.
- Holds: `~/workspace/outreach/holds.json`, written only by `set-hold.py`; `authority-check.py` gates every build and dispatch. Prose never freezes.
- Eligibility data: `~/workspace/outreach/eligibility-data/*.json` (single copies).
- PING primitives: MissionRuntime, MissionScheduler, WorkerRuntime, CapabilityAuthority, IdentityAuthority, HashAuthority, Witness, Lineage, Replay.

## Hard constraints (all platforms)

No bypassing platform restrictions. No rate-limit circumvention. No detection evasion. No CAPTCHA/auth bypass. No unauthorized accounts. No fabricated permissions or fabricated successful execution. No silent retry of uncertain non-idempotent mutations. No rewriting constitutional authority because a metric improved. No randomness for detection evasion: scheduling variation exists for operational reasons only.

## Live vs fixture

LIVE EXTERNAL EXECUTION is BLOCKED on all four platforms from this environment (no credentials here; Pig unreachable). Fixtures exist ONLY at the adapter boundary. Everything above the adapter (eligibility, authority, intent, state machine, budgets, leases, verification, watchdog, recovery) is real code tested against scratch state. No production ledgers were touched during the build.

## Known open items

- X envelope sample ceiling (30 likes/pass) conflicts with an older "10 likes per pass" value in AUTHORITY.json; needs Nolan's reconciliation before any live X use.
- Event Authority is under forensic review: persistence-integration boundaries are marked in each deliverable, not implemented.
- TikTok stays held until the tripwire restriction flag clears.
