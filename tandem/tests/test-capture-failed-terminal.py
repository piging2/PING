"""CAPTURE_FAILED terminal semantics (2026-09-23, CEO MODE engine hardening).

Invariant: a .md.CAPTURE_FAILED file is a TERMINAL EXECUTION OUTCOME. The
run failed to capture evidence; it is not successful evidence and never
enters extraction. Three consumers must agree:
  1. close tooling: mark-distill-closed.sh --decision capture_failed closes
     the sidecar (verification -> failed, capture_failed_closed transition),
     refusing anything whose sidecar is not status=capture_failed.
  2. reconciliation: reconcile.py R7 counts terminal capture_failed runs as
     recognized outcomes (never gaps) and flags non-terminal ones plus
     orphan evidence files as actionable gaps.
  3. distill sweep: distill-sweep.py lists .md.CAPTURE_FAILED files as
     eligible=False with an explicit terminal reason; they are never dead
     letters and never selected.
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile

TANDEM = os.path.expanduser("~/workspace/tandem")
CLOSE_SH = os.path.join(TANDEM, "mark-distill-closed.sh")


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(TANDEM, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _close(args, cwd):
    return subprocess.run(["bash", CLOSE_SH] + args, cwd=cwd,
                          capture_output=True, text=True, timeout=30)


def _write_sidecar(d, name, verification, ping_ingestion, status="capture_failed"):
    d = dict(d)
    d.update({"status": status, "verification": verification,
              "ping_ingestion": ping_ingestion})
    with open(os.path.join(d["_dir"], name), "w") as f:
        json.dump({k: v for k, v in d.items() if not k.startswith("_")}, f)
    return os.path.join(d["_dir"], name)


def _mkdir():
    d = tempfile.mkdtemp()
    return {"_dir": d}


# ---------------------------------------------------------------- close tool

def test_close_upgrades_non_terminal_sidecar():
    fx = _mkdir()
    stem = "20260923-000001-a-test"
    open(os.path.join(fx["_dir"], stem + ".md.CAPTURE_FAILED"), "w").write("prompt echo")
    _write_sidecar(fx, stem + ".provenance.json", "pending", "pending")
    r = _close([stem + ".md.CAPTURE_FAILED", "--by", "unit-test",
                "--decision", "capture_failed"], fx["_dir"])
    assert r.returncode == 0, r.stderr
    assert "distill-closed: capture_failed" in r.stdout
    d = json.load(open(os.path.join(fx["_dir"], stem + ".provenance.json")))
    assert d["status"] == "capture_failed"
    assert d["verification"] == "failed"
    assert d["ping_ingestion"] == "not_attempted"
    states = [t["state"] for t in d["transitions"]]
    assert states == ["capture_failed_closed"]
    assert d["transitions"][0]["decision"] == "capture_failed"
    assert "unit-test" in d["transitions"][0]["by"]


def test_close_not_attempted_shape_upgraded():
    # The 2026-09-13 manually reclassified backlog shape:
    # verification=not_attempted must also reach failed.
    fx = _mkdir()
    stem = "20260913-091129-b-test"
    open(os.path.join(fx["_dir"], stem + ".md.CAPTURE_FAILED"), "w").write("x")
    _write_sidecar(fx, stem + ".provenance.json", "not_attempted", "not_attempted")
    r = _close([stem + ".md.CAPTURE_FAILED", "--by", "unit-test",
                "--decision", "capture_failed:backfill"], fx["_dir"])
    assert r.returncode == 0, r.stderr
    d = json.load(open(os.path.join(fx["_dir"], stem + ".provenance.json")))
    assert d["verification"] == "failed"
    assert d["ping_ingestion"] == "not_attempted"
    assert d["transitions"][0]["reason"] == "backfill"


def test_close_idempotent_on_second_run():
    fx = _mkdir()
    stem = "20260923-000002-a-test"
    open(os.path.join(fx["_dir"], stem + ".md.CAPTURE_FAILED"), "w").write("x")
    _write_sidecar(fx, stem + ".provenance.json", "failed", "not_attempted")
    args = [stem + ".md.CAPTURE_FAILED", "--by", "unit-test",
            "--decision", "capture_failed"]
    r1 = _close(args, fx["_dir"])
    assert r1.returncode == 0, r1.stderr
    r2 = _close(args, fx["_dir"])
    assert r2.returncode == 0, r2.stderr
    assert "already-distill-closed" in r2.stdout
    d = json.load(open(os.path.join(fx["_dir"], stem + ".provenance.json")))
    assert [t["state"] for t in d["transitions"]].count("capture_failed_closed") == 1


def test_close_refuses_answer_captured_sidecar():
    fx = _mkdir()
    stem = "20260923-000003-a-test"
    open(os.path.join(fx["_dir"], stem + ".md.CAPTURE_FAILED"), "w").write("x")
    _write_sidecar(fx, stem + ".provenance.json", "pending", "pending",
                   status="answer_captured")
    r = _close([stem + ".md.CAPTURE_FAILED", "--by", "unit-test",
                "--decision", "capture_failed"], fx["_dir"])
    assert r.returncode == 2
    assert "capture_failed" in r.stderr


def test_close_refuses_plain_md_file():
    fx = _mkdir()
    stem = "20260923-000004-a-test"
    open(os.path.join(fx["_dir"], stem + ".md"), "w").write("x")
    _write_sidecar(fx, stem + ".provenance.json", "pending", "pending")
    r = _close([stem + ".md", "--by", "unit-test",
                "--decision", "capture_failed"], fx["_dir"])
    assert r.returncode == 2


def test_close_refuses_verified_sidecar():
    # A verified sidecar can never be marked failed, even via capture_failed.
    fx = _mkdir()
    stem = "20260923-000005-a-test"
    open(os.path.join(fx["_dir"], stem + ".md.CAPTURE_FAILED"), "w").write("x")
    _write_sidecar(fx, stem + ".provenance.json", "verified", "pending")
    r = _close([stem + ".md.CAPTURE_FAILED", "--by", "unit-test",
                "--decision", "capture_failed"], fx["_dir"])
    assert r.returncode == 2
    assert "already verified" in r.stderr


# ------------------------------------------------------------- reconciler R7

def _reconcile():
    return _load("tandem_reconcile", "reconcile.py")


def _sc(status, verification, transitions=()):
    return {"status": status, "verification": verification,
            "ping_ingestion": "not_attempted", "brief_id": "a-test",
            "transitions": list(transitions)}


def test_r7_terminal_by_verification_counted_not_gapped():
    rec = _reconcile()
    sidecars = {"20260923-000001-a-test.provenance.json":
                _sc("capture_failed", "failed")}
    gaps, terminal, orphans = rec.check_capture_failed_terminal(
        sidecars, ["20260923-000001-a-test.md.CAPTURE_FAILED"])
    assert gaps == []
    assert terminal == 1
    assert orphans == []


def test_r7_terminal_by_transition_counted():
    rec = _reconcile()
    sidecars = {"20260923-000002-a-test.provenance.json":
                _sc("capture_failed", "failed",
                    [{"state": "capture_failed_closed"}])}
    gaps, terminal, _ = rec.check_capture_failed_terminal(sidecars, [])
    assert gaps == []
    assert terminal == 1


def test_r7_non_terminal_is_actionable_gap():
    rec = _reconcile()
    sidecars = {"20260913-121048-a-test.provenance.json":
                _sc("capture_failed", "pending")}
    gaps, terminal, _ = rec.check_capture_failed_terminal(
        sidecars, ["20260913-121048-a-test.md.CAPTURE_FAILED"])
    assert terminal == 0
    assert len(gaps) == 1
    g = gaps[0]
    assert g["rule"] == "R7" and g["step"] == "DISTILL" and g["state"] == "GAP"
    assert "mark-distill-closed.sh" in g["next_eligible_step"]
    assert g["resumable"] is False


def test_r7_orphan_evidence_is_provenance_gap():
    rec = _reconcile()
    gaps, terminal, orphans = rec.check_capture_failed_terminal(
        {}, ["20260923-000009-a-test.md.CAPTURE_FAILED"])
    assert terminal == 0
    assert orphans == ["20260923-000009-a-test.md.CAPTURE_FAILED"]
    assert len(gaps) == 1
    assert gaps[0]["rule"] == "R7" and gaps[0]["step"] == "PROVENANCE"


def test_r7_ignores_answer_captured_sidecars():
    rec = _reconcile()
    sidecars = {"20260923-000010-a-test.provenance.json":
                _sc("answer_captured", "pending")}
    gaps, terminal, _ = rec.check_capture_failed_terminal(sidecars, [])
    assert gaps == [] and terminal == 0


# ------------------------------------------------------------------ sweep

def _sweep():
    os.environ["META_INTEL_DIR"] = tempfile.mkdtemp()
    os.environ["DISTILL_NOW"] = "2026-09-23T20:00:00Z"
    return _load("tandem_distill_sweep_cf", "distill-sweep.py")


def test_sweep_lists_capture_failed_as_terminal_excluded():
    sw = _sweep()
    d = os.environ["META_INTEL_DIR"]
    stem = "20260923-150000-a-weak-website-hunt"
    open(os.path.join(d, stem + ".md.CAPTURE_FAILED"), "w").write("prompt echo")
    json.dump({"status": "capture_failed"},
              open(os.path.join(d, stem + ".provenance.json"), "w"))
    ok_stem = "20260923-150100-b-new-business-radar"
    open(os.path.join(d, ok_stem + ".md"), "w").write("answer")
    json.dump({"status": "answer_captured"},
              open(os.path.join(d, ok_stem + ".provenance.json"), "w"))
    queue = sw.build_queue(intel_dir=d)
    cf = [i for i in queue if i["file"] == stem + ".md.CAPTURE_FAILED"]
    assert len(cf) == 1
    assert cf[0]["eligible"] is False
    assert "capture_failed" in cf[0]["reason"]
    assert "terminal" in cf[0]["reason"]
    ok = [i for i in queue if i["file"] == ok_stem + ".md"]
    assert len(ok) == 1 and ok[0]["eligible"] is True


TESTS = [v for k, v in sorted(globals().items())
         if k.startswith("test_") and callable(v)]


if __name__ == "__main__":
    failed = 0
    for t in TESTS:
        try:
            t()
            print("PASS", t.__name__)
        except Exception as e:
            failed += 1
            print("FAIL", t.__name__, "->", repr(e))
    print("%d/%d capture_failed terminal tests passed"
          % (len(TESTS) - failed, len(TESTS)))
    sys.exit(1 if failed else 0)
