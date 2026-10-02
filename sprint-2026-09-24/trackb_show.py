#!/usr/bin/env python3
P = "/home/nolan/projects/ping/src/fyd/sitespec/public-projection.ts"
src = open(P).read()

old = """  if (siteId && !seenLog.has(siteId)) {
    const businessIds = graph.objects
      .filter((o) => SCHEMA_ROLES.business.includes(o.schema))
      .map((o) => o.id);
    for (const d of objectDecisionsToFieldVisibility(siteId)) {
      for (const targetId of businessIds) {
        decisions.push({ ...d, objectId: targetId });
      }
    }
  }
  return decisions;
}"""
new = """  if (siteId && !seenLog.has(siteId)) {
    const businessIds = graph.objects
      .filter((o) => SCHEMA_ROLES.business.includes(o.schema))
      .map((o) => o.id);
    for (const d of objectDecisionsToFieldVisibility(siteId)) {
      for (const targetId of businessIds) {
        decisions.push({ ...d, objectId: targetId });
      }
    }
  }
  // SHOW propagation (Track B, 2026-09-25): an address SHOW decision on a
  // business object must reach the address-bearing field, which lives on
  // the related location object (located_at). The conservative default
  // coarsens address-bearing fields, so without propagation a SHOW on the
  // business would silently keep the public projection coarsened. HIDE
  // needs no propagation: applyHideTraversal cuts located_at traversal.
  const businessIdSet = new Set(
    graph.objects
      .filter((o) => SCHEMA_ROLES.business.includes(o.schema))
      .map((o) => o.id),
  );
  for (const d of decisions.filter(
    (x) => x.policy === "show" && x.field === "address",
  )) {
    if (!businessIdSet.has(d.objectId)) continue;
    for (const r of graph.relationships) {
      if (
        r.subject === d.objectId &&
        r.predicate === "located_at" &&
        r.status === "active"
      ) {
        decisions.push({ ...d, objectId: r.object });
      }
    }
  }
  return decisions;
}"""
assert src.count(old) == 1, f"anchor: {src.count(old)}"
src = src.replace(old, new, 1)
open(P, "w").write(src)
print("public-projection.ts: SHOW propagates to located_at locations")
print("OK")
