#!/usr/bin/env python3
"""Fix owner-events.ts(552): v1 migration reads the legacy binary visibility."""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/object/owner-events.ts"
with open(PATH) as f:
    src = f.read()

old = """  if (v1.addressVisibility === "hidden") {
    drafts.push({
      at,
      objectId: v1.objectId,
      type: "owner.hid-fact",
      actor: MIGRATION_ACTOR,
      target: ADDRESS_TARGET,"""
new = """  // v1 files predate the SHOW/HIDE/DEFAULT tri-state: their
  // addressVisibility was "public" | "hidden". Read the raw legacy value
  // (the tri-state mapping for live reads lives in readOverrides above).
  const v1Visibility: unknown = (v1 as { addressVisibility?: unknown })
    .addressVisibility;
  if (v1Visibility === "hidden") {
    drafts.push({
      at,
      objectId: v1.objectId,
      type: "owner.hid-fact",
      actor: MIGRATION_ACTOR,
      target: ADDRESS_TARGET,"""
if src.count(old) != 1:
    print(f"expected 1, found {src.count(old)}. ABORTING.")
    sys.exit(1)
src = src.replace(old, new, 1)
with open(PATH, "w") as f:
    f.write(src)
print("owner-events.ts: v1 migration legacy visibility fixed")
