/**
 * Owner overlay (server-only): field corrections and presentation overrides.
 *
 * The legitimate projection path for owner decisions. The projection
 * read seam (src/fyd/data/ping-object-source.ts) composes this AFTER the
 * projection's digest verification, which gives three guarantees:
 *
 * 1. The source projection is never mutated. Its digest still verifies,
 *    the projection file still says what the source said, and the raw
 *    source endpoint (/api/fyd/projection) still serves it. SOURCE SAYS X
 *    stands on its own evidence.
 * 2. Every consumer of the read seam (generated site pages, Ask FYD, the
 *    ObjectView, the Circle projection) sees the same EFFECTIVE value
 *    with the same provenance. There is no per-surface patching: the
 *    correction flows through the read model or not at all.
 * 3. The correction is itself evidence: each composed object carries the
 *    full correction record (source value, owner value, timestamp, actor
 *    label, basis), so any surface can render the SOURCE SAYS X /
 *    OWNER SAYS Y distinction honestly.
 *
 * Owner state lives in the owner store (data/fyd-owner/<siteId>.json),
 * completely separate from source state. Source re-ingestion rewrites
 * only the projection; it re-reads the owner store on every serve, so a
 * source refresh can never silently wipe an owner correction. When the
 * source's CURRENT value no longer matches what it said at correction
 * time, the composed record carries sourceDrifted: true (derived per
 * read, never written back): the owner value still wins, and the drift
 * is visible instead of silent.
 */

import { SCHEMA_ROLES } from "../sitespec/schemas";
import type { ObjectGraph } from "../sitespec/types";
import type {
  OwnerFieldCorrection,
  OwnerPresentationOverride,
  PingObject,
} from "../../lib/ping/types";
import { readOverrides } from "./owner-store";
import { readOwnerEvents } from "./owner-events";

/**
 * The public business object of a site graph. Same predicate the
 * ObjectView loader uses, so the overlay and the view always agree on
 * which object the correction belongs to.
 */
export function findBusinessObject(graph: ObjectGraph): PingObject | null {
  const business = graph.objects.find(
    (o) => SCHEMA_ROLES.business.includes(o.schema) && o.visibility === "public",
  );
  return business ?? null;
}

/** Raw scalar field read: what the SOURCE projection says, pre-overlay. */
export function rawFieldValue(
  obj: PingObject,
  field: string,
): string | null {
  const v = obj.fields?.[field];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string" && v[0].trim().length > 0) {
    return v[0].trim();
  }
  return null;
}

/**
 * Pure reader: the composed owner correction for one field on one object,
 * or null. Surfaces use this to render the SOURCE SAYS X / OWNER SAYS Y
 * distinction; it performs no I/O.
 */
export function ownerCorrectionForObject(
  obj: PingObject,
  field: string,
): OwnerFieldCorrection | null {
  const list = obj.ownerFieldCorrections;
  if (!list) return null;
  return list.find((c) => c.field === field) ?? null;
}

export interface OwnerOverlayResult {
  graph: ObjectGraph;
  /** Corrections composed onto the graph, in field order. Empty when none. */
  applied: OwnerFieldCorrection[];
}

function cloneFields(
  fields: Record<string, string | string[]>,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = Array.isArray(v) ? [...v] : v;
  }
  return out;
}

/**
 * Compose the owner store's field corrections onto a projection graph.
 * Never mutates the input graph: the source layer's objects are left
 * untouched and a new graph is returned.
 */
export function applyOwnerFieldCorrections(
  graph: ObjectGraph,
  siteId: string,
): OwnerOverlayResult {
  const business = findBusinessObject(graph);
  if (!business) return { graph, applied: [] };
  const overrides = readOverrides(siteId);
  const corrections = Object.values(overrides.fieldCorrections ?? {});
  if (corrections.length === 0) return { graph, applied: [] };

  // Capture SOURCE SAYS X before composing anything over it.
  const composed: PingObject = {
    ...business,
    fields: cloneFields(business.fields ?? {}),
  };
  const attached: OwnerFieldCorrection[] = [];
  for (const correction of corrections) {
    const currentSource = rawFieldValue(business, correction.field);
    composed.fields[correction.field] = correction.ownerValue;
    attached.push({
      ...correction,
      // Derived per read, never persisted: the source's CURRENT value,
      // and whether it moved since the correction was recorded. The owner
      // value still wins; the drift is visible instead of silent.
      currentSourceValue: currentSource,
      sourceDrifted: currentSource !== correction.sourceValue,
    });
  }
  // Preserve any corrections already attached (there should be none on a
  // raw projection, but never silently drop evidence).
  composed.ownerFieldCorrections = [
    ...(business.ownerFieldCorrections ?? []),
    ...attached,
  ];

  const objects = graph.objects.map((o) => (o === business ? composed : o));
  return {
    graph: { objects, relationships: graph.relationships },
    applied: attached,
  };
}

export interface OwnerPresentationOverlayResult {
  graph: ObjectGraph;
  /** Ids that carry an owner presentation override after this pass. */
  applied: string[];
}

/**
 * Owner presentation-override overlay (server-only).
 *
 * Same seam and guarantees as the field-correction overlay above: the
 * projection read seam composes this AFTER digest verification, so the
 * source projection is never mutated and every consumer of the read
 * seam (spec generator, query resolver, object views) sees the same
 * EFFECTIVE presentation decision.
 *
 * Currently models service visibility (owner.hide-fact events): hidden
 * service objects are annotated with ownerPresentationOverride, never
 * re-visibility'd. Hiding is a presentation decision, not a truth
 * decision: the object's source visibility stays "public", its own
 * page and evidence record keep working; list/section membership
 * checks consult the override.
 */
export function applyOwnerPresentationOverrides(
  graph: ObjectGraph,
  siteId: string,
): OwnerPresentationOverlayResult {
  const overrides = readOverrides(siteId);
  const hidden = new Set(overrides.hiddenServices ?? []);
  if (hidden.size === 0) return { graph, applied: [] };
  // Decision metadata comes from the event log itself (latest hid-fact
  // per service), never invented at read time.
  const latestHide = new Map<string, { at: string; actorLabel: string }>();
  for (const e of readOwnerEvents(siteId)) {
    if (e.type !== "owner.hid-fact") continue;
    const m = /^service:(.+)$/.exec(e.target);
    if (!m) continue;
    const nv = e.newValue as { hidden?: unknown } | null;
    if (nv && nv.hidden === true) {
      latestHide.set(m[1], { at: e.at, actorLabel: e.actor.label });
    } else {
      latestHide.delete(m[1]);
    }
  }
  const applied: string[] = [];
  const objects = graph.objects.map((o) => {
    if (!hidden.has(o.id)) return o;
    applied.push(o.id);
    const decision = latestHide.get(o.id);
    const override: OwnerPresentationOverride = {
      hidden: true,
      decidedAt: decision?.at ?? "unknown",
      actorLabel: decision?.actorLabel ?? "Owner decision (see owner event log)",
      basis:
        "Owner decision: hide from the public page. The source record is unchanged.",
    };
    return { ...o, ownerPresentationOverride: override };
  });
  return { graph: { objects, relationships: graph.relationships }, applied };
}
