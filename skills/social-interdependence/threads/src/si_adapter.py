#!/usr/bin/env python3
"""The Threads adapter: deliberately dumb.

Receives an authorized intent. Reads, executes, verifies, normalizes. It
NEVER chooses targets, sets policy or budgets, or declares canonical
success (only the verifier does, on a read-back observation).

Executor boundary (the ONLY place fixtures may live):
  - "fixture": node fixtures/fake_threads_executor.js <job.json>
               (implements the th-engage.js result protocol; used by tests)
  - "pig":     ~/workspace/pig-fb/run_th_pass.sh <job.json>
               (LIVE EXTERNAL EXECUTION: BLOCKED in this environment --
               no credentials here, Pig unreachable from here.)

Tab hygiene invariant: the live worker opens its OWN browser window
(CDP Target.createTarget newWindow) and closes it afterwards; it never
opens tabs in the user's window. The fixture records the same contract.
"""
import json
import os
import subprocess
from datetime import datetime, timezone

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURE_EXECUTOR = os.path.join(SKILL_DIR, "fixtures",
                                "fake_threads_executor.js")
PIG_RUNNER = "/home/hatch/workspace/pig-fb/run_th_pass.sh"

EXECUTOR = os.environ.get("SI_THREADS_EXECUTOR", "fixture")


class AdapterError(Exception):
    pass


def build_job(intent, envelope):
    """Translate one authorized intent into the closed action set the
    executor accepts. The action set is closed: type/account/url/marker,
    plus optional comment text."""
    action = {"type": intent["action"],
              "account": intent["authorized_account"],
              "url": intent["target_url"],
              "marker": intent.get("marker", intent["target_ref"])}
    if intent["action"] == "comment":
        text = intent.get("comment_text") or ""
        if not text.strip():
            raise AdapterError("comment intent without text: refusing")
        action["text"] = text
    lo, hi = envelope["temporal_constraints"]["inter_action_delay_sec"]
    return {"actions": [action], "minDelaySec": lo, "maxDelaySec": hi,
            "dispatch": {"intent_id": intent["intent_id"],
                         "executor": EXECUTOR,
                         "lease_id": intent.get("lease_id", ""),
                         "attempt": intent.get("attempt", 0) + 1,
                         "dispatched_at": datetime.now(
                             timezone.utc).isoformat()}}


def run_executor(job, workdir):
    """Invoke the executor boundary. Returns (result_dict, raw_stdout).
    A timeout or crash yields ok:false with infra set: UNKNOWN, never a
    fabricated success."""
    job_path = os.path.join(workdir, "job.json")
    with open(job_path, "w", encoding="utf-8") as f:
        json.dump(job, f, sort_keys=True)
    if EXECUTOR == "fixture":
        cmd = ["node", FIXTURE_EXECUTOR, job_path]
    elif EXECUTOR == "pig":
        cmd = [PIG_RUNNER, job_path]
    else:
        raise AdapterError("unknown executor %r" % EXECUTOR)
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True,
                              timeout=300)
    except subprocess.TimeoutExpired:
        return ({"ok": False, "infra": "executor_timeout",
                 "job_id": job_path, "actions": []}, "")
    out = (proc.stdout or "").strip()
    if not out:
        return ({"ok": False, "infra": "executor_empty_output",
                 "job_id": job_path, "actions": []}, proc.stderr or "")
    i = out.find("{")
    if i < 0:
        return ({"ok": False, "infra": "executor_unparseable",
                 "job_id": job_path, "actions": []}, out)
    try:
        result = json.JSONDecoder().raw_decode(out[i:])[0]
    except ValueError:
        return ({"ok": False, "infra": "executor_unparseable",
                 "job_id": job_path, "actions": []}, out)
    if not isinstance(result, dict) or "ok" not in result:
        return ({"ok": False, "infra": "executor_bad_schema",
                 "job_id": job_path, "actions": []}, out)
    return result, out


def normalize_result(result):
    """Normalize an executor result into the adapter's typed outcome. The
    adapter reports what the executor SAID; canonical success is decided
    only by verification (si_verify)."""
    if not result.get("ok"):
        infra = result.get("infra", "unknown")
        return {"executor_ok": False, "infra": infra,
                "external_effect": "unknown",
                "note": "executor did not complete: %s" % infra}
    actions = result.get("actions") or []
    if not actions:
        return {"executor_ok": True, "infra": None,
                "external_effect": "none_observed",
                "note": "executor ok, no actions reported"}
    a = actions[0]
    outcome = a.get("outcome")
    effect = a.get("external_effect", "unknown")
    base = {"flag": a.get("flag")}
    if outcome == "executed":
        r = {"executor_ok": True, "infra": None,
             "external_effect": effect, "note": a.get("note", ""),
             "claimed": True}
        r.update(base)
        return r
    if outcome == "already":
        r = {"executor_ok": True, "infra": None,
             "external_effect": "already_present",
             "note": a.get("note", ""), "claimed": False}
        r.update(base)
        return r
    r = {"executor_ok": True, "infra": None,
         "external_effect": effect,
         "note": "executor reported outcome=%s: %s"
                 % (outcome, a.get("note", "")),
         "claimed": outcome == "executed"}
    r.update(base)
    return r
