#!/usr/bin/env python3
"""test_check_outcomes_keys.py -- deterministic tests for check-outcomes-keys.py.

Proves the preflight catches the exact trap hit on the 2026-09-16 00:50 night
watch: TikTok intents carry account=null (the job file drops accounts), so
outcomes built with the cron body's literal "account":"@handle" example match
NOTHING and record-outcomes would fail hard mid-append. The preflight must
pass null-account outcomes and fail @handle outcomes against null-account
intents, without writing anything.

Plain-script style: prints PASS/FAIL per case, exit 0 all green, 1 any red.
"""
import json
import os
import subprocess
import sys
import tempfile

BASE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(BASE, "..", "check-outcomes-keys.py")
PASS_ID = "tiktok-20260916-055031"

failures = []


def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL"), name, detail)
    if not cond:
        failures.append(name)


def intent(iid, account, action, url, with_execution=True, observed=False):
    recs = [{"record_type": "intent", "intent_id": iid, "ts": "2026-09-16T05:52:50Z",
             "platform": "tiktok", "account": account, "action": action,
             "url": url, "pass_id": PASS_ID, "stage": "ACTION_INTENT_DURABLE"}]
    if with_execution:
        recs.append({"record_type": "execution", "intent_id": iid,
                     "pass_id": PASS_ID, "stage": "EXECUTION",
                     "ts": "2026-09-16T05:53:00Z"})
    if observed:
        recs.append({"record_type": "observation", "intent_id": iid,
                     "pass_id": PASS_ID, "stage": "OBSERVATION",
                     "terminal": "EXECUTED", "ok": True,
                     "ts": "2026-09-16T06:40:00Z"})
    return recs


def run(ledger_path, outcomes, platform="tiktok"):
    with tempfile.NamedTemporaryFile("w", suffix=".json",
                                     delete=False) as f:
        json.dump(outcomes, f)
        opath = f.name
    env = dict(os.environ, ENGAGEMENT_INTENT_LEDGER=ledger_path)
    p = subprocess.run([sys.executable, SCRIPT, "--pass-id", PASS_ID,
                        "--outcomes-json", opath, "--platform", platform],
                       capture_output=True, text=True, env=env)
    os.unlink(opath)
    try:
        payload = json.loads(p.stdout.strip().splitlines()[-1])
    except Exception:
        payload = {"_raw": p.stdout, "_err": p.stderr}
    return p.returncode, payload


def write_ledger(recs):
    fd, path = tempfile.mkstemp(suffix=".jsonl")
    with os.fdopen(fd, "w") as f:
        for r in recs:
            f.write(json.dumps(r) + "\n")
    return path


U1 = "https://www.tiktok.com/@mkbhd/video/7385640320421170475"
U2 = "https://www.tiktok.com/@garyvee/video/7534477819494092063"
U3 = "https://www.tiktok.com/@linustech/video/7676542458695585041"

# Case 1: null-account intents (tonight's real shape) + null-account outcomes
recs = (intent("a1", None, "like", U1) + intent("a2", None, "like", U2)
        + intent("a3", None, "comment", U3))
ledger = write_ledger(recs)
outcomes = [{"account": None, "url": U1, "action": "like", "ok": True},
            {"account": None, "url": U2, "action": "like", "ok": True},
            {"account": None, "url": U3, "action": "comment", "ok": True}]
rc, pay = run(ledger, outcomes)
check("null-account outcomes match null-account intents",
      rc == 0 and pay.get("matched") == 3 and pay.get("unmatched") == [],
      "rc=%s matched=%s" % (rc, pay.get("matched")))

# Case 2: the cron-body-literal trap -- @handle outcomes vs null intents
outcomes2 = [{"account": "@mkbhd", "url": U1, "action": "like", "ok": True},
             {"account": "@garyvee", "url": U2, "action": "like", "ok": True},
             {"account": "@linustech", "url": U3, "action": "comment",
              "ok": True}]
rc, pay = run(ledger, outcomes2)
check("cron-body-literal @handle outcomes rejected against null intents",
      rc == 1 and len(pay.get("unmatched", [])) == 3,
      "rc=%s unmatched=%s" % (rc, len(pay.get("unmatched", []))))

# Case 3: one URL typo among good outcomes
outcomes3 = [{"account": None, "url": U1, "action": "like", "ok": True},
             {"account": None, "url": U2 + "9", "action": "like", "ok": True},
             {"account": None, "url": U3, "action": "comment", "ok": True}]
rc, pay = run(ledger, outcomes3)
bad = pay.get("unmatched", [])
check("single URL typo flagged, others match",
      rc == 1 and len(bad) == 1 and bad[0]["url"] == U2 + "9",
      "rc=%s unmatched=%s" % (rc, len(bad)))

# Case 4: {"outcomes": [...]} wrapper form accepted
rc, pay = run(ledger, {"outcomes": outcomes})
check("outcomes wrapper form accepted",
      rc == 0 and pay.get("matched") == 3, "rc=%s" % rc)

# Case 5: closed intent is not required to have an outcome
recs5 = (intent("b1", None, "like", U1, observed=True)
         + intent("b2", None, "like", U2) + intent("b3", None, "comment", U3))
ledger5 = write_ledger(recs5)
outcomes5 = [{"account": None, "url": U2, "action": "like", "ok": True},
             {"account": None, "url": U3, "action": "comment", "ok": True}]
rc, pay = run(ledger5, outcomes5)
check("closed intent needs no outcome; open ones all match",
      rc == 0 and pay.get("open_intents") == 2 and pay.get("matched") == 2,
      "rc=%s open=%s" % (rc, pay.get("open_intents")))
os.unlink(ledger5)

# Case 6: no open intents for the pass -> rc=1, nothing to match against
ledger6 = write_ledger(intent("c1", None, "like", U1, observed=True))
rc, pay = run(ledger6, outcomes)
check("pass with zero open intents fails closed",
      rc == 1, "rc=%s" % rc)
os.unlink(ledger6)

# Case 7: @handle intents (pass-2 shape) still match @handle outcomes
recs7 = (intent("d1", "@mkbhd", "like", U1) + intent("d2", "@garyvee", "like", U2))
ledger7 = write_ledger(recs7)
outcomes7 = [{"account": "@mkbhd", "url": U1, "action": "like", "ok": True},
             {"account": "@garyvee", "url": U2, "action": "like", "ok": True}]
rc, pay = run(ledger7, outcomes7)
check("@handle intents match @handle outcomes (no regression)",
      rc == 0 and pay.get("matched") == 2, "rc=%s" % rc)
os.unlink(ledger7)
os.unlink(ledger)

print("---")
if failures:
    print("FAILURES:", failures)
    sys.exit(1)
print("ALL GREEN")
