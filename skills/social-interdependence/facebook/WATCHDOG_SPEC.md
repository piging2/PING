# Watchdog Spec

`si_fb_watchdog.py` is the slice's automatic supervision. It watches rates and signals over an observation window and opens circuit breakers when the machinery is degrading. It can only stop mutations; it can never start them, grant authority, or change the envelope.

## What it computes (every tick)

Over `circuit_breaker_policy.observation_window_sec` (default 86400s), from the append-only streams:

1. **Failure rate** = terminal failures / terminal intents. Breach: `maximum_failure_rate` (default 0.2).
2. **Unknown rate** = intents ending UNKNOWN / terminal intents. Breach: `maximum_unknown_rate` (default 0.1). A rising unknown rate means the platform is flaky or the adapter is lying by omission.
3. **Verification failures** = count of `verification_failure` events (adapter evidence contradicted by read-after-write). Breach: `verification_failure_threshold` (default 3). Three lies and the breaker opens.
4. **Budget anomaly** = consumed vs effective budget drift (consumed exceeding the deterministic budget, or consumption with no corresponding intents).
5. **Negative-feedback spike** = acted posts flagged `negative_feedback`, scanned from the adapter's post store. Breach: `negative_feedback_threshold` (default 5). A spike means the engagement is unwelcome; the platform breaker opens. This is a platform flag, not a prose judgement, and per standing policy it is the one signal that scales back activity.

## Breaker scopes

`action:facebook:<like|comment>`, `account:<account>`, `adapter:facebook`, `platform:facebook`, `tenant:<tenant>`. A breaker opens at the narrowest scope that explains the signal: verification failures open the adapter scope; negative feedback opens the platform scope; rate breaches open the action scope first and escalate on repeat.

An open breaker refuses dispatch BEFORE the adapter is touched (`NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN`). The refusal is recorded as a transition to DEFERRED with the breaker identity as evidence.

## Auto-close (no human needed)

A breaker auto-closes after `cooldown_sec` (default 3600) AND one successful probe pass: the watchdog (or the next scheduled pass, if admitted) runs a single intent through the full gate chain; only a VERIFIED_SUCCESS closes the breaker. A failed probe re-opens it with the cooldown doubled. There is no manual close path: a human cannot close a breaker by assertion, only the probe's observed success closes it.

## Safe mode

Independent of breakers: when identity, policy, capability, event persistence, or verification is unavailable, the slice enters safe mode. Reads continue (evaluation, verification, reconcile); new mutations stop (`NO_MUTATION_WHEN_SAFE_MODE`). Safe mode needs no human to decide; it is the default on infrastructure unavailability. The scheduler refuses to start passes in safe mode; in-flight intents defer.

## What the watchdog never does

- Never grants authority or overrides a hold. A hold in `holds.json` stops dispatch regardless of breaker state.
- Never dispatches, retries, or resumes intents. Recovery is the reconciler's job.
- Never edits the envelope, budgets, or thresholds. It reads them.
- Never deletes or rewrites evidence. Every tick appends its computed rates and any breaker action to `watchdog.jsonl`.

## Tick output

JSON: computed rates, threshold comparisons, breaker actions taken (opened/closed/probe-scheduled), safe-mode status, and the evidence references (stream offsets) behind each number. Every number is reproducible from the streams.
