/**
 * PING object primitives needed by the SiteSpec compiler.
 *
 * HARVEST (adapted, type-only): inlined from the source object model so the
 * SiteSpec package carries zero runtime coupling to the source repo's
 * path-alias layout (`@/lib/ping/types`).
 *
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f8347
 *         src/lib/ping/types.ts (ObjectProvenance, PingObject,
 *         OwnerFieldCorrection, PingRelationship, and the visibility /
 *         provenance-kind vocabularies)
 * TARGET OWNER: packages/sitespec (piging2 experience IR)
 * DEPENDENCIES: none
 * PROOFS: [1, 2, 3]
 *
 * The harvest is a strict subset: only the shapes the SiteSpec compiler,
 * the binding verifier, and the render-model query seam read. When the
 * full object kernel needs more of the vocabulary, it harvests from the
 * source again; this file never grows private extensions.
 */

export type ObjectVisibility = "public" | "private" | "internal";

export type ObjectProvenanceKind =
  | "website-derived"
  | "overlay-authored"
  | "canonical-journal";

export interface ObjectProvenance {
  /** "overlay-authored" (2026-09-22): content added by a demo/overlay
   *  operator into the site record. It is neither the website's own
   *  words nor a recorded journal fact, and must never be
   *  classified as either. */
  kind: ObjectProvenanceKind;
  /** Canonical: creating event id. Website-derived: source content path. */
  ref: string;
  updatedRefs?: string[];
  derivedAt: string;
}

export interface PingObject {
  id: string;
  schema: string;
  /** Controlling identity id. Website-derived objects use a stable web: id. */
  controllerId: string;
  visibility: ObjectVisibility;
  title: string;
  description: string;
  /** Sanitized public scalar fields (strings or string arrays only). */
  fields: Record<string, string | string[]>;
  createdAt: string;
  updatedAt: string;
  provenance: ObjectProvenance;
  /**
   * Owner-attested field corrections composed onto the projection by the
   * FYD read seam (src/fyd/object/owner-overlay.ts), AFTER the projection's
   * digest verification. The PING dump never writes this key: it is read-
   * model state, not source state. fields[] carries the EFFECTIVE
   * (owner-winning) value; each record here preserves what the source said
   * (sourceValue) alongside what the owner says (ownerValue), plus the
   * correction's own provenance. Absent when the owner corrected nothing.
   */
  ownerFieldCorrections?: OwnerFieldCorrection[];
}

/**
 * One owner-attested field correction. The system of record is the owner
 * store (data/fyd-owner/<objectId>.json); the read seam attaches copies
 * here so every consumer of the projection sees the same effective value
 * with the same provenance. SOURCE SAYS X / OWNER SAYS Y is never
 * collapsed: sourceValue is the source's value when the correction was
 * recorded (the source record itself is untouched), ownerValue is what
 * the owner attests.
 */
export interface OwnerFieldCorrection {
  /**
   * Correctable field. Contact fields (phone/email/website) target the
   * business object; "description" targets a service object via
   * targetObjectId (the render binding-verifier already binds
   * title/description/fields-key assertions per object).
   */
  field: "phone" | "email" | "website" | "description";
  /**
   * Object the correction targets. Absent = the business object (the
   * legacy contact-field corrections, which resolve the single public
   * business object at compose time). Present = the object is resolved
   * by id at compose time (e.g. a service object for a description
   * correction).
   */
  targetObjectId?: string;
  /** Human label, e.g. "Phone". */
  label: string;
  /** What the source projection said when the correction was recorded. Null when the source had no value. */
  sourceValue: string | null;
  /** What the owner says the value is. This is the effective value. */
  ownerValue: string;
  /** ISO timestamp of the correction. */
  correctedAt: string;
  /**
   * Authority label for the actor that recorded the correction. In demo
   * mode this is the seeded demo actor label ("Demo Owner (seeded,
   * unverified)"): an explicit non-identity, never a verified owner.
   * The real-identity seam attaches here later.
   */
  actorLabel: string;
  /** Human basis sentence, e.g. "Owner correction: the owner says this is the main number." */
  basis: string;
  /**
   * Read-model derivation (never stored): true when the source's CURRENT
   * value differs from sourceValue, i.e. the source was re-observed after
   * the correction and now contradicts what it said then. The owner value
   * still wins; this flag makes the drift visible instead of silent.
   */
  sourceDrifted?: boolean;
}

export interface PingRelationship {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  /** Canonical revocation vocab: "inactive" on the same predicate revokes. */
  status: "active" | "inactive";
  createdAt: string;
  /** Canonical event id this projection was derived from. */
  evidenceRef: string;
}
