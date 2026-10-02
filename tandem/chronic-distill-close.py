#!/usr/bin/env python3
"""chronic-distill-close.py: enforce Nolan's 2026-09-26 DISTILL lifecycle rule.

Rule (authoritative per Nolan directive 2026-09-26, supersedes the earlier
"skip automatic chronic DISTILL closure" directive):
  A DISTILL gap (reconcile rule R2, step DISTILL) that
    - recurs across >= 4 consecutive reconciliation reports, AND
    - is >= 36 hours old, AND
    - remains unresolved (OPEN in the latest report)
  is recorded as a terminal `skipped` decision via mark-distill-closed.sh.

AGE SEMANTICS (Nolan tightening 2026-09-26 07:04 MDT): age is evaluated at
the QUALIFYING OBSERVATION's timestamp (the newest consecutive report's
checked_at), NOT at wall-clock decision time. A gap must already have been
>= 36h old when it was observed, so "nobody looked at it for another 24
minutes" can never change historical eligibility. If the observation
timestamp cannot be determined, age is unknown and the gap is not eligible
(fail closed).

Evidence preserved: the sidecar's transition log carries the close decision
with recurrence history, age, and authority. Reconciliation history and
gap-lifecycle.json are NEVER touched; the next reconcile run observes the
terminal sidecar and resolves the lifecycle record itself (R2 treats
`skipped:` as terminal; run_lifecycle moves detected-absent gaps to RESOLVED).

Scope is DISTILL gaps ONLY (step == "DISTILL"). No other gap/lifecycle type
is evaluated or affected.

Usage: chronic-distill-close.py [--apply] [--refusal-status]
  default is dry-run: prints eligible gaps and the exact command that would
  run. --apply executes mark-distill-closed.sh for each eligible gap.
  --refusal-status prints the refusal ledger and exits.
Exit codes: 0 ok (nothing eligible is also 0), 1 usage error, 2 a close was
refused/failed.

REFUSAL LOOP (Nolan directive 2026-09-30, convergence GO, unit R2):
  When --apply attempts a close and the close is REFUSED (answer file missing,
  or mark-distill-closed.sh exits nonzero), the refusal is recorded in the
  refusal ledger (tandem/chronic-distill-refusals.json) keyed by gap_key with
  a four-component fingerprint: source, evidence, disposition, semantics.
  After REFUSAL_THRESHOLD (3) CONSECUTIVE refusals for the same gap/evidence
  generation, exactly ONE decision request is emitted (stdout + JSON in
  tandem/decision-requests/) with options:
    MARK VERIFIED WITH EVIDENCE / SKIP THIS CLOSE / KEEP OPEN UNTIL <date-or-condition>.
  The counter is orchestration state, not truth: it resets (new generation)
  when the source changes, the evidence changes, the disposition changes, or
  the gap semantics change. It is NEVER used to auto-close: no refusal count
  can close a gap; only an explicit decision request resolution closes it.
  Dry-run never records refusals (no close was attempted).
"""
import datetime
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

HOME = os.path.expanduser("~")
REC_DIR = os.path.join(HOME, "workspace/tandem/reconciliation")
INTEL = os.path.join(HOME, "workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel")
CLOSER = os.path.join(HOME, "workspace/tandem/mark-distill-closed.sh")

MIN_CONSECUTIVE_REPORTS = 4
MIN_AGE_H = 36.0
AUTHORITY = "Nolan lifecycle directive 2026-09-26 (DISTILL chronic-gap auto-close)"

# Refusal loop (Nolan directive 2026-09-30). Consecutive refusals before one
# decision request is emitted. All paths are overridable via environment so
# tests can run against fixture directories.
REFUSAL_THRESHOLD = 3
REFUSAL_LEDGER_FILE = os.path.join(HOME, "workspace/tandem/chronic-distill-refusals.json")
DECISION_REQUESTS_DIR = os.path.join(HOME, "workspace/tandem/decision-requests")
DECISION_OPTIONS = [
    "MARK VERIFIED WITH EVIDENCE",
    "SKIP THIS CLOSE",
    "KEEP OPEN UNTIL <date-or-condition>",
]


def rec_dir():
    return os.environ.get("DISTILL_REC_DIR", REC_DIR)


def intel_dir():
    return os.environ.get("DISTILL_INTEL", INTEL)


def closer_path():
    return os.environ.get("DISTILL_CLOSER", CLOSER)


def refusal_ledger_path():
    return os.environ.get("DISTILL_REFUSAL_LEDGER", REFUSAL_LEDGER_FILE)


def decision_requests_dir():
    return os.environ.get("DISTILL_DECISION_REQUESTS_DIR", DECISION_REQUESTS_DIR)


def utcnow_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_reports():
    files = sorted(glob.glob(os.path.join(rec_dir(), "reconcile-2*.json")))
    files = [f for f in files if os.path.basename(f) != "LATEST.json"]
    out = []
    for f in files:
        try:
            out.append((f, json.load(open(f, encoding="utf-8"))))
        except Exception as e:
            print("warn: unreadable report %s: %s" % (f, e), file=sys.stderr)
    return out


def distill_gap_keys(report):
    """gap_key -> gap dict for DISTILL-step gaps in one report."""
    out = {}
    for g in report.get("gaps", []) or []:
        if g.get("step") == "DISTILL":
            out[g.get("gap_key")] = g
    return out


def parse_sidecar_ts(ts):
    # sidecar timestamp field: "20260924-202500" (UTC)
    try:
        t = datetime.datetime.strptime(ts, "%Y%m%d-%H%M%S")
        return t.replace(tzinfo=datetime.timezone.utc)
    except Exception:
        return None


def parse_report_ts(report, filename):
    """Qualifying observation timestamp: meta.checked_at, else filename."""
    ts = (report.get("meta") or {}).get("checked_at")
    if ts:
        try:
            t = datetime.datetime.fromisoformat(ts)
            return t if t.tzinfo else t.replace(tzinfo=datetime.timezone.utc)
        except Exception:
            pass
    m = re.search(r"reconcile-(\d{8})-(\d{6})", os.path.basename(filename))
    if m:
        try:
            t = datetime.datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S")
            return t.replace(tzinfo=datetime.timezone.utc)
        except Exception:
            pass
    return None


def gap_age_h(gap, obs_time, intel=None):
    """Age of the unresolved distill state, in hours, AT THE QUALIFYING
    OBSERVATION (obs_time), not at wall-clock decision time. Returns
    (age_hours, sidecar_path, sidecar) or (None, ...) when undeterminable."""
    if obs_time is None:
        return None, None, None
    base = intel if intel is not None else intel_dir()
    sidecar_path = os.path.join(base, gap.get("input", ""))
    try:
        sc = json.load(open(sidecar_path, encoding="utf-8"))
        t = parse_sidecar_ts(sc.get("timestamp", ""))
        if t:
            return (obs_time - t).total_seconds() / 3600.0, sidecar_path, sc
    except Exception as e:
        print("warn: cannot read sidecar %s: %s" % (sidecar_path, e),
              file=sys.stderr)
    # fallback: the reconciler's own age phrasing in the gap reason, computed
    # AT REPORT TIME, so use it as-is (no elapsed-since added).
    m = re.search(r"answer_captured for ([\d.]+)h", gap.get("reason", ""))
    if m:
        return float(m.group(1)), sidecar_path, None
    return None, sidecar_path, None


def consecutive_streak(reports, key):
    """Count of consecutive reports (newest backwards) containing key."""
    n = 0
    first = last = None
    for f, rep in reversed(reports):
        if key in distill_gap_keys(rep):
            n += 1
            last = last or os.path.basename(f)
            first = os.path.basename(f)
        else:
            break
    return n, first, last


def sidecar_terminal(sc):
    ing = str((sc or {}).get("ping_ingestion") or "")
    ver = (sc or {}).get("verification")
    return (ing in ("emitted", "ingested") or ing == "skipped"
            or ing.startswith("skipped:") or ver == "failed")


# ---------------------------------------------------------------------------
# Refusal loop (Nolan directive 2026-09-30). Pure orchestration state: it can
# request a human decision, never close a gap.
# ---------------------------------------------------------------------------

FINGERPRINT_COMPONENTS = ("source", "evidence", "disposition", "semantics")


def normalize_reason(reason):
    """Strip wall-clock age phrasing so the same evidence generation keeps
    the same fingerprint across reports. Only the report-time age changes;
    the underlying evidence does not."""
    return re.sub(r"answer_captured for [\d.]+h", "answer_captured for <AGE>h",
                  reason or "")


def transitions_signature(sc):
    tr = (sc or {}).get("transitions") or []
    sig = [(t.get("state"), t.get("at")) for t in tr if isinstance(t, dict)]
    return {"count": len(sig), "last": sig[-1] if sig else None}


def gap_fingerprint(gap, obs_time, intel=None):
    """Four-component identity of a gap/evidence generation. The refusal
    counter resets when ANY component changes:
      source:      where the gap came from (sidecar input + sidecar write ts)
      evidence:    what the evidence says (sidecar status/verification/
                   ingestion, normalized reason, transition history)
      disposition: the gap's lifecycle disposition in the report
      semantics:   what the gap IS (step + gap_key)
    """
    _age, _sc_path, sc = gap_age_h(gap, obs_time, intel=intel)
    sc = sc or {}
    return {
        "source": {
            "input": gap.get("input"),
            "sidecar_timestamp": sc.get("timestamp"),
        },
        "evidence": {
            "sidecar_status": sc.get("status"),
            "verification": sc.get("verification"),
            "ping_ingestion": sc.get("ping_ingestion"),
            "reason_normalized": normalize_reason(gap.get("reason")),
            "transitions": transitions_signature(sc),
        },
        "disposition": {
            "lifecycle": gap.get("lifecycle"),
            "state": gap.get("state"),
        },
        "semantics": {
            "step": gap.get("step"),
            "gap_key": gap.get("gap_key"),
        },
    }


def fingerprint_changes(old, new):
    """Names of fingerprint components that differ between generations."""
    return [c for c in FINGERPRINT_COMPONENTS if old.get(c) != new.get(c)]


def load_refusal_ledger():
    p = refusal_ledger_path()
    try:
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def save_refusal_ledger(ledger):
    p = refusal_ledger_path()
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(ledger, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, p)


def safe_key(key):
    return re.sub(r"[^A-Za-z0-9]+", "_", key or "gap").strip("_") or "gap"


def emit_decision_request(gap_key, entry):
    """Write exactly one decision request for a refusal-streaked gap and
    print it. This is the ONLY output of the refusal loop: it never closes,
    never writes a sidecar decision, never calls the closer."""
    d = decision_requests_dir()
    os.makedirs(d, exist_ok=True)
    req = {
        "type": "distill_refusal_decision_request",
        "gap_key": gap_key,
        "emitted_at": utcnow_iso(),
        "authority": "Nolan directive 2026-09-30 (R2 DISTILL refusal loop)",
        "consecutive_refusals": entry.get("count"),
        "refusal_history": entry.get("history", [])[-10:],
        "fingerprint": entry.get("fingerprint"),
        "options": DECISION_OPTIONS,
        "note": ("The DISTILL closer refused to close this gap %d consecutive "
                 "times with no change to source, evidence, disposition, or "
                 "semantics. This request is NOT an auto-close: the refusal "
                 "count can never close a gap. Resolve by choosing one option; "
                 "until then the gap stays open and the closer keeps refusing."
                 % entry.get("count", 0)),
    }
    fp_json = json.dumps(entry.get("fingerprint") or {}, sort_keys=True,
                     ensure_ascii=False, default=str)
    fp_hash = hashlib.sha256(fp_json.encode("utf-8")).hexdigest()[:8]
    fname = "distill-decision-request-%s-%s.json" % (safe_key(gap_key), fp_hash)
    path = os.path.join(d, fname)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(req, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    print("DECISION REQUEST (refusal loop, %d consecutive refusals): %s"
          % (entry.get("count", 0), gap_key))
    print("  options: " + " / ".join(DECISION_OPTIONS))
    print("  request file: " + path)
    print("  last refusal: " + str((entry.get("history") or [{}])[-1].get("reason")))
    return path


def record_refusal(gap_key, gap, obs_time, reason, intel=None):
    """Record one refused close attempt. Returns (count, changed, requested).
    - Same generation as the stored fingerprint: count += 1.
    - Any fingerprint component changed: new generation, count restarts at 1,
      decision_requested resets (the new generation may earn its own request).
    - count reaches REFUSAL_THRESHOLD and no request emitted yet: emit exactly
      one decision request.
    Never closes anything; never touches sidecars."""
    ledger = load_refusal_ledger()
    fp = gap_fingerprint(gap, obs_time, intel=intel)
    entry = ledger.get(gap_key)
    changed = fingerprint_changes(entry["fingerprint"], fp) if entry else None
    hist = {"at": utcnow_iso(), "reason": reason, "fingerprint_change": changed}
    requested = False
    if entry is None or changed:
        ledger[gap_key] = {
            "count": 1,
            "fingerprint": fp,
            "decision_requested": False,
            "history": [hist],
        }
        if changed:
            print("refusal loop: gap generation changed (%s); counter reset to 1: %s"
                  % (",".join(changed), gap_key))
        count = 1
    else:
        entry["count"] += 1
        entry["history"].append(hist)
        count = entry["count"]
        if count >= REFUSAL_THRESHOLD and not entry.get("decision_requested"):
            emit_decision_request(gap_key, entry)
            entry["decision_requested"] = True
            requested = True
        print("refusal loop: consecutive refusals %d/%d for %s"
              % (count, REFUSAL_THRESHOLD, gap_key))
    save_refusal_ledger(ledger)
    return count, changed, requested


def clear_refusal(gap_key):
    """A close that SUCCEEDED ends the refusal loop for that gap: drop the
    streak. Resolution, not refusal, is the only thing that clears state."""
    ledger = load_refusal_ledger()
    if gap_key in ledger:
        del ledger[gap_key]
        save_refusal_ledger(ledger)


def refusal_status_lines():
    ledger = load_refusal_ledger()
    if not ledger:
        return ["refusal ledger empty"]
    lines = []
    for key in sorted(ledger):
        e = ledger[key]
        lines.append("%s: %d consecutive refusals, decision_requested=%s, last=%s"
                     % (key, e.get("count"), e.get("decision_requested"),
                        (e.get("history") or [{}])[-1].get("at")))
    return lines


def main():
    apply = "--apply" in sys.argv[1:]
    if "--refusal-status" in sys.argv[1:]:
        for line in refusal_status_lines():
            print(line)
        return 0
    if any(a not in ("--apply",) for a in sys.argv[1:]):
        print("usage: chronic-distill-close.py [--apply] [--refusal-status]",
              file=sys.stderr)
        return 1
    reports = load_reports()
    if not reports:
        print("no reconciliation reports found", file=sys.stderr)
        return 1
    latest_file, latest = reports[-1]
    latest_gaps = distill_gap_keys(latest)
    obs_time = parse_report_ts(latest, latest_file)
    print("latest report: %s (%d DISTILL gaps open; observation time %s)"
          % (os.path.basename(latest_file), len(latest_gaps), obs_time))
    eligible = []
    for key, gap in sorted(latest_gaps.items()):
        streak, first, last = consecutive_streak(reports, key)
        age, sc_path, sc = gap_age_h(gap, obs_time)
        term = sidecar_terminal(sc) if sc else None
        status = []
        ok = True
        if streak < MIN_CONSECUTIVE_REPORTS:
            ok = False
            status.append("streak %d < %d" % (streak, MIN_CONSECUTIVE_REPORTS))
        else:
            status.append("streak %d reports (%s..%s)" % (streak, first, last))
        if age is None:
            ok = False
            status.append("age unknown")
        elif age < MIN_AGE_H:
            ok = False
            status.append("age %.1fh < %.0fh" % (age, MIN_AGE_H))
        else:
            status.append("age %.1fh" % age)
        if term:
            ok = False
            status.append("sidecar already terminal")
        print(("ELIGIBLE " if ok else "not eligible ") + key)
        print("   " + "; ".join(status))
        if ok:
            eligible.append((key, gap, streak, first, last, age, sc_path))
    if not eligible:
        print("nothing to close")
        return 0
    failures = 0
    for key, gap, streak, first, last, age, sc_path in eligible:
        stem = gap["input"]
        assert stem.endswith(".provenance.json"), stem
        answer = os.path.join(intel_dir(), stem[:-len(".provenance.json")] + ".md")
        reason = ("chronic-gap auto-close: DISTILL gap OPEN across %d consecutive "
                  "reconciliation reports (%s..%s); answer_captured for %.1fh "
                  "(>=%.0fh threshold). Terminal skip per %s. Evidence preserved: "
                  "sidecar transitions + reconciliation history; lifecycle record "
                  "resolves on next reconcile." %
                  (streak, first, last, age, MIN_AGE_H, AUTHORITY))
        cmd = [closer_path(), answer, "--by",
               "chronic-distill-close.py (%s)" % AUTHORITY,
               "--decision", "skipped:" + reason]
        if not apply:
            print("would run: " + " ".join(cmd))
            continue
        if not os.path.isfile(answer):
            reason = "refusing: answer file missing: %s" % answer
            print(reason, file=sys.stderr)
            record_refusal(key, gap, obs_time, reason)
            failures += 1
            continue
        r = subprocess.run(cmd, capture_output=True, text=True)
        print(r.stdout.strip())
        if r.returncode != 0:
            reason = "closer refused/failed for %s: %s" % (key, r.stderr.strip())
            print("FAILED " + reason, file=sys.stderr)
            record_refusal(key, gap, obs_time, reason)
            failures += 1
        else:
            clear_refusal(key)
    if not apply:
        print("dry-run: %d eligible, re-run with --apply to close" % len(eligible))
    return 2 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
