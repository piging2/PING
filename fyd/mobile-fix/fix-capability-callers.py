#!/usr/bin/env python3
"""Pass nodeObjectId to CapabilityActions in card.tsx and node.tsx."""
import sys

P = "/home/nolan/projects/ping/"

for path, label in [
    ("src/fyd/object/card.tsx", "card"),
    ("src/fyd/object/node.tsx", "node"),
]:
    full = P + path
    s = open(full).read()
    old = """      <CapabilityActions
        capabilities={projection.capabilities}
        nodeHref="""
    if s.count(old) != 1:
        print(f"FAIL {label}")
        sys.exit(1)
    # insert nodeObjectId after nodeHref line
    s = s.replace(old, old, 1)
    # find the nodeHref value line and add nodeObjectId after it
    import re
    s = re.sub(
        r"(<CapabilityActions\n(?:.*\n)*?\s*nodeHref=\{[^\}]*\}\n)",
        r"\1        nodeObjectId={projection.id}\n",
        s,
        count=1,
    )
    open(full, "w").write(s)
    print(f"OK {label}")

print("DONE")
