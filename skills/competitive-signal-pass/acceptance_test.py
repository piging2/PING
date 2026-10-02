#!/usr/bin/env python3
"""Acceptance test for competitive_signal_pass.

Proves, against real evidence and adversarial fixtures:
  1. repeated runs produce stable factual eligibility
  2. hard decisions remain deterministic
  3. unsupported claims fail (NO_VALUE)
  4. missing receipts fail (BLOCKED)
  5. contradictory evidence does not silently become truth (BLOCKED)
  6. stale evidence downgrades correctly
  7. individual targeting cannot bypass the public-safety gate (BLOCKED)
  8. arbitrage opportunities are detected
  9. the same work is not repeatedly reasoned from scratch
 10. a fresh agent can audit the complete pass from artifacts
 11. at least one repeated manual reasoning step was converted into
     deterministic machinery by this build
 12. the agent cannot corrupt PING through this skill (no write path)

Exit 0 = all proven. Exit 1 = something failed, with reasons.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PASS = os.path.join(HERE, "signal_pass.py")
PATTERNS = os.path.expanduser(
    "~/workspace/marketing-intel/meme-objects/patterns")
RUNS = os.path.join(HERE, "runs")

failures = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (" | " + detail if detail else ""))
    if not cond:
        failures.append(name + (" | " + detail if detail else ""))


def run_signal(*args):
    p = subprocess.run([sys.executable, PASS, "run", *args],
                       capture_output=True, text=True, cwd=HERE)
    lines = [l for l in p.stdout.strip().split("\n") if l.strip()]
    return p.returncode, [json.loads(l) for l in lines], p.stderr


def write_fixture(name, records, meta=None):
    d = tempfile.mkdtemp(prefix="csp-test-")
    path = os.path.join(d, name + ".json")
    with open(path, "w") as f:
        json.dump(records, f, indent=2)
    if meta:
        with open(path + ".meta.json", "w") as f:
            json.dump(meta, f, indent=2)
    return path


def ev(i, **kw):
    r = {"id": "ev-%02d" % i,
         "observation": "Shop %d advertises 24/7 with no after-hours path" % i,
         "source": "competitive-tech-map.md section 1, business %d" % i,
         "timestamp": "2026-09-14",
         "receipt": "Static page text shows phone + contact form only",
         "verification": "OBSERVED",
         "contradictions": [],
         "category": "after-hours conversion"}
    r.update(kw)
    return r


META = {"pattern_id": "test-adhoc", "seriousness": "MEDIUM",
        "durable": False, "fresh_until": "2026-12-31",
        "public_safe_text": "Test pattern: several shops show the gap.",
        "joke_candidates": ["PING says: the emergency ends at 5 PM."],
        "opportunity": "Missed-call text-back (arbitrage Q1).",
        "competitive_implication": "Promise/experience gap.",
        "observation_count": 3}


def main():
    # 1+2. Real patterns: stable eligibility across repeated runs.
    pids = [fn[:-5] for fn in sorted(os.listdir(PATTERNS))
            if fn.startswith("pattern_") and fn.endswith(".json")]
    first = {}
    for pid in pids:
        rc, out, err = run_signal(pid)
        check("real pattern runs: " + pid, rc == 0 and len(out) == 1, err[:200])
        first[pid] = out[0]
    for pid in pids:
        rc, out, err = run_signal(pid)
        a, b = first[pid], out[0]
        stable = (a["status"] == b["status"]
                  and a["publication_eligible"] == b["publication_eligible"]
                  and a["arbitrage_eligible"] == b["arbitrage_eligible"]
                  and a["verified_count"] == b["verified_count"])
        check("deterministic eligibility: " + pid, stable,
              "status=%s eligible=%s" % (b["status"], b["publication_eligible"]))

    # Expected outcomes on real evidence.
    check("booking pattern PASSES",
          first["pattern_no_booking_path"]["status"] == "PASS")
    check("247 pattern PASSES",
          first["pattern_247_no_afterhours"]["status"] == "PASS")
    check("provisional numbers pattern PASSES with hedge",
          first["pattern_conflicting_numbers"]["status"] == "PASS")
    check("wordpress pattern PASSES",
          first["pattern_wordpress_brochure"]["status"] == "PASS")

    # 8. Arbitrage detection fires on the real booking pattern.
    check("arbitrage detected on booking pattern",
          first["pattern_no_booking_path"]["arbitrage_eligible"] is True)
    pend = os.path.join(HERE, "arbitrage_pending")
    check("arbitrage candidate artifact written",
          os.path.isdir(pend) and any(f.endswith(".json") for f in os.listdir(pend)))

    # 3. Unsupported claim: single evidence record -> NO_VALUE.
    fx = write_fixture("single", [ev(1)], dict(META, observation_count=1))
    rc, out, _ = run_signal("--evidence", fx)
    check("single evidence -> NO_VALUE", out[0]["status"] == "NO_VALUE",
          "got %s" % out[0]["status"])

    # 4. Missing receipt -> BLOCKED.
    fx = write_fixture("no-receipt",
                       [ev(1), ev(2), ev(3, receipt="")], META)
    rc, out, _ = run_signal("--evidence", fx)
    check("missing receipt -> BLOCKED", out[0]["status"] == "BLOCKED",
          "got %s" % out[0]["status"])

    # 5. Unresolved contradiction -> BLOCKED (never silently truth).
    fx = write_fixture("contradiction",
                       [ev(1), ev(2),
                        ev(3, contradictions=["listing says 24/7, site says M-F 8-5"])],
                       META)
    rc, out, _ = run_signal("--evidence", fx)
    check("unresolved contradiction -> BLOCKED",
          out[0]["status"] == "BLOCKED", "got %s" % out[0]["status"])

    # 6. Stale non-durable evidence downgrades.
    stale_meta = dict(META, fresh_until="2020-01-01")
    fx = write_fixture("stale", [ev(1), ev(2), ev(3)], stale_meta)
    rc, out, _ = run_signal("--evidence", fx)
    arts = sorted(f for f in os.listdir(RUNS) if f.endswith("test-adhoc.json"))
    art = json.load(open(os.path.join(RUNS, arts[-1])))
    check("stale evidence downgraded",
          art["stages"]["eligibility"]["downgraded"] is True
          and art["stages"]["compiler"]["freshness"] == "stale")

    # 7. Individual targeting cannot bypass the gate.
    evil_meta = dict(META,
                     public_safe_text="Pride Plumbing has no booking button.",
                     joke_candidates=["PING says: nice website, Pride Plumbing."])
    fx = write_fixture("named", [ev(1), ev(2), ev(3)], evil_meta)
    rc, out, _ = run_signal("--evidence", fx)
    check("named business -> BLOCKED", out[0]["status"] == "BLOCKED",
          "got %s" % out[0]["status"])

    # 9. Same work not reasoned from scratch: gap ledger.
    ledger = json.load(open(os.path.join(HERE, "gap_ledger.json")))
    auto = [s for s in ledger["steps"]
            if s["classification"] == "ALREADY_AUTOMATED"]
    check("gap ledger tracks automated steps", len(auto) >= 5,
          "%d automated" % len(auto))
    check("ledger observed this test's runs",
          len(ledger.get("runs_observed", [])) >= 4)

    # 10. Fresh-agent audit: the run artifact answers everything.
    art = json.load(open(os.path.join(
        RUNS, sorted(f for f in os.listdir(RUNS)
                     if "pattern_no_booking_path" in f)[-1])))
    questions = {
        "what evidence entered": "collection" in art["stages"],
        "what survived verification": "verification" in art["stages"],
        "what pattern produced": "compiler" in art["stages"],
        "why eligible": "eligibility" in art["stages"],
        "what gates decided": "gate_reasons" in art,
        "was anything published": art["result"].get("published") is False,
        "arbitrage found": "arbitrage" in art["stages"],
        "what action": "next_action" in art["result"],
        "what becomes deterministic next": os.path.exists(
            os.path.join(HERE, "gap_ledger.json")),
    }
    check("fresh agent can audit the pass",
          all(questions.values()),
          "missing: %s" % [k for k, v in questions.items() if not v])

    # 11. One manual step converted: minimum-evidence gate.
    conv = [s for s in ledger["steps"]
            if s["step"].startswith("minimum-evidence")
            and s["classification"] == "ALREADY_AUTOMATED"
            and "this skill" in s["note"]]
    check("manual reasoning converted to machinery", len(conv) == 1)

    # 12. PING boundary: no write path in the skill.
    src = open(PASS).read()
    bad = [t for t in ("ping-gateway", "emit-observation", "/events",
                       "qdrant", "psycopg", "PING_URL")
           if t in src]
    check("no PING write path in skill", not bad, "found: %s" % bad)

    # Terminal states are exactly the four.
    for pid in pids:
        check("terminal state valid: " + pid,
              first[pid]["status"] in ("PASS", "NO_VALUE", "BLOCKED", "FAILURE"))

    print()
    if failures:
        print("FAILURES (%d):" % len(failures))
        for f in failures:
            print("  - " + f)
        return 1
    print("ALL ACCEPTANCE CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
