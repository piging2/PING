#!/usr/bin/env python3
"""Fix CapabilityActions callers: pass nodeObjectId."""
import sys

P = "/home/nolan/projects/ping/"

# card.tsx: FydObjectCard — what identifies the object here?
full = P + "src/fyd/object/card.tsx"
s = open(full).read()
# find the component signature to get the object id prop name
import re
m = re.search(r"export function FydObjectCard\(\{\s*([^}]+)\}", s)
print("card props:", m.group(1)[:200] if m else "NOT FOUND")
