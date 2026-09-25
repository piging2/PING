/**
 * Presentation observations (presentation-observations.md Part A,
 * presentation-obs@1).
 *
 * NEW BOUNDED MODULE (additive). Derives DESIGN SIGNAL from served HTML
 * + CSS only. Pure functions over provided source text: no network
 * fetching inside, no clock, no randomness. Same source bytes -> same
 * observation record.
 *
 * NON-CANONICAL BY CONSTRUCTION: the record carries the mandatory
 * `authority: "signal-not-authority"` marker, validated at write time
 * (validatePresentationObservation): a record missing the marker is
 * REJECTED, never defaulted. The planner may weigh these fields as
 * design signal; it may never use them as facts about the business.
 *
 * Input levels:
 * - L1 (static): served HTML text + served CSS texts. Computed styles
 *   and rendered dimensions are unavailable; fields that need them are
 *   null or honestly downgraded to `inferred`.
 * - L2 (rendered): L1 inputs plus an optional L2DomSnapshot of computed
 *   styles / element rects the acquisition stack already holds. The
 *   module never renders anything itself.
 *
 * HTML parsing is a small deterministic tag scanner (no DOM library in
 * this lane): regex over well-formed served markup. Extraction rules are
 * documented per field so every value is auditable back to `observedFrom`.
 */

import { sha256Hex } from "./sha256";

// ---------------------------------------------------------------------------
// Record types (spec A.0).
// ---------------------------------------------------------------------------

export type ObservationMethod = "served-css" | "computed-style" | "dom-structure" | "meta-tag";
export type ConfidenceTier = "direct" | "derived" | "inferred";

export interface ObservationProvenance {
  /** CSS selector path or attribute pattern that yielded the value. */
  observedFrom: string;
  /** served-css | computed-style | dom-structure | meta-tag */
  method: ObservationMethod;
}

export interface LogoObservation {
  url: string;
  position: "header" | "hero" | "footer" | "og-image" | "jsonld" | "favicon";
  dimensions: { width: number; height: number; measured: "rendered" | "intrinsic" };
  format: "png" | "jpeg" | "webp" | "svg" | "gif" | "other";
  confidence: "direct" | "inferred";
  provenance: ObservationProvenance;
}

export interface BrandColorEvidence {
  /** Normalized 6-digit hex (8-digit with alpha when alpha < 0.98). */
  color: string;
  occurrences: number;
  roles: string[];
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}

export interface TypographyObservation {
  displayStack: string[];
  bodyStack: string[];
  headingBodyScaleRatio: number | null;
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}

export interface ImageAspectDistribution {
  buckets: { square: number; portrait: number; landscape: number; wide: number };
  total: number;
  dominant: "square" | "portrait" | "landscape" | "wide" | "none";
  dominantShare: number;
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}

export interface ImageDensity {
  imagesPerThousandWords: number;
  imagesPerSection: number;
  band: "low" | "medium" | "high";
  confidence: "derived";
  provenance: ObservationProvenance;
}

export interface NavigationStructure {
  labels: string[];
  hrefs: string[];
  depth: number;
  navCta: { label: string; href: string } | null;
  sticky: boolean;
  confidence: "direct" | "inferred";
  provenance: ObservationProvenance;
}

export type SectionKind =
  | "hero" | "services" | "projects" | "story" | "testimonials"
  | "area" | "contact" | "footer" | "unknown";

export interface SectionObservation {
  order: number;
  kind: "semantic" | "inferred";
  sectionKind: SectionKind;
  heading: string;
  heightPx: number | null;
}

export type CtaTier = "primary" | "secondary" | "tertiary";
export type CtaPlacement = "in-nav" | "hero" | "body" | "footer";
export type CtaTargetKind = "tel:" | "mailto:" | "form" | "page" | "external";

export interface CtaItem {
  label: string;
  href: string | null;
  observedTier: CtaTier;
  placement: CtaPlacement;
  targetKind: CtaTargetKind;
}

export interface CtaInventory {
  items: CtaItem[];
  primaryCount: number;
  dominantPrimaryLabel: string | null;
}

export interface LayoutDensity {
  medianSectionPaddingY: number | null;
  rhythm: "tight" | "comfortable" | "airy";
  contentMaxWidth: number | null;
  /**
   * direct | derived | inferred. The spec's A.9 interface lists
   * direct|derived, but its own text allows `inferred` for the L1
   * utility-class fallback; the wider union is the honest one.
   */
  confidence: "direct" | "derived" | "inferred";
  provenance: ObservationProvenance;
}

export interface BorderRadiusTendency {
  medianRadiusPx: number | null;
  shape: "sharp" | "soft" | "round";
  confidence: "direct" | "derived";
  provenance: ObservationProvenance;
}

export interface ImageTreatmentTendency {
  medium: "photography" | "illustration" | "mixed";
  finish: "documentary" | "polished" | "mixed";
  finishMethod: string;
  confidence: "direct" | "inferred";
  provenance: ObservationProvenance;
}

/**
 * One source page's presentation signal. NON-CANONICAL: design signal
 * only. Stored in the `designSignal` block of the site record, sibling
 * to (never inside) the business-evidence block.
 */
export interface PresentationObservation {
  sourceUrl: string;
  observedAt: string;
  sourceHash: string;
  levelUsed: 1 | 2;
  /** Explicit non-authority marker. Always this literal string. */
  authority: "signal-not-authority";
  obsVersion: "presentation-obs@1";

  logo: LogoObservation[];
  brandColors: BrandColorEvidence[];
  typography: TypographyObservation;
  imageAspects: ImageAspectDistribution;
  imageDensity: ImageDensity;
  navigation: NavigationStructure;
  sectionSequence: SectionObservation[];
  ctas: CtaInventory;
  layoutDensity: LayoutDensity;
  borderRadius: BorderRadiusTendency;
  imageTreatment: ImageTreatmentTendency;
}

export const PRESENTATION_OBS_VERSION = "presentation-obs@1";
export const SIGNAL_NOT_AUTHORITY = "signal-not-authority" as const;

// ---------------------------------------------------------------------------
// Input: served bytes the acquisition stack already holds.
// ---------------------------------------------------------------------------

/** One computed-style entry from an L2 rendered run (already acquired). */
export interface L2ElementStyle {
  /** Selector or element key the style was read from. */
  selector: string;
  /** Computed style declarations, e.g. { "font-family": "Georgia, serif" }. */
  computed: Record<string, string>;
  /** Element rect when measured, e.g. getBoundingClientRect(). */
  rect?: { width: number; height: number };
}

/** Optional rendered-DOM snapshot. Never fetched here: the acquisition
 *  stack supplies it when it ran L2. */
export interface L2DomSnapshot {
  styles: L2ElementStyle[];
}

export interface PresentationSourceInput {
  /** Final URL after redirects. */
  url: string;
  /** ISO 8601 time the source was acquired. */
  observedAt: string;
  /** Served HTML bytes as text. */
  html: string;
  /** Served stylesheets: <style> blocks are also scanned from html. */
  cssTexts: string[];
  /** Acquisition level that produced the source: 1 (static) or 2 (rendered). */
  level: 1 | 2;
  /** Optional rendered-DOM computed styles from the acquisition stack. */
  l2?: L2DomSnapshot | null;
}

// ---------------------------------------------------------------------------
// Authority validation (write-time gate, spec A.12.1).
// ---------------------------------------------------------------------------

/**
 * Validate the non-authority marker at write time. A record missing the
 * marker, or carrying any other value, is REJECTED (throws), never
 * defaulted. Call before persisting any PresentationObservation.
 */
export function validatePresentationObservation(
  record: unknown,
): asserts record is PresentationObservation {
  if (typeof record !== "object" || record === null) {
    throw new Error(
      "presentation-observation rejected: not an object; the " +
        SIGNAL_NOT_AUTHORITY + " marker is mandatory",
    );
  }
  const authority = (record as { authority?: unknown }).authority;
  if (authority !== SIGNAL_NOT_AUTHORITY) {
    throw new Error(
      "presentation-observation rejected: authority must be the literal " +
        JSON.stringify(SIGNAL_NOT_AUTHORITY) + ", got " + JSON.stringify(authority),
    );
  }
  if ((record as { obsVersion?: unknown }).obsVersion !== PRESENTATION_OBS_VERSION) {
    throw new Error(
      "presentation-observation rejected: obsVersion must be " +
        PRESENTATION_OBS_VERSION,
    );
  }
}

/** Non-throwing form of the write-time gate. */
export function isPresentationObservation(record: unknown): record is PresentationObservation {
  try {
    validatePresentationObservation(record);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Deterministic tag scanner (no DOM library in this lane).
// ---------------------------------------------------------------------------

interface TagMatch {
  /** Full opening tag text, e.g. `<img src="a.png" width="10">`. */
  tag: string;
  /** Lowercased attribute map. */
  attrs: Record<string, string>;
  /** Index of the `<` in the source. */
  start: number;
  /** Index just past the `>` of the opening tag. */
  openEnd: number;
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][a-zA-Z0-9_:\-.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`>=\/]+)))?/g;
  let m: RegExpExecArray | null;
  let first = true;
  while ((m = re.exec(tag)) !== null) {
    if (first) {
      first = false; // skip the tag name itself
      continue;
    }
    const name = m[1].toLowerCase();
    attrs[name] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

/** All opening tags of a name in document order. */
function findTags(html: string, name: string): TagMatch[] {
  const out: TagMatch[] = [];
  const re = new RegExp("<" + name + "(?=[\\s>/])[^>]*>", "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push({ tag: m[0], attrs: parseAttrs(m[0]), start: m.index, openEnd: m.index + m[0].length });
  }
  return out;
}

/**
 * Net nesting depth of non-void elements in html[from..to). Used to
 * prove a tag is a direct child of its scope (depth 0 at the tag's
 * open position). Pure string scan; no DOM.
 */
function tagDepth(html: string, to: number, from = 0): number {
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(?=[\s>/])[^>]*>/g;
  let depth = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = from;
  while ((m = re.exec(html)) !== null && m.index < to) {
    const full = m[0];
    if (full.startsWith("</")) {
      depth = Math.max(0, depth - 1);
    } else if (!full.endsWith("/>") && !VOID_TAGS.has(m[1].toLowerCase())) {
      depth++;
    }
  }
  return depth;
}

/**
 * Region between an opening tag and its matching close tag (first-level
 * nesting aware for the same tag name). Returns the inner HTML, or "".
 */
function regionInner(html: string, match: TagMatch, name: string): string {
  const lower = name.toLowerCase();
  if (VOID_TAGS.has(lower)) return "";
  const openRe = new RegExp("<" + name + "(?=[\\s>/])[^>]*>", "gi");
  const closeRe = new RegExp("</" + name + "\\s*>", "gi");
  let depth = 1;
  let pos = match.openEnd;
  openRe.lastIndex = pos;
  closeRe.lastIndex = pos;
  for (;;) {
    const o = openRe.exec(html);
    const c = closeRe.exec(html);
    if (!c) return html.slice(match.openEnd); // unclosed: rest of document
    if (o && o.index < c.index) {
      depth++;
      pos = o.index + o[0].length;
      openRe.lastIndex = pos;
      closeRe.lastIndex = pos;
    } else {
      depth--;
      if (depth === 0) return html.slice(match.openEnd, c.index);
      pos = c.index + c[0].length;
      openRe.lastIndex = pos;
      closeRe.lastIndex = pos;
    }
  }
}

/** First region (in document order) matching any of the tag names. */
function firstRegion(html: string, names: string[]): { name: string; inner: string; start: number } | null {
  let best: { name: string; match: TagMatch } | null = null;
  for (const n of names) {
    const tags = findTags(html, n);
    if (tags.length > 0 && (!best || tags[0].start < best.match.start)) {
      best = { name: n, match: tags[0] };
    }
  }
  if (!best) return null;
  return { name: best.name, inner: regionInner(html, best.match, best.name), start: best.match.start };
}

function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function removeRegions(html: string, names: string[]): string {
  let out = html;
  for (const n of names) {
    out = out.replace(new RegExp("<" + n + "(?=[\\s>/])[^>]*>[\\s\\S]*?</" + n + "\\s*>", "gi"), " ");
    out = out.replace(new RegExp("<" + n + "(?=[\\s>/])[^>]*/>", "gi"), " ");
  }
  return out;
}

/** Visible-ish text: comments, script, style removed; tags -> spaces. */
function visibleText(html: string): string {
  const noComments = stripComments(html);
  const noDead = removeRegions(noComments, ["script", "style", "noscript"]);
  return noDead
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/** Inner HTML of the first <main>, else the <body>, else the document. */
function mainRegion(html: string): string {
  const main = firstRegion(html, ["main"]);
  if (main) return main.inner;
  const body = firstRegion(html, ["body"]);
  if (body) return body.inner;
  return html;
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function l2Style(l2: L2DomSnapshot | null | undefined, selector: string): Record<string, string> | null {
  if (!l2) return null;
  const entry = l2.styles.find((s) => s.selector === selector);
  return entry ? entry.computed : null;
}

function l2Rect(l2: L2DomSnapshot | null | undefined, selector: string): { width: number; height: number } | null {
  if (!l2) return null;
  const entry = l2.styles.find((s) => s.selector === selector);
  return entry?.rect ?? null;
}

// ---------------------------------------------------------------------------
// A.1 Logo candidates.
// ---------------------------------------------------------------------------

const LOGO_FLOOR_W = 32;
const LOGO_FLOOR_H = 16;

function logoFormat(url: string): LogoObservation["format"] {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  if (path.endsWith(".png")) return "png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "jpeg";
  if (path.endsWith(".webp")) return "webp";
  if (path.endsWith(".svg")) return "svg";
  if (path.endsWith(".gif")) return "gif";
  return "other";
}

function numAttr(attrs: Record<string, string>, name: string): number {
  const v = parseInt(attrs[name] ?? "", 10);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

function logoFromImg(
  img: TagMatch,
  position: LogoObservation["position"],
  confidence: LogoObservation["confidence"],
  observedFrom: string,
  method: ObservationMethod,
  base: string,
  l2: L2DomSnapshot | null | undefined,
  l2Selector?: string,
): LogoObservation | null {
  const raw = img.attrs["src"] || img.attrs["data-src"] || "";
  const url = resolveUrl(raw, base);
  if (!url) return null;
  let width = numAttr(img.attrs, "width");
  let height = numAttr(img.attrs, "height");
  let measured: "rendered" | "intrinsic" = "intrinsic";
  if (l2Selector) {
    const rect = l2Rect(l2, l2Selector);
    if (rect && rect.width > 0 && rect.height > 0) {
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      measured = "rendered";
    }
  }
  // Minimum candidate floor applies when dimensions are known.
  if (width > 0 && height > 0 && (width < LOGO_FLOOR_W || height < LOGO_FLOOR_H)) {
    return null;
  }
  return {
    url,
    position,
    dimensions: { width, height, measured },
    format: logoFormat(url),
    confidence,
    provenance: { observedFrom, method },
  };
}

function extractLogos(html: string, base: string, l2: L2DomSnapshot | null | undefined): LogoObservation[] {
  const out: LogoObservation[] = [];
  const seen = new Set<string>();

  const push = (obs: LogoObservation | null) => {
    if (obs && !seen.has(obs.position + "|" + obs.url)) {
      seen.add(obs.position + "|" + obs.url);
      out.push(obs);
    }
  };

  // 1. header img: first img inside header, nav, or [role="banner"].
  const headerish = firstRegion(html, ["header", "nav"]);
  let bannerInner = "";
  const bannerOpen = /<[^>]*\brole\s*=\s*["']?banner["']?[^>]*>/i.exec(html);
  if (bannerOpen && (!headerish || bannerOpen.index < headerish.start)) {
    const m = findTags(html, "div").find((t) => t.start === bannerOpen.index);
    bannerInner = m ? regionInner(html, m, "div") : "";
  }
  const headerImgScope = headerish ? headerish.inner : bannerInner;
  if (headerImgScope) {
    const imgs = findTags(headerImgScope, "img");
    if (imgs.length > 0) {
      push(logoFromImg(imgs[0], "header", "direct", "header img (first img inside header/nav/[role=banner])", "dom-structure", base, l2, "header img"));
    }
  }

  // 2. og:image.
  const og = findTags(html, "meta").find(
    (t) => (t.attrs["property"] ?? "").toLowerCase() === "og:image" && t.attrs["content"],
  );
  if (og) {
    const url = resolveUrl(og.attrs["content"], base);
    if (url) {
      push({
        url,
        position: "og-image",
        dimensions: { width: 0, height: 0, measured: "intrinsic" },
        format: logoFormat(url),
        confidence: "direct",
        provenance: { observedFrom: 'meta[property="og:image"]', method: "meta-tag" },
      });
    }
  }

  // 3. JSON-LD logo field.
  const ldBlocks = findTags(html, "script").filter(
    (t) => (t.attrs["type"] ?? "").toLowerCase() === "application/ld+json",
  );
  for (const b of ldBlocks) {
    const inner = regionInner(html, b, "script");
    const lm = /"logo"\s*:\s*"([^"]+)"/.exec(inner);
    if (lm) {
      const url = resolveUrl(lm[1], base);
      if (url) {
        push({
          url,
          position: "jsonld",
          dimensions: { width: 0, height: 0, measured: "intrinsic" },
          format: logoFormat(url),
          confidence: "direct",
          provenance: { observedFrom: "script[type=application/ld+json] .logo", method: "dom-structure" },
        });
        break;
      }
    }
  }

  // 4. favicon.
  const icon = findTags(html, "link").find((t) => {
    const rel = (t.attrs["rel"] ?? "").toLowerCase();
    return (rel === "icon" || rel === "shortcut icon") && t.attrs["href"];
  });
  if (icon) {
    const url = resolveUrl(icon.attrs["href"], base);
    if (url) {
      push({
        url,
        position: "favicon",
        dimensions: { width: 0, height: 0, measured: "intrinsic" },
        format: logoFormat(url),
        confidence: "direct",
        provenance: { observedFrom: 'link[rel="icon"]', method: "dom-structure" },
      });
    }
  }

  // 5. Footer fallback: first img inside footer whose src matches /logo|brand|mark/i.
  const footer = firstRegion(html, ["footer"]);
  if (footer) {
    const imgs = findTags(footer.inner, "img");
    const branded = imgs.find((t) =>
      /logo|brand|mark/i.test(t.attrs["src"] ?? "") ||
      /logo|brand|mark/i.test(t.attrs["class"] ?? "") ||
      /logo|brand|mark/i.test(t.attrs["alt"] ?? ""),
    );
    if (branded) {
      push(logoFromImg(branded, "footer", "inferred", "footer img matching /logo|brand|mark/i", "dom-structure", base, l2));
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// A.2 Brand-color evidence (ranked list, not a palette claim).
// ---------------------------------------------------------------------------

const COLOR_PROPS = ["color", "background-color", "background", "border-color", "fill", "stroke"];

interface CssDecl {
  selector: string;
  prop: string;
  value: string;
}

/** Parse `selector { prop: value; ... }` blocks out of CSS text. */
function parseCssRules(css: string): Array<{ selector: string; decls: CssDecl[] }> {
  const rules: Array<{ selector: string; decls: CssDecl[] }> = [];
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noComments)) !== null) {
    const selector = m[1].trim();
    if (!selector || selector.startsWith("@")) continue;
    const decls: CssDecl[] = [];
    for (const part of m[2].split(";")) {
      const ci = part.indexOf(":");
      if (ci < 0) continue;
      const prop = part.slice(0, ci).trim().toLowerCase();
      const value = part.slice(ci + 1).trim();
      if (prop && value) decls.push({ selector, prop, value });
    }
    if (decls.length > 0) rules.push({ selector, decls });
  }
  return rules;
}

function hexByte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/**
 * Normalize a CSS color literal to 6-digit hex (uppercase per spec
 * example "#5E6259"), or 8-digit hex when alpha < 0.98. Returns null for
 * unparseable values (named colors are out of scope for V1: documented).
 */
function normalizeColor(literal: string): string | null {
  const v = literal.trim().toLowerCase();
  let m: RegExpExecArray | null;
  if ((m = /^#([0-9a-f]{3})$/.exec(v))) {
    const [r, g, b] = m[1].split("");
    return ("#" + r + r + g + g + b + b).toUpperCase();
  }
  if ((m = /^#([0-9a-f]{6})$/.exec(v))) return ("#" + m[1]).toUpperCase();
  if ((m = /^#([0-9a-f]{8})$/.exec(v))) {
    const alpha = parseInt(m[1].slice(6, 8), 16) / 255;
    return alpha < 0.98 ? ("#" + m[1]).toUpperCase() : ("#" + m[1].slice(0, 6)).toUpperCase();
  }
  if ((m = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/.exec(v))) {
    const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
    const hex = "#" + hexByte(parseFloat(m[1])) + hexByte(parseFloat(m[2])) + hexByte(parseFloat(m[3]));
    const out = alpha < 0.98 ? hex + hexByte(alpha * 255) : hex;
    return out.toUpperCase();
  }
  return null;
}

/** Color literals inside a declaration value (hex, rgb/rgba). */
function colorLiterals(value: string): string[] {
  const out: string[] = [];
  const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) out.push(m[0]);
  return out;
}

function allCssTexts(html: string, cssTexts: string[]): string[] {
  const styles = findTags(html, "style").map((t) => regionInner(html, t, "style"));
  return [...styles, ...cssTexts];
}

function extractBrandColors(html: string, cssTexts: string[]): BrandColorEvidence[] {
  const counts = new Map<string, { occurrences: number; roles: Set<string> }>();
  for (const css of allCssTexts(html, cssTexts)) {
    for (const rule of parseCssRules(css)) {
      for (const d of rule.decls) {
        if (!COLOR_PROPS.includes(d.prop)) continue;
        for (const lit of colorLiterals(d.value)) {
          const norm = normalizeColor(lit);
          if (!norm) continue;
          const entry = counts.get(norm) ?? { occurrences: 0, roles: new Set<string>() };
          entry.occurrences++;
          entry.roles.add(d.prop);
          counts.set(norm, entry);
        }
      }
    }
  }
  return [...counts.entries()]
    .map(([color, e]) => ({
      color,
      occurrences: e.occurrences,
      roles: [...e.roles].sort(),
      confidence: "direct" as const,
      provenance: {
        observedFrom: "served stylesheets: " + COLOR_PROPS.join(", ") + " declarations",
        method: "served-css" as const,
      },
    }))
    .sort((a, b) => b.occurrences - a.occurrences || (a.color < b.color ? -1 : 1))
    .slice(0, 12);
}

// ---------------------------------------------------------------------------
// A.3 Typography.
// ---------------------------------------------------------------------------

function parseFontStack(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, "").trim())
    .filter((s) => s.length > 0);
}

/** First font-family declaration for a selector predicate, in document order. */
function fontFamilyFor(
  cssTexts: string[],
  html: string,
  matchSelector: (sel: string) => boolean,
  inlineTag?: TagMatch,
): string[] | null {
  if (inlineTag) {
    const style = inlineTag.attrs["style"] ?? "";
    const m = /font-family\s*:\s*([^;]+)/i.exec(style);
    if (m) return parseFontStack(m[1]);
  }
  for (const css of allCssTexts(html, cssTexts)) {
    for (const rule of parseCssRules(css)) {
      if (!matchSelector(rule.selector)) continue;
      const decl = rule.decls.find((d) => d.prop === "font-family");
      if (decl) return parseFontStack(decl.value);
    }
  }
  return null;
}

function fontSizePxFor(
  cssTexts: string[],
  html: string,
  matchSelector: (sel: string) => boolean,
  inlineTag?: TagMatch,
  l2?: L2DomSnapshot | null,
  l2Selector?: string,
): number | null {
  if (l2 && l2Selector) {
    const style = l2Style(l2, l2Selector);
    const v = style?.["font-size"];
    if (v) {
      const px = /^([0-9.]+)px$/.exec(v.trim());
      if (px) return parseFloat(px[1]);
    }
  }
  if (inlineTag) {
    const style = inlineTag.attrs["style"] ?? "";
    const m = /font-size\s*:\s*([0-9.]+)px/i.exec(style);
    if (m) return parseFloat(m[1]);
  }
  for (const css of allCssTexts(html, cssTexts)) {
    for (const rule of parseCssRules(css)) {
      if (!matchSelector(rule.selector)) continue;
      const decl = rule.decls.find((d) => d.prop === "font-size");
      if (decl) {
        const m = /^([0-9.]+)px/.exec(decl.value.trim());
        if (m) return parseFloat(m[1]);
      }
    }
  }
  return null;
}

const isH1Sel = (s: string) => /(^|[\s,>+~])h1([\s,.:#>+~]|$)/i.test(s);
const isHeroH2Sel = (s: string) => /\.hero/i.test(s) && /(^|[\s,>+~])h2([\s,.:#>+~]|$)/i.test(s);
const isBodyPSel = (s: string) => /(^|[\s,>+~])p([\s,.:#>+~]|$)/i.test(s);

function extractTypography(
  html: string,
  cssTexts: string[],
  l2: L2DomSnapshot | null | undefined,
): TypographyObservation {
  const h1s = findTags(html, "h1");
  const h1 = h1s[0];
  let displayStack = fontFamilyFor(cssTexts, html, isH1Sel, h1);
  if (!displayStack) {
    // .hero h2 fallback per spec.
    const heroH2 = findTags(html, "h2").find((t) => /hero/i.test(t.attrs["class"] ?? ""));
    displayStack = fontFamilyFor(cssTexts, html, isHeroH2Sel, heroH2) ?? [];
  }
  displayStack = displayStack ?? [];

  const main = mainRegion(html);
  const bodyP = findTags(main, "p")[0];
  const bodyStack = fontFamilyFor(cssTexts, html, isBodyPSel, bodyP) ?? [];

  const h1Size = fontSizePxFor(cssTexts, html, isH1Sel, h1, l2, "h1");
  const pSize = fontSizePxFor(cssTexts, html, isBodyPSel, bodyP, l2, "main p");
  const headingBodyScaleRatio = h1Size !== null && pSize !== null && pSize > 0 ? h1Size / pSize : null;

  const direct = displayStack.length > 0 || bodyStack.length > 0;
  return {
    displayStack,
    bodyStack,
    headingBodyScaleRatio,
    confidence: direct ? "direct" : "derived",
    provenance: {
      observedFrom: "h1 / .hero h2 font-family; main p font-family (inline style, then matched stylesheet rule, then L2 computed style)",
      method: l2 ? "computed-style" : "served-css",
    },
  };
}

// ---------------------------------------------------------------------------
// A.4 Image aspect distribution + A.5 density + A.11 treatment inputs.
// ---------------------------------------------------------------------------

interface ScannedImage {
  src: string;
  alt: string;
  className: string;
  width: number; // 0 when unknown
  height: number; // 0 when unknown
  format: string;
  index: number; // document order
}

function scanContentImages(html: string, base: string): ScannedImage[] {
  const main = mainRegion(html);
  return findTags(main, "img")
    .map((t, index) => ({
      src: resolveUrl(t.attrs["src"] ?? t.attrs["data-src"] ?? "", base) ?? "",
      alt: t.attrs["alt"] ?? "",
      className: t.attrs["class"] ?? "",
      width: numAttr(t.attrs, "width"),
      height: numAttr(t.attrs, "height"),
      format: logoFormat(t.attrs["src"] ?? ""),
      index,
    }))
    .filter((img) => img.src.length > 0);
}

function aspectBucket(w: number, h: number): "square" | "portrait" | "landscape" | "wide" | null {
  if (w < 40 || h < 40) return null; // icons/sprites/pixel trackers excluded
  const r = w / h;
  if (r >= 0.9 && r <= 1.1) return "square";
  if (r < 0.9) return "portrait";
  if (r <= 1.9) return "landscape";
  return "wide";
}

function extractImageAspects(images: ScannedImage[]): ImageAspectDistribution {
  const buckets = { square: 0, portrait: 0, landscape: 0, wide: 0 };
  for (const img of images) {
    const b = aspectBucket(img.width, img.height);
    if (b) buckets[b]++;
  }
  const total = images.length;
  const order: Array<"square" | "portrait" | "landscape" | "wide"> = ["square", "portrait", "landscape", "wide"];
  let dominant: ImageAspectDistribution["dominant"] = "none";
  let dominantCount = 0;
  for (const k of order) {
    if (buckets[k] > dominantCount) {
      dominant = k;
      dominantCount = buckets[k];
    }
  }
  return {
    buckets,
    total,
    dominant,
    dominantShare: total > 0 ? dominantCount / total : 0,
    confidence: "direct",
    provenance: {
      observedFrom: "img width/height attributes in main (L1); naturalWidth/naturalHeight via L2 rect when provided",
      method: "dom-structure",
    },
  };
}

function extractImageDensity(
  images: ScannedImage[],
  html: string,
  sectionCount: number,
): ImageDensity {
  const bodyText = visibleText(removeRegions(stripComments(html), ["nav", "footer", "header"]));
  const words = wordCount(bodyText);
  const imagesPerThousandWords = words > 0 ? images.length / (words / 1000) : 0;
  const imagesPerSection = sectionCount > 0 ? images.length / sectionCount : images.length;
  const band =
    imagesPerThousandWords < 0.5 && imagesPerSection < 1
      ? "low"
      : imagesPerThousandWords > 3 || imagesPerSection > 4
        ? "high"
        : "medium";
  return {
    imagesPerThousandWords,
    imagesPerSection,
    band,
    confidence: "derived",
    provenance: {
      observedFrom: "content image count / visible body words (script/style/nav/footer removed) / A.7 section count",
      method: "dom-structure",
    },
  };
}

// ---------------------------------------------------------------------------
// A.6 Navigation.
// ---------------------------------------------------------------------------

const CTA_CLASS_PATTERN = /btn|button|cta|quote|call/i;

function extractNavigation(
  html: string,
  base: string,
  l2: L2DomSnapshot | null | undefined,
): NavigationStructure {
  const header = firstRegion(html, ["header"]);
  let navInner = "";
  let navFound = false;
  if (header) {
    const navs = findTags(header.inner, "nav");
    if (navs.length > 0) {
      navInner = regionInner(header.inner, navs[0], "nav");
      navFound = true;
    }
  }
  if (!navFound) {
    // [role="navigation"] first match in DOM order.
    const roleNav = /<nav[^>]*\brole\s*=\s*["']?navigation["']?[^>]*>/i.exec(html);
    if (roleNav) {
      const m = findTags(html, "nav").find((t) => t.start === roleNav.index);
      if (m) {
        navInner = regionInner(html, m, "nav");
        navFound = true;
      }
    }
  }
  if (!navFound) {
    const navs = findTags(html, "nav");
    if (navs.length > 0) {
      navInner = regionInner(html, navs[0], "nav");
      navFound = true;
    }
  }

  const anchors = navFound ? findTags(navInner, "a") : [];
  const labels: string[] = [];
  const hrefs: string[] = [];
  for (const a of anchors) {
    const inner = regionInner(navInner, a, "a");
    const label = visibleText(inner);
    if (!label) continue;
    labels.push(label);
    hrefs.push(resolveUrl(a.attrs["href"] ?? "", base) ?? "");
  }

  // CTA inside nav: button-styled link. L2: computed background fill;
  // L1: class regex (inferred). Class regex is checked first because it
  // is the deterministic signal on both levels.
  let navCta: { label: string; href: string } | null = null;
  let ctaInferred = false;
  for (const a of anchors) {
    const cls = a.attrs["class"] ?? "";
    if (CTA_CLASS_PATTERN.test(cls)) {
      const inner = regionInner(navInner, a, "a");
      const label = visibleText(inner);
      if (label) {
        navCta = { label, href: resolveUrl(a.attrs["href"] ?? "", base) ?? "" };
        ctaInferred = true;
        break;
      }
    }
  }
  if (!navCta && l2 && anchors.length > 0) {
    // L2 fallback: a nav anchor with a filled computed background.
    // CTAs conventionally sit last, so scan from the end.
    for (let i = anchors.length - 1; i >= 0; i--) {
      const entry = l2.styles.find((s) => s.selector === "nav a:nth(" + (i + 1) + ")");
      const bg = (entry?.computed["background-color"] ?? "").trim().toLowerCase();
      if (bg && bg !== "transparent" && !/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(bg)) {
        const inner = regionInner(navInner, anchors[i], "a");
        const label = visibleText(inner);
        if (label) {
          navCta = { label, href: resolveUrl(anchors[i].attrs["href"] ?? "", base) ?? "" };
          break;
        }
      }
    }
  }

  // Sticky: computed position on nav/header (L2), else style/class hint (L1).
  let sticky = false;
  let stickyInferred = false;
  if (l2) {
    for (const sel of ["nav", "header nav", "header"]) {
      const style = l2Style(l2, sel);
      const pos = (style?.["position"] ?? "").trim().toLowerCase();
      if (pos === "sticky" || pos === "fixed") {
        sticky = true;
        break;
      }
    }
  } else {
    const navTag = findTags(html, "nav")[0];
    const styleAttr = (navTag?.attrs["style"] ?? "").toLowerCase();
    const cls = (navTag?.attrs["class"] ?? "").toLowerCase();
    if (/position\s*:\s*(sticky|fixed)/.test(styleAttr) || /sticky|fixed/.test(cls)) {
      sticky = true;
      stickyInferred = true;
    }
  }

  return {
    labels,
    hrefs,
    depth: labels.length,
    navCta,
    sticky,
    confidence: ctaInferred || stickyInferred ? "inferred" : "direct",
    provenance: {
      observedFrom: "header nav (fallback [role=navigation], then first nav); anchor inner text; CTA by computed button treatment (L2) or /btn|button|cta|quote|call/i class regex (L1, inferred)",
      method: l2 ? "computed-style" : "dom-structure",
    },
  };
}

// ---------------------------------------------------------------------------
// A.7 Section sequence.
// ---------------------------------------------------------------------------

const SECTION_KIND_KEYWORDS: Array<{ kind: SectionKind; pattern: RegExp }> = [
  { kind: "hero", pattern: /hero/i },
  { kind: "services", pattern: /service/i },
  { kind: "projects", pattern: /project|portfolio|our work|gallery/i },
  { kind: "story", pattern: /about|our story|family|our team|why us/i },
  { kind: "testimonials", pattern: /testimonial|review/i },
  { kind: "area", pattern: /service area|areas we serve|locations|where we/i },
  { kind: "contact", pattern: /contact|get in touch|quote|estimate/i },
];

function kindFromAttr(attrs: Record<string, string>): SectionKind | null {
  const hay = [attrs["id"] ?? "", attrs["class"] ?? "", attrs["aria-label"] ?? "", attrs["name"] ?? ""].join(" ");
  for (const { kind, pattern } of SECTION_KIND_KEYWORDS) {
    if (pattern.test(hay)) return kind;
  }
  return null;
}

const HEADING_KIND_PATTERNS: Array<{ kind: SectionKind; pattern: RegExp }> = [
  { kind: "projects", pattern: /our (work|projects)/i },
  { kind: "testimonials", pattern: /testimonial|review/i },
  { kind: "story", pattern: /about|our story|family/i },
  { kind: "area", pattern: /service area|areas we serve/i },
  { kind: "contact", pattern: /contact|get in touch/i },
  { kind: "services", pattern: /service/i },
];

function extractSectionSequence(html: string): SectionObservation[] {
  const out: SectionObservation[] = [];
  const mainTags = findTags(html, "main");
  const scope = mainTags.length > 0 ? regionInner(html, mainTags[0], "main") : html;
  // A.7 observed-from: DIRECT children of main. findTags yields every
  // <section> open tag in the scope, so filter to depth 0 (no unclosed
  // ancestor between the scope start and the tag). Nested sections are
  // not separate sequence entries.
  const sections = findTags(scope, "section").filter((s) => tagDepth(scope, s.start) === 0);

  // Header hero block (DOM order: header precedes main).
  const header = firstRegion(html, ["header"]);
  let order = 0;
  if (header) {
    const heroish = findTags(header.inner, "div").find((t) => /hero/i.test(t.attrs["class"] ?? ""));
    if (heroish) {
      const inner = regionInner(header.inner, heroish, "div");
      const h = findTags(inner, "h1")[0] ?? findTags(inner, "h2")[0];
      out.push({
        order: order++,
        kind: "semantic",
        sectionKind: "hero",
        heading: h ? visibleText(regionInner(inner, h, h.tag.slice(1, 3))).slice(0, 80) : "",
        heightPx: null,
      });
    }
  }

  for (const s of sections) {
    const inner = regionInner(scope, s, "section");
    const attrKind = kindFromAttr(s.attrs);
    let kind: "semantic" | "inferred" = "inferred";
    let sectionKind: SectionKind = "unknown";
    if (attrKind) {
      kind = "semantic";
      sectionKind = attrKind;
    } else {
      const h = findTags(inner, "h1")[0] ?? findTags(inner, "h2")[0] ?? findTags(inner, "h3")[0];
      const headingText = h ? visibleText(regionInner(inner, h, h.tag.slice(1, 3))) : "";
      for (const { kind: k, pattern } of HEADING_KIND_PATTERNS) {
        if (pattern.test(headingText)) {
          sectionKind = k;
          break;
        }
      }
    }
    const h = findTags(inner, "h1")[0] ?? findTags(inner, "h2")[0] ?? findTags(inner, "h3")[0];
    out.push({
      order: order++,
      kind,
      sectionKind,
      heading: h ? visibleText(regionInner(inner, h, h.tag.slice(1, 3))).slice(0, 80) : "",
      heightPx: null, // L2 rect measurement only; null on L1
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// A.8 CTA inventory.
// ---------------------------------------------------------------------------

const CTA_WATCH_PATTERN = /btn|button|cta|quote|estimate|call|schedule/i;

function ctaTierFor(cls: string): CtaTier {
  if (/primary|btn-primary|cta-primary|is-primary/i.test(cls)) return "primary";
  if (/secondary|outline|ghost|btn-secondary/i.test(cls)) return "secondary";
  return "tertiary";
}

function placementFor(index: number, landmarks: Array<{ name: string; start: number; end: number }>): CtaPlacement {
  // Innermost landmark containing the index, mapped to the four placements.
  let best: { name: string; start: number; end: number } | null = null;
  for (const lm of landmarks) {
    if (index >= lm.start && index <= lm.end && (!best || lm.start >= best.start)) best = lm;
  }
  if (!best) return "body";
  if (best.name === "nav") return "in-nav";
  if (best.name === "hero") return "hero";
  if (best.name === "footer") return "footer";
  return "body";
}

function landmarkSpans(html: string): Array<{ name: string; start: number; end: number }> {
  const spans: Array<{ name: string; start: number; end: number }> = [];
  for (const tag of findTags(html, "nav")) {
    const inner = regionInner(html, tag, "nav");
    spans.push({ name: "nav", start: tag.start, end: tag.openEnd + inner.length + "</nav>".length });
  }
  for (const tag of findTags(html, "footer")) {
    const inner = regionInner(html, tag, "footer");
    spans.push({ name: "footer", start: tag.start, end: tag.openEnd + inner.length + "</footer>".length });
  }
  for (const tag of findTags(html, "header")) {
    const inner = regionInner(html, tag, "header");
    spans.push({ name: "header", start: tag.start, end: tag.openEnd + inner.length + "</header>".length });
  }
  for (const tag of findTags(html, "section")) {
    if (/hero/i.test(tag.attrs["class"] ?? "") || /hero/i.test(tag.attrs["id"] ?? "")) {
      const inner = regionInner(html, tag, "section");
      spans.push({ name: "hero", start: tag.start, end: tag.openEnd + inner.length + "</section>".length });
    }
  }
  return spans;
}

function targetKindFor(href: string | null, base: string, isButton: boolean): CtaTargetKind {
  if (!href) return isButton ? "form" : "page";
  const h = href.trim().toLowerCase();
  if (h.startsWith("tel:")) return "tel:";
  if (h.startsWith("mailto:")) return "mailto:";
  if (/form|contact/i.test(h)) return "form";
  try {
    const u = new URL(href, base);
    const b = new URL(base);
    if (u.origin !== b.origin) return "external";
  } catch {
    // unresolvable href: treat as page-local
  }
  return "page";
}

function extractCtas(html: string, base: string): CtaInventory {
  const landmarks = landmarkSpans(html);
  const items: CtaItem[] = [];
  const seen = new Set<string>();
  const starts: number[] = [];

  const consider = (tag: TagMatch, isButton: boolean) => {
    const cls = tag.attrs["class"] ?? "";
    const text = tag.attrs["aria-label"] ?? "";
    if (!CTA_WATCH_PATTERN.test(cls) && !CTA_WATCH_PATTERN.test(text)) return;
    const inner = regionInner(html, tag, isButton ? "button" : "a");
    const label = visibleText(inner) || text;
    if (!label) return;
    const rawHref = tag.attrs["href"] ?? null;
    const href = rawHref ? (resolveUrl(rawHref, base) ?? rawHref) : null;
    const key = label + "|" + (href ?? "") + "|" + tag.start;
    if (seen.has(key)) return;
    seen.add(key);
    starts.push(tag.start);
    items.push({
      label,
      href,
      observedTier: ctaTierFor(cls),
      placement: placementFor(tag.start, landmarks),
      targetKind: targetKindFor(rawHref, base, isButton),
    });
  };

  for (const a of findTags(html, "a")) consider(a, false);
  for (const b of findTags(html, "button")) consider(b, true);
  // True document order: anchors and buttons merged by source position.
  const order = items.map((_, i) => i).sort((x, y) => starts[x] - starts[y]);
  const ordered = order.map((i) => items[i]);

  const primaries = ordered.filter((i) => i.observedTier === "primary");
  const counts = new Map<string, number>();
  for (const p of primaries) counts.set(p.label, (counts.get(p.label) ?? 0) + 1);
  let dominantPrimaryLabel: string | null = null;
  let best = 0;
  for (const p of primaries) {
    const c = counts.get(p.label) ?? 0;
    if (c > best) {
      best = c;
      dominantPrimaryLabel = p.label;
    }
  }
  return { items: ordered, primaryCount: primaries.length, dominantPrimaryLabel };
}

// ---------------------------------------------------------------------------
// A.9 Layout density.
// ---------------------------------------------------------------------------

function pxValue(value: string): number | null {
  const m = /^(-?[0-9.]+)px/.exec(value.trim());
  return m ? parseFloat(m[1]) : null;
}

function extractLayoutDensity(
  html: string,
  cssTexts: string[],
  l2: L2DomSnapshot | null | undefined,
): LayoutDensity {
  let medianSectionPaddingY: number | null = null;
  let contentMaxWidth: number | null = null;
  let confidence: "direct" | "derived" | "inferred" = "derived";
  let observedFrom = "";

  if (l2) {
    // L2: computed padding on main > section equivalents.
    const paddings: number[] = [];
    for (const s of l2.styles) {
      if (!/^section(\b|$)/.test(s.selector) && !s.selector.includes("main section")) continue;
      const top = pxValue(s.computed["padding-top"] ?? "");
      const bottom = pxValue(s.computed["padding-bottom"] ?? "");
      if (top !== null && bottom !== null) paddings.push(top + bottom);
    }
    if (paddings.length > 0) {
      medianSectionPaddingY = median(paddings);
      confidence = "direct";
      observedFrom = "L2 computed padding-top+padding-bottom on section elements (median)";
    }
    for (const s of l2.styles) {
      const mw = pxValue(s.computed["max-width"] ?? "");
      if (mw !== null && (contentMaxWidth === null || mw > contentMaxWidth)) {
        contentMaxWidth = mw;
      }
    }
  }

  if (medianSectionPaddingY === null) {
    // L1: served CSS padding on section-ish selectors.
    const paddings: number[] = [];
    for (const css of allCssTexts(html, cssTexts)) {
      for (const rule of parseCssRules(css)) {
        if (!/section/i.test(rule.selector)) continue;
        let top: number | null = null;
        let bottom: number | null = null;
        for (const d of rule.decls) {
          if (d.prop === "padding-top") top = pxValue(d.value);
          if (d.prop === "padding-bottom") bottom = pxValue(d.value);
          if (d.prop === "padding") {
            const parts = d.value.trim().split(/\s+/);
            const v = pxValue(parts[0] ?? "");
            const hb = parts.length >= 3 ? pxValue(parts[2]) : v;
            if (v !== null) {
              top = v;
              bottom = hb;
            }
          }
        }
        if (top !== null && bottom !== null) paddings.push(top + bottom);
      }
    }
    if (paddings.length > 0) {
      medianSectionPaddingY = median(paddings);
      confidence = "direct";
      observedFrom = "served CSS padding-top+padding-bottom on section selectors (median)";
    }
  }

  let rhythm: "tight" | "comfortable" | "airy";
  if (medianSectionPaddingY !== null) {
    rhythm = medianSectionPaddingY < 64 ? "tight" : medianSectionPaddingY > 160 ? "airy" : "comfortable";
  } else {
    // L1 utility-class fallback (inferred): py-N -> rhythm bucket.
    const votes: Array<"tight" | "comfortable" | "airy"> = [];
    const classRe = /class\s*=\s*["']([^"']*)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = classRe.exec(html)) !== null) {
      const py = /py-([0-9]+)/.exec(m[1]);
      if (!py) continue;
      const n = parseInt(py[1], 10);
      if ([0, 2, 4, 8].includes(n)) votes.push("tight");
      else if ([16, 20, 24].includes(n)) votes.push("comfortable");
      else if ([28, 32, 40].includes(n)) votes.push("airy");
    }
    rhythm = majority(votes) ?? "comfortable";
    confidence = "inferred";
    observedFrom = "utility-class py-N patterns (inferred, L1 only)";
  }

  if (contentMaxWidth === null) {
    for (const css of allCssTexts(html, cssTexts)) {
      for (const rule of parseCssRules(css)) {
        if (!/main|container|wrapper|content/i.test(rule.selector)) continue;
        const decl = rule.decls.find((d) => d.prop === "max-width");
        const w = decl ? pxValue(decl.value) : null;
        if (w !== null && (contentMaxWidth === null || w > contentMaxWidth)) contentMaxWidth = w;
      }
    }
  }

  return {
    medianSectionPaddingY,
    rhythm,
    contentMaxWidth,
    confidence,
    provenance: { observedFrom, method: l2 ? "computed-style" : "served-css" },
  };
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function majority<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  let best: T | null = null;
  let bestN = 0;
  for (const i of items) {
    const n = counts.get(i) ?? 0;
    if (n > bestN) {
      bestN = n;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// A.10 Border radius.
// ---------------------------------------------------------------------------

function extractBorderRadius(html: string, cssTexts: string[]): BorderRadiusTendency {
  const radii: number[] = [];
  for (const css of allCssTexts(html, cssTexts)) {
    for (const rule of parseCssRules(css)) {
      const decl = rule.decls.find((d) => d.prop === "border-radius");
      if (!decl) continue;
      const v = pxValue(decl.value);
      if (v !== null) radii.push(v);
    }
  }
  const medianRadiusPx = radii.length > 0 ? median(radii) : null;
  const shape =
    medianRadiusPx === null ? "soft" : medianRadiusPx < 4 ? "sharp" : medianRadiusPx > 16 ? "round" : "soft";
  return {
    medianRadiusPx,
    shape,
    confidence: medianRadiusPx !== null ? "direct" : "derived",
    provenance: {
      observedFrom: "served CSS border-radius declarations across buttons and card-like containers (median)",
      method: "served-css",
    },
  };
}

// ---------------------------------------------------------------------------
// A.11 Image treatment.
// ---------------------------------------------------------------------------

export const FINISH_METHOD_V1 =
  "V1 finish rule (presentation-obs@1): an image counts documentary when its alt text or nearby caption " +
  "references a real job, location, or person (/project|job site|our team|before|after|installed/i); " +
  "it counts polished when its filename carries a stock-agency marker (stock-, shutterstock, istock, " +
  "adobe-stock, getty, dreamstime, 123rf) or it has no contextual caption. Majority of content images " +
  "decides; a 50/50 split records mixed. This judges pixels for design fit only, never the business.";

const DOCUMENTARY_PATTERN = /project|job[\s-]?site|our team|before|after|installed/i;

function extractImageTreatment(images: ScannedImage[]): ImageTreatmentTendency {
  let photos = 0;
  let illustrations = 0;
  let documentary = 0;
  let polished = 0;
  for (const img of images) {
    if (img.format === "svg") illustrations++;
    else photos++;
    const file = (img.src.split("?")[0].split("#")[0].split("/").pop() ?? "").toLowerCase();
    const contextText = (img.alt + " " + img.className).trim();
    if (DOCUMENTARY_PATTERN.test(contextText)) documentary++;
    else polished++; // V1 rule: stock-agency filename markers, generic
    // filenames, or no contextual caption all count polished.
  }
  const medium = photos > illustrations ? "photography" : illustrations > photos ? "illustration" : "mixed";
  const finish = documentary > polished ? "documentary" : polished > documentary ? "polished" : "mixed";
  return {
    medium,
    finish,
    finishMethod: FINISH_METHOD_V1,
    confidence: "inferred",
    provenance: {
      observedFrom: "content image formats (svg -> illustration) + V1 finish rule over alt text and filenames",
      method: "dom-structure",
    },
  };
}

// ---------------------------------------------------------------------------
// Top-level: one page -> one record.
// ---------------------------------------------------------------------------

/** True when the fetched body looks like an HTML document. */
export function isHtmlDocument(raw: string): boolean {
  return /<\s*(html|body|head)[\s>]/i.test(raw);
}

/**
 * Derive the presentation observation for one acquired source page.
 * Returns null when there are no HTML bytes to observe (caller skips).
 * Pure: same bytes in, same record out.
 */
export function observePresentation(input: PresentationSourceInput): PresentationObservation | null {
  const html = stripComments(input.html);
  if (!html.trim() || !isHtmlDocument(html)) return null;
  const l2 = input.l2 ?? null;

  const images = scanContentImages(html, input.url);
  const sections = extractSectionSequence(html);
  const aspects = extractImageAspects(images);

  const record: PresentationObservation = {
    sourceUrl: input.url,
    observedAt: input.observedAt,
    sourceHash: sha256Hex(input.html),
    levelUsed: input.level,
    authority: SIGNAL_NOT_AUTHORITY,
    obsVersion: PRESENTATION_OBS_VERSION,

    logo: extractLogos(html, input.url, l2),
    brandColors: extractBrandColors(html, input.cssTexts),
    typography: extractTypography(html, input.cssTexts, l2),
    imageAspects: aspects,
    imageDensity: extractImageDensity(images, html, sections.length),
    navigation: extractNavigation(html, input.url, l2),
    sectionSequence: sections,
    ctas: extractCtas(html, input.url),
    layoutDensity: extractLayoutDensity(html, input.cssTexts, l2),
    borderRadius: extractBorderRadius(html, input.cssTexts),
    imageTreatment: extractImageTreatment(images),
  };

  // Write-time gate: never emit a record that fails it.
  validatePresentationObservation(record);
  return record;
}

/**
 * Derive presentation observations for every acquired HTML source.
 * Feed AcquiredSource records straight in; non-HTML or failed fetches
 * are skipped (no observation fabricated).
 */
export function observeDesignSignals(
  acquired: Array<{ url: string; raw: string; ok: boolean }>,
  observedAt: string,
  level: 1 | 2 = 1,
  cssTexts: string[] = [],
  l2: L2DomSnapshot | null = null,
): PresentationObservation[] {
  const out: PresentationObservation[] = [];
  for (const a of acquired) {
    if (!a.ok || !a.raw || !isHtmlDocument(a.raw)) continue;
    const obs = observePresentation({ url: a.url, observedAt, html: a.raw, cssTexts, level, l2 });
    if (obs) out.push(obs);
  }
  return out;
}
