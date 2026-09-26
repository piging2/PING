/**
 * Lane D: resolved intent -> digest-bound site_patch proposal.
 *
 * Reuses the existing structured-editor machinery
 * (src/fyd/proceduralize/patch.ts): the same SiteIntent type, the same
 * proposeSitePatch, the same digest algorithm. This lane adds the
 * plain-English front door and the honest no-op refusals; it does not
 * fork the proposal format.
 *
 * The proposal binds the exact spec digest it was drafted against. Apply
 * re-verifies that digest against the live spec: a stale proposal is a
 * 409, never a silent apply.
 */

import { canonicalize } from "@/lib/ping/ask-composer";
import { createHash } from "node:crypto";
import { resolveQuery } from "../sitespec/query";
import {
  proposeSitePatch,
  type SiteIntent,
  type SitePatchBody,
} from "../proceduralize/patch";
import type { FYDSiteSpec, ObjectGraph } from "../sitespec/types";
import type { FieldVisibilityPolicy } from "../sitespec/field-visibility";
import type { VisibilityProposal } from "./types";

export interface ReviewCard {
  title: string;
  before: string[];
  after: string[];
  operationCount: number;
}

export type ProposeOutcome =
  | { ok: true; proposal: SitePatchBody; reviewCard: ReviewCard; specDigest: string }
  | { ok: false; error: string };

export type VisibilityProposeOutcome =
  | { ok: true; proposal: VisibilityProposal; reviewCard: ReviewCard }
  | { ok: false; error: string };

/** Digest of the exact spec a proposal was drafted against. */
export function specDigestOf(spec: FYDSiteSpec): string {
  return createHash("sha256").update(canonicalize(spec), "utf8").digest("hex");
}

/** Digest binding a visibility proposal: object + field + policy. */
export function visibilityProposalDigest(
  proposal: Omit<VisibilityProposal, "proposalDigest">,
): string {
  return createHash("sha256")
    .update(canonicalize(proposal), "utf8")
    .digest("hex");
}

/**
 * Draft the digest-bound proposal for a visibility decision. Refuses
 * honestly on no-ops (already hidden / already shown) instead of
 * producing an empty proposal. currentPolicy is the resolved policy
 * from the site's current visibility decisions ("show" when undecided).
 */
export function proposeVisibilityDecision(
  objectId: string,
  field: string,
  policy: FieldVisibilityPolicy,
  objectTitle: string,
  currentPolicy: FieldVisibilityPolicy,
): VisibilityProposeOutcome {
  if (currentPolicy === policy) {
    return {
      ok: false,
      error:
        "The " + field + " of \"" + objectTitle + "\" already has policy \"" +
        policy + "\", so there is nothing to change.",
    };
  }
  const body = {
    kind: "field_visibility" as const,
    objectId,
    field,
    policy,
  };
  const proposal: VisibilityProposal = {
    ...body,
    proposalDigest: visibilityProposalDigest(body),
  };
  const word =
    policy === "hide"
      ? "Hide " + field
      : policy === "members"
        ? "Show " + field + " to FYD members only"
        : policy === "coarse"
          ? "Coarsen " + field
          : "Show " + field;
  return {
    ok: true,
    proposal,
    reviewCard: {
      title: word,
      before: [field + " of \"" + objectTitle + "\": " + currentPolicy + " (owner visibility policy)"],
      after: [field + " of \"" + objectTitle + "\": " + policy + " (owner visibility policy)"],
      operationCount: 1,
    },
  };
}

function describeMove(spec: FYDSiteSpec, intent: SiteIntent): { before: string[]; after: string[] } | null {
  if (intent.kind !== "reorder_section") return null;
  const page = spec.pages.find((p) => p.slug === intent.pageSlug);
  if (!page) return null;
  const idx = page.sections.findIndex((s) => s.id === intent.sectionId);
  if (idx === -1) return null;
  const names = page.sections.map((s) => s.component + " (" + s.id + ")");
  const after = [...names];
  const [moved] = after.splice(idx, 1);
  after.splice(intent.toIndex, 0, moved);
  return { before: names, after };
}

function describeMoveAbove(
  spec: FYDSiteSpec,
  intent: Extract<SiteIntent, { kind: "move_above" }>,
): { before: string[]; after: string[]; moveTo: number } | null {
  const page = spec.pages.find((p) => p.slug === intent.pageSlug);
  if (!page) return null;
  const idx = page.sections.findIndex((s) => s.id === intent.sectionId);
  const anchorIdx = page.sections.findIndex((s) => s.id === intent.anchorSectionId);
  if (idx === -1 || anchorIdx === -1) return null;
  const moveTo = idx < anchorIdx ? anchorIdx - 1 : anchorIdx;
  const names = page.sections.map((s) => s.component + " (" + s.id + ")");
  const after = [...names];
  const [moved] = after.splice(idx, 1);
  after.splice(moveTo, 0, moved);
  return { before: names, after, moveTo };
}

function objectTitle(graph: ObjectGraph | undefined, id: string): string {
  const o = graph?.objects.find((x) => x.id === id);
  return o?.title ?? id;
}

function describeObjectOrder(
  spec: FYDSiteSpec,
  graph: ObjectGraph | undefined,
  intent: Extract<SiteIntent, { kind: "reorder_objects" }>,
): { before: string[]; after: string[] } | null {
  const sec = spec.pages
    .find((p) => p.slug === intent.pageSlug)
    ?.sections.find((s) => s.id === intent.sectionId);
  if (!sec) return null;
  const current = graph
    ? resolveQuery(sec.query, graph, spec.ownerObjectId).map((o) => o.id)
    : [];
  const name = (id: string) => objectTitle(graph, id);
  return {
    before: [
      "Order in " + sec.component + ": " +
        (current.map(name).join(" | ") || "(unknown without graph)"),
    ],
    after: ["Order in " + sec.component + ": " + intent.objectIds.map(name).join(" | ")],
  };
}

function describeToggle(spec: FYDSiteSpec, intent: SiteIntent): { before: string[]; after: string[] } | null {
  if (intent.kind !== "toggle_section") return null;
  const sec = spec.pages
    .find((p) => p.slug === intent.pageSlug)
    ?.sections.find((s) => s.id === intent.sectionId);
  if (!sec) return null;
  const cur = sec.presentation.hidden === true ? "hidden" : "visible";
  const next = intent.hidden ? "hidden" : "visible";
  return {
    before: ["Section " + sec.component + " (" + sec.id + "): " + cur],
    after: ["Section " + sec.component + " (" + sec.id + "): " + next],
  };
}

function describeFeatured(spec: FYDSiteSpec, intent: SiteIntent): { before: string[]; after: string[] } | null {
  if (intent.kind !== "set_featured") return null;
  const sec = spec.pages
    .find((p) => p.slug === intent.pageSlug)
    ?.sections.find((s) => s.id === intent.sectionId);
  if (!sec) return null;
  const cur = Array.isArray(sec.presentation.featuredIds) ? sec.presentation.featuredIds : [];
  return {
    before: ["Featured in " + sec.component + ": " + (cur.join(", ") || "(none)")],
    after: ["Featured in " + sec.component + ": " + intent.objectIds.join(", ")],
  };
}

/**
 * Draft the digest-bound proposal for a resolved intent. Refuses honestly
 * on no-ops (already first, already hidden, already featured) instead of
 * producing an empty proposal. The optional graph enables no-op detection
 * and review-card naming for object-level intents; without it those
 * intents still propose, with ids in place of titles.
 */
export function proposeFromSiteIntent(
  spec: FYDSiteSpec,
  siteIntent: SiteIntent,
  graph?: ObjectGraph,
): ProposeOutcome {
  const specDigest = specDigestOf(spec);
  const drafted = proposeSitePatch(spec, siteIntent);
  if (!drafted.ok || !drafted.proposal) {
    return { ok: false, error: drafted.error ?? "Could not draft a proposal." };
  }
  const proposal = drafted.proposal;

  let card: ReviewCard | null = null;
  if (siteIntent.kind === "reorder_section") {
    const diff = proposal.propsDiff as { moveFrom?: number; moveTo?: number };
    if (diff.moveFrom === diff.moveTo) {
      const page = spec.pages.find((p) => p.slug === siteIntent.pageSlug);
      const sec = page?.sections.find((s) => s.id === siteIntent.sectionId);
      return {
        ok: false,
        error:
          "The " + (sec?.component ?? "section") + " section is already " +
          (diff.moveTo === 0 ? "first" : "at position " + diff.moveTo) +
          ", so there is nothing to change.",
      };
    }
    const order = describeMove(spec, siteIntent);
    if (!order) return { ok: false, error: "Section not found in this spec." };
    card = {
      title: "Move section to position " + diff.moveTo,
      before: ["Page order: " + order.before.join(" | ")],
      after: ["Page order: " + order.after.join(" | ")],
      operationCount: 1,
    };
  } else if (siteIntent.kind === "move_above") {
    const order = describeMoveAbove(spec, siteIntent);
    if (!order) return { ok: false, error: "Section or anchor not found in this spec." };
    const page = spec.pages.find((p) => p.slug === siteIntent.pageSlug)!;
    const idx = page.sections.findIndex((s) => s.id === siteIntent.sectionId);
    const anchorIdx = page.sections.findIndex((s) => s.id === siteIntent.anchorSectionId);
    const anchor = page.sections[anchorIdx];
    const sec = page.sections[idx];
    if (idx === anchorIdx - 1) {
      return {
        ok: false,
        error:
          "The " + sec.component + " section is already directly above the " +
          anchor.component + " section, so there is nothing to change.",
      };
    }
    card = {
      title: "Move " + sec.component + " above " + anchor.component,
      before: ["Page order: " + order.before.join(" | ")],
      after: ["Page order: " + order.after.join(" | ")],
      operationCount: 1,
    };
  } else if (siteIntent.kind === "reorder_objects") {
    const sec = spec.pages
      .find((p) => p.slug === siteIntent.pageSlug)
      ?.sections.find((s) => s.id === siteIntent.sectionId);
    if (!sec) return { ok: false, error: "Section not found in this spec." };
    if (graph) {
      const current = resolveQuery(sec.query, graph, spec.ownerObjectId).map((o) => o.id);
      if (
        current.length === siteIntent.objectIds.length &&
        current.every((id, i) => id === siteIntent.objectIds[i])
      ) {
        return {
          ok: false,
          error:
            "The objects in the " + sec.component + " section are already in " +
            "that order, so there is nothing to change.",
        };
      }
    }
    const t = describeObjectOrder(spec, graph, siteIntent);
    if (!t) return { ok: false, error: "Section not found in this spec." };
    card = {
      title: "Reorder objects in " + sec.component,
      before: t.before,
      after: t.after,
      operationCount: 1,
    };
  } else if (siteIntent.kind === "set_field_emphasis") {
    const sec = spec.pages
      .find((p) => p.slug === siteIntent.pageSlug)
      ?.sections.find((s) => s.id === siteIntent.sectionId);
    if (!sec) return { ok: false, error: "Section not found in this spec." };
    const current = Array.isArray(sec.presentation.fieldEmphasis)
      ? sec.presentation.fieldEmphasis
      : [];
    const has = current.includes(siteIntent.field);
    if (siteIntent.emphasized === has) {
      return {
        ok: false,
        error:
          "The " + siteIntent.field + " is already " +
          (has ? "emphasized" : "not emphasized") + " in the " +
          sec.component + " section, so there is nothing to change.",
      };
    }
    card = {
      title: siteIntent.emphasized
        ? "Make the " + siteIntent.field + " more prominent"
        : "Remove " + siteIntent.field + " prominence",
      before: [
        siteIntent.field + " in " + sec.component + ": " +
          (has ? "prominent" : "standard"),
      ],
      after: [
        siteIntent.field + " in " + sec.component + ": " +
          (siteIntent.emphasized ? "prominent (primary-action variant)" : "standard"),
      ],
      operationCount: 1,
    };
  } else if (siteIntent.kind === "set_hero_media") {
    const sec = spec.pages
      .find((p) => p.slug === siteIntent.pageSlug)
      ?.sections.find((s) => s.id === siteIntent.sectionId);
    if (!sec) return { ok: false, error: "Section not found in this spec." };
    if (sec.presentation.heroMediaObjectId === siteIntent.objectId) {
      return {
        ok: false,
        error: "That photo is already the hero, so there is nothing to change.",
      };
    }
    const name = objectTitle(graph, siteIntent.objectId);
    card = {
      title: "Use a project photo as the hero",
      before: ["Hero image: " + (sec.presentation.heroMediaObjectId
        ? objectTitle(graph, sec.presentation.heroMediaObjectId)
        : "default selection")],
      after: ["Hero image: photo of \"" + name + "\" (owner choice)"],
      operationCount: 1,
    };
  } else if (siteIntent.kind === "set_visual_intent") {
    const sec = spec.pages
      .find((p) => p.slug === siteIntent.pageSlug)
      ?.sections.find((s) => s.id === siteIntent.sectionId);
    if (!sec) return { ok: false, error: "Section not found in this spec." };
    const curEmphasis = sec.composition?.emphasis;
    const curTreatment = sec.composition?.mediaTreatment?.treatment;
    const emphasisDone =
      siteIntent.emphasis === undefined || curEmphasis === siteIntent.emphasis;
    const treatmentDone =
      siteIntent.mediaTreatment?.treatment === undefined ||
      curTreatment === siteIntent.mediaTreatment.treatment;
    if (emphasisDone && treatmentDone) {
      return {
        ok: false,
        error:
          "The " + sec.component + " section already has that visual intent, " +
          "so there is nothing to change.",
      };
    }
    const fmt = (e: string | undefined, t: string | undefined) =>
      "emphasis " + (e ?? "(default)") + ", media treatment " + (t ?? "(default)");
    card = {
      title: "Set visual intent on " + sec.component,
      before: [sec.component + ": " + fmt(curEmphasis, curTreatment)],
      after: [
        sec.component + ": " +
          fmt(siteIntent.emphasis ?? curEmphasis, siteIntent.mediaTreatment?.treatment ?? curTreatment),
      ],
      operationCount: 1,
    };
  } else if (siteIntent.kind === "toggle_section") {
    const sec = spec.pages
      .find((p) => p.slug === siteIntent.pageSlug)
      ?.sections.find((s) => s.id === siteIntent.sectionId);
    const already = (sec?.presentation.hidden === true) === siteIntent.hidden;
    if (already) {
      return {
        ok: false,
        error:
          "The " + (sec?.component ?? "section") + " section is already " +
          (siteIntent.hidden ? "hidden" : "visible") + ", so there is nothing to change.",
      };
    }
    const t = describeToggle(spec, siteIntent);
    if (!t) return { ok: false, error: "Section not found in this spec." };
    card = {
      title: siteIntent.hidden ? "Hide section" : "Show section",
      before: t.before,
      after: t.after,
      operationCount: 1,
    };
  } else if (siteIntent.kind === "set_featured") {
    const sec = spec.pages
      .find((p) => p.slug === siteIntent.pageSlug)
      ?.sections.find((s) => s.id === siteIntent.sectionId);
    const cur = Array.isArray(sec?.presentation.featuredIds)
      ? [...(sec.presentation.featuredIds as string[])].sort()
      : [];
    const next = [...siteIntent.objectIds].sort();
    if (cur.join("|") === next.join("|")) {
      return { ok: false, error: "That object is already featured, so there is nothing to change." };
    }
    const t = describeFeatured(spec, siteIntent);
    if (!t) return { ok: false, error: "Section not found in this spec." };
    card = {
      title: "Feature object",
      before: t.before,
      after: t.after,
      operationCount: 1,
    };
  } else {
    return {
      ok: false,
      error:
        "Intent kind \"" + (siteIntent as SiteIntent).kind +
        "\" is not appliable through the presentation-intent layer.",
    };
  }

  return { ok: true, proposal, reviewCard: card!, specDigest };
}
