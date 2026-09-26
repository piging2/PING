/**
 * Hero (family registry #2). Job: PERSUADE.
 *
 * Variants: media-rich (image-overlay), identity-led (editorial),
 * service-led (routes service discovery), local-action (phone-forward
 * conversion for emergency-prone trades).
 *
 * The H1 lives here and only here, and it is editorial identity copy,
 * never the legal business name by default (headline rule). When the
 * plan carries no headline evidence (pending), the renderer does NOT
 * fall back to the legal name: no H1 is rendered rather than an
 * invented one.
 *
 * Responsive contract: 375/390 media-rich collapses to banner-above-copy
 * (the image never sits behind small text at low contrast); CTAs stack
 * full-width and thumb-reachable.
 */

import { Cta, InspectAffordance, cx, firstSentence, type FamilySectionProps } from "../shared";
import { mediaForAsset, mediaBindingsFor, objectsForRole } from "../types";

function HeroCtas({ section, ctx }: FamilySectionProps): JSX.Element {
  const primary = section.ctaBindings.find((c) => c.tier === "primary") ?? null;
  const secondary = section.ctaBindings.filter((c) => c.tier === "secondary");
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {primary && <Cta cta={primary} ctx={ctx} />}
      {secondary.slice(0, 3).map((c, i) => (
        <Cta key={c.kind + "-" + i} cta={c} ctx={ctx} />
      ))}
    </div>
  );
}

function HeroHeadline({
  section,
  inverse,
}: FamilySectionProps & { inverse?: boolean }): JSX.Element | null {
  const h1 = section.headline?.h1 ?? null;
  if (!h1) return null;
  // `inverse` marks the desktop overlay treatment: on narrow viewports the
  // copy sits on a light card (banner-above-copy), so inverse text applies
  // at md+ only, never behind small text at low contrast.
  return (
    <h1
      className={cx(
        "font-display text-hero",
        inverse ? "text-hero-headline md:text-hero-headline-inverse" : "text-hero-headline",
      )}
    >
      {h1}
    </h1>
  );
}

function HeroSubhead({
  ctx,
  inverse,
}: {
  ctx: FamilySectionProps["ctx"];
  inverse?: boolean;
}): JSX.Element | null {
  const owner = ctx.owner;
  if (!owner || owner.description.trim() === "") return null;
  return (
    <p
      className={cx(
        "mt-6 max-w-[65ch] font-body text-lead",
        inverse ? "text-hero-subhead md:text-hero-subhead-inverse" : "text-hero-subhead",
      )}
    >
      {firstSentence(owner.description)}
    </p>
  );
}

function QuietInspect({
  section,
  ctx,
  inverse,
}: FamilySectionProps & { inverse?: boolean }): JSX.Element | null {
  const owner = ctx.owner;
  if (!owner) return null;
  // One subtle affordance for the hero claim cluster. Never on the image.
  return (
    <div className="mt-8">
      <InspectAffordance ctx={ctx} objectId={owner.id} inverse={inverse} />
    </div>
  );
}

function MediaRichHero({ section, ctx }: FamilySectionProps): JSX.Element {
  const binding = mediaBindingsFor(section, "hero-documentary")[0];
  const media = binding ? mediaForAsset(ctx, binding.assetId) : null;
  return (
    <section
      id="top"
      data-component="Hero"
      data-variant="media-rich"
      className="relative bg-surface-content"
      aria-label="Introduction"
    >
      {media && (
        <>
          {/* Mobile: banner above the copy. Desktop: full-bleed overlay. */}
          <div className="md:absolute md:inset-0">
            <img
              src={media.url}
              alt={media.alt}
              className="h-56 w-full object-cover sm:h-72 md:h-full"
            />
          </div>
          <div
            aria-hidden="true"
            className="hidden bg-hero-scrim/70 md:absolute md:inset-0 md:block"
          />
        </>
      )}
      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-40">
        <div className="max-w-[700px] rounded-lg bg-surface-content/95 p-6 md:bg-transparent md:p-0">
          <HeroHeadline section={section} ctx={ctx} inverse={!!media} />
          <HeroSubhead ctx={ctx} inverse={!!media} />
          <HeroCtas section={section} ctx={ctx} />
          <QuietInspect section={section} ctx={ctx} />
        </div>
      </div>
    </section>
  );
}

function IdentityLedHero({ section, ctx }: FamilySectionProps): JSX.Element {
  const binding = mediaBindingsFor(section, "logo-mark")[0];
  const logo = binding ? mediaForAsset(ctx, binding.assetId) : null;
  return (
    <section
      id="top"
      data-component="Hero"
      data-variant="identity-led"
      className="bg-surface-content"
      aria-label="Introduction"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8 md:py-32">
        <div className="max-w-[800px]">
          {logo && (
            <img
              src={logo.url}
              alt={ctx.legalName + " logo"}
              className="mb-8 h-16 w-auto md:h-20"
            />
          )}
          <HeroHeadline section={section} ctx={ctx} />
          <HeroSubhead ctx={ctx} />
          <HeroCtas section={section} ctx={ctx} />
          <QuietInspect section={section} ctx={ctx} />
        </div>
      </div>
    </section>
  );
}

function ServiceLedHero({ section, ctx }: FamilySectionProps): JSX.Element {
  const services = objectsForRole(ctx, section, "service");
  const lineCtas = section.ctaBindings.filter((c) => c.kind === "service-line");
  const lines: string[] =
    lineCtas.length > 0
      ? lineCtas.map((c) => c.label)
      : services.slice(0, 4).map((s) => s.title);
  return (
    <section
      id="top"
      data-component="Hero"
      data-variant="service-led"
      className="bg-surface-content"
      aria-label="Introduction"
    >
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-20 md:grid-cols-2 md:px-8 md:py-32">
        <div>
          <HeroHeadline section={section} ctx={ctx} />
          <HeroSubhead ctx={ctx} />
          <HeroCtas section={section} ctx={ctx} />
          <QuietInspect section={section} ctx={ctx} />
        </div>
        <nav aria-label="Service lines" className="md:pt-2">
          <ul className="divide-y divide-border-subtle border-y border-border-subtle">
            {lines.map((label, i) => (
              <li key={i}>
                <a
                  href="#services"
                  className={cx(
                    "flex min-h-[44px] items-center justify-between py-3 font-body text-body text-text-heading",
                    "hover:text-accent-craft-text",
                    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-sm",
                  )}
                >
                  <span>{label}</span>
                  <span aria-hidden="true">{"\u2192"}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}

function LocalActionHero({ section, ctx }: FamilySectionProps): JSX.Element {
  const phoneCta = section.ctaBindings.find((c) => c.kind === "call") ?? null;
  const areas = ctx.owner
    ? (Array.isArray(ctx.owner.fields["service_areas"])
        ? (ctx.owner.fields["service_areas"] as string[])
        : []
      ).filter((a) => typeof a === "string" && a.trim() !== "")
    : [];
  return (
    <section
      id="top"
      data-component="Hero"
      data-variant="local-action"
      className="bg-surface-brand text-text-inverse"
      aria-label="Introduction"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8 md:py-32">
        <div className="max-w-[800px]">
          <HeroHeadline section={section} ctx={ctx} inverse />
          <HeroSubhead ctx={ctx} inverse />
          {phoneCta && (
            <div className="mt-8">
              <a
                href={phoneCta.target}
                className="inline-flex min-h-[56px] items-center justify-center rounded-pill bg-cta-primary-background px-8 font-body text-h3 text-cta-primary-text hover:bg-cta-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring-inverse"
                aria-label={"Call " + phoneCta.display}
              >
                {phoneCta.display}
              </a>
              <p className="mt-3 font-body text-small text-text-inverse-muted">
                Call now for immediate help
              </p>
            </div>
          )}
          {areas.length > 0 && (
            <p className="mt-6 font-body text-body text-text-inverse-muted">
              Serving {areas.slice(0, 4).join(", ")}
              {areas.length > 4 ? ", and more" : ""}
            </p>
          )}
          <QuietInspect section={section} ctx={ctx} inverse />
        </div>
      </div>
    </section>
  );
}

export function Hero(props: FamilySectionProps): JSX.Element {
  switch (props.section.variant) {
    case "media-rich":
      return <MediaRichHero {...props} />;
    case "service-led":
      return <ServiceLedHero {...props} />;
    case "local-action":
      return <LocalActionHero {...props} />;
    case "identity-led":
    default:
      return <IdentityLedHero {...props} />;
  }
}
