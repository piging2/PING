/**
 * FeaturedService (family registry #5). Job: PERSUADE + CONVERT for one
 * flagship service line.
 *
 * One instance binds exactly one service object (the planner emits one
 * section per line, max 3, distinct objects). Variants: media-lead
 * (prove craft through imagery, then convert) and scope-lead (define
 * scope to qualify the right buyer).
 *
 * The product-led funnel (Coppersmith lesson 03): named products from
 * product objects only, Schedule Installation with preferred-date capture
 * and the honest availability disclaimer, as progressive disclosure so
 * it never becomes a cramped table on small screens.
 */

import type { PingObject } from "@/lib/ping/types";
import {
  Cta,
  InspectAffordance,
  SectionShell,
  cx,
  type FamilySectionProps,
} from "../shared";
import { mediaForAsset, mediaBindingsFor, objectsForRole } from "../types";
import { adaptedServiceScope } from "../../proceduralize/planner";

const HONEST_DISCLAIMER =
  "We cannot guarantee openings for the date you choose. We will confirm a time that works for you.";

function ProductFunnel({
  products,
  ctx,
  scheduleCta,
}: {
  products: PingObject[];
  ctx: FamilySectionProps["ctx"];
  scheduleCta: { label: string } | null;
}): JSX.Element | null {
  if (products.length === 0 || !scheduleCta) return null;
  return (
    <details className="mt-6 rounded-md border border-border-subtle bg-surface-raised p-4">
      <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-body text-body font-semibold text-text-heading focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-sm">
        {scheduleCta.label}
      </summary>
      <form action="#schedule" method="get" className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2 font-body text-small text-text-primary">
          Product
          <select
            name="product"
            className="min-h-[44px] rounded-md border border-border-strong bg-surface-content px-3 font-body text-body text-text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            {products.map((p) => (
              <option key={p.id} value={p.title}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 font-body text-small text-text-primary">
          Preferred date
          <input
            type="date"
            name="date"
            className="min-h-[44px] rounded-md border border-border-strong bg-surface-content px-3 font-body text-body text-text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
        </label>
        <p className="font-body text-small text-text-muted">{HONEST_DISCLAIMER}</p>
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center justify-center rounded-pill bg-cta-primary-background px-6 font-body text-body text-cta-primary-text hover:bg-cta-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          Request this installation
        </button>
      </form>
    </details>
  );
}

export function FeaturedService({ section, ctx }: FamilySectionProps): JSX.Element {
  const service = objectsForRole(ctx, section, "service")[0];
  const products = objectsForRole(ctx, section, "product");
  if (!service) return <></>;

  const mediaLead = section.variant === "media-lead";
  const binding = mediaBindingsFor(section)[0];
  const media = binding ? mediaForAsset(ctx, binding.assetId) : null;

  // The scope line renders through the graph field-name adapter
  // (planner.ts): a direct scope field, else the service description when
  // it reads as a scope line. The description paragraph renders only when
  // it carries different text, so an adapted scope never double-renders.
  const scope = adaptedServiceScope(service);
  const description =
    typeof service.description === "string" ? service.description.replace(/\s+/g, " ").trim() : "";
  const showDescription = description !== "" && description !== scope;

  const quoteCta =
    section.ctaBindings.find((c) => c.kind === "quote-start" && c.contextObjectId === service.id) ??
    null;
  const scheduleCta =
    section.ctaBindings.find((c) => c.kind === "schedule") ?? null;
  const phoneCta = section.ctaBindings.find((c) => c.kind === "call") ?? null;

  return (
    <SectionShell
      component="FeaturedService"
      variant={section.variant}
      title={service.title}
      kicker="Specialty"
    >
      <div className={cx("grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12")}>
        {mediaLead && media && (
          <div>
            <img
              src={media.url}
              alt={media.alt}
              className="aspect-landscape w-full rounded-lg object-cover shadow-lg"
              loading="lazy"
            />
          </div>
        )}
        <div>
          {scope !== "" && (
            <p className="font-body text-lead text-text-primary">{scope}</p>
          )}
          {showDescription && (
            <p className="mt-4 max-w-[65ch] font-body text-body text-text-muted">{description}</p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {phoneCta && <Cta cta={phoneCta} ctx={ctx} />}
            {quoteCta && <Cta cta={quoteCta} ctx={ctx} />}
            {!phoneCta && !quoteCta && scheduleCta && <Cta cta={scheduleCta} ctx={ctx} />}
          </div>
          <ProductFunnel products={products} ctx={ctx} scheduleCta={scheduleCta} />
          <div className="mt-6">
            <InspectAffordance ctx={ctx} objectId={service.id} />
          </div>
        </div>
        {!mediaLead && media && (
          <div>
            <img
              src={media.url}
              alt={media.alt}
              className="aspect-landscape w-full rounded-lg object-cover shadow-lg"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </SectionShell>
  );
}
