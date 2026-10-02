# MC-H7-DEFECT: dispatch() revocation check drops tenant scoping — 2026-09-27 ~14:00 MDT

Subagent: backlog-burn (parent: main agent). Found by empirical
falsification of the H7 revocation path; NOT patched (file is the MC
sprint's active surface — commit 470745b "Sprint integration: front-door
+ tenant hardening", proof verdicts pending; fix queued for the sprint
owner).

## The defect (REAL, proven, cross-tenant isolation)

`mission-control/mission_intent.py:651`, inside `dispatch()`:

```python
rev = find_revocation(journal_file, intent["idempotency_key"])
```

Every other `find_revocation` call site in the file (lines 922, 1079,
1166, 1192, 1241) passes `tenant=tenant`. Only the dispatch() check —
added TODAY as "H7 defect-3 closure" ("no caller may bypass it by
calling dispatch() directly") — omits it. The defense-in-depth move
dropped the tenant scoping.

Consequence: tenant A revokes idempotency key K. Tenant B submits the
same key K. submit()'s tenant-scoped check (line 1079) correctly passes,
but dispatch()'s unscoped check finds tenant A's revocation and raises
`IntentRevokedError`. One tenant can deny another tenant's dispatch —
the exact cross-tenant effect the tenant hardening was built to
prevent, and the revoke() docstring promises ("so one tenant cannot
revoke another tenant's key").

## Proof

`mc-h7-falsify-2026-09-27.py` (real `mi.submit`/`mi.revoke`, scratch
journal):

1. Revoke K-R1 pre-dispatch → submit raises `IntentRevokedError`,
   executor_calls=0. OK.
2. Second revoke of K-R1 → idempotent, no duplicate emission. OK.
3. Tenant-a revokes K-R2; tenant-b submits K-R2 → **`IntentRevokedError:
   idempotency key 'K-R2' revoked (tenant A revoke): refusing dispatch`**
   raised from `dispatch()` line 653. DEFECT.
4. Revoke after dispatch → REVOKED_AFTER_DISPATCH classification. OK.

Direct lookup check: `find_revocation(j, 'K-X', tenant='tenant-b')`
correctly returns None for tenant-a's revocation — the lookup is fine;
only the dispatch() call site is unscoped.

## The fix (one line, for the MC sprint owner)

```python
rev = find_revocation(journal_file, intent["idempotency_key"],
                      tenant=intent["tenant"])
```

Safe: `intent = validate(intent)` runs two lines above (line 649) and
`tenant` is in REQUIRED_FIELDS, so `intent["tenant"]` is always present.
Falsification for the fix: test 3 above must dispatch for tenant-b
(`outcome: dispatched`), tests 1/2/4 unchanged.

## Status

QUEUED for the MC sprint owner (their hardening file, their verdicts
pending). Harness saved as `mc-h7-falsify-2026-09-27.py` in the ledger
directory. Not patched here per the sibling-surface ownership rule.

## Test-gap note (2026-09-27 ~14:45 MDT)

The existing H7 defect-3 tests (`RawDispatchRevocationTest`,
test_mission_intent.py:1005) do NOT cover tenant scoping — which is
exactly how this defect slipped in:

- `test_direct_dispatch_refuses_revoked_key` revokes with NO auth_ctx
  (unscoped revocation record) and dispatches a single-tenant intent.
  The unscoped dispatch check finds the unscoped revocation. Passes
  with or without the defect.
- No test revokes tenant-scoped (auth_ctx tenant-a) and then dispatches
  the same key for tenant-b expecting success.

The owner's fix should add: revoke(key, auth_ctx=ctx-a) →
dispatch(intent tenant-b) → executor runs, no IntentRevokedError; plus
revoke(key, auth_ctx=ctx-a) → dispatch(intent tenant-a) → refused.
`mc-h7-falsify-2026-09-27.py` test 3 is the executable spec for the
first case.

## Migration-claim replay (2026-09-27 ~14:45 MDT)

The registry's "migrated + replay-tested" claim for
`spine-observe-dry-run` was replayed: `python3 -m unittest
tests.test_mission_intent` → 33/33 PASS, including
`test_valid_intent_flows_end_to_end` (real adapter → real work order →
real dry-run observer subprocess). The migration claim is VERIFIED;
only the detector built on top of it is defective (Gap-4).
