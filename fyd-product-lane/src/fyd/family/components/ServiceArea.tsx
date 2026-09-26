/**
 * ServiceArea (family registry #8). Job: INFORM.
 *
 * area-list: the full service area as a plain list.
 * hub-address: anchored on the physical hub (address first), with the
 * surrounding areas after. No map chrome, no directions embed.
 *
 * The address copy comes from owner intent (service_areas / address
 * fields); never invented.
 */

import {
  SectionShell,
  generatedCopy,
  sectionChrome,
  type FamilySectionProps,
} from "../shared";
import { visualScaleFor } from "../hierarchy";
import { adaptedAddress, adaptedServiceAreaList } from "../../proceduralize/planner";
import { SCHEMA_ROLES } from "../../sitespec/schemas";
import type { PingObject } from "@/lib/ping/types";

/** Location objects from the graph (the planner's Grouped.locations equivalent). */
function locationsOf(ctx: FamilySectionProps["ctx"]): PingObject[] {
  return ctx.input.graph.objects.filter(
    (o) => SCHEMA_ROLES.location.includes(o.schema) && o.visibility === "public",
  );
}

/**
 * The hub address and the area list render through the graph field-name
 * adapter (planner.ts): location-object locality components compose the
 * hub line; the area list is owner service_areas, then location titles,
 * then the adapted service-radius region. Nothing is invented.
 */
function areasOf(ctx: FamilySectionProps["ctx"], excludeHub: boolean): string[] {
  return adaptedServiceAreaList(ctx.owner, locationsOf(ctx), { excludeHubLine: excludeHub });
}

function hubAddress(ctx: FamilySectionProps["ctx"]): string | null {
  const lines = adaptedAddress(ctx.owner, locationsOf(ctx)).lines;
  return lines.length > 0 ? lines[0] : null;
}

export function ServiceArea({ section, ctx }: FamilySectionProps): JSX.Element {
  const hubAddressVariant = section.variant === "hub-address";
  const hub = hubAddressVariant ? hubAddress(ctx) : null;
  const areas = areasOf(ctx, hubAddressVariant && hub !== null);

  // Fail closed: without evidenced areas there is no area section. The
  // planner omits the section on vague coverage (AREA-ELIG); the
  // renderer never fills the gap with a "coming soon" promise.
  if (!hub && areas.length === 0) return <></>;

  return (
    <SectionShell
      id="service-area"
      component="ServiceArea"
      variant={section.variant}
      chrome={sectionChrome({
        title: generatedCopy("Where we work"),
        kicker: generatedCopy("Service area"),
      })}
      scale={visualScaleFor(section)}
      motion="none"
    >
      {hubAddressVariant && hub && (
        <p className="mb-6 font-body text-lead text-text-heading">{hub}</p>
      )}
      {areas.length > 0 ? (
        <ul className="columns-2 gap-8 md:columns-3">
          {areas.map((a) => (
            <li
              key={a}
              className="mb-3 break-inside-avoid font-body text-body text-text-primary"
            >
              {a}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-body text-text-muted">Service area details coming soon.</p>
      )}
    </SectionShell>
  );
}
