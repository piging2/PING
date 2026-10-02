#!/usr/bin/env python3
"""Scratch projection generator for determinism-probe falsification runs.

Writes a small JSON projection to --projection. The content is stable
except meta.dumpedAt (the declared volatile), which defaults to the
current UTC time.

    --fixed-dumped-at VALUE   pin dumpedAt to VALUE (flips the declared
                              volatile into a non-volatile constant)
    --leak                    inject an undeclared volatile
                              data.leakedAt = current UTC time (a real
                              timestamp leak; the probe must fail)

Only used for falsification evidence. Not a product path.
"""
import argparse
import json
from datetime import datetime, timezone

STABLE_SECTIONS = [
    {"id": "services", "title": "Services", "order": 1},
    {"id": "reviews", "title": "Reviews", "order": 2},
    {"id": "contact", "title": "Contact", "order": 3},
]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--projection", required=True)
    p.add_argument("--tenant", required=True)
    p.add_argument("--fixed-dumped-at", default=None)
    p.add_argument("--leak", action="store_true")
    args = p.parse_args()

    dumped_at = (args.fixed_dumped_at if args.fixed_dumped_at
                 else datetime.now(timezone.utc).isoformat())
    data = {"phone": "(970) 555-0100", "serviceArea": "Grand Junction, CO"}
    if args.leak:
        data["leakedAt"] = datetime.now(timezone.utc).isoformat()

    doc = {
        "meta": {
            "tenant": args.tenant,
            "schema": 1,
            "dumpedAt": dumped_at,
        },
        "sections": STABLE_SECTIONS,
        "data": data,
    }
    with open(args.projection, "w", encoding="utf-8") as f:
        json.dump(doc, f)
    print("wrote %s tenant=%s leakedAt=%s" % (
        args.projection, args.tenant, "yes" if args.leak else "no"))


if __name__ == "__main__":
    main()
