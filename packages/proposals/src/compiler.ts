/**
 * The mechanical patch compiler: PlannedIntent + SiteSpec (+ObjectGraph)
 * -> typed SiteSpecPatchOp[] with before/after preview.
 *
 * The "LLM plans" step is upstream: this module accepts the planned
 * intent as structured input and never calls an LLM, never guesses, and
 * never invents a target. Resolution is keyword-anchored and
 * deterministic; an unresolvable target is an honest refusal.
 *
 * Resolution order for a target name (mirrors the source
 * owner-command-compiler section/object resolution):
 *   1. a section whose component or heading matches the target, then
 *   2. an object in the graph whose title matches, resolved to the first
 *      section (spec order) that binds it.
 * move_section_to_top is a SECTION-order operation: naming an object
 * moves the section that contains it. Intra-section object ordering is
 * FYDPresentation.objectOrder, reachable via set_component_option.
 *
 * Software validates every drafted patch (validatePatch): each op must
 * target a real spec path, `before` must deep-equal the spec's current
 * value, and `after` must be schema-valid. proposePatch refuses to draft
 * an invalid patch.
 */

import { digestCanonical } from "../../trust/src/digest";
import { resolveQuery } from "../../sitespec/src/query";
import type {
  FYDSection,
  FYDSiteSpec,
  ObjectGraph,
} from "../../sitespec/src/types";
import type { PingObject } from "../../sitespec/src/ping-types";
import type {
  PlannedIntent,
  ProposalPreview,
  ProposeOutcome,
  PatchProposal,
  SiteSpecPatchOp,
} from "./types";
import { applyPatchToSpec } from "./apply";

/** Presentation option keys the compiler/validator accept. Extend only with justification. */
export const VALID_COMPONENT_OPTIONS = [
  "heading",
  "copy",
  "featuredIds",
  "objectOrder",
  "hiddenObjectIds",
] as const;

export type ValidComponentOption = (typeof VALID_COMPONENT_OPTIONS)[number];

function normalizeTarget(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[?!.,;:]+$/g, "")
    .trim();
}

function wordsOf(s: string): string[] {
  return s.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Name matching: the candidate contains the target, or every target word
 * appears in the candidate's words.
 *
 * Deliberately TIGHTER than the source Ask FYD serviceNameMatches (which
 * also matched when the TARGET contained the candidate): "quantum
 * plumbing" must not resolve to the "Plumbing" service. The compiler
 * never guesses; an unresolvable target is an honest refusal.
 */
function nameMatches(candidate: string, target: string): boolean {
  const c = normalizeTarget(candidate);
  const t = normalizeTarget(target);
  if (!c || !t) return false;
  if (c.includes(t)) return true;
  const cWords = new Set(wordsOf(c));
  const tWords = wordsOf(t);
  return tWords.length > 0 && tWords.every((w) => cWords.has(w));
}

/**
 * Owner vocabulary for sections: an owner says "team", the spec calls
 * the component "People". Aliases apply to the section-name match pass
 * only; object matching still uses the raw target. Keep this map tiny
 * and explicit: every entry is a documented owner-language mapping, not
 * a guess.
 */
const SECTION_ALIASES: Record<string, string> = {
  team: "people",
};

function sectionLabel(s: FYDSection): string {
  return s.presentation.heading ?? s.component;
}

interface ResolvedTarget {
  pageSlug: string;
  section: FYDSection;
  /** How the target resolved: direct section match or via a named object. */
  via: "section" | "object";
  objectId?: string;
}

/**
 * Resolve a target name to a section. Section match first (component or
 * heading), then object match (title) resolved to the first section in
 * spec order that binds the object through the real query seam.
 */
export function resolveTargetSection(
  spec: FYDSiteSpec,
  graph: ObjectGraph,
  target: string,
): ResolvedTarget | null {
  const aliased = SECTION_ALIASES[normalizeTarget(target)] ?? target;
  for (const page of spec.pages) {
    for (const s of page.sections) {
      if (
        nameMatches(s.component, aliased) ||
        (s.presentation.heading !== undefined &&
          nameMatches(s.presentation.heading, aliased))
      ) {
        return { pageSlug: page.slug, section: s, via: "section" };
      }
    }
  }
  const objects = graph.objects.filter(
    (o) => o.visibility === "public" && nameMatches(o.title, target),
  );
  // Deterministic: lowest object id wins, matching the generator's ordering.
  objects.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const o of objects) {
    for (const page of spec.pages) {
      for (const s of page.sections) {
        const ids = resolveQuery(s.query, graph, spec.ownerObjectId).map(
          (x) => x.id,
        );
        if (ids.includes(o.id)) {
          return { pageSlug: page.slug, section: s, via: "object", objectId: o.id };
        }
      }
    }
  }
  return null;
}

/** Deep equality for before/after validation (JSON values only). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    const ra = a as Record<string, unknown>;
    const rb = b as Record<string, unknown>;
    const ka = Object.keys(ra).sort();
    const kb = Object.keys(rb).sort();
    return (
      ka.length === kb.length &&
      ka.every((k, i) => k === kb[i] && deepEqual(ra[k], rb[k]))
    );
  }
  return false;
}

function findPage(spec: FYDSiteSpec, pageSlug: string) {
  return spec.pages.find((p) => p.slug === pageSlug) ?? null;
}

function findSection(spec: FYDSiteSpec, pageSlug: string, sectionId: string) {
  const page = findPage(spec, pageSlug);
  return page?.sections.find((s) => s.id === sectionId) ?? null;
}

/**
 * Validate a patch against the current spec. Returns the violation list;
 * empty means valid. Every op must target a real spec path, `before`
 * must match the spec's current value, and `after` must be schema-valid.
 */
export function validatePatch(
  spec: FYDSiteSpec,
  ops: SiteSpecPatchOp[],
  graph?: ObjectGraph,
): string[] {
  const violations: string[] = [];
  for (const op of ops) {
    const page = findPage(spec, op.pageSlug);
    if (!page) {
      violations.push(op.path + ": page '" + op.pageSlug + "' does not exist.");
      continue;
    }
    if (op.op === "reorder_section") {
      const current = page.sections.map((s) => s.id);
      if (!deepEqual(current, op.before)) {
        violations.push(
          op.path + ": before does not match the current section order; the proposal is stale.",
        );
      }
      const sortedBefore = [...op.before].sort();
      const sortedAfter = [...op.after].sort();
      if (!deepEqual(sortedBefore, sortedAfter)) {
        violations.push(
          op.path + ": after is not a permutation of before; sections may be reordered, never added or dropped by this op.",
        );
      }
      continue;
    }
    const section = findSection(spec, op.pageSlug, op.sectionId);
    if (!section) {
      violations.push(
        op.path + ": section '" + op.sectionId + "' does not exist on page '" + op.pageSlug + "'.",
      );
      continue;
    }
    if (op.op === "set_visibility") {
      const current = section.presentation.hidden === true;
      if (current !== op.before) {
        violations.push(
          op.path + ": before (" + String(op.before) + ") does not match the current visibility (" + String(current) + "); the proposal is stale.",
        );
      }
      if (typeof (op as { after: unknown }).after !== "boolean") {
        violations.push(op.path + ": after must be a boolean.");
      }
      continue;
    }
    // set_component_option
    if (!(VALID_COMPONENT_OPTIONS as readonly string[]).includes(op.option)) {
      violations.push(
        op.path + ": option '" + op.option + "' is not in the allowlisted component options (" +
          VALID_COMPONENT_OPTIONS.join(", ") + ").",
      );
      continue;
    }
    const current = (section.presentation as Record<string, unknown>)[op.option] ?? null;
    if (!deepEqual(current ?? null, op.before ?? null)) {
      violations.push(
        op.path + ": before does not match the current option value; the proposal is stale.",
      );
    }
    const problem = validateOptionValue(op.option, op.after, graph);
    if (problem) violations.push(op.path + ": " + problem);
  }
  return violations;
}

function validateOptionValue(
  option: string,
  after: unknown,
  graph?: ObjectGraph,
): string | null {
  switch (option) {
    case "heading":
    case "copy":
      return typeof after === "string" || after === null
        ? null
        : "after must be a string or null.";
    case "featuredIds":
    case "objectOrder":
    case "hiddenObjectIds": {
      if (!Array.isArray(after) || !after.every((x) => typeof x === "string")) {
        return "after must be a string array.";
      }
      if (new Set(after).size !== after.length) {
        return "after must not contain duplicate ids.";
      }
      if (graph) {
        const known = new Set(graph.objects.map((o) => o.id));
        const unknown = (after as string[]).filter((id) => !known.has(id));
        if (unknown.length > 0) {
          return "after references unknown object ids: " + unknown.join(", ") + ".";
        }
      }
      return null;
    }
    default:
      return "unknown option '" + option + "'.";
  }
}

function reorderPreview(
  pageSlug: string,
  page: { sections: FYDSection[] },
  after: string[],
): ProposalPreview {
  const byId = new Map(page.sections.map((s) => [s.id, s] as const));
  const labels = (ids: string[]) => ids.map((id) => sectionLabel(byId.get(id) as FYDSection)).join(" > ");
  return {
    title: "Reorder sections on '" + pageSlug + "'",
    before: ["Section order: " + labels(page.sections.map((s) => s.id))],
    after: ["Section order: " + labels(after)],
  };
}

function visibilityPreview(section: FYDSection, after: boolean): ProposalPreview {
  const label = sectionLabel(section);
  return {
    title: (after ? "Hide " : "Show ") + label,
    before: [label + " section: " + (section.presentation.hidden === true ? "hidden" : "visible")],
    after: [label + " section: " + (after ? "hidden" : "visible")],
  };
}

function draftProposal(
  commandText: string,
  intent: PlannedIntent,
  patch: SiteSpecPatchOp[],
  preview: ProposalPreview,
  spec: FYDSiteSpec,
): PatchProposal {
  const beforeDigest = digestCanonical(spec);
  const afterSpec = applyPatchToSpec(spec, patch);
  const afterDigest = digestCanonical(afterSpec);
  // The id seals the whole proposal body the owner reviews: command text,
  // planned intent, patch, the spec it was drafted against, AND the
  // human-readable preview card. A rewritten review card fails the
  // deterministic id check at approve and at apply.
  const id = proposalIdOf(commandText, intent, patch, beforeDigest, preview);
  return {
    id,
    commandText,
    intent,
    patch,
    beforeDigest,
    afterDigest,
    preview,
    status: "proposed",
  };
}

/**
 * Compile a planned intent into a typed, validated proposal. Nothing is
 * applied; the proposal carries before/after digests and a human-readable
 * preview for the approval step. Unresolvable targets and no-op intents
 * are honest refusals, never empty proposals.
 */
export function proposePatch(
  commandText: string,
  intent: PlannedIntent,
  spec: FYDSiteSpec,
  graph: ObjectGraph,
): ProposeOutcome {
  const target = intent.target.trim();
  if (!target) {
    return { ok: false, reason: "Empty target: nothing to resolve." };
  }
  const resolved = resolveTargetSection(spec, graph, target);
  if (!resolved) {
    return {
      ok: false,
      reason:
        'No section or object named "' + target + '" exists in this site, so there is nothing to change. Nothing was drafted or reinterpreted.',
    };
  }
  const { pageSlug, section } = resolved;
  const page = findPage(spec, pageSlug) as { sections: FYDSection[] };

  if (intent.kind === "move_section_to_top") {
    const before = page.sections.map((s) => s.id);
    if (before[0] === section.id) {
      const label = sectionLabel(section);
      return {
        ok: false,
        reason:
          'The "' + label + '" section is already first on "' + pageSlug + '", so there is nothing to change.',
      };
    }
    const after = [section.id, ...before.filter((id) => id !== section.id)];
    const viaNote =
      resolved.via === "object"
        ? ' ("' + target + '" is shown in the ' + sectionLabel(section) + " section)"
        : "";
    const op: SiteSpecPatchOp = {
      op: "reorder_section",
      path: "pages." + pageSlug + ".sections",
      pageSlug,
      before,
      after,
      rationale:
        "Owner request: move " + target + " to the top" + viaNote + ".",
    };
    const violations = validatePatch(spec, [op], graph);
    if (violations.length > 0) {
      return { ok: false, reason: "Drafted patch failed validation: " + violations.join(" ") };
    }
    return {
      ok: true,
      proposal: draftProposal(commandText, intent, [op], reorderPreview(pageSlug, page, after), spec),
    };
  }

  // hide_section / show_section
  const wantHidden = intent.kind === "hide_section";
  const currentlyHidden = section.presentation.hidden === true;
  if (currentlyHidden === wantHidden) {
    return {
      ok: false,
      reason:
        'The "' + sectionLabel(section) + '" section is already ' +
        (wantHidden ? "hidden" : "visible") + ", so there is nothing to change.",
    };
  }
  const op: SiteSpecPatchOp = {
    op: "set_visibility",
    path: "pages." + pageSlug + ".sections." + section.id + ".presentation.hidden",
    pageSlug,
    sectionId: section.id,
    before: currentlyHidden,
    after: wantHidden,
    rationale:
      "Owner request: " + (wantHidden ? "hide " : "show ") + target + ".",
  };
  const violations = validatePatch(spec, [op], graph);
  if (violations.length > 0) {
    return { ok: false, reason: "Drafted patch failed validation: " + violations.join(" ") };
  }
  return {
    ok: true,
    proposal: draftProposal(commandText, intent, [op], visibilityPreview(section, wantHidden), spec),
  };
}

/**
 * The deterministic proposal-id formulation: the seal covers the ENTIRE
 * proposal body the owner reviews (command text, planned intent, patch,
 * the spec it was drafted against, AND the human-readable preview card).
 * A rewritten preview card fails recomputedId at approve and at apply,
 * so the owner always authorizes what they were shown.
 * Single formulation: draftProposal seals with this; recomputedId
 * verifies with this. Never duplicate the digest inputs elsewhere.
 */
export function proposalIdOf(
  commandText: string,
  intent: PlannedIntent,
  patch: SiteSpecPatchOp[],
  specDigest: string,
  preview: ProposalPreview,
): string {
  return (
    "pp-" +
    digestCanonical({ commandText, intent, patch, specDigest, preview })
  );
}

export type { PingObject };
