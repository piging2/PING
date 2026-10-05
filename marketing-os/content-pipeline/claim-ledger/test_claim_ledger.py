"""Cheapest relevant test for claim-ledger: plain asserts, no deps."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ledger import (
    compile_ledger,
    check_prose,
    STATES,
    GUARDED_STATES,
    TREATMENTS,
    CERTAINTY_PHRASES,
)


def sample_claims():
    return [
        {
            "id": "C1",
            "text": "Deterministic replay reproduces identical canonical bytes across runs",
            "state": "CONFIRMED",
            "evidence_refs": ["replay-log-2026-10-01", "adversarial-run-12"],
            "counterevidence": [],
            "reproduction": {"grade": "R4", "command": "pytest -k replay"},
        },
        {
            "id": "C2",
            "text": "Surprise density correlates with expert engagement",
            "state": "PARTIALLY_SUPPORTED",
            "evidence_refs": ["pass-12-metrics"],
            "counterevidence": ["small sample size n=4"],
            "reproduction": {"grade": "R1"},
        },
        {
            "id": "C3",
            "text": "Mission queue stalls because the scheduler never sees worker receipts",
            "state": "INFERRED",
            "evidence_refs": ["stuck-missions-trace"],
            "counterevidence": [],
            "reproduction": {},
        },
        {
            "id": "C4",
            "text": "MarketingOS artifacts change buyer behavior within one quarter",
            "state": "UNKNOWN",
            "evidence_refs": [],
            "counterevidence": [],
            "reproduction": {},
        },
        {
            "id": "C5",
            "text": "The first content compiler design eliminates all manual editing",
            "state": "REFUTED",
            "evidence_refs": [],
            "counterevidence": ["owner edit diff shows 9 edit classes applied"],
            "reproduction": {"grade": "R2"},
        },
    ]


def test_compile_row_shape():
    rows = compile_ledger(sample_claims())
    assert len(rows) == 5
    r = rows[0]
    assert r["id"] == "C1"
    assert r["state"] == "CONFIRMED"
    assert r["evidence_refs"] == ["replay-log-2026-10-01", "adversarial-run-12"]
    assert r["counterevidence"] == []
    assert r["reproduction"] == {"grade": "R4", "command": "pytest -k replay"}
    for key in ("id", "text", "state", "evidence_refs", "counterevidence",
                "reproduction", "publication_treatment"):
        assert key in r, "missing key %s" % key


def test_treatment_per_state():
    rows = compile_ledger(sample_claims())
    modes = {r["id"]: r["publication_treatment"]["mode"] for r in rows}
    assert modes["C1"] == "publish_as_stated"
    assert modes["C2"] == "hedge_required"
    assert modes["C3"] == "explicit_hedging_mandatory"
    assert modes["C4"] == "render_as_unknown"
    assert modes["C5"] == "exclude_or_label_refuted"
    # every state in the taxonomy has a treatment
    assert set(TREATMENTS) == set(STATES)


def test_compile_defaults_and_determinism():
    rows = compile_ledger([{"id": "X", "text": "something holds", "state": "UNKNOWN"}])
    assert rows[0]["evidence_refs"] == []
    assert rows[0]["counterevidence"] == []
    assert rows[0]["reproduction"] == {}
    # deterministic: same input, same output, byte-identical via json
    import json
    a = json.dumps(compile_ledger(sample_claims()), sort_keys=True)
    b = json.dumps(compile_ledger(sample_claims()), sort_keys=True)
    assert a == b


def test_compile_fail_closed():
    try:
        compile_ledger([{"id": "X", "text": "t", "state": "PROVEN"}])
        assert False, "must reject non-taxonomy state"
    except ValueError:
        pass
    try:
        compile_ledger([
            {"id": "X", "text": "t", "state": "UNKNOWN"},
            {"id": "X", "text": "t2", "state": "UNKNOWN"},
        ])
        assert False, "must reject duplicate ids"
    except ValueError:
        pass
    try:
        compile_ledger([{"id": "X", "state": "UNKNOWN"}])
        assert False, "must reject missing text"
    except ValueError:
        pass
    try:
        compile_ledger("not a list")
        assert False, "must reject non-list"
    except ValueError:
        pass


def test_guard_catches_inferred_upgrade():
    ledger = compile_ledger(sample_claims())
    prose = (
        "Our working model of the pipeline is still forming. "
        "Deterministic replay reproduces identical canonical bytes across runs, as measured. "
        "The mission queue stalls because the scheduler never sees worker receipts: "
        "this is proven by our traces."
    )
    violations = check_prose(ledger, prose)
    ids = {v["claim_id"] for v in violations}
    assert "C3" in ids, "INFERRED claim upgraded to 'proven' must be flagged: %r" % violations
    v3 = [v for v in violations if v["claim_id"] == "C3"][0]
    assert v3["offending_phrase"] == "proven"
    assert v3["state"] == "INFERRED"
    # CONFIRMED claim asserted as fact is fine
    assert "C1" not in ids


def test_guard_catches_unknown_and_partially_supported():
    ledger = compile_ledger(sample_claims())
    prose = (
        "MarketingOS artifacts change buyer behavior within one quarter, guaranteed. "
        "Surprise density correlates with expert engagement and definitely drives discussion."
    )
    violations = check_prose(ledger, prose)
    ids = {v["claim_id"] for v in violations}
    assert "C4" in ids, "UNKNOWN claim upgraded with 'guaranteed' must be flagged"
    assert "C2" in ids, "PARTIALLY_SUPPORTED claim upgraded with 'definitely' must be flagged"
    assert "C1" not in ids and "C5" not in ids


def test_guard_passes_honest_hedging():
    ledger = compile_ledger(sample_claims())
    prose = (
        "Deterministic replay reproduces identical canonical bytes across runs, as measured. "
        "We infer that the mission queue stalls because the scheduler never sees worker receipts; "
        "this remains our working model, not a confirmed cause. "
        "Whether MarketingOS artifacts change buyer behavior within one quarter remains an open "
        "question we do not yet know how to answer. "
        "Evidence suggests surprise density correlates with expert engagement, though the "
        "sample size is small."
    )
    violations = check_prose(ledger, prose)
    assert violations == [], "honest hedging must pass: %r" % violations


def test_guard_empty_prose():
    ledger = compile_ledger(sample_claims())
    assert check_prose(ledger, "") == []
    assert check_prose(ledger, None) == []


def test_certainty_list_documented():
    for must in ("proven", "guaranteed", "always", "definitely", "we invented", "novel"):
        assert must in CERTAINTY_PHRASES, "task-mandated phrase %r missing" % must
    assert set(GUARDED_STATES) == {"INFERRED", "PARTIALLY_SUPPORTED", "UNKNOWN"}


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    failed = 0
    for t in tests:
        try:
            t()
            print("PASS %s" % t.__name__)
        except AssertionError as e:
            failed += 1
            print("FAIL %s: %s" % (t.__name__, e))
    print("%d/%d passed" % (len(tests) - failed, len(tests)))
    sys.exit(1 if failed else 0)
