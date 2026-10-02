#!/usr/bin/env python3
"""test-distill-refusal-loop.py: deterministic cases for the R2 DISTILL
refusal loop (Nolan directive 2026-09-30, convergence GO unit 1).

Proves:
  1. 3 consecutive refusals for the same gap/evidence generation emit exactly
     one decision request (a 4th refusal emits nothing new).
  2. The counter resets on each of the four change types: source, evidence,
     disposition, gap semantics.
  3. The refusal loop NEVER auto-closes: sidecars are byte-identical after
     any number of refusals, and only one request per generation is emitted.
  4. A new generation re-arms the loop (its own single request).
  5. A successful close clears the streak.

Runs against fixture directories via the DISTILL_* env overrides; it never
touches production state. Load the module from this file's own tree so the
test replays from any clean checkout.
"""
import datetime
import importlib.util
import json
import os
import shutil
import stat
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TANDEM = os.path.dirname(HERE)


def load_mod():
    spec = importlib.util.spec_from_file_location(
        "chronic_distill_close", os.path.join(TANDEM, "chronic-distill-close.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


UTC = datetime.timezone.utc
OBS = datetime.datetime(2026, 9, 30, 10, 3, 33, tzinfo=UTC)

failures = []


def check(name, cond, detail=""):
    ok = bool(cond)
    print(("PASS " if ok else "FAIL ") + name + ((" -- " + detail) if detail and not ok else ""))
    if not ok:
        failures.append(name)


def make_sidecar(path, **kw):
    d = {"timestamp": "20260926-090420", "status": "answer_captured",
         "verification": "verified", "ping_ingestion": "pending",
         "transitions": []}
    d.update(kw)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(d, f)


def make_gap(**kw):
    g = {"rule": "R2", "step": "DISTILL", "state": "NOT_RUN",
         "reason": "answer_captured for 49.0h with no terminal verify/emit/skip decision",
         "run_id": "test-segment",
         "input": "20260928-090420-test.provenance.json",
         "lifecycle": "OPEN",
         "gap_key": "R2|DISTILL|test-segment|20260928-090420-test.provenance.json"}
    g.update(kw)
    return g


class Ctx:
    """Isolated fixture env: ledger + request dir + intel dir with sidecar."""

    def __init__(self, mod):
        self.mod = mod
        self.tmp = tempfile.mkdtemp(prefix="distill-refusal-test-")
        self.intel = os.path.join(self.tmp, "intel")
        os.makedirs(self.intel)
        self.ledger = os.path.join(self.tmp, "refusals.json")
        self.requests = os.path.join(self.tmp, "decision-requests")
        make_sidecar(os.path.join(self.intel, "20260928-090420-test.provenance.json"))
        self._old = dict(os.environ)
        os.environ["DISTILL_INTEL"] = self.intel
        os.environ["DISTILL_REFUSAL_LEDGER"] = self.ledger
        os.environ["DISTILL_DECISION_REQUESTS_DIR"] = self.requests

    def gap(self, **kw):
        return make_gap(**kw)

    def request_files(self):
        if not os.path.isdir(self.requests):
            return []
        return sorted(f for f in os.listdir(self.requests) if f.endswith(".json"))

    def ledger_count(self, key):
        d = self.mod.load_refusal_ledger()
        return d.get(key, {}).get("count", 0)

    def restore(self):
        os.environ.clear()
        os.environ.update(self._old)
        shutil.rmtree(self.tmp, ignore_errors=True)


def fresh_gap_ctx(mod):
    ctx = Ctx(mod)
    return ctx, ctx.gap()


def main():
    mod = load_mod()

    # --- 1. three consecutive refusals -> exactly one request ----------------
    ctx, gap = fresh_gap_ctx(mod)
    try:
        r1 = mod.record_refusal(gap["gap_key"], gap, OBS, "refusing: t1")
        r2 = mod.record_refusal(gap["gap_key"], gap, OBS, "refusing: t2")
        r3 = mod.record_refusal(gap["gap_key"], gap, OBS, "refusing: t3")
        check("refusal1 count=1 not requested", r1 == (1, None, False), str(r1))
        check("refusal2 count=2 not requested", r2 == (2, [], False), str(r2))
        check("refusal3 count=3 requested", r3 == (3, [], True), str(r3))
        check("exactly one request file after 3 refusals",
              len(ctx.request_files()) == 1, str(ctx.request_files()))
        req = json.load(open(os.path.join(ctx.requests, ctx.request_files()[0])))
        check("request carries the three options",
              req.get("options") == ["MARK VERIFIED WITH EVIDENCE",
                                     "SKIP THIS CLOSE",
                                     "KEEP OPEN UNTIL <date-or-condition>"])
        check("request is not an auto-close",
              "NOT an auto-close" in req.get("note", ""))
        r4 = mod.record_refusal(gap["gap_key"], gap, OBS, "refusing: t4")
        check("refusal4 count=4 not requested again", r4 == (4, [], False), str(r4))
        check("still exactly one request file after 4 refusals",
              len(ctx.request_files()) == 1)
        # age phrasing drift across reports must NOT reset the counter
        gap2 = ctx.gap(reason="answer_captured for 52.5h with no terminal verify/emit/skip decision")
        r5 = mod.record_refusal(gap2["gap_key"], gap2, OBS, "refusing: t5")
        check("age-only reason drift keeps streak", r5[0] == 5 and r5[1] == [], str(r5))
    finally:
        ctx.restore()

    # --- 2. counter resets on each of the four change types ------------------
    change_cases = []
    # source change: sidecar timestamp differs
    c1 = Ctx(mod)
    try:
        g = c1.gap()
        mod.record_refusal(g["gap_key"], g, OBS, "r1")
        mod.record_refusal(g["gap_key"], g, OBS, "r2")
        make_sidecar(os.path.join(c1.intel, "20260928-090420-test.provenance.json"),
                     timestamp="20260927-090420")
        r = mod.record_refusal(g["gap_key"], g, OBS, "r3-new-source")
        check("source change resets counter to 1",
              r[0] == 1 and r[1] == ["source"], str(r))
        check("source change clears decision_requested",
              mod.load_refusal_ledger()[g["gap_key"]]["decision_requested"] is False)
    finally:
        c1.restore()

    # evidence change: verification field differs
    c2 = Ctx(mod)
    try:
        g = c2.gap()
        mod.record_refusal(g["gap_key"], g, OBS, "r1")
        mod.record_refusal(g["gap_key"], g, OBS, "r2")
        make_sidecar(os.path.join(c2.intel, "20260928-090420-test.provenance.json"),
                     verification="failed")
        r = mod.record_refusal(g["gap_key"], g, OBS, "r3-new-evidence")
        check("evidence change resets counter to 1",
              r[0] == 1 and r[1] == ["evidence"], str(r))
    finally:
        c2.restore()

    # disposition change: lifecycle differs
    c3 = Ctx(mod)
    try:
        g = c3.gap()
        mod.record_refusal(g["gap_key"], g, OBS, "r1")
        mod.record_refusal(g["gap_key"], g, OBS, "r2")
        g2 = c3.gap(lifecycle="REOPENED")
        r = mod.record_refusal(g2["gap_key"], g2, OBS, "r3-new-disposition")
        check("disposition change resets counter to 1",
              r[0] == 1 and r[1] == ["disposition"], str(r))
    finally:
        c3.restore()

    # semantics change: step differs (same key, hypothetical but proves the component)
    c4 = Ctx(mod)
    try:
        g = c4.gap()
        mod.record_refusal(g["gap_key"], g, OBS, "r1")
        mod.record_refusal(g["gap_key"], g, OBS, "r2")
        g2 = c4.gap(step="EMIT")
        r = mod.record_refusal(g2["gap_key"], g2, OBS, "r3-new-semantics")
        check("semantics change resets counter to 1",
              r[0] == 1 and r[1] == ["semantics"], str(r))
    finally:
        c4.restore()

    # --- 3. new generation re-arms: its own single request -------------------
    c5 = Ctx(mod)
    try:
        g = c5.gap()
        for i in range(3):
            mod.record_refusal(g["gap_key"], g, OBS, "gen1-%d" % i)
        check("gen1 emitted one request", len(c5.request_files()) == 1)
        make_sidecar(os.path.join(c5.intel, "20260928-090420-test.provenance.json"),
                     timestamp="20260928-090420")
        for i in range(3):
            rr = mod.record_refusal(g["gap_key"], g, OBS, "gen2-%d" % i)
        check("gen2 third refusal requests again", rr == (3, [], True), str(rr))
        check("two request files total, one per generation",
              len(c5.request_files()) == 2, str(c5.request_files()))
    finally:
        c5.restore()

    # --- 4. successful close clears the streak --------------------------------
    c6 = Ctx(mod)
    try:
        g = c6.gap()
        mod.record_refusal(g["gap_key"], g, OBS, "r1")
        mod.record_refusal(g["gap_key"], g, OBS, "r2")
        check("streak at 2 before clear", c6.ledger_count(g["gap_key"]) == 2)
        mod.clear_refusal(g["gap_key"])
        check("clear_refusal drops the entry", c6.ledger_count(g["gap_key"]) == 0)
    finally:
        c6.restore()

    # --- 5. end to end: main --apply with a refusing closer ------------------
    mod2 = load_mod()
    tmp = tempfile.mkdtemp(prefix="distill-refusal-e2e-")
    old_env = dict(os.environ)
    try:
        rec = os.path.join(tmp, "reconciliation")
        intel = os.path.join(tmp, "intel")
        os.makedirs(rec)
        os.makedirs(intel)
        gap = make_gap()
        make_sidecar(os.path.join(intel, gap["input"]))
        with open(os.path.join(intel, "20260928-090420-test.md"), "w") as f:
            f.write("# test answer\n")
        sidecar_before = open(os.path.join(intel, gap["input"]), "rb").read()
        for i in range(4):
            rep = {"meta": {"checked_at": "2026-09-%02dT10:03:33+00:00" % (27 + i)},
                   "gaps": [dict(gap, reason="answer_captured for %d.0h with no terminal verify/emit/skip decision" % (90 + i))]}
            with open(os.path.join(rec, "reconcile-202609%02d-100333.json" % (27 + i)), "w") as f:
                json.dump(rep, f)
        closer = os.path.join(tmp, "fake-closer.sh")
        with open(closer, "w") as f:
            f.write("#!/bin/bash\necho 'refusing: fake closer refuses' >&2\nexit 2\n")
        os.chmod(closer, os.stat(closer).st_mode | stat.S_IEXEC)
        os.environ["DISTILL_REC_DIR"] = rec
        os.environ["DISTILL_INTEL"] = intel
        os.environ["DISTILL_CLOSER"] = closer
        os.environ["DISTILL_REFUSAL_LEDGER"] = os.path.join(tmp, "refusals.json")
        os.environ["DISTILL_DECISION_REQUESTS_DIR"] = os.path.join(tmp, "decision-requests")

        counts = []
        for run in range(4):
            sys.argv = ["chronic-distill-close.py", "--apply"]
            rc = mod2.main()
            check("e2e run %d exits 2 (refused)" % (run + 1), rc == 2, "rc=%r" % rc)
            d = mod2.load_refusal_ledger()
            counts.append(d.get(gap["gap_key"], {}).get("count", 0))
            after = open(os.path.join(intel, gap["input"]), "rb").read()
            check("e2e run %d: sidecar byte-identical (no auto-close)" % (run + 1),
                  after == sidecar_before)
            check("e2e run %d: sidecar has no distill decision" % (run + 1),
                  b"distill" not in after.lower() or b"answer_captured" in after)
        check("e2e streak accumulates 1,2,3,4", counts == [1, 2, 3, 4], str(counts))
        reqdir = os.environ["DISTILL_DECISION_REQUESTS_DIR"]
        rfiles = sorted(os.listdir(reqdir))
        check("e2e exactly one decision request after 4 runs",
              len(rfiles) == 1, str(rfiles))
        req = json.load(open(os.path.join(reqdir, rfiles[0])))
        check("e2e request options present",
              req.get("options") == ["MARK VERIFIED WITH EVIDENCE",
                                     "SKIP THIS CLOSE",
                                     "KEEP OPEN UNTIL <date-or-condition>"])
        check("e2e request refusal count is 3", req.get("consecutive_refusals") == 3)
    finally:
        os.environ.clear()
        os.environ.update(old_env)
        shutil.rmtree(tmp, ignore_errors=True)

    print()
    if failures:
        print("FAILURES: %d (%s)" % (len(failures), ", ".join(failures)))
        return 1
    print("ALL TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
