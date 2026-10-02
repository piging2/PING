#!/usr/bin/env python3
P = "/home/nolan/projects/ping/src/fyd/object/owner-events.ts"
src = open(P).read()

old_norm = """  // v1 files predate the SHOW/HIDE/DEFAULT tri-state: their
  // addressVisibility was "public" | "hidden". Read the raw legacy value
  // (the tri-state mapping for live reads lives in readOverrides above).
  const v1Visibility: unknown = (v1 as { addressVisibility?: unknown })
    .addressVisibility;
  if (v1Visibility === "hidden") {"""
new_norm = """  // v1 files may carry the legacy binary ("public" | "hidden") or the
  // tri-state values ("default" | "show" | "hide"): normalize through the
  // same compatibility mapping as command validation ("hidden" -> "hide",
  // "public" -> "default"). "default" needs no event (the conservative
  // default applies).
  const v1Visibility: unknown = (v1 as { addressVisibility?: unknown })
    .addressVisibility;
  const normalizedVisibility =
    v1Visibility === "hidden"
      ? "hide"
      : v1Visibility === "public"
        ? "default"
        : v1Visibility;
  if (normalizedVisibility === "hide") {"""
assert src.count(old_norm) == 1, f"norm anchor: {src.count(old_norm)}"
src = src.replace(old_norm, new_norm, 1)

old_tail = """      note: "Migrated hidden street address.",
      generator: FYD_OWNER_GENERATOR,
    });
  }
  for (const [field, correction] of Object.entries(v1.fieldCorrections ?? {})) {"""
new_tail = """      note: "Migrated hidden street address.",
      generator: FYD_OWNER_GENERATOR,
    });
  } else if (normalizedVisibility === "show") {
    drafts.push({
      at,
      objectId: v1.objectId,
      type: "owner.restored-fact",
      actor: MIGRATION_ACTOR,
      target: ADDRESS_TARGET,
      previousBasis: null,
      newValue: { visibility: "show" },
      evidence: stateEvidence("shown address carried from the v1 store"),
      note: "Migrated shown street address.",
      generator: FYD_OWNER_GENERATOR,
    });
  }
  for (const [field, correction] of Object.entries(v1.fieldCorrections ?? {})) {"""
assert src.count(old_tail) == 1, f"tail anchor: {src.count(old_tail)}"
src = src.replace(old_tail, new_tail, 1)

open(P, "w").write(src)
print("owner-events.ts: v1 migration normalizes legacy + tri-state visibility")
print("OK")
