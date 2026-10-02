# MC-3 tenant-authority boundary: empirical verification — 2026-09-27 ~15:35 MDT

Subagent: backlog-burn (parent: main agent). Falsification against the
real `mi.submit` (scratch journal, FakeExecutor, hermes constraints).

## Claims tested (from the submit() docstring + MC-3 design)

1. "The tenant is derived from the AUTHENTICATED context (auth_ctx),
   never from the request body: a body tenant that disagrees is
   refused."
2. "The agent must be entitled to the tenant (fail closed)."

## Results

1. Intent body `tenant='evil-tenant'` + `auth_ctx` tenant
   `'good-tenant'` → `IntentValidationError`: "intent body tenant
   'evil-tenant' disagrees with authenticated tenant 'good-tenant':
   the body tenant is never trusted." REFUSED. OK.
2. Intent body `tenant='other-tenant'` + `auth_ctx` tenant
   `'good-tenant'` (entitled only to good-tenant) → refused
   (IntentValidationError/IntentAuthorizationError). OK.
3. Body `tenant='good-tenant'` + matching auth_ctx → `dispatched`,
   executor called exactly once. OK.

All three hold. The tenant-authority boundary is ENFORCED, not just
designed. This grounds the MC-3 design doc (mc3-tenant-authority-design)
in verified behavior for the submit path.

Note: this is the same boundary the MC-H7 defect (dispatch-time
revocation check) violates from the other direction — submit()'s
tenant scoping is correct; dispatch()'s mid-flight recheck is not.

## Constraints observed

Ephemeral scratch only (/tmp). No workspace modifications, no live
journal, no Pig, no :3100/:3200, no HPP contact.
