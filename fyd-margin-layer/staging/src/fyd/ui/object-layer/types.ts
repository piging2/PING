/**
 * Shared descriptor for one object in the margin object layer.
 *
 * Generic: every field is evidence-backed object data or layout input.
 * No per-customer logic may live in the layer; it only reads these.
 */
export interface RelatedObject {
  /** Id of the related object (e.g. "coppersmith-plumbing"). */
  objectId: string;
  /** Relationship kind, e.g. "platform-peer". Data only; not rendered. */
  kind: string;
  /** Evidence basis for the relationship, in plain words. */
  basis: string;
}

export interface MarginObjectDescriptor {
  /** PING object id (e.g. "happy-place"). Keys follow/like state. */
  objectId: string;
  /** Evidence-backed display name. */
  name: string;
  /** Identity image (website snapshot). Decorative; the name is the label. */
  imageSrc: string | null;
  imageSrcSet: string | null;
  /** Evidence-backed canonical public website URL, or null (fail closed). */
  websiteUrl: string | null;
  /** data-object-anchor key of the document element this object tracks. */
  anchorKey: string;
  /** Lower places first; ties break by anchor Y, then objectId. */
  priority: number;
  /** Real, evidence-backed relationships to other objects. Data only. */
  relationships?: RelatedObject[];
}
