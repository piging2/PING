/**
 * Object kernel: the canonical object and relationship record types.
 *
 * HARVESTED (ADAPT) from ping-fyd-converged (SHA 32f8347)
 *   src/lib/ping/types.ts  (PingObject / PingRelationship / ObjectProvenance block)
 *
 * What moved: the object-substrate contracts only (schema vocab, visibility,
 * provenance, the object record, the relationship record). Everything else
 * in the source file stays behind:
 *   - ObjectView / ObjectMediaView / ObjectServiceView / capabilities  -> projection layer (REJECT)
 *   - OwnerOverrides / OwnerAssertion / field corrections / commands    -> owner/proposal layer (REJECT)
 *   - CircleKind / PlannedAction / ActionKind / CapabilityPlan          -> capability/action layer (REJECT)
 *   - PingObject.ownerFieldCorrections                                  -> owner read-seam concern (REJECT here)
 *
 * Layering note preserved from source: SOURCE state (these records) is
 * distinct from owner state and from derived projections. The kernel never
 * stores evidence; it only carries evidence REFERENCES (provenance.ref,
 * relationship.evidenceRef). Evidence storage and verification live in the
 * trust kernel and the event kernel respectively.
 */

/**
 * Schema ids the kernel knows. Unknown schema strings are legal records
 * (PingObjectSchema accepts any string) but schema-catalog verification in
 * ./verify.ts only admits registered definitions; see ./schema.ts.
 */
export const KNOWN_OBJECT_SCHEMAS = [
  "ping.social.profile@1",
  "ping.social.post@1",
  "ping.social.business@1",
  "ping.social.person@1",
  "ping.social.article@1",
  "ping.social.project@1",
  "ping.social.product@1",
  "ping.social.service@1",
  "ping.social.location@1",
  "ping.social.offer@1",
] as const;

export type KnownObjectSchema = (typeof KNOWN_OBJECT_SCHEMAS)[number];
/** Any schema string; known ones get renderers, unknown get generic preview. */
export type PingObjectSchema = KnownObjectSchema | (string & {});

export function isKnownSchema(schema: string): schema is KnownObjectSchema {
  return (KNOWN_OBJECT_SCHEMAS as readonly string[]).includes(schema);
}

export type ObjectVisibility = "public" | "private";

export type ObjectProvenanceKind =
  | "canonical-journal"
  | "website-derived"
  | "overlay-authored";

export interface ObjectProvenance {
  /** "overlay-authored": content added by a demo/overlay operator. It is
   *  neither the website's own words nor a recorded journal fact, and must
   *  never be classified as either. */
  kind: ObjectProvenanceKind;
  /**
   * THE evidence reference. Canonical: the creating event id.
   * Website-derived: the source content path or ingestion locator
   * (e.g. "website-ingestion:https://example.com/"). NEVER empty on a
   * verified object: no fact without a traceable basis.
   */
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
}

export interface PingRelationship {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  /** Canonical revocation vocab: "inactive" on the same predicate revokes. */
  status: "active" | "inactive";
  createdAt: string;
  /**
   * THE evidence reference for this edge. Canonical: the event id this
   * relationship was derived from. NEVER empty on a verified graph.
   */
  evidenceRef: string;
}
