"""engine_ingested_prefixes: recognize both outreach-engine audit log formats.

2026-09-23 (meta-ai-intel-pass, this pass): the outreach engine's round-124
changed its ingested.log line format. Legacy rounds wrote
"... answer file <prefix> ingested after independent verification gate. N
items audited: ...". Round-124 wrote
"2026-09-23 round-124 <prefix>-<slug>.md: N businesses audited; verdicts:
VERIFIED-NEW 2, ...". The word "ingest" is gone, so the detector's
'ingest'-only rule missed two fully-audited files and the sweep selected
them as dead letters; they had to be hand-closed as terminal-distilled
after verifying pipeline.md already held the staged rows.

Invariant: a completed engine audit record closes the dead letter in EITHER
format. A line counts iff it carries a YYYYMMDD-HHMMSS run prefix AND
("ingest" OR ("audited" AND "verdicts")), case-insensitive. Lines that
merely mention a run (CAPTURE_FAILED "recorded, NOT extracted") still do
NOT count; missing log still fails open.
"""
import importlib.util
import os
import sys
import tempfile

TANDEM = os.path.expanduser("~/workspace/tandem")


def _load():
    spec = importlib.util.spec_from_file_location(
        "distill-sweep", f"{TANDEM}/distill-sweep.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


engine_ingested_prefixes = _load().engine_ingested_prefixes


def _prefixes(lines):
    d = tempfile.mkdtemp()
    with open(os.path.join(d, "ingested.log"), "w") as f:
        f.write("\n".join(lines) + "\n")
    return engine_ingested_prefixes(d)


def test_legacy_ingested_format_detected():
    lines = [
        "2026-09-21 ~11:50 MDT (round 108) \u2014 answer files "
        "20260921-090637 (a-weak-website-hunt) + 20260921-090421 "
        "(b-new-business-radar) ingested after independent verification "
        "gate. 10 items audited: 4 DUPLICATES"
    ]
    assert _prefixes(lines) == {"20260921-090637", "20260921-090421"}


def test_round124_verdicts_format_detected():
    lines = [
        "2026-09-23 round-124 20260923-150416-b-new-business-radar.md: "
        "10 businesses audited; verdicts: VERIFIED-NEW 2 (Most Anything "
        "Construction And Handyman Service LLC GJ, A&W Cleaning Services "
        "LLC GJ), DUPLICATE 4, UNVERIFIED-DISCARDED 4."
    ]
    assert _prefixes(lines) == {"20260923-150416"}


def test_verdicts_without_audited_not_detected():
    # Narrowness guard: "verdicts" alone is not a completed-audit record.
    lines = [
        "2026-09-23 note: 20260923-150416 verdicts pending engine review"
    ]
    assert _prefixes(lines) == set()


def test_mere_mention_not_detected():
    lines = [
        "2026-09-23 20260923-090620-b-new-business-radar.md.CAPTURE_FAILED "
        "recorded, NOT extracted"
    ]
    assert _prefixes(lines) == set()


def test_missing_log_fails_open():
    assert engine_ingested_prefixes(tempfile.mkdtemp()) == set()


def test_audit_markers_without_prefix_detected_nothing():
    lines = ["10 businesses audited; verdicts: VERIFIED-NEW 2, DUPLICATE 4"]
    assert _prefixes(lines) == set()


if __name__ == "__main__":
    test_legacy_ingested_format_detected()
    test_round124_verdicts_format_detected()
    test_verdicts_without_audited_not_detected()
    test_mere_mention_not_detected()
    test_missing_log_fails_open()
    test_audit_markers_without_prefix_detected_nothing()
    print("all distill audit-format tests passed")
