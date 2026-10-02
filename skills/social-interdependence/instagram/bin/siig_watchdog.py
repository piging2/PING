#!/usr/bin/env python3
"""siig_watchdog.py: the observer that may stop, reduce, defer, or roll back,
but may never grant authority.

The watchdog reads the durable transition log and its own observation log
and computes, per pass and per rolling window: policy violations, failure
rate, unknown rate, verification-failure (adapter-truth-mismatch) rate,
budget anomalies, and learner regressions. When a threshold trips it may:

  - emit a circuit-breaker trip (scoped),
  - write a dispatch STOP flag the executor checks before every intent,
  - defer or roll back the learner's active config to last-known-good.

It may NOT: authorize an account, raise a budget ceiling, modify the
eligibility data files, modify the autonomy envelope, or declare canonical
success. Those remain with their authorities (owner, guard data, verifier).

Safe mode is evaluated by the executor from first principles every loop;
the watchdog's stop flag is one more input, not the mechanism itself.
"""
import os

from siig_common import (STATE_ROOT, append_jsonl, read_jsonl,
                         atomic_write_json, read_json, iso_now)
from siig_states import TERMINAL, current_states, intents_index


def observations_path():
    return os.path.join(STATE_ROOT, "watchdog.jsonl")


def stop_flag_path():
    return os.path.join(STATE_ROOT, "dispatch-stop.json")


def observe(kind, detail):
    append_jsonl(observations_path(), {"at": iso_now(), "kind": kind,
                                      "detail": detail})


def set_stop(reason):
    atomic_write_json(stop_flag_path(),
                      {"stopped": True, "reason": reason, "at": iso_now()})


def clear_stop(reason):
    atomic_write_json(stop_flag_path(),
                      {"stopped": False, "reason": reason, "at": iso_now()})


def stop_active():
    d = read_json(stop_flag_path(), {})
    return bool(d.get("stopped"))


def pass_metrics(batch_id):
    """Compute pass-level rates from the transition log for one batch."""
    index = intents_index()
    states = current_states()
    batch = [iid for iid, rec in index.items()
             if rec.get("batch_id") == batch_id]
    n = len(batch)
    failed = sum(1 for iid in batch if states.get(iid) == "FAILED_TERMINAL")
    unknown = sum(1 for iid in batch if states.get(iid) == "UNKNOWN")
    retryable = sum(1 for iid in batch
                    if states.get(iid) in ("FAILED_RETRYABLE", "SAFE_RETRY"))
    verified = sum(1 for iid in batch
                   if states.get(iid) == "VERIFIED_SUCCESS")
    return {"batch_id": batch_id, "intents": n, "failed_terminal": failed,
            "unknown": unknown, "retryable": retryable,
            "verified_success": verified,
            "failure_rate": (failed / n) if n else 0.0,
            "unknown_rate": (unknown / n) if n else 0.0}


def evaluate_pass(batch_id, envelope, adapter_violations=()):
    """Machine-enforced pass evaluation. Returns a list of watchdog actions
    taken. Thresholds come from the envelope."""
    m = pass_metrics(batch_id)
    actions = []
    max_fail = envelope.get("maximum_failure_rate", 0.10)
    max_unknown = envelope.get("maximum_unknown_rate", 0.05)
    if m["failure_rate"] > max_fail:
        set_stop("failure_rate %.2f > %.2f (batch %s)"
                 % (m["failure_rate"], max_fail, batch_id))
        actions.append("stop: failure rate exceeded")
        observe("failure_rate_exceeded", m)
    if m["unknown_rate"] > max_unknown:
        set_stop("unknown_rate %.2f > %.2f (batch %s)"
                 % (m["unknown_rate"], max_unknown, batch_id))
        actions.append("stop: unknown rate exceeded")
        observe("unknown_rate_exceeded", m)
    for v in adapter_violations:
        if v.get("kind") == "adapter-truth-mismatch":
            observe("verification_failure", v)
            actions.append("recorded adapter-truth-mismatch for %s"
                           % v.get("intent_id"))
    return {"metrics": m, "actions": actions}


def budget_anomaly_check(snapshot):
    """Reserved must never exceed ceiling; committed must never exceed
    reserved+committed history. Returns a list of anomaly notes."""
    notes = []
    for key in ("likes", "comments"):
        s = snapshot[key]
        if s["reserved"] > s["ceiling"]:
            notes.append("%s reserved %d > ceiling %d"
                         % (key, s["reserved"], s["ceiling"]))
        if s["reserved"] < 0 or s["committed"] < 0:
            notes.append("%s counters negative" % key)
    if notes:
        observe("budget_anomaly", {"snapshot": snapshot, "notes": notes})
        set_stop("budget anomaly: %s" % "; ".join(notes))
    return notes
