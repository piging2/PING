#!/usr/bin/env python3
"""Proof-scoped Business Agent counterfactual for radar run 20260914-201906.

NOT standing machinery: a one-run decision function executed twice, once
with PING knowledge retrieved live from the gateway and once with the
PING-derived rows removed. The decision logic is identical in both runs;
only the evidence set differs. PING_RELEVANCE is derived from the compared
outputs, never hand-coded.

Decision rules (same both runs):
- defunct entity -> NO_VALUE (radar premise void; nothing to route)
- age contradicted by evidence -> NO_VALUE (new-business premise refuted)
- age old-but-real, outside the 60-90d radar window -> NO_VALUE (not a hit)
- age unknown, existence confirmed, SOS date unverified:
    - with PING rule: the accepted rule blocks pipeline add without a
      verified SOS formation date -> RESEARCH_MORE (verify the filing date;
      existence confirmed so the candidate is not discarded)
    - without PING rule: standing principles (known->inferred->unknown;
      never promote UNVERIFIED research into canonical records) forbid
      tagging NEW or adding on an unverified age claim -> RESEARCH_MORE
"""
import json
import os
import subprocess
import sys

PROOF = os.path.expanduser("~/workspace/tandem/proof-20260914")
RULE_EVENT_ID = "874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7"
RULE_PHRASES = (
    "no pipeline add without a verified",
    "never add a new-business-radar prospect",
)


def fetch_ping_rule():
    """Retrieve the accepted SOS-date rule live from PING. Fail closed."""
    r = subprocess.run(
        [sys.executable, os.path.expanduser("~/workspace/tandem/emit-observation.py"),
         "--fetch-event", RULE_EVENT_ID],
        capture_output=True, text=True, timeout=120)
    text = (r.stdout or "") + (r.stderr or "")
    if r.returncode != 0 or "verified" not in text.lower():
        return None, f"fetch failed rc={r.returncode}"
    if not any(p in text for p in RULE_PHRASES):
        return None, "rule phrases absent from fetched event"
    return text, "ok"


def decide(c, ping_rule_text):
    name = c["name"]
    age = c["age_evidence"]
    if age == "defunct":
        return ("NO_VALUE",
                "entity ceased independent operation (acquired); radar premise void")
    if age == "contradicted":
        return ("NO_VALUE",
                "new-business premise refuted by multi-year history evidence")
    if age == "old-but-real":
        return ("NO_VALUE",
                "founded Dec 2022, outside the 60-90 day radar window; not a radar hit")
    # age unknown, existence confirmed, SOS date unverified
    if ping_rule_text is not None:
        return ("RESEARCH_MORE",
                "existence confirmed, age unverified; accepted PING rule "
                f"(event {RULE_EVENT_ID[:12]}...) blocks pipeline add without "
                "a verified SOS formation date; verify filing date next")
    return ("RESEARCH_MORE",
            "existence confirmed, age unverified; known->inferred->unknown and "
            "no-promotion-of-unverified-claims forbid NEW tag or pipeline add; "
            "verify filing date next")


def run_variant(candidates, ping_rule_text, label):
    evidence = {"verification_report": "verified-20260914-201906-b.md",
                "candidates": len(candidates)}
    if ping_rule_text is not None:
        evidence["ping_rule_event"] = RULE_EVENT_ID
        evidence["ping_check"] = "OK"
    else:
        evidence["ping_check"] = "DISABLED_COUNTERFACTUAL"
        blob = json.dumps(evidence)
        assert RULE_EVENT_ID[:12] not in blob and not any(
            p in blob for p in RULE_PHRASES), "PING leak in without-PING run"
    decisions = {}
    for c in candidates:
        action, reason = decide(c, ping_rule_text)
        decisions[c["name"]] = {"action": action, "reason": reason}
    return {"variant": label, "evidence": evidence, "decisions": decisions}


def main():
    cands = json.load(open(os.path.join(PROOF, "candidates-verified.json")))["candidates"]

    rule_text, status = fetch_ping_rule()
    with_ping = run_variant(cands, rule_text if status == "ok" else None, "with_ping")
    if status != "ok":
        with_ping["evidence"]["ping_check"] = "UNCHECKABLE"
        with_ping["note"] = ("PING retrieval failed at decision time; uncertainty "
                             f"carried forward ({status}); rule not applied")
    without_ping = run_variant(cands, None, "without_ping")

    a = {k: v["action"] for k, v in with_ping["decisions"].items()}
    b = {k: v["action"] for k, v in without_ping["decisions"].items()}
    if a == b:
        relevance = "NONE"
        relevance_note = ("identical selected actions with and without PING; "
                          "the rule changed the justification, not the action")
    else:
        diff = {k: (b[k], a[k]) for k in a if a[k] != b[k]}
        relevance = "MATERIAL"
        relevance_note = f"actions differ without->with PING: {diff}"

    record = {
        "record_type": "radar_batch_decision",
        "decision_id": "RD-20260914-05",
        "scope": "b-new-business-radar run 20260914-201906 (10 candidates)",
        "decided_by": "business-agent seat (production proof)",
        "with_ping": with_ping,
        "without_ping": without_ping,
        "ping_relevance": relevance,
        "ping_relevance_note": relevance_note,
        "summary": {
            k: v for k, v in
            sorted(((act, sum(1 for d in a.values() if d == act))
                    for act in set(a.values())))},
        "durable_action": ("record governed no-add for all 10; no pipeline "
                           "mutation; 2 age-unknown candidates noted as "
                           "pending SOS-date verification (interactive CO SOS "
                           "lookup requires browser delegation)"),
    }
    out = os.path.join(PROOF, "decision-counterfactual.json")
    json.dump(record, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(json.dumps({"decision_id": record["decision_id"],
                      "ping_relevance": relevance,
                      "summary": record["summary"],
                      "with_ping_check": with_ping["evidence"]["ping_check"]},
                     indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
