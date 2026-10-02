/**
 * FYD object projection types.
 *
 * The UI renders a GENERIC object projection, never business-specific code.
 * One object (Happy Place, Coppersmith, ...) flows through the same
 * components; the components differ only because the underlying graphs
 * differ.
 *
 * Layering (never collapsed):
 * - SOURCE STATE: what the website/graph says (fixtures, manifests).
 * - OWNER STATE: durable owner decisions (order, visibility) in the owner
 *   store. Source re-ingestion can never erase owner intent.
 * - DERIVED: deterministic transforms of source state (service parsing).
 */

export type MediaRights = "authorized" | "external_reference" | "unknown";

export interface ObjectMediaView {
  id: string;
  /** logo | hero | gallery */
  role: string;
  /** Local derivative URL served by FYD (preferred; no hotlink dependency). */
  src: string;
  alt: string;
  rights: MediaRights;
  sourceUrl: string;
  digest: string;
  observedAt: string;
}

export type ServiceBasis = "derived" | "owner";

export interface ObjectServiceView {
  /** Stable id: svc-<slug>. Deterministic across rebuilds. */
  id: string;
  name: string;
  basis: ServiceBasis;
  /** Human basis label, e.g. "From the business description". */
  basisLabel: string;
  visible: boolean;
}

export interface ObjectContactView {
  phone: string | null;
  email: string | null;
  website: string | null;
  /** Coarse public location, e.g. "Adair Village, OR". */
  locality: string | null;
  addressVisibility: "public" | "hidden";
}

/**
 * Capabilities drive actions. A capability exists only when the underlying
 * value exists. NO fake buttons: the UI renders an action row from this
 * list and nothing else.
 */
export type ObjectCapability =
  | { kind: "view" }
  | { kind: "ask" }
  | { kind: "call"; href: string; label: string }
  | { kind: "email"; href: string; label: string }
  | { kind: "website"; href: string; label: string };

export interface ObjectProvenanceView {
  kind: string;
  ref: string;
  derivedAt: string;
  /** Quiet customer-facing line, e.g. "Information from happyplacecarpentry.com". */
  label: string;
}

export interface ObjectView {
  /** Public object id, e.g. "happy-place". */
  id: string;
  schema: string;
  name: string;
  category: string | null;
  locationLabel: string | null;
  /** Evidence-backed description (source state, never generated prose). */
  summary: string;
  /** Only rights-authorized media; external references are excluded from display. */
  media: ObjectMediaView[];
  services: ObjectServiceView[];
  serviceArea: string[];
  contact: ObjectContactView;
  capabilities: ObjectCapability[];
  provenance: ObjectProvenanceView;
  /** When the owner has made decisions; null when untouched. */
  ownerUpdatedAt: string | null;
  /** Sample visitor questions for the Ask surface. */
  sampleQuestions: string[];
}

/** Durable owner state. Separate file per object; never overwritten by ingest. */
export interface OwnerOverrides {
  version: 1;
  objectId: string;
  updatedAt: string;
  /** Service ids in owner order. Empty = derived order. */
  serviceOrder: string[];
  hiddenServices: string[];
  addedServices: { id: string; name: string }[];
  addressVisibility: "public" | "hidden";
  /** Human-language log, newest last. */
  history: { at: string; text: string }[];
}

export const EMPTY_OVERRIDES = (objectId: string): OwnerOverrides => ({
  version: 1,
  objectId,
  updatedAt: new Date(0).toISOString(),
  serviceOrder: [],
  hiddenServices: [],
  addedServices: [],
  addressVisibility: "public",
  history: [],
});

/** Owner commands the Manage surface accepts. All fail closed on bad input. */
export type OwnerCommand =
  | { type: "move-service"; id: string; to: "up" | "down" | "first" | "last" }
  | { type: "set-service-visibility"; id: string; visible: boolean }
  | { type: "add-service"; name: string }
  | { type: "set-address-visibility"; visibility: "public" | "hidden" };
