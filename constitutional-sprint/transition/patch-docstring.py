"""One-line docstring correction (comment only, zero behavioral change).

File: src/app/api/fyd/customize/route.ts (header comment for the clear action).
Evidence: handleClear (same file) appends a compensating clear_presentation_intent
op via emitOverlayEvent; the journal is append-only and directives are never
removed. The old docstring claimed removal from the journal.
"""
import io
import sys

P = "/home/nolan/projects/ping-constitutional/src/app/api/fyd/customize/route.ts"
OLD = " *       Removes an approved directive from the journal (demo only)."
NEW = (
    " *       Appends a compensating clear_presentation_intent op (the journal\n"
    " *       is append-only; directives are never removed) (demo only)."
)

s = io.open(P, encoding="utf-8").read()
n = s.count(OLD)
if n != 1:
    print("ABORT: expected exactly 1 match, found %d" % n)
    sys.exit(1)
io.open(P, "w", encoding="utf-8").write(s.replace(OLD, NEW))
print("PATCHED")
