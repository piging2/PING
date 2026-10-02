"""Add fyd to NAMESPACE_OWNERS in event_governance.js. Runs ON THE PIG. Idempotent."""
import sys

Q = chr(39)
P = "/home/nolan/ping/ping-runtime/events/event_governance.js"
src = open(P, encoding="utf-8").read()
if "fyd: " + Q + "FYD" + Q in src or 'fyd: "FYD"' in src:
    print("ALREADY-PRESENT")
    sys.exit(0)

anchor = "  github: " + Q + "HPP" + Q + ",\n};"
assert src.count(anchor) == 1, "anchor count=%d" % src.count(anchor)
addition = ("  github: " + Q + "HPP" + Q + ",\n"
            "\n"
            "  // FYD product namespaces (2026-09-21): FYD site projections and\n"
            "  // owner-correction overlays. Owned by the FYD product authority.\n"
            "  fyd: " + Q + "FYD" + Q + ",\n};")
open(P, "w", encoding="utf-8").write(src.replace(anchor, addition))
print("GOV-EDIT-OK")
