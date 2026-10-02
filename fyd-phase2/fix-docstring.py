"""Fix literal backslash-escapes left in the ask-pipeline docstring."""
import sys

PATH = "/home/nolan/projects/ping/src/app/api/fyd/ask/ask-pipeline.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

old = ' * Visitor vs owner scope: mode \\"visitor\\" (default) answers from PUBLIC\n'
new = ' * Visitor vs owner scope: mode "visitor" (default) answers from PUBLIC\n'
count = src.count(old)
if count != 1:
    print(f"FATAL: found {count} occurrences (expected 1)")
    sys.exit(1)
src = src.replace(old, new, 1)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("ok: docstring escapes")
