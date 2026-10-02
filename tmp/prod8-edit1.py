"""PROD-8: orphaned-correction detection + surfacing. Edit 1: owner-overlay.ts"""

import sys

PATH = "/home/nolan/projects/ping/src/fyd/object/owner-overlay.ts"

src = open(PATH, encoding="utf-8").read()

# --- 1. import the fact-address vocabulary from the event log module ---
old_import = 'import { readOverrides } from "./owner-store";'
new_import = (
    'import { readOverrides } from "./owner-store";\n'
    'import { SERVICE_ORDER_TARGET, serviceTarget } from "./owner-events";'
)
assert src.count(old_import) == 1, "import anchor not found"
src = src.replace(old_import, new_import, 1)

# --- 2. widen the OrphanedCorrection interface ---
old_iface = """export interface OrphanedCorrection {
  correction: OwnerFieldCorrection;
  /** Machine-readable reason. */
  reason: "no-business-object" | "ambiguous-target";
  /** Human-readable detail for owner surfaces and logs. */
  detail: string;
}"""
new_iface = """export interface OrphanedCorrection {
  /**
   * The field correction that could not be composed. Null for
   * non-field corrections (service order, service visibility), which
   * are identified by `target` instead.
   */
  correction: OwnerFieldCorrection | null;
  /** Fact address, e.g. "contact:phone", "services:order", "service:<id>". */
  target: string;
  /** Machine-readable reason. */
  reason:
    | "no-business-object"
    | "ambiguous-target"
    | "service-order-orphaned"
    | "service-visibility-orphaned";
  /** Human-readable detail for owner surfaces and logs. */
  detail: string;
}"""
assert src.count(old_iface) == 1, "interface anchor not found"
src = src.replace(old_iface, new_iface, 1)

# --- 3. producers: add the fact-address target ---
old_prod = """    return {
      graph,
      applied: [],
      orphaned: corrections.map((correction) => ({
        correction,
        reason,
        detail,
      })),
    };"""
new_prod = """    return {
      graph,
      applied: [],
      orphaned: corrections.map((correction) => ({
        correction,
        target: "contact:" + correction.field,
        reason,
        detail,
      })),
    };"""
assert src.count(old_prod) == 1, "producer anchor not found"
src = src.replace(old_prod, new_prod, 1)

# --- 4. append the detection function ---
addition = '''
/**
 * PROD-8: orphaned-correction detection (read-only on the journal).
 *
 * A correction is orphaned when it is ACTIVE in the owner store (it
 * survives in the event-log projection) but applies to nothing in the
 * CURRENT graph: every id it names is unknown to the refreshed source
 * (deleted or renamed services), or its target object/field no longer
 * exists. The journal is never modified here: the correction is
 * retained, and the caller must surface the warning so the owner knows
 * the correction is ineffective instead of silently ignoring it.
 *
 * Pure: folds the log (read-only) and inspects the graph. No writes.
 */
export function detectOrphanedCorrections(
  graph: ObjectGraph,
  objectId: string,
): OrphanedCorrection[] {
  const overrides = readOverrides(objectId);
  // Field corrections the overlay could not compose onto the refreshed
  // graph (no business object, or an ambiguous target).
  const out: OrphanedCorrection[] = [
    ...applyOwnerFieldCorrections(graph, objectId).orphaned,
  ];

  // The service ids a correction can currently apply to: structured
  // services linked from the business (the same predicate the ObjectView
  // loader uses, so detection and the view agree) plus owner-added
  // services (they define themselves, so they always apply).
  const current = new Set<string>();
  const business = findBusinessObject(graph);
  if (business) {
    for (const id of structuredServiceIds(graph, business.id)) {
      current.add(id);
    }
  }
  for (const s of overrides.addedServices) current.add(s.id);

  // Service order: orphaned only when it names NO current service. A
  // partially stale order still applies to the ids it names; the view
  // ignores the unknown ids (same as buildServices), so they are not
  // orphans, just dead entries in an otherwise live correction.
  if (overrides.serviceOrder.length > 0) {
    const applies = overrides.serviceOrder.some((id) => current.has(id));
    if (!applies) {
      out.push({
        correction: null,
        target: SERVICE_ORDER_TARGET,
        reason: "service-order-orphaned",
        detail:
          "This correction does not apply to anything. It may reference a deleted or renamed item. " +
          "The service order correction names " +
          overrides.serviceOrder.length +
          " service(s) (" +
          overrides.serviceOrder.join(", ") +
          "), none of which exist in the current site data.",
      });
    }
  }

  // Service visibility: each hidden id that is not a current service
  // hides nothing.
  for (const id of overrides.hiddenServices) {
    if (!current.has(id)) {
      out.push({
        correction: null,
        target: serviceTarget(id),
        reason: "service-visibility-orphaned",
        detail:
          "This correction does not apply to anything. It may reference a deleted or renamed item. " +
          "The service '" +
          id +
          "' is hidden by an owner correction but is not in the current site data, so the correction hides nothing.",
      });
    }
  }

  return out;
}

/**
 * Ids of structured service objects linked from the business by an
 * active provides/offers relationship. Mirrors the selection predicate
 * the ObjectView loader (view.ts structuredServices) applies, so
 * detection and the rendered view agree on what "current services"
 * means.
 */
function structuredServiceIds(
  graph: ObjectGraph,
  businessId: string,
): string[] {
  const byId = new Map(graph.objects.map((o) => [o.id, o]));
  const out: string[] = [];
  for (const r of graph.relationships) {
    if (r.subject !== businessId) continue;
    if (r.status !== "active") continue;
    if (r.predicate !== "provides" && r.predicate !== "offers") continue;
    const target = byId.get(r.object);
    if (
      target &&
      SCHEMA_ROLES.service.includes(target.schema) &&
      target.visibility === "public"
    ) {
      out.push(target.id);
    }
  }
  return out;
}
'''

assert src.rstrip().endswith("}"), "unexpected file tail"
src = src.rstrip("\n") + "\n" + addition

open(PATH, "w", encoding="utf-8").write(src)
print("owner-overlay.ts edited OK")
