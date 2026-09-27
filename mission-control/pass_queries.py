#!/usr/bin/env python3
"""Pure journal query helpers for the pass-health panel's WHY-questions.

All functions are pure over journal rows (dicts with the journal
envelope): no I/O, no caching, no prose-log reads. They implement the
query logic in ~/workspace/orca-mc-convergence/PASS-HEALTH-EVENT-SCHEMA.md.

Honesty rules (O7/O8):
- A missing linked event is reported as missing, never guessed.
- No rejection match is "no rejection recorded", never "it was eligible".
- An action with no observation is UNKNOWN_EXECUTION, shown as unknown.
- A platform with no MC_PASS_CLOSED is "no pass data", never zeros.
"""

import json
from datetime import datetime, timedelta, timezone

FAILURE_CLASSES = frozenset({
    "ENUMERATION_FAILURE", "DEPENDENCY_FAILURE", "AUTH_FAILURE",
    "RATE_LIMIT", "TEMPORARY_FAILURE", "TERMINAL_FAILURE",
})


def load_journal(path):
    """Read journal rows from a JSONL file. Malformed lines are skipped
    (they are not journal facts); the skip count is returned."""
    rows, skipped = [], 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                skipped += 1
    return rows, skipped


def _pass_rows(rows, platform):
    prefix = "mc:pass:%s:" % platform
    return [r for r in rows
            if r.get("aggregate_type") == "mc_pass"
            and str(r.get("aggregate_id", "")).startswith(prefix)]


def _pass_id_of(row):
    agg = str(row.get("aggregate_id", ""))
    parts = agg.split(":")
    return parts[3] if len(parts) >= 4 else None


def latest_closed(platform, rows):
    """Latest MC_PASS_CLOSED for the platform, or None."""
    closed = [r for r in _pass_rows(rows, platform)
              if r.get("event_type") == "MC_PASS_CLOSED"]
    if not closed:
        return None
    return max(closed, key=lambda r: r.get("timestamp", ""))


def _event_by_type(platform, pass_id, rows, event_type):
    return [r for r in _pass_rows(rows, platform)
            if r.get("event_type") == event_type
            and _pass_id_of(r) == pass_id]


# ------------------------------------------------------- WHY DID IT STOP?
def why_did_it_stop(platform, rows):
    """Answer WHY DID IT STOP? from the journal only.

    Returns {"answer": str, "evidence": [event_ids], "pass_id": ...}.
    If the stop event is missing, the answer says so; it never guesses.
    """
    closed = latest_closed(platform, rows)
    if closed is None:
        return {"answer": "No MC_PASS_CLOSED for platform %r in the "
                          "journal: no pass data, not zero passes."
                          % platform,
                "evidence": [], "pass_id": None}
    d = closed.get("event_data", {}) or {}
    pid = d.get("pass_id") or _pass_id_of(closed)
    pclass = d.get("pass_class", "UNKNOWN")
    stop_kind = d.get("stop_kind", "completed")
    ev = [closed["event_id"]]

    if stop_kind == "restriction":
        rest = _event_by_type(platform, pid, rows, "MC_PASS_RESTRICTION")
        if not rest:
            return {"answer":
                    "Pass %s stopped by a restriction, but the "
                    "MC_PASS_RESTRICTION event is missing from the journal "
                    "for this pass: stop recorded, cause unknown."
                    % pid, "evidence": ev, "pass_id": pid}
        r = rest[-1].get("event_data", {}) or {}
        ev.append(rest[-1]["event_id"])
        return {"answer":
                "Stopped by %s at action %s of %s. Surfaced to %s at %s. "
                "Next pass resumes at ramped caps (caps are never halved)."
                % (r.get("kind", "restriction"),
                   r.get("at_action", "?"), r.get("of_actions", "?"),
                   r.get("surfaced_to", "Nolan"),
                   r.get("surfaced_at", "unknown")),
                "evidence": ev, "pass_id": pid}
    if stop_kind == "fail_closed":
        ab = _event_by_type(platform, pid, rows, "MC_PASS_ABORTED")
        if not ab:
            return {"answer":
                    "Pass %s aborted fail-closed, but the MC_PASS_ABORTED "
                    "event is missing from the journal: abort recorded, "
                    "reason unknown." % pid,
                    "evidence": ev, "pass_id": pid}
        a = ab[-1].get("event_data", {}) or {}
        ev.append(ab[-1]["event_id"])
        return {"answer":
                "Aborted fail-closed: %s. Zero engagement. Schedule stays "
                "on; the next pass retries."
                % a.get("reason_code", "UNKNOWN"),
                "evidence": ev, "pass_id": pid}
    if stop_kind == "empty":
        return {"answer":
                "Completed with zero actions: %s. %s candidates, %s "
                "eligible. Not a failure: an honest empty outcome."
                % (pclass, d.get("candidates", "?"),
                   d.get("eligible", "?")),
                "evidence": ev, "pass_id": pid}
    # completed: the pass did not stop early.
    return {"answer":
            "It did not stop early: pass %s completed %s/%s actions "
            "(pass class %s)."
            % (pid, d.get("actions_landed", "?"),
               d.get("caps_total", "?"), pclass),
            "evidence": ev, "pass_id": pid}


# ------------------------------------------------- WHY WAS THIS CANDIDATE REJECTED?
def _norm_identity(s):
    return (s or "").strip().lstrip("@").lower()


def why_was_candidate_rejected(platform, identity, rows, window_days=7,
                               now=None):
    """Newest MC_PASS_CANDIDATES decision matching the identity (handle or
    post URL), scanned newest-first over the window. Returns the match or
    the honest no-match message. Never "it was eligible"."""
    now = now or datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=window_days)).isoformat()
    want = _norm_identity(identity)
    cands = [r for r in _pass_rows(rows, platform)
             if r.get("event_type") == "MC_PASS_CANDIDATES"
             and r.get("timestamp", "") >= cutoff]
    cands.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    for row in cands:
        d = row.get("event_data", {}) or {}
        for dec in d.get("decisions", []) or []:
            acct = _norm_identity(dec.get("account"))
            url = _norm_identity(dec.get("url"))
            # url may be empty (e.g. follow candidates have no post URL);
            # an empty identity must never substring-match everything.
            match = (want == acct) or (
                bool(url) and (want in url or url in want))
            if want and match:
                rc = dec.get("reason_code", "UNKNOWN")
                ev = dec.get("evidence", {}) or {}
                if dec.get("decision") == "SELECTED":
                    answer = ("SELECTED in pass %s (not rejected). "
                              % (d.get("pass_id"),))
                elif rc == "ALREADY_ENGAGED":
                    answer = ("Rejected: already engaged. History ref: %s."
                              % ev.get("history_ref", "guard history"))
                elif rc == "UNKNOWN_EXECUTION_OPEN":
                    answer = ("Rejected: open intent %s from pass %s "
                              "reached EXECUTION with no observation. Needs "
                              "deliberate reconciliation; will not "
                              "auto-retry."
                              % (ev.get("intent_id", "?"),
                                 ev.get("intent_pass_id", "?")))
                elif rc == "CAP_EXHAUSTED":
                    answer = ("Rejected: pass cap for this action already "
                              "spent.")
                elif rc in ("GUARD_FAIL_CLOSED", "LEDGER_FAIL_CLOSED"):
                    answer = ("Rejected because the pass aborted fail-closed "
                              "(%s); nothing was eligible by design." % rc)
                else:
                    answer = "Rejected: %s." % rc
                return {"answer": answer,
                        "evidence": [row["event_id"]],
                        "pass_id": d.get("pass_id"),
                        "decision": dec.get("decision"),
                        "reason_code": rc}
    return {"answer": "No rejection recorded for %r in the last %d days. "
                      "It was either never a candidate or it was SELECTED."
                      % (identity, window_days),
            "evidence": [], "pass_id": None,
            "decision": None, "reason_code": None}


# ------------------------------------------------- WHAT DID THE BROWSER ACTUALLY DO?
def what_did_browser_do(platform, rows, pass_id=None):
    """Planned-vs-observed table for one pass (default: latest closed).

    One row per manifest action: planned -> observed terminal
    (EXECUTED / FAILED / NOT_ATTEMPTED / UNKNOWN_EXECUTION) + note.
    An action with no observation is UNKNOWN_EXECUTION, shown as unknown.
    """
    closed = latest_closed(platform, rows)
    if closed is None:
        return {"answer": "No MC_PASS_CLOSED for platform %r: no pass "
                          "data." % platform,
                "rows": [], "evidence": [], "pass_id": None}
    d = closed.get("event_data", {}) or {}
    pid = pass_id or d.get("pass_id") or _pass_id_of(closed)

    man = _event_by_type(platform, pid, rows, "MC_PASS_MANIFEST")
    if not man:
        return {"answer": "Pass %s has no MC_PASS_MANIFEST in the "
                          "journal: planned actions unknown." % pid,
                "rows": [], "evidence": [closed["event_id"]],
                "pass_id": pid}
    mdata = man[-1].get("event_data", {}) or {}
    actions = mdata.get("actions", []) or []

    obs = _event_by_type(platform, pid, rows, "MC_PASS_OBSERVATION")
    terminals = {}  # (account, action, url) -> (terminal, note)
    for o in obs:
        odata = o.get("event_data", {}) or {}
        for i in odata.get("intents", []) or []:
            key = (_norm_identity(i.get("account")),
                   i.get("action"), _norm_identity(i.get("url")))
            terminals[key] = (i.get("terminal", "UNKNOWN_EXECUTION"),
                              i.get("note"))

    exe = _event_by_type(platform, pid, rows, "MC_PASS_EXECUTION_DONE")
    restriction = "none"
    if exe:
        restriction = (exe[-1].get("event_data", {}) or {}
                       ).get("restriction", "none")

    table, unknown_open = [], 0
    for a in actions:
        key = (_norm_identity(a.get("account")), a.get("action"),
               _norm_identity(a.get("url")))
        terminal, note = terminals.get(key, ("UNKNOWN_EXECUTION", None))
        if terminal == "UNKNOWN_EXECUTION":
            unknown_open += 1
        table.append({"account": a.get("account"), "action": a.get("action"),
                      "url": a.get("url"), "terminal": terminal,
                      "note": note})
    ev = [man[-1]["event_id"]] + [o["event_id"] for o in obs]
    if exe:
        ev.append(exe[-1]["event_id"])
    answer = ("Pass %s: executor reported %d of %d manifest actions. "
              "Restriction: %s. Intents left open (unknown): %d."
              % (pid, len([t for t in table
                           if t["terminal"] == "EXECUTED"]),
                 len(table), restriction, unknown_open))
    return {"answer": answer, "rows": table, "evidence": ev,
            "pass_id": pid, "restriction": restriction,
            "unknown_open": unknown_open}


# ------------------------------------------------------- rollup derivations
def unknown_count_for_pass(platform, pass_id, rows):
    """Fold MC_PASS_INTENTS + MC_PASS_OBSERVATION for one pass_id.

    Returns {"unknown": int, "intents": int, "observed": int} or None when
    the pass has no MC_PASS_INTENTS event (unknown, not zero: the intent
    set is not visible to the journal). Until the ledger emits journal
    events, a missing INTENTS event means the count is UNKNOWN.
    """
    intents_ev = _event_by_type(platform, pass_id, rows, "MC_PASS_INTENTS")
    if not intents_ev:
        return None
    ids = set((intents_ev[-1].get("event_data", {}) or {}).get("intent_ids",
                                                               []) or [])
    seen = set()
    for o in _event_by_type(platform, pass_id, rows, "MC_PASS_OBSERVATION"):
        for i in (o.get("event_data", {}) or {}).get("intents", []) or []:
            if i.get("intent_id"):
                seen.add(i["intent_id"])
    open_ids = ids - seen
    return {"unknown": len(open_ids), "intents": len(ids),
            "observed": len(seen), "open_intent_ids": sorted(open_ids)}


def seven_day_rollup(platform, rows, now=None):
    """Windowed MC_PASS_CLOSED rollup. Returns None when the platform has
    no closed passes in the window (no data, not zeros)."""
    now = now or datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=7)).isoformat()
    closed = [r for r in _pass_rows(rows, platform)
              if r.get("event_type") == "MC_PASS_CLOSED"
              and r.get("timestamp", "") >= cutoff]
    if not closed:
        return None
    actions = sum((r.get("event_data", {}) or {}).get("actions_landed", 0)
                  for r in closed)
    failures = sum(1 for r in closed
                   if (r.get("event_data", {}) or {}).get("pass_class")
                   in FAILURE_CLASSES)
    # Blocks: a pass that hit a restriction mid-run and still closed
    # counts once, even when both the RATE_LIMIT class and a
    # MC_PASS_RESTRICTION event exist for it.
    blocked_passes = set()
    for r in closed:
        if (r.get("event_data", {}) or {}).get("pass_class") == "RATE_LIMIT":
            pid = (r.get("event_data", {}) or {}).get("pass_id") \
                or _pass_id_of(r)
            blocked_passes.add(pid)
    for r in _pass_rows(rows, platform):
        if r.get("event_type") == "MC_PASS_RESTRICTION" \
                and r.get("timestamp", "") >= cutoff \
                and ((r.get("event_data", {}) or {}).get("kind")
                     == "restriction"):
            blocked_passes.add(_pass_id_of(r))
    blocks = len(blocked_passes)
    unknown = 0
    unknown_known = True
    for r in closed:
        pid = (r.get("event_data", {}) or {}).get("pass_id") \
            or _pass_id_of(r)
        fold = unknown_count_for_pass(platform, pid, rows)
        if fold is None:
            unknown_known = False
        else:
            unknown += fold["unknown"]
    return {"passes": len(closed), "actions": actions,
            "failures": failures,
            "unknown": unknown if unknown_known else None,
            "blocks": blocks}
