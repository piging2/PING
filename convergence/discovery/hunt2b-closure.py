#!/usr/bin/env python3
"""Hunt 2b: compute the TRANSITIVE require-closure from live entry points,
then report which of the 207 zero-importer files are inside vs outside it.
Entry: gateway/bootstrap/gateway_runtime.js (+ any file that itself requires it).
"""
import os, re, sys, json

ROOT = "/home/nolan/worktrees/constitutional-convergence"

def resolve(base_dir, req):
    if not req.startswith("."):
        return None
    p = os.path.normpath(os.path.join(base_dir, req))
    for cand in (p, p + ".js", os.path.join(p, "index.js")):
        if os.path.isfile(cand):
            return cand
    return None

def requires_of(path):
    try:
        text = open(path, encoding="utf-8", errors="replace").read()
    except OSError:
        return set()
    out = set()
    base = os.path.dirname(path)
    for m in re.finditer(r"require\(\s*['\"]([^'\"]+)['\"]", text):
        r = resolve(base, m.group(1))
        if r: out.add(r)
    for m in re.finditer(r"from\s+['\"]([^'\"]+)['\"]", text):
        r = resolve(base, m.group(1))
        if r: out.add(r)
    return out

entry = os.path.join(ROOT, "gateway/bootstrap/gateway_runtime.js")
seen, stack = set(), [entry]
while stack:
    p = stack.pop()
    if p in seen: continue
    seen.add(p)
    stack.extend(requires_of(p) - seen)

print(f"transitive closure from gateway_runtime.js: {len(seen)} files", file=sys.stderr)

shelf = json.load(open("/tmp/laneA-hunt2.json"))
inside = [s for s in shelf if os.path.join(ROOT, s["file"]) in seen]
outside = [s for s in shelf if os.path.join(ROOT, s["file"]) not in seen]

print(f"\nzero-importer files INSIDE boot closure (wired via entry): {len(inside)}")
for s in inside[:40]:
    print("  +", s["file"])
print(f"\nzero-importer files OUTSIDE boot closure (true shelfware candidates): {len(outside)}")
for s in outside:
    print("  -", s["file"])

# also: which files does gateway_runtime.js require directly?
print("\ndirect requires of gateway_runtime.js:")
for r in sorted(requires_of(entry)):
    print("  ", os.path.relpath(r, ROOT))
