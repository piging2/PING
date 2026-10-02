#!/usr/bin/env python3
"""Policy layer: the machine machinery that replaces per-action human approval.

Replaces-the-human stack (Threads):
  constitutional invariants (runtime assertions, below)
  + PolicyAuthority (the REAL engagement-guard.py eligibility_check)
  + CapabilityAuthority (action-capability.json data, never forked)
  + IdentityAuthority (authorized account check; handle normalization)
  + stable intent identity + idempotency (si_state)
  + budgets + leases (si_state)
  + verification (si_verify)
  + evidence + replay (si_state transition chain)
  + circuit breakers (si_state + si_watchdog)
  + watchdogs (si_watchdog)
  + bounded self-improvement (learner bounds inside the envelope)
  + automatic rollback (si_watchdog)

No new PolicyAuthority, CapabilityAuthority, IdentityAuthority, Event
Authority, scheduler, or worker authority is created here. All are consumed.
"""
import importlib.util
import json
import os
import re

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUARD_PY = "/home/hatch/workspace/outreach/engagement-guard.py"
OUTREACH_DIR = "/home/hatch/workspace/outreach"
ENVELOPE_PATH = os.path.join(SKILL_DIR, "AUTONOMY_ENVELOPE.md")
THREADS_POST_RE = re.compile(
    r"https?://(?:www\.)?threads\.(?:com|net)/@([A-Za-z0-9_.]{1,40})"
    r"/post/([A-Za-z0-9_-]+)/?")


# ------------------------------------------------------------- invariants
class InvariantViolation(Exception):
    pass


def invariant(cond, code, detail=""):
    if not cond:
        raise InvariantViolation("%s: %s" % (code, detail))


def check_no_action_without_authorized_account(envelope, account):
    invariant(account in envelope["authorized_accounts"],
              "NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
              "account %r not in %r" % (account,
                                        envelope["authorized_accounts"]))


def check_no_duplicate_active_intent(intent_id, existing):
    cur = existing.get(intent_id)
    active = cur is not None and cur.get("state") not in (
        "REJECTED", "VERIFIED_SUCCESS", "VERIFIED_NOOP",
        "FAILED_TERMINAL", "CANCELLED")
    invariant(not active, "NO_DUPLICATE_ACTIVE_INTENT",
              "intent %s already active in state %s"
              % (intent_id, cur.get("state") if cur else None))


def check_no_canonical_success_without_verification(outcome, verification):
    if outcome == "VERIFIED_SUCCESS":
        invariant(verification and verification.get("observed_state"),
                  "NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION",
                  "success declared without a read-back observation")


def check_no_blind_retry_after_unknown_external_mutation(intent):
    if intent.get("state") == "UNKNOWN" and \
            intent.get("external_effect") == "unknown":
        raise InvariantViolation(
            "NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION: intent %s "
            "must be reconciled by reading external state before any "
            "re-dispatch" % intent["intent_id"])


def check_no_learner_policy_self_modification(envelope, proposed):
    ceilings = ("platform_budget", "action_windows", "relationship_budget",
                "maximum_failure_rate", "maximum_unknown_rate")
    for k in ceilings:
        if k in proposed:
            raise InvariantViolation(
                "NO_LEARNER_POLICY_SELF_MODIFICATION: learner may not "
                "touch %s" % k)
    bounds = envelope["learner_bounds"]
    for k, (lo, hi) in bounds.items():
        if k not in proposed:
            continue
        p = proposed[k]
        if isinstance(p, (list, tuple)) and len(p) == 2:
            ok = lo <= p[0] and p[1] <= hi
        else:
            ok = lo <= p <= hi
        if not ok:
            raise InvariantViolation(
                "NO_LEARNER_POLICY_SELF_MODIFICATION: %s=%r outside [%r,%r]"
                % (k, p, lo, hi))


def check_no_adapter_decision_authority(dispatch_record):
    invariant("policy_verdict" not in dispatch_record.get("adapter_claims", {}),
              "NO_ADAPTER_DECISION_AUTHORITY",
              "adapter must not originate policy verdicts")


def check_no_execution_after_circuit_breaker_open(breakers, scope):
    for s in (scope, "platform:threads", "tenant"):
        st = breakers.get(s, {})
        if st.get("open"):
            raise InvariantViolation(
                "NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN: %s open (%s)"
                % (s, st.get("reason", "")))


def check_tab_hygiene(worker_session):
    invariant(worker_session.get("worker_window_opened", False),
              "TAB_HYGIENE",
              "worker must open its own window, never tabs in the user window")
    invariant(worker_session.get("worker_window_closed", False),
              "TAB_HYGIENE",
              "worker must close its own window after the pass")


# ----------------------------------------------------------------- envelope
def default_envelope():
    """The machine-readable autonomy envelope for Threads. Budgets mirror the
    currently authorized ceilings (45 likes + 12 comments per 2h pass; weekly
    ramp +5/+3). Only an owner order or a tripwire platform flag changes
    ceilings; the learner may tune only inside learner_bounds."""
    now = __import__("datetime").datetime.now(
        __import__("datetime").timezone.utc).isoformat()
    return {
        "envelope_id": "threads-autonomy/v1",
        "version": "1",
        "tenant": "nolan-ping-social",
        "actor": "si-threads-worker",
        "authorized_accounts": ["@nolanpigi"],
        "allowed_platforms": ["threads"],
        "allowed_capabilities": ["threads.like", "threads.comment"],
        "allowed_action_types": ["like", "comment"],
        "prohibited_targets": [],
        "namespace_scope": "threads:@nolanpigi:engagement",
        "execution_budget": {"weekly_ramp": {"like_step": 5,
                                             "comment_step": 3}},
        "concurrency_budget": {"max_concurrent_passes": 1},
        "relationship_budget": {"max_touches_per_handle_24h": 2,
                                "max_touches_per_handle_7d": 5},
        "platform_budget": {"threads_like_per_window": 45,
                            "threads_comment_per_window": 12,
                            "window_sec": 7200},
        "action_windows": {
            "like": {"per_pass_cap": 45, "window_sec": 7200, "burst_cap": 5},
            "comment": {"per_pass_cap": 12, "window_sec": 7200,
                        "burst_cap": 3}},
        "temporal_constraints": {"cadence_sec": 7200,
                                 "inter_action_delay_sec": [60, 120]},
        "confidence_requirements": {"min_identity_confidence": "medium"},
        "verification_requirements": {"read_after_write": True,
                                      "verification_timeout_sec": 120},
        "retry_policy": {"max_attempts": 2,
                         "retry_on": ["FAILED_RETRYABLE", "SAFE_RETRY"],
                         "retry_on_never": ["UNKNOWN", "BLOCKED",
                                            "VERIFIED_NOOP"]},
        "maximum_failure_rate": 0.20,
        "maximum_unknown_rate": 0.10,
        "circuit_breaker_policy": {
            "failure_threshold": 5,
            "unknown_rate_ceiling": 0.10,
            "verification_failure_threshold": 3,
            "cooldown_sec": 3600,
            "half_open_canary": 1},
        "learner_bounds": {"inter_action_delay_sec": [60, 180],
                           "retry_backoff_sec": [300, 3600]},
        "issued_at": now,
        "revoked": False,
    }


# ------------------------------------------------------------ guard binding
_guard_module = None


def load_guard():
    global _guard_module
    if _guard_module is None:
        spec = importlib.util.spec_from_file_location(
            "engagement_guard", GUARD_PY)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _guard_module = mod
    return _guard_module


def evaluate_candidate(candidate, batch_seen=None):
    """Call the REAL deterministic eligibility authority. No local copy of
    the rules: the guard module, its data files, and the durable history are
    the authority. Returns the guard's verdict dict verbatim."""
    guard = load_guard()
    index = guard.load_index()
    data = guard.load_eligibility_data()
    return guard.eligibility_check(index, candidate, data=data,
                                  batch_seen=batch_seen)


def check_hold(platform="threads"):
    """Machine-readable holds are the ONLY freeze mechanism (step 0,
    fail-closed). Prose never freezes."""
    path = os.path.join(OUTREACH_DIR, "holds.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            holds = json.load(f).get("holds", {})
    except (OSError, ValueError):
        return True, "holds.json unreadable: fail closed"
    h = holds.get(platform, {})
    if h.get("held"):
        return True, "hold active: %s" % h.get("reason", "")
    return False, ""


def normalize_threads_candidate(raw):
    """DISCOVERED -> NORMALIZED. Extracts the canonical target_ref
    (post:<shortcode>) from the Threads URL shape the guard enforces."""
    url = raw.get("url", "")
    m = THREADS_POST_RE.search(url)
    if not m:
        raise InvariantViolation(
            "NORMALIZE: url %r does not match the Threads post shape" % url)
    handle, code = m.group(1), m.group(2)
    return {
        "platform": "threads",
        "type": raw.get("type", "like"),
        "url": url,
        "page": "@" + handle,
        "text": raw.get("text", ""),
        "target_ref": "post:" + code,
        "target_handle": "@" + handle,
        "candidate_id": "threads:%s:%s" % (raw.get("type", "like"), code),
    }


# ---------------------------------------------------------------- safe mode
def safe_mode_probe():
    """Returns (safe_mode_active, reasons). When identity, policy,
    capability, event-persistence, or verification is unavailable, reads may
    continue but NEW MUTATIONS STOP, with no human needed to decide."""
    reasons = []
    if not os.path.isfile(GUARD_PY):
        reasons.append("policy authority unreachable (guard file missing)")
    try:
        data = load_guard().load_eligibility_data()
        caps = data["action-capability.json"]["platforms"].get("threads", {})
        if not caps.get("like") or not caps.get("comment"):
            reasons.append("capability authority denies threads actions")
    except Exception as e:  # fail closed on unreadable capability data
        reasons.append("capability data unreadable: %s" % e)
    held, why = check_hold("threads")
    if held:
        reasons.append(why)
    return (len(reasons) > 0), reasons
