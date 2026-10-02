/**
 * Public projection boundary (piging2 adapter).
 *
 * NEW FYD CODE, not a harvest. The source's public-projection.ts
 * (VerifiedPublicProjection with field-visibility policy, owner-store
 * overrides, and the ask-composer canonicalizer) is too coupled to
 * harvest for this slice (imports: ../object/owner-store,
 * ../components/renderer, @/lib/ping/ask-composer). This adapter owns
 * the minimal boundary the semantic render model needs:
 *
 *   raw ObjectGraph -> public-filtered graph + provenance digests
 *
 * Rules:
 * - Only visibility === "public" objects survive. Relationships survive
 *   only when active AND both endpoints survive.
 * - Owner field-visibility decisions are ENFORCED per field before any
 *   consumer binds a value: a decision hides its field unless its policy
 *   is exactly "public" (fail closed on unknown policies). The projection
 *   works on object copies: the caller's graph is never mutated.
 * - graphDigest = digestCanonical over the canonical public-graph form
 *   (objects and relationships sorted by id; input order irrelevant).
 * - decisionsDigest = digestCanonical(decisions), sorted by
 *   (objectId, field, policy, index). The empty set digests
 *   deterministically.
 * - viewerPolicyDigest = digestCanonical({viewerKind, boundaryVersion}).
 * - checkpoint = `${graphDigest}:${decisionsDigest}`: semantic identity,
 *   never a wall-clock asOf.
 *
 * The brand (`kind`) is a compile-time discriminant plus a runtime
 * check, mirroring the source's defense-in-depth: public-surface
 * constructors take VerifiedPublicProjection; raw ObjectGraph values
 * do not satisfy it.
 */

import { digestCanonical } from "../../trust/src/digest";
import type { PingObject } from "./ping-types";
import type { ObjectGraph } from "./types";

/** Boundary version. Bump when the projection rules above change. */
export const PUBLIC_PROJECTION_VERSION = "piging2-public-projection@2";

export type PublicViewerKind = "anonymous" | "owner";

/**
 * One owner visibility decision.
 *
 * Policy is fail-closed: only the exact policy "public" leaves the
 * field visible. Any other policy ("hidden" or a future vocabulary the
 * boundary does not understand) HIDES the field. `index` addresses one
 * element of an array-valued field; without it the whole field hides.
 * The render model canonicalizes the set sorted by
 * (objectId, field, policy, index).
 */
export interface FieldVisibilityDecision {
  objectId: string;
  field: string;
  policy: string;
  index?: number;
}

export interface PublicProjectionProvenance {
  /** sha256 hex of the canonical public graph form. */
  graphDigest: string;
  /** sha256 hex of the canonicalized owner decisions. */
  decisionsDigest: string;
  /** sha256 hex of the resolved viewer policy. */
  viewerPolicyDigest: string;
  /** `${graphDigest}:${decisionsDigest}`: the semantic snapshot id. */
  checkpoint: string;
  viewerKind: PublicViewerKind;
}

/**
 * An object graph that has passed the public projection boundary.
 */
export interface VerifiedPublicProjection {
  readonly kind: typeof PUBLIC_PROJECTION_VERSION;
  graph: ObjectGraph;
  /**
   * The owner decisions the projection was built under. Carried so
   * downstream models record the decisions that actually shaped the
   * graph, not a caller-supplied claim about them.
   */
  decisions: FieldVisibilityDecision[];
  provenance: PublicProjectionProvenance;
}

/** Runtime brand check for defense-in-depth at trust boundaries. */
export function isVerifiedPublicProjection(
  value: unknown,
): value is VerifiedPublicProjection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === PUBLIC_PROJECTION_VERSION &&
    typeof (value as { graph?: unknown }).graph === "object" &&
    typeof (value as { provenance?: unknown }).provenance === "object"
  );
}

/** Canonical decision order: (objectId, field, policy, index). */
export function compareDecisions(
  a: FieldVisibilityDecision,
  b: FieldVisibilityDecision,
): number {
  if (a.objectId !== b.objectId) return a.objectId < b.objectId ? -1 : 1;
  if (a.field !== b.field) return a.field < b.field ? -1 : 1;
  if (a.policy !== b.policy) return a.policy < b.policy ? -1 : 1;
  const ai = a.index ?? -1;
  const bi = b.index ?? -1;
  return ai < bi ? -1 : ai > bi ? 1 : 0;
}

/**
 * Apply field-visibility decisions to object copies. ONE implementation
 * shared by the projection builder and the owner package's
 * projectPublicGraph (which delegates here): field hiding has a single
 * owner, never two competing implementations.
 *
 * Fail-closed: a decision hides its field unless its policy is exactly
 * "public". "title"/"description" hide to "" (the keys stay: the render
 * model binds them by key); other fields are deleted; one array element
 * hides by `index` when the decision carries one and the value is an
 * array. Decisions naming unknown objects are ignored, never fatal.
 * The input objects are never mutated: every object is copied.
 */
export function applyFieldVisibilityDecisions(
  objects: PingObject[],
  decisions: readonly FieldVisibilityDecision[],
): PingObject[] {
  const hides = decisions.filter((d) => d.policy !== "public");
  if (hides.length === 0) {
    return objects.map((o) => ({ ...o, fields: { ...o.fields } }));
  }
  const byObject = new Map<string, FieldVisibilityDecision[]>();
  for (const d of hides) {
    const list = byObject.get(d.objectId);
    if (list) list.push(d);
    else byObject.set(d.objectId, [d]);
  }
  return objects.map((o) => {
    const ds = byObject.get(o.id);
    if (ds === undefined || ds.length === 0) {
      return { ...o, fields: { ...o.fields } };
    }
    const next: PingObject = { ...o, fields: { ...o.fields } };
    for (const d of ds) {
      if (d.field === "title") {
        next.title = "";
        continue;
      }
      if (d.field === "description") {
        next.description = "";
        continue;
      }
      const v = next.fields[d.field];
      if (d.index !== undefined && Array.isArray(v)) {
        const arr = v.slice();
        arr.splice(d.index, 1);
        if (arr.length === 0) delete next.fields[d.field];
        else next.fields[d.field] = arr;
      } else {
        delete next.fields[d.field];
      }
    }
    return next;
  });
}

export interface BuildProjectionOptions {
  viewerKind?: PublicViewerKind;
  decisions?: FieldVisibilityDecision[];
}

/**
 * Build the verified public projection. Pure and deterministic: the same
 * input graph always yields the same projection (same digests, same
 * checkpoint), regardless of object/relationship input order. The input
 * graph is never mutated.
 */
export function buildVerifiedPublicProjection(
  graph: ObjectGraph,
  opts: BuildProjectionOptions = {},
): VerifiedPublicProjection {
  const viewerKind = opts.viewerKind ?? "anonymous";
  const decisions = (opts.decisions ?? []).slice().sort(compareDecisions);
  const visibleObjects = graph.objects.filter(
    (o) => o.visibility === "public",
  );
  // Field hiding runs on copies: every owner HIDE is enforced before any
  // consumer binds a value, and the caller's graph is never mutated.
  const publicObjects = applyFieldVisibilityDecisions(
    visibleObjects,
    decisions,
  ).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const publicIds = new Set(publicObjects.map((o) => o.id));
  const publicRelationships = graph.relationships
    .filter(
      (r) =>
        r.status === "active" &&
        publicIds.has(r.subject) &&
        publicIds.has(r.object),
    )
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const graphDigest = digestCanonical({
    objects: publicObjects,
    relationships: publicRelationships,
  });
  const decisionsDigest = digestCanonical(decisions);
  const viewerPolicyDigest = digestCanonical({
    viewerKind,
    boundaryVersion: PUBLIC_PROJECTION_VERSION,
  });

  return {
    kind: PUBLIC_PROJECTION_VERSION,
    graph: { objects: publicObjects, relationships: publicRelationships },
    decisions,
    provenance: {
      graphDigest,
      decisionsDigest,
      viewerPolicyDigest,
      checkpoint: graphDigest + ":" + decisionsDigest,
      viewerKind,
    },
  };
}
