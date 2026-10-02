# xapi Call Contract (reference)

Source of truth: `~/workspace/skills/x-api/SKILL.md` and
`~/workspace/skills/x-api/bin/xapi.py`, verified 2026-10-01.

## Auth

OAuth user context for Nolan's account. Authd surrogate via
`/opt/hatch/bin/authdc cred surrogate custom.x`. All calls go to
`api.x.com` only.

## CLI commands (xapi.py)

- `me`: the authenticated account (identity anchor).
- `lookup`: user lookup by handle or id.
- `followers`: followers of a user.
- `tweets`: recent tweets of a user.
- `follow`: follow a user by id.

There is NO like CLI in xapi.py. (follow-batch.py exists with jittered
pacing; this skill does not reproduce jittered pacing and uses no
randomness for evasion.)

## This skill's usage

`LiveXAdapter` is the dumb-adapter boundary to this contract: it issues
`execute` (like/follow/comment) and `read_state` (verification reads)
through the x-api skill's authenticated path, and reports raw results
with no interpretation. It may NOT grant authority, decide eligibility,
or retry. `execute` returns the raw platform response (including HTTP
status); `read_state` returns the observed external state (e.g. whether
a like is present). Verification of success happens in the orchestrator
by comparing the read against the intended effect, never by trusting a
response body.

In this build environment there are no live credentials, so
`LiveXAdapter` refuses with `LiveExecutionBlocked` ("LIVE EXTERNAL
EXECUTION: BLOCKED"). The fixture (`fixtures/xapi_fixture.py`) is the
only fake, and it exists solely at the adapter boundary.
