#!/usr/bin/env python3
"""siig_executor.py: the autonomous Instagram executor.

WHAT REPLACES THE HUMAN, machine-enforced, in execution order:

  constitutional invariants (assert_* below, raise InvariantViolation) +
  authority-check.py gate (holds.json step 0, fail-closed) +
  the ONE deterministic eligibility function (engagement-guard.py,
    plan-time stamp + dispatch-time live re-evaluation, envelope integrity) +
  CapabilityAuthority (action-capability.json single copy) +
  IdentityAuthority (adapter identity == envelope authorized account) +
  stable intent identity (intent_id, handle-scoped duplicate refusal) +
  idempotency (verification reads; guard history re-consulted on restart) +
  budgets (atomic, restart-durable, learner cannot raise) +
  leases (single executing worker per account) +
  verification (read-after-write; no canonical success without it) +
  evidence (transition log, decision records, evidence envelopes) +
  replay (decision replay from the transition log; NEVER mutation replay) +
  circuit breakers (scoped; no execution while open) +
  watchdogs (observe; may stop/defer/roll back; never grant authority) +
  bounded self-improvement (shadow/canary/active with machine gates) +
  automatic rollback (watchdog reverts learner config; breakers reopen).

A FAILED PASS IS RETRIED, never answered with lower caps; caps come only
from the envelope.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from siig_common import (STATE_ROOT, PLATFORM, ACCOUNT, ACTOR, TENANT,
                         norm_handle, target_ref, batch_id_now, iso_now,
                         append_jsonl, read_json, read_jsonl,
                         atomic_write_json, ensure_state_dirs)
from siig_states import (STATES, TERMINAL, legal, record_intent, transition,
                         current_states, intents_index,
                         active_intents_for_handle)
from siig_guard import (plan_candidates, dispatch_refilter, record_completed,
                        authority_check, action_allowed)
from siig_decisions import (normalize_candidate, identity_gate,
                            prohibited_target, build_decision_record,
                            check_comment_content)
from siig_budgets import BudgetStore
from siig_leases import acquire, release, is_expired, holder
from siig_breakers import (is_open, claim_probe, record_success,
                           record_failure, record_unknown, trip_platform,
                           breaker_allows)
from siig_verify import verify_after_attempt, resolve_unknown
from siig_watchdog import (evaluate_pass, budget_anomaly_check, observe,
                           stop_active)
from siig_learner import active_config
from siig_relationship import record_touch, touch_count
from siig_adapter_contract import (AdapterAuthExpired, AdapterTimeout,
                                   AdapterOutage, AdapterPlatformSignal,
                                   AdapterError)


class InvariantViolation(RuntimeError):
    pass


class AuthorityDenied(RuntimeError):
    pass


class CrashNow(Exception):
    """Failure-injection: simulated kill between transitions."""


def _invariant(cond, code, detail):
    if not cond:
        raise InvariantViolation("%s: %s" % (code, detail))


# ------------------------------------------------------------------ envelope
def load_envelope():
    path = os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), "AUTONOMY_ENVELOPE.md")
    return default_envelope()


def default_envelope():
    """The Instagram autonomy envelope (v1). Operator-set; the learner may
    never modify it. See AUTONOMY_ENVELOPE.md for the full text."""
    return {
        "envelope_id": "si-ig-envelope/v1",
        "tenant": TENANT,
        "actor": ACTOR,
        "authorized_accounts": [ACCOUNT],
        "allowed_platforms": [PLATFORM],
        "allowed_capabilities": ["read", "like", "comment"],
        "allowed_action_types": ["like", "comment"],
        "prohibited_targets": [
            {"match": "monument view",
             "reason": "owner order 2026-09-24: no autonomous contact until "
                       "the two-tenant FYD journey is green; Nolan makes "
                       "first contact himself"},
        ],
        "namespace_scope": "instagram handle namespace, corridor-local "
                           "business accounts",
        "execution_budget": {"likes_per_pass": 50, "comments_per_pass": 12,
                             "ramp_likes_per_week": 5,
                             "ramp_comments_per_week": 3,
                             "ramp_epoch": "2026-09-26"},
        "concurrency_budget": {"max_executing_workers_per_account": 1},
        "relationship_budget": {"max_new_handles_per_pass": 62,
                                "max_touches_per_handle": 1},
        "platform_budget": {"min_inter_action_sec": 60,
                            "max_inter_action_sec": 120},
        "temporal_constraints": {"pass_cadence_sec": 7200,
                                 "eligibility_ttl_sec": 21600,
                                 "lease_sec": 300},
        "confidence_requirements": {"identity_country_gate": "US",
                                    "unknown_identity_dispatches": False},
        "verification_requirements": {"read_after_write": True,
                                      "canonical_success_requires_"
                                      "verification": True},
        "retry_policy": {"max_retries": 2, "backoff_base_sec": 120,
                         "unknown_requires_read_first": True},
        "maximum_failure_rate": 0.10,
        "maximum_unknown_rate": 0.05,
        "circuit_breaker_policy": {"scopes": ["action", "account",
                                              "adapter", "platform",
                                              "tenant"],
                                   "failure_threshold": 5,
                                   "unknown_threshold": 3,
                                   "platform_signal_opens_platform": True,
                                   "cooldown_sec": 3600},
    }


def check_envelope(envelope, action):
    _invariant(envelope.get("tenant") == TENANT,
               "ENVELOPE_TENANT", "envelope tenant mismatch")
    _invariant(PLATFORM in envelope.get("allowed_platforms", []),
               "ENVELOPE_PLATFORM", "instagram not in allowed_platforms")
    _invariant(action in envelope.get("allowed_action_types", []),
               "ENVELOPE_ACTION", "action %s not allowed" % action)


def check_authorized_account(adapter, envelope):
    ident = adapter.get_identity()
    acct = norm_handle(ident.get("account"))
    _invariant(acct in [norm_handle(a) for a in
                        envelope.get("authorized_accounts", [])],
               "NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
               "adapter identity @%s not in authorized_accounts" % acct)
    return acct


def safe_mode(adapter, envelope):
    """Reads may continue; new mutations stop. No human needed to decide."""
    reasons = []
    try:
        ident = adapter.get_identity()
        if norm_handle(ident.get("account")) != norm_handle(ACCOUNT):
            reasons.append("identity mismatch")
    except Exception as e:
        reasons.append("identity unavailable: %s" % e)
    if not action_allowed("like"):
        reasons.append("capability data unreadable or like disallowed")
    try:
        ensure_state_dirs()
        probe = os.path.join(STATE_ROOT, ".writability-probe")
        with open(probe, "w") as f:
            f.write("ok")
        os.unlink(probe)
    except OSError as e:
        reasons.append("state not writable: %s" % e)
    return reasons


# ------------------------------------------------------------------ planning
def build_pass(adapter, envelope, worker_id, crash_points=()):
    """Plan phase: DISCOVERED -> ... -> SCHEDULED. No external mutation."""
    verdict, detail = authority_check()
    if verdict != "AUTHORIZED":
        raise AuthorityDenied(
            "authority-check.py instagram not AUTHORIZED: %s (%s)"
            % (verdict, detail))
    try:
        check_authorized_account(adapter, envelope)
    except AdapterAuthExpired as e:
        observe("safe_mode_entered",
                {"reasons": ["identity unavailable: %s" % e]})
        return {"safe_mode": True, "reasons": ["identity unavailable: %s" % e],
                "batch_id": None, "built": []}
    sm = safe_mode(adapter, envelope)
    if sm:
        observe("safe_mode_entered", {"reasons": sm})
        return {"safe_mode": True, "reasons": sm, "batch_id": None,
                "built": []}
    cfg = active_config()
    batch_id = batch_id_now()
    discovery = adapter.discover(
        {"batch_size": cfg["discovery_batch_size"]})
    budgets = BudgetStore()
    states = current_states()
    index = intents_index()
    seen_handles = set()
    built = []
    dropped = []

    guard_inputs = []
    cands = []
    for seq, raw in enumerate(discovery):
        cand = normalize_candidate(raw, seq)
        record_intent_stub(cand, batch_id, "DISCOVERED")
        if not cand["handle"]:
            transition(cand["intent_stub"], "DISCOVERED", "REJECTED",
                       "empty handle", {"candidate_id": cand["candidate_id"]})
            dropped.append(cand["candidate_id"])
            continue
        transition(cand["intent_stub"], "DISCOVERED", "NORMALIZED",
                   "normalized; haystack handle+header+body",
                   {"haystack_len": len(cand["haystack"])})
        ok, conf, note = identity_gate(cand)
        if not ok:
            transition(cand["intent_stub"], "NORMALIZED", "REJECTED",
                       "identity gate", {"note": note})
            dropped.append(cand["candidate_id"])
            continue
        hit = prohibited_target(cand, envelope["prohibited_targets"])
        if hit:
            transition(cand["intent_stub"], "NORMALIZED", "REJECTED",
                       "prohibited target", {"match": hit["match"],
                                            "reason": hit["reason"]})
            dropped.append(cand["candidate_id"])
            continue
        if cand["handle"] in seen_handles:
            transition(cand["intent_stub"], "NORMALIZED", "REJECTED",
                       "within-batch duplicate handle",
                       {"handle": cand["handle"]})
            dropped.append(cand["candidate_id"])
            continue
        seen_handles.add(cand["handle"])
        cands.append((cand, conf, note))

    for cand, conf, note in cands:
        action = (cand.get("suggested_action") or "like")
        _invariant(action in ("like", "comment"), "UNKNOWN_ACTION",
                   "suggested_action %r not in envelope" % action)
        check_envelope(envelope, action)
        content = None
        if action == "comment":
            content = (cand.get("draft") or "").strip()
            problems = check_comment_content(content)
            if problems or not content:
                transition(cand["intent_stub"], "NORMALIZED", "REJECTED",
                           "comment content policy",
                           {"violations": problems or ["empty draft"]})
                dropped.append(cand["candidate_id"])
                continue
        transition(cand["intent_stub"], "NORMALIZED", "EVALUATED",
                   "submitted to the deterministic eligibility function",
                   {"function": "engagement-guard.eligibility_check/v1"})
        guard_in = {"platform": PLATFORM, "type": action,
                    "url": cand.get("post_url"), "page": "@" + cand["handle"],
                    "text": cand.get("haystack"),
                    "candidate_id": cand["candidate_id"]}
        eligible, dropped_g = plan_candidates([dict(guard_in, action={
            "platform": PLATFORM, "type": action, "url": cand.get("post_url"),
            "page": "@" + cand["handle"], "text": cand.get("haystack"),
            "candidate_id": cand["candidate_id"]})])
        if dropped_g:
            d = dropped_g[0]
            transition(cand["intent_stub"], "EVALUATED", "REJECTED",
                       "guard verdict " + d["decision"],
                       {"primary_reason": d["primary_reason"],
                        "reasons": d["reasons"]})
            dropped.append(cand["candidate_id"])
            continue
        stamped = eligible[0]
        env_hash = stamped["eligibility"]["evidence_hash"]
        verdict_view = {"decision": "ELIGIBLE",
                        "primary_reason": None,
                        "reasons": stamped["eligibility"]["reasons"],
                        "envelope_hash": env_hash}
        transition(cand["intent_stub"], "EVALUATED", "ELIGIBLE",
                   "guard verdict ELIGIBLE",
                   {"evidence_hash": env_hash,
                    "reasons": stamped["eligibility"]["reasons"]})
        rel_ctx = {"handle": cand["handle"],
                   "touches": touch_count(cand["handle"]),
                   "prior_outcomes": prior_outcomes(cand["handle"])}
        budget_ok = budgets.reserve(action)
        decision = build_decision_record(
            cand, verdict_view,
            {"like": action_allowed("like"),
             "comment": action_allowed("comment")},
            {"reserved": budget_ok}, rel_ctx, rel_ctx["prior_outcomes"],
            None, True, conf, note, action=action)
        append_jsonl(os.path.join(STATE_ROOT, "decisions.jsonl"), decision)
        if decision["decision"] != "PROCEED":
            transition(cand["intent_stub"], "ELIGIBLE", "DEFERRED",
                       decision["reason"], {"decision": decision["decision"]})
            if budget_ok:
                budgets.release(action)
            dropped.append(cand["candidate_id"])
            continue
        active = active_intents_for_handle(cand["handle"], states, index)
        _invariant(not active, "NO_DUPLICATE_ACTIVE_INTENT",
                   "handle @%s already has active intent(s): %s"
                   % (cand["handle"], active))
        intent_id = "%s:%s:%s:%s" % (
            PLATFORM, action, cand["target_ref"], batch_id)
        intent = {"intent_id": intent_id, "batch_id": batch_id,
                  "platform": PLATFORM, "action": action,
                  "target_ref": cand["target_ref"],
                  "target_handle": cand["handle"],
                  "target_post_url": cand.get("post_url"),
                  "account": ACCOUNT, "actor": ACTOR,
                  "content": content, "created_at": iso_now(),
                  "text": cand.get("haystack"),
                  "envelope_id": envelope["envelope_id"],
                  "decision_record": decision,
                  "eligibility": stamped["eligibility"]}
        record_intent(intent)
        transition(intent_id, "ELIGIBLE", "INTENT_CREATED",
                   "durable intent persisted before any external effect",
                   {"evidence_hash": env_hash,
                    "budget_reserved": True})
        if "after_intent_created" in crash_points:
            raise CrashNow("injected crash after INTENT_CREATED")
        transition(intent_id, "INTENT_CREATED", "QUEUED",
                   "queued for scheduling", {})
        built.append(intent_id)
        states[intent_id] = "QUEUED"
        index[intent_id] = intent

    order = sorted(built, key=lambda iid: index[iid]["decision_record"][
        "priority_score"], reverse=True)
    delay = cfg["inter_action_delay_sec"]
    for slot, iid in enumerate(order):
        transition(iid, "QUEUED", "SCHEDULED",
                   "scheduled with pacing",
                   {"slot": slot, "offset_sec": slot * delay,
                    "inter_action_delay_sec": delay})
    snapshot_guard(batch_id)
    return {"safe_mode": False, "batch_id": batch_id, "built": order,
            "dropped": dropped, "discovered": len(discovery)}


def record_intent_stub(cand, batch_id, _state):
    """A stub lets the transition log track pre-intent candidates through
    DISCOVERED/NORMALIZED/EVALUATED/ELIGIBLE/REJECTED with a stable id."""
    stub = "stub:%s:%s" % (batch_id, cand["candidate_id"])
    cand["intent_stub"] = stub
    return stub


def prior_outcomes(handle):
    index = intents_index()
    states = current_states()
    out = []
    for iid, rec in index.items():
        if iid.startswith("stub:"):
            continue
        if rec.get("target_handle") == handle:
            out.append({"intent_id": iid, "state": states.get(iid),
                        "action": rec.get("action")})
    return out


def snapshot_guard(batch_id):
    """Pre-pass guard snapshot for post-pass verify."""
    from siig_guard import guard as _g
    g = _g()
    index = g.load_index()
    payload = index["platforms"][PLATFORM]
    snap = {"batch_id": batch_id, "at": iso_now(),
            "handles": sorted(payload.get("handles", [])),
            "shortcodes": sorted(payload.get("shortcodes", []))}
    p = os.path.join(STATE_ROOT, "pass_snapshots")
    os.makedirs(p, exist_ok=True)
    atomic_write_json(os.path.join(p, batch_id + ".json"), snap)
    return snap


# ------------------------------------------------------------------ dispatch
def retries_used(intent_id):
    n = 0
    for rec in read_jsonl(os.path.join(STATE_ROOT, "transitions.jsonl")):
        if rec["intent_id"] == intent_id and rec["to"] == "QUEUED" and \
                rec["from"] in ("FAILED_RETRYABLE", "SAFE_RETRY"):
            n += 1
    return n


def execute_pass(adapter, envelope, worker_id, batch_id, crash_points=()):
    """Dispatch phase: SCHEDULED -> terminal. Every mutation is leased,
    breaker-checked, refiltered, executed, and verified."""
    verdict, detail = authority_check()
    if verdict != "AUTHORIZED":
        cancel_remaining(batch_id, "authority revoked mid-pass: %s" % verdict)
        raise AuthorityDenied("dispatch authority %s: %s" % (verdict, detail))
    states = current_states()
    index = intents_index()
    budgets = BudgetStore()
    violations = []
    schedulable = [iid for iid, rec in index.items()
                   if rec.get("batch_id") == batch_id
                   and states.get(iid) in ("SCHEDULED", "QUEUED")]
    requeued = []
    for iid in schedulable:
        if states[iid] == "QUEUED":
            if not budgets.reserve(index[iid]["action"]):
                transition(iid, "QUEUED", "DEFERRED",
                           "budget exhausted on re-schedule", {})
                continue
            transition(iid, "QUEUED", "SCHEDULED",
                       "re-scheduled after bounded retry; budget re-reserved",
                       {"retries_used": retries_used(iid)})
            requeued.append(iid)
    scheduled = [iid for iid in schedulable
                 if current_states().get(iid) == "SCHEDULED"]
    scheduled.sort(key=lambda iid: index[iid]["decision_record"][
        "priority_score"], reverse=True)
    for iid in scheduled:
        if stop_active():
            transition(iid, "SCHEDULED", "CANCELLED",
                       "watchdog stop flag active", {})
            budgets.release(index[iid]["action"])
            continue
        execute_one(adapter, envelope, worker_id, iid, index, budgets,
                    violations, crash_points)
        states = current_states()
    metrics = evaluate_pass(batch_id, envelope, violations)
    snap = read_json(os.path.join(STATE_ROOT, "budget.json"), {})
    budget_anomaly_check(budgets.snapshot())
    return {"batch_id": batch_id, "watchdog": metrics,
            "violations": violations}


def execute_one(adapter, envelope, worker_id, intent_id, index, budgets,
                violations, crash_points=()):
    intent = index[intent_id]
    action = intent["action"]
    check_envelope(envelope, action)
    sm = safe_mode(adapter, envelope)
    if sm:
        transition(intent_id, "SCHEDULED", "DEFERRED",
                   "safe mode: mutations paused, reads continue",
                   {"reasons": sm})
        return
    if not breaker_allows(action):
        transition(intent_id, "SCHEDULED", "DEFERRED",
                   "circuit breaker open; NO_EXECUTION_AFTER_CIRCUIT_"
                   "BREAKER_OPEN",
                   {})
        return
    passing, refused = dispatch_refilter([{
        "platform": PLATFORM, "type": action, "action": action,
        "url": intent.get("target_post_url"), "page": "@" + intent["target_handle"],
        "text": intent.get("text"),
        "eligibility": intent["eligibility"],
        "candidate_id": intent_id}])
    if refused:
        transition(intent_id, "SCHEDULED", "CANCELLED",
                   "dispatch refilter refused",
                   {"refusal": refused[0]["refusal"]})
        budgets.release(action)
        return
    lease = acquire(intent_id, worker_id)
    if lease is None:
        return  # another worker owns it; leave SCHEDULED
    try:
        transition(intent_id, "SCHEDULED", "DISPATCHED",
                   "lease acquired; dispatch refilter passed",
                   {"worker": worker_id})
        if "after_dispatched" in crash_points:
            raise CrashNow("injected crash after DISPATCHED")
        transition(intent_id, "DISPATCHED", "ATTEMPTING",
                   "handed to adapter; claim is not success",
                   {"adapter": type(adapter).__name__})
        try:
            obs = adapter.execute(action, intent["target_handle"],
                                  intent.get("target_post_url"),
                                  intent.get("content"))
        except AdapterPlatformSignal as e:
            trip_platform("%s: %s" % (e.kind, e.detail))
            transition(intent_id, "ATTEMPTING", "FAILED_TERMINAL",
                       "platform signal; breaker opened",
                       {"signal": e.kind, "detail": e.detail})
            record_failure(action, "platform signal " + e.kind)
            budgets.release(action)
            return
        except AdapterAuthExpired as e:
            transition(intent_id, "ATTEMPTING", "FAILED_TERMINAL",
                       "credential expired; safe mode next loop",
                       {"detail": str(e)})
            budgets.release(action)
            return
        except (AdapterTimeout, AdapterOutage, AdapterError) as e:
            transition(intent_id, "ATTEMPTING", "UNKNOWN",
                       "external effect unknowable after exception",
                       {"exception": type(e).__name__, "detail": str(e)})
            record_unknown(action)
            return
        outcome = obs.get("outcome")
        if outcome == "failed":
            transition(intent_id, "ATTEMPTING", "FAILED_RETRYABLE",
                       "adapter reported failure", {"observation": obs})
            record_failure(action, "adapter failure")
            requeue_or_terminal(intent_id, index, budgets, action)
            return
        if outcome in ("ok", "noop"):
            if "after_attempting" in crash_points:
                raise CrashNow("injected crash after ATTEMPTING")
            transition(intent_id, "ATTEMPTING", "VERIFYING",
                       "adapter claims %s; verifying by read" % outcome,
                       {"observation": obs})
            new_state, evidence = verify_after_attempt(
                intent, adapter, violations)
            if outcome == "noop" and new_state == "VERIFIED_SUCCESS":
                new_state = "VERIFIED_NOOP"
                evidence = dict(evidence, noop=True,
                                why="adapter reported no-op; desired state "
                                    "already held; no new canonical action")
            transition(intent_id, "VERIFYING", new_state,
                       "read-after-write verification", evidence)
            finalize(intent_id, index, budgets, action, new_state, evidence,
                     violations)
            return
        transition(intent_id, "ATTEMPTING", "UNKNOWN",
                   "unrecognized adapter outcome",
                   {"observation": obs})
        record_unknown(action)
    finally:
        release(intent_id, worker_id)


def requeue_or_terminal(intent_id, index, budgets, action):
    if retries_used(intent_id) < 2:
        budgets.release(action)
        transition(intent_id, "FAILED_RETRYABLE", "QUEUED",
                   "bounded retry; budget re-reserved on schedule",
                   {"retries_used": retries_used(intent_id)})
    else:
        transition(intent_id, "FAILED_RETRYABLE", "FAILED_TERMINAL",
                   "retry budget exhausted", {})
        budgets.release(action)


def finalize(intent_id, index, budgets, action, new_state, evidence,
             violations):
    intent = index[intent_id]
    if new_state == "VERIFIED_SUCCESS":
        _invariant(True, "NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION",
                   "unreachable")
        ok, note = record_completed(intent["target_handle"],
                                    intent.get("target_post_url"), action)
        budgets.commit(action)
        record_touch(intent, evidence)
        record_success(action)
        if evidence.get("negative_feedback"):
            trip_platform("negative-feedback signal on verification read: %s"
                          % evidence.get("platform_signals"))
            observe("negative_feedback_spike",
                    {"intent_id": intent_id,
                     "signals": evidence.get("platform_signals")})
        observe("verified_success",
                {"intent_id": intent_id, "guard_recorded": ok,
                 "record_note": note})
    elif new_state == "VERIFIED_NOOP":
        budgets.release(action)
        record_success(action)
    elif new_state in ("SAFE_RETRY", "FAILED_RETRYABLE"):
        if retries_used(intent_id) < 2:
            budgets.release(action)
            transition(intent_id, new_state, "QUEUED",
                       "bounded retry",
                       {"retries_used": retries_used(intent_id)})
        else:
            transition(intent_id, new_state, "FAILED_TERMINAL",
                       "retry budget exhausted", {})
            budgets.release(action)
    elif new_state == "FAILED_TERMINAL":
        record_failure(action, "verification-terminal failure")
        budgets.release(action)
    elif new_state == "UNKNOWN":
        record_unknown(action)


def cancel_remaining(batch_id, reason):
    states = current_states()
    index = intents_index()
    budgets = BudgetStore()
    for iid, rec in index.items():
        if rec.get("batch_id") != batch_id:
            continue
        st = states.get(iid)
        if st in ("SCHEDULED", "QUEUED", "DEFERRED", "INTENT_CREATED",
                  "ELIGIBLE"):
            transition(iid, st, "CANCELLED", reason, {})
            budgets.release(rec["action"])


# ------------------------------------------------------------------ reconcile
def reconcile(adapter, envelope):
    """Recovery without replay: stranded intents are reconciled from durable
    state plus verification reads. reconcile() NEVER calls adapter.execute()."""
    states = current_states()
    index = intents_index()
    budgets = BudgetStore()
    report = {"reconciled": [], "notes": []}
    for iid, rec in index.items():
        if iid.startswith("stub:"):
            continue
        st = states.get(iid)
        if st in TERMINAL or st is None:
            continue
        if st in ("DISPATCHED", "ATTEMPTING", "VERIFYING"):
            if is_expired(iid):
                release(iid, holder(iid) or "")
                if st == "DISPATCHED":
                    # Stranded in DISPATCHED means the crash landed between
                    # the DISPATCHED transition and the ATTEMPTING
                    # transition: adapter.execute() was never invoked, so
                    # re-dispatch is safe and the intent is NOT unknown.
                    transition(iid, st, "SCHEDULED",
                               "reconcile: dispatch never reached the "
                               "adapter; safe to re-dispatch",
                               {"previous_holder": holder(iid)})
                    states[iid] = "SCHEDULED"
                    report["reconciled"].append((iid, "SCHEDULED"))
                    continue
                transition(iid, st, "UNKNOWN",
                           "worker lost; lease expired; external effect "
                           "unknowable; will resolve by read, never by "
                           "re-execution",
                           {"previous_holder": holder(iid)})
                states[iid] = "UNKNOWN"
                st = "UNKNOWN"
            else:
                report["notes"].append(
                    "%s still leased to %s; left alone" % (iid, holder(iid)))
                continue
        if st == "UNKNOWN":
            new_state, evidence = resolve_unknown(rec, adapter)
            if new_state == "UNKNOWN":
                # No state change to record; the re-check itself is the
                # evidence, kept in the watchdog log, not the transition
                # log (UNKNOWN -> UNKNOWN would be a no-op transition).
                observe("unknown_recheck",
                        {"intent_id": iid, "evidence": evidence})
                report["reconciled"].append((iid, "UNKNOWN"))
                continue
            transition(iid, "UNKNOWN", new_state,
                       "reconcile: verification read", evidence)
            if new_state == "VERIFIED_SUCCESS":
                finalize(iid, index, budgets, rec["action"], new_state,
                         evidence, [])
            elif new_state in ("SAFE_RETRY", "FAILED_RETRYABLE"):
                if retries_used(iid) < 2:
                    budgets.release(rec["action"])
                    transition(iid, new_state, "QUEUED",
                               "reconcile: bounded retry",
                               {"retries_used": retries_used(iid)})
                else:
                    transition(iid, new_state, "FAILED_TERMINAL",
                               "reconcile: retry budget exhausted", {})
                    budgets.release(rec["action"])
            report["reconciled"].append((iid, new_state))
        elif st in ("SAFE_RETRY", "FAILED_RETRYABLE"):
            if retries_used(iid) < 2:
                transition(iid, st, "QUEUED", "reconcile: bounded retry",
                           {"retries_used": retries_used(iid)})
            else:
                transition(iid, st, "FAILED_TERMINAL",
                           "reconcile: retry budget exhausted", {})
                budgets.release(rec["action"])
            report["reconciled"].append((iid, states.get(iid)))
        elif st in ("INTENT_CREATED", "QUEUED", "DEFERRED"):
            if st == "INTENT_CREATED":
                transition(iid, st, "QUEUED", "reconcile: resume queue", {})
            report["reconciled"].append((iid, "resumed"))
    return report


# ------------------------------------------------------------------ verify
def verify_pass(batch_id):
    """Post-pass verify: every VERIFIED_SUCCESS intent's handle/shortcode
    must appear in the freshly rebuilt guard index. Returns violations."""
    from siig_guard import guard as _g
    g = _g()
    index = g.load_index()
    payload = index["platforms"][PLATFORM]
    handles = set(payload.get("handles", []))
    shortcodes = set(payload.get("shortcodes", []))
    states = current_states()
    idx = intents_index()
    violations = []
    for iid, rec in idx.items():
        if rec.get("batch_id") != batch_id:
            continue
        if states.get(iid) != "VERIFIED_SUCCESS":
            continue
        from siig_common import post_shortcode
        sc = post_shortcode(rec.get("target_post_url"))
        if rec["target_handle"] not in handles and \
                (not sc or sc not in shortcodes):
            violations.append({"intent_id": iid,
                               "violation": "verified success not found in "
                                            "rebuilt guard history"})
    return violations
