#!/usr/bin/env python3
"""siig_learner.py: bounded self-improvement.

The learner tunes OPERATIONAL parameters only, inside constitutionally fixed
[min, max] bounds recorded here:
  inter_action_delay_sec  [60, 120]   (log rule: 60-120s human pacing)
  discovery_batch_size    [10, 50]
  retry_backoff_base_sec  [60, 300]
  vet_min_caption_len     [0, 280]

It may NOT touch: budgets, ceilings, eligibility data, envelopes,
authorized accounts, action types, verification requirements, or any
authority's state. NO_LEARNER_POLICY_SELF_MODIFICATION is enforced by file
placement: the learner writes only learner/shadow.json and
learner/canary.json. Promotion to learner/active.json happens only through
promote(), which runs the machine-verifiable gates:

  policy violations == 0, duplicate canonical actions == 0,
  unverified-success declarations == 0,
  unknown-outcome rate <= envelope.maximum_unknown_rate,
  failure rate <= envelope.maximum_failure_rate,
  canary metrics not worse than active metrics.

Promotion ladder: SHADOW (offline evaluation on pass history) -> CANARY
(bounded live subset) -> ACTIVE. Automatic rollback: the watchdog reverts
active.json to learner/last-known-good.json on regression. A learner
proposal outside the fixed bounds, or touching a forbidden key, is refused
and recorded as an out-of-envelope proposal.
"""
import copy
import os

from siig_common import (STATE_ROOT, atomic_write_json, read_json,
                         append_jsonl, iso_now)

BOUNDS = {
    "inter_action_delay_sec": (60, 120),
    "discovery_batch_size": (10, 50),
    "retry_backoff_base_sec": (60, 300),
    "vet_min_caption_len": (0, 280),
}

DEFAULTS = {
    "inter_action_delay_sec": 90,
    "discovery_batch_size": 25,
    "retry_backoff_base_sec": 120,
    "vet_min_caption_len": 0,
}

FORBIDDEN_KEYS = {"budget", "ceiling", "authorized_accounts", "action_types",
                  "verification", "envelope", "eligibility", "policy"}


def learner_dir():
    return os.path.join(STATE_ROOT, "learner")


def active_config():
    d = read_json(os.path.join(learner_dir(), "active.json"))
    if not isinstance(d, dict):
        return dict(DEFAULTS)
    cfg = dict(DEFAULTS)
    cfg.update({k: v for k, v in d.items() if k in BOUNDS})
    return cfg


def propose_shadow(params, proposed_by="learner"):
    """Learner writes a shadow proposal. Out-of-envelope proposals are
    refused, never silently clipped."""
    for key in params:
        if key in FORBIDDEN_KEYS:
            _log("out_of_envelope_proposal",
                 {"key": key, "reason": "forbidden key", "by": proposed_by})
            raise ValueError("learner proposal refused: forbidden key %s"
                             % key)
    for key, value in params.items():
        if key not in BOUNDS:
            _log("out_of_envelope_proposal",
                 {"key": key, "reason": "unknown key", "by": proposed_by})
            raise ValueError("learner proposal refused: unknown key %s"
                             % key)
        lo, hi = BOUNDS[key]
        if not (lo <= value <= hi):
            _log("out_of_envelope_proposal",
                 {"key": key, "value": value,
                  "bounds": [lo, hi], "by": proposed_by})
            raise ValueError(
                "learner proposal refused: %s=%r outside [%s, %s]"
                % (key, value, lo, hi))
    proposal = dict(DEFAULTS)
    proposal.update(params)
    proposal["_proposed_by"] = proposed_by
    proposal["_proposed_at"] = iso_now()
    atomic_write_json(os.path.join(learner_dir(), "shadow.json"), proposal)
    return proposal


def promote_shadow_to_canary():
    shadow = read_json(os.path.join(learner_dir(), "shadow.json"))
    if not shadow:
        raise ValueError("no shadow proposal to promote")
    atomic_write_json(os.path.join(learner_dir(), "canary.json"), shadow)
    _log("shadow_to_canary", {"at": iso_now()})
    return shadow


def promotion_gates(canary_metrics, active_metrics, envelope,
                    policy_violations=0, duplicate_canonical=0,
                    unverified_success=0):
    """Machine-verifiable promotion gates. Returns (ok, [failed gates])."""
    failed = []
    if policy_violations != 0:
        failed.append("policy_violations != 0")
    if duplicate_canonical != 0:
        failed.append("duplicate_canonical != 0")
    if unverified_success != 0:
        failed.append("unverified_success != 0")
    if (canary_metrics.get("unknown_rate", 1.0) >
            envelope.get("maximum_unknown_rate", 0.05)):
        failed.append("unknown_rate above ceiling")
    if (canary_metrics.get("failure_rate", 1.0) >
            envelope.get("maximum_failure_rate", 0.10)):
        failed.append("failure rate above ceiling")
    for k in ("unknown_rate", "failure_rate"):
        if canary_metrics.get(k, 0) > active_metrics.get(k, 0):
            failed.append("canary %s worse than active" % k)
    return (len(failed) == 0), failed


def promote_canary_to_active(canary_metrics, active_metrics, envelope,
                             policy_violations=0, duplicate_canonical=0,
                             unverified_success=0):
    ok, failed = promotion_gates(
        canary_metrics, active_metrics, envelope,
        policy_violations=policy_violations,
        duplicate_canonical=duplicate_canonical,
        unverified_success=unverified_success)
    if not ok:
        _log("promotion_refused", {"failed": failed})
        raise ValueError("promotion refused: %s" % "; ".join(failed))
    canary = read_json(os.path.join(learner_dir(), "canary.json"))
    prev = active_config()
    atomic_write_json(os.path.join(learner_dir(), "last-known-good.json"),
                      prev)
    atomic_write_json(os.path.join(learner_dir(), "active.json"), canary)
    _log("promoted_to_active", {"failed": [], "at": iso_now()})
    return canary


def rollback_to_last_known_good(reason):
    good = read_json(os.path.join(learner_dir(), "last-known-good.json"))
    if not good:
        _log("rollback_failed", {"reason": "no last-known-good recorded"})
        return False
    atomic_write_json(os.path.join(learner_dir(), "active.json"), good)
    _log("rollback", {"reason": reason, "at": iso_now()})
    return True


def _log(kind, detail):
    append_jsonl(os.path.join(learner_dir(), "learner.jsonl"),
                 {"at": iso_now(), "kind": kind, "detail": detail})
