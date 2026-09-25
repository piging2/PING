/**
 * ServiceGrid (family registry #4). Job: CONVERT.
 *
 * Services are sold, not listed: every card carries a media slot and a
 * per-card conversion hook (deletion list item 13). Services render in
 * business-priority order (the plan's binding order), never alphabetical.
 *
 * Variants: cards, featured-plus-grid, media-grid.
 * Responsive contract: 375/390 cards collapse to compact tiles; the
 * featured card leads full-width; media-grid becomes single-column with
 * media top.
 */

import type { PingObject } from "@/lib/ping/types";
import { Cta, InspectAffordance, SectionShell, cx, type FamilySectionProps } from "../shared";
import { mediaForAsset, mediaBindingsFor, objectsForRole } from "../types";
import type { PlannedCtaBinding } from "../types";

function serviceScope(s: PingObject): string {
  const v = s.fields["scope"];
  return typeof v === "string" ? v.trim() : "";
}

function hookFor(
  section: FamilySectionProps["section"],
  serviceId: string,
): PlannedCtaBinding | null {
  return (
    section.ctaBindings.find(
      (c) => c.tier === "secondary" && c.contextObjectId === serviceId,
    ) ?? null
  );
}

function askHref(ctx: FamilySectionProps["ctx"]): string {
  return ctx.askHref;
}

function ServiceCard({
  service,
  hook,
  ctx,
  mediaUrl,
  mediaAlt,
  featured,
}: {
  service: PingObject;
  hook: PlannedCtaBinding | null;
  ctx: FamilySectionProps["ctx"];
  mediaUrl: string | null;
  mediaAlt: string | null;
  featured?: boolean;
}): JSX.Element {
  const scope = serviceScope(service);
  const description =
    typeof service.description === "string" ? service.description.replace(/\s+/g, " ").trim() : "";
  return (
    <article
      className={cx(
        "flex flex-col overflow-hidden rounded-md border border-service-card-border bg-service-card-surface shadow-md",
        featured && "md:col-span-2 lg:col-span-3",
      )}
    >
      {mediaUrl && (
        <img
          src={mediaUrl}
          alt={mediaAlt ?? service.title}
          className={cx("w-full object-cover", featured ? "aspect-[21/9]" : "aspect-landscape")}
          loading="lazy"
        />
      )}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-h3 text-service-card-title">{service.title}</h3>
        {scope !== "" && (
          <p className="mt-2 font-body text-body font-medium text-text-primary">{scope}</p>
        )}
        {description !== "" && (
          <p className="mt-3 flex-1 font-body text-body text-service-card-body">{description}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {hook && <Cta cta={hook} ctx={ctx} tone="hook" />}
          <a
            href={askHref(ctx)}
            className="font-body text-small text-text-muted underline underline-offset-4 hover:text-text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-sm"
          >
            Ask about this service
          </a>
        </div>
      </div>
    </article>
  );
}

function mediaForService(
  ctx: FamilySectionProps["ctx"],
  section: FamilySectionProps["section"],
  serviceId: string,
): { url: string; alt: string } | null {
  const binding = mediaBindingsFor(section).find((b) => b.objectId === serviceId);
  if (!binding) return null;
  const ref = mediaForAsset(ctx, binding.assetId);
  return ref ? { url: ref.url, alt: ref.alt } : null;
}

function CardsGrid({ section, ctx }: FamilySectionProps): JSX.Element {
  const services = objectsForRole(ctx, section, "service");
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {services.map((s) => (
        <ServiceCard
          key={s.id}
          service={s}
          hook={hookFor(section, s.id)}
          ctx={ctx}
          mediaUrl={null}
          mediaAlt={null}
        />
      ))}
    </div>
  );
}

function FeaturedPlusGrid({ section, ctx }: FamilySectionProps): JSX.Element {
  const services = objectsForRole(ctx, section, "service");
  const [flagship, ...rest] = services;
  const media = flagship ? mediaForService(ctx, section, flagship.id) : null;
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {flagship && (
        <ServiceCard
          key={flagship.id}
          service={flagship}
          hook={hookFor(section, flagship.id)}
          ctx={ctx}
          mediaUrl={media?.url ?? null}
          mediaAlt={media?.alt ?? null}
          featured
        />
      )}
      {rest.map((s) => (
        <ServiceCard
          key={s.id}
          service={s}
          hook={hookFor(section, s.id)}
          ctx={ctx}
          mediaUrl={null}
          mediaAlt={null}
        />
      ))}
    </div>
  );
}

function MediaGrid({ section, ctx }: FamilySectionProps): JSX.Element {
  const services = objectsForRole(ctx, section, "service");
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {services.map((s) => {
        const media = mediaForService(ctx, section, s.id);
        return (
          <ServiceCard
            key={s.id}
            service={s}
            hook={hookFor(section, s.id)}
            ctx={ctx}
            mediaUrl={media?.url ?? null}
            mediaAlt={media?.alt ?? null}
          />
        );
      })}
    </div>
  );
}

export function ServiceGrid({ section, ctx }: FamilySectionProps): JSX.Element {
  const variant = section.variant;
  const services = objectsForRole(ctx, section, "service");
  const clusterId = services[0]?.id ?? ctx.owner?.id ?? null;
  return (
    <SectionShell
      id="services"
      component="ServiceGrid"
      variant={variant}
      title="A few ways we can help"
      kicker="Services"
    >
      {variant === "featured-plus-grid" ? (
        <FeaturedPlusGrid section={section} ctx={ctx} />
      ) : variant === "media-grid" ? (
        <MediaGrid section={section} ctx={ctx} />
      ) : (
        <CardsGrid section={section} ctx={ctx} />
      )}
      {clusterId && (
        <div className="mt-8">
          <InspectAffordance ctx={ctx} objectId={clusterId} />
        </div>
      )}
    </SectionShell>
  );
}
