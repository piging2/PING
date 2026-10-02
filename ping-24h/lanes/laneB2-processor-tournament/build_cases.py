#!/usr/bin/env python3
"""Lane B2: build tournament replay cases.

Each case = {contract, id, input, evidence, muse_shadow}.
The muse_shadow judgments below were recorded BEFORE any baseline execution
(they rest on reading the contract implementations, not on baseline outputs).
They are NOT independent evidence of baseline correctness: same operator,
same model family as the tournament runner. Labeled honestly as
muse-self-inference in the records.
"""
import json, hashlib, os

LANE = os.path.expanduser("~/workspace/ping-24h/lanes/laneB2-processor-tournament")
RAW = os.path.join(LANE, "raw")

FULL_CONSTRAINTS = {
    "read_only": True, "no_writes": True, "no_network": True,
    "no_canonical_events": True, "no_mission_state_writes": True,
}

def digest(o):
    return hashlib.sha256(json.dumps(o, sort_keys=True).encode()).hexdigest()[:16]

cases = []

def add(contract, cid, inp, evidence, muse_shadow, jev=False, jev_question=None):
    cases.append({
        "contract": contract, "id": cid, "input": inp, "evidence": evidence,
        "muse_shadow": muse_shadow, "jev_shadow": jev, "jev_question": jev_question,
    })

EVID_AW = {"agent_profiles": "AGENT_PROFILES from vendor/external_agent_adapter.js (in-process, post-override snapshot recorded per case)", "rules": "8 ordered fail-closed checks: known agent; blockedExternal+blockedUntil expiry; not PENDING_AUTH; capability allowed; namespace core::<name>|tenant::<id>; constraints object; tighten vs maxConstraints; no_canonical_events+no_mission_state_writes true"}

# --- Contract 1: mc.authorize_work_order/v1 ---
Q_AW = "Given the agent profile facts and this work order request, what is the probability (0 to 1) that the correct decision under the fail-closed authorization checks is GRANT rather than DENY?"
add("mc.authorize_work_order/v1", "AW-01",
    {"agentId": "hermes", "capability": "text.summarize", "namespace": "core::system", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "GRANT", True, Q_AW)
add("mc.authorize_work_order/v1", "AW-02",
    {"agentId": "hermes", "capability": "orchestration.plan", "namespace": "core::system", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "DENY", True, Q_AW)
add("mc.authorize_work_order/v1", "AW-03",
    {"agentId": "nope-agent", "capability": "text.summarize", "namespace": "core::system", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "DENY", True, Q_AW)
add("mc.authorize_work_order/v1", "AW-04",
    {"agentId": "hermes", "capability": "text.summarize", "namespace": "bad-namespace", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "DENY", True, Q_AW)
add("mc.authorize_work_order/v1", "AW-05",
    {"agentId": "hermes", "capability": "text.summarize", "namespace": "core::system",
     "constraints": {"read_only": True, "no_writes": True, "no_network": True, "no_canonical_events": True}},
    dict(EVID_AW), "DENY", True, Q_AW)
add("mc.authorize_work_order/v1", "AW-06",
    {"agentId": "opencode", "capability": "text.summarize", "namespace": "core::system", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "DENY", True, Q_AW)
add("mc.authorize_work_order/v1", "AW-07",
    {"agentId": "codex", "capability": "text.summarize", "namespace": "core::system", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW, note="codex blockedUntil 2026-09-17T06:01:00Z in profile; expired by design per lane-11 resolution"),
    "GRANT", True, Q_AW)
add("mc.authorize_work_order/v1", "AW-08",
    {"agentId": "codex", "capability": "text.summarize", "namespace": "core::system", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "DENY", True, Q_AW)
cases[-1]["overrides"] = {"profiles": {"codex": {"status": "LIVE", "allowedCapabilities": ["text.summarize"],
    "blockedExternal": {"reason": "synthetic active block for replay", "blockedUntil": "2099-01-01T00:00:00Z"},
    "maxConstraints": {"read_only": True, "no_writes": True, "no_network": True}}}}
cases[-1]["evidence"]["note"] = "runtime override: codex blockedUntil set to 2099-01-01 (in-process only)"
add("mc.authorize_work_order/v1", "AW-09",
    {"agentId": "synth-pending", "capability": "text.summarize", "namespace": "core::system", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "DENY")
cases[-1]["overrides"] = {"profiles": {"synth-pending": {"status": "PENDING_AUTH", "allowedCapabilities": ["text.summarize"],
    "blockedExternal": None, "maxConstraints": {}}}}
cases[-1]["evidence"]["note"] = "runtime override: synthetic PENDING_AUTH agent (in-process only)"
add("mc.authorize_work_order/v1", "AW-10",
    {"agentId": "hermes", "capability": "text.summarize", "namespace": "core::system", "constraints": "not-an-object"},
    dict(EVID_AW), "DENY")
add("mc.authorize_work_order/v1", "AW-11",
    {"agentId": "hermes", "capability": "text.summarize", "namespace": "core::system",
     "constraints": {"read_only": True, "no_writes": True, "no_canonical_events": True, "no_mission_state_writes": True}},
    dict(EVID_AW), "DENY")
add("mc.authorize_work_order/v1", "AW-12",
    {"agentId": "hermes", "capability": "text.summarize", "namespace": "tenant::acme-1", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "GRANT")
add("mc.authorize_work_order/v1", "AW-13",
    {"agentId": "identity_1", "capability": "test.generate", "namespace": "core::system", "constraints": dict(FULL_CONSTRAINTS)},
    dict(EVID_AW), "GRANT")

# --- Contract 2: grantsForViewer/v1 ---
Q_GV = "What is the probability (0 to 1) that the correct grant set for this viewer on this target includes the maintain_site bundle (site.read, site.propose) in addition to object.reference?"
EVID_GV = {"rules": "grantsForViewer pure: everyone gets object.reference; controller of a site-capable object with viewerId==controllerId gets the maintain_site bundle; agents never get publish/message/purchase/advertise/provider/mutate",
           "source": "src/lib/ping/grants.ts (product-lane local mirror; Pig canonical tree unreachable this run)"}
for cid, inp, ms, j in [
    ("GV-01", {"viewerId": "u1", "controllerId": "u1", "isSite": True}, ["object.reference", "site.read", "site.propose"], True),
    ("GV-02", {"viewerId": "u2", "controllerId": "u1", "isSite": True}, ["object.reference"], True),
    ("GV-03", {"viewerId": None, "controllerId": "u1", "isSite": True}, ["object.reference"], True),
    ("GV-04", {"viewerId": "u1", "controllerId": "u1", "isSite": False}, ["object.reference"], True),
    ("GV-05", {"viewerId": "u2", "controllerId": "u3", "isSite": False}, ["object.reference"], False),
    ("GV-06", {"viewerId": "", "controllerId": "u1", "isSite": True}, ["object.reference"], False),
]:
    add("grantsForViewer/v1", cid, inp, dict(EVID_GV), ms, j, Q_GV)

# --- Contract 3: planActions/v1 ---
EVID_PA = {"rules": "open/ask/reference always for known objects; follow/unfollow on identity-backed targets only, never self; like/unlike on content objects only; reply on posts for signed-in viewers; propose_update when viewer controls; open_website when website present; site.read->open_site, site.propose->propose_site_patch",
           "source": "src/lib/ping/action-planner.ts (product-lane local mirror; Pig canonical tree unreachable this run)"}
def target(oid, schema, controller): return {"id": oid, "schema": schema, "controllerId": controller}
PA = [
    ("PA-01", {"viewerId": None, "target": target("obj1", "ping.social.post@1", "c1"), "targetIdentityId": None, "followedByViewer": False, "likedByViewer": False, "website": None},
     ["open", "ask", "reference"], True, "like"),
    ("PA-02", {"viewerId": "v1", "target": target("obj1", "ping.social.post@1", "c1"), "targetIdentityId": None, "followedByViewer": False, "likedByViewer": False, "website": None},
     ["open", "ask", "like", "reply", "reference"], True, "like"),
    ("PA-03", {"viewerId": "v1", "target": target("obj1", "ping.social.post@1", "c1"), "targetIdentityId": None, "followedByViewer": False, "likedByViewer": True, "website": None},
     ["open", "ask", "unlike", "reply", "reference"], False, "unlike"),
    ("PA-04", {"viewerId": "v1", "target": target("obj2", "ping.social.business@1", "v1"), "targetIdentityId": None, "followedByViewer": False, "likedByViewer": False, "website": "https://example.com", "grants": ["object.reference", "site.read", "site.propose"]},
     ["open", "open_site", "ask", "like", "propose_update", "propose_site_patch", "open_website", "reference"], True, "propose_site_patch"),
    ("PA-05", {"viewerId": "v1", "target": target("obj3", "ping.social.profile@1", "id9"), "targetIdentityId": "id9", "followedByViewer": False, "likedByViewer": False, "website": None},
     ["open", "ask", "follow", "reference"], True, "follow"),
    ("PA-06", {"viewerId": "id9", "target": target("obj3", "ping.social.profile@1", "id9"), "targetIdentityId": "id9", "followedByViewer": False, "likedByViewer": False, "website": None},
     ["open", "ask", "reference"], True, "follow"),
    ("PA-07", {"viewerId": "v1", "target": target("obj4", "ping.social.article@1", "c2"), "targetIdentityId": None, "followedByViewer": False, "likedByViewer": False, "website": "https://example.com/menu"},
     ["open", "ask", "like", "open_website", "reference"], False, "open_website"),
    ("PA-08", {"viewerId": "v1", "target": target("obj2", "ping.social.business@1", "c9"), "targetIdentityId": None, "followedByViewer": False, "likedByViewer": False, "website": None, "grants": ["object.reference"]},
     ["open", "ask", "like", "reference"], False, "propose_update"),
]
for cid, inp, ms, use_jev, disc in PA:
    q = "What is the probability (0 to 1) that '%s' is among the correct available actions for this viewer on this target?" % disc
    add("planActions/v1", cid, inp, dict(EVID_PA), ms, use_jev, q if use_jev else None)

# --- Contract 4: classifyReview/v1 ---
Q_CR = "What is the probability (0 to 1) that the correct moderation bucket for this review text is 'positive' rather than 'review'?"
EVID_CR = {"rules": "bucket=positive iff sentiment positive AND confidence>=0.7 AND clean (no profanity/spam/question, caps<=0.5) AND rating absent or >=4; else review. VADER lexicon + profanity/spam/caps heuristics",
           "source": "src/lib/sentiment/classifier.ts (product-lane local mirror; Pig canonical tree unreachable this run)",
           "final_label_source": "human moderation decisions (NOT FOUND locally; accuracy vs human = UNKNOWN this run)"}
CR = [
    ("CR-01", "Excellent service! The plumber was prompt, professional, and the work was perfect. Highly recommend.", 5, "positive", True),
    ("CR-02", "Terrible. They never showed up and ignored my calls. Worst experience ever.", 1, "review", True),
    ("CR-03", "It was fine, I guess. Nothing special.", 3, "review", True),
    ("CR-04", "GREAT WORK!!!", 5, "review", True),
    ("CR-05", "Great service, will you come back next week?", 5, "review", True),
    ("CR-06", "CLICK HERE to win prize free money!!!", None, "review", True),
    ("CR-07", "These idiots did a damn terrible job.", 1, "review", False),
    ("CR-08", "Oh wonderful, another leak. Just fantastic.", 4, "review", False),
    ("CR-09", "Excellent, amazing, wonderful work.", 2, "review", False),
    ("CR-10", "Good.", 5, "positive", False),
]
for cid, text, rating, ms, j in CR:
    inp = {"text": text}
    if rating is not None: inp["rating"] = rating
    add("classifyReview/v1", cid, inp, dict(EVID_CR), ms, j, Q_CR)

# --- Contract 5: reconcileGate/v1 ---
Q_RG = "What is the probability (0 to 1) that the correct reconcile-gate decision is ALLOW rather than REFUSE?"
EVID_RG = {"rules": "fresh intent -> ALLOW; same key+attempt already dispatched -> REFUSE duplicate_attempt; latest attempt uncertain + new attempt requires valid reconciliation {checked,found,decidedBy} else REFUSE reconciliation_required/invalid; corrupt index -> REFUSE idempotency_index_corrupt; completed latest -> ALLOW new attempt",
           "source": "adapter.js reconcileGate (orca-adapter local mirror; fresh os.tmpdir() evidence dirs only, never production dirs)",
           "outcomes_vocab": "OUTCOME completed|failed|unknown|denied|escalated; EFFECT_STATE effect_unknown|effect_hold|effect_none"}
BASE_EX = {"missionId": "rg-m", "runId": "rg-r", "executionId": "rg-e1"}
def seed_attempt(attempt, phase, outcome=None, status=None, effect_state=None):
    r = {"type": "attempt", "attempt": attempt, "phase": phase}
    if outcome: r["outcome"] = outcome
    if status: r["status"] = status
    if effect_state: r["effect_state"] = effect_state
    return r
RG = [
    ("RG-01", dict(BASE_EX, attempt="1"), {"probe": "rg"}, None, "ALLOW", True),
    ("RG-02", dict(BASE_EX, attempt="1"), {"probe": "rg"}, [seed_attempt("1", "outcome", "completed", effect_state="effect_committed")], "REFUSE", True),
    ("RG-03", dict(BASE_EX, attempt="2"), {"probe": "rg"}, [seed_attempt("1", "dispatch")], "REFUSE", True),
    ("RG-04", dict(BASE_EX, attempt="2"), {"probe": "rg"}, [seed_attempt("1", "dispatch")], "ALLOW", True),
    ("RG-05", dict(BASE_EX, attempt="2"), {"probe": "rg"}, [seed_attempt("1", "dispatch")], "REFUSE", True),
    ("RG-06", dict(BASE_EX, attempt="1"), {"probe": "rg"}, "__CORRUPT__", "REFUSE", True),
    ("RG-07", dict(BASE_EX, attempt="2"), {"probe": "rg"}, [seed_attempt("1", "outcome", "completed", effect_state="effect_committed")], "ALLOW", False),
    ("RG-08", dict(BASE_EX, attempt="1"), {"probe": "rg"}, [seed_attempt("1", "dispatch")], "REFUSE", False),
]
for cid, ex, inp, seed, ms, j in RG:
    ev = dict(EVID_RG)
    if seed is not None: ev["seed_records"] = seed
    ci = {"execution": ex, "input": inp, "tenant_id": "t1", "capability": "text.summarize"}
    if cid == "RG-04":
        ci["reconciliation"] = {"checked": "remote worker receipts and run logs", "found": "no effect committed; process died pre-transport", "decidedBy": "operator:hermes-reconciler"}
    if cid == "RG-05":
        ci["reconciliation"] = {"checked": "remote worker receipts", "found": "unknown"}
    if cid == "RG-08":
        ci["reconciliation"] = {"checked": "remote worker receipts and run logs", "found": "no effect committed", "decidedBy": "operator:hermes-reconciler"}
    add("reconcileGate/v1", cid, ci, ev, ms, j, Q_RG)

with open(os.path.join(RAW, "cases.json"), "w") as f:
    json.dump({"generated": "2026-09-28T14:5x MDT lane B2", "cases": cases}, f, indent=1)
print("cases:", len(cases), "jev-flagged:", sum(1 for c in cases if c["jev_shadow"]))
