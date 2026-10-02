/**
 * Family surfaces (product lane, V1).
 *
 * PUBLIC, OWNER, TRUST, and DEV stay separate by construction (research
 * 07). The public surface (PublicFamilyPage) never consults
 * NEXT_PUBLIC_FYD_DEMO_OWNER_MODE and never renders owner/dev chrome:
 * the flag cannot leak into the public DOM because nothing in the
 * public render path reads it.
 *
 * - OWNER: FamilyOwnerEntry renders a "Customize with FYD" control only
 *   when the caller explicitly opts in (a real owner surface, not an env
 *   flag). It never appears inside PublicFamilyPage.
 * - TRUST: inspect affordances in the public components already route to
 *   ctx.inspectHrefFor(objectId) (ObjectView, the working model for
 *   WhyThis lineage). FamilyInspectLink exposes the same affordance for
 *   other surfaces.
 * - DEV: FamilyLabPanel renders plan diagnostics only when explicitly
 *   enabled. Nothing in the public path enables it.
 */

import type { HomePagePlan } from "../proceduralize/planner";
import { FOCUS_RING, cx } from "./shared";
import type { FamilyCtx } from "./types";

/**
 * The single owner entry affordance. Explicit opt-in only: the caller
 * passes enabled={true} on a real owner surface (e.g. the customize
 * route). Never driven by an environment flag, never inside the public
 * render.
 */
export function FamilyOwnerEntry({
  ctx,
  enabled,
  href,
}: {
  ctx: FamilyCtx;
  enabled: boolean;
  /** Where the owner surface lives. Defaults to the customize entry. */
  href?: string;
}): JSX.Element | null {
  if (!enabled) return null;
  return (
    <a
      href={href ?? "/customize"}
      data-surface="owner-entry"
      className={cx(
        "inline-flex min-h-[44px] items-center rounded-pill border border-border-strong px-5",
        "font-body text-small text-text-primary hover:bg-surface-raised",
        FOCUS_RING,
      )}
    >
      Customize with FYD
    </a>
  );
}

/** Inspect affordance for non-public surfaces; routes to ObjectView. */
export function FamilyInspectLink({
  ctx,
  objectId,
  label,
}: {
  ctx: FamilyCtx;
  objectId: string;
  label?: string;
}): JSX.Element {
  return (
    <a
      href={ctx.inspectHrefFor(objectId)}
      data-surface="trust-inspect"
      className={cx(
        "inline-flex min-h-[44px] items-center font-body text-small text-text-muted underline underline-offset-4",
        "hover:text-text-primary",
        FOCUS_RING,
        "rounded-sm",
      )}
    >
      {label ?? "Inspect this claim"}
    </a>
  );
}

/**
 * DEV/lab diagnostics: plan identity, theme, section order with variant
 * and status. Explicit opt-in only. Never rendered inside the public
 * page; the lab surface mounts it beside the page.
 */
export function FamilyLabPanel({
  plan,
  ctx,
  enabled,
}: {
  plan: HomePagePlan;
  ctx: FamilyCtx;
  enabled: boolean;
}): JSX.Element | null {
  if (!enabled) return null;
  return (
    <div data-surface="dev-lab" className="border-t border-border-strong bg-surface-raised p-6">
      <h2 className="font-body text-body font-semibold text-text-heading">Family lab</h2>
      <dl className="mt-4 grid grid-cols-1 gap-2 font-body text-small text-text-muted sm:grid-cols-3">
        <div>
          <dt className="uppercase tracking-[0.08em] text-caption">Plan</dt>
          <dd>{plan.id}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.08em] text-caption">Theme</dt>
          <dd>
            {ctx.themeId} ({ctx.themeDataTheme})
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.08em] text-caption">Legal name</dt>
          <dd>{ctx.legalName}</dd>
        </div>
      </dl>
      <ol className="mt-4 list-decimal pl-6 font-body text-small text-text-muted">
        {plan.sections.map((s) => (
          <li key={s.id}>
            {s.component} / {s.variant} / {s.status} / {s.id}
          </li>
        ))}
      </ol>
    </div>
  );
}
