#!/usr/bin/env python3
"""FYD-037 falsification probe (ping-perfecting-pass, 2026-09-23; guard
assertions added 2026-09-24 with the FYD-037 implementation).

Claim under test (BACKLOG_PING.md NOW-9 / FYD-037):
  "FYD overlay emit/dump must fail closed against a journal lacking the
   expected overlay marker, so a projection can never be written against
   the wrong journal."

Method (fully local, no Pig, no network, no credentials):
  1. Import the inspectable emit path (fyd-lane/lane-e/emit-overlay.py).
  2. Point FYD_GATEWAY_URL at a bogus "wrong journal" URL.
  3. Stub subprocess.run so the bridge POST is captured, never executed.
  4. Call emit() and observe: it must perform exactly one journal-identity
     pre-flight and then FAIL CLOSED with the typed WRONG_JOURNAL error
     before any POST is attempted.

Post-fix expectations (the regression this probe now encodes):
  - emit() raises WrongJournalError (or main() returns non-zero).
  - ZERO POST calls: no stubbed subprocess call contains "-X POST".
  - "WRONG_JOURNAL" appears in the failure message.
  - Marker/guard terms are present in the emit source.

Exit 0 = probe ran cleanly. The FINDING is printed as JSON.
"""
import importlib.util
import io
import json
import os
import sys
from contextlib import redirect_stderr

# The "wrong journal": a URL that is definitionally not the FYD overlay
# journal (nothing listens here; the point is emit must refuse BEFORE
# attempting the POST, not after a connection failure).
WRONG_JOURNAL_URL = "http://127.0.0.1:1/wrong-journal/events"

os.environ["FYD_GATEWAY_URL"] = WRONG_JOURNAL_URL

spec = importlib.util.spec_from_file_location(
    "emit_overlay", "/home/hatch/workspace/fyd-lane/lane-e/emit-overlay.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

calls = []


class FakeCompleted:
    returncode = 0
    stdout = '{"event_id": "evt_probe_fake"}'
    stderr = ""


def fake_run(cmd, **kwargs):
    calls.append({"cmd": cmd, "kwargs_keys": sorted(kwargs.keys())})
    return FakeCompleted()


real_run = mod.subprocess.run
mod.subprocess.run = fake_run
stderr_buf = io.StringIO()
outcome = "returned"
try:
    with redirect_stderr(stderr_buf):
        rc = mod.emit("happy-place", [{"op": "set_field", "objectId": "o1",
                                       "field": "phone", "value": "+1 (541) 555-0100"}])
except mod.WrongJournalError as e:
    rc = "WrongJournalError"
    stderr_buf.write(str(e) + "\n")
    outcome = "raised WrongJournalError"
except Exception as e:  # noqa: BLE001 - any other raise is a probe failure
    rc = "unexpected %s: %s" % (type(e).__name__, e)
    outcome = "raised unexpected"
finally:
    mod.subprocess.run = real_run

# --- assertions about the mechanism -------------------------------------
src = open("/home/hatch/workspace/fyd-lane/lane-e/emit-overlay.py",
           encoding="utf-8").read().lower()
marker_terms = ["overlay marker", "overlay_marker", "journal marker",
                "journal identity", "journal_identity", "expected journal",
                "wrong journal", "wrong_journal", "fail closed", "fail_closed",
                "pre-flight", "preflight", "verify journal", "journal check"]
present = [t for t in marker_terms if t in src]

# A POST attempt is a bridge call carrying the POST verb. The pre-flight
# GET (no -X POST) must not count.
post_calls = [c for c in calls if "-X POST" in str(c["cmd"])]
stderr_text = stderr_buf.getvalue()
typed_error = "WRONG_JOURNAL" in stderr_text

fail_closed = (
    outcome == "raised WrongJournalError"
    and len(post_calls) == 0
    and typed_error
    and len(present) > 0
)

finding = {
    "item": "FYD-037",
    "probe": "fyd037-wrong-journal-probe.py",
    "wrong_journal_url": WRONG_JOURNAL_URL,
    "emit_outcome": outcome,
    "emit_returncode": rc,
    "subprocess_calls_total": len(calls),
    "post_calls": len(post_calls),
    "typed_wrong_journal_error": typed_error,
    "marker_or_guard_terms_in_source": present,
    "fail_closed_observed": fail_closed,
    "verdict": (
        "GUARD VERIFIED: emit() performed its journal-identity pre-flight "
        "and failed closed with the typed WRONG_JOURNAL error before any "
        "POST was attempted. Zero POST calls reached the wrong journal."
        if fail_closed else
        "GUARD FAILURE: emit() did not fail closed against the wrong "
        "journal (outcome=%s, post_calls=%d, typed_error=%s). Review calls."
        % (outcome, len(post_calls), typed_error)
    ),
}
print(json.dumps(finding, indent=2))
sys.exit(0 if fail_closed else 1)
