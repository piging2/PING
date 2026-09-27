#!/usr/bin/env python3
"""Deterministic policy engine for PING Social engagement passes.

Condenses the natural-language policy sprawl in the engagement-pass cron
bodies into a small explicit state machine (Nolan's 2026-09-26 directive:
the LLM sits BESIDE the deterministic system, never above it).

This module DECIDES. The LLM beside it discovers candidates, classifies
content, and drafts comment text. Nothing in this module calls an LLM,
opens a browser, or touches the network.

It wires the existing machinery and duplicates none of it:
  - engagement-guard.py owns identity normalization and the
    never-re-engage history check (GUARD_EVAL calls guard.check).
  - action-intent-ledger.py owns intent lifecycle and unknown-execution
    semantics (REFUSE_EVAL folds the ledger with its own functions).

Pure decision logic: same candidates + same durable history + same caps
-> same decisions, always. Fail-closed: any unreadable input aborts the
pass (PASS_ABORTED) or rejects the candidate, never permits by default.

No new authority, no new truth store. The cron bodies remain the live
behavior until sequenced to call this module; nothing here changes a
running pass by existing.

Spec: ~/workspace/orca-mc-convergence/PIPELINE-ENDGAME-SPEC.md
"""
import hashlib
import importlib.util
import json
import os
from datetime import datetime, timezone

_HERE = os.path.dirname(os.path.abspath(__file__))

# ------------------------------------------------------------------ vocab
PLATFORMS = ("instagram", "facebook", "threads", "x", "tiktok")
HANDLE_PLATFORMS = ("instagram", "threads", "x", "tiktok")

# Candidate decisions and reason codes (spec section 4). Every REJECTED
# candidate carries exactly one reason code.
SELECTED = "SELECTED"
REJECTED = "REJECTED"
REASON_CODES = (
    "SELECTED",
    "ALREADY_ENGAGED",
    "BLOCKED_AMBIGUOUS",
    "GUARD_UNCHECKABLE",
    "GUARD_FAIL_CLOSED",
    "UNKNOWN_EXECUTION_OPEN",
    "LEDGER_FAIL_CLOSED",
    "NO_EVIDENCE",
    "PAIR_RULE_VIOLATION",
    "CAP_EXHAUSTED",
    "INVALID_ACTION",
)

# Pass lifecycle states (spec section 3).
PASS_CREATED = "PASS_CREATED"
DISCOVERY = "DISCOVERY"
DISCOVERY_RECOVERY = "DISCOVERY_RECOVERY"
EVIDENCE_ASSEMBLED = "EVIDENCE_ASSEMBLED"
POLICY_EVAL = "POLICY_EVAL"
MANIFEST_FROZEN = "MANIFEST_FROZEN"
INTENT_DURABLE = "INTENT_DURABLE"
EXECUTION = "EXECUTION"
EXECUTION_RECOVERY = "EXECUTION_RECOVERY"
OBSERVATION = "OBSERVATION"
VERIFICATION = "VERIFICATION"
PASS_CLOSED = "PASS_CLOSED"
PASS_HALTED = "PASS_HALTED"
PASS_ABORTED = "PASS_ABORTED"
TERMINAL_STATES = (PASS_CLOSED, PASS_HALTED, PASS_ABORTED)

# Transition table: (from_state, event) -> to_state. Anything not listed
# is INVALID and raises; the engine never silently no-ops.
_TRANSITIONS = {
    (PASS_CREATED, "pass_start"): DISCOVERY,
    (DISCOVERY, "probe_timeout"): DISCOVERY_RECOVERY,
    (DISCOVERY, "suspect_enumeration"): DISCOVERY_RECOVERY,
    (DISCOVERY, "auth_failed"): EVIDENCE_ASSEMBLED,
    (DISCOVERY, "discovery_done"): EVIDENCE_ASSEMBLED,
    (DISCOVERY_RECOVERY, "retry_discovery"): DISCOVERY,
    (DISCOVERY_RECOVERY, "recovery_exhausted"): EVIDENCE_ASSEMBLED,
    (EVIDENCE_ASSEMBLED, "policy_start"): POLICY_EVAL,
    (POLICY_EVAL, "guard_fail_closed"): PASS_ABORTED,
    (POLICY_EVAL, "ledger_fail_closed"): PASS_ABORTED,
    (POLICY_EVAL, "policy_done"): MANIFEST_FROZEN,
    (MANIFEST_FROZEN, "manifest_empty"): OBSERVATION,
    (MANIFEST_FROZEN, "manifest_ready"): INTENT_DURABLE,
    (INTENT_DURABLE, "intents_written"): EXECUTION,
    (INTENT_DURABLE, "intent_write_failed"): PASS_ABORTED,
    (EXECUTION, "leg_done"): EXECUTION,
    (EXECUTION, "leg_failed"): EXECUTION_RECOVERY,
    (EXECUTION, "restriction_signal"): PASS_HALTED,
    (EXECUTION, "dependency_down"): OBSERVATION,
    (EXECUTION, "execution_done"): OBSERVATION,
    (EXECUTION_RECOVERY, "execution_recovered"): EXECUTION,
    (EXECUTION_RECOVERY, "leg_skipped"): EXECUTION,
    (EXECUTION_RECOVERY, "execution_exhausted"): OBSERVATION,
    (OBSERVATION, "observation_done"): VERIFICATION,
    (VERIFICATION, "verify_done"): PASS_CLOSED,
    (PASS_HALTED, "pass_close"): PASS_CLOSED,
    (PASS_ABORTED, "pass_close"): PASS_CLOSED,
}

# Recovery budgets (numeric owner: ~/workspace/pig-fb/recovery-budgets.json).
MAX_DISCOVERY_RETRIES = 3

# Terminal pass classes (the pass-classifier vocabulary, now deterministic).
PASS_CLASSES = (
    "SUCCESS_ACTION",
    "SUCCESS_EMPTY",
    "ENUMERATION_FAILURE",
    "ELIGIBILITY_EMPTY",
    "DEPENDENCY_FAILURE",
    "AUTH_FAILURE",
    "SURFACE_DRIFT",
    "RATE_LIMIT",
    "TEMPORARY_FAILURE",
    "TERMINAL_FAILURE",
)
FAILURE_CLASSES = (
    "ENUMERATION_FAILURE", "DEPENDENCY_FAILURE", "AUTH_FAILURE",
    "RATE_LIMIT", "TEMPORARY_FAILURE", "TERMINAL_FAILURE",
)

# Cap table snapshot 2026-09-27. The cron bodies remain authoritative until
# sequenced to read this table; until then this is the snapshot the engine
# and the panel use for cap accounting.
CAPS_SNAPSHOT = {
    "instagram": {"like": 55, "comment": 15},
    "facebook": {"like": 75, "comment": 20},
    "threads": {"like": 45, "comment": 12},
    "tiktok": {"like": 60, "comment": 20},
    "x": {"follow": 5, "comment": 3, "like": 10},
}
PLATFORM_ACTIONS = {
    "instagram": ("like", "comment"),
    "facebook": ("like", "comment"),
    "threads": ("like", "comment"),
    "tiktok": ("like", "comment"),
    "x": ("follow", "comment", "like"),
}

# Actions that require a post URL as evidence. follow needs an account.
URL_REQUIRED_ACTIONS = ("like", "comment")


# ------------------------------------------------------- machinery wiring
_guard_mod = None
_ledger_mod = None


def _load_guard():
    """Load engagement-guard.py for its check() and index. Pure helpers
    only; no audit writes. Raises on any problem (callers fail closed)."""
    global _guard_mod
    if _guard_mod is None:
        path = os.path.join(_HERE, "engagement-guard.py")
        spec = importlib.util.spec_from_file_location(
            "engagement_guard_policy_mod", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _guard_mod = mod
    return _guard_mod


def _load_ledger():
    """Load action-intent-ledger.py for its fold + refuse semantics.
    Raises on any problem (callers fail closed)."""
    global _ledger_mod
    if _ledger_mod is None:
        path = os.path.join(_HERE, "action-intent-ledger.py")
        spec = importlib.util.spec_from_file_location(
            "action_intent_ledger_policy_mod", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _ledger_mod = mod
    return _ledger_mod


def _utcnow():
    return datetime.now(timezone.utc).isoformat()


# ------------------------------------------------------- pass context
def new_pass_context(platform, pass_id, caps=None):
    """Fresh deterministic context for one pass. Flags are set only by
    transition() event payloads, never inferred."""
    if platform not in PLATFORMS:
        raise ValueError("unknown platform %r" % platform)
    return {
        "platform": platform,
        "pass_id": pass_id,
        "caps": dict(caps) if caps is not None
        else dict(CAPS_SNAPSHOT[platform]),
        "discovery_attempts": 0,
        "enumeration_failed": False,
        "auth_failed": False,
        "dependency_failed": False,
        "guard_fail_closed": False,
        "ledger_fail_closed": False,
        "intent_write_failed": False,
        "restriction": None,          # None | "restriction" | "checkpoint"
        "surface_drift": False,
        "terminal_failure": False,
        "candidates": 0,
        "eligible": 0,
        "manifest_actions": 0,
        "actions_landed": 0,
        "violations": 0,
    }


def transition(state, event, ctx=None, payload=None):
    """Apply one pass-lifecycle transition. Returns the new state.

    Raises ValueError on an invalid (state, event) pair: the engine never
    silently no-ops. Updates ctx flags from the event payload where the
    spec assigns meaning (discovery attempts, restriction kind, counts).
    """
    key = (state, event)
    if key not in _TRANSITIONS:
        raise ValueError(
            "invalid pass transition: %s --%s--> ?" % (state, event))
    new_state = _TRANSITIONS[key]
    payload = payload or {}
    if ctx is not None:
        if event == "retry_discovery":
            if ctx["discovery_attempts"] >= MAX_DISCOVERY_RETRIES:
                raise ValueError(
                    "discovery retry budget exhausted (%d); use "
                    "recovery_exhausted" % MAX_DISCOVERY_RETRIES)
            ctx["discovery_attempts"] += 1
        if event == "recovery_exhausted":
            ctx["enumeration_failed"] = True
        if event == "auth_failed":
            ctx["auth_failed"] = True
        if event == "restriction_signal":
            kind = payload.get("kind", "restriction")
            if kind not in ("restriction", "checkpoint"):
                raise ValueError("unknown restriction kind %r" % kind)
            ctx["restriction"] = kind
        if event == "dependency_down":
            ctx["dependency_failed"] = True
        if event == "guard_fail_closed":
            ctx["guard_fail_closed"] = True
        if event == "ledger_fail_closed":
            ctx["ledger_fail_closed"] = True
        if event == "intent_write_failed":
            ctx["intent_write_failed"] = True
        for count_key in ("candidates", "eligible", "manifest_actions",
                          "actions_landed", "violations"):
            if count_key in payload:
                ctx[count_key] = payload[count_key]
        if payload.get("surface_drift"):
            ctx["surface_drift"] = True
        if payload.get("terminal_failure"):
            ctx["terminal_failure"] = True
    return new_state


def classify_pass_terminal(ctx):
    """Deterministic terminal pass class from the pass context flags.

    Order matters and is fixed: restriction/auth outrank landing counts,
    fail-closed aborts outrank empty outcomes, and anything unclassified
    is TEMPORARY_FAILURE (never an invented success).
    """
    if ctx.get("terminal_failure"):
        return "TERMINAL_FAILURE"
    if ctx.get("restriction") == "checkpoint" or ctx.get("auth_failed"):
        return "AUTH_FAILURE"
    if ctx.get("restriction") == "restriction":
        return "RATE_LIMIT"
    if ctx.get("dependency_failed"):
        return "DEPENDENCY_FAILURE"
    if ctx.get("enumeration_failed"):
        return "ENUMERATION_FAILURE"
    if ctx.get("guard_fail_closed") or ctx.get("ledger_fail_closed") \
            or ctx.get("intent_write_failed"):
        return "TEMPORARY_FAILURE"
    if ctx.get("surface_drift"):
        return "SURFACE_DRIFT"
    if ctx.get("actions_landed", 0) > 0:
        return "SUCCESS_ACTION"
    if ctx.get("candidates", 0) == 0:
        return "SUCCESS_EMPTY"
    if ctx.get("eligible", 0) == 0:
        return "ELIGIBILITY_EMPTY"
    if ctx.get("manifest_actions", 0) > 0 and ctx.get("actions_landed", 0) == 0:
        return "TEMPORARY_FAILURE"
    return "TEMPORARY_FAILURE"


# ------------------------------------------------------- candidate eval
def _guard_decision_to_reason(g, decision, reason):
    if decision == g.ELIGIBLE:
        return None
    if decision == g.ALREADY_ENGAGED:
        return "ALREADY_ENGAGED"
    if decision == g.BLOCKED:
        return "BLOCKED_AMBIGUOUS"
    return "GUARD_UNCHECKABLE"


def evaluate_candidates(candidates, platform, pass_id, caps=None,
                        inrun_pairs=None):
    """Run the deterministic candidate pipeline.

    candidates: list of {account, url, action} (+ anything else, ignored).
    Returns (decisions, caps_remaining, pass_abort).

    decisions: [{account, url, action, decision, reason_code, evidence}].
    pass_abort: True when the pass must abort fail-closed (guard or ledger
    unreadable). Every candidate is still classified so the abort is
    truthful, never silent.
    """
    if platform not in PLATFORMS:
        raise ValueError("unknown platform %r" % platform)
    allowed = PLATFORM_ACTIONS[platform]
    caps = dict(caps) if caps is not None else dict(CAPS_SNAPSHOT[platform])
    inrun = set(inrun_pairs) if inrun_pairs else set()

    # GUARD_EVAL input: the durable history index. Unreadable -> every
    # candidate GUARD_FAIL_CLOSED and the pass aborts.
    try:
        g = _load_guard()
        index = g.load_index()
        guard_ok, guard_err = True, None
    except Exception as e:  # noqa: BLE001 - fail closed on ANY problem
        g, index, guard_ok, guard_err = None, None, False, str(e)

    # REFUSE_EVAL input: the ledger fold. Unreadable -> every candidate
    # LEDGER_FAIL_CLOSED and the pass aborts.
    unknown = []
    try:
        L = _load_ledger()
        gh = L.guard_helpers()
        records = L._read_records()
        states = L._derive(records)
        live = {pass_id}
        unknown = [s for s in L._open_intents(states, platform)
                   if L._is_unknown(s, live)]
        ledger_ok, ledger_err = True, None
    except Exception as e:  # noqa: BLE001 - fail closed on ANY problem
        L, gh, ledger_ok, ledger_err = None, None, False, str(e)

    decisions = []
    pass_abort = False
    for c in candidates:
        account = c.get("account")
        url = c.get("url")
        action = c.get("action")
        d = {"account": account, "url": url, "action": action,
             "decision": REJECTED, "reason_code": None, "evidence": {}}

        # 1. GUARD_EVAL
        if not guard_ok:
            d["reason_code"] = "GUARD_FAIL_CLOSED"
            d["evidence"] = {"error": guard_err}
            pass_abort = True
            decisions.append(d)
            continue
        try:
            gdec, greason = g.check(index, platform, account, url)
        except Exception as e:  # noqa: BLE001 - fail closed
            d["reason_code"] = "GUARD_FAIL_CLOSED"
            d["evidence"] = {"error": str(e)}
            pass_abort = True
            decisions.append(d)
            continue
        mapped = _guard_decision_to_reason(g, gdec, greason)
        if mapped is not None:
            d["reason_code"] = mapped
            d["evidence"] = {"guard_reason": greason}
            decisions.append(d)
            continue

        # 2. REFUSE_EVAL
        if not ledger_ok:
            d["reason_code"] = "LEDGER_FAIL_CLOSED"
            d["evidence"] = {"error": ledger_err}
            pass_abort = True
            decisions.append(d)
            continue
        hits = [s for s in unknown
                if L._matches(gh, s["intent"], platform, account, action,
                              url)]
        if hits:
            h = hits[0]["intent"]
            d["reason_code"] = "UNKNOWN_EXECUTION_OPEN"
            d["evidence"] = {"intent_id": h["intent_id"],
                             "intent_pass_id": h.get("pass_id"),
                             "intent_ts": h.get("ts")}
            decisions.append(d)
            continue

        # 3. EVIDENCE_EVAL
        if action in URL_REQUIRED_ACTIONS and not url:
            d["reason_code"] = "NO_EVIDENCE"
            d["evidence"] = {"missing": "post url"}
            decisions.append(d)
            continue
        if action == "follow" and not account:
            d["reason_code"] = "NO_EVIDENCE"
            d["evidence"] = {"missing": "account"}
            decisions.append(d)
            continue

        # 4. FORMAT_EVAL (platform format rules)
        if action not in allowed:
            d["reason_code"] = "INVALID_ACTION"
            d["evidence"] = {"allowed": list(allowed)}
            decisions.append(d)
            continue
        if platform == "x" and action in ("like", "comment"):
            pids = _x_post_ids(url)
            other = "comment" if action == "like" else "like"
            if any((p, other) in inrun for p in pids):
                d["reason_code"] = "PAIR_RULE_VIOLATION"
                d["evidence"] = {"post_ids": sorted(pids)}
                decisions.append(d)
                continue

        # 5. CAP_EVAL
        if caps.get(action, 0) <= 0:
            d["reason_code"] = "CAP_EXHAUSTED"
            d["evidence"] = {"caps_remaining": dict(caps)}
            decisions.append(d)
            continue
        caps[action] -= 1
        d["decision"] = SELECTED
        d["reason_code"] = "SELECTED"
        d["evidence"] = {"caps_remaining": dict(caps)}
        decisions.append(d)
        if platform == "x" and action in ("like", "comment"):
            for p in _x_post_ids(url):
                inrun.add((p, action))
    return decisions, caps, pass_abort


def _x_post_ids(url):
    """Post ids from an X URL, using the guard's own regexes."""
    g = _load_guard()
    ids = set()
    if url:
        for m in g.X_URL_RE.finditer(url):
            ids.add("x:%s" % m.group(2))
    return ids


# ------------------------------------------------------- manifest check
def validate_manifest(actions, platform):
    """Deterministic schema check for a closed action set, run BEFORE the
    guard filter. Returns a list of error strings (empty = valid).

    Encodes the rules that used to live as prose in builder prompts:
    - every action has the evidence its type requires
    - action is in the platform's action set
    - facebook: the "page" descriptor is UNIQUE per post within the job
      (the guard's within-pass dedup keys on it; duplicates silently
      strip all but the first)
    - x: no like+comment on the same post in one job
    """
    errors = []
    if platform not in PLATFORMS:
        return ["unknown platform %r" % platform]
    allowed = PLATFORM_ACTIONS[platform]
    seen_pages = {}
    seen_pairs = set()
    for i, a in enumerate(actions):
        tag = "action[%d]" % i
        account = a.get("account") or a.get("page") or a.get("handle")
        url = a.get("url")
        action = a.get("type") or a.get("action")
        if action not in allowed:
            errors.append("%s: invalid action %r (allowed: %s)"
                          % (tag, action, ",".join(allowed)))
            continue
        if action in URL_REQUIRED_ACTIONS and not url:
            errors.append("%s: %s requires a post url" % (tag, action))
        if action == "follow" and not account:
            errors.append("%s: follow requires an account" % tag)
        if platform == "facebook":
            page = a.get("page")
            if page:
                if page in seen_pages:
                    errors.append(
                        "%s: duplicate page descriptor %r (first seen at "
                        "action[%d]); the guard dedups on this string and "
                        "would strip all but the first"
                        % (tag, page, seen_pages[page]))
                else:
                    seen_pages[page] = i
        if platform == "x" and action in ("like", "comment"):
            for p in _x_post_ids(url):
                key = (p, action)
                other = (p, "comment" if action == "like" else "like")
                if other in seen_pairs:
                    errors.append(
                        "%s: like+comment on the same post %s in one job "
                        "(pair rule)" % (tag, p))
                seen_pairs.add(key)
    return errors


# ------------------------------------------------------- event builders
def pass_event(pass_id, platform, event_type, data):
    """Build one MC_PASS_* journal envelope (pure dict; the caller
    appends). event_id is content-derived so emission is idempotent:
    re-emitting the same stage event yields the same id."""
    if not event_type.startswith("MC_PASS_"):
        raise ValueError("pass events must be MC_PASS_*, got %r"
                         % event_type)
    canonical = json.dumps(data, sort_keys=True, separators=(",", ":"))
    seed = "|".join([pass_id, platform, event_type, canonical])
    event_id = "mc-pass-" + hashlib.sha256(seed.encode("utf-8")).hexdigest()[:12]
    return {
        "event_id": event_id,
        "timestamp": _utcnow(),
        "event_type": event_type,
        "aggregate_id": "mc:pass:%s:%s" % (platform, pass_id),
        "aggregate_type": "mc_pass",
        "event_data": dict(data, platform=platform, pass_id=pass_id),
    }


def candidates_event(pass_id, platform, decisions):
    """The batched MC_PASS_CANDIDATES event: one row per pass carrying the
    full decisions array, so WHY WAS THIS CANDIDATE REJECTED? is a scan
    of one event type."""
    eligible = sum(1 for d in decisions if d["decision"] == SELECTED)
    return pass_event(pass_id, platform, "MC_PASS_CANDIDATES", {
        "candidates": len(decisions),
        "eligible": eligible,
        "skipped": len(decisions) - eligible,
        "decisions": decisions,
    })
