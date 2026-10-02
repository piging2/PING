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
 * BOUNDARY DECISION: the projection does NOT widen for owners. "owner"
 * requires a verified identity, but a verified owner receives the same
 * public projection as a visitor today: the owner lane is a verified
 * hook for a future authenticated surface, and it grants nothing here.
 * This is the source's zero-canary rule: private values never enter the
 * answer path for ANY viewer class. Visitor/public boundary enforced in
 * this code, not in comments.
 */

import type {
  AskPingObject,
  AskViewerIdentity,
  ObjectGraph,
  ViewerClass,
} from "./types";

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
 *   3. keep active relationships whose subject and object both survived.
 *
 * The input graph is never mutated. The viewer classifies fail-closed
 * first; an owner claim without verification lands on "visitor" and the
 * projection is identical for both classes (zero-canary rule).
 */
export function projectGraphForViewer(
  graph: ObjectGraph,
  viewer: AskViewerIdentity | null | undefined,
): { viewerClass: ViewerClass; graph: ObjectGraph } {
  const viewerClass = classifyAskViewer(viewer);
  const safeObjects = graph.objects
    .filter((o) => o.visibility === "public")
    .map(visitorSafeObject);
  const safeIds = new Set(safeObjects.map((o) => o.id));
  const safeRelationships = graph.relationships.filter(
    (r) => r.status === "active" && safeIds.has(r.subject) && safeIds.has(r.object),
  );
  return { viewerClass, graph: { objects: safeObjects, relationships: safeRelationships } };
}
