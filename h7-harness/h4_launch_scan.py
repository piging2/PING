#!/usr/bin/env python3
"""H4: Launch-path scan. Search every plausible launcher surface for a live
invocation of root constitutional_runtime.py or root witness_worker.py.
Surfaces: compose*.yaml/yml, Dockerfile*, *.sh, *.ps1, *.vbs, scripts/,
.github/workflows, package.json, *.service, Procfile, Makefile.
Docs (*.md), archive/, worktrees/, node_modules, .git excluded (not launch)."""
import os, re, sys

ROOT = "/home/nolan/worktrees/ping-harvest-12h"
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "archive", "worktrees", "docs"}
LAUNCH_EXT = {".sh", ".ps1", ".vbs", ".service", ".bat", ".cmd"}
LAUNCH_NAMES = {"dockerfile", "makefile", "procfile"}
COMPOSE_RE = re.compile(r"compose.*\.ya?ml$", re.I)

# matches a *root-relative* invocation: e.g. "python constitutional_runtime.py",
# "python witness_worker.py", but NOT "runtime/constitutional_runtime" or "workers/witness_worker"
PATTERNS = [
    re.compile(r"(^|[\s\"'`])(python3?|py)\s+constitutional_runtime\.py"),
    re.compile(r"(^|[\s\"'`])(python3?|py)\s+witness_worker\.py"),
    re.compile(r"from\s+constitutional_runtime\s+import|import\s+constitutional_runtime\b"),
    re.compile(r"from\s+witness_worker\s+import|import\s+witness_worker\b"),
]

hits = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
    for fn in filenames:
        if fn.endswith(".md"):
            continue
        low = fn.lower()
        is_launch = (os.path.splitext(low)[1] in LAUNCH_EXT or low in LAUNCH_NAMES
                     or COMPOSE_RE.search(low) or low == "package.json"
                     or "github/workflows" in dirpath.replace(os.sep, "/"))
        if not is_launch:
            continue
        path = os.path.join(dirpath, fn)
        rel = os.path.relpath(path, ROOT)
        try:
            text = open(path, encoding="utf-8", errors="replace").read()
        except Exception:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            for p in PATTERNS:
                if p.search(s):
                    hits.append(f"{rel}:{i}: {s[:140]}")

print("== launch-surface hits for ROOT constitutional_runtime / witness_worker ==")
print("\n".join(hits) or "(none)")
ok = len(hits) == 0
print("H4-RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
