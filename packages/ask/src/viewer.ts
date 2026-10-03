/**
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/fyd/ask/context-projection.ts (classifyAskViewer,
 *         projectAskContextForViewer), src/fyd/ask/visitor-safe-fields.ts
 *         (VISITOR_SAFE_FIELDS, isVisitorSafeField, visitorSafeObject)
 * TARGET OWNER: packages/ask (piging2 Ask FYD)
 * MODE: ADAPT. The two source concerns collapse into one module because
 * the owner visibility-decision and field-conflict layers live in proofs
 * 6+; proofs 3-4 need only the public-projection + safe-field choke
 * point. Behavior preserved: fail-closed viewer classification, public
 * objects only, fail-closed field allowlist, active relationships with
 * both endpoints surviving, input never mutated.
 * DEPENDENCIES: ./types
 * PROOFS: [3, 4]
 *
 * BOUNDARY DECISION: owner field-visibility decisions
 * (FieldVisibilityDecision[]) are ENFORCED for visitor-class viewers:
 * a HIDE'd field never reaches the projected graph an anonymous answer
 * reasons over. Verified owners are EXEMPT: they keep seeing their own
 * hidden fields (owner-lane semantics: applyCorrections leaves HIDE'd
 * values in place for the owner; enforcement lives where decisions are
 * consumed, and the ask boundary does not consume them against a
 * verified owner). "owner" still requires a verified identity; an owner
 * claim without verification lands on "visitor". With no decisions the
 * projection is identical for both classes (fail-closed default), which
 * is the source's zero-canary rule: no private value enters the answer
 * path on the basis of an unverified claim. Visitor/public boundary
 * enforced in this code, not in comments.
 */

import type {
  AskPingObject,
  AskViewerIdentity,
  ObjectGraph,
  ViewerClass,
} from "./types";
import {
  applyFieldVisibilityDecisions,
  type FieldVisibilityDecision,
} from "../../sitespec/src/projection";
import { hiddenFactIdsToDecisions } from "../../owner/src/visibility";
import type {
  ObjectProvenance,
  PingObject,
} from "../../sitespec/src/ping-types";

/** Re-exported so ask consumers can name the decision type. */
export type { FieldVisibilityDecision };

/**
 * Classify an Ask FYD viewer. "owner" if and only if the viewer carries a
 * verified identity: verified === true AND a non-empty id. Every other
 * shape, null, undefined, anonymous, unknown id, demo, practice, falls
 * through to "visitor". There is no third class and no elevation path
 * that does not go through verification.
 */
export function classifyAskViewer(
  viewer: AskViewerIdentity | null | undefined,
): ViewerClass {
  if (
    viewer !== null &&
    viewer !== undefined &&
    viewer.verified === true &&
    typeof viewer.id === "string" &&
    viewer.id.length > 0
  ) {
    return "owner";
  }
  return "visitor";
}

/**
 * Field names the Ask FYD answerer may receive for a viewer-visible
 * object. DERIVATION RULE (do not expand casually): this is the exact set
 * of field names the proof-3/4 answerer reads, plus the public
 * identity/contact/discovery fields the public site already shows. A new
 * answerer branch that reads a new field must add its name here with a
 * comment naming the reader; otherwise the branch silently stops seeing
 * it. Unknown field names are dropped from the projected graph for every
 * viewer class, never passed through.
 */
const VISITOR_SAFE_FIELDS: ReadonlySet<string> = new Set([
  // Identity / public copy (read by the answerer).
  "name",
  "title",
  "description",
  "summary",
  "category",
  // Contact / discovery.
  "website",
  "url",
  "phone",
  "email",
  // Location, coarse.
  "address",
  "location",
  "locality",
  "city",
  "region",
  "postal_code",
  "country",
  "area_served",
  // Hours.
  "hours",
  // Offering details.
  "services",
  "price_range",
  // Reputation.
  "rating",
  "reviews",
  // Media.
  "images",
  // Pipeline signals (read by the answerer/classifier, never shown verbatim).
  "claimKind",
  "service_href",
  "keywords",
]);

/** True when a field name may appear in the Ask FYD projected graph. */
export function isVisitorSafeField(fieldName: string): boolean {
  return VISITOR_SAFE_FIELDS.has(fieldName);
}

/**
 * Return a copy of the object with only visitor-safe fields.
 * The input object is never mutated. When every field is already safe the
 * original object is returned unchanged (fast path).
 */
export function visitorSafeObject(obj: AskPingObject): AskPingObject {
  const fields = obj.fields ?? {};
  const entries = Object.entries(fields);
  let allSafe = true;
  for (const [name] of entries) {
    if (!isVisitorSafeField(name)) {
      allSafe = false;
      break;
    }
  }
  if (allSafe) return obj;
  const safe: Record<string, string | string[]> = {};
  for (const [name, value] of entries) {
    if (isVisitorSafeField(name)) safe[name] = value;
  }
  return { ...obj, fields: safe };
}

/**
 * Project a canonical object graph to the sanitized graph Ask FYD may
 * reason over for this viewer:
 *   1. keep public objects only,
 *   2. visitorSafeObject on every surviving object (fail-closed allowlist),
 *   3. for visitor-class viewers only: enforce the supplied owner
 *      field-visibility decisions through the shared sitespec boundary
 *      (a verified owner keeps seeing their own hidden fields),
 *   4. keep active relationships whose subject and object both survived.
 *
 * The input graph is never mutated. The viewer classifies fail-closed
 * first; an owner claim without verification lands on "visitor". With
 * no decisions the projection is identical for both classes.
 */
export function projectGraphForViewer(
  graph: ObjectGraph,
  viewer: AskViewerIdentity | null | undefined,
  visibilityDecisions: readonly FieldVisibilityDecision[] = [],
): { viewerClass: ViewerClass; graph: ObjectGraph } {
  const viewerClass = classifyAskViewer(viewer);
  const safeObjects = graph.objects
    .filter((o) => o.visibility === "public")
    .map(visitorSafeObject);
  const decidedObjects =
    viewerClass === "visitor"
      ? applyVisibilityDecisions(safeObjects, visibilityDecisions)
      : safeObjects;
  const safeIds = new Set(decidedObjects.map((o) => o.id));
  const safeRelationships = graph.relationships.filter(
    (r) => r.status === "active" && safeIds.has(r.subject) && safeIds.has(r.object),
  );
  return { viewerClass, graph: { objects: decidedObjects, relationships: safeRelationships } };
}

/**
 * Bridge ask-shaped objects to the boundary's sitespec shape. The
 * boundary only reads/mutates id, title, description, and fields; the
 * ask-side provenance is never read by it and is restored verbatim from
 * the original objects by the caller afterwards.
 */
function bridgeToBoundaryObjects(objects: AskPingObject[]): PingObject[] {
  return objects.map((o) => ({
    id: o.id,
    schema: o.schema,
    controllerId: o.controllerId,
    visibility: o.visibility,
    title: o.title,
    description: o.description,
    fields: o.fields,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    // The boundary never reads provenance; the ask-side provenance is
    // restored verbatim from the original object by the caller.
    provenance: o.provenance as ObjectProvenance,
  }));
}

/**
 * Convert the AskInput hidden-fact vocabulary (owner hidden fact ids)
 * into the enforceable FieldVisibilityDecisions projectGraphForViewer
 * accepts, through the ONE existing owner converter
 * (packages/owner hiddenFactIdsToDecisions). No new decisions type, no
 * new hiding semantics: the ask mirror crosses the same bridge the
 * boundary application uses. Pure, deterministic, no mutation. Empty or
 * absent input yields no decisions (fail-closed default).
 */
export function decisionsFromHiddenFactIds(
  graph: ObjectGraph,
  hiddenFactIds: readonly string[] | undefined,
): FieldVisibilityDecision[] {
  if (!hiddenFactIds || hiddenFactIds.length === 0) return [];
  // The converter extracts facts from the object list only; the ask
  // graph's relationship list is irrelevant to the conversion.
  return hiddenFactIdsToDecisions(
    { objects: bridgeToBoundaryObjects(graph.objects), relationships: [] },
    [...hiddenFactIds],
  );
}

/**
 * Apply owner field-visibility decisions to ask-shaped objects through
 * the ONE shared boundary implementation (packages/sitespec
 * applyFieldVisibilityDecisions). No hiding logic lives here.
 *
 * AskPingObject is a structural mirror of PingObject, not the same type
 * (its provenance.kind and ownerFieldCorrections are wider), so the
 * bridge maps the fields the boundary reads and mutates
 * (id, title, description, fields) through it and restores the ask shape
 * from the original objects afterwards. The boundary never reads
 * provenance or corrections; both are restored verbatim from the input.
 * Neither the input array nor its objects are ever mutated.
 */
function applyVisibilityDecisions(
  objects: AskPingObject[],
  decisions: readonly FieldVisibilityDecision[],
): AskPingObject[] {
  if (decisions.length === 0) return objects;
  const boundaryInput: PingObject[] = bridgeToBoundaryObjects(objects);
  // applyFieldVisibilityDecisions maps in order and never reorders, so
  // the index zip below is exact.
  const decided = applyFieldVisibilityDecisions(boundaryInput, decisions);
  return objects.map((original, i) => ({
    ...original,
    title: decided[i].title,
    description: decided[i].description,
    fields: decided[i].fields,
  }));
}
