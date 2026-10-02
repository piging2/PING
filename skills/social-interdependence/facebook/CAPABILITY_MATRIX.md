# Capability Matrix

What the Facebook slice can and cannot do, on which authority, through which mechanism. Anything not listed here is refused.

## Capabilities

| Capability | Authority | Mechanism | Notes |
|---|---|---|---|
| like a post | Envelope (allowed_action_types) + guard ELIGIBLE + authority ALLOW | Orchestrator -> adapter -> Pig CDP (prod) / fixture (test) | Ceiling 75 + 5/week per 2h pass |
| comment on a post | Same as like | Same as like | Ceiling 20 + 3/week per 2h pass; content from candidate text only |
| read a post's state | Always (read-only) | Adapter read / orchestrator verification read | Safe in safe mode; never mutates |
| evaluate a candidate | Envelope confidence requirements | Real `eligibility_check()` | UNKNOWN never dispatches |
| consume budget | Envelope execution_budget | Atomic `budget_consume` (flock) | Consumed before intent creation |
| acquire dispatch lease | Concurrency budget | `lease_acquire` with TTL | One dispatch at a time |
| open a circuit breaker | Watchdog thresholds | `si_fb_watchdog.py` | Auto-close after cooldown + probe |
| enter safe mode | Health check | Orchestrator/scheduler | Reads continue, mutations stop |
| reconcile a crashed pass | Always | `si_fb_reconcile.py` | Read-back only, never replay |
| record decisions/observations | Always | Append-only JSONL | Never overwritten |

## Explicitly NOT capabilities

| Attempt | Refused by |
|---|---|
| share, follow, DM, post, invite | Guard `CAPABILITY_MISSING` (facebook = like + comment only); envelope validation |
| Acting as any account but the envelope's acting_account | `NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT` + authority gate |
| Dispatching on a prose instruction | `NO_PROSE_AUTHORIZES_OR_FREEZES`: only the machine-readable chain authorizes |
| Declaring success from adapter output | `NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION`: orchestrator read-after-write only |
| Re-executing an UNKNOWN intent | `NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION`: read-back first, always |
| Exceeding budget, ramp, or cadence | Atomic budgets, deterministic ramp formula, scheduler cadence |
| Learner changing policy | `NO_LEARNER_POLICY_SELF_MODIFICATION`; learner is SHADOW with no apply path |
| CAPTCHA solving, rate-limit evasion, detection evasion | Not implemented, not representable in the envelope, refused by design |
| Live external execution from this environment | BLOCKED: no credentials; Pig CDP unreachable from here |

## Production adapter contract (Pig CDP)

The production adapter implements the same contract the fixture implements:

- `read(post_id)` -> `{exists, liked, like_count, comments, negative_feedback}`. Read-only.
- `execute({action, target_ref, content})` -> raw evidence `{attempted, external_mutation_made, observed, note}`. Never declares canonical outcomes.
- Like path does the idempotent pre-read (checks Unlike state first), mirroring `staged/engage.js`.
- On platform checkpoint/abort signals: stop, report, no mutation committed.
- On expired credential: report logged-out, `attempted: false`, no mutation attempted.
- Every adapter record is self-checked against `NO_ADAPTER_DECISION_AUTHORITY` before return.

The fixture (`si_fb_adapter.py`) is the only fake in the system, and it exists only at this boundary. Eligibility, authority, envelopes, budgets, leases, the state machine, the watchdog, and recovery are all real code exercised by the tests.

## Corridor and eligibility data (single copies, never forked)

The guard reads the single copies under `~/workspace/outreach/eligibility-data/`: corridor.json (16 in-groups; CO BizNet and other out-groups excluded), blocked-businesses.json, precedent-registry.json, action-capability.json. Tests copy them into scratch and never write back. The slice adds no eligibility data of its own.
