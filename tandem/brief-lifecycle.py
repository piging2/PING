#!/usr/bin/env python3
"""brief-lifecycle.py: research brief lifecycle for the Meta AI tandem.

State machine (Nolan's automation-resilience program, 2026-09-17):
  PENDING -> RUNNING -> VALIDATING -> COMPLETE
  VALIDATION_FAILED -> RETRY -> TERMINAL_FAILURE -> QUARANTINED

State is DERIVED from authoritative sources, never stored separately:
  - runs.jsonl ledger (run outcomes, contract classifications)
  - ~/workspace/tandem/quarantine/<slug>.json (human-approved quarantine)

Key invariant: terminal failure of one brief NEVER stalls the rotation.
A brief at TERMINAL_FAILURE (RETRY_LIMIT consecutive contract rejections)
or QUARANTINED is skipped by next-brief.py until a human lifts it.

RETRY_LIMIT = 3: three consecutive contract rejections (~18h at 6h cadence)
distinguishes systematic from flaky with bounded wasted research. The
ingest engine independently concluded "systematic, not flaky" at 2.

The research contract (validate-research-contract.py) remains the sole
pass/fail gate. This module only reads its verdicts from the ledger.
Quarantine is human-gated: this module recommends, it never quarantines.

Usage:
  python3 brief-lifecycle.py --state <slug>      # print one brief's state
  python3 brief-lifecycle.py --all               # JSON: all cycle brief states
  python3 brief-lifecycle.py --effective-cycle    # JSON: cycle minus skipped
  python3 brief-lifecycle.py --check             # recommendations; exit 1 if
                                                 # a brief is TERMINAL without
                                                 # a quarantine record
Env overrides (tests): META_INTEL_LEDGER, TANDEM_QUARANTINE_DIR
"""
import json, os, sys
from datetime import datetime, timezone

STATES = ("PENDING", "RUNNING", "VALIDATING", "COMPLETE",
          "VALIDATION_FAILED", "RETRY", "TERMINAL_FAILURE", "QUARANTINED")

CYCLE = ["a-weak-website-hunt", "b-new-business-radar",
         "c-review-complaint-signals", "d-segment-deep-dive",
         "h-marketing-intelligence"]

RETRY_LIMIT = 3

LEDGER = os.environ.get("META_INTEL_LEDGER", os.path.expanduser(
    "~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl"))
QUARANTINE_DIR = os.environ.get("TANDEM_QUARANTINE_DIR", os.path.expanduser(
    "~/workspace/tandem/quarantine"))
RECOMMENDATIONS_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                   "lifecycle-recommendations.log")


def load_runs(ledger=LEDGER):
    with open(ledger) as f:
        return [json.loads(l) for l in f if l.strip()]


def quarantined_briefs(qdir=QUARANTINE_DIR):
    found = set()
    if os.path.isdir(qdir):
        for name in os.listdir(qdir):
            if name.endswith(".json"):
                try:
                    rec = json.load(open(os.path.join(qdir, name)))
                    # scope == "run" is a run-level quarantine: one failed run
                    # of the brief, recorded so a repeated failure on the same
                    # brief becomes an escalatable pattern. It is NOT a
                    # brief-level quarantine and must not remove the brief
                    # from rotation. Only brief-scope records (scope absent
                    # or any value other than "run") exclude the brief.
                    if rec.get("scope") == "run":
                        continue
                    if rec.get("state") == "QUARANTINED" and rec.get("brief_id"):
                        found.add(rec["brief_id"])
                except Exception:
                    continue  # a corrupt record quarantines nothing; --check flags it
    return found


def consecutive_contract_failures(runs, brief):
    """Count trailing contract-rejection failures for brief (chronological)."""
    n = 0
    for r in reversed(runs):
        if r.get("brief_id") != brief:
            continue
        if (r.get("classification") == "contract_rejected"
                or r.get("outcome") == "capture_failed" and
                   (r.get("validation") or {}).get("status") == "rejected"):
            n += 1
        else:
            break
    return n


def latest_run(runs, brief):
    for r in reversed(runs):
        if r.get("brief_id") == brief:
            return r
    return None


def brief_state(brief, runs, quarantined):
    """Derive the lifecycle state of one brief."""
    if brief in quarantined:
        return "QUARANTINED"
    if consecutive_contract_failures(runs, brief) >= RETRY_LIMIT:
        return "TERMINAL_FAILURE"
    r = latest_run(runs, brief)
    if r is None:
        return "PENDING"
    outcome = r.get("outcome")
    classification = r.get("classification")
    validation = r.get("validation") or {}
    if outcome in ("requested", "started"):
        return "RUNNING"
    if outcome == "ok" and validation.get("status") in (None, "passed"):
        return "COMPLETE"
    if (classification == "contract_rejected"
            or validation.get("status") == "rejected"):
        # VALIDATION_FAILED is the transition event recorded in history;
        # the derived steady state while within budget is RETRY.
        # (consecutive failures >= RETRY_LIMIT already returned
        # TERMINAL_FAILURE above.)
        return "RETRY"
    # Infra/other capture failure: retryable, does not consume contract budget
    return "PENDING"


def effective_cycle(runs=None, quarantined=None):
    """Cycle briefs the rotation may select: quarantined and terminal
    briefs are skipped. The rotation advances past them."""
    runs = runs if runs is not None else load_runs()
    quarantined = quarantined if quarantined is not None else quarantined_briefs()
    states = {b: brief_state(b, runs, quarantined) for b in CYCLE}
    skipped = {b: s for b, s in states.items()
               if s in ("QUARANTINED", "TERMINAL_FAILURE")}
    return [b for b in CYCLE if b not in skipped], states, skipped


def check_recommendations(runs=None, quarantined=None):
    """Human-gated recommendations. Never quarantines automatically."""
    eff, states, skipped = effective_cycle(runs, quarantined)
    recs = []
    for b, s in states.items():
        if s == "TERMINAL_FAILURE" and b not in (quarantined or set()):
            fails = consecutive_contract_failures(
                runs if runs is not None else load_runs(), b)
            recs.append({
                "type": "recommend_quarantine",
                "brief_id": b,
                "state": s,
                "consecutive_contract_failures": fails,
                "message": (f"{b} reached TERMINAL_FAILURE "
                            f"({fails} consecutive contract rejections, "
                            f"budget {RETRY_LIMIT}). Rotation is skipping it. "
                            f"Recommend human quarantine approval."),
            })
    # Quarantine records past retry eligibility: flag for reconsideration
    qdir = QUARANTINE_DIR
    now = datetime.now(timezone.utc)
    if os.path.isdir(qdir):
        for name in os.listdir(qdir):
            if not name.endswith(".json"):
                continue
            try:
                rec = json.load(open(os.path.join(qdir, name)))
            except Exception:
                recs.append({"type": "quarantine_record_unreadable",
                             "file": name,
                             "message": f"quarantine record {name} is not valid JSON; fix or remove."})
                continue
            elig = ((rec.get("quarantine_conditions") or {})
                    .get("next_retry_eligible_at"))
            if rec.get("state") == "QUARANTINED" and elig:
                try:
                    if datetime.fromisoformat(elig.replace("Z", "+00:00")) <= now:
                        recs.append({
                            "type": "quarantine_retry_eligible",
                            "brief_id": rec.get("brief_id"),
                            "message": (f"{rec.get('brief_id')} is past "
                                        f"next_retry_eligible_at ({elig}). "
                                        f"Eligible for reconsideration; "
                                        f"lift requires human approval.")})
                except Exception:
                    pass
    return {"effective_cycle": eff, "states": states, "skipped": skipped,
            "recommendations": recs}


def log_recommendations(recs):
    if not recs:
        return
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    new_lines = "".join(json.dumps({"at": ts, **r}) + "\n" for r in recs)
    existing = open(RECOMMENDATIONS_LOG).read() if os.path.exists(
        RECOMMENDATIONS_LOG) else ""
    tmp = RECOMMENDATIONS_LOG + ".new"
    with open(tmp, "w") as f:
        f.write(existing + new_lines)
    os.replace(tmp, RECOMMENDATIONS_LOG)


def main(argv):
    if "--state" in argv:
        slug = argv[argv.index("--state") + 1]
        runs = load_runs()
        print(brief_state(slug, runs, quarantined_briefs()))
        return 0
    if "--all" in argv:
        runs = load_runs()
        q = quarantined_briefs()
        print(json.dumps({b: brief_state(b, runs, q) for b in CYCLE}, indent=1))
        return 0
    if "--effective-cycle" in argv:
        eff, states, skipped = effective_cycle()
        print(json.dumps({"effective_cycle": eff, "states": states,
                          "skipped": skipped}, indent=1))
        return 0
    if "--check" in argv:
        result = check_recommendations()
        log_recommendations(result["recommendations"])
        print(json.dumps(result, indent=1))
        terminal_unquarantined = [r for r in result["recommendations"]
                                  if r["type"] == "recommend_quarantine"]
        return 1 if terminal_unquarantined else 0
    print(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
