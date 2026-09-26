/**
 * Lane D: customize-with-FYD intent pipeline — shared types.
 *
 * Layer law (frozen): customization operates on INTENT and structured
 * state. Three layers stay separate:
 *
 *   FACTS              the object graph (objects, relationships). Source
 *                      truth; every claim carries provenance. The intent
 *                      pipeline never writes here.
 *   PRESENTATION INTENT  owner-approved display directives (section order,
 *                      object order, presentation fields). Persisted as
 *                      PresentationIntentDirective records, each carrying
 *                      its approval evidence. Applied OVER the compiled
 *                      spec at render time; never merged into facts.
 *   DESIGN SYSTEM        theme tokens, component registry, renderer
 *                      semantics. Not customizable through this pipeline;
 *                      directives that touch it are refused, not coerced.
 *
 * No direct DOM editing, no generated-JSX mutation, no arbitrary CSS
 * injection anywhere in this lane.
 */

import type { SiteIntent, SitePatchBody } from "../proceduralize/patch";
import type { FieldVisibilityPolicy } from "../sitespec/field-visibility";

/**
 * The typed, deterministic intent object. Plain English goes in, one of
 * these comes out. This is data, never free-form text passed to a
 * renderer. Same normalized text always yields the same object.
 */
export type ParsedIntent =
  | { kind: "promote_first"; target: string }
  | { kind: "move_above"; target: string; anchor: string }
  | { kind: "feature_object"; target: string }
  | { kind: "hide_section"; target: string }
  | { kind: "show_section"; target: string }
  | { kind: "emphasize_field"; target: string }
  | { kind: "set_hero_media"; target: string }
  | { kind: "hide_field"; target: string; policy?: FieldVisibilityPolicy }
  | { kind: "show_field"; target: string; policy?: FieldVisibilityPolicy }
  | { kind: "visual_intent"; mood: "more_visual" | "more_premium" };

/**
 * Honest failure: the text is not a supported customization. The reason
 * names what IS supported. Never silently reinterpreted into something
 * the owner did not ask for.
 */
export interface UnsupportedIntent {
  unsupported: true;
  reason: string;
  normalizedText: string;
}

export type ParseResult =
  | { intent: ParsedIntent; intentDigest: string }
  | UnsupportedIntent;

export function isUnsupported(r: ParseResult): r is UnsupportedIntent {
  return "unsupported" in r && (r as UnsupportedIntent).unsupported === true;
}

/** A parsed intent grounded against the site's actual evidence. */
export interface ResolvedIntent {
  resolved: true;
  parsed: ParsedIntent;
  /** The structured editor intent (proceduralize/patch.ts) this resolves to. */
  siteIntent: SiteIntent;
  resolutionNote: string;
}

/**
 * A parsed field-visibility intent grounded against the site's evidence.
 * This is the VISIBILITY layer (owner policy), not a site patch: the
 * decision is recorded as a FieldVisibilityDecision and applied to a
 * PROJECTED graph copy before spec generation. The source graph (FACTS)
 * is never rewritten.
 */
export interface ResolvedVisibilityIntent {
  resolved: true;
  parsed: ParsedIntent;
  visibility: {
    /** Owner business object id. */
    objectId: string;
    /** Field name, e.g. "address". */
    field: string;
    policy: FieldVisibilityPolicy;
  };
  resolutionNote: string;
}

/** A parsed intent that names nothing in this site's evidence. */
export interface UnresolvedIntent {
  resolved: false;
  parsed: ParsedIntent;
  reason: string;
}

export type ResolveResult =
  | ResolvedIntent
  | ResolvedVisibilityIntent
  | UnresolvedIntent;

/** Type guard: a visibility-layer resolution (not a site patch). */
export function isVisibilityResolution(
  r: ResolveResult,
): r is ResolvedVisibilityIntent {
  return r.resolved === true && "visibility" in r;
}

/**
 * One persisted owner presentation-intent directive. This is
 * PRESENTATION INTENT evidence, distinguishable from FACTS: it lives in
 * the projection's presentationIntent block (never in the object graph),
 * and it carries its full approval lineage.
 */
export interface PresentationIntentDirective {
  /** Deterministic id: "pi-" + sha256(siteId + proposalDigest).slice(0, 16). */
  intentId: string;
  /** The resolved structured intent that was approved. */
  siteIntent: SiteIntent;
  /** The exact digest-bound proposal the owner approved. */
  proposal: SitePatchBody;
  approval: {
    proposalDigest: string;
    /** Demo only: "demo-owner (seeded, unverified)". Never a real identity. */
    approvedBy: string;
    approvedAt: string;
    /** "DEMO OWNER MODE - not real authentication" marker. */
    note: string;
    /** Filled by the projection dump from the journal event. */
    eventId?: string;
  };
}

/** The presentation-intent block of a site projection. */
export interface PresentationIntentBlock {
  directives: PresentationIntentDirective[];
  provenance: {
    kind: "owner-presentation-intent";
    note: string;
    eventIds: string[];
  };
}

/** One persisted owner field-visibility decision (VISIBILITY layer). */
export interface FieldVisibilityDirective {
  /** Deterministic id: "fv-" + sha256(siteId + objectId + field + policy).slice(0, 16). */
  directiveId: string;
  objectId: string;
  field: string;
  policy: FieldVisibilityPolicy;
  /** Monotonic per object+field when the dump preserves it; default 1. */
  version?: number;
  proposalDigest: string;
  approval: {
    proposalDigest: string;
    /** Demo only: "demo-owner (seeded, unverified)". Never a real identity. */
    approvedBy: string;
    approvedAt: string;
    /** "DEMO OWNER MODE - not real authentication" marker. */
    note: string;
    /** Filled by the projection dump from the journal event. */
    eventId?: string;
  };
}

/** The field-visibility block of a site projection (VISIBILITY layer). */
export interface FieldVisibilityBlock {
  decisions: FieldVisibilityDirective[];
  provenance: {
    kind: "owner-field-visibility";
    note: string;
    eventIds: string[];
  };
}

/**
 * A digest-bound visibility proposal: the reviewable artifact the owner
 * approves for a field-visibility change. No free-form mutation: the
 * proposal names exactly one object, one field, one policy.
 */
export interface VisibilityProposal {
  kind: "field_visibility";
  proposalDigest: string;
  objectId: string;
  field: string;
  policy: FieldVisibilityPolicy;
}

/** Overlay op kinds the projection dump understands (see dump.py). */
export type CustomizeOverlayOp =
  | {
      op: "set_presentation_intent";
      intentId: string;
      siteIntent: SiteIntent;
      proposal: SitePatchBody;
      approval: {
        proposalDigest: string;
        approvedBy: string;
        approvedAt: string;
        note: string;
      };
    }
  | { op: "clear_presentation_intent"; intentId: string }
  | {
      op: "set_field_visibility";
      directiveId: string;
      objectId: string;
      field: string;
      policy: FieldVisibilityPolicy;
      /** Monotonic per object+field: the newest owner decision wins replay. */
      version: number;
      proposalDigest: string;
      approval: {
        proposalDigest: string;
        approvedBy: string;
        approvedAt: string;
        note: string;
      };
    }
  | { op: "clear_field_visibility"; objectId: string; field: string };
