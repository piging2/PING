#!/usr/bin/env python3
"""Machine-enforced autonomy invariants for the X social-interdependence loop.

These runtime assertions are the machine replacement for per-action human
approval on the ordinary path. A violation raises InvariantViolation and the
orchestrator must fail closed: no dispatch, no mutation, machine-readable
reason recorded. Invariants are evaluated by code on every transition; they
are not policy prose.

Invariant index:
  NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT
  PLATFORM_NOT_AUTHORIZED / ACTION_NOT_AUTHORIZED / CAPABILITY_MISSING
  NO_DUPLICATE_ACTIVE_INTENT
  OUTCOME_OK_BOOLEAN_REQUIRED
  NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION
  NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION
  NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN
  NO_LEARNER_POLICY_SELF_MODIFICATION / LEARNER_PARAM_OUT_OF_ENVELOPE /
    NO_LEARNER_CEILING_RAISE
  NO_ADAPTER_DECISION_AUTHORITY
  AUTHORITY_DENIED (holds / AUTHORITY.json gate)
  ILLEGAL_TRANSITION
  NO_EVIDENCE_REWRITE (journal is append-only; replay never mutates)
"""

TERMINAL_STATES = (
    "VERIFIED_SUCCESS",
    "VERIFIED_NOOP",
    "FAILED_TERMINAL",
    "CANCELLED",
)

# Guard/ledger terminal that leaves a candidate eligible for re-dispatch:
# provably never acted, so there is no external mutation to reconcile.
REDISPATCHABLE_TERMINALS = ("NOT_ATTEMPTED",)

UNKNOWNISH_STATES = ("ATTEMPTING", "UNKNOWN", "DISPATCHED", "VERIFYING")


class InvariantViolation(Exception):
    """A machine-enforced invariant fired. The orchestrator treats this as
    fail-closed: stop the current dispatch, record the reason, never retry
    the mutation blindly."""


def _v(name, detail):
    raise InvariantViolation("%s: %s" % (name, detail))


def assert_authorized_account(intent, envelope):
    acct = intent.get("authorized_account")
    allowed = envelope.get("authorized_accounts") or []
    if acct not in allowed:
        _v("NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
           "intent account %r not in envelope.authorized_accounts %r"
           % (acct, allowed))


def assert_platform_action_allowed(intent, envelope):
    platform = intent.get("platform")
    action = intent.get("action")
    if platform not in (envelope.get("allowed_platforms") or []):
        _v("PLATFORM_NOT_AUTHORIZED",
           "platform %r not in allowed_platforms" % (platform,))
    if action not in (envelope.get("allowed_action_types") or []):
        _v("ACTION_NOT_AUTHORIZED",
           "action %r not in allowed_action_types" % (action,))
    caps = envelope.get("allowed_capabilities") or {}
    need = {"like": "x.like", "follow": "x.follow",
            "comment": "x.comment"}.get(action)
    if need and need not in (caps.get("x") or []):
        _v("CAPABILITY_MISSING",
           "capability %r not granted in envelope.allowed_capabilities" % need)


def assert_no_duplicate_active(intent_id, identity_key, derived_state):
    """One active intent per identity key (x:<action>:<target_ref>).
    Terminal states close the identity; NOT_ATTEMPTED leaves it eligible
    for re-dispatch because nothing was ever executed."""
    for iid, rec in derived_state.items():
        if iid == intent_id:
            continue
        if rec.get("identity_key") != identity_key:
            continue
        state = rec.get("state")
        terminal = rec.get("terminal")
        if state in TERMINAL_STATES:
            continue
        if terminal in REDISPATCHABLE_TERMINALS:
            continue
        _v("NO_DUPLICATE_ACTIVE_INTENT",
           "identity %r already active as %s (state=%s terminal=%s)"
           % (identity_key, iid, state, terminal))


def assert_ok_boolean_present(outcome):
    """Binding 2026-09-29 X outcomes lesson: the intent ledger derives
    terminal as EXECUTED if o.get("ok") else FAILED. An outcome entry with
    no explicit boolean ok records FAILED for genuinely executed actions.
    Every outcome receipt must therefore carry an explicit boolean ok."""
    if "ok" not in outcome or not isinstance(outcome["ok"], bool):
        _v("OUTCOME_OK_BOOLEAN_REQUIRED",
           "outcome receipt for %r lacks explicit boolean 'ok' (got %r)"
           % (outcome.get("intent_id"), outcome.get("ok", "<missing>")))


def assert_no_canonical_success_without_verification(outcome):
    assert_ok_boolean_present(outcome)
    if outcome.get("canonical_success"):
        if outcome.get("ok") is not True:
            _v("NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION",
               "canonical_success claimed with ok=%r for %r"
               % (outcome.get("ok"), outcome.get("intent_id")))
        ver = outcome.get("verification") or {}
        if not ver.get("method") or not ver.get("observed_at"):
            _v("NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION",
               "canonical_success claimed without read-after-write "
               "verification evidence for %r" % (outcome.get("intent_id"),))


def assert_no_blind_retry(from_state, verification_done):
    """After an UNKNOWN external mutation the system may never re-attempt
    the mutation without first reading external state. Recovery is
    reconcile (read), never replay (re-execute)."""
    if from_state in UNKNOWNISH_STATES and not verification_done:
        _v("NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION",
           "transition from %s requires a verification read first"
           % from_state)


def assert_circuit_allows(scope, allowed, reason):
    if not allowed:
        _v("NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN",
           "scope %s: %s" % (scope, reason))


def assert_learner_within_envelope(proposal, envelope):
    tunables = envelope.get("learner_tunables") or {}
    params = proposal.get("params") or {}
    for key, value in params.items():
        spec = tunables.get(key)
        if spec is None:
            _v("NO_LEARNER_POLICY_SELF_MODIFICATION",
               "param %r is not a declared learner tunable; the learner "
               "may not invent or modify policy surface" % key)
        lo, hi = spec.get("min"), spec.get("max")
        if not (lo <= value <= hi):
            _v("LEARNER_PARAM_OUT_OF_ENVELOPE",
               "param %r=%r outside constitutional bounds [%r, %r]"
               % (key, value, lo, hi))
    if proposal.get("raises_ceiling"):
        _v("NO_LEARNER_CEILING_RAISE",
           "the learner may not raise its own budget ceiling")
    for key in ("authorized_accounts", "allowed_platforms",
                "allowed_action_types", "allowed_capabilities",
                "execution_budget", "prohibited_targets"):
        if key in params:
            _v("NO_LEARNER_POLICY_SELF_MODIFICATION",
               "param %r is constitutional authority, not a tunable" % key)


def assert_adapter_has_no_decision_authority(adapter_output):
    forbidden = ("chosen_target", "target_selection", "budget_override",
                 "policy_decision", "envelope_change")
    for key in forbidden:
        if key in (adapter_output or {}):
            _v("NO_ADAPTER_DECISION_AUTHORITY",
               "adapter returned decision-authority field %r; adapters are "
               "dumb executors of authorized intents" % key)


def assert_authority_clear(verdict):
    if verdict != "AUTHORIZED":
        _v("AUTHORITY_DENIED",
           "authority gate verdict %r; holds.json / AUTHORITY.json deny "
           "this surface" % (verdict,))


def assert_legal_transition(from_state, to_state, legal_map):
    allowed = legal_map.get(from_state, ())
    if to_state not in allowed:
        _v("ILLEGAL_TRANSITION",
           "%s -> %s is not a legal transition" % (from_state, to_state))
