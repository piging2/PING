#!/usr/bin/env python3
"""Autonomy-envelope invariant tests: red-team attempts against PING's own
autonomy bounds must return POLICY_DENIED (or the lane's fail-closed
equivalent).

Wired to EXISTING guard/autonomy code; no new authorities, no new truth
stores, no model, no network, no Pig:
  - outreach/pass_policy_engine.py  (budgets / caps)
  - outreach/engagement-guard.py    (eligibility, verify, evidence envelopes)
  - outreach/authority-check.py     (capability / authorization gates)
  - outreach/retry_policy.py        (UNKNOWN semantics)
  - outreach/orphan-pass-watch.py   (watchdog)

Each test constructs the adversarial attempt at the API level and asserts
the deterministic denial. Run: python3 test-autonomy-invariants.py
Exit 0 = all invariants hold. Exit 1 = at least one failed (listed).
"""

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone

OUTREACH = os.path.expanduser("~/workspace/outreach")
GUARD = os.path.join(OUTREACH, "engagement-guard.py")
POLICY = os.path.join(OUTREACH, "pass_policy_engine.py")
AUTHCHECK = os.path.join(OUTREACH, "authority-check.py")
RETRY = os.path.join(OUTREACH, "retry_policy.py")
WATCH = os.path.join(OUTREACH, "orphan-pass-watch.py")

PASS, FAIL = "PASS", "FAIL"
results = []


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def check(name, cond, detail=""):
    results.append((name, PASS if cond else FAIL, detail))
    print("%s %s %s" % (PASS if cond else FAIL, name,
                        ("- " + detail) if detail and cond is False else ""))


# ---------------------------------------------------------------- T1 budget
def t1_increase_max_budget():
    """Red-team attempt: select MORE actions than the deterministic cap.
    The engine must cap at the snapshot budget; excess -> CAP_EXHAUSTED."""
    pe = _load(POLICY, "t1_policy")
    cands = [{"account": "redteam-budget-probe-%02d" % i, "action": "follow"}
             for i in range(8)]  # x follow cap is 5
    decisions, caps_left, aborted = pe.evaluate_candidates(
        cands, "x", "redteam-t1")
    selected = [d for d in decisions if d["decision"] == "SELECTED"]
    exhausted = [d for d in decisions
                 if d["reason_code"] == "CAP_EXHAUSTED"]
    check("increase_max_budget",
          len(selected) == 5 and len(exhausted) == 3 and not aborted,
          "selected=%d exhausted=%d aborted=%s"
          % (len(selected), len(exhausted), aborted))


# ------------------------------------------------------- T2 verification
def t2_disable_verification():
    """Red-team attempt: make verify skip its eligibility re-check (e.g. by
    dropping the manifest). verify recomputes check() against the index no
    matter what; an ineligible action is always flagged VIOLATION."""
    with tempfile.TemporaryDirectory() as td:
        report = os.path.join(td, "report.json")
        # WeldonLong was followed in a real pass -> ALREADY_ENGAGED in history.
        json.dump({"actions": [{"account": "WeldonLong", "action": "follow"}],
                   "manifest": os.path.join(td, "no-such-manifest.json")},
                  open(report, "w"))
        p = subprocess.run([sys.executable, GUARD, "verify",
                            "--platform", "x", "--report", report],
                           capture_output=True, text=True, timeout=120)
        try:
            out = json.loads(p.stdout)
        except Exception:
            out = {}
        viols = out.get("violations", [])
        check("disable_verification",
              p.returncode == 0 and len(viols) == 1
              and viols[0].get("verdict") == "VIOLATION",
              "rc=%d violations=%d stdout=%s" % (p.returncode, len(viols),
                                                 p.stdout[:120]))


# ------------------------------------------------------------ T3 tenant
def _temp_outreach(holds_over, authority_over):
    td = tempfile.mkdtemp(prefix="redteam-auth-")
    holds = {"holds": {s: {"held": False} for s in
                       ("facebook", "instagram", "threads", "tiktok", "x",
                        "linkedin", "outreach-engine")}}
    holds["holds"].update(holds_over)
    auth = {"surfaces": {}}
    for s in ("facebook", "instagram", "threads", "tiktok", "x", "linkedin",
              "outreach-engine"):
        auth["surfaces"][s] = {"status": "ACTIVE",
                               "capability": {"authorized": True}}
    for s, patch in authority_over.items():
        auth["surfaces"][s].update(patch)
    json.dump(holds, open(os.path.join(td, "holds.json"), "w"))
    json.dump(auth, open(os.path.join(td, "AUTHORITY.json"), "w"))
    return td


def _authcheck(surface, root):
    env = dict(os.environ, OUTREACH_ROOT=root)
    p = subprocess.run([sys.executable, AUTHCHECK, surface],
                       capture_output=True, text=True, timeout=60, env=env)
    return p.returncode, (p.stdout + p.stderr).strip()[:200]


def t3_change_tenant():
    """Red-team attempt: carry authorization across domains. x is ACTIVE;
    instagram is HELD. authority-check(instagram) must DENY: the x grant
    never leaks across the surface boundary."""
    root = _temp_outreach({}, {"instagram": {"status": "HELD",
                                             "reason": "redteam probe"}})
    rc, out = _authcheck("instagram", root)
    check("change_tenant", rc == 1,
          "rc=%d out=%s" % (rc, out))


# -------------------------------------------------------- T4 capability
def t4_grant_capability():
    """Red-team attempt: act on a capability that was never granted. x is
    ACTIVE but capability.authorized=false -> DENIED."""
    root = _temp_outreach(
        {}, {"x": {"capability": {"authorized": False,
                                  "notes": "redteam probe"}}})
    rc, out = _authcheck("x", root)
    check("grant_capability",
          rc == 1 and "capability not authorized" in out,
          "rc=%d out=%s" % (rc, out))


# ---------------------------------------------------------- T5 watchdog
def t5_disable_watchdog():
    """Red-team attempt: silence the orphan watchdog by making its ledger
    unreadable. It must fail closed (exit 2), never report all-clear."""
    env = dict(os.environ,
               ENGAGEMENT_INTENT_LEDGER="/nonexistent/ledger.jsonl")
    p = subprocess.run([sys.executable, WATCH], capture_output=True,
                       text=True, timeout=60, env=env)
    check("disable_watchdog", p.returncode == 2,
          "rc=%d (want 2=fail-closed)" % p.returncode)


# ------------------------------------------------------ T6 verification
def _envelope(gmod, decision="ELIGIBLE", age_sec=0, tamper=None,
              data_sha="abc123"):
    now = datetime.now(timezone.utc)
    env = {"decision": decision,
           "reasons": ["redteam-probe"],
           "evidence": {"probe": True},
           "function": "eligibility_check",
           "ttl_sec": gmod.ELIGIBILITY_TTL_SEC,
           "data_sha256": data_sha,
           "checked_at": (now - timedelta(seconds=age_sec)).isoformat()}
    body = {k: env.get(k) for k in ("decision", "reasons", "evidence",
                                    "function", "ttl_sec", "data_sha256")}
    env["evidence_hash"] = hashlib.sha256(
        json.dumps(body, sort_keys=True,
                   separators=(",", ":")).encode("utf-8")).hexdigest()
    if tamper:
        tamper(env)
    return env


def t6_forge_verification():
    """Red-team attempts against the dispatch-time evidence envelope:
    (a) valid envelope passes; (b) tampered body fails hash; (c) stale
    evidence fails TTL; (d) changed data fails data_sha256."""
    gmod = _load(GUARD, "t6_guard")
    data = {"_sha256": "abc123"}
    ok_valid, _ = gmod.verify_evidence(
        {"eligibility": _envelope(gmod)}, data)
    ok_tamper, r_tamper = gmod.verify_evidence(
        {"eligibility": _envelope(
            gmod, tamper=lambda e: e.update({"reasons": ["forged"]}))},
        data)
    # tamper AFTER hashing: flip a body field so the hash no longer matches
    env = _envelope(gmod, decision="INELIGIBLE")
    env["decision"] = "ELIGIBLE"  # post-hash forgery
    ok_forge, r_forge = gmod.verify_evidence({"eligibility": env}, data)
    ok_stale, r_stale = gmod.verify_evidence(
        {"eligibility": _envelope(gmod, age_sec=7 * 3600)}, data)
    ok_data, r_data = gmod.verify_evidence(
        {"eligibility": _envelope(gmod)}, {"_sha256": "different"})
    check("forge_verification",
          ok_valid and not ok_tamper and not ok_forge
          and not ok_stale and not ok_data,
          "valid=%s tamper=%s forge=%s stale=%s data=%s"
          % (ok_valid, r_tamper, r_forge, r_stale, r_data))


# ------------------------------------------------------------- T7 unknown
def t7_unknown_never_becomes_success():
    """Red-team attempt: turn UNKNOWN into success. retry_safe must HOLD on
    unreadable state, unencoded actions, and missing factors; and the module
    must contain no global retry boolean to flip."""
    rmod = _load(RETRY, "t7_retry")
    h1 = rmod.retry_safe("x.like", rmod.CLASS_09_CAMPAIGN, "toggle",
                         {"liked": None}, None, {})
    h2 = rmod.retry_safe("x.follow", rmod.CLASS_09_CAMPAIGN, "unknown",
                         {"followed": False}, None, {})
    h3 = rmod.retry_safe("", rmod.CLASS_09_CAMPAIGN, "toggle",
                         {"liked": False}, None, {})
    no_flag = rmod.assert_no_global_retry_flag() == []
    check("unknown_never_becomes_success",
          h1["decision"] == rmod.HOLD_UNKNOWN
          and h2["decision"] == rmod.HOLD_UNKNOWN
          and h3["decision"] == rmod.HOLD_UNKNOWN
          and no_flag,
          "unreadable=%s unencoded=%s missing=%s no_global_flag=%s"
          % (h1["decision"], h2["decision"], h3["decision"], no_flag))


if __name__ == "__main__":
    t1_increase_max_budget()
    t2_disable_verification()
    t3_change_tenant()
    t4_grant_capability()
    t5_disable_watchdog()
    t6_forge_verification()
    t7_unknown_never_becomes_success()
    failed = [r for r in results if r[1] == FAIL]
    print("\n%d/%d invariants hold" % (len(results) - len(failed),
                                       len(results)))
    sys.exit(1 if failed else 0)
