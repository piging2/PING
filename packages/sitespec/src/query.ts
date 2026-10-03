/**
 * Section query resolution: the render path's object-resolution seam.
 *
 * HARVEST (adapted).
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f8347
 *         src/fyd/components/renderer.tsx (the four exported pure
 *         functions: resolveQuery, applyObjectOrder, applyHiddenObjects,
 *         siteDeactivatedObjectIds)
 * TARGET OWNER: packages/sitespec (piging2 experience IR)
 * DEPENDENCIES: ./types, ./ping-types, ./schema-roles
 * PROOFS: [1, 2, 3, 4, 5]
 *
 * ADAPTATION, honestly stated: these four functions are harvested
 * VERBATIM from the source renderer; only the import lines changed
 * (source path aliases -> this package). The 2210-line React renderer
 * itself is REJECTED for this slice (Next.js coupling: react, @/ path
 * aliases, UI component tree). These four functions ARE the query
 * resolution path the real render path (renderSection) uses, so the
 * semantic render model built over them is built over the proven
 * ordering semantics, not a reimplementation.
 */

// ---------------------------------------------------------------------------
// Query resolution. Deterministic and locale-independent: related sorts
// by id, feeds sort newest first (updatedAt, UTF-16 code-unit order)
// with id as tie-break. Never by insertion order, database order, or
// locale collation (SOUL section 10: constitutional outputs must not
// depend on locale).
// ---------------------------------------------------------------------------

import type { PingObject } from "./ping-types";
import type { FYDQuery, FYDSiteSpec, ObjectGraph } from "./types";
import { ownerRelationshipTarget, ROLE_PREDICATES } from "./schema-roles";

/**
 * The relationship vocabulary the query seam understands: every
 * predicate in ROLE_PREDICATES (schema-roles.ts). A query naming a
 * predicate outside this vocabulary is a typo or a drifted generator,
 * never a query that means "nothing".
 */
export const KNOWN_PREDICATES: ReadonlySet<string> = new Set(
  (Object.values(ROLE_PREDICATES) as string[][]).flat(),
);

/**
 * Typed refusal for an unknown relationship predicate at the query
 * seam. Thrown by resolveQuery: an unknown predicate (typo "offres")
 * fails LOUD here instead of silently resolving to [] and rendering an
 * empty section nobody can explain.
 */
export class UnknownPredicateError extends Error {
  readonly predicate: string;
  constructor(predicate: string) {
    super(
      `resolveQuery: unknown relationship predicate ${JSON.stringify(predicate)}; ` +
        `known predicates: ${[...KNOWN_PREDICATES].sort().join(", ")}`,
    );
    this.name = "UnknownPredicateError";
    this.predicate = predicate;
  }
}

/** Fail TYPED on the first unknown predicate in the match set. */
function assertKnownPredicates(predicates: readonly string[]): void {
  for (const p of predicates) {
    if (!KNOWN_PREDICATES.has(p)) throw new UnknownPredicateError(p);
  }
}

export function resolveQuery(
  query: FYDQuery,
  graph: ObjectGraph,
  ownerId: string,
): PingObject[] {
  const objects = new Map(graph.objects.map((o) => [o.id, o]));
  const pub = (o: PingObject) => o.visibility === "public";
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
      // Direction-agnostic: the bound object is whichever endpoint of the
      // relationship is not the query anchor (usually the owner). Inverse
      // predicates (works_for, provided_by, published_by) bind exactly
      // like their forward twins. Deduped by id: a pair linked by both
      // employs and member_of still renders one card.
      const seen = new Set<string>();
      const out: PingObject[] = [];
      const predicates = query.predicates ?? [query.predicate];
      // Unknown predicates fail TYPED here: a typo must never silently
      // resolve to [] and render an empty section.
      assertKnownPredicates(predicates);
      for (const r of graph.relationships) {
        if (!predicates.includes(r.predicate)) continue;
        const memberId = ownerRelationshipTarget(r, query.from);
        if (memberId === null || seen.has(memberId)) continue;
        const target = objects.get(memberId);
        const schemaOk =
          !query.schema && !query.schemas
            ? true
            : query.schema
              ? target?.schema === query.schema
              : query.schemas?.includes(target?.schema ?? "");
        if (target && pub(target) && schemaOk) {
          seen.add(memberId);
          out.push(target);
        }
      }
      out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return query.limit ? out.slice(0, query.limit) : out;
    }
    case "all": {
      // Mirrors the "related" case: a bare "all" resolves everything public;
      // query.schema or query.schemas narrows to the listed schemas.
      const schemaOk = (o: PingObject) =>
        !query.schema && !query.schemas
          ? true
          : query.schema
            ? o.schema === query.schema
            : (query.schemas ?? []).includes(o.schema);
      const out = graph.objects.filter((o) => pub(o) && schemaOk(o));
      // Newest first, UTF-16 code-unit order, id as a TOTAL tie-break.
      // localeCompare is banned here: collation is environment-dependent
      // (ICU tables, ambient default locale) and calls byte-distinct
      // timestamps "equal" (e.g. NFC vs NFD), which silently disables the
      // tie-break and makes V8's stable sort preserve input order. SOUL
      // section 10.
      out.sort((a, b) => {
        if (a.updatedAt !== b.updatedAt)
          return a.updatedAt < b.updatedAt ? 1 : -1; // newest first
        if (a.id !== b.id) return a.id < b.id ? -1 : 1;
        return 0;
      });
      return query.limit ? out.slice(0, query.limit) : out;
    }
  }
}

/**
 * Owner-approved object ordering (PRESENTATION INTENT layer). Pure and
 * deterministic: ids listed in objectOrder come first, in that order;
 * resolved objects not listed keep their relative query order after
 * them. Unknown ids are ignored, never rendered. Zero customer-specific
 * conditionals: every section component shares this seam.
 */
export function applyObjectOrder(
  objects: PingObject[],
  objectOrder: readonly string[] | undefined,
): PingObject[] {
  if (!objectOrder || objectOrder.length === 0) return objects;
  const byId = new Map(objects.map((o) => [o.id, o]));
  const seen = new Set<string>();
  const out: PingObject[] = [];
  for (const id of objectOrder) {
    const o = byId.get(id);
    if (o && !seen.has(id)) {
      seen.add(id);
      out.push(o);
    }
  }
  for (const o of objects) {
    if (!seen.has(o.id)) out.push(o);
  }
  return out;
}

/**
 * Owner-approved object deactivation (PRESENTATION INTENT layer). Pure and
 * deterministic: objects whose id is listed in hiddenObjectIds are removed;
 * every other object keeps its relative order. Unknown ids are ignored,
 * never rendered. Zero customer-specific conditionals: every section
 * component shares this seam.
 */
export function applyHiddenObjects(
  objects: PingObject[],
  hiddenObjectIds: readonly string[] | undefined,
): PingObject[] {
  if (!hiddenObjectIds || hiddenObjectIds.length === 0) return objects;
  const hidden = new Set(hiddenObjectIds);
  return objects.filter((o) => !hidden.has(o.id));
}

/**
 * Site-wide owner deactivation set (PRESENTATION INTENT layer). Pure and
 * deterministic: the union of every section's hiddenObjectIds, in spec
 * order, deduplicated. An object the owner hid in one section must not be
 * promoted anywhere else on the public surface: the Featured Object rail,
 * mobile in-flow composition, and every other section resolve through
 * renderSection, so they all share this exclusion set. Source observations
 * and the canonical graph are untouched; owner/internal tooling still sees
 * the hidden objects. Zero customer-specific conditionals.
 */
export function siteDeactivatedObjectIds(
  spec: FYDSiteSpec,
): readonly string[] | undefined {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const page of spec.pages) {
    for (const section of page.sections) {
      const hidden = section.presentation.hiddenObjectIds;
      if (!hidden) continue;
      for (const id of hidden) {
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }
  }
  return ids.length > 0 ? ids : undefined;
}
