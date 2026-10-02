/**
 * FYD query resolution: the single shared implementation of FYDQuery
 * semantics (SiteSpec section queries -> bound objects).
 *
 * G1 fix (2026-09-24): this function used to live inline in
 * components/renderer.tsx while the site planner carried its own divergent
 * copy (resolveQueryObjects). The two disagreed on four points:
 *   1. the planner ignored query.limit (a declared `limit: 20` on the
 *      Explore ObjectFeed bound EVERY matching object in the manifest);
 *   2. the planner sorted kind:"all" by id while the renderer sorts feeds
 *      newest-first (updatedAt desc, id tie-break);
 *   3. the planner did not dedupe or honor inversePredicates on
 *      kind:"related";
 *   4. the planner did not exclude owner-hidden objects
 *      (ownerPresentationOverride.hidden), so an owner-hidden fact stayed
 *      in the dependency manifest after the owner hid it.
 * The dependency manifest is the WHY THIS record: it must describe what
 * actually renders. There is now exactly one resolver; the renderer and
 * the planner both consume it.
 *
 * Determinism: related sorts by id, feeds sort newest first with id as
 * tie-break. Never by insertion or database order.
 */

import type { PingObject } from "@/lib/ping/types";
import type { FYDQuery, ObjectGraph } from "./types";

/** Public AND effectively visible: an owner-hidden object keeps its source
 *  visibility (its own page and evidence survive) but is excluded from
 *  query-driven listings and sections. */
function pub(o: PingObject): boolean {
  return o.visibility === "public" && !o.ownerPresentationOverride?.hidden;
}

export function resolveQuery(
  query: FYDQuery,
  graph: ObjectGraph,
  ownerId: string,
): PingObject[] {
  const objects = new Map(graph.objects.map((o) => [o.id, o]));
  switch (query.kind) {
    case "static":
      return [];
    case "owner": {
      const owner = objects.get(ownerId);
      return owner && pub(owner) ? [owner] : [];
    }
    case "reference": {
      return query.objectIds
        .map((id) => objects.get(id))
        .filter((o): o is PingObject => !!o && pub(o));
    }
    case "related": {
      const out: PingObject[] = [];
      const predicates = query.predicates ?? [query.predicate];
      // Inverse predicates match edges running toward `from` (object ->
      // from); the resolved object is the edge's subject. This is how a
      // person works_for the business populates the People section even
      // though the edge runs person -> business. Planner causality fix
      // (2026-09-23): matches the generator's role matching exactly.
      const inverse = query.inversePredicates ?? [];
      for (const r of graph.relationships) {
        if (r.status !== "active") continue;
        let targetId: string | undefined;
        if (r.subject === query.from && predicates.includes(r.predicate)) {
          targetId = r.object;
        } else if (r.object === query.from && inverse.includes(r.predicate)) {
          targetId = r.subject;
        } else {
          continue;
        }
        const target = objects.get(targetId);
        const schemaOk =
          !query.schema && !query.schemas
            ? true
            : query.schema
              ? target?.schema === query.schema
              : query.schemas?.includes(target?.schema ?? "");
        if (target && pub(target) && schemaOk) {
          out.push(target);
        }
      }
      // Dedupe: one object linked both forward and inverse (e.g. employs
      // + works_for) resolves once. Id-keyed, then canonical id sort.
      const seen = new Set<string>();
      const deduped = out.filter((o) => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
      deduped.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return query.limit ? deduped.slice(0, query.limit) : deduped;
    }
    case "all": {
      // A bare "all" resolves everything public; query.schema or
      // query.schemas narrows to the listed schemas. Newest first
      // (updatedAt desc, id tie-break): the Explore feed contract.
      const schemaOk = (o: PingObject) =>
        !query.schema && !query.schemas
          ? true
          : query.schema
            ? o.schema === query.schema
            : (query.schemas ?? []).includes(o.schema);
      const out = graph.objects.filter((o) => pub(o) && schemaOk(o));
      out.sort((a, b) =>
        a.updatedAt !== b.updatedAt
          ? b.updatedAt.localeCompare(a.updatedAt)
          : a.id < b.id
            ? -1
            : 1,
      );
      return query.limit ? out.slice(0, query.limit) : out;
    }
  }
}
