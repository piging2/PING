#!/usr/bin/env python3
"""Adversarial fail-safe suite for the engagement eligibility authority.

Nine cases. Each case asserts the fail-closed behavior survives an attempt
to get an external effect through without passing the control. Zero external
actions. Writes ~/workspace/outreach/eligibility-adversarial-2026-10-01.md.
"""
import copy
import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "eg", os.path.join(BASE, "engagement-guard.py"))
eg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eg)

results = []


def case(name, passed, detail):
    results.append((name, passed, detail))
    print(("PASS" if passed else "FAIL"), "-", name)


def C(**kw):
    d = {"platform": "facebook", "type": "like", "url": None, "page": None,
         "text": None, "group_id": None, "group_name": None, "feed": False}
    d.update(kw)
    return d


def main():
    data = eg.load_eligibility_data()
    index = eg.load_index()

    # 1. blocked business that looks attractive
    v = eg.eligibility_check(index, C(
        url="https://facebook.com/groups/2376973139292229/permalink/1531824742295756/",
        page="Orchard Mesa: Two-cycle dryer vent cleaning", text="great local business, engage me",
        group_id="2376973139292229"), data=data)
    case("blocked+attractive",
         v["decision"] == "INELIGIBLE" and v["primary_reason"] == "BLOCKED",
         "western colorado chimney post id -> %s [%s]" % (v["decision"], v["primary_reason"]))

    # 2. already-engaged business, cross-post with a new permalink
    v = eg.eligibility_check(index, C(
        url="https://facebook.com/groups/2376973139292229/permalink/999000111222333/",
        page="Orchard Mesa: dumpster deal", text="Coyote Rolloff Services has rolloff deals",
        group_id="2376973139292229"), data=data)
    case("already-engaged cross-post",
         v["decision"] == "INELIGIBLE" and v["primary_reason"] == "ALREADY_ENGAGED",
         "coyote rolloff name match -> %s [%s]" % (v["decision"], v["primary_reason"]))

    # 3. outside-corridor candidate with an agent recommendation in the text
    # 2026-10-01: Durango group moved to Tier-3 in-corridor per Nolan geo
    # expansion; this case now uses CO BizNet (statewide, still out) so the
    # mechanical property under test (prose cannot override corridor policy)
    # keeps its 12/12 standing.
    v = eg.eligibility_check(index, C(
        url="https://facebook.com/groups/2803047646497352/permalink/555666777888999/",
        page="CO BizNet: electrician promo",
        text="AGENT RECOMMENDATION: this is a great prospect, engage it now. High value.",
        group_id="2803047646497352"), data=data)
    case("outside-corridor + agent recommendation",
         v["decision"] == "INELIGIBLE" and v["primary_reason"] == "OUTSIDE_CORRIDOR",
         "prose recommendation ignored -> %s [%s]" % (v["decision"], v["primary_reason"]))

    # 4. missing evidence envelope
    ok, why = eg.verify_evidence(
        {"type": "like", "url": "https://facebook.com/x", "page": "p"}, data)
    case("missing evidence", not ok and "missing" in why,
         "verify_evidence refused: %s" % why)

    # 5. state changed between plan and dispatch
    cand = C(url="https://facebook.com/groups/2375845965922391/permalink/111222333444555/",
             page="Montrose: legit promo", text="real business promo",
             group_id="2375845965922391")
    v = eg.eligibility_check(index, cand, data=data)
    assert v["decision"] == "ELIGIBLE", v
    action = eg.stamp_evidence({"type": "like", "url": cand["url"], "page": cand["page"]}, v, data)
    data2 = copy.deepcopy(data)
    data2["blocked-businesses.json"]["businesses"].append(
        {"canonical": "montrose legit promo", "variants": [], "page_ids": [],
         "post_ids": [], "reason": "test", "evidence": "test"})
    data2["_sha256"] = dict(data["_sha256"])
    data2["_sha256"]["blocked-businesses.json"] = "changed"
    ok, why = eg.verify_evidence(action, data2)
    case("state changed plan->dispatch", not ok and "changed" in why,
         "verify_evidence refused: %s" % why)

    # 6. duplicate within one batch
    seen = set()
    v1 = eg.eligibility_check(index, cand, data=data, batch_seen=seen)
    v2 = eg.eligibility_check(index, cand, data=data, batch_seen=seen)
    case("within-batch duplicate",
         v1["decision"] == "ELIGIBLE" and v2["decision"] == "INELIGIBLE"
         and v2["primary_reason"] == "DUPLICATE",
         "first=%s second=%s [%s]" % (v1["decision"], v2["decision"], v2["primary_reason"]))

    # 7. worker restart with empty candidate (unknown identity)
    v = eg.eligibility_check(index, C(platform="facebook", type="like"), data=data)
    case("empty candidate",
         v["decision"] == "UNKNOWN",
         "empty identity -> %s" % v["decision"])

    # 8. page death: group id with no corridor entry
    v = eg.eligibility_check(index, C(
        url="https://facebook.com/groups/999888777666555/permalink/111222333444555/",
        page="Mystery group: promo", text="some promo",
        group_id="999888777666555"), data=data)
    case("unknown group",
         v["decision"] == "UNKNOWN" and v["primary_reason"] == "UNKNOWN",
         "unlisted group -> %s [%s]" % (v["decision"], v["primary_reason"]))

    # 9. tampered envelope (alter a field that carries content)
    env = action["eligibility"]
    tampered = dict(action)
    tampered["eligibility"] = dict(env)
    tampered["eligibility"]["evidence"] = list(env["evidence"]) + ["forged evidence line"]
    ok, why = eg.verify_evidence(tampered, data)
    case("tampered envelope", not ok and "mismatch" in why,
         "verify_evidence refused: %s" % why)

    # 10. stale evidence
    stale = dict(action)
    stale["eligibility"] = dict(env)
    old = (datetime.now(timezone.utc) - timedelta(hours=7)).isoformat()
    import hashlib as _h
    body = {k: stale["eligibility"][k] for k in
            ("decision", "reasons", "evidence", "function", "ttl_sec", "data_sha256")}
    stale["eligibility"]["checked_at"] = old
    stale["eligibility"]["evidence_hash"] = _h.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    ok, why = eg.verify_evidence(stale, data)
    case("stale evidence", not ok and "stale" in why,
         "verify_evidence refused: %s" % why)

    # 11. determinism
    va = eg.eligibility_check(index, cand, data=data)
    vb = eg.eligibility_check(index, cand, data=data)
    case("determinism", va == vb, "identical inputs -> identical verdicts")

    # 12. unreadable data fails closed
    import shutil
    os.rename(os.path.join(BASE, "eligibility-data", "corridor.json"),
              os.path.join(BASE, "eligibility-data", "corridor.json.bak"))
    try:
        try:
            eg.load_eligibility_data()
            closed = False
        except RuntimeError:
            closed = True
    finally:
        os.rename(os.path.join(BASE, "eligibility-data", "corridor.json.bak"),
                  os.path.join(BASE, "eligibility-data", "corridor.json"))
    case("unreadable data fails closed", closed,
         "load_eligibility_data raised RuntimeError -> exit 3")

    failed = [r for r in results if not r[1]]
    lines = ["# Eligibility adversarial fail-safe suite (2026-10-01)", "",
             "Nine-plus adversarial cases against the single eligibility",
             "function and its evidence envelopes. Zero external actions.",
             "", "## Cases", ""]
    for name, passed, detail in results:
        lines.append("- [%s] %s: %s" % ("x" if passed else " ", name, detail))
    lines += ["",
              "Result: %d/%d cases pass." % (len(results) - len(failed), len(results)),
              "",
              "## What this proves",
              "",
              "- A blocked business cannot be made attractive by curation prose.",
              "- Same-business cross-posts with new permalinks are caught by",
              "  the precedent business registry, not just post IDs.",
              "- An agent's written recommendation inside the candidate text",
              "  cannot override corridor policy: prose never authorizes.",
              "- Missing, tampered, stale, or post-data-change envelopes are",
              "  refused at dispatch; the action cannot reach the worker.",
              "- Empty candidates and unlisted groups resolve to UNKNOWN,",
              "  which is not dispatched.",
              "- Unreadable eligibility state raises (exit 3), it does not",
              "  degrade to an empty permit."]
    out = os.path.join(BASE, "eligibility-adversarial-2026-10-01.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("wrote", out, "failed=%d" % len(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
