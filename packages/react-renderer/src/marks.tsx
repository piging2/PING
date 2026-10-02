/**
 * FYD object logo marks: irregular borders, not circles.
 *
 * Binding product directive (Nolan, 2026-10-02, filed
 * ~/workspace/directives/2026-10-02-fyd-object-logos.md):
 * FYD objects do NOT use circles. They use irregular border logos.
 * Happy Place (HPP) = tape measure. Each business gets its own
 * irregular-border logo mark.
 *
 * Presentation-layer only. The semantic render model (ObjectGraph +
 * SiteSpec + ViewerContext) is unchanged; this adapter maps a business
 * to its mark and renders it. No facts, evidence, or authority here.
 *
 * NEW piging2 code (not a harvest): the source FYD renderer has no
 * logo-mark concept; this implements Nolan's directive directly.
 * TARGET OWNER: packages/react-renderer (piging2 presentation adapter)
 * PROOFS: [5]
 */

import React from "react";

/** The known logo marks. Add new marks here as businesses onboard. */
export type LogoMarkId = "tape-measure" | "pipe-wrench" | "generic";

/**
 * Irregular border: a hand-authored organic blob path. Deliberately NOT
 * a circle and NOT a rounded rect: the border itself is the brand signal
 * that this is an FYD object mark, not a generic avatar.
 */
function IrregularBorder({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width="72"
      height="72"
      role="img"
      aria-hidden="true"
      data-logo-border="irregular"
    >
      <path
        d="M52,4 C74,6 92,22 94,44 C96,66 82,88 58,93 C34,98 10,84 6,60 C2,36 18,12 40,7 C44,6 48,4 52,4 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      {children}
    </svg>
  );
}

/**
 * Tape measure mark (Happy Place). A tape case with extended tape:
 * the tool of the carpentry trade, geometric and recognizable at
 * small sizes.
 */
function TapeMeasureMark() {
  return (
    <g data-mark-shape="tape-measure" stroke="currentColor" fill="none" strokeWidth="3" strokeLinecap="round">
      {/* case */}
      <rect x="28" y="38" width="30" height="26" rx="8" />
      {/* belt clip */}
      <line x1="34" y1="38" x2="34" y2="30" />
      {/* extended tape */}
      <line x1="58" y1="51" x2="82" y2="51" />
      {/* tape end hook */}
      <line x1="82" y1="51" x2="82" y2="58" />
      {/* measurement ticks */}
      <line x1="64" y1="51" x2="64" y2="55" />
      <line x1="70" y1="51" x2="70" y2="55" />
      <line x1="76" y1="51" x2="76" y2="55" />
      {/* case window */}
      <rect x="39" y="47" width="8" height="8" fill="currentColor" stroke="none" />
    </g>
  );
}

/**
 * Pipe wrench mark (Coppersmith Plumbing). Adjustable jaw + handle:
 * the tool of the plumbing trade.
 */
function PipeWrenchMark() {
  return (
    <g data-mark-shape="pipe-wrench" stroke="currentColor" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {/* handle */}
      <line x1="30" y1="72" x2="58" y2="44" />
      {/* fixed jaw */}
      <path d="M58,44 L70,32 L66,26 L56,36 Z" />
      {/* adjustable jaw */}
      <path d="M62,48 L76,40 L72,34 L60,42 Z" />
      {/* knurl adjustment */}
      <line x1="52" y1="54" x2="58" y2="60" />
      {/* handle grip end */}
      <line x1="30" y1="72" x2="26" y2="76" />
    </g>
  );
}

/** Generic mark: abstract FYD sigil for businesses without an assigned mark. */
function GenericMark() {
  return (
    <g data-mark-shape="generic" stroke="currentColor" fill="none" strokeWidth="3" strokeLinecap="round">
      <path d="M35,65 L50,30 L65,65 Z" />
      <line x1="42" y1="52" x2="58" y2="52" />
    </g>
  );
}

const MARK_COMPONENTS: Record<LogoMarkId, () => React.JSX.Element> = {
  "tape-measure": TapeMeasureMark,
  "pipe-wrench": PipeWrenchMark,
  "generic": GenericMark,
};

/**
 * Default business -> mark mapping. Presentation config owned by the
 * adapter; the semantic model never names a mark. Override via renderer
 * options for new businesses without touching this file's defaults.
 */
const DEFAULT_MARKS: Record<string, LogoMarkId> = {
  // Happy Place Carpentry LLC (Nolan's directive: the mark is a tape measure)
  "website-business-6fa5ebd99d72c4cb": "tape-measure",
  // Coppersmith Plumbing - HVAC - Mechanical
  "website-business-2f1327c09d622175": "pipe-wrench",
};

/**
 * Resolve a business's logo mark. Explicit id mapping first, caller
 * overrides second, generic irregular mark as the honest fallback.
 * Never a circle.
 */
export function resolveLogoMark(
  objectId: string,
  overrides?: Record<string, LogoMarkId>,
): LogoMarkId {
  if (overrides && objectId in overrides) return overrides[objectId];
  return DEFAULT_MARKS[objectId] ?? "generic";
}

/**
 * Real image assets for marks, when the owner supplies one.
 * Nolan 2026-10-02: Happy Place's tape-measure mark is the real
 * hand-drawn logo (transparent irregular-cutout webp from the owner's
 * original), not the geometric SVG placeholder. The cutout's own edge
 * IS the irregular border (no circles, no badge box). Caller-overridable
 * via imageUrls; the semantic model never names images.
 */
export const DEFAULT_MARK_IMAGE_URLS: Partial<Record<LogoMarkId, string>> = {
  "tape-measure": "assets/marks/happy-place-tape-measure.webp",
};

/** Resolve a mark's image URL: explicit caller mapping first, then default. */
export function resolveMarkImage(
  markId: LogoMarkId,
  imageUrls?: Partial<Record<LogoMarkId, string>>,
): string | null {
  if (imageUrls && markId in imageUrls) return imageUrls[markId] ?? null;
  return DEFAULT_MARK_IMAGE_URLS[markId] ?? null;
}

/**
 * The business logo mark: the owner's real image when one is registered
 * for the mark (irregular cutout, no border box), otherwise the
 * irregular-border SVG trade mark. data-logo-mark carries the mark id
 * for tests and future styling.
 */
export function BusinessLogoMark({
  objectId,
  title,
  overrides,
  imageUrls,
}: {
  objectId: string;
  title: string;
  overrides?: Record<string, LogoMarkId>;
  imageUrls?: Partial<Record<LogoMarkId, string>>;
}) {
  const markId = resolveLogoMark(objectId, overrides);
  const imgSrc = resolveMarkImage(markId, imageUrls);
  if (imgSrc) {
    return (
      <span data-logo-mark={markId} role="img" aria-label={`${title} logo`}>
        <img
          className="fyd-logo-mark-img"
          data-logo-mark-img={markId}
          src={imgSrc}
          alt={`${title} logo`}
          width={96}
          height={96}
        />
      </span>
    );
  }
  const Mark = MARK_COMPONENTS[markId];
  return (
    <span data-logo-mark={markId} role="img" aria-label={`${title} logo`}>
      <IrregularBorder>
        <Mark />
      </IrregularBorder>
    </span>
  );
}

/**
 * Scoped CSS for the logo overlay. Mandated by Nolan's binding product
 * directive (2026-10-02-fyd-logo-overlay.md): click the logo -> it
 * becomes the website covering almost the whole background; overlay
 * text uses a very high-contrast OUTLINE (not a drop shadow).
 *
 * This is the single exception to the adapter's no-CSS rule: the
 * directive explicitly mandates the visual treatment. Nothing else
 * in this adapter emits styling.
 */
export const LOGO_OVERLAY_CSS = `
.fyd-logo-overlay > summary { cursor: pointer; list-style: none; display: inline-block; }
.fyd-logo-overlay > summary::-webkit-details-marker { display: none; }
.fyd-logo-overlay [data-logo-overlay-backdrop] {
  display: none;
  position: fixed;
  inset: 3vh 3vw;
  z-index: 50;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: #0a0a0a;
}
.fyd-logo-overlay[open] [data-logo-overlay-backdrop] { display: flex; }
.fyd-logo-overlay [data-logo-overlay-backdrop] svg[data-logo-overlay-mark],
.fyd-logo-overlay [data-logo-overlay-backdrop] img[data-logo-overlay-mark] {
  width: min(60vmin, 480px);
  height: auto;
  color: #fff;
}
/* Nolan 2026-10-02: the logo mark rocks on hover. Pure CSS, zero JS. */
@keyframes fyd-logo-rock {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-9deg); }
  50% { transform: rotate(7deg); }
  75% { transform: rotate(-4deg); }
}
.fyd-logo-overlay > summary:hover .fyd-logo-mark-img,
.fyd-logo-overlay > summary:hover [data-logo-border="irregular"] {
  animation: fyd-logo-rock 0.6s ease-in-out;
  transform-origin: 50% 80%;
}
.fyd-logo-mark-img { display: inline-block; }
`;

/**
 * Clickable logo -> immersive overlay. Uses <details>/<summary> so the
 * interaction works in pure static HTML with zero JavaScript: clicking
 * the logo mark toggles the [open] state, and the CSS above expands the
 * mark to cover almost the whole background.
 *
 * Overlay text is SVG <text> with stroke (paint-order: stroke): a true
 * high-contrast OUTLINE, not a drop shadow, readable on any background.
 */
export function BusinessLogoOverlay({
  objectId,
  title,
  overrides,
  imageUrls,
}: {
  objectId: string;
  title: string;
  overrides?: Record<string, LogoMarkId>;
  imageUrls?: Partial<Record<LogoMarkId, string>>;
}) {
  const markId = resolveLogoMark(objectId, overrides);
  const imgSrc = resolveMarkImage(markId, imageUrls);
  const Mark = MARK_COMPONENTS[markId];
  return (
    <details className="fyd-logo-overlay" data-logo-overlay data-logo-mark={markId}>
      <summary data-logo-overlay-trigger aria-label={`Open ${title} immersive view`}>
        <BusinessLogoMark objectId={objectId} title={title} overrides={overrides} imageUrls={imageUrls} />
      </summary>
      <div data-logo-overlay-backdrop aria-hidden="true">
        {imgSrc ? (
          <img
            data-logo-overlay-mark
            src={imgSrc}
            alt={`${title} logo large`}
          />
        ) : (
        <svg
          viewBox="0 0 100 100"
          data-logo-overlay-mark
          role="img"
          aria-label={`${title} logo large`}
        >
          <path
            d="M52,4 C74,6 92,22 94,44 C96,66 82,88 58,93 C34,98 10,84 6,60 C2,36 18,12 40,7 C44,6 48,4 52,4 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <Mark />
        </svg>
        )}
        <svg
          viewBox="0 0 600 120"
          data-logo-overlay-text
          role="img"
          aria-label={title}
          style={{ width: "min(80vmin, 640px)", height: "auto" }}
        >
          <text
            x="300"
            y="84"
            textAnchor="middle"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="8"
            paintOrder="stroke"
            fontSize="56"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
          >
            {title}
          </text>
        </svg>
      </div>
    </details>
  );
}
