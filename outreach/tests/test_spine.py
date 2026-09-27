#!/usr/bin/env python3
"""Deterministic tests for the spine lane (phase 1: additive observation).

Covers: mission-control/emit.py (MC_PASS_* vocabulary + idempotency),
mission-control/pass_queries.py (the three WHY-questions + rollups),
outreach/retry_policy.py (the proven retry theorem for the X action set),
outreach/spine_observe.py (fold of one real X pass), and the
ping-ui-contract pass-health projection builders (honest unknowns).

Hermetic: all imports resolve inside this branch checkout (paths relative
to this file); the journal is a temp file. Nothing touches the live
engagement logs, the live ledger, or the live journal.
Exit 0 = all green, 1 = any divergence.
"""
import json
import os
import sys
import tempfile

FAILURES = []


def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL"), name, detail)
    if not cond:
        FAILURES.append(name)


# ---- resolve this branch checkout ------------------------------------
THIS = os.path.dirname(os.path.abspath(__file__))
OUTREACH = os.path.normpath(os.path.join(THIS, ".."))
BRANCH = os.path.normpath(os.path.join(OUTREACH, ".."))
MC = os.path.join(BRANCH, "mission-control")
PH = os.path.join(BRANCH, "ping-ui-contract", "apps", "mission-control",
                  "pass-health")
for _p in (OUTREACH, MC, PH):
    if _p not in sys.path:
        sys.path.insert(0, _p)

tmp = tempfile.mkdtemp(prefix="spine-test-")
JOURNAL = os.path.join(tmp, "journal.jsonl")

import emit  # noqa: E402
import pass_queries as Q  # noqa: E402
import retry_policy as RP  # noqa: E402
import spine_observe as SO  # noqa: E402
import projection as PJ  # noqa: E402


def journal_events():
    rows, skipped = Q.load_journal(JOURNAL)
    assert skipped == 0, "malformed test journal lines"
    return rows


# ------------------------------------------------- A. emit.py vocabulary
try:
    ev, how = emit.emit_event(
        "MC_PASS_CLOSED", lane="x", summary="test", source_timestamp="t",
        observation_timestamp="t", import_timestamp="t",
        source_artifact="test", dry_run=True)
    check("A1 MC_PASS_CLOSED accepted by emit_event", how == "appended")
except ValueError as e:
    check("A1 MC_PASS_CLOSED accepted by emit_event", False, str(e))
try:
    emit.emit_event("MC_PASS_BOGUS", lane="x", summary="t",
                    source_timestamp="t", observation_timestamp="t",
                    import_timestamp="t", source_artifact="t", dry_run=True)
    check("A2 unknown MC_PASS_* rejected", False, "no raise")
except ValueError:
    check("A2 unknown MC_PASS_* rejected", True)
a1 = emit.emit_event("MC_PASS_STARTED", lane="x", summary="s",
                     source_timestamp="t1", observation_timestamp="t1",
                     import_timestamp="t1", source_artifact="a",
                     journal_file=JOURNAL)
a2 = emit.emit_event("MC_PASS_STARTED", lane="x", summary="s",
                     source_timestamp="t1", observation_timestamp="t1",
                     import_timestamp="t1", source_artifact="a",
                     journal_file=JOURNAL)
check("A3 journal idempotency (lane events)", a1[1] == "appended"
      and a2[1] == "duplicate-skipped", "%s/%s" % (a1[1], a2[1]))

p1, h1 = emit.emit_pass_event("MC_PASS_STARTED", "x-p1", "x",
                              {"caps": {"follow": 5}}, journal_file=JOURNAL)
p2, h2 = emit.emit_pass_event("MC_PASS_STARTED", "x-p1", "x",
                              {"caps": {"follow": 5}}, journal_file=JOURNAL)
check("A4 pass event emission idempotent", h1 == "appended"
      and h2 == "duplicate-skipped" and p1["event_id"] == p2["event_id"])
check("A5 pass aggregate", p1["aggregate_id"] == "mc:pass:x:x-p1"
      and p1["aggregate_type"] == "mc_pass")
try:
    emit.emit_pass_event("MC_PASS_BOGUS", "x-p1", "x", {},
                         journal_file=JOURNAL)
    check("A6 non-MC_PASS_* rejected by emit_pass_event", False, "no raise")
except ValueError:
    check("A6 non-MC_PASS_* rejected by emit_pass_event", True)

# ------------------------------------------------- B. WHY queries
# Fixture journal: one closed pass with a restriction, one completed pass
# with an unobserved intent, one empty pass.
FIX = []


def _mk(t, pid, data, ts):
    import pass_policy_engine as PE
    ev = PE.pass_event(pid, "x", t, data)
    ev["timestamp"] = ts
    return ev


FIX.append(_mk("MC_PASS_CLOSED", "x-restr", {
    "pass_class": "RATE_LIMIT", "stop_kind": "restriction",
    "actions_landed": 3, "caps_total": 18, "candidates": 5, "eligible": 5,
    "skipped": 0}, "2026-09-26T10:00:00+00:00"))
FIX.append(_mk("MC_PASS_RESTRICTION", "x-restr", {
    "kind": "restriction", "at_action": 4, "of_actions": 5,
    "surfaced_to": "Nolan", "surfaced_at": "2026-09-26T10:05:00+00:00"},
    "2026-09-26T10:05:00+00:00"))
FIX.append(_mk("MC_PASS_CLOSED", "x-done", {
    "pass_class": "SUCCESS_ACTION", "stop_kind": "completed",
    "actions_landed": 5, "caps_total": 18, "candidates": 5, "eligible": 5,
    "skipped": 0}, "2026-09-26T12:00:00+00:00"))
FIX.append(_mk("MC_PASS_MANIFEST", "x-done", {
    "actions": [
        {"account": "@a1", "url": None, "action": "follow"},
        {"account": "@a2", "url": None, "action": "follow"},
    ]}, "2026-09-26T11:00:00+00:00"))
FIX.append(_mk("MC_PASS_INTENTS", "x-done", {
    "intent_ids": ["i1", "i2"], "count": 2}, "2026-09-26T11:01:00+00:00"))
FIX.append(_mk("MC_PASS_OBSERVATION", "x-done", {
    "intents": [{"intent_id": "i1", "account": "@a1", "action": "follow",
                 "terminal": "EXECUTED", "ok": True, "note": "driver"}]},
    "2026-09-26T11:30:00+00:00"))
FIX.append(_mk("MC_PASS_CANDIDATES", "x-old", {
    "candidates": 2, "eligible": 1, "skipped": 1,
    "decisions": [
        {"account": "@gone", "url": None, "action": "follow",
         "decision": "REJECTED", "reason_code": "ALREADY_ENGAGED",
         "evidence": {"history_ref": "x-engagement.md pass 41"}},
        {"account": "@open", "url": None, "action": "follow",
         "decision": "REJECTED", "reason_code": "UNKNOWN_EXECUTION_OPEN",
         "evidence": {"intent_id": "ghost-1", "intent_pass_id": "x-ancient"}},
    ]}, "2026-09-25T12:00:00+00:00"))
FIX.append(_mk("MC_PASS_CLOSED", "x-empty", {
    "pass_class": "SUCCESS_EMPTY", "stop_kind": "empty",
    "actions_landed": 0, "caps_total": 18, "candidates": 0, "eligible": 0,
    "skipped": 0}, "2026-09-26T08:00:00+00:00"))

# latest closed is x-done (12:00)
s = Q.why_did_it_stop("x", FIX)
check("B1 completed pass did not stop early",
      "did not stop early" in s["answer"] and "5/18" in s["answer"],
      s["answer"][:80])
s2 = Q.why_did_it_stop("x", [r for r in FIX
                             if Q._pass_id_of(r) in ("x-restr",)])
check("B2 restriction stop names kind + action",
      "restriction" in s2["answer"] and "action 4 of 5" in s2["answer"],
      s2["answer"][:80])
# restriction stop with the RESTRICTION event missing: unknown, not a guess
s3rows = [r for r in FIX if not (r["event_type"] == "MC_PASS_RESTRICTION")]
s3 = Q.why_did_it_stop("x", s3rows)
s3r = [r for r in s3rows if Q._pass_id_of(r) == "x-restr"]
check("B3 missing stop event is unknown, not guessed",
      "missing from the journal" in Q.why_did_it_stop(
          "x", s3r)["answer"])
s4 = Q.why_did_it_stop("x", [])
check("B4 no pass data is not zero passes",
      "no pass data" in s4["answer"] and "not zero" in s4["answer"])

r1 = Q.why_was_candidate_rejected("x", "@gone", FIX)
check("B5 ALREADY_ENGAGED answer",
      r1["reason_code"] == "ALREADY_ENGAGED" and "already engaged" in
      r1["answer"].lower(), r1["answer"][:70])
r2 = Q.why_was_candidate_rejected("x", "@open", FIX)
check("B6 UNKNOWN_EXECUTION_OPEN names intent + no auto-retry",
      "ghost-1" in r2["answer"] and "will not" in r2["answer"])
r3 = Q.why_was_candidate_rejected("x", "@nobody", FIX)
check("B7 no match is honest, never 'eligible'",
      "No rejection recorded" in r3["answer"]
      and "eligible" not in r3["answer"].lower().replace(
          "was selected", ""))

b = Q.what_did_browser_do("x", FIX, pass_id="x-done")
check("B8 planned-vs-observed table",
      len(b["rows"]) == 2 and b["rows"][0]["terminal"] == "EXECUTED"
      and b["rows"][1]["terminal"] == "UNKNOWN_EXECUTION",
      str([(t["account"], t["terminal"]) for t in b["rows"]]))
check("B9 unknown counted, not zeroed", b["unknown_open"] == 1)

u = Q.unknown_count_for_pass("x", "x-done", FIX)
check("B10 unknown fold", u == {"unknown": 1, "intents": 2, "observed": 1,
                                "open_intent_ids": ["i2"]}, str(u))
u2 = Q.unknown_count_for_pass("x", "x-restr", FIX)
check("B11 missing INTENTS event is unknown, not zero", u2 is None)

from datetime import datetime, timezone as _tz
roll = Q.seven_day_rollup("x", FIX,
                          now=datetime(2026, 9, 27, tzinfo=_tz.utc))
check("B12 7-day rollup", roll["passes"] == 3 and roll["actions"] == 8
      and roll["failures"] == 1 and roll["blocks"] == 1,
      str(roll))
check("B13 empty classes are not failures",
      roll["failures"] == 1)  # only RATE_LIMIT; SUCCESS_EMPTY excluded
roll_none = Q.seven_day_rollup("threads", FIX,
                               now=datetime(2026, 9, 27, tzinfo=_tz.utc))
check("B14 empty window is None, not zeros", roll_none is None)

# ------------------------------------------------- C. retry theorem
like_green = {"liked": False}
like_ev = {"guardDecision": "ELIGIBLE", "intentState": "RESOLVED",
           "platformWarning": False}
d = RP.retry_safe("x.like", RP.CLASS_09_CAMPAIGN, "toggle",
                  like_green, "none", like_ev)
check("C1 like absent + green -> SAFE_TO_RETRY",
      d["decision"] == RP.SAFE_TO_RETRY, d["reason"][:60])
d = RP.retry_safe("x.like", RP.CLASS_09_CAMPAIGN, "toggle",
                  {"liked": True}, "none", like_ev)
check("C2 like already-liked -> RECOVER_SUCCEEDED (never a 2nd toggle)",
      d["decision"] == RP.RECOVER_SUCCEEDED)
d = RP.retry_safe("x.like", RP.CLASS_09_CAMPAIGN, "toggle",
                  {"liked": None}, "none", like_ev)
check("C3 like unreadable -> HOLD_UNKNOWN", d["decision"] == RP.HOLD_UNKNOWN)
d = RP.retry_safe("x.like", RP.CLASS_09_CAMPAIGN, "toggle", like_green,
                  "none", dict(like_ev, guardDecision="ALREADY_ENGAGED"))
check("C4 like guard not ELIGIBLE -> HOLD_UNKNOWN",
      d["decision"] == RP.HOLD_UNKNOWN)
d = RP.retry_safe("x.like", RP.CLASS_09_CAMPAIGN, "toggle", like_green,
                  "none", dict(like_ev, intentState="UNKNOWN_EXECUTION"))
check("C5 like open UNKNOWN_EXECUTION -> HOLD_UNKNOWN",
      d["decision"] == RP.HOLD_UNKNOWN)
d = RP.retry_safe("x.like", RP.CLASS_09_CAMPAIGN, "toggle", like_green,
                  "none", dict(like_ev, platformWarning=True))
check("C6 like under platform warning -> HOLD_UNKNOWN",
      d["decision"] == RP.HOLD_UNKNOWN)

c_ev = {"guardDecision": "ELIGIBLE"}
d = RP.retry_safe("x.comment", RP.CLASS_09_CAMPAIGN, "additive",
                  {"commentPresent": False}, "none", c_ev)
check("C7 comment absent + ELIGIBLE -> SAFE_TO_RETRY",
      d["decision"] == RP.SAFE_TO_RETRY)
d = RP.retry_safe("x.comment", RP.CLASS_09_CAMPAIGN, "additive",
                  {"commentPresent": True}, "none", c_ev)
check("C8 comment present -> RECOVER_SUCCEEDED (no double-post)",
      d["decision"] == RP.RECOVER_SUCCEEDED)
d = RP.retry_safe("x.comment", RP.CLASS_09_CAMPAIGN, "additive",
                  {}, "none", c_ev)
check("C9 comment unreadable -> HOLD_UNKNOWN",
      d["decision"] == RP.HOLD_UNKNOWN)

d = RP.retry_safe("x.follow", RP.CLASS_09_CAMPAIGN, "toggle-ish",
                  {"followed": False}, "none", c_ev)
check("C10 follow has no proven predicate -> HOLD_UNKNOWN",
      d["decision"] == RP.HOLD_UNKNOWN and "no proven predicate" in
      d["reason"])
d = RP.retry_safe("x.repost", RP.CLASS_09_CAMPAIGN, "?", {}, "none", {})
check("C11 unencoded action -> HOLD_UNKNOWN",
      d["decision"] == RP.HOLD_UNKNOWN)
d = RP.retry_safe("x.like", None, "toggle", like_green, "none", like_ev)
check("C12 missing factor -> HOLD_UNKNOWN",
      d["decision"] == RP.HOLD_UNKNOWN)
check("C13 no global retry boolean in the module",
      RP.assert_no_global_retry_flag() == [],
      str(RP.assert_no_global_retry_flag()))

# ------------------------------------------------- D. observer fold
passes = os.path.join(tmp, "passes")
os.makedirs(passes)
TS = "20260926-120000"
PID = "x-" + TS
with open(os.path.join(passes, "x-follow-queue-%s.txt" % TS), "w") as f:
    f.write("@alpha\n@beta\n")
with open(os.path.join(passes,
                       "engagement-guard-decisions.jsonl"), "w") as f:
    for h in ("@alpha", "@beta"):
        f.write(json.dumps({
            "ts": "2026-09-26T12:00:10.000000+00:00", "platform": "x",
            "account": h, "url": None, "action": None,
            "decision": "ELIGIBLE",
            "reason": "no prior engagement found in durable history"})
            + "\n")
with open(os.path.join(passes, "x-follow-actions-%s.json" % TS), "w") as f:
    json.dump([{"account": "@alpha", "action": "follow"},
               {"account": "@beta", "action": "follow"}], f)
with open(os.path.join(passes, "x-pass-%s.json" % TS), "w") as f:
    json.dump({"platform": "x", "created_at": "2026-09-26T12:00:11+00:00",
               "eligible": [{"account": "@alpha", "url": None},
                            {"account": "@beta", "url": None}],
               "pre_pass_snapshot": {"handles": ["alpha", "beta"]}}, f)
with open(os.path.join(passes, "x-follow-outcomes-%s.json" % TS), "w") as f:
    json.dump({"outcomes": [
        {"account": "@alpha", "action": "follow", "ok": True},
        {"account": "@beta", "action": "follow", "ok": True}]}, f)
with open(os.path.join(passes, "x-follow-run-%s.txt" % TS), "w") as f:
    f.write("batch start\n@alpha -> rc=0 :: followed @alpha\n"
            "batch complete\n")
with open(os.path.join(passes, "x-verify-report-%s.json" % TS), "w") as f:
    json.dump({"actions": [{"account": "@alpha", "action": "follow"},
                           {"account": "@beta", "action": "follow"}],
               "manifest": os.path.join(passes, "x-pass-%s.json" % TS),
               "violations": []}, f)
LEDGER = os.path.join(tmp, "ledger.jsonl")
with open(LEDGER, "w") as f:
    for iid, h in (("ii-1", "@alpha"), ("ii-2", "@beta")):
        f.write(json.dumps({"record_type": "intent", "intent_id": iid,
                            "ts": "2026-09-26T12:01:00+00:00",
                            "platform": "x", "account": h,
                            "action": "follow", "url": None,
                            "pass_id": PID,
                            "stage": "ACTION_INTENT_DURABLE"}) + "\n")
    for iid in ("ii-1", "ii-2"):
        f.write(json.dumps({"record_type": "observation", "intent_id": iid,
                            "ts": "2026-09-26T12:30:00+00:00",
                            "pass_id": PID, "terminal": "EXECUTED",
                            "ok": True, "evidence": "driver"}) + "\n")

events, ctx, notes = SO.fold_pass(PID, passes, LEDGER)
types = [t for (t, _, _, _) in events]
expected = ["MC_PASS_STARTED", "MC_PASS_DISCOVERY_TIMEOUT",
            "MC_PASS_DISCOVERY_DONE",
            "MC_PASS_CANDIDATES", "MC_PASS_MANIFEST", "MC_PASS_INTENTS",
            "MC_PASS_EXECUTION_DONE", "MC_PASS_OBSERVATION",
            "MC_PASS_VERIFY", "MC_PASS_CLOSED"]
check("D1 full stage sequence in order (probe absent -> timeout event)",
      types == expected, str(types))
closed = [d for (t, _, _, d) in events if t == "MC_PASS_CLOSED"][0]
check("D2 closed class SUCCESS_ACTION",
      closed["pass_class"] == "SUCCESS_ACTION", closed["pass_class"])
check("D3 closed counts", closed["actions_landed"] == 2
      and closed["unknown_open"] == 0 and closed["candidates"] == 2
      and closed["eligible"] == 2 and closed["skipped"] == 0,
      str({k: closed[k] for k in ("actions_landed", "unknown_open",
                                  "candidates", "eligible", "skipped")}))
cand = [d for (t, _, _, d) in events if t == "MC_PASS_CANDIDATES"][0]
check("D4 decisions grounded in guard audit",
      all(x["decision"] == "SELECTED" and
          x["reason_code"] == "SELECTED" for x in cand["decisions"])
      and len(cand["decisions"]) == 2)
# no observations variant -> UNKNOWN_EXECUTION, never inferred
LEDGER2 = os.path.join(tmp, "ledger2.jsonl")
with open(LEDGER2, "w") as f:
    f.write(json.dumps({"record_type": "intent", "intent_id": "jj-1",
                        "ts": "2026-09-26T12:01:00+00:00", "platform": "x",
                        "account": "@alpha", "action": "follow",
                        "url": None, "pass_id": PID,
                        "stage": "ACTION_INTENT_DURABLE"}) + "\n")
events2, _, _ = SO.fold_pass(PID, passes, LEDGER2)
obs2 = [d for (t, _, _, d) in events2 if t == "MC_PASS_OBSERVATION"][0]
closed2 = [d for (t, _, _, d) in events2 if t == "MC_PASS_CLOSED"][0]
check("D5 intents without observations stay UNKNOWN_EXECUTION",
      obs2["intents"][0]["terminal"] == "UNKNOWN_EXECUTION"
      and closed2["unknown_open"] == 1)
# dry-run emits nothing
J2 = os.path.join(tmp, "j2.jsonl")
res = emit.emit_pass_events(events, journal_file=J2, dry_run=True)
check("D6 dry-run appends nothing",
      not os.path.exists(J2) and all(h == "appended" for (_, h) in res))
# live dirs untouched: observer is read-only
before = sorted(os.listdir(passes))
SO.fold_pass(PID, passes, LEDGER)
check("D7 observer leaves live artifacts untouched",
      sorted(os.listdir(passes)) == before)

# ------------------------------------------------- E. projection
rows = journal_events()  # journal has the A-section pass events only
block = PJ.pass_health_first_block("threads", rows)
check("E1 no data renders unknown, not zeros",
      block["has_data"] is False and block["status"] is None
      and block["seven_day"] is None)
txt = PJ.render_first_block_text(block)
check("E2 text render says unknown",
      "unknown" in txt and "no MC_PASS_CLOSED" in txt, txt[:80])

# real-data block from the fixture journal FIX
b2 = PJ.pass_health_first_block("x", FIX,
                                now=datetime(2026, 9, 27, tzinfo=_tz.utc))
check("E3 last pass is the latest closed",
      b2["status"] == "SUCCESS_ACTION" and b2["pass_id"] == "x-done"
      and b2["actions_landed"] == 5 and b2["caps_total"] == 18,
      str({k: b2[k] for k in ("status", "pass_id", "actions_landed",
                              "caps_total")}))
check("E4 unknown from fold (1 open)", b2["unknown"] == 1,
      str(b2["unknown"]))
check("E5 7-day rollup attached",
      b2["seven_day"]["passes"] == 3 and b2["seven_day"]["unknown"] is None,
      str(b2["seven_day"]))
t2 = PJ.render_first_block_text(b2)
check("E6 text render traces sources",
      "[MC_PASS_CLOSED]" in t2 and "[MC_PASS_CANDIDATES]" in t2)

print()
if FAILURES:
    print("FAILURES:", FAILURES)
    sys.exit(1)
print("OK: all spine tests green")
