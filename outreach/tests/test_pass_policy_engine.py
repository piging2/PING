#!/usr/bin/env python3
"""Deterministic tests for pass-policy-engine.py (the policy state machine).

Covers: every pass transition (valid + invalid), the discovery retry
budget, every candidate reason code, every fail-closed path, all ten
terminal pass classes, manifest validation, event idempotency, and the
MC_PASS_* emit.py vocabulary addition.

Runs against synthetic fixtures in temp dirs only: it never touches the
live engagement logs, the live intent ledger, or the live journal.
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


# ------------------------------------------------------- fixtures
tmp = tempfile.mkdtemp(prefix="policy-engine-test-")
guard_dir = os.path.join(tmp, "guard")
passes_dir = os.path.join(tmp, "passes")
os.makedirs(guard_dir)
os.makedirs(passes_dir)
ledger_path = os.path.join(tmp, "ledger.jsonl")

X_LOG = """# X engagement log (test fixture)

## 2026-09-26 - Pass 1
Likes: @engagedhandle, @acmeplumbing
- https://x.com/engagedhandle/status/999

## 2026-09-26 - Pass 2
Follows: @followedhandle
"""
EMPTY_LOG = "# empty test log\n"

for plat in ("instagram", "facebook", "threads", "x", "tiktok"):
    with open(os.path.join(guard_dir, "%s-engagement.md" % plat), "w") as f:
        f.write(X_LOG if plat == "x" else EMPTY_LOG)

# Ledger fixture: one intent that reached EXECUTION in a dead pass and got
# no observation -> UNKNOWN_EXECUTION for pass "new-pass".
with open(ledger_path, "w") as f:
    f.write(json.dumps({
        "record_type": "intent", "intent_id": "intent-ghost-1",
        "ts": "2026-09-25T10:00:00+00:00", "platform": "x",
        "account": "@ghosthandle", "action": "like",
        "url": "https://x.com/ghosthandle/status/111",
        "pass_id": "old-pass", "stage": "ACTION_INTENT_DURABLE"}) + "\n")
    f.write(json.dumps({
        "record_type": "execution", "intent_id": "intent-ghost-1",
        "ts": "2026-09-25T10:01:00+00:00", "stage": "EXECUTION",
        "pass_id": "old-pass"}) + "\n")

os.environ["ENGAGEMENT_GUARD_DIR"] = guard_dir
os.environ["ENGAGEMENT_GUARD_PASSES_DIR"] = passes_dir
os.environ["ENGAGEMENT_INTENT_LEDGER"] = ledger_path
os.environ["MC_JOURNAL_FILE"] = os.path.join(tmp, "journal.jsonl")

sys.path.insert(0, os.path.expanduser("~/workspace/outreach"))
sys.path.insert(0, os.path.expanduser("~/workspace/mission-control"))
import pass_policy_engine as E  # noqa: E402
import emit  # noqa: E402


def reset_caches():
    E._guard_mod = None
    E._ledger_mod = None


# ------------------------------------------------- A. transitions
ctx = E.new_pass_context("x", "x-test-1")
s = E.transition(ctx["platform"] and "PASS_CREATED", "pass_start", ctx)
check("A1 pass_start", s == "DISCOVERY")

s = E.transition(s, "probe_timeout", ctx)
check("A2 probe_timeout", s == "DISCOVERY_RECOVERY")
s = E.transition(s, "retry_discovery", ctx)
check("A3 retry 1 ok", s == "DISCOVERY" and ctx["discovery_attempts"] == 1)
s = E.transition(s, "suspect_enumeration", ctx)
check("A4 suspect_enumeration", s == "DISCOVERY_RECOVERY")
s = E.transition(s, "retry_discovery", ctx)
s = E.transition(s, "probe_timeout", ctx)
s = E.transition(s, "retry_discovery", ctx)
check("A5 retry 3 ok", ctx["discovery_attempts"] == 3)
try:
    E.transition("DISCOVERY_RECOVERY", "retry_discovery", ctx)
    check("A6 retry budget enforced", False, "4th retry did not raise")
except ValueError:
    check("A6 retry budget enforced", True)
s = E.transition("DISCOVERY_RECOVERY", "recovery_exhausted", ctx)
check("A7 recovery_exhausted", s == "EVIDENCE_ASSEMBLED"
      and ctx["enumeration_failed"] is True)

s = E.transition(s, "policy_start", ctx)
s = E.transition(s, "policy_done", ctx)
check("A8 policy chain", s == "MANIFEST_FROZEN")
s = E.transition(s, "manifest_empty", ctx)
check("A9 manifest_empty skips intent+execution", s == "OBSERVATION")

ctx2 = E.new_pass_context("x", "x-test-2")
s = "MANIFEST_FROZEN"
s = E.transition(s, "manifest_ready", ctx2)
s = E.transition(s, "intents_written", ctx2)
s = E.transition(s, "leg_done", ctx2)
check("A10 leg_done self-loop", s == "EXECUTION")
s = E.transition(s, "leg_failed", ctx2)
s = E.transition(s, "leg_skipped", ctx2)
check("A11 execution recovery loop", s == "EXECUTION")
s = E.transition(s, "execution_done", ctx2,
                 {"candidates": 10, "eligible": 8, "manifest_actions": 8,
                  "actions_landed": 7})
s = E.transition(s, "observation_done", ctx2)
s = E.transition(s, "verify_done", ctx2)
check("A12 full happy path closes", s == "PASS_CLOSED")
check("A13 terminal class SUCCESS_ACTION",
      E.classify_pass_terminal(ctx2) == "SUCCESS_ACTION", ctx2)

ctx3 = E.new_pass_context("x", "x-test-3")
s = E.transition("EXECUTION", "restriction_signal", ctx3,
                 {"kind": "checkpoint"})
check("A14 restriction halts", s == "PASS_HALTED"
      and ctx3["restriction"] == "checkpoint")
s = E.transition(s, "pass_close", ctx3)
check("A15 halted pass closes", s == "PASS_CLOSED")
check("A16 checkpoint -> AUTH_FAILURE",
      E.classify_pass_terminal(ctx3) == "AUTH_FAILURE")

ctx4 = E.new_pass_context("x", "x-test-4")
s = E.transition("POLICY_EVAL", "guard_fail_closed", ctx4)
check("A17 guard fail-closed aborts", s == "PASS_ABORTED"
      and ctx4["guard_fail_closed"] is True)
s = E.transition(s, "pass_close", ctx4)
check("A18 aborted pass closes", s == "PASS_CLOSED")
check("A19 abort -> TEMPORARY_FAILURE",
      E.classify_pass_terminal(ctx4) == "TEMPORARY_FAILURE")

try:
    E.transition("DISCOVERY", "policy_done", None)
    check("A20 invalid transition raises", False, "no raise")
except ValueError:
    check("A20 invalid transition raises", True)
try:
    E.transition("EXECUTION", "restriction_signal",
                 E.new_pass_context("x", "p"), {"kind": "bogus"})
    check("A21 bad restriction kind raises", False, "no raise")
except ValueError:
    check("A21 bad restriction kind raises", True)

# ------------------------------------------------- B. terminal classes
def ctx_with(**kw):
    c = E.new_pass_context("x", "cls")
    c.update(kw)
    return c

cases = [
    ("SUCCESS_ACTION", {"actions_landed": 1}, "SUCCESS_ACTION"),
    ("SUCCESS_EMPTY", {"candidates": 0}, "SUCCESS_EMPTY"),
    ("ELIGIBILITY_EMPTY", {"candidates": 5, "eligible": 0},
     "ELIGIBILITY_EMPTY"),
    ("ENUMERATION_FAILURE", {"enumeration_failed": True},
     "ENUMERATION_FAILURE"),
    ("DEPENDENCY_FAILURE", {"dependency_failed": True},
     "DEPENDENCY_FAILURE"),
    ("AUTH_FAILURE", {"auth_failed": True}, "AUTH_FAILURE"),
    ("AUTH_FAILURE via checkpoint", {"restriction": "checkpoint"},
     "AUTH_FAILURE"),
    ("RATE_LIMIT", {"restriction": "restriction"}, "RATE_LIMIT"),
    ("TEMPORARY_FAILURE via ledger", {"ledger_fail_closed": True},
     "TEMPORARY_FAILURE"),
    ("TEMPORARY_FAILURE via intent write", {"intent_write_failed": True},
     "TEMPORARY_FAILURE"),
    ("TEMPORARY_FAILURE via zero landed",
     {"candidates": 5, "eligible": 5, "manifest_actions": 3,
      "actions_landed": 0}, "TEMPORARY_FAILURE"),
    ("SURFACE_DRIFT", {"surface_drift": True}, "SURFACE_DRIFT"),
    ("TERMINAL_FAILURE", {"terminal_failure": True}, "TERMINAL_FAILURE"),
    # precedence: restriction outranks landed actions
    ("RATE_LIMIT beats landed",
     {"restriction": "restriction", "actions_landed": 4}, "RATE_LIMIT"),
    # precedence: fail-closed outranks empty
    ("TEMPORARY_FAILURE beats empty",
     {"guard_fail_closed": True, "candidates": 0}, "TEMPORARY_FAILURE"),
]
for name, kw, want in cases:
    got = E.classify_pass_terminal(ctx_with(**kw))
    check("B " + name, got == want, "got %s" % got)

# ------------------------------------------------- C. candidate pipeline
reset_caches()
cands = [
    {"account": "@freshhandle", "url": "https://x.com/freshhandle/status/1001",
     "action": "like"},
]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C1 SELECTED", dec[0]["decision"] == "SELECTED"
      and dec[0]["reason_code"] == "SELECTED" and not abort,
      str(dec[0]))

cands = [
    {"account": "@engagedhandle",
     "url": "https://x.com/engagedhandle/status/555", "action": "like"},
]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C2 ALREADY_ENGAGED", dec[0]["reason_code"] == "ALREADY_ENGAGED"
      and dec[0]["decision"] == "REJECTED", str(dec[0]))

cands = [{"account": "@acmeplumbing1", "url": None, "action": "follow"}]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C3 BLOCKED_AMBIGUOUS", dec[0]["reason_code"] == "BLOCKED_AMBIGUOUS",
      str(dec[0]))

cands = [{"account": None, "url": None, "action": "like"}]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C4 GUARD_UNCHECKABLE", dec[0]["reason_code"] == "GUARD_UNCHECKABLE",
      str(dec[0]))

cands = [{"account": "@ghosthandle",
          "url": "https://x.com/ghosthandle/status/111", "action": "like"}]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C5 UNKNOWN_EXECUTION_OPEN",
      dec[0]["reason_code"] == "UNKNOWN_EXECUTION_OPEN"
      and dec[0]["evidence"].get("intent_id") == "intent-ghost-1"
      and not abort, str(dec[0]))

cands = [{"account": "@freshhandle2", "url": None, "action": "like"}]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C6 NO_EVIDENCE", dec[0]["reason_code"] == "NO_EVIDENCE",
      str(dec[0]))

cands = [
    {"account": "@pairhandle", "url": "https://x.com/pairhandle/status/2001",
     "action": "like"},
    {"account": "@pairhandle", "url": "https://x.com/pairhandle/status/2001",
     "action": "comment"},
]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C7 like selected, comment pair-rule",
      dec[0]["reason_code"] == "SELECTED"
      and dec[1]["reason_code"] == "PAIR_RULE_VIOLATION",
      str([d["reason_code"] for d in dec]))

cands = [{"account": "@caphandle",
          "url": "https://x.com/caphandle/status/3001", "action": "like"}]
dec, caps, abort = E.evaluate_candidates(
    cands, "x", "new-pass",
    caps={"follow": 5, "comment": 3, "like": 0})
check("C8 CAP_EXHAUSTED", dec[0]["reason_code"] == "CAP_EXHAUSTED",
      str(dec[0]))

cands = [{"account": "@weirdhandle",
          "url": "https://x.com/weirdhandle/status/4001", "action": "poke"}]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C9 INVALID_ACTION", dec[0]["reason_code"] == "INVALID_ACTION",
      str(dec[0]))

# C10: guard unreadable -> GUARD_FAIL_CLOSED + pass abort, truthful per
# candidate, nothing permitted.
reset_caches()
os.environ["ENGAGEMENT_GUARD_DIR"] = os.path.join(tmp, "no-such-dir")
cands = [{"account": "@anyhandle",
          "url": "https://x.com/anyhandle/status/5001", "action": "like"}]
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C10 GUARD_FAIL_CLOSED",
      dec[0]["reason_code"] == "GUARD_FAIL_CLOSED" and abort is True,
      str(dec[0]))

# C11: ledger unreadable -> LEDGER_FAIL_CLOSED + pass abort.
reset_caches()
os.environ["ENGAGEMENT_GUARD_DIR"] = guard_dir
with open(ledger_path, "a") as f:
    f.write("{not valid json\n")
dec, caps, abort = E.evaluate_candidates(cands, "x", "new-pass")
check("C11 LEDGER_FAIL_CLOSED",
      dec[0]["reason_code"] == "LEDGER_FAIL_CLOSED" and abort is True,
      str(dec[0]))
# restore the ledger fixture for later tests
with open(ledger_path, "w") as f:
    f.write(json.dumps({
        "record_type": "intent", "intent_id": "intent-ghost-1",
        "ts": "2026-09-25T10:00:00+00:00", "platform": "x",
        "account": "@ghosthandle", "action": "like",
        "url": "https://x.com/ghosthandle/status/111",
        "pass_id": "old-pass", "stage": "ACTION_INTENT_DURABLE"}) + "\n")
    f.write(json.dumps({
        "record_type": "execution", "intent_id": "intent-ghost-1",
        "ts": "2026-09-25T10:01:00+00:00", "stage": "EXECUTION",
        "pass_id": "old-pass"}) + "\n")

# C12: determinism - same inputs, same decisions.
reset_caches()
cands = [
    {"account": "@det1", "url": "https://x.com/det1/status/6001",
     "action": "follow"},
    {"account": "@engagedhandle", "url": None, "action": "follow"},
]
d1, _, _ = E.evaluate_candidates(cands, "x", "new-pass")
d2, _, _ = E.evaluate_candidates(cands, "x", "new-pass")
check("C12 deterministic", d1 == d2)

# C13: the unknown intent does NOT block the pass it belongs to
# (live pass ids are excluded from refuse).
reset_caches()
dec, caps, abort = E.evaluate_candidates(
    [{"account": "@ghosthandle",
      "url": "https://x.com/ghosthandle/status/111", "action": "like"}],
    "x", "old-pass")
check("C13 live pass not refused",
      dec[0]["reason_code"] == "SELECTED", str(dec[0]))

# ------------------------------------------------- D. manifest validation
errs = E.validate_manifest([
    {"page": "Acme Plumbing (photo post)",
     "url": "https://www.facebook.com/AcmePlumbing/posts/1", "type": "like"},
    {"page": "Acme Plumbing (photo post)",
     "url": "https://www.facebook.com/AcmePlumbing/posts/2", "type": "like"},
], "facebook")
check("D1 fb duplicate page names",
      any("duplicate page descriptor" in e for e in errs), str(errs))

errs = E.validate_manifest([
    {"page": "Acme Plumbing (photo post)",
     "url": "https://www.facebook.com/AcmePlumbing/posts/1", "type": "like"},
    {"page": "Acme Plumbing (carousel post)",
     "url": "https://www.facebook.com/AcmePlumbing/posts/2", "type": "comment"},
], "facebook")
check("D2 fb valid job", errs == [], str(errs))

errs = E.validate_manifest([
    {"account": "@pairhandle", "url": "https://x.com/pairhandle/status/2001",
     "type": "like"},
    {"account": "@pairhandle", "url": "https://x.com/pairhandle/status/2001",
     "type": "comment"},
], "x")
check("D3 x pair rule", any("pair rule" in e for e in errs), str(errs))

errs = E.validate_manifest([
    {"account": "@nourl", "type": "like"},
], "threads")
check("D4 missing url", any("requires a post url" in e for e in errs),
      str(errs))

errs = E.validate_manifest([
    {"account": "@ok", "url": "https://www.threads.com/@ok/post/ABC/",
     "type": "like"},
], "threads")
check("D5 valid manifest", errs == [], str(errs))

errs = E.validate_manifest([{"account": "@a"}], "myspace")
check("D6 unknown platform", len(errs) == 1, str(errs))

# ------------------------------------------------- E. event builders
ev1 = E.pass_event("p1", "x", "MC_PASS_CLOSED",
                   {"pass_class": "SUCCESS_ACTION", "actions_landed": 3})
ev2 = E.pass_event("p1", "x", "MC_PASS_CLOSED",
                   {"pass_class": "SUCCESS_ACTION", "actions_landed": 3})
ev3 = E.pass_event("p1", "x", "MC_PASS_CLOSED",
                   {"pass_class": "SUCCESS_ACTION", "actions_landed": 4})
check("E1 idempotent event ids", ev1["event_id"] == ev2["event_id"])
check("E2 distinct data distinct id", ev1["event_id"] != ev3["event_id"])
check("E3 envelope shape",
      ev1["aggregate_id"] == "mc:pass:x:p1"
      and ev1["aggregate_type"] == "mc_pass"
      and ev1["event_type"] == "MC_PASS_CLOSED")
try:
    E.pass_event("p1", "x", "MC_HEARTBEAT", {})
    check("E4 non-pass type rejected", False, "no raise")
except ValueError:
    check("E4 non-pass type rejected", True)

cev = E.candidates_event("p1", "x", [
    {"decision": "SELECTED"}, {"decision": "REJECTED"},
    {"decision": "REJECTED"}])
check("E5 candidates rollup",
      cev["event_data"]["candidates"] == 3
      and cev["event_data"]["eligible"] == 1
      and cev["event_data"]["skipped"] == 2)

# ------------------------------------------------- F. emit.py vocabulary
try:
    ev, how = emit.emit_event(
        "MC_PASS_CLOSED", lane="x", summary="test", source_timestamp="t",
        observation_timestamp="t", import_timestamp="t",
        source_artifact="test", dry_run=True)
    check("F1 MC_PASS_CLOSED accepted", how == "appended")
except ValueError as e:
    check("F1 MC_PASS_CLOSED accepted", False, str(e))
try:
    emit.emit_event("MC_PASS_BOGUS", lane="x", summary="t",
                    source_timestamp="t", observation_timestamp="t",
                    import_timestamp="t", source_artifact="t", dry_run=True)
    check("F2 unknown MC_PASS_* rejected", False, "no raise")
except ValueError:
    check("F2 unknown MC_PASS_* rejected", True)
# idempotent append: same content twice -> second is duplicate-skipped
a1 = emit.emit_event("MC_PASS_STARTED", lane="x", summary="s",
                     source_timestamp="t1", observation_timestamp="t1",
                     import_timestamp="t1", source_artifact="a")
a2 = emit.emit_event("MC_PASS_STARTED", lane="x", summary="s",
                     source_timestamp="t1", observation_timestamp="t1",
                     import_timestamp="t1", source_artifact="a")
check("F3 journal idempotency", a1[1] == "appended"
      and a2[1] == "duplicate-skipped", "%s/%s" % (a1[1], a2[1]))

print()
if FAILURES:
    print("FAILURES:", FAILURES)
    sys.exit(1)
print("OK: all pass-policy-engine tests green")
