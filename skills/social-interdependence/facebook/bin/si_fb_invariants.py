#!/usr/bin/env python3
"""Machine-enforced invariants for the Facebook autonomous engagement slice.

Each invariant is a runtime assertion with a stable code. A violated
invariant raises InvariantViolation, which the orchestrator converts into a
fail-closed transition (no external effect). Invariants are the machinery
that replaces per-action human approval: they are checked by code on every
pass, not by prose in a task brief.

Invariant catalog (codes are stable; referenced by tests, watchdog, evals):

  NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT
      The acting Facebook account must appear in the autonomy envelope's
      authorized_accounts and the authority gate (authority-check.py) must
      have returned AUTHORITY-ALLOW for surface=facebook in this run.

  NO_DUPLICATE_ACTIVE_INTENT
      intent_id is deterministic (facebook:<action>:<target_ref>:<batch_id>);
      creating an intent whose id already has a non-terminal state is
      refused. Two workers cannot both own one intent (lease check).

  NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION
      An intent may only reach VERIFIED_SUCCESS after a read-after-write
      verification read performed by the orchestrator against external
      state. The adapter's own claim is never sufficient.

  NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION
      An intent in UNKNOWN may re-enter execution only after a read-back
      proves no external effect (SAFE_RETRY), or a reconcile proves
      non-execution (NOT_ATTEMPTED). Re-execution while uncertain is
      refused even if the mutation is idempotent.

  NO_LEARNER_POLICY_SELF_MODIFICATION
      Learned parameters live inside constitutionally fixed [min,max]
      bounds carried in the envelope. A learner proposal outside bounds, or
      touching a bound, is rejected. The learner cannot raise its ceiling.

  NO_ADAPTER_DECISION_AUTHORITY
      The adapter receives an authorized intent and returns raw execution
      evidence. It never chooses targets, never sets policy or budgets,
      and never declares canonical success. Any adapter record claiming
      canonical outcome is rejected as evidence (and counted as a
      verification failure).

  NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN
      Any mutation attempt while the relevant breaker (action, account,
      adapter, platform, tenant scope) is open is refused before the
      adapter is touched.

  NO_PROSE_AUTHORIZES_OR_FREEZES
      Authorization comes only from the machine-readable authority chain
      (authority-check.py exit 0 + envelope). Freezes come only from
      holds.json via set-hold.py. Prose in logs or docs is documentation
      only and is never consulted for allow/deny.

  NO_DISPATCH_WITHOUT_ENVELOPE
      A dispatch-time action must carry a tamper-evident eligibility
      envelope (evidence_hash over the canonical body, 6h TTL). Missing or
      stale envelopes are refused by evidence-check semantics.

  NO_DISPATCH_TRUSTS_ENVELOPE_ALONE
      The dispatch gate re-evaluates the full eligibility reason set live
      (engagement-guard eligibility_check); the envelope is evidence, not
      the decision.

  NO_MUTATION_WHEN_SAFE_MODE
      When identity, policy, capability, event persistence, or verification
      is unavailable, reads may continue but new mutations stop.
      Safe mode needs no human to decide; it is the default on infra
      unavailability.

  ILLEGAL_STATE_TRANSITION
      Every state transition an intent may take is listed in
      ALLOWED_TRANSITIONS. transition() checks the table; anything not
      listed raises. The state machine is data, not prose.
"""
import re

INTENT_ID_RE = re.compile(
    r"^facebook:(like|comment):post:(?:\d+|pfbid[A-Za-z0-9]+):[A-Za-z0-9_.-]+$")


class InvariantViolation(Exception):
    def __init__(self, code, detail):
        super().__init__("%s: %s" % (code, detail))
        self.code = code
        self.detail = detail


def check(code, condition, detail=""):
    if not condition:
        raise InvariantViolation(code, detail or "condition false")
    return True


def valid_intent_id(intent_id):
    return bool(INTENT_ID_RE.match(intent_id or ""))


def assert_intent_id(intent_id):
    check("NO_DUPLICATE_ACTIVE_INTENT", valid_intent_id(intent_id),
          "malformed intent_id %r (must be "
          "facebook:<action>:post:<id>:<batch_id>)" % intent_id)


def assert_authorized_account(account, envelope, authority_verdict):
    check("NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
          account in (envelope.get("authorized_accounts") or []),
          "account %r not in envelope authorized_accounts" % account)
    check("NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
          authority_verdict == "AUTHORITY-ALLOW",
          "authority gate verdict was %r, not AUTHORITY-ALLOW"
          % authority_verdict)


def assert_no_duplicate_active(intent_id, fold):
    st = fold.get(intent_id)
    if st is not None:
        state = st["state"]
        terminal = state in TERMINAL_STATES
        check("NO_DUPLICATE_ACTIVE_INTENT", terminal,
              "intent %s already active in state %s" % (intent_id, state))


def assert_verified_success(verification_record):
    ok = isinstance(verification_record, dict) and \
        verification_record.get("method") == "read_after_write" and \
        verification_record.get("observed_effect") is True and \
        verification_record.get("observer") == "orchestrator"
    check("NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION", ok,
          "canonical success requires orchestrator read-after-write "
          "verification, got %r" % (verification_record,))


def assert_breaker_closed(scope, breakers):
    b = (breakers or {}).get(scope)
    is_open = bool(b and b.get("open"))
    check("NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN", not is_open,
          "circuit breaker open for scope %s (opened %s, reason %s)"
          % (scope, (b or {}).get("opened_at"), (b or {}).get("reason")))


def assert_safe_to_mutate(health):
    """Safe mode: identity/policy/capability/event-persistence/verification
    must all be available before any new mutation."""
    for dep in ("identity", "policy", "capability", "event_persistence",
                "verification"):
        check("NO_MUTATION_WHEN_SAFE_MODE",
              (health or {}).get(dep) is True,
              "dependency %s unavailable; safe mode: reads continue, "
              "new mutations stop" % dep)


def assert_learner_within_bounds(proposal, envelope):
    bounds = ((envelope.get("learner") or {}).get("bounds") or {})
    for param, value in (proposal or {}).items():
        b = bounds.get(param)
        check("NO_LEARNER_POLICY_SELF_MODIFICATION", b is not None,
              "learner proposed untracked param %r (no constitutional "
              "bound)" % param)
        lo, hi = b
        check("NO_LEARNER_POLICY_SELF_MODIFICATION",
              lo <= value <= hi,
              "learner proposed %s=%r outside constitutional "
              "[%r, %r]" % (param, value, lo, hi))


def assert_adapter_evidence_shape(record):
    """The adapter may report raw execution evidence only. A record that
    declares a canonical outcome is rejected."""
    forbidden = {"canonical", "terminal", "decision", "VERIFIED_SUCCESS",
                 "EXECUTED"}
    keys = set((record or {}).keys())
    check("NO_ADAPTER_DECISION_AUTHORITY",
          not (keys & forbidden),
          "adapter record claims decision authority: %s"
          % sorted(keys & forbidden))


TERMINAL_STATES = frozenset({
    "VERIFIED_SUCCESS", "VERIFIED_NOOP", "FAILED_TERMINAL", "CANCELLED",
})

NONTERMINAL_STATES = frozenset({
    "INTENT_CREATED", "QUEUED", "SCHEDULED", "DISPATCHED", "ATTEMPTING",
    "UNKNOWN", "VERIFYING", "SAFE_RETRY", "DEFERRED", "FAILED_RETRYABLE",
})

# Decision-record stages (pre-intent): discovery -> normalization ->
# evaluation -> ELIGIBLE|REJECTED. These are recorded on decision records,
# never as intent states; intents begin at INTENT_CREATED. ELIGIBLE appears
# as a transition from_state only, marking the decision-to-intent boundary.
DECISION_STAGES = frozenset({
    "DISCOVERED", "NORMALIZED", "EVALUATED", "ELIGIBLE", "REJECTED",
})

# Every state transition the machinery may ever write. transition() in the
# orchestrator checks this table; anything not listed raises
# InvariantViolation. The table is the machine-enforced state machine.
ALLOWED_TRANSITIONS = {
    "ELIGIBLE": {"INTENT_CREATED"},
    "INTENT_CREATED": {"QUEUED"},
    "QUEUED": {"QUEUED", "SCHEDULED", "DEFERRED"},
    "SCHEDULED": {"QUEUED", "DISPATCHED"},
    "DISPATCHED": {"ATTEMPTING", "UNKNOWN"},
    "ATTEMPTING": {"VERIFYING", "UNKNOWN", "FAILED_RETRYABLE"},
    "VERIFYING": {"VERIFIED_SUCCESS", "VERIFIED_NOOP", "FAILED_RETRYABLE",
                  "FAILED_TERMINAL"},
    "UNKNOWN": {"UNKNOWN", "VERIFIED_SUCCESS", "VERIFIED_NOOP", "SAFE_RETRY",
                "FAILED_TERMINAL"},
    "DEFERRED": {"QUEUED"},
    "FAILED_RETRYABLE": {"QUEUED"},
    # Closed states: no transition out. SAFE_RETRY closes this intent;
    # a retry is a FRESH intent (new batch lineage), never this one.
    "SAFE_RETRY": frozenset(),
    "VERIFIED_SUCCESS": frozenset(),
    "VERIFIED_NOOP": frozenset(),
    "FAILED_TERMINAL": frozenset(),
    "CANCELLED": frozenset(),
}


def check_state_transition(intent_id, from_state, to_state):
    allowed = ALLOWED_TRANSITIONS.get(from_state, frozenset())
    check("ILLEGAL_STATE_TRANSITION", to_state in allowed,
          "intent %s: %s -> %s is not a legal transition"
          % (intent_id, from_state, to_state))


# States in which an intent no longer blocks a fresh intent for the same
# target. Terminal states are done; SAFE_RETRY is proven-no-effect, so the
# scheduler may start a fresh batch for the target. Every other state
# means the target is in flight.
DUPLICATION_CLOSED_STATES = TERMINAL_STATES | {"SAFE_RETRY"}


def target_in_flight(fold, target_ref, exclude_intent_id=None):
    """Return the intent_id already in flight for target_ref, or None."""
    for iid, stt in (fold or {}).items():
        if iid == exclude_intent_id:
            continue
        rec = stt.get("record") or {}
        if rec.get("target_ref") == target_ref \
                and stt.get("state") not in DUPLICATION_CLOSED_STATES:
            return iid
    return None
