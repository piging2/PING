#!/usr/bin/env python3
"""set-hold.py <surface> hold|release --by owner|tripwire --reason "..." [--ref "..."]

The ONLY sanctioned writer of ~/workspace/outreach/holds.json (the other is
Nolan himself hand-editing the file; workers and cron bodies never touch it).

Provenance is mandatory because a hold is the one thing that stops a surface:
  --by owner    explicit Nolan binding order. --ref names the order (e.g. a
                timestamped chat quote or memory-note heading). A freeze on
                prose/policy grounds is REFUSED by Nolan's 2026-09-30 ~16:05
                standing order: "NEVER freeze engagement on prose/policy
                grounds; scale back ONLY on a platform flag." An owner order
                is the only non-flag basis for a hold, and it must be explicit.
  --by tripwire platform flag actually observed: checkpoint, warning, action
                block, restriction, or a tripwire file at a blocking status.
                --ref names the evidence (pass log section, tripwire file).

A release requires the same provenance: an explicit owner order, or evidence
the platform flag cleared (tripwire review entry, verified live check).
Prose in the engagement-md headers never sets or clears a hold.

Writes are atomic (tmp + rename). Every change is also appended to
~/workspace/outreach/hold-changes.jsonl as an audit trail.
"""

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

SURFACES = ("tiktok", "instagram", "facebook", "threads", "x",
            "outreach-engine")

DEFAULT_PATH = os.path.expanduser("~/workspace/outreach/holds.json")


def utcnow():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main(argv):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("surface", choices=SURFACES)
    p.add_argument("action", choices=("hold", "release"))
    p.add_argument("--by", required=True, choices=("owner", "tripwire"),
                   help="provenance of the hold change (mandatory)")
    p.add_argument("--reason", required=True,
                   help="why the hold is set or cleared (mandatory)")
    p.add_argument("--ref", default=None,
                   help="order/evidence reference (strongly recommended)")
    p.add_argument("--path", default=DEFAULT_PATH)
    args = p.parse_args(argv)

    try:
        with open(args.path, "r", encoding="utf-8") as f:
            state = json.load(f)
    except (OSError, ValueError) as e:
        print(f"set-hold: cannot read {args.path}: {e}; refusing to write",
              file=sys.stderr)
        return 3

    holds = state.get("holds")
    if not isinstance(holds, dict) or args.surface not in holds:
        print(f"set-hold: no hold entry for surface {args.surface!r}",
              file=sys.stderr)
        return 3

    entry = holds[args.surface]
    old_held = bool(entry.get("held"))
    new_held = args.action == "hold"
    entry.update({
        "held": new_held,
        "set_at": utcnow(),
        "set_by": args.by,
        "reason": args.reason,
        "ref": args.ref,
    })
    state["updated_at"] = utcnow()
    state["updated_by"] = f"set-hold.py ({args.by})"

    # Atomic write: tmp in the same dir + rename.
    d = os.path.dirname(os.path.abspath(args.path))
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".holds-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=1)
            f.write("\n")
        os.replace(tmp, args.path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

    audit = {"ts": utcnow(), "surface": args.surface, "action": args.action,
             "by": args.by, "reason": args.reason, "ref": args.ref,
             "previous_held": old_held}
    with open(os.path.join(d, "hold-changes.jsonl"), "a",
              encoding="utf-8") as f:
        f.write(json.dumps(audit) + "\n")

    print(f"set-hold: {args.surface} held={old_held} -> {new_held} "
          f"(by={args.by}, ref={args.ref})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
