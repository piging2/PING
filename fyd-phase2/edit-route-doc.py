"""Phase 2 docstring touch for src/app/api/fyd/ask/route.ts (body contract)."""
import sys

PATH = "/home/nolan/projects/ping/src/app/api/fyd/ask/route.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

old = ' * Body: { siteId: string, question: string, mode?: "visitor" | "owner" }\n'
new = ' * Body: { siteId: string, objectId?: string, question: string, mode?: "visitor" | "owner" }\n'
count = src.count(old)
if count != 1:
    print(f"FATAL: found {count} occurrences (expected 1)")
    sys.exit(1)
src = src.replace(old, new, 1)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("ok: route-docstring")
