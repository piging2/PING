#!/usr/bin/env python3
"""th-si-cycle.py -- one autonomous Threads engagement pass, no human approval.

Ordinary path (machine-enforced, in order):
  Phase 0: holds.json check (step 0, fail-closed) + safe-mode probe
  Phase 1: lease acquire (one worker per pass; concurrency_budget = 1)
  Phase 2 (decide+intend): per candidate: normalize -> REAL guard
           eligibility_check -> decision record -> durable intent
           (idempotent) -> budget atomic consume -> SCHEDULED
  Phase 3 (drive): for this batch's intents in drivable states
           {QUEUED, SCHEDULED, SAFE_RETRY, FAILED_RETRYABLE, ATTEMPTING}:
           dispatch to the dumb adapter (fixture boundary here; pig live
           is BLOCKED) -> read-after-write verification -> canonical
           evidence -> relationship touch
  Phase 4: watchdog check -> release lease

Crash between any two transitions is legal: re-running the cycle drives
the same intents forward from the journal; reconcile (th-si-reconcile.py)
first reads external state for anything uncertain, so nothing is ever
re-dispatched blindly.

LIVE EXTERNAL EXECUTION: BLOCKED in this environment (no credentials here;
Pig unreachable from here). Set SI_THREADS_EXECUTOR=pig on the operator
host where run_th_pass.sh and the Pig are reachable.

Usage:
  th-si-cycle.py --batch-id <id> --candidates candidates.json
                 [--account @nolanpigi] [--crash-after <stage>] [--workdir D]
"""
import argparse
import hashlib
import json
import os
import sys
import tempfile

BIN_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(os.path.dirname(BIN_DIR), "src")
sys.path.insert(0, SRC_DIR)

import si_state as S
import si_policy as P
import si_adapter as A
import si_verify as V
import si_watchdog as W

CRASH_AFTER = os.environ.get("TH_SI_CRASH_AFTER", "")

DRIVABLE = {"QUEUED", "SCHEDULED", "SAFE_RETRY", "FAILED_RETRYABLE",
            "ATTEMPTING"}


def crash_hook(stage):
    if CRASH_AFTER and CRASH_AFTER == stage:
        sys.stderr.write("CRASH-HOOK: dying after %s\n" % stage)
        sys.stderr.flush()
        os._exit(137)


def digest(obj):
    return hashlib.sha256(json.dumps(
        obj, sort_keys=True).encode()).hexdigest()


def drive_intent(intent, envelope, args, workdir, report):
    """Drive one intent from a drivable state toward terminal. Dispatches
    at most once per drive; re-drive is authorized only after reconcile
    (which reads external state first)."""
    iid = intent["intent_id"]
    state = intent["state"]
    if state not in DRIVABLE:
        return

    if state == "FAILED_RETRYABLE":
        if intent.get("attempt", 0) >= intent.get("max_attempts", 2):
            S.record_transition(iid, "FAILED_TERMINAL", "si-cycle",
                                ["retry-policy:attempts-exhausted"])
            return
        S.record_transition(iid, "SCHEDULED", "si-cycle",
                            ["retry-policy:attempt-remains"])
        state = "SCHEDULED"
    elif state == "SAFE_RETRY":
        S.record_transition(iid, "SCHEDULED", "si-cycle",
                            ["reconcile:SAFE_RETRY"])
        state = "SCHEDULED"

    if state == "QUEUED":
        win = envelope["action_windows"][intent["action"]]
        rec = S.consume_budget(
            intent["action"], iid, args.batch_id, args.account,
            win["per_pass_cap"], win["window_sec"],
            envelope["envelope_id"])
        if rec is None:
            S.record_transition(iid, "DEFERRED", "si-cycle",
                                ["budget-exhausted"])
            return
        S.record_transition(iid, "SCHEDULED", "si-cycle",
                            ["budget:%s" % rec["window_key"]])
        state = "SCHEDULED"

    if state == "SCHEDULED":
        crash_hook("SCHEDULED")
        S.record_transition(iid, "DISPATCHED", "si-cycle",
                            ["adapter:threads",
                             "executor:%s" % A.EXECUTOR])
        state = "DISPATCHED"

    # DISPATCHED or ATTEMPTING (reconcile-authorized requeue): exactly one
    # executor invocation from this drive.
    job = A.build_job(intent, envelope)
    result, _raw = A.run_executor(job, workdir)
    if state == "DISPATCHED":
        S.record_transition(iid, "ATTEMPTING", "si-cycle",
                            ["executor-result:ok=%s" % result.get("ok")])
        state = "ATTEMPTING"
    crash_hook("ATTEMPTING")
    normalized = A.normalize_result(result)
    if normalized.get("flag"):
        # Platform signal observed mid-pass (checkpoint / action block /
        # rate limit). This is a platform flag, not our failure: cancel
        # the intent and let the watchdog open the breaker. Per Nolan's
        # standing rule, a platform flag is the ONLY thing that scales
        # back the surface.
        S.append_jsonl("adapter_flags.jsonl",
                       {"at": S.utcnow(), "intent_id": iid,
                        "flag": normalized["flag"]})
        S.record_transition(iid, "CANCELLED", "si-cycle",
                            ["platform-flag:%s" % normalized["flag"]],
                            note=normalized["note"])
        return
    # Refresh: record_transition advanced the stored state; the local
    # dict is stale and must not clobber it on save.
    intent = S.get_intent(iid)
    intent["external_effect"] = normalized["external_effect"]
    intent["attempt"] = intent.get("attempt", 0) + 1
    S.save_intent(intent)

    if not normalized["executor_ok"]:
        # Executor never completed: no mutation evidence. Retryable within
        # bounds, never blind (effect is unknown, not assumed absent).
        S.record_transition(iid, "FAILED_RETRYABLE", "si-cycle",
                            ["infra:%s" % normalized.get("infra")],
                            note=normalized["note"])
        S.append_jsonl("adapter_flags.jsonl",
                       {"at": S.utcnow(), "intent_id": iid,
                        "flag": normalized.get("infra", "")})
        return

    # Read-after-write verification. Canonical success exists ONLY with a
    # read-back observation.
    S.record_transition(iid, "VERIFYING", "si-cycle",
                        ["read-after-write"])
    crash_hook("VERIFYING")
    verdict, vrec = V.verify(
        intent, normalized,
        envelope["verification_requirements"]["verification_timeout_sec"])
    P.check_no_canonical_success_without_verification(verdict, vrec)
    S.record_transition(iid, verdict, "si-cycle",
                        ["verification:%s" % vrec["observed_state"]],
                        note=vrec["observed_state"])
    S.append_jsonl("evidence.jsonl", {
        "intent_id": iid, "outcome": verdict,
        "at": S.utcnow(), "decision_ref": intent["decision_ref"],
        "envelope_ref": envelope["envelope_id"],
        "policy_verdict": {"decision": "ELIGIBLE",
                           "primary_reason": "guard",
                           "guard_version":
                               "engagement-guard.eligibility_check/v1"},
        "adapter_result": {"executor_ok": True,
                           "note": normalized["note"]},
        "external_observation": vrec["observation"],
        "verification": {"method": vrec["method"],
                         "observed_state": vrec["observed_state"],
                         "verified_at": vrec["verified_at"],
                         "lie_detected": bool(vrec.get("lie_detected"))},
        "transition_refs": [iid],
        "evidence_hash": digest([iid, verdict,
                                 vrec["observed_state"]]),
        "prev_hash": "0" * 64,
    })
    if vrec.get("lie_detected"):
        S.append_jsonl("adapter_flags.jsonl",
                       {"at": S.utcnow(), "intent_id": iid,
                        "flag": "verification_failure"})
    if verdict in ("VERIFIED_SUCCESS", "VERIFIED_NOOP"):
        S.record_touch(intent["target_handle"], iid, verdict)


def intend_candidate(raw, envelope, args, batch_seen, report):
    try:
        norm = P.normalize_threads_candidate(raw)
    except P.InvariantViolation as e:
        report["decisions"].append(
            {"candidate": raw.get("url"), "decision": "REJECT",
             "reason": str(e)})
        return
    intent_id = "threads:%s:%s:%s" % (
        norm["type"], norm["target_ref"], args.batch_id)
    # A within-batch duplicate maps to the same intent_id (stable
    # identity). It is evaluated and decided, but it starts no new
    # intent lifecycle: transitions belong to the existing intent.
    preexisting = S.get_intent(intent_id)
    record_lifecycle = preexisting is None
    if record_lifecycle:
        S.record_transition(intent_id, "NORMALIZED", "si-cycle",
                            ["candidate:%s" % norm["candidate_id"]])
    crash_hook("NORMALIZED")

    # The REAL deterministic eligibility authority.
    verdict = P.evaluate_candidate(
        {"platform": "threads", "type": norm["type"],
         "url": norm["url"], "page": norm["page"],
         "text": norm["text"]},
        batch_seen=batch_seen)
    if record_lifecycle:
        S.record_transition(intent_id, "EVALUATED", "si-cycle",
                            ["guard:%s" % verdict["primary_reason"]])
    crash_hook("EVALUATED")

    eligible = verdict["decision"] == "ELIGIBLE"
    if record_lifecycle:
        S.record_transition(
            intent_id, "ELIGIBLE" if eligible else "REJECTED", "si-cycle",
            ["guard-verdict:%s" % verdict["decision"]],
            note="; ".join(verdict["evidence"][:3]))

    # Relationship saturation: evidence-backed, from the durable touch
    # ledger. A saturated handle is deferred, never forced.
    from datetime import datetime, timedelta, timezone
    week_ago = (datetime.now(timezone.utc)
                - timedelta(days=7)).isoformat()
    touches_7d = len(S.touches_since(norm["target_handle"], week_ago))
    cap_7d = envelope["relationship_budget"]["max_touches_per_handle_7d"]
    saturated = touches_7d >= cap_7d

    decision = {
        "candidate_id": norm["candidate_id"],
        "actor": envelope["actor"],
        "target": {"target_ref": norm["target_ref"],
                   "target_url": norm["url"],
                   "target_handle": norm["target_handle"]},
        "platform": "threads",
        "action_candidates": [norm["type"]],
        "identity_confidence": {"handle_verified": True,
                                "confidence": "high"},
        "relationship": None,
        "content": {"text": norm["text"][:280]},
        "relationship_context": None,
        "evidence": [{"kind": "guard_verdict",
                      "ref": str(verdict["primary_reason"]),
                      "digest": digest(verdict)}],
        "capabilities": {"like": True, "comment": True},
        "policy_result": {
            "decision": verdict["decision"],
            "primary_reason": verdict["primary_reason"],
            "reasons": verdict["reasons"],
            "guard_version": "engagement-guard.eligibility_check/v1"},
        "budget_result": {"within_budget": True, "remaining": {}},
        "materiality": "low",
        "uncertainty": ("none: guard deterministic" if eligible
                        else "; ".join(verdict["evidence"][:2])),
        "saturation": {"handle_touches_7d": touches_7d,
                       "handle_cap_7d": cap_7d,
                       "saturated": saturated},
        "outcome_history": [],
        "decision": ("DEFER" if saturated else
                     ("PROCEED" if eligible else "REJECT")),
        "reason": ("saturated: %d/%d touches in 7d" % (touches_7d, cap_7d)
                   if saturated else
                   "guard %s (%s)" % (verdict["decision"],
                                      verdict["primary_reason"])),
        "decided_at": S.utcnow(),
        "envelope_ref": envelope["envelope_id"],
    }
    S.append_jsonl("decisions.jsonl", decision)
    report["decisions"].append(
        {"candidate_id": norm["candidate_id"],
         "decision": decision["decision"], "reason": decision["reason"]})
    crash_hook("DECIDED")
    if not eligible:
        return
    if saturated:
        # Guard said ELIGIBLE; the relationship budget says not now.
        # Deferred, not dropped, not forced.
        if record_lifecycle:
            S.record_transition(intent_id, "DEFERRED", "si-cycle",
                                ["relationship-budget:saturated"],
                                note="%d/%d touches in 7d" % (touches_7d,
                                                              cap_7d))
        return

    # Durable intent: stable identity, idempotent create.
    existing = S.load_intents()
    try:
        P.check_no_duplicate_active_intent(intent_id, existing)
    except P.InvariantViolation:
        report["decisions"].append(
            {"candidate_id": norm["candidate_id"], "decision": "SKIP",
             "reason": "duplicate active intent"})
        return
    if norm["type"] == "comment" and not (raw.get("comment_text")
                                          or "").strip():
        # Comment copy comes from the curated layer ABOVE eligibility.
        # The harness never invents it.
        S.record_transition(intent_id, "CANCELLED", "si-cycle",
                            ["no-comment-text"],
                            note="comment intent without curated text: "
                                 "cancelled, never invented")
        return
    intent = {
        "intent_id": intent_id, "platform": "threads",
        "action": norm["type"], "target_ref": norm["target_ref"],
        "target_url": norm["url"],
        "target_handle": norm["target_handle"],
        "batch_id": args.batch_id, "actor": envelope["actor"],
        "authorized_account": args.account,
        "comment_text": raw.get("comment_text"),
        "marker": norm["target_ref"],
        "lease_id": "th-pass-%s" % args.batch_id,
        "attempt": 0, "max_attempts": 2,
        "state": "ELIGIBLE", "created_at": S.utcnow(),
        "envelope_ref": envelope["envelope_id"],
        "decision_ref": digest(decision),
        "evidence_hash": digest(decision),
        "prev_hash": None,
    }
    S.save_intent(intent)
    S.record_transition(intent_id, "INTENT_CREATED", "si-cycle",
                        ["decision:%s" % digest(decision)])
    S.record_transition(intent_id, "QUEUED", "si-cycle",
                        ["envelope:%s" % envelope["envelope_id"]])
    crash_hook("INTENT_CREATED")

    win = envelope["action_windows"][intent["action"]]
    rec = S.consume_budget(
        intent["action"], intent_id, args.batch_id, args.account,
        win["per_pass_cap"], win["window_sec"], envelope["envelope_id"])
    if rec is None:
        S.record_transition(intent_id, "DEFERRED", "si-cycle",
                            ["budget-exhausted"],
                            note="window budget exhausted; deferred, "
                                 "not dropped")
        return
    S.record_transition(intent_id, "SCHEDULED", "si-cycle",
                        ["budget:%s" % rec["window_key"],
                         "lease:th-pass-%s" % args.batch_id])
    crash_hook("SCHEDULED")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch-id", required=True)
    ap.add_argument("--candidates", required=True)
    ap.add_argument("--account", default="@nolanpigi")
    ap.add_argument("--crash-after", default="")
    ap.add_argument("--workdir", default="")
    args = ap.parse_args()
    if args.crash_after:
        global CRASH_AFTER
        CRASH_AFTER = args.crash_after

    envelope = P.default_envelope()
    report = {"batch_id": args.batch_id, "decisions": [],
              "stopped": "", "watchdog": []}

    # Phase 0: machine-readable hold + safe mode. Prose never freezes.
    held, why = P.check_hold("threads")
    if held:
        report["stopped"] = "HOLD: " + why
        print(json.dumps(report, indent=1))
        return 3
    safe, reasons = P.safe_mode_probe()
    if safe:
        report["stopped"] = "SAFE MODE (mutations stopped): " + \
            "; ".join(reasons)
        print(json.dumps(report, indent=1))
        return 4
    P.check_no_action_without_authorized_account(envelope, args.account)

    lease_id = "th-pass-%s" % args.batch_id
    if not S.acquire_lease(lease_id, "si-cycle:%s" % args.batch_id):
        report["stopped"] = "lease held by another worker: failing closed"
        print(json.dumps(report, indent=1))
        return 5

    workdir = args.workdir or tempfile.mkdtemp(prefix="th-si-")
    os.makedirs(workdir, exist_ok=True)
    batch_seen = set()
    try:
        with open(args.candidates, "r", encoding="utf-8") as f:
            raw_candidates = json.load(f)
        if not isinstance(raw_candidates, list):
            raw_candidates = [raw_candidates]

        # Phase 2: decide + intend.
        for raw in raw_candidates:
            intend_candidate(raw, envelope, args, batch_seen, report)

        # Phase 3: drive this batch's drivable intents to terminal.
        for iid in sorted(S.load_intents()):
            intent = S.get_intent(iid)
            if intent.get("batch_id") == args.batch_id and \
                    intent.get("state") in DRIVABLE:
                drive_intent(intent, envelope, args, workdir, report)
                fin = S.get_intent(iid)
                report.setdefault("driven", []).append(
                    {"intent_id": iid, "final_state": fin["state"]})

        report["watchdog"] = W.check(envelope)
    finally:
        S.release_lease(lease_id, "si-cycle:%s" % args.batch_id)

    print(json.dumps(report, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
