#!/usr/bin/env python3
"""Falsify reserved-key shadowing in mission_intent._intent_record().

Invariant under test: the packed front-door record must preserve the
validated required fields exactly. Readers filter and verify on
rec["tenant"] and rec["idempotency_key"], while the E2 digest is
computed from the validated intent.

The defect: _intent_record() merges event_bind at the top level of the
packed record. validate() allows arbitrary event_bind keys. A bind key
named "tenant" or "idempotency_key" therefore overwrites the required
field in the packed record, while intent_digest is still computed from
the true validated intent.

This script is read-only with respect to mission_intent.py. It only
calls public/pure helpers and writes to a temporary journal.
"""

import json
import os
import sys
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
_MC = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "..", "mission-control"))
if _MC not in sys.path:
    sys.path.insert(0, _MC)

import mission_intent as mi


def base_intent(**event_bind):
    return {
        "mission_class": "bind-shadow-test",
        "actor": "falsifier",
        "tenant": "tenant-a",
        "capability": "test.capability",
        "inputs_hash": "0" * 64,
        "idempotency_key": "K-SHADOW-1",
        "event_bind": event_bind,
    }


def packed_event(record):
    return {
        "aggregate_id": "mc:lane:" + mi.INTENT_LANE,
        "event_type": "MC_LANE_STARTED",
        "event_data": {
            "summary": mi._pack_summary("shadow test", record),
        },
    }


def main():
    failures = []

    # Control: ordinary bind keys do not disturb required fields.
    control = mi.validate(base_intent(pass_id="p1"))
    control_rec = mi._intent_record(control)
    control_ok = (
        control_rec["tenant"] == control["tenant"]
        and control_rec["idempotency_key"] == control["idempotency_key"]
        and control_rec["intent_digest"] == mi.canonical_intent_hash(control)
    )
    print("control record preserves required fields:", control_ok)
    if not control_ok:
        failures.append("control record did not preserve required fields")

    # Attack: reserved bind keys overwrite the packed required fields.
    hostile = mi.validate(base_intent(tenant="tenant-b", idempotency_key="K-SHADOW-2"))
    hostile_rec = mi._intent_record(hostile)
    tenant_shadowed = hostile_rec["tenant"] == "tenant-b" != hostile["tenant"]
    key_shadowed = hostile_rec["idempotency_key"] == "K-SHADOW-2" != hostile["idempotency_key"]
    digest_still_true = hostile_rec["intent_digest"] == mi.canonical_intent_hash(hostile)
    print("tenant shadowed in packed record:", tenant_shadowed)
    print("idempotency_key shadowed in packed record:", key_shadowed)
    print("intent_digest still computed from true intent:", digest_still_true)
    if not (tenant_shadowed and key_shadowed and digest_still_true):
        failures.append("expected reserved-key shadowing did not reproduce")

    # Journal consequence: tenant-scoped lookup for the true key misses.
    with tempfile.TemporaryDirectory(prefix="mc-bind-shadow-") as tmp:
        journal = os.path.join(tmp, "journal.jsonl")
        with open(journal, "w", encoding="utf-8") as f:
            f.write(json.dumps(packed_event(hostile_rec)) + "\n")
        found = mi.find_intent_record(journal, "K-SHADOW-1", tenant="tenant-a")
        print("find_intent_record(true key, true tenant):", found)
        if found is not None:
            failures.append("tenant-scoped lookup unexpectedly found the shadowed record")

    if failures:
        print("FAIL:")
        for failure in failures:
            print(" - " + failure)
        raise SystemExit(1)
    print("PASS: reserved event_bind keys shadow packed required fields")


if __name__ == "__main__":
    main()
