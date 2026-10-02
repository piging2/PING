# Autonomy Envelope - Threads Social Interdependence

The autonomy envelope is the machine-readable authorization boundary
within which the loop operates with NO per-action human approval. It
replaces the human's per-action judgment with: explicit ceilings,
deterministic eligibility, runtime invariants, verification, budgets,
leases, circuit breakers, and watchdogs. The human's remaining
authority: issuing/revoking the envelope, changing ceilings, clearing
holds, and first-contact decisions.

## Authorized surface

- Actions: like, comment (per `action-capability.json`; threads has no
  publish/like distinction problem because `publish-post` is for posts,
  not engagement).
- Accounts: `@nolanpigi` on Threads only (`NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT`).
- Ceilings mirror the authorized deployment ceilings exactly:
  **45 likes + 12 comments per rolling 2h**, pacing 60-120s between
  actions, separate browser window per scan, close after use.

## Envelope parameters (machine-enforced)

| Parameter | Value | Enforced by |
|---|---|---|
| Authorized accounts | `["nolanpigi"]` | `si_policy` invariant on every intend |
| Actions | like, comment | `CapabilityAuthority` probe against `action-capability.json`; safe mode blocks on UNKNOWN |
| Likes per rolling 2h | 45 | atomic budget consume (`si_state`) |
| Comments per rolling 2h | 45 (deployment cap 12; envelope takes the min) | atomic budget consume |
| Inter-action delay | [60, 120] s (learner may vary only inside `[60,180]`) | envelope bounds + learner bounds |
| Max failure rate | 0.10 | watchdog opens `platform:threads` breaker |
| Max unknown rate | 0.05 | watchdog opens `adapter:threads` breaker |
| Max retries per intent | 2, max age 30 min | retry policy in cycle/reconcile |
| Relationship touches per 7d per external identity | 3 | relationship ledger; eligible candidates DEFER, never force |
| Evidence TTL for decisions | 6h | guard envelopes; harness writes its own decision records per pass |

## What the human is NOT asked for

- Per-action approval. The decision record + invariants + budget +
  verification are the approval.
- Retry decisions within the retry policy (bounded, verified).
- Whether to proceed under partial failure: safe mode and the
  watchdog decide; reads continue, mutations stop when integrity is
  in doubt.

## What still requires the human (fail-closed until given)

- Issuing or revoking the envelope itself.
- Changing any ceiling (never in response to a failed pass; a failed
  pass is retried, never answered with lower caps).
- Clearing a hold (`set-hold.py --by owner`; tripwire may set, only the
  owner clears).
- First-contact decisions (e.g. Monument View: no autonomous contact
  until the product gate is green and Nolan makes first contact).
- Any new capability, any change to guard data files, any deployment
  of new worker code to the Pig.

## Safe mode (degraded autonomy, NOT a stop)

Triggered when any of: identity unavailable, policy data unreadable,
capability check UNKNOWN, event persistence unavailable, verification
unavailable. Behavior: all READ paths continue (evidence gathering,
logging); all NEW mutations blocked; in-flight intents transition to
SAFE_RETRY and are reconciled after recovery. Safe mode is itself
machine-enforced by `si_policy.probe()` at every phase.

## Bounded self-improvement

The learner may propose parameters inside `learner_bounds` only
(currently just `inter_action_delay_sec` within [60,180]). Promotion:
SHADOW -> CANARY -> ACTIVE, each gate requiring sample counts and
failure ceilings; any gate failure or any verification failure rolls
back to the last ACTIVE config automatically. The learner may never
modify the policy, the envelope, or any authority boundary
(`NO_LEARNER_POLICY_SELF_MODIFICATION`).
