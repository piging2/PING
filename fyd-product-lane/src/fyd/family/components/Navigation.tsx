/**
 * Navigation (family registry #1). Job: CONVERT.
 *
 * taxonomic: nav links name the service LINES the business sells by, never
 * the fixed generic Home/About/Services/Explore set (deletion list item 11).
 * minimal: logo + phone + primary CTA for small screens and small taxonomies.
 *
 * Responsive contract: 375/390 collapse to logo + phone + primary CTA; on
 * touch a sticky bottom call/estimate bar appears after the hero and never
 * covers the primary CTA.
 */

import { Cta, FOCUS_RING, PhoneLink, cx, formatHoursDisplay, type FamilySectionProps } from "../shared";
import { mediaForAsset, mediaBindingsFor, objectsForRole } from "../types";

export function Navigation({ section, ctx }: FamilySectionProps): JSX.Element {
  const taxonomic = section.variant === "taxonomic";
  const services = objectsForRole(ctx, section, "service");
  const primary = section.ctaBindings.find((c) => c.tier === "primary") ?? null;
  const phoneCta = section.ctaBindings.find((c) => c.kind === "call") ?? null;

  const logoBinding = mediaBindingsFor(section, "logo-mark")[0];
  const logo = logoBinding ? mediaForAsset(ctx, logoBinding.assetId) : null;

  const hoursRaw = ctx.owner ? String(ctx.owner.fields["hours"] ?? "").trim() : "";
  const hours = formatHoursDisplay(hoursRaw);

  return (
    <>
      <header
        data-component="Navigation"
        data-variant={section.variant}
        className="sticky top-0 z-40 border-b border-border-subtle bg-nav-surface"
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-4 py-3 md:px-8">
          <a
            href="#top"
            className={cx("flex min-h-[44px] items-center gap-3", FOCUS_RING, "rounded-md")}
            aria-label={ctx.legalName + " home"}
          >
            {logo && (
              <img src={logo.url} alt={ctx.legalName + " logo"} className="h-10 w-auto" />
            )}
            <span className="font-body text-small font-semibold text-nav-link-active">
              {ctx.legalName}
            </span>
          </a>

          {taxonomic && services.length > 0 && (
            <nav aria-label="Services" className="hidden items-center gap-1 md:flex">
              {services.slice(0, 6).map((s) => (
                <a
                  key={s.id}
                  href="#services"
                  className={cx(
                    "inline-flex min-h-[44px] items-center px-3 font-body text-small text-nav-link-text",
                    "hover:text-nav-link-active",
                    FOCUS_RING,
                    "rounded-md",
                  )}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            {hours !== "" && (
              <span className="hidden font-body text-small text-text-muted lg:inline">{hours}</span>
            )}
            {phoneCta && (
              <PhoneLink
                tel={phoneCta.target}
                display={phoneCta.display}
                className="hidden px-2 font-body text-body font-semibold text-text-heading sm:inline-flex"
              />
            )}
            {primary && <Cta cta={primary} ctx={ctx} />}
          </div>
        </div>
      </header>

      {/* Sticky bottom call/estimate bar on touch: conversion without scroll,
          never covering the primary CTA. Hidden on md+ where the header carries it. */}
      {primary && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-nav-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <div className="[&>a]:flex [&>a]:w-full">
            <Cta cta={primary} ctx={ctx} />
          </div>
          <span className="sr-only">Primary action, also available above</span>
        </div>
      )}
    </>
  );
}
