"""Content corpus registry validator.

Stdlib only. Loads registry.json and on-hold.json, validates schema,
prints counts by status and group, exits nonzero on any violation.
Pure deterministic functions over dict/JSON; no IO in the validators.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY_PATH = os.path.join(HERE, "registry.json")
ON_HOLD_PATH = os.path.join(HERE, "on-hold.json")

REQUIRED_FIELDS = (
    "id",
    "title",
    "group",
    "source_ref",
    "status",
    "artifact_path",
    "claim_class",
    "dedupe_note",
)

STATUS_ENUM = (
    "DRAFT_NEEDS_APPROVAL",
    "SPEC_DRAFT",
    "ON_HOLD",
    "IN_BUILD",
    "DONE_MACHINERY",
)

GROUP_ENUM = (
    "experiment-plan",
    "content-angles",
    "parked-queue",
    "l6-credibility",
    "education-formats",
    "contrarian-hooks",
)

CLAIM_CLASS_ENUM = (
    "VERIFIED",
    "INFERRED",
    "MIXED",
    "N_A",
)

# The 12 pipeline primitives already built in content-pipeline/.
PRIMITIVES = (
    "claim-ledger",
    "source-packet",
    "marker-metrics",
    "edit-classifier",
    "production-manifest",
    "video-verification",
    "distribution-package",
    "derivative-lineage",
    "content-features",
    "prior-art",
    "adversarial-review",
    "epistemic-metadata",
)

DEDUPE_RE = re.compile(r"^(none|partial:[a-z0-9+.\-]+|covered:[a-z0-9+.\-]+)$")

ON_HOLD_REQUIRED_FIELDS = ("id", "title", "source_ref", "status", "note")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_registry(data):
    """Return a list of violation strings for a decoded registry.json."""
    violations = []
    if not isinstance(data, dict):
        return ["registry root is not an object"]
    items = data.get("items")
    if not isinstance(items, list):
        return ["registry.items is not a list"]
    seen_ids = {}
    for i, item in enumerate(items):
        where = "items[%d]" % i
        if not isinstance(item, dict):
            violations.append("%s is not an object" % where)
            continue
        for field in REQUIRED_FIELDS:
            if field not in item:
                violations.append("%s (%s): missing field %r"
                                 % (where, item.get("id", "?"), field))
        item_id = item.get("id")
        if isinstance(item_id, str):
            if item_id in seen_ids:
                violations.append("%s: duplicate id %r (first at items[%d])"
                                 % (where, item_id, seen_ids[item_id]))
            else:
                seen_ids[item_id] = i
        status = item.get("status")
        if status not in STATUS_ENUM:
            violations.append("%s: bad status %r" % (where, status))
        group = item.get("group")
        if group not in GROUP_ENUM:
            violations.append("%s: bad group %r" % (where, group))
        claim_class = item.get("claim_class")
        if claim_class not in CLAIM_CLASS_ENUM:
            violations.append("%s: bad claim_class %r" % (where, claim_class))
        title = item.get("title")
        if not isinstance(title, str) or not title.strip():
            violations.append("%s: empty or missing title" % where)
        note = item.get("dedupe_note")
        if not isinstance(note, str) or not DEDUPE_RE.match(note):
            violations.append("%s: bad dedupe_note %r" % (where, note))
        elif note.startswith(("partial:", "covered:")):
            refs = note.split(":", 1)[1].split("+")
            for ref in refs:
                if ref not in PRIMITIVES:
                    violations.append("%s: unknown primitive %r in dedupe_note"
                                     % (where, ref))
        ap = item.get("artifact_path")
        if ap is not None and (not isinstance(ap, str) or not ap.strip()):
            violations.append("%s: artifact_path must be a non-empty string or null"
                             % where)
    return violations


def validate_on_hold(data, registry_ids):
    """Return violation strings for a decoded on-hold.json."""
    violations = []
    if not isinstance(data, dict):
        return ["on-hold root is not an object"]
    items = data.get("items")
    if not isinstance(items, list):
        return ["on-hold.items is not a list"]
    for i, item in enumerate(items):
        where = "on-hold items[%d]" % i
        if not isinstance(item, dict):
            violations.append("%s is not an object" % where)
            continue
        for field in ON_HOLD_REQUIRED_FIELDS:
            if field not in item:
                violations.append("%s: missing field %r" % (where, field))
        if item.get("status") != "PARKED":
            violations.append("%s: status must be PARKED, got %r"
                             % (where, item.get("status")))
        item_id = item.get("id")
        if item_id not in registry_ids:
            violations.append("%s: id %r not present in registry" % (where, item_id))
    return violations


def count_by(items, key):
    counts = {}
    for item in items:
        counts[item[key]] = counts.get(item[key], 0) + 1
    return counts


def main():
    registry = load_json(REGISTRY_PATH)
    on_hold = load_json(ON_HOLD_PATH)
    violations = validate_registry(registry)
    registry_ids = set()
    if isinstance(registry, dict) and isinstance(registry.get("items"), list):
        for item in registry["items"]:
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                registry_ids.add(item["id"])
    violations.extend(validate_on_hold(on_hold, registry_ids))
    if violations:
        for v in violations:
            print("VIOLATION: %s" % v)
        return 1
    items = registry["items"]
    print("registry items: %d" % len(items))
    print("counts by status:")
    for status, n in sorted(count_by(items, "status").items()):
        print("  %s: %d" % (status, n))
    print("counts by group:")
    for group, n in sorted(count_by(items, "group").items()):
        print("  %s: %d" % (group, n))
    print("on-hold items: %d" % len(on_hold["items"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
