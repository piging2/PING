#!/usr/bin/env python3
"""tiktok-like-recovery.py -- durable like SAFETY state for TikTok.

2026-09-28 (Nolan's corrected directive, supersedes the 2026-09-24 probe
machinery): the automatic like-restoration probe is PERMANENTLY DEAD. It
fought the platform's restriction signal with 1-like probes and automatic
cap restoration; that automation never runs again. What remains is a pure
safety tripwire:

  - an explicit platform restriction signal on a like (driver fail_class
    NO_STATE_CHANGE_RESTRICTED, or an abort naming a matched restriction
    phrase) -> BLOCKED, never an optimization problem;
  - only a recorded review clears BLOCKED;
  - normal engagement likes run at the ramp-policy volumes (see
    tiktok-engagement.md header rules), never from this script.

There is no probe scheduling, no clean-probe counting, no cap ladder, no
automatic restoration. Likes are either allowed (CLEAR) or frozen (BLOCKED).

Commands:
  plan-next            print the like safety state as JSON
  record-pass --pass-id ID --driver-result PATH
                       fold one pass's driver result file into the state
  record-review --pass-id ID --decision allow|hold --note "..."
                       manual review entry (the only way out of BLOCKED)
  show                 dump the current state as JSON

Exit codes: 0 ok, 2 usage/input error.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

STATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "tiktok-like-recovery-state.json")

STATUS_CLEAR = "CLEAR"
STATUS_BLOCKED = "BLOCKED"

now_utc = lambda: datetime.now(timezone.utc).isoformat()


def blank_state():
    return {
        "platform": "tiktok",
        "action": "like",
        "status": STATUS_CLEAR,
        "history": [],
        "reviews": [],
        "policy": ("2026-09-28: like-restore probe automation permanently "
                   "removed per Nolan; this state is a safety tripwire only; "
                   "like volumes come from the ramp policy."),
    }


def load_state():
    try:
        with open(STATE_PATH, "r", encoding="utf-8") as f:
            st = json.load(f)
    except (OSError, json.JSONDecodeError):
        return blank_state()
    # Migrate pre-2026-09-28 probe-machinery statuses: anything that is not
    # an explicit BLOCKED becomes CLEAR (normal engagement resumes at ramp
    # volumes per the corrected directive).
    if st.get("status") not in (STATUS_CLEAR, STATUS_BLOCKED):
        st["status"] = STATUS_CLEAR
    st.setdefault("history", [])
    st.setdefault("reviews", [])
    return st


def save_state(st):
    st["history"] = st.get("history", [])[-50:]
    tmp = STATE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(st, f, indent=2, sort_keys=True)
    os.replace(tmp, STATE_PATH)


def log_event(st, pass_id, event, detail=""):
    st.setdefault("history", []).append({
        "ts": now_utc(), "pass_id": pass_id, "event": event, "detail": detail,
    })


def cmd_plan_next(st):
    allowed = st["status"] == STATUS_CLEAR
    return {
        "platform": "tiktok", "action": "like",
        "status": st["status"],
        "likes_allowed": allowed,
        "note": ("like budget is governed by the ramp policy "
                 "(tiktok-engagement.md header rules); this state is the "
                 "safety tripwire only; no automatic probes exist"),
    }


def load_driver_results(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return data["results"]
    raise ValueError("driver result file must be {'results': [...]}")


def restriction_signal(records):
    for r in records:
        if str(r.get("type") or r.get("action") or "").lower() == "like":
            if str(r.get("fail_class") or "") == "NO_STATE_CHANGE_RESTRICTED":
                return True
        if str(r.get("type") or "").lower() == "abort":
            if (str(r.get("fail_class") or "") == "PASS_ABORT_RESTRICTION"
                    or r.get("matched_phrase")):
                return True
    return False


def cmd_record_pass(st, pass_id, driver_result):
    try:
        records = load_driver_results(driver_result)
    except (OSError, ValueError, json.JSONDecodeError) as e:
        print(f"unreadable driver result: {e}", file=sys.stderr)
        return 2
    if restriction_signal(records):
        st["status"] = STATUS_BLOCKED
        log_event(st, pass_id, "BLOCKED",
                  "platform restriction signal on like; likes frozen; "
                  "recorded review required to clear")
    else:
        log_event(st, pass_id, "PASS_RECORDED",
                  f"{len(records)} driver records; no restriction signal; "
                  f"status {st['status']} unchanged")
    save_state(st)
    print(json.dumps({"status": st["status"], "pass_id": pass_id,
                      "next": cmd_plan_next(st)}, indent=2))
    return 0


def cmd_record_review(st, pass_id, decision, note):
    entry = {"ts": now_utc(), "pass_id": pass_id, "decision": decision,
             "note": note}
    st.setdefault("reviews", []).append(entry)
    if decision == "allow" and st["status"] == STATUS_BLOCKED:
        st["status"] = STATUS_CLEAR
        log_event(st, pass_id, "REVIEW_ALLOW",
                  "review recorded; BLOCKED cleared, likes resume at ramp volumes")
    elif decision == "allow":
        log_event(st, pass_id, "REVIEW_ALLOW",
                  f"recorded; status unchanged ({st['status']})")
    else:
        log_event(st, pass_id, "REVIEW_HOLD", "recorded; status unchanged")
    save_state(st)
    print(json.dumps({"status": st["status"], "review": entry}, indent=2))
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Durable like safety state for TikTok (tripwire only).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("plan-next", help="print like safety state")
    sub.add_parser("show", help="dump state")
    rp = sub.add_parser("record-pass", help="fold a pass's driver results in")
    rp.add_argument("--pass-id", required=True)
    rp.add_argument("--driver-result", required=True)
    rr = sub.add_parser("record-review", help="manual review entry")
    rr.add_argument("--pass-id", required=True)
    rr.add_argument("--decision", required=True, choices=["allow", "hold"])
    rr.add_argument("--note", default="")
    args = ap.parse_args(argv)

    st = load_state()

    if args.cmd == "plan-next":
        print(json.dumps(cmd_plan_next(st), indent=2))
        return 0
    if args.cmd == "show":
        print(json.dumps(st, indent=2))
        return 0
    if args.cmd == "record-pass":
        return cmd_record_pass(st, args.pass_id, args.driver_result)
    if args.cmd == "record-review":
        return cmd_record_review(st, args.pass_id, args.decision, args.note)
    return 2


if __name__ == "__main__":
    sys.exit(main())
