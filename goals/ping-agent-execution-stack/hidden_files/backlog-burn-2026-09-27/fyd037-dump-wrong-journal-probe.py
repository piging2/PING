#!/usr/bin/env python3
"""FYD-037 DUMP-PATH falsification probe (backlog-burn 2026-09-27).

Companion to fyd037-wrong-journal-probe.py (the EMIT probe, 2026-09-23/24).

Claim under test (BACKLOG_PING.md NOW-9 / FYD-037):
  "FYD overlay emit/dump must fail closed against a journal lacking the
   expected overlay marker, so a projection can never be written against
   the wrong journal."

This probe covers the DUMP read path: dump.py query_overlays() (main mode,
pre-flight at line 394) and query_overlays_demo() (demo mode, pre-flight at
line 363).

Method (fully local, no Pig, no network, no credentials):
  1. Import the inspectable dump path (fyd-lane/dump.py) with
     FYD_JOURNAL_GATEWAY_URL and FYD_MAIN_GATEWAY_URL both pointed at a
     bogus "wrong journal" URL.
  2. Stub urllib.request.urlopen so the pre-flight GET is captured and
     served a WRONG marker ("evil-journal@bogus") — the journal's identity
     endpoint asserts, but the marker does not match the derived expected
     marker ("ping-main-journal" in main mode, "fyd-demo-journal" in demo
     mode), so the mismatch path of _preflight_journal is exercised.
  3. Stub subprocess.run so any docker/node data-read call would be
     captured, never executed.
  4. Call query_overlays() (main) and query_overlays_demo() (demo) and
     observe: each must perform exactly one journal-identity pre-flight and
     then FAIL CLOSED (SystemExit code 2, typed WRONG_JOURNAL on stderr)
     BEFORE any read against the wrong journal.

Post-fix expectations (the regression this probe encodes):
  - query_overlays()/query_overlays_demo() raise SystemExit(2).
  - "WRONG_JOURNAL" appears on stderr.
  - ZERO urlopen calls beyond the single pre-flight GET.
  - ZERO subprocess.run calls (no docker/node data reads).
  - Marker/guard terms are present in the dump source.

Exit 0 = probe ran cleanly. The FINDING is printed as JSON.
"""
import importlib.util
import io
import json
import os
import sys
from contextlib import redirect_stderr

# The "wrong journal": a URL that is definitionally not the FYD overlay
# journal (nothing listens here; the point is the dump must refuse BEFORE
# reading from it, and with the stubbed urlopen the marker mismatch path
# is what triggers the fail-closed — not a connection error).
WRONG_JOURNAL_URL = "http://127.0.0.1:1/wrong-journal"
EVIL_MARKER = "evil-journal@bogus"

os.environ["FYD_JOURNAL_GATEWAY_URL"] = WRONG_JOURNAL_URL
os.environ["FYD_MAIN_GATEWAY_URL"] = WRONG_JOURNAL_URL
os.environ.pop("FYD_OVERLAY_JOURNAL", None)     # default mode = main
os.environ.pop("FYD_EXPECTED_OVERLAY_JOURNAL", None)  # derived expectation

spec = importlib.util.spec_from_file_location(
    "fyd_dump", "/home/hatch/workspace/fyd-lane/dump.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

urlopen_calls = []
subprocess_calls = []


class FakeResp:
    status = 200

    def __init__(self, doc):
        self._doc = doc

    def read(self):
        return json.dumps(self._doc).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def fake_urlopen(req, **kwargs):
    urlopen_calls.append({"url": req.full_url, "method": req.method})
    # The wrong journal asserts a marker that is definitionally NOT the
    # expected overlay journal marker.
    return FakeResp({"journal": EVIL_MARKER})


class FakeCompleted:
    returncode = 0
    stdout = b""
    stderr = b""


def fake_run(cmd, **kwargs):
    subprocess_calls.append({"cmd": cmd, "kwargs_keys": sorted(kwargs.keys())})
    return FakeCompleted()


real_urlopen = mod.urllib.request.urlopen
real_run = mod.subprocess.run
mod.urllib.request.urlopen = fake_urlopen
mod.subprocess.run = fake_run

results = {}


def probe_phase(name, fn):
    global urlopen_calls, subprocess_calls
    urlopen_calls = []
    subprocess_calls = []
    err = io.StringIO()
    outcome = "returned"
    rc = None
    try:
        with redirect_stderr(err):
            fn("happy-place")
    except SystemExit as e:
        rc = e.code
        outcome = "SystemExit(%s)" % rc
    except Exception as e:  # noqa: BLE001 - any other raise is a probe failure
        rc = "unexpected %s: %s" % (type(e).__name__, e)
        outcome = "raised unexpected"
    err_text = err.getvalue()
    preflight_gets = [c for c in urlopen_calls if c["method"] == "GET"]
    typed = "WRONG_JOURNAL" in err_text
    fail_closed = (
        outcome == "SystemExit(2)"
        and typed
        and len(preflight_gets) == 1
        and len(urlopen_calls) == 1      # nothing but the pre-flight
        and len(subprocess_calls) == 0   # no docker/node data reads
    )
    results[name] = {
        "outcome": outcome,
        "returncode": rc,
        "urlopen_calls": urlopen_calls,
        "subprocess_calls": subprocess_calls,
        "typed_wrong_journal_error": typed,
        "fail_closed_observed": fail_closed,
    }


try:
    # Phase A: main mode — query_overlays() must pre-flight /health first.
    probe_phase("main_mode_query_overlays", mod.query_overlays)
    # Phase B: demo mode — query_overlays_demo() must pre-flight / first.
    probe_phase("demo_mode_query_overlays_demo", mod.query_overlays_demo)
finally:
    mod.urllib.request.urlopen = real_urlopen
    mod.subprocess.run = real_run

# --- assertions about the mechanism -------------------------------------
src = open("/home/hatch/workspace/fyd-lane/dump.py",
           encoding="utf-8").read().lower()
marker_terms = ["overlay marker", "overlay_marker", "journal marker",
                "journal identity", "journal_identity", "expected journal",
                "wrong journal", "wrong_journal", "fail closed", "fail_closed",
                "pre-flight", "preflight", "verify journal", "journal check"]
present = [t for t in marker_terms if t in src]

all_closed = all(r["fail_closed_observed"] for r in results.values())
fail_closed = all_closed and len(present) > 0

verdicts = {}
for name, r in results.items():
    verdicts[name] = (
        "GUARD VERIFIED: %s performed its journal-identity pre-flight and "
        "failed closed with the typed WRONG_JOURNAL error before any read "
        "against the wrong journal (1 pre-flight GET, 0 data urlopen calls, "
        "0 subprocess calls)." % name
        if r["fail_closed_observed"] else
        "GUARD FAILURE: %s did not fail closed (outcome=%s, urlopen=%d, "
        "subprocess=%d, typed=%s)."
        % (name, r["outcome"], len(r["urlopen_calls"]),
           len(r["subprocess_calls"]), r["typed_wrong_journal_error"])
    )

finding = {
    "item": "FYD-037",
    "probe": "fyd037-dump-wrong-journal-probe.py",
    "wrong_journal_url": WRONG_JOURNAL_URL,
    "wrong_marker_served": EVIL_MARKER,
    "marker_or_guard_terms_in_source": present,
    "phases": results,
    "verdicts": verdicts,
    "fail_closed_observed": fail_closed,
    "verdict": (
        "GUARD VERIFIED (dump path): both query_overlays() and "
        "query_overlays_demo() performed exactly one journal-identity "
        "pre-flight and failed closed with the typed WRONG_JOURNAL error "
        "(exit 2) before any read against the wrong journal. Zero data "
        "calls (0 further urlopen, 0 subprocess) reached the wrong journal."
        if fail_closed else
        "GUARD FAILURE (dump path): one or more dump read phases did not "
        "fail closed. Review phases."
    ),
}
print(json.dumps(finding, indent=2))
sys.exit(0 if fail_closed else 1)
