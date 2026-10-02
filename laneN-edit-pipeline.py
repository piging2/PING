"""LANE N edits for src/fyd/ask/field-conflicts.ts (D2 plumbing)
and src/app/sites/_shared/spec-pipeline.ts (D2 withholding)."""
import sys

# ---- field-conflicts.ts: export the locked copy ----
P1 = "/home/nolan/projects/ping/src/fyd/ask/field-conflicts.ts"
with open(P1) as f:
    s1 = f.read()

old1 = """/** True when the conflict suppresses the field in public answers. */
export function isUnresolvedConflict(c: AskFieldConflict): boolean {"""
new1 = """/**
 * Locked public copy for a field withheld by an unresolved conflict
 * (FYD-Q1). Non-ask surfaces (e.g. /sites) reuse this exact string so a
 * visitor sees identical copy everywhere a disputed field is withheld.
 * Plumbing only: rendering the copy on a surface belongs to that
 * surface's lane.
 */
export const CONFLICT_BEING_VERIFIED_COPY =
  "Contact information is being verified.";

/** True when the conflict suppresses the field in public answers. */
export function isUnresolvedConflict(c: AskFieldConflict): boolean {"""

assert s1.count(old1) == 1, "field-conflicts anchor mismatch"
s1 = s1.replace(old1, new1, 1)
with open(P1, "w") as f:
    f.write(s1)
print("OK: field-conflicts.ts")

# ---- spec-pipeline.ts: thread declared conflicts, withhold ----
P2 = "/home/nolan/projects/ping/src/app/sites/_shared/spec-pipeline.ts"
with open(P2) as f:
    s2 = f.read()

edits = []

# docstring: note the conflict withholding
edits.append((
    """ * The graph handed to pages is the verified public projection's graph:
 * public objects and endpoint-safe relationships only, owner-hidden fields
 * already removed at the boundary. There is no separate "publicGraph"
 * step: the boundary IS the privacy step, applied once, before compile.
 */""",
    """ * The graph handed to pages is the verified public projection's graph:
 * public objects and endpoint-safe relationships only, owner-hidden fields
 * already removed at the boundary. There is no separate "publicGraph"
 * step: the boundary IS the privacy step, applied once, before compile.
 * Declared unresolved field conflicts (FYD-Q1) are withheld from that
 * graph before compile, exactly as the ask lane withholds them.
 */""",
))

# imports
edits.append((
    """import type { VerifiedPublicProjection } from "@/fyd/sitespec/public-projection";""",
    """import type { VerifiedPublicProjection } from "@/fyd/sitespec/public-projection";
import { getSiteBundle } from "@/fyd/media/site-bundle";
import {
  isUnresolvedConflict,
  suppressConflictedFields,
  type AskFieldConflict,
} from "@/fyd/ask/field-conflicts";""",
))

# interface: withheld list
edits.append((
    """  findings: FYDFinding[];
  renderable: boolean;
}""",
    """  findings: FYDFinding[];
  renderable: boolean;
  /**
   * FYD-Q1 defense-in-depth (LANE-CLAIM D2): contact fields withheld
   * from the compiled spec and the returned graph because of declared
   * unresolved field conflicts. Inert in production today (no bundle
   * declares conflicts): empty unless a conflict is declared. Pages
   * render CONFLICT_BEING_VERIFIED_COPY for these fields.
   */
  withheldConflictedFields: { objectId: string; field: string }[];
}""",
))

# body: thread the declared conflict list, suppress before compile
edits.append((
    """  const projection = await getVerifiedPublicProjection(siteId, "anonymous");
  const graph = projection.graph;""",
    """  const projection = await getVerifiedPublicProjection(siteId, "anonymous");
  // FYD-Q1 defense-in-depth (LANE-CLAIM D2): the site bundle may declare
  // unresolved field conflicts. The ask lane withholds them via
  // suppressConflictedFields (visitor-answer publicGraphOf); /sites does
  // the same here so a disputed contact value can never render on a page
  // either. Inert in production today: buildBundle never sets
  // fieldConflicts. A bundle-read failure falls back to no declared
  // conflicts (today's behavior), never to a broken page.
  let declaredConflicts: AskFieldConflict[] = [];
  try {
    declaredConflicts = (await getSiteBundle(siteId))?.fieldConflicts ?? [];
  } catch {
    declaredConflicts = [];
  }
  const graph = suppressConflictedFields(projection.graph, declaredConflicts);
  const withheldConflictedFields = declaredConflicts
    .filter(isUnresolvedConflict)
    .map((c) => ({ objectId: c.objectId, field: c.field }));""",
))

# return: include the withheld list
edits.append((
    """  return {
    projection,
    graph,
    spec,
    findings,
    renderable: isRenderable(findings),
  };""",
    """  return {
    projection,
    graph,
    spec,
    findings,
    renderable: isRenderable(findings),
    withheldConflictedFields,
  };""",
))

failed = []
for i, (old, new) in enumerate(edits):
    count = s2.count(old)
    if count != 1:
        failed.append((i, count))
    else:
        s2 = s2.replace(old, new, 1)

if failed:
    print("FAILED EDITS:", failed)
    sys.exit(1)

with open(P2, "w") as f:
    f.write(s2)
print("OK: spec-pipeline.ts, all", len(edits), "edits applied")
