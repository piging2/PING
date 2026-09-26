/**
 * Render-side binding contract (product lane, V1).
 *
 * Nolan directive 2026-09-26: the renderer must NOT decide business
 * truth. Its contract is SiteSpec + resolved safe presentation data +
 * viewer context -> UI. It must not invent claims, infer privacy,
 * perform entity resolution, call an LLM, or silently change object
 * meaning. Intelligence lives ABOVE the renderer (planner, projection);
 * evidence lives BELOW it (object graph, media manifest).
 *
 * Structural rule: every factual value a family component renders must
 * resolve to exactly one of four kinds:
 *
 *   object-field         OBJECT/FIELD: a value read straight off a bound
 *                        object (title, description, fields.*) via the
 *                        typed accessors in types.ts. Never transformed
 *                        beyond whitespace normalization.
 *   evidence-derivation  EVIDENCE-BACKED DERIVATION: a deterministic,
 *                        total function of evidenced values (firstSentence,
 *                        formatHoursDisplay, the planner's field-name
 *                        adapters). Derivations never add facts; unknown
 *                        input passes through untouched or renders
 *                        nothing.
 *   owner-content        OWNER-PROVIDED CONTENT: owner description,
 *                        owner assertions / field corrections, owner
 *                        intent headline. Rendered verbatim, never
 *                        paraphrased by the renderer.
 *   generated-copy       explicitly classified GENERATED COPY:
 *                        renderer-owned presentation chrome (section
 *                        kickers, generic headings, button framing like
 *                        "Call ..."). Generic, never business-specific,
 *                        and always marked with the generator ref below.
 *
 * This module is a VOCABULARY, not an authority. Truth is owned by the
 * existing binding verifier at the projection seam
 * (sitespec/binding-verifier.ts); the mappings below reuse its exact
 * types so the family can never drift into a parallel classification.
 * No ClaimAuthority is created here or anywhere in the family.
 *
 * Enforcement points (structural, not advisory):
 *  1. FamilySectionProps carries only { section, ctx }: components
 *     receive NO free-form factual props. All facts arrive through the
 *     plan's typed bindings (objectBindings, mediaBindings,
 *     ctaBindings, headline) or the graph-backed FamilyCtx.
 *  2. SectionShell chrome (title/kicker/intro) accepts ONLY
 *     GeneratedCopy-branded strings: a plain string does not typecheck.
 *     String literals written directly inside a component file are
 *     renderer-owned generated copy by construction; the brand gates
 *     the prop boundary where strings cross component boundaries.
 *  3. Capability-gated UI (newsletter capture, schedule funnel) renders
 *     ONLY on the corresponding evidenced CTA binding. A planned
 *     variant without its binding fails closed (renders nothing),
 *     never a guessed or invented funnel.
 */

import type {
  BindingSource,
  RenderAtomClassification,
} from "../sitespec/binding-verifier";

/** The four render-side binding kinds. Exactly one applies per factual render site. */
export type RenderBindingKind =
  | "object-field"
  | "evidence-derivation"
  | "owner-content"
  | "generated-copy";

/**
 * Map a render-side kind to the existing verifier's BindingSource
 * vocabulary (binding-verifier.ts). The verifier remains the single
 * owner of truth; this is a projection of its vocabulary for
 * renderer-side documentation and tests.
 */
export function verifierSourceFor(kind: RenderBindingKind): BindingSource {
  switch (kind) {
    case "object-field":
      return "object-field";
    case "evidence-derivation":
      // A deterministic transform of a present object field.
      return "object-field";
    case "owner-content":
      return "owner-assertion";
    case "generated-copy":
      return "generated-presentation";
  }
}

/**
 * Map a render-side kind to the verifier's render-atom classification
 * vocabulary (OWNER_ASSERTED / DIRECT_EVIDENCE / DETERMINISTIC_DERIVATION
 * / GENERATED_PRESENTATION / UNKNOWN). Same single-vocabulary rule.
 */
export function renderAtomClassificationFor(
  kind: RenderBindingKind,
): RenderAtomClassification {
  switch (kind) {
    case "object-field":
      return "DIRECT_EVIDENCE";
    case "evidence-derivation":
      return "DETERMINISTIC_DERIVATION";
    case "owner-content":
      return "OWNER_ASSERTED";
    case "generated-copy":
      return "GENERATED_PRESENTATION";
  }
}

/**
 * Generator mark for renderer-owned chrome. The verifier requires
 * generated presentation to name a generator as name@version; every
 * GeneratedCopy string carries this mark by construction.
 */
export const FAMILY_GENERATED_COPY_REF = "fyd-family-renderer@1";

/**
 * A renderer-owned presentation string, explicitly classified
 * GENERATED COPY. Branded so it cannot be confused with factual
 * content at the SectionShell prop boundary.
 */
export type GeneratedCopy = string & { readonly __generatedCopy: unique symbol };

/**
 * Mark a renderer-owned chrome string as explicitly classified
 * generated copy. Pass ONLY generic presentation strings: section
 * kickers, generic headings, framing copy. Never business facts,
 * never claims about the business.
 */
export function generatedCopy(text: string): GeneratedCopy {
  return text as GeneratedCopy;
}

/** Section chrome: generic presentation strings, never business facts. */
export interface SectionChrome {
  title?: GeneratedCopy;
  kicker?: GeneratedCopy;
  intro?: GeneratedCopy;
}

/** Build section chrome from explicitly marked generated-copy strings. */
export function sectionChrome(chrome: SectionChrome): SectionChrome {
  return chrome;
}
