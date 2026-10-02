#!/usr/bin/env python3
"""check-outcomes-keys.py -- read-only preflight for ledger record-outcomes.

record-outcomes --outcomes-json matches each outcome to an open intent by the
key (norm_account(platform, account), url, action) and FAILS HARD (rc=2) on
the first outcome that matches nothing -- after earlier outcomes in the same
file were already appended. Worse, the account in the outcomes file must be
the SAME value the intents carry, which is not always the @handle the cron
bodies show in examples: the TikTok job file drops accounts, so its intents
carry account=null and outcomes must use null too.

This script verifies every outcome key against the pass's open intents BEFORE
anything is appended. It writes nothing.

Exit codes: 0 = every outcome matches an open intent of the pass.
1 = at least one outcome matches no open intent (lists them).
2 = usage error / outcomes file unreadable.
3 = ledger unreadable (fail closed, mirrors the ledger's own code).

Usage:
  check-outcomes-keys.py --pass-id tiktok-20260916-055031 \
      --outcomes-json <outcomes report> [--platform tiktok]
"""
import argparse
import importlib.util
import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEDGER_PY = os.path.join(BASE_DIR, "action-intent-ledger.py")


def fail(msg):
    print("check-outcomes-keys: %s" % msg, file=sys.stderr)


def load_ledger_module():
    spec = importlib.util.spec_from_file_location("ail", LEDGER_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--pass-id", required=True)
    p.add_argument("--outcomes-json", required=True)
    p.add_argument("--platform", required=False, default=None,
                   choices=["instagram", "facebook", "threads", "x", "tiktok"])
    args = p.parse_args()

    try:
        ail = load_ledger_module()
    except Exception as e:
        fail("cannot load ledger module: %s" % e)
        return 3
    try:
        states = ail._derive(ail._read_records())
    except Exception as e:
        fail("ledger unreadable, failing closed: %s" % e)
        return 3
    try:
        g = ail.guard_helpers()
    except Exception as e:
        fail("cannot load engagement-guard helpers, failing closed: %s" % e)
        return 3

    targets = [s for s in ail._open_intents(states)
               if s["intent"].get("pass_id") == args.pass_id
               and (not args.platform or
                    s["intent"].get("platform") == args.platform)]
    if not targets:
        fail("no open intents for pass %s" % args.pass_id)
        return 1

    try:
        with open(args.outcomes_json, "r", encoding="utf-8") as f:
            items = json.load(f)
    except Exception as e:
        fail("cannot read outcomes json: %s" % e)
        return 2
    items = items if isinstance(items, list) else items.get("outcomes", [])

    def tkey(platform, account, url, action):
        return (ail._norm_account(g, platform, account), url, action)

    tmap = {}
    for s in targets:
        i = s["intent"]
        tmap[tkey(i.get("platform"), i.get("account"), i.get("url"),
                  i.get("action"))] = i["intent_id"]

    platform = args.platform or (targets[0]["intent"].get("platform"))
    bad = []
    for n, o in enumerate(items):
        k = tkey(platform, o.get("account"), o.get("url"), o.get("action"))
        if k not in tmap:
            bad.append({"index": n, "account": o.get("account"),
                        "url": o.get("url"), "action": o.get("action"),
                        "norm_key": k})

    # intents with no outcome are informational only: record-outcomes leaves
    # them open, which is the safe behavior, not a preflight failure.
    matched_keys = set()
    for o in items:
        matched_keys.add(tkey(platform, o.get("account"), o.get("url"),
                              o.get("action")))
    uncovered = [tmap[k] for k in tmap if k not in matched_keys]

    print(json.dumps({"pass_id": args.pass_id,
                      "open_intents": len(targets),
                      "outcomes": len(items),
                      "matched": len(items) - len(bad),
                      "unmatched": bad,
                      "intents_without_outcome": len(uncovered)}))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
