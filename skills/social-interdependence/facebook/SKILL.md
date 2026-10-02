---
name: facebook-autonomous-engagement
description: Autonomous Facebook engagement slice (likes and comments) for PING Social. Machine-enforced autonomy envelope, deterministic eligibility, durable intents, read-after-write verification, reconcile-not-replay recovery. No per-action human approval; invariants and gates replace it.
---

# Facebook Autonomous Engagement Slice

This is the executable operating procedure for autonomous Facebook engagement (likes and comments on local business posts) under the social-interdependence skill. It assumes Nolan's standing authorization for autonomous legitimate engagement within the envelope. There is no per-action human approval on the ordinary path. What replaces it is machine-enforced machinery: the authority gate, the deterministic eligibility function, the tamper-evident envelope, the invariant checks, the dispatch lease, the read-after-write verification, the watchdog, and the recovery protocol. Each is code, not prose.

## The one-paragraph contract

Every pass: the scheduler decides whether a pass may start. The orchestrator evaluates candidates with the single deterministic eligibility function, records a decision record, stamps a tamper-evident envelope, and persists a durable intent BEFORE any external effect. Dispatch re-verifies the envelope, re-evaluates eligibility live, re-checks authority, and takes the dispatch lease. The adapter (the only fixture; the production adapter drives the Pig CDP browser) executes and returns raw evidence. The orchestrator verifies by reading external state itself. Success is declared only on observed effect. Crashes recover by reading state, never by replaying mutations. The watchdog watches rates and opens breakers. Every step appends evidence; nothing is overwritten.

## Operating commands

All commands run from this directory. State lives in `$SI_FB_STATE` (defaults to `./state`, never the production outreach tree). Every command below was exercised by the test suite in `tests/`.

```bash
# 1. Validate the autonomy envelope (fails closed on any violation)
python3 bin/si_fb_envelope.py validate --envelope <envelope.json>

# 2. Scheduler tick: decides whether a pass may start (authority, health,
#    cadence, lease, breakers, budget headroom). Prints pass_started bool.
python3 bin/si_fb_scheduler.py tick --envelope <envelope.json>

# 3. Run one pass over a candidate file
python3 bin/si_fb_orchestrator.py run --envelope <envelope.json> \
    --candidates <candidates.json> --batch-id <batch-id>

# 4. Resume an interrupted batch (reconcile first)
python3 bin/si_fb_reconcile.py run
python3 bin/si_fb_orchestrator.py resume --envelope <envelope.json> \
    --batch-id <batch-id>

# 5. Watchdog tick: rates, breakers, safe mode
python3 bin/si_fb_watchdog.py tick --envelope <envelope.json>
```

## Pass lifecycle

1. **Schedule.** `si_fb_scheduler.py tick` checks, in order: authority gate (authority-check.py, AUTHORITY-ALLOW for surface=facebook), health (identity/policy/capability/event-persistence/verification), safe mode, 2h cadence since the last pass, the pass lease (one pass at a time), circuit breakers, budget headroom. Any failure: no pass, reason printed as JSON. The scheduler never grants authority; it only reads it.

2. **Evaluate.** For each candidate the orchestrator runs the REAL `eligibility_check()` from `~/workspace/outreach/engagement-guard.py` (the single deterministic eligibility function; UNKNOWN means do not dispatch). It records a decision record with the full contract fields (candidate_id, actor, target, relationship, content, platform, action_candidates, identity_confidence, relationship_context, evidence, capabilities, policy_result, budget_result, materiality, uncertainty, saturation, outcome_history, decision, reason). No opaque scores; the reason is the audit trail.

3. **Intend.** For `proceed` decisions the orchestrator stamps the tamper-evident eligibility envelope (sha256 over the canonical body, 6h TTL, data digests) and appends a durable intent with a deterministic id (`facebook:<action>:post:<id>:<batch_id>`). Budget is consumed atomically BEFORE intent creation. The intent exists before any external effect.

4. **Dispatch.** Per intent: re-verify the envelope (refuse missing/tampered/stale), re-evaluate eligibility live against current data (the envelope is evidence, not the decision), re-check authority (a hold or revocation lands within one intent, not one pass), assert the circuit breakers are closed, acquire the dispatch lease (one intent dispatches at a time). Any failure: fail closed, no adapter contact.

5. **Execute.** The adapter executes and returns RAW evidence only (`attempted`, `external_mutation_made`, `observed`, `note`). It never declares canonical outcomes. The adapter is the only fixture in the test environment; in production it drives the Pig CDP browser with the idempotent like pre-read.

6. **Verify.** The orchestrator reads external state itself (read-after-write, observer=orchestrator). VERIFIED_SUCCESS requires `observed_effect is True`. A lying adapter is caught here and counted as a verification failure. Anything else is FAILED_RETRYABLE, FAILED_TERMINAL, or UNKNOWN.

7. **Recover.** `si_fb_reconcile.py` reconciles crashed passes: it requeues intents that never dispatched, recovers in-flight intents by reading external state, releases dead leases. `resume` then re-drives non-terminal intents. Recovery is reconcile-not-replay: an uncertain mutation is never re-executed; UNKNOWN resolves by read-back (effect present: VERIFIED_SUCCESS; absent: SAFE_RETRY with fresh lineage; unreadable: stays UNKNOWN).

8. **Watch.** `si_fb_watchdog.py` computes failure rate, unknown rate, verification-failure rate, budget anomalies, and negative-feedback spikes over the observation window. Breaches open circuit breakers (action/account/adapter/platform/tenant scopes). Breakers auto-close after cooldown plus a probe pass. The watchdog never grants authority.

## What the human still decides

- The autonomy envelope itself (budgets, ramp, breakers, thresholds). Created and changed by Nolan; the machinery only enforces it.
- Holds and freezes: `set-hold.py` is the only writer of `holds.json`. A hold stops the next dispatch within one intent.
- Capability authorization: `AUTHORITY.json` (surface status, capability authorized). The gate reads it; nothing else grants it.
- Anything outside the envelope: new action types, new platforms, new accounts, budget increases. All refused by invariant until the envelope changes.

## What the machine decides alone

Everything inside the envelope: which eligible candidates to act on, in what order, when to retry, when to defer, when to open a breaker, when to enter safe mode. No per-action approval exists on this path by design.

## Safety invariants (all machine-enforced, all tested)

See `bin/si_fb_invariants.py` for the code and `tests/test_invariants.py` for the proofs. The catalog: NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT, NO_DUPLICATE_ACTIVE_INTENT (per intent_id AND per target, cross-batch), NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION, NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION, NO_LEARNER_POLICY_SELF_MODIFICATION, NO_ADAPTER_DECISION_AUTHORITY, NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN, NO_PROSE_AUTHORIZES_OR_FREEZES, NO_DISPATCH_WITHOUT_ENVELOPE, NO_DISPATCH_TRUSTS_ENVELOPE_ALONE, NO_MUTATION_WHEN_SAFE_MODE, ILLEGAL_STATE_TRANSITION.

## Current limits (honest)

- LIVE EXTERNAL EXECUTION: BLOCKED. No credentials exist in this environment and the Pig CDP endpoint is unreachable from here. All execution tests run against the boundary fixture. The production adapter contract is specified in CAPABILITY_MATRIX.md.
- The learner is SHADOW: it may propose within bounds; nothing applies its output to policy. Proven by test (no apply path in code).
- Replay is decision replay: the transition stream replays what was decided and why. Mutations are never replayed.
