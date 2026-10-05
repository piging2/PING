# X API credential gap — NOTE (2026-10-04)

## Status: NO WORKING CREDENTIAL (blocker)

The `custom.x` connector exists as a registered credential NAME in authd,
but its surrogate map is EMPTY. There is no `access_token` (or any other
value) stored under it. Verified 2026-10-04 ~18:45 MDT:

- `authdc cred surrogate custom.x` -> HTTP 200, `{"credentials": []}`
- Control: `authdc cred surrogate <bogus-name>` -> HTTP 403 "not available
  to the sandbox". So authd recognizes `custom.x` as a real connector
  visible to this cell; the name exists, the content does not.
- Skill status check `bin/xapi.py me` fails before any request leaves:
  `RuntimeError: no access_token credential in custom.x surrogate map`.
  No unauthenticated request is ever sent to api.x.com (good: no
  credential-less traffic, no misleading 401 noise).
- `bin/follow-batch.py` shells out to `xapi.py`; it is equally blocked.

This is NOT the SKILL.md "request rejected with credential attached" case
(a 401/403 on a credentialed request). We never get that far — the token
was either never stored after the OAuth grant, or was cleared/revoked
afterwards. Coordinator E's authd probe ("missing access_token surrogate
for credential custom.x") matches.

## What would fix it (no key-pasting; owner-driven reconnect)

1. Re-run the OAuth authorization flow for the `custom.x` connector so
   authd holds a fresh user-context access token (Nolan completes the
   grant in the browser; per skill rules nothing here collects a key).
2. Verify: `authdc cred surrogate custom.x` must return an `access_token`
   entry with placement `bearer_header` (never print or log the value).
3. Verify: `bin/xapi.py me` must return HTTP 200 with the authed user's
   id/handle. Only then does the connector lane become testable.

## Why nothing was built on top

Per lane orders: do not invent a credential, do not ask the user to paste
keys, do not paper over the gap. The existing `bin/xapi.py` already covers
the thin connector surface (me / lookup / followers / tweets / follow with
typed ApiRequestError handling via the shared helper). Any new code would
be untestable against the real API today, so the correct move is this
NOTE, not more code. Revisit when the reconnect lands.
