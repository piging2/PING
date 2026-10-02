import io, sys

path = "src/fyd/preview/pipeline.ts"
s = io.open(path, encoding="utf-8").read()

anchor = """/** Object ids with portal projections available. Derived from the authoritative
 * object registry, never a hardcoded customer list. */"""
assert s.count(anchor) == 1, "anchor not found"

addition = """/**
 * Staged rollout gate for homepage Circles (Nolan, 2026-09-22): HAPPY PLACE
 * ONLY until Nolan personally approves the next identity. This is product
 * configuration, not customer branching: every listed site id flows through
 * the identical buildPortalProjection -> CircleProjection -> PortalCircle
 * path with no per-customer behavior. Approving Circle #2 (Coppersmith)
 * is a one-line change here.
 */
export const HOMEPAGE_CIRCLE_SITE_IDS: string[] = ["happy-place"];

/** Object ids with portal projections available. Derived from the authoritative
 * object registry, never a hardcoded customer list. */"""

io.open(path, "w", encoding="utf-8").write(s.replace(anchor, addition))
print("OK pipeline.ts")
