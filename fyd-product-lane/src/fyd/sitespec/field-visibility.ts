/**
 * FYD field-visibility: the bounded owner policy layer.
 *
 * PIPELINE (Nolan's binding directive, 2026-09-26):
 *   SOURCE VALUE + VISIBILITY POLICY + OWNER OVERRIDE + VIEWER CONTEXT
 *   -> PROJECTED VALUE
 *
 * - SOURCE VALUE: the verbatim discovered value with provenance. It lives
 *   in the graph and is NEVER rewritten by this layer. Source discovery
 *   may classify a field conservatively, but that classification must NOT
 *   permanently decide "business street address is private": it is a
 *   default *policy suggestion*, not a property of the extracted fact.
 * - VISIBILITY POLICY: the conservative default table in
 *   resolveFieldVisibility (address-bearing fields default to "coarse",
 *   everything else to "show"). A default, not a verdict.
 * - OWNER OVERRIDE: an explicit owner decision for the exact
 *   objectId+field always wins over the default (highest version wins).
 *   The owner can SHOW ADDRESS, HIDE PHONE, or SHOW EMAIL ONLY TO FYD
 *   MEMBERS. Owner decisions are recorded, versioned, and journaled;
 *   they survive regeneration and re-observation because they live
 *   OUTSIDE the graph.
 * - VIEWER CONTEXT: who is asking. "members" policy fields are visible
 *   to member/owner viewers and dropped for public viewers.
 *
 * The four states stay distinct and non-overwriting: SOURCE STATE
 * (discovered value) -> OWNER STATE (decisions, this file) ->
 * GENERATED STATE (SiteSpec, compiled from the projected graph) ->
 * PROJECTION STATE (render). The site page calls
 * applyFieldVisibility(sourceGraph, ownerDecisions, viewer) and passes
 * the PROJECTED graph to generateSiteSpec/render, keeping the SOURCE
 * graph untouched for the next ingest. A clean re-ingest (fresh SOURCE
 * STATE) plus re-applying the same decisions reproduces the owner's
 * intent: source re-ingestion cannot erase owner visibility intent.
 *
 * Pure, deterministic, browser-safe. No dependencies beyond types.
 */

import type { PingObject } from "@/lib/ping/types";
import type { ObjectGraph, ViewerContext } from "./types";

/**
 * What the owner allows for one object field.
 * - "show": verbatim to every viewer.
 * - "hide": dropped for every viewer.
 * - "coarse": address detail reduced (street dropped, city/region kept).
 * - "members": verbatim to member and owner viewers, dropped for public.
 */
export type FieldVisibilityPolicy = "show" | "hide" | "coarse" | "members";

/** Where a resolved visibility came from. */
export type VisibilitySource = "owner_override" | "conservative_default";

/**
 * One owner decision. Semantics per decision: object/field, visibility
 * policy, decision source, actor, timestamp/version. The owner is the only
 * actor in this bounded control; only owner_override decisions exist here.
 */
export interface FieldVisibilityDecision {
  objectId: string;
  field: string;
  policy: FieldVisibilityPolicy;
  decidedBy: "owner";
  decidedAt: string; // ISO 8601
  source: "owner_override";
  version: number;
}

/**
 * Resolve the visibility for one object field.
 *
 * An owner decision for the exact objectId+field wins; the highest version
 * wins (ties resolve to the later decision, deterministically). The owner
 * is the authority on presentation policy: an explicit "show" overrides
 * the conservative default, so discovery can never permanently decide a
 * field is private.
 *
 * Conservative default table otherwise: address-bearing fields are the one
 * case FYD will not show verbatim by default. A field whose name contains
 * "address" (case-insensitive; covers "address", "streetaddress",
 * "street_address", "address_locality", ...) defaults to "coarse".
 * Every other field defaults to "show". This default is a *policy
 * suggestion* applied at projection time; the extracted fact keeps its
 * full value and provenance regardless.
 */
export function resolveFieldVisibility(
  objectId: string,
  field: string,
  decisions: FieldVisibilityDecision[],
): { policy: FieldVisibilityPolicy; source: VisibilitySource } {
  let best: FieldVisibilityDecision | undefined;
  for (const d of decisions) {
    if (d.objectId !== objectId || d.field !== field) continue;
    if (best === undefined || d.version >= best.version) best = d;
  }
  if (best !== undefined) {
    return { policy: best.policy, source: "owner_override" };
  }
  const policy: FieldVisibilityPolicy = field.toLowerCase().includes("address")
    ? "coarse"
    : "show";
  return { policy, source: "conservative_default" };
}

/**
 * COARSEN RULE: split the value on commas, keep the last two segments,
 * trim each, and rejoin with ", ". The street-level detail (the first
 * segment) is dropped; city/region/postal survives.
 * Example: "123 Main St, Grand Junction, CO 81501" -> "Grand Junction, CO 81501".
 * Deterministic. Fewer than two segments -> the value is returned unchanged.
 */
export function coarsenAddress(value: string): string {
  const segments = value.split(",").map((s) => s.trim());
  if (segments.length < 2) return value;
  return segments.slice(-2).join(", ");
}

/**
 * Project a NEW ObjectGraph with owner visibility decisions applied for
 * one viewer: SOURCE VALUE + VISIBILITY POLICY + OWNER OVERRIDE +
 * VIEWER CONTEXT -> PROJECTED VALUE.
 *
 * Never mutates the input: the returned graph is a fresh record, each
 * object is a fresh record with a REBUILT fields record; every other
 * object property and the relationships array are shared by reference.
 * Only fields records are rebuilt. SOURCE STATE stays intact for the
 * next ingest; this output is PROJECTION input.
 *
 * Policy application per field:
 * - "hide": dropped for every viewer.
 * - "members": dropped unless the viewer is member or owner.
 * - "coarse": address detail reduced via coarsenAddress.
 * - "show": verbatim.
 * The owner viewer sees source values verbatim (owner preview); every
 * other viewer gets the policy-projected value. An unspecified viewer
 * is treated as public (fail closed).
 */
export function applyFieldVisibility(
  graph: ObjectGraph,
  decisions: FieldVisibilityDecision[],
  viewer?: ViewerContext,
): ObjectGraph {
  const role = viewer?.role ?? "public";
  const objects: PingObject[] = graph.objects.map((o) => {
    const fields: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(o.fields)) {
      const { policy } = resolveFieldVisibility(o.id, key, decisions);
      if (role === "owner") {
        fields[key] = value;
        continue;
      }
      if (policy === "hide") continue; // drop the field
      if (policy === "members" && role !== "member") continue; // members-only
      if (policy === "coarse") {
        const joined = Array.isArray(value) ? value.join(", ") : value;
        fields[key] = coarsenAddress(joined);
      } else {
        fields[key] = value;
      }
    }
    return { ...o, fields };
  });
  return { objects, relationships: graph.relationships };
}
