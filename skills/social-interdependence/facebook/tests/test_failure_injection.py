#!/usr/bin/env python3
"""Failure injection: kill the orchestrator between transitions, then prove
recovery is reconcile-not-replay: the external mutation happens at most
once, intents reach honest terminal states, and no uncertain mutation is
ever re-executed.

Crash points: after_decision, after_intent, before_execute, after_execute,
after_verify. Recovery: reconcile (read external state, never replay) then
resume (re-drive non-terminal intents).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import helpers as H

RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name
          + (" | " + detail if detail and not cond else ""))


def adapter_state(env):
    p = os.path.join(env["SI_FB_STATE"], "adapter_facebook.json")
    return json.load(open(p))["posts"]


def fold(env):
    p = os.path.join(env["SI_FB_STATE"], "intents.jsonl")
    intents = {}
    if not os.path.isfile(p):
        return intents
    for line in open(p).read().splitlines():
        r = json.loads(line)
        iid = r.get("intent_id")
        if not iid:
            continue
        if r.get("record_type") == "intent":
            intents[iid] = {"state": r.get("state"), "record": r}
        elif r.get("record_type") == "transition":
            intents[iid]["state"] = r["to_state"]
    return intents


def run_crash_recover(crash_point, post_id, fault=None, keep_fault=False):
    """Run pipeline with a crash armed, then reconcile + resume. Returns
    (final_state, like_count)."""
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, post_id)
        if fault:
            env["SI_FB_ADAPTER_FAULT"] = fault
        cp = H.candidates_path(tmp, [H.candidate("c1", post_id)])
        if crash_point:
            env["SI_FB_CRASH_AT"] = crash_point
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "fb-crash-1"], env,
                      expect=99 if crash_point else 0)
        crashed = (json.loads(p.stdout).get("crashed_at") == crash_point
                   if crash_point else True)
        env.pop("SI_FB_CRASH_AT", None)
        if not keep_fault:
            env.pop("SI_FB_ADAPTER_FAULT", None)
        H.run_cli("si_fb_reconcile.py", ["run"], env)
        p = H.run_cli("si_fb_orchestrator.py",
                      ["resume", "--envelope", envp,
                       "--batch-id", "fb-crash-1"], env)
        resumed = json.loads(p.stdout)["resumed"]
        f = fold(env)
        iid = "facebook:like:post:%s:fb-crash-1" % post_id
        if crash_point == "after_decision":
            # No intent was ever created; the honest recovery is a fresh
            # batch. Re-running must produce exactly one mutation.
            p = H.run_cli("si_fb_orchestrator.py",
                          ["run", "--envelope", envp, "--candidates", cp,
                           "--batch-id", "fb-crash-2"], env)
            out = json.loads(p.stdout)
            state = out["results"][0]["state"]
            like_count = adapter_state(env)[post_id]["like_count"]
            return crashed, state, like_count, resumed
        like_count = adapter_state(env)[post_id]["like_count"]
        return crashed, f.get(iid, {}).get("state"), like_count, resumed
    finally:
        H.cleanup(tmp)


def main():
    # Kill at each transition boundary: exactly one external mutation,
    # honest terminal state, recovery without replay.
    for point, post in [("after_decision", "1111111111111111"),
                        ("after_intent", "2222222222222222"),
                        ("before_execute", "3333333333333333"),
                        ("after_execute", "4444444444444444"),
                        ("after_verify", "5555555555555555")]:
        crashed, state, likes, resumed = run_crash_recover(point, post)
        check("crash_%s_killed" % point, crashed)
        check("crash_%s_single_mutation" % point, likes == 1,
              "like_count=%r" % likes)
        check("crash_%s_terminal_success" % point,
              state == "VERIFIED_SUCCESS", "state=%r" % state)

    # Adapter dies mid-request AFTER mutating: recovery must read-back,
    # not re-execute. like_count stays 1, state VERIFIED_SUCCESS.
    crashed, state, likes, resumed = run_crash_recover(
        None, "6666666666666666", fault="crash_during_request")
    check("fault_crash_during_request_single_mutation", likes == 1,
          "like_count=%r" % likes)
    check("fault_crash_during_request_verified", state == "VERIFIED_SUCCESS",
          "state=%r" % state)

    # Timeout after success: the orchestrator sees a fault, reads back the
    # committed effect, and declares VERIFIED_SUCCESS on evidence.
    crashed, state, likes, resumed = run_crash_recover(
        None, "7777777777777777", fault="timeout_after_success")
    check("fault_timeout_after_success_verified", state == "VERIFIED_SUCCESS",
          "state=%r" % state)
    check("fault_timeout_after_success_single", likes == 1,
          "like_count=%r" % likes)

    # Timeout before the request reached Facebook: read-back proves no
    # effect, so SAFE_RETRY (a fresh intent may be created; this one is
    # never re-executed).
    crashed, state, likes, resumed = run_crash_recover(
        None, "8888888888888888", fault="timeout_before_request")
    check("fault_timeout_before_request_safe_retry", state == "SAFE_RETRY",
          "state=%r" % state)
    check("fault_timeout_before_request_no_mutation", likes == 0,
          "like_count=%r" % likes)

    # Platform dies after the health probe: execute fails, read-back
    # fails too, so UNKNOWN stays UNKNOWN. The fault stays armed through
    # recovery; no guess is ever made about the external mutation.
    crashed, state, likes, resumed = run_crash_recover(
        None, "9999999999999999", fault="outage_after_probe",
        keep_fault=True)
    check("fault_outage_after_probe_stays_unknown", state == "UNKNOWN",
          "state=%r" % state)
    check("fault_outage_after_probe_no_mutation", likes == 0,
          "like_count=%r" % likes)
    # Full outage from the start: safe mode defers before any attempt.
    crashed, state, likes, resumed = run_crash_recover(
        None, "1010101010101010", fault="platform_outage", keep_fault=True)
    check("fault_platform_outage_defers", state == "DEFERRED",
          "state=%r" % state)
    check("fault_platform_outage_no_mutation", likes == 0,
          "like_count=%r" % likes)

    failed = [r for r in RESULTS if not r[1]]
    print("\n%d/%d passed" % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
