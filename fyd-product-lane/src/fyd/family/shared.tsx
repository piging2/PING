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
import type { FamilyCtx } from "./types";

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
        {cta.label} {"->"}
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
 * Section shell: rhythm, container, and the semantic heading. Section
 * titles are renderer-owned presentation defaults; the business facts
 * come from the bindings.
 */
export function SectionShell({
  id,
  title,
  kicker,
  intro,
  dark,
  children,
  component,
  variant,
  labelledBy,
}: {
  id?: string;
  title?: string;
  kicker?: string;
  intro?: string;
  dark?: boolean;
  children: React.ReactNode;
  /** Registry name, recorded for tests and the lab surface (inert data attributes). */
  component: string;
  variant: string;
  labelledBy?: string;
}): JSX.Element {
  const headingId = labelledBy ?? (id ? id + "-heading" : undefined);
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      data-component={component}
      data-variant={variant}
      className={cx(
        "py-16 md:py-24",
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
        {children}
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

/** Props every family section component receives. */
export interface FamilySectionProps {
  section: PlannedSection;
  ctx: FamilyCtx;
}
