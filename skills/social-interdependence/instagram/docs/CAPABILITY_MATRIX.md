# CAPABILITY_MATRIX: social-interdependence/instagram

Instagram capability for this skill, derived live from
`~/workspace/outreach/eligibility-data/action-capability.json` (single
copy; this file documents, it does not duplicate).

## instagram: like + comment only

| action | allowed | notes |
|---|---|---|
| like | yes | heart a post; verified by read_state liked=true |
| comment | yes | short funny comment; content policy machine-checked (<=20 words, funny first, never sell, never mention PING Social, no links or contact info, no customer-posing, no em dashes) |
| follow | no | not in the autonomy envelope |
| unfollow | no | not in the autonomy envelope |
| DM | no | not in the autonomy envelope; DMs are a different skill with different authority |
| share / save | no | not in the autonomy envelope |

`siig_guard.action_allowed()` reads the live matrix; `build_pass` enters
safe mode if the matrix disallows a planned action or is unreadable.
A capability change between plan and dispatch is caught by the
dispatch-time evidence check (data digest mismatch -> refuse ->
CANCELLED) and by safe mode at the next plan.

## Provider surface status

`AUTHORITY.json` carries the per-surface status. `SUPPRESSED` at the
surface fails the guard for every candidate (reason SUPPRESSED) before
any other check. The scratch tree used in tests mirrors this file.

## Precedence (from engagement-guard.py, binding)

CAPABILITY_MISSING / PROVIDER_UNSUPPORTED -> BLOCKED -> SUPPRESSED ->
ALREADY_ENGAGED -> OUTSIDE_CORRIDOR -> class rules -> DUPLICATE ->
UNKNOWN -> ELIGIBLE.

UNKNOWN = do not dispatch, at plan time and at dispatch time.

## What the skill adds above the guard

The guard decides eligibility. Above it, this skill applies:

1. Identity precision: the country gate (a Durango-MX identity is not a
   Durango-CO business; fail closed on ambiguity).
2. Prohibited targets: owner-ordered no-contact list, matched by name.
   This is an envelope prohibition, not an eligibility judgment.
3. Taste layer: priority_score ranking for scheduling order. Ranking
   never changes eligibility.
4. Comment content policy: machine-checked before any comment intent is
   built.

None of these write back into the guard's data files.
