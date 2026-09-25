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

const HONEST_DISCLAIMER =
  "We cannot guarantee openings for the date you choose. We will confirm a time that works for you.";

function licenseLine(ctx: FamilySectionProps["ctx"]): string | null {
  if (!ctx.owner) return null;
  const v = ctx.owner.fields["license_number"];
  const s = typeof v === "string" ? v.trim() : "";
  return s !== "" ? s : null;
}

export function Footer({ section, ctx }: FamilySectionProps): JSX.Element {
  const license = licenseLine(ctx);
  const areas = ctx.owner
    ? (Array.isArray(ctx.owner.fields["service_areas"])
        ? (ctx.owner.fields["service_areas"] as string[])
        : []
      ).filter((a) => typeof a === "string" && a.trim() !== "")
    : [];
  const capture = section.variant === "credibility-plus-capture";

  return (
    <footer
      data-component="Footer"
      data-variant={section.variant}
      className="bg-footer-surface text-footer-text"
    >
      {capture && (
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
            <a
              href="#services"
              className={cx(
                "inline-flex min-h-[44px] items-center font-body text-small text-text-muted hover:text-text-primary",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-sm",
              )}
            >
              Services
            </a>
            <a
              href="#projects"
              className={cx(
                "inline-flex min-h-[44px] items-center font-body text-small text-text-muted hover:text-text-primary",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-sm",
              )}
            >
              Recent work
            </a>
            <a
              href="#service-area"
              className={cx(
                "inline-flex min-h-[44px] items-center font-body text-small text-text-muted hover:text-text-primary",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-sm",
              )}
            >
              Service area
            </a>
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
