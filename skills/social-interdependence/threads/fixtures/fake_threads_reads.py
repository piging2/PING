#!/usr/bin/env python3
"""fake_threads_reads.py -- ADAPTER-BOUNDARY FIXTURE ONLY.

Independent read path for read-after-write verification. Reads the same
fake external-state file the fixture executor mutates, so verification is
an honest observation of (simulated) external state.

Usage:
  fake_threads_reads.py read --ref post:<code> --action like|comment
                             [--marker <marker>]

Prints a JSON observation: {"observed": ...}.
"""
import argparse
import json
import os

FIX_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_PATH = os.environ.get("FAKE_THREADS_STATE",
                            os.path.join(FIX_DIR, "fake-external-state.json"))


def load_state():
    if not os.path.isfile(STATE_PATH):
        return {"likes": {}, "comments": {}, "mutation_count": 0}
    with open(STATE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("read")
    ap.add_argument("--ref", required=True)
    ap.add_argument("--action", required=True, choices=["like", "comment"])
    ap.add_argument("--marker", default="")
    args = ap.parse_args()
    if os.environ.get("FAKE_READ_FAIL") == "1":
        # Test-only mode: simulate an inconclusive read-back.
        raise SystemExit("simulated read failure")
    ref = args.ref
    code = ref[5:] if ref.startswith("post:") else ref
    st = load_state()
    if args.action == "like":
        observed = ("liked_by_account" if st.get("likes", {}).get(code)
                    else "not_liked_by_account")
    else:
        comments = st.get("comments", {}).get(code, [])
        marker = args.marker
        observed = ("comment_present"
                    if any(marker in c for c in comments) else
                    "comment_absent")
    print(json.dumps({"observed": observed, "ref": ref,
                      "action": args.action, "source": "fixture-read"}))


if __name__ == "__main__":
    main()
