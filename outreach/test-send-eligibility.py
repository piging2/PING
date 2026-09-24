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

    # ---------- (k) negated markers are not sends --------------------------
    # Hardening 2026-09-22: "not sent" / "not submitted" prose must count 0.
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "NoSend Co", "nosend@example.com",
            last_signal="2026-09-09: draft queued for 2026-09-10 cap; "
                        "unsent, no send occurred, never sent.",
            next_eligible_action="cold email (draft ready)") + "\n",
        "pipeline.md": ("- NoSend Co | QUEUED 2026-09-09 (draft queued); not sent\n"
                        "- NoSend Co form research: no B2B invite, not submitted\n"),
    })
    rc, out = run(env, "--business", "NoSend Co",
                  "--action", "cold-email", "--gmail-sent-count", "0")
    check("k: 'not sent'/'not submitted' count 0 -> cold eligible",
          rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (l) same (marker, date) re-described twice counts once ----
    # Hardening 2026-09-22: a pipeline row plus a dedup-audit line
    # referencing the same send is one touch, not two.
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Redo Plumbing", "redo@example.com",
            last_signal="2026-09-10: SENT cold email (Gmail-accepted).",
            next_eligible_action="F1 eligible 2026-09-14") + "\n",
        "pipeline.md": ("- Redo Plumbing | SENT 2026-09-10 (Gmail-accepted, id abc123)\n"
                        "- audit: Redo Plumbing already SENT 2026-09-10 per dedup review\n"),
    })
    rc, out = run(env, "--business", "Redo Plumbing",
                  "--action", "followup-f1", "--gmail-sent-count", "1")
    check("l: re-described send counts once -> F1 eligible",
          rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (m) distinct rungs on the same date never dedup -----------
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "SameDay Co", "sameday@example.com",
            last_signal="2026-09-10: SENT cold; F1 SENT 2026-09-10 (same-day test).",
            next_eligible_action="F2 eligible 2026-09-20") + "\n",
        "pipeline.md": "- SameDay Co | SENT 2026-09-10; F1 SENT 2026-09-10\n",
    })
    rc, out = run(env, "--business", "SameDay Co",
                  "--action", "followup-f2", "--gmail-sent-count", "2")
    check("m: SENT + F1 SENT same date = 2 touches -> F2 eligible",
          rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (n) "verified in sent mail" prose is not a touch ----------
    # Regression 2026-09-23: the bare word "sent" inside "verified in sent
    # mail" phantom-counted a third touch, blocking three legitimate F2s.
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Hardwood Co", "hardwood@example.com",
            last_signal="2026-09-10 SENT cold; 2026-09-13 F1 SENT",
            next_eligible_action="F2 eligible 2026-09-20+") + "\n",
        "pipeline.md": ("- Hardwood Co | F1 SENT 2026-09-13 (verified in sent mail "
                        "~20:30 MDT 2026-09-13; F2 eligible 2026-09-20+; "
                        "initial sent 2026-09-10, no reply)\n"),
    })
    rc, out = run(env, "--business", "Hardwood Co",
                  "--action", "followup-f2", "--gmail-sent-count", "2")
    check("n: 'verified in sent mail' prose not counted -> F2 eligible (2 touches)",
          rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (o) bare "sent mail" alone creates no touch ---------------
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "MailRef Co", "mailref@example.com",
            last_signal="",
            next_eligible_action="") + "\n",
        "pipeline.md": "- MailRef Co | queued; verified in sent mail 2026-09-16 per audit\n",
    })
    rc, out = run(env, "--business", "MailRef Co",
                  "--action", "cold-email", "--gmail-sent-count", "0")
    check("o: 'verified in sent mail' alone = 0 touches -> cold eligible",
          rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (p) same rung re-described on different dates = 1 touch --
    # Regression 2026-09-23: a stale queue note ("F1 sent 2026-09-16")
    # re-describing the same F1 that follow-ups.md records as
    # F1 SENT 2026-09-17 phantom-counted a third touch and blocked four
    # legitimate F2s (High Noon Solar et al). One touch per rung.
    # Mirrors the real case: no canonical JSONL row (cap-full pipeline
    # tracking), history lives in pipeline.md.
    env = make_env(tmp, {
        "pipeline.md": ("- StaleNote Co | initial sent 2026-09-10; "
                        "F1 SENT 2026-09-17, verified in sent mail; "
                        "F2 eligible 2026-09-23+\n"
                        "- queue note: StaleNote Co F1 cohort F2s "
                        "(initial sends 2026-09-10; F1 sent 2026-09-16): "
                        "F2 drafts ready\n"),
    })
    rc, out = run(env, "--business", "StaleNote Co",
                  "--action", "followup-f2", "--gmail-sent-count", "2",
                  "--day", "2026-09-24")
    check("p: stale-date F1 redescription collapses -> F2 eligible (2 touches)",
          rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (q) Gmail hard block still catches real duplicates ------
    # Same fixtures as (p) but Gmail verifies 3 sends: the ladder budget
    # backstop blocks regardless of the rung-collapse.
    rc, out = run(env, "--business", "StaleNote Co",
                  "--action", "followup-f2", "--gmail-sent-count", "3",
                  "--day", "2026-09-24")
    check("q: gmail_sent_count=3 still blocks (ladder budget backstop)",
          rc == 1, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (r) another prospect's SENT in the same line is not ours --
    # Regression 2026-09-24: pipeline.md:2748 names "Kooler Garage Doors"
    # alongside "Alpine Property Services pipeline SENT 2026-09-23 cold";
    # the unscoped substring scan counted Alpine's SENT as Kooler's touch,
    # manufacturing a JSONL-vs-pipeline discrepancy that blocked a
    # legitimate cold send. Attribution-scoped pipeline scan: 0 touches.
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "Kooler Test Co", "koolertest@example.com",
            last_signal="",
            next_eligible_action="") + "\n",
        "pipeline.md": ("- Kooler Test Co | garage doors | Grand Junction | "
                        "koolertest@example.com (site-published) | unknown | "
                        "unstated | Multi-location operator. | 2026-09-10 | "
                        "QUEUED 2026-09-10 (draft ready)\n"
                        "- Near-misses: DUPLICATES already tracked (Kooler "
                        "Test Co pipeline QUEUED round-17; Alpine Property "
                        "Services pipeline SENT 2026-09-23 cold; Prestige "
                        "Gutters mentions) | EXCLUDED: none\n"),
    })
    rc, out = run(env, "--business", "Kooler Test Co",
                  "--action", "cold-email", "--gmail-sent-count", "0")
    check("r: cross-prospect SENT not attributed -> cold eligible, no discrepancy",
          rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (s) status-prefixed row still counts as row-subject ------
    # "- SENT 2026-09-10 | Name | ..." is a prospect row about Name; the
    # whole row is scanned even though the marker sits before the name.
    env = make_env(tmp, {
        "pipeline.md": ("- SENT 2026-09-10 | StatusPrefix Co | "
                        "statusprefix@example.com | cold email accepted\n"),
    })
    rc, out = run(env, "--business", "StatusPrefix Co",
                  "--action", "followup-f1", "--gmail-sent-count", "1")
    check("s: status-prefixed row-subject counts its marker -> F1 eligible",
          rc == 0, "rc=%d out=%s" % (rc, out[:200]))

    # ---------- (t) F-01: touches=0 + Gmail-verified sends = DISCREPANCY ---
    # Regression 2026-09-24: the Gmail-vs-structured cross-check was gated
    # on sv["touches"] truthiness, so a stall-path row (0 recorded touches
    # after a send timed out post-accept) with 1-2 Gmail-verified sends
    # returned ELIGIBLE, permitting a duplicate cold email to a real
    # business. Any Gmail>structured mismatch must fail closed with
    # DISCREPANCY (exit 2); ELIGIBLE requires agreement.
    env = make_env(tmp, {
        "prospects.jsonl": jsonl_row(
            "StallPath Co", "stallpath@example.com",
            last_signal="",
            next_eligible_action="") + "\n",
        "pipeline.md": ("- StallPath Co | plumbing | Grand Junction | "
                        "stallpath@example.com | QUEUED 2026-09-20 "
                        "(draft ready, never sent per structured state)\n"),
    })
    rc, out = run(env, "--business", "StallPath Co",
                  "--action", "cold-email", "--gmail-sent-count", "1")
    check("t1: touches=0 + gmail_sent_count=1 -> DISCREPANCY (exit 2)",
          rc == 2, "rc=%d out=%s" % (rc, out[:200]))
    rc, out = run(env, "--business", "StallPath Co",
                  "--action", "cold-email", "--gmail-sent-count", "2")
    check("t2: touches=0 + gmail_sent_count=2 -> DISCREPANCY (exit 2)",
          rc == 2, "rc=%d out=%s" % (rc, out[:200]))

    print()
    failed = [r for r in RESULTS if not r[1]]
    print("RESULT %d/%d passed" % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
