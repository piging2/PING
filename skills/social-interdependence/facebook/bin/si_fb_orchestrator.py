#!/usr/bin/env python3
"""Facebook autonomous engagement orchestrator (vertical slice).

Pipeline per candidate:
  DISCOVERED -> NORMALIZED -> EVALUATED -> ELIGIBLE|REJECTED
    -> INTENT_CREATED -> QUEUED -> SCHEDULED -> DISPATCHED -> ATTEMPTING
    -> VERIFYING -> VERIFIED_SUCCESS | VERIFIED_NOOP
    | UNKNOWN -> (read-back) VERIFIED_SUCCESS | SAFE_RETRY | UNKNOWN
    | FAILED_RETRYABLE | FAILED_TERMINAL | DEFERRED | CANCELLED

Real machinery, scratch state:
  - eligibility: the REAL engagement-guard.py eligibility_check() via
    importlib, against ENGAGEMENT_GUARD_DIR (scratch in tests, production
    outreach dir in production). stamp_evidence / verify_evidence are the
    real guard functions too.
  - authority: the REAL authority-check.py as a subprocess (env-overridable
    paths), verdict parsed from its single verdict line.
  - durable intent: append-only JSONL with fsync, deterministic intent_id
    facebook:<action>:post:<id>:<batch_id> (NO_DUPLICATE_ACTIVE_INTENT).
  - budgets: atomic check-and-consume under flock (budget races fail closed).
  - execution: the fixture adapter ONLY at the boundary (LIVE BLOCKED).
  - verification: orchestrator read-after-write; adapter claims are never
    canonical (NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION).

Crash simulation: SI_FB_CRASH_AT in
  {after_decision, after_intent, before_execute, after_execute, after_verify}
persists all durable state up to the point, then raises CrashSimulated
(the test harness treats it as a SIGKILL: no further code runs).
Recovery is reconcile (si_fb_reconcile.py, reconcile-not-replay) followed by
`resume --batch-id`, which re-drives non-terminal intents WITHOUT
re-executing an uncertain external mutation.

Usage:
  si_fb_orchestrator.py run --envelope ENV.json --candidates CAND.json \
      --batch-id B [--account ACCT]
  si_fb_orchestrator.py resume --envelope ENV.json --batch-id B [--account ACCT]
"""
import argparse
import importlib.util
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

BIN = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BIN)
import si_fb_invariants as inv  # noqa: E402
import si_fb_state as st  # noqa: E402
from si_fb_envelope import load_envelope, effective_window_budget  # noqa: E402

GUARD_PY = os.environ.get(
    "ENGAGEMENT_GUARD_PY",
    os.path.expanduser("~/workspace/outreach/engagement-guard.py"))
AUTHORITY_CHECK_PY = os.environ.get(
    "AUTHORITY_CHECK_PY",
    os.path.expanduser("~/workspace/outreach/authority-check.py"))

_guard_cache = {}


def get_guard():
    """Import the real engagement-guard.py. Cached per (path, data dir)."""
    key = (GUARD_PY, os.environ.get("ENGAGEMENT_GUARD_DIR"))
    if key not in _guard_cache:
        spec = importlib.util.spec_from_file_location(
            "engagement_guard", GUARD_PY)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _guard_cache[key] = mod
    return _guard_cache[key]


class CrashSimulated(BaseException):
    def __init__(self, point):
        super().__init__("simulated kill at %s" % point)
        self.point = point


def maybe_crash(point):
    if os.environ.get("SI_FB_CRASH_AT") == point:
        raise CrashSimulated(point)


def run_authority_gate():
    """The real authority-check.py. Returns the verdict word."""
    env = dict(os.environ)
    p = subprocess.run([sys.executable, AUTHORITY_CHECK_PY, "facebook"],
                       capture_output=True, text=True, env=env, timeout=60)
    line = (p.stdout.strip().splitlines() or [""])[0]
    m = re.match(r"(AUTHORITY-\S+)", line)
    return m.group(1) if m else "AUTHORITY-FAIL-CLOSED"


def health_check(envelope):
    """Safe-mode dependencies. Returns {dep: bool}."""
    guard = get_guard()
    health = {"identity": False, "policy": False, "capability": False,
              "event_persistence": False, "verification": False}
    try:
        health["identity"] = bool(envelope.get("authorized_accounts"))
        health["policy"] = True  # envelope loaded and validated
        data = guard.load_eligibility_data()
        caps = data["action-capability.json"]["platforms"].get("facebook", {})
        health["capability"] = bool(caps.get("like") and caps.get("comment"))
    except Exception:
        pass
    try:
        st.append_jsonl("health_probe.jsonl", {"probe": True})
        health["event_persistence"] = True
    except Exception:
        pass
    try:
        import si_fb_adapter as adapter
        adapter.read("__probe__")
        health["verification"] = True
    except Exception:
        pass
    return health


def target_ref_from_candidate(candidate, guard):
    ids = guard._fb_post_ids(candidate.get("url"))
    if ids:
        return sorted(ids)[0]  # "post:<id>" form, prefixed per guard law
    return None


def identity_confidence(candidate, target_ref):
    if target_ref:
        return 0.95
    if candidate.get("page"):
        return 0.6
    return 0.2


def build_decision_record(candidate, envelope, verdict, budget_ok,
                          saturation, outcome_history, guard):
    action = candidate.get("type") or candidate.get("action") or "like"
    target_ref = target_ref_from_candidate(candidate, guard)
    conf_reqs = envelope.get("confidence_requirements") or {}
    ident_conf = identity_confidence(candidate, target_ref)
    policy_ok = verdict["decision"] == "ELIGIBLE"
    conf_ok = ident_conf >= conf_reqs.get("min_identity_confidence", 0.5)
    materiality = {"like": "low", "comment": "medium"}.get(action, "low")
    uncertainty = 1.0 - ident_conf
    if verdict["decision"] == "UNKNOWN":
        uncertainty = 1.0
    decision = ("proceed" if (policy_ok and conf_ok and budget_ok
                              and not saturation["saturated"])
                else "drop")
    reason_bits = []
    if not policy_ok:
        reason_bits.append("policy=%s(%s)" % (
            verdict["decision"], verdict["primary_reason"]))
    if not conf_ok:
        reason_bits.append("identity_confidence %.2f below minimum" % ident_conf)
    if not budget_ok:
        reason_bits.append("budget exhausted for %s" % action)
    if saturation["saturated"]:
        reason_bits.append("relationship saturated: %s" % saturation["note"])
    return {
        "candidate_id": candidate.get("candidate_id") or target_ref or "unknown",
        "actor": envelope["actor"],
        "target": target_ref,
        "relationship": candidate.get("page"),
        "content": candidate.get("text"),
        "platform": "facebook",
        "action_candidates": [action],
        "identity_confidence": ident_conf,
        "relationship_context": outcome_history,
        "evidence": verdict["evidence"],
        "capabilities": {"like": True, "comment": True},
        "policy_result": {"decision": verdict["decision"],
                          "primary_reason": verdict["primary_reason"],
                          "reasons": verdict["reasons"]},
        "budget_result": {"admitted": budget_ok},
        "materiality": materiality,
        "uncertainty": uncertainty,
        "saturation": saturation,
        "outcome_history": outcome_history,
        "decision": decision,
        "reason": "; ".join(reason_bits) if reason_bits else "all gates pass",
    }


def transition(intent_id, from_state, to_state, evidence):
    # Transitions live in intents.jsonl: st.fold_intents() is the single
    # decision-replay fold, and it only reads intents.jsonl. Writing them
    # anywhere else makes resume/reconcile blind to executed transitions.
    # The transition table itself is machine-checked: illegal transitions
    # raise before anything is persisted.
    inv.check_state_transition(intent_id, from_state, to_state)
    st.append_jsonl("intents.jsonl", {
        "record_type": "transition",
        "intent_id": intent_id,
        "from_state": from_state,
        "to_state": to_state,
        "evidence": evidence,
    })


def intent_id_for(action, target_ref, batch_id):
    return "facebook:%s:%s:%s" % (action, target_ref, batch_id)


def gcandidate(candidate):
    return {
        "platform": "facebook",
        "type": candidate.get("type") or candidate.get("action") or "like",
        "url": candidate.get("url"),
        "page": candidate.get("page"),
        "text": candidate.get("text"),
        "group_id": candidate.get("group_id"),
        "group_name": candidate.get("group_name"),
        "feed": candidate.get("feed"),
    }


def evaluate_candidate(candidate, envelope, guard, data, index,
                       batch_seen=None):
    """DISCOVERED -> NORMALIZED -> EVALUATED. Returns (record, gcand)."""
    action = candidate.get("type") or candidate.get("action") or "like"
    inv.check("NO_PROSE_AUTHORIZES_OR_FREEZES",
              action in envelope["allowed_action_types"],
              "action %r not in envelope allowed_action_types" % action)
    gc = gcandidate(candidate)
    verdict = guard.eligibility_check(index, gc, data=data,
                                      batch_seen=batch_seen)
    rel = st.read_json("relationships.json", {}) or {}
    biz = (candidate.get("page") or "").strip().lower()
    touches = ((rel.get(biz) or {}).get("touches") or [])
    rel_budget = envelope.get("relationship_budget") or {}
    max_t = rel_budget.get("max_touches_per_relationship_per_30d", 2)
    window_days = rel_budget.get("window_days", 30)
    now_d = datetime.now(timezone.utc)
    recent = [t for t in touches
              if (now_d - datetime.fromisoformat(t)).days < window_days]
    saturated = len(recent) >= max_t
    saturation = {"saturated": saturated,
                  "note": "touches=%d max=%d window_days=%d"
                          % (len(recent), max_t, window_days)}
    eff_budget = effective_window_budget(envelope)
    scope = "fb:execution:%s" % action
    consumed = st.budget_consumed(scope, 2 * 3600)
    budget_ok = consumed < eff_budget[action]
    record = build_decision_record(candidate, envelope, verdict, budget_ok,
                                   saturation, {"touches": len(recent)}, guard)
    st.append_jsonl("decision_records.jsonl", record)
    return record, gc


def create_intent(candidate, action, target_ref, batch_id, verdict, envelope,
                  guard, data):
    intent_id = intent_id_for(action, target_ref, batch_id)
    inv.assert_intent_id(intent_id)
    inv.assert_no_duplicate_active(intent_id, st.fold_intents())
    base_action = {"type": action, "platform": "facebook",
                   "url": candidate.get("url"), "page": candidate.get("page"),
                   "text": candidate.get("text")}
    stamped = guard.stamp_evidence(base_action, verdict, data)
    st.append_jsonl("intents.jsonl", {
        "record_type": "intent",
        "intent_id": intent_id,
        "platform": "facebook",
        "action": action,
        "target_ref": target_ref,
        "url": candidate.get("url"),
        "page": candidate.get("page"),
        "content": candidate.get("text"),
        "batch_id": batch_id,
        "state": "INTENT_CREATED",
        "eligibility": stamped["eligibility"],
        "actor": envelope["actor"],
        "account": envelope.get("acting_account"),
    })
    transition(intent_id, "ELIGIBLE", "INTENT_CREATED",
               {"evidence": "durable intent persisted before any external "
                            "effect; eligibility envelope stamped"})
    return intent_id


def verify_read_after_write(intent, evidence):
    """Orchestrator-side verification. Returns (ok, kind, verification)."""
    import si_fb_adapter as adapter
    post_id = intent["target_ref"].split(":", 1)[1]
    observed = adapter.read(post_id)
    action = intent["action"]
    if action == "like":
        if observed.get("liked"):
            if (evidence or {}).get("observed", {}).get("already_liked"):
                kind = "VERIFIED_NOOP"
            else:
                kind = "VERIFIED_SUCCESS"
            ok = True
        else:
            kind, ok = "FAILED_RETRYABLE", False
    elif action == "comment":
        text = intent.get("content") or ""
        if text and text in (observed.get("comments") or []):
            if (evidence or {}).get("observed", {}).get("already_commented"):
                kind = "VERIFIED_NOOP"
            else:
                kind = "VERIFIED_SUCCESS"
            ok = True
        else:
            kind, ok = "FAILED_RETRYABLE", False
    else:
        kind, ok = "FAILED_TERMINAL", False
    verification = {"method": "read_after_write", "observer": "orchestrator",
                    "observed_effect": ok and kind == "VERIFIED_SUCCESS",
                    "observed_state": observed,
                    "adapter_evidence": evidence}
    return ok, kind, verification


def recover_unknown(intent_id, intent_rec, evidence, fault_note):
    """UNKNOWN-outcome recovery: read external state, never blind-retry.
    Returns (state, detail)."""
    import si_fb_adapter as adapter
    try:
        observed = adapter.read(intent_rec["target_ref"].split(":", 1)[1])
    except adapter.AdapterFault as e:
        transition(intent_id, "UNKNOWN", "UNKNOWN",
                   {"evidence": "read-back also failed: %s; remains UNKNOWN, "
                                "no retry, no inference" % e})
        return ("UNKNOWN", "read-back failed; remains UNKNOWN")
    action = intent_rec["action"]
    effect = False
    if action == "like" and observed.get("liked"):
        effect = True
    if action == "comment":
        text = intent_rec.get("content") or ""
        effect = bool(text and text in (observed.get("comments") or []))
    if effect:
        v = {"method": "read_after_write", "observer": "orchestrator",
             "observed_effect": True, "observed_state": observed,
             "adapter_evidence": evidence,
             "recovery": "read-back after uncertain execution: effect present"}
        inv.assert_verified_success(v)
        transition(intent_id, "UNKNOWN", "VERIFIED_SUCCESS", {"evidence": v})
        return ("VERIFIED_SUCCESS", v)
    # Read-back proves no external effect: SAFE_RETRY is allowed, but this
    # intent is never re-executed. A fresh intent (new batch lineage) may be
    # created by the scheduler; this one closes as superseded.
    transition(intent_id, "UNKNOWN", "SAFE_RETRY",
               {"evidence": "read-back shows no external effect; safe to "
                            "create a fresh intent, never re-execute this one",
                "observed_state": observed,
                "fault_note": fault_note})
    return ("SAFE_RETRY", {"observed_state": observed})


def drive_intent(intent_id, envelope, account, guard, data, index,
                 breakers, safe_mode):
    """Drive one durable intent from its current state to a terminal state
    (or DEFERRED). Never re-executes an uncertain external mutation:
    entry states DISPATCHED/ATTEMPTING/UNKNOWN go through read-back
    recovery, not a second adapter.execute."""
    import si_fb_adapter as adapter
    fold = st.fold_intents()
    rec = fold[intent_id]["record"]
    state = fold[intent_id]["state"]
    action = rec["action"]

    def cur():
        return st.fold_intents()[intent_id]["state"]

    try:
        if state == "DEFERRED":
            # Safe mode cleared (or operator resume): re-enter the queue.
            # The QUEUED branch re-checks safe mode before any dispatch.
            transition(intent_id, "DEFERRED", "QUEUED",
                       {"evidence": "resume from deferral; safe mode "
                                    "re-evaluated at queue time"})
            state = "QUEUED"
        if state == "FAILED_RETRYABLE":
            # Retryable failure (e.g. post not found at attempt time):
            # re-queue the SAME intent; no new intent, no duplicate.
            transition(intent_id, "FAILED_RETRYABLE", "QUEUED",
                       {"evidence": "retryable failure; re-queued"})
            state = "QUEUED"
        if state == "INTENT_CREATED":
            transition(intent_id, state, "QUEUED",
                       {"evidence": "durable intent exists; queued"})
            state = "QUEUED"
        if state == "QUEUED":
            if safe_mode:
                transition(intent_id, "QUEUED", "DEFERRED",
                           {"evidence": "safe mode: new mutations stop"})
                return "DEFERRED"
            for bscope in ("action:facebook:%s" % action,
                           "account:%s" % account,
                           "adapter:facebook", "platform:facebook",
                           "tenant:%s" % envelope["tenant"]):
                inv.assert_breaker_closed(bscope, breakers)
            lease_ok = st.lease_acquire("fb:dispatch", intent_id, 900)
            inv.check("NO_DUPLICATE_ACTIVE_INTENT", lease_ok,
                      "dispatch lease held by another intent")
            transition(intent_id, "QUEUED", "SCHEDULED",
                       {"evidence": "dispatch lease acquired by %s"
                                    % intent_id})
            state = "SCHEDULED"
        if state == "SCHEDULED":
            maybe_crash("before_execute")
            # Dispatch-time gates: authority re-checked (a hold or revocation
            # lands within one intent, not one pass), envelope verified AND
            # the full reason set re-evaluated live (the envelope is
            # evidence, not the decision).
            fresh_verdict = run_authority_gate()
            inv.assert_authorized_account(account, envelope, fresh_verdict)
            ev_ok, ev_why = guard.verify_evidence(
                {"eligibility": rec["eligibility"]}, data)
            inv.check("NO_DISPATCH_WITHOUT_ENVELOPE", ev_ok,
                      "dispatch-time envelope refused: %s" % ev_why)
            live = guard.eligibility_check(
                index, gcandidate({"type": action, "url": rec["url"],
                                   "page": rec["page"], "text": rec["content"]}),
                data=data)
            inv.check("NO_DISPATCH_TRUSTS_ENVELOPE_ALONE",
                      live["decision"] == "ELIGIBLE",
                      "live re-evaluation at dispatch: %s (%s)"
                      % (live["decision"], live["primary_reason"]))
            transition(intent_id, "SCHEDULED", "DISPATCHED",
                       {"evidence": "envelope verified; live eligibility "
                                    "re-evaluated ELIGIBLE"})
            transition(intent_id, "DISPATCHED", "ATTEMPTING",
                       {"evidence": "handed to adapter"})
            state = "ATTEMPTING"
        if state == "ATTEMPTING":
            try:
                evidence = adapter.execute(
                    {"action": action, "target_ref": rec["target_ref"],
                     "content": rec.get("content") or ""})
                fault = None
            except adapter.AdapterFault as e:
                evidence, fault = None, str(e)
            maybe_crash("after_execute")
            if fault is not None:
                transition(intent_id, "ATTEMPTING", "UNKNOWN",
                           {"evidence": "adapter fault: %s" % fault})
                state, detail = recover_unknown(intent_id, rec, None, fault)
                finalize(intent_id, state, detail, rec)
                return state
            if not evidence.get("attempted"):
                transition(intent_id, "ATTEMPTING", "FAILED_RETRYABLE",
                           {"evidence": evidence.get("note"),
                            "proven_no_mutation": True})
                finalize(intent_id, "FAILED_RETRYABLE",
                         {"note": evidence.get("note")}, rec)
                return "FAILED_RETRYABLE"
            transition(intent_id, "ATTEMPTING", "VERIFYING",
                       {"evidence": "raw adapter evidence recorded; "
                                    "canonical outcome not yet decided"})
            state = "VERIFYING"
            st.append_jsonl("intents.jsonl",
                            {"record_type": "adapter_evidence",
                             "intent_id": intent_id, "evidence": evidence})
        if state in ("DISPATCHED", "UNKNOWN"):
            # Resume path: never re-execute; read-back recovery only.
            if cur() != "UNKNOWN":
                transition(intent_id, cur(), "UNKNOWN",
                           {"evidence": "resume: execution outcome uncertain "
                                        "after crash; read-back recovery, "
                                        "no second execute"})
            state, detail = recover_unknown(intent_id, rec, None,
                                            "resume after crash")
            finalize(intent_id, state, detail, rec)
            return state
        if state == "VERIFYING":
            ev_rows = [r for r in st.read_jsonl("intents.jsonl")
                       if r.get("record_type") == "adapter_evidence"
                       and r.get("intent_id") == intent_id]
            evidence = ev_rows[-1]["evidence"] if ev_rows else {}
            okv, kind, verification = verify_read_after_write(rec, evidence)
            if kind == "VERIFIED_SUCCESS":
                inv.assert_verified_success(verification)
            if not okv:
                st.append_jsonl("watchdog.jsonl",
                                {"event": "verification_failure",
                                 "intent_id": intent_id,
                                 "adapter_evidence": evidence,
                                 "verification": verification})
            transition(intent_id, "VERIFYING", kind,
                       {"evidence": verification})
            maybe_crash("after_verify")
            finalize(intent_id, kind, verification, rec)
            return kind
        return cur()
    finally:
        st.lease_release("fb:dispatch", intent_id)


def finalize(intent_id, state, detail, rec):
    st.append_jsonl("observations.jsonl", {
        "record_type": "observation",
        "intent_id": intent_id,
        "terminal": state in inv.TERMINAL_STATES,
        "state": state,
        "detail": detail if isinstance(detail, dict) else {"note": detail},
    })
    if state in ("VERIFIED_SUCCESS", "VERIFIED_NOOP"):
        rel = st.read_json("relationships.json", {}) or {}
        biz = (rec.get("page") or "").strip().lower()
        entry = rel.get(biz) or {"touches": []}
        entry["touches"] = (entry.get("touches") or []) + [st.utcnow()]
        rel[biz] = entry
        st.write_json_atomic("relationships.json", rel)
    st.append_jsonl("watchdog.jsonl", {"event": "outcome",
                                       "intent_id": intent_id,
                                       "state": state})


def run_pipeline(envelope, candidates, batch_id, account):
    guard = get_guard()
    data = guard.load_eligibility_data()
    index = guard.load_index()
    authority_verdict = run_authority_gate()
    inv.assert_authorized_account(account, envelope, authority_verdict)
    health = health_check(envelope)
    safe_mode = not all(health.values())
    breakers = st.read_json("circuit_breakers.json", {}) or {}

    results = []
    batch_seen = set()  # within-batch duplicate detection (guard DUPLICATE)
    for candidate in candidates:
        record, gc = evaluate_candidate(candidate, envelope, guard, data,
                                        index, batch_seen)
        maybe_crash("after_decision")
        if record["decision"] != "proceed":
            to_state = ("REJECTED" if record["policy_result"]["decision"]
                        != "ELIGIBLE" or not record["budget_result"]["admitted"]
                        else "DEFERRED")
            results.append({"candidate": candidate.get("candidate_id"),
                            "intent_id": None, "state": to_state,
                            "reason": record["reason"]})
            continue
        action = (candidate.get("type") or candidate.get("action") or "like")
        target_ref = target_ref_from_candidate(candidate, guard)
        intent_id = intent_id_for(action, target_ref, batch_id)
        inv.assert_intent_id(intent_id)
        fold_now = st.fold_intents()
        prior = fold_now.get(intent_id)
        if prior is not None:
            if prior["state"] in inv.TERMINAL_STATES:
                # Idempotent re-run: the batch already reached a terminal
                # state. Report it; create nothing, consume nothing,
                # touch the platform never.
                results.append({"candidate": candidate.get("candidate_id"),
                                "intent_id": intent_id,
                                "state": prior["state"],
                                "reason": "idempotent re-run: intent already "
                                          "terminal; not re-created"})
                continue
            inv.check("NO_DUPLICATE_ACTIVE_INTENT", False,
                      "active intent %s already exists" % intent_id)
        # Per-target protection: a second intent for the same post while
        # one is in flight (any batch) is refused, even though the
        # intent_ids differ. SAFE_RETRY is proven-no-effect, so a fresh
        # batch for that target is allowed.
        blocker = inv.target_in_flight(fold_now, target_ref)
        inv.check("NO_DUPLICATE_ACTIVE_INTENT", blocker is None,
                  "target %s already in flight as %s" % (target_ref,
                                                         blocker))
        eff_budget = effective_window_budget(envelope)
        scope = "fb:execution:%s" % action
        okc, _ = st.budget_consume(scope, eff_budget[action], 2 * 3600)
        inv.check("NO_PROSE_AUTHORIZES_OR_FREEZES", okc,
                  "budget race lost for %s" % scope)
        create_intent(candidate, action, target_ref, batch_id,
                      {"decision": "ELIGIBLE",
                       "primary_reason": None,
                       "reasons": record["policy_result"]["reasons"],
                       "evidence": record["evidence"]},
                      envelope, guard, data)
        maybe_crash("after_intent")
        state = drive_intent(intent_id, envelope, account, guard, data,
                             index, breakers, safe_mode)
        results.append({"candidate": candidate.get("candidate_id"),
                        "intent_id": intent_id, "state": state})
    return results


def resume_batch(envelope, batch_id, account):
    guard = get_guard()
    data = guard.load_eligibility_data()
    index = guard.load_index()
    authority_verdict = run_authority_gate()
    inv.assert_authorized_account(account, envelope, authority_verdict)
    health = health_check(envelope)
    safe_mode = not all(health.values())
    breakers = st.read_json("circuit_breakers.json", {}) or {}
    resumable = {"INTENT_CREATED", "QUEUED", "SCHEDULED", "DISPATCHED",
                 "ATTEMPTING", "UNKNOWN", "VERIFYING", "DEFERRED",
                 "FAILED_RETRYABLE"}
    results = []
    for intent_id, stt in sorted(st.fold_intents().items()):
        if stt["record"].get("batch_id") != batch_id:
            continue
        if stt["state"] not in resumable:
            continue
        state = drive_intent(intent_id, envelope, account, guard, data,
                             index, breakers, safe_mode)
        results.append({"intent_id": intent_id, "state": state})
    return results


def cmd_run(args):
    envelope = load_envelope(args.envelope)
    account = args.account or envelope.get("acting_account")
    with open(args.candidates, "r", encoding="utf-8") as f:
        raw = json.load(f)
    candidates = raw if isinstance(raw, list) else raw.get("candidates", [])
    try:
        results = run_pipeline(envelope, candidates, args.batch_id, account)
    except CrashSimulated as c:
        print(json.dumps({"crashed_at": c.point,
                          "note": "simulated kill; durable state persisted "
                                  "up to the crash point"}))
        return 99
    print(json.dumps({"batch_id": args.batch_id, "results": results},
                     indent=1))
    return 0


def cmd_resume(args):
    envelope = load_envelope(args.envelope)
    account = args.account or envelope.get("acting_account")
    try:
        results = resume_batch(envelope, args.batch_id, account)
    except CrashSimulated as c:
        print(json.dumps({"crashed_at": c.point,
                          "note": "simulated kill during resume"}))
        return 99
    print(json.dumps({"batch_id": args.batch_id, "resumed": results},
                     indent=1))
    return 0


def main(argv):
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--envelope", required=True)
    r.add_argument("--candidates", required=True)
    r.add_argument("--batch-id", required=True)
    r.add_argument("--account", default=None)
    r.set_defaults(fn=cmd_run)
    s = sub.add_parser("resume")
    s.add_argument("--envelope", required=True)
    s.add_argument("--batch-id", required=True)
    s.add_argument("--account", default=None)
    s.set_defaults(fn=cmd_resume)
    args = p.parse_args(argv)
    try:
        return args.fn(args)
    except inv.InvariantViolation as e:
        st.append_jsonl("watchdog.jsonl",
                        {"event": "invariant_violation",
                         "invariant": e.code, "detail": e.detail})
        print(json.dumps({"ok": False, "invariant": e.code,
                          "detail": e.detail}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
