# Autonomy Envelope

The autonomy envelope is the machine-readable document that bounds what the Facebook slice may do without human involvement. It is authored by Nolan, validated by `si_fb_envelope.py`, and enforced by the orchestrator, scheduler, and watchdog on every pass. The envelope is policy as data: changing behavior means changing the envelope, never editing code under pressure.

## Envelope schema

```json
{
  "tenant": "ping-social",
  "actor": "pigi-operator",
  "authorized_accounts": ["ping.social.page"],
  "acting_account": "ping.social.page",
  "allowed_platforms": ["facebook"],
  "allowed_capabilities": ["like", "comment"],
  "allowed_action_types": ["like", "comment"],
  "prohibited_targets": [],
  "namespace_scope": "facebook:ping-social",
  "execution_budget": {
    "window_sec": 7200,
    "base": {"like": 75, "comment": 20},
    "ramp_per_week": {"like": 5, "comment": 3},
    "ramp_anchor": "2026-09-08"
  },
  "concurrency_budget": {"max_concurrent_dispatches": 1},
  "relationship_budget": {"max_touches_per_relationship_per_30d": 2, "window_days": 30},
  "platform_budget": {"max_passes_per_day": 6},
  "temporal_constraints": {"min_seconds_between_passes": 7200, "pass_window": "2h"},
  "confidence_requirements": {"min_identity_confidence": 0.5},
  "verification_requirements": {"read_after_write": true, "observer": "orchestrator"},
  "retry_policy": {"max_attempts_per_target": 2,
                   "retry_only_after_proven_no_effect": true,
                   "cooldown_sec": 3600},
  "maximum_failure_rate": 0.2,
  "maximum_unknown_rate": 0.1,
  "circuit_breaker_policy": {
    "scopes": ["action", "account", "adapter", "platform", "tenant"],
    "observation_window_sec": 86400,
    "verification_failure_threshold": 3,
    "negative_feedback_threshold": 5,
    "cooldown_sec": 3600
  },
  "learner": {"stage": "SHADOW",
              "bounds": {"batch_size": [1, 20],
                         "candidate_rank_weight_recency": [0.0, 1.0]}}
}
```

## What each section constrains

- **authorized_accounts / acting_account.** The only Facebook identity the slice may act as. `NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT` refuses anything else, and the authority gate must independently return AUTHORITY-ALLOW.
- **allowed_platforms / allowed_capabilities / allowed_action_types.** Facebook, like and comment only. Anything else (share, follow, DM) fails closed at eligibility (`CAPABILITY_MISSING`) and at intent creation.
- **prohibited_targets.** Always-checked denylist, in addition to the guard's blocked-businesses and corridor data.
- **execution_budget.** Per-2h-pass ceilings. The effective budget is deterministic: `base + ramp_per_week * full_weeks_since(ramp_anchor)`. The ramp is constitutional arithmetic in `si_fb_envelope.py`; the learner cannot raise it, the orchestrator cannot exceed it, a failed pass never lowers it (retry, never lower caps, per standing policy).
- **concurrency_budget.** One dispatch at a time (the dispatch lease enforces it).
- **relationship_budget.** Max touches per relationship per 30 days. Exhaustion drops the candidate with a saturation reason; it is never an error.
- **temporal_constraints.** Minimum 7200 seconds between passes; the scheduler enforces the cadence.
- **confidence_requirements.** Minimum identity confidence 0.5. Below it the candidate is dropped, never dispatched on a guess.
- **verification_requirements.** Read-after-write by the orchestrator. Non-negotiable; `NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION`.
- **retry_policy.** At most 2 attempts per target, and only after read-back proves no effect. The uncertain intent is never re-executed; the retry is a fresh intent lineage.
- **maximum_failure_rate / maximum_unknown_rate.** Watchdog trip thresholds over the observation window.
- **circuit_breaker_policy.** Scopes, window, thresholds, cooldown. Breakers open on verification-failure count, negative-feedback spikes, or rate breaches; they auto-close after cooldown plus a probe pass.
- **learner.** Stage SHADOW with fixed bounds. The learner may propose within bounds; nothing in the slice applies its output to policy (proven by test: no apply path exists in code).

## Validation (machine-enforced, fail-closed)

`si_fb_envelope.py validate` rejects an envelope that: names a platform outside `["facebook"]`, allows an action type outside `["like", "comment"]`, lists an acting account not in authorized_accounts, has non-positive budgets, has an empty ramp anchor, or sets the learner stage to anything but SHADOW. The orchestrator and scheduler refuse to run against an invalid envelope.

## What replaces per-action approval

| Old world (per-action approval) | This slice (machine enforcement) |
|---|---|
| Human reads each candidate | Deterministic `eligibility_check()` + decision record with full reason |
| Human approves the spend | Atomic budget consume before intent creation; ramp is arithmetic |
| Human watches the run | Watchdog rates + breakers + safe mode, all automatic |
| Human handles the freeze | `holds.json` via set-hold.py; dispatch-time authority recheck lands it within one intent |
| Human retries failures | Reconcile-not-replay: read-back recovery, never blind retry |
| Human judges success | Orchestrator read-after-write verification; adapter claims never count |

## Change control

The envelope is changed by Nolan only, as a document edit, validated before use. The machinery never edits the envelope. `si_fb_envelope.py update` is the only writer path and it refuses to widen learner bounds or set a non-SHADOW stage. Every pass records the envelope hash with its decision records, so any behavior change is attributable to an envelope version.
