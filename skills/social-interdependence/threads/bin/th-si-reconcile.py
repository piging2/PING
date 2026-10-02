#!/usr/bin/env python3
"""th-si-reconcile.py -- crash recovery: reconcile, never replay.

After a kill between transitions, this is the ONLY legal path back to a
terminal state. It:
  1. verifies the transition hash chain (tamper evidence)
  2. finds intents in open states (DISPATCHED/ATTEMPTING/UNKNOWN/VERIFYING/
     SAFE_RETRY/SCHEDULED/QUEUED/INTENT_CREATED)
  3. for any intent whose external effect is uncertain, READS external
     state first (reconcile), and only then decides:
       effect present   -> VERIFYING -> VERIFIED_SUCCESS / VERIFIED_NOOP
       effect absent    -> VERIFIED_NOOP / SAFE_RETRY (bounded) / UNKNOWN
       read inconclusive-> UNKNOWN (stays; never retried blindly)
  4. releases stale leases (an expired lease does NOT authorize a blind
     re-dispatch; it authorizes reconcile)

MACHINE_PROPOSED_RECONCILIATION is not AUTHORIZED_RECONCILIATION: this
tool invents no eligibility and grants no authority. It only verifies
external state for already-intended actions.

Usage: th-si-reconcile.py [--json]
"""
import argparse
import json
import os
import sys

BIN_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(os.path.dirname(BIN_DIR), "src")
sys.path.insert(0, SRC_DIR)

import si_state as S
import si_policy as P
import si_verify as V

OPEN_STATES = {"INTENT_CREATED", "QUEUED", "SCHEDULED", "DISPATCHED",
               "ATTEMPTING", "UNKNOWN", "VERIFYING", "SAFE_RETRY",
               "FAILED_RETRYABLE"}


def reconcile_intent(intent, envelope):
    iid = intent["intent_id"]
    state = intent["state"]
    actions = []

    def note(s):
        actions.append(s)

    if state == "INTENT_CREATED":
        # Never dispatched and never budgeted: re-queue honestly; the
        # next cycle's drive consumes budget before scheduling.
        S.record_transition(iid, "QUEUED", "si-reconcile",
                            ["reconcile:never-dispatched"])
        note("re-queued (never dispatched)")
        return actions
    if state == "QUEUED":
        # Budget not yet consumed; nothing external could have happened.
        note("unchanged (never dispatched, never budgeted)")
        return actions

    if state == "SCHEDULED":
        # Dispatched never recorded: the adapter never saw it. Safe to
        # re-queue; the lease check prevents a second worker doing it.
        S.record_transition(iid, "DISPATCHED", "si-reconcile",
                            ["reconcile:dispatch-unrecorded"],
                            note="no dispatch evidence; marked dispatched "
                                 "for the next cycle to attempt once")
        S.record_transition(iid, "ATTEMPTING", "si-reconcile",
                            ["reconcile:requeue"])
        note("re-queued (dispatch unrecorded)")
        return actions

    if state == "SAFE_RETRY":
        # Already reconcile-authorized; the next cycle's drive performs
        # the single re-attempt. No transition needed.
        note("unchanged (SAFE_RETRY awaits cycle drive)")
        return actions

    # DISPATCHED / ATTEMPTING / UNKNOWN / VERIFYING / FAILED_RETRYABLE:
    # external effect is uncertain. NO_BLIND_RETRY: read external state.
    if state in ("DISPATCHED", "ATTEMPTING", "VERIFYING"):
        S.record_transition(iid, "UNKNOWN", "si-reconcile",
                            ["reconcile:effect-uncertain"],
                            note="recovery: external effect unknown until "
                                 "read-back")

    if state == "FAILED_RETRYABLE" and \
            intent.get("external_effect") == "unknown":
        # Executor never completed: the mutation may or may not have
        # landed. NO_BLIND_RETRY: read external state before deciding.
        pass  # falls through to the read-back below

    obs = V.read_external_state(intent["target_ref"], intent["action"],
                                intent["authorized_account"])
    observed = obs.get("observed")
    S.append_jsonl("reconcile_reads.jsonl",
                   {"at": S.utcnow(), "intent_id": iid,
                    "observed": observed})
    if observed == "read_failed":
        S.record_transition(iid, "UNKNOWN", "si-reconcile",
                            ["reconcile:read-inconclusive"],
                            note="read-back failed; stays UNKNOWN, no "
                                 "blind retry")
        note("read inconclusive; remains UNKNOWN")
        return actions
    if intent["action"] == "like":
        if observed == "liked_by_account":
            S.record_transition(iid, "VERIFYING", "si-reconcile",
                                ["reconcile:read-back"])
            S.record_transition(iid, "VERIFIED_SUCCESS", "si-reconcile",
                                ["verification:liked_by_account"])
            note("VERIFIED_SUCCESS via read-back")
        else:
            # No like present and no completed attempt recorded: the
            # mutation never landed. Bounded safe retry via the cycle
            # driver (FAILED_RETRYABLE) or reconcile (other states).
            if intent.get("attempt", 0) < intent.get("max_attempts", 2):
                if state == "FAILED_RETRYABLE":
                    note("unchanged (FAILED_RETRYABLE awaits cycle "
                         "drive; attempts remain)")
                else:
                    S.record_transition(iid, "SAFE_RETRY", "si-reconcile",
                                        ["reconcile:no-effect-observed"])
                    note("SAFE_RETRY (no effect observed, attempts remain)")
            else:
                S.record_transition(iid, "FAILED_TERMINAL", "si-reconcile",
                                    ["reconcile:attempts-exhausted"])
                note("FAILED_TERMINAL (attempts exhausted)")
    else:  # comment
        if observed == "comment_present":
            S.record_transition(iid, "VERIFYING", "si-reconcile",
                                ["reconcile:read-back"])
            S.record_transition(iid, "VERIFIED_SUCCESS", "si-reconcile",
                                ["verification:comment_present"])
            note("VERIFIED_SUCCESS via read-back")
        else:
            if intent.get("attempt", 0) < intent.get("max_attempts", 2):
                if state == "FAILED_RETRYABLE":
                    note("unchanged (FAILED_RETRYABLE awaits cycle "
                         "drive; attempts remain)")
                else:
                    S.record_transition(iid, "SAFE_RETRY", "si-reconcile",
                                        ["reconcile:no-effect-observed"])
                    note("SAFE_RETRY (no effect observed, attempts remain)")
            else:
                S.record_transition(iid, "FAILED_TERMINAL", "si-reconcile",
                                    ["reconcile:attempts-exhausted"])
                note("FAILED_TERMINAL (attempts exhausted)")
    return actions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    envelope = P.default_envelope()
    report = {"chain_ok": True, "chain_error": "", "reconciled": [],
              "stale_leases_released": []}

    ok, err = S.verify_chain()
    report["chain_ok"] = ok
    report["chain_error"] = err
    if not ok:
        print(json.dumps(report, indent=1))
        return 2

    # Stale leases: release so a future cycle can reconcile; release does
    # NOT authorize re-dispatch by itself.
    leases_dir = os.path.join(S.state_dir(), "leases")
    if os.path.isdir(leases_dir):
        for name in os.listdir(leases_dir):
            lid = name[:-5] if name.endswith(".json") else name
            if not S.lease_valid(lid):
                try:
                    os.remove(os.path.join(leases_dir, name))
                    report["stale_leases_released"].append(lid)
                except OSError:
                    pass

    for iid, intent in sorted(S.load_intents().items()):
        if intent["state"] in OPEN_STATES:
            try:
                actions = reconcile_intent(intent, envelope)
                report["reconciled"].append(
                    {"intent_id": iid,
                     "final_state": S.get_intent(iid)["state"],
                     "actions": actions})
            except Exception as e:  # never let one intent block recovery
                report["reconciled"].append(
                    {"intent_id": iid, "error": str(e)})

    print(json.dumps(report, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
