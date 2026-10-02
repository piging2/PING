# Backend forensic questions: execution identity, intent identity, namespace model

**Update 2026-09-17:** Questions 1 and 2 are DECIDED by Nolan. They remain recorded here for their evidence; their status is now approved architecture. Question 3 (namespace model) remains open.

These are backend questions, not UI decisions. The UI must not answer them
by inventing identity. Each section states the evidence, the gap, and the
precise question for the runtime owners.

## 1. Does PING need a first-class execution/run identity?

**Status: DECIDED (Nolan 2026-09-17). See docs/decision-execution-identity-2026-09-17.md.** Answer: YES. MissionRuntime at assign() owns it, derived from IdentityAuthority. Execution identity is DIRECTION, awaiting runtime implementation.

**Evidence.** `ping-overnight/drift-sources/mission_runtime.js.live-20260917`
(live capture of `/app/ping-runtime/orchestration/mission_runtime.js`,
Oracle host, 2026-09-17):

- Canonical identity is `mission_id`, deterministic:
  `hash(missionType:event_id)` when `event_id` is present.
- Execution attempts are represented implicitly:
  - status transitions: `created -> assigned -> running -> completed | failed | retry_pending`
  - `assigned_to` (worker name), `claimed_at`, `lease_until` (60s),
    `retries` (attempt counter), `retry_at` (backoff gate).
  - `failWithRetry()` increments `retries`, sets `retry_pending` + `retry_at`.
  - `reclaimRetryPending()` moves due retries back to `created` and NULLs
    `assigned_to`, `claimed_at`, `lease_until`, `retry_at`.
- No `run_id`, `execution_id`, or `attempt_id` column or field exists.
- `correlation_id`: read from `ping_events.metadata->>'correlation_id'`,
  falling back to the triggering `event_id` itself. UnifiedEventRuntime
  defaults `correlation_id` to the event id when absent.

**What this means.** An execution attempt is currently identifiable only as
`(mission_id, retries)` and only while the row still carries that state.
Once `reclaimRetryPending()` clears the claim fields, the failed attempt's
identity survives only through whatever events were emitted during it (if
any) plus the monotonically increasing `retries` counter. The row is
reused for the next attempt.

**The question.** Is `(mission_id, retries)` sufficient as execution
identity, given that:
- attempt-level evidence lineage ("which evidence came from attempt 1 vs
  attempt 2") requires joining events by emitted-during timestamps, and
- a replay or witness of a specific attempt has no stable identifier to
  name?

If not, the narrowest owner is the authority that records an execution
attempt (MissionRuntime at `assign()` time), not the UI, not the browser,
not the scheduler. The UI may only project a run identity the runtime
owns. Do not overload `correlation_id` unless source evidence proves
semantic identity; today it is a causal label that defaults to an event
id, not an attempt identity.

**Status:** DIRECTION. The UI Run schema exists but must remain
gap-labeled until the runtime answers this.

## 2. Is "intent" one canonical object?

**Status: DECIDED (Nolan 2026-09-17). See docs/decision-intent-ontology-2026-09-17.md.** Answer: NO, do not union. Action-level intent_id and the pass/run aggregate are distinct concepts: EXECUTION -> INTENT(S) -> ACTION(S) -> RESULT -> EVIDENCE. The hypothesis that action-truth run_id corresponds to the new execution identity is under investigation, not decided; do not rename.

## 3. What is the actual namespace model?

**Evidence.**

- POST /events validates namespace syntax only. A valid-but-unauthorized
  explicit namespace is still accepted. Per-principal namespace ACLs are a
  P0 platform gap (UI_HARVEST_SPEC_2026-09-17.md:536).
- TenantRegistry is "in active development" (UI_HARVEST_SPEC:522).
- tenant.ping.v1.json does not exist. The UI does not author tenant
  identity.

**The question.** For each of principal / tenant / namespace / workspace /
business / operator: what is it, what owns it, and where is entitlement
enforced today? Specifically:
- Is tenant an identity or a policy container?
- Is namespace an isolation boundary or a routing label? (Today: label.)
- Is workspace subordinate to namespace?
- Can a principal access multiple namespaces?
- Where would per-principal namespace entitlement be enforced once it
  exists?

Until enforcement is empirically proven, no UI surface may imply tenant
isolation. Namespace syntax validation is not entitlement.

**Status:** UNPROVEN (DIRECTION for the model itself; the enforcement gap
is a backend P0).
