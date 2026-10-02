#!/usr/bin/env python3
"""H1: AST import-graph scan. Who imports the LEGACY root witness_worker (bare)
vs the canonical workers.witness_worker, and who imports root constitutional_runtime?
Live assertion: parse every .py file's AST; report exact import sites."""
import ast, os, sys

ROOT = "/home/nolan/worktrees/ping-harvest-12h"
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "archive", "worktrees"}

legacy_importers = []   # bare `witness_worker` (the legacy root module)
canonical_importers = []  # workers.witness_worker
cr_importers = []       # root constitutional_runtime

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        if not fn.endswith(".py"):
            continue
        path = os.path.join(dirpath, fn)
        rel = os.path.relpath(path, ROOT)
        try:
            tree = ast.parse(open(path, encoding="utf-8").read())
        except Exception as e:
            print(f"PARSE-FAIL {rel}: {e}")
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for a in node.names:
                    if a.name == "witness_worker":
                        legacy_importers.append(f"{rel}:{node.lineno}")
                    elif a.name == "constitutional_runtime":
                        cr_importers.append(f"{rel}:{node.lineno} (module-level, no dot -> ROOT module)")
            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ""
                if mod == "witness_worker":
                    legacy_importers.append(f"{rel}:{node.lineno} from-import")
                elif mod == "workers.witness_worker":
                    canonical_importers.append(f"{rel}:{node.lineno} from-import")
                elif mod == "constitutional_runtime":
                    cr_importers.append(f"{rel}:{node.lineno} from-import (ROOT module)")
                elif mod.endswith("constitutional_runtime") and "runtime." in mod:
                    pass  # runtime/constitutional_runtime.py, a different module

print("== bare `witness_worker` (LEGACY root module) importers ==")
print("\n".join(legacy_importers) or "(none)")
print("== `workers.witness_worker` (canonical) importers ==")
print("\n".join(canonical_importers) or "(none)")
print("== root `constitutional_runtime` importers ==")
print("\n".join(cr_importers) or "(none)")

# Verdict assertions
ok = True
if len(legacy_importers) != 1 or "constitutional_runtime.py" not in legacy_importers[0]:
    print("ASSERT-FAIL: expected exactly one legacy importer (root constitutional_runtime.py)")
    ok = False
if cr_importers:
    print("ASSERT-FAIL: root constitutional_runtime.py has live importers")
    ok = False
print("H1-RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
