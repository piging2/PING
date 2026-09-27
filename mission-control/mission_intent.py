#!/usr/bin/env python3
"""MissionIntent front door: the narrow dispatch contract.

MissionIntent -> validate -> authorize -> dispatch -> observe.

This module projects authority; it does not become authority. Every grant
or deny verdict comes from the EXISTING capability/authority path (the
orca-adapter ExternalAgentAdapter's authorizeWorkOrder / issueWorkOrder,
reached here through the thin _adapter_shim.js transport). This module
makes no grant decision of its own: there is no MissionControlAuthority
here, by constitutional order (Batch 6 adjudication 2026-09-26).

Legacy callers become adapters to this contract (see frontdoor_adapters.py).
Once a caller is migrated and replay-tested, direct bypass becomes illegal
for THAT mission class; bypass is detectable via the adapter registry.

Canonical events ride the spine's existing emit path (mission-control/emit.py).
The front door extends the shared MC_* vocabulary additively, in the same
naming convention and through the same emit path (no second vocabulary):
MC_LANE_UNKNOWN (the unknown-outcome terminal, H5b), MC_REVOKED and
REVOKED_AFTER_DISPATCH (the revocation lifecycle, H7). The registration
lives in emit.py's MC_EVENT_TYPES on this branch; the spine's bytes are
otherwise untouched. See mission-control/SUPPORT-FILES.md for the merge
note: the additive anchor sequences with sibling lanes at merge time,
under Nolan's authority.

The spine's emit_event envelope has a fixed event_data shape for lane
events, so the front door packs its machine-readable record as canonical
JSON in the summary after a fixed marker:

    <human one-liner> ||FRONTDOOR|| {"idempotency_key": ..., ...}

_pack_summary / _unpack_summary own that encoding. The human prefix keeps
the journal readable; the JSON keeps it queryable for the idempotency
ledger and the bypass detector.

Idempotency: the journal is the idempotency ledger. A second submission
with the same idempotency_key returns the original dispatch record and
emits only a duplicate-suppressed checkpoint; it never issues a second
work order. Same key with different canonical intent bytes fails closed
(E2: same id + different bytes must not silently dedupe): the check
covers capability, actor, tenant, mission_class, event_bind, and inputs
(via inputs_hash), compared as one canonical digest, never inputs_hash
alone. A key whose acceptance record has no terminal event is
in-flight/UNKNOWN: the duplicate is held, never re-dispatched (O6).

Nothing in the packed record carries raw inputs or secrets: only the
inputs_hash, the mission metadata, and the work order identity. Sensitive
payloads stay out of the append-only journal (Batch 6: audit metadata vs
erasable payload).

Executor outcome honesty (H2a/H5b, mc/frontdoor-hardening): an executor
RETURNING {"status": "failed"} records MC_LANE_FAILED (the pre-hardening
code recorded MC_LANE_COMPLETED with the failure buried in the record).
An executor signaling {"status": "unknown"} -- or crashing after
work-order issuance, where the protocol cannot distinguish a pre-effect
crash from a post-effect crash -- records MC_LANE_UNKNOWN: never FAILED,
never COMPLETED. An executor that can positively attest it performed no
external effect before failing raises ExecutorNoEffect and keeps the
honest MC_LANE_FAILED. MC_LANE_UNKNOWN is terminal but never success:
find_intent_record() treats it as non-success (see SUCCESS_TERMINALS).

Revocation (H7, mc/frontdoor-hardening): revoke(idempotency_key, reason)
records MC_REVOKED when nothing dispatched under the key, or
REVOKED_AFTER_DISPATCH with a disposition-#7 classification
(already-committed / already-failed / in-flight-uncertain / unknown-hold)
when it did. submit() checks revocation before authorize and again
before dispatch: revoked keys refuse with zero dispatch. Revocation is
sticky: the first revocation wins and later submits refuse.
"""

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import emit as _emit  # spine lane's emit path (read-only import)

INTENT_VERSION = "mc-intent/1"
INTENT_LANE = "mission-intent"
SOURCE_ARTIFACT = "mission-control/mission_intent.py"

# Marker separating the human-readable summary prefix from the
# machine-readable packed record.
SUMMARY_MARKER = " ||FRONTDOOR|| "

REQUIRED_FIELDS = (
    "mission_class",
    "actor",
    "tenant",
    "capability",
    "inputs_hash",
    "idempotency_key",
)

_RE_MISSION_CLASS = re.compile(r"^[a-z0-9][a-z0-9_.:-]{0,63}$")
_RE_ACTOR = re.compile(r"^[a-z0-9][a-z0-9_.:-]{0,63}$")
_RE_TENANT = re.compile(r"^[a-z0-9_.-]{1,64}$")
_RE_CAPABILITY = re.compile(r"^[a-z][a-z0-9_.]{0,63}$")
_RE_INPUTS_HASH = re.compile(r"^[0-9a-f]{64}$")
_RE_IDEMPOTENCY_KEY = re.compile(r"^[A-Za-z0-9_.:-]{1,128}$")
# Mirrors the canonicalization authority's NAMESPACE_RE; the adapter still
# decides. This is a fail-fast pre-check, not a grant.
_RE_NAMESPACE = re.compile(r"^(core|tenant)::[a-z0-9_.-]+$")

_SHIM = os.path.join(_HERE, "_adapter_shim.js")
_DEFAULT_ADAPTER_DIR = os.path.normpath(os.path.join(_HERE, "..", "orca-adapter"))
_NODE_TIMEOUT_S = 30

# Lane terminal vocabulary (front-door semantic unit). MC_LANE_UNKNOWN is
# terminal: the key will never be re-dispatched blindly. It is never
# success: only MC_LANE_COMPLETED reads as success (H2a/H5b).
TERMINAL_EVENT_TYPES = frozenset((
    "MC_LANE_COMPLETED",
    "MC_LANE_FAILED",
    "MC_LANE_UNKNOWN",
))
SUCCESS_TERMINALS = frozenset(("MC_LANE_COMPLETED",))

# Revocation lifecycle vocabulary (H7). Revocation is sticky: the first
# revocation event for a key wins; later submits refuse against it.
REVOCATION_EVENT_TYPES = frozenset((
    "MC_REVOKED",
    "REVOKED_AFTER_DISPATCH",
))


class IntentValidationError(ValueError):
    """Raised when an intent fails schema/required-field validation."""


class IntentAuthorizationError(Exception):
    """Raised when the existing authority denies the intent, or is
    unreachable. Denial is fail-closed; unreachability never grants."""


class IntentDispatchError(Exception):
    """Raised when dispatch cannot proceed: idempotency collision,
    in-flight duplicate, work-order issuance failure, or executor failure."""


class IntentRevokedError(Exception):
    """Raised when an idempotency key has been revoked (H7): dispatch is
    refused with zero effects, or revocation landed mid-flight and the
    late outcome was recorded on the revocation instead of a terminal."""


class ExecutorOutcomeUnknown(IntentDispatchError):
    """The executor ran (or may have run) after work-order issuance, but
    its outcome is unconfirmed: it crashed, or it returned a malformed
    result envelope. (H5b: the protocol cannot distinguish a pre-effect
    crash from a post-effect crash, so the honest terminal is UNKNOWN:
    never FAILED, never COMPLETED.)

    Subclasses IntentDispatchError so existing except-IntentDispatchError
    call sites still catch it. Carries effect_may_have_occurred
    (conservative default True: unknown means assume the effect is
    possible), the work_order_id when known, and a short reason code
    ("executor-crashed" or "malformed-envelope")."""

    def __init__(self, message, effect_may_have_occurred=True,
                 work_order_id=None, reason="executor-crashed"):
        super(ExecutorOutcomeUnknown, self).__init__(message)
        self.effect_may_have_occurred = bool(effect_may_have_occurred)
        self.work_order_id = work_order_id
        self.reason = reason


class ExecutorNoEffect(IntentDispatchError):
    """Raised by an executor that failed BEFORE performing any external
    effect (spawn failure, pre-flight validation, unreachable transport).
    The front door may honestly record MC_LANE_FAILED for this: the
    attempt dispatched nothing into the world. This preserves the honest
    pre-hardening behavior for provable no-effect failures (P1 H5a)."""


# ---------------------------------------------------------------------------
# Authenticated context: tenant derivation and agent-to-tenant entitlement.
# (Tenant hardening: the tenant is derived from the AUTHENTICATED context,
# never from the request body.)
# ---------------------------------------------------------------------------

class AuthenticatedContext(object):
    """The authenticated caller context for one front-door submission.

    Carries the authenticated agent identity, the resolved tenant, and
    the tenant-entitlement evidence (the explicit allowlist of tenants
    the agent may act for). The tenant here is authoritative: submit()
    derives the intent's tenant from this object, and a request body
    that disagrees is refused.

    entitled_tenants defaults to the empty set (fail closed): an agent
    with no explicit entitlement may not act for any tenant, even the
    one named on the context.
    """

    def __init__(self, agent_id, tenant, principal=None,
                 entitled_tenants=None):
        if not isinstance(agent_id, str) or not agent_id:
            raise IntentValidationError(
                "agent_id must be a non-empty string")
        if not isinstance(tenant, str) or not _RE_TENANT.match(tenant):
            raise IntentValidationError(
                "tenant has invalid format: %r" % (tenant,))
        self.agent_id = agent_id
        self.tenant = tenant
        self.principal = principal
        self.entitled_tenants = frozenset(entitled_tenants or ())

    def __repr__(self):
        return "AuthenticatedContext(agent_id=%r, tenant=%r)" % (
            self.agent_id, self.tenant)


def resolve_tenant(auth_ctx, intent):
    """Resolve the tenant for a submission from the authenticated context.

    The tenant is taken from auth_ctx.tenant, never from the request
    body. When the intent body carries a tenant that disagrees with the
    authenticated tenant, the submission is refused: the body tenant is
    never trusted, even when it looks plausible.

    Raises IntentValidationError when there is no authenticated context
    or when the body tenant disagrees (fail closed).
    """
    if not isinstance(auth_ctx, AuthenticatedContext):
        raise IntentValidationError(
            "an AuthenticatedContext is required: the tenant is derived "
            "from the authenticated context, never the request body")
    tenant = auth_ctx.tenant
    body_tenant = intent.get("tenant")
    if body_tenant is not None and body_tenant != tenant:
        raise IntentValidationError(
            "intent body tenant %r disagrees with authenticated tenant "
            "%r: the body tenant is never trusted"
            % (body_tenant, tenant))
    return tenant


def check_agent_entitlement(auth_ctx, agent_id, tenant):
    """Fail-closed agent-to-tenant entitlement check.

    The submitting agent must be the authenticated agent, and the tenant
    must be in the authenticated entitlement set. Anything else raises
    IntentAuthorizationError: no entitlement evidence, no dispatch.
    """
    if not isinstance(auth_ctx, AuthenticatedContext):
        raise IntentValidationError(
            "an AuthenticatedContext is required for entitlement checks")
    if auth_ctx.agent_id != agent_id:
        raise IntentAuthorizationError(
            "submitting agent %r does not match authenticated agent %r: "
            "refusing (fail closed)" % (agent_id, auth_ctx.agent_id))
    if tenant not in auth_ctx.entitled_tenants:
        raise IntentAuthorizationError(
            "agent %r is not entitled to tenant %r: refusing (fail closed)"
            % (agent_id, tenant))


def _utcnow():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.isoformat()


def canonical_inputs_hash(inputs):
    """Content hash for intent inputs (sha256 over canonical JSON)."""
    canonical = json.dumps(inputs, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def canonical_intent_hash(intent):
    """Content hash for the FULL canonical intent (E2 collision domain).

    Covers capability, actor, tenant, mission_class, event_bind, and the
    inputs content (via inputs_hash, itself the canonical hash of the
    inputs bytes). Two intents hash equal exactly when their canonical
    bytes are identical. A reused idempotency key with a different
    digest fails closed: it must never duplicate-suppress to another
    intent's work order, across capabilities or across tenants.
    """
    canonical = {
        "intent_version": INTENT_VERSION,
        "mission_class": intent["mission_class"],
        "actor": intent["actor"],
        "tenant": intent["tenant"],
        "capability": intent["capability"],
        "event_bind": intent["event_bind"],
        "inputs_hash": intent["inputs_hash"],
    }
    canonical_json = json.dumps(canonical, sort_keys=True,
                                separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


# Canonical fields compared for pre-digest records: the acceptance
# records written before the intent_digest existed carried these fields,
# so a legacy record is compared field-wise instead of by digest.
_LEGACY_COLLISION_FIELDS = ("mission_class", "actor", "tenant",
                            "capability", "inputs_hash")


def _intent_collision(record, intent):
    """True when a reused idempotency key carries different canonical
    intent bytes than the recorded acceptance: fail closed (E2).

    Compares the full canonical intent digest recorded at acceptance.
    Records written before the digest existed are compared field-wise
    over the canonical fields the old record did carry.
    """
    stored = record.get("intent_digest")
    if stored is not None:
        return stored != canonical_intent_hash(intent)
    return any(record.get(f) != intent[f]
               for f in _LEGACY_COLLISION_FIELDS)


def validate(intent):
    """Validate a MissionIntent. Returns the canonical intent dict.

    Raises IntentValidationError on any schema or required-field failure.
    Pure function: no I/O, no authority call.
    """
    if not isinstance(intent, dict):
        raise IntentValidationError(
            "intent must be a dict, got %s" % type(intent).__name__)
    missing = [f for f in REQUIRED_FIELDS if f not in intent]
    if missing:
        raise IntentValidationError(
            "missing required fields: %s" % ", ".join(missing))
    for f in REQUIRED_FIELDS:
        v = intent[f]
        if not isinstance(v, str) or not v.strip():
            raise IntentValidationError(
                "field %r must be a non-empty string" % f)
    checks = (
        ("mission_class", _RE_MISSION_CLASS),
        ("actor", _RE_ACTOR),
        ("tenant", _RE_TENANT),
        ("capability", _RE_CAPABILITY),
        ("inputs_hash", _RE_INPUTS_HASH),
        ("idempotency_key", _RE_IDEMPOTENCY_KEY),
    )
    for field, rx in checks:
        if not rx.match(intent[field]):
            raise IntentValidationError(
                "field %r has invalid format: %r" % (field, intent[field]))
    inputs = intent.get("inputs", {})
    if not isinstance(inputs, dict):
        raise IntentValidationError("optional field 'inputs' must be a dict")
    event_bind = intent.get("event_bind", {})
    if not isinstance(event_bind, dict):
        raise IntentValidationError(
            "optional field 'event_bind' must be a dict")
    for k, v in event_bind.items():
        if not isinstance(v, (str, int, float, bool)) and v is not None:
            raise IntentValidationError(
                "event_bind values must be JSON scalars")
    canonical = {f: intent[f] for f in REQUIRED_FIELDS}
    canonical["inputs"] = inputs
    canonical["event_bind"] = event_bind
    return canonical


def _pack_summary(human, record):
    """Pack a human one-liner plus the machine-readable record."""
    return "%s%s%s" % (human, SUMMARY_MARKER,
                       json.dumps(record, sort_keys=True))


def _unpack_summary(summary):
    """Split a packed summary into (human, record|None)."""
    if not isinstance(summary, str) or SUMMARY_MARKER not in summary:
        return summary, None
    human, _, packed = summary.partition(SUMMARY_MARKER)
    try:
        return human, json.loads(packed)
    except (json.JSONDecodeError, ValueError):
        return human, None


def _intent_record(intent, extra=None):
    """The machine-readable record packed into front-door summaries."""
    record = {
        "intent_version": INTENT_VERSION,
        "mission_class": intent["mission_class"],
        "actor": intent["actor"],
        "tenant": intent["tenant"],
        "capability": intent["capability"],
        "inputs_hash": intent["inputs_hash"],
        "idempotency_key": intent["idempotency_key"],
    }
    record.update(intent.get("event_bind") or {})
    # The digest binds the FULL canonical intent bytes (E2). It is set
    # after the event_bind merge so a bind key can never shadow it.
    record["intent_digest"] = canonical_intent_hash(intent)
    if extra:
        record.update(extra)
    return record


def namespace_for(tenant):
    """Build the authority namespace for a tenant id."""
    ns = "tenant::" + tenant
    if not _RE_NAMESPACE.match(ns):
        raise IntentValidationError("invalid namespace %r" % ns)
    return ns


def _adapter_dir_or_default(adapter_dir):
    d = adapter_dir or os.environ.get("MC_ADAPTER_DIR") or _DEFAULT_ADAPTER_DIR
    d = os.path.normpath(d)
    vendored = os.path.join(d, "vendor", "external_agent_adapter.js")
    if not os.path.isfile(vendored):
        raise IntentAuthorizationError(
            "existing authority unreachable: vendored adapter not found at %s"
            % vendored)
    return d


def _call_adapter(op, request, adapter_dir, node_bin="node"):
    """Call the EXISTING adapter via the thin shim. Returns the parsed
    adapter result. Transport failure is fail-closed: it raises, never
    returns a grant."""
    d = _adapter_dir_or_default(adapter_dir)
    fd, req_path = tempfile.mkstemp(prefix="mc-intent-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(request, f, sort_keys=True)
        try:
            proc = subprocess.run(
                [node_bin, _SHIM, d, op, req_path],
                capture_output=True, text=True, timeout=_NODE_TIMEOUT_S)
        except (OSError, subprocess.SubprocessError) as e:
            raise IntentAuthorizationError(
                "existing authority unreachable: %s" % e)
        if proc.returncode != 0:
            raise IntentAuthorizationError(
                "existing authority unreachable: shim exit %d: %s"
                % (proc.returncode, (proc.stderr or "").strip()[:200]))
        try:
            out = json.loads((proc.stdout or "").strip())
        except (json.JSONDecodeError, ValueError):
            raise IntentAuthorizationError(
                "existing authority returned unparseable verdict")
        if not out.get("ok"):
            return {"_adapter_error": True,
                    "error": out.get("error"),
                    "code": out.get("code"),
                    "reason": out.get("reason")}
        return out["result"]
    finally:
        try:
            os.unlink(req_path)
        except OSError:
            pass


def authorize(intent, agent_id, constraints, adapter_dir=None, node_bin="node"):
    """Authorize an intent through the EXISTING capability/authority path.

    Returns the adapter's verdict: {"granted": bool, "reason": ...,
    "agent_id": ..., "capability": ..., "namespace": ...}.
    This function never grants on its own; an unreachable authority
    raises IntentAuthorizationError (fail-closed).
    """
    intent = validate(intent)
    if not isinstance(agent_id, str) or not agent_id:
        raise IntentValidationError("agent_id must be a non-empty string")
    if not isinstance(constraints, dict):
        raise IntentValidationError("constraints must be a dict")
    namespace = namespace_for(intent["tenant"])
    request = {
        "agentId": agent_id,
        "capability": intent["capability"],
        "namespace": namespace,
        "constraints": constraints,
    }
    result = _call_adapter("authorize", request, adapter_dir, node_bin)
    if result.get("_adapter_error"):
        raise IntentAuthorizationError(
            "existing authority error: %s" % result.get("error"))
    return {
        "granted": bool(result.get("granted")),
        "reason": result.get("reason"),
        "agent_id": result.get("agentId", agent_id),
        "capability": result.get("capability", intent["capability"]),
        "namespace": result.get("namespace", namespace),
    }


class Executor(object):
    """Executor protocol: runs the dispatched work and returns a typed
    result. Executors are registered per mission class by adapters.

    The result envelope (shared contract with the adapter-side reconcile
    gate) is a dict:
        {"status": "completed" | "failed" | "unknown",
         "summary": <str>,
         "effect_may_have_occurred": <bool, optional>}
    "unknown" is the explicit unknown-outcome signal: the executor did
    work (or may have) but cannot confirm the outcome. The front door
    records MC_LANE_UNKNOWN for it: never FAILED, never COMPLETED.

    Raising: any exception other than ExecutorNoEffect /
    ExecutorOutcomeUnknown, raised after work-order issuance, is an
    unconfirmed outcome (H5b) and records MC_LANE_UNKNOWN. An executor
    that can positively attest it performed NO external effect before
    failing (spawn failure, pre-flight check) raises ExecutorNoEffect
    to keep the honest MC_LANE_FAILED.
    """

    name = "executor"

    def execute(self, intent, work_order):
        raise NotImplementedError


def _check_executor_result(result, work_order_id=None):
    """Validate the executor result envelope (the shared contract).

    status is "completed", "failed", or "unknown". "unknown" is the
    explicit unknown-outcome signal; "effect_may_have_occurred" is
    optional and defaults conservative-True when absent. A malformed
    envelope is itself an unconfirmed outcome -- the executor ran, and
    the protocol cannot confirm what it did -- so it raises
    ExecutorOutcomeUnknown (H5b), never a silent FAILED.
    """
    def _unknown(reason):
        return ExecutorOutcomeUnknown(
            "executor result envelope invalid (%s): outcome unconfirmed"
            % reason,
            work_order_id=work_order_id,
            reason="malformed-envelope")
    if not isinstance(result, dict):
        raise _unknown("result must be a dict, got %s"
                       % type(result).__name__)
    status = result.get("status")
    if status not in ("completed", "failed", "unknown"):
        # The message keeps the pre-hardening "executor status must be"
        # prefix: the P1 hostile harness asserts that substring.
        raise ExecutorOutcomeUnknown(
            "executor status must be 'completed', 'failed' or 'unknown', "
            "got %r: outcome unconfirmed" % (status,),
            work_order_id=work_order_id,
            reason="malformed-envelope")
    if not isinstance(result.get("summary"), str):
        raise _unknown("result needs a string 'summary'")
    if ("effect_may_have_occurred" in result
            and not isinstance(result["effect_may_have_occurred"], bool)):
        raise _unknown("'effect_may_have_occurred' must be a bool when "
                       "present")
    return result


def _issue_work_order(intent, verdict, adapter_dir, node_bin="node"):
    """Issue the work order through the EXISTING adapter (which re-runs
    authorizeWorkOrder internally and throws WORK_ORDER_DENIED on denial)."""
    now = _utcnow()
    key_digest = hashlib.sha256(
        intent["idempotency_key"].encode("utf-8")).hexdigest()[:12]
    task_id = "mc-intent:" + intent["idempotency_key"]
    request = {
        "agentId": verdict["agent_id"],
        "capability": verdict["capability"],
        "namespace": verdict["namespace"],
        "taskId": task_id,
        "missionId": "mc-intent:" + key_digest,
        "correlationId": intent["idempotency_key"],
        "contextPackId": "none",
        "input": {
            "intent_version": INTENT_VERSION,
            "mission_class": intent["mission_class"],
            "actor": intent["actor"],
            "tenant": intent["tenant"],
            "capability": intent["capability"],
            "inputs_hash": intent["inputs_hash"],
            "idempotency_key": intent["idempotency_key"],
            "bind": intent["event_bind"],
        },
        "constraints": verdict.get("constraints") or {},
        "resultPath": "/tmp/mc-intent-result-" + key_digest + ".json",
        "deadline": _iso(now + timedelta(seconds=600)),
        "causationId": "frontdoor:submit",
        "attempt": 1,
    }
    result = _call_adapter("issue", request, adapter_dir, node_bin)
    if result.get("_adapter_error"):
        raise IntentAuthorizationError(
            "work order denied by existing authority: %s"
            % (result.get("reason") or result.get("error")))
    return result


def _issuance_record(intent, verdict, work_order):
    """The authority-produced work-order issuance record.

    Binds the issued work order to the authenticated tenant, the
    idempotency key, the canonical intent digest, the namespace, the
    agent, and the capability. Terminals are trusted only when they
    chain to one of these records (see _terminal_verified): an
    unattributed terminal event is never trusted.
    """
    return {
        "intent_version": INTENT_VERSION,
        "idempotency_key": intent["idempotency_key"],
        "tenant": intent["tenant"],
        "intent_digest": canonical_intent_hash(intent),
        "namespace": verdict.get("namespace"),
        "agent_id": verdict.get("agent_id"),
        "capability": intent["capability"],
        "work_order_id": work_order.get("work_order_id"),
        "issued_at": _iso(_utcnow()),
    }


def dispatch(intent, verdict, executor, adapter_dir=None, node_bin="node",
             journal_file=None):
    """Dispatch an authorized intent: issue the work order through the
    orca-adapter execution spine, then run the class executor.

    Returns {"work_order": ..., "executor_result": ...}; the result's
    "status" is "completed", "failed", or "unknown" (the shared
    executor-envelope contract; submit() maps each to its terminal).
    Raises IntentAuthorizationError if the work order is denied,
    ExecutorOutcomeUnknown when the executor's outcome is unconfirmed
    (crash after issuance, or a malformed result envelope), and
    IntentDispatchError on other dispatch failures. The verdict must be
    a granted authorization; a denied verdict raises immediately.
    Raises IntentRevokedError when the idempotency key is revoked: zero
    dispatch (no work order issued, no executor run).

    Revocation is enforced HERE (H7 defect-3 closure, 2026-09-27): no
    caller may bypass it by calling dispatch() directly. submit() keeps
    its own bracketing checks as defense in depth.
    """
    journal_file = journal_file or _emit.JOURNAL_FILE
    intent = validate(intent)
    # H7 defect-3: the revocation check lives inside dispatch(), not in
    # the caller. A revoked key refuses before the verdict is even
    # inspected: no authority call, no work order, no executor.
    rev = find_revocation(journal_file, intent["idempotency_key"])
    if rev is not None:
        _refuse_revoked(intent, rev, journal_file)
    if not isinstance(verdict, dict) or not verdict.get("granted"):
        raise IntentAuthorizationError(
            "dispatch refused: no granted authorization (%s)"
            % ((verdict or {}).get("reason") or "missing verdict"))
    if not isinstance(executor, Executor):
        raise IntentDispatchError("executor must be an Executor instance")
    work_order = _issue_work_order(intent, verdict, adapter_dir, node_bin)
    # The issuance record is authority-produced: it is emitted after the
    # work order is issued and before the executor runs, binding the
    # work order to the authenticated tenant, key, digest, namespace,
    # agent, and capability. Terminals that do not chain to an issuance
    # record are never trusted (see find_intent_record).
    observe([{
        "event_type": "MC_WORK_ORDER_ISSUED",
        "human": "frontdoor work order issued: %s"
                 % (work_order.get("work_order_id"),),
        "record": _issuance_record(intent, verdict, work_order),
        "status": "work-order-issued",
    }], journal_file=journal_file)
    try:
        raw_result = executor.execute(intent, work_order)
    except ExecutorNoEffect:
        # The executor positively attests it performed no external
        # effect before failing: the honest terminal is FAILED.
        raise
    except ExecutorOutcomeUnknown:
        raise
    except Exception as e:
        # H5b: the executor crashed after the work order was issued.
        # The protocol cannot distinguish a crash before the effect
        # from a crash after it, so the honest outcome is UNKNOWN:
        # never FAILED, never COMPLETED.
        raise ExecutorOutcomeUnknown(
            "executor %r crashed after work-order issuance: outcome "
            "unconfirmed (effect may have occurred): %s"
            % (executor.name, e),
            work_order_id=work_order.get("work_order_id")) from e
    executor_result = _check_executor_result(
        raw_result, work_order_id=work_order.get("work_order_id"))
    return {"work_order": work_order, "executor_result": executor_result}


def _journal_events(journal_file):
    if not os.path.exists(journal_file):
        return
    with open(journal_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except (json.JSONDecodeError, ValueError):
                continue


def _issuance_index(events):
    """Index MC_WORK_ORDER_ISSUED records by work_order_id.

    The issuance record is authority-produced: it is emitted by the
    front door after _issue_work_order() succeeds and before the
    executor runs, binding the work order to the authenticated tenant,
    idempotency key, canonical intent digest, namespace, agent, and
    capability.

    The index maps work_order_id to (position, record), where position
    is the event's index in the journal order. Terminal verification
    requires the issuance to PRECEDE the terminal: a later planted
    issuance cannot retroactively validate an earlier terminal.
    """
    index = {}
    for pos, ev in enumerate(events):
        if ev.get("event_type") != "MC_WORK_ORDER_ISSUED":
            continue
        _, rec = _unpack_summary((ev.get("event_data") or {}).get("summary"))
        if not rec:
            continue
        wo = rec.get("work_order_id")
        if wo and wo not in index:
            index[wo] = (pos, rec)
    return index


def _terminal_verified(rec, issuance, terminal_pos):
    """True when a terminal record chains to a PRECEDING issuance.

    The terminal is trusted only when an MC_WORK_ORDER_ISSUED appears
    EARLIER in the journal (position < terminal_pos) binding the same
    work_order_id, tenant, idempotency_key, and intent_digest. An
    unattributed terminal (no issuance, a mismatched one, or an
    issuance that appears after the terminal) is never trusted: it is
    ignored by the fold and reported as an anomaly instead.
    """
    wo = rec.get("work_order_id")
    if not wo:
        return False
    entry = issuance.get(wo)
    if entry is None:
        return False
    iss_pos, iss = entry
    if iss_pos >= terminal_pos:
        return False
    return (iss.get("tenant") == rec.get("tenant")
            and iss.get("idempotency_key") == rec.get("idempotency_key")
            and iss.get("intent_digest") == rec.get("intent_digest"))


def find_intent_record(journal_file, idempotency_key, tenant=None):
    """Find the existing intent record for an idempotency key.

    Returns None, or {"started": event, "terminal": event|None,
    "record": unpacked acceptance record, "unverified_terminals":
    [events]}. The record is unpacked from the packed summary (the
    spine's lane-event envelope has a fixed event_data shape, so the
    front-door record travels in the summary).

    Terminality is a pure event-type check over TERMINAL_EVENT_TYPES,
    PLUS issuance-chain verification: a terminal is accepted only when
    it chains to a preceding MC_WORK_ORDER_ISSUED for the same tenant,
    idempotency key, intent digest, and work order id. Unattributed
    terminal events are never trusted: they are ignored (never returned
    as "terminal") and exposed in "unverified_terminals".
    MC_LANE_UNKNOWN is terminal (the key will not be re-dispatched) but
    is NEVER success: only SUCCESS_TERMINALS (MC_LANE_COMPLETED) reads
    as success. Consumers must check membership, never truthiness of
    "terminal".

    When tenant is given, only records for that tenant are considered
    (tenant-scoped idempotency: the same key in another tenant is a
    different record).
    """
    events = [ev for ev in _journal_events(journal_file)
              if ev.get("aggregate_id") == "mc:lane:" + INTENT_LANE]
    issuance = _issuance_index(events)
    started = None
    record = None
    terminal = None
    unverified_terminals = []
    for pos, ev in enumerate(events):
        _, rec = _unpack_summary((ev.get("event_data") or {}).get("summary"))
        if not rec or rec.get("idempotency_key") != idempotency_key:
            continue
        if tenant is not None and rec.get("tenant") != tenant:
            continue
        if ev.get("event_type") == "MC_LANE_STARTED" and started is None:
            started = ev
            record = rec
        elif ev.get("event_type") in TERMINAL_EVENT_TYPES:
            if _terminal_verified(rec, issuance, pos):
                terminal = ev
            else:
                unverified_terminals.append(ev)
    if started is None:
        return None
    return {"started": started, "terminal": terminal, "record": record,
            "unverified_terminals": unverified_terminals}


def find_revocation(journal_file, idempotency_key, tenant=None):
    """Find the revocation for an idempotency key, if any.

    Returns the first MC_REVOKED / REVOKED_AFTER_DISPATCH event for the
    key, or None. Revocation is sticky: the first revocation wins and
    later submits refuse against it. When tenant is given, only
    revocations for that tenant are considered.
    """
    for ev in _journal_events(journal_file):
        if ev.get("aggregate_id") != "mc:lane:" + INTENT_LANE:
            continue
        if ev.get("event_type") not in REVOCATION_EVENT_TYPES:
            continue
        _, rec = _unpack_summary((ev.get("event_data") or {}).get("summary"))
        if rec and rec.get("idempotency_key") == idempotency_key:
            if tenant is not None and rec.get("tenant") != tenant:
                continue
            return ev
    return None


def _revoked_after_dispatch_event(record):
    """Build the REVOKED_AFTER_DISPATCH observe spec from a packed
    revocation record (H7). The record carries idempotency_key,
    classification, effect_status, reason, and any late outcome."""
    return {
        "event_type": "REVOKED_AFTER_DISPATCH",
        "human": "frontdoor revoked after dispatch: %s classification=%s"
                 % (record["idempotency_key"], record["classification"]),
        "record": record,
        "status": "revoked-after-dispatch",
    }


def _revocation_record_base(idempotency_key, reason, classification,
                            effect_status, work_order_id=None):
    """Packed-record skeleton shared by revoke() and the late-outcome
    path in submit()."""
    return {
        "intent_version": INTENT_VERSION,
        "idempotency_key": idempotency_key,
        "reason": reason,
        "classification": classification,
        "effect_status": effect_status,
        "work_order_id": work_order_id,
        "revoked_at": _iso(_utcnow()),
    }


def _refuse_revoked(intent, rev_event, journal_file):
    """Refuse a submit against a revoked key: observe the refusal, then
    raise. Zero dispatch: no authorize call, no work order, no executor."""
    _, rev_rec = _unpack_summary(
        (rev_event.get("event_data") or {}).get("summary"))
    reason = (rev_rec or {}).get("reason")
    observe([{
        "event_type": "MC_CHECKPOINT",
        "human": "frontdoor refused revoked idempotency key %s: zero "
                 "dispatch" % intent["idempotency_key"],
        "record": _intent_record(intent, {
            "status": "revoked-refused",
            "revocation_reason": reason,
            "revocation_event": rev_event.get("event_type"),
        }),
        "status": "revoked-refused",
    }], journal_file=journal_file)
    raise IntentRevokedError(
        "idempotency key %r revoked (%s): refusing dispatch"
        % (intent["idempotency_key"], reason))


def revoke(idempotency_key, reason, journal_file=None, auth_ctx=None):
    """Revoke an idempotency key (H7).

    Emits MC_REVOKED when nothing dispatched under the key (future
    submits refuse before authorize, zero dispatch), or
    REVOKED_AFTER_DISPATCH with a Batch-7-disposition-#7 classification
    when the effect already dispatched:
      in-flight-uncertain  no terminal yet: uncertain -> UNKNOWN/HOLD/
                           RECONCILE (effect_status "unknown")
      already-committed    MC_LANE_COMPLETED: record reality; revocation
                           cannot un-execute (effect_status "committed")
      already-failed       MC_LANE_FAILED: effect_status "no-effect" for
                           authority denials, "failed-per-executor" for
                           executor-reported failure, "unknown" for the
                           pre-hardening dispatch-failed bucket (which
                           once held executor crashes, H5b)
      unknown-hold         MC_LANE_UNKNOWN: stays HOLD/RECONCILE
                           (effect_status "unknown")
    Revocation is sticky and idempotent: a second revoke() returns the
    existing revocation without emitting. revoke() itself dispatches no
    new effects.

    When auth_ctx is given, revocation is tenant-scoped: the lookup and
    the revocation record are bound to the authenticated tenant, so one
    tenant cannot revoke another tenant's key.
    """
    journal_file = journal_file or _emit.JOURNAL_FILE
    if (not isinstance(idempotency_key, str)
            or not _RE_IDEMPOTENCY_KEY.match(idempotency_key)):
        raise IntentValidationError(
            "idempotency_key has invalid format: %r" % (idempotency_key,))
    if not isinstance(reason, str) or not reason.strip():
        raise IntentValidationError(
            "revocation reason must be a non-empty string")
    tenant = auth_ctx.tenant if auth_ctx is not None else None
    if auth_ctx is not None and not isinstance(auth_ctx,
                                               AuthenticatedContext):
        raise IntentValidationError(
            "auth_ctx must be an AuthenticatedContext")
    existing = find_revocation(journal_file, idempotency_key,
                               tenant=tenant)
    if existing is not None:
        _, rec = _unpack_summary(
            (existing.get("event_data") or {}).get("summary"))
        return {
            "revoked": True,
            "duplicate": True,
            "classification": (rec or {}).get("classification"),
            "event_type": existing.get("event_type"),
            "revocation": rec,
            "events": [],
        }
    info = find_intent_record(journal_file, idempotency_key,
                              tenant=tenant)
    if info is None:
        record = _revocation_record_base(
            idempotency_key, reason, "no-dispatch-recorded", None)
        record["tenant"] = tenant
        events = observe([{
            "event_type": "MC_REVOKED",
            "human": "frontdoor revoked idempotency key %s before dispatch: "
                     "%s" % (idempotency_key, reason),
            "record": record,
            "status": "revoked-pre-dispatch",
        }], journal_file=journal_file)
        return {
            "revoked": True,
            "duplicate": False,
            "classification": "no-dispatch-recorded",
            "event_type": "MC_REVOKED",
            "events": events,
        }
    terminal = info["terminal"]
    term_type = terminal.get("event_type") if terminal else None
    term_rec = None
    if terminal is not None:
        _, term_rec = _unpack_summary(
            (terminal.get("event_data") or {}).get("summary"))
    term_rec = term_rec or {}
    if term_type is None:
        classification, effect_status = "in-flight-uncertain", "unknown"
    elif term_type == "MC_LANE_COMPLETED":
        classification, effect_status = "already-committed", "committed"
    elif term_type == "MC_LANE_FAILED":
        if term_rec.get("denied_by") == "existing-authority":
            classification, effect_status = "already-failed", "no-effect"
        elif term_rec.get("executor_status") == "failed":
            classification, effect_status = ("already-failed",
                                             "failed-per-executor")
        else:
            classification, effect_status = "already-failed", "unknown"
    else:  # MC_LANE_UNKNOWN
        classification, effect_status = "unknown-hold", "unknown"
    record = _revocation_record_base(
        idempotency_key, reason, classification, effect_status,
        work_order_id=term_rec.get("work_order_id"))
    record["tenant"] = tenant
    record["prior_terminal"] = term_type
    record["mission_class"] = info["record"].get("mission_class")
    record["actor"] = info["record"].get("actor")
    record["tenant"] = info["record"].get("tenant")
    record["capability"] = info["record"].get("capability")
    events = observe([_revoked_after_dispatch_event(record)],
                     journal_file=journal_file)
    return {
        "revoked": True,
        "duplicate": False,
        "classification": classification,
        "effect_status": effect_status,
        "prior_terminal": term_type,
        "event_type": "REVOKED_AFTER_DISPATCH",
        "events": events,
    }


def observe(stage_events, journal_file=None):
    """Emit canonical events for front-door stages via the spine's emit
    path (the existing journal; the spine's emit.py, read-only).

    stage_events: list of dicts with keys:
      event_type (an already-registered MC_* type), human (one-liner),
      record (dict packed into the summary), status, confidence.
    Returns [(event, "appended"|"duplicate-skipped")].
    Raises ValueError on an unregistered event type (from emit.py).
    """
    journal_file = journal_file or _emit.JOURNAL_FILE
    now = _iso(_utcnow())
    out = []
    for spec in stage_events:
        summary = _pack_summary(spec.get("human", ""),
                                spec.get("record") or {})
        event, how = _emit.emit_event(
            spec["event_type"],
            INTENT_LANE,
            summary,
            now, now, now,
            SOURCE_ARTIFACT,
            confidence=spec.get("confidence", "HIGH"),
            status=spec.get("status"),
            backfill=False,
            journal_file=journal_file,
        )
        out.append((event, how))
    return out


def _gate_event(intent, stage, verdict, reason=None):
    return {
        "event_type": "MC_GATE_RESULT",
        "human": "frontdoor %s %s: %s/%s/%s" % (
            stage, verdict, intent["mission_class"], intent["actor"],
            intent["capability"]),
        "record": _intent_record(intent, {
            "stage": stage,
            "verdict": verdict,
            "reason": reason,
        }),
        "status": "gate-%s-%s" % (stage, verdict),
    }


def submit(intent, agent_id, constraints, executor, journal_file=None,
           adapter_dir=None, node_bin="node", auth_ctx=None):
    """Run the full contract: validate -> authorize -> dispatch -> observe.

    The tenant is derived from the AUTHENTICATED context (auth_ctx), never
    from the request body: a body tenant that disagrees is refused, and
    the agent must be entitled to the tenant (fail closed). auth_ctx is
    required.

    Returns a result dict. A duplicate idempotency key returns the
    original record without re-dispatching. Denials raise
    IntentAuthorizationError after the denial is observed. Executor
    crashes and malformed envelopes raise ExecutorOutcomeUnknown after
    an MC_LANE_UNKNOWN terminal is observed; a positively-attested
    no-effect failure raises IntentDispatchError after MC_LANE_FAILED.
    A revoked idempotency key raises IntentRevokedError before authorize
    (zero dispatch); when revocation lands mid-flight, the late outcome
    is recorded on the revocation instead of a routine terminal.
    """
    journal_file = journal_file or _emit.JOURNAL_FILE
    # Tenant hardening: resolve the tenant from the authenticated
    # context (never the body) BEFORE validation, and enforce
    # agent-to-tenant entitlement, fail closed. The resolved tenant is
    # injected into the intent: authorize, dispatch, issuance, and
    # observation all bind it. A body tenant that disagrees is refused.
    tenant = resolve_tenant(auth_ctx, intent)
    check_agent_entitlement(auth_ctx, agent_id, tenant)
    intent = dict(intent, tenant=tenant)
    intent = validate(intent)
    observe([_gate_event(intent, "validate", "pass")],
            journal_file=journal_file)

    # H7: revocation is checked BEFORE authorize. A revoked key refuses
    # immediately: no authority call, no work order, no executor.
    # Revocation lookups are tenant-scoped.
    rev = find_revocation(journal_file, intent["idempotency_key"],
                          tenant=tenant)
    if rev is not None:
        _refuse_revoked(intent, rev, journal_file)

    existing = find_intent_record(journal_file, intent["idempotency_key"],
                                  tenant=tenant)
    if existing is not None:
        record = existing["record"] or {}
        if _intent_collision(record, intent):
            raise IntentDispatchError(
                "idempotency key reuse with different canonical intent "
                "bytes (capability/actor/tenant/mission_class/event_bind/"
                "inputs): fail-closed (E2 collision safety)")
        terminal = existing["terminal"]
        if terminal is None:
            # A previous attempt was accepted but never reached a
            # terminal state: outcome UNKNOWN. Never re-dispatch
            # blindly (O6); hold instead.
            observe([{
                "event_type": "MC_HOLD_RAISED",
                "human": "frontdoor duplicate with in-flight original: "
                         "HOLD, refusing re-dispatch",
                "record": _intent_record(
                    intent, {"status": "in-flight-duplicate-hold"}),
                "status": "hold-in-flight-duplicate",
            }], journal_file=journal_file)
            raise IntentDispatchError(
                "previous intent with this idempotency key is in-flight "
                "(no terminal event): refusing duplicate dispatch")
        observe([{
            "event_type": "MC_CHECKPOINT",
            "human": "frontdoor duplicate-suppressed: returning original "
                     "dispatch record",
            "record": _intent_record(intent, {
                "status": "duplicate-suppressed",
                "original_work_order_id": record.get("work_order_id"),
                "original_terminal": terminal.get("event_type"),
            }),
            "status": "duplicate-suppressed",
        }], journal_file=journal_file)
        _, term_rec = _unpack_summary(
            (terminal.get("event_data") or {}).get("summary"))
        term_type = terminal.get("event_type")
        return {
            "outcome": "duplicate-suppressed",
            "duplicate": True,
            "intent": intent,
            "original": {
                "work_order_id": (term_rec or {}).get("work_order_id"),
                "terminal": term_type,
                "terminal_success": term_type in SUCCESS_TERMINALS,
                "executor_summary": (term_rec or {}).get("executor_summary"),
            },
            "events": [],
        }

    verdict = authorize(intent, agent_id, constraints,
                        adapter_dir=adapter_dir, node_bin=node_bin)
    # Issuance is evaluated under identical constraints to the grant.
    verdict = dict(verdict, constraints=constraints)
    observe([_gate_event(
        intent, "authorize",
        "pass" if verdict["granted"] else "fail",
        verdict.get("reason"))], journal_file=journal_file)
    if not verdict["granted"]:
        # Defect-2 closure (2026-09-27): an authority denial is typed as
        # an AUTHORIZATION refusal in the observed record, matching the
        # adapter-side mapping (authorization_refusal / refusal_source).
        observe([{
            "event_type": "MC_LANE_FAILED",
            "human": "frontdoor denied by existing authority: %s"
                     % (verdict.get("reason"),),
            "record": _intent_record(intent, {
                "denied_by": "existing-authority",
                "deny_reason": verdict.get("reason"),
                "authorization_refusal": True,
                "refusal_source": "capability-authority",
            }),
            "status": "denied",
        }], journal_file=journal_file)
        raise IntentAuthorizationError(
            "denied by existing authority: %s" % verdict.get("reason"))

    # H7: revocation may have landed while authorize ran. Re-check
    # before anything dispatches: a revoked key still refuses with zero
    # dispatch (no work order issued yet).
    rev = find_revocation(journal_file, intent["idempotency_key"],
                          tenant=tenant)
    if rev is not None:
        _refuse_revoked(intent, rev, journal_file)

    observe([{
        "event_type": "MC_LANE_STARTED",
        "human": "frontdoor intent accepted for dispatch",
        "record": _intent_record(intent, {
            "agent_id": verdict["agent_id"],
            "namespace": verdict["namespace"],
            "status": "intent-accepted",
        }),
        "status": "intent-accepted",
    }], journal_file=journal_file)

    try:
        dispatched = dispatch(intent, verdict, executor,
                               adapter_dir=adapter_dir, node_bin=node_bin,
                               journal_file=journal_file)
    except ExecutorOutcomeUnknown as e:
        # H5b: the executor ran (or may have run) but its outcome is
        # unconfirmed. This is UNKNOWN: never FAILED, never COMPLETED.
        # If the key was revoked while the executor was in flight, the
        # revocation owns the outcome: record reality on the revocation.
        reason = getattr(e, "reason", "executor-crashed")
        rev = find_revocation(journal_file, intent["idempotency_key"],
                              tenant=tenant)
        if rev is not None:
            _, rev_rec = _unpack_summary(
                (rev.get("event_data") or {}).get("summary"))
            record = _revocation_record_base(
                intent["idempotency_key"], (rev_rec or {}).get("reason"),
                "revoked-in-flight-late-unknown", "unknown",
                work_order_id=getattr(e, "work_order_id", None))
            record["late_failure"] = str(e)[:500]
            record["late_unknown_reason"] = reason
            observe([_revoked_after_dispatch_event(record)],
                    journal_file=journal_file)
            raise IntentRevokedError(
                "idempotency key %r revoked during dispatch; crashed "
                "executor outcome recorded on the revocation"
                % (intent["idempotency_key"],)) from e
        observe([{
            "event_type": "MC_LANE_UNKNOWN",
            "human": "frontdoor executor outcome UNKNOWN: %s" % (e,),
            "record": _intent_record(intent, {
                "work_order_id": getattr(e, "work_order_id", None),
                "executor": executor.name,
                "unknown_reason": reason,
                "effect_may_have_occurred": bool(
                    getattr(e, "effect_may_have_occurred", True)),
                "failure": str(e)[:500],
            }),
            "status": reason + "-unknown",
        }], journal_file=journal_file)
        raise
    except Exception as e:
        observe([{
            "event_type": "MC_LANE_FAILED",
            "human": "frontdoor dispatch failed: %s" % (e,),
            "record": _intent_record(intent, {
                "failure": str(e)[:500],
            }),
            "status": "dispatch-failed",
        }], journal_file=journal_file)
        raise

    work_order = dispatched["work_order"]
    ex_result = dispatched["executor_result"]
    ex_status = ex_result["status"]

    # H7: the key may have been revoked while the executor was in
    # flight. The revocation owns the outcome now: record reality on
    # the revocation, never a routine terminal.
    rev = find_revocation(journal_file, intent["idempotency_key"],
                          tenant=tenant)
    if rev is not None:
        _, rev_rec = _unpack_summary(
            (rev.get("event_data") or {}).get("summary"))
        late_class, late_effect = {
            "completed": ("revoked-in-flight-late-commit", "committed"),
            "failed": ("revoked-in-flight-late-failure",
                       "failed-per-executor"),
            "unknown": ("revoked-in-flight-late-unknown", "unknown"),
        }[ex_status]
        record = _revocation_record_base(
            intent["idempotency_key"], (rev_rec or {}).get("reason"),
            late_class, late_effect,
            work_order_id=work_order.get("work_order_id"))
        record["late_executor_status"] = ex_status
        record["late_executor_summary"] = ex_result["summary"][:500]
        if ex_status == "unknown":
            record["effect_may_have_occurred"] = bool(
                ex_result.get("effect_may_have_occurred", True))
        observe([_revoked_after_dispatch_event(record)],
                journal_file=journal_file)
        raise IntentRevokedError(
            "idempotency key %r revoked during dispatch; late executor "
            "outcome (%s) recorded on the revocation"
            % (intent["idempotency_key"], ex_status))

    if ex_status == "completed":
        terminal_spec = {
            "event_type": "MC_LANE_COMPLETED",
            "human": "frontdoor dispatched: work_order=%s executor=%s"
                     % (work_order.get("work_order_id"), executor.name),
            "record": _intent_record(intent, {
                "work_order_id": work_order.get("work_order_id"),
                "executor": executor.name,
                "executor_status": "completed",
                "executor_summary": ex_result["summary"][:500],
            }),
            "status": "dispatched",
        }
        outcome = "dispatched"
    elif ex_status == "failed":
        # H2a: an executor that RETURNS failure is failed work. The
        # terminal is MC_LANE_FAILED; the executor_status detail stays
        # in the record for diagnosis.
        terminal_spec = {
            "event_type": "MC_LANE_FAILED",
            "human": "frontdoor executor reported failure: work_order=%s "
                     "executor=%s: %s"
                     % (work_order.get("work_order_id"), executor.name,
                        ex_result["summary"][:200]),
            "record": _intent_record(intent, {
                "work_order_id": work_order.get("work_order_id"),
                "executor": executor.name,
                "executor_status": "failed",
                "executor_summary": ex_result["summary"][:500],
                "failure_source": "executor-result",
            }),
            "status": "executor-failed",
        }
        outcome = "executor-failed"
    else:  # "unknown": H5b, the shared executor-envelope contract.
        terminal_spec = {
            "event_type": "MC_LANE_UNKNOWN",
            "human": "frontdoor executor outcome UNKNOWN: work_order=%s "
                     "executor=%s: %s"
                     % (work_order.get("work_order_id"), executor.name,
                        ex_result["summary"][:200]),
            "record": _intent_record(intent, {
                "work_order_id": work_order.get("work_order_id"),
                "executor": executor.name,
                "executor_status": "unknown",
                "executor_summary": ex_result["summary"][:500],
                "effect_may_have_occurred": bool(
                    ex_result.get("effect_may_have_occurred", True)),
                "unknown_reason": "executor-signaled-unknown",
            }),
            "status": "executor-unknown",
        }
        outcome = "executor-unknown"
    terminal_events = observe([terminal_spec], journal_file=journal_file)

    return {
        "outcome": outcome,
        "duplicate": False,
        "intent": intent,
        "authorization": {k: v for k, v in verdict.items()
                          if k != "constraints"},
        "work_order": work_order,
        "executor_result": ex_result,
        "events": terminal_events,
    }
# ---------------------------------------------------------------------------
# Tenant-scoped journal reads and exports.
# ---------------------------------------------------------------------------

def _row_tenant(row):
    """The tenant attributed to a journal row.

    Front-door lane events pack the tenant in the summary record;
    pass events carry it in event_data. Rows with no attributable
    tenant return None (unattributed: never trusted for a tenant
    projection).
    """
    edata = row.get("event_data") or {}
    tenant = edata.get("tenant")
    if tenant:
        return tenant
    _, rec = _unpack_summary(edata.get("summary"))
    if rec:
        return rec.get("tenant")
    return None


def read_journal_tenant(journal_file, tenant):
    """Read the journal rows attributed to one tenant.

    Returns the list of journal events whose tenant is `tenant`.
    Unattributed rows are excluded: a tenant projection never includes
    events that cannot be attributed to that tenant. This is the
    supported tenant-facing journal read; raw full-journal scans are
    not a tenant boundary.
    """
    if not isinstance(tenant, str) or not _RE_TENANT.match(tenant):
        raise IntentValidationError(
            "tenant has invalid format: %r" % (tenant,))
    return [ev for ev in _journal_events(journal_file)
            if _row_tenant(ev) == tenant]


def export_journal_tenant(journal_file, tenant, dest_path):
    """Export one tenant's journal rows to a JSONL file.

    Only rows attributed to `tenant` are written. Returns the number
    of rows exported.
    """
    rows = read_journal_tenant(journal_file, tenant)
    parent = os.path.dirname(dest_path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    tmp = dest_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, sort_keys=True) + "\n")
    os.replace(tmp, dest_path)
    return len(rows)
