#!/usr/bin/env python3
"""pass-sweep.py -- deterministic "anything new since the last log entry?" sweep.

Replaces the hand-reasoned step-2 checklist of the night-watch cycle:
"find engagement-pass results newer than the last log entry."

Reasoning -> rule: for each platform, the newest mtime across its evidence
sources (per-platform history file + per-platform result files in the
engagement-passes dir, plus the unfollow logs) is compared to a watermark
(the timestamp of the last log entry). Strictly greater than the watermark
means new evidence worth a human/LLM look; otherwise nothing new.

Typed results: per platform {newest_mtime, sources_checked, new} and a
summary {watermark, any_new}. JSON to stdout, nothing else.
Exit codes: 0 = nothing new since watermark; 1 = new evidence exists;
2 = usage error or an evidence source is unreadable (fail closed).

Read-only: opens files only to stat them. Never writes.
"""
import argparse
import datetime
import json
import os
import sys

DEFAULT_OUTREACH_DIR = os.path.expanduser("~/workspace/outreach")
DEFAULT_PASSES_DIR = os.path.expanduser(
    "~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes"
)

PLATFORMS = {
    "tiktok": {
        "history": "tiktok-engagement.md",
        "result_prefixes": ("tiktok-",),
    },
    "instagram": {
        "history": "instagram-engagement.md",
        "result_prefixes": ("ig-", "instagram-"),
    },
    "threads": {
        "history": "threads-engagement.md",
        "result_prefixes": ("th-", "threads-"),
    },
    "x": {
        "history": "x-engagement.md",
        "result_prefixes": ("x-",),
    },
    "facebook": {
        "history": "facebook-engagement.md",
        "result_prefixes": ("fb-", "facebook-"),
    },
    "unfollow": {
        "history": None,
        "result_prefixes": (),
        "extra_paths": [
            "instagram-unfollow/unfollow-log.jsonl",
            "instagram-unfollow/state.json",
            "facebook-unfollow/state.json",
        ],
    },
}


def parse_watermark(text):
    """Parse an ISO-8601 watermark into an aware datetime, or None."""
    try:
        dt = datetime.datetime.fromisoformat(text)
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt


def mtime_of(path):
    """Return aware UTC mtime of a file, or None if it cannot be read."""
    try:
        ts = os.stat(path).st_mtime
    except OSError:
        return None
    return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)


def sweep_platform(spec, outreach_dir, passes_dir):
    """Newest evidence mtime across this platform's sources.

    Returns (newest_mtime_or_None, sources_checked, unreadable_paths).
    """
    newest = None
    checked = []
    unreadable = []

    def consider(path):
        nonlocal newest
        checked.append(path)
        m = mtime_of(path)
        if m is None:
            unreadable.append(path)
        elif newest is None or m > newest:
            newest = m

    if spec.get("history"):
        consider(os.path.join(outreach_dir, spec["history"]))
    for rel in spec.get("extra_paths", []):
        consider(os.path.join(outreach_dir, rel))

    prefixes = spec.get("result_prefixes", ())
    if prefixes:
        try:
            names = os.listdir(passes_dir)
        except OSError:
            unreadable.append(passes_dir)
        else:
            for name in sorted(names):
                if name.startswith(prefixes) and name.endswith(".json"):
                    consider(os.path.join(passes_dir, name))
    return newest, checked, unreadable


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--watermark", required=True,
                    help="ISO-8601 timestamp of the last log entry "
                         "(only strictly newer evidence counts)")
    ap.add_argument("--outreach-dir", default=DEFAULT_OUTREACH_DIR)
    ap.add_argument("--passes-dir", default=DEFAULT_PASSES_DIR)
    args = ap.parse_args(argv)

    watermark = parse_watermark(args.watermark)
    if watermark is None:
        print(json.dumps({"error": "unparseable --watermark", "input": args.watermark}),
              file=sys.stderr)
        return 2

    platforms = {}
    unreadable = []
    for name, spec in PLATFORMS.items():
        newest, checked, bad = sweep_platform(spec, args.outreach_dir, args.passes_dir)
        unreadable.extend(bad)
        platforms[name] = {
            "newest_mtime": newest.isoformat() if newest else None,
            "sources_checked": len(checked),
            "new": bool(newest is not None and newest > watermark),
        }

    if unreadable:
        print(json.dumps({"error": "unreadable evidence sources",
                          "paths": sorted(set(unreadable))}), file=sys.stderr)
        return 2

    any_new = any(p["new"] for p in platforms.values())
    print(json.dumps({
        "watermark": watermark.isoformat(),
        "platforms": platforms,
        "any_new": any_new,
    }, indent=2, sort_keys=True))
    return 1 if any_new else 0


if __name__ == "__main__":
    sys.exit(main())
