#!/usr/bin/env python3
"""test_tiktok_like_recovery.py -- deterministic tests for the durable
like-specific throttle state machine. Exit 0 all pass, exit 1 any failure.

Pins the probe bounds (max 1 attempt/probe, gap backoff, terminal LONG_HOLD),
the deterministic restoration criterion (2 consecutive clean probes -> cap 1,
ladder steps), the like-specificity (comment-only passes never disturb like
state), and the BLOCKED semantics (restriction signal freezes probes until a
recorded review).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUTREACH = os.path.dirname(HERE)
SCRIPT = os.path.join(OUTREACH, "tiktok-like-recovery.py")

failures = []


def check(name, cond, extra=""):
    if cond:
        print(f"ok   {name}")
    else:
        print(f"FAIL {name} {extra}")
        failures.append(name)


class Sandbox:
    """Run the script against a scratch state file via a patched STATE_PATH."""

    def __init__(self):
        self.tmp = tempfile.mkdtemp(prefix="tk-recovery-")
        self.state = os.path.join(self.tmp, "state.json")
        # Patch: copy script, replace the STATE_PATH line.
        src = open(SCRIPT, encoding="utf-8").read()
        patched = src.replace(
            'STATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),\n'
            '                          "tiktok-like-recovery-state.json")',
            f'STATE_PATH = r"{self.state}"')
        self.script = os.path.join(self.tmp, "rec.py")
        open(self.script, "w", encoding="utf-8").write(patched)
        # Seed a blank state file so state_now() always has something to read.
        subprocess.run([sys.executable, "-c",
                        "import importlib.util;"
                        f"spec=importlib.util.spec_from_file_location('rec', {self.script!r});"
                        "m=importlib.util.module_from_spec(spec);"
                        "spec.loader.exec_module(m);"
                        "m.save_state(m.blank_state())"],
                       capture_output=True)

    def run(self, *args):
        return subprocess.run([sys.executable, self.script, *args],
                              capture_output=True, text=True)

    def write_results(self, records):
        p = os.path.join(self.tmp, f"res-{len(os.listdir(self.tmp))}.json")
        json.dump({"results": records}, open(p, "w", encoding="utf-8"))
        return p

    def state_now(self):
        return json.load(open(self.state, encoding="utf-8"))

    def like(self, ok, fail_class=None, note=""):
        r = {"type": "like", "ok": ok, "note": note,
             "url": "https://www.tiktok.com/@x/video/1"}
        if fail_class:
            r["fail_class"] = fail_class
        return r

    def comment(self, ok=True):
        return {"type": "comment", "ok": ok, "note": "comment text visible",
                "url": "https://www.tiktok.com/@x/video/2"}


def fresh():
    sb = Sandbox()
    r = sb.run("show")
    check("show-starts-blank", r.returncode == 0 and
          json.loads(r.stdout)["status"] == "THROTTLED", r.stderr)
    return sb


def main():
    # 1. blank start: no probe due (passes_since_probe=0 < gap=4), cap 0
    sb = fresh()
    plan = json.loads(sb.run("plan-next").stdout)
    check("start-no-probe-due", plan["probe_due"] is False)
    check("start-cap-zero", plan["max_like_attempts"] == 0)
    check("start-bounds", plan["bounds"]["max_attempts_per_probe"] == 1
          and plan["bounds"]["terminal_failed_probes"] == 5)

    # 2. comment-only passes never disturb like state (like-specificity)
    for i in range(4):
        p = sb.write_results([sb.comment()])
        r = sb.run("record-pass", "--pass-id", f"c{i}", "--driver-result", p)
        check(f"comment-pass-{i}-rc", r.returncode == 0, r.stderr)
    st = sb.state_now()
    check("comment-passes-counted", st["passes_since_probe"] == 4)
    check("comment-passes-no-cap-move",
          st["status"] == "THROTTLED" and st["durable_like_cap"] == 0)
    plan = json.loads(sb.run("plan-next").stdout)
    check("probe-due-after-gap", plan["probe_due"] is True
          and plan["max_like_attempts"] == 1)

    # 3. probe bound: a 2-like pass is NOT a probe (non-probe shape)
    p = sb.write_results([sb.like(False, "NO_STATE_CHANGE_UNKNOWN", "click sent"),
                          sb.like(False, "NO_STATE_CHANGE_UNKNOWN", "click sent")])
    r = sb.run("record-pass", "--pass-id", "two-likes", "--driver-result", p)
    st = sb.state_now()
    check("two-like-not-probe",
          st["probes_failed"] == 0 and st["status"] == "THROTTLED"
          and "PASS_NONPROBE" in [h["event"] for h in st["history"]], r.stdout[:300])

    # 4. deterministic restoration: 2 consecutive clean probe passes -> cap 1
    p = sb.write_results([sb.like(True, "LIKE_APPLIED", "like registered")])
    sb.run("record-pass", "--pass-id", "probe1", "--driver-result", p)
    st = sb.state_now()
    check("probe1-probing", st["status"] == "PROBING"
          and st["durable_like_cap"] == 0)
    check("probe1-not-restored-yet",
          st["consecutive_clean_probe_passes"] == 1)
    sb.run("record-pass", "--pass-id", "probe2", "--driver-result", p)
    st = sb.state_now()
    check("probe2-restored", st["status"] == "RECOVERING"
          and st["durable_like_cap"] == 1)
    plan = json.loads(sb.run("plan-next").stdout)
    check("recovering-budget", plan["max_like_attempts"] == 1
          and plan["probe_due"] is False)

    # 5. ladder: clean pass at cap 1 -> cap 2; failure -> back to 0
    p1 = sb.write_results([sb.like(True, "LIKE_APPLIED", "like registered")])
    sb.run("record-pass", "--pass-id", "ladder1", "--driver-result", p1)
    st = sb.state_now()
    check("ladder-up", st["durable_like_cap"] == 2)
    pf = sb.write_results([sb.like(False, "NO_STATE_CHANGE_UNKNOWN", "click sent")])
    sb.run("record-pass", "--pass-id", "ladderfail", "--driver-result", pf)
    st = sb.state_now()
    check("ladder-fail-rethrottle",
          st["status"] == "THROTTLED" and st["durable_like_cap"] == 0)

    # 6. probe backoff: failed probes double the gap, capped at 12
    sb2 = fresh()
    for i in range(4):
        sb2.run("record-pass", "--pass-id", f"cc{i}",
                "--driver-result", sb2.write_results([sb2.comment()]))
    for n, expect_gap in [(0, 8), (1, 12), (2, 12)]:
        pf = sb2.write_results([sb2.like(False, "NO_STATE_CHANGE_UNKNOWN", "x")])
        sb2.run("record-pass", "--pass-id", f"fp{n}", "--driver-result", pf)
        st = sb2.state_now()
        check(f"backoff-{n}", st["probe_gap_passes"] == expect_gap
              and st["status"] == "THROTTLED", json.dumps(st)[:200])
        for i in range(expect_gap):
            sb2.run("record-pass", "--pass-id", f"gap{n}-{i}",
                    "--driver-result", sb2.write_results([sb2.comment()]))

    # 7. terminal disposition: 5 consecutive failed probes -> LONG_HOLD, frozen
    sb3 = fresh()
    for n in range(5):
        for i in range(sb3.state_now()["probe_gap_passes"]):
            sb3.run("record-pass", "--pass-id", f"g{n}-{i}",
                    "--driver-result",
                    sb3.write_results([sb3.comment()]))
        pf = sb3.write_results([sb3.like(False, "NO_STATE_CHANGE_UNKNOWN", "x")])
        sb3.run("record-pass", "--pass-id", f"probe{n}", "--driver-result", pf)
    st = sb3.state_now()
    check("long-hold-terminal", st["status"] == "LONG_HOLD"
          and st["probes_failed"] == 5)
    plan = json.loads(sb3.run("plan-next").stdout)
    check("long-hold-no-probe", plan["probe_due"] is False
          and plan["max_like_attempts"] == 0)
    # passes under LONG_HOLD change nothing
    pf = sb3.write_results([sb3.like(True, "LIKE_APPLIED", "like registered")])
    sb3.run("record-pass", "--pass-id", "after-hold", "--driver-result", pf)
    check("long-hold-frozen", sb3.state_now()["status"] == "LONG_HOLD")
    # only a recorded review restarts
    sb3.run("record-review", "--pass-id", "rev1", "--decision", "allow",
            "--note", "manual review: throttle lifted")
    st = sb3.state_now()
    check("review-restarts",
          st["status"] == "THROTTLED" and st["durable_like_cap"] == 0
          and st["probes_failed"] == 0)
    check("review-logged", len(st["reviews"]) == 1)

    # 8. restriction signal -> BLOCKED, never an optimization problem
    sb4 = fresh()
    for i in range(4):
        sb4.run("record-pass", "--pass-id", f"cc{i}",
                "--driver-result", sb4.write_results([sb4.comment()]))
    pr = sb4.write_results([
        sb4.like(False, "NO_STATE_CHANGE_RESTRICTED",
                 'restriction surface matched: "you\'re liking too fast"')])
    sb4.run("record-pass", "--pass-id", "restrict", "--driver-result", pr)
    st = sb4.state_now()
    check("restriction-blocked", st["status"] == "BLOCKED"
          and st["durable_like_cap"] == 0)
    plan = json.loads(sb4.run("plan-next").stdout)
    check("blocked-no-probe", plan["probe_due"] is False
          and plan["max_like_attempts"] == 0)
    sb4.run("record-review", "--pass-id", "rev", "--decision", "hold",
            "--note", "keeping hold")
    check("hold-stays", sb4.state_now()["status"] == "BLOCKED")

    # 9. abort with matched restriction phrase also blocks
    sb5 = fresh()
    pa = sb5.write_results([
        sb5.like(False, "NO_STATE_CHANGE_UNKNOWN", "click sent"),
        {"type": "abort", "ok": False,
         "fail_class": "PASS_ABORT_RESTRICTION",
         "matched_phrase": "try again later",
         "note": "possible checkpoint, rate limit, or block detected"}])
    sb5.run("record-pass", "--pass-id", "abortrestrict", "--driver-result", pa)
    check("abort-restriction-blocked",
          sb5.state_now()["status"] == "BLOCKED")

    # 10. abort WITHOUT restriction evidence does not block (fail closed)
    sb6 = fresh()
    pa = sb6.write_results([
        sb6.like(True, "LIKE_APPLIED", "like registered"),
        {"type": "abort", "ok": False,
         "note": "possible checkpoint, rate limit, or block detected; stopping pass"}])
    sb6.run("record-pass", "--pass-id", "abortplain", "--driver-result", pa)
    check("abort-plain-no-block", sb6.state_now()["status"] == "THROTTLED")

    # 11. old-shape notes (no fail_class) still fold deterministically
    sb7 = fresh()
    for i in range(4):
        sb7.run("record-pass", "--pass-id", f"cc{i}",
                "--driver-result", sb7.write_results([sb7.comment()]))
    po = sb7.write_results([{"type": "like", "ok": False,
                             "note": "click sent, no aria-pressed=true observed",
                             "url": "https://www.tiktok.com/@x/video/1"}])
    sb7.run("record-pass", "--pass-id", "oldnote", "--driver-result", po)
    st = sb7.state_now()
    check("old-note-probe-failed", st["probes_failed"] == 1
          and st["status"] == "THROTTLED")

    # 12. real seed state loads and is consistent
    real = json.load(open(os.path.join(OUTREACH,
                                       "tiktok-like-recovery-state.json"),
                          encoding="utf-8"))
    check("seed-status", real["status"] == "THROTTLED"
          and real["durable_like_cap"] == 0)
    check("seed-history", any(h["event"] == "SEED" for h in real["history"]))

    shutil.rmtree(sb.tmp, ignore_errors=True)
    if failures:
        print(f"\n{len(failures)} FAILURES: {failures}")
        return 1
    print("\nall pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
