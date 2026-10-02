#!/usr/bin/env python3
"""Hunt 2: shelfware correctness mechanisms.
For JS files under runtime-relevant dirs, collect exported class/function names
(module.exports = {...} and class X definitions), then count live importers
(require/import of the file). Report exports with zero live importers.
"""
import os, re, sys, json

ROOT = "/home/nolan/worktrees/constitutional-convergence"
DIRS = ["gateway", "ping-runtime", "runtime", "orca"]
EXCLUDE = {"node_modules", ".git", "archive", "evals", "test", "tests", "__tests__",
           "migration-certification", "hidden_files", "releases"}

def iter_files():
    for base in DIRS:
        bp = os.path.join(ROOT, base)
        if not os.path.isdir(bp):
            continue
        for dirpath, dirnames, filenames in os.walk(bp):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE]
            for f in filenames:
                if f.endswith((".js", ".mjs", ".cjs")) and not f.startswith("test_") and "/test" not in dirpath:
                    yield os.path.join(dirpath, f)

files = list(iter_files())
print(f"{len(files)} live-candidate files", file=sys.stderr)

# map: file -> exported names
exports = {}
for path in files:
    try:
        text = open(path, encoding="utf-8", errors="replace").read()
    except OSError:
        continue
    names = set()
    for m in re.finditer(r"class\s+(\w+)", text):
        names.add(m.group(1))
    for m in re.finditer(r"module\.exports\s*=\s*\{([^}]{0,3000})\}", text):
        for n in re.finditer(r"(\w+)\s*[:,}]", m.group(1)):
            names.add(n.group(1))
    m = re.search(r"module\.exports\s*=\s*(\w+)\s*;", text)
    if m:
        names.add(m.group(1))
    if names:
        exports[path] = names

# for each exporting file, count importers of its basename (require('./x') or from './x')
shelfware = []
for path, names in sorted(exports.items()):
    base = os.path.basename(path)[:-3]
    rel = os.path.relpath(path, ROOT)
    importer_hits = []
    for p2 in files:
        if p2 == path:
            continue
        try:
            t2 = open(p2, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        # require path containing the basename, or import from
        if re.search(r"require\(['\"][^'\"]*" + re.escape(base) + r"['\"]\)", t2):
            importer_hits.append(os.path.relpath(p2, ROOT))
        elif re.search(r"from\s+['\"][^'\"]*" + re.escape(base) + r"['\"]", t2):
            importer_hits.append(os.path.relpath(p2, ROOT))
    if not importer_hits:
        shelfware.append({"file": rel, "exports": sorted(names)})

print(f"\n{len(shelfware)} files with exports and ZERO live importers:")
for s in shelfware:
    print(f"  {s['file']}: {', '.join(s['exports'][:6])}")
json.dump(shelfware, open("/tmp/laneA-hunt2.json", "w"), indent=1)
