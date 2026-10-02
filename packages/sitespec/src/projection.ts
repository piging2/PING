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
 * - graphDigest = digestCanonical over the canonical public-graph form
 *   (objects and relationships sorted by id; input order irrelevant).
 * - decisionsDigest = digestCanonical(decisions); this slice carries no
 *   owner decisions yet (owner overlay / field-visibility is a later
 *   proof: proofs 7-8). The empty set digests deterministically.
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
import type { ObjectGraph } from "./types";

/** Boundary version. Bump when the projection rules above change. */
export const PUBLIC_PROJECTION_VERSION = "piging2-public-projection@1";

export type PublicViewerKind = "anonymous" | "owner";

/**
 * One owner visibility decision. Minimal shape for this slice: the
 * render model canonicalizes the set sorted by (objectId, field,
 * policy). The source's FieldVisibilityDecision carries more; when
 * field-visibility is harvested, this type extends to match it.
 */
export interface FieldVisibilityDecision {
  objectId: string;
  field: string;
  policy: string;
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

export interface BuildProjectionOptions {
  viewerKind?: PublicViewerKind;
  decisions?: FieldVisibilityDecision[];
}

/**
 * Build the verified public projection. Pure and deterministic: the same
 * input graph always yields the same projection (same digests, same
 * checkpoint), regardless of object/relationship input order.
 */
export function buildVerifiedPublicProjection(
  graph: ObjectGraph,
  opts: BuildProjectionOptions = {},
): VerifiedPublicProjection {
  const viewerKind = opts.viewerKind ?? "anonymous";
  const decisions = (opts.decisions ?? []).slice().sort((a, b) =>
    a.objectId !== b.objectId
      ? a.objectId < b.objectId
        ? -1
        : 1
      : a.field !== b.field
        ? a.field < b.field
          ? -1
          : 1
        : a.policy < b.policy
          ? -1
          : 1,
  );
  const publicObjects = graph.objects
    .filter((o) => o.visibility === "public")
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
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
