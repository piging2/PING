#!/usr/bin/env python3
"""compare current ss ports (one per line on stdin) vs listeners.json baseline.
Prints space-separated NEW ports, or NONE."""
import json, sys
base = set(json.load(open(sys.argv[1]))["ports"])
cur = set(l.strip() for l in sys.stdin if l.strip())
print(" ".join(sorted(cur - base)) or "NONE")
