#!/usr/bin/env python3
"""Substrate Gap 3 falsification probe (backlog-burn 2026-09-27).

Claim under test: journal_identity.py is the single gateway-address
authority and its identity pre-flight fails closed (exit 2, typed
WRONG_JOURNAL) on marker mismatch, and both callers (dump.py and
lane-f-probe.py) go through it.

Method (fully local, no Pig, no network, no credentials): stub
urllib.request.urlopen so the pre-flight GET is captured and served a
controlled marker; stub subprocess.run so any docker/node data read would
be captured, never executed.

Phases:
  M1  module direct, marker mismatch ("evil-journal@bogus") -> exit 2,
      WRONG_JOURNAL on stderr, exactly 1 pre-flight GET, 0 subprocess calls
  M2  module direct, healthy marker "fyd-demo-journal@live-9f" -> returns
      normally (no exit), 1 urlopen call
  M3  module direct, unreadable marker (urlopen raises) -> exit 2 +
      WRONG_JOURNAL, 1 urlopen call, 0 subprocess calls
  M4  module direct, bare-name marker "fyd-demo-journal" (no @ suffix) ->
      accepted (no exit)
  P1  through lane-f-probe.py main(): wrong marker -> exit 2,
      WRONG_JOURNAL, 1 pre-flight GET, 0 docker/node calls
  P2  through lane-f-probe.py main(): healthy markers on both identity
      endpoints -> main() returns normally (rc 0), both journals queried,
      no WRONG_JOURNAL

Exit 0 = probe ran cleanly. The FINDING is printed as JSON.
"""
import importlib.util
import io
import json
import os
import sys
from contextlib import redirect_stderr

FYD_LANE = "/home/hatch/workspace/fyd-lane"
EVIL_MARKER = "evil-journal@bogus"

sys.path.insert(0, FYD_LANE)

spec_ji = importlib.util.spec_from_file_location(
    "journal_identity", FYD_LANE + "/journal_identity.py")
ji = importlib.util.module_from_spec(spec_ji)
spec_ji.loader.exec_module(ji)

spec_lp = importlib.util.spec_from_file_location(
    "lane_f_probe", FYD_LANE + "/lane-f-probe.py")
lp = importlib.util.module_from_spec(spec_lp)
spec_lp.loader.exec_module(lp)

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


MARKER_BY_URL = {}  # url-substring -> marker, set per phase
RAISE_ON_URL = None


def fake_urlopen(req, **kwargs):
    global RAISE_ON_URL
    urlopen_calls.append({"url": req.full_url, "method": req.method})
    if RAISE_ON_URL and RAISE_ON_URL in req.full_url:
        raise ConnectionError("simulated unreachable journal")
    marker = None
    for frag, m in MARKER_BY_URL.items():
        if frag in req.full_url:
            marker = m
    return FakeResp({"journal": marker})


class FakeCompleted:
    def __init__(self, rc=0, stdout=b"", stderr=b""):
        self.returncode = rc
        self.stdout = stdout
        self.stderr = stderr


def fake_run(cmd, **kwargs):
    subprocess_calls.append({"cmd": list(cmd)})
    if cmd[0] == "docker" and "cp" in cmd:
        return FakeCompleted(0)
    if cmd[0] == "docker" and "exec" in cmd and "node" in cmd:
        return FakeCompleted(
            0, stdout=b'{"event_id":"e-main-1",'
                      b'"timestamp":"2026-09-01T00:00:00Z"}\n')
    if cmd[0] == "docker" and "exec" in cmd:
        return FakeCompleted(0)
    if "node" in cmd[0]:
        return FakeCompleted(
            0, stdout=b'{"event_id":"e-demo-1",'
                      b'"timestamp":"2026-09-01T00:00:01Z"}\n')
    return FakeCompleted(0)


real_urlopen = ji.urllib.request.urlopen
ji.urllib.request.urlopen = fake_urlopen
real_run_lp = lp.subprocess.run
lp.subprocess.run = fake_run

results = {}


def reset():
    global urlopen_calls, subprocess_calls
    urlopen_calls = []
    subprocess_calls = []


def set_markers(d, raise_on=None):
    """Set the stub journal's served markers (call BEFORE the phase runs;
    reset() intentionally does not clear them)."""
    global MARKER_BY_URL, RAISE_ON_URL
    MARKER_BY_URL = dict(d)
    RAISE_ON_URL = raise_on


def run_phase(name, fn, expect_exit2, expect_typed=True,
              expect_urlopen=1, expect_subprocess=0,
              expect_normal_return=False):
    reset()
    err = io.StringIO()
    outcome = "returned"
    rc = None
    try:
        with redirect_stderr(err):
            retval = fn()
    except SystemExit as e:
        rc = e.code
        outcome = "SystemExit(%s)" % rc
        retval = None
    except Exception as e:  # noqa: BLE001 - any other raise is a probe failure
        rc = "unexpected %s: %s" % (type(e).__name__, e)
        outcome = "raised unexpected"
        retval = None
    err_text = err.getvalue()
    typed = "WRONG_JOURNAL" in err_text
    if expect_normal_return:
        passed = (outcome == "returned" and retval is None
                  and len(urlopen_calls) == expect_urlopen
                  and len(subprocess_calls) == expect_subprocess
                  and not typed)
    else:
        passed = (outcome == "SystemExit(2)"
                  and typed == expect_typed
                  and len(urlopen_calls) == expect_urlopen
                  and len(subprocess_calls) == expect_subprocess)
    results[name] = {
        "outcome": outcome,
        "returncode": rc,
        "urlopen_calls": urlopen_calls,
        "subprocess_call_count": len(subprocess_calls),
        "typed_wrong_journal_error": typed,
        "passed": passed,
    }


try:
    # M1: module direct, mismatch.
    set_markers({"/": EVIL_MARKER})
    run_phase("M1_module_mismatch",
              lambda: ji.preflight_journal("http://127.0.0.1:1",
                                           "/", "fyd-demo-journal"),
              expect_exit2=True)
    # M2: module direct, healthy derived-suffix marker.
    set_markers({"/": "fyd-demo-journal@live-9f"})
    run_phase("M2_module_healthy",
              lambda: ji.preflight_journal("http://127.0.0.1:1",
                                           "/", "fyd-demo-journal"),
              expect_exit2=False, expect_typed=False,
              expect_normal_return=True)
    # M3: module direct, unreadable marker.
    set_markers({}, raise_on="127.0.0.1:1")
    run_phase("M3_module_unreadable",
              lambda: ji.preflight_journal("http://127.0.0.1:1",
                                           "/", "fyd-demo-journal"),
              expect_exit2=True)
    # M4: module direct, bare marker name (no @ suffix).
    set_markers({"/": "fyd-demo-journal"})
    run_phase("M4_module_bare_name",
              lambda: ji.preflight_journal("http://127.0.0.1:1",
                                           "/", "fyd-demo-journal"),
              expect_exit2=False, expect_typed=False,
              expect_normal_return=True)

    # P1: lane-f-probe.py with a wrong journal on both identity endpoints.
    set_markers({":18199": EVIL_MARKER, ":8080": EVIL_MARKER})
    run_phase("P1_lane_f_probe_wrong_journal", lp.main,
              expect_exit2=True)

    # P2: lane-f-probe.py healthy path: both journals assert their markers.
    reset()
    set_markers({":18199": "fyd-demo-journal@live-9f",
                 ":8080/health": "ping-main-journal@live-7a"})
    lp.resolve_node = lambda: "/usr/bin/node"
    os.environ["FYD_DEMO_PG_PASSWORD"] = "fake-test-password"
    err = io.StringIO()
    outcome = "returned"
    rc = None
    out_buf = io.StringIO()
    try:
        with redirect_stderr(err):
            old_stdout = sys.stdout
            sys.stdout = out_buf
            try:
                retval = lp.main()
            finally:
                sys.stdout = old_stdout
    except SystemExit as e:
        rc = e.code
        outcome = "SystemExit(%s)" % rc
        retval = None
    except Exception as e:  # noqa: BLE001
        rc = "unexpected %s: %s" % (type(e).__name__, e)
        outcome = "raised unexpected"
        retval = None
    err_text = err.getvalue()
    printed = out_buf.getvalue()
    try:
        printed_json = json.loads(printed)
        labels = [r.get("label") for r in printed_json]
    except Exception:
        labels = []
    p2_passed = (
        outcome == "returned" and retval is None
        and "WRONG_JOURNAL" not in err_text
        and labels == ["main", "demo"]
        and len(urlopen_calls) == 2   # one pre-flight GET per journal
        and len(subprocess_calls) == 4  # docker cp, docker exec node,
                                        # docker exec rm, node demo query
    )
    results["P2_lane_f_probe_healthy"] = {
        "outcome": outcome,
        "returncode": rc,
        "labels_printed": labels,
        "urlopen_calls": urlopen_calls,
        "subprocess_call_count": len(subprocess_calls),
        "typed_wrong_journal_error": "WRONG_JOURNAL" in err_text,
        "passed": p2_passed,
    }
finally:
    ji.urllib.request.urlopen = real_urlopen
    lp.subprocess.run = real_run_lp
    os.environ.pop("FYD_DEMO_PG_PASSWORD", None)

all_passed = all(r["passed"] for r in results.values())

verdicts = {}
for name, r in results.items():
    verdicts[name] = ("PASS" if r["passed"] else "FAIL") + \
        " (%s, urlopen=%d, subprocess=%d, typed=%s)" % (
            r["outcome"], len(r["urlopen_calls"]),
            r["subprocess_call_count"], r["typed_wrong_journal_error"])

finding = {
    "item": "substrate-Gap-3",
    "probe": "substrate-gap3-journal-identity-probe.py",
    "wrong_marker_served": EVIL_MARKER,
    "phases": results,
    "verdicts": verdicts,
    "fail_closed_observed": all_passed,
    "verdict": (
        "GAP3 PROBE PASS: journal_identity.py fails closed (exit 2, typed "
        "WRONG_JOURNAL) on marker mismatch and on unreadable markers with "
        "exactly 1 pre-flight GET and 0 data calls; healthy markers "
        "(derived-suffix and bare) are accepted; lane-f-probe.py fails "
        "closed on a wrong journal before any docker/node query and runs "
        "cleanly (rc 0) on healthy markers."
        if all_passed else
        "GAP3 PROBE FAIL: one or more phases did not behave as specified. "
        "Review phases."
    ),
}
print(json.dumps(finding, indent=2))
sys.exit(0 if all_passed else 1)
