# MC-SECURITY: summary-marker injection nullifies revocation — 2026-09-27 ~15:50 MDT

Subagent: backlog-burn (parent: main agent). Found by falsifying the
`_pack_summary` / `_unpack_summary` round-trip. NOT patched (the MC
sprint's file; queued for the owner).

## The defect (REAL, PROVEN end-to-end, revocation bypass)

`mission-control/mission_intent.py`:

- `_pack_summary(human, record)` (line 374) joins with
  `SUMMARY_MARKER = " ||FRONTDOOR|| "`.
- `_unpack_summary` (line 380) splits with
  `summary.partition(SUMMARY_MARKER)` — the FIRST occurrence.
- `revoke()` (line 943) interpolates the operator-supplied `reason`
  VERBATIM into the human string:
  `"frontdoor revoked idempotency key %s before dispatch: %s"`.

If the reason contains `" ||FRONTDOOR|| "`, unpack splits inside the
reason, `json.loads` fails on the tail, and the function returns
`(human, None)` — the revocation record is silently discarded.
`find_revocation` then skips the event, and the revoked key dispatches
normally.

PROOF (real `mi.revoke` + `mi.submit`, scratch journal):

```
mi.revoke('K-INJ', 'operator stop ||FRONTDOOR|| {"fake": 1}', ...)
mi.submit(...'K-INJ'...)
→ outcome=dispatched, executor_calls=1 — REVOCATION NULLIFIED
```

Unit level: `_unpack_summary(_pack_summary(human_with_marker, rec))`
→ `(human, None)`. Record lost.

## Blast radius (same root cause, other human strings)

- Line 1150 (`MC_LANE_FAILED`): interpolates `verdict.get("reason")`
  (authority denial reason, free text). Marker → terminal record lost
  → `find_intent_record` sees no terminal → the denied key can be
  re-dispatched.
- Lines 1211/1226 (MC_LANE_UNKNOWN / dispatch-failed): interpolate
  exception strings. Same loss, lower authority stakes.
- Safe: mission_class / actor / capability are regex-validated
  (no `|`, no space), so they cannot carry the marker.

## The fix (for the MC sprint owner)

Root fix in `_unpack_summary`: use `rpartition` instead of
`partition`. The record is always appended LAST, so the LAST marker is
always the real separator — a marker inside the human text is then
harmless (it stays in the human part, the record parses). Defense in
depth: reject `SUMMARY_MARKER` in operator free-text inputs
(`revoke()` reason at minimum).

The `rpartition` fix was VALIDATED (2026-09-27 ~16:15 MDT): adversarial
human (marker + fake JSON) → record correctly recovered; normal case
→ unchanged; no-marker → None as before.

Falsification for the fix: the proof above must end with
`IntentRevokedError` (zero dispatch), and
`_unpack_summary(_pack_summary(h, rec))` must return the record for
any human string `h`.

## Status

QUEUED for the MC sprint owner. Severity: high (security control
bypass, not just accounting). Not patched here per the sibling-surface
ownership rule. Related: MC-H7 (mc-h7-tenant-revocation-2026-09-27.md)
— both are revocation-path defects found the same day.
