/**
 * Lane D: typed intent parsing + resolution.
 *
 * Plain English -> ParsedIntent (typed, deterministic) -> ResolveResult
 * (grounded against the site's evidence, or an honest unresolved).
 *
 * Determinism: the parser is keyword-anchored regexes over normalized
 * text. Same normalized text always yields the same ParsedIntent and the
 * same intentDigest. There is no LLM, no fuzzy matching, no guessing.
 *
 * Supported this wave (anything else is UnsupportedIntent, never silently
 * reinterpreted):
 *   "make X the first thing people see" / "put X first" /
 *   "move X to the top" / "lead with X"   -> promote_first
 *   "feature X" / "highlight X" / "spotlight X" -> feature_object
 *   "hide (the) X (section)" / "show (the) X (section)" -> hide/show_section
 *
 * Resolution binds the named target to the spec. A target that names
 * nothing in the site's evidence resolves to UnresolvedIntent with the
 * reason spelled out. The pipeline never invents a target.
 */

import { sha256Hex } from "../proceduralize/sha256";
// resolveQuery's canonical home is sitespec/query (the renderer only
// re-exports it). Import it directly: this module must stay light enough
// for the survival-proof script to load without the React renderer.
import { resolveQuery } from "../sitespec/query";
import type { ObjectGraph, FYDSiteSpec } from "../sitespec/types";
import type {
  ParsedIntent,
  ParseResult,
  ResolveResult,
  UnsupportedIntent,
} from "./types";

const SUPPORTED_SUMMARY =
  "This wave supports: making a named section the first thing on the page, " +
  "moving a section or service directly above another, featuring a named " +
  "object, hiding/showing a named section, hiding/showing the street " +
  "address, phone, or email, making the phone more prominent, using a " +
  "project photo as the hero, and making the site more visual or more premium.";

/**
 * Field names the owner can address directly in plain English. These are
 * generic contact/location fields, never customer-specific. A hide/show
 * request whose cleaned target is exactly one of these keys resolves to
 * a field-visibility intent (VISIBILITY layer); anything else stays a
 * section intent.
 */
const FIELD_WORDS: Record<string, string> = {
  "street address": "address",
  address: "address",
  "phone number": "phone",
  phone: "phone",
  "email address": "email",
  email: "email",
};

/** Fields the owner can ask to emphasize (presentation only). */
const EMPHASIS_FIELDS: Record<string, string> = {
  phone: "phone",
  "phone number": "phone",
  email: "email",
  "email address": "email",
};

/** Trailing media words stripped when resolving "use X as the hero". */
const MEDIA_WORDS = new Set(["photo", "photos", "picture", "pictures", "image", "images", "pic", "pics"]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[?!.,;:]+$/g, "")
    .trim();
}

function cleanTarget(raw: string): string {
  return raw
    .replace(/\b(my|the|our|this|that|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[?!.,;:]+$/g, "")
    .trim();
}

type Matcher = {
  re: RegExp;
  build: (target: string) => ParsedIntent;
  /** True when the matcher carries no target capture (mood-only). */
  targetless?: boolean;
  /** True when the matcher carries two captures: target then anchor. */
  anchored?: boolean;
};

const MATCHERS: Matcher[] = [
  {
    re: /\bmove\b\s+(.+?)\s+\babove\b\s+(.+)/,
    build: (_t) => ({ kind: "move_above", target: "", anchor: "" }),
    anchored: true,
  },
  {
    re: /\bmake\b\s+(.+?)\s+\bthe first thing\b/,
    build: (t) => ({ kind: "promote_first", target: t }),
  },
  { re: /\bput\b\s+(.+?)\s+\bfirst\b/, build: (t) => ({ kind: "promote_first", target: t }) },
  {
    re: /\bmove\b\s+(.+?)\s+\bto the top\b/,
    build: (t) => ({ kind: "promote_first", target: t }),
  },
  { re: /\blead with\b\s+(.+)/, build: (t) => ({ kind: "promote_first", target: t }) },
  {
    re: /\bmake\b\s+(.+?)\s+\bmore prominent\b/,
    build: (t) => ({ kind: "emphasize_field", target: t }),
  },
  {
    re: /\buse\b\s+(.+?)\s+as (?:the )?hero\b/,
    build: (t) => ({ kind: "set_hero_media", target: t }),
  },
  {
    re: /\bmore\s+visual\b/,
    build: (_t) => ({ kind: "visual_intent", mood: "more_visual" }),
    targetless: true,
  },
  {
    re: /\bmore\s+premium\b|\bfeel\s+more\s+premium\b/,
    build: (_t) => ({ kind: "visual_intent", mood: "more_premium" }),
    targetless: true,
  },
  { re: /\bfeature\b\s+(.+)/, build: (t) => ({ kind: "feature_object", target: t }) },
  { re: /\bhighlight\b\s+(.+)/, build: (t) => ({ kind: "feature_object", target: t }) },
  { re: /\bspotlight\b\s+(.+)/, build: (t) => ({ kind: "feature_object", target: t }) },
  // "Show email only to FYD members": a members-scoped visibility policy.
  // Must precede the generic show matcher, which would otherwise swallow
  // the trailing qualifier into the target.
  {
    re: /\bshow\b\s+(?:the\s+)?(.+?)\s+(?:only\s+)?(?:to\s+)?(?:fyd\s+)?members$/,
    build: (t) => ({ kind: "show_field", target: t, policy: "members" }),
  },
  {
    re: /\bhide\b\s+(?:the\s+)?(.+?)(?:\s+section)?$/,
    build: (t) => ({ kind: "hide_section", target: t }),
  },
  {
    re: /\bshow\b\s+(?:the\s+)?(.+?)(?:\s+section)?$/,
    build: (t) => ({ kind: "show_section", target: t }),
  },
];

/**
 * Post-process a matched hide/show: when the cleaned target is exactly a
 * known field word, the request addresses the VISIBILITY layer (a field),
 * not a section. Deterministic and generic: no per-customer knowledge.
 */
function classifyFieldIntent(intent: ParsedIntent): ParsedIntent {
  if (intent.kind === "hide_section" || intent.kind === "show_section") {
    if (FIELD_WORDS[intent.target] !== undefined) {
      return {
        kind: intent.kind === "hide_section" ? "hide_field" : "show_field",
        target: intent.target,
      };
    }
  }
  return intent;
}

/**
 * Split a compound request ("A and B", "A then B", "A; B") into segments.
 * Each segment must parse on its own; the split is on the literal
 * conjunctions only, never inside a target phrase this wave supports.
 */
const SEGMENT_SPLIT = /\s+(?:and|then)\s+|;\s*/;

export interface MultiParseOk {
  ok: true;
  intents: { intent: ParsedIntent; intentDigest: string }[];
}

export interface MultiParseFail {
  ok: false;
  unsupported: UnsupportedIntent;
  /** Which segment failed (0-based). */
  segmentIndex: number;
  segmentText: string;
}

export type MultiParseResult = MultiParseOk | MultiParseFail;

/**
 * Parse one segment (no compound splitting). Shared by the single and
 * compound entry points so both agree on what parses.
 */
function parseOneSegment(segment: string): ParseResult {
  const normalized = normalizeText(segment);
  if (!normalized) {
    const u: UnsupportedIntent = {
      unsupported: true,
      reason: "Empty request. " + SUPPORTED_SUMMARY,
      normalizedText: normalized,
    };
    return u;
  }
  for (const m of MATCHERS) {
    const hit = normalized.match(m.re);
    if (hit) {
      let intent: ParsedIntent;
      if (m.anchored) {
        const target = cleanTarget(hit[1] ?? "");
        const anchor = cleanTarget(hit[2] ?? "");
        if (!target || !anchor) continue;
        intent = { kind: "move_above", target, anchor };
      } else if (m.targetless) {
        intent = m.build("");
      } else {
        const target = cleanTarget(hit[1] ?? "");
        if (!target) continue;
        intent = m.build(target);
      }
      const classified = classifyFieldIntent(intent);
      // The digest must cover the classified intent actually returned, not
      // the pre-classification draft: approval binds to this digest.
      return { intent: classified, intentDigest: intentDigest(classified) };
    }
  }
  const u: UnsupportedIntent = {
    unsupported: true,
    reason:
      "I do not support \"" +
      segment.trim().slice(0, 120) +
      "\" as a customization. " +
      SUPPORTED_SUMMARY,
    normalizedText: normalized,
  };
  return u;
}

function canonicalizeIntent(intent: ParsedIntent): string {
  // The whole typed intent is the canonical form: same normalized text
  // always yields the same object, so the digest is stable per request.
  return JSON.stringify(intent);
}

export function intentDigest(intent: ParsedIntent): string {
  return sha256Hex(canonicalizeIntent(intent));
}

/**
 * Parse plain English into a typed intent. Returns UnsupportedIntent when
 * the text is not a supported customization -- with the reason naming
 * what is supported, never a guess at what was meant.
 */
export function parseCustomizationIntent(text: string): ParseResult {
  return parseOneSegment(text);
}

/**
 * Parse a possibly-compound request ("A and B", "A then B", "A; B")
 * into an ordered list of typed intents. Fail-closed: when ANY segment
 * is unsupported, the whole request is refused with the failing segment
 * named -- the owner reviews exactly what will be applied, never a
 * silent partial application.
 */
export function parseCustomizationIntents(text: string): MultiParseResult {
  const segments = text
    .split(SEGMENT_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (segments.length === 0) {
    return {
      ok: false,
      unsupported: {
        unsupported: true,
        reason: "Empty request. " + SUPPORTED_SUMMARY,
        normalizedText: "",
      },
      segmentIndex: 0,
      segmentText: "",
    };
  }
  const intents: { intent: ParsedIntent; intentDigest: string }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const r = parseOneSegment(segments[i]);
    if ("unsupported" in r && r.unsupported === true) {
      return {
        ok: false,
        unsupported: r,
        segmentIndex: i,
        segmentText: segments[i],
      };
    }
    intents.push(r as { intent: ParsedIntent; intentDigest: string });
  }
  return { ok: true, intents };
}

// ---------------------------------------------------------------------------
// Resolution against the site's evidence.
// ---------------------------------------------------------------------------

interface SectionHit {
  pageSlug: string;
  sectionId: string;
  component: string;
}

function findSection(spec: FYDSiteSpec, target: string): SectionHit | null {
  const t = target.replace(/\s+section$/, "").trim();
  if (!t) return null;
  for (const page of spec.pages) {
    for (const s of page.sections) {
      const component = s.component.toLowerCase();
      const heading = (s.presentation.heading ?? "").toLowerCase();
      if (component === t || heading === t || s.id.toLowerCase() === t) {
        return { pageSlug: page.slug, sectionId: s.id, component: s.component };
      }
    }
  }
  return null;
}

function targetWordsMatch(title: string, target: string): boolean {
  const t = title.toLowerCase();
  if (!t || !target) return false;
  if (t.includes(target) || target.includes(t)) return true;
  const tWords = new Set(t.split(/\s+/));
  const words = target.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => tWords.has(w));
}

function findObject(graph: ObjectGraph, target: string): { id: string; title: string } | null {
  const cands = graph.objects
    .filter((o) => o.title && targetWordsMatch(o.title, target))
    .sort((a, b) => {
      // An exact title match beats a partial one: "emergency plumbing"
      // must name "Emergency Plumbing", not merely "Plumbing".
      const aExact = a.title.toLowerCase() === target ? 0 : 1;
      const bExact = b.title.toLowerCase() === target ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.title.length - b.title.length;
    });
  return cands.length > 0 ? { id: cands[0].id, title: cands[0].title } : null;
}

/** First section (in spec order) whose resolved objects include objectId. */
function sectionContaining(
  spec: FYDSiteSpec,
  graph: ObjectGraph,
  objectId: string,
): SectionHit | null {
  for (const page of spec.pages) {
    for (const s of page.sections) {
      const ids = resolveQuery(s.query, graph, spec.ownerObjectId).map((o) => o.id);
      if (ids.includes(objectId)) {
        return { pageSlug: page.slug, sectionId: s.id, component: s.component };
      }
    }
  }
  return null;
}

/** The home page's Hero section, the site's visual anchor. */
function findHeroSection(spec: FYDSiteSpec): SectionHit | null {
  const home = spec.pages.find((p) => p.slug === "home");
  const s = home?.sections.find((x) => x.component === "Hero");
  return s && home
    ? { pageSlug: home.slug, sectionId: s.id, component: s.component }
    : null;
}

/** The section that renders a named contact field, Contact preferred. */
function findFieldSection(
  spec: FYDSiteSpec,
  _field: string,
): SectionHit | null {
  const home = spec.pages.find((p) => p.slug === "home");
  if (!home) return null;
  const contact = home.sections.find((x) => x.component === "Contact");
  if (contact)
    return { pageSlug: home.slug, sectionId: contact.id, component: contact.component };
  const hero = home.sections.find((x) => x.component === "Hero");
  if (hero)
    return { pageSlug: home.slug, sectionId: hero.id, component: hero.component };
  return null;
}

/**
 * Resolve "use this project photo as the hero": strip media words, then
 * match the remainder against project-ish objects. Exactly one match
 * resolves; zero or several are honest unresolved (never a guess).
 */
const DEICTIC_WORDS = new Set([
  "this",
  "that",
  "these",
  "those",
  "the",
  "my",
  // Kind words, not names: "this project photo" names no project, so they
  // strip like media words. A real name ("riverside") survives the strip.
  "project",
  "projects",
]);

function findProjectObject(
  graph: ObjectGraph,
  target: string,
): { id: string; title: string } | { ambiguous: string[] } | null {
  const base = target
    .split(/\s+/)
    .filter((w) => !MEDIA_WORDS.has(w))
    .join(" ")
    .trim();
  const name = base
    .split(/\s+/)
    .filter((w) => !DEICTIC_WORDS.has(w))
    .join(" ")
    .trim();
  if (!name) {
    // Deictic "this project photo": resolvable only when the graph holds
    // exactly one project object. Zero or several is an honest unresolved
    // (never a guess at which photo the owner meant).
    const projects = graph.objects.filter(
      (o) => o.schema === "ping.social.project@1",
    );
    if (projects.length === 1)
      return { id: projects[0].id, title: projects[0].title };
    return null;
  }
  const cands = graph.objects.filter(
    (o) =>
      o.title &&
      (targetWordsMatch(o.title, name) || targetWordsMatch(o.title, target)),
  );
  if (cands.length === 1) return { id: cands[0].id, title: cands[0].title };
  if (cands.length > 1)
    return { ambiguous: cands.map((c) => c.title).slice(0, 5) };
  return null;
}

/** The owner business object the visibility decision attaches to. */
function ownerBusinessObject(
  spec: FYDSiteSpec,
  graph: ObjectGraph,
): { id: string; title: string; fields: Record<string, unknown> } | null {
  const o = graph.objects.find((x) => x.id === spec.ownerObjectId);
  if (!o) return null;
  return {
    id: o.id,
    title: o.title,
    fields: (o.fields ?? {}) as Record<string, unknown>,
  };
}

/**
 * Find the street-level address field on an object's fields record.
 * Prefers an exact "address", then "street_address"/"streetaddress".
 * Locality/region/country fields are NOT street-level: "hide my street
 * address" must not hide the city. Null when no street-level field exists.
 */
function findStreetAddressField(
  fields: Record<string, unknown>,
): string | null {
  const names = Object.keys(fields);
  if (names.includes("address")) return "address";
  const hit = names.find(
    (n) => n === "street_address" || n === "streetaddress",
  );
  return hit ?? null;
}

/**
 * Ground a parsed intent against the site's evidence. A target that names
 * nothing real resolves to UnresolvedIntent -- an honest, typed failure,
 * never a reinterpretation.
 */
export function resolveCustomizationIntent(
  spec: FYDSiteSpec,
  graph: ObjectGraph,
  parsed: ParsedIntent,
): ResolveResult {
  switch (parsed.kind) {
    case "promote_first": {
      // Object-level first: a target that names an object moves that object
      // to the front of its section's display order (presentation only).
      // "Put HVAC first" must become object order, not whole-section
      // movement: the owner named the service, not the Services section.
      const obj = findObject(graph, parsed.target);
      if (obj) {
        const containing = sectionContaining(spec, graph, obj.id);
        if (!containing) {
          return {
            resolved: false,
            parsed,
            reason:
              "\"" + obj.title + "\" exists but is not shown in any section " +
              "of this site, so there is nothing to promote.",
          };
        }
        const section = spec.pages
          .find((p) => p.slug === containing.pageSlug)!
          .sections.find((s) => s.id === containing.sectionId)!;
        const current = resolveQuery(
          section.query,
          graph,
          spec.ownerObjectId,
        ).map((o) => o.id);
        const at = current.indexOf(obj.id);
        if (at === -1) {
          return {
            resolved: false,
            parsed,
            reason:
              "\"" + obj.title + "\" is not rendered in the " +
              containing.component + " section right now, so there is " +
              "nothing to promote.",
          };
        }
        const next =
          at === 0
            ? current
            : [obj.id, ...current.filter((id) => id !== obj.id)];
        return {
          resolved: true,
          parsed,
          siteIntent: {
            kind: "reorder_objects",
            pageSlug: containing.pageSlug,
            sectionId: containing.sectionId,
            objectIds: next,
          },
          resolutionNote:
            "\"" + parsed.target + "\" is the object \"" + obj.title +
            "\"; moving it to the front of the " + containing.component +
            " section's display order (presentation only; the graph is " +
            "untouched)." +
            (at === 0 ? " It is already first, so the order is unchanged." : ""),
        };
      }
      const sec = findSection(spec, parsed.target);
      if (sec) {
        return {
          resolved: true,
          parsed,
          siteIntent: {
            kind: "reorder_section",
            pageSlug: sec.pageSlug,
            sectionId: sec.sectionId,
            toIndex: 0,
          },
          resolutionNote:
            "\"" + parsed.target + "\" names the " + sec.component +
            " section; promoting it to the top of the page.",
        };
      }
      return {
        resolved: false,
        parsed,
        reason:
          "No section or object named \"" + parsed.target + "\" exists in " +
          "this site's evidence, so there is nothing to promote. Name a " +
          "section that exists (for example \"services\").",
      };
    }
    case "move_above": {
      // Object-level first: both names hit objects rendered inside the SAME
      // section -> reorder the objects within that section (presentation
      // only). This must precede the section fallback, otherwise "Move
      // HVAC above plumbing" dies at "same section; nothing to move" even
      // though the owner named two distinct services.
      const objT = findObject(graph, parsed.target);
      const objA = findObject(graph, parsed.anchor);
      if (objT && objA) {
        const cT = sectionContaining(spec, graph, objT.id);
        const cA = sectionContaining(spec, graph, objA.id);
        if (
          cT && cA &&
          cT.pageSlug === cA.pageSlug &&
          cT.sectionId === cA.sectionId
        ) {
          const section = spec.pages
            .find((p) => p.slug === cT.pageSlug)!
            .sections.find((s) => s.id === cT.sectionId)!;
          const current = resolveQuery(
            section.query,
            graph,
            spec.ownerObjectId,
          ).map((o) => o.id);
          const from = current.indexOf(objT.id);
          const anchorAt = current.indexOf(objA.id);
          if (from === -1 || anchorAt === -1) {
            return {
              resolved: false,
              parsed,
              reason:
                "The named objects are not both rendered in the " +
                cT.component + " section right now.",
            };
          }
          const next = current.filter((id) => id !== objT.id);
          const at = next.indexOf(objA.id);
          next.splice(at, 0, objT.id);
          return {
            resolved: true,
            parsed,
            siteIntent: {
              kind: "reorder_objects",
              pageSlug: cT.pageSlug,
              sectionId: cT.sectionId,
              objectIds: next,
            },
            resolutionNote:
              "\"" + parsed.target + "\" is \"" + objT.title + "\" and \"" +
              parsed.anchor + "\" is \"" + objA.title + "\"; both are shown " +
              "in the " + cT.component + " section, so \"" + objT.title +
              "\" moves directly above \"" + objA.title + "\" in that " +
              "section's display order (presentation only; the graph is " +
              "untouched).",
          };
        }
        // Both names hit objects but they are not rendered in the same
        // section: moving one above the other would mean moving whole
        // sections, which the owner did not ask for. Honest unresolved.
        return {
          resolved: false,
          parsed,
          reason:
            "\"" + objT.title + "\" and \"" + objA.title + "\" are not " +
            "shown in the same section, so one cannot move above the other.",
        };
      }
      // Section-level: each side names a section directly, or resolves to
      // its containing section via a named object.
      let secT = findSection(spec, parsed.target);
      let secA = findSection(spec, parsed.anchor);
      if (!secT && objT) secT = sectionContaining(spec, graph, objT.id);
      if (!secA && objA) secA = sectionContaining(spec, graph, objA.id);
      if (secT && secA) {
        if (secT.pageSlug !== secA.pageSlug) {
          return {
            resolved: false,
            parsed,
            reason:
              "\"" + parsed.target + "\" and \"" + parsed.anchor + "\" are " +
              "on different pages, so one cannot move above the other.",
          };
        }
        if (secT.sectionId === secA.sectionId) {
          return {
            resolved: false,
            parsed,
            reason:
              "\"" + parsed.target + "\" and \"" + parsed.anchor + "\" " +
              "name the same section; there is nothing to move.",
          };
        }
        return {
          resolved: true,
          parsed,
          siteIntent: {
            kind: "move_above",
            pageSlug: secT.pageSlug,
            sectionId: secT.sectionId,
            anchorSectionId: secA.sectionId,
          },
          resolutionNote:
            "\"" + parsed.target + "\" names the " + secT.component +
            " section and \"" + parsed.anchor + "\" names the " +
            secA.component + " section; moving it directly above.",
        };
      }
      return {
        resolved: false,
        parsed,
        reason:
          "No section or object pair named \"" + parsed.target + "\" / \"" +
          parsed.anchor + "\" exists in this site's evidence.",
      };
    }
    case "emphasize_field": {
      const field = EMPHASIS_FIELDS[parsed.target];
      if (!field) {
        return {
          resolved: false,
          parsed,
          reason:
            "I can make the phone or email more prominent; \"" +
            parsed.target + "\" is not a supported field.",
        };
      }
      const sec = findFieldSection(spec, field);
      if (!sec) {
        return {
          resolved: false,
          parsed,
          reason:
            "This site has no Contact or Hero section rendering the " +
            field + ", so there is nothing to emphasize.",
        };
      }
      return {
        resolved: true,
        parsed,
        siteIntent: {
          kind: "set_field_emphasis",
          pageSlug: sec.pageSlug,
          sectionId: sec.sectionId,
          field,
          emphasized: true,
        },
        resolutionNote:
          "Emphasizing the " + field + " in the " + sec.component +
          " section (presentation only; the phone number itself still " +
          "comes from the graph).",
      };
    }
    case "set_hero_media": {
      const hero = findHeroSection(spec);
      if (!hero) {
        return {
          resolved: false,
          parsed,
          reason: "This site has no Hero section, so there is no hero to set.",
        };
      }
      const found = findProjectObject(graph, parsed.target);
      if (!found || "ambiguous" in found) {
        const named = parsed.target
          .split(/\s+/)
          .filter((w) => !MEDIA_WORDS.has(w) && !DEICTIC_WORDS.has(w))
          .join(" ")
          .trim();
        return {
          resolved: false,
          parsed,
          reason:
            found && "ambiguous" in found
              ? "More than one object matches \"" + parsed.target + "\" (" +
                found.ambiguous.join("; ") + "). Name the project."
              : named
                ? "No project or photo named \"" + parsed.target +
                  "\" exists in this site's evidence, so there is no photo " +
                  "to use as the hero."
                : "I need to know which project photo you mean: this site " +
                  "has no single project to point \"this\" at. Name the " +
                  "project (for example \"use the Riverside repipe photo " +
                  "as the hero\").",
        };
      }
      return {
        resolved: true,
        parsed,
        siteIntent: {
          kind: "set_hero_media",
          pageSlug: hero.pageSlug,
          sectionId: hero.sectionId,
          objectId: found.id,
        },
        resolutionNote:
          "\"" + parsed.target + "\" is \"" + found.title + "\"; its photo " +
          "becomes the hero image (presentation only; the media lane " +
          "still resolves the actual asset).",
      };
    }
    case "hide_field":
    case "show_field": {
      const field = FIELD_WORDS[parsed.target];
      if (!field) {
        return {
          resolved: false,
          parsed,
          reason:
            "I can hide or show the street address, phone, or email; \"" +
            parsed.target + "\" is not a supported field.",
        };
      }
      const owner = ownerBusinessObject(spec, graph);
      if (!owner) {
        return {
          resolved: false,
          parsed,
          reason: "This site has no owner business object in its evidence.",
        };
      }
      // "Street address" means the street-level field, not the locality:
      // prefer an exact "address"/"street_address" field on the owner
      // object. Discovery records the value; this layer only decides who
      // sees it.
      const fieldName =
        field === "address" ? findStreetAddressField(owner.fields) ?? field : field;
      const value = owner.fields[fieldName];
      const present =
        value !== undefined &&
        value !== null &&
        (typeof value !== "string" || value.trim() !== "") &&
        (!Array.isArray(value) || value.length > 0);
      if (!present) {
        return {
          resolved: false,
          parsed,
          reason:
            "No " + parsed.target + " is in this site's evidence for \"" +
            owner.title + "\", so there is nothing to " +
            (parsed.kind === "hide_field" ? "hide" : "show") + ".",
        };
      }
      const policy =
        parsed.policy ?? (parsed.kind === "hide_field" ? "hide" : "show");
      const policyWord =
        policy === "hide"
          ? "hidden"
          : policy === "members"
            ? "visible to FYD members only"
            : policy === "coarse"
              ? "coarsened"
              : "shown";
      return {
        resolved: true,
        parsed,
        visibility: {
          objectId: owner.id,
          field: fieldName,
          policy,
        },
        resolutionNote:
          "Visibility policy for the " + fieldName + " field of \"" +
          owner.title + "\": " + policyWord +
          ". The fact stays in the graph; only the rendered projection " +
          "changes, per viewer context.",
      };
    }
    case "visual_intent": {
      const hero = findHeroSection(spec);
      if (!hero) {
        return {
          resolved: false,
          parsed,
          reason: "This site has no Hero section to restyle.",
        };
      }
      const treatment =
        parsed.mood === "more_visual" ? "documentary" : "polished";
      return {
        resolved: true,
        parsed,
        siteIntent: {
          kind: "set_visual_intent",
          pageSlug: hero.pageSlug,
          sectionId: hero.sectionId,
          emphasis: "prominent",
          mediaTreatment: { treatment },
        },
        resolutionNote:
          (parsed.mood === "more_visual"
            ? "Making the site more visual"
            : "Making the site feel more premium") +
          ": the Hero section (the site's visual anchor) gets prominent " +
          "object emphasis and a " + treatment + " media treatment " +
          "(presentation only; facts and theme tokens untouched).",
      };
    }
    case "feature_object": {
      const obj = findObject(graph, parsed.target);
      if (!obj) {
        return {
          resolved: false,
          parsed,
          reason:
            "No object named \"" + parsed.target + "\" exists in this " +
            "site's evidence, so there is nothing to feature.",
        };
      }
      const sec = sectionContaining(spec, graph, obj.id);
      if (!sec) {
        return {
          resolved: false,
          parsed,
          reason:
            "\"" + obj.title + "\" exists but is not shown in any section " +
            "of this site, so it cannot be featured.",
        };
      }
      const section = spec.pages
        .find((p) => p.slug === sec.pageSlug)!
        .sections.find((s) => s.id === sec.sectionId)!;
      const before: string[] = Array.isArray(section.presentation.featuredIds)
        ? [...section.presentation.featuredIds]
        : [];
      const objectIds = [obj.id, ...before.filter((id) => id !== obj.id)];
      return {
        resolved: true,
        parsed,
        siteIntent: {
          kind: "set_featured",
          pageSlug: sec.pageSlug,
          sectionId: sec.sectionId,
          objectIds,
        },
        resolutionNote:
          "\"" + parsed.target + "\" is \"" + obj.title + "\"; featuring it " +
          "in the " + sec.component + " section.",
      };
    }
    case "hide_section":
    case "show_section": {
      const sec = findSection(spec, parsed.target);
      if (!sec) {
        return {
          resolved: false,
          parsed,
          reason:
            "No section named \"" + parsed.target + "\" exists in this " +
            "site's evidence, so there is nothing to " +
            (parsed.kind === "hide_section" ? "hide" : "show") + ".",
        };
      }
      return {
        resolved: true,
        parsed,
        siteIntent: {
          kind: "toggle_section",
          pageSlug: sec.pageSlug,
          sectionId: sec.sectionId,
          hidden: parsed.kind === "hide_section",
        },
        resolutionNote:
          "\"" + parsed.target + "\" names the " + sec.component + " section.",
      };
    }
  }
}
