#!/usr/bin/env python3
"""Recovery: reconcile-not-replay for the Facebook slice.

Scans the folded intent stream for intents left in non-terminal states by a
killed orchestrator, a dead worker, or an expired lease, and moves each one
forward WITHOUT re-executing an uncertain external mutation:

  INTENT_CREATED / QUEUED / SCHEDULED (lease expired or never dispatched)
      -> back to QUEUED with fresh evidence (no external effect could have
         happened: the adapter was never handed the intent). Safe.
  DISPATCHED / ATTEMPTING / UNKNOWN
      -> read external state via the adapter (read-only):
           effect present  -> VERIFIED_SUCCESS (read-after-write evidence)
           effect absent   -> SAFE_RETRY (this intent closes superseded; a
                              fresh intent may be created by the scheduler,
                              never a re-execution of this one)
           read fails      -> remains UNKNOWN (no inference, no retry)
  VERIFYING
      -> re-run orchestrator read-after-write verification once.
  DEFERRED / FAILED_RETRYABLE
      -> left alone unless --promote-deferred: DEFERRED re-enters QUEUED
         when its deferral cause cleared (safe mode lifted / saturation
         window passed); FAILED_RETRYABLE never auto-retries (a fresh
         intent with new batch lineage is the scheduler's call, within
         retry_policy).

Replay here is DECISION replay only: the transition evidence stream is
re-folded to reconstruct state. External mutations are never replayed.

Usage: si_fb_reconcile.py run [--promote-deferred]
"""
import argparse
import json
import os
import sys
import time

BIN = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BIN)
import si_fb_invariants as inv  # noqa: E402
import si_fb_state as st  # noqa: E402
from si_fb_orchestrator import (transition, verify_read_after_write,  # noqa: E402
                                recover_unknown, finalize)


def cmd_run(args):
    fold = st.fold_intents()
    now = time.time()
    actions = []
    for intent_id, stt in sorted(fold.items()):
        state = stt["state"]
        rec = stt["record"]
        if state in inv.TERMINAL_STATES or state in ("REJECTED",):
            continue
        if state in ("INTENT_CREATED", "QUEUED", "SCHEDULED"):
            holder = st.lease_holder("fb:dispatch", now)
            if holder not in (None, intent_id):
                actions.append({"intent_id": intent_id,
                                "action": "left",
                                "reason": "dispatch lease held by %s" % holder})
                continue
            st.lease_release("fb:dispatch", intent_id)
            transition(intent_id, state, "QUEUED",
                       {"evidence": "reconcile: lease free and adapter never "
                                    "received this intent; no external "
                                    "effect possible; safe to re-queue"})
            actions.append({"intent_id": intent_id, "action": "requeued"})
        elif state in ("DISPATCHED", "ATTEMPTING", "UNKNOWN", "VERIFYING"):
            # The dead intent may still hold the dispatch lease; release it
            # so resume can proceed. The lease is an ownership marker, not
            # execution evidence.
            st.lease_release("fb:dispatch", intent_id)
            if state == "VERIFYING":
                okv, kind, verification = verify_read_after_write(rec, {})
                if kind == "VERIFIED_SUCCESS":
                    inv.assert_verified_success(verification)
                transition(intent_id, "VERIFYING", kind,
                           {"evidence": verification,
                            "note": "reconcile re-ran read-after-write once"})
                finalize(intent_id, kind, verification, rec)
                actions.append({"intent_id": intent_id, "action": kind})
            else:
                detail_state, detail = recover_unknown(
                    intent_id, rec, None,
                    "reconcile: orchestrator died with intent in %s" % state)
                finalize(intent_id, detail_state, detail, rec)
                actions.append({"intent_id": intent_id, "action": detail_state,
                                "detail": "external state read; no mutation "
                                          "replayed"})
        elif state == "DEFERRED" and args.promote_deferred:
            transition(intent_id, "DEFERRED", "QUEUED",
                       {"evidence": "reconcile: deferral cause re-checked, "
                                    "re-queued for scheduling"})
            actions.append({"intent_id": intent_id, "action": "promoted"})
        else:
            actions.append({"intent_id": intent_id, "action": "left",
                            "state": state})
    st.append_jsonl("reconcile.jsonl", {"ts": st.utcnow(),
                                        "actions": actions})
    print(json.dumps({"reconciled": len(actions), "actions": actions},
                     indent=1))
    return 0


def main(argv):
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--promote-deferred", action="store_true")
    r.set_defaults(fn=cmd_run)
    args = p.parse_args(argv)
    try:
        return args.fn(args)
    except inv.InvariantViolation as e:
        print(json.dumps({"ok": False, "invariant": e.code,
                          "detail": e.detail}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
