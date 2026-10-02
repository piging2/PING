#!/usr/bin/env python3
"""Fix hidden-object leak: never serialize private objects to the client.

Both generated-site pages passed the full graph (including private
objects like Pergola) to the client component. The client payload now
carries only public objects and their relationships.
"""
import sys

P = "/home/nolan/projects/ping/"

def replace_once(path, old, new, label):
    full = P + path
    s = open(full).read()
    n = s.count(old)
    if n != 1:
        print(f"FAIL {label}: found {n} occurrences, expected 1")
        sys.exit(1)
    open(full, "w").write(s.replace(old, new, 1))
    print(f"OK {label}")

for page in ["src/app/sites/happy-place/page.tsx", "src/app/sites/coppersmith-plumbing/page.tsx"]:
    old = """      <SiteClient
        spec={spec}
        graph={graph}"""
    new = """      <SiteClient
        spec={spec}
        graph={publicGraph(graph)}"""
    replace_once(page, old, new, f"client-graph:{page.split('/')[3]}")

    # add the helper before the return statement; find the component end
    full = P + page
    s = open(full).read()
    helper = """
/**
 * Privacy boundary: the client payload must never contain private
 * objects. The server keeps the full graph; the serialized prop carries
 * only public objects and relationships between public objects.
 */
function publicGraph(graph: {
  objects: { id: string; visibility: string }[];
  relationships: { subject: string; object: string }[];
}) {
  const ids = new Set(
    graph.objects.filter((o) => o.visibility === "public").map((o) => o.id),
  );
  return {
    ...graph,
    objects: graph.objects.filter((o) => ids.has(o.id)),
    relationships: graph.relationships.filter(
      (r) => ids.has(r.subject) && ids.has(r.object),
    ),
  };
}

"""
    # insert before "export default async function"
    marker = "export default async function"
    if s.count(marker) != 1:
        print(f"FAIL helper-insert:{page}: marker count {s.count(marker)}")
        sys.exit(1)
    s = s.replace(marker, helper + marker, 1)
    open(full, "w").write(s)
    print(f"OK helper:{page.split('/')[3]}")

print("ALL EDITS APPLIED")
