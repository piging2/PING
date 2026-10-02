/**
 * Site customization: structured intents -> site_patch proposals.
 *
 * Lightweight customization only: reorder sections, hide/show sections,
 * featured-object selection, proposed presentation-copy edits, basic
 * design tokens. Structured editor, never drag and drop.
 *
 * Every intent follows the proposal path (harvest B2): intent ->
 * canonicalize -> validate -> ProposalBody with a proposalDigest the owner
 * approves verbatim. Copy edits and theme tokens are PROPOSED changes;
 * nothing changes until the digest is approved.
 */

import { sha256Hex } from "./sha256";
import type { FYDSiteSpec, FYDThemeTokens } from "../sitespec/types";

// ---------------------------------------------------------------------------
// Intents.
// ---------------------------------------------------------------------------

export type SiteIntent =
  | { kind: "reorder_section"; pageSlug: string; sectionId: string; toIndex: number }
  | {
      kind: "move_above";
      pageSlug: string;
      sectionId: string;
      /** The anchor section this section moves directly above. */
      anchorSectionId: string;
    }
  | { kind: "toggle_section"; pageSlug: string; sectionId: string; hidden: boolean }
  | { kind: "set_featured"; pageSlug: string; sectionId: string; objectIds: string[] }
  | {
      kind: "reorder_objects";
      pageSlug: string;
      sectionId: string;
      /** Full desired display order of object ids for the section. */
      objectIds: string[];
    }
  | { kind: "edit_copy"; pageSlug: string; sectionId: string; heading?: string; copy?: string }
  | {
      kind: "set_field_emphasis";
      pageSlug: string;
      sectionId: string;
      /** Field name, e.g. "phone". */
      field: string;
      emphasized: boolean;
    }
  | {
      kind: "set_hero_media";
      pageSlug: string;
      sectionId: string;
      /** Graph object id whose acquired media becomes the hero. */
      objectId: string;
    }
  | {
      kind: "set_visual_intent";
      pageSlug: string;
      sectionId: string;
      emphasis?: "quiet" | "balanced" | "prominent";
      mediaTreatment?: {
        treatment?: "documentary" | "polished" | "schematic";
        aspect?: "square" | "landscape" | "portrait" | "wide" | "banner";
      };
    }
  | { kind: "set_theme_token"; token: keyof FYDThemeTokens; value: string };

export interface SitePatchBody {
  kind: "site_patch";
  proposalDigest: string;
  targetPage: string;
  targetSection: string;
  component: string;
  /** The exact presentation/token change being proposed. */
  propsDiff: Record<string, unknown>;
  reason: string;
}

export interface PatchResult {
  ok: boolean;
  proposal?: SitePatchBody;
  /** Human-readable rejection when the intent is invalid. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Proposal digest. Mirrors src/lib/ping/ask-composer.ts: canonicalize the
// body (sorted keys, volatile fields stripped) then sha256.
// ---------------------------------------------------------------------------

const VOLATILE_KEYS = new Set(["proposalDigest", "createdAt", "generatedAt", "nonce"]);

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (VOLATILE_KEYS.has(key)) continue;
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function proposalDigest(body: Omit<SitePatchBody, "proposalDigest">): string {
  const canonical = JSON.stringify(canonicalize(body));
  return sha256Hex(canonical);
}

// ---------------------------------------------------------------------------
// Intent -> proposal.
// ---------------------------------------------------------------------------

export function proposeSitePatch(spec: FYDSiteSpec, intent: SiteIntent): PatchResult {
  const page = spec.pages.find((p) => p.slug === intentPage(intent));
  if (!page && intent.kind !== "set_theme_token") {
    return { ok: false, error: "Page '" + intentPage(intent) + "' does not exist in this spec." };
  }

  switch (intent.kind) {
    case "set_theme_token": {
      const allowed: (keyof FYDThemeTokens)[] = [
        "accent",
        "accentForeground",
        "surface",
        "ink",
        "radius",
        "fontDisplay",
        "fontBody",
      ];
      if (!allowed.includes(intent.token)) {
        return { ok: false, error: "Token '" + String(intent.token) + "' is not customizable." };
      }
      if (typeof intent.value !== "string" || intent.value.trim() === "") {
        return { ok: false, error: "Theme token value must be a non-empty string." };
      }
      return build({
        targetPage: "",
        targetSection: "",
        component: "theme",
        propsDiff: { ["themeTokens." + intent.token]: intent.value.trim() },
        reason: "Proposed theme token change.",
      });
    }
    case "reorder_section": {
      const idx = page!.sections.findIndex((s) => s.id === intent.sectionId);
      if (idx === -1) return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      if (intent.toIndex < 0 || intent.toIndex >= page!.sections.length) {
        return { ok: false, error: "Target index " + intent.toIndex + " is out of range." };
      }
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: page!.sections[idx].component,
        propsDiff: { moveFrom: idx, moveTo: intent.toIndex },
        reason: "Reorder section within page.",
      });
    }
    case "move_above": {
      const idx = page!.sections.findIndex((s) => s.id === intent.sectionId);
      const anchorIdx = page!.sections.findIndex(
        (s) => s.id === intent.anchorSectionId,
      );
      if (idx === -1)
        return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      if (anchorIdx === -1)
        return {
          ok: false,
          error: "Anchor section '" + intent.anchorSectionId + "' not found.",
        };
      if (idx === anchorIdx)
        return { ok: false, error: "A section cannot move above itself." };
      // Absolute moveTo for the review card; the anchor is re-resolved at
      // apply time (see applySitePatch), so re-observation that reorders
      // sections cannot silently break the approved "above" relationship.
      const moveTo = idx < anchorIdx ? anchorIdx - 1 : anchorIdx;
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: page!.sections[idx].component,
        propsDiff: {
          moveFrom: idx,
          moveTo,
          anchorSectionId: intent.anchorSectionId,
          anchorComponent: page!.sections[anchorIdx].component,
        },
        reason: "Move section directly above the anchor section.",
      });
    }
    case "reorder_objects": {
      const sec = page!.sections.find((s) => s.id === intent.sectionId);
      if (!sec) return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      const ids = [...new Set(intent.objectIds)];
      if (ids.length === 0) {
        return { ok: false, error: "Object order needs at least one object id." };
      }
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: sec.component,
        propsDiff: { "presentation.objectOrder": ids },
        reason: "Reorder objects within the section (presentation only).",
      });
    }
    case "set_field_emphasis": {
      const sec = page!.sections.find((s) => s.id === intent.sectionId);
      if (!sec) return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      const field = intent.field.trim().toLowerCase();
      if (!field) return { ok: false, error: "Field name must be non-empty." };
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: sec.component,
        propsDiff: {
          "presentation.fieldEmphasis": intent.emphasized ? [field] : [],
          "presentation.fieldEmphasisMode": intent.emphasized ? "add" : "remove",
        },
        reason: intent.emphasized
          ? "Emphasize the " + field + " field (presentation only)."
          : "Remove emphasis from the " + field + " field.",
      });
    }
    case "set_hero_media": {
      const sec = page!.sections.find((s) => s.id === intent.sectionId);
      if (!sec) return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      if (!intent.objectId.trim()) {
        return { ok: false, error: "Hero media needs an object id." };
      }
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: sec.component,
        propsDiff: { "presentation.heroMediaObjectId": intent.objectId.trim() },
        reason: "Use the named object's photo as the hero (presentation only).",
      });
    }
    case "set_visual_intent": {
      const sec = page!.sections.find((s) => s.id === intent.sectionId);
      if (!sec) return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      const diff: Record<string, unknown> = {};
      if (intent.emphasis !== undefined) diff["composition.emphasis"] = intent.emphasis;
      if (intent.mediaTreatment !== undefined)
        diff["composition.mediaTreatment"] = { ...intent.mediaTreatment };
      if (Object.keys(diff).length === 0) {
        return { ok: false, error: "Visual intent needs an emphasis, a media treatment, or both." };
      }
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: sec.component,
        propsDiff: diff,
        reason: "Set section visual intent (presentation only).",
      });
    }
    case "toggle_section": {
      const sec = page!.sections.find((s) => s.id === intent.sectionId);
      if (!sec) return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: sec.component,
        propsDiff: { "presentation.hidden": intent.hidden },
        reason: intent.hidden ? "Hide section." : "Show section.",
      });
    }
    case "set_featured": {
      const sec = page!.sections.find((s) => s.id === intent.sectionId);
      if (!sec) return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      const ids = [...new Set(intent.objectIds)].sort();
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: sec.component,
        propsDiff: { "presentation.featuredIds": ids },
        reason: "Select featured objects for section.",
      });
    }
    case "edit_copy": {
      const sec = page!.sections.find((s) => s.id === intent.sectionId);
      if (!sec) return { ok: false, error: "Section '" + intent.sectionId + "' not found." };
      const diff: Record<string, unknown> = {};
      if (intent.heading !== undefined) diff["presentation.heading"] = intent.heading;
      if (intent.copy !== undefined) diff["presentation.copy"] = intent.copy;
      if (Object.keys(diff).length === 0) {
        return { ok: false, error: "Copy edit needs a heading, copy, or both." };
      }
      return build({
        targetPage: page!.slug,
        targetSection: intent.sectionId,
        component: sec.component,
        propsDiff: diff,
        reason: "Proposed presentation-copy edit. Draft only until the digest is approved.",
      });
    }
  }
}

function intentPage(intent: SiteIntent): string {
  return intent.kind === "set_theme_token" ? "" : intent.pageSlug;
}

function build(body: Omit<SitePatchBody, "kind" | "proposalDigest">): PatchResult {
  const withoutDigest = { kind: "site_patch" as const, ...body };
  return {
    ok: true,
    proposal: { ...withoutDigest, proposalDigest: proposalDigest(withoutDigest) },
  };
}

/**
 * Apply an approved proposal to a spec copy. Used by the structured editor
 * preview after the owner approves the exact digest. Pure: returns a new
 * spec, never mutates.
 */
export function applySitePatch(spec: FYDSiteSpec, proposal: SitePatchBody): FYDSiteSpec {
  const next: FYDSiteSpec = JSON.parse(JSON.stringify(spec));
  if (proposal.component === "theme") {
    const tokens = next.themeTokens as unknown as Record<string, unknown>;
    for (const [path, value] of Object.entries(proposal.propsDiff)) {
      const token = path.replace(/^themeTokens\./, "");
      tokens[token] = value;
    }
    return next;
  }
  const page = next.pages.find((p) => p.slug === proposal.targetPage);
  if (!page) return next;
  const idx = page.sections.findIndex((s) => s.id === proposal.targetSection);
  if (idx === -1) return next;
  const sec = page.sections[idx];
  const diff = proposal.propsDiff;
  if (typeof diff["moveTo"] === "number") {
    // Anchor-relative move ("move X above Y"): the anchor section is
    // re-resolved in the CURRENT page before moving, so a source
    // re-observation that reordered sections cannot silently break the
    // approved "directly above" relationship. Fallback order: stored
    // anchor id, then a unique component-name match. A missing anchor
    // fails closed (no move), never guesses.
    let moveTo = diff["moveTo"] as number;
    if (typeof diff["anchorSectionId"] === "string") {
      const anchorId = diff["anchorSectionId"] as string;
      let anchorIdx = page.sections.findIndex((s) => s.id === anchorId);
      if (anchorIdx === -1 && typeof diff["anchorComponent"] === "string") {
        const matches = page.sections.filter(
          (s) =>
            s.component.toLowerCase() ===
            (diff["anchorComponent"] as string).toLowerCase(),
        );
        if (matches.length === 1) {
          anchorIdx = page.sections.findIndex((s) => s.id === matches[0].id);
        }
      }
      if (anchorIdx === -1 || anchorIdx === idx) return next;
      moveTo = idx < anchorIdx ? anchorIdx - 1 : anchorIdx;
    }
    const [moved] = page.sections.splice(idx, 1);
    page.sections.splice(moveTo, 0, moved);
    // Section ids are deterministic: re-derive after a move.
    page.sections.forEach((s, i) => {
      s.id = page.slug + ":" + s.component + ":" + i;
    });
  }
  if (typeof diff["presentation.hidden"] === "boolean") {
    sec.presentation.hidden = diff["presentation.hidden"] as boolean;
  }
  if (Array.isArray(diff["presentation.featuredIds"])) {
    sec.presentation.featuredIds = diff["presentation.featuredIds"] as string[];
  }
  if (Array.isArray(diff["presentation.objectOrder"])) {
    sec.presentation.objectOrder = [
      ...new Set(diff["presentation.objectOrder"] as string[]),
    ];
  }
  if (Array.isArray(diff["presentation.fieldEmphasis"])) {
    const mode = diff["presentation.fieldEmphasisMode"];
    const incoming = [
      ...new Set(
        (diff["presentation.fieldEmphasis"] as unknown[]).map(String),
      ),
    ];
    const current = Array.isArray(sec.presentation.fieldEmphasis)
      ? [...sec.presentation.fieldEmphasis]
      : [];
    sec.presentation.fieldEmphasis =
      mode === "remove"
        ? current.filter((f) => !incoming.includes(f))
        : [...new Set([...current, ...incoming])];
  }
  if (typeof diff["presentation.heroMediaObjectId"] === "string") {
    sec.presentation.heroMediaObjectId = diff[
      "presentation.heroMediaObjectId"
    ] as string;
  }
  if (typeof diff["composition.emphasis"] === "string") {
    const e = diff["composition.emphasis"] as string;
    if (e === "quiet" || e === "balanced" || e === "prominent") {
      sec.composition = { ...(sec.composition ?? {}), emphasis: e };
    }
  }
  if (
    diff["composition.mediaTreatment"] !== null &&
    typeof diff["composition.mediaTreatment"] === "object" &&
    !Array.isArray(diff["composition.mediaTreatment"])
  ) {
    sec.composition = {
      ...(sec.composition ?? {}),
      mediaTreatment: {
        ...(sec.composition?.mediaTreatment ?? {}),
        ...(diff["composition.mediaTreatment"] as Record<string, unknown>),
      },
    };
  }
  if (typeof diff["presentation.heading"] === "string") {
    sec.presentation.heading = diff["presentation.heading"] as string;
  }
  if (typeof diff["presentation.copy"] === "string") {
    sec.presentation.copy = diff["presentation.copy"] as string;
  }
  return next;
}
