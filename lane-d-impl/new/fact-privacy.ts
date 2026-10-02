/**
 * FYD privacy mask and fact-level privacy enforcement (Lane D, item 4).
 *
 * CEO directive 2026-09-24 (ADDRESS DECISION): the pipeline does NOT own
 * whether a business publishes its address. OBSERVED VALUE != PUBLICATION
 * DECISION. Fact, visibility policy, and owner override are three separate
 * things and this module keeps them separate:
 *
 *   LAYER 1 - FACT: the observed values as they arrived (journal events,
 *     object graph, raw projection bytes). HIDE never deletes a fact; the
 *     source graph is never mutated by this module.
 *   LAYER 2 - POLICY: the versioned privacy mask (PrivacyMask), derived
 *     ONLY from explicit journal directives (deactivate_object etc.) at
 *     projection time, plus the conservative field-visibility defaults.
 *     A conservative initial visibility is a policy choice, never a
 *     deletion of the fact.
 *   LAYER 3 - OVERRIDE: the owner's own decisions, read live from the
 *     owner store (set-address-visibility) as FieldVisibilityDecision[].
 *     The override path exists where allowed and wins over the policy
 *     default for the fact it names.
 *
 * The mask must never collapse these layers: derivePrivacyMask consumes
 * only journal directives (never defaults, never overrides);
 * readOwnerFieldVisibilityDecisions consumes only the owner store (never
 * the journal); applyFactPrivacy takes all three as separate inputs and
 * enforces policy first, then hide traversal, then the mask.
 */

import { createHash } from "node:crypto";
import {
  applyFieldVisibility,
  applyHideTraversal,
  type FieldVisibilityDecision,
  type ObjectGraph,
} from "../sitespec/field-visibility";
import { readOverrides } from "../object/owner-store";

/** Privacy mask schema version. Bump when the derivation rule changes. */
export const PRIVACY_MASK_VERSION = 1;

/**
 * Versioned privacy mask. Facts are normalized fact VALUES (see
 * normalizeFactValue); suppressing by value catches the same fact
 * surfacing through a different field or a related object.
 */
export interface PrivacyMask {
  version: number;
  /** Normalized fact values that must never appear in public output. */
  facts: string[];
  /** Object ids dropped from the public graph. */
  objects: string[];
  /** Section ids skipped in public summaries. */
  sections: string[];
  /** Journal intent ids this mask was derived from (provenance). */
  directiveIds: string[];
}

/** Empty mask: nothing hidden beyond field decisions and defaults. */
export function emptyPrivacyMask(): PrivacyMask {
  return { version: PRIVACY_MASK_VERSION, facts: [], objects: [], sections: [], directiveIds: [] };
}

/**
 * Normalize a fact value for mask comparison. Must match the Python rule in
 * tools/fyd-site-projection/dump.py exactly: Unicode NFC, collapse
 * whitespace runs to one space, trim, lowercase. Returns null for values
 * that carry no fact (null, undefined, empty after normalization).
 */
export function normalizeFactValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
  return s.length > 0 ? s : null;
}

/** Canonical bytes of a mask for digesting: sorted arrays, stable key order. */
export function canonicalMaskBytes(mask: PrivacyMask): string {
  const canon = {
    directiveIds: [...mask.directiveIds].sort(),
    facts: [...mask.facts].sort(),
    objects: [...mask.objects].sort(),
    sections: [...mask.sections].sort(),
    version: mask.version,
  };
  return JSON.stringify(canon);
}

/** sha256 of canonicalMaskBytes. Must match dump.py's privacyMaskDigest. */
export function digestPrivacyMask(mask: PrivacyMask): string {
  return createHash("sha256").update(canonicalMaskBytes(mask), "utf8").digest("hex");
}

function isNonEmptyStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/**
 * Fail-closed validation of a mask carried in projection meta: correct
 * shape AND digest match. Returns the mask only when both hold.
 */
export function verifyPrivacyMask(
  raw: unknown,
  digest: string | null | undefined,
): { ok: true; mask: PrivacyMask } | { ok: false; reason: string } {
  if (raw === null || raw === undefined) {
    return { ok: false, reason: "mask absent" };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "mask not an object" };
  }
  const m = raw as Record<string, unknown>;
  if (m["version"] !== PRIVACY_MASK_VERSION) {
    return { ok: false, reason: `unsupported mask version ${String(m["version"])}` };
  }
  if (
    !isNonEmptyStringArray(m["facts"]) ||
    !isNonEmptyStringArray(m["objects"]) ||
    !isNonEmptyStringArray(m["sections"]) ||
    !isNonEmptyStringArray(m["directiveIds"])
  ) {
    return { ok: false, reason: "mask arrays malformed" };
  }
  const mask = raw as PrivacyMask;
  if (typeof digest !== "string" || digest.length === 0) {
    return { ok: false, reason: "mask digest absent" };
  }
  const computed = digestPrivacyMask(mask);
  if (computed !== digest) {
    return { ok: false, reason: "mask digest mismatch" };
  }
  return { ok: true, mask };
}

export interface MaskDerivationInput {
  graph: ObjectGraph;
  /** Object ids hidden by journal directives (hide_object / deactivate). */
  deactivatedObjectIds: string[];
  /** Section ids hidden by journal directives (hide_section). */
  hiddenSectionIds: string[];
  /** Journal intent ids the derivation consumed (provenance). */
  directiveIds: string[];
}

/**
 * TypeScript port of dump.py's derive_privacy_mask (parity pinned by the
 * hostile gate's mask-parity check): every normalized non-empty fact value
 * of every deactivated object becomes a suppressed fact; hidden sections
 * and deactivated object ids are recorded.
 */
export function derivePrivacyMask(input: MaskDerivationInput): PrivacyMask {
  const byId = new Map(input.graph.objects.map((o) => [o.id, o]));
  const facts = new Set<string>();
  for (const objectId of input.deactivatedObjectIds) {
    const obj = byId.get(objectId);
    if (!obj) continue;
    for (const v of [obj.title ?? null, obj.description ?? null]) {
      const n = normalizeFactValue(v);
      if (n) facts.add(n);
    }
    for (const v of Object.values(obj.fields ?? {})) {
      if (Array.isArray(v)) {
        for (const item of v) {
          const n = normalizeFactValue(item);
          if (n) facts.add(n);
        }
      } else {
        const n = normalizeFactValue(v);
        if (n) facts.add(n);
      }
    }
  }
  return {
    version: PRIVACY_MASK_VERSION,
    facts: [...facts].sort(),
    objects: [...new Set(input.deactivatedObjectIds)].sort(),
    sections: [...new Set(input.hiddenSectionIds)].sort(),
    directiveIds: [...new Set(input.directiveIds)].sort(),
  };
}

/**
 * The single public-boundary enforcement: per-field owner decisions first
 * (conservative defaults), then Q2 hide traversal, then the journal-derived
 * mask (drop objects, suppress fact values everywhere, drop orphaned
 * relationships). Never mutates the input graph.
 */
export function applyFactPrivacy(
  graph: ObjectGraph,
  mask: PrivacyMask | null | undefined,
  decisions: FieldVisibilityDecision[] | null | undefined,
): ObjectGraph {
  const decided = decisions ?? [];
  const fieldProjected = applyFieldVisibility(graph, decided);
  const untraversed = applyHideTraversal(fieldProjected, decided);
  const m = mask ?? emptyPrivacyMask();
  const factSet = new Set(m.facts);
  const objectSet = new Set(m.objects);
  if (factSet.size === 0 && objectSet.size === 0) return untraversed;

  const scrubScalar = (v: string | null | undefined): string | null | undefined => {
    if (v === null || v === undefined) return v;
    const n = normalizeFactValue(v);
    return n !== null && factSet.has(n) ? null : v;
  };

  const objects = untraversed.objects
    .filter((o) => !objectSet.has(o.id))
    .map((o) => {
      const fields: Record<string, string | string[]> = {};
      for (const [key, value] of Object.entries(o.fields ?? {})) {
        if (Array.isArray(value)) {
          const kept = value.filter((item) => {
            const n = normalizeFactValue(item);
            return n === null || !factSet.has(n);
          });
          if (kept.length > 0) fields[key] = kept;
        } else {
          const n = normalizeFactValue(value);
          if (n === null || !factSet.has(n)) fields[key] = value;
        }
      }
      return {
        ...o,
        title: scrubScalar(o.title) ?? null,
        description: scrubScalar(o.description) ?? null,
        fields,
      };
    });
  const keptIds = new Set(objects.map((o) => o.id));
  const relationships = untraversed.relationships.filter(
    (r) => keptIds.has(r.subject) && keptIds.has(r.object),
  );
  return { objects, relationships };
}

/**
 * Read owner field-visibility decisions live from the owner store for the
 * given object ids. An object whose owner asserted addressVisibility hidden
 * (set-address-visibility) yields a hide decision on the address semantic
 * fact. Fail-open per object: a missing or unreadable override file means
 * conservative defaults apply, never an exception.
 */
export function readOwnerFieldVisibilityDecisions(
  objectIds: string[],
): FieldVisibilityDecision[] {
  const out: FieldVisibilityDecision[] = [];
  for (const objectId of objectIds) {
    let overrides;
    try {
      overrides = readOverrides(objectId);
    } catch {
      continue;
    }
    if (overrides.addressVisibility === "hidden") {
      const assertion = overrides.addressVisibilityAssertion as { at?: string } | null | undefined;
      out.push({
        objectId,
        field: "address",
        policy: "hide",
        decidedBy: "owner",
        decidedAt: assertion?.at ?? new Date(0).toISOString(),
        source: "owner_override",
        version: 1,
      });
    }
  }
  return out;
}
