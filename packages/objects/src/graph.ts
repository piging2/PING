/**
 * Object kernel: the object graph record and the evidence-bound field read.
 *
 * HARVESTED (ADAPT) from ping-fyd-converged (SHA 32f8347)
 *   src/fyd/sitespec/graph.ts  (ObjectGraph / PresentationBinding /
 *                                verifyPresentationBinding / resolveBoundField)
 *
 * What moved: the graph shape and the presentation-binding verifier -- the
 * "object field -> claim -> evidence ref" hop that owns the no-invented-
 * claims contract at the object layer. Pure, deterministic, browser-safe.
 *
 * What stays behind (REJECT for the object kernel):
 *   - resolveWebsiteUrl: FYD generator helper with the has_website
 *     predicate vocabulary (generator/renderer concern, not kernel).
 *   - The strong verifier in src/fyd/sitespec/binding-verifier.ts
 *     (848 lines: emission-gate policy with evidence-freshness horizons
 *     and owner-assertion matching). Manifested for the SiteSpec/renderer
 *     slice (proofs 5-8); not needed to construct typed objects with
 *     evidence refs (proofs 1-4).
 */

import type { PingObject, PingRelationship } from "./object-types";

/** The graph the kernel reasons over: browser-safe objects plus relationships. */
export interface ObjectGraph {
  objects: PingObject[];
  relationships: PingRelationship[];
}

/**
 * The four visible-statement classifications for a presentation binding.
 *
 * - direct: the presented value is accepted evidence, shown verbatim.
 * - derived: the presented value is a deterministic transform of present
 *   evidence (formatting, joining, unit conversion).
 * - generated: the presented value was AI-written; it must name the
 *   generator that produced it, bound to evidence.
 * - owner_authored: the presented value is owner state, which is durable
 *   and survives re-ingestion.
 */
export type BindingClassification = "direct" | "derived" | "generated" | "owner_authored";

/**
 * A single factual claim a renderer wants to show: which object, which
 * field, and how the presented statement is classified. evidenceRef and
 * generatorRef are carrier metadata; the verifier never treats them as
 * authoritative on their own.
 */
export interface PresentationBinding {
  objectId: string;
  field: string;
  classification: BindingClassification;
  evidenceRef?: string;
  generatorRef?: string;
}

/** Verdict of the presentation binding check: fail closed. */
export type BindingVerdict = { ok: true; value: string } | { ok: false; reason: string };

/**
 * Field value read preserving the bound/unbound distinction. "title" and
 * "description" are object-level factual identity and bind as
 * pseudo-fields: a direct binding still requires the object's provenance
 * ref, exactly like any other direct field.
 */
function boundFieldValue(o: PingObject, name: string): string | undefined {
  if (name === "title") return o.title === "" ? undefined : o.title;
  if (name === "description") return o.description === "" ? undefined : o.description;
  const v = o.fields[name];
  if (typeof v === "string") return v === "" ? undefined : v;
  if (Array.isArray(v)) {
    const joined = v.filter((s) => s !== "").join(", ");
    return joined === "" ? undefined : joined;
  }
  return undefined;
}

/** The four classifications this verifier recognizes. */
const CLASSIFICATIONS: readonly BindingClassification[] = [
  "direct",
  "derived",
  "generated",
  "owner_authored",
];

/**
 * Verify that a presentation binding resolves to an accepted fact.
 *
 * Pure and deterministic: no clock, no randomness, no I/O. This is a
 * verifier, not an authority: it answers whether the presented statement
 * resolves to accepted evidence (direct, via the object's provenance.ref),
 * a deterministic transform of present evidence (derived), owner state
 * (owner_authored), or an explicitly classified generated statement
 * (generated, via a generatorRef of the form name@version). Anything else
 * fails closed and the caller omits the value.
 */
export function verifyPresentationBinding(
  binding: PresentationBinding,
  graph: ObjectGraph,
): BindingVerdict {
  const objects = new Map(graph.objects.map((o) => [o.id, o]));
  const obj = objects.get(binding.objectId);
  if (!obj) return { ok: false, reason: "unknown object" };
  const value = boundFieldValue(obj, binding.field);
  if (value === undefined) return { ok: false, reason: "unbound field" };
  if (!CLASSIFICATIONS.includes(binding.classification)) {
    return { ok: false, reason: "unknown classification" };
  }
  switch (binding.classification) {
    case "direct":
      if (!obj.provenance || obj.provenance.ref === "") {
        return { ok: false, reason: "no evidence ref" };
      }
      return { ok: true, value };
    case "generated":
      if (
        typeof binding.generatorRef !== "string" ||
        !/^[^\s@]+@[^\s@]+$/.test(binding.generatorRef)
      ) {
        return { ok: false, reason: "no generator ref" };
      }
      return { ok: true, value };
    case "derived":
    case "owner_authored":
      return { ok: true, value };
  }
  return { ok: false, reason: "unknown classification" };
}

/**
 * Resolve a presentation binding to its display value.
 *
 * Returns the verified value, or undefined when the binding does not
 * verify. undefined means the caller must OMIT the value, never guess.
 */
export function resolveBoundField(
  graph: ObjectGraph,
  binding: PresentationBinding,
): string | undefined {
  const verdict = verifyPresentationBinding(binding, graph);
  return verdict.ok ? verdict.value : undefined;
}
