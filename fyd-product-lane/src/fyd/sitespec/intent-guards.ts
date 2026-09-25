/**
 * Intent-only guards for the V1 SiteSpec extensions.
 *
 * Hard law (rebuild authorization): nothing in a SiteSpec is a Tailwind
 * class string, raw JSX, arbitrary CSS, or generated executable code.
 * These scanners walk the NEW intent-only sections (composition,
 * ctaHierarchy, designTokens, sourceDesignSignal, headlineIntent,
 * responsive intent, media treatment) and report violations as findings.
 *
 * Scope note: the scanners run on the new intent-only fields, not on
 * pre-existing prose (FYDPresentation.copy etc.), so legacy specs keep
 * validating exactly as before. Raw hex is rejected in designTokens
 * (token-model 8.5: never raw hex in overrides) but ALLOWED inside
 * sourceDesignSignal.observations.brandColorHints, which is evidence of
 * what was observed on the source site, not design authority.
 */

import type {
  FYDFinding,
  FYDSiteSpec,
  FYDSection,
  FYDDesignTokenRef,
  V1FamilyComponent,
  V1MediaRole,
} from "./types";
import {
  isV1FamilyComponent,
  isKnownThemeId,
  V1_COMPONENT_VARIANTS,
  V1_MEDIA_ROLES,
} from "./types";

/** Authority string for validator findings from this module. */
const AUTHORITY = "fyd.sitespec.validator";

function err(resourceId: string, path: string, message: string): FYDFinding {
  return { severity: "error", authority: AUTHORITY, resourceId, path, message };
}

function warn(resourceId: string, path: string, message: string): FYDFinding {
  return { severity: "warning", authority: AUTHORITY, resourceId, path, message };
}

// ---------------------------------------------------------------------------
// Patterns. Conservative: each one names a construct that has no
// legitimate place in an intent-only field.
// ---------------------------------------------------------------------------

/** An HTML/JSX tag: <div>, </span>, <br/>, <CTA prop="x">. */
const JSX_TAG = /<[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/;
/** class= or className= attribute: someone smuggling a class list. */
const CLASS_ATTR = /\bclass(Name)?\s*=/i;
/** style= attribute: inline CSS. */
const STYLE_ATTR = /\bstyle\s*=/i;
/** <script> or <style> blocks: executable code or raw CSS. */
const SCRIPT_TAG = /<\s*(script|style)[\s>]/i;
/** Inline event handlers: onClick= etc. */
const EVENT_HANDLER = /\bon(click|dblclick|change|submit|load|error|mouseover|focus|blur)\s*=/i;
/** A brace block containing a CSS declaration (property: value;). */
const CSS_BLOCK = /\{[^}{]*[a-z-]{3,}\s*:[^}{]*;\s*[^}{]*\}/;
/** A bare CSS declaration: color: red; / display: flex (anchored at start, ; or {). */
const CSS_DECL =
  /(^|[;{])\s*(color|background(-color)?|margin(-(top|right|bottom|left))?|padding(-(top|right|bottom|left))?|display|position|width|height|min-width|max-width|min-height|max-height|font-size|line-height|letter-spacing|border(-(width|style|color|radius|top|right|bottom|left))?|border-radius|box-shadow|outline|gap|z-index|opacity|transform|transition(-(property|duration|timing-function))?|flex(-(direction|wrap|grow|shrink|basis))?|grid(-(template|gap|area))?|align-(items|content|self)|justify-(content|items|self))\s*:[^;{}]+;?/im;
/** !important: always CSS. */
const IMPORTANT = /!important/i;
/** Raw hex color: #fff, #ffffff, #ffffffff. */
const RAW_HEX = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/;
/** Executable code fragments. */
const CODE_FRAGMENTS = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /=>\s*\{/,
  /\$\{/,
  /\brequire\s*\(/,
  /\bimport\s*\(/,
  /`[^`]*`/,
];
/** data: URLs: bytes smuggled as a string (media bindings must be references). */
const DATA_URL = /^\s*data:/i;

// Tailwind/utility class detection. A token is utility-like when it has a
// utility prefix (bg-, text-lg, px-4), a variant prefix (hover:, md:), an
// arbitrary value (bg-[#254240], w-[320px]), or is a bare layout keyword
// (flex, grid, hidden, uppercase, sticky). Ambiguous bare words (font,
// size, text, content) are NOT matched bare, so prose like "base font
// size 17px" does not trip the guard.
const UTILITY_PREFIX =
  /^(?:bg|text|border|ring|divide|placeholder|accent|shadow|outline|items|justify|gap|space|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|min-w|min-h|max-w|max-h|rounded|tracking|leading|opacity|cursor|overflow|inset|z|order|grow|shrink|basis|col|row|aspect|object|duration|ease|size|font|decoration|underline|line-through|whitespace|break|align|float|clear|table|caption|list|caret|scroll|snap|touch|select|resize|appearance)-/;
const UTILITY_VARIANT =
  /^(?:hover|focus|focus-visible|focus-within|active|visited|target|disabled|enabled|checked|sm|md|lg|xl|2xl|dark|motion-safe|motion-reduce|contrast-more|supports|aria|data|group|peer|has|not)-/;
const UTILITY_BARE =
  /^(?:flex|grid|block|inline-flex|inline-block|hidden|uppercase|lowercase|capitalize|sticky|fixed|absolute|relative|static|truncate|invisible|visible|isolate|contents)$/;
const ARBITRARY_VALUE = /\[[^\[\]]+\]/;

function isUtilityToken(token: string): boolean {
  return (
    UTILITY_PREFIX.test(token) ||
    UTILITY_VARIANT.test(token) ||
    UTILITY_BARE.test(token) ||
    ARBITRARY_VALUE.test(token)
  );
}

/**
 * True when the string looks like a space-separated utility class list:
 * one variant/arbitrary token is damning on its own; otherwise >=2
 * whitespace-separated tokens, >=60% utility-like, and no sentence
 * punctuation (prose has punctuation; class lists do not).
 */
export function looksLikeClassList(value: string): boolean {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.some((t) => UTILITY_VARIANT.test(t) || ARBITRARY_VALUE.test(t))) return true;
  if (tokens.length >= 2 && !/[.,!?;:](\s|$)/.test(value)) {
    const hits = tokens.filter(isUtilityToken).length;
    return hits >= 2 && hits / tokens.length >= 0.6;
  }
  return false;
}

/** Scan one string value for forbidden content. Returns finding messages (no findings = clean). */
export function scanIntentString(value: string, opts?: { allowHex?: boolean }): string[] {
  const problems: string[] = [];
  if (SCRIPT_TAG.test(value)) problems.push("contains a <script>/<style> block");
  else if (JSX_TAG.test(value)) problems.push("contains an HTML/JSX tag");
  if (CLASS_ATTR.test(value)) problems.push("contains a class=/className= attribute");
  if (STYLE_ATTR.test(value)) problems.push("contains a style= attribute (inline CSS)");
  if (EVENT_HANDLER.test(value)) problems.push("contains an inline event handler");
  if (CSS_BLOCK.test(value) || CSS_DECL.test(value) || IMPORTANT.test(value)) {
    problems.push("contains a CSS declaration");
  }
  if (!opts?.allowHex && RAW_HEX.test(value)) problems.push("contains a raw hex color");
  for (const re of CODE_FRAGMENTS) {
    if (re.test(value)) {
      problems.push("contains an executable code fragment");
      break;
    }
  }
  if (looksLikeClassList(value)) problems.push("looks like a utility class list");
  return problems;
}

/** Scan a string field and emit findings. */
function checkString(
  findings: FYDFinding[],
  rid: string,
  path: string,
  value: unknown,
  opts?: { allowHex?: boolean },
): void {
  if (typeof value !== "string" || value.length === 0) return;
  for (const problem of scanIntentString(value, opts)) {
    findings.push(err(rid, path, "Intent-only violation: field " + problem + "."));
  }
}

/** Primitive token ids: color.*, font.serif, font.sans, space.base. */
function isPrimitiveTokenId(id: string): boolean {
  return (
    id === "color" ||
    id.startsWith("color.") ||
    id === "font.serif" ||
    id === "font.sans" ||
    id === "space.base" ||
    id.startsWith("font.serif.") ||
    id.startsWith("font.sans.") ||
    id.startsWith("space.base.")
  );
}

/** A DTCG reference like "{surface.brand}". */
function isTokenReference(value: string): boolean {
  return /^\{[A-Za-z0-9_.-]+\}$/.test(value.trim());
}

function tokenRefTarget(value: string): string {
  return value.trim().slice(1, -1);
}

/** Raw E.164 phone: +15551234567. Formatted phones are fine. */
const RAW_E164 = /^\+[1-9]\d{6,14}$/;

// ---------------------------------------------------------------------------
// Section-level validation.
// ---------------------------------------------------------------------------

function checkComposition(findings: FYDFinding[], rid: string, spath: string, section: FYDSection): void {
  const c = section.composition;
  if (!c) return;
  const base = spath + ".composition";

  if (c.job !== undefined) {
    const jobs = ["persuade", "prove", "convert", "reassure", "serve", "close"];
    if (!jobs.includes(c.job)) {
      findings.push(err(rid, base + ".job", "Unknown section job '" + c.job + "'."));
    }
  }
  if (c.variant !== undefined) {
    checkString(findings, rid, base + ".variant", c.variant);
    if (isV1FamilyComponent(section.component)) {
      const allowed = V1_COMPONENT_VARIANTS[section.component];
      if (!allowed.includes(c.variant)) {
        findings.push(
          err(
            rid,
            base + ".variant",
            "Variant '" + c.variant + "' is not in the registry for '" + section.component + "'.",
          ),
        );
      }
    } else if (c.variant.trim().length === 0) {
      findings.push(err(rid, base + ".variant", "Variant must be a non-empty string."));
    }
  }
  checkString(findings, rid, base + ".selectionRationale", c.selectionRationale);
  if (c.sectionRhythm !== undefined && !["tight", "section", "feature", "hero"].includes(c.sectionRhythm)) {
    findings.push(err(rid, base + ".sectionRhythm", "Unknown section rhythm '" + c.sectionRhythm + "'."));
  }
  if (c.density !== undefined && !["compact", "comfortable"].includes(c.density)) {
    findings.push(err(rid, base + ".density", "Unknown density '" + c.density + "'."));
  }
  if (c.emphasis !== undefined && !["quiet", "balanced", "prominent"].includes(c.emphasis)) {
    findings.push(err(rid, base + ".emphasis", "Unknown emphasis '" + c.emphasis + "'."));
  }

  (c.objectBindings ?? []).forEach((b, i) => {
    const p = base + ".objectBindings[" + i + "]";
    if (typeof b.role !== "string" || b.role.trim().length === 0) {
      findings.push(err(rid, p + ".role", "Object binding needs a schema role."));
    }
    checkString(findings, rid, p + ".objectId", b.objectId);
    checkString(findings, rid, p + ".queryRef", b.queryRef);
    checkString(findings, rid, p + ".note", b.note);
  });

  (c.mediaBindings ?? []).forEach((b, i) => {
    const p = base + ".mediaBindings[" + i + "]";
    if (!V1_MEDIA_ROLES.includes(b.role as V1MediaRole)) {
      findings.push(err(rid, p + ".role", "Unknown media role '" + b.role + "'."));
    }
    checkString(findings, rid, p + ".assetId", b.assetId);
    if (typeof b.assetId === "string") {
      if (DATA_URL.test(b.assetId)) {
        findings.push(err(rid, p + ".assetId", "Media bindings are asset references, never bytes (data: URL)."));
      }
      if (b.assetId.length > 500) {
        findings.push(err(rid, p + ".assetId", "Asset reference is implausibly long; references only, never bytes."));
      }
    }
    if (b.relevance !== undefined && !["passed", "rejected", "pending"].includes(b.relevance)) {
      findings.push(err(rid, p + ".relevance", "Unknown relevance '" + b.relevance + "'."));
    }
    checkString(findings, rid, p + ".note", b.note);
  });

  (c.ctaBindings ?? []).forEach((id, i) => {
    checkString(findings, rid, base + ".ctaBindings[" + i + "]", id);
  });

  const ri = c.responsiveIntent;
  if (ri) {
    const p = base + ".responsiveIntent";
    const behaviors = [
      "stack", "snap-row", "carousel", "compact-tiles", "collapse-to-minimal",
      "banner-above-copy", "sticky-action-bar", "progressive-disclosure",
      "full-bleed", "split", "editorial-type-led",
    ];
    for (const [label, list] of [["narrow", ri.narrow], ["wide", ri.wide]] as const) {
      (list ?? []).forEach((b, i) => {
        if (!behaviors.includes(b)) {
          findings.push(err(rid, p + "." + label + "[" + i + "]", "Unknown responsive behavior '" + b + "'."));
        }
      });
    }
    // Responsive intent is semantic: no px values anywhere in it.
    checkString(findings, rid, p + ".note", ri.note);
    if (typeof ri.note === "string" && /\d+\s*px/i.test(ri.note)) {
      findings.push(err(rid, p + ".note", "Responsive intent is semantic, never px."));
    }
  }

  const mt = c.mediaTreatment;
  if (mt) {
    const p = base + ".mediaTreatment";
    if (mt.aspect !== undefined && !["square", "landscape", "portrait", "wide", "banner"].includes(mt.aspect)) {
      findings.push(err(rid, p + ".aspect", "Unknown aspect '" + mt.aspect + "'."));
    }
    if (mt.treatment !== undefined && !["documentary", "polished", "schematic"].includes(mt.treatment)) {
      findings.push(err(rid, p + ".treatment", "Unknown treatment '" + mt.treatment + "'."));
    }
    if (mt.relevanceBar !== undefined && !["relevance-gate", "strict"].includes(mt.relevanceBar)) {
      findings.push(err(rid, p + ".relevanceBar", "Unknown relevance bar '" + mt.relevanceBar + "'."));
    }
    if (mt.fallback !== undefined && !["omit", "editorial-variant", "honest-empty-state"].includes(mt.fallback)) {
      findings.push(err(rid, p + ".fallback", "Unknown fallback '" + mt.fallback + "'."));
    }
    checkString(findings, rid, p + ".note", mt.note);
  }
}

// ---------------------------------------------------------------------------
// Site-level validation.
// ---------------------------------------------------------------------------

function checkDesignTokens(findings: FYDFinding[], rid: string, ref: FYDDesignTokenRef | undefined): void {
  if (!ref) return;
  const base = "designTokens";
  checkString(findings, rid, base + ".theme", ref.theme);
  if (typeof ref.theme === "string" && !isKnownThemeId(ref.theme)) {
    findings.push(
      err(rid, base + ".theme", "Unknown theme '" + ref.theme + "'. Theme is referenced by registry id only."),
    );
  }
  if (ref.tier !== undefined && ref.tier !== "semantic") {
    findings.push(err(rid, base + ".tier", "Tier must be 'semantic': the planner selects semantic intent."));
  }
  for (const [slot, value] of Object.entries(ref.overrides ?? {})) {
    const p = base + ".overrides." + slot;
    if (isPrimitiveTokenId(slot)) {
      findings.push(err(rid, p, "Override names a primitive token id; overrides may only name semantic or component slots."));
    }
    checkString(findings, rid, p, slot);
    if (typeof value !== "string" || value.trim().length === 0) {
      findings.push(err(rid, p, "Override value must be a token reference."));
      continue;
    }
    // Raw hex / CSS / class strings are always violations in overrides.
    for (const problem of scanIntentString(value)) {
      findings.push(err(rid, p, "Intent-only violation: override value " + problem + "."));
    }
    if (isTokenReference(value)) {
      const target = tokenRefTarget(value);
      if (isPrimitiveTokenId(target)) {
        findings.push(err(rid, p, "Override references primitive '" + target + "'; only semantic/component targets."));
      }
    } else if (!scanIntentString(value).length) {
      // A non-reference, non-forbidden value (e.g. a theme-registered name).
      // Allowed, but flag anything that is not brace-wrapped as suspicious.
      findings.push(
        warn(rid, p, "Override value is not a {token.path} reference; prefer token references."),
      );
    }
  }
}

function checkCTASection(
  findings: FYDFinding[],
  rid: string,
  cta: FYDSiteSpec["ctaHierarchy"],
  sections: FYDSection[],
): void {
  if (!cta) return;
  const base = "ctaHierarchy";
  const seen = new Set<string>();
  let primaries = 0;
  cta.hierarchy.forEach((a, i) => {
    const p = base + ".hierarchy[" + i + "]";
    if (typeof a.id !== "string" || a.id.trim().length === 0) {
      findings.push(err(rid, p + ".id", "CTA action needs a deterministic id."));
    } else if (seen.has(a.id)) {
      findings.push(err(rid, p + ".id", "Duplicate CTA id '" + a.id + "'."));
    }
    seen.add(a.id);
    if (a.rank === "primary") primaries++;
    if (!["primary", "secondary", "tertiary"].includes(a.rank)) {
      findings.push(err(rid, p + ".rank", "Unknown CTA rank '" + a.rank + "'."));
    }
    if (!["call", "estimate", "quote", "schedule", "gallery-route", "capture", "browse", "social", "ask"].includes(a.kind)) {
      findings.push(err(rid, p + ".kind", "Unknown CTA kind '" + a.kind + "'."));
    }
    checkString(findings, rid, p + ".label", a.label);
    checkString(findings, rid, p + ".target", a.target);
    checkString(findings, rid, p + ".rationale", a.rationale);
    if (typeof a.target === "string" && RAW_E164.test(a.target.trim())) {
      findings.push(err(rid, p + ".target", "Phone targets must be formatted, never raw E.164."));
    }
  });
  if (primaries !== 1) {
    findings.push(err(rid, base + ".hierarchy", "Exactly one primary CTA per site; found " + primaries + "."));
  }
  for (const [placement, ids] of Object.entries(cta.placement ?? {})) {
    checkString(findings, rid, base + ".placement." + placement, placement);
    (ids ?? []).forEach((id, i) => {
      if (!seen.has(id)) {
        findings.push(
          err(rid, base + ".placement." + placement + "[" + i + "]", "Placement references unknown CTA id '" + id + "'."),
        );
      }
    });
  }
  // Per-section ctaBindings must name CTA ids from the hierarchy.
  sections.forEach((s, si) => {
    (s.composition?.ctaBindings ?? []).forEach((id, i) => {
      if (!seen.has(id)) {
        findings.push(
          err(rid, "pages.sections[" + si + "].composition.ctaBindings[" + i + "]", "Unknown CTA id '" + id + "'."),
        );
      }
    });
  });
}

function checkSourceDesignSignal(findings: FYDFinding[], rid: string, sig: FYDSiteSpec["sourceDesignSignal"]): void {
  if (!sig) return;
  const base = "sourceDesignSignal";
  if (sig.authority !== "signal-not-authority") {
    findings.push(
      err(rid, base + ".authority", "Source design signal must be marked signal-not-authority; it is never canonical truth."),
    );
  }
  checkString(findings, rid, base + ".observedAt", sig.observedAt);
  checkString(findings, rid, base + ".sourceUrl", sig.sourceUrl);
  const o = sig.observations ?? {};
  // brandColorHints may carry observed hex: evidence of what was seen, not authority.
  (o.brandColorHints ?? []).forEach((h, i) => checkString(findings, rid, base + ".observations.brandColorHints[" + i + "]", h, { allowHex: true }));
  (o.fontTendencies ?? []).forEach((h, i) => checkString(findings, rid, base + ".observations.fontTendencies[" + i + "]", h));
  checkString(findings, rid, base + ".observations.density", o.density);
  checkString(findings, rid, base + ".observations.navStructure", o.navStructure);
  (o.sectionOrder ?? []).forEach((h, i) => checkString(findings, rid, base + ".observations.sectionOrder[" + i + "]", h));
  checkString(findings, rid, base + ".observations.ctaProminence", o.ctaProminence);
  checkString(findings, rid, base + ".observations.radiusTendency", o.radiusTendency);
  checkString(findings, rid, base + ".observations.imageTreatment", o.imageTreatment);
  (o.aspectTendencies ?? []).forEach((h, i) => checkString(findings, rid, base + ".observations.aspectTendencies[" + i + "]", h));
  (o.notes ?? []).forEach((h, i) => checkString(findings, rid, base + ".observations.notes[" + i + "]", h));
}

function checkHeadlineIntent(findings: FYDFinding[], rid: string, pageSlug: string, spec: FYDSiteSpec): void {
  const page = spec.pages.find((p) => p.slug === pageSlug);
  const hi = page?.headlineIntent;
  if (!hi) return;
  const base = "pages." + pageSlug + ".headlineIntent";
  if (!["editorial", "legal-name"].includes(hi.h1Kind)) {
    findings.push(err(rid, base + ".h1Kind", "Unknown h1Kind '" + hi.h1Kind + "'."));
  }
  if (hi.source !== undefined && !["owner", "source-site", "evidence-derived"].includes(hi.source)) {
    findings.push(err(rid, base + ".source", "Unknown headline source '" + hi.source + "'."));
  }
  if (hi.h1Kind === "legal-name" && !hi.sourceNote) {
    findings.push(
      warn(rid, base, "Legal business name as H1 requires explicit owner intent; record it in sourceNote."),
    );
  }
  checkString(findings, rid, base + ".sourceNote", hi.sourceNote);
}

/**
 * Validate the V1 intent-only extensions. Pure and deterministic.
 * Specs without the new fields produce no findings: fully backward compatible.
 */
export function validateIntentExtensions(spec: FYDSiteSpec): FYDFinding[] {
  const findings: FYDFinding[] = [];
  const rid = "spec:" + spec.ownerObjectId;

  const allSections: FYDSection[] = spec.pages.reduce<FYDSection[]>(
    (acc, p) => acc.concat(p.sections),
    [],
  );
  allSections.forEach((section, index) => {
    const spath = "pages.sections[" + index + "]";
    checkComposition(findings, rid, spath, section);
  });

  checkDesignTokens(findings, rid, spec.designTokens);
  checkCTASection(findings, rid, spec.ctaHierarchy, allSections);
  checkSourceDesignSignal(findings, rid, spec.sourceDesignSignal);
  spec.pages.forEach((p) => checkHeadlineIntent(findings, rid, p.slug, spec));

  return findings;
}
