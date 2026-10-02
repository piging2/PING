---
name: instagram
description: Autonomous Instagram engagement (like and comment) for the Social Interdependence Skill. Gate-checked, budget-bounded, guard-filtered, verified, and recoverable without human approval per action. Every state transition is evidence-logged; UNKNOWN never dispatches; replay is decision replay, never mutation replay.
---

# Instagram platform skill: social-interdependence/instagram

Autonomous Instagram engagement for account `nolanpigi`. The skill plans
like/comment intents, executes them through a dumb adapter, verifies every
mutation with an independent read, and recovers from crashes without ever
re-executing an intent whose external effect is unknowable.

Human approval is not required per action. It is replaced by machine
machinery: an authority gate, a real eligibility guard, budgets, leases,
circuit breakers, a watchdog, and a verify-before-canonicalize rule. The
watchdog may stop, defer, or roll back work; it may never grant authority.

## The one gate (binding)

Run `authority-check.py instagram` BEFORE any instagram-cli or Pig traffic,
on every pass, at build time and at dispatch time. Under DENY nothing runs.
In this skill the gate is `bin/siig_guard.py authority_check()`, called at
the top of `build_pass()` and `execute_pass()`. It raises `AuthorityDenied`
on anything but `AUTHORIZED`, including missing or invalid `holds.json`
(fail closed). There is no prose freeze: `holds.json` is the only hold
surface, and the setter is the only writer.

## The one guard (binding)

`~/workspace/outreach/engagement-guard.py` is the single deterministic
eligibility function for all platforms. This skill imports its CODE from
the real tree (single copy, never forked) and reads its DATA from the live
tree in production. `ENGAGEMENT_GUARD_DIR` redirects the data tree only for
tests. `engagement-guard.py curate` stamps a tamper-evident per-action
envelope (sha256 over the canonical evidence body, 6h TTL) at plan time;
`dispatch_refilter` re-evaluates the full reason set live at dispatch time
and refuses missing, tampered, or stale envelopes. UNKNOWN from the guard
means do not dispatch.

TASTE IS NOT ELIGIBILITY (binding): subjective ranking lives in the
decision layer above eligibility, never in the guard data files.

## Operating procedure

One pass has four phases. Each is a real function in `bin/siig_executor.py`
and each is independently runnable from `bin/si-ig.py`.

1. **Plan** (`build_pass`): authority gate, account identity check
   (`nolanpigi` only), safe-mode check, discovery, per-candidate
   normalization (handle plus header plus body haystack; country precision
   gate; prohibited targets), guard plan filter, budget reservation,
   decision record, intent persistence, scheduling. Produces durable
   intents in `INTENT_CREATED` then `QUEUED` then `SCHEDULED`.
2. **Execute** (`execute_pass`): authority gate again, re-schedule,
   per-intent dispatch refilter (live guard re-evaluation plus evidence
   verification), lease acquisition (one executing worker per account),
   dispatch, attempt, verification read. Human pacing 60-120s between
   actions. Budgets: 50 likes + 12 comments per 2h pass, weekly ramp
   +5/+3 from the 2026-09-26 epoch; a failed pass is retried, caps are
   never lowered.
3. **Reconcile** (`reconcile`): crash recovery. Stranded intents are
   resolved by verification READS against platform state, never by
   re-execution. `DISPATCHED` stranded means the adapter was never
   invoked, so re-dispatch is safe; `ATTEMPTING`/`VERIFYING` stranded
   means the effect is unknowable, so the intent becomes `UNKNOWN` and
   resolves only when a read proves the outcome.
4. **Verify** (`verify_pass`): cross-checks the guard's own history
   against the intents the skill claims as `VERIFIED_SUCCESS`. A mismatch
   is an invariant violation, surfaced, never papered over.

Never-reengage is per ACCOUNT: an off-limits list per handle, including
posts engaged long ago and posts engaged on other passes.

## What the adapter may and may not do

The adapter (`bin/siig_adapter_contract.py`) is deliberately dumb: four
calls (`get_identity`, `discover`, `execute`, `read_state`), no decisions,
no eligibility, no budget, no state. It reports outcomes and platform
signals (checkpoint, action-limited, auth-expired, outage, timeout) and
the executor decides. A lying adapter is caught by the verification read:
claim without effect is `adapter-truth-mismatch`, bounded retries, then
`FAILED_TERMINAL`. Never a false `VERIFIED_SUCCESS`.

## Files

- `bin/`: the real machinery (executor, states, guard binding, budgets,
  leases, breakers, decisions, verify, watchdog, learner, relationship,
  adapter contract, CLI).
- `fixtures/fixture_ig_adapter.py`: the ONLY mock in the skill. It stands
  in for instagram-cli/Pig CDP at the adapter boundary because live
  external execution is blocked (no credentials in this environment).
  Every other component is real.
- `tests/`: 33 tests, all passing, all running against scratch trees.
- `schemas/`: JSON Schema for the autonomy envelope, intent,
  decision record, and evidence package.
- `references/`: evidence index with paths and digests.
- `state/`: runtime state dir (created on first run; never committed
  with live data).
- `docs/`: this file plus ARCHITECTURE, AUTONOMY_ENVELOPE,
  STATE_MACHINE, CAPABILITY_MATRIX, RECOVERY_PROTOCOL, WATCHDOG_SPEC,
  EVAL_PLAN.

## Stop conditions (the skill stops itself)

- Authority gate not `AUTHORIZED`: everything stops, `AuthorityDenied`.
- Safe mode: identity unavailable, capability matrix disallows the
  action, or budgets unreadable. Reads may continue; new mutations stop.
- Circuit breaker open on any scope (action, account, adapter, platform,
  tenant): intents defer, no execution after an open breaker.
- Watchdog stop: failure rate above the envelope maximum, budget anomaly,
  or negative-feedback spike. The stop is recorded; a later pass with a
  clean record may resume.
- `UNKNOWN`: the intent waits for a recovery read. It never dispatches
  on unknown.

## Live status

LIVE EXTERNAL EXECUTION: BLOCKED. No credentials exist in this build
environment; the Pig CDP route and instagram-cli are unreachable from
here. The fixture adapter proves the machinery end to end; swapping in
the live adapter is a boundary change only (implement the four calls
against instagram-cli/Pig CDP, keep the dumb-adapter contract).
