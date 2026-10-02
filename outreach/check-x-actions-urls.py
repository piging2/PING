#!/usr/bin/env python3
"""check-x-actions-urls.py — deterministic pre-dispatch preflight for X engagement.

Reads the driver's OWN URL contract (const URL_RE in x-like.js) and validates
every URL in an x-actions-<timestamp>.json file against it.

Why: the 2026-09-16 01:14 MDT X pass dispatched actions with
`https://x.com/@<handle>/status/<id>` (with @). x-like.js rejects that form
(URL_RE requires the handle without @), so every action died at the usage
line, exit 2 — and because x-like-run.ps1 swallows the exit code, the runner
recorded 4 bogus ok=true before the worker killed the run. A 2-second
preflight against the driver's own regex prevents the whole class.

Exit codes: 0 = all URLs valid; 1 = one or more invalid (listed);
2 = usage error, unreadable actions file, or the driver's contract itself
could not be extracted (fail closed — do not dispatch on an unknown contract).
"""
import json
import re
import sys

DEFAULT_DRIVER = "/home/hatch/workspace/pig-fb/x-like.js"


def extract_url_re(driver_path):
    """Extract the driver's const URL_RE regex literal. Returns the pattern str."""
    try:
        with open(driver_path, "r", encoding="utf-8") as f:
            src = f.read()
    except OSError as e:
        return None, f"driver unreadable: {e}"
    m = re.search(r"^const URL_RE = /", src, re.M)
    if not m:
        return None, "const URL_RE = /.../ not found in driver"
    start = m.end()
    # The literal ends at the LAST '/' before the terminating ';'.
    tail = src[start:]
    end = tail.rfind("/;")
    if end < 0:
        return None, "URL_RE literal has no closing /;"
    pattern = tail[:end]
    flags = tail[end + 2 :].split("\n", 1)[0].strip()
    if flags:
        return None, f"URL_RE carries JS flags '{flags}', cannot port to Python safely"
    try:
        compiled = re.compile(pattern)
    except re.error as e:
        return None, f"URL_RE does not compile as Python regex: {e}"
    return compiled, None


def load_urls(path):
    """Return list of (index, url) from an actions file. Accepts list of dicts
    with a 'url' key, list of plain URL strings, or {'actions': [...]}."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        return None, f"actions file unreadable: {e}"
    if isinstance(data, dict) and "actions" in data:
        data = data["actions"]
    if not isinstance(data, list):
        return None, "actions file is not a JSON list (or {'actions': [...]})"
    urls = []
    for i, item in enumerate(data):
        if isinstance(item, dict):
            u = item.get("url")
        elif isinstance(item, str):
            u = item
        else:
            return None, f"record {i} is neither dict nor string"
        if not isinstance(u, str):
            return None, f"record {i} has no string url"
        urls.append((i, u))
    return urls, None


def main(argv):
    if len(argv) not in (2, 3) or argv[1] in ("-h", "--help"):
        print("usage: check-x-actions-urls.py <actions.json> [--driver <x-like.js>]",
              file=sys.stderr)
        return 2
    actions_path = argv[1]
    driver_path = DEFAULT_DRIVER
    if len(argv) == 3:
        if argv[2].startswith("--driver="):
            driver_path = argv[2].split("=", 1)[1]
        else:
            print("usage: check-x-actions-urls.py <actions.json> [--driver=<path>]",
                  file=sys.stderr)
            return 2

    url_re, err = extract_url_re(driver_path)
    if err:
        print(f"CONTRACT-UNREADABLE {err}", file=sys.stderr)
        return 2
    urls, err = load_urls(actions_path)
    if err:
        print(f"ACTIONS-UNREADABLE {err}", file=sys.stderr)
        return 2
    if not urls:
        print("ACTIONS-EMPTY no URLs to validate", file=sys.stderr)
        return 2

    bad = [(i, u) for i, u in urls if not url_re.match(u)]
    if bad:
        for i, u in bad:
            print(f"INVALID record={i} url={u}")
        print(f"{len(bad)}/{len(urls)} URLs fail the driver's URL_RE", file=sys.stderr)
        return 1
    print(f"OK {len(urls)}/{len(urls)} URLs match the driver's URL_RE")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
