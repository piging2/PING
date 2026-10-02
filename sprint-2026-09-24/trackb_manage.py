#!/usr/bin/env python3
import sys

# ---- 1. manage page: tri-state buttons go through propose, not direct send ----
P1 = "/home/nolan/projects/ping/src/app/o/[objectId]/manage/page.tsx"
src = open(P1).read()
old = """                        onClick={() =>
                          void send(
                            { type: "set-address-visibility", visibility: opt.value },
                            opt.value === "hide"
                              ? "Hid the location."
                              : opt.value === "show"
                                ? "Show the full address."
                                : "Returned the location visibility to default.",
                          )
                        }
"""
new = """                        onClick={() =>
                          // Address visibility is a MEDIUM-consequence
                          // presentation decision: it always goes through
                          // propose, and the owner approves the typed
                          // proposal on the confirmation card below.
                          void proposeText(
                            opt.value === "hide"
                              ? "hide the address"
                              : opt.value === "show"
                                ? "show the address"
                                : "reset the address visibility",
                          )
                        }
"""
assert src.count(old) == 1, f"manage anchor: {src.count(old)}"
src = src.replace(old, new, 1)
open(P1, "w").write(src)
print("manage/page.tsx: tri-state buttons now propose, never direct-send")

# ---- 2. commands.ts: stale "fast proposal/undo tier" comment ----
P2 = "/home/nolan/projects/ping/src/fyd/object/commands.ts"
src = open(P2).read()
old2 = """  // Address presentation decision (SHOW/HIDE): placed BEFORE the service
  // hide/show so "hide the address" is not consumed as an unknown
  // service name. the pipeline never owns it;
  // the owner asserts it persistently. A local presentation change, so it
  // rides the fast proposal/undo tier.
"""
new2 = """  // Address presentation decision (SHOW/HIDE/DEFAULT): placed BEFORE
  // the service hide/show so "hide the address" is not consumed as an
  // unknown service name. The pipeline never owns it; the owner asserts it
  // persistently. MEDIUM consequence: it always goes through propose and
  // digest-bound approval (no automatic undo); an explicit DEFAULT
  // unwinds an explicit SHOW/HIDE through another confirmed command.
"""
assert src.count(old2) == 1, f"commands anchor: {src.count(old2)}"
src = src.replace(old2, new2, 1)
open(P2, "w").write(src)
print("commands.ts: stale tier comment corrected")
print("OK")
