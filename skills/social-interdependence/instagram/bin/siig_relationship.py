#!/usr/bin/env python3
"""siig_relationship.py: evidence-backed relationship development records.

The objective is meaningful relationship development, not action volume.
A relationship touch is recorded ONLY at VERIFIED_SUCCESS (never on a
claim, never on UNKNOWN). Each touch carries the intent id, action, post
URL, timestamp, and the verification evidence, so the relationship graph is
a projection of verified evidence, not of attempts.
"""
import os

from siig_common import STATE_ROOT, atomic_write_json, read_json, iso_now


def path():
    return os.path.join(STATE_ROOT, "relationships.json")


def record_touch(intent, verification_evidence):
    rels = read_json(path(), {})
    handle = intent["target_handle"]
    entry = rels.setdefault(handle, {"first_engaged_at": None, "touches": []})
    touch = {
        "intent_id": intent["intent_id"],
        "action": intent["action"],
        "post_url": intent.get("target_post_url"),
        "at": iso_now(),
        "verification": verification_evidence,
    }
    entry["touches"].append(touch)
    if entry["first_engaged_at"] is None:
        entry["first_engaged_at"] = touch["at"]
    atomic_write_json(path(), rels)
    return entry


def touch_count(handle):
    rels = read_json(path(), {})
    return len(rels.get(handle, {}).get("touches", []))
