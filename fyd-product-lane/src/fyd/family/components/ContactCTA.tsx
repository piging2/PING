/**
 * ContactCTA (family registry #9). Job: CONVERT.
 *
 * conversion-dual: money contact (call + estimate) AND information
 * capture (newsletter, free value) live in the same component but
 * visually separated, so a casual visitor does not feel pressured.
 * value-capture: the value offer alone (lead magnet style).
 *
 * Responsive contract: 375/390 no cramped two-column forms; the capture
 * form stacks and the value statement precedes it.
 */

import { Cta, SectionShell, cx, type FamilySectionProps } from "../shared";

function ConversionDual({ section, ctx }: FamilySectionProps): JSX.Element {
  const phoneCta = section.ctaBindings.find((c) => c.kind === "call") ?? null;
  const estimateCta = section.ctaBindings.find((c) => c.kind === "estimate") ?? null;
  const newsletterCta =
    section.ctaBindings.find((c) => c.kind === "newsletter") ?? null;

  return (
    <SectionShell component="ContactCTA" variant="conversion-dual" dark>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <h2 id="contact-heading" className="font-display text-h2 text-text-inverse">
            Talk to us
          </h2>
          <p className="mt-4 max-w-[45ch] font-body text-body text-text-inverse-muted">
            A real person answers. No phone trees, no ticket queues.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {phoneCta && <Cta cta={phoneCta} ctx={ctx} />}
            {estimateCta && <Cta cta={estimateCta} ctx={ctx} />}
          </div>
        </div>
        <div>
          <h3 className="font-display text-h3 text-text-inverse">Get useful updates</h3>
          <p className="mt-3 max-w-[45ch] font-body text-body text-text-inverse-muted">
            {newsletterCta ? newsletterCta.label : "Occasional notes worth reading."}
          </p>
          <form action="#newsletter" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              placeholder="Email address"
              autoComplete="email"
              className="min-h-[44px] flex-1 rounded-pill border border-border-subtle bg-surface-content px-5 font-body text-body text-text-primary placeholder:text-text-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring-inverse"
            />
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center justify-center rounded-pill bg-cta-primary-background px-6 font-body text-body text-cta-primary-text hover:bg-cta-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring-inverse"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </SectionShell>
  );
}

function ValueCapture({ section, ctx }: FamilySectionProps): JSX.Element {
  const contentCta = section.ctaBindings.find((c) => c.kind === "content") ?? null;
  const newsletterCta = section.ctaBindings.find((c) => c.kind === "newsletter") ?? null;
  return (
    <SectionShell component="ContactCTA" variant="value-capture">
      <div className="max-w-[65ch]">
        <h2 className="font-display text-h2 text-text-heading">Stay in the loop</h2>
        <p className="mt-4 font-body text-lead text-text-muted">
          {contentCta
            ? contentCta.label
            : "Practical notes for people who own their homes and their weekends."}
        </p>
        <form action="#newsletter" method="get" className="mt-8 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="value-email">
            Email address
          </label>
          <input
            id="value-email"
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
            {newsletterCta ? newsletterCta.label : "Sign me up"}
          </button>
        </form>
      </div>
    </SectionShell>
  );
}

export function ContactCTA(props: FamilySectionProps): JSX.Element {
  if (props.section.variant === "value-capture") {
    return <ValueCapture {...props} />;
  }
  return <ConversionDual {...props} />;
}
