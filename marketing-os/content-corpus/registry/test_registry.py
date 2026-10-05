"""Pytest tests for the content corpus registry validator."""
import copy
import json
import os

import pytest

import registry as reg

HERE = os.path.dirname(os.path.abspath(__file__))


def load_live_registry():
    with open(os.path.join(HERE, "registry.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def load_live_on_hold():
    with open(os.path.join(HERE, "on-hold.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def make_item(**overrides):
    item = {
        "id": "T1",
        "title": "Test item title",
        "group": "experiment-plan",
        "source_ref": "marketing-os/EXPERIMENT-PLAN.md",
        "status": "DRAFT_NEEDS_APPROVAL",
        "artifact_path": "marketing-os/content-corpus/drafts/a-series/T1.md",
        "claim_class": "VERIFIED",
        "dedupe_note": "none",
    }
    item.update(overrides)
    return item


def test_valid_registry_passes():
    data = {"items": [make_item(id="A1"), make_item(id="B2")]}
    assert reg.validate_registry(data) == []


def test_duplicate_id_fails():
    data = {"items": [make_item(id="X1"), make_item(id="X1")]}
    violations = reg.validate_registry(data)
    assert any("duplicate id" in v for v in violations)


def test_bad_status_fails():
    data = {"items": [make_item(id="X1", status="BOGUS")]}
    violations = reg.validate_registry(data)
    assert any("bad status" in v for v in violations)


def test_missing_field_fails():
    item = make_item(id="X1")
    del item["title"]
    violations = reg.validate_registry({"items": [item]})
    assert any("missing field" in v for v in violations)


def test_bad_group_fails():
    data = {"items": [make_item(id="X1", group="nope")]}
    assert any("bad group" in v for v in reg.validate_registry(data))


def test_bad_claim_class_fails():
    data = {"items": [make_item(id="X1", claim_class="TRUE")]}
    assert any("bad claim_class" in v for v in reg.validate_registry(data))


def test_bad_dedupe_note_fails():
    data = {"items": [make_item(id="X1", dedupe_note="partial:claim-ledger+bogus-thing")]}
    assert any("unknown primitive" in v for v in reg.validate_registry(data))
    data2 = {"items": [make_item(id="X1", dedupe_note="maybe")]}
    assert any("bad dedupe_note" in v for v in reg.validate_registry(data2))


def test_valid_dedupe_notes_pass():
    for note in ("none",
                 "partial:claim-ledger",
                 "partial:claim-ledger+source-packet+adversarial-review",
                 "covered:prior-art"):
        data = {"items": [make_item(id="X1", dedupe_note=note)]}
        assert reg.validate_registry(data) == [], note


def test_null_artifact_path_allowed():
    data = {"items": [make_item(id="X1", artifact_path=None)]}
    assert reg.validate_registry(data) == []


def test_counts_math_correct():
    items = [
        make_item(id="A1", status="DRAFT_NEEDS_APPROVAL", group="experiment-plan"),
        make_item(id="B1", status="SPEC_DRAFT", group="content-angles"),
        make_item(id="C1", status="ON_HOLD", group="parked-queue"),
    ]
    assert reg.count_by(items, "status") == {
        "DRAFT_NEEDS_APPROVAL": 1, "SPEC_DRAFT": 1, "ON_HOLD": 1}
    assert reg.count_by(items, "group") == {
        "experiment-plan": 1, "content-angles": 1, "parked-queue": 1}
    assert sum(reg.count_by(items, "status").values()) == len(items)


def test_on_hold_cross_check():
    registry = {"items": [make_item(id="C1", status="ON_HOLD")]}
    ids = {item["id"] for item in registry["items"]}
    good = {"items": [{"id": "C1", "title": "t", "source_ref": "s",
                       "status": "PARKED", "note": "n"}]}
    assert reg.validate_on_hold(good, ids) == []
    bad_status = copy.deepcopy(good)
    bad_status["items"][0]["status"] = "ON_HOLD"
    assert any("PARKED" in v for v in reg.validate_on_hold(bad_status, ids))
    bad_ref = copy.deepcopy(good)
    bad_ref["items"][0]["id"] = "ZZZ"
    assert any("not present in registry" in v
               for v in reg.validate_on_hold(bad_ref, ids))


def test_live_registry_is_valid():
    data = load_live_registry()
    assert reg.validate_registry(data) == []
    on_hold = load_live_on_hold()
    ids = {item["id"] for item in data["items"]}
    assert reg.validate_on_hold(on_hold, ids) == []
    counts = reg.count_by(data["items"], "status")
    assert counts == {"DRAFT_NEEDS_APPROVAL": 61, "SPEC_DRAFT": 23,
                      "ON_HOLD": 11, "IN_BUILD": 1}
    groups = reg.count_by(data["items"], "group")
    assert groups == {"experiment-plan": 13, "content-angles": 29,
                      "parked-queue": 11, "l6-credibility": 35,
                      "education-formats": 1, "contrarian-hooks": 7}
    assert sum(counts.values()) == len(data["items"]) == 96
    parked = [i for i in on_hold["items"]]
    assert len(parked) == 11
    assert {p["id"] for p in parked} == \
        {i["id"] for i in data["items"] if i["status"] == "ON_HOLD"}
