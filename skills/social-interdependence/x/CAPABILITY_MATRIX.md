# Capability Matrix

X capabilities consumed by this skill, with their authorization and
idempotency properties. Capabilities come from `action-capability.json`
and AUTHORITY.json; the skill consumes them and re-checks them live at
dispatch time (a stale capability file fails the candidate closed, see
tests/test_05_adversarial.py).

## Matrix

| Capability | Authorized | Idempotent | Notes |
|---|---|---|---|
| x.like | yes | yes | Bounded retry allowed, but only after a verification read positively shows absence. No like CLI in xapi.py; issued through the adapter contract. |
| x.follow | yes | yes | X is the only platform with follow in the capability set. Bounded retry allowed under the same rule as like. |
| x.comment | yes | no | Non-idempotent: a timeout after dispatch is FAILED_TERMINAL, never silently retried. |

## Authorization checks

1. Envelope: the action must be in `allowed_action_types` and the
   capability in `allowed_capabilities`.
2. Live file: `action-capability.json` must still list the capability
   for x at dispatch time (stale data -> CAPABILITY_MISSING, reject).
3. Account: only `authorized_accounts` (ping_social); anything else
   raises NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT.
4. Guard: `eligibility_check()` must return ELIGIBLE at evaluation,
   and the pass re-evaluates nothing on trust: every candidate is
   evaluated live in the pass that would dispatch it.

## Platform restrictions honored

- 429 (rate limited): hard stop for the scope, recorded on the action
  circuit, never a reroute.
- 401/403: auth-shaped rejection. Open the adapter circuit, defer the
  intent, record an auth incident. A 401/403 is a question about the
  request before the key.
- No CAPTCHA solving, no detection evasion, no randomness for pacing
  (the skill uses no jitter), no unauthorized accounts.
