/**
 * Footer (family registry #10). Job: REASSURE (credibility) and, in the
 * plus-capture variant, hold the newsletter capture at the page end.
 *
 * Credibility: business identity, license line when verified, service
 * area summary, and the honest provenance note. Attribution is the
 * neutral "Powered by FYD" lock, not a FYD SOCIAL demo badge (deletion
 * list item 1).
 *
 * No repeated "Why this?", no verdicts, no sequence numbers, no owner
 * chrome. Legal links are placeholders anchored to the page, never
 * fabricated policy text.
 */

import { InspectAffordance, cx, type FamilySectionProps } from "../shared";
import { adaptedAddress } from "../../proceduralize/planner";
import { SCHEMA_ROLES } from "../../sitespec/schemas";
import type { PingObject } from "@/lib/ping/types";

const HONEST_DISCLAIMER =
  "We cannot guarantee openings for the date you choose. We will confirm a time that works for you.";

function licenseLine(ctx: FamilySectionProps["ctx"]): string | null {
  if (!ctx.owner) return null;
  const v = ctx.owner.fields["license_number"];
  const s = typeof v === "string" ? v.trim() : "";
  return s !== "" ? s : null;
}

/** Location objects from the graph (the planner's Grouped.locations equivalent). */
function locationsOf(ctx: FamilySectionProps["ctx"]): PingObject[] {
  return ctx.input.graph.objects.filter(
    (o) => SCHEMA_ROLES.location.includes(o.schema) && o.visibility === "public",
  );
}

/**
 * The locality line renders through the graph field-name adapter
 * (planner.ts): location-object locality components, else the owner's own
 * locality field. Never invented.
 */
function localityLine(ctx: FamilySectionProps["ctx"]): string | null {
  const lines = adaptedAddress(ctx.owner, locationsOf(ctx)).lines;
  return lines.length > 0 ? lines[0] : null;
}

/**
 * Footer anchor links must never be dead: each link renders only when the
 * target component is actually planned (ServiceGrid owns #services,
 * ProjectGallery owns #projects, ServiceArea owns #service-area).
 * Ineligible sections mean no link, not a dangling anchor.
 */
function plannedComponents(ctx: FamilySectionProps["ctx"]): Set<string> {
  return new Set(ctx.input.plan.sections.map((s) => s.component));
}

function footerLink(
  planned: Set<string>,
  component: string,
  href: string,
  label: string,
): JSX.Element | null {
  if (!planned.has(component)) return null;
  return (
    <a
      href={href}
      className={cx(
        "inline-flex min-h-[44px] items-center font-body text-small text-text-muted hover:text-text-primary",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-sm",
      )}
    >
      {label}
    </a>
  );
}

export function Footer({ section, ctx }: FamilySectionProps): JSX.Element {
  const license = licenseLine(ctx);
  const locality = localityLine(ctx);
  const areas = ctx.owner
    ? (Array.isArray(ctx.owner.fields["service_areas"])
        ? (ctx.owner.fields["service_areas"] as string[])
        : []
      ).filter((a) => typeof a === "string" && a.trim() !== "")
    : [];
  const capture = section.variant === "credibility-plus-capture";
  // The capture block renders ONLY on an evidenced newsletter CTA
  // binding (bindings.ts rule 3). The planner plans this variant on
  // newsletter evidence and always attaches the binding; without it the
  // footer stays credibility-only rather than inventing a funnel.
  const newsletterCta = section.ctaBindings.find((c) => c.kind === "newsletter") ?? null;
  const planned = plannedComponents(ctx);

  return (
    <footer
      data-component="Footer"
      data-variant={section.variant}
      className="bg-footer-surface text-footer-text"
    >
      {capture && newsletterCta && (
        <div className="border-b border-border-subtle">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-8">
            <p className="font-body text-body text-text-muted">{HONEST_DISCLAIMER}</p>
            <form
              action="#newsletter"
              method="get"
              className="mt-4 flex max-w-[560px] flex-col gap-3 sm:flex-row"
            >
              <label className="sr-only" htmlFor="footer-email">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                name="email"
                required
                placeholder="Email address"
                autoComplete="email"
                className="min-h-[44px] flex-1 rounded-pill border border-border-strong bg-surface-content px-5 font-body text-body text-text-primary placeholder:text-text-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              />
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center rounded-pill bg-cta-primary-background px-6 font-body text-body text-cta-primary-text hover:bg-cta-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <p className="font-body text-body font-semibold text-text-heading">{ctx.legalName}</p>
            {locality && (
              <p className="mt-2 font-body text-small text-text-muted">{locality}</p>
            )}
            {license && (
              <p className="mt-2 font-body text-small text-text-muted">Licensed {license}</p>
            )}
            {areas.length > 0 && (
              <p className="mt-2 font-body text-small text-text-muted">
                Serving {areas.slice(0, 4).join(", ")}
                {areas.length > 4 ? ", and more" : ""}
              </p>
            )}
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-1">
            {footerLink(planned, "ServiceGrid", "#services", "Services")}
            {footerLink(planned, "ProjectGallery", "#projects", "Recent work")}
            {footerLink(planned, "ServiceArea", "#service-area", "Service area")}
          </nav>
          <div>
            <p className="font-body text-small text-text-muted">Powered by FYD</p>
            <div className="mt-3">
              {ctx.owner && <InspectAffordance ctx={ctx} objectId={ctx.owner.id} />}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
