import type { ObjectGraph } from "@/fyd/sitespec/types";

/**
 * The graph that crosses the client boundary on the public site pages.
 *
 * Objects the owner hid from the public page (ownerPresentationOverride,
 * composed by the read seam) are excluded here, along with any
 * relationship touching them: the client never receives their data, so
 * view-source cannot resurrect a hidden service. Server-side composition
 * (spec generation, metadata, the full read model) keeps working on the
 * complete graph; this filter applies only to the serialized client
 * payload. Query resolution already excludes hidden objects, so nothing
 * the client renders changes; the payload just stops carrying them.
 */
export function clientGraph(graph: ObjectGraph): ObjectGraph {
  const visible = new Set(
    graph.objects
      .filter((o) => !o.ownerPresentationOverride?.hidden)
      .map((o) => o.id),
  );
  return {
    objects: graph.objects.filter((o) => visible.has(o.id)),
    relationships: graph.relationships.filter(
      (r) => visible.has(r.subject) && visible.has(r.object),
    ),
  };
}
