/**
 * LANE-OWNER: the VISIBILITY policy, the second of the three concepts.
 *
 *   FACT         what the extractor observed (./facts.ts). Source truth.
 *   VISIBILITY   THIS FILE: which facts may appear on the public site.
 *                A per-fact public/hidden policy, owner-overridable within
 *                safety bounds. Never invents facts; only governs them.
 *   PRESENTATION how the visible facts are arranged (the SiteSpec and the
 *                presentation-intent layer in ../customize/).
 *
 * The extractor observes; the policy decides; the renderer only ever sees
 * the public projection. The invariant, pinned by tests: a hidden fact
 * never reaches the public render. Hidden facts are ABSENT from the
 * public projection, not redacted inside it.
 *
 * Decision precedence (highest first):
 *   1. explicit owner VisibilityDecision (latest wins, append-only)
 *   2. HIDE OwnerAssertion from ./corrections.ts (op HIDE)
 *   3. conservative default: location facts default to hidden
 *      (street-level detail is not public by default), everything else
 *      defaults to public.
 *
 * Safety bounds (owner overrides are bounded, not absolute):
 *   - identity facts (the business name) can never be hidden from the
 *     public render. A hide request on one is refused with a reason.
 *   - visibility can only be set on facts the extractor actually observed.
 *     Unknown fact ids are refused, never guessed.
 *
 * Relationship to existing machinery (extend, do not duplicate):
 * src/fyd/sitespec/field-visibility.ts owns per-FIELD show/hide/coarse
 * projection (e.g. coarsening a shown address to city level). This file
 * owns per-FACT public/hidden at the owner-policy layer above it: a fact
 * hidden here never reaches field projection at all.
 *
 * Pure, deterministic, browser-safe.
 */

import {
  assertionFactId,
  type OwnerAssertion,
} from "./corrections";
import type { FactKind, SiteFact } from "./facts";
import type { OwnerProvenance } from "./provenance";

/** Per-fact visibility. There is no third state. */
export type FactVisibility = "public" | "hidden";

/**
 * One owner visibility decision. Append-only: the latest decision for a
 * fact wins, earlier ones stay in the log as history.
 */
export interface VisibilityDecision {
  factId: string;
  visibility: FactVisibility;
  provenance: OwnerProvenance;
}

/** The safety bounds owner overrides live inside. */
export const VISIBILITY_SAFETY_BOUNDS = {
  /** The business name (identity fact) can never be hidden from the public site. */
  identityCannotBeHidden: true,
  /** Visibility only applies to facts the extractor observed. */
  onlyExtractedFacts: true,
} as const;

/**
 * Conservative default per kind. Location (street-level) detail is not
 * public until the owner says so; everything else is public by default.
 */
export function conservativeDefaultFor(kind: FactKind): FactVisibility {
  return kind === "location" ? "hidden" : "public";
}

export type SetVisibilityOutcome =
  | { ok: true; decisions: VisibilityDecision[] }
  | { ok: false; reason: string };

/**
 * Record an owner visibility override. Pure: returns the extended decision
 * log. Refuses honestly on unknown facts and on safety-bound violations;
 * a refusal changes nothing.
 */
export function setFactVisibility(
  facts: SiteFact[],
  decisions: VisibilityDecision[],
  factId: string,
  visibility: FactVisibility,
  provenance: OwnerProvenance,
): SetVisibilityOutcome {
  const fact = facts.find((f) => f.factId === factId);
  if (!fact) {
    return {
      ok: false,
      reason:
        "Unknown fact '" +
        factId +
        "': visibility can only be set on facts the extractor observed.",
    };
  }
  if (visibility === "hidden" && fact.kind === "identity") {
    return {
      ok: false,
      reason:
        "Safety bound: the business name is an identity fact and cannot be " +
        "hidden from the public site.",
    };
  }
  return {
    ok: true,
    decisions: [...decisions, { factId, visibility, provenance }],
  };
}

export type VisibilitySource =
  | "owner_override"
  | "hide_assertion"
  | "conservative_default";

/**
 * Resolve one fact's visibility under the precedence rules. The latest
 * explicit owner decision wins; then HIDE assertions; then the
 * conservative default.
 */
export function resolveFactVisibility(
  fact: SiteFact,
  decisions: VisibilityDecision[],
  hideAssertions: OwnerAssertion[] = [],
): { visibility: FactVisibility; source: VisibilitySource } {
  for (let i = decisions.length - 1; i >= 0; i--) {
    const d = decisions[i];
    if (d.factId === fact.factId) {
      return { visibility: d.visibility, source: "owner_override" };
    }
  }
  for (const a of hideAssertions) {
    if (a.op === "HIDE" && assertionFactId(a) === fact.factId) {
      return { visibility: "hidden", source: "hide_assertion" };
    }
  }
  return {
    visibility: conservativeDefaultFor(fact.kind),
    source: "conservative_default",
  };
}

export interface PublicProjection {
  /**
   * Facts the public render may use. Hidden facts are ABSENT here, not
   * redacted: the renderer never receives them in any form.
   */
  publicFacts: SiteFact[];
  /** Facts withheld from the public render, with their policy intact. */
  hiddenFacts: SiteFact[];
}

/**
 * PRESENTATION boundary: split facts into the public projection and the
 * withheld set. The site renderer, the spec generator, and Ask FYD's
 * public answers consume publicFacts ONLY. Evidence views (the owner
 * EVIDENCE tab) may show hiddenFacts with their provenance; the public
 * site never sees them.
 */
export function projectPublicFacts(
  facts: SiteFact[],
  decisions: VisibilityDecision[],
  hideAssertions: OwnerAssertion[] = [],
): PublicProjection {
  const publicFacts: SiteFact[] = [];
  const hiddenFacts: SiteFact[] = [];
  for (const fact of facts) {
    const { visibility } = resolveFactVisibility(fact, decisions, hideAssertions);
    if (visibility === "public") publicFacts.push(fact);
    else hiddenFacts.push(fact);
  }
  return { publicFacts, hiddenFacts };
}

/** Convenience: the factIds currently hidden, for owner surfaces. */
export function hiddenFactIds(
  facts: SiteFact[],
  decisions: VisibilityDecision[],
  hideAssertions: OwnerAssertion[] = [],
): string[] {
  return projectPublicFacts(facts, decisions, hideAssertions).hiddenFacts.map(
    (f) => f.factId,
  );
}
