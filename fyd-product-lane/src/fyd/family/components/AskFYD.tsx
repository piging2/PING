/**
 * AskFYD entry (family registry #11). Job: INVITE.
 *
 * Ask FYD on the public surface is exactly one quiet affordance:
 * floating-entry (one quiet pill the user opens deliberately) or
 * inline-section (an unobtrusive prompt block). The full
 * evidence-bounded Q&A lives on demand on another surface (deletion
 * list item 14). No object pills, no WhyThis lineage, no evidence
 * panel here.
 *
 * The entry routes to the configured ask target (default #ask-fyd);
 * it never embeds a chat panel in the public DOM.
 */

import { FOCUS_RING, cx, type FamilySectionProps } from "../shared";

function AskPill({ ctx }: { ctx: FamilySectionProps["ctx"] }): JSX.Element {
  return (
    <a
      href={ctx.askHref}
      data-component="AskFYD"
      data-variant="floating-entry"
      aria-label="Ask FYD about this business"
      className={cx(
        // Sits above the mobile sticky call/estimate bar; rests lower on md+.
        "fixed bottom-24 right-4 z-40 inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-pill px-5 md:bottom-6",
        "bg-cta-primary-background text-cta-primary-text shadow-lg hover:bg-cta-primary-hover",
        FOCUS_RING,
      )}
    >
      <span aria-hidden="true" className="font-body text-body font-semibold">
        ?
      </span>
      <span className="font-body text-body">Ask FYD</span>
    </a>
  );
}

function InlineSection({ section, ctx }: FamilySectionProps): JSX.Element {
  return (
    <section
      id="ask-fyd"
      data-component="AskFYD"
      data-variant="inline-section"
      aria-label="Ask FYD"
      className="bg-surface-content"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8">
        <div className="max-w-[65ch] rounded-lg border border-border-subtle bg-surface-raised p-8 shadow-md">
          <h2 className="font-display text-h2 text-text-heading">Questions about the work?</h2>
          <p className="mt-4 font-body text-body text-text-muted">
            Ask about services, scope, or scheduling. Answers come from what we can verify about
            this business.
          </p>
          <a
            href={ctx.askHref}
            className={cx(
              "mt-6 inline-flex min-h-[44px] items-center justify-center rounded-pill px-6 font-body text-body",
              "bg-cta-primary-background text-cta-primary-text hover:bg-cta-primary-hover",
              FOCUS_RING,
            )}
          >
            Ask FYD
          </a>
        </div>
      </div>
    </section>
  );
}

export function AskFYD(props: FamilySectionProps): JSX.Element {
  if (props.section.variant === "inline-section") {
    return <InlineSection {...props} />;
  }
  return <AskPill ctx={props.ctx} />;
}
