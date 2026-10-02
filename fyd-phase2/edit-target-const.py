"""Fix TS18047 in visitor-answer.ts: use const for the narrowed target
(the closure in .filter() discards narrowing on a mutable let)."""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/ask/visitor-answer.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

old = """  const publicGraph = publicGraphOf(bundle.graph);
  const requestedObjectId =
    typeof input.objectId === "string" ? input.objectId.trim() : "";
  let target: PingObject | null;
  let relatedObjects: PingObject[];
  if (requestedObjectId.length > 0) {
    // Object-scoped ask: the target is one object in THIS tenant's public
    // graph. Unknown ids fail closed as unknown_object; non-public objects
    // never enter the public graph, so they fail closed the same way.
    // Cross-tenant leakage is impossible by construction: the lookup is
    // scoped to this tenant's graph (the loadObjectViewById honesty
    // contract, enforced against the bundle being answered from).
    target = publicGraph.objects.find((o) => o.id === requestedObjectId) ?? null;
    if (!target) {
      return {
        ok: false,
        error: { kind: "unknown_object", message: "Unknown object for this site." },
      };
    }
    relatedObjects = oneHopRelatedObjects(publicGraph, target.id);
  } else {
    target = publicGraph.objects.find((o) => o.id === bundle.spec.ownerObjectId) ?? null;
    if (!target) {
      // The bundle has no public business object to answer from: a server
      // problem, never something to paper over with a guess.
      return {
        ok: false,
        error: { kind: "bundle_invalid", message: "This site is not available right now." },
      };
    }
    relatedObjects = publicGraph.objects.filter((o) => o.id !== target.id);
  }
"""
new = """  const publicGraph = publicGraphOf(bundle.graph);
  const requestedObjectId =
    typeof input.objectId === "string" ? input.objectId.trim() : "";
  // Object-scoped ask: the target is one object in THIS tenant's public
  // graph. Unknown ids fail closed as unknown_object; non-public objects
  // never enter the public graph, so they fail closed the same way.
  // Cross-tenant leakage is impossible by construction: the lookup is
  // scoped to this tenant's graph (the loadObjectViewById honesty
  // contract, enforced against the bundle being answered from).
  // (const, not let: the filter closure below keeps narrowing only on an
  // immutable binding.)
  const target =
    (requestedObjectId.length > 0
      ? publicGraph.objects.find((o) => o.id === requestedObjectId)
      : publicGraph.objects.find((o) => o.id === bundle.spec.ownerObjectId)) ?? null;
  if (!target) {
    return {
      ok: false,
      error:
        requestedObjectId.length > 0
          ? { kind: "unknown_object", message: "Unknown object for this site." }
          // The bundle has no public business object to answer from: a
          // server problem, never something to paper over with a guess.
          : { kind: "bundle_invalid", message: "This site is not available right now." },
    };
  }
  const relatedObjects =
    requestedObjectId.length > 0
      ? oneHopRelatedObjects(publicGraph, target.id)
      : publicGraph.objects.filter((o) => o.id !== target.id);
"""
count = src.count(old)
if count != 1:
    print(f"FATAL: found {count} occurrences (expected 1)")
    sys.exit(1)
src = src.replace(old, new, 1)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("ok: const-target")
