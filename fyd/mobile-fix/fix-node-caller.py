#!/usr/bin/env python3
"""Fix node.tsx CapabilityActions caller."""
import sys

P = "/home/nolan/projects/ping/"
full = P + "src/fyd/object/node.tsx"
s = open(full).read()
old = """          <CapabilityActions
            capabilities={projection.capabilities}
            nodeHref={nodeHref}
            className="mt-2"
          />"""
new = """          <CapabilityActions
            capabilities={projection.capabilities}
            nodeHref={nodeHref}
            nodeObjectId={projection.id}
            className="mt-2"
          />"""
if s.count(old) != 1:
    print(f"FAIL node: found {s.count(old)}")
    sys.exit(1)
open(full, "w").write(s.replace(old, new, 1))
print("OK node")
