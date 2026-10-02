# FYD-037 dump-path probe — closure of the autonomous remainder (NOW-9 / P1)

Date: 2026-09-27. Agent: FYD-037 DUMP-PROBE. Local plane only.

## Established state (verified 2026-09-27)
The EMIT path was proven by `fyd037-wrong-journal-probe.py` (perfecting-pass-2026-09-23):
emit-overlay.py calls `_preflight_journal()` first, raises `WrongJournalError` →
exit 3; the re-run probe showed exactly 1 subprocess call (pre-flight GET) and
0 POSTs against a bogus journal.

The DUMP path had no probe. This session closed that remainder.

## What was probed
- Source: `~/workspace/fyd-lane/dump.py` — journal-identity guard `_preflight_journal`
  (lines 121-142), wired at line 363 (`query_overlays_demo`, demo mode, pre-flight
  GET `/`) and line 394 (`query_overlays`, main mode, pre-flight GET `/health`).
- Probe: `fyd037-dump-wrong-journal-probe.py` (this directory), mirrors the emit
  probe's structure exactly: import the module, point `FYD_JOURNAL_GATEWAY_URL`
  and `FYD_MAIN_GATEWAY_URL` at a bogus wrong-journal URL, stub the network,
  assert fail-closed BEFORE any read/write against the wrong journal with exact
  subprocess-call accounting (pre-flight calls vs data calls).
- Adaptations from the emit probe (harvested, not invented):
  - Emit's pre-flight rides the bridge via subprocess → the emit probe stubs
    `subprocess.run` and counts the pre-flight GET. Dump's pre-flight is a plain
    `urllib.request.urlopen` GET → this probe stubs `urlopen` and counts the
    pre-flight GET; `subprocess.run` (docker/node data reads) is stubbed and
    must show ZERO calls.
  - Emit fails closed by raising `WrongJournalError`; dump fails closed with
    `sys.exit(2)` + typed `WRONG_JOURNAL` on stderr (documented in dump.py's
    docstring: "Exit 2 also covers FYD-037 WRONG_JOURNAL") → the probe catches
    `SystemExit` and asserts code 2 + the typed message.
  - The stubbed urlopen serves a *marker mismatch* (`{"journal": "evil-journal@bogus"}`)
    with HTTP 200, so the guard's identity-comparison branch is exercised, not just
    the connection-failure branch. Expected markers (derived, `FYD_EXPECTED_OVERLAY_JOURNAL`
    unset): `ping-main-journal` (main mode) / `fyd-demo-journal` (demo mode).
- No Pig, no real network, no credentials: every urlopen and subprocess call was stubbed.

## Full probe output (exit 0)

```json
{
  "item": "FYD-037",
  "probe": "fyd037-dump-wrong-journal-probe.py",
  "wrong_journal_url": "http://127.0.0.1:1/wrong-journal",
  "wrong_marker_served": "evil-journal@bogus",
  "marker_or_guard_terms_in_source": [
    "journal marker",
    "journal identity",
    "wrong_journal",
    "fail closed",
    "pre-flight",
    "preflight"
  ],
  "phases": {
    "main_mode_query_overlays": {
      "outcome": "SystemExit(2)",
      "returncode": 2,
      "urlopen_calls": [
        {
          "url": "http://127.0.0.1:1/wrong-journal/health",
          "method": "GET"
        }
      ],
      "subprocess_calls": [],
      "typed_wrong_journal_error": true,
      "fail_closed_observed": true
    },
    "demo_mode_query_overlays_demo": {
      "outcome": "SystemExit(2)",
      "returncode": 2,
      "urlopen_calls": [
        {
          "url": "http://127.0.0.1:1/wrong-journal/",
          "method": "GET"
        }
      ],
      "subprocess_calls": [],
      "typed_wrong_journal_error": true,
      "fail_closed_observed": true
    }
  },
  "verdicts": {
    "main_mode_query_overlays": "GUARD VERIFIED: main_mode_query_overlays performed its journal-identity pre-flight and failed closed with the typed WRONG_JOURNAL error before any read against the wrong journal (1 pre-flight GET, 0 data urlopen calls, 0 subprocess calls).",
    "demo_mode_query_overlays_demo": "GUARD VERIFIED: demo_mode_query_overlays_demo performed its journal-identity pre-flight and failed closed with the typed WRONG_JOURNAL error before any read against the wrong journal (1 pre-flight GET, 0 data urlopen calls, 0 subprocess calls)."
  },
  "fail_closed_observed": true,
  "verdict": "GUARD VERIFIED (dump path): both query_overlays() and query_overlays_demo() performed exactly one journal-identity pre-flight and failed closed with the typed WRONG_JOURNAL error (exit 2) before any read against the wrong journal. Zero data calls (0 further urlopen, 0 subprocess) reached the wrong journal."
}
```

## Subprocess accounting (exact)
| Phase | Pre-flight GET (urlopen) | Data urlopen calls | subprocess.run calls (docker/node) | Outcome |
|---|---|---|---|---|
| main `query_overlays()` → `/health` | 1 | 0 | 0 | SystemExit(2), WRONG_JOURNAL on stderr |
| demo `query_overlays_demo()` → `/` | 1 | 0 | 0 | SystemExit(2), WRONG_JOURNAL on stderr |

## Delta
None required. The dump-path guard was already effective; the probe passed on the
first run with zero source changes. No guard was invented or modified.

## Verdict
**PASS — FYD-037 local remainder CLOSED.** Both journal-read entries of the dump
path fail closed against a wrong journal exactly as the emit path does. Remaining
out-of-scope item (not touched, needs Nolan's explicit word): the journal marker
deployment on the live journal gateway.
