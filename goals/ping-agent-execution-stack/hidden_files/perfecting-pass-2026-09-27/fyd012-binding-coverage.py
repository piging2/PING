#!/usr/bin/env python3
"""
FYD-012 binding-coverage lint (ping-perfecting-pass 2026-09-26).

Invariant: every FACTUAL value a renderer reads from an observed object
must be read through the presentation-binding verifier (verifyPresentationBinding
/ resolveBoundField / the boundField family). Any direct `.fields` access in a
renderer file is a potential bypass and must carry an allowlist entry with a
written justification.

Usage:
  python3 fyd012-binding-coverage.py --inventory <file...>   # dump all occurrences as JSON
  python3 fyd012-binding-coverage.py --check <file...>       # fail on any uncovered occurrence
  python3 fyd012-binding-coverage.py --check --allowlist <json> <file...>

Occurrence identity is sha256(relative_path + enclosing_function +
normalized_line), so a new direct read anywhere (or a changed read line)
fails closed until a human re-justifies it in the allowlist.
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

WORKSPACE = Path("/home/hatch/workspace")
READ_RE = re.compile(r"\.fields\b")
FUNC_RE = re.compile(
    r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)"
    r"|^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\("
    r"|^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*function"
)


def enclosing_function(lines, lineno):
    """Nearest function/const-arrow name above the match line."""
    for i in range(lineno - 1, -1, -1):
        m = FUNC_RE.match(lines[i])
        if m:
            name = m.group(1) or m.group(2) or m.group(3)
            return name
    return "<top-level>"


def occurrences(path: Path):
    text = path.read_text()
    lines = text.splitlines()
    rel = str(path.relative_to(WORKSPACE)) if path.is_relative_to(WORKSPACE) else str(path)
    out = []
    for i, line in enumerate(lines):
        if not READ_RE.search(line):
            continue
        func = enclosing_function(lines, i)
        normalized = re.sub(r"\s+", " ", line).strip()
        oid = hashlib.sha256(
            f"{rel}\n{func}\n{normalized}".encode()
        ).hexdigest()[:16]
        out.append(
            {
                "id": oid,
                "file": rel,
                "line": i + 1,
                "function": func,
                "text": normalized,
            }
        )
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inventory", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--allowlist", default=None)
    ap.add_argument("files", nargs="+")
    args = ap.parse_args()

    all_occs = []
    for f in args.files:
        all_occs.extend(occurrences(Path(f)))

    if args.inventory:
        print(json.dumps(all_occs, indent=2))
        return 0

    if args.check:
        allow = {}
        if args.allowlist:
            allow = json.load(open(args.allowlist))
        uncovered = [o for o in all_occs if o["id"] not in allow]
        if uncovered:
            print(f"FYD-012 LINT FAIL: {len(uncovered)} uncovered direct .fields read(s):")
            for o in uncovered:
                print(f"  {o['file']}:{o['line']} [{o['function']}] id={o['id']}")
                print(f"    {o['text']}")
            return 1
        print(f"FYD-012 LINT PASS: {len(all_occs)} direct read(s), all allowlisted.")
        return 0

    ap.error("pass --inventory or --check")


if __name__ == "__main__":
    sys.exit(main())
