/**
 * Shared family building blocks (product lane, V1).
 *
 * CTA rendering from plan bindings, the single inspect affordance per
 * claim cluster (deletion list item 4), the section shell, and the
 * 44px-target / focus-visible treatment the whole family shares.
 *
 * Nothing here renders owner chrome, evidence panels, or dev
 * diagnostics. This module is public-surface only.
 */

import type { PlannedCtaBinding, PlannedSection } from "./types";
import type { FamilyCtx, MediaAssetRef } from "./types";
import type { VisualScale } from "./hierarchy";
import { SCALE_RHYTHM } from "./hierarchy";
import { InView, type InViewIntent } from "./motion";
import { sectionChrome, generatedCopy, type GeneratedCopy, type SectionChrome } from "./bindings";

export { sectionChrome, generatedCopy, type GeneratedCopy, type SectionChrome };

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Focus-visible ring treatment shared by every interactive family element. */
export const FOCUS_RING =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

/** Focus-visible ring for dark sections (inverse ring color). */
export const FOCUS_RING_INVERSE =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring-inverse";

/** 44px minimum touch target (token-model 7.4). */
const TARGET_44 = "min-h-[44px] min-w-[44px]";

/** Primary button: the money action. Sans, never display font (token-model 3.2). */
export const BTN_PRIMARY = cx(
  "inline-flex items-center justify-center gap-2 rounded-pill px-6 font-body text-body",
  "bg-cta-primary-background text-cta-primary-text hover:bg-cta-primary-hover",
  TARGET_44,
  FOCUS_RING,
);

/** Secondary button. */
export const BTN_SECONDARY = cx(
  "inline-flex items-center justify-center gap-2 rounded-pill px-6 font-body text-body",
  "bg-cta-secondary-background text-cta-secondary-text",
  TARGET_44,
  FOCUS_RING,
);

/** Quiet ghost button for tertiary actions on light sections. */
export const BTN_GHOST = cx(
  "inline-flex items-center justify-center gap-2 rounded-pill border px-6 font-body text-body",
  "border-cta-ghost-border text-cta-ghost-text",
  TARGET_44,
  FOCUS_RING,
);

/** Per-card conversion hook: inline text link (prose-link exemption, token-model 7.4). */
export const HOOK_LINK = cx(
  "font-body text-body text-service-card-hook underline underline-offset-4",
  "hover:opacity-80",
  FOCUS_RING,
  "rounded-sm",
);

/** Resolve a plan CTA binding to an href. Never a URL the renderer must trust blindly. */
export function ctaHref(cta: PlannedCtaBinding, ctx: FamilyCtx): string {
  switch (cta.kind) {
    case "call":
      return cta.target.startsWith("tel:") ? cta.target : "tel:" + cta.target;
    case "estimate":
    case "quote-start":
      return "#estimate";
    case "schedule":
      return "#schedule";
    case "see-work":
      return "#projects";
    case "service-line":
      return "#services";
    case "newsletter":
      return "#newsletter";
    case "content":
      return "#content";
    case "social":
      return "#social";
    case "ask":
      return ctx.askHref;
    default:
      return "#";
  }
}

/**
 * One CTA binding rendered at its tier. The primary is conversion-framed:
 * a call CTA reads "Call (970) 245-3869", never raw E.164 (deletion list item 8).
 */
export function Cta({
  cta,
  ctx,
  tone,
}: {
  cta: PlannedCtaBinding;
  ctx: FamilyCtx;
  /** "button" for section-level actions, "hook" for per-card conversion hooks. */
  tone?: "button" | "hook";
}): JSX.Element {
  const href = ctaHref(cta, ctx);
  if (cta.kind === "call") {
    const label = "Call " + cta.display;
    return (
      <a href={href} className={BTN_PRIMARY} aria-label={label}>
        {label}
      </a>
    );
  }
  if (cta.tier === "primary") {
    return (
      <a href={href} className={BTN_PRIMARY}>
        {cta.label}
      </a>
    );
  }
  if (tone === "hook") {
    return (
      <a href={href} className={HOOK_LINK}>
        {cta.label} <span aria-hidden="true">{"\u2192"}</span>
      </a>
    );
  }
  if (cta.tier === "tertiary") {
    return (
      <a href={href} className={cx("font-body text-small underline underline-offset-4", FOCUS_RING)}>
        {cta.label}
      </a>
    );
  }
  return (
    <a href={href} className={BTN_SECONDARY}>
      {cta.label}
    </a>
  );
}

/** Formatted tap-to-call link. The display is always the formatted number. */
export function PhoneLink({
  tel,
  display,
  className,
}: {
  tel: string;
  display: string;
  className?: string;
}): JSX.Element {
  const href = tel.startsWith("tel:") ? tel : "tel:" + tel;
  return (
    <a href={href} className={cx(TARGET_44, "inline-flex items-center", FOCUS_RING, className)}>
      {display}
    </a>
  );
}

/**
 * Responsive image from an acquired media asset. Emits srcset/sizes when
 * the media lane supplied real variants (phones never fetch desktop
 * bytes); falls back to a plain img for legacy single-URL assets. Alt
 * text is evidence-derived and always present. Binding kind:
 * object-field (url/alt/srcset all come off the acquired asset ref).
 */
export function ResponsiveImage({
  asset,
  sizes,
  eager,
  className,
}: {
  asset: MediaAssetRef;
  /** Sizes hint for the layout slot, e.g. "(max-width: 768px) 100vw, 50vw". */
  sizes?: string;
  /** Above-the-fold imagery loads eager; everything else lazy. */
  eager?: boolean;
  className?: string;
}): JSX.Element {
  const srcset =
    asset.srcset && asset.srcset.length > 0
      ? asset.srcset.map((v) => v.url + " " + v.width + "w").join(", ")
      : undefined;
  return (
    <img
      src={asset.url}
      alt={asset.alt}
      srcSet={srcset}
      sizes={srcset && sizes ? sizes : undefined}
      width={asset.width}
      height={asset.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

/**
 * The single subtle inspect affordance for one claim cluster (deletion
 * list item 4; 07 inspect/trust mode). One per cluster section, never
 * repeated under every card and never on the hero image. Routes to the
 * ObjectView page, the working model for WhyThis lineage.
 */
export function InspectAffordance({
  ctx,
  objectId,
  label,
  inverse,
}: {
  ctx: FamilyCtx;
  objectId: string;
  label?: string;
  /** Light treatment for dark sections. */
  inverse?: boolean;
}): JSX.Element {
  return (
    <a
      href={ctx.inspectHrefFor(objectId)}
      data-inspect-cluster={objectId}
      className={cx(
        "inline-flex items-center font-body text-small underline underline-offset-4 rounded-sm",
        inverse ? "text-text-inverse-muted hover:text-text-inverse" : "text-text-muted hover:text-text-primary",
        inverse ? FOCUS_RING_INVERSE : FOCUS_RING,
      )}
    >
      {label ?? "Why this?"}
    </a>
  );
}

/**
 * Section shell: rhythm, container, and the semantic heading.
 *
 * Binding contract (bindings.ts):
 * - `chrome` accepts ONLY GeneratedCopy-branded strings: generic
 *   presentation chrome ("Recent work", "Services"), never business
 *   facts. A plain string does not typecheck here.
 * - Business facts (service names, owner identity) render at the
 *   component's own factual sites from typed bindings, never through
 *   this chrome.
 * - `scale` sets the visual rhythm (PRIMARY breathes, UTILITY stays
 *   quiet) and is recorded as data-visual-scale for tests.
 * - `motion` wraps the section BODY (not the heading) in the typed
 *   motion vocabulary. Content never depends on the animation.
 */
export function SectionShell({
  id,
  chrome,
  dark,
  children,
  component,
  variant,
  labelledBy,
  scale,
  motion,
}: {
  id?: string;
  chrome?: SectionChrome;
  dark?: boolean;
  children: React.ReactNode;
  /** Registry name, recorded for tests and the lab surface (inert data attributes). */
  component: string;
  variant: string;
  labelledBy?: string;
  /** Visual scale; defaults to SECONDARY rhythm when the caller has no scale opinion. */
  scale?: VisualScale;
  /** Typed motion intent for the section body; "none"/absent renders no wrapper. */
  motion?: InViewIntent | "none";
}): JSX.Element {
  const title = chrome?.title;
  const kicker = chrome?.kicker;
  const intro = chrome?.intro;
  const headingId = labelledBy ?? (id ? id + "-heading" : undefined);
  const resolvedScale: VisualScale = scale ?? "SECONDARY";
  const body =
    motion && motion !== "none" ? (
      <InView intent={motion}>{children}</InView>
    ) : (
      <>{children}</>
    );
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : labelledBy}
      data-component={component}
      data-variant={variant}
      data-visual-scale={resolvedScale}
      className={cx(
        SCALE_RHYTHM[resolvedScale],
        dark ? "bg-surface-brand text-text-inverse" : "bg-surface-content text-text-primary",
      )}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
        {(kicker || title || intro) && (
          <div className="mb-8 max-w-[65ch] md:mb-12">
            {kicker && (
              <p className="mb-3 font-body text-caption uppercase tracking-[0.08em] text-accent-craft-text">
                {kicker}
              </p>
            )}
            {title && (
              <h2
                id={headingId}
                className={cx(
                  "font-display text-h2",
                  dark ? "text-text-inverse" : "text-text-heading",
                )}
              >
                {title}
              </h2>
            )}
            {intro && <p className="mt-4 font-body text-lead text-text-muted">{intro}</p>}
          </div>
        )}
        {body}
      </div>
    </section>
  );
}

/** First sentence of a description, for hero subheads (evidence-derived, never invented). */
export function firstSentence(text: string, maxChars = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean === "") return "";
  const m = clean.match(/^(.{20,180}?[.!?])(\s|$)/);
  const sentence = m ? m[1] : clean.slice(0, maxChars);
  return sentence.length > maxChars ? sentence.slice(0, maxChars).trimEnd() + "..." : sentence;
}

/**
 * Human hours from a machine hours string. "Mo,Tu,We,Th,Fr 07:30-16:00"
 * becomes "Mon-Fri 7:30 AM - 4:00 PM". Consecutive days collapse to a
 * range; non-consecutive days list out. Pure and deterministic. Anything
 * that does not parse as day-list + HH:MM-HH:MM passes through untouched:
 * never invent hours, never reformat what is not understood.
 */
const HOURS_DAY_SHORT: Record<string, string> = {
  mo: "Mon",
  tu: "Tue",
  we: "Wed",
  th: "Thu",
  fr: "Fri",
  sa: "Sat",
  su: "Sun",
};
const HOURS_DAY_ORDER = ["mo", "tu", "we", "th", "fr", "sa", "su"];
const HOURS_PATTERN = /^([A-Za-z]{2}(?:,[A-Za-z]{2})*)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

function formatHoursTime(h: number, min: string): string {
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + ":" + min + " " + ap;
}

export function formatHoursDisplay(raw: string): string {
  const s = (raw ?? "").trim();
  const m = HOURS_PATTERN.exec(s);
  if (!m) return s;
  const days = m[1]
    .split(",")
    .map((d) => d.toLowerCase())
    .filter((d) => HOURS_DAY_SHORT[d] !== undefined);
  if (days.length === 0) return s;
  const h1 = Number(m[2]);
  const h2 = Number(m[4]);
  const min1 = Number(m[3]);
  const min2 = Number(m[5]);
  if (
    !Number.isInteger(h1) || !Number.isInteger(h2) ||
    h1 > 23 || h2 > 23 || min1 > 59 || min2 > 59
  ) {
    return s;
  }
  // Collapse consecutive day runs in week order (Mon-Fri); list the rest.
  const idx = [...new Set(days.map((d) => HOURS_DAY_ORDER.indexOf(d)))].sort((a, b) => a - b);
  const parts: string[] = [];
  let runStart = idx[0];
  let runPrev = idx[0];
  for (let i = 1; i <= idx.length; i++) {
    const cur = idx[i];
    if (cur === runPrev + 1) {
      runPrev = cur;
      continue;
    }
    parts.push(
      runStart === runPrev
        ? HOURS_DAY_SHORT[HOURS_DAY_ORDER[runStart]]
        : HOURS_DAY_SHORT[HOURS_DAY_ORDER[runStart]] +
          "-" +
          HOURS_DAY_SHORT[HOURS_DAY_ORDER[runPrev]],
    );
    runStart = cur;
    runPrev = cur;
  }
  return (
    parts.join(", ") +
    " " +
    formatHoursTime(h1, m[3]) +
    " - " +
    formatHoursTime(h2, m[5])
  );
}

/** Props every family section component receives. */
export interface FamilySectionProps {
  section: PlannedSection;
  ctx: FamilyCtx;
}
