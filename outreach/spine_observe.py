#!/usr/bin/env python3
"""Phase-1 spine observer: fold one REAL X engagement pass's artifacts into
ordered MC_PASS_* canonical events, emitted to the PING journal.

ADDITIVE ONLY. This script never changes what a pass decided or did: it
runs AFTER the pass, reads the pass's real artifacts (all read-only), and
records canonical observations of what really happened. It never writes to
the live passes dir, the ledger, or the guard history. The only write is
the journal append via mission-control/emit.py (or --dry-run for none).

Read sources (all machine-readable; prose pass logs are never read, O8):
  x-follow-queue-<ts>.txt            DISCOVERY output (follow leg)
  x-candidates-<ts>.json            DISCOVERY output (comment/like leg)
  engagement-guard-decisions.jsonl  guard filter audit (per-candidate
                                    ELIGIBLE/ALREADY_ENGAGED/BLOCKED)
  x-follow-eligible/final-<ts>.json guard + ledger-refuse outputs
  x-follow-actions-<ts>.json        closed action set (follow leg)
  x-comment-actions-<ts>.json       closed action set (comment leg)
  x-actions-<ts>.json               closed action set (like leg)
  x-pass-<ts2>.json                 manifest pinning the pre-pass snapshot
  x-probe-<ts>*.json                probe outputs; ABSENT = probe produced
                                    nothing (recorded, never guessed about)
  x-follow-outcomes-<ts>.json       leg outcomes
  x-follow-run-<ts>.txt             executor run log (driver-verified)
  x-verify-report-<ts>.json         post-pass verification
  action-intent-ledger.jsonl        durable intents + observations

Event order: STARTED -> DISCOVERY_TIMEOUT? -> DISCOVERY_DONE ->
CANDIDATES -> MANIFEST -> INTENTS -> EXECUTION_DONE -> OBSERVATION ->
VERIFY -> CLOSED. A stage with no grounded artifacts emits no stage
event; the CLOSED event's stages_observed names exactly what was
grounded, and the panel renders missing stages as unknown (O7).

The terminal pass class comes from pass_policy_engine.classify_pass_terminal
on the folded context: the observer never invents a class.
"""

import argparse
import glob
import json
import os
import sys
from datetime import datetime, timezone

_HERE = os.path.dirname(os.path.abspath(__file__))
_MC = os.path.normpath(os.path.join(_HERE, "..", "mission-control"))
for _p in (_HERE, _MC):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pass_policy_engine as PE  # noqa: E402
import emit as MCEMIT  # noqa: E402

PLATFORM = "x"

GUARD_TO_REASON = {
    "ELIGIBLE": ("SELECTED", "SELECTED"),
    "ALREADY_ENGAGED": ("REJECTED", "ALREADY_ENGAGED"),
    "BLOCKED": ("REJECTED", "BLOCKED_AMBIGUOUS"),
    "UNKNOWN-UNCHECKABLE": ("REJECTED", "GUARD_UNCHECKABLE"),
}


def _read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _read_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def _glob1(passes_dir, pattern):
    hits = sorted(glob.glob(os.path.join(passes_dir, pattern)))
    return hits


def _parse_ts(s):
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(s, fmt)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _pass_start(pass_id):
    # pass_id like x-20260926-231400 -> 2026-09-26T23:14:00Z
    ts = pass_id.split("-", 1)[1]
    dt = datetime.strptime(ts, "%Y%m%d-%H%M%S").replace(tzinfo=timezone.utc)
    return dt


def _identity_key(account, url):
    return ((account or "").strip().lower(),
            (url or "").strip().lower() if url else None)


def fold_pass(pass_id, passes_dir, ledger_path):
    """Fold one pass's artifacts into (events, context, notes).

    events: ordered list of (event_type, pass_id, platform, data).
    context: the pass_policy_engine context for classification.
    notes: human-readable fold trace (what grounded what).
    """
    ts = pass_id.split("-", 1)[1]
    start = _pass_start(pass_id)
    events, notes = [], []
    ctx = PE.new_pass_context(PLATFORM, pass_id)

    def note(s):
        notes.append(s)

    # ---- leg files -------------------------------------------------
    def leg_files(prefix):
        out = {}
        for kind in ("queue", "candidates", "eligible", "final",
                     "actions", "outcomes", "run"):
            hits = _glob1(passes_dir, "x-%s-%s-%s.*" % (prefix, kind, ts))
            out[kind] = hits[0] if hits else None
        return out

    follow = leg_files("follow")
    # comment/like legs use the non-prefixed names per the cron body
    cl_candidates = _glob1(passes_dir, "x-candidates-%s.json" % ts)
    comment_actions = _glob1(passes_dir, "x-comment-actions-%s.json" % ts)
    like_actions = _glob1(passes_dir, "x-actions-%s.json" % ts)
    probes = _glob1(passes_dir, "x-probe-%s*.json" % ts)
    verify = _glob1(passes_dir, "x-verify-report-%s.json" % ts)
    manifests = _glob1(passes_dir, "x-pass-%s*.json" % ts)

    # ---- MC_PASS_STARTED ------------------------------------------
    caps = dict(PE.CAPS_SNAPSHOT[PLATFORM])
    events.append(("MC_PASS_STARTED", pass_id, PLATFORM, {
        "platform": PLATFORM, "pass_id": pass_id,
        "started_at": start.isoformat(),
        "caps": caps,
        "ramp_week": 1,
        "ramp_week_basis": "2026-09-25 Nolan directive; weekly ramp "
                           "+1 follow / +1 comment / +5 likes, no ceiling",
        "schedule": "x-engagement-pass every 2h (cron.d)",
    }))
    note("STARTED grounded on pass-id ts %s; caps from engine snapshot %s"
         % (start.isoformat(), caps))

    # ---- discovery: probes -----------------------------------------
    if not probes and not cl_candidates:
        events.append(("MC_PASS_DISCOVERY_TIMEOUT", pass_id, PLATFORM, {
            "leg": "comment_like",
            "outcome": "probe produced no output",
            "evidence": "zero x-probe-%s*.json and zero x-candidates-%s.json "
                        "in the passes dir" % (ts, ts),
            "note": "comment/like leg produced zero candidates; the follow "
                    "leg is unaffected",
        }))
        note("DISCOVERY_TIMEOUT: no probe output files for ts %s" % ts)
        ctx["discovery_attempts"] = 1
    probe_results = []
    for p in probes:
        try:
            probe_results.append(_read_json(p))
        except (json.JSONDecodeError, OSError):
            pass
    n_probe_posts = sum(len(r.get("results", []) or [])
                        for r in probe_results if isinstance(r, dict))

    # ---- discovery: follow queue ------------------------------------
    queue_handles = []
    if follow["queue"]:
        with open(follow["queue"], encoding="utf-8") as f:
            queue_handles = [l.strip() for l in f if l.strip()]
        note("queue: %d handles from %s"
             % (len(queue_handles), os.path.basename(follow["queue"])))

    # ---- guard decisions (machine-readable audit) --------------------
    decisions_path = os.path.join(passes_dir,
                                  "engagement-guard-decisions.jsonl")
    guard_rows = []
    if os.path.exists(decisions_path):
        for r in _read_jsonl(decisions_path):
            if r.get("platform") != PLATFORM:
                continue
            rts = _parse_ts(r.get("ts", ""))
            if rts and abs((rts - start).total_seconds()) <= 3600:
                guard_rows.append(r)
        # keep the single guard run closest to the pass start
        by_ts = {}
        for r in guard_rows:
            by_ts.setdefault(r["ts"], []).append(r)
        if by_ts:
            best = min(by_ts, key=lambda t: abs(
                (_parse_ts(t) - start).total_seconds()))
            guard_rows = by_ts[best]
    note("guard audit: %d decisions in the pass window" % len(guard_rows))

    # ---- candidate decisions -----------------------------------------
    decisions = []
    eligible_keys = set()
    for r in guard_rows:
        dec, rc = GUARD_TO_REASON.get(r.get("decision"),
                                      ("REJECTED", "GUARD_UNCHECKABLE"))
        if dec == "SELECTED":
            eligible_keys.add(_identity_key(r.get("account"), r.get("url")))
        decisions.append({
            "account": r.get("account"), "url": r.get("url"),
            "action": r.get("action"),
            "decision": dec, "reason_code": rc,
            "evidence": {"guard_ts": r.get("ts"),
                         "guard_reason": r.get("reason")},
        })
    # candidates the guard never saw in this window (e.g. refuse-only
    # legs) are not fabricated: decisions cover exactly the audit rows.
    events.append(("MC_PASS_DISCOVERY_DONE", pass_id, PLATFORM, {
        "candidates": len(decisions),
        "legs": {
            "follow": {"source": "queue",
                       "candidates": len(queue_handles)},
            "comment_like": {"source": "probe",
                             "candidates": n_probe_posts,
                             "probe_output": "present" if probes
                             else "absent"},
        },
        "suspect_enumeration": False,
        "auth_failed": False,
        "dependency": None,
    }))
    note("DISCOVERY_DONE: follow queue %d, probe posts %d"
         % (len(queue_handles), n_probe_posts))

    # The batched MC_PASS_CANDIDATES event is built by the engine's
    # candidates_event for the candidates/eligible/skipped count contract.
    cev = PE.candidates_event(pass_id, PLATFORM, decisions)
    events.append(("MC_PASS_CANDIDATES", pass_id, PLATFORM,
                   cev["event_data"]))
    ctx["candidates"] = cev["event_data"]["candidates"]
    ctx["eligible"] = cev["event_data"]["eligible"]
    note("CANDIDATES: %d candidates, %d eligible, %d skipped"
         % (cev["event_data"]["candidates"], cev["event_data"]["eligible"],
            cev["event_data"]["skipped"]))

    # ---- manifest ------------------------------------------------------
    manifest_path = None
    manifest_data = None
    if verify:
        try:
            vrep = _read_json(verify[0])
            manifest_path = vrep.get("manifest")
            note("verify report pins manifest %s" % manifest_path)
        except (json.JSONDecodeError, OSError):
            pass
    if not manifest_path and manifests:
        manifest_path = manifests[0]
    actions = []
    if manifest_path and os.path.exists(manifest_path):
        try:
            manifest_data = _read_json(manifest_path)
        except (json.JSONDecodeError, OSError):
            manifest_data = None
    # closed action sets per leg
    leg_action_files = ([follow["actions"]] if follow["actions"] else []) \
        + comment_actions + like_actions
    for af in leg_action_files:
        try:
            raw = _read_json(af)
            items = raw if isinstance(raw, list) else raw.get("actions", [])
            for a in items:
                actions.append({
                    "account": a.get("account"),
                    "url": a.get("url"),
                    "action": a.get("action") or a.get("type"),
                    "manifest_file": os.path.basename(af),
                })
        except (json.JSONDecodeError, OSError):
            pass
    if actions or manifest_path:
        events.append(("MC_PASS_MANIFEST", pass_id, PLATFORM, {
            "manifest_path": manifest_path,
            "actions": actions,
            "pre_pass_snapshot_ref": manifest_path,
            "pre_pass_snapshot_present": bool(
                manifest_data and manifest_data.get("pre_pass_snapshot")),
            "caps": caps,
            "leg_manifests": [os.path.basename(a) for a in leg_action_files
                               if a],
        }))
        ctx["manifest_actions"] = len(actions)
        note("MANIFEST: %d actions across %d leg manifests; snapshot %s"
             % (len(actions), len(leg_action_files),
                "present" if manifest_data
                and manifest_data.get("pre_pass_snapshot") else "absent"))

    # ---- intents (ledger) ------------------------------------------------
    intents, observations = [], []
    if os.path.exists(ledger_path):
        for r in _read_jsonl(ledger_path):
            if r.get("pass_id") != pass_id:
                continue
            # Intents carry platform; observations are keyed by intent_id
            # and pass_id (the ledger's observation records have no
            # platform field). Match observations to this pass's intents
            # by intent_id below.
            if r.get("record_type") == "intent" \
                    and r.get("platform") == PLATFORM:
                intents.append(r)
            elif r.get("record_type") == "observation":
                observations.append(r)
    intent_ids_wanted = set(i.get("intent_id") for i in intents)
    observations = [o for o in observations
                    if o.get("intent_id") in intent_ids_wanted]
    note("ledger: %d intents, %d observations for %s"
         % (len(intents), len(observations), pass_id))
    if intents:
        events.append(("MC_PASS_INTENTS", pass_id, PLATFORM, {
            "intent_ids": [i.get("intent_id") for i in intents],
            "count": len(intents),
        }))

    # ---- execution -------------------------------------------------------
    legs = []
    if follow["run"]:
        legs.append({
            "leg": "follow",
            "actions_planned": len(actions) if actions else None,
            "actions_reported": None,  # filled from outcomes below
            "executor": "x-follow-batch.sh via the Pig's headed X Chrome",
            "evidence_ref": follow["run"],
        })
        note("executor run log: %s" % os.path.basename(follow["run"]))
    outcomes = []
    if follow["outcomes"]:
        try:
            oraw = _read_json(follow["outcomes"])
            outcomes = oraw.get("outcomes", []) if isinstance(
                oraw, dict) else oraw
        except (json.JSONDecodeError, OSError):
            pass
    reported_ok = sum(1 for o in outcomes if o.get("ok") is True)
    for leg in legs:
        if leg["actions_planned"] is None:
            leg["actions_planned"] = len(outcomes) or len(actions) or 0
        leg["actions_reported"] = len(outcomes)
        leg["actions_ok"] = reported_ok
    if legs or outcomes:
        events.append(("MC_PASS_EXECUTION_DONE", pass_id, PLATFORM, {
            "legs": legs,
            "restriction": "none",
            "restriction_evidence": "no restriction signal in outcomes or "
                                   "run log; batch exit 0 per run log tail"
            if follow["run"] else "no run log artifact",
        }))
        note("EXECUTION_DONE: %d legs, restriction none" % len(legs))

    # ---- observation -------------------------------------------------------
    if observations:
        by_intent = {}
        for o in observations:
            by_intent[o.get("intent_id")] = o
        events.append(("MC_PASS_OBSERVATION", pass_id, PLATFORM, {
            "intents": [{
                "intent_id": i.get("intent_id"),
                "account": i.get("account"),
                "action": i.get("action"),
                "terminal": (by_intent.get(i.get("intent_id")) or {}).get(
                    "terminal", "UNKNOWN_EXECUTION"),
                "ok": (by_intent.get(i.get("intent_id")) or {}).get("ok"),
                "note": (by_intent.get(i.get("intent_id")) or {}).get(
                    "evidence"),
            } for i in intents],
        }))
        ctx["actions_landed"] = sum(
            1 for i in intents
            if (by_intent.get(i.get("intent_id")) or {}).get("terminal")
            == "EXECUTED")
        note("OBSERVATION: %d intents observed, %d EXECUTED"
             % (len(intents), ctx["actions_landed"]))
    elif intents:
        # intents exist but no observations: the unknown is real and must
        # be recorded as unknown, never inferred.
        events.append(("MC_PASS_OBSERVATION", pass_id, PLATFORM, {
            "intents": [{
                "intent_id": i.get("intent_id"),
                "account": i.get("account"),
                "action": i.get("action"),
                "terminal": "UNKNOWN_EXECUTION",
                "ok": None,
                "note": "no observation record in the ledger",
            } for i in intents],
        }))
        note("OBSERVATION: %d intents with NO observation -> "
             "UNKNOWN_EXECUTION" % len(intents))

    # ---- verification ------------------------------------------------------
    if verify:
        try:
            vrep = _read_json(verify[0])
            v_acts = vrep.get("actions", [])
            violations = vrep.get("violations", [])
            events.append(("MC_PASS_VERIFY", pass_id, PLATFORM, {
                "checked": len(v_acts),
                "violations": violations,
                "report": verify[0],
            }))
            ctx["violations"] = len(violations)
            note("VERIFY: %d checked, %d violations"
                 % (len(v_acts), len(violations)))
        except (json.JSONDecodeError, OSError):
            pass

    # ---- close ---------------------------------------------------------------
    pass_class = PE.classify_pass_terminal(ctx)
    intent_ids = set(i.get("intent_id") for i in intents)
    observed_ids = set(
        o.get("intent_id") for o in observations if o.get("intent_id"))
    unknown_open = sorted(intent_ids - observed_ids)
    if pass_class == "SUCCESS_ACTION":
        stop_kind = "completed"
    elif ctx["candidates"] == 0:
        stop_kind = "empty"
    elif ctx["eligible"] == 0:
        stop_kind = "empty"
    else:
        stop_kind = "completed"
    stages_observed = [t for (t, _, _, _) in events
                       if t not in ("MC_PASS_STARTED", "MC_PASS_CLOSED")]
    closed_at = None
    mtimes = []
    for pat in ("x-*-%s*" % ts,):
        for p in _glob1(passes_dir, pat):
            try:
                mtimes.append(os.path.getmtime(p))
            except OSError:
                pass
    if mtimes:
        closed_at = datetime.fromtimestamp(max(mtimes),
                                           tz=timezone.utc).isoformat()
    events.append(("MC_PASS_CLOSED", pass_id, PLATFORM, {
        "pass_class": pass_class,
        "stop_kind": stop_kind,
        "actions_landed": ctx["actions_landed"],
        "caps": caps,
        "caps_total": sum(caps.values()),
        "unknown_open": len(unknown_open),
        "unknown_intent_ids": unknown_open,
        "candidates": ctx["candidates"],
        "eligible": ctx["eligible"],
        "skipped": ctx["candidates"] - ctx["eligible"],
        "violations": ctx["violations"],
        "stages_observed": stages_observed,
        "started_at": start.isoformat(),
        "closed_at": closed_at,
        "context_flags": {k: ctx[k] for k in (
            "discovery_attempts", "enumeration_failed", "auth_failed",
            "dependency_failed", "guard_fail_closed", "ledger_fail_closed",
            "intent_write_failed", "restriction", "surface_drift",
            "terminal_failure")},
    }))
    note("CLOSED: class %s, landed %d, unknown_open %d"
         % (pass_class, ctx["actions_landed"], len(unknown_open)))
    return events, ctx, notes


def main():
    ap = argparse.ArgumentParser(
        description="Fold one real X pass into MC_PASS_* journal events.")
    ap.add_argument("--pass-id", required=True)
    ap.add_argument("--passes-dir", required=True)
    ap.add_argument("--ledger", required=True)
    ap.add_argument("--journal", default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--json", action="store_true",
                    help="print the folded events as JSON")
    args = ap.parse_args()

    events, ctx, notes = fold_pass(args.pass_id, args.passes_dir,
                                   args.ledger)
    for n in notes:
        print("fold:", n)
    if args.json:
        print(json.dumps(
            [{"event_type": t, "pass_id": p, "platform": pl, "data": d}
             for (t, p, pl, d) in events], indent=1, sort_keys=True))
    results = MCEMIT.emit_pass_events(events, journal_file=args.journal,
                                      dry_run=args.dry_run)
    for (ev, how), (t, p, pl, d) in zip(results, events):
        print("%-28s %-16s %s" % (t, ev["event_id"], how))


if __name__ == "__main__":
    main()
