#!/usr/bin/env python3
"""Fixture-based tests for send-eligibility.py. Dry run only: all sources are
temp fixtures pointed at via ELIG_* env vars. Never touches real outreach
state and never sends anything.
"""
import json
import os
import subprocess
import sys
import tempfile

CHECKER = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "send-eligibility.py")
DAY = "2026-09-21"


def make_env(tmp, files):
    env = dict(os.environ)
    for key, name in (("ELIG_JSONL", "prospects.jsonl"),
                      ("ELIG_PIPELINE", "pipeline.md"),
                      ("ELIG_LEADS", "leads.md"),
                      ("ELIG_LEARNINGS", "learnings.md"),
                      ("ELIG_FOLLOWUPS", "follow-ups.md"),
                      ("ELIG_FBDMS", "facebook-dms.md"),
                      ("ELIG_DISCREP", "discrepancies.jsonl"),
                      ("ELIG_AUDIT", "audit.jsonl"),
                      ("ELIG_RECONCILE", "reconciliations.md")):
        p = os.path.join(tmp, name)
        if name not in files:
            open(p, "w").write("")
        else:
            open(p, "w", encoding="utf-8").write(files[name])
        env[key] = p
    qdir = os.path.join(tmp, "queues")
    os.makedirs(qdir, exist_ok=True)
    env["ELIG_QUEUE_DIR"] = qdir
    sdir = os.path.join(tmp, "sweeps")
    os.makedirs(sdir, exist_ok=True)
    env["ELIG_SWEEP_DIR"] = sdir
    return env


def run(env, *args):
    r = subprocess.run([sys.executable, CHECKER, "--day", DAY] + list(args),
                       capture_output=True, text=True, env=env)
    return r.returncode, r.stdout.strip()


def jsonl_row(name, email, **kw):
    row = {"business_name": name, "email": email, "suppression_state": "",
           "last_signal": "", "next_eligible_action": ""}
    row.update(kw)
    return json.dumps(row)


RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, cond, detail))
    print(("PASS" if cond else "FAIL"), name, detail if not cond else "")


def main():
    tmp = tempfile.mkdtemp(prefix="elig-test-")

    # ---------- Case (a): completed ladder + stale note says eligible ----------
    # Mirrors FL-20260921-030: structured says F2 SENT 2026-09-19, ladder
    # complete; a stale leads.md note still says "F2 eligible".
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Canyon Creek Electric", "john@canyoncreekelectric.com",
            last_signal="SENT 2026-09-10; F1 SENT 2026-09-14; "
                        "F2 SENT 2026-09-20 (ladder complete, watch only)",
            next_eligible_action="none (ladder complete; watch only)") + "\n",
        "pipeline.md": ("- Canyon Creek Electric | electrical | Montrose | "
                        "john@canyoncreekelectric.com | SENT 2026-09-10; "
                        "F1 SENT 2026-09-14; F2 SENT 2026-09-20 "
                        "(ladder complete, watch only)\n"),
        "leads.md": ("## Round 99\n"
                     "- Canyon Creek Electric (Montrose) -- "
                     "john@canyoncreekelectric.com. F1 SENT; "
                     "F2 eligible 2026-09-20+.\n"),
    })
    rc, out = run(env, "--business", "Canyon Creek Electric",
                  "--email", "john@canyoncreekelectric.com",
                  "--action", "followup-f2", "--gmail-sent-count", "3")
    check("a: completed ladder + stale note -> blocked",
          rc in (1, 2), "rc=%d" % rc)
    check("a: emits discrepancy record",
          rc == 2 and os.path.getsize(env["ELIG_DISCREP"]) > 0, "rc=%d" % rc)
    disc = open(env["ELIG_DISCREP"], encoding="utf-8").read()
    check("a: discrepancy id present", "DISC-" in disc)
    check("a: discrepancy names the stale note",
          "F2 eligible" in disc)

    # ---------- Case (b): suppressed recipient is ineligible ----------
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Bad Actor Plumbing", "bad@example.com",
            suppression_state="SUPPRESS (declined 2026-09-15; never contact)",
            last_signal="declined by phone") + "\n",
    })
    rc, out = run(env, "--business", "Bad Actor Plumbing",
                  "--action", "cold-email", "--gmail-sent-count", "0")
    check("b: suppressed recipient -> ineligible", rc == 1, "rc=%d" % rc)
    check("b: suppression named as reason", "SUPPRESSION" in out, out[:200])

    # ---------- Case (c): structured-vs-note disagreement emits record ------
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Quiet Electric", "q@example.com",
            last_signal="NEW prospect, never contacted",
            next_eligible_action="cold email eligible") + "\n",
        "pipeline.md": "- Quiet Electric | NEW\n",
        "leads.md": ("- Quiet Electric: ladder complete, no further touches "
                      "(owner asked to stop).\n"),
    })
    rc, out = run(env, "--business", "Quiet Electric",
                  "--action", "cold-email", "--gmail-sent-count", "0")
    check("c: note asserts done vs structured eligible -> discrepancy",
          rc == 2, "rc=%d" % rc)
    check("c: discrepancy record written",
          "DISC-" in open(env["ELIG_DISCREP"], encoding="utf-8").read())

    # ---------- Case (d): genuinely eligible recipient passes ----------------
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Fresh HVAC Co", "fresh@example.com",
            last_signal="NEW prospect, verified contact",
            next_eligible_action="cold email eligible") + "\n",
        "pipeline.md": "- Fresh HVAC Co | NEW\n",
        "leads.md": "- Fresh HVAC Co: discovered round 100, good fit.\n",
    })
    rc, out = run(env, "--business", "Fresh HVAC Co",
                  "--email", "fresh@example.com",
                  "--action", "cold-email", "--gmail-sent-count", "0")
    check("d: eligible recipient passes", rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (e) fail closed when Gmail count missing --------------------
    rc, out = run(env, "--business", "Fresh HVAC Co",
                  "--action", "cold-email")
    check("e: missing gmail count -> fail closed", rc != 0, "rc=%d" % rc)
    check("e: mandatory verification named",
          "gmail" in out.lower(), out[:200])

    # ---------- (f) Gmail/history contradiction -> discrepancy ----------------
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Halfway Electric", "half@example.com",
            last_signal="SENT 2026-09-10; F1 SENT 2026-09-14",
            next_eligible_action="F2 eligible 2026-09-21") + "\n",
        "pipeline.md": "- Halfway Electric | SENT 2026-09-10; F1 SENT 2026-09-14\n",
    })
    rc, out = run(env, "--business", "Halfway Electric",
                  "--action", "followup-f2", "--gmail-sent-count", "3")
    check("f: gmail shows 3 but structured shows 2 -> discrepancy",
          rc == 2, "rc=%d" % rc)

    # ---------- (g) reconciliation lets the reviewed state proceed -----------
    # Same fixture as (a): after a human records a reconciliation covering the
    # stale note, the check proceeds on structured authority (still blocked,
    # but no longer a discrepancy).
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Canyon Creek Electric", "john@canyoncreekelectric.com",
            last_signal="SENT 2026-09-10; F1 SENT 2026-09-14; "
                        "F2 SENT 2026-09-20 (ladder complete, watch only)",
            next_eligible_action="none (ladder complete; watch only)") + "\n",
        "pipeline.md": ("- Canyon Creek Electric | SENT 2026-09-10; "
                        "F1 SENT 2026-09-14; F2 SENT 2026-09-20 "
                        "(ladder complete, watch only)\n"),
        "leads.md": ("- Canyon Creek Electric -- F1 SENT; F2 eligible 2026-09-20+.\n"),
    })
    rc1, _ = run(env, "--business", "Canyon Creek Electric",
                 "--action", "followup-f2", "--gmail-sent-count", "3")
    disc_id = None
    for line in open(env["ELIG_DISCREP"], encoding="utf-8"):
        disc_id = json.loads(line)["discrepancy_id"]
    rec = open(env["ELIG_RECONCILE"], "a", encoding="utf-8")
    import hashlib, re
    state_hash = None
    for line in open(env["ELIG_DISCREP"], encoding="utf-8"):
        d = json.loads(line)
        state_hash = d["state_hash"]
        note_hashes = ",".join(d["note_hashes"])
    rec.write("%s | %s | Canyon Creek Electric | %s | %s | reviewed: leads.md "
              "note is stale (pre-F2), structured F2 SENT 2026-09-19 authoritative\n"
              % (DAY, disc_id, state_hash, note_hashes))
    rec.close()
    rc2, out2 = run(env, "--business", "Canyon Creek Electric",
                    "--action", "followup-f2", "--gmail-sent-count", "3")
    check("g: discrepancy raised first", rc1 == 2, "rc=%d" % rc1)
    check("g: after reconciliation, structured block stands (no discrepancy)",
          rc2 == 1 and "RECONCILED" in out2, "rc=%d" % rc2)

    # ---------- (h) eligible followup-f1 with proper timing ------------------
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Midway Plumbing", "mid@example.com",
            last_signal="SENT 2026-09-14 (initial cold email accepted)",
            next_eligible_action="F1 eligible 2026-09-18") + "\n",
        "pipeline.md": "- Midway Plumbing | SENT 2026-09-14\n",
    })
    rc, out = run(env, "--business", "Midway Plumbing",
                  "--action", "followup-f1", "--gmail-sent-count", "1")
    check("h: proper F1 timing passes", rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (i) F1 too early -> timing block ------------------------------
    rc, out = run(env, "--business", "Midway Plumbing",
                  "--action", "followup-f1", "--gmail-sent-count", "1",
                  "--day", "2026-09-15")
    check("i: F1 on day 1 blocked by timing", rc == 1, "rc=%d" % rc)

    # ---------- (j) cold-email to already-contacted -> ineligible -------------
    rc, out = run(env, "--business", "Midway Plumbing",
                  "--action", "cold-email", "--gmail-sent-count", "1")
    check("j: cold email after prior touch blocked", rc == 1, "rc=%d" % rc)

    print()
    failed = [r for r in RESULTS if not r[1]]
    print("RESULT %d/%d passed" % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
